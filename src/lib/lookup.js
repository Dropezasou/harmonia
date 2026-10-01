import { cigarsDb, drinksDb } from './knowledge'

const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')

function search(items, fields, query, limit) {
  const terms = norm(query).split(/\s+/).filter((t) => t.length > 1)
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

export const searchCigars = (q, limit = 6) => search(cigarsDb.cigars, ['brand', 'line', 'name', 'vitola'], q, limit)
export const searchDrinks = (q, limit = 6) => search(drinksDb.drinks, ['brand', 'name', 'type'], q, limit)

export function externalLinks(query, kind = 'cigar') {
  const q = encodeURIComponent(query)
  if (kind === 'drink')
    return [
      { label: 'Distiller', url: `https://distiller.com/search?term=${q}` },
      { label: 'Vivino', url: `https://www.vivino.com/search/wines?q=${q}` },
      { label: 'Google', url: `https://www.google.com/search?q=${q}+tasting+notes` }
    ]
  return [
    { label: 'Halfwheel', url: `https://halfwheel.com/?s=${q}` },
    { label: 'Cigar Aficionado', url: `https://www.cigaraficionado.com/ratings/search?q=${q}` },
    { label: 'Google', url: `https://www.google.com/search?q=${q}+cigar+wrapper+binder+filler+tasting+notes` }
  ]
}
