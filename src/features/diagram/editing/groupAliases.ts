import type { DiagramGraph } from '../types/diagram'
import { appendStatement } from './elementDefinitions'
import { flowTokens, replaceRange, sourceLines } from './sourceTokens'

export function singletonGroupAliases(graph: DiagramGraph, id: string): Set<string> {
  return new Set((graph.groups ?? []).filter(group => {
    const members = graph.nodes.filter(node => {
      let parent = node.parentId
      while (parent) { if (parent === group.id) return true; parent = graph.groups?.find(group => group.id === parent)?.parentId }
      return false
    })
    return members.length === 1 && members[0].id === id
  }).map(group => group.id))
}
export function materializeGroupAliases(source: string, graph: DiagramGraph, id: string): string {
  const aliases = singletonGroupAliases(graph, id)
  const patches: { start: number; end: number; text: string }[] = [], classes: string[] = []
  for (const line of sourceLines(source)) for (const token of flowTokens(line.body)) {
    if (!aliases.has(token.node.id)) continue
    if (token.classNames) classes.push(`class ${token.node.id} ${token.classNames.join(',')}`)
    patches.push({ start: line.offset + token.start!, end: line.offset + token.end, text: id })
  }
  let updated = source
  for (const patch of patches.reverse()) updated = replaceRange(updated, patch.start, patch.end, patch.text)
  for (const declaration of classes) updated = appendStatement(updated, declaration)
  return updated
}
