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

  // 从页面上实际 .window 元素重建任务栏标签
  function rebuildTaskbarTabs(activeId) {
    var container = document.getElementById('taskbarTabs');
    if (!container) return;

    var windows = Array.from(document.querySelectorAll('.window')).filter(function (win) {
      return isVisible(win);
    });

    container.innerHTML = '';

    windows.forEach(function (win) {
      var id = getWindowId(win);
      var titlebarText = win.querySelector('.titlebar-text');
      var icon = win.querySelector('.titlebar-icon');
      var label = titlebarText ? titlebarText.textContent.trim() : id;
      var iconText = icon ? icon.textContent.trim() : '';

      var btn = document.createElement('button');
      btn.className = 'taskbar-tab' + (id === activeId ? ' active' : '');
      btn.type = 'button';
      btn.textContent = (iconText ? iconText + ' ' : '') + label;
      btn.onclick = function () { window.focusWindow(id); };
      container.appendChild(btn);
    });

    // 无窗口时清空
    if (!windows.length) {
      container.innerHTML = '';
    }
  }

  function updateTaskbarTabs(activeId) {
    var container = document.getElementById('taskbarTabs');
    if (!container) return;

    var tabs = container.querySelectorAll('.taskbar-tab');
    tabs.forEach(function (tab) {
      tab.classList.remove('active');
    });

    if (activeId) {
      // 尝试在现有标签中匹配
      var matched = false;
      tabs.forEach(function (tab, idx) {
        // 通过 onclick 字符串匹配
        if (tab.onclick && tab.onclick.toString().indexOf("'" + activeId + "'") !== -1) {
          tab.classList.add('active');
          matched = true;
        }
      });
      // 没匹配到 → 窗口可能新增了，重建
      if (!matched) {
        rebuildTaskbarTabs(activeId);
        return;
      }
    }

    // 有窗口但无激活窗口 → 重建
    if (!activeId && tabs.length > 0) {
      rebuildTaskbarTabs('');
    }
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
      var next = getTopVisibleWindow(win);
      if (next) {
        window.focusWindow(getWindowId(next));
      } else {
        updateTaskbarTabs('');
      }
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
      var next = getTopVisibleWindow(win);
      if (next) {
        window.focusWindow(getWindowId(next));
      } else if (window.location.pathname !== '/') {
        // 非首页 → 回到首页
        window.location.href = '/';
      }
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
        win.style.zIndex = String(110 + index);
      }
    });

    document.querySelectorAll('.window').forEach(function (win) {
      win.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.titlebar-btn')) {
          window.focusWindow(getWindowId(win));
        }
      });
    });

    // 初始生成任务栏标签
    var activeWin = document.querySelector('.window.active');
    rebuildTaskbarTabs(activeWin ? getWindowId(activeWin) : '');

    // 桌面图标点击 — 内页时跳回首页
    document.querySelectorAll('.desktop-icon').forEach(function (el) {
      el.addEventListener('click', function (e) {
        var href = el.getAttribute('href') || '';
        if (href.startsWith('/#')) {
          var winId = href.slice(2);
          if (window.location.pathname !== '/') {
            window.location.href = '/#win-' + winId;
            e.preventDefault();
          } else {
            e.preventDefault();
            window.focusWindow(winId);
          }
        }
      });
    });

    // 首页加载时检查 hash
    if (window.location.hash) {
      var hash = window.location.hash;
      if (hash.startsWith('#win-')) {
        var winId = hash.slice(5);
        window.focusWindow(winId);
      }
    }

    updateHitCounter();
    updateClock();
    window.setInterval(updateClock, 30000);
  });
})();
