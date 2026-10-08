export interface C4Statement { source: string; line: number }

export function* c4Statements(source: string): Generator<C4Statement> {
  let buffer = '', depth = 0, quote = '', escaped = false, start = 1
  for (const [index, original] of source.split(/\r?\n/).entries()) {
    if (!buffer && (!original.trim() || original.trim().startsWith('%%'))) continue
    if (!buffer) start = index + 1
    let content = ''
    for (let i = 0; i < original.length; i++) {
      const char = original[i]
      if (!quote && original.startsWith('%%', i)) break
      content += char
      if (escaped) { escaped = false; continue }
      if (quote) {
        if (char === '\\') escaped = true
        else if (char === quote) quote = ''
      } else if (char === '"' || char === "'") quote = char
      else if (char === '(') depth++
      else if (char === ')') depth--
    }
    buffer += (buffer ? '\n' : '') + content
    if (!quote && depth <= 0) { yield { source: buffer.trim(), line: start }; buffer = ''; depth = 0 }
  }
  if (buffer.trim()) yield { source: buffer.trim(), line: start }
}

export function parseC4Call(source: string) {
  const open = source.indexOf('(')
  const name = source.slice(0, open).trim()
  if (open < 1 || !/^[A-Za-z_][\w]*$/.test(name)) throw new Error('Use a C4 declaration such as System(api, "API").')
  const args: string[] = []
  let cursor = open + 1
  const whitespace = () => { while (/\s/.test(source[cursor] ?? '') && cursor < source.length) cursor++ }
  while (cursor < source.length) {
    whitespace()
    if (source[cursor] === ')') break
    let value = ''
    const quote = source[cursor] === '"' || source[cursor] === "'" ? source[cursor++] : null
    if (quote) {
      while (cursor < source.length && source[cursor] !== quote) {
        const char = source[cursor++]
        if (char === '\\') {
          const escaped = source[cursor++]
          if (escaped === undefined) throw new Error('Unclosed quoted C4 argument.')
          value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped
        } else value += char
      }
      if (source[cursor++] !== quote) throw new Error('Unclosed quoted C4 argument.')
    } else {
      while (cursor < source.length && ![',', ')'].includes(source[cursor])) value += source[cursor++]
      value = value.trim()
      if (!/^[A-Za-z_0-9][\w-]*$/.test(value)) throw new Error('Use positional arguments; quote labels and descriptions.')
    }
    args.push(value.replace(/<br\s*\/?\s*>/gi, '\n'))
    whitespace()
    if (source[cursor] === ')') break
    if (source[cursor++] !== ',') throw new Error('Separate C4 arguments with commas.')
    whitespace()
    if (source[cursor] === ')') throw new Error('Remove the trailing argument comma.')
  }
  if (source[cursor++] !== ')') throw new Error('Close the C4 declaration with ).')
  const rest = source.slice(cursor).trim()
  if (rest && rest !== '{') throw new Error('Write one C4 declaration per line.')
  return { name, args, boundary: rest === '{' }
}
