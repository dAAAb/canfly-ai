import { useState, type FormEvent } from 'react'
import { useFadeIn } from '../hooks/useFadeIn'
import { Mail, Send, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function NewsletterSection() {
  const ref = useFadeIn()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || status === 'loading') return

    setStatus('loading')

    try {
      const res = await fetch('https://buttondown.com/api/emails/embed-subscribe/canfly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ email }),
      })

      if (res.ok || res.status === 201) {
        setStatus('success')
        setEmail('')
      } else {
        // Buttondown embed endpoint redirects on success;
        // if CORS blocks, fall back to form submission
        throw new Error('fetch failed')
      }
    } catch {
      // Fallback: use Buttondown's form action directly
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://buttondown.com/api/emails/embed-subscribe/canfly'
      form.target = '_blank'
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'email'
      input.value = email
      form.appendChild(input)
      document.body.appendChild(form)
      form.submit()
      document.body.removeChild(form)
      setStatus('success')
      setEmail('')
    }
  }

  return (
    <section
      className="relative"
      style={{ paddingLeft: '8%', paddingRight: '8%', paddingTop: '10vh', paddingBottom: '10vh' }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-950/50 to-black" />

      <div
        ref={ref}
        className="fade-section relative z-10"
        style={{ maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}
      >
        <div className="stagger-child stagger-1 inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            opacity: 0.7,
          }}
        >
          <Mail className="w-3.5 h-3.5" />
          {t('newsletter.badge')}
        </div>

        <h2
          className="font-bold stagger-child stagger-1"
          style={{
            fontSize: 'clamp(28px, 4vw, 48px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {t('newsletter.heading')}
        </h2>

        <p
          className="stagger-child stagger-2"
          style={{
            fontSize: 'clamp(14px, 1.2vw, 18px)',
            lineHeight: 1.7,
            opacity: 0.6,
            marginTop: '16px',
            marginBottom: '32px',
          }}
        >
          {t('newsletter.desc')}
        </p>

        {status === 'success' ? (
          <div
            className="stagger-child stagger-3 inline-flex items-center gap-3 rounded-2xl px-8 py-4"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.3)',
              fontSize: 'clamp(14px, 1.1vw, 17px)',
            }}
          >
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-300">{t('newsletter.success')}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="stagger-child stagger-3"
            style={{
              display: 'flex',
              gap: '12px',
              maxWidth: '460px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              className="flex-1 rounded-xl px-5 py-3.5 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 'clamp(14px, 1.1vw, 16px)',
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-medium text-white transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                fontSize: 'clamp(14px, 1.1vw, 16px)',
                whiteSpace: 'nowrap',
              }}
            >
              <Send className="w-4 h-4" />
              {t('newsletter.cta')}
            </button>
          </form>
        )}

        <p
          className="stagger-child stagger-4"
          style={{
            fontSize: '12px',
            opacity: 0.3,
            marginTop: '16px',
          }}
        >
          {t('newsletter.privacy')}
        </p>
      </div>
    </section>
  )
}
