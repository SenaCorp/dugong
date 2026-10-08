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
  { label: "Flowchart · Shape gallery", source: shapesSource.trim() },
  { label: "Flowchart · Dark gallery", source: shapesSource.replace('theme: light', 'theme: dark').trim() },
  { label: "Architecture", source: DEFAULT_DIAGRAM },
  { label: "Flowchart · Styled connections", source: styledFlowchart.trim() },
  { label: "Login sequence", source: LOGIN_SEQUENCE },
  { label: "Sequence · Full login", source: annotatedLogin.trim() },
  { label: "ER · Order database", source: erSource.trim() },
  { label: "C4 · Context", source: c4Context.trim() },
  { label: "C4 · Container", source: c4Container.trim() },
  { label: "C4 · Component", source: c4Component.trim() },
  { label: "C4 · Dynamic", source: c4Dynamic.trim() },
  { label: "C4 · Deployment", source: c4Deployment.trim() },
]
