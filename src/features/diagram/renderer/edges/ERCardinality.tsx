import type { Point } from '../../layout/flowTypes'
import type { ERCardinality as Cardinality } from '../../types/diagram'

const descriptions = { one: 'Exactly one', 'zero-or-one': 'Zero or one', 'one-or-many': 'One or more', 'zero-or-many': 'Zero or more' } as const

export function ERCardinality({ cardinality, endpoint, neighbor, active, dimmed }: { cardinality: Cardinality; endpoint: Point; neighbor: Point; active?: boolean; dimmed?: boolean }) {
  const angle = Math.atan2(neighbor.y - endpoint.y, neighbor.x - endpoint.x) * 180 / Math.PI
  const many = cardinality.endsWith('many')
  const optional = cardinality.startsWith('zero')
  return <g className={`er-cardinality ${active ? 'is-active' : ''} ${dimmed ? 'is-dimmed' : ''}`} transform={`translate(${endpoint.x}, ${endpoint.y}) rotate(${angle})`} aria-label={descriptions[cardinality]}>
    <title>{descriptions[cardinality]}</title>
    {many ? <path d="M2 -7 L14 0 L2 7 M2 0 H14" /> : <path d="M6 -7 V7" />}
    {optional ? <circle cx={many ? 23 : 18} cy={0} r={4} /> : <path d={many ? 'M22 -7 V7' : 'M13 -7 V7'} />}
  </g>
}
