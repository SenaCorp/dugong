import { SelectControl } from '../components/SelectControl'
import { lazy, Suspense, useState } from 'react'
import { PreviewPanel } from '../components/PreviewPanel'
import { useDiagram } from '../features/diagram/hooks/useDiagram'
import { DIAGRAM_EXAMPLES } from '../features/diagram/examples/defaultDiagram'

const EditorPanel = lazy(() => import('../components/EditorPanel'))

export default function App() {
  const diagram = useDiagram()
  const [expanded, setExpanded] = useState(false)
  return <main className={`app-shell ${expanded ? 'preview-expanded' : ''}`}>
    <header className="app-header flex items-center justify-between">
      <a className="wordmark flex items-center gap-2.5" href="./" aria-label="Flowlab workspace">
        <svg viewBox="0 0 26 26" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="2"/><rect x="16" y="16" width="8" height="8" rx="2"/><path d="M6 10v10h10M16 6h4v10"/><rect x="16" y="2" width="8" height="8" rx="2"/></svg>
        <span>flowlab<span className="wordmark-dot">.</span></span>
      </a>
      <span className="workspace-label hidden sm:block">DIAGRAM WORKSPACE</span>
      <div className="flex items-center gap-3">
        <SelectControl className="tool-button example-select" aria-label="Load a diagram example" value="" onChange={event => {
          const example = DIAGRAM_EXAMPLES[Number(event.target.value)]
          if (example) { diagram.loadExample(example.source); setExpanded(true) }
        }}>
          <option value="" disabled>Examples</option>
          {DIAGRAM_EXAMPLES.map((example, index) => <option key={example.label} value={index}>{example.label}</option>)}
        </SelectControl>
        <div className="local-badge hidden sm:flex items-center gap-2"><span />Browser only</div>
      </div>
    </header>
    <div className={`workspace-grid ${expanded ? 'is-expanded' : ''}`}>
      <Suspense fallback={<section className="editor-panel"><div className="panel-loading">Opening editor…</div></section>}>
        <EditorPanel source={diagram.source} onChange={diagram.setSource} errors={diagram.errors} layoutError={diagram.layoutError} />
      </Suspense>
      <PreviewPanel graph={diagram.graph} onSaveWorkspace={diagram.saveWorkspace} workspaceSaved={diagram.workspaceSaved} storageError={diagram.storageError} documentRevision={diagram.documentRevision} onEdit={diagram.applyEdit} onMove={diagram.moveNode} onAutoLayout={diagram.autoLayout} onUndo={diagram.undo} onRedo={diagram.redo} canUndo={diagram.canUndo} canRedo={diagram.canRedo} viewRevision={diagram.viewRevision} layout={diagram.layout} revision={diagram.revision} busy={diagram.busy}
        hasErrors={diagram.errors.length > 0 || Boolean(diagram.layoutError)} onReset={diagram.reset}
        expanded={expanded} onToggleExpanded={() => setExpanded(value => !value)} />
    </div>
    <footer className="app-footer flex items-center justify-between gap-4">
      <span>{diagram.layout.kind === 'er' ? 'ER · DATABASE RELATIONSHIPS' : diagram.layout.kind === 'c4' ? `${diagram.layout.c4Type} · ARCHITECTURE` : diagram.layout.kind === 'sequence' ? 'SEQUENCE · MESSAGE FLOW' : 'FLOWCHART · LR / RL / TD / BT'}</span>
      <span className="hidden sm:block">Your source stays in this browser.</span>
    </footer>
  </main>
}
