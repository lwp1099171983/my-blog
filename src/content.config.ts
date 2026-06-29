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

export const collections = { posts };
