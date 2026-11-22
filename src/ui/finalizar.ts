import type { EstadoBatalha } from '../engine/batalha';
import { avaliarConquistas, registrarEstatisticas, type ConquistaNova } from '../engine/conquistas';
import { aplicarRecompensa, nivelPorXp } from '../engine/progressao';
import { atualizarJogador, atualizarProgresso, concluirCenario, obterProgresso } from '../engine/save';
import type { Aventura, Cenario, Conquista, Save } from '../engine/types';

export interface ResumoHeroi {
  jogadorId: string;
  jogadorNome: string;
  heroiNome: string;
  xp: number;
  ouro: number;
  niveisGanhos: number[];
  conquistas: ConquistaNova[];
}

/**
 * Aplica o resultado de uma batalha ao save: XP e ouro dos heróis, estatísticas,
 * conquistas e progresso da campanha. O XP das cartas é mantido mesmo na derrota.
 */
export const finalizarBatalha = (
  save: Save,
  aventura: Aventura,
  cenario: Cenario,
  e: EstadoBatalha,
  conquistas: Conquista[],
  escolha?: { id: string; opcao: string; desbloqueia?: string[] },
): { save: Save; resumo: ResumoHeroi[] } => {
  const venceu = e.fase === 'vitoria';
  const resumo: ResumoHeroi[] = [];
  let s = save;

  for (const h of e.herois) {
    let jogador = s.jogadores.find((j) => j.id === h.jogadorId);
    if (!jogador) continue;
    const salvo = jogador.herois.find((x) => x.id === h.heroiSalvoId)!;
    const xp = h.xpGanho + (venceu ? cenario.recompensas.xp : 0);
    const ouro = venceu ? cenario.recompensas.ouro : 0;
    let { heroi, niveisGanhos } = aplicarRecompensa(salvo, xp, ouro);

    const stats = { ...(e.estatisticas[h.jogadorId] ?? {}), ...(venceu ? (cenario.recompensas.estatisticas ?? {}) : {}) };
    jogador = registrarEstatisticas(jogador, stats);
    jogador = { ...jogador, estatisticas: { ...jogador.estatisticas, nivel_maximo: Math.max(jogador.estatisticas.nivel_maximo ?? 1, nivelPorXp(heroi.xp)) } };

    const avaliacao = avaliarConquistas(jogador, conquistas, aventura.id);
    jogador = avaliacao.jogador;
    for (const n of avaliacao.novas) {
      const r = aplicarRecompensa(heroi, n.conquista.recompensa.xp ?? 0, n.conquista.recompensa.ouro ?? 0);
      heroi = r.heroi;
      niveisGanhos = [...new Set([...niveisGanhos, ...r.niveisGanhos])];
    }

    jogador = { ...jogador, herois: jogador.herois.map((x) => (x.id === heroi.id ? heroi : x)) };
    s = atualizarJogador(s, jogador);
    resumo.push({ jogadorId: jogador.id, jogadorNome: jogador.nome, heroiNome: heroi.nome, xp: heroi.xp - salvo.xp, ouro: heroi.ouro - salvo.ouro, niveisGanhos, conquistas: avaliacao.novas });
  }

  const progresso = obterProgresso(s, aventura.id, aventura.versao, aventura.cenarioInicial);
  const novo = concluirCenario(progresso, cenario.id, venceu, cenario.desbloqueia, escolha);
  s = atualizarProgresso(s, { ...novo, jogadores: [...new Set([...novo.jogadores, ...e.herois.map((h) => h.jogadorId)])] });
  return { save: s, resumo };
};
