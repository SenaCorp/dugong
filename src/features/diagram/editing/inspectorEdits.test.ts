import { expect, it } from 'vitest'
import { editSource } from './editSource'
import { parseDiagram } from '../parser/parseDiagram'
it('edits C4 technology and description preserving argument comments', () => {
  const source = 'C4Container\nContainer(api, %% comment\n "API", "Node.js", "Old") %% tail'
  const updated = editSource(source, { kind: 'nodeProperties', id: 'api', label: 'Gateway', technology: 'Go', description: 'Handles requests' })
  expect(parseDiagram(updated).graph.nodes[0]).toMatchObject({ label: 'Gateway', c4: { technology: 'Go', description: 'Handles requests' } })
  expect(updated).toContain('%% comment')
  expect(updated).toContain('%% tail')
})
it('adds omitted optional C4 arguments without losing the existing declaration', () => {
  const updated = editSource('C4Component\nComponent(api, "API")', { kind: 'nodeProperties', id: 'api', label: 'API', technology: 'Go', description: 'Calls DB' })
  expect(parseDiagram(updated).graph.nodes[0].c4).toMatchObject({ technology: 'Go', description: 'Calls DB' })
})
it('edits ER attributes and alias in one transaction while retaining block comments', () => {
  const source = 'erDiagram\nUSER {\n %% field docs\n int id PK\n}\nUSER ||--o{ SESSION : owns'
  const updated = editSource(source, { kind: 'erAttributes', id: 'USER', label: 'Account', attributes: [{ type: 'uuid', name: 'id', keys: ['PK'], comment: 'Identifier' }, { type: 'string', name: 'email', keys: ['UK'] }] })
  expect(parseDiagram(updated).errors).toEqual([])
  expect(parseDiagram(updated).graph.nodes[0]).toMatchObject({ label: 'Account', er: { attributes: [{ type: 'uuid', name: 'id', keys: ['PK'], comment: 'Identifier' }, { type: 'string', name: 'email', keys: ['UK'] }] } })
  expect(updated).toContain('%% field docs')
  expect(updated).toContain('USER ||--o{ SESSION : owns')
})
it('materializes ER attribute blocks for implicit tables and rejects duplicate attributes', () => {
  const source = 'erDiagram\nUSER ||--o{ SESSION : owns'
  const updated = editSource(source, { kind: 'erAttributes', id: 'SESSION', label: 'Sessions', attributes: [{ type: 'int', name: 'id', keys: ['PK'] }] })
  expect(parseDiagram(updated).graph.nodes.find(node => node.id === 'SESSION')?.er?.attributes).toHaveLength(1)
  expect(() => editSource(source, { kind: 'erAttributes', id: 'SESSION', label: 'Sessions', attributes: [{ type: 'int', name: 'id', keys: [] }, { type: 'int', name: 'id', keys: [] }] })).toThrow(/already/)
})
it('renames flow and C4 groups preserving nested structure and suffixes', () => {
  const source = 'flowchart LR\nsubgraph G[Old]:::blue\nA[User]\nend\nclassDef blue fill:#abcdef'
  const updated = editSource(source, { kind: 'groupLabel', id: 'G', label: 'Services' })
  expect(updated).toContain('subgraph G["Services"]:::blue')
  expect(parseDiagram(updated).graph.nodes[0].parentId).toBe('G')
  const c4 = editSource('C4Context\nSystem_Boundary(g, "Old") {\nSystem(api, "API")\n}', { kind: 'groupLabel', id: 'g', label: 'Backend' })
  expect(parseDiagram(c4).graph.groups?.[0].label).toBe('Backend')
})
it('edits nested sequence conditions by fragment and branch without confusing box end', () => {
  const source = 'sequenceDiagram\nbox blue Clients\nparticipant U\nend\nalt valid\nloop retry\nU->>API: Login\nend\nelse invalid\nAPI-->>U: Error\nend'
  const updated = editSource(source, { kind: 'fragmentLabel', id: 'fragment-1', branchIndex: 1, label: 'Password incorrect' })
  expect(updated).toBe(source.replace('else invalid', 'else Password incorrect'))
  expect(editSource(updated, { kind: 'groupLabel', id: 'sequence-box-1', label: 'Frontend' })).toContain('box blue Frontend')
})
it('rejects invalid inspector IDs and multiline conditions', () => {
  expect(() => editSource('sequenceDiagram\nalt ok\nA->>B: Hi\nend', { kind: 'fragmentLabel', id: 'fragment-1', branchIndex: 0, label: 'bad\nelse wrong' })).toThrow(/one line/)
  expect(() => editSource('C4Context\nSystem(api, "API")', { kind: 'nodeProperties', id: 'gone', label: 'Gone', description: 'x' })).toThrow(/exist/)
})
it('rejects attribute field injection instead of silently creating constraints', () => {
  expect(() => editSource('erDiagram\nA', { kind: 'erAttributes', id: 'A', label: 'A', attributes: [{ type: 'int', name: 'id PK', keys: [] }] })).toThrow(/name/)
})
it('rejects ambiguous color-leading names of uncolored sequence boxes', () => {
  const source = 'sequenceDiagram\nbox Clients\nparticipant U\nend'
  expect(() => editSource(source, { kind: 'groupLabel', id: 'sequence-box-1', label: 'blue Backend' })).toThrow(/color/)
  const colored = source.replace('box Clients', 'box blue Clients')
  expect(parseDiagram(editSource(colored, { kind: 'groupLabel', id: 'sequence-box-1', label: 'blue Backend' })).graph.sequence?.boxes?.[0].label).toBe('blue Backend')
})
