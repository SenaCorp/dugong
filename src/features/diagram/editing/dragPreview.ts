import type { LayoutDiagram, Point } from '../layout/flowTypes'
import { moveSequence } from './moveSequence'
import { absolutePositions } from './manualLayout'

export function dragPreview(layout: LayoutDiagram, dragging: Record<string, Point>): LayoutDiagram {
  if (!Object.keys(dragging).length) return layout
  if (layout.kind === 'sequence') return moveSequence(layout, dragging, false)
  const nodes = layout.nodes.map(node => dragging[node.id] ? { ...node, position: { ...dragging[node.id], ...(layout.kind === 'sequence' ? { y: node.position.y } : {}) } } : node)
  const before = absolutePositions(layout.nodes), after = absolutePositions(nodes)
  const delta = (id: string) => ({ x: after[id].x - before[id].x, y: after[id].y - before[id].y })
  const edges = layout.edges.map(edge => {
    if (!edge.data || (!dragging[edge.source] && !dragging[edge.target])) return edge
    const a = delta(edge.source), b = delta(edge.target), previous = edge.data.points
    const first = { x: previous[0].x + a.x, y: previous[0].y + a.y }
    const last = { x: previous.at(-1)!.x + b.x, y: previous.at(-1)!.y + b.y }
    const points = edge.source === edge.target ? previous.map(point => ({ x: point.x + a.x, y: point.y + a.y }))
      : layout.kind === 'sequence' ? [first, last] : [first, { x: (first.x + last.x) / 2, y: first.y }, { x: (first.x + last.x) / 2, y: last.y }, last]
    return { ...edge, data: { ...edge.data, points, labelPosition: { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 - (layout.kind === 'sequence' ? 17 : 0) } } }
  })
  return { ...layout, nodes, edges }
}
