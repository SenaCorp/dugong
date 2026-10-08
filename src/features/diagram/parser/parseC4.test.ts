import { expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

it.each(['C4Context', 'C4Container', 'C4Component', 'C4Dynamic', 'C4Deployment'])('recognizes %s', type => {
  const result = parseDiagram(`${type}\nPerson(user, "User")\nSystem(api, "API")\nRel(user, api, "Uses")`)
  expect(result.errors).toEqual([])
  expect(result.graph.c4?.type).toBe(type)
})
it('preserves descriptions, technology, external status and quoted commas', () => {
  const result = parseDiagram('C4Container\ntitle Ordering Platform\nPerson_Ext(user, "Customer", "Places orders, tracks delivery")\nContainerDb(db, "Orders DB", "PostgreSQL", "Stores order data")\nRel(user, db, "Reads", "SQL")')
  expect(result.errors).toEqual([])
  expect(result.graph.c4?.title).toBe('Ordering Platform')
  expect(result.graph.nodes[0].c4).toMatchObject({ kind: 'person', external: true, description: 'Places orders, tracks delivery' })
  expect(result.graph.nodes[1]).toMatchObject({ shape: 'database', c4: { kind: 'database', level: 'container', technology: 'PostgreSQL' } })
  expect(result.graph.edges[0]).toMatchObject({ source: 'user', target: 'db', technology: 'SQL' })
})
it('supports nested system/container and deployment boundaries', () => {
  const result = parseDiagram('C4Deployment\nDeployment_Node(cloud, "Cloud", "AWS") {\nSystem_Boundary(platform, "Platform") {\nContainer(api, "API", "Node.js")\n}\n}\nSystem_Ext(provider, "Payments")\nRel(api, provider, "Calls")')
  expect(result.errors).toEqual([])
  expect(result.graph.groups).toHaveLength(2)
  expect(result.graph.groups![1].parentId).toBe('cloud')
  expect(result.graph.nodes[0].parentId).toBe('platform')
})
it('numbers dynamic relationships and preserves bidirectional/back relationships', () => {
  const result = parseDiagram('C4Dynamic\nContainer(a, "A", "React")\nContainer(b, "B", "Go")\nRelIndex(1, a, b, "Request")\nRel_Back(a, b, "Response")\nBiRel(a, b, "Sync")')
  expect(result.errors).toEqual([])
  expect(result.graph.edges.map(edge => edge.label)).toEqual(['1. Request', '2. Response', '3. Sync'])
  expect(result.graph.edges[1]).toMatchObject({ source: 'b', target: 'a' })
  expect(result.graph.edges[2].bidirectional).toBe(true)
})
it('handles multiline calls, escaped quotes and comments with original error lines', () => {
  const result = parseDiagram('%% note\nC4Context\nSystem(api,\n"API \\"Gateway\\"",\n"Handles requests")\nUnknown(api)')
  expect(result.graph.nodes[0].label).toBe('API "Gateway"')
  expect(result.errors[0].line).toBe(6)
})
it('rejects undefined aliases, duplicate IDs, unclosed boundaries and unsupported styling', () => {
  const result = parseDiagram('C4Context\nSystem(a, "A")\nSystem(a, "Duplicate")\nRel(a, missing, "Uses")\nUpdateElementStyle(a, "red")\nSystem_Boundary(b, "B") {')
  expect(result.errors.map(error => error.line).sort()).toEqual([3, 4, 5, 6])
  expect(result.graph.nodes).toHaveLength(1)
})

it.each(['SystemDb_Ext', 'SystemQueue', 'ContainerQueue_Ext', 'ComponentDb', 'ComponentQueue_Ext'])('recognizes %s variants', name => {
  const { graph, errors } = parseDiagram(`C4Component\n${name}(store, "Store", "Technology")`)
  expect(errors).toEqual([])
  expect(graph.nodes[0].c4?.kind).toBe(name.includes('Db') ? 'database' : 'queue')
  expect(graph.nodes[0].c4?.external).toBe(name.endsWith('_Ext'))
})

it.each(['System(a, "Name",)', 'System(a, "Name"', 'System(a, $label="Name")', 'PersonDb(a, "Name")', '}'])('reports malformed or unsupported %s without throwing', declaration => {
  const { errors } = parseDiagram(`C4Context\n${declaration}`)
  expect(errors.length).toBeGreaterThan(0)
  expect(errors[0].line).toBe(2)
})

it('preserves explicit line breaks and permits relationships before element declarations', () => {
  const result = parseDiagram('C4Context\nRel(a, b, "Uses")\nSystem(a, "Web<br/>Application")\nSystem(b, "API")')
  expect(result.errors).toEqual([])
  expect(result.graph.nodes[0].label).toBe('Web\nApplication')
})
