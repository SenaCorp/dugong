import { expect, it } from 'vitest'
import architectureSource from '../../../../diagram.md?raw'
import { parseDiagram } from './parseDiagram'
import { getDirectConnections } from '../hooks/useNodeHighlight'

it('parses the real diagram.md without losing groups or private connections', () => {
  const { graph, errors } = parseDiagram(architectureSource)
  expect(errors).toEqual([])
  expect(graph.nodes).toHaveLength(19)
  expect(graph.edges).toHaveLength(28)
  expect(graph.edges.filter(edge => edge.label === 'Private')).toHaveLength(12)
  expect(graph.edges.filter(edge => edge.target === 'ACCESS_SERVICE')).toHaveLength(2)
  expect(graph.nodes.find(node => node.id === 'PG')?.shape).toBe('database')
  expect(graph.groups).toHaveLength(8)
  const connections = getDirectConnections('SERVICE_CONSOLE', graph.edges)
  expect(connections.edgeIds.size).toBe(9)
  expect(graph.edges.filter(edge => edge.label === 'Private' && connections.edgeIds.has(edge.id))).toHaveLength(5)
  expect(connections.nodeIds.has('SERVICE_ENTERPRISE')).toBe(false)
  expect(connections.nodeIds.has('PORTAL_CONSOLE')).toBe(false)
})
