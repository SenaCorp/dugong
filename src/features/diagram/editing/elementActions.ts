import { materializeGroupAliases } from './groupAliases'
import type { DiagramGraph, DiagramNode } from '../types/diagram'
import type { SourceEdit } from './editSource'
import { nextNodeId, nodeDefinition, insertDefinition, appendStatement, styleStatement } from './elementDefinitions'
import { deleteFlowNode } from './deleteFlowNode'
import { deleteC4Node, deleteERNode, deleteSequenceNode, retainOrphanNodes } from './deleteModeNode'

export type ElementAction = Extract<SourceEdit, { kind: 'addNode' | 'duplicateNode' | 'deleteNode' }>
export function editElements(source: string, graph: DiagramGraph, action: ElementAction): string {
  if (action.kind === 'addNode') {
    const node: DiagramNode = { id: nextNodeId(graph), label: graph.er ? 'New table' : graph.sequence ? 'Participant' : 'New node', shape: 'rectangle' }
    if (graph.c4) {
      const level = graph.c4.type === 'C4Component' ? 'component' : ['C4Container', 'C4Deployment'].includes(graph.c4.type) ? 'container' : 'system'
      node.c4 = { level, kind: level, external: false }
    }
    return appendStatement(source, nodeDefinition(graph, node))
  }
  const original = graph.nodes.find(node => node.id === action.id)
  if (!original) throw new Error('This node no longer exists.')
  if (action.kind === 'duplicateNode') {
    const node = { ...original, id: nextNodeId(graph, `${original.id.replace(/[^\w-]/g, '_')}_copy`), label: `${original.label} copy` }
    const duplicateGraph = graph.sequence ? { ...graph, sequence: { ...graph.sequence, actorIds: graph.sequence.actorIds.includes(original.id) ? [...graph.sequence.actorIds, node.id] : graph.sequence.actorIds } } : graph
    // Look up the original's box membership before inserting its new sibling.
    const resolved = !graph.c4 && !graph.er && !graph.sequence ? materializeGroupAliases(source, graph, original.id) : source
    let updated = insertDefinition(resolved, graph, original, nodeDefinition(duplicateGraph, node))
    if (!graph.c4 && !graph.er && !graph.sequence && node.style) updated = appendStatement(updated, styleStatement(node))
    return updated
  }
  if (graph.c4) return deleteC4Node(source, action.id)
  if (graph.er) return retainOrphanNodes(deleteERNode(source, action.id), graph, action.id)
  if (graph.sequence) return retainOrphanNodes(deleteSequenceNode(source, action.id), graph, action.id)
  return retainOrphanNodes(deleteFlowNode(source, graph, action.id), graph, action.id)
}
