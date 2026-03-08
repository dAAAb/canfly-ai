import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, Clock, Tag, ArrowLeft, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import ShareBar from '../components/ShareBar'
import { useHead } from '../hooks/useHead'
import { useLanguage } from '../hooks/useLanguage'
import { blogPostsBySlug } from '../data/blog'
import { productsBySlug } from '../data/products'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const { localePath } = useLanguage()

  const post = slug ? blogPostsBySlug[slug] : undefined

  useHead({
    title: post ? t(post.titleKey) : t('blog.notFound'),
    description: post ? t(post.summaryKey) : '',
    canonical: post ? `https://canfly.ai${localePath(`/blog/${post.slug}`)}` : undefined,
    ogType: 'article',
  })

  if (!post) {
    return (
      <div className="page-enter">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-28 pb-16 text-center">
          <h1 className="text-3xl font-bold mb-4">{t('blog.notFound')}</h1>
          <Link
            to={localePath('/blog')}
            className="text-indigo-400 hover:text-indigo-300"
          >
            {t('blog.backToList')}
          </Link>
        </main>
      </div>
    )
  }

  const contentSections: string[] = t(post.contentKey, {
    returnObjects: true,
  }) as unknown as string[]

  const relatedProducts = (post.relatedProducts || [])
    .map((id) => productsBySlug[id])
    .filter(Boolean)

  return (
    <div className="page-enter">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link
            to={localePath('/blog')}
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('blog.backToList')}
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readingTime} min
            </span>
            <span className="bg-white/10 text-gray-300 px-3 py-0.5 rounded-full text-xs">
              {t(`blog.categories.${post.category}`)}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
            {t(post.titleKey)}
          </h1>
          <p className="text-lg text-gray-400">{t(post.summaryKey)}</p>
        </header>

        {/* Content */}
        <article className="prose prose-invert prose-lg max-w-none">
          {Array.isArray(contentSections) ? (
            contentSections.map((section, i) => (
              <p key={i} className="text-gray-300 leading-relaxed mb-6">
                {section}
              </p>
            ))
          ) : (
            <p className="text-gray-300 leading-relaxed">
              {String(contentSections)}
            </p>
          )}
        </article>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-white/10">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-sm bg-white/5 text-gray-400 px-3 py-1.5 rounded-full"
            >
              <Tag className="w-3.5 h-3.5" />
              {tag}
            </span>
          ))}
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-white/10">
            <h2 className="text-xl font-semibold mb-4">
              {t('blog.relatedProducts')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {relatedProducts.map((product) => (
                <Link
                  key={product.id}
                  to={localePath(`/apps/${product.id}`)}
                  className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/30 transition-colors group"
                >
                  <img
                    src={product.icon}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium group-hover:text-indigo-300 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {product.tagline}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <ShareBar title={t(post.titleKey)} />
      </main>

      {/* JSON-LD */}
      <div className="ai-only" style={{ display: 'none' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: t(post.titleKey),
              description: t(post.summaryKey),
              datePublished: post.date,
              url: `https://canfly.ai/blog/${post.slug}`,
              author: {
                '@type': 'Organization',
                name: 'CanFly.ai',
              },
              publisher: {
                '@type': 'Organization',
                name: 'CanFly.ai',
                url: 'https://canfly.ai',
              },
              keywords: post.tags.join(', '),
            }),
          }}
        />
      </div>
    </div>
  )
}
