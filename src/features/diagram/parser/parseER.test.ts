import { expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

it('parses tables, attributes, compound keys and relationship metadata', () => {
  const { graph, errors } = parseDiagram('erDiagram\nCUSTOMER {\n uuid id PK\n string email UK "Contact address"\n}\nORDER {\n uuid id PK\n uuid customer_id FK, UK\n decimal(10,2) amount\n}\nCUSTOMER ||--o{ ORDER : places')
  expect(errors).toEqual([])
  expect(graph.er).toBe(true)
  expect(graph.nodes[1].er?.attributes[1].keys).toEqual(['FK', 'UK'])
  expect(graph.nodes[0].er?.attributes[1].comment).toBe('Contact address')
  expect(graph.edges[0].er).toEqual({ sourceCardinality: 'one', targetCardinality: 'zero-or-many', identifying: true })
})
it.each(['LR', 'RL', 'TB', 'BT'])('supports ER direction %s and implicit entities', direction => {
  const { graph, errors } = parseDiagram(`erDiagram\ndirection ${direction}\nA |o..|{ B : "may own"`)
  expect(errors).toEqual([])
  expect(graph.direction).toBe(direction === 'TB' ? 'TD' : direction)
  expect(graph.nodes).toHaveLength(2)
  expect(graph.edges[0]).toMatchObject({ label: 'may own', er: { sourceCardinality: 'zero-or-one', targetCardinality: 'one-or-many', identifying: false } })
})
it('keeps implicit attributes when an entity is explicitly defined later, and supports aliases', () => {
  const result = parseDiagram('erDiagram\nUSER ||--o{ SESSION : owns\nUSER[Accounts] {\n uuid id PK\n}\nSESSION')
  expect(result.errors).toEqual([])
  expect(result.graph.nodes).toHaveLength(2)
  expect(result.graph.nodes[0]).toMatchObject({ label: 'Accounts', er: { attributes: [{ type: 'uuid', name: 'id', keys: ['PK'] }] } })
})
it('supports quoted entity names, nullable/array types and PK shorthand', () => {
  const result = parseDiagram('%% schema\nerDiagram\n"User Account" {\n uuid *id\n string[]? roles\n}\n"User Account" ||--o| SESSION : creates')
  expect(result.errors).toEqual([])
  expect(result.graph.nodes[0].er?.attributes[0].keys).toEqual(['PK'])
  expect(result.graph.nodes[0].er?.attributes[1].type).toBe('string[]?')
})
it('collects useful diagnostics for malformed attributes, duplicate fields and unclosed blocks', () => {
  const result = parseDiagram('erDiagram\nUSER {\n uuid id PK\n uuid id\n string email INVALID\n broken\n')
  expect(result.errors.map(error => error.line).sort()).toEqual([2, 4, 5, 6])
  expect(result.graph.nodes[0].er?.attributes).toHaveLength(1)
})
it('rejects invalid cardinalities and trailing garbage without creating partial relations', () => {
  const result = parseDiagram('erDiagram\nA ||--xx B : wrong\nA ||--o{ B : valid\nA ||--o{ B garbage : wrong')
  expect(result.errors.map(error => error.line)).toEqual([2, 4])
  expect(result.graph.edges).toHaveLength(1)
})

it.each([
  ['||', 'one'], ['|o', 'zero-or-one'], ['}|', 'one-or-many'], ['}o', 'zero-or-many'],
])('accepts source cardinality %s with every target cardinality', (left, cardinality) => {
  for (const [right, targetCardinality] of [['||', 'one'], ['o|', 'zero-or-one'], ['|{', 'one-or-many'], ['o{', 'zero-or-many']]) {
    const { graph, errors } = parseDiagram(`erDiagram\nA ${left}--${right} B : connects`)
    expect(errors).toEqual([])
    expect(graph.edges[0].er).toMatchObject({ sourceCardinality: cardinality, targetCardinality })
  }
})
