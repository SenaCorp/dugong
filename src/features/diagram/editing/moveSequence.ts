import type { FlowNode, FlowEdge, LayoutDiagram, Point } from '../layout/flowTypes'
import { isDecoration } from '../renderer/isDecoration'

export function moveSequence(layout: LayoutDiagram, positions: Record<string, Point>, validate = true): LayoutDiagram {
  const participants = layout.nodes.filter(node => !isDecoration(node))
  const delta = new Map(participants.map(node => [node.id, (positions[node.id]?.x ?? node.position.x) - node.position.x]))
  const movedParticipants = participants.map(node => ({ ...node, position: { x: node.position.x + delta.get(node.id)!, y: node.position.y } }))
  for (const [index, a] of movedParticipants.entries()) for (const b of movedParticipants.slice(index + 1)) {
    if (validate && b.position.x - a.position.x < 210) throw new Error('Keep at least 20px between sequence participant cards.')
  }
  const byId = new Map(movedParticipants.map(node => [node.id, node]))
  const original = new Map(participants.map(node => [node.id, node]))
  const nodes = layout.nodes.map(node => {
    if (byId.has(node.id)) return byId.get(node.id)!
    if (node.data.sequenceNote) {
      const note = node.data.sequenceNote
      const before = note.participantIds.map(id => original.get(id)!.position.x + 95)
      const after = note.participantIds.map(id => byId.get(id)!.position.x + 95)
      const shift = note.placement === 'over' ? Math.min(...after) - Math.min(...before) : after[0] - before[0]
      const spanDelta = note.placement === 'over' && after.length > 1 ? (Math.max(...after) - Math.min(...after)) - (Math.max(...before) - Math.min(...before)) : 0
      return { ...node, position: { ...node.position, x: node.position.x + shift }, style: { ...node.style, width: Math.max(Number(node.style?.width), Number(node.style?.width) + spanDelta) } }
    }
    if (node.data.participantId) return { ...node, position: { ...node.position, x: node.position.x + (delta.get(node.data.participantId) ?? 0) } }
    if (node.type === 'sequenceBox') {
      const members = participants.filter(participant => node.type === 'sequenceFrame' || (participant.position.x >= node.position.x && participant.position.x < node.position.x + Number(node.style?.width)))
      if (!members.length) return node
      const left = Math.min(...members.map(participant => byId.get(participant.id)!.position.x))
      const right = Math.max(...members.map(participant => byId.get(participant.id)!.position.x + 190))
      const oldLeft = Math.min(...members.map(participant => participant.position.x))
      const oldRight = Math.max(...members.map(participant => participant.position.x + 190))
      return { ...node, position: { ...node.position, x: node.position.x + left - oldLeft }, style: { ...node.style, width: Number(node.style?.width) + right - oldRight - left + oldLeft } }
    }
    return node
  })
  const edges = layout.edges.map(edge => {
    if (!edge.data) return edge
    const a = delta.get(edge.source) ?? 0, b = delta.get(edge.target) ?? 0
    const points = edge.data.points.map((point, index, route) => ({ ...point, x: point.x + (edge.source === edge.target || index === 0 ? a : index === route.length - 1 ? b : (a + b) / 2) }))
    const labelPosition = edge.data.labelPosition ? { ...edge.data.labelPosition, x: edge.data.labelPosition.x + (edge.source === edge.target ? a : (a + b) / 2) } : undefined
    return { ...edge, data: { ...edge.data, points, labelPosition } }
  })
  const extent = (items: FlowNode[], connections: FlowEdge[]) => {
    const cards = items.filter(node => !isDecoration(node)), notes = items.filter(node => node.type === 'sequenceNote')
    const left = Math.min(...cards.map(node => node.position.x), ...notes.map(node => node.position.x)) - 24
    const right = Math.max(...cards.map(node => node.position.x + 214), ...notes.map(node => node.position.x + Number(node.style?.width) + 24),
      ...connections.filter(edge => edge.source === edge.target && edge.data?.labelPosition).map(edge => edge.data!.labelPosition!.x + Math.min(360, String(edge.label ?? '').length * 7 + 24) / 2 + 24))
    return { left, right }
  }
  const before = extent(layout.nodes, layout.edges), after = extent(nodes, edges)
  const adjustedNodes = nodes.map(node => {
    if (node.type !== 'sequenceFrame') return node
    const dx = after.left - before.left
    return { ...node, position: { ...node.position, x: node.position.x + dx }, style: { ...node.style, width: Number(node.style?.width) + after.right - before.right - dx } }
  })
  return { ...layout, nodes: adjustedNodes, edges }
}
