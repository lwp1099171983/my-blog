#!/usr/bin/env bash
# 把 dist/ 部署到 iboluo.top。
#
# 线上不是 Cloudflare Pages，而是自建腾讯云服务器上的一个 nginx 容器。这个容器属于
# sku-table 那个项目，80/443 是它占着的，所以博客只能搭车进去：
#   1) 站点文件 rsync 到宿主机 /opt/my-blog/site
#   2) 站点配置写到宿主机 /opt/my-blog/nginx/blog.conf
#   3) docker exec nginx -s reload
#
# 这两处都由 sku-table 的 docker-compose.yml 挂进容器（BLOG_SITE_DIR / BLOG_CONF_FILE），
# 所以容器重建后会自动恢复 —— 曾经这里用 docker cp 注入，容器一重建内容就没了，
# iboluo.top 因此空转了 10 天（容器的 99-reject.conf 对未匹配域名一律 return 444）。
#
# blog.conf 是**文件挂载**，必须就地写（cat > 目标文件）。用 mv / rsync / cp 换成新文件
# 会换掉 inode，容器里读到的还是旧内容 —— 脚本第 5 步会核对宿主机与容器内的哈希来兜底。
#
# 用法：pnpm run deploy  或  bash scripts/deploy.sh
#   注意裸 `pnpm deploy` 会被 pnpm 内置的同名命令截走（只能在 workspace 里用）。
# 可选环境变量：
#   BLOG_SSH_HOST   默认 tencent-dev（见 ~/.ssh/config）
#   BLOG_CONTAINER  默认 sku-table-web-1
#   SKIP_BUILD=1    跳过本地构建
#   SKIP_KB_CHECK=1 跳过「源库是否已同步」的校验
#   KB_SOURCE_DIR   知识库源目录，默认 ~/Documents/Codex/考公/知识库

set -euo pipefail

SSH_HOST="${BLOG_SSH_HOST:-tencent-dev}"
CONTAINER="${BLOG_CONTAINER:-sku-table-web-1}"
REMOTE_ROOT="/opt/my-blog"
REMOTE_SITE="$REMOTE_ROOT/site"
REMOTE_CONF="$REMOTE_ROOT/nginx/blog.conf"
CONTAINER_SITE="/usr/share/nginx/blog"
CONTAINER_CONF="/etc/nginx/conf.d/blog.conf"
SITE_URL="${BLOG_SITE_URL:-https://iboluo.top}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_CONF="$REPO_ROOT/infra/nginx/blog.conf"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
remote() { ssh -o ConnectTimeout=20 "$SSH_HOST" "$@"; }
md5_of() { printf '%s' "$1" | awk '{print $1}'; }

cd "$REPO_ROOT"

step "1/7 检查知识库同步状态"
# 本步只做拦截，不改动任何内容。
# 背景：scripts/deploy.sh 只跑 astro build，不含 sync:kb。若改了源库却直接部署，
# 会把 src/content/kb/ 里的旧内容推上线，且全程不报错 —— 这是本链路最隐蔽的失败点。
KB_SRC="${KB_SOURCE_DIR:-$HOME/Documents/Codex/考公/知识库}"
SYNC_META="$REPO_ROOT/src/content/kb/.sync-meta.json"
if [ "${SKIP_KB_CHECK:-0}" = "1" ]; then
  echo "  已跳过（SKIP_KB_CHECK=1）"
elif [ ! -d "$KB_SRC" ]; then
  echo "  找不到源库 $KB_SRC，跳过（本机只部署已入库的 src/content/kb）"
elif [ ! -f "$SYNC_META" ]; then
  cat >&2 <<EOF

找不到同步记录：$SYNC_META
无法判断 src/content/kb 是否为最新，直接部署可能把旧内容推上线。
请先运行： pnpm sync:kb && pnpm test
确实要跳过本检查： SKIP_KB_CHECK=1 pnpm run deploy
EOF
  exit 1
else
  # 排除项与 scripts/sync-kb.mjs 的 EXCLUDE 保持一致：这几个是个人跟踪文件，不入库
  STALE="$(find "$KB_SRC" -type f -name '*.md' -newer "$SYNC_META" \
    ! -name '错题本.md' ! -name '学习进度.md' ! -name '每日作息与状态管理.md' \
    -print -quit 2>/dev/null || true)"
  if [ -n "$STALE" ]; then
    cat >&2 <<EOF

源库里有比同步产物更新的笔记，直接部署会把旧内容推上线（且不会报错）。
  例：$STALE
请先运行： pnpm sync:kb && pnpm test
确实要跳过本检查： SKIP_KB_CHECK=1 pnpm run deploy
EOF
    exit 1
  fi
  echo "  源库未比同步产物更新，通过"
fi

