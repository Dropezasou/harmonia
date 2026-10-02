// Coleta fichas de charutos da loja Charutos e Tabacos (www.charutosetabacos.net).
// O robots.txt da loja permite explicitamente robôs, inclusive de IA. Ritmo: 1 página a cada 2 s.
// Uso: node scripts/scrape/cet-scrape.mjs --limit 20 --out cet.json
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.charutosetabacos.net'
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const DELAY_MS = 2000
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)))
const limit = Number(args.limit || 20)
const out = args.out || 'cet.json'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      // a loja serve ISO-8859-1
      const charset = (res.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1]?.toLowerCase()
      return new TextDecoder(charset && charset !== 'utf-8' ? 'latin1' : 'utf-8').decode(buf)
    } catch (e) {
      if (i >= tries) throw new Error(`${e.message} ${url}`)
      await sleep(3000 * i)
    }
  }
}

const ENT = { nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', ordm: 'º', ordf: 'ª', deg: '°', laquo: '«', raquo: '»', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…' }
const ACC = { acute: '\u0301', grave: '\u0300', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327' }
const decode = (s) => s
  .replace(/&([a-zA-Z])(acute|grave|circ|tilde|uml|cedil);/g, (_, l, a) => (l + ACC[a]).normalize('NFC'))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
  .replace(/\u00a0/g, ' ').replace(/È(?=[a-z])/g, 'é').replace(/˙/g, 'ú').replace(/Ì(?=[a-z])/g, 'í').replace(/„(?=[a-z])/g, 'ã').replace(/Á(?=[a-z])/g, 'ç').replace(/\s?磊/g, '')
const toText = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|td|span|strong|b)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()

const flavorMap = JSON.parse(readFileSync(new URL('./flavor-map-pt.json', import.meta.url))).map
const terms = Object.keys(flavorMap).sort((a, b) => b.length - a.length)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
function flavors(text) {
  let rest = ` ${norm(text)} `
  const found = []
  for (const t of terms) {
    const re = new RegExp(`[^a-z]${norm(t)}[^a-z]`, 'g')
    if (re.test(rest)) { found.push(t); rest = rest.replace(re, ' | ') }
  }
  return { terms: found, notes: [...new Set(found.flatMap((t) => flavorMap[t]))] }
}
const STRENGTH = { 'suave': 'suave', 'leve': 'suave', 'suave medio': 'suave-medio', 'leve medio': 'suave-medio', 'medio': 'medio', 'medio forte': 'medio-pleno', 'medio encorpado': 'medio-pleno', 'medio pleno': 'medio-pleno', 'forte': 'pleno', 'encorpado': 'pleno', 'pleno': 'pleno', 'muito forte': 'pleno', 'extra forte': 'pleno', 'media': 'medio', 'media forte': 'medio-pleno', 'suave media': 'suave-medio', 'media suave': 'suave-medio' }
const strengthOf = (raw) => STRENGTH[norm(raw || '').replace(/[-/]/g, ' ').replace(/\s+(a|e|para)\s+/g, ' ').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim()] || null

const LABELS = ['Pa[ií]s de origem', 'Fabricado', 'Vitola de galera', 'Anel', 'Pontua[cç][oõ]es mundiais[^:]{0,8}', 'IMPORTANTE', 'Origem', 'Capa', 'Capote', 'Miolo', 'Tripa', 'Enchimento', 'Fortaleza', 'For[cç]a', 'Intensidade', 'Vitola', 'Bitola', 'Formato', 'Comprimento', 'Medidas', 'Tamanho', 'Ring Gauge', 'Ring', 'Calibre', 'Cepo', 'Sabor(?:es)?', 'Notas', 'Fluxo', 'Pa[ií]s']
// a ficha vem colada: "Origem: NicaráguaCapa: EquadorCapote: ..."
function field(text, label) {
  const next = LABELS.join('|')
  const m = text.match(new RegExp(`(?:${label})\\s*:\\s*([\\s\\S]*?)(?=(?:${next})\\s*:|\\*|Imagens meramente|$)`, 'i'))
  const v = m?.[1].replace(/\s+/g, ' ').trim()
  return v || null
}

