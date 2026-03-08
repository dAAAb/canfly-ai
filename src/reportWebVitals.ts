import { onCLS, onINP, onLCP, type Metric } from 'web-vitals'

function sendToAnalytics(metric: Metric) {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value.toFixed(2), metric.rating)
  }

  // Send to Cloudflare Analytics or any beacon endpoint when available
  if (navigator.sendBeacon) {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: location.href,
    })
    navigator.sendBeacon('/api/vitals', body)
  }
}

export function reportWebVitals() {
  onCLS(sendToAnalytics)
  onINP(sendToAnalytics)
  onLCP(sendToAnalytics)
}
