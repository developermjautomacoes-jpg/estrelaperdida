import type { Condicao, ModificadorId, Talento } from './types';
import type { Rng } from './rng';

/** Baralho de modificadores de ataque (20 cartas), igual para heróis e monstros. */
export const BARALHO_BASE: ModificadorId[] = [
  ...Array<ModificadorId>(6).fill('+0'),
  ...Array<ModificadorId>(5).fill('+1'),
  ...Array<ModificadorId>(5).fill('-1'),
  '+2',
  '-2',
  'x2',
  'erro',
];

/** Monta o baralho de um herói aplicando os talentos escolhidos. */
export const montarBaralho = (talentos: Talento[] = []): ModificadorId[] => {
  const baralho = [...BARALHO_BASE];
  for (const t of talentos) {
    for (const r of t.remove ?? []) {
      const i = baralho.indexOf(r);
      if (i >= 0) baralho.splice(i, 1);
    }
    baralho.push(...(t.adiciona ?? []));
  }
  return baralho;
};

export interface ResultadoModificador {
  dano: number;
  condicao?: Condicao;
  /** x2 e erro fazem o baralho ser embaralhado no fim da rodada. */
  embaralhar: boolean;
}

export const aplicarModificador = (base: number, m: ModificadorId): ResultadoModificador => {
  switch (m) {
    case 'x2':
      return { dano: base * 2, embaralhar: true };
    case 'erro':
      return { dano: 0, embaralhar: true };
    case 'veneno':
      return { dano: base, condicao: 'veneno', embaralhar: false };
    case 'queimando':
      return { dano: base, condicao: 'queimando', embaralhar: false };
    default:
      return { dano: Math.max(0, base + Number(m)), embaralhar: false };
  }
};

export interface PilhaModificadores {
  monte: ModificadorId[];
  descarte: ModificadorId[];
  precisaEmbaralhar: boolean;
}

export const novaPilha = (baralho: ModificadorId[], rng: Rng): PilhaModificadores => ({
  monte: rng.embaralhar(baralho),
  descarte: [],
  precisaEmbaralhar: false,
});

export const comprar = (pilha: PilhaModificadores, rng: Rng): ModificadorId => {
  if (pilha.monte.length === 0) {
    pilha.monte = rng.embaralhar(pilha.descarte);
    pilha.descarte = [];
  }
  const m = pilha.monte.pop()!;
  pilha.descarte.push(m);
  if (m === 'x2' || m === 'erro') pilha.precisaEmbaralhar = true;
  return m;
};

/** Chamado no fim da rodada. */
export const embaralharSePreciso = (pilha: PilhaModificadores, rng: Rng): void => {
  if (!pilha.precisaEmbaralhar) return;
  pilha.monte = rng.embaralhar([...pilha.monte, ...pilha.descarte]);
  pilha.descarte = [];
  pilha.precisaEmbaralhar = false;
};
