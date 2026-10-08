import { useReactFlow } from '@xyflow/react'

interface PlaybackControls { playing: boolean; index: number | null; count: number; onPlay: () => void; onStop: () => void }
interface ToolbarProps { onAdd: () => void; onInspect: () => void; inspecting: boolean; onSaveWorkspace: () => void; workspaceSaved: boolean; onAutoLayout: () => void; onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean; onExport: (format: 'svg' | 'png') => void; exporting: boolean; nodeCount: number; edgeCount: number; onReset: () => void; busy: boolean; hasErrors: boolean; expanded: boolean; onToggleExpanded: () => void; playback?: PlaybackControls; isSequence?: boolean }

export function Toolbar({ onAdd, onInspect, inspecting, onSaveWorkspace, workspaceSaved, onAutoLayout, onUndo, onRedo, canUndo, canRedo, onExport, exporting, nodeCount, edgeCount, onReset, busy, hasErrors, expanded, onToggleExpanded, playback, isSequence }: ToolbarProps) {
  const { fitView } = useReactFlow()
  const previewState = hasErrors ? 'has-errors' : busy ? 'is-updating' : 'is-live'
  return <div className="panel-header preview-header">
    <div className="preview-title"><h2 className="panel-title">Preview</h2><span className={`preview-state ${previewState}`} role="status" aria-live="polite">
      <i aria-hidden="true" />{hasErrors ? 'Last valid' : busy ? 'Laying out' : 'Live'}
    </span></div>
    <div className="preview-actions">
      <span className="graph-count"><b>{nodeCount}</b> {isSequence ? 'participants' : 'nodes'} <i>·</i> <b>{edgeCount}</b> {isSequence ? 'messages' : 'edges'}</span>
      {playback && <>
        <span className="playback-step" aria-live="polite">{playback.index !== null ? `${playback.index + 1} / ${playback.count}` : 'Ready'}</span>
        <button className="tool-button play-button" onClick={playback.playing ? playback.onStop : playback.onPlay} disabled={!playback.count || busy || hasErrors}>
          <span aria-hidden="true">{playback.playing ? '■' : '▶'}</span>{playback.playing ? 'Stop' : 'Play flow'}
        </button>
      </>}
      <button className="tool-button" onClick={onAdd} disabled={busy || hasErrors}>+ Add</button>
      <button className="tool-button" onClick={onInspect} aria-pressed={inspecting}>Inspect</button>
      <button className="tool-button workspace-save" onClick={onSaveWorkspace} disabled={busy || hasErrors} title="Save source and manual arrangement in this browser">{workspaceSaved ? '✓ Saved' : 'Save workspace'}</button>
      <button className="tool-button" aria-label="Undo" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)">↶</button>
      <button className="tool-button" aria-label="Redo" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)">↷</button>
      <button className="tool-button" onClick={onAutoLayout} disabled={busy}>Auto layout</button>
      <button className="tool-button expand-button" onClick={onToggleExpanded} aria-pressed={expanded} title={expanded ? 'Show source editor' : 'Use the full workspace for the diagram'}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M6 3v10" /></svg>{expanded ? 'Show source' : 'Expand'}
      </button>
      <button className="tool-button" onClick={() => void fitView({ padding: .18, duration: 300, minZoom: .03, maxZoom: 1 })}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 2.5h-3v3m8-3h3v3m0 5v3h-3m-5 0h-3v-3" /></svg>Fit view
      </button>
      <button className="tool-button" disabled={busy || exporting || !nodeCount} onClick={() => onExport('svg')} title="Download the complete diagram as SVG">SVG</button>
      <button className="tool-button" disabled={busy || exporting || !nodeCount} onClick={() => onExport('png')} title="Download the complete diagram as PNG">{exporting ? 'Exporting…' : 'PNG'}</button>
      <button className="tool-button reset-button" onClick={onReset} title="Restore the diagram.md sample">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 5.5a5 5 0 1 1-.5 4M3.5 2v3.5H7" /></svg>Reset
      </button>
    </div>
  </div>
}
