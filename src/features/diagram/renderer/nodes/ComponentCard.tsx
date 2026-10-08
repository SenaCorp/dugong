export function ComponentCard({ id, label, kind }: { id: string; label: string; kind?: 'actor' | 'participant' }) {
  return <div className="component-surface">
    <div className="component-heading">
      <span className="component-symbol" aria-hidden="true"><i /><i /></span>
      <span className="component-id">{kind ? kind.toUpperCase() : id === label ? 'COMPONENT' : id}</span>
    </div>
    <span className="component-label">{label}</span>
  </div>
}