step "2/7 构建"
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "  已跳过（SKIP_BUILD=1）"
else
  pnpm build
fi
[ -f dist/index.html ] || { echo "dist/index.html 不存在，构建失败" >&2; exit 1; }
echo "  产物：$(find dist -name '*.html' | wc -l | tr -d ' ') 个页面，$(du -sh dist | cut -f1)"

step "3/7 检查远端"
remote "test -f $REMOTE_CONF" || { echo "远端缺少 $REMOTE_CONF" >&2; exit 1; }
remote "docker inspect $CONTAINER >/dev/null" || { echo "容器 $CONTAINER 不存在" >&2; exit 1; }
MOUNTS="$(remote "docker inspect -f '{{range .Mounts}}{{.Destination}} {{end}}' $CONTAINER")"
for dest in "$CONTAINER_SITE" "$CONTAINER_CONF"; do
  case " $MOUNTS " in
    *" $dest "*) ;;
    *)
      cat >&2 <<EOF
容器 $CONTAINER 没有挂载 $dest（当前挂载点：$MOUNTS）。
博客改成了挂载方式，请在 sku-table 的 infra/docker/docker-compose.yml 确认 web.volumes
里有 BLOG_SITE_DIR / BLOG_CONF_FILE 两条，然后重建 web 容器：

  ssh $SSH_HOST
  docker compose --env-file /opt/sku-table/state/.env \\
    -f /opt/sku-table/current/infra/docker/docker-compose.yml up -d --no-build web
EOF
      exit 1
      ;;
  esac
done
echo "  $SSH_HOST 可达，容器 $CONTAINER 已挂载站点与配置"

step "4/7 备份线上旧版本"
BACKUP="$REMOTE_ROOT/site.bak-$(date +%Y%m%d-%H%M%S)"
remote "cp -a $REMOTE_SITE $BACKUP" && echo "  $BACKUP"

step "5/7 上传站点文件"
# 保留 dist 里没有的历史残留会影响观感，直接 --delete 对齐
rsync -az --delete -e "ssh -o ConnectTimeout=20" dist/ "$SSH_HOST:$REMOTE_SITE/"
echo "  已同步到 $REMOTE_SITE"

step "6/7 上传站点配置并热加载 nginx"
OLD_HASH="$(md5_of "$(remote "md5sum $REMOTE_CONF")")"
scp -q "$LOCAL_CONF" "$SSH_HOST:/tmp/blog.conf.new"
remote "cat /tmp/blog.conf.new > $REMOTE_CONF && rm -f /tmp/blog.conf.new"   # 就地写，别换 inode
NEW_HASH="$(md5_of "$(remote "md5sum $REMOTE_CONF")")"
[ "$NEW_HASH" = "$(md5_of "$(md5 -q "$LOCAL_CONF" 2>/dev/null || md5sum "$LOCAL_CONF")")" ] \
  || { echo "远端 $REMOTE_CONF 与仓库 infra/nginx/blog.conf 不一致" >&2; exit 1; }

# 文件挂载盯着 inode，宿主机换了文件容器就还读旧的，这里直接比对内容兜底
CTR_HASH="$(md5_of "$(remote "docker exec $CONTAINER md5sum $CONTAINER_CONF")")"
[ "$CTR_HASH" = "$NEW_HASH" ] || {
  echo "容器内 $CONTAINER_CONF 与宿主机不一致（挂载可能指向了旧 inode），重建 web 容器即可" >&2
  exit 1
}

if [ "$OLD_HASH" = "$NEW_HASH" ]; then
  echo "  配置无变化，跳过 reload"
else
  remote "docker exec $CONTAINER nginx -t && docker exec $CONTAINER nginx -s reload"
  echo "  配置已更新并 reload"
fi

step "7/7 验收"
fail=0
for path in / /kb/ /kb/browse/ /kb/graph/ /kb/search/ /posts/ /tags/ /rss.xml /sitemap-index.xml; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$SITE_URL$path" || echo 000)"
  printf '  %-22s %s\n' "$path" "$code"
  [ "$code" = "200" ] || fail=1
done
# 顺带确认搭车的 sku 站点没被搞坏
sku="$(remote "curl -sk -o /dev/null -w '%{http_code}' -H 'Host: sku.iboluo.top' https://127.0.0.1/ --max-time 10")"
printf '  %-22s %s（同一容器里的另一个站点）\n' "sku.iboluo.top" "$sku"
[ "$sku" = "200" ] || fail=1

if [ "$fail" = "0" ]; then
  printf '\n\033[32m部署完成：%s\033[0m\n' "$SITE_URL"
  printf '回滚：ssh %s，把 %s 换回来即可\n' "$SSH_HOST" "$BACKUP"
else
  printf '\n\033[31m有路由未返回 200，请检查\033[0m\n' >&2
  exit 1
fi
