import { parseEdgeDefinition } from '../parser/parseEdge'
import { parseNodeDefinition, type ParsedNode } from '../parser/parseNode'
import { parseSourceConfig } from '../parser/sourceConfig'

export function sourceLines(source: string) {
  const body = parseSourceConfig(source).source.split('\n')
  let offset = 0
  return source.split(/\r?\n/).map((text, index) => {
    const line = { text, body: body[index], offset, index }
    offset += text.length + (source.slice(offset + text.length).startsWith('\r\n') ? 2 : 1)
    return line
  })
}
export function flowTokens(line: string): ParsedNode[] {
  if (!line.trim() || /^(?:\s*)(flowchart|subgraph|end|classDef|class|style|%%)\b/.test(line)) return []
  try {
    const edge = parseEdgeDefinition(line)
    return edge ? [...edge.sources, ...edge.targets] : [parseNodeDefinition(line)]
  } catch { return [] }
}
export function replaceRange(source: string, start: number, end: number, text: string) {
  return source.slice(0, start) + text + source.slice(end)
}
export function quoted(text: string) { return JSON.stringify(text) }
export function c4ArgumentRanges(text: string) {
  const ranges: { start: number; end: number }[] = []
  let cursor = text.indexOf('(') + 1
  const skip = () => {
    while (cursor < text.length) {
      if (/\s/.test(text[cursor])) cursor++
      else if (text.startsWith('%%', cursor)) { const end = text.indexOf('\n', cursor); cursor = end < 0 ? text.length : end + 1 }
      else break
    }
  }
  while (cursor < text.length) {
    skip()
    if (text[cursor] === ')') break
    const start = cursor, quote = text[cursor] === '"' || text[cursor] === "'" ? text[cursor++] : null
    if (quote) {
      while (cursor < text.length && text[cursor] !== quote) { if (text[cursor] === '\\') cursor++; cursor++ }
      cursor++
    } else while (cursor < text.length && !/[\s,)%]/.test(text[cursor])) cursor++
    ranges.push({ start, end: cursor })
    skip()
    if (text[cursor] !== ',') break
    cursor++
  }
  return ranges
}

// Locate the real closing parenthesis without treating quoted text or comments as syntax.
export function c4CallSpan(text: string) {
  let quote = '', depth = 0, end = -1
  const comments: string[] = []
  for (let cursor = 0; cursor < text.length; cursor++) {
    const char = text[cursor]
    if (quote) { if (char === '\\') cursor++; else if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") { quote = char; continue }
    if (text.startsWith('%%', cursor)) {
      const stop = text.indexOf('\n', cursor)
      comments.push(text.slice(cursor, stop < 0 ? text.length : stop).trimEnd())
      if (stop < 0) break
      cursor = stop; continue
    }
    if (char === '(') depth++
    if (char === ')' && --depth === 0) { end = cursor + 1; break }
  }
  if (end < 0) throw new Error('Cannot locate the end of this C4 call.')
  return { end, comments }
}
