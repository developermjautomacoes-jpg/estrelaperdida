import { deChave, distancia } from './hex';
import {
  alvosValidos,
  criarBatalha,
  descansar,
  encerrarTurnoHeroi,
  escolherCartas,
  escolherMetades,
  executarPasso,
  iniciarRodada,
  passoAtual,
  podeDescansar,
  pularPasso,
  unidade,
  vivas,
  type EstadoBatalha,
  type ParticipanteBatalha,
} from './batalha';
import type { Cenario, Monstro } from './types';

// Jogador automático simples, usado em testes e pelo agente Balanceador
// para rodar muitas partidas e medir taxa de vitória e duração.

const jogarTurno = (e: EstadoBatalha, monstros: Record<string, Monstro>): EstadoBatalha => {
  const h = e.herois.find((x) => x.unidadeId === e.turno!.unidadeId)!;
  e = escolherMetades(e, h.escolhidas[0].id);
  let guarda = 0;
  while (passoAtual(e) && guarda++ < 20) {
    const v = alvosValidos(e);
    const p = passoAtual(e)!;
    const eu = unidade(e, e.turno!.unidadeId);
    if (p.acao.tipo === 'mover' && v.hexes.length) {
      // aproxima-se do monstro mais perto
      const alvos = vivas(e, 'monstro');
      const melhor = [...v.hexes]
        .map(deChave)
        .sort((a, b) => Math.min(...alvos.map((m) => distancia(a, m.pos))) - Math.min(...alvos.map((m) => distancia(b, m.pos))))[0];
      const atual = Math.min(...alvos.map((m) => distancia(eu.pos, m.pos)));
      e = Math.min(...alvos.map((m) => distancia(melhor, m.pos))) < atual ? executarPasso(e, { hex: melhor }) : pularPasso(e);
    } else if (v.unidades.length) {
      const alvo = p.acao.tipo === 'atacar'
        ? [...v.unidades].sort((a, b) => unidade(e, a).vida - unidade(e, b).vida)[0]
        : [...v.unidades].sort((a, b) => unidade(e, a).vida / unidade(e, a).vidaMax - unidade(e, b).vida / unidade(e, b).vidaMax)[0];
      e = executarPasso(e, { unidadeId: alvo });
    } else e = pularPasso(e);
  }
  return encerrarTurnoHeroi(e, monstros);
};

export interface ResultadoSimulacao {
  venceu: boolean;
  rodadas: number;
  heroisDePe: number;
}

export const simularPartida = (
  cenario: Cenario,
  monstros: Record<string, Monstro>,
  participantes: ParticipanteBatalha[],
  semente: number,
  limiteRodadas = 40,
): ResultadoSimulacao => {
  let e = criarBatalha(cenario, monstros, participantes, semente);
  while (e.fase !== 'vitoria' && e.fase !== 'derrota' && e.rodada <= limiteRodadas) {
    if (e.fase === 'planejamento') {
      for (const h of e.herois) {
        if (unidade(e, h.unidadeId).fora) continue;
        if (h.mao.length >= 2) {
          const [a, b] = [...h.mao].sort((x, y) => x.iniciativa - y.iniciativa);
          e = escolherCartas(e, h.unidadeId, a.id, b.id, a.id);
        } else if (podeDescansar(e, h.unidadeId)) e = descansar(e, h.unidadeId);
      }
      e = iniciarRodada(e, monstros);
    } else if (e.turno) e = jogarTurno(e, monstros);
    else break;
  }
  return { venceu: e.fase === 'vitoria', rodadas: e.rodada, heroisDePe: vivas(e, 'heroi').length };
};
