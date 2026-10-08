import { expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

it('parses nested loop/opt frames and rejects else inside them', () => {
  const result = parseDiagram('sequenceDiagram\nloop Retry twice\nopt Cache enabled\nA->>B: Lookup\nend\nend')
  expect(result.errors).toEqual([])
  expect(result.graph.sequence?.fragments?.map(frame => frame.kind)).toEqual(['loop', 'opt'])
  expect(parseDiagram('sequenceDiagram\nloop Retry\nelse Wrong\nend').errors[0].line).toBe(3)
})
it('parses grouped participants and positional notes with branch context', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nbox Backend\nparticipant API\nparticipant DB\nend\nNote over API,DB: Private network<br/>Encrypted\nopt Remember me\nNote right of API: Store cookie\nAPI->>DB: Save\nend')
  expect(errors).toEqual([])
  expect(graph.sequence?.boxes?.[0]).toMatchObject({ label: 'Backend', participantIds: ['API', 'DB'] })
  expect(graph.sequence?.notes?.[0]).toMatchObject({ placement: 'over', participantIds: ['API', 'DB'], text: 'Private network\nEncrypted', before: 0 })
  expect(graph.sequence?.notes?.[1].sequenceBranches).toEqual([{ fragmentId: 'fragment-1', branchIndex: 0 }])
})
it('supports nested activation bars and shorthand message activation', () => {
  const { graph, errors } = parseDiagram('sequenceDiagram\nA->>+B: Start\nactivate B\nB->>B: Work\ndeactivate B\nB-->>-A: Done')
  expect(errors).toEqual([])
  expect(graph.sequence?.activations).toHaveLength(2)
  expect(graph.sequence?.activations?.map(bar => [bar.participantId, bar.start, bar.end, bar.depth])).toEqual([['B', 0, 3, 0], ['B', 1, 2, 1]])
})
it('reports unbalanced activations, boxes, invalid notes and malformed shorthand', () => {
  const result = parseDiagram('sequenceDiagram\ndeactivate A\nNote over A,B,C: Too many\nbox Backend\nparticipant A\nactivate A')
  expect(result.errors.map(error => error.line).sort()).toEqual([2, 3, 4, 6])
})
it('does not allow an activation to leak from one alternative into another', () => {
  const result = parseDiagram('sequenceDiagram\nalt Success\nactivate A\nA->>B: Work\nelse Failure\ndeactivate A\nend')
  expect(result.errors.some(error => error.line === 6)).toBe(true)
})
