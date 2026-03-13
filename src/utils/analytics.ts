/**
 * Lightweight GA4 event tracking for CTA and affiliate link clicks.
 * Uses the gtag instance already loaded in index.html.
 */
export function trackEvent(
  action: string,
  params?: Record<string, string | number | boolean>,
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params)
  }
}

export function trackCTAClick(label: string, location: string) {
  trackEvent('cta_click', {
    event_category: 'engagement',
    event_label: label,
    cta_location: location,
  })
}

export function trackAffiliateClick(productName: string, url: string) {
  trackEvent('affiliate_click', {
    event_category: 'conversion',
    event_label: productName,
    affiliate_url: url,
  })
}
