// Coleta fichas de charutos do Cigar Aficionado, página a página (uso pessoal, baixo volume).
// Uso: node scripts/scrape/ca-scrape.mjs --year 2024 --limit 20 --out ca.json
import { writeFileSync } from 'node:fs'

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

function field(text, label) {
  const m = text.match(new RegExp(`(?:${label})\\s*:?\\s*\\n?\\s*([^\\n]+)`, 'i'))
  return m ? m[1].trim() : null
}

function parseCigar(html, url) {
  const text = toText(html)
  const title = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim()
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.parse(m[1]) } catch { return null } }).filter(Boolean)
  const desc = (html.match(/<meta[^>]+(?:name|property)="(?:og:)?description"[^>]+content="([^"]*)"/i) || [])[1]
  return {
    url,
    title,
    score: Number(field(text, 'Score|Rating')?.match(/\d{2,3}/)?.[0]) || null,
    size: field(text, 'Size'),
    length: field(text, 'Length'),
    ring: field(text, 'Ring Gauge|Ring'),
    wrapper: field(text, 'Wrapper'),
    binder: field(text, 'Binder'),
    filler: field(text, 'Filler'),
    strength: field(text, 'Strength'),
    country: field(text, 'Country'),
    price: field(text, 'Price'),
    tastingNote: field(text, 'Tasting Note') || decode(desc || ''),
    jsonLd: ld.length ? ld : undefined,
    // trecho bruto para calibrar o parser na primeira rodada
    rawSample: text.slice(0, 2500)
  }
}

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
console.log(JSON.stringify(results.map(({ rawSample, jsonLd, ...r }, i) => (i < 2 ? { ...r, rawSample, jsonLd } : r))))
console.log('===CA-JSON-END===')
