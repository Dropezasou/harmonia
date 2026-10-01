import { useState } from 'react'
import { BODIES, drinkTypes } from '../lib/knowledge'
import { drinkTitle } from '../lib/store'
import NotePicker, { NoteList } from './NotePicker'
import { Button, Chip, Empty, Field, Input, Segmented, Sheet, inputCls } from './ui'

const CATS = drinkTypes.categories
const blank = (category) => ({ category, brand: '', name: '', type: '', notes: [], body: 'medio', qty: 1 })

export default function Cellar({ data }) {
  const [edit, setEdit] = useState(null)
  const [cat, setCat] = useState('')
  const list = data.drinks.filter((d) => !cat || d.category === cat).sort((a, b) => drinkTitle(a).localeCompare(drinkTitle(b)))
  return (
    <section className="space-y-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip active={!cat} onClick={() => setCat('')}>Todas</Chip>
        {Object.entries(CATS).map(([k, c]) => <Chip key={k} active={cat === k} onClick={() => setCat(k)}>{c.icon} {c.label}</Chip>)}
      </div>
      <Button className="w-full" onClick={() => setEdit(blank(cat || 'whisky'))}>+ Adicionar bebida</Button>
      {!list.length && <Empty>Nenhuma bebida aqui ainda.</Empty>}
      {list.map((d) => (
        <article key={d.id} onClick={() => setEdit(d)} className={`rounded-xl bg-surface p-4 ${d.qty > 0 ? '' : 'opacity-50'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{CATS[d.category]?.icon} {drinkTitle(d)}</h3>
              <p className="text-xs text-ink-3">{[d.type, BODIES[d.body] && `corpo ${BODIES[d.body].toLowerCase()}`].filter(Boolean).join(' · ')}</p>
            </div>
            {!(d.qty > 0) && <span className="text-xs text-ink-3">acabou</span>}
          </div>
          <div className="mt-2"><NoteList notes={d.notes} /></div>
        </article>
      ))}
      <DrinkForm item={edit} onClose={() => setEdit(null)} data={data} />
    </section>
  )
}

function DrinkForm({ item, onClose, data }) {
  const [f, setF] = useState(item)
  const [lastItem, setLastItem] = useState(item)
  if (item !== lastItem) { setLastItem(item); setF(item) }
  if (!item || !f) return null
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  const types = drinkTypes.types[f.category] || {}
  const pickType = (t) => {
    const preset = types[t]
    // só sobrescreve notas/corpo se o usuário ainda não personalizou
    setF({ ...f, type: t, ...(preset && !f.notes.length ? { notes: [...preset.notes], body: preset.body } : {}) })
  }
  const submit = async () => { await data.save('drinks', { ...f, qty: f.qty ? 1 : 0 }); onClose() }

  return (
    <Sheet open title={f.id ? 'Editar bebida' : 'Nova bebida'} onClose={onClose}>
      <Field group label="Categoria">
        <Segmented options={Object.fromEntries(Object.entries(drinkTypes.categories).map(([k, c]) => [k, c.icon + ' ' + c.label.split(' ')[0]]))}
          value={f.category} onChange={(c) => c && setF({ ...f, category: c, type: '' })} />
      </Field>
      <Field label="Tipo">
        <select className={inputCls} value={types[f.type] || !f.type ? f.type : '__outro'} onChange={(e) => pickType(e.target.value === '__outro' ? '' : e.target.value)}>
          <option value="">Selecione…</option>
          {Object.keys(types).map((t) => <option key={t}>{t}</option>)}
          <option value="__outro">Outro (digitar)</option>
        </select>
      </Field>
      {!types[f.type] && <Field label="Tipo (livre)"><Input value={f.type} onChange={set('type')} placeholder="ex.: Bourbon Wheated" /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca"><Input value={f.brand} onChange={set('brand')} placeholder="ex.: Buffalo Trace" /></Field>
        <Field label="Rótulo / nome"><Input value={f.name} onChange={set('name')} placeholder="ex.: 10 anos" /></Field>
      </div>
      <Field group label="Corpo / intensidade"><Segmented options={BODIES} value={f.body} onChange={set('body')} /></Field>
      <Field group label="Notas sensoriais predominantes">
        <NotePicker value={f.notes} onChange={set('notes')} />
        {types[f.type] && <button type="button" className="mt-1 text-xs text-ink-3 underline" onClick={() => setF({ ...f, notes: [...types[f.type].notes], body: types[f.type].body })}>Restaurar notas típicas de {f.type}</button>}
      </Field>
      <label className="flex items-center gap-2 text-ink-2">
        <input type="checkbox" checked={f.qty > 0} onChange={(e) => setF({ ...f, qty: e.target.checked ? 1 : 0 })} className="h-5 w-5 accent-[#d9a85b]" />
        Tenho em casa
      </label>
      <div className="flex gap-2">
        {f.id && <Button variant="danger" onClick={async () => { if (confirm('Remover esta bebida?')) { await data.del('drinks', f.id); onClose() } }}>Excluir</Button>}
        <Button className="flex-1" disabled={!f.brand || !f.body} onClick={submit}>Salvar</Button>
      </div>
    </Sheet>
  )
}
