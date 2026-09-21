import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 同步产物契约测试：直接校验 src/content/kb 下真实笔记的完整性与链接自洽性。
 * 这些不变量正是 sync-kb.mjs 的验收标准，回归时最先在这里炸。
 */
const KB_DIR = join(process.cwd(), 'src/content/kb');
const META = join(KB_DIR, '.sync-meta.json');
const EXCLUDED = ['00-索引/错题本.md', '00-索引/学习进度.md', '00-索引/每日作息与状态管理.md'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.md') ? [full] : [];
  });
}

/** 与 content.config.ts 的 generateId 保持一致：相对路径去掉 .md */
function idOf(file: string): string {
  return relative(KB_DIR, file).split(sep).join('/').replace(/\.md$/, '');
}

const hasKb = existsSync(KB_DIR);
const files = hasKb ? walk(KB_DIR) : [];
const ids = new Set(files.map(idOf));
const bodies = new Map(files.map((f) => [idOf(f), readFileSync(f, 'utf8')]));

describe.skipIf(!hasKb)('同步产物契约', () => {
  it('存在笔记', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('每篇都带 frontmatter 的 title / subject / type', () => {
    const missing: string[] = [];
    for (const [id, raw] of bodies) {
      const fm = raw.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
      for (const key of ['title', 'subject', 'type']) {
        if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)) missing.push(`${id} 缺 ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('正文不残留裸相对 .md 链接（同步阶段必须改写为 /kb/ 绝对路由）', () => {
    const offenders: string[] = [];
    for (const [id, raw] of bodies) {
      for (const m of raw.matchAll(/\]\(([^)\s]+)\)/g)) {
        const href = m[1];
        if (/^[a-z]+:\/\//i.test(href)) continue;
        if (href.startsWith('/kb/')) continue;
        if (href.startsWith('#')) continue;
        if (href.endsWith('.md') || href.includes('.md#')) offenders.push(`${id} → ${href}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('所有 /kb/ 内部链接都指向存在的笔记（无悬空）', () => {
    const dangling: string[] = [];
    for (const [id, raw] of bodies) {
      for (const m of raw.matchAll(/\]\(\/kb\/([^)\s]+)\)/g)) {
        const target = decodeURIComponent(m[1].split('#')[0]).normalize('NFC');
        if (!ids.has(target)) dangling.push(`${id} → ${target}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('正文不再重复标题（标题只留在 frontmatter）', () => {
    const offenders: string[] = [];
    for (const [id, raw] of bodies) {
      const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
      const first = body.split('\n').find((l) => l.trim() !== '') ?? '';
      if (/^#\s+/.test(first)) offenders.push(id);
    }
    expect(offenders).toEqual([]);
  });

  it('标题不带目录序号前缀（`01-职测 · 答案库` 这类冗余）', () => {
    const offenders: string[] = [];
    for (const [id, raw] of bodies) {
      const title = raw.match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? '';
      if (/^\d{1,2}-/.test(title)) offenders.push(`${id} → ${title}`);
    }
    expect(offenders).toEqual([]);
  });

  it('.sync-meta.json 的统计与实际文件一致', () => {
    if (!existsSync(META)) return; // 该文件已 gitignore，缺失时跳过
    const meta = JSON.parse(readFileSync(META, 'utf8')) as {
      count: number;
      resolvedLinks: number;
      excluded: string[];
      typeCounts: Record<string, number>;
    };
    expect(meta.count).toBe(files.length);
    expect(meta.excluded.sort()).toEqual([...EXCLUDED].sort());
    expect(meta.resolvedLinks).toBeGreaterThan(0);
    expect(Object.values(meta.typeCounts).reduce((a, b) => a + b, 0)).toBe(meta.count);
  });

  it('被排除的私人跟踪文件确实未入库', () => {
    for (const rel of EXCLUDED) {
      expect(ids.has(rel.replace(/\.md$/, ''))).toBe(false);
    }
  });
});
