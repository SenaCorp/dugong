import { createContext, useContext } from 'react'
import type { Point } from '../layout/flowTypes'
import type { SourceEdit } from './editSource'

export interface EditTarget { kind: 'nodeLabel' | 'edgeLabel' | 'noteLabel'; id: string; label: string; anchor: Point }
export interface EditingControls {
  inspect?: () => void
  inspecting?: boolean
  documentRevision: number
  disabled: boolean
  selectedId: string | null
  target: EditTarget | null
  dragging: boolean
  connecting: boolean
  select: (id: string | null) => void
  open: (target: EditTarget) => void
  close: () => void
  apply: (action: SourceEdit) => boolean
  move: (id: string, position: Point, revision: number) => void
  setDragging: (value: boolean) => void
  setConnecting: (value: boolean) => void
}
export const EditingContext = createContext<EditingControls | null>(null)
export function useEditing() { return useContext(EditingContext) }
