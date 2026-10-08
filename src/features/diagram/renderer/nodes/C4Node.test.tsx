import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { C4Card } from './C4Node'

it('renders C4 type, name, technology, description and external status without interpreting HTML', () => {
  const markup = renderToStaticMarkup(<C4Card label="Account Store" element={{ kind: 'database', level: 'container', external: true, technology: 'PostgreSQL', description: 'Stores <accounts>' }} />)
  for (const text of ['container · database', 'Account Store', 'PostgreSQL', 'External', 'Stores &lt;accounts&gt;']) expect(markup).toContain(text)
})
