import type { DiagramEdge, ERAttribute, ERCardinality } from '../types/diagram'

function readQuoted(source: string) {
  let value = '', cursor = 1
  while (cursor < source.length && source[cursor] !== '"') {
    const character = source[cursor++]
    if (character === '\\') {
      if (cursor >= source.length) throw new Error('Close the quoted ER label.')
      value += source[cursor++]
    } else value += character
  }
  if (source[cursor++] !== '"') throw new Error('Close the quoted ER label.')
  return { value, cursor }
}

export function readEntity(source: string) {
  const text = source.trimStart()
  const name = text.startsWith('"') ? readQuoted(text) : (() => {
    const match = /^[A-Za-z_][\w-]*/.exec(text)
    if (!match) throw new Error('Use an entity ID or a quoted entity name.')
    return { value: match[0], cursor: match[0].length }
  })()
  if (!name.value.trim()) throw new Error('Entity names cannot be empty.')
  let rest = text.slice(name.cursor).trimStart(), label = name.value
  if (rest.startsWith('[')) {
    rest = rest.slice(1).trimStart()
    if (rest.startsWith('"')) {
      const alias = readQuoted(rest)
      label = alias.value; rest = rest.slice(alias.cursor).trimStart()
      if (!rest.startsWith(']')) throw new Error('Close the entity alias with ].')
      rest = rest.slice(1).trimStart()
    } else {
      const end = rest.indexOf(']')
      if (end < 0) throw new Error('Close the entity alias with ].')
      label = rest.slice(0, end).trim(); rest = rest.slice(end + 1).trimStart()
    }
    if (!label) throw new Error('Entity aliases cannot be empty.')
  }
  return { id: name.value, label, rest }
}

const leftCardinalities: Record<string, ERCardinality> = { '||': 'one', '|o': 'zero-or-one', '}|': 'one-or-many', '}o': 'zero-or-many' }
const rightCardinalities: Record<string, ERCardinality> = { '||': 'one', 'o|': 'zero-or-one', '|{': 'one-or-many', 'o{': 'zero-or-many' }

export function parseERRelationship(source: string) {
  const from = readEntity(source)
  const operator = /^(\|\||\|o|\}\||\}o)\s*(--|\.\.)\s*(\|\||o\||\|\{|o\{)\s*/.exec(from.rest)
  if (!operator) throw new Error('Use an ER relationship such as CUSTOMER ||--o{ ORDER : places.')
  const to = readEntity(from.rest.slice(operator[0].length))
  if (!to.rest.startsWith(':')) throw new Error('Add : followed by the relationship label.')
  const text = to.rest.slice(1).trim()
  let label = text
  if (text.startsWith('"')) {
    const quoted = readQuoted(text)
    if (text.slice(quoted.cursor).trim()) throw new Error('Remove text after the quoted relationship label.')
    label = quoted.value
  }
  if (!label) throw new Error('Relationship labels cannot be empty.')
  const edge: Omit<DiagramEdge, 'id'> = {
    source: from.id, target: to.id, label,
    er: { sourceCardinality: leftCardinalities[operator[1]], targetCardinality: rightCardinalities[operator[3]], identifying: operator[2] === '--' },
  }
  return { from, to, edge }
}

export function parseERAttribute(source: string): ERAttribute {
  const match = /^(\S+)\s+(\S+)(?:\s+(.*))?$/.exec(source)
  if (!match) throw new Error('Use type attributeName, optionally followed by PK, FK, UK and a quoted comment.')
  const [, type, originalName, remaining = ''] = match
  const name = originalName.startsWith('*') ? originalName.slice(1) : originalName
  if (!/^[A-Za-z][\w()[\],-]*\??$/.test(type) || !/^[A-Za-z_][\w-]*$/.test(name)) throw new Error('Use valid ER attribute types and names.')
  const quote = remaining.indexOf('"')
  const keyText = (quote >= 0 ? remaining.slice(0, quote) : remaining).trim()
  const keys: ERAttribute['keys'] = originalName.startsWith('*') ? ['PK'] : []
  if (keyText) for (const key of keyText.split(',').map(value => value.trim())) {
    if (key !== 'PK' && key !== 'FK' && key !== 'UK') throw new Error('Attribute keys must be PK, FK, or UK, separated by commas.')
    if (!keys.includes(key)) keys.push(key)
  }
  let comment: string | undefined
  if (quote >= 0) {
    const quoted = readQuoted(remaining.slice(quote))
    if (remaining.slice(quote + quoted.cursor).trim()) throw new Error('Remove text after the attribute comment.')
    comment = quoted.value
  }
  return { type, name, keys, ...(comment ? { comment } : {}) }
}
