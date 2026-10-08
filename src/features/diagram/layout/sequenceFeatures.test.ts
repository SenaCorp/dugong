import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import source from '../../../../samples/login-annotated.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'
import { sequencePlaybackPath } from '../hooks/sequencePlaybackPath'

it('lays out the annotated login sample with native notes, boxes, frames and activation bars', async () => {
  const { graph, errors } = parseDiagram(source)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.nodes.filter(node => node.type === 'sequenceBox')).toHaveLength(2)
  expect(layout.nodes.filter(node => node.type === 'sequenceNote')).toHaveLength(3)
  expect(layout.nodes.filter(node => node.type === 'activation')).toHaveLength(5)
  expect(layout.sequenceFragments?.map(frame => frame.kind)).toEqual(['alt', 'loop', 'opt'])
  const opt = graph.sequence!.fragments!.find(frame => frame.kind === 'opt')!
  const included = sequencePlaybackPath(graph.edges, {})
  const skipped = sequencePlaybackPath(graph.edges, { [opt.id]: 1 })
  expect(included.length - skipped.length).toBe(2)
  for (const note of layout.nodes.filter(node => node.type === 'sequenceNote')) {
    const top = note.position.y, bottom = top + Number(note.style?.height)
    expect(layout.edges.every(edge => edge.data!.points.every(point => point.y < top || point.y > bottom))).toBe(true)
  }
  const request = layout.edges.find(edge => typeof edge.label === 'string' && edge.label.includes('Find account'))!
  const dbBar = layout.nodes.find(node => node.type === 'activation' && node.data.participantId === 'DB')!
  expect(request.data!.points.at(-1)!.x).toBe(dbBar.position.x)
})
