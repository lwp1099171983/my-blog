import { getPublishedPosts } from '../lib/utils';
import { SITE } from '../lib/config';
import type { SearchIndex } from '../types';

export async function GET() {
  const posts = await getPublishedPosts();

  const index: SearchIndex = {
    generatedAt: new Date().toISOString(),
    entries: posts.map((post) => {
      const { title, description, tags, category, date, slug } = post.data;
      return {
        title,
        description,
        tags,
        category,
        date,
        url: `/posts/${slug}`,
      };
    }),
  };

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
