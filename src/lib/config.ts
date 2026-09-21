import type { SiteConfig, Profile, SocialLink, PortfolioItem } from '../types';

export const SITE: SiteConfig = {
  name: 'starlin的自由角落',
  shortName: 'starlin',
  description: 'starlin 的个人技术博客，记录技术笔记、项目心得',
  origin: 'https://iboluo.top',
  lang: 'zh-CN',
  defaultOGImage: '/default-og.png',
  author: 'starlin',
  authorEmail: 'hi@starlin.dev',
  pageSize: 10,
  copyrightSince: 2026,
  navLinks: [
    { label: '首页', href: '/', external: false },
    { label: '知识库', href: '/kb', external: false },
    { label: '归档', href: '/archive', external: false },
    { label: '标签', href: '/tags', external: false },
    { label: '搜索', href: '/search', external: false },
    { label: '作品', href: '/portfolio', external: false },
  ],
  socialLinks: [
    {
      platform: 'GitHub',
      label: 'GitHub',
      href: 'https://github.com/nstarlin',
      icon: 'github',
    },
    {
      platform: 'Twitter',
      label: 'X',
      href: 'https://x.com/starlin',
      icon: 'twitter',
    },
  ],
};

/** 个人简介 */
export const PROFILE: Profile = {
  name: 'starlin',
  greeting: '你好，我是 starlin。',
  bio: ['写代码、折腾工具。'],
  subtext: '这里记录我的技术笔记、项目心得和像素创作。',
};

/** 技术栈 */
export const TECH_STACK = ['TypeScript', 'React', 'Vue', 'Node.js', 'Python'];

/** 社交链接（模板用） */
export const SOCIAL_LINKS: SocialLink[] = [
  // {
  //   platform: 'GitHub',
  //   label: '🐙 GitHub',
  //   href: 'https://github.com/nstarlin',
  //   icon: 'github',
  // },
  // { platform: 'Twitter', label: '🐦 推特', href: '#', icon: 'twitter' },
  // {
  //   platform: 'Email',
  //   label: '📧 邮箱',
  //   href: 'mailto:hi@starlin.dev',
  //   icon: 'email',
  // },
];

/** 作品集 */
export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    name: '🕹️ Pixel UI Kit',
    description: '像素风 UI 组件库',
    techStack: ['React'],
    githubUrl: '#',
    contribution: '',
  },
  {
    name: '📝 Static Blog Generator',
    description: '轻量静态博客生成器',
    techStack: ['Node.js'],
    githubUrl: '#',
    contribution: '',
  },
];
