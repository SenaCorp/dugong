import type { DiagramNode, DiagramNodeShape } from '../types/diagram'

export interface ParsedNode {
  node: DiagramNode
  explicit: boolean
  end: number
  classNames?: string[]
  start?: number
  definitionEnd?: number
}

export function skipWhitespace(source: string, start: number): number {
  let cursor = start
  while (cursor < source.length && /\s/.test(source[cursor])) cursor++
  return cursor
}

function readLabel(source: string, start: number, closing: string): { label: string; end: number } {
  let cursor = start
  let quote = ''
  while (cursor < source.length) {
    const char = source[cursor]
    if (char === '\\' && quote) { cursor += 2; continue }
    if (quote) {
      if (char === quote) quote = ''
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (source.startsWith(closing, cursor)) {
      let label = source.slice(start, cursor).trim()
      if ((label.startsWith('"') && label.endsWith('"')) || (label.startsWith("'") && label.endsWith("'"))) {
        if (label.startsWith('"')) {
          try { label = JSON.parse(label) as string }
          catch { label = label.slice(1, -1).replace(/\\([\\"'])/g, '$1') }
        } else label = label.slice(1, -1).replace(/\\([\\'])/g, '$1')
      }
      if (!label.trim()) throw new Error('Node labels cannot be empty.')
      return { label, end: cursor + closing.length }
    }
    cursor++
  }
  throw new Error(`Missing closing ${closing} for node label.`)
}

export function parseInlineNode(source: string, start = 0): ParsedNode {
  const finish = (parsed: ParsedNode): ParsedNode => {
    parsed = { ...parsed, start: idStart, definitionEnd: parsed.end }
    const position = skipWhitespace(source, parsed.end)
    if (!source.startsWith(':::', position)) return parsed
    const match = /^[A-Za-z_][\w-]*(?:,[A-Za-z_][\w-]*)*/.exec(source.slice(position + 3))
    if (!match) throw new Error('Put a class name after :::.')
    return { ...parsed, classNames: match[0].split(','), end: position + 3 + match[0].length }
  }
  let cursor = skipWhitespace(source, start)
  const idStart = cursor
  if (!/[a-zA-Z_]/.test(source[cursor] ?? '')) throw new Error('Expected a node ID, such as A or api_gateway.')
  while (cursor < source.length && /[a-zA-Z0-9_-]/.test(source[cursor]) && !source.startsWith('--', cursor) && !source.startsWith('-.', cursor)) cursor++
  const id = source.slice(idStart, cursor)
  cursor = skipWhitespace(source, cursor)
  const delimiters: [string, string, DiagramNodeShape][] = [
    ['(((', ')))', 'doubleCircle'], ['((', '))', 'circle'], ['([', '])', 'stadium'],
    ['[[', ']]', 'subroutine'], ['{{', '}}', 'hexagon'],
    ['[/', '/]', 'parallelogram'], ['[/', '\\]', 'trapezoid'],
    ['[(', ')]', 'database'], ['[', ']', 'rectangle'], ['(', ')', 'rounded'], ['{', '}', 'diamond'],
  ]
  for (const [opening, closing, shape] of delimiters) {
    if (source.startsWith(opening, cursor)) {
      if (opening === '[/' && closing === '/]') {
        try {
          const result = readLabel(source, cursor + opening.length, closing)
          return finish({ node: { id, label: result.label, shape }, explicit: true, end: result.end })
        } catch {
          const result = readLabel(source, cursor + opening.length, '\\]')
          return finish({ node: { id, label: result.label, shape: 'trapezoid' }, explicit: true, end: result.end })
        }
      }
      const result = readLabel(source, cursor + opening.length, closing)
      return finish({ node: { id, label: result.label, shape }, explicit: true, end: result.end })
    }
  }
  return finish({ node: { id, label: id, shape: 'rectangle' }, explicit: false, end: cursor })
}

export function parseNodeDefinition(source: string): ParsedNode {
  const parsed = parseInlineNode(source)
  if (source.slice(parsed.end).trim()) throw new Error('Unexpected text after node. Use A[Label] or A --> B.')
  return parsed
}
