/**
 * 窗口几何 —— 拖拽钳制与八向缩放的纯函数。
 *
 * 坐标系一律用**文档坐标**（视口坐标 + 滚动量）。窗口是 position:absolute，
 * `style.left/top` 就是文档坐标；而 `getBoundingClientRect()` / `clientX` 是视口坐标。
 * /kb/ 这类页面文档比视口高、会滚动，两者混用就会漂移，所以这里显式带上 scrollX/scrollY。
 */

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  left: number;
  top: number;
}

export interface Rect extends Position, Size {}

export interface Viewport {
  innerWidth: number;
  innerHeight: number;
  scrollX?: number;
  scrollY?: number;
  /** 底部固定任务栏高度：窗口不该缩到它底下、再也抓不到把手 */
  reservedBottom?: number;
  /** 拖拽时至少留在视口内的宽度（否则窗口被推出屏幕外就抓不回来） */
  minVisibleWidth: number;
  /** 拖拽时至少留在视口内的高度（留出标题栏） */
  minVisibleHeight: number;
}

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface Bounds {
  minLeft: number;
  minTop: number;
  maxRight: number;
  maxBottom: number;
}

export interface ResizeLimits extends Bounds {
  minWidth: number;
  minHeight: number;
}

export const RESIZE_DIRS: ResizeDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 缩放时允许的边界（文档坐标）。
 *
 * 规则是"不许变得更不可见"：已经贴边或超出视口的窗口可以收回来，但不能继续往外扩——
 * 否则把手会跑到屏幕外。左右/上下各自独立，所以不会因为一个方向越界而另一个方向跳一下。
 */
export function visibleBounds(rect: Rect, view: Viewport): Bounds {
  const scrollX = view.scrollX ?? 0;
  const scrollY = view.scrollY ?? 0;

  return {
    minLeft: Math.min(0, rect.left),
    minTop: Math.min(0, rect.top),
    maxRight: Math.max(rect.left + rect.width, scrollX + view.innerWidth),
    maxBottom: Math.max(
      rect.top + rect.height,
      scrollY + view.innerHeight - (view.reservedBottom ?? 0),
    ),
  };
}

/**
 * 按方向与指针位移算出新矩形。
 *
 * `dx/dy` 是相对手势起点的位移；只有被拖的那个方向会变——
 * 拉右边不动左边，拉上边不动下边。尺寸不小于 minWidth/minHeight，
 * 边不越过 limits（minLeft/minTop 默认从 visibleBounds 来，保证不跳出屏幕）。
 */
export function resizeRect(
  start: Rect,
  dir: ResizeDir,
  dx: number,
  dy: number,
  limits: ResizeLimits,
): Rect {
  const minWidth = Math.max(0, limits.minWidth);
  const minHeight = Math.max(0, limits.minHeight);

  let left = start.left;
  let top = start.top;
  let right = start.left + start.width;
  let bottom = start.top + start.height;

  if (dir.includes('e')) {
    // 拉不动到比最小宽度还窄；也不越过 maxRight
    right = clamp(right + dx, left + minWidth, Math.max(left + minWidth, limits.maxRight));
  }
  if (dir.includes('w')) {
    // 向左最多到 minLeft；向右最多留出最小宽度
    left = clamp(left + dx, Math.min(limits.minLeft, right - minWidth), right - minWidth);
  }
  if (dir.includes('s')) {
    bottom = clamp(bottom + dy, top + minHeight, Math.max(top + minHeight, limits.maxBottom));
  }
  if (dir.includes('n')) {
    top = clamp(top + dy, Math.min(limits.minTop, bottom - minHeight), bottom - minHeight);
  }

  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

/**
 * 拖拽时的位置钳制：窗口不能整个被推出屏幕，标题栏也不能推到视口上边界之上。
 * 巨窗（比视口还宽）时优先保住可见性而不是原始的下限。
 */
export function clampPosition(pos: Position, size: Size, view: Viewport): Position {
  const scrollX = view.scrollX ?? 0;
  const scrollY = view.scrollY ?? 0;

  const viewLeft = scrollX;
  const viewRight = scrollX + view.innerWidth;
  const viewTop = scrollY;
  const viewBottom = scrollY + view.innerHeight;

  const minLeft = viewLeft + view.minVisibleWidth - size.width;
  const maxLeft = viewRight - view.minVisibleWidth;
  const minTop = viewTop;
  const maxTop = viewBottom - view.minVisibleHeight;

  return {
    left: Math.round(clamp(pos.left, Math.min(minLeft, maxLeft), Math.max(minLeft, maxLeft))),
    top: Math.round(clamp(pos.top, Math.min(minTop, maxTop), Math.max(minTop, maxTop))),
  };
}
