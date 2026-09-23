/**
 * 笔记页大纲：从渲染后的标题里筛出可用的目录。
 *
 * 背景（2026-09-23 全库统计）：知识库里有 3784 条标题是 OCR 搬运产生的
 * 「PDF 第 N 页」，可读标题只有 569 条（页码型占 87%）。照搬掘金式大纲
 * 会让公基那批讲义变成一列页码，所以这里只做两件事：
 *   1. 滤掉页码型标题；
 *   2. 可读标题不足门槛时整体不输出（宁可不显示，也不给一份更糟的导航）。
 *
 * 纯函数、不碰 DOM：页面把 render() 返回的 headings 直接喂进来即可。
 */

export interface RawHeading {
  depth: number;
  text: string;
  slug: string;
}

export interface OutlineItem {
  text: string;
  slug: string;
  /** 0 = 一级（该篇最浅的层级），1 = 二级 */
  level: number;
}

/** 至少要有几条可读标题，才值得显示大纲 */
export const MIN_OUTLINE_ITEMS = 3;

/** 只认「PDF 第 N 页」这一种形态；不带数字的「PDF 第 页」放行，避免误伤 */
const PDF_PAGE = /^pdf\s*第\s*\d+\s*页$/i;

/**
 * 标题文本清洗：Astro 交给我们的 headings[].text 是渲染后的 HTML，
 * 可能带 <code> / <strong> 与实体，要还原成纯文本再展示与判断。
 */
export function cleanHeadingText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 页码型噪声标题（OCR 逐页搬运的产物） */
export function isNoiseHeading(text: string): boolean {
  return PDF_PAGE.test(cleanHeadingText(text));
}

/**
 * 标题列表 → 大纲条目。返回空数组表示"这篇不该有大纲"。
 * 只保留 h2/h3：h1 是文章标题本身，h4 以下太细，都不进目录。
 */
export function buildOutline(headings: readonly RawHeading[]): OutlineItem[] {
  const kept: { depth: number; text: string; slug: string }[] = [];

  for (const h of headings) {
    if (h.depth !== 2 && h.depth !== 3) continue;
    if (isNoiseHeading(h.text)) continue;
    const text = cleanHeadingText(h.text);
    if (!text || !h.slug) continue;
    kept.push({ depth: h.depth, text, slug: h.slug });
  }

  if (kept.length < MIN_OUTLINE_ITEMS) return [];

  // 层级归一化：某些笔记只有 h3，直接按 depth 算会让整列都缩进一级
  const base = Math.min(...kept.map((h) => h.depth));
  return kept.map((h) => ({ text: h.text, slug: h.slug, level: h.depth - base }));
}

/**
 * 滚动位置 → 激活索引。offsets 是各标题相对滚动内容顶部的偏移（升序）。
 * 返回最后一个"已经滚过顶部"的索引；一个都没滚过时返回 0，让正文顶部高亮第一条。
 * lead 是余量：想让「快滚到的标题」提前点亮就传它。
 */
export function pickActiveIndex(offsets: readonly number[], scrollTop: number, lead = 0): number {
  if (offsets.length === 0) return -1;
  let idx = 0;
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] - scrollTop - lead <= 0) idx = i;
    else break;
  }
  return idx;
}
