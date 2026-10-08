import { expect, it } from 'vitest'
import { perimeterPort } from './nodeGeometry'

it('projects circular side ports onto the circle instead of its rectangular bounds', () => {
  const point = perimeterPort('circle', 180, 180, { x: 180, y: 45 }, 'EAST')
  expect(Math.hypot(point.x - 90, point.y - 90)).toBeCloseTo(90)
  expect(point.y).toBe(45)
})
it('handles polygon boundaries in all four directions', () => {
  expect(perimeterPort('hexagon', 200, 100, { x: 0, y: 0 }, 'WEST').x).toBe(36)
  expect(perimeterPort('diamond', 200, 100, { x: 100, y: 0 }, 'NORTH').y).toBe(0)
  expect(perimeterPort('trapezoid', 200, 100, { x: 200, y: 50 }, 'EAST').x).toBe(182)
  expect(perimeterPort('parallelogram', 200, 100, { x: 20, y: 100 }, 'SOUTH').y).toBe(100)
})
it('keeps rectangular ports unchanged', () => {
  expect(perimeterPort('subroutine', 200, 100, { x: 200, y: 50 }, 'EAST')).toEqual({ x: 200, y: 50 })
})
