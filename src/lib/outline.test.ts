import { describe, expect, it } from 'vitest';
import { buildOutline, isNoiseHeading, pickActiveIndex, type RawHeading } from './outline';

/** 造一个标题，省略 depth/slug 时给个够用的默认值 */
function h(depth: number, text: string, slug = `s-${text.length}-${depth}`): RawHeading {
  return { depth, text, slug };
}

describe('页码型标题识别', () => {
  it('识别「PDF 第 N 页」的各种写法', () => {
    const noisy = [
      'PDF 第 190 页',
      'PDF第5页',
      'pdf 第 1 页',
      '  PDF 第 12 页  ',
      '**PDF 第 3 页**',
      'PDF 第190页',
    ];
    for (const t of noisy) {
      expect(isNoiseHeading(t), `应判为噪声：${t}`).toBe(true);
    }
  });

  it('不误伤正常标题', () => {
    const real = [
      '学习提要',
      '逐页原文',
      '第 5 页', // 没有 PDF 前缀，可能是真小节名，保守放行
      '页码规则',
      'PDF 导出说明',
      '章节概述（备考定位）',
      '3. 能力要求',
      '',
    ];
    for (const t of real) {
      expect(isNoiseHeading(t), `不该判为噪声：${t}`).toBe(false);
    }
  });

  it('噪声判定忽略大小写与首尾空白，但不忽略中间数字', () => {
    expect(isNoiseHeading(' Pdf 第 8 页 ')).toBe(true);
    expect(isNoiseHeading('PDF 第 页')).toBe(false); // 没有页码数字，可能是别的标题
  });
});

describe('buildOutline', () => {
  it('空输入返回空数组', () => {
    expect(buildOutline([])).toEqual([]);
  });

  it('丢弃 h1（正文自己有标题，大纲不该重复）', () => {
    expect(buildOutline([h(1, '倍速学习')])).toEqual([]);
  });

  it('丢弃 h4 及更深层级', () => {
    const items = buildOutline([h(2, '甲甲'), h(3, '乙乙'), h(2, '丙丙'), h(4, '丁丁'), h(5, '戊戊')]);
    expect(items.map((i) => i.text)).toEqual(['甲甲', '乙乙', '丙丙']);
  });

  it('门槛：可读标题少于 3 条就不出大纲', () => {
    expect(buildOutline([h(2, '学习提要'), h(2, '逐页原文')])).toEqual([]);
  });

  it('恰好 3 条可读标题就出大纲', () => {
    const items = buildOutline([h(2, '本章任务'), h(2, '考点框架'), h(2, '核心判定')]);
    expect(items).toHaveLength(3);
  });

  it('OCR 讲义：页码标题被滤掉后不足门槛，整体不出大纲', () => {
    const entries = [
      h(2, '学习提要'),
      h(2, '逐页原文'),
      ...Array.from({ length: 40 }, (_, i) => h(2, `PDF 第 ${i + 1} 页`)),
    ];
    expect(buildOutline(entries)).toEqual([]);
  });

  it('页码被滤掉、真标题保留，顺序不变', () => {
    const entries = [
      h(2, '学习提要'),
      h(2, '逐页原文'),
      h(2, 'PDF 第 1 页'),
      h(2, '章节概述（备考定位）'),
      h(3, '1. 考试大纲'),
      h(3, '2. 考察内容'),
      h(3, '3. 能力要求'),
    ];
    expect(buildOutline(entries).map((i) => i.text)).toEqual([
      '学习提要',
      '逐页原文',
      '章节概述（备考定位）',
      '1. 考试大纲',
      '2. 考察内容',
      '3. 能力要求',
    ]);
  });

  it('h2 为一级、h3 为二级', () => {
    const items = buildOutline([h(2, '甲'), h(3, '甲一'), h(2, '乙')]);
    expect(items.map((i) => [i.text, i.level])).toEqual([
      ['甲', 0],
      ['甲一', 1],
      ['乙', 0],
    ]);
  });

  it('没有 h2 时把最浅的层级归一化为一级（避免整列都缩进）', () => {
    const items = buildOutline([h(3, '甲'), h(3, '乙'), h(3, '丙')]);
    expect(items.map((i) => i.level)).toEqual([0, 0, 0]);
  });

  it('清洗标题里的行内标签与 HTML 实体', () => {
    const items = buildOutline([
      h(2, '1. 角色定义 (Role &amp; Persona)'),
      h(2, '<code>npm run build</code> 之后'),
      h(2, '带  多余   空白'),
    ]);
    expect(items.map((i) => i.text)).toEqual([
      '1. 角色定义 (Role & Persona)',
      'npm run build 之后',
      '带 多余 空白',
    ]);
  });

  it('丢弃清洗后为空、或没有锚点的标题', () => {
    const entries = [h(2, ''), h(2, '   '), h(2, '<span></span>'), h(2, '正常'), { ...h(2, '无锚点'), slug: '' }];
    // 只剩「正常」一条 → 不足门槛
    expect(buildOutline(entries)).toEqual([]);
  });

  it('输出项自带锚点，可直接做 href', () => {
    const items = buildOutline([h(2, '甲', 'jia'), h(2, '乙', 'yi'), h(2, '丙', 'bing')]);
    expect(items.map((i) => i.slug)).toEqual(['jia', 'yi', 'bing']);
  });
});

describe('pickActiveIndex', () => {
  it('没有标题时返回 -1', () => {
    expect(pickActiveIndex([], 0)).toBe(-1);
  });

  it('还没滚到第一个标题时高亮第一条', () => {
    expect(pickActiveIndex([100, 300, 500], 0)).toBe(0);
  });

  it('正好滚到某个标题位置时高亮该条', () => {
    expect(pickActiveIndex([100, 300, 500], 300)).toBe(1);
  });

  it('滚过若干标题后高亮最后一个已过的', () => {
    expect(pickActiveIndex([100, 300, 500], 420)).toBe(1);
    expect(pickActiveIndex([100, 300, 500], 999)).toBe(2);
  });

  it('滚到底部时高亮最后一条', () => {
    expect(pickActiveIndex([100, 300, 500], 100000)).toBe(2);
  });

  it('lead 余量能把「快要到」的标题提前点亮', () => {
    expect(pickActiveIndex([100, 200], 150, 0)).toBe(0);
    expect(pickActiveIndex([100, 200], 150, 60)).toBe(1);
  });

  it('单条标题永远返回 0', () => {
    expect(pickActiveIndex([50], 0)).toBe(0);
    expect(pickActiveIndex([50], 10 ** 6)).toBe(0);
  });
});
