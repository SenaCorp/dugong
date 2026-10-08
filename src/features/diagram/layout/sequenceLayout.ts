import type { ELK } from 'elkjs/lib/elk-api'
import { MarkerType } from '@xyflow/react'
import type { DiagramGraph } from '../types/diagram'
import type { FlowEdge, FlowNode, LayoutDiagram } from './flowTypes'
import { getGroupThemes } from '../renderer/groupThemes'
import { sequenceDecorations } from './sequenceDecorations'
import { activationOffset } from './sequenceActivation'
import { sequenceNoteSize } from './sequenceNoteSize'
import { arrangeSequenceTimeline } from './sequenceTimeline'

const HEADER_HEIGHT = 82

export async function layoutSequence(graph: DiagramGraph, engine: ELK): Promise<LayoutDiagram> {
  const columnWidth = Math.max(260, ...graph.edges.map(edge => Math.min(580, (edge.label?.length ?? 0) * 7 + 80)))
  // A layout-only chain preserves participant order. It is never rendered as messages.
  const layout = await engine.layout({
    id: ':sequence',
    layoutOptions: {
      'elk.algorithm': 'layered', 'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': String(columnWidth - 190),
      'elk.layered.nodePlacement.strategy': 'SIMPLE', 'elk.padding': '[top=24,left=24,bottom=24,right=24]',
    },
    children: graph.nodes.map(node => ({ id: node.id, width: 190, height: HEADER_HEIGHT })),
    edges: graph.nodes.slice(1).map((node, index) => ({ id: `:column:${index}`, sources: [graph.nodes[index].id], targets: [node.id] })),
  })
  const placed = new Map(layout.children?.map(node => [node.id, node]))
  const themes = getGroupThemes(graph.nodes.map(node => node.id))
  const boxThemes = getGroupThemes((graph.sequence?.boxes ?? []).map(box => box.id))
  const hasBoxes = Boolean(graph.sequence?.boxes?.length)
  const participants: FlowNode[] = graph.nodes.map(node => {
    const position = placed.get(node.id)!
    return {
      id: node.id, type: 'rectangle', position: { x: position.x!, y: position.y! + (hasBoxes ? 38 : 0) },
      width: position.width, height: position.height, style: { width: position.width, height: position.height }, zIndex: 2,
      data: {
        label: node.label, shape: 'rectangle', theme: boxThemes.get(graph.sequence?.boxes?.find(box => box.participantIds.includes(node.id))?.id ?? '') ?? themes.get(node.id),
        participantKind: graph.sequence!.actorIds.includes(node.id) ? 'actor' : 'participant',
        ports: [
          { id: `:sequence:${node.id}:out`, x: 95, y: HEADER_HEIGHT, type: 'source', side: 'SOUTH' },
          { id: `:sequence:${node.id}:in`, x: 95, y: HEADER_HEIGHT, type: 'target', side: 'SOUTH' },
        ],
      },
    }
  })
  const headerBottom = Math.max(...participants.map(node => node.position.y + HEADER_HEIGHT))
  const firstMessageY = headerBottom + 60
  const participantCenters = new Map(participants.map(node => [node.id, node.position.x + 95]))
  const timeline = arrangeSequenceTimeline(graph.edges.length, firstMessageY, graph.sequence?.fragments ?? [], graph.sequence?.notes ?? [],
    note => sequenceNoteSize(note, note.participantIds.map(id => participantCenters.get(id)!)).height)
  const timelineBottom = timeline.bottom
  const byId = new Map(participants.map(node => [node.id, node]))
  const messageLabel = (index: number) => graph.sequence?.autonumber ? `${index + 1}. ${graph.edges[index].label}` : graph.edges[index].label ?? ''
  const labelWidth = (index: number) => Math.min(360, messageLabel(index).length * 7 + 24)
  const decorations = sequenceDecorations(graph, participants, timeline)
  const noteNodes = decorations.filter(node => node.type === 'sequenceNote')
  const maxDepth = Math.max(0, ...timeline.frames.map(frame => frame.depth))
  const left = Math.min(...participants.map(node => node.position.x), ...noteNodes.map(node => node.position.x)) - 24
  const right = Math.max(
    ...participants.map(node => node.position.x + 190 + 24),
    ...noteNodes.map(node => node.position.x + Number(node.style?.width) + 24),
    ...graph.edges.flatMap((edge, index) => edge.source === edge.target ? [byId.get(edge.source)!.position.x + 95 + (activationOffset(graph.sequence?.activations ?? [], edge.source, index, edge.sequenceBranches) ?? 0) + 5 + 65 + 16 + labelWidth(index) + 24] : []),
  )
  const frames: FlowNode[] = timeline.frames.map(frame => {
    const inset = (maxDepth - frame.depth) * 14
    return {
      id: `:frame:${frame.fragment.id}`, type: 'sequenceFrame', position: { x: left - inset, y: frame.top },
      style: { width: right - left + inset * 2, height: frame.bottom - frame.top }, zIndex: -3 + frame.depth * .01, selectable: false,
      data: { label: frame.fragment.kind, shape: 'frame', ports: [], sequenceFrame: { fragmentId: frame.fragment.id, kind: frame.fragment.kind, branches: frame.branches } },
    }
  })
  const lifelines: FlowNode[] = participants.map(node => ({
    id: `:lifeline:${node.id}`, type: 'lifeline', position: { x: node.position.x + 94, y: node.position.y + HEADER_HEIGHT + 12 },
    style: { width: 2, height: timelineBottom - node.position.y - HEADER_HEIGHT - 12 }, zIndex: -1,
    data: { label: node.data.label, shape: 'lifeline', theme: node.data.theme, participantId: node.id, ports: [] },
  }))
  const edges: FlowEdge[] = graph.edges.map((edge, index) => {
    const from = byId.get(edge.source)!, to = byId.get(edge.target)!
    const sourceOffset = activationOffset(graph.sequence?.activations ?? [], edge.source, index, edge.sequenceBranches)
    const targetOffset = activationOffset(graph.sequence?.activations ?? [], edge.target, index, edge.sequenceBranches)
    const sign = to.position.x >= from.position.x ? 1 : -1
    const x1 = from.position.x + 95 + (sourceOffset !== undefined ? sourceOffset + sign * 5 : 0)
    const x2 = to.position.x + 95 + (targetOffset !== undefined ? targetOffset - (edge.source === edge.target ? -1 : sign) * 5 : 0)
    const y = timeline.rows[index]
    const selfCall = edge.source === edge.target
    return {
      ...edge, type: 'diagram', zIndex: 1,
      label: messageLabel(index),
      sourceHandle: `:sequence:${edge.source}:out`, targetHandle: `:sequence:${edge.target}:in`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: '#737c79' },
      data: {
        sourceLabel: edge.label, sequenceIndex: index, dashed: edge.dashed, sequenceBranches: edge.sequenceBranches,
        points: selfCall ? [{ x: x1, y }, { x: x1 + 65, y }, { x: x1 + 65, y: y + 28 }, { x: x1, y: y + 28 }] : [{ x: x1, y }, { x: x2, y }],
        labelPosition: selfCall ? { x: x1 + 65 + 16 + labelWidth(index) / 2, y: y + 14 } : { x: (x1 + x2) / 2, y: y - 17 },
      },
    }
  })
  return { kind: 'sequence', nodes: [...decorations, ...frames, ...lifelines, ...participants], edges, sequenceFragments: graph.sequence?.fragments }
}
