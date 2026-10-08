import { SelectControl } from './SelectControl'
import { useState } from 'react'
import type { DiagramGraph, DiagramNode, DiagramGroup, SequenceBox, SequenceFragment } from '../features/diagram/types/diagram'
import type { SourceEdit } from '../features/diagram/editing/editSource'
import { ERAttributeFields } from './ERAttributeFields'

type InspectorItem = { kind: 'node'; node: DiagramNode } | { kind: 'group'; group: DiagramGroup | SequenceBox } | { kind: 'fragment'; fragment: SequenceFragment }
interface InspectorProps {
  graph: DiagramGraph
  selectedId: string | null
  revision: number
  disabled: boolean
  onSelect: (id: string) => void
  onApply: (edit: SourceEdit) => boolean
  onClose: () => void
}
function itemId(item: InspectorItem) { return item.kind === 'node' ? item.node.id : item.kind === 'group' ? item.group.id : item.fragment.id }
function itemLabel(item: InspectorItem) { return item.kind === 'node' ? item.node.label : item.kind === 'group' ? item.group.label : `${item.fragment.kind} · ${item.fragment.branches[0]?.label}` }
function InspectorForm({ item, branchIndex, disabled, onApply, onClose }: { item: InspectorItem; branchIndex: number; disabled: boolean; onApply: InspectorProps['onApply']; onClose: () => void }) {
  const node = item.kind === 'node' ? item.node : null
  const initialLabel = item.kind === 'fragment' ? item.fragment.branches[branchIndex].label : itemLabel(item)
  const [label, setLabel] = useState(initialLabel)
  const [technology, setTechnology] = useState(node?.c4?.technology ?? '')
  const [description, setDescription] = useState(node?.c4?.description ?? '')
  const [attributes, setAttributes] = useState(node?.er?.attributes ?? [])
  const submit = () => {
    if (disabled) return
    const id = itemId(item)
    const action: SourceEdit = item.kind === 'fragment' ? { kind: 'fragmentLabel', id, branchIndex, label }
      : item.kind === 'group' ? { kind: 'groupLabel', id, label }
      : node?.c4 ? { kind: 'nodeProperties', id, label, technology, description }
      : node?.er ? { kind: 'erAttributes', id, label, attributes } : { kind: 'nodeLabel', id, label }
    onApply(action)
  }
  return <form onSubmit={event => { event.preventDefault(); submit() }} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') onClose() }}>
    <fieldset disabled={disabled}>
      <label className="inspector-field">{item.kind === 'fragment' ? 'Condition' : item.kind === 'group' ? 'Group name' : node?.er ? 'Table alias' : 'Name'}
        <textarea rows={2} value={label} onChange={event => setLabel(event.target.value)} />
      </label>
      {node?.c4 && <>
        {['container', 'component'].includes(node.c4.level) && <label className="inspector-field">Technology<input value={technology} onChange={event => setTechnology(event.target.value)} /></label>}
        <label className="inspector-field">Description<textarea rows={3} value={description} onChange={event => setDescription(event.target.value)} /></label>
      </>}
      {node?.er && <ERAttributeFields attributes={attributes} onChange={setAttributes} />}
      <div className="inspector-save"><small>One change. Fully undoable.</small><button type="submit" className="tool-button inspector-apply" disabled={!label.trim()}>Apply</button></div>
      {node && <div className="inspector-element-actions">
        <button className="tool-button" type="button" onClick={() => onApply({ kind: 'duplicateNode', id: node.id })}>Duplicate</button>
        <button className="tool-button delete-element" type="button" onClick={() => onApply({ kind: 'deleteNode', id: node.id })}>Delete</button>
      </div>}
    </fieldset>
  </form>
}
function InspectorSelection({ item, ...props }: { item: InspectorItem } & Pick<InspectorProps, 'disabled' | 'onApply' | 'onClose' | 'revision'>) {
  const [branchIndex, setBranchIndex] = useState(0)
  return <>
    {item.kind === 'fragment' && <label className="inspector-field">Branch<SelectControl value={branchIndex} disabled={props.disabled} onChange={event => setBranchIndex(Number(event.target.value))}>
      {item.fragment.branches.map((branch, index) => <option value={index} key={index}>{index === 0 ? item.fragment.kind : 'else'} · {branch.label}</option>)}
    </SelectControl></label>}
    <InspectorForm key={`${props.revision}:${itemId(item)}:${branchIndex}`} item={item} branchIndex={branchIndex} {...props} />
  </>
}
export function DiagramInspector({ graph, selectedId, revision, disabled, onSelect, onApply, onClose }: InspectorProps) {
  const items: InspectorItem[] = [...graph.nodes.map(node => ({ kind: 'node' as const, node })), ...(graph.groups ?? []).map(group => ({ kind: 'group' as const, group })), ...(graph.sequence?.boxes ?? []).map(group => ({ kind: 'group' as const, group })), ...(graph.sequence?.fragments ?? []).map(fragment => ({ kind: 'fragment' as const, fragment }))]
  const item = items.find(item => itemId(item) === selectedId) ?? items[0]
  return <aside className="diagram-inspector nodrag nopan nowheel" aria-label="Diagram inspector" onPointerDown={event => event.stopPropagation()} onWheel={event => event.stopPropagation()}>
    <div className="inspector-header"><div><span className="eyebrow">PROPERTIES</span><strong>Inspector</strong></div><button className="tool-button" aria-label="Close inspector" onClick={onClose}>×</button></div>
    {item ? <div className="inspector-body">
      <label className="inspector-field">Element<SelectControl disabled={disabled} aria-label="Inspect element" value={itemId(item)} onChange={event => onSelect(event.target.value)}>
        {items.map(item => <option key={itemId(item)} value={itemId(item)}>{itemId(item)} · {itemLabel(item)}</option>)}
      </SelectControl></label>
      <InspectorSelection key={`${revision}:${itemId(item)}`} item={item} revision={revision} disabled={disabled} onApply={onApply} onClose={onClose} />
    </div> : <p className="inspector-empty">Add a node to inspect its properties.</p>}
  </aside>
}
