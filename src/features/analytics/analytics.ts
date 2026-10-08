import { safeEventParameters, type AnalyticsEvents } from './events'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied'
export const CONSENT_KEY = 'dugong-analytics-consent-v1'
const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000
const PAGE_TITLE = 'DUGONG — Interactive Architecture Diagram Editor'

interface AnalyticsOptions {
  measurementId?: string
  production: boolean
  enableLocal?: boolean
  debug?: boolean
  window?: Window
  document?: Document
}

export function createAnalytics(options: AnalyticsOptions) {
  const win = options.window
  const doc = options.document
  const id = options.measurementId?.trim() ?? ''
  const local = win && /^(localhost|.*\.localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/.test(win.location.hostname)
  const privacyPreference = () => win?.navigator.doNotTrack === '1' || (win?.navigator as Navigator & { globalPrivacyControl?: boolean } | undefined)?.globalPrivacyControl === true
  const available = Boolean(win && doc && options.production && /^G-[A-Z0-9]{10}$/.test(id) && (!local || options.enableLocal))
  const listeners = new Set<() => void>()
  let consent: AnalyticsConsent = 'unknown'
  let initialized = false
  let loaded = false
  let configured = false
  const pending: { name: string; parameters: Record<string, string> }[] = []
  let listening = false

  function readConsent(): AnalyticsConsent {
    try {
      const stored = JSON.parse(win?.localStorage.getItem(CONSENT_KEY) ?? 'null')
      const age = Date.now() - stored?.updatedAt
      if ((stored?.choice === 'granted' || stored?.choice === 'denied') && age >= 0 && age < CONSENT_MAX_AGE) return stored.choice
    } catch { /* Unavailable or invalid storage never implies consent. */ }
    return 'unknown'
  }
  const canTrack = () => available && consent === 'granted' && !privacyPreference()
  const context = () => ({
    // Only the root page is public. Never send query strings, hashes, referrers or user-controlled titles.
    page_location: `${win!.location.origin}/`, page_referrer: '', page_title: PAGE_TITLE,
    ...(options.debug ? { debug_mode: true } : {}),
  })
  function clearCookies() {
    if (!win || !doc) return
    const names = doc.cookie.split(';').map(cookie => cookie.split('=')[0].trim()).filter(name => /^_ga(?:_|$)/.test(name))
    const parts = win.location.hostname.split('.')
    for (const name of names) {
      const cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`
      doc.cookie = cookie
      for (let index = 0; index < parts.length - 1; index++) doc.cookie = `${cookie}; domain=.${parts.slice(index).join('.')}`
    }
  }
  function configureTag() {
    if (!loaded || !canTrack() || !win || configured) return
    configured = true
    win.gtag?.('js', new Date())
    win.gtag?.('config', id, {
      ...context(), send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_flags: 'SameSite=Lax;Secure',
    })
    win.gtag?.('event', 'page_view', context())
    for (const event of pending.splice(0)) win.gtag?.('event', event.name, { ...event.parameters, ...context() })
  }
  function initializeTag() {
    if (!canTrack() || initialized || !win || !doc) return
    initialized = true
    win.dataLayer ??= []
    // The Google tag's documented queue format uses IArguments entries.
    // eslint-disable-next-line prefer-rest-params
    win.gtag = function () { win.dataLayer!.push(arguments) }
    Reflect.set(win, `ga-disable-${id}`, false)
    win.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    win.gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    const script = doc.createElement('script')
    script.id = 'dugong-ga4'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
    script.onload = () => { loaded = true; configureTag() }
    script.onerror = () => { pending.length = 0 }
    doc.head.appendChild(script)
  }
  function updateConsent(choice: AnalyticsConsent) {
    const previous = consent
    consent = choice
    if (!canTrack()) {
      pending.length = 0
      if (win && initialized) {
        Reflect.set(win, `ga-disable-${id}`, true)
        // Discard pending commands, including commands queued while the script was loading.
        if (win.dataLayer) win.dataLayer.length = 0
        win.gtag?.('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
        clearCookies()
      }
    } else if (!initialized) initializeTag()
    else if (previous !== 'granted' && win) {
      Reflect.set(win, `ga-disable-${id}`, false)
      win.gtag?.('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
      configureTag()
    }
    if (previous !== consent) listeners.forEach(listener => listener())
  }
  return {
    isAvailable: () => available && !privacyPreference(),
    getConsent: () => consent,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    initialize() {
      if (!available || !win) return
      if (!listening) {
        listening = true
        updateConsent(readConsent())
        win.addEventListener('storage', event => { if (event.key === CONSENT_KEY || event.key === null) updateConsent(readConsent()) })
      }
      initializeTag()
    },
    setConsent(choice: 'granted' | 'denied') {
      try { win?.localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, updatedAt: Date.now() })) } catch { /* This visit's explicit choice still applies. */ }
      updateConsent(choice)
    },
    track<K extends keyof AnalyticsEvents>(name: K, parameters: AnalyticsEvents[K]) {
      if (!canTrack() || !initialized) return
      const safe = safeEventParameters(name, parameters)
      if (!safe) return
      if (configured) win?.gtag?.('event', name, { ...safe, ...context() })
      else if (pending.length < 100) pending.push({ name, parameters: safe })
    },
  }
}

export const analytics = createAnalytics({
  measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  production: import.meta.env.PROD,
  enableLocal: import.meta.env.VITE_GA_ENABLE_LOCAL === 'true',
  debug: import.meta.env.VITE_GA_DEBUG === 'true',
  window: typeof window === 'undefined' ? undefined : window,
  document: typeof document === 'undefined' ? undefined : document,
})
export const trackEvent = analytics.track
