import type { DiagramGraph, DiagramNode, DiagramNodeShape } from '../types/diagram'
import { quoted, sourceLines } from './sourceTokens'
import { parseNodeDefinition } from '../parser/parseNode'
import { c4Statements, parseC4Call } from '../parser/c4Syntax'
import { parseSourceConfig } from '../parser/sourceConfig'

export const shapeDelimiters: Record<DiagramNodeShape, [string, string]> = {
  rectangle: ['[', ']'], rounded: ['(', ')'], database: ['[(', ')]'], diamond: ['{', '}'], stadium: ['([', '])'],
  circle: ['((', '))'], doubleCircle: ['(((', ')))'], hexagon: ['{{', '}}'], parallelogram: ['[/', '/]'], trapezoid: ['[/', '\\]'], subroutine: ['[[', ']]'],
}
export function nextNodeId(graph: DiagramGraph, base = 'Node') {
  const used = new Set([...graph.nodes, ...(graph.groups ?? [])].map(node => node.id))
  if (base !== 'Node' && !used.has(base)) return base
  let index = base === 'Node' ? 1 : 2
  while (used.has(`${base}${index}`)) index++
  return `${base}${index}`
}
export function nodeDefinition(graph: DiagramGraph, node: DiagramNode): string {
  if (graph.sequence) return `${graph.sequence.actorIds.includes(node.id) ? 'actor' : 'participant'} ${node.id} as ${node.label.replace(/\r?\n/g, '<br/>')}`
  if (node.c4) {
    const level = node.c4.level[0].toUpperCase() + node.c4.level.slice(1)
    const name = level + (node.c4.kind === 'database' ? 'Db' : node.c4.kind === 'queue' ? 'Queue' : '') + (node.c4.external ? '_Ext' : '')
    const args = [node.id, quoted(node.label)]
    if (['container', 'component'].includes(node.c4.level)) args.push(quoted(node.c4.technology ?? ''), quoted(node.c4.description ?? ''))
    else args.push(quoted(node.c4.description ?? ''))
    return `${name}(${args.join(', ')})`
  }
  if (graph.er) {
    const attributes = node.er?.attributes ?? []
    const title = `${quoted(node.id)}[${quoted(node.label)}]`
    return attributes.length ? `${title} {\n${attributes.map(attr => `  ${attr.type} ${attr.name}${attr.keys.length ? ` ${attr.keys.join(',')}` : ''}${attr.comment ? ` ${quoted(attr.comment)}` : ''}`).join('\n')}\n}` : title
  }
  const [open, close] = shapeDelimiters[node.shape]
  return `${node.id}${open}${quoted(node.label)}${close}`
}
export function sourceNewline(source: string) { return source.includes('\r\n') ? '\r\n' : '\n' }
export function appendStatement(source: string, statement: string) { const nl = sourceNewline(source); return `${source}${source.endsWith(nl) ? '' : nl}${statement.replace(/\r?\n/g, nl)}` }

// Return the closing statement's line so new siblings remain inside the original parent.
export function parentEndLine(source: string, graph: DiagramGraph, node: DiagramNode): number | undefined {
  if (graph.sequence) {
    const box = graph.sequence.boxes?.find(box => box.participantIds.includes(node.id))
    if (!box) return undefined
    let ordinal = 0, inBox = false
    for (const line of sourceLines(source)) {
      if (/^box(?:\s|$)/.test(line.body.trim())) { ordinal++; inBox = `sequence-box-${ordinal}` === box.id }
      if (inBox && line.body.trim() === 'end') return line.index
    }
    return undefined
  }
  if (!node.parentId) return undefined
  const stack: string[] = []
  if (graph.c4) {
    for (const statement of c4Statements(parseSourceConfig(source).source)) {
      if (statement.source === '}') { if (stack.pop() === node.parentId) return statement.line - 1; continue }
      try { const call = parseC4Call(statement.source); if (call.boundary) stack.push(call.args[0]) } catch { /* Header and title. */ }
    }
  } else {
    for (const line of sourceLines(source)) {
      if (line.body.trim().startsWith('subgraph ')) stack.push(parseNodeDefinition(line.body.trim().slice(9)).node.id)
      if (line.body.trim() === 'end' && stack.pop() === node.parentId) return line.index
    }
  }
  return undefined
}
export function insertDefinition(source: string, graph: DiagramGraph, node: DiagramNode, statement: string): string {
  const index = parentEndLine(source, graph, node)
  if (index === undefined) return appendStatement(source, statement)
  const line = sourceLines(source)[index], nl = sourceNewline(source)
  return source.slice(0, line.offset) + statement.replace(/\r?\n/g, nl) + nl + source.slice(line.offset)
}
export function styleStatement(node: DiagramNode): string {
  if (!node.style) return ''
  const keys = { fill: 'fill', stroke: 'stroke', color: 'color', strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray' }
  return `style ${node.id} ${Object.entries(node.style).map(([key, value]) => `${keys[key as keyof typeof keys]}:${value}`).join(',')}`
}
