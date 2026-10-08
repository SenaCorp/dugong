import { describe, expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

const parse = (text: string) => parseDiagram(`flowchart LR\n${text}`)

describe('flowchart parser', () => {
  it.each(['LR', 'RL', 'TD', 'BT'] as const)('parses %s direction', (direction) => {
    expect(parseDiagram(`flowchart ${direction}\nA --> B`).graph.direction).toBe(direction)
  })
  it.each([
    ['A[User]', 'User', 'rectangle'], ['A(API Gateway)', 'API Gateway', 'rounded'],
    ['A{Approved?}', 'Approved?', 'diamond'], ['A[(PostgreSQL)]', 'PostgreSQL', 'database'],
  ])('parses %s', (source, label, shape) => {
    expect(parse(source).graph.nodes).toEqual([{ id: 'A', label, shape }])
  })
  it('creates explicit and inline nodes', () => {
    const { graph, errors } = parse('A[Mobile] --> B[Gateway]\nC(Service)')
    expect(errors).toEqual([])
    expect(graph.nodes.map(n => n.label)).toEqual(['Mobile', 'Gateway', 'Service'])
  })
  it('creates implicit nodes without duplicate definitions', () => {
    const { graph } = parse('A --> B\nB --> C\nA[User]\nA --> C')
    expect(graph.nodes).toEqual([
      { id: 'A', label: 'User', shape: 'rectangle' },
      { id: 'B', label: 'B', shape: 'rectangle' },
      { id: 'C', label: 'C', shape: 'rectangle' },
    ])
  })
  it('latest explicit definition overrides earlier ones, references do not', () => {
    const { graph } = parse('A[First]\nA{Latest}\nA --> B')
    expect(graph.nodes[0]).toEqual({ id: 'A', label: 'Latest', shape: 'diamond' })
  })
  it('parses normal edges and labeled edges', () => {
    const { graph } = parse('A --> B\nB -->|HTTP POST| C')
    expect(graph.edges).toEqual([
      { id: 'A-B', source: 'A', target: 'B', label: undefined },
      { id: 'B-C', source: 'B', target: 'C', label: 'HTTP POST' },
    ])
  })
  it('ignores comments and blank lines, tolerates whitespace and CRLF', () => {
    const { graph, errors } = parseDiagram('  flowchart   TD\r\n\r\n %% comment\r\n A [ User ]   --> | request | B ( API ) ')
    expect(errors).toEqual([])
    expect(graph.nodes.map(n => n.label)).toEqual(['User', 'API'])
    expect(graph.edges[0].label).toBe('request')
  })
  it('supports edges without spaces and hyphenated IDs', () => {
    const { graph, errors } = parse('user-app[User]-->api[API]')
    expect(errors).toEqual([])
    expect(graph.edges[0].source).toBe('user-app')
  })
  it('preserves valid lines and reports malformed lines with original line numbers', () => {
    const { graph, errors } = parse('A[User]\nA -->> B\nB --> C\nD[Missing\nE -->|broken F')
    expect(errors.map(e => e.line)).toEqual([3, 5, 6])
    expect(errors[0].source).toBe('A -->> B')
    expect(graph.nodes.map(n => n.id)).toEqual(['A', 'B', 'C'])
    expect(graph.edges).toHaveLength(1)
  })
  it('does not add partial nodes from a malformed edge', () => {
    expect(parse('A[User] --> B[Broken').graph.nodes).toEqual([])
  })
  it('reports missing and invalid direction', () => {
    expect(parseDiagram('A --> B').errors[0].message).toMatch('Start with')
    expect(parseDiagram('flowchart XX').errors.some(e => e.message.includes('Use flowchart'))).toBe(true)
  })
  it('generates distinct IDs for parallel edges', () => {
    expect(parse('A --> B\nA -->|Retry| B').graph.edges.map(e => e.id)).toEqual(['A-B', 'A-B-2'])
  })
  it('supports quoted labels containing closing brackets', () => {
    expect(parse('A["User [admin]"]').graph.nodes[0].label).toBe('User [admin]')
  })
  it('rejects syntax outside the documented subset', () => {
    expect(parse('subgraph X\nA --- B\nA --> B --> C').errors).toHaveLength(2)
  })
})
it('keeps IDs unique when node names look like repeated edge IDs', () => {
  const { graph } = parse('A --> B\nA --> B\nA --> B-2\nA-B --> C\nA --> B-C')
  expect(new Set(graph.edges.map(edge => edge.id)).size).toBe(graph.edges.length)
})
