import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import loginSource from '../../../../samples/login-sequence.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'

it('lays out participants in source order and routes messages chronologically', async () => {
  const { graph } = parseDiagram(loginSource)
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.kind).toBe('sequence')
  expect(layout.nodes.filter(node => node.type === 'lifeline')).toHaveLength(5)
  const participants = layout.nodes.filter(node => node.data.participantKind !== undefined)
  expect(participants.map(node => node.id)).toEqual(graph.nodes.map(node => node.id))
  for (let i = 1; i < participants.length; i++) expect(participants[i].position.x).toBeGreaterThan(participants[i - 1].position.x)
  const rows = layout.edges.map(edge => edge.data!.points[0].y)
  expect(rows).toEqual([...rows].sort((a, b) => a - b))
  expect(new Set(rows).size).toBe(11)
  expect(layout.edges[4].data!.points).toHaveLength(4)
  expect(layout.edges.map(edge => edge.data!.sequenceIndex)).toEqual(Array.from({ length: 11 }, (_, index) => index))
  for (const edge of layout.edges) {
    expect(participants.find(node => node.id === edge.source)!.data.ports.some(port => port.id === edge.sourceHandle)).toBe(true)
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true)
  }
})

it('keeps a last-participant self-call label inside its alternative frame', async () => {
  const { graph } = parseDiagram(`sequenceDiagram\nparticipant A\nparticipant B\nalt Verify locally\nB->>B: ${'Validate credentials '.repeat(8)}\nelse Skip\nB-->>A: No verification\nend`)
  const layout = await layoutDiagram(graph, new ELK())
  const frame = layout.nodes.find(node => node.type === 'sequenceFrame')!
  const selfCall = layout.edges[0]
  expect(frame.position.x + Number(frame.style?.width)).toBeGreaterThan(selfCall.data!.labelPosition!.x + 180)
  expect(selfCall.data!.labelPosition!.x - 180).toBeGreaterThan(selfCall.data!.points[1].x)
})
