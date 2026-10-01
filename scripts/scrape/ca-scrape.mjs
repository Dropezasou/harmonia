// Coleta fichas de charutos do Cigar Aficionado, página a página (uso pessoal, baixo volume).
// Uso: node scripts/scrape/ca-scrape.mjs --year 2024 --limit 20 --out ca.json
import { readFileSync, writeFileSync } from 'node:fs'

const BASE = 'https://www.cigaraficionado.com'
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const DELAY_MS = 3000
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)))
const year = args.year || '2024'
const limit = Number(args.limit || 20)
const out = args.out || 'ca.json'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&rsquo;|&#8217;/g, "'").replace(/&nbsp;/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ')
const toText = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|dd|dt)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()

// robots.txt: respeita Disallow para User-agent: *
async function robotsAllows(path) {
  try {
    const txt = await get(`${BASE}/robots.txt`)
    let applies = false
    const rules = []
    for (const line of txt.split('\n')) {
      const [k, ...v] = line.split(':'); const val = v.join(':').trim()
      if (/^user-agent$/i.test(k.trim())) applies = val === '*'
      else if (applies && /^disallow$/i.test(k.trim()) && val) rules.push(val)
    }
    const blocked = rules.find((r) => path.startsWith(r))
    if (blocked) console.error(`robots.txt bloqueia ${path} (regra ${blocked})`)
    return !blocked
  } catch (e) { console.error('robots.txt indisponível:', e.message); return true }
}

const flavorMap = JSON.parse(readFileSync(new URL('./flavor-map.json', import.meta.url))).map
const terms = Object.keys(flavorMap).sort((a, b) => b.length - a.length)
const STRENGTH = { 'mild': 'suave', 'mild-medium': 'suave-medio', 'medium': 'medio', 'medium-full': 'medio-pleno', 'full': 'pleno' }

// campos vêm um por linha: "Wrapper: Ecuador"
const line = (text, label) => (text.match(new RegExp(`^${label}:\\s*(.+)$`, 'mi')) || [])[1]?.trim() || null

function flavors(note) {
  let rest = ` ${note.toLowerCase()} `
  const found = []
  for (const t of terms) {
    const re = new RegExp(`[^a-z]${t.replace(/[-]/g, '\\-')}[^a-z]`, 'g')
    if (re.test(rest)) { found.push(t); rest = rest.replace(re, ' | ') }
  }
  const notes = [...new Set(found.flatMap((t) => flavorMap[t]))]
  return { terms: found, notes }
}

function parseCigar(html, url) {
  const text = toText(html)
  const name = (text.split('\n')[0] || '').replace(/\s*\|\s*Cigar Aficionado.*$/, '').trim()
  // texto editorial: entre a linha Strength e o "Previous" da navegação
  const after = text.split(/^Strength:.*$/m)[1] || ''
  const note = after.split(/^Previous\s*$/m)[0].replace(/\s+/g, ' ').trim()
  const dims = line(text, 'Dimensions')
  const dm = dims?.match(/([\d\s/]+)"\s*by\s*(\d+)/)
  const strengthCA = line(text, 'Strength')
  const fl = flavors(note)
  return {
    name,
    url,
    rank: Number(line(text, 'Rank')) || null,
    score: Number(line(text, 'Rating')) || null,
    price: line(text, 'Price'),
    madeBy: line(text, 'Made By'),
    factory: line(text, 'Factory Location'),
    vitola: dm ? `${dm[1].trim()}" x ${dm[2]}` : dims,
    wrapper: line(text, 'Wrapper'),
    binder: line(text, 'Binder'),
    filler: line(text, 'Filler'),
    strengthCA,
    strength: STRENGTH[strengthCA?.toLowerCase()] || null,
    flavorTerms: fl.terms,
    notes: fl.notes,
    noteExcerpt: note.slice(0, 600)
  }
}

if (args.test) { console.log(JSON.stringify(parseCigar(readFileSync(args.test, 'utf8'), 'test'), null, 1)); process.exit(0) }

const listPath = `/top25/${year}`
if (!(await robotsAllows(listPath)) || !(await robotsAllows('/top25cigar/'))) process.exit(1)
const listHtml = await get(BASE + listPath)
const links = [...new Set([...listHtml.matchAll(/href="((?:https:\/\/www\.cigaraficionado\.com)?\/top25cigar\/[^"#?]+)"/g)].map((m) => m[1].replace(BASE, '')))].slice(0, limit)
console.error(`${links.length} páginas encontradas em ${listPath}`)

const results = []
for (const [i, path] of links.entries()) {
  await sleep(DELAY_MS)
  try {
    results.push(parseCigar(await get(BASE + path), BASE + path))
    console.error(`[${i + 1}/${links.length}] ok ${path}`)
  } catch (e) {
    results.push({ url: BASE + path, error: e.message })
    console.error(`[${i + 1}/${links.length}] erro ${path}: ${e.message}`)
  }
}
writeFileSync(out, JSON.stringify({ source: BASE + listPath, fetchedAt: new Date().toISOString(), cigars: results }, null, 2))
console.log('===CA-JSON-BEGIN===')
for (const r of results) console.log(JSON.stringify(r))
console.log('===CA-JSON-END===')
