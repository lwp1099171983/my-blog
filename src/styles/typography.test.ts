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
