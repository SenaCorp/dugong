import type { FlowNode, LayoutDiagram, LayoutPort, Point } from '../layout/flowTypes'
import { placeLabels, type Bounds } from '../layout/placeLabels'
import { isDecoration } from '../renderer/isDecoration'
import { moveSequence } from './moveSequence'
import { routeOrthogonal, segmentCrossesBox, simplifyRoute } from './orthogonalRouter'

export function absolutePositions(nodes: FlowNode[]): Record<string, Point> {
  const byId = new Map(nodes.map(node => [node.id, node])), positions: Record<string, Point> = {}
  const visit = (id: string): Point => {
    if (positions[id]) return positions[id]
    const node = byId.get(id)!, parent = node.parentId ? visit(node.parentId) : { x: 0, y: 0 }
    return positions[id] = { x: parent.x + node.position.x, y: parent.y + node.position.y }
  }
  nodes.forEach(node => visit(node.id))
  return positions
}
function lead(point: Point, port: LayoutPort, box: Bounds): Point {
  if (port.side === 'EAST') return { x: box.x + box.width + 26, y: point.y }
  if (port.side === 'WEST') return { x: box.x - 26, y: point.y }
  if (port.side === 'NORTH') return { x: point.x, y: box.y - 26 }
  return { x: point.x, y: box.y + box.height + 26 }
}
export function applyManualPositions(layout: LayoutDiagram, manual: Record<string, Point>): LayoutDiagram {
  if (!Object.keys(manual).length) return layout
  if (layout.kind === 'sequence') return moveSequence(layout, manual)
  const original = absolutePositions(layout.nodes)
  const absolute = { ...original }
  const leaves = layout.nodes.filter(node => !isDecoration(node))
  for (const node of leaves) if (manual[node.id]) absolute[node.id] = manual[node.id]
  const sizes = new Map(layout.nodes.map(node => [node.id, { width: Number(node.style?.width ?? 190), height: Number(node.style?.height ?? 82) }]))
  // Recompute nested boundaries around pinned children, then convert back to parent-relative positions.
  for (const group of [...layout.nodes].reverse().filter(node => node.type === 'group')) {
    const children = layout.nodes.filter(node => node.parentId === group.id)
    if (!children.length) continue
    const topPadding = group.data.c4Group ? group.data.c4Group.description ? 100 : 76 : 48
    const x = Math.min(...children.map(node => absolute[node.id].x)) - 24
    const y = Math.min(...children.map(node => absolute[node.id].y)) - topPadding
    const right = Math.max(...children.map(node => absolute[node.id].x + sizes.get(node.id)!.width)) + 24
    const bottom = Math.max(...children.map(node => absolute[node.id].y + sizes.get(node.id)!.height)) + 24
    absolute[group.id] = { x, y }; sizes.set(group.id, { width: right - x, height: bottom - y })
  }
  const nodes = layout.nodes.map(node => {
    const point = absolute[node.id], parent = node.parentId ? absolute[node.parentId] : { x: 0, y: 0 }
    return { ...node, ...sizes.get(node.id), position: { x: point.x - parent.x, y: point.y - parent.y }, style: { ...node.style, ...sizes.get(node.id) } }
  })
  const bounds = new Map(leaves.map(node => [node.id, { ...absolute[node.id], ...sizes.get(node.id)! }]))
  for (const [index, a] of leaves.entries()) for (const b of leaves.slice(index + 1)) {
    const first = bounds.get(a.id)!, second = bounds.get(b.id)!
    if (first.x < second.x + second.width && first.x + first.width > second.x && first.y < second.y + second.height && first.y + first.height > second.y) throw new Error('Nodes overlap at this position. Leave some space between them.')
  }
  const obstacles = [...bounds.values()], occupied: Point[][] = []
  const edges = layout.edges.map(edge => {
    if (!edge.data) return edge
    const oldPoints = edge.data.points
    const changed = [edge.source, edge.target].some(id => absolute[id].x !== original[id].x || absolute[id].y !== original[id].y)
    const blocked = oldPoints.some((point, index) => index > 0 && leaves.some(node => node.id !== edge.source && node.id !== edge.target && segmentCrossesBox(oldPoints[index - 1], point, bounds.get(node.id)!)))
    if (!changed && !blocked) { occupied.push(oldPoints); return edge }
    const from = leaves.find(node => node.id === edge.source)!, to = leaves.find(node => node.id === edge.target)!
    const sourcePort = from.data.ports.find(port => port.id === edge.sourceHandle)!, targetPort = to.data.ports.find(port => port.id === edge.targetHandle)!
    const a = { x: absolute[from.id].x + sourcePort.x, y: absolute[from.id].y + sourcePort.y }
    const b = { x: absolute[to.id].x + targetPort.x, y: absolute[to.id].y + targetPort.y }
    const first = lead(a, sourcePort, bounds.get(from.id)!), last = lead(b, targetPort, bounds.get(to.id)!)
    const route = simplifyRoute([a, ...routeOrthogonal(first, last, obstacles, occupied), b])
    occupied.push(route)
    return { ...edge, data: { ...edge.data, points: route, labelPosition: undefined } }
  })
  return { ...layout, nodes, edges: placeLabels(edges, obstacles) }
}
