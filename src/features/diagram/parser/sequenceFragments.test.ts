import { expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

it('records alternative conditions and memberships without changing message order', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nA->>B: Login\nalt Password valid\nB-->>A: Session\nelse Password invalid\nB-->>A: 401\nend\nA->>B: Next request')
  expect(errors).toEqual([])
  expect(graph.sequence?.fragments).toEqual([{ id: 'fragment-1', kind: 'alt', branches: [{ label: 'Password valid', start: 1, end: 2 }, { label: 'Password invalid', start: 2, end: 3 }] }])
  expect(graph.edges[0].sequenceBranches).toBeUndefined()
  expect(graph.edges[1].sequenceBranches).toEqual([{ fragmentId: 'fragment-1', branchIndex: 0 }])
  expect(graph.edges[2].sequenceBranches).toEqual([{ fragmentId: 'fragment-1', branchIndex: 1 }])
  expect(graph.edges[3].sequenceBranches).toBeUndefined()
})

it('supports nested alternative fragments', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nalt Account exists\nalt Password valid\nA->>B: Success\nelse Password invalid\nA->>B: Denied\nend\nelse Account missing\nA->>B: Unknown\nend')
  expect(errors).toEqual([])
  expect(graph.sequence?.fragments?.[1].parentId).toBe('fragment-1')
  expect(graph.edges[1].sequenceBranches).toEqual([{ fragmentId: 'fragment-1', branchIndex: 0 }, { fragmentId: 'fragment-2', branchIndex: 1 }])
})

it.each(['else No condition', 'end', 'alt Missing end\nA->>B: Hello'])('reports unmatched %s at its source line', source => {
  const { errors } = parseDiagram(`sequenceDiagram\n${source}`)
  expect(errors).toHaveLength(1)
  expect(errors[0].line).toBe(2)
})
