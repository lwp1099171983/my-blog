---
title: '用 CSS 实现像素风 UI 组件'
description: '从零搭建像素风格 UI 组件库的实践笔记，涵盖按钮、输入框、卡片、窗口框架的 CSS 技巧'
date: '2026-06-25'
tags: ['CSS', '像素艺术', '设计']
category: '前端'
slug: 'css-pixel-ui'
draft: false
---

## 像素不是低分辨率

像素风格不是简陋，而是一种有意的设计选择。

### 核心技法

1. **`image-rendering: pixelated`** — 保持像素边缘锐利
2. **`box-shadow` 多色边框** — 用多层阴影模拟 3D 凸起/凹陷
3. **等宽字体** — 方舟像素字体 + CSS `@font-face`
4. **`::before`/`::after` 角标** — 像素风格的装饰元素

```css
.pixel-btn {
  font-family: var(--font-pixel);
  font-size: var(--fs-mono-s);
  border: var(--border-ui-width) solid;
  border-color: var(--win-highlight) var(--win-shadow) var(--win-shadow) var(--win-highlight);
  box-shadow: inset 1px 1px 0 var(--silver-light), inset -1px -1px 0 var(--silver-dark);
}
```

### 要点

- 按钮需要有按下状态（border-color 反转 + inset 阴影变化）
- 输入框用内凹阴影模拟凹陷效果
- 标签用尖角矩形，不用圆角

这篇文章记录了我从 scratch 搭建完整像素 UI kit 的过程。
