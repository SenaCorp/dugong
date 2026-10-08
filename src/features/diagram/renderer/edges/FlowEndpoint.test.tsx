import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { FlowEndpoint } from './FlowEndpoint'
import { flowEndpointPoint } from './flowEndpointPoint'

it('keeps marker glyphs outside the node border and handles duplicate route points', () => {
  const points = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }]
  expect(flowEndpointPoint(points, 'start')).toEqual({ x: 6, y: 0 })
  expect(flowEndpointPoint(points, 'end')).toEqual({ x: 94, y: 0 })
})
it('renders distinct native circle/cross endpoints', () => {
  expect(renderToStaticMarkup(<svg><FlowEndpoint marker="circle" point={{ x: 10, y: 10 }} /></svg>)).toContain('<circle')
  expect(renderToStaticMarkup(<svg><FlowEndpoint marker="cross" point={{ x: 10, y: 10 }} /></svg>)).toContain('M-4 -4 L4 4')
})
