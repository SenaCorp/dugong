import { expect, it } from 'vitest'
import { readWorkspace, saveWorkspace, clearWorkspace, SOURCE_KEY, WORKSPACE_KEY } from './workspaceStorage'
const storage = () => {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
it('restores matching source and absolute positions after a save', () => {
  const store = storage(), doc = { source: 'flowchart LR\nA', positions: { A: { x: 10, y: 20 } } }
  saveWorkspace(store, doc)
  expect(readWorkspace(store, 'default').document).toEqual(doc)
  expect(readWorkspace(store, 'default').saved).toEqual(doc)
})
it('does not apply saved pins to newer autosaved source', () => {
  const store = storage(), doc = { source: 'flowchart LR\nA', positions: { A: { x: 10, y: 20 } } }
  saveWorkspace(store, doc)
  store.setItem(SOURCE_KEY, 'flowchart LR\nB')
  expect(readWorkspace(store, 'default').document).toEqual({ source: 'flowchart LR\nB', positions: {} })
})
it('loads legacy autosaved source and handles corrupt or unsupported snapshots', () => {
  const store = storage()
  store.setItem(SOURCE_KEY, 'old source')
  for (const raw of ['bad json', '{"version":3}', '{"version":1,"source":"old source","positions":{"A":{"x":"bad","y":2}}}']) {
    store.setItem(WORKSPACE_KEY, raw)
    expect(readWorkspace(store, 'default').document).toEqual({ source: 'old source', positions: {} })
  }
})
it('rejects nonfinite or extreme saved coordinates', () => {
  const store = storage()
  expect(() => saveWorkspace(store, { source: 'flowchart LR', positions: { A: { x: Infinity, y: 1 } } })).toThrow(/positions/)
  expect(() => saveWorkspace(store, { source: 'flowchart LR', positions: { A: { x: 2e6, y: 1 } } })).toThrow(/positions/)
})
it('reads unavailable storage gracefully but surfaces save failures', () => {
  const store = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  expect(readWorkspace(store, 'default').document).toEqual({ source: 'default', positions: {} })
  expect(() => saveWorkspace(store, { source: 'text', positions: {} })).toThrow('blocked')
})
it('reset clears saved arrangement while retaining the current autosaved source', () => {
  const store = storage()
  saveWorkspace(store, { source: 'old', positions: { A: { x: 1, y: 2 } } })
  store.setItem(SOURCE_KEY, 'reset')
  clearWorkspace(store)
  expect(store.getItem(WORKSPACE_KEY)).toBeNull()
  expect(readWorkspace(store, 'default').document.source).toBe('reset')
})
