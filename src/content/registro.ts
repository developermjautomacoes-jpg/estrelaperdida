import type { Aventura, Cenario, Classe, Conquista, Monstro, Personagem } from '../engine/types';

// Carrega todos os pacotes de /aventuras automaticamente.
// Para criar uma aventura nova basta adicionar uma pasta lá — nenhum código muda.

export interface Pacote {
  pasta: string;
  aventura: Aventura;
  classes: Classe[];
  monstros: Monstro[];
  cenarios: Cenario[];
  conquistas: Conquista[];
  personagens: Personagem[];
}

export interface Registro {
  pacotes: Pacote[];
  aventuras: Record<string, Aventura>;
  classes: Record<string, Classe>;
  monstros: Record<string, Monstro>;
  cenarios: Record<string, Cenario>;
  conquistas: Conquista[];
  personagens: Personagem[];
}

type Arquivos = Record<string, unknown>;

export const montarRegistro = (arquivos: Arquivos): Registro => {
  const porPasta = new Map<string, Pacote>();
  const pacote = (pasta: string) => {
    if (!porPasta.has(pasta))
      porPasta.set(pasta, { pasta, aventura: undefined as unknown as Aventura, classes: [], monstros: [], cenarios: [], conquistas: [], personagens: [] });
    return porPasta.get(pasta)!;
  };
  for (const [caminho, dado] of Object.entries(arquivos)) {
    const m = caminho.match(/aventuras\/([^/]+)\/(.+)\.json$/);
    if (!m) continue;
    const [, pasta, resto] = m;
    const p = pacote(pasta);
    if (resto === 'aventura') p.aventura = dado as Aventura;
    else if (resto === 'conquistas') p.conquistas.push(...(dado as Conquista[]));
    else if (resto === 'personagens') p.personagens.push(...(dado as Personagem[]));
    else if (resto.startsWith('classes/')) p.classes.push(dado as Classe);
    else if (resto.startsWith('monstros/')) p.monstros.push(dado as Monstro);
    else if (resto.startsWith('cenarios/')) p.cenarios.push(dado as Cenario);
  }
  const pacotes = [...porPasta.values()].filter((p) => p.aventura);
  const indexar = <T extends { id: string }>(lista: T[]) => Object.fromEntries(lista.map((x) => [x.id, x]));
  return {
    pacotes,
    aventuras: indexar(pacotes.map((p) => p.aventura)),
    classes: indexar(pacotes.flatMap((p) => p.classes)),
    monstros: indexar(pacotes.flatMap((p) => p.monstros)),
    cenarios: indexar(pacotes.flatMap((p) => p.cenarios)),
    conquistas: pacotes.flatMap((p) => p.conquistas),
    personagens: pacotes.flatMap((p) => p.personagens),
  };
};

/** Confere se os pacotes estão consistentes. Retorna a lista de problemas (vazia = tudo certo). */
export const validarRegistro = (r: Registro): string[] => {
  const erros: string[] = [];
  const ids = new Set<string>();
  const unico = (id: string, onde: string) => {
    if (ids.has(id)) erros.push(`${onde}: id repetido "${id}"`);
    ids.add(id);
  };
  for (const p of r.pacotes) {
    const pre = `${p.aventura.prefixo}.`;
    const prefixo = (id: string, onde: string) => {
      if (!id.startsWith(pre)) erros.push(`${onde}: "${id}" deveria começar com "${pre}"`);
      unico(id, onde);
    };
    prefixo(p.aventura.id, `${p.pasta}/aventura`);
    for (const c of p.classes) {
      prefixo(c.id, `classe ${c.id}`);
      const generos = c.versoes.map((v) => v.genero).sort().join('');
      if (generos !== 'fm') erros.push(`classe ${c.id}: precisa de uma versão feminina e uma masculina`);
      if (c.vida.length < 9) erros.push(`classe ${c.id}: vida precisa de 9 valores (um por nível)`);
      for (const carta of [...c.cartas, ...c.versoes.flatMap((v) => v.cartas)]) unico(carta.id, `carta de ${c.id}`);
      for (const v of c.versoes) unico(v.id, `versão de ${c.id}`);
      for (const t of c.talentos) unico(t.id, `talento de ${c.id}`);
    }
    for (const m of p.monstros) {
      prefixo(m.id, `monstro ${m.id}`);
      if (!m.habilidades.length) erros.push(`monstro ${m.id}: sem habilidades`);
    }
    for (const c of p.cenarios) {
      prefixo(c.id, `cenário ${c.id}`);
      for (const d of [...c.desbloqueia, ...(c.escolha?.opcoes.flatMap((o) => o.desbloqueia ?? []) ?? [])])
        if (!r.cenarios[d]) erros.push(`cenário ${c.id}: desbloqueia "${d}", que não existe`);
      if (!c.rascunho) {
        if (!c.mapa) erros.push(`cenário ${c.id}: sem mapa (marque "rascunho": true se ainda não for jogável)`);
        const inicios = (c.mapa ?? []).join('').split('S').length - 1;
        if (c.mapa && inicios < 4) erros.push(`cenário ${c.id}: precisa de 4 inícios "S" (tem ${inicios})`);
        for (const i of c.inimigos ?? []) {
          if (!r.monstros[i.tipo]) erros.push(`cenário ${c.id}: monstro "${i.tipo}" não existe`);
          const ch = c.mapa?.[i.linha]?.[i.coluna];
          if (ch !== '.') erros.push(`cenário ${c.id}: inimigo em ${i.linha},${i.coluna} fora do chão`);
        }
      }
    }
    for (const id of p.aventura.cenarios) if (!r.cenarios[id]) erros.push(`aventura ${p.aventura.id}: cenário "${id}" não existe`);
    for (const c of p.conquistas) prefixo(c.id, `conquista ${c.id}`);
    for (const pe of p.personagens) prefixo(pe.id, `personagem ${pe.id}`);
  }
  return erros;
};

let cache: Registro | undefined;

/** Registro com todos os pacotes da pasta /aventuras (via Vite). */
export const registro = (): Registro =>
  (cache ??= montarRegistro(import.meta.glob('../../aventuras/**/*.json', { eager: true, import: 'default' })));
