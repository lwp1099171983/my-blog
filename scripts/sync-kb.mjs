// 把考编知识库同步进博客的 kb 内容集合。
//
// 用法：
//   node scripts/sync-kb.mjs            # 全量同步
//   node scripts/sync-kb.mjs --dry     # 只打印将要复制的文件，不写入
//
// 设计：
// - 源：考公仓库的 知识库/ 目录（源目录名就叫「考公」，Markdown 笔记，已分模块）
// - 目标：本仓库 src/content/kb/，保留相对目录结构
// - 默认排除纯个人跟踪文件（错题本 / 学习进度 / 每日作息），只发布知识内容
// - 文件名与正文中的内部链接在【同步阶段】直接解析为绝对 /kb/<id> 路由：
//     · 相对 .md 链接（如 ../02-公基/.../第01章-x.md）按当前文件位置解析为目标 id
//     · [[名称]] / [[名称|别名]] 按 名称→id 表解析（支持文件名 / 去章节前缀 / 标题）
//   这样发布后的页面无需运行时插件即可正确互链，反向链接/图谱也能构建。
// - 文件名里的空格统一规范为「-」（标准 Markdown 与 URL 不允许空格）。
// - 【新增】同步阶段为每篇注入规范 frontmatter（subject / module / type / source / seq / title），
//   作为前端分面筛选（/kb/browse）的数据基础。筛选维度由文件已内嵌的 ```yaml 元数据块
//   （doc_id / subject / module / source_pdf / ocr_status）+ 路径 + 文件名自动推导，无需手工标注。

import {
  rm,
  mkdir,
  readdir,
  stat,
  writeFile,
  readFile,
} from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, extname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SRC = '/Users/nstarlin/Documents/Codex/考公/知识库';
const DEST = join(ROOT, 'src', 'content', 'kb');

const EXCLUDE = new Set([
  '00-索引/错题本.md',
  '00-索引/学习进度.md',
  '00-索引/每日作息与状态管理.md',
]);

const isDry = process.argv.includes('--dry');

// ---------- 规范化 / 解析辅助 ----------

/** 把相对路径各段里的空格规范为「-」（保留 . / .. 段原样） */
function sanitizeRelPath(rel) {
  const [path, anchor] = rel.split('#');
  const segs = path
    .split('/')
    .map((s) => (s === '..' || s === '.' ? s : s.replace(/\s+/g, '-')));
  return segs.join('/') + (anchor ? '#' + anchor : '');
}

/** 去掉章节序号前缀：第17章-计算与比较 → 计算与比较 */
function stripPrefix(name) {
  return name
    .replace(/^第[0-9零一二三四五六七八九十百千两]+[章节篇节课题讲]\s*[-－:：]?\s*/, '')
    .trim();
}
function normName(name) {
  return stripPrefix(name.replace(/\.md$/, ''))
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}
function extractTitle(body) {
  const m = body
    .replace(/```[\s\S]*?```/g, ' ') // 跳过代码块内的伪标题
    .match(/^#\s+(.+?)\s*#*\s*$/m);
  return m && m[1].trim() ? m[1].trim() : '';
}

/**
 * 剥掉正文开头的首个 H1：它已经提进 frontmatter 的 title，
 * 留在正文里会让页面上出现两个标题（且正文那个常带 OCR 噪声）。
 */
function stripLeadingH1(body) {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => l.trim() !== '');
  if (i >= 0 && /^#\s+/.test(lines[i])) lines.splice(i, 1);
  return lines.join('\n');
}

/** 由源相对路径得到 kb id（去 .md、空格规范） */
function idOf(rel) {
  return sanitizeRelPath(rel).replace(/\.md$/, '');
}

// ---------- 元数据推导 ----------

/** 解析正文里的内嵌 YAML 元数据块（```yaml ... ```） */
function parseEmbeddedMeta(body) {
  const m = body.match(/```ya?ml[ \t]*\r?\n([\s\S]*?)\r?\n```/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[kv[1]] = v;
  }
  return out;
}

/** 去掉 OCR 时间戳后缀：xxx_20260914202143 → xxx */
function stripTimestamp(s) {
  return s.replace(/[_\s]*_?\d{10,}$/, '').replace(/[_\s]+$/, '').trim();
}

/**
 * 修复「公 文 知 识」/「公-文-知-识」这类逐字分隔。
 * 仅在【整串】都由「单字 + 分隔符」构成时才压缩，避免误伤「言语理解-逻辑填空」。
 */
function squeezeSpaced(s) {
  if (/^[\u4e00-\u9fa5](?:[ \t-][\u4e00-\u9fa5])+$/.test(s)) {
    return s.replace(/[ \t-]/g, '');
  }
  return s;
}

/** 从路径 / 文件名推导笔记类型 */
function inferType(rel, stem) {
  const hay = `${rel} ${stem}`;
  if (/答案库/.test(hay)) return '答案库';
  // 目录级的 index / README 属于导航页
  if (/(^|\/)(index|README)(\.md)?$/i.test(rel)) return '索引';
  if (/索引|知识图谱|考点速览|资料清单|目标考试档案|总览/i.test(stem)) {
    return '索引';
  }
  if (/(^|\/)速记卡\//.test(rel) || /速记|速查|思维导图|必背|400词|词汇/.test(stem)) {
    return '速记卡';
  }
  if (/考题必刷|必刷|带刷|刷题|以练代背|代背|题本|真题|模拟|练习|习题/.test(hay)) {
    return '题库';
  }
  return '讲义';
}

/** 清洗来源路径段：去「【xx】」前缀、「2027年」年份、机构名、「01.」序号、尾部长数字 */
function cleanSeg(s) {
  const out = s
    .replace(/^【[^】]*】/, '')
    .replace(/^\d{4}\s*年?/, '')
    .replace(/^(超格|超哥|粉笔|华图|中公|上岸鸭)/, '')
    .replace(/^\d+[.、]\s*/, '')
    .replace(/[-_]?\d{6,}$/, '')
    .trim();
  return out || s;
}

/** 推导来源：优先内嵌 source_pdf 的父目录名，回退到模块名 */
function inferSource(rel, embedded) {
  const raw = embedded.source_pdf || '';
  if (raw) {
    const segs = raw.split('/').filter(Boolean);
    const file = segs.pop() ?? '';
    const parent = segs.pop();
    if (parent) return cleanSeg(parent);
    return cleanSeg(stripTimestamp(file.replace(/\.pdf$/i, '')));
  }
  return cleanSeg(rel.split('/')[0].replace(/^\d+-/, ''));
}

const CN_NUM = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5,
  六: 6, 七: 7, 八: 8, 九: 9, 十: 10,
};

