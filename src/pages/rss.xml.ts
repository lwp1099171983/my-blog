import getRssResponse from '@astrojs/rss';
import { getPublishedPosts } from '../lib/utils';
import { SITE } from '../lib/config';

// ponytail: raw markdown as content, relative image paths → absolute URLs.
// Upgrade: Astro Markdown renderer for HTML RSS content when needed.
function absImages(body: string, slug: string): string {
  const base = `${SITE.origin}/posts/${slug}`;
  return body.replace(/\]\(\s*(\.\/)([^)]+)\)/g, (_, __, file) => `](${base}/${file})`);
}

export async function GET() {
  const posts = await getPublishedPosts();

  const items = posts.map((post) => {
    const { title, description, date, slug, tags, category } = post.data;
    return {
      title,
      description,
      link: `${SITE.origin}/posts/${slug}`,
      pubDate: new Date(date),
      categories: [category, ...tags].filter(Boolean),
      content: absImages(post.body || '', slug),
      author: SITE.authorEmail,
    };
  });

  return getRssResponse({
    title: SITE.name,
    description: SITE.description,
    site: SITE.origin,
    items,
    customData: `<language>${SITE.lang}</language>`,
  });
}
