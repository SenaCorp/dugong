import type { FlowEdge, Point } from './flowTypes'

export interface Bounds { x: number; y: number; width: number; height: number }
export function labelBounds(label: string, position: Point): Bounds {
  const width = Math.min(320, label.length * 6.4 + 20)
  return { x: position.x - width / 2, y: position.y - 11, width, height: 22 }
}
export function overlaps(a: Bounds, b: Bounds, gap = 4): boolean {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
}

// Labels are placed on ELK's routes; node positions and bend points stay untouched.
// Repeated labels must not introduce extra layout layers or cover one another.
export function placeLabels(edges: FlowEdge[], obstacles: Bounds[]): FlowEdge[] {
  const occupied: Bounds[] = [...obstacles]
  return edges.map(edge => {
    if (!edge.label || !edge.data) return edge
    const label = String(edge.label)
    const points = edge.data.points
    const candidates: { point: Point; penalty: number }[] = []
    if (edge.data.labelPosition) candidates.push({ point: edge.data.labelPosition, penalty: 0 })
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i]
      const horizontal = Math.abs(a.y - b.y) < .01
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      if (length < (horizontal ? label.length * 6.4 + 32 : 34)) continue
      for (const ratio of [.5, .25, .75, .1, .9]) candidates.push({
        point: { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio },
        penalty: (horizontal ? 0 : 30) + Math.abs(.5 - ratio) * 10,
      })
    }
    let best = candidates[0]?.point ?? points[0], bestScore = Infinity
    for (const candidate of candidates) {
      const box = labelBounds(label, candidate.point)
      let score = candidate.penalty + occupied.filter(rect => overlaps(box, rect)).length * 10000
      for (const other of edges) {
        if (other.id === edge.id) continue
        const route = other.data?.points ?? []
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1], b = route[i]
          if (overlaps(box, { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }, 0)) score += 10
        }
      }
      if (score < bestScore) { best = candidate.point; bestScore = score }
    }
    occupied.push(labelBounds(label, best))
    return { ...edge, data: { ...edge.data, labelPosition: best } }
  })
}
