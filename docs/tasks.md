# 个人博客开发任务清单

## 阶段 1：项目骨架

### 任务 1：项目初始化

- [ ] `pnpm create astro@latest .`，选 TypeScript + 空白模板
- [ ] 验证 `pnpm dev` 可运行

### 任务 2：安装依赖

- [ ] `pnpm add @astrojs/rss @astrojs/sitemap rehype-sanitize`
- [ ] `pnpm add -D tailwindcss @tailwindcss/vite`
- [ ] 验证 `pnpm dev` 正常

### 任务 3：配置 astro.config.ts

- [ ] 站点名、URL、sitemap 集成
- [ ] Tailwind Vite 插件注册
- [ ] 验证配置不报错

### 任务 4：建目录结构

- [ ] `src/pages/`、`src/components/`、`src/lib/`、`src/styles/`
- [ ] `src/content/posts/`
- [ ] `public/fonts/`、`public/scripts/`、`public/default-og.png`
- [ ] 验证目录存在

---

## 阶段 2：CSS 基础

### 任务 5：tokens.css — CSS 变量体系

- [ ] 基础色板（c-white ~ c-purple-100）
- [ ] Win98 chrome 色（silver/highlight/shadow/dark/titlebar 渐变）
- [ ] 语义 Token（win-bg/win-text/card-bg/tag-bg/link 等，含 light-dark()）
- [ ] 字号体系（fs-body/h1/h2/h3/small/xs/mono-s）
- [ ] 边框与间距（border-window/border-ui/window-pad/taskbar-h）
- [ ] 字体栈（font-pixel/font-mono）
- [ ] 验证 `pnpm dev`，CSS 变量可 inspect

### 任务 6：chrome.css — 桌面 chrome 层

- [ ] 桌面背景（.desktop-bg）
- [ ] CRT 扫描线（body::after）
- [ ] 窗口框架（.window / .window.active / .window.maximized）
- [ ] 标题栏（.titlebar / .titlebar-icon / .titlebar-text / .titlebar-btn）
- [ ] 任务栏（.taskbar / .taskbar-start / .taskbar-tabs / .taskbar-tab / .taskbar-clock）
- [ ] 验证 chrome 样式渲染正确

### 任务 7：components.css — 像素 UI 组件库

- [ ] 按钮（.pixel-btn / .pixel-btn.primary / .pixel-btn.small）
- [ ] 输入框（.pixel-input）
- [ ] 标签（.pixel-tag）
- [ ] 卡片（.pixel-card）
- [ ] 分割线（.pixel-divider）
- [ ] 排版（h1-h4 / .pixel-text / .mono-text / a / .post-meta）
- [ ] 验证组件样式正确

### 任务 8：global.css — CSS 入口

- [ ] Tailwind `@import "tailwindcss"` + `@theme` 自定义变量
- [ ] `@import` tokens.css / chrome.css / components.css
- [ ] 响应式 `@import "./responsive.css"`
- [ ] 验证所有 CSS 通过 global.css 生效

---

## 阶段 3：Astro 组件

### 任务 9：BaseLayout.astro — 桌面壳

- [ ] 桌面背景 div
- [ ] CRT 扫描线 body::after（全局生效）
- [ ] `<slot />` 页面内容区
- [ ] 任务栏占位（先静态，后续换 Taskbar 组件）
- [ ] `window-manager.js` 脚本加载
- [ ] 验证首页可见桌面背景 + 扫描线

### 任务 10：Window.astro — 窗口包装器

- [ ] Props: id, title, icon, x, y, width, height, hidden
- [ ] 标题栏 + 按钮（最小化/最大化/关闭）
- [ ] body slot
- [ ] CSS class 绑定（active/maximized/hidden）
- [ ] 验证窗口渲染，按钮占位可点击（功能后续 JS 实现）

### 任务 11：DesktopIcons.astro — 桌面图标

- [ ] 首页图标列表（简介/文章/标签/归档/搜索/关于/作品）
- [ ] 每个图标：emoji sprite + label
- [ ] onclick 调用 `focusWindow(id)`
- [ ] 访客计数器
- [ ] 验证图标渲染 + 点击唤起对应窗口

### 任务 12：Taskbar.astro — 任务栏

- [ ] 开始按钮
- [ ] 窗口标签区（taskbar-tabs）
- [ ] 时钟显示（JS 更新）
- [ ] 验证任务栏渲染 + 时钟走动

---

## 阶段 4：窗口管理器

### 任务 13：window-manager.js — 核心拖拽

- [ ] mousedown 检测 titlebar → 记录 dragTarget + offset
- [ ] mousemove → 更新 left/top
- [ ] mouseup → 清除 dragTarget
- [ ] 最大化状态跳过拖拽
- [ ] 验证窗口可拖拽移动

### 任务 14：窗口操作

