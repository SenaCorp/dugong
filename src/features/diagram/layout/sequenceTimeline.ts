import type { SequenceFragment, SequenceNote } from '../types/diagram'
import { sequenceNoteSize } from './sequenceNoteSize'

export interface PlacedFragment { fragment: SequenceFragment; top: number; bottom: number; depth: number; branches: { label: string; y: number }[] }

// Reserve real space for every condition header, including nested and empty branches.
export function arrangeSequenceTimeline(count: number, firstY: number, fragments: SequenceFragment[], notes: SequenceNote[] = [], noteHeight: (note: SequenceNote) => number = note => sequenceNoteSize(note, [0]).height) {
  const rows: number[] = []
  const frames: PlacedFragment[] = []
  const placedNotes: { note: SequenceNote; y: number; height: number }[] = []
  const emittedNotes = new Set<string>()
  let y = firstY
  function range(start: number, end: number, parentId?: string, parentBranchIndex?: number, depth = 0) {
    let index = start
    const emitNotes = (before: number) => {
      for (const note of notes) {
        const context = note.sequenceBranches?.at(-1)
        if (emittedNotes.has(note.id) || note.before !== before || context?.fragmentId !== parentId || context?.branchIndex !== parentBranchIndex) continue
        const height = noteHeight(note)
        placedNotes.push({ note, y, height }); emittedNotes.add(note.id); y += height + 22
      }
    }
    const children = fragments.filter(fragment => fragment.parentId === parentId && fragment.parentBranchIndex === parentBranchIndex)
    for (const fragment of children) {
      while (index < fragment.branches[0].start) { emitNotes(index); rows[index++] = y; y += 64 }
      emitNotes(index)
      const frame: PlacedFragment = { fragment, top: y, bottom: y, depth, branches: [] }
      frames.push(frame)
      fragment.branches.forEach((branch, branchIndex) => {
        frame.branches.push({ label: branch.label, y: y - frame.top })
        y += 44
        range(branch.start, branch.end, fragment.id, branchIndex, depth + 1)
      })
      y += 16
      frame.bottom = y
      y += 20
      index = fragment.branches.at(-1)!.end
    }
    while (index < end) { emitNotes(index); rows[index++] = y; y += 64 }
    emitNotes(end)
  }
  range(0, count)
  return { rows, frames, notes: placedNotes, bottom: y }
}
