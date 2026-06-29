import { getCollection } from 'astro:content';
import type { PostFrontmatter } from '../types.js';

// ponytail: single getCollection call, filter in memory. < 100 posts fits this fine.
export async function getPublishedPosts() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.localeCompare(a.data.date));
}

export async function getUniqueTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const tagMap = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    }
  }
  return [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getPostsByTag(tag: string) {
  const posts = await getPublishedPosts();
  return posts.filter((p) => p.data.tags.includes(tag));
}

export async function getPostsByYear(): Promise<{ year: string; posts: Awaited<ReturnType<typeof getPublishedPosts>> }[]> {
  const posts = await getPublishedPosts();
  const yearMap = new Map<string, typeof posts>();
  for (const post of posts) {
    const year = post.data.date.slice(0, 4);
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(post);
  }
  return [...yearMap.entries()]
    .map(([year, posts]) => ({ year, posts }))
    .sort((a, b) => b.year.localeCompare(a.year));
}
