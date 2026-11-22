# Como criar uma nova aventura

Uma aventura é uma pasta em `aventuras/`. O jogo encontra e carrega a pasta sozinho; nenhum código muda.

## 1. Estrutura

```text
aventuras/minha-aventura/
  aventura.json      # obrigatório
  cenarios/          # um arquivo por cenário
  monstros/          # monstros novos (opcional)
  classes/           # classes novas (opcional)
  conquistas.json    # conquistas da aventura (opcional)
```

Classes, monstros e conquistas de qualquer pacote ficam disponíveis para todos.

## 2. aventura.json

```json
{
  "id": "minha.aventura",
  "prefixo": "minha",
  "nome": "O Farol do Fim do Mundo",
  "versao": 1,
  "descricao": "Uma frase que aparece na Guilda da Lanterna.",
  "requisitos": { "aventurasConcluidas": ["estrela.aventura"] },
  "cenarioInicial": "minha.cenario-01",
  "cenarios": ["minha.cenario-01", "minha.cenario-02"]
}
```

Todos os ids do pacote começam com o `prefixo` e um ponto.

## 3. Cenário

```json
{
  "id": "minha.cenario-01",
  "numero": "01",
  "nome": "A Escada de Sal",
  "ato": 1,
  "introducao": "Até 3 frases lidas antes da batalha.",
  "conclusao": "Até 2 frases lidas depois da vitória.",
  "mapa": [
    "#########",
    "#SS.....#",
    "#SS..#..#",
    "#.......#",
    "#########"
  ],
  "inimigos": [
    { "tipo": "base.oco", "linha": 1, "coluna": 6 },
    { "tipo": "base.lobo-cinzento", "linha": 3, "coluna": 6, "minHerois": 3 }
  ],
  "objetivo": { "tipo": "derrotar_todos" },
  "recompensas": { "xp": 8, "ouro": 10, "estatisticas": { "cristais_recuperados": 1 } },
  "desbloqueia": ["minha.cenario-02"]
}
```

- Mapa: `#` parede, `.` chão, `S` início (exatamente 4), espaço = fora do mapa. Linhas ímpares ficam deslocadas meio hexágono.
- Objetivos: `derrotar_todos`, `derrotar_chefe` ou `{ "tipo": "sobreviver", "rodadas": 6 }`.
- Escolhas: campo `escolha` com `pergunta` e `opcoes` (cada opção pode desbloquear cenários).
- Cenário ainda sem mapa: `"rascunho": true` (aparece como "em produção").

## 4. Validar

```bash
npm test
```

O teste de conteúdo aponta ids sem prefixo, monstros inexistentes, inimigos fora do chão e cenários
desbloqueados que não existem. A simulação mostra a taxa de vitória dos cenários jogáveis.
