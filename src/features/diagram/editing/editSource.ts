import type { DiagramGraph, DiagramNodeShape, ERAttribute } from '../types/diagram'
import { parseDiagram } from '../parser/parseDiagram'
import { parseEdgeDefinition } from '../parser/parseEdge'
import { readFlowArrow } from '../parser/flowArrows'
import { flowTokens, quoted, replaceRange, sourceLines } from './sourceTokens'
import { editModeSource } from './editModeSource'
import { editElements } from './elementActions'
import { editInspector } from './inspectorEdits'
import { shapeDelimiters } from './elementDefinitions'

export type SourceEdit =
  | { kind: 'nodeProperties'; id: string; label: string; technology?: string; description?: string }
  | { kind: 'erAttributes'; id: string; label: string; attributes: ERAttribute[] }
  | { kind: 'groupLabel'; id: string; label: string }
  | { kind: 'fragmentLabel'; id: string; branchIndex: number; label: string }
  | { kind: 'addNode' }
  | { kind: 'duplicateNode'; id: string }
  | { kind: 'deleteNode'; id: string }
  | { kind: 'nodeLabel'; id: string; label: string }
  | { kind: 'edgeLabel'; id: string; label: string }
  | { kind: 'noteLabel'; id: string; label: string }
  | { kind: 'shape'; id: string; shape: DiagramNodeShape }
  | { kind: 'color'; id: string; color: string }
  | { kind: 'connect'; source: string; target: string }

function flowNode(source: string, graph: DiagramGraph, action: Extract<SourceEdit, { kind: 'shape' }> | { kind: 'nodeLabel'; id: string; label: string }) {
  const node = graph.nodes.find(node => node.id === action.id)
  if (!node) throw new Error('This node no longer exists in the source.')
  const shape = action.kind === 'shape' ? action.shape : node.shape
  const label = action.kind === 'nodeLabel' ? action.label : node.label
  const [open, close] = shapeDelimiters[shape]
  const definition = `${node.id}${open}${quoted(label)}${close}`
  const explicit = sourceLines(source).flatMap(line => flowTokens(line.body).filter(token => token.node.id === node.id && token.explicit).map(token => ({ line, token }))).at(-1)
  if (!explicit) return `${source}\n${definition}`
  return replaceRange(source, explicit.line.offset + explicit.token.start!, explicit.line.offset + explicit.token.definitionEnd!, definition)
}
function flowEdge(source: string, graph: DiagramGraph, action: { id: string; label: string }) {
  if (/[|\r\n]/.test(action.label)) throw new Error('Flowchart edge labels cannot contain | or line breaks.')
  const index = graph.edges.findIndex(edge => edge.id === action.id)
  let ordinal = 0
  for (const line of sourceLines(source)) {
    let connection
    try { connection = parseEdgeDefinition(line.body) } catch { continue }
    if (!connection) continue
    const count = connection.sources.length * connection.targets.length
    if (index >= ordinal && index < ordinal + count) {
      if (count > 1) throw new Error('This line defines multiple connections. Split it into separate lines before editing one label.')
      if (connection.labelRange) return replaceRange(source, line.offset + connection.labelRange.start, line.offset + connection.labelRange.end, connection.labelRange.quoted ? quoted(action.label) : action.label)
      const start = connection.sources.at(-1)!.end
      const end = connection.targets[0].start!
      const between = line.text.slice(start, end)
      const firstPipe = between.indexOf('|'), lastPipe = between.lastIndexOf('|')
      if (firstPipe >= 0 && lastPipe > firstPipe) return replaceRange(source, line.offset + start + firstPipe + 1, line.offset + start + lastPipe, action.label)
      const arrowStart = start + (between.match(/^\s*/)?.[0].length ?? 0)
      const arrow = readFlowArrow(line.text, arrowStart)
      if (arrow) return replaceRange(source, line.offset + arrow.end, line.offset + arrow.end, `|${action.label}|`)
      throw new Error('Cannot locate this connector label safely.')
    }
    ordinal += count
  }
  throw new Error('This relationship no longer exists in the source.')
}
export function editSource(source: string, action: SourceEdit): string {
  const parsed = parseDiagram(source)
  if (parsed.errors.length) throw new Error('Fix source errors before editing the canvas.')
  if ('label' in action && !action.label.trim()) throw new Error('Wording cannot be empty.')
  let updated: string
  const graph = parsed.graph
  if (action.kind === 'addNode' || action.kind === 'duplicateNode' || action.kind === 'deleteNode') updated = editElements(source, graph, action)
  else if (action.kind === 'nodeProperties' || action.kind === 'erAttributes' || action.kind === 'groupLabel' || action.kind === 'fragmentLabel') updated = editInspector(source, graph, action)
  else if (action.kind === 'connect') {
    if (![action.source, action.target].every(id => graph.nodes.some(node => node.id === id))) throw new Error('Connect two existing nodes.')
    const statement = graph.sequence ? `${action.source}->>${action.target}: Message` : graph.c4 ? `Rel(${action.source}, ${action.target}, "Relationship")` : graph.er ? `${quoted(action.source)} ||--o{ ${quoted(action.target)} : relates` : `${action.source} --> ${action.target}`
    updated = `${source}\n${statement}`
  } else if (graph.sequence || graph.c4 || graph.er) updated = editModeSource(source, graph, action)
  else if (action.kind === 'shape' || action.kind === 'nodeLabel') updated = flowNode(source, graph, action)
  else if (action.kind === 'color') {
    if (!/^#[\da-f]{6}$/i.test(action.color)) throw new Error('Use a six-digit hex color.')
    if (!graph.nodes.some(node => node.id === action.id)) throw new Error('This node no longer exists.')
    updated = `${source}\nstyle ${action.id} fill:${action.color}`
  } else if (action.kind === 'edgeLabel') updated = flowEdge(source, graph, action)
  else throw new Error('This item does not support editing.')
  const result = parseDiagram(updated)
  if (result.errors.length) throw new Error(result.errors[0].message)
  return updated
}
