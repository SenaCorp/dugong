import { C4_TYPES, type C4DiagramType, type C4Element, type DiagramGroup, type DiagramNode, type ParseResult } from '../types/diagram'
import { c4Statements, parseC4Call, type C4Statement } from './c4Syntax'

export function isC4Type(value: string): value is C4DiagramType { return C4_TYPES.some(type => type === value) }
const boundaryNames = new Set(['Boundary', 'Enterprise_Boundary', 'System_Boundary', 'Container_Boundary'])
const deploymentNames = new Set(['Deployment_Node', 'Node', 'Node_L', 'Node_R'])
function validateId(id: string) {
  if (!/^[A-Za-z_][\w-]*$/.test(id)) throw new Error('Use a C4 alias with letters, numbers, underscores, or hyphens.')
  return id
}
function argumentCount(args: string[], min: number, max: number) {
  if (args.length < min || args.length > max) throw new Error(`This C4 declaration needs ${min}–${max} positional arguments.`)
}
function elementMetadata(name: string, args: string[]): C4Element | null {
  const external = name.endsWith('_Ext')
  const base = external ? name.slice(0, -4) : name
  const match = /^(Person|System|Container|Component)(Db|Queue)?$/.exec(base)
  if (!match || (match[1] === 'Person' && match[2])) return null
  const level = match[1].toLowerCase() as C4Element['level']
  const hasTechnology = level === 'container' || level === 'component'
  argumentCount(args, 2, hasTechnology ? 4 : 3)
  return {
    level, kind: match[2] === 'Db' ? 'database' : match[2] === 'Queue' ? 'queue' : level, external,
    technology: hasTechnology ? args[2] || undefined : undefined,
    description: args[hasTechnology ? 3 : 2] || undefined,
  }
}

export function parseC4(source: string): ParseResult {
  const statements = [...c4Statements(source)]
  const type = statements[0]?.source
  const result: ParseResult = { graph: { direction: 'LR', nodes: [], edges: [], groups: [], c4: { type: isC4Type(type ?? '') ? type as C4DiagramType : 'C4Context' } }, errors: [] }
  const nodes = new Map<string, DiagramNode>()
  const groups: DiagramGroup[] = []
  const stack: (C4Statement & { id: string })[] = []
  const ids = new Set<string>()
  const relationLines = new Map<string, C4Statement>()
  const claimId = (id: string) => {
    validateId(id)
    if (ids.has(id)) throw new Error(`C4 alias ${id} is already declared.`)
    ids.add(id)
  }
  for (const [index, statement] of statements.entries()) {
    const line = statement.source
    try {
      if (index === 0 && isC4Type(line)) continue
      if (line.startsWith('title ')) { result.graph.c4!.title = line.slice(6).trim(); continue }
      if (line === '}') {
        if (!stack.length) throw new Error('Unexpected }: no open C4 boundary.')
        stack.pop(); continue
      }
      const call = parseC4Call(line)
      const { name, args } = call
      if (boundaryNames.has(name) || deploymentNames.has(name)) {
        argumentCount(args, 2, deploymentNames.has(name) ? 4 : 3)
        if (!call.boundary) throw new Error('Open a C4 boundary with { and close it with }.')
        if (!args[1]) throw new Error('Boundary labels cannot be empty.')
        claimId(args[0])
        groups.push({ id: args[0], label: args[1], parentId: stack.at(-1)?.id, c4: { kind: deploymentNames.has(name) ? 'deployment' : 'boundary', type: args[2] ?? name.replaceAll('_', ' '), description: args[3] } })
        stack.push({ ...statement, id: args[0] }); continue
      }
      if (call.boundary) throw new Error('Only C4 boundary and deployment declarations can contain { }.')
      const metadata = elementMetadata(name, args)
      if (metadata) {
        if (!args[1]) throw new Error('Element labels cannot be empty.')
        claimId(args[0])
        nodes.set(args[0], { id: args[0], label: args[1], shape: metadata.kind === 'database' ? 'database' : metadata.kind === 'person' || metadata.kind === 'queue' ? 'rounded' : 'rectangle', c4: metadata, parentId: stack.at(-1)?.id })
        continue
      }
      if (['Rel', 'BiRel', 'Rel_Back', 'RelIndex'].includes(name)) {
        const params = name === 'RelIndex' ? args.slice(1) : args
        if (name === 'RelIndex' && !/^\d+$/.test(args[0] ?? '')) throw new Error('RelIndex starts with a numeric index.')
        argumentCount(params, 3, 4)
        const from = validateId(params[0]), to = validateId(params[1])
        if (!params[2]) throw new Error('Relationship labels cannot be empty.')
        const id = `c4-rel-${result.graph.edges.length + 1}`
        const label = result.graph.c4!.type === 'C4Dynamic' ? `${result.graph.edges.length + 1}. ${params[2]}` : params[2]
        result.graph.edges.push({ id, source: name === 'Rel_Back' ? to : from, target: name === 'Rel_Back' ? from : to, label, technology: params[3], bidirectional: name === 'BiRel' })
        relationLines.set(id, statement); continue
      }
      throw new Error(`C4 declaration ${name} is not supported yet.`)
    } catch (error) { result.errors.push({ ...statement, message: error instanceof Error ? error.message : 'Unable to parse this C4 declaration.' }) }
  }
  if (!isC4Type(type ?? '')) result.errors.unshift({ line: 1, source: '', message: 'Start with C4Context, C4Container, C4Component, C4Dynamic, or C4Deployment.' })
  for (const open of stack) result.errors.push({ ...open, message: `Close boundary ${open.id} with }.` })
  for (const edge of result.graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) result.errors.push({ ...relationLines.get(edge.id)!, message: 'Declare both relationship endpoints as C4 elements; connect to a specific element inside boundaries.' })
  }
  result.graph.nodes = [...nodes.values()]; result.graph.groups = groups
  return result
}
