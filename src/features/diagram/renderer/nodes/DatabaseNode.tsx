import type { NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import { DiagramNode } from './DiagramNode'

export function DatabaseNode(props: NodeProps<FlowNode>) {
  return <DiagramNode {...props} />
}
