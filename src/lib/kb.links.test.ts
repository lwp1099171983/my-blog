import { describe, expect, it } from 'vitest';
import {
  buildGraph,
  buildNameMap,
  buildTree,
  extractTitle,
  moduleColor,
  normName,
  plainText,
  prettyFilename,
  resolveRel,
  stripPrefix,
  type KbEntry,
} from './kb';

/** 构造最小可用的 kb 条目：工具库只消费 id / body / data */
function mk(id: string, body = '', data: Record<string, unknown> = {}): KbEntry {
  return { id, body, data, collection: 'kb' } as unknown as KbEntry;
}

describe('stripPrefix', () => {
  const cases: [string, string][] = [
    ['第17章-计算与比较', '计算与比较'],
    ['第1节：语序', '语序'],
    ['第05章 图形推理', '图形推理'],
    ['第十一章-数字推理', '数字推理'],
    ['第两百讲-极限', '极限'],
    ['第02篇-资料分析', '资料分析'],
    ['第3章逻辑判断', '逻辑判断'],
    ['第4题-参考答案', '参考答案'],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(stripPrefix(input)).toBe(expected);
  });

  it('非章节前缀原样返回', () => {
    expect(stripPrefix('逻辑填空')).toBe('逻辑填空');
    expect(stripPrefix('第X章-abc')).toBe('第X章-abc');
    expect(stripPrefix('')).toBe('');
  });

  it('只剥离一层，内层前缀保留', () => {
    expect(stripPrefix('第1章-第2章-标题')).toBe('第2章-标题');
  });

  it('字符间插连字符的 OCR 噪声原样保留', () => {
    expect(stripPrefix('第05章-公-文-知-识')).toBe('公-文-知-识');
  });

  it('前缀后无内容时返回空串', () => {
    expect(stripPrefix('第05章')).toBe('');
  });
});

describe('normName', () => {
  it('去扩展名与章节前缀', () => {
    expect(normName('第03章-逻辑填空.md')).toBe('逻辑填空');
  });

  it('压缩空白', () => {
    expect(normName('第1章  A   B.md')).toBe('A B');
  });

  it('不修复 OCR 插字符', () => {
    expect(normName('第05章-公-文-知-识.md')).toBe('公-文-知-识');
  });

  it('统一为 NFC，吃掉 macOS 分解形', () => {
    const nfd = 'Café'.normalize('NFD');
    expect(nfd).not.toBe('Café');
    expect(normName(`${nfd}.md`)).toBe('Café');
  });

  it('纯扩展名输入安全', () => {
    expect(normName('.md')).toBe('');
  });
});

describe('prettyFilename', () => {
  it('去扩展名与章节前缀', () => {
    expect(prettyFilename('第03章-逻辑填空.md')).toBe('逻辑填空');
  });

  it('前缀被剥光时回退到原始文件名，避免空标题', () => {
    expect(prettyFilename('第05章.md')).toBe('第05章.md');
  });
});

describe('extractTitle', () => {
  it('取首个一级标题', () => {
    expect(extractTitle('# 逻辑填空\n\n正文', 'fb')).toBe('逻辑填空');
  });

  it('容忍标题尾部 # 与 CRLF 换行', () => {
    expect(extractTitle('# 标题 ##', 'fb')).toBe('标题');
    expect(extractTitle('# 标题\r\n正文', 'fb')).toBe('标题');
  });

  it('多个 H1 取第一个', () => {
    expect(extractTitle('# 甲\n\n# 乙', 'fb')).toBe('甲');
  });

  it('# 与文字之间必须有空白', () => {
    expect(extractTitle('#标题', 'fb')).toBe('fb');
  });

  it('二级标题不作为标题', () => {
    expect(extractTitle('## 二级\n正文', 'fb')).toBe('fb');
  });

  it('跳过围栏代码块内的伪标题', () => {
    expect(extractTitle('```md\n# 假标题\n```\n\n# 真标题', 'fb')).toBe('真标题');
  });

  it('只有代码块伪标题时回退文件名', () => {
    expect(extractTitle('```md\n# 假标题\n```', '第03章-逻辑填空.md')).toBe('逻辑填空');
  });

  it('空正文回退文件名并去前缀', () => {
    expect(extractTitle('', '第03章-逻辑填空.md')).toBe('逻辑填空');
  });
});

