# Harmonia — charutos & bebidas (PWA)

App pessoal: umidor, adega, harmonização baseada em regras e histórico com notas 1–5. Funciona offline e é instalável no iPhone (Safari → Compartilhar → Adicionar à Tela de Início).

- **Stack:** Vite + React + Tailwind v4, `vite-plugin-pwa` (service worker com precache), IndexedDB (`idb`).
- **Dados:** ficam só no aparelho (IndexedDB). Use *Histórico → Exportar backup* de vez em quando.
- **Base de conhecimento editável:** `src/knowledge/` (veja `PRINCIPIOS.md`).
- **Auto-preenchimento de charutos:** busca na base local `cigars-db.json` (offline). Sites de review não têm API pública e bloqueiam acesso direto do navegador, então para charutos fora da base o app oferece links de busca (Halfwheel, Cigar Aficionado, Google) e você preenche manualmente.

## Comandos
```
npm install
npm run dev      # desenvolvimento
npm test         # valida a base de conhecimento + exemplo do motor
npm run build    # gera dist/ (site estático; publique em GitHub Pages, Netlify, Vercel etc.)
```
