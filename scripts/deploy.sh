#!/usr/bin/env bash
# 把 dist/ 部署到 iboluo.top。
#
# 线上不是 Cloudflare Pages，而是自建腾讯云服务器上的一个 nginx 容器。这个容器属于
# sku-table 那个项目，80/443 是它占着的，所以博客只能搭车进去：
#   1) 站点文件放宿主机 /opt/my-blog/site，再由 rsync 同步到这里
#   2) 再 docker cp 进容器 /usr/share/nginx/blog，blog.conf 放进 conf.d
#   3) nginx -s reload
#
# 第 2 步是必须的：容器没有挂载博客目录。曾经因为漏了这步，iboluo.top 空转了 10 天
# （容器的 99-reject.conf 对未匹配域名一律 return 444）。
# 容器一旦被 sku-table 重新部署，容器内的文件会丢 —— 重跑本脚本即可恢复。
#
# 用法：pnpm deploy        或        bash scripts/deploy.sh
# 可选环境变量：
#   BLOG_SSH_HOST   默认 tencent-dev（见 ~/.ssh/config）
#   BLOG_CONTAINER  默认 sku-table-web-1
#   SKIP_BUILD=1    跳过本地构建

set -euo pipefail

SSH_HOST="${BLOG_SSH_HOST:-tencent-dev}"
CONTAINER="${BLOG_CONTAINER:-sku-table-web-1}"
REMOTE_ROOT="/opt/my-blog"
REMOTE_SITE="$REMOTE_ROOT/site"
REMOTE_CONF="$REMOTE_ROOT/nginx/blog.conf"
CONTAINER_SITE="/usr/share/nginx/blog"
SITE_URL="${BLOG_SITE_URL:-https://iboluo.top}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
remote() { ssh -o ConnectTimeout=20 "$SSH_HOST" "$@"; }

cd "$REPO_ROOT"

step "1/6 构建"
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "  已跳过（SKIP_BUILD=1）"
else
  pnpm build
fi
[ -f dist/index.html ] || { echo "dist/index.html 不存在，构建失败" >&2; exit 1; }
echo "  产物：$(find dist -name '*.html' | wc -l | tr -d ' ') 个页面，$(du -sh dist | cut -f1)"

step "2/6 检查远端"
remote "test -f $REMOTE_CONF" || { echo "远端缺少 $REMOTE_CONF" >&2; exit 1; }
remote "docker inspect $CONTAINER >/dev/null" || { echo "容器 $CONTAINER 不存在" >&2; exit 1; }
echo "  $SSH_HOST 可达，容器 $CONTAINER 存在"

step "3/6 备份线上旧版本"
BACKUP="$REMOTE_ROOT/site.bak-$(date +%Y%m%d-%H%M%S)"
remote "cp -a $REMOTE_SITE $BACKUP" && echo "  $BACKUP"

step "4/6 上传站点文件"
# 保留 dist 里没有的历史残留会影响观感，直接 --delete 对齐
rsync -az --delete -e "ssh -o ConnectTimeout=20" dist/ "$SSH_HOST:$REMOTE_SITE/"
echo "  已同步到 $REMOTE_SITE"

step "5/6 接入容器并热加载 nginx"
remote "
  set -e
  docker exec $CONTAINER mkdir -p $CONTAINER_SITE
  docker cp $REMOTE_SITE/. $CONTAINER:$CONTAINER_SITE/
  docker cp $REMOTE_CONF $CONTAINER:/etc/nginx/conf.d/blog.conf
  docker exec $CONTAINER nginx -t
  docker exec $CONTAINER nginx -s reload
"

step "6/6 验收"
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
