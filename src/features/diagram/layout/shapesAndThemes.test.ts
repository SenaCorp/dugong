import { describe, expect, it } from 'vitest'
import ELK from 'elkjs/lib/elk.bundled'
import shapes from '../../../../samples/flowchart-shapes.mmd?raw'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from './elkLayout'

const engine = new ELK()
describe('shape gallery layout', () => {
  it.each(['LR', 'RL', 'TD', 'BT'])('routes all silhouettes orthogonally in %s', async direction => {
    const { graph, errors } = parseDiagram(shapes.replace('flowchart LR', `flowchart ${direction}`))
    expect(errors).toEqual([])
    const result = await layoutDiagram(graph, engine)
    expect(result.nodes.filter(node => node.type !== 'group')).toHaveLength(9)
    for (const edge of result.edges) {
      const points = edge.data!.points
      for (let index = 1; index < points.length; index++) {
        expect(Math.abs(points[index].x - points[index - 1].x) < 1e-6 || Math.abs(points[index].y - points[index - 1].y) < 1e-6).toBe(true)
      }
    }
    const circle = result.nodes.find(node => node.type === 'circle')!
    expect(circle.style?.width).toBe(circle.style?.height)
  })
  it('applies dark palettes while preserving source styles', async () => {
    const { graph } = parseDiagram(shapes.replace('theme: light', 'theme: dark'))
    const result = await layoutDiagram(graph, engine)
    expect(result.theme).toBe('dark')
    expect(result.nodes.every(node => node.data.theme?.surface.startsWith('#'))).toBe(true)
    expect(result.nodes.find(node => node.id === 'G')?.data.style?.fill).toBe('#edf7ef')
  })
})
