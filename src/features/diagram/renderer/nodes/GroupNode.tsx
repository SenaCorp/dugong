import { useEditing } from '../../editing/EditingContext'
import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import { diagramStyle } from '../diagramStyle'

export const GroupNode = memo(function GroupNode({ id, data }: NodeProps<FlowNode>) {
  const editing = useEditing()
  return <div className={`diagram-group ${data.style?.strokeDasharray ? 'has-dashed-border' : ''} ${data.c4Group ? 'c4-group' : ''} ${data.highlighted ? 'is-highlighted' : ''}`} style={diagramStyle(data.style, data.theme)}>
    {data.c4Group && <div className="c4-group-caption">{data.c4Group.type}</div>}
    <div className="group-heading"><span>{editing?.inspect ? <button type="button" className="group-edit-label nodrag nopan" aria-label={`Inspect ${data.label} group`} onClick={() => { editing.select(id); editing.inspect?.() }}>{data.label}</button> : data.label}</span>{Boolean(data.memberCount) && <small>{data.memberCount}</small>}</div>
    {data.c4Group?.description && <p className="c4-group-description">{data.c4Group.description}</p>}
  </div>
})
