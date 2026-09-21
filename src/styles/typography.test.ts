import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 排版规约守卫：正文字体 Ark Pixel 是 12px 点阵字，字号低于 12px 会糊。
 * 只允许图标字形（选择器里带 icon / sprite）例外——那些是 emoji，不是文字。
 */
const STYLE_DIR = join(process.cwd(), 'src/styles');
const MIN_PX = 12;
const ROOT_PX = 16;

function toPx(value: string): number | null {
  const m = value.trim().match(/^(-?[\d.]+)(rem|px)?$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n)) return null;
  return m[2] === 'rem' ? n * ROOT_PX : n;
}

const files = readdirSync(STYLE_DIR).filter((f) => f.endsWith('.css'));

describe('排版字号下限', () => {
  it('样式文件里不存在低于 12px 的文字字号', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const css = readFileSync(join(STYLE_DIR, file), 'utf8');
      // 逐条规则检查，便于用选择器判断是否为图标字形
      for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const [, selector, decls] = rule;
        if (/icon|sprite/i.test(selector)) continue;
        for (const decl of decls.matchAll(/font-size:\s*([^;]+);/g)) {
          const raw = decl[1].trim();
          if (raw.startsWith('var(')) continue; // token 由本文件的令牌检查覆盖
          const px = toPx(raw);
          if (px !== null && px < MIN_PX) {
            offenders.push(`${file} ${selector.trim().split('\n').pop()} → ${raw}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('字号 token 本身不低于 12px', () => {
    const global = readFileSync(join(STYLE_DIR, 'global.css'), 'utf8');
    const tokens = [...global.matchAll(/--text-fs-[a-z-]+:\s*([^;]+);/g)].map((m) => m[1].trim());
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      const px = toPx(t);
      expect(px, `token ${t} 应为可解析的字号`).not.toBeNull();
      expect(px!, `token ${t} 低于 ${MIN_PX}px`).toBeGreaterThanOrEqual(MIN_PX);
    }
  });
});

/** 展平 @media、剥掉注释后收集所有规则，selector 已 trim（够本文件用，不做完整 CSS 解析） */
function collectRules(css: string): { selector: string; decls: string }[] {
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@media[^{]*\{/g, '');
  return [...flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].trim(),
    decls: m[2],
  }));
}

function declaration(css: string, selector: string, prop: string): string | null {
  for (const rule of collectRules(css)) {
    if (rule.selector !== selector) continue;
    const m = rule.decls.match(new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`));
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * 知识树行文字守卫。
 * 回归现场：叶子链接没写 font-size，隐式继承 body 的 16px，于是同一层里
 * 文件夹名 13px、笔记名 16px，看着"不统一"。行文字必须显式声明且同档。
 */
describe('知识树行文字', () => {
  const kb = readFileSync(join(STYLE_DIR, 'kb.css'), 'utf8');
  const ROW_SELECTORS = ['.kb-tree-toggle', '.kb-tree-folder-label', '.kb-tree-link'];

  it('文件夹名与笔记名都显式声明字号，不靠继承', () => {
    for (const selector of ROW_SELECTORS) {
      expect(declaration(kb, selector, 'font-size'), `${selector} 漏了 font-size`).not.toBeNull();
    }
  });

  it('树内行文字同档（不出现 13px 与 16px 混排）', () => {
    const sizes = ROW_SELECTORS.map((s) => declaration(kb, s, 'font-size'));
    expect(new Set(sizes).size, `发现多种字号：${sizes.join(' / ')}`).toBe(1);
    expect(sizes[0]).toBe('var(--kb-tree-fs)');
  });

  it('整棵树的字号走同一档 token，便于整体调档', () => {
    expect(declaration(kb, '.kb-tree', '--kb-tree-fs')).toMatch(/^var\(--fs-(xs|small|body)\)$/);
  });

  it('叶子按 caret 宽度留白，与同级文件夹名左边缘对齐', () => {
    const gutter = declaration(kb, '.kb-tree', '--kb-tree-gutter');
    expect(gutter).not.toBeNull();
    const caret = declaration(kb, '.kb-tree-caret', 'flex');
    // flex: 0 0 12px + toggle 的 gap: 6px
    expect(caret).toMatch(/12px/);
    expect(declaration(kb, '.kb-tree-toggle', 'gap')).toBe('6px');
    expect(gutter).toBe('18px');
    expect(declaration(kb, '.kb-tree-link', 'padding')).toMatch(/var\(--kb-tree-gutter\)/);
  });
});
