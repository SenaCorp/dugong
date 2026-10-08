export type DiagramDirection = 'LR' | 'RL' | 'TD' | 'BT'
export type DiagramNodeShape = 'rectangle' | 'rounded' | 'diamond' | 'database' | 'stadium' | 'circle' | 'doubleCircle' | 'hexagon' | 'parallelogram' | 'trapezoid' | 'subroutine'
export const C4_TYPES = ['C4Context', 'C4Container', 'C4Component', 'C4Dynamic', 'C4Deployment'] as const
export type C4DiagramType = typeof C4_TYPES[number]
export interface C4Element {
  kind: 'person' | 'system' | 'container' | 'component' | 'database' | 'queue'
  level: 'person' | 'system' | 'container' | 'component'
  external: boolean
  technology?: string
  description?: string
}

export interface DiagramNode {
  id: string
  label: string
  shape: DiagramNodeShape
  parentId?: string
  c4?: C4Element
  er?: { attributes: ERAttribute[] }
  style?: DiagramStyle
}
export interface DiagramStyle { fill?: string; stroke?: string; color?: string; strokeWidth?: number; strokeDasharray?: string }
export interface FlowConnection { line: 'dashed' | 'solid' | 'dotted' | 'thick' | 'invisible'; startMarker: 'none' | 'arrow' | 'circle' | 'cross'; endMarker: 'none' | 'arrow' | 'circle' | 'cross' }
export type ERCardinality = 'one' | 'zero-or-one' | 'one-or-many' | 'zero-or-many'
export interface ERAttribute { type: string; name: string; keys: ('PK' | 'FK' | 'UK')[]; comment?: string }
export interface ERRelationship { sourceCardinality: ERCardinality; targetCardinality: ERCardinality; identifying: boolean }
export interface DiagramGroup {
  id: string
  label: string
  parentId?: string
  c4?: { kind: 'boundary' | 'deployment'; type: string; description?: string }
  style?: DiagramStyle
}
export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
  dashed?: boolean
  technology?: string
  bidirectional?: boolean
  sequenceBranches?: SequenceBranchReference[]
  er?: ERRelationship
  flow?: FlowConnection
}
export interface SequenceBranchReference { fragmentId: string; branchIndex: number }
export interface SequenceFragment {
  id: string
  kind: 'alt' | 'loop' | 'opt'
  parentId?: string
  parentBranchIndex?: number
  branches: { label: string; start: number; end: number }[]
}
export interface SequenceNote {
  id: string
  text: string
  placement: 'left' | 'right' | 'over'
  participantIds: string[]
  before: number
  sequenceBranches?: SequenceBranchReference[]
}
export interface SequenceActivation {
  participantId: string
  start: number
  end: number
  depth: number
  sequenceBranches?: SequenceBranchReference[]
}
export interface SequenceBox { id: string; label: string; participantIds: string[]; color?: string }
export interface DiagramGraph {
  theme?: 'light' | 'dark'
  direction: DiagramDirection
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  groups?: DiagramGroup[]
  sequence?: { autonumber: boolean; actorIds: string[]; fragments?: SequenceFragment[]; notes?: SequenceNote[]; activations?: SequenceActivation[]; boxes?: SequenceBox[] }
  c4?: { type: C4DiagramType; title?: string }
  er?: boolean
}
export interface ParserError {
  line: number
  message: string
  source: string
}
export interface ParseResult {
  graph: DiagramGraph
  errors: ParserError[]
}
