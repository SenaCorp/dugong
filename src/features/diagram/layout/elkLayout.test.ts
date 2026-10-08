import { describe, expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import { layoutDiagram } from './elkLayout'
import { parseDiagram } from '../parser/parseDiagram'
import { PREVIOUS_SAMPLE } from '../examples/defaultDiagram'

const engine = new ELK()
describe('ELK layout', () => {
  it.each(['LR', 'RL', 'TD', 'BT'] as const)('positions and routes %s', async direction => {
    const graph = parseDiagram(`flowchart ${direction}\nA[User] --> B(API)`).graph
    const { nodes, edges } = await layoutDiagram(graph, engine)
    const a = nodes[0].position, b = nodes[1].position
    if (direction === 'LR') expect(b.x).toBeGreaterThan(a.x)
    if (direction === 'RL') expect(b.x).toBeLessThan(a.x)
    if (direction === 'TD') expect(b.y).toBeGreaterThan(a.y)
    if (direction === 'BT') expect(b.y).toBeLessThan(a.y)
    expect(edges[0].data?.points.length).toBeGreaterThanOrEqual(2)
    expect(nodes[0].data.ports[0].id).toBe(edges[0].sourceHandle)
  })
  it('routes the sample orthogonally, with distinct ports and no routes through unrelated nodes', async () => {
    const graph = parseDiagram(PREVIOUS_SAMPLE).graph
    const { nodes, edges } = await layoutDiagram(graph, engine)
    expect(nodes).toHaveLength(6)
    expect(edges).toHaveLength(6)
    for (const edge of edges) {
      const points = edge.data!.points
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i]
        // ELK port offsets can differ from route coordinates by floating point rounding.
        const vertical = Math.abs(a.x - b.x) < 1e-6
        expect(vertical || Math.abs(a.y - b.y) < 1e-6).toBe(true)
        for (const node of nodes.filter(n => n.id !== edge.source && n.id !== edge.target)) {
          const left = node.position.x, right = left + Number(node.style!.width)
          const top = node.position.y, bottom = top + Number(node.style!.height)
          const crosses = vertical
            ? a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom
            : a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right
          expect(crosses).toBe(false)
        }
      }
    }
    const service = nodes.find(n => n.id === 'C')!
    expect(new Set(service.data.ports.map(p => `${p.x}:${p.y}`)).size).toBe(service.data.ports.length)
  })
  it('supports cycles, self loops and parallel labeled edges', async () => {
    const { graph } = parseDiagram('flowchart LR\nA --> B\nB --> A\nA --> A\nA -->|Again| B')
    const result = await layoutDiagram(graph, engine)
    expect(result.edges).toHaveLength(4)
    expect(result.edges.every(edge => edge.data?.points.length)).toBe(true)
  })
})
it('keeps diamond ports on its perimeter and routes directly to their positions', async () => {
  const graph = parseDiagram('flowchart LR\nA --> B{Approved?}\nB --> C\nB --> D').graph
  const { nodes, edges } = await layoutDiagram(graph, engine)
  const diamond = nodes.find(n => n.id === 'B')!
  const width = Number(diamond.style!.width), height = Number(diamond.style!.height)
  for (const port of diamond.data.ports) {
    expect(Math.abs(port.x - width / 2) / (width / 2) + Math.abs(port.y - height / 2) / (height / 2)).toBeCloseTo(1)
  }
  for (const edge of edges) {
    const source = nodes.find(n => n.id === edge.source)!
    const target = nodes.find(n => n.id === edge.target)!
    const sourcePort = source.data.ports.find(p => p.id === edge.sourceHandle)!
    const targetPort = target.data.ports.find(p => p.id === edge.targetHandle)!
    expect(edge.data!.points[0]).toEqual({ x: source.position.x + sourcePort.x, y: source.position.y + sourcePort.y })
    expect(edge.data!.points.at(-1)).toEqual({ x: target.position.x + targetPort.x, y: target.position.y + targetPort.y })
  }
})
it('accepts node IDs that could otherwise collide with ELK internals', async () => {
  const graph = parseDiagram('flowchart LR\ndiagram --> A\nA --> B\nA-B[Named like an edge]').graph
  expect((await layoutDiagram(graph, engine)).nodes).toHaveLength(4)
})
it('converts nested group routes to absolute canvas coordinates', async () => {
  const { graph, errors } = parseDiagram('flowchart LR\nsubgraph OUTER[Outer]\nsubgraph INNER[Inner]\nA[Client] --> B[API]\nend\nC[Service]\nend\nB --> C')
  expect(errors).toEqual([])
  const { nodes, edges } = await layoutDiagram(graph, engine)
  const byId = new Map(nodes.map(node => [node.id, node]))
  function absolute(id: string) {
    const node = byId.get(id)!
    let x = node.position.x, y = node.position.y, parentId = node.parentId
    while (parentId) {
      const parent = byId.get(parentId)!
      x += parent.position.x; y += parent.position.y; parentId = parent.parentId
    }
    return { x, y }
  }
  for (const edge of edges) {
    const source = byId.get(edge.source)!, port = source.data.ports.find(port => port.id === edge.sourceHandle)!
    const origin = absolute(source.id)
    expect(edge.data!.points[0]).toEqual({ x: origin.x + port.x, y: origin.y + port.y })
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) expect(points[i].x === points[i - 1].x || points[i].y === points[i - 1].y).toBe(true)
  }
})
it('lays out 100 nodes and 200 edges without invalid geometry', async () => {
  const graph = {
    direction: 'LR' as const,
    nodes: Array.from({ length: 100 }, (_, i) => ({ id: `N${i}`, label: `Service ${i}`, shape: 'rectangle' as const })),
    edges: Array.from({ length: 200 }, (_, i) => ({ id: `E${i}`, source: `N${i % 99}`, target: `N${Math.min(99, i % 99 + (i < 100 ? 1 : 3))}` })),
  }
  const layout = await layoutDiagram(graph, engine)
  expect(layout.nodes).toHaveLength(100)
  expect(layout.edges).toHaveLength(200)
  expect(layout.edges.every(e => e.data!.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true)
}, 10000)
