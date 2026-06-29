# 阶段 4：窗口管理器 Implementation Plan

> **给 agentic workers：** 必须使用子技能：用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务实现本计划。步骤使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 补齐首页像素桌面的窗口管理交互：拖拽、触摸、聚焦、最小化、最大化、关闭、Escape 关闭、移动端禁拖与 reduced-motion。

**架构：** 只修改 `public/scripts/window-manager.js`，保留现有全局函数接口，避免改动 Astro 组件里的 inline handler。鼠标和触摸拖拽共用同一套状态与函数，任务栏保持静态标签，只同步 active 状态。

**技术栈：** Astro 7、Vanilla JavaScript、CSS media query / `matchMedia`、无新增依赖。

## 全局约束

- 回复和计划文档使用中文；命令、代码、路径保持原文。
- 不新增第三方库。
- 视觉层不写测试。
- 只修改 `public/scripts/window-manager.js`。
- 保留全局接口：`focusWindow(id)`、`minWindow(id)`、`maxWindow(id)`、`closeWindow(id)`、`toggleStartMenu()`。
- `≤768px` 禁用拖拽，`focusWindow()` 调用 `scrollIntoView()`。
- `prefers-reduced-motion: reduce` 时滚动行为使用 `auto`。
- 不做窗口位置持久化、双击最大化、动态任务栏标签创建/销毁、多窗口布局管理器。

---

## 文件结构

- 修改：`public/scripts/window-manager.js`
  - 负责窗口查找、层级计算、任务栏 active 同步、窗口操作、拖拽状态、鼠标/触摸事件、时钟、访客计数器、Escape 快捷键。
- 不修改：`src/components/Window.astro`
  - 继续通过 inline handler 调用全局函数。
- 不修改：`src/components/DesktopIcons.astro`
  - 继续调用 `focusWindow(id)`。
- 不修改：`src/components/Taskbar.astro`
  - 继续提供静态任务栏按钮。
- 不修改：`src/styles/responsive.css`
  - 已有 `≤768px` 流式窗口布局；JS 只负责禁用拖拽。

---

### Task 1：替换窗口管理器脚本

**文件：**
- 修改：`public/scripts/window-manager.js`

**接口：**
- 消费：
  - DOM 元素 ID：`win-${id}`
  - CSS 类：`.window`、`.titlebar`、`.titlebar-btn`、`.taskbar-tab`、`.active`、`.maximized`
  - DOM 节点：`#taskbarClock`、`#hitCount`
- 产出：
  - `window.focusWindow(id: string): void`
  - `window.minWindow(id: string): void`
  - `window.maxWindow(id: string): void`
  - `window.closeWindow(id: string): void`
  - `window.toggleStartMenu(): void`
  - `window.doSearch(): void`

- [ ] **Step 1：替换 `public/scripts/window-manager.js` 内容**

将 `public/scripts/window-manager.js` 完整替换为：

