import { getCollection } from 'astro:content';
import { kbMeta, plainText } from '../../lib/kb';

export async function GET() {
  const entries = await getCollection('kb');
  const notes = entries.map((e) => {
    const m = kbMeta(e);
    return {
      id: e.id,
      title: m.title,
      module: m.subject,
      moduleLabel: m.subjectLabel,
      subModule: m.moduleLabel,
      type: m.type,
      source: m.source,
      url: m.url,
      text: plainText(e.body ?? ''),
    };
  });
  return new Response(JSON.stringify({ notes }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
