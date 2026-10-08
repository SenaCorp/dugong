import { nextNodeId } from '../features/diagram/editing/elementDefinitions'
import type { DiagramGraph } from '../features/diagram/types/diagram'
import { DiagramInspector } from './DiagramInspector'
import type { SourceEdit } from '../features/diagram/editing/editSource'
import type { Point } from '../features/diagram/layout/flowTypes'
import { EditingContext, type EditTarget } from '../features/diagram/editing/EditingContext'
import { ReactFlowProvider } from '@xyflow/react'
import { Toolbar } from './Toolbar'
import { DiagramCanvas } from '../features/diagram/renderer/DiagramCanvas'
import type { LayoutDiagram } from '../features/diagram/layout/flowTypes'
import { useSequencePlayback, type PlaybackEvent } from '../features/diagram/hooks/useSequencePlayback'
import { exportDiagram } from '../features/diagram/export/exportDiagram'
import { useCallback, useMemo, useState, useRef } from 'react'
import { trackEvent } from '../features/analytics/analytics'
import { sequencePlaybackPath } from '../features/diagram/hooks/sequencePlaybackPath'
import { isDecoration } from '../features/diagram/renderer/isDecoration'
import { SequenceBranchControls } from './SequenceBranchControls'

const EMPTY_CHOICES: Readonly<Record<string, number>> = {}

