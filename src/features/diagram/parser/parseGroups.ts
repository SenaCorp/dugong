import type { DiagramEdge, DiagramGroup, DiagramNode, ParserError } from '../types/diagram'

// Single-node groups are unambiguous aliases, e.g. ACCESS_CONTROL → ACCESS_SERVICE in diagram.md.
export function resolveGroupReferences(nodes: DiagramNode[], groups: DiagramGroup[], edges: DiagramEdge[], lines: Map<string, { line: number; source: string }>) {
  const groupsById = new Map(groups.map(group => [group.id, group]))
  const errors: ParserError[] = []
  function members(id: string): DiagramNode[] {
    return nodes.filter(node => {
      let parent = node.parentId
      while (parent) {
        if (parent === id) return true
        parent = groupsById.get(parent)?.parentId
      }
      return false
    })
  }
  function resolve(id: string, edge: DiagramEdge) {
    if (!groupsById.has(id)) return id
    const children = members(id)
    if (children.length === 1) return children[0].id
    const info = lines.get(edge.id)!
    errors.push({ ...info, message: `Group ${id} has ${children.length} nodes. Connect to a specific node ID.` })
    return id
  }
  return {
    nodes: nodes.filter(node => !groupsById.has(node.id)),
    edges: edges.map(edge => ({ ...edge, source: resolve(edge.source, edge), target: resolve(edge.target, edge) })),
    errors,
  }
}
