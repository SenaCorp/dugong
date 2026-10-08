import { expect, it } from 'vitest'
import { parseDiagram } from '../parser/parseDiagram'
import { sequencePlaybackPath } from './sequencePlaybackPath'
import loginSource from '../../../../samples/login-sequence.mmd?raw'

const source = 'sequenceDiagram\nA->>B: Login\nalt Valid\nB-->>A: Session\nelse Invalid\nB-->>A: 401\nend\nA->>B: Next'
it('plays exactly one alternative and keeps common messages', () => {
  const { graph } = parseDiagram(source)
  expect(sequencePlaybackPath(graph.edges, {})).toEqual(['sequence-1', 'sequence-2', 'sequence-4'])
  expect(sequencePlaybackPath(graph.edges, { 'fragment-1': 1 })).toEqual(['sequence-1', 'sequence-3', 'sequence-4'])
})
it('respects all ancestor choices when alternatives are nested', () => {
  const { graph } = parseDiagram('sequenceDiagram\nalt Exists\nalt Valid\nA->>B: OK\nelse Invalid\nA->>B: Bad password\nend\nelse Missing\nA->>B: Missing account\nend')
  expect(sequencePlaybackPath(graph.edges, { 'fragment-2': 1 })).toEqual(['sequence-2'])
  expect(sequencePlaybackPath(graph.edges, { 'fragment-1': 1, 'fragment-2': 1 })).toEqual(['sequence-3'])
})

it('plays session creation only on the successful login sample branch', () => {
  const { graph, errors } = parseDiagram(loginSource)
  expect(errors).toEqual([])
  const success = sequencePlaybackPath(graph.edges, {})
  const failure = sequencePlaybackPath(graph.edges, { 'fragment-1': 1 })
  expect(success).toHaveLength(9)
  expect(failure).toHaveLength(7)
  const sessionMessages = graph.edges.filter(edge => edge.source === 'Session' || edge.target === 'Session')
  for (const edge of sessionMessages) {
    expect(success).toContain(edge.id)
    expect(failure).not.toContain(edge.id)
  }
  expect(failure).toContain(graph.edges.find(edge => edge.label === '401 Unauthorized')!.id)
})
