import { useCallback, useEffect, useState } from 'react'
import * as db from './db'

export function useData() {
  const [data, setData] = useState({ cigars: [], drinks: [], sessions: [], loaded: false })
  const reload = useCallback(async () => {
    const [cigars, drinks, sessions] = await Promise.all(['cigars', 'drinks', 'sessions'].map(db.all))
    setData({ cigars, drinks, sessions: sessions.sort((a, b) => b.date.localeCompare(a.date)), loaded: true })
  }, [])
  useEffect(() => { reload() }, [reload])
  const save = async (store, item) => { const r = await db.put(store, item); await reload(); return r }
  const del = async (store, id) => { await db.remove(store, id); await reload() }
  return { ...data, save, del, reload }
}

export const cigarTitle = (c) => [c.brand, c.line !== c.name && c.line, c.name].filter(Boolean).join(' · ')
export const drinkTitle = (d) => [d.brand, d.name].filter(Boolean).join(' ')
