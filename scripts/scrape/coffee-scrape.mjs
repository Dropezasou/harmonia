// Coleta cafés especiais da Lucca Cafés Especiais e do Moka Clube (robots.txt permite; 1 página a cada 2 s).
// Uso: node scripts/scrape/coffee-scrape.mjs --limit 10 --out cafes.json   (limit por loja)
import { readFileSync, writeFileSync } from 'node:fs'

const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const DELAY = 2000
const args = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((s) => s.trim().split(/\s+/)))
const LIMIT = Number(args.limit || 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// até 4 tentativas com espera crescente: algumas lojas oscilam
async function get(url, tries = 4) {
  for (let i = 1; ; i++) {
    try { const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`${r.status} ${url}`); return await r.text() }
    catch (e) { if (i >= tries) throw new Error(`${e.cause?.code || e.message} ${url}`); await sleep(5000 * i) }
  }
}
const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#8211;/g, '–').replace(/&#8220;|&#8221;/g, '"').replace(/&#0?39;|&#8217;/g, "'").replace(/&[a-z]+;|&#\d+;/g, ' ')
const lines = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td|th|span|dt|dd|strong|label)>/gi, '\n').replace(/<[^>]+>/g, ' ')).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
// ficha no formato "Rótulo" numa linha e o valor na seguinte
function fichaFrom(ls, labels) {
  const out = {}
  for (const [key, re] of Object.entries(labels)) {
    const i = ls.findIndex((l) => re.test(l))
    if (i >= 0) { const inline = ls[i].replace(re, '').replace(/^[:\s]+/, ''); out[key] = inline || (ls[i + 1] && !Object.values(labels).some((r) => r.test(ls[i + 1])) ? ls[i + 1] : null) }
  }
  return out
}

const flavorMap = JSON.parse(readFileSync(new URL('./flavor-map-pt.json', import.meta.url))).map
const coffeeMap = JSON.parse(readFileSync(new URL('./flavor-map-cafe.json', import.meta.url))).map
// em café, a palavra "café" não é nota sensorial
const allMap = { ...flavorMap, ...coffeeMap }
for (const k of ['cafe', 'expresso', 'cafe expresso', 'torra', 'tostado', 'torrado']) delete allMap[k]
const terms = Object.keys(allMap).sort((a, b) => b.length - a.length)
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
function flavors(text) {
  let rest = ` ${norm(text)} `
  const found = []
  for (const t of terms) { const re = new RegExp(`[^a-z]${norm(t)}[^a-z]`, 'g'); if (re.test(rest)) { found.push(t); rest = rest.replace(re, ' | ') } }
  return { terms: found, notes: [...new Set(found.flatMap((t) => allMap[t]))] }
}
const bodyByRoast = (torra) => { const t = norm(torra || ''); return /clara/.test(t) ? 'leve' : /escura/.test(t) ? 'encorpado' : /media/.test(t) ? 'medio' : null }
function bodyOf(text) {
  const t = norm(text)
  if (/corpo (alto|denso|intenso|encorpado|pronunciado|marcante|aveludado|cremoso|licoroso)|encorpad|corpo pronunciado/.test(t)) return 'encorpado'
  if (/corpo (leve|delicado|baixo|sutil)|leve e delicado/.test(t)) return 'leve'
  if (/corpo (medio|equilibrado|sedoso|suculento|redondo)/.test(t)) return 'medio'
  return null
}

const SITES = {
  lucca: {
    name: 'Lucca Cafés Especiais',
    async urls() { return locs(await get('https://luccacafesespeciais.com.br/product-sitemap.xml')).filter((u) => /\/produto\/cafe-especial\//.test(u)) },
    parse(html, url) {
      const ls = lines(html)
      const title = decode((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim()
      const f = fichaFrom(ls, { produtor: /^Produtor$/i, propriedade: /^Propriedade$/i, regiao: /^Regi[aã]o$/i, municipio: /^Munic[ií]pio$/i, altitude: /^Altitude$/i, variedade: /^Variedade$/i, processo: /^Processo$/i, torra: /^Torra$/i })
      const pontos = ls.find((l, i) => /^\d{2}(,\d)?$/.test(l) && /^Pontos/i.test(ls[i + 1] || ''))
      // resumo sensorial: a linha que começa com "Aroma de ..." (os campos Aroma/Sabor/Corpo vêm vazios no HTML)
      const sens = ls.find((l) => /^Aroma (de|com)/i.test(l) && l.length > 30) || ''
      return { ...f, name: title.replace(/\s*-\s*250 ?g.*$/i, ''), score: pontos ? Number(pontos.replace(',', '.')) : null, sensorial: sens, url }
    }
  },
  moka: {
    name: 'Moka Clube',
    async urls() {
      const idx = locs(await get('https://www.mokaclube.com.br/sitemap.xml')).filter((u) => /sitemap_products/.test(u))
      let all = []; for (const s of idx) all.push(...locs(await get(s)))
      return all.filter((u) => /\/products\/cafe-/.test(u))
    },
    async pre(url) { const j = JSON.parse(await get(url + '.js')); return j.type === 'Café' ? j : null },
    parse(html, url, js) {
      const ls = lines(html)
      const f = fichaFrom(ls, { sensorial: /^Perfil sensorial$/i, produtor: /^Produtor$/i, regiao: /^Regi[aã]o$/i, variedade: /^Variedade$/i, processo: /^Processo$/i, torra: /^Torra$/i })
      const desc = decode((js.description || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ')
      return { ...f, name: js.title.replace(/^Caf[eé]\s+/i, '').replace(/\s*\d+\s*g$/i, ''), score: null, descricao: desc.slice(0, 600), price: js.price / 100, tags: js.tags, url }
    }
  }
}

const results = []
for (const [key, site] of Object.entries(SITES)) {
  let urls
  try { urls = (await site.urls()).slice(0, LIMIT) } catch (e) { console.error(`${site.name}: indisponível (${e.message})`); continue }
  console.error(`${site.name}: ${urls.length} URLs`)
  for (const u of urls) {
    await sleep(DELAY)
    try {
      const pre = site.pre ? await site.pre(u) : null
      if (site.pre && !pre) { console.error('  pulado (não é café)', u); continue }
      const r = site.parse(await get(u), u, pre)
      const text = [r.sensorial, r.descricao].filter(Boolean).join(' ')
      const fl = flavors(text)
      results.push({ source: site.name, ...r, name: r.name.replace(/\s*[–-]\s*\d+\s*g\s*$/i, '').replace(/\s+/g, ' ').trim(), flavorTerms: fl.terms, notes: fl.notes, body: bodyOf(text) || bodyByRoast(r.torra) })
      console.error('  ok', u)
    } catch (e) { console.error('  erro', e.message) }
  }
}
writeFileSync(args.out || 'cafes.json', JSON.stringify({ fetchedAt: new Date().toISOString(), coffees: results }, null, 1))
console.log('| Loja | Café | Região | Variedade | Processo | Torra | Pontos | Corpo | Sensorial (texto) | Notas do app |')
console.log('|---|---|---|---|---|---|---|---|---|---|')
for (const c of results) console.log(`| ${c.source.split(' ')[0]} | ${c.name} | ${c.regiao || ''} | ${c.variedade || ''} | ${c.processo || ''} | ${c.torra || ''} | ${c.score || ''} | ${c.body || ''} | ${(c.sensorial || '').slice(0, 110)} | ${c.notes.join(', ')} |`)
