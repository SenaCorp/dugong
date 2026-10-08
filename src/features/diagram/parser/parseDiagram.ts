import type { DiagramDirection, DiagramGroup, DiagramNode, ParseResult } from '../types/diagram'
import { parseEdgeDefinition } from './parseEdge'
import { parseNodeDefinition, type ParsedNode } from './parseNode'
import { resolveGroupReferences } from './parseGroups'
import { parseSequence } from './parseSequence'
import { isC4Type, parseC4 } from './parseC4'
import { parseER } from './parseER'
import { parseSourceConfig } from './sourceConfig'
import { createFlowStyles } from './flowStyles'

export function parseDirection(line: string): DiagramDirection | null {
  const parts = line.trim().split(/\s+/)
  if (parts[0] !== 'flowchart') return null
  if (parts.length !== 2 || !['LR', 'RL', 'TD', 'BT'].includes(parts[1])) throw new Error('Use flowchart LR, RL, TD, or BT.')
  return parts[1] as DiagramDirection
}

function parseBody(source: string): ParseResult {
  const firstLine = source.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith('%%'))
  if (firstLine === 'sequenceDiagram') return parseSequence(source)
  if (firstLine === 'erDiagram') return parseER(source)
  if (firstLine && isC4Type(firstLine)) return parseC4(source)
  const result: ParseResult = { graph: { direction: 'LR', nodes: [], edges: [], groups: [] }, errors: [] }
  const nodes = new Map<string, DiagramNode>()
  const explicitIds = new Set<string>()
  const groups: DiagramGroup[] = []
  const stack: { id: string; line: number; source: string }[] = []
  const edgeIds = new Set<string>()
  const edgeLines = new Map<string, { line: number; source: string }>()
  let hasDirection = false
  let frontmatter = false
  let seenContent = false
  const styles = createFlowStyles()
  let sourceLine = 1, originalLine = ''
  const upsert = (parsed: ParsedNode, declaration = false) => {
    if (parsed.classNames) styles.assign(parsed.node.id, parsed.classNames, sourceLine, originalLine)
    const existing = nodes.get(parsed.node.id)
    const parentId = (parsed.explicit || declaration) ? stack.at(-1)?.id ?? existing?.parentId : existing?.parentId
    if (!existing || parsed.explicit || (parentId && !existing.parentId)) {
      nodes.set(parsed.node.id, { ...(parsed.explicit || !existing ? parsed.node : existing), ...(parentId ? { parentId } : {}) })
    }
    if (parsed.explicit) explicitIds.add(parsed.node.id)
  }
  source.split(/\r?\n/).forEach((original, index) => {
    sourceLine = index + 1; originalLine = original
    const line = original.trim()
    if (!line) return
    if (!seenContent && line === '---') { frontmatter = true; seenContent = true; return }
    seenContent = true
    if (frontmatter) { if (line === '---') frontmatter = false; return }
    if (line.startsWith('%%')) return
    try {
      if (styles.parse(line, index + 1, original)) return
      const direction = parseDirection(line)
      if (direction) {
        if (hasDirection) throw new Error('Declare the flowchart direction only once.')
        if (nodes.size || groups.length) throw new Error('Put the flowchart direction before node declarations.')
        result.graph.direction = direction
        hasDirection = true
        return
      }
      if (line.startsWith('subgraph ')) {
        const parsed = parseNodeDefinition(line.slice('subgraph '.length).trim())
        if (groups.some(group => group.id === parsed.node.id) || explicitIds.has(parsed.node.id)) throw new Error('Group IDs must be unique and distinct from node IDs.')
        groups.push({ id: parsed.node.id, label: parsed.node.label, ...(stack.length ? { parentId: stack.at(-1)!.id } : {}) })
        if (parsed.classNames) styles.assign(parsed.node.id, parsed.classNames, index + 1, original)
        stack.push({ id: parsed.node.id, line: index + 1, source: original })
        return
      }
      if (line === 'end') {
        if (!stack.length) throw new Error('Unexpected end: no open subgraph.')
        stack.pop()
        return
      }
      const connection = parseEdgeDefinition(line)
      if (connection) {
        for (const node of [...connection.sources, ...connection.targets]) upsert(node)
        for (const from of connection.sources) for (const to of connection.targets) {
          const base = `${from.node.id}-${to.node.id}`
          let id = base, count = 1
          while (edgeIds.has(id)) id = `${base}-${++count}`
          edgeIds.add(id)
          result.graph.edges.push({ id, source: from.node.id, target: to.node.id, label: connection.label, ...(connection.flow ? { flow: connection.flow } : {}) })
          edgeLines.set(id, { line: index + 1, source: original })
        }
      } else upsert(parseNodeDefinition(line), true)
    } catch (error) {
      result.errors.push({ line: index + 1, source: original, message: error instanceof Error ? error.message : 'Unable to parse this line.' })
    }
  })
  if (frontmatter) result.errors.push({ line: 1, source: '---', message: 'Frontmatter must end with ---.' })
  for (const open of stack) result.errors.push({ line: open.line, source: open.source, message: `Close subgraph ${open.id} with end.` })
  for (const group of groups) if (explicitIds.has(group.id)) result.errors.push({ line: 1, source: group.id, message: 'Group IDs must be distinct from node IDs.' })
  if (!hasDirection) result.errors.unshift({ line: 1, source: '', message: 'Start with flowchart LR, RL, TD, or BT.' })
  const resolved = resolveGroupReferences([...nodes.values()], groups, result.graph.edges, edgeLines)
  result.graph.nodes = resolved.nodes
  result.graph.edges = resolved.edges
  result.graph.groups = groups
  result.errors.push(...resolved.errors)
  const styled = styles.resolve([...result.graph.nodes.map(node => node.id), ...groups.map(group => group.id)])
  result.graph.nodes = result.graph.nodes.map(node => styled.styles.has(node.id) ? { ...node, style: styled.styles.get(node.id) } : node)
  result.graph.groups = groups.map(group => styled.styles.has(group.id) ? { ...group, style: styled.styles.get(group.id) } : group)
  result.errors.push(...styled.errors)
  return result
}

export function parseDiagram(source: string): ParseResult {
  const config = parseSourceConfig(source)
  const result = parseBody(config.source)
  if (config.theme) result.graph.theme = config.theme
  result.errors.push(...config.errors)
  return result
}