- [ ] focusWindow(id) — 显示窗口 + 激活 + 提升 z-index + 更新任务栏标签
- [ ] minWindow(id) — 隐藏窗口
- [ ] maxWindow(id) — toggle maximized class
- [ ] closeWindow(id) — 隐藏窗口 + 取消任务栏标签激活
- [ ] getNextZIndex() — 计算最大 z-index + 1
- [ ] 键盘 Escape 关闭活跃窗口
- [ ] 验证所有操作正常

### 任务 15：移动端适配

- [ ] touchstart/touchmove/touchend 拖拽支持
- [ ] `≤768px` 禁用拖拽（matchMedia 检测）
- [ ] `≤768px` 时 focusWindow 调用 scrollIntoView
- [ ] prefers-reduced-motion 检测
- [ ] 验证移动端触摸 + 响应式行为

---

## 阶段 5：数据层

### 任务 16：content.config.ts — Collection Schema

- [ ] defineCollection + frontmatter schema（title/description/date/tags/category/slug/draft/cover/updated）
- [ ] 校验：slug 小写英文+数字+连字符，description 必填
- [ ] 验证 schema 可 import

### 任务 17：lib/utils.ts — 数据工具

- [ ] getPublishedPosts() — 过滤 draft:true + 按日期倒序
- [ ] getUniqueTags() — 提取去重标签
- [ ] getPostsByTag(tag) — 按标签过滤
- [ ] getPostsByYear() — 按年分组
- [ ] 验证函数返回正确数据

### 任务 18：创建示例文章

- [ ] 2-3 篇 Markdown 示例文章（含完整 frontmatter）
- [ ] 每篇放独立目录 `content/posts/slug/index.md`
- [ ] 一篇 draft:true 用于验证过滤
- [ ] 验证 getPublishedPosts() 过滤草稿

---

## 阶段 6：页面路由

### 任务 19：index.astro — 首页

- [ ] 多 Window 平铺：简介/最近文章/标签/归档
- [ ] 文章列表显示最近 5 篇（PostCard）
- [ ] 标签云显示所有标签
- [ ] 归档简要显示
- [ ] 验证首页渲染

### 任务 20：/posts/index.astro — 文章列表

- [ ] 单个 Window 最大化
- [ ] 列出所有公开文章
- [ ] 每项显示日期 + 标题
- [ ] 点击进入详情
- [ ] 验证列表页渲染

### 任务 21：/posts/[slug].astro — 文章详情

- [ ] 单个 Window 最大化
- [ ] Markdown 渲染（Content Collections render）
- [ ] rehype-sanitize 配置（禁止 HTML，白名单协议）
- [ ] 标题 + 元信息（日期/标签/分类）
- [ ] 图片懒加载 + alt
- [ ] 验证文章渲染 + 安全过滤

### 任务 22：标签系统

- [ ] /tags/index.astro — 标签云，单个 Window
- [ ] /tags/[tag].astro — 按标签过滤文章列表
- [ ] 验证标签页面

### 任务 23：/archive.astro — 归档页

- [ ] 按年分组显示
- [ ] 每项：日期 + 标题 + 链接
- [ ] 验证归档页

### 任务 24：关于 + 作品集

- [ ] /about.astro — 个人介绍/技术栈/社交链接
- [ ] /portfolio.astro — 作品集预留（空壳 + "整理中"提示）
- [ ] 验证两页渲染

### 任务 25：/search.astro — 搜索页

- [ ] 搜索输入框 + 结果容器
- [ ] fetch /search.json + 关键词匹配
- [ ] 标题命中优先排序
- [ ] 空状态 / 无结果状态
- [ ] 验证搜索功能

---

## 阶段 7：SEO + 产物

### 任务 26：rss.xml.ts — RSS

- [ ] `@astrojs/rss` 配置
- [ ] 仅公开文章，全文输出
- [ ] 图片路径转绝对 URL
- [ ] 验证 `/rss.xml` 可访问

### 任务 27：search.json.ts — 搜索索引

- [ ] 构建时生成 JSON
- [ ] 仅含标题/摘要/标签/分类/日期/URL，不含正文
- [ ] 过滤 draft
- [ ] 验证 `/search.json` 可访问

### 任务 28：SEO 组件

- [ ] `<SEO />` Astro 组件
- [ ] title/description/canonical/OG/Twitter Card
- [ ] 封面图优先文章 cover，无则 default-og.png
- [ ] 页面标题格式：`文章标题 | 站点名称`
- [ ] 集成到 BaseLayout
- [ ] 验证 SEO meta 标签输出

---

## 验收清单

- [ ] `pnpm dev` 首页可见桌面隐喻完整 UI
- [ ] 窗口可拖拽、最小化、最大化、关闭
- [ ] 新增 Markdown 文章自动生成页面
- [ ] 草稿不出现在任何公开产物
- [ ] 搜索可找到文章
- [ ] `/rss.xml` 和 `/sitemap.xml` 可访问
- [ ] Markdown 不执行 HTML / 危险链接
- [ ] 图片有 alt + 懒加载
- [ ] 移动端响应式正常
- [ ] `pnpm build` 生产构建成功
