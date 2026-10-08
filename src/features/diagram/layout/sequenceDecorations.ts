import type { DiagramGraph } from '../types/diagram'
import type { FlowNode } from './flowTypes'
import type { arrangeSequenceTimeline } from './sequenceTimeline'
import { sequenceNoteSize } from './sequenceNoteSize'

export function sequenceDecorations(graph: DiagramGraph, participants: FlowNode[], timeline: ReturnType<typeof arrangeSequenceTimeline>): FlowNode[] {
  const byId = new Map(participants.map(node => [node.id, node]))
  const boxes: FlowNode[] = (graph.sequence?.boxes ?? []).filter(box => box.participantIds.length).map(box => {
    const members = box.participantIds.map(id => byId.get(id)!)
    const left = Math.min(...members.map(node => node.position.x)) - 16
    const right = Math.max(...members.map(node => node.position.x + 190)) + 16
    return { id: `:box:${box.id}`, type: 'sequenceBox', position: { x: left, y: 14 }, style: { width: right - left, height: timeline.bottom - 14 + 8 }, zIndex: -5, selectable: false,
      data: { label: box.label, shape: 'group', ports: [], theme: members[0].data.theme, boxColor: box.color } }
  })
  const notes: FlowNode[] = timeline.notes.map(({ note, y, height }) => {
    const owners = note.participantIds.map(id => byId.get(id)!)
    const centers = owners.map(node => node.position.x + 95)
    const { width } = sequenceNoteSize(note, centers)
    const x = note.placement === 'left' ? centers[0] - width - 18 : note.placement === 'right' ? centers[0] + 18 : Math.min(...centers) - 120
    return { id: `:note:${note.id}`, type: 'sequenceNote', position: { x, y }, style: { width, height }, zIndex: 0, selectable: false,
      data: { label: note.text, shape: 'rectangle', ports: [], theme: owners[0].data.theme, participantId: note.participantIds[0], sequenceNote: note } }
  })
  const activations: FlowNode[] = (graph.sequence?.activations ?? []).map((bar, index) => {
    const owner = byId.get(bar.participantId)!
    const y = timeline.rows[bar.start] ?? timeline.bottom - 20
    const bottom = bar.end > bar.start ? (timeline.rows[bar.end - 1] ?? y) + 34 : y + 16
    return { id: `:activation:${index}`, type: 'activation', position: { x: owner.position.x + 90 + bar.depth * 6, y }, style: { width: 10, height: Math.max(16, bottom - y) }, zIndex: 0, selectable: false,
      data: { label: owner.data.label, shape: 'lifeline', ports: [], participantId: owner.id, theme: owner.data.theme } }
  })
  return [...boxes, ...notes, ...activations]
}
