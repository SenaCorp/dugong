import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { EntityCard } from './EntityNode'

it('renders semantic table fields, compound keys and escaped attribute comments', () => {
  const markup = renderToStaticMarkup(<EntityCard label="Orders" attributes={[{ name: 'customer_id', type: 'uuid', keys: ['FK', 'UK'], comment: 'References <customer>' }]} />)
  for (const text of ['<table', 'Orders attributes', 'customer_id', 'uuid', 'FK · UK', 'References &lt;customer&gt;']) expect(markup).toContain(text)
})
