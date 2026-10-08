import { expect, it } from 'vitest'
import { parseDiagram } from './parseDiagram'

it.each([
 ['-.->', 'dotted', 'none', 'arrow'], ['-.-', 'dotted', 'none', 'none'], ['==>', 'thick', 'none', 'arrow'],
 ['===', 'thick', 'none', 'none'], ['---', 'solid', 'none', 'none'], ['<-->', 'dashed', 'arrow', 'arrow'],
 ['--o', 'dashed', 'none', 'circle'], ['--x', 'dashed', 'none', 'cross'], ['o--o', 'dashed', 'circle', 'circle'],
 ['x--x', 'dashed', 'cross', 'cross'], ['<-.->', 'dotted', 'arrow', 'arrow'], ['<==>', 'thick', 'arrow', 'arrow'],
 ['~~~', 'invisible', 'none', 'none'],
])('parses flowchart connector %s', (arrow, line, startMarker, endMarker) => {
 const { graph, errors } = parseDiagram(`flowchart LR\nA ${arrow}|request| B`)
 expect(errors).toEqual([])
 expect(graph.edges[0].flow).toEqual({ line, startMarker, endMarker })
 expect(graph.edges[0].label).toBe('request')
})
it('supports labeled dotted/thick links and compact extended links', () => {
 const result = parseDiagram('flowchart LR\nA -. async .-> B\nB == batch ==> C\nC-..->D\nD====>E')
 expect(result.errors).toEqual([])
 expect(result.graph.edges.map(edge => edge.label)).toEqual(['async', 'batch', undefined, undefined])
})
it('applies default, named and inline classes with direct style taking precedence', () => {
 const result = parseDiagram('flowchart LR\nclassDef default fill:#fafafa\nclassDef api fill:#eef,stroke:#456,color:#234,stroke-width:2px\nclass A api\nA[API] --> B[Queue]:::api\nstyle A fill:#ffe\nclassDef api fill:#eef,stroke:#456,color:#234,stroke-width:2px')
 expect(result.errors).toEqual([])
 expect(result.graph.nodes[0].style).toEqual({ fill: '#ffe', stroke: '#456', color: '#234', strokeWidth: 2 })
 expect(result.graph.nodes[1].style?.fill).toBe('#eef')
})
it('styles groups, accepts escaped dash arrays, and collects unsupported/invalid styling', () => {
 const result = parseDiagram('flowchart LR\nsubgraph BACK[Backend]\nA[API]\nend\nclassDef service stroke-dasharray:5\\,3,stroke:#345\nclass A service\nstyle BACK fill:#eee,color:#345\nstyle A display:none\nclass A missing\nstyle UNKNOWN fill:#fff')
 expect(result.graph.nodes[0].style?.strokeDasharray).toBe('5 3')
 expect(result.graph.groups?.[0].style?.fill).toBe('#eee')
 expect(result.errors.map(error => error.line).sort((a, b) => a - b)).toEqual([8, 9, 10])
})
