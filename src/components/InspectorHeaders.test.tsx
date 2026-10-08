import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReactFlowProvider } from '@xyflow/react'
import { GroupNode } from '../features/diagram/renderer/nodes/GroupNode'
import { SequenceFrameNode } from '../features/diagram/renderer/nodes/SequenceFrameNode'
import { SequenceDecorationNode } from '../features/diagram/renderer/nodes/SequenceDecorationNode'
import { EditingContext, type EditingControls } from '../features/diagram/editing/EditingContext'
import type { FlowNode } from '../features/diagram/layout/flowTypes'
import type { NodeProps } from '@xyflow/react'
const controls: EditingControls = { documentRevision: 0, disabled: false, selectedId: null, target: null, dragging: false, connecting: false, select: () => {}, inspect: () => {}, open: () => {}, close: () => {}, apply: () => true, move: () => {}, setDragging: () => {}, setConnecting: () => {} }
const props: NodeProps<FlowNode> = { id: 'g', type: 'group', data: { label: 'Backend', shape: 'group', ports: [] }, dragging: false, isConnectable: false, selected: false, selectable: false, deletable: false, draggable: false, zIndex: 0, positionAbsoluteX: 0, positionAbsoluteY: 0 }
it('provides keyboard accessible header controls for groups and sequence frames/boxes', () => {
  const render = (content: React.ReactNode) => renderToStaticMarkup(<EditingContext.Provider value={controls}><ReactFlowProvider>{content}</ReactFlowProvider></EditingContext.Provider>)
  expect(render(<GroupNode {...props} />)).toContain('aria-label="Inspect Backend group"')
  expect(render(<SequenceFrameNode {...props} data={{ ...props.data, sequenceFrame: { fragmentId: 'fragment-1', kind: 'alt', branches: [{ label: 'valid', y: 0 }] } }} />)).toContain('aria-label="Inspect alt condition"')
  expect(render(<SequenceDecorationNode {...props} id=":box:sequence-box-1" type="sequenceBox" />)).toContain('aria-label="Inspect Backend box"')
})
