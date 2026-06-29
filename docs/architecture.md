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
| 部署 | Cloudflare Pages | 纯静态 |

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
│       ├── global.css            # Tailwind 入口 + @theme
│       ├── tokens.css            # :root 变量
│       ├── chrome.css            # 窗口/标题栏/任务栏
│       ├── components.css        # 像素 UI 组件
│       └── responsive.css
├── astro.config.ts
└── package.json
```

## 3. 布局架构：桌面隐喻

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

## 9. 后续扩展预留

- Giscus 评论
- Pagefind 全文搜索
- 图片 CDN / 自动压缩
- 动态 OG 图
- 邮件订阅
- 访问统计面板