/** 推导序次（章 / 期 / 第 N 份），用于同族笔记排序 */
function inferSeq(stem) {
  // 中文括号序号优先级最高：「百题带刷（三）」类，章号对它们没有区分度
  let m = stem.match(/[（(]\s*([一二三四五六七八九十])\s*[）)]/);
  if (m) return CN_NUM[m[1]];
  // 「考题必刷15题3」→ 3
  m = stem.match(/必刷\s*\d*\s*题\s*(\d+)/);
  if (m) return Number(m[1]);
  m = stem.match(/第\s*(\d+)\s*[章期讲]/);
  if (m) return Number(m[1]);
  m = stem.match(/[（(](\d+)\s*[-–]\s*\d+\s*题[）)]/);
  if (m) return Number(m[1]);
  return undefined;
}

/** 推导 subject / module：速记卡目录下按其后两级目录取，否则用内嵌值或路径 */
function inferSubjectModule(rel, embedded) {
  const segs = rel.split('/');
  const i = segs.indexOf('速记卡');
  if (i >= 0) {
    // 去掉最后一段（文件名），速记卡下只按目录层级取 subject / module；
    // 不足两级目录时（如 速记卡/00-总览/xxx.md）归回 00-索引，不虚构成模块
    const dirs = segs.slice(i + 1, -1);
    if (dirs.length >= 2) return { subject: dirs[0], module: dirs[1] };
    return { subject: segs[0] ?? '', module: '' };
  }
  return {
    subject: embedded.subject || segs[0] || '',
    module: embedded.module || (segs.length > 2 ? segs[1] : ''),
  };
}

/** 规范化展示标题：正文 H1 优先，回退文件名（去时间戳 / 章节前缀 / 逐字分隔） */
function normalizeTitle(body, stem) {
  const h1 = extractTitle(body);
  if (h1) return squeezeSpaced(stripTimestamp(h1));
  return squeezeSpaced(stripPrefix(stripTimestamp(stem)));
}

/** 汇总一篇笔记的全部元数据 */
function deriveMeta(rel, base, body) {
  const embedded = parseEmbeddedMeta(body);
  const stem = base.replace(/\.md$/i, '');
  const { subject, module } = inferSubjectModule(rel, embedded);
  return {
    title: normalizeTitle(body, stem),
    subject,
    module,
    type: inferType(rel, stem),
    source: inferSource(rel, embedded),
    seq: inferSeq(stem),
  };
}

