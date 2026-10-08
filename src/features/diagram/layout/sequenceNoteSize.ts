import type { SequenceNote } from '../types/diagram'

// Match the renderer: 20px vertical padding, 2px border, 10px caption,
// 6px caption gap, and 18px for each wrapped text line.
export function sequenceNoteSize(note: SequenceNote, participantCenters: number[]) {
  const width = note.placement === 'over' ? Math.max(...participantCenters) - Math.min(...participantCenters) + 240 : 240
  const textWidth = width - 28
  const lines = note.text.split('\n').reduce((count, line) => count + Math.max(1, Math.ceil(line.length * 7 / textWidth)), 0)
  return { width, height: 38 + lines * 18 }
}
