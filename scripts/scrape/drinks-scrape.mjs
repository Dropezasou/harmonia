// Coleta whiskies da World Wine (robots.txt permite; 1 página a cada 2 s). VTEX: URLs "whk-..." no sitemap.
// Uso: node scripts/scrape/drinks-scrape.mjs --limit 20 --out whiskies.json
import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const BASE = 'https://www.worldwine.com.br'
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)))
const LIMIT = Number(args.limit || 20)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return await r.text() }
    catch (e) { if (i >= tries) throw new Error(`${e.cause?.code || e.message} ${url}`); await sleep(5000 * i) }
  }
}
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#0?39;/g, "'").replace(/&[a-z]+;|&#x?\w+;/g, ' ')
const lines = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td|th|span|dt|dd|strong)>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const maps = ['flavor-map-pt.json', 'flavor-map-destilados.json'].map((f) => JSON.parse(readFileSync(new URL('./' + f, import.meta.url))).map)
const fmap = Object.assign({}, ...maps)
const terms = Object.keys(fmap).sort((a, b) => b.length - a.length)
function flavors(text) {
  let rest = ` ${norm(text)} `; const found = []
  for (const t of terms) { const re = new RegExp(`[^a-z]${norm(t)}[^a-z]`, 'g'); if (re.test(rest)) { found.push(t); rest = rest.replace(re, ' | ') } }
  return { terms: found, notes: [...new Set(found.flatMap((t) => fmap[t]))] }
}
// tipo dentro de drink-types.json a partir do nome/descrição/país
function typeOf(name, desc, pais) {
  const t = norm(`${name} ${desc}`)
  if (/tennessee|jack daniel/.test(t)) return 'Tennessee'
  if (/\brye\b|centeio/.test(t)) return 'Rye'
  if (/bourbon/.test(t)) return 'Bourbon'
  if (/islay|laphroaig|lagavulin|ardbeg|bowmore|caol ila|bruichladdich|kilchoman/.test(t)) return 'Single Malt Islay'
  if (/talisker|highland park|jura|arran|island/.test(t)) return 'Single Malt Island'
  if (/single malt|puro malte/.test(t) && /sherry|xerez|oloroso|pedro ximenez/.test(t)) return 'Single Malt Sherry Cask'
  if (/single malt|puro malte/.test(t) && /speyside|glenfiddich|glenlivet|macallan|balvenie|aberlour|glenfarclas/.test(t)) return 'Single Malt Speyside'
  if (/single malt|puro malte/.test(t)) return 'Single Malt Highland'
  if (/irlanda|irish|jameson|bushmills|redbreast/.test(t) || /irlanda/.test(norm(pais || ''))) return 'Irish'
  if (/japao|japan|hibiki|yamazaki|nikka|hakushu|suntory/.test(t) || /japao/.test(norm(pais || ''))) return 'Japonês'
  if (/estados unidos/.test(norm(pais || '')) || /american whiskey|kentucky/.test(t)) return 'Bourbon'
  return 'Blended Scotch'
}
function bodyOf(abv, text) {
  const t = norm(text)
  if (/encorpad|robust|intens|potente|cask strength/.test(t) || abv >= 46) return 'encorpado'
  if (/leve|suave|delicad/.test(t) && abv <= 40) return 'leve'
  return 'medio'
}

const idx = locs(await get(BASE + '/sitemap.xml'))
let urls = []
for (const s of idx.filter((u) => /product/i.test(u))) urls.push(...locs(await get(s)))
urls = [...new Set(urls)].filter((u) => /\/whk-/.test(u) && !/kit|caixa|copo|miniatura|combo/i.test(u))
console.error(`${urls.length} whiskies no sitemap`)

const out = []
for (const u of urls.slice(0, LIMIT)) {
  await sleep(2000)
  try {
    const html = await get(u)
    const ls = lines(html)
    const val = (re) => { const i = ls.findIndex((l) => re.test(l)); return i >= 0 ? ls[i + 1] : null }
    const name = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim() || ls.find((l) => /whisk/i.test(l))
    const di = ls.findIndex((l) => /^Descri[cç][aã]o do produto$/i.test(l))
    const desc = di >= 0 ? ls[di + 1] : ''
    const aroma = val(/^Aroma$/i) || ''
    const abv = Number((val(/^Gradua[cç][aã]o Alc/i) || '').replace(',', '.').match(/[\d.]+/)?.[0]) || null
    const pais = val(/^Pa[ií]s$/i)
    const fl = flavors(`${aroma} ${desc}`)
    out.push({ source: 'World Wine', name, produtor: val(/^Produtor$/i), pais, abv, amadurecimento: val(/^Amadurecimento$/i), aroma, type: typeOf(name, desc, pais), body: bodyOf(abv || 40, `${aroma} ${desc}`), flavorTerms: fl.terms, notes: fl.notes, url: u })
    console.error('ok', u)
  } catch (e) { console.error('erro', e.message) }
}
writeFileSync(args.out || 'whiskies.json', JSON.stringify({ fetchedAt: new Date().toISOString(), drinks: out }, null, 1))
console.log('| Whisky | Tipo (app) | País | Teor | Amadurecimento | Corpo | Aroma (loja) | Notas do app |')
console.log('|---|---|---|---|---|---|---|---|')
for (const d of out) console.log(`| ${d.name} | ${d.type} | ${d.pais || ''} | ${d.abv ? d.abv + '%' : ''} | ${(d.amadurecimento || '').slice(0, 70)} | ${d.body} | ${(d.aroma || '').slice(0, 120)} | ${d.notes.join(', ')} |`)
