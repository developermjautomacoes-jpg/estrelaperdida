import type { HeroiSalvo, Jogador, ProgressoAventura, Save } from './types';

/** Versão do formato do save. Ao mudar o formato, suba este número e crie uma migração. */
export const VERSAO_SAVE = 1;

export interface Armazenamento {
  ler(): string | null;
  gravar(conteudo: string): void;
}

const CHAVE = 'estrela-partida:save';

export const armazenamentoLocal = (): Armazenamento => ({
  ler: () => {
    try {
      return localStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  },
  gravar: (c) => {
    try {
      localStorage.setItem(CHAVE, c);
      // backup do último save, para voltar atrás se algo der errado
      localStorage.setItem(`${CHAVE}:backup:${Date.now()}`, c);
      limparBackups();
    } catch {
      /* armazenamento indisponível: o jogo segue sem salvar */
    }
  },
});

const limparBackups = (manter = 10) => {
  const chaves = Object.keys(localStorage)
    .filter((k) => k.startsWith(`${CHAVE}:backup:`))
    .sort();
  chaves.slice(0, Math.max(0, chaves.length - manter)).forEach((k) => localStorage.removeItem(k));
};

export const armazenamentoMemoria = (inicial: string | null = null): Armazenamento => {
  let valor = inicial;
  return { ler: () => valor, gravar: (c) => (valor = c) };
};

export const novoSave = (): Save => ({
  versao: VERSAO_SAVE,
  jogadores: [],
  progresso: [],
  atualizadoEm: new Date().toISOString(),
});

/** Migrações por versão: MIGRACOES[n] converte um save da versão n para n + 1. */
const MIGRACOES: Record<number, (s: any) => any> = {};

export const migrar = (dado: any): Save => {
  let s = dado;
  while ((s.versao ?? 0) < VERSAO_SAVE) {
    const m = MIGRACOES[s.versao ?? 0];
    if (!m) throw new Error(`Sem migração para a versão ${s.versao} do save`);
    s = m(s);
  }
  return s as Save;
};

export const carregar = (arm: Armazenamento): Save => {
  const bruto = arm.ler();
  if (!bruto) return novoSave();
  try {
    return migrar(JSON.parse(bruto));
  } catch {
    return novoSave();
  }
};

export const salvar = (arm: Armazenamento, save: Save): Save => {
  const s = { ...save, atualizadoEm: new Date().toISOString() };
  arm.gravar(JSON.stringify(s));
  return s;
};

const novoId = () => Math.random().toString(36).slice(2, 10);

export const criarJogador = (nome: string, avatar?: string): Jogador => ({
  id: novoId(),
  nome,
  avatar,
  herois: [],
  conquistas: [],
  estatisticas: {},
  titulos: [],
});

export const criarHeroi = (classe: string, versao: string, nome: string): HeroiSalvo => ({
  id: novoId(),
  classe,
  versao,
  nome,
  xp: 0,
  ouro: 0,
  cartasExtras: [],
  talentos: [],
  itens: [],
  criadoEm: new Date().toISOString(),
});

export const atualizarJogador = (save: Save, jogador: Jogador): Save => ({
  ...save,
  jogadores: save.jogadores.some((j) => j.id === jogador.id)
    ? save.jogadores.map((j) => (j.id === jogador.id ? jogador : j))
    : [...save.jogadores, jogador],
});

export const obterProgresso = (
  save: Save,
  aventura: string,
  versaoPacote: number,
  cenarioInicial?: string,
): ProgressoAventura =>
  save.progresso.find((p) => p.aventura === aventura) ?? {
    aventura,
    versaoPacote,
    cenariosConcluidos: [],
    cenariosDesbloqueados: cenarioInicial ? [cenarioInicial] : [],
    escolhas: {},
    lanternas: 0,
    jogadores: [],
  };

export const atualizarProgresso = (save: Save, p: ProgressoAventura): Save => ({
  ...save,
  progresso: save.progresso.some((x) => x.aventura === p.aventura)
    ? save.progresso.map((x) => (x.aventura === p.aventura ? p : x))
    : [...save.progresso, p],
});

/** Registra o resultado de um cenário: vitória acende uma lanterna, derrota apaga. */
export const concluirCenario = (
  p: ProgressoAventura,
  cenario: string,
  venceu: boolean,
  desbloqueia: string[],
  escolha?: { id: string; opcao: string; desbloqueia?: string[] },
): ProgressoAventura => {
  if (!venceu) return { ...p, lanternas: Math.max(0, p.lanternas - 1) };
  const desbloqueados = new Set([...p.cenariosDesbloqueados, ...desbloqueia, ...(escolha?.desbloqueia ?? [])]);
  return {
    ...p,
    cenariosConcluidos: p.cenariosConcluidos.includes(cenario) ? p.cenariosConcluidos : [...p.cenariosConcluidos, cenario],
    cenariosDesbloqueados: [...desbloqueados],
    escolhas: escolha ? { ...p.escolhas, [escolha.id]: escolha.opcao } : p.escolhas,
    lanternas: p.lanternas + 1,
  };
};
