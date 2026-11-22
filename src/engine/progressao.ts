import type { Carta, Classe, HeroiSalvo } from './types';

/** XP total necessário para cada nível (índice 0 = nível 1). Ajustável pelo Balanceador. */
export const XP_POR_NIVEL = [0, 45, 95, 150, 210, 275, 345, 420, 500];
export const NIVEL_MAXIMO = XP_POR_NIVEL.length;

export const nivelPorXp = (xp: number): number => {
  let nivel = 1;
  for (let i = 0; i < XP_POR_NIVEL.length; i++) if (xp >= XP_POR_NIVEL[i]) nivel = i + 1;
  return nivel;
};

export const progressoNivel = (xp: number): { nivel: number; atual: number; proximo: number | null } => {
  const nivel = nivelPorXp(xp);
  const proximo = nivel < NIVEL_MAXIMO ? XP_POR_NIVEL[nivel] : null;
  return { nivel, atual: xp, proximo };
};

export const vidaMaxima = (classe: Classe, nivel: number): number =>
  classe.vida[Math.min(nivel, classe.vida.length) - 1];

/** Talentos que o herói ainda pode escolher (1 por nível acima do 1). */
export const talentosPendentes = (heroi: HeroiSalvo): number =>
  nivelPorXp(heroi.xp) - 1 - heroi.talentos.length;

/** Cartas que o herói ainda pode escolher (1 por nível acima do 1). */
export const cartasPendentes = (heroi: HeroiSalvo): number =>
  nivelPorXp(heroi.xp) - 1 - heroi.cartasExtras.length;

/** Até 2 cartas novas oferecidas na subida de nível. */
export const opcoesDeCarta = (classe: Classe, heroi: HeroiSalvo): Carta[] => {
  const nivel = nivelPorXp(heroi.xp);
  return classe.cartas
    .filter((c) => c.nivel > 1 && c.nivel <= nivel && !heroi.cartasExtras.includes(c.id))
    .sort((a, b) => a.nivel - b.nivel)
    .slice(0, 2);
};

/** Baralho de batalha: cartas da versão + escolhidas + cartas de nível 1, até o tamanho da mão. */
export const baralhoDoHeroi = (classe: Classe, heroi: HeroiSalvo): Carta[] => {
  const versao = classe.versoes.find((v) => v.id === heroi.versao);
  const extras = classe.cartas.filter((c) => heroi.cartasExtras.includes(c.id));
  const nivel1 = classe.cartas.filter((c) => c.nivel === 1);
  const todas = [...(versao?.cartas ?? []), ...extras, ...nivel1];
  const unicas = todas.filter((c, i) => todas.findIndex((x) => x.id === c.id) === i);
  return unicas.slice(0, classe.tamanhoMao);
};

export interface ResultadoRecompensa {
  heroi: HeroiSalvo;
  niveisGanhos: number[];
}

export const aplicarRecompensa = (heroi: HeroiSalvo, xp: number, ouro: number): ResultadoRecompensa => {
  const antes = nivelPorXp(heroi.xp);
  const novo: HeroiSalvo = { ...heroi, xp: heroi.xp + xp, ouro: heroi.ouro + ouro };
  const depois = nivelPorXp(novo.xp);
  const niveisGanhos: number[] = [];
  for (let n = antes + 1; n <= depois; n++) niveisGanhos.push(n);
  return { heroi: novo, niveisGanhos };
};

/** Nível dos monstros acompanha a média do grupo (arredondada para baixo, metade). */
export const nivelDoCenario = (niveis: number[]): number =>
  niveis.length ? Math.floor(niveis.reduce((a, b) => a + b, 0) / niveis.length / 2) : 0;
