import type { CollectionEntry } from 'astro:content';
import { posix } from 'node:path';

export type KbEntry = CollectionEntry<'kb'>;

/** 去掉章节序号前缀：第17章-计算与比较 → 计算与比较 */
export function stripPrefix(name: string): string {
  return name
    .replace(/^第[0-9零一二三四五六七八九十百千两]+[章节篇节课题讲]\s*[-－:：]?\s*/, '')
    .trim();
}

/** 归一化候选名（去扩展名、去章节前缀、压缩空白、统一 NFC） */
export function normName(name: string): string {
  return stripPrefix(name.replace(/\.md$/, ''))
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

/** 从正文取首个一级标题作为展示标题，回退到文件名（跳过代码块内的伪标题） */
export function extractTitle(body: string, fallback: string): string {
  const m = body
    .replace(/```[\s\S]*?```/g, ' ')
    .match(/^#\s+(.+?)\s*#*\s*$/m);
  if (m && m[1].trim()) return m[1].trim();
  return prettyFilename(fallback);
}

/** 文件名（去扩展名、去章节前缀）作为可读标题 */
export function prettyFilename(name: string): string {
  return stripPrefix(name.replace(/\.md$/, '')).replace(/\s+/g, ' ').trim() || name;
}

/** 构建 名称 → /kb/<id> 解析表，支持文件名、去前缀名、标题三种键 */
export function buildNameMap(entries: KbEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  const add = (key: string, url: string) => {
    if (key && !map.has(key)) map.set(key, url);
  };
  for (const e of entries) {
    const url = `/kb/${e.id}`;
    const base = e.id.split('/').pop() ?? e.id;
    add(base, url);
    add(normName(base), url);
    // 同步阶段注入的规范标题优先（已去时间戳 / 章节前缀）
    const fmTitle = (e.data as Record<string, unknown>)?.title;
    if (typeof fmTitle === 'string' && fmTitle) {
      add(fmTitle, url);
      add(normName(fmTitle), url);
    }
    const title = extractTitle(e.body ?? '', base);
    add(title, url);
    add(normName(title), url);
  }
  return map;
}

/** 把相对 .md 链接解析为 /kb/<id>（仅当目标笔记存在时返回 url） */
export function resolveRel(
  currentId: string,
  href: string,
  validIds: Set<string>,
): string | null {
  // markdown 管线可能把非 ASCII 路径做了百分号编码，先解码再解析
  let decoded: string;
  try {
    decoded = decodeURIComponent(href);
  } catch {
    decoded = href;
  }
  const pathPart = decoded.split('#')[0];
  if (!pathPart.endsWith('.md')) return null;
  const fromDir = posix.dirname(currentId);
  let target = posix
    .normalize(posix.join(fromDir, pathPart))
    .replace(/\.md$/, '')
    .normalize('NFC');
  return validIds.has(target) ? `/kb/${target}` : null;
}

/** Markdown 纯文本化，用于全文检索与摘要 */
export function plainText(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>\s]*/gm, '')
    .replace(/[*_~`>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface TreeNode {
  name: string;
  title?: string;
  id?: string;
  children: TreeNode[];
}

/** 由笔记 id 路径构建嵌套目录树（标题优先取同步阶段注入的 frontmatter） */
export function buildTree(entries: KbEntry[]): TreeNode[] {
  const root: TreeNode = { name: '', children: [] };
  const titleOf = new Map(entries.map((e) => [e.id, kbMeta(e).title]));
  for (const e of entries) {
    const parts = e.id.split('/');
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let child = cur.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, children: [] };
        if (isLast) {
          child.id = e.id;
          child.title = titleOf.get(e.id) ?? part;
        }
        cur.children.push(child);
      } else if (isLast && !child.id) {
        child.id = e.id;
        child.title = titleOf.get(e.id) ?? part;
      }
      cur = child;
    }
  }
  return root.children;
}

export interface GraphData {
  nodes: { id: string; title: string; module: string; color: string }[];
  edges: { s: string; t: string }[];
  backlinks: Record<string, string[]>;
}

const MODULE_COLORS: Record<string, string> = {
  '00-索引': '#9C94C9',
  '01-职测': '#5B9BD5',
  '02-公基': '#70AD47',
  '03-结构化面试': '#ED7D31',
  '04-综应（主观题）': '#FFC000',
  '06-其他资料': '#A6A6A6',
};

export function moduleColor(module: string): string {
  return MODULE_COLORS[module] ?? '#9C94C9';
}

/** 扫描全部笔记，构建链接图、反向链接、相邻关系 */
export function buildGraph(
  entries: KbEntry[],
  nameMap: Map<string, string>,
  validIds: Set<string>,
): GraphData {
  const edges: { s: string; t: string }[] = [];
  const backlinks = new Map<string, Set<string>>();
  const adjacency = new Map<string, Set<string>>();
  const indexIds = new Set(
    entries.filter((e) => e.id.endsWith('/index')).map((e) => e.id),
  );

  const addEdge = (s: string, t: string) => {
    if (s === t) return;
    edges.push({ s, t });
    if (!adjacency.has(s)) adjacency.set(s, new Set());
    if (!adjacency.has(t)) adjacency.set(t, new Set());
    adjacency.get(s)!.add(t);
    adjacency.get(t)!.add(s);
    if (!backlinks.has(t)) backlinks.set(t, new Set());
    backlinks.get(t)!.add(s);
  };

  for (const e of entries) {
    const body = e.body ?? '';
    // 1) [[wikilinks]]（同步阶段多已转为 /kb/ 链接，此处兜底）
    for (const m of body.matchAll(/\[\[([^\]]+)\]\]/g)) {
      const name = m[1].split('|')[0].trim();
      const url = nameMap.get(name) ?? nameMap.get(normName(name));
      if (url) addEdge(e.id, url.slice('/kb/'.length));
    }
    // 2) /kb/<id> 内部链接（同步阶段已解析为绝对路由）
    for (const m of body.matchAll(/\]\(\/kb\/([^)\s]+)\)/g)) {
      const target = m[1];
      if (validIds.has(target)) addEdge(e.id, target);
    }
    // 3) 同级 index 边（让每个模块/子目录有局部枢纽）
    const dir = posix.dirname(e.id);
    const idx = `${dir}/index`;
    if (indexIds.has(idx) && idx !== e.id) addEdge(e.id, idx);
  }

  const nodes = entries.map((e) => {
    const moduleName = e.id.split('/')[0];
    return {
      id: e.id,
      title: kbMeta(e).title,
      module: moduleName,
      color: moduleColor(moduleName),
    };
  });

  const bl: Record<string, string[]> = {};
  for (const [t, set] of backlinks) bl[t] = [...set];

  return { nodes, edges, backlinks: bl };
}

// ---------- 元数据与分面筛选 ----------

/** 笔记的规范化元数据（字段由 scripts/sync-kb.mjs 在同步阶段注入 frontmatter） */
export interface KbMeta {
  id: string;
  /** 展示标题（已去时间戳 / 章节前缀） */
  title: string;
  /** 一级模块，如 02-公基 */
  subject: string;
  subjectLabel: string;
  /** 二级目录，如 02-法律；可能为空 */
  module: string;
  moduleLabel: string;
  /** 讲义 / 题库 / 速记卡 / 答案库 / 索引 */
  type: string;
  /** 来源系列，如 结构化面试实战笔记（言哲学长） */
  source: string;
  /** 同族笔记内的序次（章号 / 期号 / 第 N 份） */
  seq?: number;
  tags: string[];
  url: string;
}

/** 去掉目录序号前缀：01-言语理解 → 言语理解（仅 1~2 位数字，避免误伤 2026-09 这类取值） */
export function cleanLabel(name: string): string {
  return name.replace(/^\d{1,2}-/, '');
}

/**
 * 拼接元数据片段：丢掉空值并去重。
 * 有些笔记的 subject / module / type 会同时等于「索引」，直接 join 会出现「索引 · 索引 · 索引」。
 */
export function metaSegments(...parts: (string | undefined | null)[]): string[] {
  return [
    ...new Set(parts.filter((s): s is string => typeof s === 'string' && s.trim() !== '')),
  ];
}

/** 取出笔记元数据，缺失字段回退到路径与正文标题 */
export function kbMeta(entry: KbEntry): KbMeta {
  const d = (entry.data ?? {}) as Record<string, unknown>;
  const segs = entry.id.split('/');
  const base = segs[segs.length - 1] ?? entry.id;
  const subject = String(d.subject ?? segs[0] ?? '');
  const mod = String(d.module ?? (segs.length > 2 ? segs[1] : ''));
  return {
    id: entry.id,
    title: String(d.title ?? extractTitle(entry.body ?? '', base)),
    subject,
    subjectLabel: cleanLabel(subject),
    module: mod,
    moduleLabel: cleanLabel(mod),
    type: String(d.type ?? '其他'),
    source: String(d.source ?? ''),
    seq: typeof d.seq === 'number' ? d.seq : undefined,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : [],
    url: `/kb/${entry.id}`,
  };
}

/** 批量转换并按 subject → module → seq → title 排序 */
export function kbMetas(entries: KbEntry[]): KbMeta[] {
  return entries
    .map(kbMeta)
    .sort(
      (a, b) =>
        a.subject.localeCompare(b.subject, 'zh') ||
        a.module.localeCompare(b.module, 'zh') ||
        (a.seq ?? 0) - (b.seq ?? 0) ||
        a.title.localeCompare(b.title, 'zh'),
    );
}

/** 类型展示顺序 */
export const KB_TYPE_ORDER = ['讲义', '题库', '速记卡', '答案库', '索引', '其他'];

export function typeRank(t: string): number {
  const i = KB_TYPE_ORDER.indexOf(t);
  return i < 0 ? KB_TYPE_ORDER.length : i;
}

export interface Facet {
  value: string;
  label: string;
  count: number;
}

/** 统计某个维度的取值与计数（用于分面筛选页的侧栏） */
export function facetCounts(
  items: KbMeta[],
  pick: (m: KbMeta) => string,
): Facet[] {
  const map = new Map<string, number>();
  for (const it of items) {
    const v = pick(it);
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, label: cleanLabel(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'zh'));
}
