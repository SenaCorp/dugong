import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Position, ReactFlowProvider, type EdgeProps } from '@xyflow/react'
import { DiagramEdge } from './DiagramEdge'
import type { DiagramEdgeData, FlowEdge } from '../../layout/flowTypes'

function renderEdge(active: boolean, extra: Partial<DiagramEdgeData> = {}) {
  const props: EdgeProps<FlowEdge> = {
    id: 'A-B', source: 'A', target: 'B', sourceX: 0, sourceY: 0, targetX: 200, targetY: 50,
    sourcePosition: Position.Right, targetPosition: Position.Left,
    data: { points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 50 }], active, ...extra },
  }
  return renderToStaticMarkup(<ReactFlowProvider><svg><DiagramEdge {...props} /></svg></ReactFlowProvider>)
}
it('adds glow and moving light only to active connections', () => {
  const active = renderEdge(true)
  expect(active).toContain('edge-glow')
  expect(active).toContain('edge-light')
  const idle = renderEdge(false)
  expect(idle).not.toContain('edge-glow')
  expect(idle).not.toContain('edge-light')
  expect(idle).toContain('diagram-edge')
})
it('normalizes sequence playback light to the complete message path', () => {
  const markup = renderEdge(true, { sequenceIndex: 0, dashed: true, playback: true })
  expect(markup).toContain('is-sequence is-response')
  expect(markup).toContain('pathLength="100"')
  expect(markup).toContain('is-playing')
  expect(markup).toContain('animation-duration:1100ms')
})
it('uses the same ELK route for glow, light, and the visible edge', () => {
  const markup = renderEdge(true)
  const routes = [...markup.matchAll(/ d="([^"]+)"/g)].map(match => match[1])
  expect(routes).toHaveLength(3)
  expect(new Set(routes).size).toBe(1)
})
