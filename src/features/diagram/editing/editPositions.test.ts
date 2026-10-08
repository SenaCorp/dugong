import { expect, it } from 'vitest'
import { positionsForSourceEdit } from './editPositions'
import { parseDiagram } from '../parser/parseDiagram'
import { editSource } from './editSource'
import { commitHistory, createHistory, undoHistory } from './documentHistory'

it('releases pins for dimension-changing wording and restores the old arrangement on undo', () => {
  const source = 'flowchart LR\nA[Short]\nB[Short]', action = { kind: 'nodeLabel' as const, id: 'A', label: 'A much longer node name that must grow' }
  const updated = editSource(source, action), positions = { A: { x: 0, y: 0 }, B: { x: 210, y: 0 } }
  const next = positionsForSourceEdit(action, parseDiagram(source).graph, parseDiagram(updated).graph, positions)
  expect(next).toEqual({})
  const history = commitHistory(createHistory({ source, positions }), { source: updated, positions: next })
  expect(undoHistory(history).present).toEqual({ source, positions })
})
it('keeps placements for wording of the same size and fixed sequence participant cards', () => {
  const positions = { A: { x: 1, y: 2 } }
  const source = 'flowchart LR\nA[API]', action = { kind: 'nodeLabel' as const, id: 'A', label: 'Web' }
  expect(positionsForSourceEdit(action, parseDiagram(source).graph, parseDiagram(editSource(source, action)).graph, positions)).toEqual(positions)
  const sequence = 'sequenceDiagram\nparticipant A as Short'
  const longer = { ...action, label: 'A much longer participant name' }
  expect(positionsForSourceEdit(longer, parseDiagram(sequence).graph, parseDiagram(editSource(sequence, longer)).graph, positions)).toEqual(positions)
})
