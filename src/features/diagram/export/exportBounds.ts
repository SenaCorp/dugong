import type { LayoutDiagram, Point } from '../layout/flowTypes'

export function exportBounds(layout: LayoutDiagram, padding = 48) {
  const nodes = new Map(layout.nodes.map(node => [node.id, node]))
  const positions = new Map<string, Point>()
  function position(id: string): Point {
    const cached = positions.get(id)
    if (cached) return cached
    const node = nodes.get(id)!
    const parent = node.parentId ? position(node.parentId) : { x: 0, y: 0 }
    const result = { x: parent.x + node.position.x, y: parent.y + node.position.y }
    positions.set(id, result)
    return result
  }
  const points: Point[] = []
  for (const node of layout.nodes) {
    const origin = position(node.id)
    points.push(origin, { x: origin.x + Number(node.style?.width ?? node.measured?.width ?? 190), y: origin.y + Number(node.style?.height ?? node.measured?.height ?? 82) })
  }
  for (const edge of layout.edges) {
    if (edge.data?.flow?.line === 'invisible') continue
    points.push(...edge.data?.points ?? [])
    if (edge.label && edge.data?.labelPosition) {
      const { x, y } = edge.data.labelPosition
      const halfWidth = Math.min(360, String(edge.label).length * 8 + 24) / 2
      points.push({ x: x - halfWidth, y: y - 24 }, { x: x + halfWidth, y: y + 24 })
    }
  }
  const left = Math.min(0, ...points.map(p => p.x)) - padding
  const top = Math.min(0, ...points.map(p => p.y)) - padding
  return { x: left, y: top, width: Math.ceil(Math.max(0, ...points.map(p => p.x)) - left + padding), height: Math.ceil(Math.max(0, ...points.map(p => p.y)) - top + padding) }
}

/** Limit raster memory while retaining the full diagram's aspect ratio. */
export function rasterSize(width: number, height: number) {
  const scale = Math.min(2, 8192 / width, 8192 / height, Math.sqrt(16_000_000 / (width * height)))
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) }
}
