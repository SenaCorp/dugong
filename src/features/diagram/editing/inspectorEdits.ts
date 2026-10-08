import { sequenceBoxColor } from '../parser/sequenceAnnotations'
import type { DiagramGraph, ERAttribute } from '../types/diagram'
import type { SourceEdit } from './editSource'
import { c4Statements, parseC4Call } from '../parser/c4Syntax'
import { parseNodeDefinition } from '../parser/parseNode'
import { parseSourceConfig } from '../parser/sourceConfig'
import { readEntity } from '../parser/erSyntax'
import { c4ArgumentRanges, quoted, replaceRange, sourceLines } from './sourceTokens'
import { editModeSource } from './editModeSource'
import { appendStatement, sourceNewline } from './elementDefinitions'

export type InspectorAction = Extract<SourceEdit, { kind: 'nodeProperties' | 'erAttributes' | 'groupLabel' | 'fragmentLabel' }>
function patchC4Properties(source: string, graph: DiagramGraph, action: Extract<InspectorAction, { kind: 'nodeProperties' | 'groupLabel' }>): string {
  const node = graph.nodes.find(node => node.id === action.id)
  const group = graph.groups?.find(group => group.id === action.id)
  if (action.kind === 'nodeProperties' ? !node?.c4 : !group) throw new Error('This C4 element no longer exists.')
  const lines = sourceLines(source)
  for (const statement of c4Statements(parseSourceConfig(source).source)) {
    let call
    try { call = parseC4Call(statement.source) } catch { continue }
    if (call.args[0] !== action.id || ['Rel', 'BiRel', 'Rel_Back', 'RelIndex'].includes(call.name)) continue
    const start = lines[statement.line - 1].offset + (lines[statement.line - 1].text.match(/^\s*/)?.[0].length ?? 0)
    const ranges = c4ArgumentRanges(source.slice(start))
    const fields = new Map<number, string>([[1, action.label]])
    if (action.kind === 'nodeProperties') {
      const hasTech = node!.c4!.level === 'container' || node!.c4!.level === 'component'
      if (hasTech) fields.set(2, action.technology ?? '')
      fields.set(hasTech ? 3 : 2, action.description ?? '')
    }
    const max = Math.max(...fields.keys())
    let updated = source
    // Missing optional arguments are inserted before the close parenthesis, preserving comments.
    if (max >= ranges.length) {
      const last = ranges.at(-1)!
      const suffix = Array.from({ length: max - ranges.length + 1 }, (_, index) => quoted(fields.get(ranges.length + index) ?? '')).join(', ')
      updated = replaceRange(updated, start + last.end, start + last.end, `, ${suffix}`)
    }
    for (const [index, value] of [...fields].sort(([a], [b]) => b - a)) {
      const range = ranges[index]
      if (range) updated = replaceRange(updated, start + range.start, start + range.end, quoted(value))
    }
    return updated
  }
  throw new Error('Cannot locate this C4 declaration.')
}
function erAttributeLine(attribute: ERAttribute) {
  return `  ${attribute.type} ${attribute.name}${attribute.keys.length ? ` ${attribute.keys.join(',')}` : ''}${attribute.comment ? ` ${quoted(attribute.comment)}` : ''}`
}
function patchAttributes(source: string, graph: DiagramGraph, action: Extract<InspectorAction, { kind: 'erAttributes' }>): string {
  if (!graph.er || !graph.nodes.some(node => node.id === action.id)) throw new Error('This ER table no longer exists.')
  if (action.attributes.some(attr => /\s/.test(attr.type) || !/^[A-Za-z_][\w-]*$/.test(attr.name))) throw new Error('Use a single valid attribute type and name; select constraints in the key field.')
  if (action.attributes.some(attr => /[\r\n]/.test(`${attr.type}${attr.name}${attr.comment ?? ''}`))) throw new Error('ER attributes use one line each.')
  const renamed = editModeSource(source, graph, { kind: 'nodeLabel', id: action.id, label: action.label })
  const lines = sourceLines(renamed), nl = sourceNewline(source)
  let start: typeof lines[number] | undefined, otherBlock = false
  for (const line of lines) {
    if (otherBlock) { if (line.body.trim() === '}') otherBlock = false; continue }
    if (start) {
      if (line.body.trim() !== '}') continue
      const comments = lines.slice(start.index + 1, line.index).filter(line => line.body.trim().startsWith('%%')).map(line => line.text)
      const body = [...comments, ...action.attributes.map(erAttributeLine)].join(nl)
      return replaceRange(renamed, start.offset + start.text.length, line.offset, nl + (body ? body + nl : ''))
    }
    try {
      const entity = readEntity(line.body.trim())
      if (entity.rest === '{') { if (entity.id === action.id) start = line; else otherBlock = true }
    } catch { /* Header or relationship. */ }
  }
  const definition = `${quoted(action.id)}[${quoted(action.label)}] {${nl}${action.attributes.map(erAttributeLine).join(nl)}${action.attributes.length ? nl : ''}}`
  return appendStatement(renamed, definition)
}
function patchFlowGroup(source: string, graph: DiagramGraph, action: Extract<InspectorAction, { kind: 'groupLabel' }>): string {
  if (!graph.groups?.some(group => group.id === action.id)) throw new Error('This group no longer exists.')
  for (const line of sourceLines(source)) {
    const match = /^\s*subgraph\s+/.exec(line.body)
    if (!match) continue
    const token = parseNodeDefinition(line.body.slice(match[0].length))
    if (token.node.id !== action.id) continue
    return replaceRange(source, line.offset + match[0].length + token.start!, line.offset + match[0].length + token.definitionEnd!, `${action.id}[${quoted(action.label)}]`)
  }
  throw new Error('Cannot locate this group.')
}
function patchSequence(source: string, graph: DiagramGraph, action: Extract<InspectorAction, { kind: 'groupLabel' | 'fragmentLabel' }>) {
  if (!graph.sequence) throw new Error('This is not a sequence diagram.')
  if (/[\r\n]/.test(action.label)) throw new Error('Sequence conditions and box labels use one line.')
  let ordinal = 0, boxOrdinal = 0, inBox = false
  const stack: { id: string; branch: number }[] = []
  for (const line of sourceLines(source)) {
    const body = line.body.trim()
    if (/^box(?:\s|$)/.test(body)) {
      inBox = true; boxOrdinal++
      if (action.kind === 'groupLabel' && action.id === `sequence-box-${boxOrdinal}`) {
        const color = graph.sequence.boxes?.find(box => box.id === action.id)?.color
        if (!color && sequenceBoxColor(action.label.trim().split(/\s+/)[0])) throw new Error('This box name starts with a color token. Choose another name, or add an explicit box color in source first.')
        return replaceRange(source, line.offset, line.offset + line.text.length, `${line.text.match(/^\s*/)?.[0] ?? ''}box ${color ? body.slice(4).trim().split(/\s+/)[0] + ' ' : ''}${action.label}`)
      }
      continue
    }
    if (body === 'end' && inBox) { inBox = false; continue }
    if (inBox) continue
    const open = /^(alt|loop|opt)\s+/.exec(body)
    if (open) {
      const frame = { id: `fragment-${++ordinal}`, branch: 0 }; stack.push(frame)
      if (action.kind === 'fragmentLabel' && action.id === frame.id && action.branchIndex === 0) return replaceRange(source, line.offset, line.offset + line.text.length, `${line.text.match(/^\s*/)?.[0] ?? ''}${open[1]} ${action.label}`)
    } else if (/^else(?:\s|$)/.test(body)) {
      const frame = stack.at(-1)
      if (frame) frame.branch++
      if (action.kind === 'fragmentLabel' && action.id === frame?.id && action.branchIndex === frame.branch) return replaceRange(source, line.offset, line.offset + line.text.length, `${line.text.match(/^\s*/)?.[0] ?? ''}else ${action.label}`)
    } else if (body === 'end') stack.pop()
  }
  throw new Error('This sequence condition or box no longer exists.')
}
export function editInspector(source: string, graph: DiagramGraph, action: InspectorAction): string {
  if (action.kind === 'nodeProperties') return patchC4Properties(source, graph, action)
  if (action.kind === 'erAttributes') return patchAttributes(source, graph, action)
  if (action.kind === 'fragmentLabel' || graph.sequence) return patchSequence(source, graph, action)
  if (graph.c4) return patchC4Properties(source, graph, action)
  return patchFlowGroup(source, graph, action)
}
