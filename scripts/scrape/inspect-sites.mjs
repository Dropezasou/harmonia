// Inspeção pontual (3ª rodada): seções de whisky da Casa Lisboa e da World Wine.
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
async function get(url) { try { const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); return { ok: r.ok, status: r.status, url: r.url, text: r.ok ? await r.text() : '' } } catch (e) { return { ok: false, status: e.message, text: '' } } }
const strip = (h) => h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td|th|span|dt|dd|strong)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n')
const locs = (x) => [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1])
async function allUrls(base) {
  const rb = await get(base + '/robots.txt'); const sms = [...rb.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1])
  let out = []
  for (const s of sms.length ? sms : [base + '/sitemap.xml']) { const r = await get(s); const l = locs(r.text); if (/<sitemapindex/i.test(r.text)) { for (const c of l.filter((u) => /produc|produto|product/i.test(u)).slice(0, 8)) out.push(...locs((await get(c)).text)) } else out.push(...l) }
  return out
}
for (const base of ['https://casalisboa.com.br', 'https://www.worldwine.com.br']) {
  const urls = await allUrls(base)
  const wh = urls.filter((u) => /whisk|bourbon|single-malt|scotch/i.test(u))
  console.log(`\n===== ${base}: ${urls.length} URLs, ${wh.length} de whisky\n` + wh.slice(0, 10).join('\n'))
  for (const u of wh.filter((u) => !/kit|caixa|copo|6-garrafas/i.test(u)).slice(0, 2)) {
    const p = await get(u); const t = strip(p.text)
    const i = t.search(/Nariz|Aroma|Notas? de degusta|Caracter[ií]sticas|Ficha t[eé]cnica|Descri[cç][aã]o/i)
    console.log(`\n--- ${u} (${p.status})\n` + (i >= 0 ? t.slice(i, i + 1800) : t.slice(0, 800)))
  }
}
