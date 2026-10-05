// Inspeção pontual de páginas (2ª rodada): mostra o texto relevante para escrever os coletores.
const UA = 'Mozilla/5.0 (compatible; harmonia-personal/1.0)'
async function get(url) {
  try { const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' }); return { ok: r.ok, status: r.status, url: r.url, text: r.ok ? await r.text() : '' } }
  catch (e) { return { ok: false, status: e.message, text: '' } }
}
const strip = (h) => h.replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(p|li|div|h\d|tr|td|th|span|dt|dd|strong)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n')
const between = (t, a, b) => { const i = t.search(a); if (i < 0) return '(não achado)'; const rest = t.slice(i); const j = rest.slice(20).search(b); return rest.slice(0, j < 0 ? 2500 : j + 20).slice(0, 2500) }
const show = (title, s) => console.log(`\n===== ${title}\n${s}`)

// Lucca: bloco Aroma..Torra de uma página de café
let p = await get('https://luccacafesespeciais.com.br/produto/cafe-especial/250-g/cafe-especial-santa-monica/')
show('LUCCA café (bloco ficha)', between(strip(p.text), /\nAroma:/, /Curiosidade/))
let sm = await get('https://luccacafesespeciais.com.br/product-sitemap.xml')
show('LUCCA URLs café', [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /cafe-especial|microlote|blend/i.test(u)).join('\n'))

// Moka: endpoint JSON do Shopify + bloco ficha na página
p = await get('https://www.mokaclube.com.br/products/cafe-bela-epoca-organico-250g.js')
if (p.ok) { const j = JSON.parse(p.text); show('MOKA .js', JSON.stringify({ title: j.title, type: j.type, tags: j.tags, vendor: j.vendor, price: j.price }, null, 1)) }
p = await get('https://www.mokaclube.com.br/products/cafe-bela-epoca-organico-250g')
show('MOKA ficha', between(strip(p.text), /Perfil sensorial/, /Quantidade/))
p = await get('https://www.mokaclube.com.br/products/cafe-bourbon-barrel-aged-250g')
show('MOKA ficha 2', between(strip(p.text), /Perfil sensorial/, /Quantidade/))

// Distinto: home e links
p = await get('https://www.distintocafes.com.br/')
show('DISTINTO home ' + p.status + ' ' + p.url, strip(p.text).slice(0, 1500) + '\nLINKS:\n' + [...new Set([...p.text.matchAll(/href="([^"#]+)"/g)].map((m) => m[1]))].filter((u) => !/\.(css|js|png|jpg|svg|ico)/.test(u)).slice(0, 60).join('\n'))

// Loja de Whisky: categoria e um produto
p = await get('https://www.lojadewhisky.com.br/prod,idcategoria,197236,whisky')
const links = [...new Set([...p.text.matchAll(/href="([^"]*idproduto[^"]*)"/gi)].map((m) => m[1]))]
show('LOJA DE WHISKY categoria ' + p.status, `${links.length} links de produto\n` + links.slice(0, 15).join('\n') + '\npaginação: ' + [...new Set([...p.text.matchAll(/href="([^"]*pagina[^"]*)"/gi)].map((m) => m[1]))].slice(0, 6).join(' | '))
const one = links.find((u) => /whisk|malt|bourbon/i.test(u)) || links[0]
if (one) {
  const url = one.startsWith('http') ? one : 'https://www.lojadewhisky.com.br' + (one.startsWith('/') ? '' : '/') + one
  p = await get(url)
  const t = strip(p.text)
  show('LOJA DE WHISKY produto ' + url, between(t, /Nariz|Aroma|Descri[cç][aã]o|Caracter[ií]sticas/i, /Avalia[cç]|Produtos relacionados|Quem viu/i))
  const ld = [...p.text.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).find((x) => /Product/.test(x))
  show('LOJA DE WHISKY JSON-LD', (ld || '(sem)').replace(/\s+/g, ' ').slice(0, 1200))
}
