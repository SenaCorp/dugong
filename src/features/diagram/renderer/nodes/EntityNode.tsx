import { Fragment, memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FlowNode } from '../../layout/flowTypes'
import type { ERAttribute } from '../../types/diagram'
import { groupThemeStyle } from '../groupThemes'

const positions = { NORTH: Position.Top, EAST: Position.Right, SOUTH: Position.Bottom, WEST: Position.Left }

export function EntityCard({ label, attributes }: { label: string; attributes: ERAttribute[] }) {
  return <div className="entity-surface">
    <header className="entity-heading"><span>TABLE</span><strong title={label}>{label}</strong></header>
    {attributes.length ? <table className="entity-attributes" aria-label={`${label} attributes`}>
      <thead><tr><th>Field</th><th>Type</th><th>Key</th></tr></thead>
      <tbody>{attributes.map(attribute => <Fragment key={attribute.name}>
        <tr><td title={attribute.name}>{attribute.name}</td><td title={attribute.type}>{attribute.type}</td><td><span className="entity-key">{attribute.keys.join(' · ')}</span></td></tr>
        {attribute.comment && <tr className="entity-comment"><td colSpan={3}>{attribute.comment}</td></tr>}
      </Fragment>)}</tbody>
    </table> : <p className="entity-no-attributes">No attributes declared</p>}
    <footer className="entity-footer">{attributes.length} {attributes.length === 1 ? 'field' : 'fields'}</footer>
  </div>
}

export const EntityNode = memo(function EntityNode({ data }: NodeProps<FlowNode>) {
  return <div className={`diagram-node diagram-node--entity ${data.highlighted ? 'is-highlighted' : ''} ${data.hovered ? 'is-hovered' : ''} ${data.dimmed ? 'is-dimmed' : ''}`} style={groupThemeStyle(data.theme)}>
    <EntityCard label={data.label} attributes={data.er?.attributes ?? []} />
    {data.ports.map(port => <Handle key={port.id} id={port.id} type={port.type} position={positions[port.side]} isConnectable={false}
      style={{ left: port.x, top: port.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }} />)}
  </div>
})
