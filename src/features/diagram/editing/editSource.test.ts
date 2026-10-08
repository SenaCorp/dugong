import { describe, expect, it } from 'vitest'
import { editSource } from './editSource'
import { parseDiagram } from '../parser/parseDiagram'

describe('visual source patches', () => {
  it('edits the effective inline definition without changing comments, shape or class', () => {
    const source = 'flowchart LR\n%% keep me\nA[Old]\n A(API):::svc --> B\nclassDef svc fill:#fff'
    const updated = editSource(source, { kind: 'nodeLabel', id: 'A', label: 'Gateway' })
    expect(updated).toBe(source.replace('A(API)', 'A("Gateway")'))
    expect(parseDiagram(updated).graph.nodes[0].label).toBe('Gateway')
  })
  it('materializes an implicit node without renaming its ID or connections', () => {
    const updated = editSource('flowchart LR\nA --> B', { kind: 'nodeLabel', id: 'B', label: 'API' })
    expect(updated).toContain('A --> B')
    expect(parseDiagram(updated).graph.nodes.find(node => node.id === 'B')?.label).toBe('API')
  })
  it('edits only the selected parallel edge', () => {
    const updated = editSource('flowchart LR\nA -->|first| B\nA -.->|second| B', { kind: 'edgeLabel', id: 'A-B-2', label: 'Private' })
    expect(updated).toContain('A -->|first| B')
    expect(updated).toContain('A -.->|Private| B')
  })
  it('rejects ambiguous multi-node expressions instead of editing unrelated relationships', () => {
    expect(() => editSource('flowchart LR\nA & C --> B', { kind: 'edgeLabel', id: 'A-B', label: 'HTTP' })).toThrow('multiple connections')
    expect(editSource('flowchart LR\nA --> B', { kind: 'edgeLabel', id: 'A-B', label: 'HTTP' })).toContain('A -->|HTTP| B')
  })
  it('changes shapes and colors without erasing labels or classes', () => {
    const source = 'flowchart LR\nA[API]:::svc\nclassDef svc stroke:#123'
    const shaped = editSource(source, { kind: 'shape', id: 'A', shape: 'hexagon' })
    expect(shaped).toContain('A{{"API"}}:::svc')
    expect(editSource(shaped, { kind: 'color', id: 'A', color: '#abc123' })).toContain('style A fill:#abc123')
  })
  it('adds a source connection and rejects malformed wording', () => {
    expect(parseDiagram(editSource('flowchart LR\nA\nB', { kind: 'connect', source: 'A', target: 'B' })).graph.edges).toHaveLength(1)
    expect(() => editSource('flowchart LR\nA --> B', { kind: 'edgeLabel', id: 'A-B', label: 'bad|label' })).toThrow()
    expect(() => editSource('flowchart LR\nA', { kind: 'nodeLabel', id: 'A', label: '' })).toThrow()
  })
})

it('preserves classic connector markers when editing only wording', () => {
  const updated = editSource('flowchart LR\nA -- calls --o B', { kind: 'edgeLabel', id: 'A-B', label: 'reads' })
  expect(updated).toBe('flowchart LR\nA -- reads --o B')
})
it('supports escaped quotes, multiline node labels and quoted shape delimiters', () => {
  const updated = editSource('flowchart LR\nA[/Input\\]', { kind: 'nodeLabel', id: 'A', label: 'Read /] "file"\nnext' })
  expect(parseDiagram(updated).graph.nodes[0].label).toBe('Read /] "file"\nnext')
  expect(parseDiagram(updated).graph.nodes[0].shape).toBe('trapezoid')
})
it('preserves CRLF and quoted labels in the exact edited node span', () => {
  const source = 'flowchart LR\r\n%% comment\r\n A[Old] --> B\r\n'
  expect(editSource(source, { kind: 'nodeLabel', id: 'A', label: 'New' })).toBe(source.replace('A[Old]', 'A["New"]'))
})
