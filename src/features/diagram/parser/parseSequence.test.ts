import { expect, it } from 'vitest'
import loginSource from '../../../../samples/login-sequence.mmd?raw'
import { parseDiagram } from './parseDiagram'

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
