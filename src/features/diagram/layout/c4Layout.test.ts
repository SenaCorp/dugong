import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import { DIAGRAM_EXAMPLES } from '../examples/defaultDiagram'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'

it.each(DIAGRAM_EXAMPLES.filter(example => example.label.startsWith('C4')))('renders $label with native cards and orthogonal routes', async ({ source }) => {
  const { graph, errors } = parseDiagram(source)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.kind).toBe('c4')
  expect(layout.c4Type).toBe(graph.c4?.type)
  expect(layout.title).toBe(graph.c4?.title)
  expect(layout.nodes.filter(node => node.type === 'c4')).toHaveLength(graph.nodes.length)
  expect(layout.edges).toHaveLength(graph.edges.length)
  const byId = new Map(layout.nodes.map(node => [node.id, node]))
  const bounds = layout.nodes.filter(node => node.type === 'c4').map(node => {
    let { x, y } = node.position
    let parentId = node.parentId
    while (parentId) {
      const parent = byId.get(parentId)!
      x += parent.position.x; y += parent.position.y; parentId = parent.parentId
    }
    return { id: node.id, x, y, width: Number(node.style!.width), height: Number(node.style!.height) }
  })
  for (const node of graph.nodes) expect(layout.nodes.find(n => n.id === node.id)?.data.c4).toEqual(node.c4)
  for (const edge of layout.edges) {
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) {
      expect(Math.abs(points[i].x - points[i - 1].x) < 1e-6 || Math.abs(points[i].y - points[i - 1].y) < 1e-6).toBe(true)
      const a = points[i - 1], b = points[i]
      for (const node of bounds.filter(node => node.id !== edge.source && node.id !== edge.target)) {
        const vertical = Math.abs(a.x - b.x) < 1e-6
        const crosses = vertical
          ? a.x > node.x && a.x < node.x + node.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + node.height
          : a.y > node.y && a.y < node.y + node.height && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + node.width
        expect(crosses, `Route ${edge.id} intersects ${node.id}`).toBe(false)
      }
    }
    if (graph.edges.find(model => model.id === edge.id)?.bidirectional) expect(edge.markerStart).toBeDefined()
  }
}, 10000)
