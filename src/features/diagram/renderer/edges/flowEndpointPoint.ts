import type { Point } from '../../layout/flowTypes'

export function flowEndpointPoint(points: Point[], side: 'start' | 'end'): Point {
  const ordered = side === 'start' ? points : [...points].reverse()
  const endpoint = ordered[0] ?? { x: 0, y: 0 }
  const neighbor = ordered.find(point => point.x !== endpoint.x || point.y !== endpoint.y)
  if (!neighbor) return endpoint
  const distance = Math.hypot(neighbor.x - endpoint.x, neighbor.y - endpoint.y)
  const offset = Math.min(6, distance / 2)
  return { x: endpoint.x + (neighbor.x - endpoint.x) / distance * offset, y: endpoint.y + (neighbor.y - endpoint.y) / distance * offset }
}

