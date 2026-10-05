import { useRef, useState } from 'react'
import { readText } from '../lib/ocr'
import { matchCigarText, matchDrinkText } from '../lib/lookup'
import { Button } from './ui'

// Tira a foto do anel/rótulo, lê o texto e devolve candidatos das bases locais.
export default function PhotoLookup({ kind, onResults }) {
  const input = useRef()
  const [state, setState] = useState({ busy: false, progress: 0, text: '', error: '' })

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setState({ busy: true, progress: 0, text: '', error: '' })
    try {
      const text = await readText(file, (p) => setState((s) => ({ ...s, progress: p })))
      const found = (kind === 'drink' ? matchDrinkText : matchCigarText)(text)
      setState({ busy: false, progress: 1, text, error: '' })
      onResults(found, text)
    } catch {
      setState({ busy: false, progress: 0, text: '', error: navigator.onLine ? 'Não consegui ler a foto. Tente de novo, mais de perto e com boa luz.' : 'Na primeira leitura é preciso internet para baixar o leitor de texto.' })
    }
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <Button variant="ghost" className="w-full" disabled={state.busy} onClick={() => input.current.click()}>
        {state.busy ? `Lendo a foto… ${Math.round(state.progress * 100)}%` : '📷 Ler pela foto'}
      </Button>
      {state.error && <p className="text-xs text-warn">{state.error}</p>}
      {state.text && <p className="text-xs text-ink-3">Texto lido: “{state.text.slice(0, 120)}”</p>}
    </div>
  )
}
