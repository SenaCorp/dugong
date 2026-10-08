import { expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import sample from '../../../../samples/styled-flowchart.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'

it('preserves source styles, typed routes and marker choices through ELK', async () => {
  const { graph, errors } = parseDiagram(sample)
  expect(errors).toEqual([])
  const layout = await layoutDiagram(graph, new ELK())
  expect(layout.nodes).toHaveLength(8)
  expect(layout.edges).toHaveLength(10)
  for (const node of layout.nodes) expect(node.data.style).toEqual(graph.nodes.find(model => model.id === node.id)?.style)
  for (const edge of layout.edges) {
    expect(edge.data?.flow).toEqual(graph.edges.find(model => model.id === edge.id)?.flow)
    if (edge.data?.flow?.endMarker === 'none' || edge.data?.flow?.endMarker === 'circle' || edge.data?.flow?.endMarker === 'cross') expect(edge.markerEnd).toBeUndefined()
    if (edge.data?.flow?.startMarker === 'arrow') expect(edge.markerStart).toBeDefined()
    const points = edge.data!.points
    for (let i = 1; i < points.length; i++) expect(Math.abs(points[i].x - points[i - 1].x) < 1e-6 || Math.abs(points[i].y - points[i - 1].y) < 1e-6).toBe(true)
  }
})
