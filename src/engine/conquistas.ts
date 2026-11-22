import type { Conquista, Jogador } from './types';

/** Soma estatísticas da partida ao jogador (ex.: inimigos_derrotados: 3). */
export const registrarEstatisticas = (jogador: Jogador, stats: Record<string, number>): Jogador => {
  const estatisticas = { ...jogador.estatisticas };
  for (const [k, v] of Object.entries(stats)) estatisticas[k] = (estatisticas[k] ?? 0) + v;
  return { ...jogador, estatisticas };
};

export interface ConquistaNova {
  conquista: Conquista;
  data: string;
}

/**
 * Verifica quais conquistas o jogador acabou de ganhar e as registra.
 * Conquistas de aventura só valem na aventura indicada pelo prefixo do id.
 */
export const avaliarConquistas = (
  jogador: Jogador,
  conquistas: Conquista[],
  aventuraAtual?: string,
  agora = new Date().toISOString(),
): { jogador: Jogador; novas: ConquistaNova[] } => {
  const ja = new Set(jogador.conquistas.map((c) => c.id));
  const novas: ConquistaNova[] = [];
  for (const c of conquistas) {
    if (ja.has(c.id)) continue;
    if ((jogador.estatisticas[c.estatistica] ?? 0) >= c.quantidade) novas.push({ conquista: c, data: agora });
  }
  const titulos = [...jogador.titulos];
  for (const n of novas) if (n.conquista.recompensa.titulo) titulos.push(n.conquista.recompensa.titulo);
  return {
    jogador: {
      ...jogador,
      titulos,
      conquistas: [
        ...jogador.conquistas,
        ...novas.map((n) => ({
          id: n.conquista.id,
          data: n.data,
          aventura: n.conquista.tipo === 'aventura' ? aventuraAtual : undefined,
        })),
      ],
    },
    novas,
  };
};
