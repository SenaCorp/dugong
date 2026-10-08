import type { Edge, Node } from '@xyflow/react'
import type { C4DiagramType, C4Element, DiagramGroup, DiagramNode, DiagramNodeShape, DiagramStyle, FlowConnection, ERRelationship, SequenceBranchReference, SequenceFragment, SequenceNote } from '../types/diagram'
import type { GroupTheme } from '../renderer/groupThemes'

export interface Point { x: number; y: number }
export interface LayoutPort extends Point { id: string; side: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST'; type: 'source' | 'target' }
export type DiagramNodeData = {
  label: string
  c4?: C4Element
  c4Group?: DiagramGroup['c4']
  er?: DiagramNode['er']
  shape: DiagramNodeShape | 'group' | 'lifeline' | 'frame'
  sequenceFrame?: { fragmentId: string; kind: SequenceFragment['kind']; branches: { label: string; y: number }[] }
  sequenceNote?: SequenceNote
  boxColor?: string
  ports: LayoutPort[]
  style?: DiagramStyle
  highlighted?: boolean
  hovered?: boolean
  dimmed?: boolean
  memberCount?: number
  theme?: GroupTheme
  participantKind?: 'actor' | 'participant'
  participantId?: string
}
export type DiagramEdgeData = {
  sourceLabel?: string
  points: Point[]
  labelPosition?: Point
  active?: boolean
  dimmed?: boolean
  theme?: GroupTheme
  sequenceIndex?: number
  dashed?: boolean
  playback?: boolean
  sequenceBranches?: SequenceBranchReference[]
  er?: ERRelationship
  flow?: FlowConnection
}
export type FlowNode = Node<DiagramNodeData, DiagramNodeShape | 'group' | 'lifeline' | 'c4' | 'sequenceFrame' | 'entity' | 'sequenceNote' | 'activation' | 'sequenceBox'>
export type FlowEdge = Edge<DiagramEdgeData, 'diagram'>
export interface LayoutDiagram { theme?: 'light' | 'dark'; nodes: FlowNode[]; edges: FlowEdge[]; kind?: 'sequence' | 'c4' | 'er'; c4Type?: C4DiagramType; title?: string; sequenceFragments?: SequenceFragment[] }
