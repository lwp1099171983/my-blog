import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/posts',
    generateId: ({ entry }) => entry.replace('/index.md', '').replace('.md', ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式须为 YYYY-MM-DD'),
      tags: z.array(z.string()).default([]),
      category: z.string().default(''),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug 须为小写英文+数字+连字符'),
      draft: z.boolean().default(false),
      cover: z
        .object({
          src: z.string(),
          alt: z.string(),
          width: z.number(),
          height: z.number(),
        })
        .optional(),
      updated: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式须为 YYYY-MM-DD')
        .optional(),
    }),
});

// 考编知识库：同步自 ~/Documents/Codex/考公/知识库（源库目录名仍叫「考公」，见 scripts/sync-kb.mjs）
const kb = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/kb',
    generateId: ({ entry }) => entry.replace(/^\.\//, '').replace(/\.md$/, ''),
  }),
  // 笔记的 frontmatter 由 scripts/sync-kb.mjs 在同步阶段自动注入；
  // 字段全部可选，以便兼容未带元数据的早期笔记。passthrough 保留手工扩展余地。
  schema: z
    .object({
      title: z.string().optional(),
      subject: z.string().optional(),
      module: z.string().optional(),
      type: z.string().optional(),
      source: z.string().optional(),
      seq: z.number().optional(),
      tags: z.array(z.string()).optional(),
    })
    .passthrough(),
});

export const collections = { posts, kb };
