import type { DiagramNodeShape } from '../types/diagram'
import type { LayoutPort, Point } from '../layout/flowTypes'

export function shapePolygon(shape: DiagramNodeShape): Point[] | undefined {
  const coordinates: Partial<Record<DiagramNodeShape, number[][]>> = {
    diamond: [[50, 0], [100, 50], [50, 100], [0, 50]],
    hexagon: [[18, 0], [82, 0], [100, 50], [82, 100], [18, 100], [0, 50]],
    parallelogram: [[18, 0], [100, 0], [82, 100], [0, 100]],
    trapezoid: [[18, 0], [82, 0], [100, 100], [0, 100]],
  }
  return coordinates[shape]?.map(([x, y]) => ({ x, y }))
}

/** Project rectangular ELK ports onto the outline, along the routed segment's axis. */
export function perimeterPort(shape: DiagramNodeShape, width: number, height: number, point: Point, side: LayoutPort['side']): Point {
  const horizontal = side === 'WEST' || side === 'EAST'
  const low = side === 'WEST' || side === 'NORTH'
  let intersections: number[] = []
  if (shape === 'circle' || shape === 'doubleCircle') {
    const offset = horizontal ? (point.y - height / 2) / (height / 2) : (point.x - width / 2) / (width / 2)
    const extent = (horizontal ? width : height) / 2
    const radius = extent * Math.sqrt(Math.max(0, 1 - offset * offset))
    intersections = [extent - radius, extent + radius]
  } else if (shape === 'stadium') {
    const radius = Math.min(width / 2, height / 2)
    if (horizontal) {
      const reach = Math.sqrt(Math.max(0, radius * radius - (point.y - height / 2) ** 2))
      intersections = [radius - reach, width - radius + reach]
    } else {
      const center = point.x < radius ? radius : point.x > width - radius ? width - radius : point.x
      const reach = Math.sqrt(Math.max(0, radius * radius - (point.x - center) ** 2))
      intersections = [height / 2 - reach, height / 2 + reach]
    }
  } else {
    const vertices = shapePolygon(shape)?.map(p => ({ x: p.x * width / 100, y: p.y * height / 100 }))
    if (vertices) vertices.forEach((a, index) => {
      const b = vertices[(index + 1) % vertices.length]
      const coordinate = horizontal ? point.y : point.x
      const start = horizontal ? a.y : a.x, end = horizontal ? b.y : b.x
      if (start === end || coordinate < Math.min(start, end) || coordinate > Math.max(start, end)) return
      const t = (coordinate - start) / (end - start)
      intersections.push(horizontal ? a.x + t * (b.x - a.x) : a.y + t * (b.y - a.y))
    })
  }
  if (!intersections.length) return point
  const value = low ? Math.min(...intersections) : Math.max(...intersections)
  return horizontal ? { x: value, y: point.y } : { x: point.x, y: value }
}
