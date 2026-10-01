import { useMemo, useState } from 'react'
import { recommend } from '../lib/engine'
import { drinkTypes, rules, STRENGTHS } from '../lib/knowledge'
import { cigarTitle, drinkTitle } from '../lib/store'
import { NoteList } from './NotePicker'
import { Button, Empty, Field, Segmented, Sheet, Stars, inputCls } from './ui'

const label = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v.label]))
const MOMENTS = label(rules.context.moments)
const OCCASIONS = label(rules.context.occasions)
const nowMoment = () => { const h = new Date().getHours(); return h < 12 ? 'manha' : h < 18 ? 'tarde' : 'noite' }

export default function Pairing({ data, cigarId, setCigarId, goTo }) {
  const [moment, setMoment] = useState(nowMoment)
  const [occasion, setOccasion] = useState('')
  const [show, setShow] = useState(false)
  const [log, setLog] = useState(null)
  const cigars = data.cigars.filter((c) => c.qty > 0 || c.id === cigarId)
  const cigar = data.cigars.find((c) => c.id === cigarId)
  const results = useMemo(
    () => (cigar && show ? recommend(cigar, data.drinks, { moment, occasion, sessions: data.sessions }) : []),
    [cigar, show, moment, occasion, data.drinks, data.sessions]
  )

  if (!data.cigars.length || !data.drinks.length)
    return <Empty>Cadastre ao menos um charuto no <b>Umidor</b> e uma bebida na <b>Adega</b> para harmonizar.</Empty>

  return (
    <section className="space-y-4">
      <div className="space-y-4 rounded-xl bg-surface p-4">
        <Field label="1. Qual charuto você vai fumar?">
          <select className={inputCls} value={cigarId || ''} onChange={(e) => { setCigarId(e.target.value); setShow(false) }}>
            <option value="">Selecione…</option>
            {cigars.map((c) => <option key={c.id} value={c.id}>{cigarTitle(c)}</option>)}
          </select>
        </Field>
        {cigar && <p className="-mt-2 text-xs text-ink-3">{STRENGTHS[cigar.strength]} · <NoteList notes={cigar.notes} /></p>}
        <Field group label="2. Em que momento?"><Segmented options={MOMENTS} value={moment} onChange={(v) => v && setMoment(v)} /></Field>
        <Field group label="3. Ocasião (opcional)"><Segmented options={OCCASIONS} value={occasion} onChange={setOccasion} /></Field>
        <Button className="w-full" disabled={!cigar} onClick={() => setShow(true)}>Sugerir bebidas</Button>
      </div>

      {show && cigar && (
        <div className="space-y-3">
          <p className="text-sm text-ink-3">{rules.context.moments[moment].text} {occasion && rules.context.occasions[occasion].text}</p>
          {!results.length && <Empty>Nenhuma bebida disponível na adega.</Empty>}
          {results.slice(0, 6).map((r, i) => (
            <article key={r.drink.id} className={`rounded-xl p-4 ${i === 0 ? 'border border-gold/60 bg-surface-2' : 'bg-surface'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{drinkTypes.categories[r.drink.category]?.icon} {drinkTitle(r.drink)}</h3>
                  <p className="text-xs text-ink-3">{r.drink.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gold">{Math.round(r.score * 100)}</p>
                  <p className="text-[11px] text-ink-3">{r.verdict}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {r.reasons.map((x, j) => (
                  <li key={j} className="flex gap-2">
                    <span className={x.good ? 'text-ok' : 'text-warn'}>{x.good ? '✓' : '!'}</span>
                    <span className="text-ink-2">{x.text}</span>
                  </li>
                ))}
              </ul>
              <Button variant={i === 0 ? 'primary' : 'ghost'} className="mt-3 w-full" onClick={() => setLog(r)}>Vou de {r.drink.brand}</Button>
            </article>
          ))}
        </div>
      )}
      {log && <LogSheet r={log} cigar={cigar} moment={moment} occasion={occasion} data={data} onClose={() => setLog(null)} onDone={() => { setLog(null); setShow(false); goTo('history') }} />}
    </section>
  )
}

function LogSheet({ r, cigar, moment, occasion, data, onClose, onDone }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [consume, setConsume] = useState(true)
  const save = async () => {
    await data.save('sessions', {
      date: new Date().toISOString(), moment, occasion,
      cigarId: cigar.id, cigarName: cigarTitle(cigar),
      drinkId: r.drink.id, drinkName: drinkTitle(r.drink), drinkCategory: r.drink.category,
      matchScore: Math.round(r.score * 100), rating, comment
    })
    if (consume && cigar.qty > 0) await data.save('cigars', { ...cigar, qty: cigar.qty - 1 })
    onDone()
  }
  return (
    <Sheet open title="Registrar harmonização" onClose={onClose}>
      <p><b>{cigarTitle(cigar)}</b> + <b>{drinkTitle(r.drink)}</b></p>
      <Field group label="Sua avaliação (pode dar depois, no histórico)"><Stars value={rating} onChange={setRating} size="text-3xl" /></Field>
      <Field label="Comentários"><textarea className={inputCls} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Como foi a combinação?" /></Field>
      <label className="flex items-center gap-2 text-ink-2">
        <input type="checkbox" checked={consume} onChange={(e) => setConsume(e.target.checked)} className="h-5 w-5 accent-[#d9a85b]" />
        Dar baixa de 1 charuto no umidor
      </label>
      <Button className="w-full" onClick={save}>Salvar no histórico</Button>
    </Sheet>
  )
}
