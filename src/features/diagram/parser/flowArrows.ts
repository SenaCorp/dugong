import type { FlowConnection } from '../types/diagram'

export function readFlowArrow(source: string, start: number) {
  let cursor = start
  let startMarker: FlowConnection['startMarker'] = 'none'
  if (['<', 'o', 'x'].includes(source[cursor])) {
    startMarker = source[cursor] === '<' ? 'arrow' : source[cursor] === 'o' ? 'circle' : 'cross'
    cursor++
  }
  const bodyStart = cursor
  while (cursor < source.length && ['-', '=', '.', '~'].includes(source[cursor])) cursor++
  const body = source.slice(bodyStart, cursor)
  let endMarker: FlowConnection['endMarker'] = 'none'
  if (['>', 'o', 'x'].includes(source[cursor])) {
    endMarker = source[cursor] === '>' ? 'arrow' : source[cursor] === 'o' ? 'circle' : 'cross'
    cursor++
  }
  const marked = startMarker !== 'none' || endMarker !== 'none'
  let line: FlowConnection['line']
  if (/^-\.+-$/.test(body)) line = 'dotted'
  else if (/^={2,}$/.test(body) && (marked || body.length >= 3)) line = 'thick'
  else if (/^-{2,}$/.test(body) && (marked || body.length >= 3)) line = marked ? 'dashed' : 'solid'
  else if (/^~{3,}$/.test(body) && !marked) line = 'invisible'
  else return null
  const flow: FlowConnection = { line, startMarker, endMarker }
  return { end: cursor, flow: line === 'dashed' && startMarker === 'none' && endMarker === 'arrow' ? undefined : flow }
}
