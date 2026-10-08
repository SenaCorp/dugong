import { describe, expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

describe('additional silhouettes', () => {
  it.each([
    ['A([Start])', 'stadium'], ['A((Event))', 'circle'], ['A(((Done)))', 'doubleCircle'],
    ['A{{Prepare}}', 'hexagon'], ['A[/Input/]', 'parallelogram'], ['A[/Manual\\]', 'trapezoid'], ['A[[Process]]', 'subroutine'],
  ])('parses %s', (source, shape) => {
    const result = parseDiagram(`flowchart LR\n${source} --> B`)
    expect(result.errors).toEqual([])
    expect(result.graph.nodes[0].shape).toBe(shape)
    expect(result.graph.edges).toHaveLength(1)
  })
  it('retains style assignments on new shapes', () => {
    const result = parseDiagram('flowchart TD\nA((Event)):::event\nclassDef event fill:#abc')
    expect(result.errors).toEqual([])
    expect(result.graph.nodes[0].style?.fill).toBe('#abc')
  })
})
describe('source theme configuration', () => {
  it.each(['flowchart LR\nA --> B', 'sequenceDiagram\nA->>B: hello', 'erDiagram\nUSER {\nint id PK\n}', 'C4Context\nPerson(user, "User")'])('supports frontmatter before every diagram type', body => {
    const result = parseDiagram(`---\nconfig:\n  theme: dark\n---\n${body}`)
    expect(result.errors).toEqual([])
    expect(result.graph.theme).toBe('dark')
  })
  it('supports a JSON init directive', () => {
    expect(parseDiagram('%%{init: {"theme":"dark"}}%%\nflowchart LR\nA').graph.theme).toBe('dark')
  })
  it('preserves error line numbers', () => {
    expect(parseDiagram('---\nconfig:\n  theme: light\n---\nflowchart LR\nA -->> B').errors[0].line).toBe(6)
  })
  it('reports invalid themes and malformed config', () => {
    expect(parseDiagram('---\ntheme: nope\n---\nflowchart LR\nA').errors[0].message).toContain('themes')
    expect(parseDiagram('%%{init: {theme:dark}}%%\nflowchart LR\nA').errors[0].message).toContain('JSON')
    expect(parseDiagram('---\nconfig:\n theme: dark').errors.some(error => error.message.includes('Frontmatter'))).toBe(true)
  })
})
