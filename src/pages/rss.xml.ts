import getRssResponse from '@astrojs/rss';
import { getPublishedPosts } from '../lib/utils';
import { SITE } from '../lib/config';

// ponytail: 原始 markdown 作正文，相对路径图片转绝对 URL。
// 升级：需要 HTML 渲染的 RSS 内容时换 Astro Markdown renderer。
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
