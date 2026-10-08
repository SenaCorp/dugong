import type { Point } from '../../layout/flowTypes'

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

export function roundedRoute(points: Point[], radius = 9): string {
  const clean = points.filter((point, index) => index === 0 || distance(point, points[index - 1]) > 0.01)
  if (!clean.length) return ''
  let path = `M ${clean[0].x} ${clean[0].y}`
  for (let index = 1; index < clean.length - 1; index++) {
    const previous = clean[index - 1], corner = clean[index], next = clean[index + 1]
    const before = distance(previous, corner), after = distance(corner, next)
    const r = Math.min(radius, before / 2, after / 2)
    const start = { x: corner.x + (previous.x - corner.x) * r / before, y: corner.y + (previous.y - corner.y) * r / before }
    const end = { x: corner.x + (next.x - corner.x) * r / after, y: corner.y + (next.y - corner.y) * r / after }
    path += ` L ${start.x} ${start.y} Q ${corner.x} ${corner.y} ${end.x} ${end.y}`
  }
  const last = clean[clean.length - 1]
  return `${path} L ${last.x} ${last.y}`
}

export function routeMidpoint(points: Point[]): Point {
  let longest = -1
  let midpoint = points[0] ?? { x: 0, y: 0 }
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index]
    const length = distance(a, b)
    if (length > longest) { longest = length; midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
  }
  return midpoint
}
