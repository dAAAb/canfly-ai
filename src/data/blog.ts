export interface BlogPost {
  slug: string
  titleKey: string
  summaryKey: string
  contentKey: string
  category: string
  date: string
  readingTime: string
  coverImage?: string
  tags: string[]
  relatedProducts?: string[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'local-ai-privacy-2026',
    titleKey: 'blog.posts.localAiPrivacy.title',
    summaryKey: 'blog.posts.localAiPrivacy.summary',
    contentKey: 'blog.posts.localAiPrivacy.content',
    category: 'guide',
    date: '2026-03-08',
    readingTime: '5',
    tags: ['privacy', 'ollama', 'local-ai'],
    relatedProducts: ['ollama'],
  },
  {
    slug: 'deploy-ai-agent-cloud',
    titleKey: 'blog.posts.deployAiCloud.title',
    summaryKey: 'blog.posts.deployAiCloud.summary',
    contentKey: 'blog.posts.deployAiCloud.content',
    category: 'tutorial',
    date: '2026-03-08',
    readingTime: '4',
    tags: ['cloud', 'zeabur', 'deployment'],
    relatedProducts: ['zeabur'],
  },
  {
    slug: 'ai-voice-video-content-creation',
    titleKey: 'blog.posts.voiceVideoCreation.title',
    summaryKey: 'blog.posts.voiceVideoCreation.summary',
    contentKey: 'blog.posts.voiceVideoCreation.content',
    category: 'insight',
    date: '2026-03-08',
    readingTime: '6',
    tags: ['elevenlabs', 'heygen', 'content-creation', 'voice', 'video'],
    relatedProducts: ['elevenlabs', 'heygen'],
  },
]

export const blogPostsBySlug: Record<string, BlogPost> = Object.fromEntries(
  blogPosts.map((p) => [p.slug, p])
)

export const blogCategories = [
  { id: 'all', nameKey: 'blog.categories.all' },
  { id: 'guide', nameKey: 'blog.categories.guide' },
  { id: 'tutorial', nameKey: 'blog.categories.tutorial' },
  { id: 'insight', nameKey: 'blog.categories.insight' },
]
