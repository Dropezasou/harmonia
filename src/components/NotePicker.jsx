import { useState } from 'react'
import { notesByFamily, noteLabel } from '../lib/knowledge'
import { Chip } from './ui'

export default function NotePicker({ value = [], onChange }) {
  const [open, setOpen] = useState(false)
  const toggle = (id) => onChange(value.includes(id) ? value.filter((n) => n !== id) : [...value, id])
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.length ? value.map((id) => <Chip key={id} active onClick={() => toggle(id)}>{noteLabel(id)} ×</Chip>)
          : <span className="text-sm text-ink-3">Nenhuma nota selecionada</span>}
      </div>
      <button type="button" onClick={() => setOpen(!open)} className="text-sm text-gold">
        {open ? 'Fechar lista de notas' : '+ Adicionar notas'}
      </button>
      {open && (
        <div className="space-y-3 rounded-lg bg-bg p-3">
          {notesByFamily.map((f) => (
            <div key={f.id}>
              <p className="mb-1 text-xs text-ink-3">{f.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {f.notes.map((n) => <Chip key={n.id} active={value.includes(n.id)} onClick={() => toggle(n.id)}>{n.label}</Chip>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NoteList({ notes = [] }) {
  return <span className="text-sm text-ink-2">{notes.map(noteLabel).join(' · ')}</span>
}
