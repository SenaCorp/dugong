import { nodeSize } from './nodeSize'
import ELK, { type ELK as LayoutEngine, type ElkNode, type ElkPort } from 'elkjs/lib/elk-api'
import workerUrl from 'elkjs/lib/elk-worker.min.js?url'
import { MarkerType } from '@xyflow/react'
import type { DiagramDirection, DiagramGraph, DiagramNode } from '../types/diagram'
import type { FlowNode, LayoutDiagram, LayoutPort, Point } from './flowTypes'
import { placeLabels } from './placeLabels'
import { getGroupThemes } from '../renderer/groupThemes'
import { perimeterPort } from '../renderer/nodeGeometry'
import { applyDiagramTheme } from '../renderer/diagramTheme'
import { layoutSequence } from './sequenceLayout'

const directions = { LR: 'RIGHT', RL: 'LEFT', TD: 'DOWN', BT: 'UP' } as const
const sides: Record<DiagramDirection, { source: LayoutPort['side']; target: LayoutPort['side'] }> = {
  LR: { source: 'EAST', target: 'WEST' }, RL: { source: 'WEST', target: 'EAST' },
  TD: { source: 'SOUTH', target: 'NORTH' }, BT: { source: 'NORTH', target: 'SOUTH' },
}
let engine: LayoutEngine | undefined


export function buildElkGraph(graph: DiagramGraph): ElkNode {
  const labelCounts = new Map<string, number>()
  const displayLabel = (edge: DiagramGraph['edges'][number]) => edge.flow?.line === 'invisible' ? undefined : edge.technology ? `${edge.label} · ${edge.technology}` : edge.label
  for (const edge of graph.edges) if (displayLabel(edge)) labelCounts.set(displayLabel(edge)!, (labelCounts.get(displayLabel(edge)!) ?? 0) + 1)
  const ports = new Map<string, ElkPort[]>()
  graph.nodes.forEach(n => ports.set(n.id, []))
  for (const edge of graph.edges) {
    ports.get(edge.source)?.push({ id: `:port:${edge.id}:out`, width: 0, height: 0, layoutOptions: { 'elk.port.side': sides[graph.direction].source } })
    ports.get(edge.target)?.push({ id: `:port:${edge.id}:in`, width: 0, height: 0, layoutOptions: { 'elk.port.side': sides[graph.direction].target } })
  }
  const groups = graph.groups ?? []
  function children(parentId?: string): ElkNode[] {
    return [
      ...groups.filter(group => group.parentId === parentId).map(group => ({
        id: group.id, children: children(group.id),
        layoutOptions: {
          'elk.padding': `[top=${group.c4 ? group.c4.description ? 100 : 76 : 48},left=24,bottom=24,right=24]`,
          'elk.spacing.nodeNode': '42', 'elk.direction': directions[graph.direction],
        },
      })),
      ...graph.nodes.filter(node => node.parentId === parentId).map(node => ({
        id: node.id, ...nodeSize(node), ports: ports.get(node.id),
        layoutOptions: { 'elk.portConstraints': 'FIXED_SIDE', 'elk.spacing.portPort': '14' },
      })),
    ]
  }
  return {
    id: ':root',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': directions[graph.direction],
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN', 'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '64', 'elk.layered.spacing.nodeNodeBetweenLayers': '105',
      'elk.layered.spacing.edgeNodeBetweenLayers': '40',
      'elk.spacing.edgeEdge': '16', 'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
      'elk.layered.mergeEdges': 'false', 'elk.padding': '[top=24,left=24,bottom=24,right=24]',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: children(),
    edges: graph.edges.map(edge => ({
      id: `:edge:${edge.id}`, sources: [`:port:${edge.id}:out`], targets: [`:port:${edge.id}:in`],
      ...(displayLabel(edge) && labelCounts.get(displayLabel(edge)!) === 1 ? { labels: [{ text: displayLabel(edge), width: Math.min(320, displayLabel(edge)!.length * 6.4 + 20), height: 22,
        layoutOptions: { 'elk.edgeLabels.placement': 'TAIL' },
      }] } : {}),
    })),
  }
}

interface PlacedNode { node: ElkNode; absolute: Point }
function collectPositions(layout: ElkNode): Map<string, PlacedNode> {
  const placed = new Map<string, PlacedNode>()
  function visit(node: ElkNode, origin: Point) {
    const absolute = { x: origin.x + (node.x ?? 0), y: origin.y + (node.y ?? 0) }
    placed.set(node.id, { node, absolute })
    for (const child of node.children ?? []) visit(child, absolute)
  }
  visit(layout, { x: 0, y: 0 })
  return placed
}

function positionedPorts(model: DiagramNode, placed: ElkNode): LayoutPort[] {
  return (placed.ports ?? []).map(port => {
    const side = (port.layoutOptions?.['elk.port.side'] ?? 'EAST') as LayoutPort['side']
    const { x, y } = perimeterPort(model.shape, placed.width!, placed.height!, { x: port.x ?? 0, y: port.y ?? 0 }, side)
    return { id: port.id, x, y, type: port.id.endsWith(':out') ? 'source' : 'target', side }
  })
}

