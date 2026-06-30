---
title: 'Vite 插件开发踩坑记录'
description: '开发自定义 Vite 插件时遇到的一些坑和解决方案'
date: '2026-06-18'
tags: ['Vite', 'JavaScript', '工具链']
category: '前端'
slug: 'vite-plugin-pitfalls'
draft: false
---

## 为什么写 Vite 插件

项目中需要自定义构建流程，Rollup 插件太重，Vite 插件刚好。

### 坑 1：虚拟模块解析

`resolveId` 返回 `\0` 前缀的虚拟模块 ID 后，`load` 必须能处理同样带 `\0` 前缀的请求。

### 坑 2：HMR 边界

插件的 `handleHotUpdate` 只在 dev server 下调用，不要假设 build 时也存在。

### 坑 3：transform 顺序

`enforce: 'pre'` 的插件先执行 transform，但保证不了和其他 pre 插件的顺序。

总结：Vite 插件 API 直观但细节多，多读源码。
