import type { FlowNode } from '../layout/flowTypes'

export function isDecoration(node: Pick<FlowNode, 'type'>) {
  return ['group', 'lifeline', 'sequenceFrame', 'sequenceNote', 'activation', 'sequenceBox', 'sequenceFooter'].includes(node.type ?? '')
}
