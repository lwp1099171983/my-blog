import { describe, expect, it } from 'vitest';
import {
  KB_TYPE_ORDER,
  cleanLabel,
  facetCounts,
  kbMeta,
  kbMetas,
  typeRank,
  type KbEntry,
} from './kb';

function mk(id: string, body = '', data: Record<string, unknown> = {}): KbEntry {
  return { id, body, data, collection: 'kb' } as unknown as KbEntry;
}

describe('cleanLabel', () => {
  it('去掉两位目录序号', () => {
    expect(cleanLabel('01-言语理解')).toBe('言语理解');
    expect(cleanLabel('10-政治')).toBe('政治');
  });

  it('无序号或单数字序号', () => {
    expect(cleanLabel('言语理解')).toBe('言语理解');
    expect(cleanLabel('1-言语理解')).toBe('言语理解');
    expect(cleanLabel('')).toBe('');
  });

  it('不误伤年份开头的取值', () => {
    expect(cleanLabel('2026-09-时政')).toBe('2026-09-时政');
  });

  it('不误伤非序号前缀', () => {
    expect(cleanLabel('第01章-逻辑填空')).toBe('第01章-逻辑填空');
  });
});

describe('kbMeta', () => {
  it('优先取 frontmatter，补全派生字段', () => {
    const meta = kbMeta(
      mk('02-公基/02-法律/第01章-法理学', '# 噪声 标题', {
        title: '法理学',
        subject: '02-公基',
        module: '02-法律',
        type: '讲义',
        source: '公基系统班',
        seq: 1,
        tags: ['法律'],
      }),
    );
    expect(meta).toMatchObject({
      id: '02-公基/02-法律/第01章-法理学',
      title: '法理学',
      subject: '02-公基',
      subjectLabel: '公基',
      module: '02-法律',
      moduleLabel: '法律',
      type: '讲义',
      source: '公基系统班',
      seq: 1,
      tags: ['法律'],
      url: '/kb/02-公基/02-法律/第01章-法理学',
    });
  });

  it('frontmatter 缺失时回退到路径与正文标题', () => {
    const meta = kbMeta(mk('01-职测/01-言语理解/第03章-逻辑填空', '# 逻辑填空'));
    expect(meta.subject).toBe('01-职测');
    expect(meta.subjectLabel).toBe('职测');
    expect(meta.module).toBe('01-言语理解');
    expect(meta.moduleLabel).toBe('言语理解');
    expect(meta.title).toBe('逻辑填空');
  });

  it('缺省值：type 归入其他、source 空、tags 空、seq 未定义', () => {
    const meta = kbMeta(mk('02-公基/01-政治/第10章-时政'));
    expect(meta.type).toBe('其他');
    expect(meta.source).toBe('');
    expect(meta.tags).toEqual([]);
    expect(meta.seq).toBeUndefined();
  });

  it('正文无 H1 时标题回退文件名并去章节前缀', () => {
    expect(kbMeta(mk('02-公基/01-政治/第10章-时政')).title).toBe('时政');
  });

  it('两层 id 不派生 module', () => {
    const meta = kbMeta(mk('00-索引/index', '', { title: '索引' }));
    expect(meta.subject).toBe('00-索引');
    expect(meta.module).toBe('');
    expect(meta.moduleLabel).toBe('');
  });

  it('单段 id 不崩且各字段有值', () => {
    const meta = kbMeta(mk('index'));
    expect(meta.subject).toBe('index');
    expect(meta.module).toBe('');
    expect(meta.url).toBe('/kb/index');
  });

  it('类型不符的 seq / tags 被忽略，null subject 回退路径', () => {
    const meta = kbMeta(mk('a/第01章-甲', '', { seq: '3', tags: '法律', subject: null }));
    expect(meta.seq).toBeUndefined();
    expect(meta.tags).toEqual([]);
    expect(meta.subject).toBe('a');
  });

  it('缺 data 字段不抛异常', () => {
    const bare = { id: 'a/第01章-甲', body: '' } as unknown as KbEntry;
    expect(() => kbMeta(bare)).not.toThrow();
  });
});

describe('kbMetas', () => {
  it('按 subject → module → seq → title 排序', () => {
    const items = kbMetas([
      mk('02-公基/02-法律/第02章-刑法', '', { seq: 2 }),
      mk('01-职测/01-言语理解/第01章-甲', '', { seq: 1 }),
      mk('02-公基/02-法律/第01章-民法', '', { seq: 1 }),
      mk('01-职测/01-言语理解/第01章-乙', '', { seq: 1 }),
    ]);
    expect(items.map((m) => m.id)).toEqual([
      '01-职测/01-言语理解/第01章-甲',
      '01-职测/01-言语理解/第01章-乙',
      '02-公基/02-法律/第01章-民法',
      '02-公基/02-法律/第02章-刑法',
    ]);
  });

  it('缺 seq 视作 0，排在同族最前', () => {
    const items = kbMetas([
      mk('m/第02章-乙', '', { seq: 2 }),
      mk('m/第01章-甲'),
    ]);
    expect(items.map((m) => m.seq)).toEqual([undefined, 2]);
  });

  it('返回新数组，不修改入参顺序', () => {
    const input = [mk('m/b'), mk('m/a')];
    const out = kbMetas(input);
    expect(out).not.toBe(input);
    expect(input.map((e) => e.id)).toEqual(['m/b', 'm/a']);
  });

  it('空集合 → 空数组', () => {
    expect(kbMetas([])).toEqual([]);
  });
});

describe('typeRank', () => {
  it('按 KB_TYPE_ORDER 顺序排位', () => {
    KB_TYPE_ORDER.forEach((t, i) => expect(typeRank(t)).toBe(i));
  });

  it('未知类型排到最后', () => {
    expect(typeRank('未知类型')).toBe(KB_TYPE_ORDER.length);
    expect(typeRank('')).toBe(KB_TYPE_ORDER.length);
  });
});

describe('facetCounts', () => {
  const items = kbMetas([
    mk('01-职测/01-言语理解/第01章-甲', '', { type: '讲义', source: '甲班' }),
    mk('01-职测/01-言语理解/第02章-乙', '', { type: '题库', source: '甲班' }),
    mk('02-公基/01-政治/第01章-丙', '', { type: '讲义', source: '乙班' }),
    mk('02-公基/01-政治/第02章-丁', '', { type: '讲义' }),
  ]);

  it('统计取值与计数，按计数降序', () => {
    expect(facetCounts(items, (m) => m.type)).toEqual([
      { value: '讲义', label: '讲义', count: 3 },
      { value: '题库', label: '题库', count: 1 },
    ]);
  });

  it('label 为去序号的展示名', () => {
    const subjects = facetCounts(items, (m) => m.subject);
    expect(subjects).toEqual(
      expect.arrayContaining([
        { value: '01-职测', label: '职测', count: 2 },
        { value: '02-公基', label: '公基', count: 2 },
      ]),
    );
  });

  it('空值不参与统计', () => {
    const sources = facetCounts(items, (m) => m.source);
    expect(sources.map((f) => f.value).sort()).toEqual(['乙班', '甲班']);
    expect(sources.reduce((s, f) => s + f.count, 0)).toBe(3);
  });

  it('同计数时按展示名排序，结果稳定', () => {
    const a = facetCounts(items, (m) => m.source);
    const b = facetCounts(items, (m) => m.source);
    expect(a).toEqual(b);
  });

  it('空输入 → 空数组', () => {
    expect(facetCounts([], (m) => m.type)).toEqual([]);
  });
});
