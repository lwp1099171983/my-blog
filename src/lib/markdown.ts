import type { Schema } from 'hast-util-sanitize';

// PRD §4: 只允许 http/https/mailto，禁止 HTML 注入
const sanitizeSchema: Schema = {
  tagNames: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'strong', 'em', 'del', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'span', 'div', 'sup', 'sub',
  ],
  attributes: {
    '*': ['className'],
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'width', 'height', 'loading'],
    code: ['className'],
    td: ['align'],
    th: ['align'],
    span: ['className'],
    div: ['className'],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
  clobberPrefix: '',
  clobber: ['name'],
};

export default sanitizeSchema;
