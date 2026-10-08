import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import architectureSource from '../../../../diagram.md?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'
import { labelBounds, overlaps, type Bounds } from './placeLabels'

it('lays out the actual architecture with groups, all edges, and orthogonal paths', async () => {
  const { graph, errors } = parseDiagram(architectureSource)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.nodes.filter(n => n.type === 'group')).toHaveLength(8)
  expect(layout.nodes.filter(n => n.type !== 'group')).toHaveLength(19)
  const groups = layout.nodes.filter(node => node.type === 'group')
  expect(new Set(groups.map(node => node.data.theme?.accent)).size).toBe(8)
  for (const node of layout.nodes.filter(node => node.parentId)) {
    expect(node.data.theme).toEqual(layout.nodes.find(parent => parent.id === node.parentId)!.data.theme)
  }
  expect(layout.edges).toHaveLength(28)
  expect(layout.edges.filter(e => e.label === 'Private')).toHaveLength(12)
  const nodesById = new Map(layout.nodes.map(node => [node.id, node]))
  const leaves = layout.nodes.filter(node => node.type !== 'group')
  const leafBounds: Bounds[] = leaves.map(node => {
    let x = node.position.x, y = node.position.y, parentId = node.parentId
    while (parentId) {
      const parent = nodesById.get(parentId)!
      x += parent.position.x; y += parent.position.y; parentId = parent.parentId
    }
    return { x, y, width: Number(node.style!.width), height: Number(node.style!.height) }
  })
  const occupied = [...leafBounds]
  for (const edge of layout.edges.filter(edge => edge.label)) {
    expect(edge.data!.labelPosition).toBeDefined()
    const bounds = labelBounds(String(edge.label), edge.data!.labelPosition!)
    expect(occupied.some(other => overlaps(bounds, other))).toBe(false)
    occupied.push(bounds)
  }
  for (const edge of layout.edges) {
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) {
      expect(Math.abs(points[i].x - points[i - 1].x) < .01 || Math.abs(points[i].y - points[i - 1].y) < .01).toBe(true)
      const a = points[i - 1], b = points[i]
      for (let j = 0; j < leaves.length; j++) {
        if (leaves[j].id === edge.source || leaves[j].id === edge.target) continue
        const box = leafBounds[j]
        const crosses = Math.abs(a.x - b.x) < .01
          ? a.x > box.x && a.x < box.x + box.width && Math.max(a.y, b.y) > box.y && Math.min(a.y, b.y) < box.y + box.height
          : a.y > box.y && a.y < box.y + box.height && Math.max(a.x, b.x) > box.x && Math.min(a.x, b.x) < box.x + box.width
        expect(crosses, `${edge.id} must avoid ${leaves[j].id}`).toBe(false)
      }
    }
  }
})
