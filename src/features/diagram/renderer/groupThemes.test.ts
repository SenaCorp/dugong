import { expect, it } from 'vitest'
import { getGroupThemes } from './groupThemes'

const ids = ['GATEWAY', 'SERVICES', 'INFRA', 'CORE', 'THIRD_PARTY', 'WEB', 'HOST', 'RE']
it('gives each sample group a different accent', () => {
  const themes = getGroupThemes(ids)
  expect(themes.size).toBe(8)
  expect(new Set([...themes.values()].map(theme => theme.accent)).size).toBe(8)
})
it('keeps group colors stable when source declarations are reordered', () => {
  const original = getGroupThemes(ids)
  const reordered = getGroupThemes([...ids].reverse())
  for (const id of ids) expect(reordered.get(id)).toEqual(original.get(id))
})
