import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ComponentCard } from './ComponentCard'

it('renders a component name, source ID and a component symbol', () => {
  const markup = renderToStaticMarkup(<ComponentCard id="SERVICE_CONSOLE" label="Console" />)
  expect(markup).toContain('component-surface')
  expect(markup).toContain('component-symbol')
  expect(markup).toContain('SERVICE_CONSOLE')
  expect(markup).toContain('Console')
})
it('uses a component caption when the source ID already equals its label', () => {
  const markup = renderToStaticMarkup(<ComponentCard id="A" label="A" />)
  expect(markup).toContain('COMPONENT')
  expect(markup.match(/>A</g)).toHaveLength(1)
})
