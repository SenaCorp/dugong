import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import type { C4Element } from '../../types/diagram'
import { groupThemeStyle } from '../groupThemes'

const positions = { NORTH: Position.Top, EAST: Position.Right, SOUTH: Position.Bottom, WEST: Position.Left }

export function C4Card({ label, element }: { label: string; element: C4Element }) {
  const caption = element.kind === 'database' || element.kind === 'queue' ? `${element.level} · ${element.kind}` : element.level
  return <div className={`component-surface c4-surface c4-${element.kind} ${element.external ? 'is-external' : ''}`}>
    <div className="c4-caption"><span>{caption}</span>{element.external && <span className="c4-external">External</span>}</div>
    <div className="c4-name">{label}</div>
    {element.technology && <div className="c4-technology">{element.technology}</div>}
    {element.description && <p className="c4-description">{element.description}</p>}
  </div>
}

export const C4Node = memo(function C4Node({ data }: NodeProps<FlowNode>) {
  if (!data.c4) return null
  return <div className={`diagram-node diagram-node--c4 ${data.highlighted ? 'is-highlighted' : ''} ${data.hovered ? 'is-hovered' : ''} ${data.dimmed ? 'is-dimmed' : ''}`} style={groupThemeStyle(data.theme)}>
    <C4Card label={data.label} element={data.c4} />
    {data.ports.map(port => <Handle key={port.id} id={port.id} type={port.type} position={positions[port.side]} isConnectable={false}
      style={{ left: port.x, top: port.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }} />)}
  </div>
})
