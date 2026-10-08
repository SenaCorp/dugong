import { editModeSource } from './editModeSource'
import type { DiagramGraph } from '../types/diagram'
import { parseC4Call, c4Statements } from '../parser/c4Syntax'
import { parseSourceConfig } from '../parser/sourceConfig'
import { readEntity, parseERRelationship } from '../parser/erSyntax'
import { parseDiagram } from '../parser/parseDiagram'
import { sourceLines, replaceRange, c4CallSpan } from './sourceTokens'
import { appendStatement, nodeDefinition, sourceNewline, insertDefinition } from './elementDefinitions'

export function deleteC4Node(source: string, id: string) {
  const lines = sourceLines(source), ranges: { start: number; end: number; comments: string[] }[] = []
  for (const statement of c4Statements(parseSourceConfig(source).source)) {
    let call
    try { call = parseC4Call(statement.source) } catch { continue }
    const relation = ['Rel', 'Rel_Back', 'BiRel', 'RelIndex'].includes(call.name)
    const endpoints = call.name === 'RelIndex' ? call.args.slice(1, 3) : call.args.slice(0, 2)
    if (!relation && call.args[0] !== id || relation && !endpoints.includes(id)) continue
    const line = lines[statement.line - 1]
    const start = line.offset + line.text.length - line.text.trimStart().length
    const span = c4CallSpan(source.slice(start))
    ranges.push({ start, end: start + span.end, comments: span.comments })
  }
  let updated = source
  for (const range of ranges.reverse()) updated = replaceRange(updated, range.start, range.end, range.comments.join(sourceNewline(source)))
  return updated
}
export function deleteERNode(source: string, id: string) {
  let blockId: string | null = null
  return sourceLines(source).map(line => {
    const body = line.body.trim()
    if (blockId) {
      const remove = blockId === id
      if (body === '}') blockId = null
      return remove && !body.startsWith('%%') ? '' : line.text
    }
    let entity
    try { entity = readEntity(body) } catch { return line.text }
    if (entity.rest === '{') { blockId = entity.id; return entity.id === id ? '' : line.text }
    if (!entity.rest) return entity.id === id ? '' : line.text
    try { const relation = parseERRelationship(body); if (relation.from.id === id || relation.to.id === id) return '' } catch { /* Direction/header/comments. */ }
    return line.text
  }).join(sourceNewline(source))
}
const message = /^\s*([A-Za-z_][\w-]*)\s*((?:--?>>|--x))\s*([+-]?)\s*([A-Za-z_][\w-]*)\s*:/
export function deleteSequenceNode(source: string, id: string) {
  const lines = sourceLines(source), affected = new Set([id])
  for (const line of lines) {
    const match = message.exec(line.body)
    if (match && [match[1], match[4]].includes(id) && match[3]) affected.add(match[3] === '+' ? match[4] : match[1])
  }
  return lines.map(line => {
    const body = line.body.trim()
    const declaration = /^(participant|actor)\s+(\S+)/.exec(body)
    if (declaration?.[2] === id) return ''
    const activation = /^(activate|deactivate)\s+(\S+)$/.exec(body)
    if (activation && affected.has(activation[2])) return ''
    const note = /^Note\s+(?:left of|right of|over)\s+([^:]+):/i.exec(body)
    if (note?.[1].split(',').map(id => id.trim()).includes(id)) return ''
    const match = message.exec(line.body)
    if (!match) return line.text
    if ([match[1], match[4]].includes(id)) return ''
    if (match[3] && affected.has(match[3] === '+' ? match[4] : match[1])) return line.text.replace(/((?:--?>>|--x)\s*)[+-]/, '$1')
    return line.text
  }).join(sourceNewline(source))
}
function sequenceReferences(body: string): string[] {
  const declaration = /^\s*(?:participant|actor|activate|deactivate)\s+(\S+)/.exec(body)
  if (declaration) return [declaration[1]]
  const match = message.exec(body)
  if (match) return [match[1], match[4]]
  const note = /^\s*Note\s+(?:left of|right of|over)\s+([^:]+):/i.exec(body)
  return note ? note[1].split(',').map(id => id.trim()) : []
}
export function retainOrphanNodes(updated: string, graph: DiagramGraph, removedId: string) {
  const remaining = new Set(parseDiagram(updated).graph.nodes.map(node => node.id))
  for (const [index, node] of graph.nodes.entries()) {
    if (node.id === removedId || remaining.has(node.id)) continue
    if (graph.sequence) {
      const next = graph.nodes.slice(index + 1).find(node => node.id !== removedId && remaining.has(node.id))
      let boxStart: number | null = null, referenceOffset: number | undefined
      for (const line of sourceLines(updated)) {
        const body = line.body.trim()
        if (/^box(?:\s|$)/.test(body)) boxStart = line.offset
        if (body === 'end' && boxStart !== null) boxStart = null
        if (next && sequenceReferences(body).includes(next.id)) { referenceOffset = boxStart ?? line.offset; break }
      }
      const definition = nodeDefinition(graph, node)
      updated = referenceOffset === undefined ? appendStatement(updated, definition) : replaceRange(updated, referenceOffset, referenceOffset, definition + sourceNewline(updated))
    } else {
      updated = insertDefinition(updated, graph, node, nodeDefinition(graph, node))
    }
    remaining.add(node.id)
  }
  if (graph.er) {
    const current = parseDiagram(updated).graph
    for (const node of graph.nodes) if (node.id !== removedId && current.nodes.find(candidate => candidate.id === node.id)?.label !== node.label) {
      updated = editModeSource(updated, current, { kind: 'nodeLabel', id: node.id, label: node.label })
    }
  }
  return updated
}
