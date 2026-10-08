import { useEditing } from '../../editing/EditingContext'
import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'

export const SequenceFrameNode = memo(function SequenceFrameNode({ data }: NodeProps<FlowNode>) {
  const editing = useEditing()
  const frame = data.sequenceFrame
  if (!frame) return null
  return <div className="sequence-frame" aria-label={`${frame.kind} sequence block`}>
    {frame.branches.map((branch, index) => <div key={index} className={`sequence-branch ${index ? 'is-alternative' : ''}`} style={{ top: branch.y }}>
      {!index && <span className="sequence-fragment-kind">{frame.kind}</span>}
      <span className="sequence-condition">{editing?.inspect ? <button type="button" className="group-edit-label nodrag nopan" aria-label={`Inspect ${frame.kind} condition`} onClick={() => { editing.select(frame.fragmentId); editing.inspect?.() }}>[{branch.label}]</button> : `[${branch.label}]`}</span>
    </div>)}
  </div>
})
