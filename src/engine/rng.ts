// Gerador de números aleatórios com semente: a mesma semente gera a mesma partida.
// Isso permite repetir bugs, testar regras e rodar simulações de balanceamento.

export interface Rng {
  proximo(): number; // [0, 1)
  inteiro(max: number): number; // [0, max)
  embaralhar<T>(lista: T[]): T[];
  estado(): number;
}

export const criarRng = (semente: number): Rng => {
  let s = semente >>> 0;
  const proximo = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    proximo,
    inteiro: (max) => Math.floor(proximo() * max),
    embaralhar: (lista) => {
      const a = [...lista];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(proximo() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    estado: () => s,
  };
};
