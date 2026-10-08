import { useState, useSyncExternalStore } from 'react'
import { analytics } from '../features/analytics/analytics'

export function AnalyticsConsent() {
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getConsent, () => 'unknown' as const)
  const [opened, setOpened] = useState(false)
  if (!analytics.isAvailable()) return null
  const visible = opened || consent === 'unknown'
  return <>
    <button type="button" className="footer-link" onClick={() => setOpened(value => !value)} aria-expanded={visible} aria-controls="analytics-preferences">Analytics preferences</button>
    {visible && <section className="analytics-consent" id="analytics-preferences" aria-labelledby="analytics-consent-title">
      <div>
        <h2 id="analytics-consent-title">Optional analytics</h2>
        <p>Allow Google Analytics to measure page visits and feature usage with cookies? We never send your diagram source, labels, or code. Your choice is saved in this browser for 180 days and can be changed here.</p>
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google privacy policy</a>
      </div>
      <div className="consent-actions">
        <button type="button" className="tool-button" onClick={() => { analytics.setConsent('denied'); setOpened(false) }}>Reject analytics</button>
        <button type="button" className="tool-button" onClick={() => { analytics.setConsent('granted'); setOpened(false) }}>Allow analytics</button>
      </div>
    </section>}
  </>
}
