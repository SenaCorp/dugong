import { singletonGroupAliases } from './groupAliases'
import type { DiagramGraph } from '../types/diagram'
import { flowTokens, sourceLines } from './sourceTokens'
import { parseEdgeDefinition } from '../parser/parseEdge'
import { sourceNewline } from './elementDefinitions'

export function deleteFlowNode(source: string, graph: DiagramGraph, id: string): string {
  const removedIds = new Set([id, ...singletonGroupAliases(graph, id)])
  const groups = new Set(graph.groups?.map(group => group.id))
  return sourceLines(source).map(line => {
    const assignment = /^(\s*(?:style|class)\s+)(\S+)(\s+.*)$/.exec(line.body)
    if (assignment) {
      const targets = assignment[2].split(',').filter(target => target !== id)
      return targets.length ? `${assignment[1]}${targets.join(',')}${assignment[3]}` : ''
    }
    const tokens = flowTokens(line.body)
    if (!tokens.some(token => removedIds.has(token.node.id))) return line.text
    let edge
    try { edge = parseEdgeDefinition(line.body) } catch { return line.text }
    if (!edge) return ''
    const keep = (nodes: typeof tokens) => nodes.filter(token => !removedIds.has(token.node.id))
    const sources = keep(edge.sources), targets = keep(edge.targets)
    const text = (token: typeof tokens[number]) => line.text.slice(token.start, token.end).trim()
    const indent = line.text.match(/^\s*/)?.[0] ?? ''
    if (sources.length && targets.length) {
      const connector = line.text.slice(edge.sources.at(-1)!.end, edge.targets[0].start)
      return indent + sources.map(text).join(' & ') + connector + targets.map(text).join(' & ')
    }
    // An inline or implicit neighbor must survive after its final edge disappears.
    return tokens.filter(token => token.node.id !== id).flatMap(token => {
      if (token.explicit && !groups.has(token.node.id)) return [indent + text(token)]
      if (token.classNames) return [`${indent}class ${token.node.id} ${token.classNames.join(',')}`]
      return []
    }).join(sourceNewline(source))
  }).join(sourceNewline(source))
}
