import { describe, expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

describe('architecture syntax', () => {
  it('expands both source and target lists into separate connections', () => {
    const { graph, errors } = parseDiagram('flowchart LR\nA & B -- Private --> C & D')
    expect(errors).toEqual([])
    expect(graph.edges.map(edge => [edge.source, edge.target, edge.label])).toEqual([
      ['A', 'C', 'Private'], ['A', 'D', 'Private'], ['B', 'C', 'Private'], ['B', 'D', 'Private'],
    ])
  })
  it('accepts longer arrows without consuming them as an ID', () => {
    const { graph, errors } = parseDiagram('flowchart LR\nHOST_SERVER--->NGINX_TRANSACTION')
    expect(errors).toEqual([])
    expect(graph.edges[0].source).toBe('HOST_SERVER')
  })
  it('preserves nested group membership, including earlier implicit references', () => {
    const { graph, errors } = parseDiagram('flowchart LR\nA --> B\nsubgraph OUTER[Outer]\nsubgraph INNER[Inner]\nB\nend\nend\nB[Service]')
    expect(errors).toEqual([])
    expect(graph.groups).toEqual([{ id: 'OUTER', label: 'Outer' }, { id: 'INNER', label: 'Inner', parentId: 'OUTER' }])
    expect(graph.nodes.find(node => node.id === 'B')).toMatchObject({ label: 'Service', parentId: 'INNER' })
  })
  it('resolves a group reference to its only leaf node', () => {
    const { graph, errors } = parseDiagram('flowchart LR\nA --> RE\nsubgraph RE[RE]\nRULE_ENGINE[Rule Engine]\nend')
    expect(errors).toEqual([])
    expect(graph.nodes).toHaveLength(2)
    expect(graph.edges[0].target).toBe('RULE_ENGINE')
  })
  it('reports ambiguous group connections instead of creating phantom nodes', () => {
    const { graph, errors } = parseDiagram('flowchart LR\nA --> GROUP\nsubgraph GROUP[Group]\nB\nC\nend')
    expect(errors[0]).toMatchObject({ line: 2, message: 'Group GROUP has 2 nodes. Connect to a specific node ID.' })
    expect(graph.nodes.some(node => node.id === 'GROUP')).toBe(false)
  })
  it('reports unclosed and unexpected group endings', () => {
    expect(parseDiagram('flowchart LR\nsubgraph G[Group]\nA').errors[0].line).toBe(2)
    expect(parseDiagram('flowchart LR\nend').errors[0].line).toBe(2)
  })
  it('skips frontmatter while preserving diagnostic line numbers', () => {
    const result = parseDiagram('---\nconfig:\n  layout: dagre\n---\nflowchart LR\nA -->> B')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].line).toBe(6)
  })
  it('reports unfinished frontmatter and group/node ID collisions', () => {
    expect(parseDiagram('---\nconfig:').errors.some(error => error.message.includes('Frontmatter'))).toBe(true)
    expect(parseDiagram('flowchart LR\nA[Node]\nsubgraph A[Group]\nend').errors.length).toBeGreaterThan(0)
  })
})
