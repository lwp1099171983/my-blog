// ============================================================
// 站点配置
// ============================================================

export interface SiteConfig {
  /** 站点名称，用于 <title>、OG、RSS */
  name: string;
  /** 站点短名，用于 footer 等紧凑场景 */
  shortName: string;
  /** 站点描述 / 副标题 */
  description: string;
  /** 生产环境域名，含协议，末尾无斜杠。如 "https://example.com" */
  origin: string;
  /** 默认语言 */
  lang: string;
  /** 默认 OG / Twitter Card 图，相对 public/ 的路径或绝对 URL */
  defaultOGImage: string;
  /** 作者名，用于 RSS、版权声明 */
  author: string;
  /** 作者邮箱，用于 RSS */
  authorEmail: string;
  /** 首页每页文章数 */
  pageSize: number;
  /** 版权起始年份 */
  copyrightSince: number;
  /** 导航链接 */
  navLinks: NavLink[];
  /** 社交链接（关于页、footer） */
  socialLinks: SocialLink[];
}

// ============================================================
// 导航 & 社交
// ============================================================

export interface NavLink {
  label: string;
  href: string;
  /** 是否为外部链接 */
  external: boolean;
}

export interface SocialLink {
  platform: string;
  label: string;
  href: string;
  /** 图标标识，对应图标组件的 key */
  icon: string;
}

// ============================================================
// 封面图
// ============================================================

export interface CoverImage {
  /** 封面图 src */
  src: string;
  /** 封面图 alt 文案（PRD 要求必须有） */
  alt: string;
  /** 封面图宽度，用于 OG 标签 */
  width: number;
  /** 封面图高度，用于 OG 标签 */
  height: number;
}

// ============================================================
// 文章 Frontmatter（Astro Content Collections）
// ============================================================

export interface PostFrontmatter {
  /** 文章标题 */
  title: string;
  /** 文章摘要，必须手写 */
  description: string;
  /** 发布日期，YYYY-MM-DD */
  date: string;
  /** 标签列表 */
  tags: string[];
  /** 分类，单值 */
  category: string;
  /** URL slug，小写英文+数字+连字符，发布后尽量不改 */
  slug: string;
  /** 草稿标记，true 时不进入页面/RSS/sitemap/搜索索引 */
  draft: boolean;
  /** 封面图（可选） */
  cover?: CoverImage;
  /** 最后修改日期（可选），YYYY-MM-DD */
  updated?: string;
}

// ============================================================
// 文章完整实体（Frontmatter + 渲染产物）
// ============================================================

export interface Post {
  frontmatter: PostFrontmatter;
  /** 文章完整 URL 路径，如 /posts/my-slug */
  url: string;
  /** 渲染后的 HTML 正文 */
  body: string;
  /** Astro Content Collections 内部 slug */
  collectionSlug: string;
}

// ============================================================
// 搜索索引条目（PRD §7）
// ============================================================

export interface SearchIndexEntry {
  /** 文章标题 */
  title: string;
  /** 文章摘要 */
  description: string;
  /** 标签列表 */
  tags: string[];
  /** 分类 */
  category: string;
  /** 发布日期，YYYY-MM-DD */
  date: string;
  /** 文章 URL 路径 */
  url: string;
}

/** 搜索索引文件整体结构 */
export interface SearchIndex {
  /** 索引生成时间，ISO 8601 */
  generatedAt: string;
  /** 条目列表 */
  entries: SearchIndexEntry[];
}

// ============================================================
// 标签聚合（PRD §2 - 标签/分类页）
// ============================================================

export interface TagAggregation {
  /** 标签名 */
  tag: string;
  /** 该标签下的文章数 */
  count: number;
  /** 该标签下的文章列表 */
  posts: PostFrontmatter[];
}

export interface CategoryAggregation {
  /** 分类名 */
  category: string;
  /** 该分类下的文章数 */
  count: number;
  /** 该分类下的文章列表 */
  posts: PostFrontmatter[];
}

// ============================================================
// 归档（PRD §2 - 归档页）
// ============================================================

export interface ArchiveGroup {
  /** 年份，如 "2026" */
  year: string;
  /** 该年份下的文章，按日期降序 */
  posts: PostFrontmatter[];
}

// ============================================================
// 分页（泛型）
// ============================================================

export interface PaginationInfo<T> {
  /** 当前页条目 */
  items: T[];
  /** 当前页码，从 1 开始 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 总条目数 */
  totalItems: number;
  /** 每页条目数 */
  pageSize: number;
  /** 是否有上一页 */
  hasPrev: boolean;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 上一页路径 */
  prevUrl: string | null;
  /** 下一页路径 */
  nextUrl: string | null;
}

// ============================================================
// RSS Feed 条目（PRD §12）
// ============================================================

export interface RSSFeedEntry {
  /** 文章标题 */
  title: string;
  /** 文章摘要 */
  description: string;
  /** 文章完整 URL */
  link: string;
  /** 发布日期，ISO 8601 */
  pubDate: string;
  /** 文章分类（对应 frontmatter category） */
  category: string;
  /** 文章标签 tags 要展平成多个 <category> 元素 */
  tags: string[];
  /** 渲染后的 HTML 全文，图片路径已转为绝对 URL */
  content: string;
  /** 作者 */
  author: string;
  /** 文章封面图绝对 URL（可选） */
  coverUrl?: string;
}

// ============================================================
// SEO 元数据（PRD §9）
// ============================================================

export interface SEOMeta {
  /** <title> 内容 */
  title: string;
  /** <meta name="description"> */
  description: string;
  /** canonical URL */
  canonical: string;
  /** Open Graph 标题 */
  ogTitle: string;
  /** Open Graph 描述 */
  ogDescription: string;
  /** Open Graph 图片绝对 URL */
  ogImage: string;
  /** Open Graph 类型 */
  ogType: 'website' | 'article';
  /** Twitter Card 类型 */
  twitterCard: 'summary' | 'summary_large_image';
  /** 是否禁止搜索引擎索引 */
  noindex: boolean;
}

// ============================================================
// 作品集预留（PRD §8）
// ============================================================

export interface PortfolioItem {
  /** 项目名称 */
  name: string;
  /** 项目简介 */
  description: string;
  /** 项目截图 */
  cover?: CoverImage;
  /** 技术栈 */
  techStack: string[];
  /** 项目链接 */
  url?: string;
  /** GitHub 链接 */
  githubUrl?: string;
  /** Demo 链接 */
  demoUrl?: string;
  /** 个人职责与成果 */
  contribution: string;
}
