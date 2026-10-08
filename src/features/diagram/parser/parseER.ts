import type { DiagramDirection, DiagramNode, ParseResult } from '../types/diagram'
import { parseERAttribute, parseERRelationship, readEntity } from './erSyntax'

const directions: Record<string, DiagramDirection> = { LR: 'LR', RL: 'RL', TB: 'TD', TD: 'TD', BT: 'BT' }

export function parseER(source: string): ParseResult {
  const result: ParseResult = { graph: { direction: 'LR', nodes: [], edges: [], er: true }, errors: [] }
  const nodes = new Map<string, DiagramNode>()
  const defined = new Set<string>()
  let open: { id: string; line: number; source: string } | null = null
  let hasHeader = false, hasDirection = false
  function ensure(id: string, label = id) {
    let node = nodes.get(id)
    if (!node) { node = { id, label, shape: 'rectangle', er: { attributes: [] } }; nodes.set(id, node) }
    if (label !== id) node.label = label
    return node
  }
  for (const [index, original] of source.split(/\r?\n/).entries()) {
    const line = original.trim()
    if (!line || line.startsWith('%%')) continue
    try {
      if (line === 'erDiagram') {
        if (hasHeader) throw new Error('Declare erDiagram only once.')
        hasHeader = true; continue
      }
      if (open) {
        if (line === '}') { open = null; continue }
        const attribute = parseERAttribute(line)
        const attributes = nodes.get(open.id)!.er!.attributes
        if (attributes.some(existing => existing.name === attribute.name)) throw new Error(`Attribute ${attribute.name} is already declared.`)
        attributes.push(attribute); continue
      }
      if (/^direction\b/.test(line)) {
        const parts = line.split(/\s+/)
        const direction = directions[parts[1]]
        if (parts.length !== 2 || !direction || hasDirection) throw new Error('Declare direction LR, RL, TB, or BT only once.')
        result.graph.direction = direction; hasDirection = true; continue
      }
      const entity = readEntity(line)
      if (!entity.rest || entity.rest === '{') {
        if (entity.rest && defined.has(entity.id)) throw new Error(`Entity ${entity.id} already has an attribute block.`)
        ensure(entity.id, entity.label)
        if (entity.rest) { defined.add(entity.id); open = { id: entity.id, line: index + 1, source: original } }
        continue
      }
      const relation = parseERRelationship(line)
      ensure(relation.from.id, relation.from.label); ensure(relation.to.id, relation.to.label)
      result.graph.edges.push({ id: `er-${result.graph.edges.length + 1}`, ...relation.edge })
    } catch (error) { result.errors.push({ line: index + 1, source: original, message: error instanceof Error ? error.message : 'Unable to parse this ER line.' }) }
  }
  if (open) result.errors.push({ line: open.line, source: open.source, message: 'Close this entity attribute block with }.' })
  if (!hasHeader) result.errors.unshift({ line: 1, source: '', message: 'Start with erDiagram.' })
  result.graph.nodes = [...nodes.values()]
  return result
}
