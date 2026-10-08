import { expect, it, vi } from 'vitest'
import { createDiagramRenderTracker } from './diagramEvents'
import { parseDiagram } from '../diagram/parser/parseDiagram'

it('counts meaningful successful loads/type changes once, excluding edits and automatic layouts', () => {
  const emit = vi.fn()
  const select = vi.fn()
  const observe = createDiagramRenderTracker(emit, select)
  observe(0, { direction: 'LR', nodes: [], edges: [] })
  expect(emit).not.toHaveBeenCalled()
  const flow = parseDiagram('flowchart LR\nA[Private label]').graph
  observe(0, flow)
  observe(0, flow) // StrictMode effect replay.
  observe(0, parseDiagram('flowchart LR\nA[Edited label]').graph)
  observe(0, flow) // Auto-layout or position changes.
  observe(1, flow) // Explicit example/reset.
  observe(1, parseDiagram('sequenceDiagram\nparticipant A').graph)
  expect(emit.mock.calls).toEqual([['flowchart'], ['flowchart'], ['sequence']])
  expect(select.mock.calls).toEqual([['sequence']])
})
