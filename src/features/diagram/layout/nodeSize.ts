import type { DiagramNode } from '../types/diagram'

export function nodeSize(node: DiagramNode) {
  if (node.er) {
    const width = Math.max(310, Math.min(440, Math.max(node.label.length * 9 + 48, ...node.er.attributes.map(attribute => attribute.name.length * 7 + attribute.type.length * 7 + 108))))
    const commentsHeight = node.er.attributes.reduce((height, attribute) => height + (attribute.comment ? Math.ceil(attribute.comment.length * 7 / (width - 40)) * 16 + 6 : 0), 0)
    return { width, height: 108 + node.er.attributes.length * 34 + commentsHeight }
  }
  if (node.c4) {
    const width = Math.max(260, Math.min(330, node.label.length * 8 + 48))
    const lines = (text: string, characterWidth = 7) => text.split('\n').reduce((count, line) => count + Math.max(1, Math.ceil(line.length * characterWidth / (width - 44))), 0)
    return { width, height: 72 + lines(node.label, 9) * 23 + (node.c4.technology ? lines(node.c4.technology) * 18 + 8 : 0) + (node.c4.description ? lines(node.c4.description) * 18 + 10 : 0) }
  }
  const width = Math.max(190, Math.min(300, node.label.length * 8 + 48))
  if (node.shape === 'circle' || node.shape === 'doubleCircle') {
    const initial = Math.max(180, Math.min(300, node.label.length * 4 + 70))
    const lines = node.label.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length * 8 / (initial - 64))), 0)
    const diameter = Math.max(initial, lines * 20 + 70)
    return { width: diameter, height: diameter }
  }
  const contentWidth = width - (['diamond', 'hexagon', 'parallelogram', 'trapezoid'].includes(node.shape) ? 84 : 48)
  const extraLines = node.label.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length * 8 / contentWidth)), 0) - 1
  return node.shape === 'diamond' ? { width: Math.max(190, width + 36), height: 112 + extraLines * 20 }
    : { width, height: (node.shape === 'database' ? 88 : 82) + extraLines * 20 }
}

