import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import source from '../../../../samples/orders-er.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'

it('renders the ER example as five native tables with orthogonal routes and cardinalities', async () => {
  const { graph, errors } = parseDiagram(source)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.kind).toBe('er')
  expect(layout.nodes).toHaveLength(5)
  expect(layout.nodes.every(node => node.type === 'entity')).toBe(true)
  expect(layout.nodes.every(node => node.data.er?.attributes.length && Number(node.style?.height) >= 200)).toBe(true)
  for (const edge of layout.edges) {
    expect(edge.markerEnd).toBeUndefined()
    expect(edge.data?.er).toEqual(graph.edges.find(model => model.id === edge.id)?.er)
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]
      const vertical = Math.abs(a.x - b.x) < 1e-6
      expect(vertical || Math.abs(a.y - b.y) < 1e-6).toBe(true)
      for (const node of layout.nodes.filter(node => node.id !== edge.source && node.id !== edge.target)) {
        const { x, y } = node.position, width = Number(node.style?.width), height = Number(node.style?.height)
        const crosses = vertical
          ? a.x > x && a.x < x + width && Math.max(a.y, b.y) > y && Math.min(a.y, b.y) < y + height
          : a.y > y && a.y < y + height && Math.max(a.x, b.x) > x && Math.min(a.x, b.x) < x + width
        expect(crosses, `Relationship ${edge.id} intersects ${node.id}`).toBe(false)
      }
    }
  }
})
