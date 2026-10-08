import { positionsForSourceEdit } from '../editing/editPositions'
import { useEffect, useMemo, useRef, useState } from 'react'
import { parseDiagram } from '../parser/parseDiagram'
import { layoutDiagram } from '../layout/elkLayout'
import type { LayoutDiagram } from '../layout/flowTypes'
import type { DiagramGraph, ParserError } from '../types/diagram'
import { readWorkspace, saveWorkspace as storeWorkspace, clearWorkspace, SOURCE_KEY } from '../editing/workspaceStorage'
import type { DiagramDocument } from '../editing/documentHistory'
import { useDocumentHistory } from '../editing/useDocumentHistory'
import { editSource, type SourceEdit } from '../editing/editSource'
import { absolutePositions, applyManualPositions } from '../editing/manualLayout'
import type { Point } from '../layout/flowTypes'
import { DEFAULT_DIAGRAM, PREVIOUS_SAMPLE } from '../examples/defaultDiagram'

function readInitialWorkspace() {
  try {
    const initial = readWorkspace(localStorage, DEFAULT_DIAGRAM)
    if (initial.document.source.trim() === PREVIOUS_SAMPLE.trim()) return { document: { source: DEFAULT_DIAGRAM, positions: {} }, saved: null }
    return initial
  } catch { return { document: { source: DEFAULT_DIAGRAM, positions: {} }, saved: null } }
}
interface DiagramState {
  graph: DiagramGraph
  layout: LayoutDiagram
  errors: ParserError[]
  layoutError: string | null
  busy: boolean
  revision: number
  processedSource: string
  viewRevision: number
}

export function useDiagram() {
  const [initial] = useState(readInitialWorkspace)
  const document = useDocumentHistory(() => initial.document)
  const [savedDocument, setSavedDocument] = useState<DiagramDocument | null>(initial.saved)
  const [storageError, setStorageError] = useState('')
  const { source, setSource } = document
  const [resetVersion, setResetVersion] = useState(0)
  const request = useRef(0)
  const [state, setState] = useState<DiagramState>({
    graph: { direction: 'LR', nodes: [], edges: [] }, layout: { nodes: [], edges: [] },
    errors: [], layoutError: null, busy: true, revision: 0, processedSource: '', viewRevision: -1,
  })

  useEffect(() => {
    // Increment immediately: even results from a previous debounce must not commit.
    const version = ++request.current
    let cancelled = false
    const timer = window.setTimeout(async () => {
      try { localStorage.setItem(SOURCE_KEY, source) } catch { /* Storage can be disabled; editing still works. */ }
      const parsed = parseDiagram(source)
      if (parsed.errors.length) {
        setState(previous => ({ ...previous, errors: parsed.errors, busy: false, layoutError: null, processedSource: source }))
        return
      }
      setState(previous => ({ ...previous, errors: [], busy: true, layoutError: null }))
      try {
        const layout = await layoutDiagram(parsed.graph)
        if (cancelled || request.current !== version) return
        setState(previous => ({ graph: parsed.graph, layout, errors: [], layoutError: null, busy: false, revision: previous.revision + 1, processedSource: source, viewRevision: resetVersion }))
      } catch (error) {
        if (!cancelled && request.current === version) setState(previous => ({
          ...previous, busy: false, processedSource: source, layoutError: error instanceof Error ? error.message : 'Unable to lay out this diagram.',
        }))
      }
    }, 300)
    return () => { window.clearTimeout(timer); cancelled = true }
  }, [source, resetVersion])

  function loadExample(example: string) {
    request.current++
    document.resetDocument(example)
    setSavedDocument(null); setStorageError('')
    try { clearWorkspace(localStorage) } catch { setStorageError('Unable to clear saved workspace. Browser storage may be full or disabled.') }
    setResetVersion(version => version + 1)
    setState(previous => ({ ...previous, errors: [], layoutError: null, busy: true }))
    try { localStorage.setItem(SOURCE_KEY, example) } catch { /* Optional persistence. */ }
  }
  const adjusted = useMemo(() => {
    try { return { layout: applyManualPositions(state.layout, document.positions), error: null } }
    catch (error) { return { layout: state.layout, error: error instanceof Error ? error.message : 'Unable to route manual positions.' } }
  }, [state.layout, document.positions])
  function applyEdit(action: SourceEdit) {
    const updated = editSource(source, action)
    const current = absolutePositions(adjusted.layout.nodes)
    const positions = Object.fromEntries(adjusted.layout.nodes.filter(node => !['group', 'lifeline', 'activation', 'sequenceBox', 'sequenceFrame', 'sequenceNote'].includes(node.type!)).map(node => [node.id, current[node.id]]))
    const nextPositions = positionsForSourceEdit(action, state.graph, parseDiagram(updated).graph, positions)
    document.commit(() => ({ source: updated, positions: nextPositions }))
    if (['addNode', 'duplicateNode', 'deleteNode'].includes(action.kind)) setResetVersion(version => version + 1)
  }
  function moveNode(id: string, point: Point) {
    const positions = { ...document.positions, [id]: point }
    applyManualPositions(state.layout, positions)
    document.setPositions(positions)
  }
  function autoLayout() { document.setPositions({}); setResetVersion(version => version + 1) }
  function saveWorkspace() {
    try {
      const snapshot = { source, positions: document.positions }
      storeWorkspace(localStorage, snapshot); setSavedDocument(snapshot); setStorageError('')
    } catch { setStorageError('Unable to save workspace. Browser storage may be full or disabled.') }
  }
  const workspaceSaved = savedDocument !== null && JSON.stringify(savedDocument) === JSON.stringify({ source, positions: document.positions })
  const reset = () => loadExample(DEFAULT_DIAGRAM)
  return { source, setSource, reset, loadExample, saveWorkspace, workspaceSaved, storageError, ...state, layout: adjusted.layout, layoutError: state.layoutError ?? adjusted.error,
    busy: state.busy || state.processedSource !== source, applyEdit, moveNode, autoLayout, viewRevision: state.viewRevision,
    documentRevision: document.documentRevision, undo: document.undo, redo: document.redo, canUndo: document.canUndo, canRedo: document.canRedo }
}
