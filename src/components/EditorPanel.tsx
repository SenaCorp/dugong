import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { configureEditor, monaco } from './editorSetup'
import type { ParserError } from '../features/diagram/types/diagram'

interface EditorPanelProps {
  source: string
  onChange: (source: string) => void
  errors: ParserError[]
  layoutError: string | null
}

function setMarkers(editor: monaco.editor.IStandaloneCodeEditor, errors: ParserError[]) {
  const model = editor.getModel()
  if (model) monaco.editor.setModelMarkers(model, 'flowchart', errors.map(error => ({
    severity: monaco.MarkerSeverity.Error, message: error.message,
    startLineNumber: error.line, endLineNumber: error.line,
    startColumn: 1, endColumn: Math.max(2, error.source.length + 1),
  })))
}

export default function EditorPanel({ source, onChange, errors, layoutError }: EditorPanelProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const onMount: OnMount = editor => { editorRef.current = editor; setMarkers(editor, errors) }
  useEffect(() => {
    if (editorRef.current) setMarkers(editorRef.current, errors)
  }, [errors])

  return <section className="editor-panel" aria-label="Diagram source">
    <div className="panel-header editor-header">
      <h2 className="panel-title">Source</h2>
      <span className="file-tab"><span className="code-symbol">&lt;/&gt;</span> diagram.mmd</span>
    </div>
    <div className="editor-body">
      <Editor height="100%" value={source} language="flowchart" theme="flowlab-paper" path="diagram.mmd"
        beforeMount={configureEditor} onMount={onMount} onChange={value => onChange(value ?? '')}
        loading={<div className="panel-loading">Opening editor…</div>}
        options={{
          ariaLabel: 'Diagram source editor', automaticLayout: true, minimap: { enabled: false },
          fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace', fontSize: 13,
          lineHeight: 27, lineNumbersMinChars: 3, glyphMargin: false, folding: false,
          padding: { top: 23, bottom: 24 }, scrollBeyondLastLine: false,
          wordWrap: 'off', renderLineHighlight: 'line', roundedSelection: true,
          overviewRulerLanes: 0, overviewRulerBorder: false, hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
          tabSize: 2, quickSuggestions: false, suggestOnTriggerCharacters: false,
          stickyScroll: { enabled: false }, contextmenu: false,
        }} />
    </div>
    {(errors.length > 0 || layoutError) && <div className="parser-errors" role="alert" aria-label="Diagram errors">
      <div className="error-heading"><span aria-hidden="true">!</span> {errors.length ? `${errors.length} ${errors.length === 1 ? 'issue' : 'issues'} in source` : 'Layout issue'}</div>
      <p className="error-note">Your last valid diagram stays on the canvas.</p>
      {errors.map((error, index) => <button key={`${error.line}-${index}`} className="error-item" onClick={() => {
        editorRef.current?.revealLineInCenter(error.line); editorRef.current?.setPosition({ lineNumber: error.line, column: 1 }); editorRef.current?.focus()
      }}><b>Line {error.line}</b><span>{error.message}</span><code>{error.source}</code></button>)}
      {layoutError && <p>{layoutError}</p>}
    </div>}
    <div className="editor-footer"><span>DIAGRAM SOURCE</span><span>UTF-8 <i>·</i> {source.split('\n').length} lines</span></div>
  </section>
}
