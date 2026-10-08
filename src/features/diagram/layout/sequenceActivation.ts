import type { SequenceActivation, SequenceBranchReference } from '../types/diagram'

export function activationOffset(bars: SequenceActivation[], participantId: string, messageIndex: number, context: SequenceBranchReference[] = []): number | undefined {
  const active = bars.filter(bar => bar.participantId === participantId && bar.start <= messageIndex && bar.end > messageIndex
    && (bar.sequenceBranches ?? []).every(branch => context.some(current => current.fragmentId === branch.fragmentId && current.branchIndex === branch.branchIndex)))
  return active.length ? Math.max(...active.map(bar => bar.depth)) * 6 : undefined
}
