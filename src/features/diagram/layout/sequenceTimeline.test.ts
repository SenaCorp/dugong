import { expect, it } from 'vitest'
import { parseDiagram } from '../parser/parseDiagram'
import { arrangeSequenceTimeline } from './sequenceTimeline'

it('reserves space between branch separators and the next message', () => {
  const { graph } = parseDiagram('sequenceDiagram\nA->>B: Before\nalt Valid\nB-->>A: OK\nelse Invalid\nB-->>A: Denied\nend\nA->>B: After')
  const timeline = arrangeSequenceTimeline(graph.edges.length, 100, graph.sequence!.fragments!)
  expect(timeline.rows).toHaveLength(4)
  const frame = timeline.frames[0]
  expect(timeline.rows[1]).toBeGreaterThanOrEqual(frame.top + 44)
  expect(timeline.rows[2]).toBeGreaterThanOrEqual(frame.top + frame.branches[1].y + 44)
  expect(timeline.rows[3]).toBeGreaterThan(frame.bottom)
})

it('places empty and nested alternatives inside their parent without overwriting message rows', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nalt Outer\nalt Empty\nelse Also empty\nend\nA->>B: First\nelse Other\nalt Inner\nB-->>A: Second\nelse Empty\nend\nend\nA->>B: Final')
  expect(errors).toEqual([])
  const { rows, frames } = arrangeSequenceTimeline(graph.edges.length, 100, graph.sequence!.fragments!)
  expect(rows).toHaveLength(3)
  expect(new Set(rows).size).toBe(3)
  expect(frames).toHaveLength(3)
  for (const frame of frames.slice(1)) {
    expect(frame.top).toBeGreaterThan(frames[0].top)
    expect(frame.bottom).toBeLessThan(frames[0].bottom)
    expect(frame.bottom).toBeGreaterThan(frame.top)
  }
})
