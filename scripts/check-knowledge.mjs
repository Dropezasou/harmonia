// Valida as referências cruzadas da base de conhecimento e roda um exemplo do motor.
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const load = (f) => JSON.parse(readFileSync(new URL(`../src/knowledge/${f}`, import.meta.url)))
const flavors = load('flavors.json'), rules = load('pairing-rules.json'), types = load('drink-types.json'), db = load('cigars-db.json')
const errors = []
const checkNotes = (notes, where) => notes.forEach((n) => flavors.notes[n] || errors.push(`${where}: nota desconhecida "${n}"`))

for (const [id, n] of Object.entries(flavors.notes)) flavors.families[n.family] || errors.push(`flavors.${id}: família "${n.family}" inexistente`)
for (const a of rules.flavor.affinity) for (const f of [a.a, a.b]) flavors.families[f] || errors.push(`affinity ${a.a}/${a.b}: família "${f}" inexistente`)
for (const [cat, t] of Object.entries(types.types)) for (const [name, v] of Object.entries(t)) checkNotes(v.notes, `drink-types ${cat}/${name}`)
for (const c of db.cigars) checkNotes(c.notes, `cigars-db ${c.brand} ${c.name}`)

if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log('Base de conhecimento OK')

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'silent' })
const { recommend } = await server.ssrLoadModule('/src/lib/engine.js')
const cigar = { id: 'c', ...db.cigars.find((c) => c.name === 'Exclusivo Maduro') }
const drinks = Object.entries(types.types).flatMap(([category, t]) => Object.entries(t).map(([type, v]) => ({ id: type, category, type, brand: type, ...v })))
for (const moment of ['manha', 'noite']) {
  console.log(`\n${cigar.brand} ${cigar.name} — ${moment}`)
  for (const r of recommend(cigar, drinks, { moment }).slice(0, 4)) console.log(` ${r.score.toFixed(2)} ${r.drink.type}: ${r.reasons.map((x) => x.text).join(' | ')}`)
}
await server.close()
