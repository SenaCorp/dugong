import type { FlowConnection } from '../../types/diagram'
import type { Point } from '../../layout/flowTypes'

export function FlowEndpoint({ marker, point, active, dimmed }: { marker: FlowConnection['endMarker']; point: Point; active?: boolean; dimmed?: boolean }) {
  if (marker !== 'circle' && marker !== 'cross') return null
  return <g className={`flow-endpoint ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}`} transform={`translate(${point.x}, ${point.y})`} aria-label={`${marker} connection endpoint`}>
    {marker === 'circle' ? <circle r={4} /> : <path d="M-4 -4 L4 4 M-4 4 L4 -4" />}
  </g>
}
