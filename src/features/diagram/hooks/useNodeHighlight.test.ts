import { afterEach, expect, it, vi } from 'vitest'
import { createHoverInteraction, getDirectConnections } from './useNodeHighlight'
const edges = [
  { id: 'a-b', source: 'A', target: 'B' }, { id: 'b-c', source: 'B', target: 'C' },
  { id: 'c-d', source: 'C', target: 'D' }, { id: 'b-e', source: 'B', target: 'E' },
  { id: 'e-f', source: 'E', target: 'F' },
]
it('highlights only incoming and outgoing direct neighbors, never recursively', () => {
  const result = getDirectConnections('B', edges)
  expect([...result.nodeIds].sort()).toEqual(['A', 'B', 'C', 'E'])
  expect([...result.edgeIds].sort()).toEqual(['a-b', 'b-c', 'b-e'])
})
it('restores normal graph state when no node is hovered', () => {
  expect(getDirectConnections(null, edges).nodeIds.size).toBe(0)
  expect(getDirectConnections(null, edges).edgeIds.size).toBe(0)
})
afterEach(() => vi.useRealTimers())
it('ignores stale leave events from groups and previously hovered nodes', () => {
  vi.useFakeTimers()
  const change = vi.fn()
  const hover = createHoverInteraction(change)
  hover.enter('A')
  hover.enter('B')
  hover.leave('A')
  hover.leave('GROUP')
  vi.runAllTimers()
  expect(change.mock.calls).toEqual([['A'], ['B']])
  hover.dispose()
})
it('keeps highlight through a brief leave and reentry without an off frame', () => {
  vi.useFakeTimers()
  const change = vi.fn()
  const hover = createHoverInteraction(change)
  hover.enter('A')
  hover.leave('A')
  vi.advanceTimersByTime(30)
  expect(change).toHaveBeenLastCalledWith('A')
  hover.enter('A')
  vi.runAllTimers()
  expect(change.mock.calls.every(([id]) => id === 'A')).toBe(true)
  hover.dispose()
})
it('switches nodes immediately and cancels the previous pending reset', () => {
  vi.useFakeTimers()
  const change = vi.fn()
  const hover = createHoverInteraction(change)
  hover.enter('A')
  hover.leave('A')
  hover.enter('B')
  expect(change).toHaveBeenLastCalledWith('B')
  vi.runAllTimers()
  expect(change.mock.calls).toEqual([['A'], ['B']])
  hover.dispose()
})
it('clears a real exit after a short grace period and cleans up timers', () => {
  vi.useFakeTimers()
  const change = vi.fn()
  const hover = createHoverInteraction(change)
  hover.enter('A')
  hover.leave('A')
  vi.advanceTimersByTime(100)
  expect(change).toHaveBeenLastCalledWith(null)
  hover.enter('B')
  hover.leave('B')
  hover.dispose()
  vi.runAllTimers()
  expect(change).toHaveBeenLastCalledWith('B')
})
