# 个人博客架构文档

## 1. 技术选型

| 层 | 选型 | 说明 |
|----|------|------|
| 框架 | Astro 7 | 静态优先，Content Collections |
| 语言 | TypeScript | 类型安全 |
| CSS | Tailwind CSS 4 + CSS 变量 | 布局/排版/响应式用 Tailwind；3D 边框/chrome/像素组件用语义类 |
| 字体 | 方舟像素字体 | 自托管 WOFF2，OFL，支持中文 |
| Markdown | Content Collections + rehype-sanitize | 禁止原始 HTML，白名单协议 |
| 搜索 | 构建时 JSON + 客户端 fetch | 索引仅含元数据，不含正文 |
| 窗口管理 | Vanilla JS 单模块 | 不依赖框架 |
| 包管理 | pnpm | - |
| 部署 | 自建腾讯云服务器（nginx 容器） | 纯静态；流程见 `scripts/deploy.sh`，用 `pnpm run deploy` |

## 2. 目录结构

```
my-blog/
├── public/
│   ├── fonts/                    # 方舟像素字体 WOFF2
│   ├── scripts/
│   │   └── window-manager.js     # 窗口管理器
│   ├── home.gif                  # 桌面背景
│   └── default-og.png
├── src/
│   ├── content/
│   │   └── posts/                # Markdown 文章，每篇一个目录
│   │       └── article-slug/
│   │           ├── index.md
│   │           └── cover.png
│   ├── content.config.ts         # Collection schema
│   ├── pages/                    # 路由页面
│   │   ├── index.astro           # 首页（多窗口平铺）
│   │   ├── posts/
│   │   │   ├── index.astro
│   │   │   └── [slug].astro
│   │   ├── tags/
│   │   │   ├── index.astro
│   │   │   └── [tag].astro
│   │   ├── archive.astro
│   │   ├── about.astro
│   │   ├── search.astro
│   │   ├── portfolio.astro
│   │   ├── rss.xml.ts
│   │   └── search.json.ts
│   ├── components/
│   │   ├── BaseLayout.astro      # 桌面壳
│   │   ├── Window.astro          # 窗口包装器
│   │   ├── DesktopIcons.astro
│   │   ├── Taskbar.astro
│   │   └── ...                   # PostCard, TagCloud, ArchiveList 等
│   ├── lib/
│   │   ├── config.ts
│   │   ├── utils.ts              # getPublishedPosts() 等
│   │   └── markdown.ts           # rehype-sanitize 配置
│   └── styles/
│       ├── global.css            # Tailwind 入口 + @theme tokens
│       ├── chrome.css            # 窗口/标题栏/任务栏
│       ├── components.css        # 像素 UI 组件
│       └── responsive.css
├── astro.config.ts
└── package.json
```

## 3. 布局架构：windows风格

### 3.1 BaseLayout.astro — 桌面壳

所有页面的根布局，提供持久桌面隐喻。窗口管理器 JS 在此加载一次，全局复用。

```
桌面背景 (fixed)
  → 桌面图标导航 (fixed)
  → <slot /> — 页面内容（Window 组件们）
  → 任务栏 (fixed)
  → CRT 扫描线 (overlay, pointer-events:none)
```

### 3.2 Window.astro — 窗口组件

所有内容都装在 Window 里。每个 Window：标题栏 + body 区域（`<slot />`）。

### 3.3 首页 vs 内页

- **首页**：多个 Window 平铺，桌面图标点击唤起对应窗口
- **内页**（文章详情、标签列表等）：单个 Window 最大化展示
- 文章阅读页的窗口内容区纯静态 HTML，零 JS

## 4. Content Collection Schema

`src/content.config.ts`，文章 frontmatter 的数据契约：

```ts
title: string
description: string          // 必须手写，不自动截取
date: string                 // YYYY-MM-DD
tags: string[]
category: string
slug: string                 // 小写英文+数字+连字符
draft: boolean               // true 的文章不进入任何公开产物
cover?: { src, alt, width, height }
updated?: string
```

所有页面、RSS、sitemap、搜索索引统一调用 `getPublishedPosts()`，内部过滤 `draft: true`。

## 5. Markdown 安全

- 禁止原始 HTML、`<script>`、事件属性、iframe
- 链接仅允许 `http:` / `https:` / `mailto:`，禁止 `javascript:` / `data:`
- 不启用 MDX

## 6. 搜索

- 构建时生成 `/search.json`，仅含标题、摘要、标签、分类、日期、URL，**不含正文**
- 客户端首次输入时 fetch，简单关键词匹配，标题命中优先

## 7. RSS 与 Sitemap

- RSS：`@astrojs/rss`，只包含公开文章
- Sitemap：`@astrojs/sitemap`，自动过滤草稿

## 8. 响应式策略

- **>768px**：完整桌面隐喻，窗口绝对定位可拖拽
- **≤768px**：窗口变流式布局，桌面图标横向滚动，禁用拖拽
- 具体方案参考 prototype4.html 已验证的 CSS

## 9. 部署

纯静态，跑 `pnpm run deploy`（即 `scripts/deploy.sh`）：构建 → 备份 → rsync 站点 → 上传站点配置 → 验收。
注意写成 `pnpm run deploy`：裸 `pnpm deploy` 会被 pnpm 内置的同名命令截走（只能在 workspace 里用）。

线上是自建腾讯云服务器（`~/.ssh/config` 里的 `tencent-dev`），**不是 Cloudflare Pages**，也没有 CI ——
推送 GitHub 不会触发部署。

站点搭在一个属于别的项目的 nginx 容器上（那个项目占了 80/443），两处内容由它的 compose **挂载**进容器：

```
本机 dist/                    --rsync-->  服务器 /opt/my-blog/site
本机 infra/nginx/blog.conf    --就地写--> 服务器 /opt/my-blog/nginx/blog.conf
                                                  |
                            挂载（sku-table 的 web.volumes：BLOG_SITE_DIR / BLOG_CONF_FILE）
                                                  v
                        容器 /usr/share/nginx/blog + /etc/nginx/conf.d/blog.conf
```

容器重建会自动带上这两处。历史上这里是 `docker cp` 注入的，容器一重建内容就没了 —— 2026-09 因此
`iboluo.top` 空转了 10 天（容器的 `99-reject.conf` 对未匹配域名一律 `return 444`）。

`blog.conf` 是**文件挂载**，宿主机更新必须就地写（脚本用 `cat >`）；用 `mv`/`rsync`/`cp` 换成新文件会换掉
inode，容器读到的还是旧内容。`deploy.sh` 第 5 步会比对宿主机与容器内的 md5 兜底。

## 10. 后续扩展预留

- Giscus 评论
- Pagefind 全文搜索
- 图片 CDN / 自动压缩
- 动态 OG 图
- 邮件订阅
- 访问统计面板
