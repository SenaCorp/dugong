export const DIAGRAM_TYPES = ['flowchart', 'sequence', 'c4', 'er'] as const
export type DiagramType = typeof DIAGRAM_TYPES[number]
export const EXAMPLE_IDS = ['shape-gallery', 'dark-gallery', 'architecture', 'styled-flowchart', 'login-sequence', 'full-login', 'orders-er', 'c4-context', 'c4-container', 'c4-component', 'c4-dynamic', 'c4-deployment'] as const
export type ExampleId = typeof EXAMPLE_IDS[number]

export interface AnalyticsEvents {
  diagram_rendered: { diagram_type: DiagramType }
  diagram_type_selected: { diagram_type: DiagramType }
  example_selected: { example_id: ExampleId }
  flow_played: { diagram_type: DiagramType; trigger: 'manual' | 'automatic' }
  flow_stopped: { diagram_type: DiagramType; reason: 'manual' | 'completed' }
  github_clicked: Record<string, never>
  diagram_exported: { diagram_type: DiagramType; format: 'svg' | 'png' }
}

// Runtime allowlists also protect against untyped callers and accidental object spreads.
export function safeEventParameters(name: string, parameters: unknown): Record<string, string> | null {
  if (!parameters || typeof parameters !== 'object') return null
  const value = parameters as Record<string, unknown>
  const type = typeof value.diagram_type === 'string' && DIAGRAM_TYPES.some(type => type === value.diagram_type) ? value.diagram_type : null
  switch (name) {
    case 'github_clicked': return {}
    case 'example_selected': return typeof value.example_id === 'string' && EXAMPLE_IDS.some(id => id === value.example_id) ? { example_id: value.example_id } : null
    case 'diagram_rendered':
    case 'diagram_type_selected': return type ? { diagram_type: type } : null
    case 'diagram_exported': return type && (value.format === 'svg' || value.format === 'png') ? { diagram_type: type, format: value.format } : null
    case 'flow_played': return type && (value.trigger === 'manual' || value.trigger === 'automatic') ? { diagram_type: type, trigger: value.trigger } : null
    case 'flow_stopped': return type && (value.reason === 'manual' || value.reason === 'completed') ? { diagram_type: type, reason: value.reason } : null
    default: return null
  }
}
