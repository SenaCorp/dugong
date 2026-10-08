import type { Point } from '../layout/flowTypes'
import type { Bounds } from '../layout/placeLabels'

export function segmentCrossesBox(a: Point, b: Point, box: Bounds): boolean {
  const epsilon = 1e-5
  if (Math.abs(a.x - b.x) < epsilon) return a.x > box.x + epsilon && a.x < box.x + box.width - epsilon && Math.max(a.y, b.y) > box.y + epsilon && Math.min(a.y, b.y) < box.y + box.height - epsilon
  if (Math.abs(a.y - b.y) < epsilon) return a.y > box.y + epsilon && a.y < box.y + box.height - epsilon && Math.max(a.x, b.x) > box.x + epsilon && Math.min(a.x, b.x) < box.x + box.width - epsilon
  return true
}
interface Candidate { key: number; cost: number; score: number }
class Queue {
  private items: Candidate[] = []
  push(item: Candidate) {
    this.items.push(item)
    let index = this.items.length - 1
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2)
      if (this.items[parent].score <= item.score) break
      this.items[index] = this.items[parent]; index = parent
    }
    this.items[index] = item
  }
  pop(): Candidate | undefined {
    const first = this.items[0], last = this.items.pop()
    if (!this.items.length || !last) return first
    let index = 0
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1
      if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child++
      if (this.items[child].score >= last.score) break
      this.items[index] = this.items[child]; index = child
    }
    this.items[index] = last
    return first
  }
}
export function simplifyRoute(points: Point[]): Point[] {
  return points.filter((point, index) => {
    const previous = points[index - 1], next = points[index + 1]
    if (previous && point.x === previous.x && point.y === previous.y) return false
    return !previous || !next || !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y))
  })
}
/** A sparse orthogonal grid around obstacle boundaries, with a small penalty for bends. */
export function routeOrthogonal(start: Point, end: Point, obstacles: Bounds[], occupied: Point[][] = []): Point[] {
  const boxes = obstacles.map(box => ({ x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 }))
  const xs = [...new Set([start.x, end.x, ...boxes.flatMap(box => [box.x - 6, box.x + box.width + 6])])].sort((a, b) => a - b)
  const ys = [...new Set([start.y, end.y, ...boxes.flatMap(box => [box.y - 6, box.y + box.height + 6])])].sort((a, b) => a - b)
  const width = xs.length
  const point = (key: number) => { const cell = Math.floor(key / 3); return { x: xs[cell % width], y: ys[Math.floor(cell / width)] } }
  const startKey = (ys.indexOf(start.y) * width + xs.indexOf(start.x)) * 3
  const endCell = ys.indexOf(end.y) * width + xs.indexOf(end.x)
  const costs = new Map<number, number>([[startKey, 0]]), previous = new Map<number, number>()
  const queue = new Queue()
  queue.push({ key: startKey, cost: 0, score: 0 })
  let candidate: Candidate | undefined
  while ((candidate = queue.pop())) {
    if (candidate.cost !== costs.get(candidate.key)) continue
    const cell = Math.floor(candidate.key / 3), x = cell % width, y = Math.floor(cell / width)
    if (cell === endCell) {
      const route = [point(candidate.key)]
      let key = candidate.key
      while (previous.has(key)) { key = previous.get(key)!; route.push(point(key)) }
      return simplifyRoute(route.reverse())
    }
    const a = point(candidate.key)
    for (const [dx, dy, axis] of [[-1, 0, 1], [1, 0, 1], [0, -1, 2], [0, 1, 2]]) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= width || ny >= ys.length) continue
      const key = (ny * width + nx) * 3 + axis, b = point(key)
      if (boxes.some(box => segmentCrossesBox(a, b, box))) continue
      const shared = occupied.some(route => route.some((p, i) => {
        const q = route[i + 1]
        if (!q) return false
        return axis === 1 ? a.y === p.y && p.y === q.y && Math.min(a.x, b.x) < Math.max(p.x, q.x) && Math.max(a.x, b.x) > Math.min(p.x, q.x)
          : a.x === p.x && p.x === q.x && Math.min(a.y, b.y) < Math.max(p.y, q.y) && Math.max(a.y, b.y) > Math.min(p.y, q.y)
      }))
      const cost = candidate.cost + Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + (candidate.key % 3 && candidate.key % 3 !== axis ? 24 : 0) + (shared ? 30 : 0)
      if (cost >= (costs.get(key) ?? Infinity)) continue
      costs.set(key, cost); previous.set(key, candidate.key)
      queue.push({ key, cost, score: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y) })
    }
  }
  throw new Error('No clear route at this position. Move the node farther from its neighbors.')
}
