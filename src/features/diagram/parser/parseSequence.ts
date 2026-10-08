import type { DiagramEdge, DiagramNode, ParseResult } from '../types/diagram'
import { createSequenceAnnotations } from './sequenceAnnotations'
import { createSequenceFragments } from './sequenceFragments'

function validateId(id: string) {
  if (!/^[A-Za-z_][\w-]*$/.test(id)) throw new Error('Use a participant ID with letters, numbers, underscores, or hyphens.')
  return id
}

function parseParticipant(line: string) {
  const parts = line.split(/\s+/)
  if (parts[0] !== 'participant' && parts[0] !== 'actor') return null
  const id = validateId(parts[1] ?? '')
  if (parts.length > 2 && (parts[2] !== 'as' || parts.length < 4)) throw new Error('Use participant ID as Label or actor ID as Label.')
  return { id, label: parts.length > 2 ? parts.slice(3).join(' ').replace(/<br\s*\/?\s*>/gi, '\n') : id, actor: parts[0] === 'actor' }
}

function parseMessage(line: string): { message: Omit<DiagramEdge, 'id'>; activation?: '+' | '-' } {
  const colon = line.indexOf(':')
  if (colon < 0) throw new Error('Use A->>B: Message or A-->>B: Response.')
  const connection = line.slice(0, colon).trim()
  const arrow = connection.includes('-->>') ? '-->>' : connection.includes('->>') ? '->>' : '--x'
  const dashed = arrow.startsWith('--')
  const parts = connection.split(arrow)
  if (parts.length !== 2) throw new Error('Supported message arrows are ->>, -->>, and --x.')
  const source = validateId(parts[0].trim())
  const destination = parts[1].trim()
  const activation = destination.startsWith('+') ? '+' : destination.startsWith('-') ? '-' : undefined
  const target = validateId(activation ? destination.slice(1).trim() : destination)
  const label = line.slice(colon + 1).trim()
  if (!label) throw new Error('Message text cannot be empty.')
  return { message: { source, target, label: label.replace(/<br\s*\/?\s*>/gi, '\n'), dashed, ...(arrow === '--x' ? { sequenceEndMarker: 'cross' as const } : {}) }, activation }
}

export function parseSequence(source: string): ParseResult {
  const nodes = new Map<string, DiagramNode>()
  const actorIds = new Set<string>()
  const sequence = { autonumber: false, actorIds: [] as string[] }
  const result: ParseResult = { graph: { direction: 'LR', nodes: [], edges: [], sequence }, errors: [] }
  let hasHeader = false
  const fragments = createSequenceFragments()
  const ensureParticipant = (id: string) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: id, shape: 'rectangle' })
  }
  const annotations = createSequenceAnnotations(ensureParticipant)
  source.split(/\r?\n/).forEach((original, index) => {
    const line = original.trim()
    if (!line || line.startsWith('%%')) return
    try {
      if (line === 'sequenceDiagram') {
        if (hasHeader) throw new Error('Declare sequenceDiagram only once.')
        hasHeader = true
        return
      }
      if (line === 'autonumber') { sequence.autonumber = true; return }
      if (annotations.parse(line, index + 1, original, result.graph.edges.length, fragments.memberships())) return
      if (!annotations.inBox && fragments.parse(line, index + 1, original, result.graph.edges.length)) return
      const participant = parseParticipant(line)
      if (participant) {
        annotations.registerParticipant(participant.id)
        nodes.set(participant.id, { id: participant.id, label: participant.label, shape: 'rectangle' })
        if (participant.actor) actorIds.add(participant.id)
        else actorIds.delete(participant.id)
        return
      }
      if (annotations.inBox) throw new Error('Participant boxes may contain only participant or actor declarations.')
      const parsedMessage = parseMessage(line)
      const message = parsedMessage.message
      const context = fragments.memberships()
      if (parsedMessage.activation === '-') annotations.deactivate(message.source, result.graph.edges.length + 1, context)
      if (parsedMessage.activation === '+') annotations.activate(message.target, result.graph.edges.length, context, index + 1, original)
      ensureParticipant(message.source); ensureParticipant(message.target)
      const memberships = fragments.memberships()
      result.graph.edges.push({ ...message, id: `sequence-${result.graph.edges.length + 1}`, ...(memberships.length ? { sequenceBranches: memberships } : {}) })
    } catch (error) {
      result.errors.push({ line: index + 1, source: original, message: error instanceof Error ? error.message : 'Unable to parse this sequence line.' })
    }
  })
  if (!hasHeader) result.errors.unshift({ line: 1, source: '', message: 'Start with sequenceDiagram.' })
  result.graph.nodes = [...nodes.values()]
  sequence.actorIds = [...actorIds]
  result.errors.push(...fragments.finish(result.graph.edges.length))
  if (fragments.fragments.length) result.graph.sequence!.fragments = fragments.fragments
  result.errors.push(...annotations.finish())
  if (annotations.notes.length) result.graph.sequence!.notes = annotations.notes
  if (annotations.activations.length) result.graph.sequence!.activations = annotations.activations
  if (annotations.boxes.length) result.graph.sequence!.boxes = annotations.boxes
  return result
}
