import type { CSSProperties } from 'react'

export interface GroupTheme { accent: string; border: string; surface: string; glow: string }
const palette: GroupTheme[] = [
  ['#426a9d', '#c3d2e6', '#eef3fb'],
  ['#795ba5', '#d5c9e6', '#f4effa'],
  ['#2d7b73', '#b8d9d2', '#edf7f3'],
  ['#97681f', '#e3d1ac', '#fbf5e8'],
  ['#327b93', '#b9d8e3', '#edf6fa'],
  ['#a05770', '#e3c5d0', '#fbf0f4'],
  ['#61718a', '#cad2df', '#f0f3f8'],
  ['#697b37', '#cfdab1', '#f3f6e9'],
].map(([accent, border, surface]) => ({ accent, border, surface, glow: `${accent}55` }))

const neutral: GroupTheme = { accent: '#657c6d', border: '#c4d0c6', surface: '#f5f7f1', glow: '#657c6d55' }

// Assignment follows sorted IDs, so moving declarations or changing labels keeps colors.
export function getGroupThemes(ids: string[]): Map<string, GroupTheme> {
  return new Map([...new Set(ids)].sort().map((id, index) => [id, palette[index % palette.length]]))
}

type ThemeStyle = CSSProperties & Record<'--group-accent' | '--group-border' | '--group-surface' | '--group-glow', string>
export function groupThemeStyle(theme = neutral): ThemeStyle {
  return { '--group-accent': theme.accent, '--group-border': theme.border, '--group-surface': theme.surface, '--group-glow': theme.glow }
}
