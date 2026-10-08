import { expect, it } from 'vitest'
import { createHistory, commitHistory, undoHistory, redoHistory } from './documentHistory'

it('restores source and positions together and discards redo after a new edit', () => {
  let history = createHistory({ source: 'A', positions: {} })
  history = commitHistory(history, { source: 'B', positions: { A: { x: 20, y: 30 } } })
  expect(undoHistory(history).present).toEqual({ source: 'A', positions: {} })
  expect(redoHistory(undoHistory(history)).present).toEqual(history.present)
  expect(commitHistory(undoHistory(history), { source: 'C', positions: {} }).future).toEqual([])
})
it('ignores duplicate snapshots and bounds memory', () => {
  let history = createHistory({ source: 'A', positions: {} })
  expect(commitHistory(history, history.present)).toBe(history)
  for (let i = 0; i < 150; i++) history = commitHistory(history, { source: String(i), positions: {} })
  expect(history.past).toHaveLength(100)
  expect(undoHistory(createHistory(history.present)).present).toEqual(history.present)
})
it('advances document versions even when undo restores matching source', () => {
  const initial = createHistory({ source: 'A', positions: {} })
  const edited = commitHistory(initial, { source: 'B', positions: {} })
  const undone = undoHistory(edited)
  expect(undone.present.source).toBe('A')
  expect(undone.version).toBeGreaterThan(edited.version)
  expect(redoHistory(undone).version).toBeGreaterThan(undone.version)
})
