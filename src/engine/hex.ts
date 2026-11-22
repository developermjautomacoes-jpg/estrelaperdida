import type { Hex } from './types';

// Coordenadas axiais (q, r) para hexágonos com topo pontudo.
// Referência das fórmulas: redblobgames.com/grids/hexagons

export const DIRECOES: Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const chave = (h: Hex): string => `${h.q},${h.r}`;

export const deChave = (k: string): Hex => {
  const [q, r] = k.split(',').map(Number);
  return { q, r };
};

export const iguais = (a: Hex, b: Hex): boolean => a.q === b.q && a.r === b.r;

export const somar = (a: Hex, b: Hex): Hex => ({ q: a.q + b.q, r: a.r + b.r });

export const vizinhos = (h: Hex): Hex[] => DIRECOES.map((d) => somar(h, d));

export const distancia = (a: Hex, b: Hex): number =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

/** Converte linha/coluna de mapa em "odd-r" (linhas ímpares deslocadas) para axial. */
export const offsetParaAxial = (linha: number, coluna: number): Hex => ({
  q: coluna - (linha - (linha & 1)) / 2,
  r: linha,
});

/** Posição em pixels do centro do hexágono (topo pontudo). */
export const paraPixel = (h: Hex, tamanho: number): { x: number; y: number } => ({
  x: tamanho * Math.sqrt(3) * (h.q + h.r / 2),
  y: tamanho * 1.5 * h.r,
});

const arredondar = (q: number, r: number): Hex => {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
};

/** Hexágonos atravessados por uma linha reta de a até b (inclusive). */
export const linha = (a: Hex, b: Hex): Hex[] => {
  const n = distancia(a, b);
  if (n === 0) return [a];
  const res: Hex[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // pequeno deslocamento evita cair exatamente na borda entre dois hexágonos
    res.push(arredondar(a.q + (b.q - a.q) * t + 1e-6, a.r + (b.r - a.r) * t + 1e-6));
  }
  return res;
};

/** Há linha de visão se nenhum hexágono intermediário for parede. */
export const temLinhaDeVisao = (a: Hex, b: Hex, paredes: Set<string>): boolean =>
  linha(a, b)
    .slice(1, -1)
    .every((h) => !paredes.has(chave(h)));

export interface OpcoesCaminho {
  /** Hexágonos que existem e podem ser pisados. */
  andaveis: Set<string>;
  /** Hexágonos ocupados que não podem ser atravessados. */
  bloqueados: Set<string>;
}

/** Distâncias de caminhada a partir de `origem` (BFS), até `limite` passos. */
export const alcancaveis = (origem: Hex, limite: number, op: OpcoesCaminho): Map<string, number> => {
  const dist = new Map<string, number>([[chave(origem), 0]]);
  const fila: Hex[] = [origem];
  while (fila.length) {
    const atual = fila.shift()!;
    const d = dist.get(chave(atual))!;
    if (d >= limite) continue;
    for (const v of vizinhos(atual)) {
      const k = chave(v);
      if (dist.has(k) || !op.andaveis.has(k) || op.bloqueados.has(k)) continue;
      dist.set(k, d + 1);
      fila.push(v);
    }
  }
  return dist;
};

/** Menor caminho (lista de hexágonos, sem a origem) ou null se não houver. */
export const caminho = (origem: Hex, destino: Hex, op: OpcoesCaminho): Hex[] | null => {
  const ko = chave(origem);
  const kd = chave(destino);
  const anterior = new Map<string, string | null>([[ko, null]]);
  const fila: Hex[] = [origem];
  while (fila.length) {
    const atual = fila.shift()!;
    const ka = chave(atual);
    if (ka === kd) break;
    for (const v of vizinhos(atual)) {
      const k = chave(v);
      if (anterior.has(k) || !op.andaveis.has(k)) continue;
      if (op.bloqueados.has(k) && k !== kd) continue;
      anterior.set(k, ka);
      fila.push(v);
    }
  }
  if (!anterior.has(kd)) return null;
  const res: Hex[] = [];
  let k: string | null = kd;
  while (k && k !== ko) {
    res.unshift(deChave(k));
    k = anterior.get(k) ?? null;
  }
  return res;
};