function parse(html, url) {
  const text = toText(html)
  const ldRaw = [...html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
  const ld = ldRaw.map((r) => { try { return JSON.parse(r) } catch { return null } }).find((x) => x && /product/i.test(x['@type']))
  const ldDesc = ld?.description || ldRaw.map((r) => r.match(/"description"\s*:\s*"([\s\S]*?)",\s*\n/)?.[1]).find(Boolean) || ''
  const title = decode(ld?.name || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim()
  // descrição completa: última aba "Descrição Geral" do corpo, até "Por que comprar"
  const tab = text.split(/Descri[cç][aã]o Geral/i).pop().split(/Por que comprar na Charutos e Tabacos/i)[0]
  const desc = (tab.length > 80 ? tab : decode(ldDesc)).replace(/\s+/g, ' ')
  const fichaAt = desc.search(/Origem\s*:/i)
  const prose = fichaAt >= 0 ? desc.slice(0, fichaAt) : desc
  const ficha = fichaAt >= 0 ? desc.slice(fichaAt) : desc
  const sabor = field(ficha, 'Sabor(?:es)?')
  const fortaleza = field(ficha, 'Fortaleza') || field(ficha, 'For[cç]a') || field(ficha, 'Intensidade') || (strengthOf(sabor) ? sabor : null)
  const vitolaRaw = field(ficha, 'Vitola de galera') || field(ficha, 'Vitola') || field(ficha, 'Bitola') || field(ficha, 'Formato')
  const isMeasure = /\d+([.,]\d+)?\s*mm/i.test(vitolaRaw || '')
  const fl = flavors(prose + ' ' + (strengthOf(sabor) ? '' : sabor || '') + ' ' + (field(ficha, 'Notas') || ''))
  return {
    name: title.replace(/^Charuto\s+/i, '').replace(/\s*-\s*Unidade.*$/i, ''),
    url,
    price: ld?.offers?.price ? Number(ld.offers.price) : null,
    brand: ld?.brand?.name || ld?.brand || null,
    origin: field(ficha, 'Origem') || field(ficha, 'Pa[ií]s'),
    wrapper: field(ficha, 'Capa') || prose.match(/capa\s+(.{3,60}?)\s+(?:cobre|envolve|abraça)/i)?.[1] || null,
    binder: field(ficha, 'Capote'),
    filler: field(ficha, 'Miolo') || field(ficha, 'Tripa') || field(ficha, 'Enchimento'),
    vitola: isMeasure ? null : vitolaRaw,
    size: field(ficha, 'Comprimento') || field(ficha, 'Medidas') || field(ficha, 'Tamanho') || (isMeasure ? vitolaRaw.match(/^[^A-Z]*?mm[^A-Z]*/)?.[0].trim() : null),
    ring: field(ficha, 'Ring Gauge') || field(ficha, 'Ring') || field(ficha, 'Anel') || field(ficha, 'Calibre') || field(ficha, 'Cepo'),
    ratings: field(ficha, 'Pontua[cç][oõ]es mundiais[^:]{0,8}'),
    strengthRaw: fortaleza,
    strength: strengthOf(fortaleza),
    flavorTerms: fl.terms,
    notes: fl.notes,
    descExcerpt: prose.replace(/\s+/g, ' ').trim().slice(0, 400)
  }
}

if (args.test) { console.log(JSON.stringify(parse(readFileSync(args.test, 'latin1'), 'test'), null, 1)); process.exit(0) }

const smIndex = await get(`${BASE}/sitemap.xml`)
let urls = []
for (const sm of smIndex.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const xml = await get(sm[1].trim())
  urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))
}
// só charutos avulsos (a unidade carrega a mesma ficha da caixa)
urls = urls.filter((u) => /\/charutos\/.*charuto-[^/]*unidade$/i.test(u))
console.error(`${urls.length} produtos "unidade" encontrados`)

const results = []
for (const [i, u] of urls.slice(0, limit).entries()) {
  await sleep(DELAY_MS)
  try { results.push(parse(await get(u), u)); console.error(`[${i + 1}] ok ${u}`) }
  catch (e) { results.push({ url: u, error: e.message }); console.error(`[${i + 1}] erro ${e.message}`) }
}
writeFileSync(out, JSON.stringify({ source: BASE, fetchedAt: new Date().toISOString(), cigars: results }, null, 2))
console.error(`salvo em ${out}`)
