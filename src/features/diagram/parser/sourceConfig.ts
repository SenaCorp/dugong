import type { ParserError } from '../types/diagram'

/** Only theme is interpreted; other Mermaid configuration remains intentionally inert. */
export function parseSourceConfig(source: string) {
  const lines = source.split(/\r?\n/)
  const errors: ParserError[] = []
  let theme: 'light' | 'dark' | undefined
  const setTheme = (value: string, index: number) => {
    const name = value.trim().replace(/^['"]|['"]$/g, '')
    if (name === 'dark') theme = 'dark'
    else if (['light', 'default', 'base', 'neutral', 'redux', 'redux-color', 'forest'].includes(name)) theme = 'light'
    else errors.push({ line: index + 1, source: lines[index], message: 'Supported preview themes: light or dark.' })
  }
  const first = lines.findIndex(line => line.trim() && !line.trim().startsWith('%%'))
  if (first >= 0 && lines[first].trim() === '---') {
    const end = lines.findIndex((line, index) => index > first && line.trim() === '---')
    if (end < 0) errors.push({ line: first + 1, source: lines[first], message: 'Frontmatter must end with ---.' })
    for (let index = first; index <= (end < 0 ? lines.length - 1 : end); index++) {
      const match = /^\s*theme\s*:\s*([^#]+?)(?:\s+#.*)?$/.exec(lines[index])
      if (match) setTheme(match[1], index)
      lines[index] = ''
    }
  }
  lines.forEach((line, index) => {
    const match = /^\s*%%\{init:\s*(.*?)\}%%\s*$/.exec(line)
    if (!match) return
    try {
      const config: unknown = JSON.parse(match[1])
      if (config && typeof config === 'object' && 'theme' in config) {
        if (typeof config.theme !== 'string') throw new Error('Theme must be a string.')
        setTheme(config.theme, index)
      }
    } catch {
      errors.push({ line: index + 1, source: line, message: 'Use valid JSON in the init directive, for example {"theme":"dark"}.' })
    }
    lines[index] = ''
  })
  return { source: lines.join('\n'), theme, errors }
}