interface PreviewPanelProps {
  analyticsSession?: number
  graph: DiagramGraph
  onSaveWorkspace: () => void
  workspaceSaved: boolean
  storageError: string
  documentRevision: number
  onEdit: (action: SourceEdit) => void
  onMove: (id: string, position: Point) => void
  onAutoLayout: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  viewRevision: number
  layout: LayoutDiagram
  revision: number
  busy: boolean
  hasErrors: boolean
  onReset: () => void
  expanded: boolean
  onToggleExpanded: () => void
}
export function PreviewPanel({ analyticsSession = 0, graph, onSaveWorkspace, workspaceSaved, storageError, documentRevision, onEdit, onMove, onAutoLayout, onUndo, onRedo, canUndo, canRedo, viewRevision, layout, revision, busy, hasErrors, onReset, expanded, onToggleExpanded }: PreviewPanelProps) {
  const [inspecting, setInspecting] = useState(false)
  const [selectedId, select] = useState<string | null>(null)
  const [targetRecord, setTarget] = useState<(EditTarget & { revision: number }) | null>(null)
  const target = targetRecord?.revision === documentRevision ? targetRecord : null
  const [dragRevision, setDragRevision] = useState<number | null>(null)
  const dragging = dragRevision === documentRevision
  const [connectRevision, setConnectRevision] = useState<number | null>(null)
  const connecting = connectRevision === documentRevision
  const [editError, setEditError] = useState('')
  const disabled = busy || hasErrors
  const editing = {
    documentRevision, disabled, selectedId, target, dragging, connecting, select, inspecting,
    inspect: () => { setTarget(null); setInspecting(true) },
    open: (value: EditTarget) => { if (!disabled) { setEditError(''); setTarget({ ...value, revision: documentRevision }) } },
    close: () => { setTarget(null); setEditError('') },
    apply: (action: SourceEdit) => {
      if (disabled) { setEditError('Wait for a valid preview before editing.'); return false }
      try {
        onEdit(action); setEditError('')
        if (action.kind === 'addNode') select(nextNodeId(graph))
        if (action.kind === 'duplicateNode') select(nextNodeId(graph, `${action.id.replace(/[^\w-]/g, '_')}_copy`))
        if (action.kind === 'deleteNode') select(null)
        return true
      }
      catch (error) { setEditError(error instanceof Error ? error.message : 'Unable to edit this item.'); return false }
    },
    move: (id: string, point: Point, revision: number) => {
      if (disabled || revision !== documentRevision) return
      try { onMove(id, point); setEditError('') }
      catch (error) { setEditError(error instanceof Error ? error.message : 'Unable to move this node.') }
    },
    setDragging: (value: boolean) => setDragRevision(value ? documentRevision : null), setConnecting: (value: boolean) => setConnectRevision(value ? documentRevision : null),
  }
  const root = useRef<HTMLElement>(null)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const onExport = async (format: 'svg' | 'png') => {
    if (!root.current || exporting) return
    setExporting(true); setExportError('')
    try {
      await exportDiagram(root.current, layout, format)
      trackEvent('diagram_exported', { diagram_type: layout.kind ?? 'flowchart', format })
    }
    catch (error) { setExportError(error instanceof Error ? error.message : 'Export failed. Try again.') }
    finally { setExporting(false) }
  }
  const isSequence = layout.kind === 'sequence'
  const isDynamic = layout.c4Type === 'C4Dynamic'
  const playable = isSequence || isDynamic
  const [selection, setSelection] = useState<{ revision: number; choices: Record<string, number> }>({ revision, choices: {} })
  const choices = selection.revision === revision ? selection.choices : EMPTY_CHOICES
  const playbackIds = useMemo(() => sequencePlaybackPath(layout.edges.map(edge => ({ id: edge.id, sequenceBranches: edge.data?.sequenceBranches })), choices), [layout.edges, choices])
  const onPlaybackEvent = useCallback((event: PlaybackEvent) => {
    const type = layout.kind ?? 'flowchart'
    if (event.action === 'play') trackEvent('flow_played', { diagram_type: type, trigger: event.trigger })
    else trackEvent('flow_stopped', { diagram_type: type, reason: event.reason })
  }, [layout.kind])
  const playback = useSequencePlayback(playbackIds.length, `${revision}:${JSON.stringify(choices)}`, playable && !busy && !hasErrors, onPlaybackEvent, `${analyticsSession}:${layout.kind}:${JSON.stringify(choices)}`)
  const activeMessageId = !target && !dragging && !connecting && playable && !busy && !hasErrors && playback.index !== null ? playbackIds[playback.index] ?? null : null
  return <section ref={root} data-theme={layout.theme ?? 'light'} className="preview-panel" aria-label="Diagram preview">
    <EditingContext.Provider value={editing}>
    <ReactFlowProvider>
      <Toolbar onAdd={() => editing.apply({ kind: 'addNode' })} onInspect={() => { setTarget(null); setInspecting(value => !value) }} inspecting={inspecting} onSaveWorkspace={onSaveWorkspace} workspaceSaved={workspaceSaved} onAutoLayout={() => { setTarget(null); select(null); setEditError(''); onAutoLayout() }} onUndo={onUndo} onRedo={onRedo} canUndo={canUndo} canRedo={canRedo} onExport={format => void onExport(format)} exporting={exporting} nodeCount={layout.nodes.filter(node => !isDecoration(node)).length} edgeCount={layout.edges.filter(edge => edge.data?.flow?.line !== 'invisible').length} onReset={() => { setTarget(null); select(null); setEditError(''); setExportError(''); onReset() }} busy={busy} hasErrors={hasErrors} expanded={expanded} onToggleExpanded={onToggleExpanded}
        isSequence={isSequence} playback={playable ? { playing: playback.playing, index: playback.index, count: playbackIds.length, onPlay: playback.play, onStop: playback.stop } : undefined} />
      {layout.sequenceFragments?.some(fragment => fragment.kind !== 'loop') && <SequenceBranchControls fragments={layout.sequenceFragments!} choices={choices} onChange={(id, index) => setSelection({ revision, choices: { ...choices, [id]: index } })} />}
      {storageError && <p className="export-error" role="alert">{storageError}</p>}
      {editError && <p className="export-error" role="alert">{editError}</p>}
      {exportError && <p className="export-error" role="alert">Export failed: {exportError}</p>}
      <div className="preview-canvas">
        {layout.kind === 'c4' && <div className="c4-diagram-caption"><span>{layout.c4Type?.replace('C4', 'C4 · ')}</span>{layout.title && <strong>{layout.title}</strong>}</div>}
        <DiagramCanvas layout={layout} revision={viewRevision} expanded={expanded} activeMessageId={activeMessageId} />
        {inspecting && <DiagramInspector key={`${documentRevision}:${revision}`} graph={graph} selectedId={selectedId} revision={documentRevision} disabled={disabled} onSelect={select} onApply={editing.apply} onClose={() => setInspecting(false)} />}
        {!layout.nodes.length && <div className="canvas-empty"><span>{busy ? 'Arranging your diagram…' : hasErrors ? 'Start with valid diagram source' : 'A blank canvas, ready for your ideas.'}</span><small>Define a node or connect A → B to begin.</small></div>}
        {layout.nodes.length > 0 && !selectedId && !target && <div className="canvas-note"><span className="hover-cursor" aria-hidden="true">↖</span>{playable ? 'Play the flow · hover a node to inspect its connections' : 'Drag to arrange · double-click to edit · hover to trace'}</div>}
        {busy && layout.nodes.length > 0 && <span className="layout-indicator" role="status">Updating layout…</span>}
      </div>
    </ReactFlowProvider>
    </EditingContext.Provider>
  </section>
}
