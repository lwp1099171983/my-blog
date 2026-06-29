(function () {
  function getWindow(id) {
    return document.getElementById('win-' + id);
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
      tab.classList.toggle('active', target.indexOf("'" + activeId + "'") !== -1);
    });
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

    if (window.innerWidth <= 768) {
      win.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  window.minWindow = function minWindow(id) {
    var win = getWindow(id);
    if (!win) return;
    win.style.display = 'none';
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
    win.style.display = 'none';
    win.classList.remove('active');
    updateTaskbarTabs('');
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

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.window').forEach(function (win, index) {
      if (!win.style.zIndex) {
        win.style.zIndex = String(10 + index);
      }
    });

    document.querySelectorAll('.window').forEach(function (win) {
      win.addEventListener('mousedown', function (event) {
        if (!event.target.closest('.titlebar-btn')) {
          window.focusWindow(win.id.replace('win-', ''));
        }
      });
    });

    updateHitCounter();
    updateClock();
    window.setInterval(updateClock, 30000);
  });
})();
