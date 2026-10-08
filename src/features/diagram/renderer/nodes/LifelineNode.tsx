import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import { groupThemeStyle } from '../groupThemes'

export const LifelineNode = memo(function LifelineNode({ data }: NodeProps<FlowNode>) {
  return <div aria-hidden="true" className={`sequence-lifeline ${data.highlighted ? 'is-highlighted' : ''} ${data.dimmed ? 'is-dimmed' : ''}`} style={groupThemeStyle(data.theme)} />
})
