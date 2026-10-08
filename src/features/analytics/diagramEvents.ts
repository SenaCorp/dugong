import type { DiagramGraph } from '../diagram/types/diagram'
import { trackEvent } from './analytics'
import type { DiagramType } from './events'

export function diagramType(graph: DiagramGraph): DiagramType {
  return graph.sequence ? 'sequence' : graph.c4 ? 'c4' : graph.er ? 'er' : 'flowchart'
}

// A load or type transition is meaningful; typing, dragging and auto-layout are not.
export function createDiagramRenderTracker(
  emit: (type: DiagramType) => void = type => trackEvent('diagram_rendered', { diagram_type: type }),
  select: (type: DiagramType) => void = type => trackEvent('diagram_type_selected', { diagram_type: type }),
) {
  let lastSession = -1
  let lastType: DiagramType | undefined
  return (session: number, graph: DiagramGraph) => {
    if (!graph.nodes.length) return
    const type = diagramType(graph)
    if (session === lastSession && type === lastType) return
    if (lastType !== undefined && type !== lastType) select(type)
    lastSession = session
    lastType = type
    emit(type)
  }
}
