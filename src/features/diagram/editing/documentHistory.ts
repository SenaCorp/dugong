import type { Point } from '../layout/flowTypes'
export interface DiagramDocument { source: string; positions: Record<string, Point> }
export interface DocumentHistory { version: number; past: DiagramDocument[]; present: DiagramDocument; future: DiagramDocument[] }
export function createHistory(present: DiagramDocument): DocumentHistory { return { version: 0, past: [], present, future: [] } }
export function commitHistory(history: DocumentHistory, present: DiagramDocument): DocumentHistory {
  if (JSON.stringify(history.present) === JSON.stringify(present)) return history
  return { version: history.version + 1, past: [...history.past, history.present].slice(-100), present, future: [] }
}
export function undoHistory(history: DocumentHistory): DocumentHistory {
  const present = history.past.at(-1)
  return present ? { version: history.version + 1, past: history.past.slice(0, -1), present, future: [history.present, ...history.future] } : history
}
export function redoHistory(history: DocumentHistory): DocumentHistory {
  const present = history.future[0]
  return present ? { version: history.version + 1, past: [...history.past, history.present], present, future: history.future.slice(1) } : history
}
