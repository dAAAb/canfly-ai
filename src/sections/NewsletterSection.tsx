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
    <section className="home-section home-newsletter">
      <div ref={ref} className="fade-section home-newsletter__panel">
        <div className="flight-eyebrow stagger-child stagger-1">
          <Mail className="w-3.5 h-3.5" />
          {t('newsletter.badge')}
        </div>

        <h2 className="stagger-child stagger-1">
          {t('newsletter.heading')}
        </h2>

        <p className="home-newsletter__description stagger-child stagger-2">
          {t('newsletter.desc')}
        </p>

        {status === 'success' ? (
          <div className="home-newsletter__success stagger-child stagger-3">
            <Check className="w-5 h-5 text-green-400" />
            <span>{t('newsletter.success')}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="home-newsletter__form stagger-child stagger-3"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.placeholder')}
              className="flight-input"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flight-button flight-button--primary"
            >
              <Send className="w-4 h-4" />
              {t('newsletter.cta')}
            </button>
          </form>
        )}

        <p className="home-newsletter__privacy stagger-child stagger-4">
          {t('newsletter.privacy')}
        </p>
      </div>
    </section>
  )
}
