import { useState } from 'react'
import { STRENGTHS } from '../lib/knowledge'
import { searchCigars, externalLinks } from '../lib/lookup'
import { cigarTitle } from '../lib/store'
import NotePicker, { NoteList } from './NotePicker'
import { Button, Empty, Field, Input, Segmented, Sheet } from './ui'

const blank = { brand: '', line: '', name: '', vitola: '', wrapper: '', binder: '', filler: '', strength: 'medio', notes: [], qty: 1 }

export default function Humidor({ data, onPair }) {
  const [edit, setEdit] = useState(null)
  const list = [...data.cigars].sort((a, b) => cigarTitle(a).localeCompare(cigarTitle(b)))
  return (
    <section className="space-y-3">
      <Button className="w-full" onClick={() => setEdit(blank)}>+ Adicionar charuto</Button>
      {!list.length && <Empty>Seu umidor está vazio. Cadastre seus charutos para receber sugestões.</Empty>}
      {list.map((c) => (
        <article key={c.id} className={`rounded-xl bg-surface p-4 ${c.qty > 0 ? '' : 'opacity-50'}`}>
          <div className="flex items-start justify-between gap-2" onClick={() => setEdit(c)}>
            <div>
              <h3 className="font-semibold">{cigarTitle(c)}</h3>
              <p className="text-xs text-ink-3">{[c.vitola, STRENGTHS[c.strength], c.wrapper && `capa ${c.wrapper}`].filter(Boolean).join(' · ')}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-sm text-ink-2">{c.qty ?? 0} un</span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-2">
            <NoteList notes={c.notes} />
            <button onClick={() => onPair(c)} className="shrink-0 text-sm font-semibold text-gold">Harmonizar →</button>
          </div>
        </article>
      ))}
      <CigarForm item={edit} onClose={() => setEdit(null)} data={data} />
    </section>
  )
}

function CigarForm({ item, onClose, data }) {
  const [f, setF] = useState(item)
  const [q, setQ] = useState('')
  const [lastItem, setLastItem] = useState(item)
  if (item !== lastItem) { setLastItem(item); setF(item); setQ('') }
  if (!item || !f) return null
  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e })
  const results = q.length > 2 ? searchCigars(q) : []
  const apply = (c) => { setF({ ...f, ...c, notes: [...c.notes], qty: f.qty }); setQ('') }
  const submit = async () => { await data.save('cigars', { ...f, qty: Number(f.qty) || 0 }); onClose() }

  return (
    <Sheet open title={f.id ? 'Editar charuto' : 'Novo charuto'} onClose={onClose}>
      {!f.id && (
        <div className="rounded-lg border border-line p-3">
          <Field label="Buscar ficha técnica">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex.: Padrón 1964, Cohiba Siglo" />
          </Field>
          {results.map((c, i) => (
            <button key={i} onClick={() => apply(c)} className="mt-2 block w-full rounded-lg bg-bg p-2 text-left">
              <span className="font-medium">{cigarTitle(c)}</span>
              <span className="block text-xs text-ink-3">{STRENGTHS[c.strength]} · capa {c.wrapper}</span>
            </button>
          ))}
          {q.length > 2 && (
            <div className="mt-2 text-xs text-ink-3">
              {!results.length && 'Não encontrado na base local. '}Pesquisar em:{' '}
              {externalLinks(q).map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="mr-2 text-gold underline">{l.label}</a>)}
              <p className="mt-1">Preencha manualmente abaixo com o que encontrar.</p>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca"><Input value={f.brand} onChange={set('brand')} /></Field>
        <Field label="Linha"><Input value={f.line} onChange={set('line')} /></Field>
        <Field label="Nome"><Input value={f.name} onChange={set('name')} /></Field>
        <Field label="Vitola / bitola"><Input value={f.vitola} onChange={set('vitola')} /></Field>
      </div>
      <Field label="Capa (wrapper)"><Input value={f.wrapper} onChange={set('wrapper')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Capote (binder)"><Input value={f.binder} onChange={set('binder')} /></Field>
        <Field label="Tripa (filler)"><Input value={f.filler} onChange={set('filler')} /></Field>
      </div>
      <Field group label="Força"><Segmented options={STRENGTHS} value={f.strength} onChange={set('strength')} /></Field>
      <Field group label="Notas de sabor predominantes"><NotePicker value={f.notes} onChange={set('notes')} /></Field>
      <Field label="Quantidade no umidor"><Input type="number" inputMode="numeric" min="0" value={f.qty} onChange={set('qty')} /></Field>
      <div className="flex gap-2">
        {f.id && <Button variant="danger" onClick={async () => { if (confirm('Remover este charuto?')) { await data.del('cigars', f.id); onClose() } }}>Excluir</Button>}
        <Button className="flex-1" disabled={!f.brand || !f.strength} onClick={submit}>Salvar</Button>
      </div>
    </Sheet>
  )
}