const IDS = new Set([
  '00-索引/index',
  '00-索引/考点速览',
  '01-职测/01-言语理解/第02章-片段阅读',
  '01-职测/01-言语理解/第03章-逻辑填空',
  '01-职测/02-判断推理/第01章-图形推理',
  '02-公基/01-政治/第10章-时政',
]);
const SAME_DIR = '01-职测/01-言语理解/第03章-逻辑填空';
const FRAGMENT = '/kb/01-职测/01-言语理解/第02章-片段阅读';

describe('resolveRel', () => {
  it('同目录相对链接', () => {
    expect(resolveRel(SAME_DIR, '第02章-片段阅读.md', IDS)).toBe(FRAGMENT);
  });

  it('./ 前缀与裸相对写法等价', () => {
    expect(resolveRel(SAME_DIR, './第02章-片段阅读.md', IDS)).toBe(FRAGMENT);
  });

  it('跨目录 ../ 归一化', () => {
    expect(resolveRel(SAME_DIR, '../02-判断推理/第01章-图形推理.md', IDS)).toBe(
      '/kb/01-职测/02-判断推理/第01章-图形推理',
    );
  });

  it('顶层文件之间解析后不带 ./ 泄漏', () => {
    expect(resolveRel('00-索引/index', '考点速览.md', IDS)).toBe('/kb/00-索引/考点速览');
  });

  it('保留片段锚点但只用路径部分解析', () => {
    expect(resolveRel(SAME_DIR, '第02章-片段阅读.md#第三节', IDS)).toBe(FRAGMENT);
  });

  it('百分号编码路径先解码再解析', () => {
    const enc = encodeURIComponent('第02章-片段阅读.md');
    expect(enc).toContain('%');
    expect(resolveRel(SAME_DIR, enc, IDS)).toBe(FRAGMENT);
  });

  it('非法百分号编码不抛异常，按原样处理', () => {
    expect(() => resolveRel(SAME_DIR, 'a%E4%B8.md', IDS)).not.toThrow();
    expect(resolveRel(SAME_DIR, 'a%E4%B8.md', IDS)).toBeNull();
  });

  it('NFC 兜底：分解形 href 命中合成形 id', () => {
    const ids = new Set(['00-索引/Café']);
    const nfd = 'Café'.normalize('NFD');
    expect(nfd).not.toBe('Café');
    expect(resolveRel('00-索引/index', `${nfd}.md`, ids)).toBe('/kb/00-索引/Café');
  });

  it('目标笔记不存在 → null', () => {
    expect(resolveRel(SAME_DIR, '不存在的笔记.md', IDS)).toBeNull();
  });

  it('非 .md 链接一律不解析', () => {
    expect(resolveRel(SAME_DIR, 'index.html', IDS)).toBeNull();
    expect(resolveRel(SAME_DIR, 'foo', IDS)).toBeNull();
    expect(resolveRel(SAME_DIR, '', IDS)).toBeNull();
    expect(resolveRel(SAME_DIR, '#锚点', IDS)).toBeNull();
    expect(resolveRel(SAME_DIR, 'a.markdown', IDS)).toBeNull();
  });

  it('绝对路由与外部 URL 不被误判为相对链接', () => {
    expect(resolveRel(SAME_DIR, `${FRAGMENT}.md`, IDS)).toBeNull();
    expect(resolveRel(SAME_DIR, 'https://example.com/a.md', IDS)).toBeNull();
  });

  it('越界 ../ 不逃出知识库根', () => {
    expect(resolveRel(SAME_DIR, '../../../../第02章-片段阅读.md', IDS)).toBeNull();
  });

  it('同名文件按当前目录解析，不跨目录串味', () => {
    const ids = new Set(['a/第01章-总览', 'b/第01章-总览']);
    expect(resolveRel('a/第01章-总览', '第01章-总览.md', ids)).toBe('/kb/a/第01章-总览');
    expect(resolveRel('a/x', '第01章-总览.md', ids)).toBe('/kb/a/第01章-总览');
  });
});

