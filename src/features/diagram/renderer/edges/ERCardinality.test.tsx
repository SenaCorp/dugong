import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ERCardinality } from './ERCardinality'

it.each(['one', 'zero-or-one', 'one-or-many', 'zero-or-many'] as const)('draws %s with an optional circle only when nullable', cardinality => {
  const markup = renderToStaticMarkup(<svg><ERCardinality cardinality={cardinality} endpoint={{ x: 0, y: 0 }} neighbor={{ x: 0, y: 10 }} /></svg>)
  expect(markup).toContain('rotate(90)')
  expect(markup.includes('<circle')).toBe(cardinality.startsWith('zero'))
  expect(markup.includes('M2 -7 L14 0 L2 7')).toBe(cardinality.endsWith('many'))
})
