import { nodeSize } from '../layout/nodeSize'
import type { SourceEdit } from './editSource'
import type { DiagramGraph } from '../types/diagram'
import type { Point } from '../layout/flowTypes'

// Release pins in the same history transaction whenever an edit changes card dimensions.
export function positionsForSourceEdit(action: SourceEdit, before: DiagramGraph, after: DiagramGraph, positions: Record<string, Point>): Record<string, Point> {
  if (action.kind === 'nodeLabel' && !after.sequence) {
    const oldNode = before.nodes.find(node => node.id === action.id), newNode = after.nodes.find(node => node.id === action.id)
    if (oldNode && newNode && JSON.stringify(nodeSize(oldNode)) !== JSON.stringify(nodeSize(newNode))) return {}
  }
  return ['addNode', 'duplicateNode', 'deleteNode', 'shape', 'nodeProperties', 'erAttributes', 'groupLabel', 'fragmentLabel'].includes(action.kind) ? {} : positions
}
