import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Tag, BookOpen } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'
import { blogPosts, blogCategories } from '../data/blog'

export default function BlogListPage() {
  const { t } = useTranslation()
  const { localePath } = useLanguage()
  const [activeCategory, setActiveCategory] = useState('all')

  useHead({
    title: t('blog.pageTitle'),
    description: t('blog.pageDescription'),
    canonical: 'https://canfly.ai/blog',
  })

  const filtered =
    activeCategory === 'all'
      ? blogPosts
      : blogPosts.filter((p) => p.category === activeCategory)

  return (
    <div className="page-enter">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('blog.heading')}
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t('blog.subheading')}
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {blogCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {t(cat.nameKey)}
            </button>
          ))}
        </div>

        {/* Post Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <Link
              key={post.slug}
              to={localePath(`/blog/${post.slug}`)}
              className="group block bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-colors"
            >
              {/* Cover placeholder */}
              <div className="h-40 bg-gradient-to-br from-indigo-900/60 to-purple-900/40 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-white/30 group-hover:text-white/50 transition-colors" />
              </div>

              <div className="p-5">
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readingTime} min
                  </span>
                </div>

                <h2 className="text-lg font-semibold mb-2 group-hover:text-indigo-300 transition-colors">
                  {t(post.titleKey)}
                </h2>
                <p className="text-gray-400 text-sm line-clamp-3">
                  {t(post.summaryKey)}
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 text-xs bg-white/5 text-gray-400 px-2 py-1 rounded-full"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-16">
            {t('blog.noPosts')}
          </p>
        )}
      </main>

      {/* JSON-LD */}
      <div className="ai-only" style={{ display: 'none' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Blog',
              name: t('blog.heading'),
              description: t('blog.pageDescription'),
              url: 'https://canfly.ai/blog',
              blogPost: blogPosts.map((post) => ({
                '@type': 'BlogPosting',
                headline: t(post.titleKey),
                description: t(post.summaryKey),
                datePublished: post.date,
                url: `https://canfly.ai/blog/${post.slug}`,
              })),
            }),
          }}
        />
      </div>
    </div>
  )
}
