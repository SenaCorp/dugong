import { expect, it } from 'vitest'
import { roundedRoute, routeMidpoint } from './routePath'
it('rounds orthogonal bends and preserves start/end positions', () => {
  const path = roundedRoute([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }], 9)
  expect(path).toBe('M 0 0 L 91 0 Q 100 0 100 9 L 100 50')
})
it('limits corner radius for short segments and ignores duplicate points', () => {
  const path = roundedRoute([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 2 }])
  expect(path).not.toMatch(/NaN|Infinity/)
  expect(path).toContain('Q 4 0 4 1')
})
it('uses the longest route segment for fallback label positioning', () => {
  expect(routeMidpoint([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 20 }])).toEqual({ x: 50, y: 0 })
})
