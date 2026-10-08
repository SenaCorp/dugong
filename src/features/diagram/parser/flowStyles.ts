import type { DiagramStyle, ParserError } from '../types/diagram'

function splitProperties(source: string) {
  const properties: string[] = []
  let current = '', depth = 0
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (char === '\\' && source[i + 1] === ',') { current += ' '; i++; continue }
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) { properties.push(current); current = '' } else current += char
  }
  properties.push(current)
  return properties
}
function color(value: string) {
  if (/^#[\da-f]{3,4}$|^#[\da-f]{6}$|^#[\da-f]{8}$|^[a-z]+$|^(?:rgb|rgba|hsl|hsla)\([\d.,%\s+-]+\)$/i.test(value)) return value
  throw new Error('Use a CSS color such as #eef3fb, royalblue, or rgb(50, 80, 100).')
}
function parseStyle(source: string): DiagramStyle {
  const style: DiagramStyle = {}
  for (const property of splitProperties(source.replace(/;$/, ''))) {
    const colon = property.indexOf(':')
    if (colon < 0) throw new Error('Write style properties as fill:#eef,stroke:#456.')
    const key = property.slice(0, colon).trim(), value = property.slice(colon + 1).trim()
    if (key === 'fill' || key === 'stroke' || key === 'color') style[key] = color(value)
    else if (key === 'stroke-width') {
      if (!/^\d+(?:\.\d+)?(?:px)?$/.test(value) || Number.parseFloat(value) < .5 || Number.parseFloat(value) > 8) throw new Error('stroke-width must be between 0.5 and 8px.')
      style.strokeWidth = Number.parseFloat(value)
    } else if (key === 'stroke-dasharray') {
      if (!/^\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)*$/.test(value) || !value.split(/\s+/).some(value => Number(value) > 0)) throw new Error('Use positive dash lengths, such as stroke-dasharray:5 3 or 5\\,3.')
      style.strokeDasharray = value.replace(/\s+/g, ' ')
    } else throw new Error(`Style property ${key} is not supported. Use fill, stroke, color, stroke-width, or stroke-dasharray.`)
  }
  return style
}
const names = (source: string) => {
  const values = source.split(',').map(value => value.trim())
  if (values.some(value => !/^[A-Za-z_][\w-]*$/.test(value))) throw new Error('Use comma-separated node IDs or class names.')
  return values
}

export function createFlowStyles() {
  const definitions = new Map<string, DiagramStyle>()
  const assignments: { ids: string[]; classes?: string[]; style?: DiagramStyle; line: number; source: string }[] = []
  return {
    assign(id: string, classes: string[], line: number, source: string) { assignments.push({ ids: [id], classes, line, source }) },
    parse(line: string, lineNumber: number, original: string) {
      const match = /^(classDef|class|style)\s+(\S+)\s+(.+)$/.exec(line)
      if (!match) {
        if (/^(classDef|class|style)\b/.test(line)) throw new Error('Use classDef name properties, class A,B name, or style A properties.')
        return false
      }
      const [, kind, targets, text] = match
      const ids = names(targets)
      if (kind === 'classDef') {
        const style = parseStyle(text)
        for (const id of ids) definitions.set(id, style)
      } else assignments.push({ ids, ...(kind === 'class' ? { classes: names(text.replace(/;$/, '')) } : { style: parseStyle(text) }), line: lineNumber, source: original })
      return true
    },
    resolve(ids: string[]) {
      const known = new Set(ids), styles = new Map<string, DiagramStyle>(), errors: ParserError[] = []
      for (const id of ids) if (definitions.has('default')) styles.set(id, { ...definitions.get('default') })
      for (const assignment of assignments.filter(assignment => assignment.classes)) {
        for (const id of assignment.ids) {
          if (!known.has(id)) { errors.push({ line: assignment.line, source: assignment.source, message: `Unknown node or group ${id} in class assignment.` }); continue }
          for (const className of assignment.classes!) {
            const definition = definitions.get(className)
            if (!definition) errors.push({ line: assignment.line, source: assignment.source, message: `Define class ${className} with classDef.` })
            else styles.set(id, { ...styles.get(id), ...definition })
          }
        }
      }
      for (const assignment of assignments.filter(assignment => assignment.style)) {
        for (const id of assignment.ids) {
          if (!known.has(id)) errors.push({ line: assignment.line, source: assignment.source, message: `Unknown node or group ${id} in style declaration.` })
          else styles.set(id, { ...styles.get(id), ...assignment.style })
        }
      }
      return { styles, errors }
    },
  }
}
