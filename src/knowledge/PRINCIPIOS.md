# Princípios de harmonização

O motor (`src/lib/engine.js`) só aplica o que está nos JSONs desta pasta. A nota final (0–100) é a média ponderada de quatro princípios (`weights` em `pairing-rules.json`), mais um ajuste pelo seu histórico.

1. **Equilíbrio de corpo/intensidade (35%)** — força do charuto (suave 1, suave-médio 1,5, médio 2, médio-pleno 2,5, pleno 3) contra corpo da bebida (leve/médio/encorpado = 1–3, com `categoryOffset` porque destilados a 40%+ pesam mais que o corpo sugere). Quanto menor a diferença, melhor; o momento desloca o alvo (`bodyPreference`: de manhã aceita-se bebida mais leve).
2. **Complementaridade de sabor (35%)** — cada nota pertence a uma família (`flavors.json`). Nota igual nos dois = ressonância; mesma família = afinidade alta; famílias diferentes usam a tabela `affinity` (ex.: doce × tostado = caramelo com chocolate). Afinidades baixas (< 0,4) entram como alerta.
3. **Contraste equilibrado (15%)** — cada nota tem um perfil doce/amargo/picante/ácido. Regras em `balance.rules`: doce acalma picante e amargo (bônus); picante sobre picante, amargo sobre amargo e doce sobre doce saturam (penalidade); acidez alta aviva a aspereza de charutos amargos.
4. **Contexto (15%)** — pesos por categoria e tipo para manhã/tarde/noite e para a ocasião (sozinho, amigos, celebração).
5. **Aprendizado pessoal** — cada estrela acima/abaixo de 3 que você deu ao mesmo par soma/subtrai `history.perStar`.

## Como editar
- Nova nota de sabor: adicione em `flavors.json` com `family`, `taste` e `weight`.
- Nova afinidade: em `pairing-rules.json > flavor.affinity`, `a` = família da **bebida**, `b` = do **charuto**.
- Novo tipo de bebida com notas típicas: `drink-types.json`.
- Novo charuto para o auto-preenchimento: `cigars-db.json` (`cigars-cet.json` é gerado pela coleta — não editar à mão).
- Nova bebida (marca/rótulo) para o auto-preenchimento: `drinks-db.json`.

Depois rode `npm test` (valida as referências cruzadas) e `npm run build`.
