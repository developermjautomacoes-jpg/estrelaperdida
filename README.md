# A Estrela Partida

RPG tático cooperativo em tabuleiro hexagonal, do **Estúdio Gamer Neeko**.
De 1 a 4 heróis tentam reunir os sete fragmentos de uma estrela caída antes que a Névoa Silenciosa
apague as cores e as memórias do mundo.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173, crie um jogador para cada pessoa, escolha um herói e vá para a campanha.

## O que já funciona

- Motor completo de batalha: hexágonos, linha de visão, iniciativa, cartas (cima/baixo), descanso,
  exaustão, modificadores de ataque, condições e IA dos monstros.
- 6 classes com versão feminina e masculina (12 heróis), cada uma com cartas próprias.
- Progressão: XP, 9 níveis, cartas novas e talentos.
- Conquistas pessoais e de aventura.
- Save local com progresso da campanha, escolhas e lanternas.
- Aventuras como pacotes JSON: a campanha *A Estrela Partida* com 23 cenários (prólogo, 01 e 05 jogáveis; os demais em roteiro).
- Simulação automática de partidas para balanceamento.

## Estrutura

| Pasta | Conteúdo |
| --- | --- |
| `src/engine` | Motor do jogo (TypeScript puro, testado) |
| `src/content` | Carregador e validador dos pacotes |
| `src/ui` | Interface React |
| `aventuras/` | Conteúdo: classes, monstros, cenários e conquistas |
| `docs/` | Documento de design e guia de criação de aventuras |
| `.claude/agents` | Agentes do estúdio |

## Testes

```bash
npm test
```
