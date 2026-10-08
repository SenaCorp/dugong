import { expect, it } from 'vitest'
import { editSource } from './editSource'
import { parseDiagram } from '../parser/parseDiagram'

it('edits C4 labels and multiline call arguments without touching technology/comments', () => {
  const source = 'C4Container\nContainer(api,\n  "Old", "Node.js", "Description") %% keep\nPerson(user, "User")\nRel(user, api, "Request", "HTTPS")'
  const updated = editSource(source, { kind: 'nodeLabel', id: 'api', label: 'Gateway "Public"' })
  expect(updated).toContain('"Node.js", "Description") %% keep')
  expect(parseDiagram(updated).graph.nodes[0].label).toBe('Gateway "Public"')
  const edge = editSource(updated, { kind: 'edgeLabel', id: 'c4-rel-1', label: 'Login' })
  expect(edge).toContain('Rel(user, api, "Login", "HTTPS")')
})
it('edits ER aliases without renaming entities or attributes', () => {
  const source = 'erDiagram\nUSER {\n int id PK\n}\nUSER ||--o{ SESSION : owns'
  const updated = editSource(source, { kind: 'nodeLabel', id: 'USER', label: 'Account' })
  const result = parseDiagram(updated)
  expect(result.errors).toEqual([])
  expect(result.graph.nodes[0].label).toBe('Account')
  expect(result.graph.nodes[0].er?.attributes[0].name).toBe('id')
  expect(updated).toContain('USER ||--o{ SESSION : owns')
  expect(editSource(updated, { kind: 'edgeLabel', id: 'er-1', label: 'has sessions' })).toContain(': "has sessions"')
})
it('edits participant, message and note wording while preserving alt/activation syntax', () => {
  const source = 'sequenceDiagram\nparticipant A as User\nparticipant B as API\nalt valid\nA->>+B: Login\nB-->>-A: OK\nelse wrong\nA->>B: Retry\nend\nNote over A,B: HTTPS'
  const participant = editSource(source, { kind: 'nodeLabel', id: 'A', label: 'Customer' })
  expect(participant).toContain('participant A as Customer')
  const message = editSource(participant, { kind: 'edgeLabel', id: 'sequence-1', label: 'Send\ncredentials' })
  expect(message).toContain('A->>+B: Send<br/>credentials')
  const note = editSource(message, { kind: 'noteLabel', id: 'sequence-note-1', label: 'Encrypted' })
  expect(note).toContain('Note over A,B: Encrypted')
  expect(parseDiagram(note).errors).toEqual([])
})
it('materializes implicit sequence participants before first messages', () => {
  const result = parseDiagram(editSource('sequenceDiagram\nA->>B: Login', { kind: 'nodeLabel', id: 'A', label: 'User' }))
  expect(result.graph.nodes.map(node => node.id)).toEqual(['A', 'B'])
  expect(result.graph.nodes[0].label).toBe('User')
})
it('matches messages with whitespace after activation signs exactly', () => {
  const source = 'sequenceDiagram\nA->>+ B: first\nB-->>- A: second'
  expect(editSource(source, { kind: 'edgeLabel', id: 'sequence-1', label: 'Login' })).toBe(source.replace(': first', ': Login'))
})
it('keeps participant order when materializing an implicit receiver after explicit participants', () => {
  const source = 'sequenceDiagram\nparticipant U as User\nB->>A: Login\nparticipant C as Later\nA->>D: Next'
  const result = parseDiagram(editSource(source, { kind: 'nodeLabel', id: 'A', label: 'API\nGateway' }))
  expect(result.graph.nodes.map(node => node.id)).toEqual(parseDiagram(source).graph.nodes.map(node => node.id))
  expect(result.graph.nodes.find(node => node.id === 'A')?.label).toBe('API\nGateway')
})
it('keeps comments between C4 arguments when patching a label', () => {
  const source = 'C4Container\nContainer(api, %% keep this\n  "Old", "Node.js", "Description")'
  expect(editSource(source, { kind: 'nodeLabel', id: 'api', label: 'Gateway' })).toBe(source.replace('"Old"', '"Gateway"'))
})
it('restores ER ID wording despite older explicit aliases', () => {
  const source = 'erDiagram\nUSER["Account"] {\n int id PK\n}\nUSER["Person"] ||--o{ SESSION : owns'
  const result = parseDiagram(editSource(source, { kind: 'nodeLabel', id: 'USER', label: 'USER' }))
  expect(result.errors).toEqual([])
  expect(result.graph.nodes[0].label).toBe('USER')
})
