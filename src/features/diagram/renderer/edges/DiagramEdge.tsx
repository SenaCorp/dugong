import { useEditing } from '../../editing/EditingContext'
import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import type { FlowEdge } from '../../layout/flowTypes'
import { roundedRoute, routeMidpoint } from './routePath'
import { groupThemeStyle } from '../groupThemes'
import { MESSAGE_DURATION } from '../../hooks/useSequencePlayback'
import { FlowEndpoint } from './FlowEndpoint'
import { flowEndpointPoint } from './flowEndpointPoint'
import { ERCardinality } from './ERCardinality'

export const DiagramEdge = memo(function DiagramEdge({ id, data, label, markerEnd, markerStart }: EdgeProps<FlowEdge>) {
  const editing = useEditing()
  if (!data) return null
  const position = data.labelPosition ?? routeMidpoint(data.points)
  const privateClass = label === 'Private' ? 'is-private' : ''
  const sequenceClass = data.sequenceIndex !== undefined ? `is-sequence ${data.dashed ? 'is-response' : ''}` : ''
  if (data.flow?.line === 'invisible') return null
  const flowClass = data.flow ? `flow-line--${data.flow.line}` : ''
  const erClass = data.er ? `is-er ${data.er.identifying ? 'is-identifying' : ''}` : ''
  const className = `diagram-edge ${privateClass} ${sequenceClass} ${erClass} ${flowClass} ${data.active ? 'is-active' : ''} ${data.dimmed ? 'is-dimmed' : ''}`
  const path = roundedRoute(data.points, 12)
  const themeStyle = groupThemeStyle(data.theme)
  return <>
    <g style={themeStyle}>
      {data.active && <path d={path} className="edge-glow" aria-hidden="true" />}
      <BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} className={className} interactionWidth={editing && !editing.disabled ? 16 : 0} />
      {data.active && <path d={path} pathLength={data.playback ? 100 : undefined} className={`edge-light ${data.playback ? 'is-playing' : ''}`} style={data.playback ? { animationDuration: `${MESSAGE_DURATION}ms` } : undefined} aria-hidden="true" />}
      {data.flow && data.points.length > 0 && <>
        <FlowEndpoint marker={data.flow.startMarker} point={flowEndpointPoint(data.points, 'start')} active={data.active} dimmed={data.dimmed} />
        <FlowEndpoint marker={data.flow.endMarker} point={flowEndpointPoint(data.points, 'end')} active={data.active} dimmed={data.dimmed} />
      </>}
      {data.er && data.points.length > 1 && <>
        <ERCardinality cardinality={data.er.sourceCardinality} endpoint={data.points[0]} neighbor={data.points.find(point => point.x !== data.points[0].x || point.y !== data.points[0].y) ?? data.points[0]} active={data.active} dimmed={data.dimmed} />
        <ERCardinality cardinality={data.er.targetCardinality} endpoint={data.points.at(-1)!} neighbor={[...data.points].reverse().find(point => point.x !== data.points.at(-1)!.x || point.y !== data.points.at(-1)!.y) ?? data.points.at(-1)!} active={data.active} dimmed={data.dimmed} />
      </>}
    </g>
    {label && <EdgeLabelRenderer>
      <span className={`edge-label nodrag nopan ${privateClass} ${sequenceClass} ${data.active ? 'is-active' : ''} ${data.dimmed ? 'is-dimmed' : ''}`}
        onDoubleClick={event => {
          event.stopPropagation()
          editing?.open({ kind: 'edgeLabel', id, label: data.sourceLabel ?? '', anchor: position })
        }}
        style={{ ...themeStyle, transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)` }}>{label}</span>
    </EdgeLabelRenderer>}
  </>
})
