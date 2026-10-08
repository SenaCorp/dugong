/// <reference types="node" />
import { readFileSync, existsSync } from 'node:fs'
import { expect, it } from 'vitest'

const html = readFileSync('index.html', 'utf8')
it('provides consistent root canonical, social metadata and descriptive product content without JavaScript', () => {
  expect(html).toContain('<title>DUGONG — Interactive Architecture Diagram Editor</title>')
  expect(html).toContain('<link rel="canonical" href="https://godtech.id/"')
  expect(html).toContain('property="og:url" content="https://godtech.id/"')
  expect(html).toContain('name="twitter:card" content="summary_large_image"')
  expect(html).toContain('<h1>DUGONG — Interactive Architecture Diagram Editor</h1>')
  expect(html).toContain('<h2>Write, arrange, and explore diagrams</h2>')
  expect(html).not.toMatch(/noindex|fully Mermaid-compatible|google-site-verification/i)
  const structured = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])
  expect(structured).toMatchObject({ '@type': 'WebApplication', name: 'DUGONG', url: 'https://godtech.id/' })
  expect(structured).not.toHaveProperty('aggregateRating')
})
it('lists only the public root in the sitemap and allows crawling with a production sitemap reference', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8')
  expect([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).toEqual(['https://godtech.id/'])
  const robots = readFileSync('public/robots.txt', 'utf8')
  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Sitemap: https://godtech.id/sitemap.xml')
  expect(robots).not.toMatch(/Disallow: \/\s*$/m)
})
it('ships the PNG social card at the declared dimensions', () => {
  expect(existsSync('public/social-preview.png')).toBe(true)
  const png = readFileSync('public/social-preview.png')
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
})
