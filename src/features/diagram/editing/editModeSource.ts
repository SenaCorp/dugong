import type { DiagramGraph } from '../types/diagram'
import type { SourceEdit } from './editSource'
import { c4Statements, parseC4Call } from '../parser/c4Syntax'
import { parseSourceConfig } from '../parser/sourceConfig'
import { parseERRelationship, readEntity } from '../parser/erSyntax'
import { c4ArgumentRanges, quoted, replaceRange, sourceLines } from './sourceTokens'

function c4Edit(source: string, graph: DiagramGraph, action: SourceEdit): string {
  if (action.kind !== 'nodeLabel' && action.kind !== 'edgeLabel') throw new Error('C4 elements keep their semantic type; edit their wording or position.')
  const lines = sourceLines(source)
  const edgeIndex = graph.edges.findIndex(edge => edge.id === action.id)
  let ordinal = 0
  for (const statement of c4Statements(parseSourceConfig(source).source)) {
    let call
    try { call = parseC4Call(statement.source) } catch { continue }
    const relation = ['Rel', 'BiRel', 'Rel_Back', 'RelIndex'].includes(call.name)
    const argumentIndex = action.kind === 'nodeLabel' && !relation && call.args[0] === action.id ? 1
      : action.kind === 'edgeLabel' && relation && ordinal === edgeIndex ? call.name === 'RelIndex' ? 3 : 2 : -1
    if (relation) ordinal++
    if (argumentIndex < 0) continue
    const start = lines[statement.line - 1].offset + (lines[statement.line - 1].text.match(/^\s*/)?.[0].length ?? 0)
    const range = c4ArgumentRanges(source.slice(start))[argumentIndex]
    if (!range) throw new Error('Cannot locate this C4 argument.')
    return replaceRange(source, start + range.start, start + range.end, quoted(action.label))
  }
  throw new Error('This C4 declaration no longer exists.')
}
function sequenceEdit(source: string, graph: DiagramGraph, action: SourceEdit): string {
  if (!['nodeLabel', 'edgeLabel', 'noteLabel'].includes(action.kind) || !('label' in action)) throw new Error('Sequence participants retain their semantic type; edit their wording or position.')
  const label = action.label.replace(/\r?\n/g, '<br/>')
  const lines = sourceLines(source)
  if (action.kind === 'nodeLabel') {
    const declarations = lines.filter(line => /^(participant|actor)\s+/.test(line.body.trim()) && line.body.trim().split(/\s+/)[1] === action.id)
    const declaration = declarations.at(-1)
    if (declaration) {
      const match = /^(\s*(?:participant|actor)\s+\S+)(?:\s+as\s+.*)?$/.exec(declaration.text)!
      return replaceRange(source, declaration.offset, declaration.offset + declaration.text.length, `${match[1]} as ${label}`)
    }
    // Materialize at the first actual reference, before a same-line implicit sender if necessary.
    const existing = new Set(lines.filter(line => /^(participant|actor)\s+/.test(line.body.trim())).map(line => line.body.trim().split(/\s+/)[1]))
    const reference = lines.find(line => {
      const message = /^\s*([A-Za-z_][\w-]*)\s*--?>>\s*[+-]?\s*([A-Za-z_][\w-]*)\s*:/.exec(line.body)
      if (message) return message[1] === action.id || message[2] === action.id
      const note = /^\s*Note\s+(?:over|left\s+of|right\s+of)\s+([^:]+):/i.exec(line.body)
      return note?.[1].split(',').map(id => id.trim()).includes(action.id)
    })
    if (!reference) throw new Error('Cannot locate the participant reference.')
    const index = graph.nodes.findIndex(node => node.id === action.id)
    const definitions = graph.nodes.slice(0, index + 1).filter(node => !existing.has(node.id)).map(node => `participant ${node.id} as ${node.id === action.id ? label : node.label}`).join('\n')
    return replaceRange(source, reference.offset, reference.offset, `${definitions}\n`)
  }
  const candidates = lines.filter(line => action.kind === 'noteLabel' ? /^Note\s+(?:over|left\s+of|right\s+of)\s+/i.test(line.body.trim()) : /^[A-Za-z_][\w-]*\s*--?>>\s*[+-]?\s*[A-Za-z_][\w-]*\s*:/.test(line.body.trim()))
  const index = action.kind === 'noteLabel' ? (graph.sequence?.notes ?? []).findIndex(note => note.id === action.id) : graph.edges.findIndex(edge => edge.id === action.id)
  const line = candidates[index]
  if (!line) throw new Error('This sequence item no longer exists.')
  const colon = line.text.indexOf(':')
  return replaceRange(source, line.offset + colon + 1, line.offset + line.text.length, ` ${label}`)
}
function erEdit(source: string, graph: DiagramGraph, action: SourceEdit): string {
  if (action.kind !== 'nodeLabel' && action.kind !== 'edgeLabel') throw new Error('ER tables keep their table shape; edit their alias or position.')
  if (/[\r\n]/.test(action.label)) throw new Error('ER labels use one line.')
  const lines = sourceLines(source)
  let open = false, ordinal = 0
  const aliases: { start: number; end: number; idText: string; explicit: boolean }[] = []
  const edgeIndex = graph.edges.findIndex(edge => edge.id === action.id)
  for (const line of lines) {
    const text = line.body.trim()
    if (!text || text.startsWith('%%') || text === 'erDiagram' || text.startsWith('direction ')) continue
    if (open) { if (text === '}') open = false; continue }
    let entity
    try { entity = readEntity(text) } catch { continue }
    const indent = line.text.indexOf(text)
    const register = (token: string, start: number) => {
      const parsed = readEntity(token)
      if (parsed.id !== action.id) return
      const prefix = token.slice(0, token.length - parsed.rest.length).trimEnd()
      const idEnd = prefix.startsWith('"') ? (() => { let i = 1; while (i < prefix.length) { if (prefix[i] === '\\') i += 2; else if (prefix[i++] === '"') break }; return i })() : /^[A-Za-z_][\w-]*/.exec(prefix)![0].length
      aliases.push({ start, end: start + prefix.length, idText: prefix.slice(0, idEnd), explicit: prefix.slice(idEnd).trimStart().startsWith('[') })
    }
    register(text, line.offset + indent)
    if (entity.rest === '{') { open = true; continue }
    if (!entity.rest) continue
    let relationship
    try { relationship = parseERRelationship(text) } catch { continue }
    const relationStart = text.length - entity.rest.length
    const operator = /^(\|\||\|o|\}\||\}o)\s*(--|\.\.)\s*(\|\||o\||\|\{|o\{)\s*/.exec(entity.rest)!
    const targetStart = relationStart + operator[0].length
    register(text.slice(targetStart), line.offset + indent + targetStart)
    if (action.kind === 'edgeLabel' && ordinal === edgeIndex) {
      const target = readEntity(text.slice(targetStart))
      const colon = targetStart + text.slice(targetStart).length - target.rest.length
      return replaceRange(source, line.offset + indent + colon + 1, line.offset + line.text.length, ` ${quoted(action.label)}`)
    }
    if (relationship) ordinal++
  }
  if (action.kind === 'nodeLabel') {
    const effective = aliases.filter(alias => alias.explicit).at(-1) ?? aliases[0]
    if (!effective) throw new Error('This entity no longer exists.')
    // All aliases need updating when restoring an ID label: the parser deliberately ignores implicit defaults.
    const targets = action.label === action.id ? aliases.filter(alias => alias.explicit) : [effective]
    if (!targets.length) return source
    let result = source
    for (const target of targets.sort((a, b) => b.start - a.start)) result = replaceRange(result, target.start, target.end, `${target.idText}[${quoted(action.label)}]`)
    return result
  }
  throw new Error('This ER relationship no longer exists.')
}
export function editModeSource(source: string, graph: DiagramGraph, action: SourceEdit): string {
  if (graph.c4) return c4Edit(source, graph, action)
  if (graph.sequence) return sequenceEdit(source, graph, action)
  return erEdit(source, graph, action)
}