describe('buildNameMap', () => {
  it('文件名 / 去前缀名 / frontmatter 标题 / 正文 H1 都可作为键', () => {
    const entries = [
      mk('01-职测/01-言语理解/第03章-逻辑填空', '# 逻辑填空', { title: '逻辑填空' }),
      mk('01-职测/01-言语理解/第02章-片段阅读', '# 片段阅读', { title: '片段阅读' }),
    ];
    const m = buildNameMap(entries);
    for (const key of ['第03章-逻辑填空', '逻辑填空']) {
      expect(m.get(key)).toBe('/kb/01-职测/01-言语理解/第03章-逻辑填空');
    }
    expect(m.get('片段阅读')).toBe('/kb/01-职测/01-言语理解/第02章-片段阅读');
  });

  it('无 frontmatter 时用正文 H1 建键', () => {
    const m = buildNameMap([mk('a/第01章-甲', '# 甲篇')]);
    expect(m.get('甲篇')).toBe('/kb/a/第01章-甲');
  });

  it('正文也无 H1 时用文件名建键', () => {
    const m = buildNameMap([mk('a/第01章-乙')]);
    expect(m.get('乙')).toBe('/kb/a/第01章-乙');
  });

  it('重名时先写入者优先', () => {
    const m = buildNameMap([
      mk('a/x', '', { title: '重名' }),
      mk('b/y', '', { title: '重名' }),
    ]);
    expect(m.get('重名')).toBe('/kb/a/x');
  });

  it('空标题不写入键', () => {
    const m = buildNameMap([mk('a/x', '', { title: '' })]);
    expect(m.has('')).toBe(false);
  });

  it('缺 data 字段不抛异常', () => {
    const bare = { id: 'a/x', body: '' } as unknown as KbEntry;
    expect(() => buildNameMap([bare])).not.toThrow();
  });

  it('空集合 → 空表', () => {
    expect(buildNameMap([]).size).toBe(0);
  });
});

describe('buildTree', () => {
  it('按 id 路径建嵌套树，叶子带 id 与标题', () => {
    const tree = buildTree([
      mk('00-索引/index', '', { title: '索引' }),
      mk('01-职测/01-言语理解/第03章-逻辑填空', '', { title: '逻辑填空' }),
    ]);
    expect(tree.map((n) => n.name)).toEqual(['00-索引', '01-职测']);
    expect(tree[0].children[0]).toMatchObject({
      name: 'index',
      id: '00-索引/index',
      title: '索引',
    });
    expect(tree[1].children[0].children[0]).toMatchObject({
      name: '第03章-逻辑填空',
      id: '01-职测/01-言语理解/第03章-逻辑填空',
      title: '逻辑填空',
    });
  });

  it('单段 id 作为顶层叶子', () => {
    const tree = buildTree([mk('index', '', { title: '总览' })]);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ name: 'index', id: 'index', title: '总览' });
  });

  it('先出现子项、后出现同名文件时补上 id', () => {
    const tree = buildTree([mk('a/b'), mk('a')]);
    expect(tree[0].id).toBe('a');
    expect(tree[0].children.map((c) => c.name)).toEqual(['b']);
  });

  it('子节点保持输入顺序，排序交给展示层', () => {
    const tree = buildTree([mk('m/z'), mk('m/a')]);
    expect(tree[0].children.map((c) => c.name)).toEqual(['z', 'a']);
  });

  it('空集合 → 空树', () => {
    expect(buildTree([])).toEqual([]);
  });
});

