import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value.toFixed(2), metric.rating)
  }

  // Send to GA4 via gtag (if loaded)
  if (typeof window.gtag === 'function') {
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
      event_label: metric.id,
      metric_rating: metric.rating,
      non_interaction: true,
    })
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics)
  onINP(sendToAnalytics)
  onLCP(sendToAnalytics)
}
