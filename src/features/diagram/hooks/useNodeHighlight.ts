import { useEffect, useMemo, useState } from 'react'
import type { DiagramEdge } from '../types/diagram'

type Connection = Pick<DiagramEdge, 'id' | 'source' | 'target'>

export function getDirectConnections(nodeId: string | null, edges: Connection[]) {
  const nodeIds = new Set<string>()
  const edgeIds = new Set<string>()
  if (nodeId) {
    nodeIds.add(nodeId)
    for (const edge of edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgeIds.add(edge.id)
        nodeIds.add(edge.source)
        nodeIds.add(edge.target)
      }
    }
  }
  return { nodeIds, edgeIds }
}

export function createHoverInteraction(onChange: (id: string | null) => void) {
  let activeId: string | null = null
  let leaveTimer: ReturnType<typeof setTimeout> | undefined
  const cancelLeave = () => { clearTimeout(leaveTimer); leaveTimer = undefined }
  return {
    enter(id: string) {
      cancelLeave()
      if (activeId === id) return
      activeId = id
      onChange(id)
    },
    leave(id: string) {
      // React Flow also emits leave events for group backgrounds and old nodes.
      if (activeId !== id) return
      cancelLeave()
      leaveTimer = setTimeout(() => {
        leaveTimer = undefined
        activeId = null
        onChange(null)
      }, 70)
    },
    dispose: cancelLeave,
  }
}

export function useNodeHighlight(edges: Connection[]) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const hover = useMemo(() => createHoverInteraction(setHoveredNodeId), [setHoveredNodeId])
  useEffect(() => () => hover.dispose(), [hover])
  const connections = useMemo(() => getDirectConnections(hoveredNodeId, edges), [edges, hoveredNodeId])
  return { hoveredNodeId, enterNode: hover.enter, leaveNode: hover.leave, ...connections }
}
