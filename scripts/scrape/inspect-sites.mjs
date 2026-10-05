// Inspeciona sites escolhidos: robots.txt, padrão das URLs de produto no sitemap e o conteúdo
// de 2 páginas de produto (JSON-LD e trechos com palavras-chave). Saída no log, para escrever os coletores.
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
const SITES = (process.env.SITES || 'https://www.luccacafesespeciais.com.br,https://www.distintocafes.com.br,https://www.mokaclube.com.br,https://www.lojadewhisky.com.br').split(',')
const KEY = /(notas?|sensor|aroma|sabor|torra|processo|variedade|pontua|altitude|regi[aã]o|origem|corpo|acidez|do[cç]ura|nariz|boca|paladar|final|idade|barril|cask|teor)/i
const AI = ['claudebot', 'claude-user', 'anthropic-ai']

async function get(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); return { ok: r.ok, status: r.status, url: r.url, text: r.ok ? await r.text() : '' } }
  catch (e) { return { ok: false, status: e.message, text: '' } }
}
const strip = (h) => h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n')

for (const base of SITES) {
  console.log(`\n================ ${base}`)
  const rb = await get(base + '/robots.txt')
  console.log('robots:', rb.status, rb.url)
  if (rb.ok) {
    const lines = rb.text.split('\n').map((l) => l.trim()).filter((l) => /^(user-agent|disallow|allow|sitemap)/i.test(l))
    console.log(lines.slice(0, 40).join('\n'))
    const aiHit = AI.filter((b) => new RegExp(`user-agent:\\s*${b}`, 'i').test(rb.text))
    console.log('menciona robôs de IA:', aiHit.join(', ') || 'não')
  }
  const sms = rb.ok ? [...rb.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : []
  let urls = []
  for (const sm of (sms.length ? sms : [base + '/sitemap.xml', base + '/sitemap_index.xml']).slice(0, 4)) {
    const r = await get(sm); if (!r.ok) { console.log('sitemap', sm, r.status); continue }
    const locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
    console.log('sitemap', sm, '→', locs.length, 'locs', /<sitemapindex/i.test(r.text) ? '(índice)' : '')
    if (/<sitemapindex/i.test(r.text)) {
      for (const child of locs.filter((u) => /product|produto/i.test(u)).slice(0, 3)) {
        const c = await get(child); const cl = [...c.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
        console.log('  filho', child, '→', cl.length); urls.push(...cl)
      }
    } else urls.push(...locs)
  }
  const prods = urls.filter((u) => /produto|product|prod,|\/p$/i.test(u))
  console.log('URLs de produto:', prods.length, '| exemplos:\n ' + prods.slice(0, 12).join('\n '))
  const picks = prods.filter((u) => /cafe|caf%c3%a9|whisk|bourbon|malt|scotch|blend|microlote|graos|gr%c3%a3os/i.test(u)).slice(0, 2)
  for (const u of (picks.length ? picks : prods.slice(0, 2))) {
    const p = await get(u)
    console.log(`\n--- produto: ${u} (${p.status})`)
    const ld = [...p.text.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).find((x) => /"Product"/.test(x))
    if (ld) console.log('JSON-LD Product:', ld.replace(/\s+/g, ' ').slice(0, 1500))
    const t = strip(p.text).split('\n').map((l) => l.trim()).filter((l) => l.length > 2 && l.length < 400)
    const hits = t.filter((l) => KEY.test(l)).slice(0, 40)
    console.log('linhas com palavras-chave:\n  ' + hits.join('\n  '))
  }
}
