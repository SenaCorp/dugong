import { useCallback, useEffect, useRef, useState } from 'react'
import { commitHistory, createHistory, redoHistory, undoHistory, type DiagramDocument } from './documentHistory'
import type { Point } from '../layout/flowTypes'

export function useDocumentHistory(initialDocument: () => string | DiagramDocument) {
  const [history, setHistory] = useState(() => {
    const initial = initialDocument()
    return createHistory(typeof initial === 'string' ? { source: initial, positions: {} } : initial)
  })
  const typingTime = useRef(0)
  const commit = useCallback((transform: (document: DiagramDocument) => DiagramDocument, typing = false) => {
    const now = Date.now(), coalesce = typing && now - typingTime.current < 750
    typingTime.current = typing ? now : 0
    setHistory(previous => {
      const present = transform(previous.present)
      if (JSON.stringify(present) === JSON.stringify(previous.present)) return previous
      return coalesce && !previous.future.length ? { ...previous, present, version: previous.version + 1 } : commitHistory(previous, present)
    })
  }, [])
  const setSource = useCallback((source: string) => commit(document => ({ ...document, source }), true), [commit])
  const setPositions = useCallback((positions: Record<string, Point>) => commit(document => ({ ...document, positions })), [commit])
  const undo = useCallback(() => { typingTime.current = 0; setHistory(undoHistory) }, [])
  const redo = useCallback(() => { typingTime.current = 0; setHistory(redoHistory) }, [])
  const resetDocument = useCallback((source: string) => { typingTime.current = 0; setHistory(previous => ({ ...createHistory({ source, positions: {} }), version: previous.version + 1 })) }, [])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"], .monaco-editor')) return
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo() }
      else if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo() }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [undo, redo])
  return { documentRevision: history.version, ...history.present, commit, setSource, setPositions, resetDocument, undo, redo, canUndo: Boolean(history.past.length), canRedo: Boolean(history.future.length) }
}
