import type { DiagramDocument } from './documentHistory'

export const SOURCE_KEY = 'diagram-tool-source'
export const WORKSPACE_KEY = 'diagram-tool-workspace'
type WorkspaceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
interface StoredWorkspace extends DiagramDocument { version: 1 }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
function validDocument(value: unknown): value is DiagramDocument {
  if (!isRecord(value) || typeof value.source !== 'string' || !isRecord(value.positions)) return false
  return Object.values(value.positions).every(point => isRecord(point) && typeof point.x === 'number' && typeof point.y === 'number' && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x) <= 1e6 && Math.abs(point.y) <= 1e6)
}
export function readWorkspace(storage: WorkspaceStorage, fallback: string): { document: DiagramDocument; saved: DiagramDocument | null } {
  let source: string | null = null, saved: DiagramDocument | null = null
  try { source = storage.getItem(SOURCE_KEY) } catch { /* Source can still be edited when storage is blocked. */ }
  try {
    const raw = storage.getItem(WORKSPACE_KEY), value: unknown = raw ? JSON.parse(raw) : null
    if (isRecord(value) && value.version === 1 && validDocument(value)) saved = { source: value.source, positions: value.positions }
  } catch { /* Ignore a corrupt or unavailable optional snapshot. */ }
  source ??= saved?.source ?? fallback
  return { document: { source, positions: saved?.source === source ? saved.positions : {} }, saved }
}
export function saveWorkspace(storage: WorkspaceStorage, document: DiagramDocument): void {
  if (!validDocument(document)) throw new Error('Cannot save invalid workspace positions.')
  const snapshot: StoredWorkspace = { version: 1, ...document }
  storage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot))
  storage.setItem(SOURCE_KEY, document.source)
}
export function clearWorkspace(storage: WorkspaceStorage): void { storage.removeItem(WORKSPACE_KEY) }
