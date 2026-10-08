import { SelectControl } from './SelectControl'
import type { ERAttribute } from '../features/diagram/types/diagram'

const KEY_OPTIONS = ['', 'PK', 'FK', 'UK', 'PK,FK', 'PK,UK', 'FK,UK', 'PK,FK,UK']
export function ERAttributeFields({ attributes, onChange }: { attributes: ERAttribute[]; onChange: (attributes: ERAttribute[]) => void }) {
  const update = (index: number, patch: Partial<ERAttribute>) => onChange(attributes.map((attribute, i) => i === index ? { ...attribute, ...patch } : attribute))
  return <div className="inspector-attributes">
    <div className="inspector-section-title">Attributes <span>{attributes.length}</span></div>
    {attributes.map((attribute, index) => <div className="inspector-attribute" key={index}>
      <div className="attribute-fields">
        <input aria-label={`Attribute ${index + 1} type`} title="Attribute type" placeholder="Type" value={attribute.type} onChange={event => update(index, { type: event.target.value })} />
        <input aria-label={`Attribute ${index + 1} name`} title="Attribute name" placeholder="Name" value={attribute.name} onChange={event => update(index, { name: event.target.value })} />
        <SelectControl aria-label={`Attribute ${index + 1} keys`} value={[...attribute.keys].sort().join(',')} onChange={event => update(index, { keys: event.target.value ? event.target.value.split(',') as ERAttribute['keys'] : [] })}>
          {KEY_OPTIONS.map(keys => <option key={keys} value={keys.split(',').sort().join(',')}>{keys || 'No key'}</option>)}
        </SelectControl>
        <button className="tool-button" type="button" aria-label={`Remove attribute ${index + 1}`} onClick={() => onChange(attributes.filter((_, i) => i !== index))}>×</button>
      </div>
      <input aria-label={`Attribute ${index + 1} comment`} placeholder="Comment (optional)" value={attribute.comment ?? ''} onChange={event => update(index, { comment: event.target.value })} />
    </div>)}
    <button className="tool-button" type="button" onClick={() => onChange([...attributes, { type: 'string', name: '', keys: [] }])}>+ Add attribute</button>
  </div>
}
