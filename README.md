# Harmonia — charutos & bebidas (PWA)

App pessoal: umidor, adega, harmonização baseada em regras e histórico com notas 1–5. Funciona offline e é instalável no iPhone (Safari → Compartilhar → Adicionar à Tela de Início).

- **Stack:** Vite + React + Tailwind v4, `vite-plugin-pwa` (service worker com precache), IndexedDB (`idb`).
- **Dados:** ficam só no aparelho (IndexedDB). Use *Histórico → Exportar backup* de vez em quando.
- **Base de conhecimento editável:** `src/knowledge/` (veja `PRINCIPIOS.md`).
- **Auto-preenchimento:** charutos em `cigars-db.json` (curada) e `cigars-cet.json` (coletada da loja Charutos e Tabacos), bebidas em `drinks-db.json` — tudo offline.
- **Foto:** o botão "📷 Ler pela foto" lê o texto do anel/rótulo no próprio aparelho (Tesseract, servido em `/ocr`, ~7 MB baixados na primeira foto e guardados para uso offline) e sugere os itens das bases.
- **Fora das bases:** sites de review não têm API pública e bloqueiam acesso direto do navegador, então o app oferece links de busca (Charutos e Tabacos, Cigar Aficionado, Distiller, Vivino, Google) e você preenche manualmente.

## Comandos
```
npm install
npm run dev      # desenvolvimento
npm test         # valida a base de conhecimento + exemplo do motor
node scripts/build-cet-db.mjs   # regenera cigars-cet.json a partir de data/cet-raw.json
npm run build    # gera dist/ (site estático; publique em GitHub Pages, Netlify, Vercel etc.)
```
