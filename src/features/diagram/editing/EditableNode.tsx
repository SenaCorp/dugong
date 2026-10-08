import { memo, type ComponentType } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { DiagramNodeShape } from '../types/diagram'
import type { FlowNode } from '../layout/flowTypes'
import { perimeterPort } from '../renderer/nodeGeometry'
import { diagramStyle } from '../renderer/diagramStyle'
import { useEditing } from './EditingContext'

export function editableNode(Component: ComponentType<NodeProps<FlowNode>>) {
  return memo(function EditableNode(props: NodeProps<FlowNode>) {
    const editing = useEditing()
    const width = props.width ?? 190, height = props.height ?? 82
    const shape: DiagramNodeShape = props.data.shape === 'group' || props.data.shape === 'frame' || props.data.shape === 'lifeline' ? 'rectangle' : props.data.shape
    const source = perimeterPort(shape, width, height, { x: width, y: height / 2 }, 'EAST')
    const target = perimeterPort(shape, width, height, { x: 0, y: height / 2 }, 'WEST')
    return <div style={diagramStyle(props.data.style, props.data.theme)} className={`editable-node ${editing?.selectedId === props.id ? 'is-selected' : ''}`}>
      <Component {...props} />
      {!editing?.disabled && <>
        <Handle className="visual-handle visual-handle--target" id=":create-in" type="target" position={Position.Left} style={{ left: target.x, top: target.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }} isConnectable />
        <Handle className="visual-handle visual-handle--source" id=":create-out" type="source" position={Position.Right} style={{ left: source.x, top: source.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }} isConnectable />
      </>}
    </div>
  })
}
