import { useState } from 'react'
import { useData } from './lib/store'
import Humidor from './components/Humidor'
import Cellar from './components/Cellar'
import Pairing from './components/Pairing'
import History from './components/History'

const TABS = {
  humidor: { label: 'Umidor', icon: '🚬' },
  cellar: { label: 'Adega', icon: '🥃' },
  pairing: { label: 'Harmonizar', icon: '✨' },
  history: { label: 'Histórico', icon: '📖' }
}

export default function App() {
  const data = useData()
  const [tab, setTab] = useState('pairing')
  const [cigarId, setCigarId] = useState('')
  if (!data.loaded) return null
  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="pt-safe sticky top-0 z-20 bg-bg/95 px-4 pb-3 backdrop-blur">
        <h1 className="text-2xl font-bold tracking-tight">{TABS[tab].label}</h1>
      </header>
      <main className="px-4 pb-28">
        {tab === 'humidor' && <Humidor data={data} onPair={(c) => { setCigarId(c.id); setTab('pairing') }} />}
        {tab === 'cellar' && <Cellar data={data} />}
        {tab === 'pairing' && <Pairing data={data} cigarId={cigarId} setCigarId={setCigarId} goTo={setTab} />}
        {tab === 'history' && <History data={data} />}
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {Object.entries(TABS).map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2 text-xs ${tab === k ? 'text-gold' : 'text-ink-3'}`}>
              <span className="block text-xl">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
