import { expect, it } from 'vitest'
import { exportBounds, rasterSize } from './exportBounds'
import type { LayoutDiagram } from '../layout/flowTypes'

it('includes absolute positions of grouped children and outlying routes', () => {
  const layout: LayoutDiagram = { nodes: [
    { id: 'g', type: 'group', position: { x: 100, y: 200 }, style: { width: 300, height: 200 }, data: { label: 'Group', shape: 'group', ports: [] } },
    { id: 'n', type: 'rectangle', parentId: 'g', position: { x: 250, y: 100 }, style: { width: 200, height: 80 }, data: { label: 'Node', shape: 'rectangle', ports: [] } },
  ], edges: [{ id: 'e', source: 'n', target: 'n', data: { points: [{ x: -100, y: -100 }, { x: 600, y: 450 }] } }] }
  expect(exportBounds(layout, 0)).toEqual({ x: -100, y: -100, width: 700, height: 550 })
})
it('reserves label space and ignores invisible constraints', () => {
  const layout: LayoutDiagram = { nodes: [], edges: [
    { id: 'e', source: 'a', target: 'b', label: 'Label', data: { points: [], labelPosition: { x: 100, y: 100 } } },
    { id: 'hidden', source: 'a', target: 'b', data: { points: [{ x: 5000, y: 5000 }], flow: { line: 'invisible', startMarker: 'none', endMarker: 'none' } } },
  ] }
  expect(exportBounds(layout, 0).width).toBe(132)
})
it('caps PNG dimensions and memory without cropping', () => {
  expect(rasterSize(300, 200)).toEqual({ width: 600, height: 400 })
  const result = rasterSize(20000, 10000)
  expect(result.width).toBeLessThanOrEqual(8192)
  expect(result.width * result.height).toBeLessThanOrEqual(16_000_000)
  expect(result.width / result.height).toBeCloseTo(2, 2)
})
