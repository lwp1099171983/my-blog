import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://iboluo.top',
  integrations: [sitemap()],
  // 代码块跟随站点的浅色 Win98 窗口，别用 Shiki 默认的 github-dark
  markdown: {
    shikiConfig: {
      theme: 'github-light',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
