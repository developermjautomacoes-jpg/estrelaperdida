# A Estrela Partida — Estúdio Gamer Neeko

RPG tático cooperativo (1 a 4 heróis) em tabuleiro hexagonal, com campanha persistente,
inspirado no formato de jogos como Gloomhaven. Mundo, nomes, heróis, cartas e história são
**originais**: nunca copie nomes, textos, cartas, arte ou cenários de outros jogos.

Público: jogadores a partir de 10 anos. Fantasia sombria, sem sangue nem violência gráfica.
Todo o texto do jogo e do código é em português do Brasil.

## Comandos

```bash
npm install
npm run dev          # jogo em http://localhost:5173
npm test             # testes do motor, do conteúdo e simulações
npm run typecheck
npm run build
```

## Arquitetura

- `src/engine/` — motor puro (sem React): hexágonos, cartas, batalha, IA dos monstros,
  progressão, conquistas e save. Tudo é função pura sobre estado serializável em JSON.
  - `batalha.ts` — rodada: planejamento (2 cartas por herói) → iniciativa → turnos → fim de rodada.
  - `simulacao.ts` — jogador automático para testes e balanceamento.
  - `rng.ts` — aleatoriedade com semente (mesma semente = mesma partida).
- `src/content/registro.ts` — carrega e valida todos os pacotes de `aventuras/`.
- `aventuras/<pacote>/` — **conteúdo como dado** (JSON). Uma aventura nova é uma pasta nova.
  - `base/` — biblioteca: 6 classes (cada uma com versão feminina e masculina), monstros comuns, conquistas pessoais.
  - `estrela-partida/` — a primeira campanha.
- `src/ui/` — interface React (telas, tabuleiro SVG, cartas).
- `src/ui/arte/` — retratos em SVG (desenhados a partir do campo `visual` do JSON) e capa.
- `src/assets/arte/` — arte pintada: `<id>.png` substitui o retrato SVG automaticamente
  (`capa.png`, `ambiente.<regiao>.png` para os fundos). Prompts em `docs/prompts-arte.md`.
- `docs/` — documento de design (GDD), guia para criar aventuras e pacote de prompts de arte.
- `docs/referencias-rpg.md` — o que aproveitar dos manuais de RPG de referência (Livro do Jogador e Guia do
  Mestre, 5ª ed.). Só ideias de mecânica; nunca texto, nomes ou tabelas. Os PDFs não entram no repositório.

## Regras do projeto

1. **Conteúdo nunca vai no código.** Classes, cartas, monstros, cenários e conquistas ficam em JSON.
2. **IDs com o prefixo do pacote** (`base.`, `estrela.`). O teste de conteúdo falha se não tiver.
3. **Toda mudança no motor vem com teste** em `src/engine/*.test.ts`.
4. **Mudou números de cartas ou monstros?** Rode `npm test` e confira as taxas de vitória
   impressas pela simulação (meta inicial: prólogo fácil, chefes difíceis).
5. **Mudou o formato do save?** Suba `VERSAO_SAVE` em `save.ts` e escreva a migração.
6. Cenários sem mapa jogável ficam com `"rascunho": true`.
7. Commits com autoria de Monique Coelho, sem linhas de coautoria do Claude.

## Agentes do estúdio

Ficam em `.claude/agents/`. Use o agente certo para cada tipo de tarefa:
game-designer, engine-dev, monster-ai, level-designer, roteirista, balanceador,
diretor-de-arte, ui-dev e qa.
