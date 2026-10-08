import { parseInlineNode, skipWhitespace, type ParsedNode } from './parseNode'
import { readFlowArrow } from './flowArrows'
import type { FlowConnection } from '../types/diagram'

export interface ParsedEdge {
  sources: ParsedNode[]
  targets: ParsedNode[]
  label?: string
  flow?: FlowConnection
  labelRange?: { start: number; end: number; quoted: boolean }
}

function parseNodeList(source: string, start: number) {
  const nodes: ParsedNode[] = []
  let cursor = start
  while (true) {
    const node = parseInlineNode(source, cursor)
    nodes.push(node)
    cursor = skipWhitespace(source, node.end)
    if (source[cursor] !== '&') return { nodes, end: cursor }
    cursor = skipWhitespace(source, cursor + 1)
  }
}

function parseConnection(source: string, start: number) {
  const direct = readFlowArrow(source, start)
  if (direct) return { ...direct, label: undefined as string | undefined, labelRange: undefined as ParsedEdge['labelRange'] }
  const prefix = source.slice(start, start + 2)
  if (!['--', '==', '-.'].includes(prefix)) throw new Error('Expected a flowchart connector such as -->, -.->, ==> or --o.')
  let quote = ''
  for (let cursor = start + 2; cursor < source.length; cursor++) {
    const char = source[cursor]
    if (quote) { if (char === '\\') cursor++; else if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") { quote = char; continue }
    const dotted = prefix === '-.' && source[cursor] === '.' ? readFlowArrow(`-${source.slice(cursor)}`, 0) : null
    const arrow = dotted ? { ...dotted, end: cursor + dotted.end - 1 } : readFlowArrow(source, cursor)
    if (!arrow) continue
    const raw = source.slice(start + 2, cursor)
    const labelStart = start + 2 + (raw.match(/^\s*/)?.[0].length ?? 0)
    const labelEnd = cursor - (raw.match(/\s*$/)?.[0].length ?? 0)
    let label = raw.trim()
    if (!label) throw new Error('Edge labels cannot be empty.')
    if (label.startsWith('"') && label.endsWith('"')) {
      try { label = JSON.parse(label) as string } catch { label = label.slice(1, -1) }
    } else if (label.startsWith("'") && label.endsWith("'")) label = label.slice(1, -1)
    return { ...arrow, label, labelRange: { start: labelStart, end: labelEnd, quoted: source[labelStart] === '"' || source[labelStart] === "'" } }
  }
  throw new Error('Missing a connector after the edge label.')
}

export function parseEdgeDefinition(source: string): ParsedEdge | null {
  const from = parseNodeList(source, 0)
  if (from.end === source.length && from.nodes.length === 1) return null
  const connection = parseConnection(source, from.end)
  let cursor = skipWhitespace(source, connection.end)
  let label = connection.label
  let labelRange = connection.labelRange
  if (source[cursor] === '|') {
    if (label) throw new Error('Use one label syntax per connection.')
    const end = source.indexOf('|', cursor + 1)
    if (end === -1) throw new Error('Missing closing | for edge label.')
    label = source.slice(cursor + 1, end).trim()
    labelRange = { start: cursor + 1, end, quoted: false }
    if (!label) throw new Error('Edge labels cannot be empty.')
    cursor = skipWhitespace(source, end + 1)
  }
  const to = parseNodeList(source, cursor)
  if (source.slice(to.end).trim()) throw new Error('Unexpected text after edge. Write one connection per line.')
  return { sources: from.nodes, targets: to.nodes, label, ...(labelRange ? { labelRange } : {}), ...(connection.flow ? { flow: connection.flow } : {}) }
}
