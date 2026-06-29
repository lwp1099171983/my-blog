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