describe('buildGraph', () => {
  const entries = [
    mk('00-索引/index', '', { title: '索引' }),
    mk(
      '01-职测/01-言语理解/第03章-逻辑填空',
      '[[第02章-片段阅读]]\n\n[[片段阅读|见这里]]',
      { title: '逻辑填空' },
    ),
    mk(
      '01-职测/01-言语理解/第02章-片段阅读',
      '[去](/kb/01-职测/01-言语理解/第03章-逻辑填空)\n\n[坏](/kb/不存在/笔记)',
      { title: '片段阅读' },
    ),
  ];
  const validIds = new Set(entries.map((e) => e.id));
  const nameMap = buildNameMap(entries);
  const graph = () => buildGraph(entries, nameMap, validIds);

  it('wikilink 与别名写法都连边', () => {
    expect(graph().edges).toContainEqual({
      s: '01-职测/01-言语理解/第03章-逻辑填空',
      t: '01-职测/01-言语理解/第02章-片段阅读',
    });
  });

  it('/kb/ 绝对链接解析为边，悬空链接忽略', () => {
    const { edges } = graph();
    expect(edges).toContainEqual({
      s: '01-职测/01-言语理解/第02章-片段阅读',
      t: '01-职测/01-言语理解/第03章-逻辑填空',
    });
    expect(edges.some((e) => e.t.includes('不存在'))).toBe(false);
  });

  it('自链接不连边', () => {
    const self = [mk('a/甲', '[[甲]]', { title: '甲' })];
    const { edges } = buildGraph(self, buildNameMap(self), new Set(self.map((e) => e.id)));
    expect(edges).toEqual([]);
  });

  it('反向链接按目标聚合并去重', () => {
    const { backlinks } = graph();
    expect(new Set(backlinks['01-职测/01-言语理解/第02章-片段阅读'])).toEqual(
      new Set(['01-职测/01-言语理解/第03章-逻辑填空']),
    );
    expect(backlinks['00-索引/index']).toBeUndefined();
  });

  it('同目录 index 自动成为局部枢纽', () => {
    const list = [mk('m/index', '', { title: '模块总览' }), mk('m/第01章-甲', '', { title: '甲' })];
    const { edges } = buildGraph(list, buildNameMap(list), new Set(list.map((e) => e.id)));
    expect(edges).toContainEqual({ s: 'm/第01章-甲', t: 'm/index' });
  });

  it('wikilink 文本为 Unicode 分解形时也能命中', () => {
    const target = mk('a/Café', '', { title: 'Café' });
    const source = mk('a/x', `[[${'Café'.normalize('NFD')}]]`);
    const list = [target, source];
    const { edges } = buildGraph(list, buildNameMap(list), new Set(list.map((e) => e.id)));
    expect(edges).toContainEqual({ s: 'a/x', t: 'a/Café' });
  });

  it('节点携带模块与配色，数量与条目一致', () => {
    const { nodes } = graph();
    expect(nodes).toHaveLength(entries.length);
    const node = nodes.find((n) => n.id === '01-职测/01-言语理解/第03章-逻辑填空');
    expect(node).toMatchObject({
      module: '01-职测',
      color: moduleColor('01-职测'),
      title: '逻辑填空',
    });
  });

  it('空集合返回空图结构', () => {
    expect(buildGraph([], new Map(), new Set())).toEqual({
      nodes: [],
      edges: [],
      backlinks: {},
    });
  });
});

describe('moduleColor', () => {
  it('已知模块配色稳定', () => {
    expect(moduleColor('01-职测')).toBe('#5B9BD5');
    expect(moduleColor('02-公基')).toBe('#70AD47');
  });

  it('未知模块回退到索引色', () => {
    expect(moduleColor('99-未知')).toBe('#9C94C9');
    expect(moduleColor('')).toBe('#9C94C9');
  });
});

describe('plainText', () => {
  it('剔除围栏代码块内容', () => {
    expect(plainText('```js\nconst a = 1;\n```\n正文')).toBe('正文');
  });

  it('连续多个代码块全部剔除', () => {
    expect(plainText('```\n甲\n```\n中间\n```\n乙\n```')).toBe('中间');
  });

  it('行内代码保留文字', () => {
    expect(plainText('用 `map` 即可')).toBe('用 map 即可');
  });

  it('图片整体剔除，链接保留文字', () => {
    expect(plainText('![图](a.png)')).toBe('');
    expect(plainText('见[官方文档](https://example.com)')).toBe('见官方文档');
  });

  it('标题与引用标记去掉，列表符号保留', () => {
    expect(plainText('# 标题')).toBe('标题');
    expect(plainText('> 引用')).toBe('引用');
    expect(plainText('- 列表项')).toBe('- 列表项');
  });

  it('强调符号变成空白并压缩', () => {
    expect(plainText('**粗体** 与 _斜_')).toBe('粗体 与 斜');
  });

  it('空输入安全', () => {
    expect(plainText('')).toBe('');
  });

  it('未闭合代码块不吞掉后续正文', () => {
    expect(plainText('```js\nconst a = 1;')).toContain('const a = 1;');
  });
});
