import { SelectControl } from './SelectControl'
import { useState } from 'react'
import { Panel, useViewport } from '@xyflow/react'
import { useEditing, type EditTarget } from '../features/diagram/editing/EditingContext'
import type { LayoutDiagram } from '../features/diagram/layout/flowTypes'
import { absolutePositions } from '../features/diagram/editing/manualLayout'
import type { DiagramNodeShape } from '../features/diagram/types/diagram'

const SHAPES: { value: DiagramNodeShape; label: string }[] = [
  { value: 'rectangle', label: 'Rectangle' }, { value: 'rounded', label: 'Rounded' }, { value: 'diamond', label: 'Decision' },
  { value: 'database', label: 'Database' }, { value: 'stadium', label: 'Stadium' }, { value: 'circle', label: 'Circle' },
  { value: 'doubleCircle', label: 'Double circle' }, { value: 'hexagon', label: 'Hexagon' }, { value: 'parallelogram', label: 'Parallelogram' },
  { value: 'trapezoid', label: 'Trapezoid' }, { value: 'subroutine', label: 'Subroutine' },
]
function WordingEditor({ target }: { target: EditTarget }) {
  const editing = useEditing()!
  const [label, setLabel] = useState(target.label)
  const viewport = useViewport()
  const save = () => { if (editing.disabled) return; if (editing.apply({ kind: target.kind, id: target.id, label })) editing.close() }
  return <form className="wording-editor nodrag nopan nowheel" aria-label="Edit wording" style={{ left: `clamp(12px, ${target.anchor.x * viewport.zoom + viewport.x}px, calc(100% - 292px))`, top: `clamp(12px, ${target.anchor.y * viewport.zoom + viewport.y}px, calc(100% - 192px))` }} onSubmit={event => { event.preventDefault(); save() }}>
    <label htmlFor="canvas-wording">{target.kind === 'edgeLabel' ? 'Connection label' : target.kind === 'noteLabel' ? 'Note wording' : 'Node wording'}</label>
    <textarea id="canvas-wording" autoFocus value={label} onChange={event => setLabel(event.target.value)} onFocus={event => event.target.select()} onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); editing.close() }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() }
    }} />
    <div><small>Enter saves · Esc cancels</small><button type="button" className="tool-button" onClick={editing.close}>Cancel</button><button type="submit" className="tool-button" disabled={editing.disabled || !label.trim()}>Save</button></div>
  </form>
}
export function CanvasEditingTools({ layout }: { layout: LayoutDiagram }) {
  const editing = useEditing()!
  const node = layout.nodes.find(node => node.id === editing.selectedId)
  const isFlowchart = !layout.kind
  return <>
    {node && !['group', 'sequenceFrame', 'sequenceBox'].includes(node.type!) && !editing.target && !editing.inspecting && <Panel position="bottom-center" className="node-edit-toolbar nodrag nopan">
      <span>{node.id}</span>
      <button className="tool-button" disabled={editing.disabled} onClick={() => {
        const position = absolutePositions(layout.nodes)[node.id]
        editing.open({ kind: 'nodeLabel', id: node.id, label: node.data.label, anchor: { x: position.x, y: position.y + Number(node.style?.height) + 12 } })
      }}>Edit wording</button>
      {isFlowchart && <>
        <SelectControl aria-label="Node shape" className="tool-button" disabled={editing.disabled} value={node.data.shape} onChange={event => editing.apply({ kind: 'shape', id: node.id, shape: event.target.value as DiagramNodeShape })}>
          {SHAPES.map(shape => <option key={shape.value} value={shape.value}>{shape.label}</option>)}
        </SelectControl>
        <label className="node-color-control" title="Node fill color">Fill<input aria-label="Node fill color" type="color" disabled={editing.disabled} value={/^#[\da-f]{6}$/i.test(node.data.style?.fill ?? '') ? node.data.style!.fill : layout.theme === 'dark' ? '#27322e' : '#fffefa'} onChange={event => editing.apply({ kind: 'color', id: node.id, color: event.target.value })} /></label>
      </>}
      <button className="tool-button" disabled={editing.disabled} onClick={editing.inspect}>Inspect</button>
      <button className="tool-button" disabled={editing.disabled} onClick={() => editing.apply({ kind: 'duplicateNode', id: node.id })}>Duplicate</button>
      <button className="tool-button delete-element" disabled={editing.disabled} onClick={() => { if (editing.apply({ kind: 'deleteNode', id: node.id })) editing.select(null) }}>Delete</button>
      <button className="tool-button" onClick={() => editing.select(null)} aria-label="Clear selection">×</button>
    </Panel>}
    {editing.target && <WordingEditor key={`${editing.target.kind}:${editing.target.id}:${editing.target.label}`} target={editing.target} />}
  </>
}
