import { useEditing } from '../editing/EditingContext'
import { editableNode } from '../editing/EditableNode'
import { absolutePositions } from '../editing/manualLayout'
import { dragPreview } from '../editing/dragPreview'
import { CanvasEditingTools } from '../../../components/CanvasEditingTools'
import { useEffect, useMemo, useState } from 'react'
import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow, useReactFlow, type NodeTypes, type EdgeTypes } from '@xyflow/react'
import type { FlowNode, FlowEdge, LayoutDiagram } from '../layout/flowTypes'
import { DiagramNode } from './nodes/DiagramNode'
import { RectangleNode } from './nodes/RectangleNode'
import { RoundedNode } from './nodes/RoundedNode'
import { DiamondNode } from './nodes/DiamondNode'
import { DatabaseNode } from './nodes/DatabaseNode'
import { C4Node } from './nodes/C4Node'
import { GroupNode } from './nodes/GroupNode'
import { SequenceFrameNode } from './nodes/SequenceFrameNode'
import { isDecoration } from './isDecoration'
import { SequenceDecorationNode } from './nodes/SequenceDecorationNode'
import { EntityNode } from './nodes/EntityNode'
import { LifelineNode } from './nodes/LifelineNode'
import { DiagramEdge } from './edges/DiagramEdge'
import { useNodeHighlight } from '../hooks/useNodeHighlight'

const nodeTypes = { stadium: editableNode(DiagramNode), circle: editableNode(DiagramNode), doubleCircle: editableNode(DiagramNode), hexagon: editableNode(DiagramNode), parallelogram: editableNode(DiagramNode), trapezoid: editableNode(DiagramNode), subroutine: editableNode(DiagramNode), sequenceNote: SequenceDecorationNode, activation: SequenceDecorationNode, sequenceBox: SequenceDecorationNode, entity: editableNode(EntityNode), sequenceFrame: SequenceFrameNode, c4: editableNode(C4Node), rectangle: editableNode(RectangleNode), rounded: editableNode(RoundedNode), diamond: editableNode(DiamondNode), database: editableNode(DatabaseNode), group: GroupNode, lifeline: LifelineNode } satisfies NodeTypes
const EMPTY_POSITIONS = {}
const edgeTypes = { diagram: DiagramEdge } satisfies EdgeTypes

