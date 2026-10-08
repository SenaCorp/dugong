import { expect, it } from 'vitest'
import loginSource from '../../../../samples/login-sequence.mmd?raw'
import { parseDiagram } from './parseDiagram'

it('keeps request arrows when participant IDs contain the lost-message token', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nBank--xEast->>TX: Pay\nBank->>TX--xWest: Pay')
  expect(errors).toEqual([])
  expect(graph.edges[0]).toMatchObject({ source: 'Bank--xEast', target: 'TX', dashed: false })
  expect(graph.edges[1]).toMatchObject({ source: 'Bank', target: 'TX--xWest', dashed: false })
  expect(graph.edges.every(edge => edge.sequenceEndMarker === undefined)).toBe(true)
})

it('parses dashed lost messages with hyphenated participants and preserves message order', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nTX->>Bank: Pay\nBank--xTX: Timeout / Unknown Result\nBank-East --x TX-West: Lost\nTX-->>Bank: Retry')
  expect(errors).toEqual([])
  expect(graph.edges).toHaveLength(4)
  expect(graph.edges[1]).toMatchObject({ source: 'Bank', target: 'TX', label: 'Timeout / Unknown Result', dashed: true, sequenceEndMarker: 'cross' })
  expect(graph.edges[2]).toMatchObject({ source: 'Bank-East', target: 'TX-West', sequenceEndMarker: 'cross' })
  expect(graph.edges[3]).toMatchObject({ source: 'TX', target: 'Bank', dashed: true })
})

it('parses the login sample with participants, actor, self-call and ordered messages', () => {
  const { graph, errors } = parseDiagram(loginSource)
  expect(errors).toEqual([])
  expect(graph.sequence).toMatchObject({ autonumber: true, actorIds: ['User'] })
  expect(graph.nodes.map(node => node.label)).toEqual(['User', 'Web App', 'Auth API', 'PostgreSQL', 'Session Store'])
  expect(graph.edges).toHaveLength(11)
  expect(graph.edges[3]).toMatchObject({ source: 'DB', target: 'Auth', dashed: true })
  expect(graph.edges[4]).toMatchObject({ source: 'Auth', target: 'Auth', label: 'Verify password hash' })
})
it('creates implicit participants and later aliases override their labels', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nA->>B: Request\nparticipant B as Backend\nB-->>A: Response')
  expect(errors).toEqual([])
  expect(graph.nodes.map(node => node.label)).toEqual(['A', 'Backend'])
  expect(new Set(graph.edges.map(edge => edge.id)).size).toBe(2)
})
it('ignores comments, blank lines and forgiving whitespace', () => {
  const result = parseDiagram(' %% note\n sequenceDiagram \n\n participant A as Client\n A ->> B : Hello: world')
  expect(result.errors).toEqual([])
  expect(result.graph.edges[0].label).toBe('Hello: world')
})
it('reports unsupported syntax and malformed messages without partial edges', () => {
  const result = parseDiagram('sequenceDiagram\nA->>B: Good\nalt Failure\nA->>C\nend\nA->>B:')
  expect(result.errors.map(error => error.line)).toEqual([4, 6])
  expect(result.graph.edges).toHaveLength(1)
  expect(result.graph.nodes).toHaveLength(2)
})
