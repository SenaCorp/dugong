import { describe, expect, it } from 'vitest'
import { editSource, type SourceEdit } from './editSource'
import { parseDiagram } from '../parser/parseDiagram'

function edit(source: string, action: SourceEdit) {
  const updated = editSource(source, action)
  const result = parseDiagram(updated)
  expect(result.errors).toEqual([])
  return { updated, ...result.graph }
}

describe('canvas element actions', () => {
  it('adds collision-free root nodes including group IDs', () => {
    const result = edit('flowchart LR\nsubgraph Node1[Group]\nNode2[Existing]\nend', { kind: 'addNode' })
    expect(result.nodes.map(node => node.id)).toEqual(['Node2', 'Node3'])
    expect(result.nodes[1].parentId).toBeUndefined()
  })
  it('duplicates a grouped shape and resolved style without its relationships', () => {
    const source = 'flowchart LR\n%% keep\nsubgraph G[Services]\nA(API):::blue --> B[DB]\nend\nclassDef blue fill:#abcdef,stroke:#123456'
    const result = edit(source, { kind: 'duplicateNode', id: 'A' })
    expect(result.nodes.find(node => node.id === 'A_copy')).toMatchObject({ label: 'API copy', parentId: 'G', shape: 'rounded', style: { fill: '#abcdef', stroke: '#123456' } })
    expect(result.edges).toHaveLength(1)
    expect(result.updated).toContain('%% keep')
  })
  it('deletes from expanded inline connections preserving survivors and class/style targets', () => {
    const source = 'flowchart LR\n%% keep\nA[Remove] & B[Keep] -->|call| C[(DB)]\nclassDef blue fill:#abcdef\nclass A,B blue\nstyle A,C stroke:#123456'
    const result = edit(source, { kind: 'deleteNode', id: 'A' })
    expect(result.nodes.map(node => node.id)).toEqual(['B', 'C'])
    expect(result.edges).toMatchObject([{ source: 'B', target: 'C', label: 'call' }])
    expect(result.updated).toContain('class B blue')
    expect(result.updated).toContain('style C stroke:#123456')
  })
  it('preserves isolated implicit neighbors and removes group-alias relationships', () => {
    const source = 'flowchart LR\nsubgraph G[Only]\nA[Delete]\nend\nG --> B\nA --> C'
    const result = edit(source, { kind: 'deleteNode', id: 'A' })
    expect(result.nodes.map(node => node.id).sort()).toEqual(['B', 'C'])
    expect(result.edges).toEqual([])
    expect(result.groups?.[0].id).toBe('G')
  })
  it('adds, duplicates and removes C4 elements preserving boundary and semantic metadata', () => {
    const source = 'C4Container\nContainer_Boundary(g, "Backend") {\nContainerDb(db, "Database", "PostgreSQL", "Stores records")\n}\nPerson(user, "User")\nRel(user, db, "Queries")'
    const copy = edit(source, { kind: 'duplicateNode', id: 'db' })
    expect(copy.nodes.find(node => node.id === 'db_copy')).toMatchObject({ parentId: 'g', c4: { kind: 'database', technology: 'PostgreSQL', description: 'Stores records' } })
    const removed = edit(copy.updated, { kind: 'deleteNode', id: 'db' })
    expect(removed.edges).toEqual([])
    expect(removed.nodes.map(node => node.id)).toEqual(['db_copy', 'user'])
    expect(edit(source, { kind: 'addNode' }).nodes.at(-1)?.c4?.level).toBe('container')
  })
  it('duplicates ER attributes and removes incident relationships without losing implicit neighbors', () => {
    const source = 'erDiagram\nUSER["Account"] {\n int id PK "primary"\n string email UK\n}\nUSER ||--o{ SESSION : owns'
    const copy = edit(source, { kind: 'duplicateNode', id: 'USER' })
    expect(copy.nodes.find(node => node.id === 'USER_copy')?.er).toEqual(copy.nodes.find(node => node.id === 'USER')?.er)
    const result = edit(copy.updated, { kind: 'deleteNode', id: 'USER' })
    expect(result.nodes.map(node => node.id).sort()).toEqual(['SESSION', 'USER_copy'])
    expect(result.edges).toEqual([])
  })
  it('duplicates sequence actors in their box and deletes messages/notes with valid activations', () => {
    const source = 'sequenceDiagram\nbox blue Clients\nactor U as User\nend\nparticipant API\nparticipant DB\nU->>+API: Login\nAPI->>DB: Query\nAPI-->>-U: Done\nNote over U,API: Secure'
    const copy = edit(source, { kind: 'duplicateNode', id: 'U' })
    expect(copy.sequence?.actorIds).toContain('U_copy')
    expect(copy.sequence?.boxes?.[0].participantIds).toEqual(['U', 'U_copy'])
    const result = edit(copy.updated, { kind: 'deleteNode', id: 'U' })
    expect(result.nodes.map(node => node.id)).toEqual(['U_copy', 'API', 'DB'])
    expect(result.edges).toHaveLength(1)
    expect(result.sequence?.notes ?? []).toEqual([])
    expect(result.sequence?.activations ?? []).toEqual([])
  })
  it('preserves CRLF and comments when editing source', () => {
    const source = 'flowchart TD\r\n%% keep\r\nA[Old]\r\nA --> B\r\n'
    const result = edit(source, { kind: 'deleteNode', id: 'A' })
    expect(result.updated).toContain('%% keep\r\n')
    expect(result.updated.replace(/\r\n/g, '')).not.toContain('\n')
  })
  it('rejects unknown elements without mutating source', () => {
    expect(() => editSource('flowchart LR\nA', { kind: 'deleteNode', id: 'missing' })).toThrow(/exist/)
  })
})
it('retains implicit neighbor membership when an inline grouped edge is removed', () => {
  const source = 'flowchart LR\nsubgraph G[Group]\nA[Delete] --> B\nend'
  const result = edit(source, { kind: 'deleteNode', id: 'A' })
  expect(result.nodes[0]).toMatchObject({ id: 'B' })
  expect(result.nodes[0].parentId).toBeUndefined()
})
it('preserves all C4 comments including parentheses in trailing comments', () => {
  const source = 'C4Container\nContainer(api, %% argument docs\n "API", "Go", "Description") %% keep (docs)\nPerson(user, "User")\nRel(user, api, "Calls") %% keep relation'
  const result = edit(source, { kind: 'deleteNode', id: 'api' })
  expect(result.updated).toContain('%% argument docs')
  expect(result.updated).toContain('%% keep (docs)')
  expect(result.updated).toContain('%% keep relation')
})
it('keeps implicit sequence survivor order without adding it to another participant box', () => {
  const source = 'sequenceDiagram\nA->>B: Login\nbox blue Backend\nparticipant C\nend\nC->>D: Query'
  const result = edit(source, { kind: 'deleteNode', id: 'A' })
  expect(result.nodes.map(node => node.id)).toEqual(['B', 'C', 'D'])
  expect(result.sequence?.boxes?.[0].participantIds).toEqual(['C'])
})
it('retains surviving ER aliases and flow classes defined on deleted connections', () => {
  const er = edit('erDiagram\nA ||--o{ B["Billing"] : owns\nB ||--o{ C : sends', { kind: 'deleteNode', id: 'A' })
  expect(er.nodes.find(node => node.id === 'B')?.label).toBe('Billing')
  const flow = edit('flowchart LR\nsubgraph G[Group]\nA[Delete] --> B:::red\nend\nB --> C\nclassDef red fill:#ff0000', { kind: 'deleteNode', id: 'A' })
  expect(flow.nodes.find(node => node.id === 'B')?.style?.fill).toBe('#ff0000')
  expect(flow.nodes.find(node => node.id === 'B')?.parentId).toBeUndefined()
  expect(flow.updated).toContain('class B red')
})
it('materializes nested singleton group aliases before duplicating their only child', () => {
  const result = edit('flowchart LR\nsubgraph Outer[Outer]\nsubgraph G[Only]\nA[API]\nend\nend\nG --> B\nOuter -.-> C', { kind: 'duplicateNode', id: 'A' })
  expect(result.edges.map(edge => [edge.source, edge.target])).toEqual([['A', 'B'], ['A', 'C']])
  expect(result.nodes.find(node => node.id === 'A_copy')?.parentId).toBe('G')
})
it('retains class inheritance for an orphan after deleting its last edge', () => {
  const result = edit('flowchart LR\nA --> B:::red\nclassDef red fill:#ff0000', { kind: 'deleteNode', id: 'A' })
  const changedClass = result.updated.replace('classDef red fill:#ff0000', 'classDef red fill:#00ff00')
  expect(parseDiagram(changedClass).graph.nodes.find(node => node.id === 'B')?.style?.fill).toBe('#00ff00')
})
