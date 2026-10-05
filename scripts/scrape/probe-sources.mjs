// Avalia sites candidatos a fonte de dados: robots.txt (inclusive regras para robôs de IA),
// sitemap, volume de produtos e se a página de produto traz dados úteis para harmonizar.
// Uso: node scripts/scrape/probe-sources.mjs > probe.md
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const CANDIDATES = [
  // cafés especiais
  ['café', 'https://coffeemais.com'], ['café', 'https://www.mercafe.com.br'], ['café', 'https://santograo.com.br'],
  ['café', 'https://cafedomercadocuritiba.com.br'], ['café', 'https://reidocafe.com.br'], ['café', 'https://www.magmacafes.com.br'],
  ['café', 'https://graocafes.com.br'], ['café', 'https://www.uniquecafes.com.br'], ['café', 'https://www.orfeucafes.com.br'],
  ['café', 'https://www.cafeporto.com.br'], ['café', 'https://www.lucca.cafe'], ['café', 'https://www.cafesdeminas.com.br'],
  // vinhos
  ['vinho', 'https://www.wine.com.br'], ['vinho', 'https://www.evino.com.br'], ['vinho', 'https://www.grandcru.com.br'],
  ['vinho', 'https://www.mistral.com.br'], ['vinho', 'https://www.divvino.com.br'], ['vinho', 'https://www.topwines.com.br'],
  ['vinho', 'https://casalisboa.com.br'], ['vinho', 'https://www.grandeadega.com.br'], ['vinho', 'https://www.vinci.com.br'],
  ['vinho', 'https://www.worldwine.com.br'],
  // whisky / destilados
  ['whisky', 'https://www.lojadewhisky.com.br'], ['whisky', 'https://www.whiskyclub.com.br'], ['whisky', 'https://www.casadowhisky.com.br'],
  ['whisky', 'https://www.emporiodacerveja.com.br'], ['whisky', 'https://www.bebidasonline.com.br'],
  // base aberta
  ['aberta', 'https://world.openfoodfacts.org']
]
const AI_BOTS = ['claudebot', 'claude-user', 'anthropic-ai', 'gptbot', 'ccbot']
const KEYWORDS = { notas: /notas? (sensoriais|de degusta|de prova)|aroma|nariz|paladar|\bboca\b|final/i, corpo: /\bcorpo\b|encorpad/i, cafe: /torra|pontua|\bSCA\b|processo|variedade|altitude/i, vinho: /\buvas?\b|safra|teor alco|harmoniza/i, whisky: /idade|barril|barrica|cask|anos\b/i }

async function get(url, ms = 20000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal, redirect: 'follow' })
    return { ok: r.ok, status: r.status, url: r.url, text: r.ok ? await r.text() : '' }
  } catch (e) { return { ok: false, status: e.name === 'AbortError' ? 'timeout' : 'erro', text: '' } } finally { clearTimeout(t) }
}

function robots(txt) {
  const groups = []; let cur = null, lastWasUA = false
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*/, '').trim(); if (!line) continue
    const [k, ...v] = line.split(':'); const key = k.trim().toLowerCase(); const val = v.join(':').trim()
    if (key === 'user-agent') { if (!lastWasUA) groups.push(cur = { uas: [], dis: [], allow: [] }); cur.uas.push(val.toLowerCase()); lastWasUA = true }
    else { lastWasUA = false; if (!cur) continue; if (key === 'disallow' && val) cur.dis.push(val); if (key === 'allow' && val) cur.allow.push(val) }
  }
  const blocksAll = (g) => g && g.dis.includes('/') && !g.allow.includes('/')
  const star = groups.find((g) => g.uas.includes('*'))
  const aiBlocked = AI_BOTS.filter((b) => blocksAll(groups.find((g) => g.uas.includes(b)) || null))
  const sitemaps = [...txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1])
  return { allAllowed: !blocksAll(star), aiBlocked, sitemaps }
}

async function sitemapUrls(maps, depth = 0) {
  let urls = []
  for (const sm of maps.slice(0, 6)) {
    const r = await get(sm); if (!r.ok) continue
    const locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
    if (/<sitemapindex/i.test(r.text) && depth < 1) urls.push(...(await sitemapUrls(locs.filter((u) => /product|produto|prod/i.test(u)).concat(locs).slice(0, 6), depth + 1)))
    else urls.push(...locs)
    if (urls.length > 20000) break
  }
  return urls
}

const rows = []
for (const [cat, base] of CANDIDATES) {
  const r = await get(base + '/robots.txt')
  if (!r.ok) { rows.push([cat, base, `robots.txt ${r.status}`, '', '', '', '']); continue }
  const rb = robots(r.text)
  const urls = await sitemapUrls(rb.sitemaps.length ? rb.sitemaps : [base + '/sitemap.xml'])
  const products = urls.filter((u) => /\/(produto|product|products|p)\/|\/p$|-\d{4,}|\/vinho|\/cafe|\/whisky/i.test(u))
  let sample = products.find((u) => /cafe|caf%C3%A9|vinho|whisk|bourbon|single/i.test(u)) || products[0]
  let found = ''
  if (sample) {
    const p = await get(sample)
    const text = p.text.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    const ld = /"@type"\s*:\s*"Product"/i.test(p.text) ? 'JSON-LD' : ''
    found = [ld, ...Object.entries(KEYWORDS).filter(([, re]) => re.test(text)).map(([k]) => k)].filter(Boolean).join(', ') || (p.ok ? 'nada útil' : `página ${p.status}`)
  }
  rows.push([cat, base, rb.allAllowed ? 'sim' : 'NÃO', rb.aiBlocked.length ? rb.aiBlocked.join(' ') : '—', String(urls.length), String(products.length), found, sample || ''])
  console.error('ok', base)
}
console.log('| Cat. | Site | Robôs (*) | IA bloqueada | URLs sitemap | Produtos | Página de produto traz | Exemplo |')
console.log('|---|---|---|---|---|---|---|---|')
for (const r of rows) console.log('| ' + r.join(' | ') + ' |')
