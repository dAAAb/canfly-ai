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
  {
    slug: 'local-ai-agent-zero-to-llama',
    titleKey: 'blog.posts.localAiJourney.title',
    summaryKey: 'blog.posts.localAiJourney.summary',
    contentKey: 'blog.posts.localAiJourney.content',
    category: 'guide',
    date: '2026-03-09',
    readingTime: '7',
    tags: ['ollama', 'llama', 'local-ai', 'agent', 'beginner'],
    relatedProducts: ['ollama'],
  },
  {
    slug: 'autonomous-ai-agents-task-automation',
    titleKey: 'blog.posts.autonomousAgents.title',
    summaryKey: 'blog.posts.autonomousAgents.summary',
    contentKey: 'blog.posts.autonomousAgents.content',
    category: 'insight',
    date: '2026-03-09',
    readingTime: '6',
    tags: ['ai-agent', 'automation', 'autonomous', 'workflow'],
    relatedProducts: ['zeabur'],
  },
  {
    slug: 'open-source-agent-skills',
    titleKey: 'blog.posts.openSourceSkills.title',
    summaryKey: 'blog.posts.openSourceSkills.summary',
    contentKey: 'blog.posts.openSourceSkills.content',
    category: 'guide',
    date: '2026-03-09',
    readingTime: '5',
    tags: ['open-source', 'agent-skills', 'community', 'ollama'],
    relatedProducts: ['ollama'],
  },
  {
    slug: 'ai-agent-email-comparison',
    titleKey: 'blog.posts.agentEmail.title',
    summaryKey: 'blog.posts.agentEmail.summary',
    contentKey: 'blog.posts.agentEmail.content',
    category: 'guide',
    date: '2026-03-09',
    readingTime: '6',
    tags: ['email', 'ai-agent', 'basemail', 'agentmail', 'nadmail', 'comparison'],
    relatedProducts: ['ollama', 'zeabur'],
  },
  {
    slug: 'ai-agent-payment-tools',
    titleKey: 'blog.posts.agentPayment.title',
    summaryKey: 'blog.posts.agentPayment.summary',
    contentKey: 'blog.posts.agentPayment.content',
    category: 'tutorial',
    date: '2026-03-09',
    readingTime: '7',
    tags: ['payment', 'ai-agent', 'agentcard', 'crypto', 'virtual-card', 'fintech'],
    relatedProducts: ['zeabur'],
  },
  {
    slug: 'openclaw-advanced-setup',
    titleKey: 'blog.posts.openclawAdvanced.title',
    summaryKey: 'blog.posts.openclawAdvanced.summary',
    contentKey: 'blog.posts.openclawAdvanced.content',
    category: 'tutorial',
    date: '2026-03-09',
    readingTime: '6',
    tags: ['openclaw', 'skills', 'cron', 'automation', 'multi-platform', 'advanced'],
    relatedProducts: ['ollama', 'zeabur'],
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
