import shapesSource from '../../../../samples/flowchart-shapes.mmd?raw'
import styledFlowchart from '../../../../samples/styled-flowchart.mmd?raw'
import architectureSource from '../../../../diagram.md?raw'
import annotatedLogin from '../../../../samples/login-annotated.mmd?raw'
import loginSource from '../../../../samples/login-sequence.mmd?raw'
import erSource from '../../../../samples/orders-er.mmd?raw'

import c4Context from '../../../../samples/c4-context.mmd?raw'
import c4Container from '../../../../samples/c4-container.mmd?raw'
import c4Component from '../../../../samples/c4-component.mmd?raw'
import c4Dynamic from '../../../../samples/c4-dynamic.mmd?raw'
import c4Deployment from '../../../../samples/c4-deployment.mmd?raw'
import type { DiagramType, ExampleId } from '../../analytics/events'

export const DEFAULT_DIAGRAM = architectureSource.trim()
export const LOGIN_SEQUENCE = loginSource.trim()

// Recognize the previous shipped default without replacing a user's custom source.
export const PREVIOUS_SAMPLE = `flowchart LR

A[Mobile App]
B[API Gateway]
C(Order Service)
D[(PostgreSQL)]
E(Message Queue)
F[Worker]

A -->|POST /orders| B
B --> C
C --> D
C --> E
E --> F
F --> D`

export const DIAGRAM_EXAMPLES = [
  { id: 'shape-gallery', diagramType: 'flowchart', label: "Flowchart · Shape gallery", source: shapesSource.trim() },
  { id: 'dark-gallery', diagramType: 'flowchart', label: "Flowchart · Dark gallery", source: shapesSource.replace('theme: light', 'theme: dark').trim() },
  { id: 'architecture', diagramType: 'flowchart', label: "Architecture", source: DEFAULT_DIAGRAM },
  { id: 'styled-flowchart', diagramType: 'flowchart', label: "Flowchart · Styled connections", source: styledFlowchart.trim() },
  { id: 'login-sequence', diagramType: 'sequence', label: "Login sequence", source: LOGIN_SEQUENCE },
  { id: 'full-login', diagramType: 'sequence', label: "Sequence · Full login", source: annotatedLogin.trim() },
  { id: 'orders-er', diagramType: 'er', label: "ER · Order database", source: erSource.trim() },
  { id: 'c4-context', diagramType: 'c4', label: "C4 · Context", source: c4Context.trim() },
  { id: 'c4-container', diagramType: 'c4', label: "C4 · Container", source: c4Container.trim() },
  { id: 'c4-component', diagramType: 'c4', label: "C4 · Component", source: c4Component.trim() },
  { id: 'c4-dynamic', diagramType: 'c4', label: "C4 · Dynamic", source: c4Dynamic.trim() },
  { id: 'c4-deployment', diagramType: 'c4', label: "C4 · Deployment", source: c4Deployment.trim() },
] satisfies { id: ExampleId; diagramType: DiagramType; label: string; source: string }[]
