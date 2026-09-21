import { describe, expect, it } from 'vitest';
import {
  RESIZE_DIRS,
  clampPosition,
  resizeRect,
  visibleBounds,
  type Rect,
  type ResizeDir,
  type ResizeLimits,
  type Viewport,
} from './window-geometry';

const VIEW: Viewport = {
  innerWidth: 1400,
  innerHeight: 900,
  minVisibleWidth: 120,
  minVisibleHeight: 48,
};

const START: Rect = { left: 300, top: 200, width: 500, height: 300 };

function limits(overrides: Partial<ResizeLimits> = {}): ResizeLimits {
  return {
    minWidth: 360,
    minHeight: 240,
    minLeft: 0,
    minTop: 0,
    maxRight: VIEW.innerWidth,
    maxBottom: VIEW.innerHeight - 54,
    ...overrides,
  };
}

describe('visibleBounds', () => {
  it('无滚动时右/下边界就是视口', () => {
    const b = visibleBounds(START, VIEW);
    expect(b).toEqual({ minLeft: 0, minTop: 0, maxRight: 1400, maxBottom: 900 });
  });

  it('页面滚动后边界跟着滚（文档坐标）', () => {
    const b = visibleBounds(START, { ...VIEW, scrollX: 0, scrollY: 200, reservedBottom: 54 });
    expect(b.maxBottom).toBe(200 + 900 - 54);
    expect(b.maxRight).toBe(1400);
  });

  it('已经在屏幕外的窗口：边界收到它自己，只能缩回来不能继续外扩', () => {
    const offscreen: Rect = { left: -300, top: -80, width: 500, height: 300 };
    const b = visibleBounds(offscreen, VIEW);
    expect(b.minLeft).toBe(-300);
    expect(b.minTop).toBe(-80);
  });

  it('已经越过右/下边界的窗口，maxRight 取自己的右边界而非视口', () => {
    const overflow: Rect = { left: 1200, top: 800, width: 500, height: 300 };
    const b = visibleBounds(overflow, VIEW);
    expect(b.maxRight).toBe(1700);
    expect(b.maxBottom).toBe(1100);
  });
});

describe('resizeRect — 方向语义', () => {
  it('东南向放大：左上角不动', () => {
    expect(resizeRect(START, 'se', 100, 50, limits())).toEqual({
      left: 300,
      top: 200,
      width: 600,
      height: 350,
    });
  });

  it('西北向放大：右下角不动，左上跟着走', () => {
    const r = resizeRect(START, 'nw', -100, -50, limits());
    expect(r).toEqual({ left: 200, top: 150, width: 600, height: 350 });
    expect(r.left + r.width).toBe(START.left + START.width);
    expect(r.top + r.height).toBe(START.top + START.height);
  });

  it('边把手只影响一个维度', () => {
    expect(resizeRect(START, 'e', 40, 999, limits())).toEqual({
      left: 300,
      top: 200,
      width: 540,
      height: 300,
    });
    expect(resizeRect(START, 'n', 999, -40, limits())).toEqual({
      left: 300,
      top: 160,
      width: 500,
      height: 340,
    });
  });

  it('八个方向都能识别（n/s/e/w 是 ne/nw/se/sw 的子串，别串味）', () => {
    for (const dir of RESIZE_DIRS) {
      const r = resizeRect(START, dir, 10, 10, limits());
      expect(r.width, dir).toBeGreaterThan(0);
      expect(r.height, dir).toBeGreaterThan(0);
    }
    // 拉左边只动左边：宽 -10、右边界不变
    const w = resizeRect(START, 'w', 10, 0, limits());
    expect([w.left, w.width, w.left + w.width]).toEqual([310, 490, 800]);
  });
});