/** YAML 字符串字面量（统一双引号 + 转义） */
function yamlStr(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** 生成 frontmatter 文本（含结尾空行）；正文已有 frontmatter 时返回空串 */
function buildFrontmatter(meta, body) {
  if (/^---\r?\n/.test(body)) return '';
  const lines = ['---', `title: ${yamlStr(meta.title)}`];
  if (meta.subject) lines.push(`subject: ${yamlStr(meta.subject)}`);
  if (meta.module) lines.push(`module: ${yamlStr(meta.module)}`);
  lines.push(`type: ${yamlStr(meta.type)}`);
  if (meta.source) lines.push(`source: ${yamlStr(meta.source)}`);
  if (meta.seq != null) lines.push(`seq: ${meta.seq}`);
  lines.push('---', '');
  return lines.join('\n');
}

// ---------- 遍历 ----------

async function walk(dir, out = []) {
  for (const name of await readdir(dir)) {
    if (name === '.DS_Store') continue;
    const full = join(dir, name);
    const s = await stat(full);
    if (s.isDirectory()) await walk(full, out);
    else if (extname(name).toLowerCase() === '.md') out.push(full);
  }
  return out;
}

// ---------- 主流程 ----------

async function main() {
  if (!existsSync(SRC)) {
    console.error(`源目录不存在：${SRC}`);
    process.exit(1);
  }

  const files = await walk(SRC);
  let rels = files.map((f) => relative(SRC, f));
  rels = rels.filter((r) => !EXCLUDE.has(r.replace(/\\/g, '/')));

  // 1) 建立 id 集合 与 名称→id 表
  const idSet = new Set(rels.map(idOf));
  const nameMap = new Map();
  const addName = (key, id) => {
    if (key && !nameMap.has(key)) nameMap.set(key, id);
  };
  const bodies = new Map();
  for (const rel of rels) {
    const id = idOf(rel);
    const base = rel.split('/').pop();
    addName(base, id);
    addName(normName(base), id);
    const body = await readFile(join(SRC, rel), 'utf8');
    bodies.set(rel, body);
    const title = extractTitle(body);
    if (title) {
      addName(title, id);
      addName(normName(title), id);
    }
  }

  console.log(`发现 ${files.length} 篇，排除 ${files.length - rels.length} 篇个人跟踪，解析 ${rels.length} 篇`);

  if (isDry) {
    const typeCount = new Map();
    for (const rel of rels) {
      const base = rel.split('/').pop();
      const meta = deriveMeta(rel, base, bodies.get(rel));
      typeCount.set(meta.type, (typeCount.get(meta.type) ?? 0) + 1);
      console.log(`  + [${meta.type}] ${idOf(rel)}`);
      console.log(`      title=${meta.title} | subject=${meta.subject} | module=${meta.module} | source=${meta.source} | seq=${meta.seq ?? '-'}`);
    }
    console.log('\n类型分布：', [...typeCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' / '));
    return;
  }

  if (existsSync(DEST)) await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  let resolved = 0;
  const typeCount = new Map();
  const sourceSet = new Set();

  for (const rel of rels) {
    const from = join(SRC, rel);
    const to = join(DEST, idOf(rel) + (rel.endsWith('.md') ? '.md' : ''));
    const original = bodies.get(rel) ?? (await readFile(from, 'utf8'));
    let body = original;

    // 2a) 相对 .md 链接（含裸相对，如 知识图谱.md）→ /kb/<id>
    //     目标不存在（如被排除的个人跟踪文件）则退化为纯文本
    body = body.replace(
      /\[([^\]]*)\]\(((?:\.\.?\/)?[^)]*?\.md)(#[^)]*)?\)/g,
      (m, label, dest) => {
        if (/^[a-z][a-z0-9+.-]*:/i.test(dest)) return m; // 外部链接不动
        const absRel = posix.normalize(posix.join(dirname(rel), dest));
        const id = idOf(absRel);
        if (idSet.has(id)) {
          resolved += 1;
          return `[${label}](/kb/${id})`;
        }
        return label; // 指向尚未入库的笔记，保留可见文字
      },
    );

    // 2b) [[名称]] / [[名称|别名]] → /kb/<id>
    body = body.replace(/\[\[([^\]]+)\]\]/g, (m, inner) => {
      const [name, alias] = inner.split('|').map((s) => s.trim());
      const id = nameMap.get(name) || nameMap.get(normName(name));
      if (id) {
        resolved += 1;
        return `[${alias || name}](/kb/${id})`;
      }
      return alias || name;
    });

    // 2c) 剥掉正文开头重复的 H1（标题已在 frontmatter 里）
    body = stripLeadingH1(body);

    // 2d) 注入规范 frontmatter（分面筛选的数据基础）
    const meta = deriveMeta(rel, rel.split('/').pop(), original);
    const fm = buildFrontmatter(meta, original);
    typeCount.set(meta.type, (typeCount.get(meta.type) ?? 0) + 1);
    if (meta.source) sourceSet.add(meta.source);

    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, fm + body);
  }

  const summary = {
    syncedAt: new Date().toISOString(),
    count: rels.length,
    resolvedLinks: resolved,
    excluded: [...EXCLUDE],
    typeCounts: Object.fromEntries(
      [...typeCount.entries()].sort((a, b) => b[1] - a[1]),
    ),
    sourceCount: sourceSet.size,
  };
  await writeFile(join(DEST, '.sync-meta.json'), JSON.stringify(summary, null, 2) + '\n');

  console.log(`✅ 同步完成：${rels.length} 篇，解析内部链接 ${resolved} 处`);
  console.log(
    `   类型分布：${[...typeCount.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' / ')}`,
  );
  console.log(`   来源系列：${sourceSet.size} 个`);
  console.log(`   下次源库（考公）入库新章节后，重新运行本脚本即可更新。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
