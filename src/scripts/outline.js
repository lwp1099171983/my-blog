/**
 * 笔记页大纲的滚动高亮。
 *
 * 最容易踩的坑：滚动容器是 .window-body（窗口体自己 overflow-y: auto），
 * 不是视口——页面本身几乎不滚。所以这里一律按滚动容器的坐标算，
 * 不用 window.scrollY，也不能靠 IntersectionObserver 的默认 root。
 *
 * 判定逻辑（滚动位置 → 激活索引）抽在 lib/outline.ts 里，有单测。
 */

import { pickActiveIndex } from '../lib/outline';

// 标题离容器上沿多近就算「已到」。必须大于 kb.css 里 .note-split :is(h2,h3)
// 的 scroll-margin-top（10px）：否则点目录跳转后标题停在顶部下方 10px 处，
// 判定"还没到"，高亮会停在上一节。
const LEAD = 16;
const GAP = 24; // 大纲 max-height 相对容器高度留的余量

function setup(split) {
  const outline = split.querySelector('[data-outline]');
  if (!outline) return;

  const scroller = split.classList.contains('window-body') ? split : split.closest('.window-body');
  if (!scroller) return;

  const pairs = [...outline.querySelectorAll('[data-outline-link]')]
    .map((link) => ({ link, target: document.getElementById(link.dataset.outlineLink) }))
    .filter((p) => p.target);
  if (pairs.length === 0) return;

  let current = -1;
  let frame = 0;

  function update() {
    frame = 0;
    const box = scroller.getBoundingClientRect();
    const positions = pairs.map(
      (p) => p.target.getBoundingClientRect().top - box.top + scroller.scrollTop
    );
    const idx = pickActiveIndex(positions, scroller.scrollTop, LEAD);
    if (idx === current) return;
    current = idx;

    pairs.forEach((p, i) => p.link.parentElement.classList.toggle('current', i === idx));

    // 目录比容器长时，把当前项带进大纲自己的可视区
    const li = pairs[idx]?.link.parentElement;
    if (li) {
      const top = li.offsetTop;
      if (top < outline.scrollTop || top + li.offsetHeight > outline.scrollTop + outline.clientHeight) {
        outline.scrollTop = Math.max(0, top - 8);
      }
    }
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  scroller.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);

  // 窗口能拖拽缩放，所以大纲高度跟着容器走，而不是写死 vh
  const ro = new ResizeObserver(() => {
    outline.style.maxHeight = `${Math.max(120, scroller.clientHeight - GAP)}px`;
    schedule();
  });
  ro.observe(scroller);

  update();
}

document.querySelectorAll('.note-split').forEach(setup);
