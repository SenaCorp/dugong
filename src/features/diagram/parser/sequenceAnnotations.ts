import type { ParserError, SequenceActivation, SequenceBox, SequenceBranchReference, SequenceNote } from '../types/diagram'

const validId = (id: string) => /^[A-Za-z_][\w-]*$/.test(id)
const sameContext = (a: SequenceBranchReference[], b: SequenceBranchReference[]) => JSON.stringify(a) === JSON.stringify(b)
const colors: Record<string, string> = { transparent: 'transparent', blue: '#dbe8fb', green: '#e3efd9', yellow: '#faf0ce', red: '#f7dfe0', purple: '#eee3f6', gray: '#e5e8e0', grey: '#e5e8e0' }

export function sequenceBoxColor(token: string) {
  const first = token.toLowerCase()
  return colors[first] ?? (/^#[\da-f]{6}$/i.test(first) ? first : undefined)
}

export function createSequenceAnnotations(ensureParticipant: (id: string) => void) {
  const notes: SequenceNote[] = [], activations: SequenceActivation[] = [], boxes: SequenceBox[] = []
  const active = new Map<string, { bar: SequenceActivation; context: SequenceBranchReference[]; line: number; source: string }[]>()
  let openBox: { box: SequenceBox; line: number; source: string } | undefined
  function activate(id: string, index: number, context: SequenceBranchReference[], line: number, source: string) {
    ensureParticipant(id)
    const stack = active.get(id) ?? []
    const bar: SequenceActivation = { participantId: id, start: index, end: index, depth: stack.length, ...(context.length ? { sequenceBranches: context } : {}) }
    activations.push(bar); stack.push({ bar, context, line, source }); active.set(id, stack)
  }
  function deactivate(id: string, index: number, context: SequenceBranchReference[]) {
    const stack = active.get(id), opened = stack?.at(-1)
    if (!opened) throw new Error(`Activate ${id} before deactivating it.`)
    if (!sameContext(opened.context, context)) throw new Error('Close an activation in the same sequence branch where it started.')
    opened.bar.end = index; stack!.pop()
  }
  return {
    notes, activations, boxes, activate, deactivate,
    get inBox() { return Boolean(openBox) },
    registerParticipant(id: string) {
      if (!openBox) return
      const existing = boxes.find(box => box.participantIds.includes(id))
      if (existing && existing !== openBox.box) throw new Error(`Participant ${id} already belongs to another box.`)
      if (!openBox.box.participantIds.includes(id)) openBox.box.participantIds.push(id)
    },
    parse(line: string, lineNumber: number, source: string, index: number, context: SequenceBranchReference[]) {
      if (line === 'box' || line.startsWith('box ')) {
        if (openBox || context.length) throw new Error('Declare participant boxes outside sequence frames; boxes cannot nest.')
        const text = line.slice(3).trim(), parts = text.split(/\s+/), first = parts[0].toLowerCase()
        const color = sequenceBoxColor(first)
        const box: SequenceBox = { id: `sequence-box-${boxes.length + 1}`, label: (color ? parts.slice(1).join(' ') : text) || 'Participants', participantIds: [], ...(color ? { color } : {}) }
        boxes.push(box); openBox = { box, line: lineNumber, source }; return true
      }
      if (openBox && line === 'end') { openBox = undefined; return true }
      if (openBox) return false
      const note = /^Note\s+(left of|right of|over)\s+([^:]+):\s*(.*)$/i.exec(line)
      if (note) {
        const participantIds = note[2].split(',').map(id => id.trim())
        const placement = note[1].toLowerCase() === 'over' ? 'over' : note[1].toLowerCase().startsWith('left') ? 'left' : 'right'
        if (participantIds.length > (placement === 'over' ? 2 : 1) || participantIds.some(id => !validId(id)) || !note[3].trim()) throw new Error('Notes need text and one participant, or two participants for Note over A,B.')
        participantIds.forEach(ensureParticipant)
        notes.push({ id: `sequence-note-${notes.length + 1}`, placement, participantIds: [...new Set(participantIds)], text: note[3].trim().replace(/<br\s*\/?\s*>/gi, '\n'), before: index, ...(context.length ? { sequenceBranches: context } : {}) }); return true
      }
      const activation = /^(activate|deactivate)\s+(\S+)$/.exec(line)
      if (activation) {
        if (!validId(activation[2])) throw new Error('Use a valid participant ID for activation.')
        if (activation[1] === 'activate') activate(activation[2], index, context, lineNumber, source)
        else deactivate(activation[2], index, context)
        return true
      }
      return false
    },
    finish(): ParserError[] {
      const errors: ParserError[] = []
      if (openBox) errors.push({ line: openBox.line, source: openBox.source, message: 'Close this participant box with end.' })
      for (const [id, stack] of active) for (const opened of stack) errors.push({ line: opened.line, source: opened.source, message: `Close activation ${id} with deactivate or a response arrow using -.` })
      return errors
    },
  }
}
