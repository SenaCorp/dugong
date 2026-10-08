import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import loginSource from '../../../../samples/login-sequence.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'
import { isDecoration } from '../renderer/isDecoration'

it.each([
  'sequenceDiagram\nactor User as Customer\nparticipant Bank as Banking API\nUser->>Bank: Pay\nBank--xUser: Timeout',
  'sequenceDiagram\nactor User as Customer\nparticipant Bank as Banking API\nalt Empty branch\nelse Another\nend\nNote over User,Bank: Final note',
])('repeats participants below the complete sequence timeline: %s', async source => {
  const { graph, errors } = parseDiagram(source)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  const participants = layout.nodes.filter(node => !isDecoration(node))
  const footers = layout.nodes.filter(node => node.type === 'sequenceFooter')
  expect(footers).toHaveLength(participants.length)
  expect(new Set(layout.nodes.map(node => node.id)).size).toBe(layout.nodes.length)
  for (const participant of participants) {
    const footer = footers.find(node => node.data.participantId === participant.id)!
    const lifeline = layout.nodes.find(node => node.id === `:lifeline:${participant.id}`)!
    expect(footer.position.x).toBe(participant.position.x)
    expect(footer.position.y).toBe(lifeline.position.y + Number(lifeline.style?.height))
    expect(footer.data).toMatchObject({ label: participant.data.label, participantKind: participant.data.participantKind, theme: participant.data.theme, ports: [] })
    expect(isDecoration(footer)).toBe(true)
    expect(footer.selectable).toBe(false)
    for (const node of layout.nodes.filter(node => ['sequenceFrame', 'sequenceNote', 'activation'].includes(node.type!))) {
      expect(footer.position.y).toBeGreaterThan(node.position.y + Number(node.style?.height))
    }
  }
})

it('routes lost messages with a cross endpoint instead of an arrowhead', async () => {
  const { graph } = parseDiagram('sequenceDiagram\nBank--xTX: Timeout / Unknown Result\nTX--xTX: Lost self-call\nTX-->>Bank: Response')
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.edges).toHaveLength(3)
  for (const edge of layout.edges.slice(0, 2)) {
    expect(edge.markerEnd).toBeUndefined()
    expect(edge.data).toMatchObject({ dashed: true, sequenceEndMarker: 'cross' })
  }
  expect(layout.edges[1].data!.points).toHaveLength(4)
  expect(layout.edges[2].markerEnd).toBeDefined()
})

it('lays out participants in source order and routes messages chronologically', async () => {
  const { graph } = parseDiagram(loginSource)
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.kind).toBe('sequence')
  expect(layout.nodes.filter(node => node.type === 'lifeline')).toHaveLength(5)
  const participants = layout.nodes.filter(node => !isDecoration(node))
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
