export const BOARDING_PREFERENCE_EVENT = 'canfly:boarding-preference'

const COOKIE_NAME = 'canfly_skip_boarding'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function shouldSkipBoarding(cookieHeader?: string) {
  const cookies =
    cookieHeader
    ?? (typeof document === 'undefined' ? '' : document.cookie)

  return cookies
    .split(';')
    .some((cookie) => cookie.trim() === `${COOKIE_NAME}=1`)
}

export function setSkipBoardingPreference(skipBoarding: boolean) {
  if (typeof document === 'undefined') return

  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? '; Secure'
      : ''
  const maxAge = skipBoarding ? ONE_YEAR_SECONDS : 0
  const value = skipBoarding ? '1' : '0'

  document.cookie =
    `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BOARDING_PREFERENCE_EVENT))
  }
}