export function toFlowDiagram(graph: DiagramGraph, layout: ElkNode): LayoutDiagram {
  const positions = collectPositions(layout)
  const themes = getGroupThemes((graph.groups ?? []).map(group => group.id))
  const elementThemes = getGroupThemes(graph.c4 || graph.er ? graph.nodes.map(node => node.id) : [])
  const routedEdges = new Map(layout.edges?.map(edge => [edge.id, edge]))
  const groupNodes: FlowNode[] = (graph.groups ?? []).map(group => {
    const placed = positions.get(group.id)!.node
    return {
      id: group.id, type: 'group', position: { x: placed.x ?? 0, y: placed.y ?? 0 },
      ...(group.parentId ? { parentId: group.parentId } : {}),
      width: placed.width, height: placed.height, style: { width: placed.width, height: placed.height }, zIndex: -1, selectable: false,
      data: { style: group.style, c4Group: group.c4, label: group.label, shape: 'group', ports: [], theme: themes.get(group.id), memberCount: graph.nodes.filter(n => n.parentId === group.id).length },
    }
  })
  const nodes: FlowNode[] = graph.nodes.map(model => {
    const placed = positions.get(model.id)?.node
    if (!placed || placed.x === undefined || placed.y === undefined) throw new Error(`Layout did not position node ${model.id}.`)
    return {
      id: model.id, type: model.er ? 'entity' : model.c4 ? 'c4' : model.shape, position: { x: placed.x, y: placed.y },
      ...(model.parentId ? { parentId: model.parentId } : {}),
      width: placed.width, height: placed.height, style: { width: placed.width, height: placed.height }, zIndex: 2,
      data: { style: model.style, er: model.er, c4: model.c4, label: model.label, shape: model.shape, theme: model.parentId ? themes.get(model.parentId) : elementThemes.get(model.id), ports: positionedPorts(model, placed) },
    }
  })
  const flowNodes = new Map(nodes.map(node => [node.id, node]))
  const diagram: LayoutDiagram = {
    ...(graph.c4 ? { kind: 'c4' as const, c4Type: graph.c4.type, title: graph.c4.title } : {}),
    ...(graph.er ? { kind: 'er' as const } : {}),
    nodes: [...groupNodes, ...nodes],
    edges: graph.edges.map(edge => {
      const routed = routedEdges.get(`:edge:${edge.id}`)
      const section = routed?.sections?.[0]
      if (!section) throw new Error(`Layout did not route edge ${edge.id}.`)
      const container = positions.get(routed?.container ?? ':root')?.absolute ?? { x: 0, y: 0 }
      const from = flowNodes.get(edge.source)!, to = flowNodes.get(edge.target)!
      const fromOrigin = positions.get(edge.source)!.absolute, toOrigin = positions.get(edge.target)!.absolute
      const sourcePort = from.data.ports.find(port => port.id === `:port:${edge.id}:out`)!
      const targetPort = to.data.ports.find(port => port.id === `:port:${edge.id}:in`)!
      const label = routed?.labels?.[0]
      return {
        ...edge, label: edge.flow?.line === 'invisible' ? undefined : edge.technology ? `${edge.label} · ${edge.technology}` : edge.label, type: 'diagram', zIndex: 1,
        ...(edge.bidirectional || edge.flow?.startMarker === 'arrow' ? { markerStart: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: '#737c79' } } : {}),
        sourceHandle: `:port:${edge.id}:out`, targetHandle: `:port:${edge.id}:in`,
        ...(edge.er || (edge.flow && edge.flow.endMarker !== 'arrow') ? {} : { markerEnd: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: '#737c79' } }),
        data: {
          sourceLabel: graph.c4?.type === 'C4Dynamic' ? edge.label?.replace(/^\d+\.\s*/, '') : edge.label,
          flow: edge.flow,
          er: edge.er,
          points: [
            { x: fromOrigin.x + sourcePort.x, y: fromOrigin.y + sourcePort.y },
            ...(section.bendPoints ?? []).map(point => ({ x: point.x + container.x, y: point.y + container.y })),
            { x: toOrigin.x + targetPort.x, y: toOrigin.y + targetPort.y },
          ],
          labelPosition: label?.x !== undefined && label.y !== undefined
            ? { x: container.x + label.x + (label.width ?? 0) / 2, y: container.y + label.y + (label.height ?? 0) / 2 } : undefined,
        },
      }
    }),
  }
  diagram.edges = placeLabels(diagram.edges, graph.nodes.map(node => {
    const placed = positions.get(node.id)!
    return { ...placed.absolute, width: placed.node.width!, height: placed.node.height! }
  }))
  return diagram
}

async function layoutUnthemed(graph: DiagramGraph, providedEngine?: LayoutEngine): Promise<LayoutDiagram> {
  if (!graph.nodes.length) return { nodes: [], edges: [], ...(graph.sequence ? { kind: 'sequence' as const } : graph.c4 ? { kind: 'c4' as const, c4Type: graph.c4.type, title: graph.c4.title } : graph.er ? { kind: 'er' as const } : {}) }
  const elk = providedEngine ?? (engine ??= new ELK({ workerUrl, algorithms: ['layered'] }))
  if (graph.sequence) return layoutSequence(graph, elk)
  return toFlowDiagram(graph, await elk.layout(buildElkGraph(graph)))
}

export async function layoutDiagram(graph: DiagramGraph, providedEngine?: LayoutEngine): Promise<LayoutDiagram> {
  return applyDiagramTheme(await layoutUnthemed(graph, providedEngine), graph.theme)
}
