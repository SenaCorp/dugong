import { SelectControl } from './SelectControl'
import type { SequenceFragment } from '../features/diagram/types/diagram'

export function SequenceBranchControls({ fragments, choices, onChange }: { fragments: SequenceFragment[]; choices: Readonly<Record<string, number>>; onChange: (id: string, index: number) => void }) {
  return <div className="sequence-branch-controls" aria-label="Sequence playback conditions">
    <span>Playback path</span>
    {fragments.filter(fragment => fragment.kind !== 'loop').map((fragment, index) => <label key={fragment.id}>
      <span>{fragments.length > 1 ? `${fragment.kind} ${index + 1}` : fragment.kind}</span>
      <SelectControl value={choices[fragment.id] ?? 0} onChange={event => onChange(fragment.id, Number(event.target.value))} aria-label={`Playback condition for ${fragment.kind} ${index + 1}`}>
        {fragment.branches.map((branch, branchIndex) => <option key={branchIndex} value={branchIndex}>{fragment.kind === 'opt' ? `Include · ${branch.label}` : branch.label}</option>)}
        {fragment.kind === 'opt' && <option value={1}>Skip · {fragment.branches[0].label}</option>}
      </SelectControl>
    </label>)}
  </div>
}
