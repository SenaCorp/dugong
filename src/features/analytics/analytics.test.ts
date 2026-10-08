import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_KEY, createAnalytics } from './analytics'

const measurementId = 'G-ABC1234567'
function browser(hostname = 'godtech.id', deferLoad = false) {
  const values = new Map<string, string>()
  const scripts: { src: string; async: boolean; id: string; remove: () => void; onload: () => void; onerror: () => void }[] = []
  const win = {
    location: { hostname, origin: `https://${hostname}`, pathname: '/', search: '?source=secret', hash: '#private' },
    navigator: { doNotTrack: '0' },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
    addEventListener: vi.fn(),
  } as unknown as Window
  const doc = {
    cookie: '',
    createElement: () => ({ remove: vi.fn() }),
    head: { appendChild: (script: typeof scripts[number]) => { scripts.push(script); if (!deferLoad) script.onload() } },
  } as unknown as Document
  const client = createAnalytics({ measurementId, production: true, window: win, document: doc })
  const commands = () => (win.dataLayer ?? []).map(command => Array.from(command as ArrayLike<unknown>))
  return { win, doc, scripts, client, commands, values }
}

afterEach(() => vi.restoreAllMocks())
describe('GA4 consent and initialization', () => {
  it('makes no tag requests or event queues before consent, including denied consent', () => {
    const { client, scripts, commands } = browser()
    client.initialize()
    client.track('diagram_rendered', { diagram_type: 'flowchart' })
    client.setConsent('denied')
    expect(scripts).toHaveLength(0)
    expect(commands()).toEqual([])
  })
  it('initializes asynchronously once and emits exactly one explicit page view', () => {
    const { client, scripts, commands } = browser()
    client.setConsent('granted')
    client.initialize()
    client.setConsent('granted')
    expect(scripts).toHaveLength(1)
    expect(scripts[0]).toMatchObject({ async: true, src: `https://www.googletagmanager.com/gtag/js?id=${measurementId}` })
    expect(commands().filter(c => c[0] === 'config')).toHaveLength(1)
    expect(commands().filter(c => c[1] === 'page_view')).toHaveLength(1)
    expect(commands().find(c => c[0] === 'config')?.[2]).toMatchObject({ send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
    expect(commands().find(c => c[1] === 'page_view')?.[2]).toMatchObject({ page_location: 'https://godtech.id/', page_referrer: '' })
    expect(JSON.stringify(commands())).not.toContain('secret')
    expect(JSON.stringify(commands())).not.toContain('private')
  })
  it.each(['', 'G-invalid', 'UA-12345678-1', '<script>', 'G-ABC1234567&x=1'])('does not load with invalid measurement ID %s', id => {
    const { win, doc, scripts } = browser()
    const client = createAnalytics({ measurementId: id, production: true, window: win, document: doc })
    client.setConsent('granted')
    expect(scripts).toHaveLength(0)
  })
  it('does not track development or local production previews by default', () => {
    const { win, doc, scripts } = browser()
    createAnalytics({ measurementId, production: false, window: win, document: doc }).setConsent('granted')
    expect(scripts).toHaveLength(0)
    const local = browser('localhost')
    local.client.setConsent('granted')
    expect(local.scripts).toHaveLength(0)
  })
  it('supports explicitly enabled local production previews and debug events', () => {
    const { win, doc, scripts, commands } = browser('127.0.0.1')
    const client = createAnalytics({ measurementId, production: true, enableLocal: true, debug: true, window: win, document: doc })
    client.setConsent('granted')
    client.track('github_clicked', {})
    expect(scripts).toHaveLength(1)
    expect(commands().find(c => c[1] === 'github_clicked')?.[2]).toMatchObject({ debug_mode: true })
  })
  it('honors Do Not Track and Global Privacy Control', () => {
    for (const preference of [{ doNotTrack: '1' }, { globalPrivacyControl: true }]) {
      const { win, doc, scripts } = browser()
      Object.assign(win.navigator, preference)
      const client = createAnalytics({ measurementId, production: true, window: win, document: doc })
      client.setConsent('granted')
      expect(scripts).toHaveLength(0)
    }
  })
  it('revokes consent, disables collection, clears queued events and does not replay them on regrant', () => {
    const { client, win, commands, scripts } = browser()
    client.setConsent('granted')
    client.track('github_clicked', {})
    client.setConsent('denied')
    client.track('github_clicked', {})
    expect(Reflect.get(win, `ga-disable-${measurementId}`)).toBe(true)
    expect(commands().filter(c => c[0] === 'event')).toHaveLength(0)
    client.setConsent('granted')
    expect(scripts).toHaveLength(1)
    expect(commands().filter(c => c[1] === 'github_clicked')).toHaveLength(0)
  })
  it('works when browser storage is unavailable, without assuming stored consent', () => {
    const { win, doc, scripts } = browser()
    win.localStorage.getItem = () => { throw new Error('blocked') }
    win.localStorage.setItem = () => { throw new Error('blocked') }
    const client = createAnalytics({ measurementId, production: true, window: win, document: doc })
    client.initialize()
    expect(scripts).toHaveLength(0)
    client.setConsent('granted')
    expect(scripts).toHaveLength(1)
  })
  it('does not configure or send pending events when consent is revoked while the script loads', () => {
    const { client, scripts, commands } = browser('godtech.id', true)
    client.setConsent('granted')
    client.track('github_clicked', {})
    client.setConsent('denied')
    scripts[0].onload()
    expect(commands().filter(c => c[0] === 'config' || c[0] === 'event')).toHaveLength(0)
    client.setConsent('granted')
    expect(commands().filter(c => c[1] === 'page_view')).toHaveLength(1)
    expect(commands().filter(c => c[1] === 'github_clicked')).toHaveLength(0)
    expect(scripts).toHaveLength(1)
  })
  it('restores recent explicit consent but rejects expired, malformed or future-dated choices', () => {
    for (const [stored, expected] of [
      [JSON.stringify({ choice: 'granted', updatedAt: Date.now() - 1000 }), 1],
      [JSON.stringify({ choice: 'granted', updatedAt: Date.now() - 181 * 86400000 }), 0],
      [JSON.stringify({ choice: 'granted', updatedAt: Date.now() + 86400000 }), 0],
      ['true', 0], ['malformed', 0],
    ] as const) {
      const { client, scripts, values } = browser()
      values.set(CONSENT_KEY, stored)
      client.initialize()
      expect(scripts).toHaveLength(expected)
    }
  })
  it('applies consent withdrawal from another tab', () => {
    const { client, win, values, commands } = browser()
    client.initialize()
    client.setConsent('granted')
    values.set(CONSENT_KEY, JSON.stringify({ choice: 'denied', updatedAt: Date.now() }))
    const listener = vi.mocked(win.addEventListener).mock.calls.find(call => call[0] === 'storage')![1] as EventListener
    listener({ key: CONSENT_KEY } as StorageEvent)
    client.track('github_clicked', {})
    expect(client.getConsent()).toBe('denied')
    expect(Reflect.get(win, `ga-disable-${measurementId}`)).toBe(true)
    expect(commands().filter(c => c[0] === 'event')).toHaveLength(0)
  })
  it('flushes only consented, sanitized events after the async tag loads', () => {
    const { client, scripts, commands } = browser('godtech.id', true)
    client.setConsent('granted')
    client.track('diagram_exported', { diagram_type: 'c4', format: 'png', source: 'secret' } as never)
    expect(commands().filter(c => c[0] === 'event')).toHaveLength(0)
    scripts[0].onload()
    expect(commands().filter(c => c[1] === 'diagram_exported')).toHaveLength(1)
    expect(JSON.stringify(commands())).not.toContain('secret')
  })
})

describe('privacy-safe product events', () => {
  it('allows documented events and drops extra parameters, arbitrary values and event names', () => {
    const { client, commands } = browser()
    client.setConsent('granted')
    client.track('example_selected', { example_id: 'login-sequence' })
    client.track('diagram_exported', { diagram_type: 'er', format: 'svg', source: 'sensitive' } as never)
    client.track('diagram_rendered', { diagram_type: 'customer-secret' } as never)
    client.track('unknown_event' as never, {} as never)
    expect(commands().filter(c => c[0] === 'event').map(c => c[1])).toEqual(['page_view', 'example_selected', 'diagram_exported'])
    expect(JSON.stringify(commands())).not.toContain('sensitive')
    expect(JSON.stringify(commands())).not.toContain('customer-secret')
  })
  it('does not queue product events before consent for later replay', () => {
    const { client, commands } = browser()
    client.track('example_selected', { example_id: 'login-sequence' })
    client.setConsent('granted')
    expect(commands().filter(c => c[1] === 'example_selected')).toHaveLength(0)
  })
})