```js
(function () {
  var MOBILE_QUERY = '(max-width: 768px)';
  var REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  var MIN_VISIBLE_WIDTH = 120;
  var MIN_VISIBLE_TITLEBAR = 48;

  var dragState = null;

  function getWindow(id) {
    return document.getElementById('win-' + id);
  }

  function getWindowId(win) {
    return win.id.replace('win-', '');
  }

  function isMobileLayout() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  function isVisible(win) {
    return window.getComputedStyle(win).display !== 'none';
  }

  function getNextZIndex() {
    return Array.from(document.querySelectorAll('.window')).reduce(function (max, win) {
      var value = Number.parseInt(win.style.zIndex || window.getComputedStyle(win).zIndex, 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 10) + 1;
  }

  function updateTaskbarTabs(activeId) {
    document.querySelectorAll('.taskbar-tab').forEach(function (tab) {
      var target = tab.getAttribute('onclick') || '';
      tab.classList.toggle('active', Boolean(activeId) && target.indexOf("'" + activeId + "'") !== -1);
    });
  }

  function getTopVisibleWindow(exceptWin) {
    return Array.from(document.querySelectorAll('.window'))
      .filter(function (win) {
        return win !== exceptWin && isVisible(win);
      })
      .sort(function (a, b) {
        var az = Number.parseInt(a.style.zIndex || window.getComputedStyle(a).zIndex, 10) || 10;
        var bz = Number.parseInt(b.style.zIndex || window.getComputedStyle(b).zIndex, 10) || 10;
        return bz - az;
      })[0];
  }

  function activateFallbackWindow(exceptWin) {
    var next = getTopVisibleWindow(exceptWin);
    if (!next) {
      updateTaskbarTabs('');
      return;
    }

    window.focusWindow(getWindowId(next));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clampWindowPosition(win, left, top) {
    var maxLeft = window.innerWidth - MIN_VISIBLE_WIDTH;
    var maxTop = window.innerHeight - MIN_VISIBLE_TITLEBAR;
    var minLeft = MIN_VISIBLE_WIDTH - win.offsetWidth;
    var minTop = 0;

    return {
      left: clamp(left, minLeft, Math.max(minLeft, maxLeft)),
      top: clamp(top, minTop, Math.max(minTop, maxTop)),
    };
  }

  function getPoint(event) {
    if (event.touches && event.touches[0]) {
      return event.touches[0];
    }

    if (event.changedTouches && event.changedTouches[0]) {
      return event.changedTouches[0];
    }

    return event;
  }

  function canStartDrag(event) {
    if (isMobileLayout()) return false;
    if (event.target.closest('.titlebar-btn')) return false;

    var titlebar = event.target.closest('.titlebar');
    if (!titlebar) return false;

    var win = titlebar.closest('.window');
    if (!win || win.classList.contains('maximized')) return false;

    return win;
  }

  function startDrag(event) {
    var win = canStartDrag(event);
    if (!win) return;

    var point = getPoint(event);
    var rect = win.getBoundingClientRect();

    dragState = {
      win: win,
      offsetX: point.clientX - rect.left,
      offsetY: point.clientY - rect.top,
    };

    window.focusWindow(getWindowId(win));
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!dragState) return;

    var point = getPoint(event);
    var next = clampWindowPosition(
      dragState.win,
      point.clientX - dragState.offsetX,
      point.clientY - dragState.offsetY
    );

    dragState.win.style.left = next.left + 'px';
    dragState.win.style.top = next.top + 'px';
    event.preventDefault();
  }

  function endDrag() {
    dragState = null;
  }

  window.focusWindow = function focusWindow(id) {
    var win = getWindow(id);
    if (!win) return;

    win.style.display = 'flex';

    document.querySelectorAll('.window').forEach(function (item) {
      item.classList.remove('active');
    });

    win.classList.add('active');
    win.style.zIndex = String(getNextZIndex());
    updateTaskbarTabs(id);

    if (isMobileLayout()) {
      win.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  };

  window.minWindow = function minWindow(id) {
    var win = getWindow(id);
    if (!win) return;

    var wasActive = win.classList.contains('active');
    win.style.display = 'none';
    win.classList.remove('active');

    if (wasActive) {
      activateFallbackWindow(win);
    }
  };

  window.maxWindow = function maxWindow(id) {
    var win = getWindow(id);
    if (!win) return;

    win.classList.toggle('maximized');
    window.focusWindow(id);
  };

  window.closeWindow = function closeWindow(id) {
    var win = getWindow(id);
    if (!win) return;

    var wasActive = win.classList.contains('active');
    win.style.display = 'none';
    win.classList.remove('active');

    if (wasActive) {
      activateFallbackWindow(win);
    } else {
      updateTaskbarTabs(document.querySelector('.window.active') ? getWindowId(document.querySelector('.window.active')) : '');
    }
  };

  window.toggleStartMenu = function toggleStartMenu() {
    window.focusWindow('intro');
  };

  window.doSearch = function doSearch() {
    var container = document.getElementById('searchResults');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--win-text-muted);font-size:var(--fs-mono-s);">真实搜索将在后续阶段接入 search.json。</p>';
  };

  function updateClock() {
    var clock = document.getElementById('taskbarClock');
    if (!clock) return;

    var now = new Date();
    clock.textContent = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  }

  function updateHitCounter() {
    var counter = document.getElementById('hitCount');
    if (!counter) return;

    counter.textContent = '001337';
  }

  document.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', moveDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('mouseleave', endDrag);

  document.addEventListener('touchstart', startDrag, { passive: false });
  document.addEventListener('touchmove', moveDrag, { passive: false });
  document.addEventListener('touchend', endDrag);
  document.addEventListener('touchcancel', endDrag);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;

    var active = document.querySelector('.window.active');
    if (active) {
      window.closeWindow(getWindowId(active));
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.window').forEach(function (win, index) {
      if (!win.style.zIndex) {
        win.style.zIndex = String(10 + index);
      }
    });

    document.querySelectorAll('.window').forEach(function (win) {
      win.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.titlebar-btn')) {
          window.focusWindow(getWindowId(win));
        }
      });
    });

    updateHitCounter();
    updateClock();
    window.setInterval(updateClock, 30000);
  });
})();
```

