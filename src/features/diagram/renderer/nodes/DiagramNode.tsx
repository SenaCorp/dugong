import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import { ComponentCard } from './ComponentCard'
import { shapePolygon } from '../nodeGeometry'
import { diagramStyle } from '../diagramStyle'

const positions = { NORTH: Position.Top, EAST: Position.Right, SOUTH: Position.Bottom, WEST: Position.Left }

export const DiagramNode = memo(function DiagramNode({ id, data, width = 190, height = 82 }: NodeProps<FlowNode>) {
  const classes = ['diagram-node', `diagram-node--${data.shape}`, data.highlighted ? 'is-highlighted' : '', data.hovered ? 'is-hovered' : '', data.dimmed ? 'is-dimmed' : '', data.style?.strokeDasharray ? 'has-dashed-border' : ''].join(' ')
  const polygon = data.shape !== 'group' && data.shape !== 'lifeline' && data.shape !== 'frame' ? shapePolygon(data.shape) : undefined
  const isComponent = data.shape === 'rectangle' || data.shape === 'rounded'
  return (
    <div className={classes} style={diagramStyle(data.style, data.theme)}>
      {isComponent ? <ComponentCard id={id} label={data.label} kind={data.participantKind} /> : <>
        <svg className="node-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {polygon ? <polygon points={polygon.map(p => `${p.x},${p.y}`).join(' ')} />
            : data.shape === 'database' ? <>
              <path d="M1 16 C1 -3 99 -3 99 16 L99 84 C99 103 1 103 1 84 Z" />
              <path className="database-cap" d="M1 16 C1 35 99 35 99 16" />
            </> : data.shape === 'circle' || data.shape === 'doubleCircle' ? <>
              <ellipse cx="50" cy="50" rx="49" ry="49" />
              {data.shape === 'doubleCircle' && <ellipse cx="50" cy="50" rx="44" ry="44" />}
            </> : <>
              <rect x="1" y="1" width="98" height="98" rx={data.shape === 'stadium' ? Math.min(49, height / width * 49) : 3} ry={data.shape === 'stadium' ? 49 : 3} />
              {data.shape === 'subroutine' && <path d="M8 1V99 M92 1V99" />}
            </>}
        </svg>
        <div className="node-content">
          {id !== data.label && <span className="node-id">{id}</span>}
          <span className="node-label">{data.label}</span>
        </div>
      </>}
      {data.ports.map(port => (
        <Handle key={port.id} id={port.id} type={port.type} position={positions[port.side]} isConnectable={false}
          style={{ left: port.x, top: port.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }} />
      ))}
    </div>
  )
})
