import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from '../layout/elkLayout'
import { applyManualPositions } from './manualLayout'
import { segmentCrossesBox } from './orthogonalRouter'

const engine = new ELK()
it('keeps a manually placed node and attaches routed edges after movement', async () => {
  const base = await layoutDiagram(parseDiagram('flowchart LR\nA --> B\nB --> C\nA --> D').graph, engine)
  const result = applyManualPositions(base, { B: { x: 440, y: 540 } })
  const b = result.nodes.find(node => node.id === 'B')!
  expect(b.position).toEqual({ x: 440, y: 540 })
  for (const edge of result.edges) {
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true)
      for (const node of result.nodes.filter(node => node.id !== edge.source && node.id !== edge.target)) {
        expect(segmentCrossesBox(points[i - 1], points[i], { ...node.position, width: Number(node.style?.width), height: Number(node.style?.height) })).toBe(false)
      }
    }
  }
})
it('moves sequence participants horizontally with their lifelines and messages', async () => {
  const base = await layoutDiagram(parseDiagram('sequenceDiagram\nparticipant A\nparticipant B\nA->>B: Login\nactivate B\nB-->>A: OK\ndeactivate B\nNote over A,B: Secure').graph, engine)
  const a = base.nodes.find(node => node.id === 'A')!
  const result = applyManualPositions(base, { A: { x: a.position.x - 100, y: 999 } })
  expect(result.nodes.find(node => node.id === 'A')?.position.y).toBe(a.position.y)
  expect(result.nodes.find(node => node.id === ':lifeline:A')!.position.x).toBe(base.nodes.find(node => node.id === ':lifeline:A')!.position.x - 100)
  expect(result.edges[0].data!.points[0].x).toBe(base.edges[0].data!.points[0].x - 100)
  expect(result.edges[0].data!.points[0].y).toBe(base.edges[0].data!.points[0].y)
})
it('keeps enough width for long sequence notes when participant spacing narrows', async () => {
  const text = 'This note has a long explanation that must remain fully readable after a participant moves closer to its neighbor.'
  const base = await layoutDiagram(parseDiagram(`sequenceDiagram\nparticipant A\nparticipant B\nalt valid\nA->>B: ${'long message '.repeat(35)}\nNote over A,B: ${text}\nB-->>A: OK\nend`).graph, engine)
  const a = base.nodes.find(node => node.id === 'A')!, b = base.nodes.find(node => node.id === 'B')!
  const result = applyManualPositions(base, { B: { x: a.position.x + 215, y: b.position.y } })
  const before = base.nodes.find(node => node.type === 'sequenceNote')!, after = result.nodes.find(node => node.type === 'sequenceNote')!
  expect(Number(after.style?.width)).toBeGreaterThanOrEqual(Number(before.style?.width))
  const frame = result.nodes.find(node => node.type === 'sequenceFrame')!
  expect(frame.position.x + Number(frame.style?.width)).toBeGreaterThan(after.position.x + Number(after.style?.width))
})
it('rejects overlapping nodes and reordered sequence columns', async () => {
  const base = await layoutDiagram(parseDiagram('flowchart LR\nA --> B').graph, engine)
  expect(() => applyManualPositions(base, { B: base.nodes[0].position })).toThrow('overlap')
  const sequence = await layoutDiagram(parseDiagram('sequenceDiagram\nA->>B: Test').graph, engine)
  const b = sequence.nodes.find(node => node.id === 'B')!
  expect(() => applyManualPositions(sequence, { A: { x: b.position.x + 300, y: b.position.y } })).toThrow('participant')
})
it('resizes nested groups while preserving absolute pins and port endpoints', async () => {
  const { absolutePositions } = await import('./manualLayout')
  const base = await layoutDiagram(parseDiagram('flowchart LR\nsubgraph OUTER[Outer]\nsubgraph INNER[Inner]\nA --> B\nend\nend\nB --> C').graph, engine)
  const result = applyManualPositions(base, { B: { x: 440, y: 540 } })
  const positions = absolutePositions(result.nodes)
  expect(positions.B).toEqual({ x: 440, y: 540 })
  for (const node of result.nodes.filter(node => node.type === 'group')) expect(node.width).toBe(node.style?.width)
  const edge = result.edges.find(edge => edge.source === 'B')!
  const port = result.nodes.find(node => node.id === 'B')!.data.ports.find(port => port.id === edge.sourceHandle)!
  expect(edge.data!.points[0]).toEqual({ x: 440 + port.x, y: 540 + port.y })
})