describe('resizeRect — 边界与极端输入', () => {
  it('缩不到比最小尺寸更小（任意方向）', () => {
    for (const dir of RESIZE_DIRS) {
      const r = resizeRect(START, dir, -9999, -9999, limits());
      expect(r.width, dir).toBeGreaterThanOrEqual(360);
      expect(r.height, dir).toBeGreaterThanOrEqual(240);
    }
  });

  it('放大被 maxRight / maxBottom 挡住', () => {
    const r = resizeRect(START, 'se', 9999, 9999, limits());
    expect(r.left + r.width).toBe(1400);
    expect(r.top + r.height).toBe(846);
  });

  it('左/上边不越过 minLeft / minTop', () => {
    const r = resizeRect(START, 'nw', -9999, -9999, limits());
    expect(r.left).toBe(0);
    expect(r.top).toBe(0);
    // 右下角仍然钉在原处
    expect(r.width).toBe(800);
    expect(r.height).toBe(500);
  });

  it('已经贴边的窗口不跳变：minLeft 来自窗口自身而不是硬编码 0', () => {
    const offscreen: Rect = { left: -80, top: -30, width: 500, height: 300 };
    const b = visibleBounds(offscreen, VIEW);
    const r = resizeRect(offscreen, 'w', 30, 0, limits({ minLeft: b.minLeft }));
    expect(r.left).toBe(-50); // 收回 30px，而不是跳到 0
  });

  it('maxRight 比 minWidth 还紧时，仍然满足最小宽度', () => {
    const squeezed: Rect = { left: 950, top: 100, width: 500, height: 300 };
    const r = resizeRect(squeezed, 'e', -9999, 0, limits({ maxRight: 1000 }));
    expect(r.width).toBe(360);
  });

  it('反向拉扯时右下角不会被 maxRight 拽动', () => {
    // 右边界已经在视口外：拉左边不该把右边拉回来
    const overflow: Rect = { left: 1200, top: 100, width: 500, height: 300 };
    const b = visibleBounds(overflow, VIEW);
    const r = resizeRect(
      overflow,
      'w',
      100,
      0,
      limits({ minLeft: b.minLeft, maxRight: b.maxRight }),
    );
    expect(r.left + r.width).toBe(1700);
  });

  it('小数位移取整，避免亚像素抖动', () => {
    const r = resizeRect(START, 'se', 33.4, 20.6, limits());
    expect(Number.isInteger(r.left)).toBe(true);
    expect(Number.isInteger(r.top)).toBe(true);
    expect(Number.isInteger(r.width)).toBe(true);
    expect(Number.isInteger(r.height)).toBe(true);
    expect(r.width).toBe(533);
  });

  it('最小尺寸为 0 时不产生负宽高', () => {
    const r = resizeRect(
      { left: 0, top: 0, width: 10, height: 10 },
      'se',
      -9999,
      -9999,
      limits({ minWidth: 0, minHeight: 0 }),
    );
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });
});

describe('clampPosition', () => {
  const size = { width: 500, height: 300 };

  it('视口内的位置原样返回', () => {
    expect(clampPosition({ left: 300, top: 200 }, size, VIEW)).toEqual({ left: 300, top: 200 });
  });

  it('不许把窗口整个推出屏幕：左上最多留 120px 可见', () => {
    expect(clampPosition({ left: -9999, top: -9999 }, size, VIEW)).toEqual({
      left: 120 - 500,
      top: 0,
    });
  });

  it('右下方向至少留出可见宽度与标题栏高度', () => {
    expect(clampPosition({ left: 9999, top: 9999 }, size, VIEW)).toEqual({
      left: 1400 - 120,
      top: 900 - 48,
    });
  });

  it('比视口还宽的巨窗优先保住可见性', () => {
    const wide = clampPosition({ left: 9999, top: 0 }, { width: 2000, height: 300 }, VIEW);
    expect(wide.left).toBe(1400 - 120);
    const leftward = clampPosition({ left: -9999, top: 0 }, { width: 2000, height: 300 }, VIEW);
    expect(leftward.left).toBe(120 - 2000);
  });

  it('带滚动量时标题栏不会被推到可视区上边界之上', () => {
    const pos = clampPosition({ left: 100, top: 0 }, size, { ...VIEW, scrollY: 300 });
    expect(pos.top).toBe(300);
  });
});
