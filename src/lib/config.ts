import type { SiteConfig } from '../types';

export const SITE: SiteConfig = {
  name: 'starlin的像素角落',
  shortName: 'starlin',
  description: 'starlin 的个人技术博客，记录技术笔记、项目心得',
  origin: 'https://starlin.dev',
  lang: 'zh-CN',
  defaultOGImage: '/default-og.png',
  author: 'starlin',
  authorEmail: 'hi@starlin.dev',
  pageSize: 10,
  copyrightSince: 2026,
  navLinks: [
    { label: '首页', href: '/', external: false },
    { label: '归档', href: '/archive', external: false },
    { label: '标签', href: '/tags', external: false },
    { label: '搜索', href: '/search', external: false },
    { label: '关于', href: '/about', external: false },
    { label: '作品', href: '/portfolio', external: false },
  ],
  socialLinks: [
    { platform: 'GitHub', label: 'GitHub', href: 'https://github.com/nstarlin', icon: 'github' },
    { platform: 'Twitter', label: 'X', href: 'https://x.com/starlin', icon: 'twitter' },
  ],
};
