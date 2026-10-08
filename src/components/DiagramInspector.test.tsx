import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiagramInspector } from './DiagramInspector'
import { parseDiagram } from '../features/diagram/parser/parseDiagram'
const props = { revision: 0, disabled: false, onSelect: () => {}, onApply: () => true, onClose: () => {} }
it('shows C4 technology/description and element actions', () => {
  const graph = parseDiagram('C4Container\nContainer(api, "API", "Go", "Handles requests")').graph
  const html = renderToStaticMarkup(<DiagramInspector {...props} graph={graph} selectedId="api" />)
  expect(html).toContain('Technology')
  expect(html).toContain('Description')
  expect(html).toContain('Duplicate')
  expect(html).toContain('Delete')
})
it('shows ER attribute controls and sequence branch conditions', () => {
  const er = parseDiagram('erDiagram\nUSER {\n int id PK\n}').graph
  expect(renderToStaticMarkup(<DiagramInspector {...props} graph={er} selectedId="USER" />)).toContain('Add attribute')
  const sequence = parseDiagram('sequenceDiagram\nalt valid\nA->>B: Login\nelse invalid\nB-->>A: Error\nend').graph
  const html = renderToStaticMarkup(<DiagramInspector {...props} graph={sequence} selectedId="fragment-1" />)
  expect(html).toContain('Branch')
  expect(html).toContain('Condition')
  expect(html).not.toContain('Duplicate')
})
it('shows a useful empty inspector and disables changes while preview is invalid', () => {
  const graph = parseDiagram('flowchart LR').graph
  expect(renderToStaticMarkup(<DiagramInspector {...props} graph={graph} selectedId={null} />)).toContain('Add a node')
  const node = parseDiagram('flowchart LR\nA').graph
  expect(renderToStaticMarkup(<DiagramInspector {...props} disabled graph={node} selectedId="A" />)).toContain('<fieldset disabled=""')
})
