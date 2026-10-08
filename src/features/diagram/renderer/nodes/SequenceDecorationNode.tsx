import { useEditing } from '../../editing/EditingContext'
import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import { groupThemeStyle } from '../groupThemes'

export const SequenceDecorationNode = memo(function SequenceDecorationNode({ id, type, data }: NodeProps<FlowNode>) {
  const editing = useEditing()
  const classes = `sequence-decoration ${data.highlighted ? 'is-highlighted' : ''} ${data.dimmed ? 'is-dimmed' : ''}`
  const style = groupThemeStyle(data.theme)
  if (type === 'activation') return <div className={`${classes} sequence-activation`} style={style} aria-label={`${data.label} activation`} />
  if (type === 'sequenceBox') return <div className={`${classes} sequence-box`} style={{ ...style, ...(data.boxColor ? { backgroundColor: data.boxColor } : {}) }}><span>{editing?.inspect ? <button type="button" className="group-edit-label nodrag nopan" aria-label={`Inspect ${data.label} box`} onClick={() => { editing.select(id.replace(/^:box:/, '')); editing.inspect?.() }}>{data.label}</button> : data.label}</span></div>
  return <div className={`${classes} sequence-note ${data.sequenceNote?.placement === 'over' ? 'sequence-note--over' : ''}`} style={style}><small>NOTE</small><p>{data.label}</p></div>
})
