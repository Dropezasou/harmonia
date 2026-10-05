import { cigarsDb, cetDb, drinksDb } from './knowledge'

export const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
const tokens = (s) => norm(s).split(/\s+/).filter((t) => t.length > 1)

// base curada primeiro; a da loja completa o que faltar (sem repetir o mesmo charuto)
const allCigars = (() => {
  const seen = new Set()
  return [...cigarsDb.cigars.map((c) => ({ ...c, source: 'Base do app' })), ...cetDb.cigars].filter((c) => {
    const key = norm(`${c.brand} ${c.line} ${c.name}`).replace(/\s+/g, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})()
const CIGAR_FIELDS = ['brand', 'line', 'name', 'vitola']
const DRINK_FIELDS = ['brand', 'name', 'type']

function search(items, fields, query, limit) {
  const terms = tokens(query)
  if (!terms.length) return []
  return items
    .map((it) => {
      const hay = norm(fields.map((f) => it[f]).join(' '))
      const hits = terms.filter((t) => hay.includes(t)).length
      return { it, score: hits / terms.length + (norm(it.brand).startsWith(terms[0]) ? 0.2 : 0) }
    })
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.it)
}

export const searchCigars = (q, limit = 8) => search(allCigars, CIGAR_FIELDS, q, limit)
export const searchDrinks = (q, limit = 6) => search(drinksDb.drinks, DRINK_FIELDS, q, limit)

// distância de edição limitada: o OCR troca/perde letras em anéis estilizados
function close(a, b) {
  if (a === b) return true
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > 1) return false
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[b.length] <= (a.length >= 7 ? 2 : 1)
}

// Casa o texto lido na foto com os itens das bases. Pontua pela fração das palavras do item
// encontradas no texto, com peso extra para a marca.
function matchText(text, items, fields, limit) {
  const ocr = [...new Set(tokens(text).filter((t) => t.length > 2))]
  if (!ocr.length) return []
  const has = (w) => ocr.some((o) => close(o, w))
  return items
    .map((it) => {
      const brandWords = tokens(it.brand).filter((w) => w.length > 2)
      const words = [...new Set(tokens(fields.filter((f) => f !== 'brand').map((f) => it[f]).join(' ')).filter((w) => w.length > 2))]
      const brandHit = brandWords.length && brandWords.every(has)
      const hits = words.filter(has).length
      const score = (brandHit ? 0.5 : 0) + (words.length ? (0.5 * hits) / words.length : 0)
      return { it, score }
    })
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.it)
}

export const matchCigarText = (text, limit = 6) => matchText(text, allCigars, ['brand', 'line', 'name'], limit)
export const matchDrinkText = (text, limit = 6) => matchText(text, drinksDb.drinks, ['brand', 'name'], limit)

export function externalLinks(query, kind = 'cigar') {
  const q = encodeURIComponent(query)
  if (kind === 'drink')
    return [
      { label: 'Distiller', url: `https://distiller.com/search?term=${q}` },
      { label: 'Vivino', url: `https://www.vivino.com/search/wines?q=${q}` },
      { label: 'Google', url: `https://www.google.com/search?q=${q}+tasting+notes` }
    ]
  return [
    { label: 'Charutos e Tabacos', url: `https://www.google.com/search?q=site%3Acharutosetabacos.net+${q}` },
    { label: 'Cigar Aficionado', url: `https://www.cigaraficionado.com/ratings/search?q=${q}` },
    { label: 'Google', url: `https://www.google.com/search?q=${q}+charuto+capa+capote+tripa` }
  ]
}
