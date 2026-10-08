import type { DiagramEdge } from '../types/diagram'

export function sequencePlaybackPath(edges: Pick<DiagramEdge, 'id' | 'sequenceBranches'>[], choices: Readonly<Record<string, number>>) {
  return edges.filter(edge => (edge.sequenceBranches ?? []).every(branch => (choices[branch.fragmentId] ?? 0) === branch.branchIndex)).map(edge => edge.id)
}
