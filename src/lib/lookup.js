import { cigarsDb } from './knowledge'

const norm = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ')

export function searchCigars(query, limit = 6) {
  const terms = norm(query).split(/\s+/).filter((t) => t.length > 1)
  if (!terms.length) return []
  return cigarsDb.cigars
    .map((c) => {
      const hay = norm(`${c.brand} ${c.line} ${c.name} ${c.vitola}`)
      const hits = terms.filter((t) => hay.includes(t)).length
      return { c, score: hits / terms.length + (norm(c.brand).startsWith(terms[0]) ? 0.2 : 0) }
    })
    .filter((r) => r.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.c)
}

export function externalLinks(query) {
  const q = encodeURIComponent(query)
  return [
    { label: 'Halfwheel', url: `https://halfwheel.com/?s=${q}` },
    { label: 'Cigar Aficionado', url: `https://www.cigaraficionado.com/ratings/search?q=${q}` },
    { label: 'Google', url: `https://www.google.com/search?q=${q}+cigar+wrapper+binder+filler+tasting+notes` }
  ]
}
