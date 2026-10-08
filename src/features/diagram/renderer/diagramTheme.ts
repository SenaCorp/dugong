import type { LayoutDiagram } from '../layout/flowTypes'
import type { GroupTheme } from './groupThemes'

function mix(color: string, base: string, weight: number): string {
  const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16)
  return '#' + [0, 1, 2].map(index => Math.round(channel(color, index) * weight + channel(base, index) * (1 - weight)).toString(16).padStart(2, '0')).join('')
}
function darkGroup(theme: GroupTheme): GroupTheme {
  const accent = mix(theme.accent, '#ffffff', .65)
  return { accent, border: mix(theme.accent, '#37403d', .55), surface: mix(theme.accent, '#222b29', .14), glow: `${accent}55` }
}
export function applyDiagramTheme(layout: LayoutDiagram, theme?: 'light' | 'dark'): LayoutDiagram {
  if (!theme) return layout
  if (theme === 'light') return { ...layout, theme }
  return {
    ...layout, theme,
    nodes: layout.nodes.map(node => ({ ...node, data: { ...node.data, theme: darkGroup(node.data.theme ?? { accent: '#657c6d', border: '#c4d0c6', surface: '#f5f7f1', glow: '#657c6d55' }) } })),
  }
}
