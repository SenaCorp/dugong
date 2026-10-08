import type { CSSProperties } from 'react'
import type { DiagramStyle } from '../types/diagram'
import { groupThemeStyle, type GroupTheme } from './groupThemes'

export function diagramStyle(style?: DiagramStyle, theme?: GroupTheme): CSSProperties {
  return {
    ...groupThemeStyle(theme),
    ...(style?.stroke ? { '--node-stroke': style.stroke, '--group-accent': style.stroke, '--group-border': style.stroke, '--group-glow': `color-mix(in srgb, ${style.stroke} 35%, transparent)` } : {}),
    ...(style?.fill ? { '--node-fill': style.fill, '--group-surface': style.fill } : {}),
    ...(style?.color ? { '--node-color': style.color } : {}),
    ...(style?.strokeWidth ? { '--node-stroke-width': `${style.strokeWidth}px` } : {}),
    ...(style?.strokeDasharray ? { '--node-stroke-dasharray': style.strokeDasharray } : {}),
  } as CSSProperties
}
