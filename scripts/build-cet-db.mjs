// Converte a coleta bruta da Charutos e Tabacos (data/cet-raw.json) para a base do app
// (src/knowledge/cigars-cet.json). Uso: node scripts/build-cet-db.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const raw = JSON.parse(readFileSync(new URL('../data/cet-raw.json', import.meta.url)))
const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
// rótulos que o coletor antigo não conhecia e vazaram para o valor anterior
const clean = (v) => (v || '').replace(/\s+(Se[cç][aã]o|Embalagem|Venda|Fabricado|Pontua[cç][oõ]es)\b.*$/i, '').trim()
const titleCase = (s) => s.replace(/\S+/g, (w) => (w === w.toUpperCase() && w.length > 3 ? w[0] + w.slice(1).toLowerCase() : w))

const out = []
for (const c of raw.cigars) {
  if (c.error || !c.name) continue
  // sem nenhuma informação útil para harmonizar, não entra
  if (!c.strength && !c.notes?.length && !c.wrapper) continue
  const brand = (c.brand || c.name.split(' ')[0]).trim()
  let name = c.name.replace(/\s*\((?:LCDH|Ed\.? ?Ltda)[^)]*\)/gi, '').replace(/\s+-\s+.*$/, '').replace(/\s+unidade\s*$/i, '').replace(/\s+/g, ' ').trim()
  if (fold(name).startsWith(fold(brand))) name = name.slice(brand.length).trim()
  out.push({
    brand: titleCase(brand),
    line: '',
    name: name || c.name,
    vitola: [c.vitola, c.size, c.ring && `anel ${c.ring}`].filter(Boolean).join(' · '),
    wrapper: clean(c.wrapper),
    binder: clean(c.binder),
    filler: clean(c.filler),
    origin: clean(c.origin),
    strength: c.strength || '',
    notes: c.notes || [],
    ratings: c.ratings || undefined,
    price: c.price || undefined,
    source: 'Charutos e Tabacos',
    url: c.url
  })
}
out.sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`))
writeFileSync(
  new URL('../src/knowledge/cigars-cet.json', import.meta.url),
  JSON.stringify({ _doc: 'Gerado por scripts/build-cet-db.mjs a partir de data/cet-raw.json (coleta da loja Charutos e Tabacos, ' + raw.fetchedAt?.slice(0, 10) + '). Não editar à mão: rode o script de novo.', cigars: out }, null, 1)
)
console.log(`${out.length} charutos gravados (de ${raw.cigars.length} coletados)`)
