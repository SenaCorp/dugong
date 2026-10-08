import { expect, it } from 'vitest'
import { activationOffset } from './sequenceActivation'

it('uses the deepest active bar in the current branch and excludes its end boundary', () => {
  const bars = [
    { participantId: 'A', start: 0, end: 3, depth: 0 },
    { participantId: 'A', start: 1, end: 2, depth: 1, sequenceBranches: [{ fragmentId: 'alt', branchIndex: 0 }] },
  ]
  expect(activationOffset(bars, 'A', 1, [{ fragmentId: 'alt', branchIndex: 0 }])).toBe(6)
  expect(activationOffset(bars, 'A', 1, [{ fragmentId: 'alt', branchIndex: 1 }])).toBe(0)
  expect(activationOffset(bars, 'A', 2)).toBe(0)
  expect(activationOffset(bars, 'A', 3)).toBeUndefined()
})