export function DiagramCanvas({ layout: baseLayout, revision, expanded, activeMessageId }: { layout: LayoutDiagram; revision: number; expanded: boolean; activeMessageId: string | null }) {
  const editing = useEditing()!
  const [dragSession, setDragSession] = useState<{ revision: number; positions: Record<string, { x: number; y: number }> } | null>(null)
  const dragPositions = dragSession?.revision === editing.documentRevision ? dragSession.positions : EMPTY_POSITIONS
  const layout = useMemo(() => dragPreview(baseLayout, dragPositions), [baseLayout, dragPositions])
  const suspended = Boolean(editing.target || editing.dragging || editing.connecting || editing.inspecting)
  const { fitView } = useReactFlow<FlowNode, FlowEdge>()
  const visibleEdges = useMemo(() => layout.edges.filter(edge => edge.data?.flow?.line !== 'invisible'), [layout.edges])
  const { hoveredNodeId, enterNode, leaveNode, nodeIds, edgeIds } = useNodeHighlight(visibleEdges)
  // Hover always wins: playback must not activate unrelated messages while hovering.
  const playbackEdge = !suspended && !hoveredNodeId ? layout.edges.find(edge => edge.id === activeMessageId) : undefined
  const focusedNodeIds = useMemo(() => playbackEdge ? new Set([playbackEdge.source, playbackEdge.target]) : nodeIds, [playbackEdge, nodeIds])
  const focusedEdgeIds = useMemo(() => playbackEdge ? new Set([playbackEdge.id]) : edgeIds, [playbackEdge, edgeIds])
  const hasFocus = !suspended && Boolean((hoveredNodeId && layout.nodes.some(node => node.id === hoveredNodeId)) || playbackEdge)
  const nodes = useMemo(() => {
    const visibleContexts = new Set(focusedNodeIds)
    const byId = new Map(layout.nodes.map(node => [node.id, node]))
    for (const id of focusedNodeIds) {
      let parent = byId.get(id)?.parentId
      while (parent) { visibleContexts.add(parent); parent = byId.get(parent)?.parentId }
    }
    return layout.nodes.map(node => ({
      ...node, draggable: !editing.disabled && !isDecoration(node), data: {
        ...node.data,
        highlighted: hasFocus && (node.data.sequenceNote?.participantIds ?? [node.data.participantId ?? node.id]).some(id => visibleContexts.has(id)),
        hovered: hasFocus && (hoveredNodeId === node.id || playbackEdge?.source === node.id),
        dimmed: hasFocus && node.type !== 'group' && node.type !== 'sequenceFrame' && node.type !== 'sequenceBox' && !(node.data.sequenceNote?.participantIds ?? [node.data.participantId ?? node.id]).some(id => focusedNodeIds.has(id)),
      },
    }))
  }, [layout.nodes, hoveredNodeId, hasFocus, focusedNodeIds, playbackEdge, editing.disabled])
  const hoveredData = layout.nodes.find(node => node.id === (hoveredNodeId ?? playbackEdge?.source))?.data
  const hoverTheme = useMemo(() => hoveredData?.style?.stroke ? { accent: hoveredData.style.stroke, border: hoveredData.style.stroke, surface: hoveredData.style.fill ?? '#fffefa', glow: `color-mix(in srgb, ${hoveredData.style.stroke} 35%, transparent)` } : hoveredData?.theme, [hoveredData])
  const edges = useMemo(() => layout.edges.map(edge => ({
    ...edge,
    ...(edge.markerStart ? { markerStart: { type: MarkerType.ArrowClosed, width: 11, height: 11, color: hasFocus && !focusedEdgeIds.has(edge.id) ? '#cfd2ca' : hasFocus && focusedEdgeIds.has(edge.id) ? hoverTheme?.accent ?? '#657c6d' : layout.theme === 'dark' ? '#a5b5b0' : '#737c79' } } : {}),
    markerEnd: edge.data?.er || (edge.data?.flow && edge.data.flow.endMarker !== 'arrow') ? undefined : { type: MarkerType.ArrowClosed, width: 11, height: 11, color: hasFocus && !focusedEdgeIds.has(edge.id) ? '#cfd2ca' : hasFocus && focusedEdgeIds.has(edge.id) ? hoverTheme?.accent ?? '#657c6d' : layout.theme === 'dark' ? '#a5b5b0' : '#737c79' },
    data: { ...edge.data!, theme: hoverTheme, active: hasFocus && focusedEdgeIds.has(edge.id), dimmed: hasFocus && !focusedEdgeIds.has(edge.id), playback: playbackEdge?.id === edge.id },
  })), [layout.edges, hoverTheme, hasFocus, focusedEdgeIds, playbackEdge, layout.theme])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.18, duration: 300, minZoom: 0.03, maxZoom: 1 })
    })
    return () => cancelAnimationFrame(frame)
  }, [fitView, revision, expanded])

  return <ReactFlow<FlowNode, FlowEdge>
    nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
    fitView minZoom={0.03} maxZoom={2} nodesDraggable={!editing.disabled} nodesConnectable={!editing.disabled}
    elementsSelectable={false} connectOnClick={false} zoomOnDoubleClick={false} className={`diagram-flow ${editing.connecting ? 'is-connecting' : ''}`}
    onNodeMouseEnter={(_, node) => { if (!suspended && !isDecoration(node)) enterNode(node.id) }}
    onNodeMouseLeave={(_, node) => { if (!isDecoration(node)) leaveNode(node.id) }}
    onNodesChange={changes => { for (const change of changes) if (change.type === 'position' && change.position && change.dragging) setDragSession(previous => previous?.revision === editing.documentRevision ? { ...previous, positions: { ...previous.positions, [change.id]: change.position! } } : previous) }}
    onNodeDragStart={(_, node) => { setDragSession({ revision: editing.documentRevision, positions: {} }); editing.setDragging(true); editing.select(node.id); editing.close() }}
    onNodeDragStop={(_, node) => {
      const parent = node.parentId ? absolutePositions(baseLayout.nodes)[node.parentId] : { x: 0, y: 0 }
      if (dragSession) editing.move(node.id, { x: parent.x + node.position.x, y: parent.y + node.position.y }, dragSession.revision)
      setDragSession(null); editing.setDragging(false)
    }}
    onNodeClick={(_, node) => {
      if (!isDecoration(node)) editing.select(node.id)
      else if (['group', 'sequenceFrame', 'sequenceBox'].includes(node.type!)) { editing.select(node.data.sequenceFrame?.fragmentId ?? node.id.replace(/^:box:/, '')); editing.inspect?.() }
    }}
    onNodeDoubleClick={(_, node) => {
      if (isDecoration(node) && node.type !== 'sequenceNote') {
        if (['group', 'sequenceFrame', 'sequenceBox'].includes(node.type!)) { editing.select(node.data.sequenceFrame?.fragmentId ?? node.id.replace(/^:box:/, '')); editing.inspect?.() }
        return
      }
      const position = absolutePositions(layout.nodes)[node.id]
      editing.open({ kind: node.type === 'sequenceNote' ? 'noteLabel' : 'nodeLabel', id: node.data.sequenceNote?.id ?? node.id, label: node.data.label, anchor: { x: position.x, y: position.y + Number(node.style?.height) + 10 } })
    }}
    onEdgeDoubleClick={(_, edge) => {
      const rawLabel = edge.data?.sourceLabel ?? ''
      editing.open({ kind: 'edgeLabel', id: edge.id, label: rawLabel, anchor: edge.data?.labelPosition ?? edge.data?.points[0] ?? { x: 0, y: 0 } })
    }}
    onPaneClick={() => { editing.select(null); editing.close() }}
    onConnectStart={() => editing.setConnecting(true)} onConnectEnd={() => editing.setConnecting(false)}
    onConnect={connection => { if (editing.connecting) editing.apply({ kind: 'connect', source: connection.source, target: connection.target }); editing.setConnecting(false) }}
    aria-label="Interactive diagram preview"
  >
    <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={layout.theme === 'dark' ? '#3a4545' : '#cdd2c7'} />
    <CanvasEditingTools layout={baseLayout} />
    <Controls showInteractive={false} position="bottom-left" />
  </ReactFlow>
}
