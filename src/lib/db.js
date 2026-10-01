import { openDB } from 'idb'

const STORES = ['cigars', 'drinks', 'sessions']
const dbp = openDB('harmonia', 1, {
  upgrade(db) {
    for (const s of STORES) db.createObjectStore(s, { keyPath: 'id' })
  }
})

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

export async function all(store) {
  return (await dbp).getAll(store)
}
export async function put(store, item) {
  const rec = { ...item, id: item.id || uid(), updatedAt: new Date().toISOString() }
  await (await dbp).put(store, rec)
  return rec
}
export async function remove(store, id) {
  return (await dbp).delete(store, id)
}

export async function exportAll() {
  const out = { app: 'harmonia', version: 1, exportedAt: new Date().toISOString() }
  for (const s of STORES) out[s] = await all(s)
  return out
}
export async function importAll(data) {
  const db = await dbp
  for (const s of STORES) {
    if (!Array.isArray(data[s])) continue
    const tx = db.transaction(s, 'readwrite')
    await tx.store.clear()
    for (const item of data[s]) await tx.store.put(item)
    await tx.done
  }
}

// Safari pode descartar IndexedDB de sites não usados; pedir persistência ajuda.
export const requestPersistence = () => navigator.storage?.persist?.().catch(() => false)