- [ ] **Step 2：运行生产构建**

运行：

```bash
pnpm build
```

预期：命令退出码为 `0`，输出包含 Astro build 成功信息，没有 JavaScript 语法错误。

- [ ] **Step 3：启动本地开发服务器**

运行：

```bash
pnpm dev
```

预期：开发服务器启动成功，终端显示本地访问地址，例如 `http://localhost:4321/`。

- [ ] **Step 4：浏览器手测桌面端窗口交互**

在浏览器打开本地地址，视口宽度保持大于 `768px`，逐项验证：

```text
1. 按住窗口标题栏拖动，窗口跟随鼠标移动。
2. 按住标题栏按钮区域拖动，不触发窗口拖拽。
3. 将窗口向屏幕左侧、右侧、底部拖动，窗口不会完全消失，仍能从标题栏区域拖回来。
4. 点击不同窗口，只有被点击窗口有 active 状态，且显示在最上层。
5. 点击任务栏“文章/标签/归档”，对应窗口显示并激活。
6. 点击最小化按钮，窗口隐藏；如果它原本 active，则自动激活剩余可见窗口。
7. 点击关闭按钮，窗口隐藏；如果它原本 active，则自动激活剩余可见窗口。
8. 点击最大化按钮，窗口切换 maximized；最大化状态下拖拽标题栏不会移动窗口。
9. 按 Escape，当前 active 窗口关闭。
```

- [ ] **Step 5：浏览器手测移动端行为**

在浏览器 DevTools 将视口宽度调到 `768px` 或更小，逐项验证：

```text
1. 按住标题栏拖动，不会改变窗口 left/top。
2. 点击桌面图标，会显示对应窗口并滚动到该窗口附近。
3. 页面仍可正常上下滚动。
4. 任务栏标签在响应式样式下隐藏，不影响窗口操作。
```

- [ ] **Step 6：检查 reduced-motion 行为**

在系统或浏览器 DevTools 中启用 `prefers-reduced-motion: reduce`，然后在移动端宽度下点击桌面图标。

预期：窗口仍滚动到可见区域，但滚动行为不是平滑动画。

- [ ] **Step 7：提交实现**

运行：

```bash
git status --short
git add public/scripts/window-manager.js
git commit -m "Implement window manager interactions" -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

预期：提交成功，提交只包含 `public/scripts/window-manager.js`。

---

## 自审结果

- 规格覆盖：已覆盖拖拽、触摸、移动端禁拖、边界限制、聚焦置顶、最小化、最大化、关闭、任务栏 active、Escape、reduced-motion。
- 范围控制：未加入位置持久化、双击最大化、动态任务栏标签或布局管理器。
- 占位符扫描：无 TBD、TODO、待定、稍后实现类占位。
- 类型/接口一致性：计划中所有外部接口均为现有全局函数名，Astro 组件无需改动。
