import { useRef, useState } from 'react'
import { exportAll, importAll } from '../lib/db'
import { drinkTypes, rules } from '../lib/knowledge'
import { Button, Chip, Empty, Stars } from './ui'

const fmt = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function History({ data }) {
  const [filter, setFilter] = useState('all')
  const file = useRef()
  const list = data.sessions.filter((s) => filter === 'all' || (filter === 'rated' ? s.rating : !s.rating))

  const backup = async () => {
    const blob = new Blob([JSON.stringify(await exportAll(), null, 2)], { type: 'application/json' })
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `harmonia-backup-${new Date().toISOString().slice(0, 10)}.json` })
    a.click()
  }
  const restore = async (e) => {
    const f = e.target.files[0]
    if (!f || !confirm('Substituir todos os dados atuais pelo backup?')) return
    await importAll(JSON.parse(await f.text()))
    await data.reload()
    e.target.value = ''
  }

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Todas</Chip>
        <Chip active={filter === 'rated'} onClick={() => setFilter('rated')}>Avaliadas</Chip>
        <Chip active={filter === 'pending'} onClick={() => setFilter('pending')}>Sem nota</Chip>
      </div>
      {!list.length && <Empty>Nenhuma harmonização registrada ainda.</Empty>}
      {list.map((s) => (
        <article key={s.id} className="rounded-xl bg-surface p-4">
          <div className="flex justify-between text-xs text-ink-3">
            <span>{fmt(s.date)} · {rules.context.moments[s.moment]?.label}{s.occasion && ' · ' + rules.context.occasions[s.occasion]?.label}</span>
            <span>motor: {s.matchScore}</span>
          </div>
          <p className="mt-1 font-semibold">{s.cigarName}</p>
          <p className="text-ink-2">{drinkTypes.categories[s.drinkCategory]?.icon} {s.drinkName}</p>
          <div className="mt-2 flex items-center justify-between">
            <Stars value={s.rating} onChange={(rating) => data.save('sessions', { ...s, rating })} />
            <button className="text-xs text-ink-3" onClick={() => confirm('Excluir registro?') && data.del('sessions', s.id)}>excluir</button>
          </div>
          {s.comment && <p className="mt-2 text-sm italic text-ink-2">“{s.comment}”</p>}
        </article>
      ))}
      <div className="space-y-2 border-t border-line pt-4">
        <p className="text-xs text-ink-3">Os dados ficam só neste aparelho. Faça backup de vez em quando.</p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={backup}>Exportar backup</Button>
          <Button variant="ghost" className="flex-1" onClick={() => file.current.click()}>Importar</Button>
          <input ref={file} type="file" accept="application/json" hidden onChange={restore} />
        </div>
      </div>
    </section>
  )
}
