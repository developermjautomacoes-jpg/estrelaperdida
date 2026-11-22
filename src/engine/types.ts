// Tipos centrais do jogo. O motor não conhece nenhuma aventura específica:
// tudo o que é conteúdo chega como dado (JSON) seguindo estes formatos.

export interface Hex {
  q: number;
  r: number;
}

export type Condicao =
  | 'veneno'
  | 'queimando'
  | 'atordoado'
  | 'imobilizado'
  | 'fortalecido'
  | 'confuso';

export type Acao =
  | { tipo: 'mover'; valor: number }
  | {
      tipo: 'atacar';
      valor: number;
      alcance: number; // 1 = corpo a corpo
      alvos?: number;
      aplica?: Condicao[];
      empurrar?: number;
    }
  | { tipo: 'curar'; valor: number; alcance: number; todosAliados?: boolean; removeCondicoes?: boolean }
  | { tipo: 'escudo'; valor: number; aliadosAdjacentes?: boolean }
  | { tipo: 'provocar'; alcance: number }
  | { tipo: 'fortalecer'; alcance: number; todosAliados?: boolean }
  | { tipo: 'sacrificio'; valor: number };

export interface MetadeCarta {
  acoes: Acao[];
  xp?: number;
  /** Carta perdida após o uso (não volta no descanso). */
  perdida?: boolean;
  texto?: string;
}

export interface Carta {
  id: string;
  nome: string;
  nivel: number;
  iniciativa: number;
  cima: MetadeCarta;
  baixo: MetadeCarta;
}

export interface VersaoHeroi {
  id: string;
  nome: string;
  genero: 'f' | 'm';
  idade?: number;
  descricao: string;
  companheiro?: string;
  /** Cartas exclusivas desta versão (somadas às cartas da classe). */
  cartas: Carta[];
}

export interface Talento {
  id: string;
  descricao: string;
  /** Troca no baralho de modificadores. */
  remove?: ModificadorId[];
  adiciona?: ModificadorId[];
}

export interface Classe {
  id: string;
  nome: string;
  papel: string;
  dificuldade: 'facil' | 'media' | 'dificil';
  /** Vida por nível (índice 0 = nível 1). */
  vida: number[];
  tamanhoMao: number;
  cartas: Carta[];
  versoes: VersaoHeroi[];
  talentos: Talento[];
  segredo: string;
}

export interface HabilidadeMonstro {
  iniciativa: number;
  acoes: Acao[];
}

export interface Monstro {
  id: string;
  nome: string;
  descricao: string;
  vida: number;
  /** Para chefes: vida = vidaPorHeroi × número de heróis (substitui `vida`). */
  vidaPorHeroi?: number;
  movimento: number;
  ataque: number;
  alcance: number;
  escudo?: number;
  chefe?: boolean;
  habilidades: HabilidadeMonstro[];
}

export type Objetivo =
  | { tipo: 'derrotar_todos' }
  | { tipo: 'derrotar_chefe' }
  | { tipo: 'sobreviver'; rodadas: number };

export interface Cenario {
  id: string;
  numero: string;
  nome: string;
  ato: number;
  introducao: string;
  conclusao: string;
  /**
   * Mapa em linhas (offset "odd-r"): '.' chão, '#' parede, 'S' início de herói,
   * ' ' fora do mapa. Inimigos vêm em `inimigos`.
   */
  mapa?: string[];
  /** `minHerois`: o inimigo só aparece com pelo menos esse número de heróis (escala de dificuldade). */
  inimigos?: { tipo: string; linha: number; coluna: number; minHerois?: number }[];
  objetivo: Objetivo;
  /** `estatisticas` soma contadores ao jogador na vitória (ex.: cristais_recuperados). */
  recompensas: { xp: number; ouro: number; item?: string; estatisticas?: Record<string, number> };
  escolha?: { id: string; pergunta: string; opcoes: { id: string; texto: string; desbloqueia?: string[] }[] };
  desbloqueia: string[];
  /** Cenário ainda sem mapa jogável (só roteiro). */
  rascunho?: boolean;
}

export interface Aventura {
  id: string;
  prefixo: string;
  nome: string;
  versao: number;
  descricao: string;
  requisitos?: { nivelMinimo?: number; aventurasConcluidas?: string[] };
  /** Pacote só com classes/monstros/conquistas compartilhados, sem campanha própria. */
  biblioteca?: boolean;
  cenarioInicial?: string;
  cenarios: string[];
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'pessoal' | 'aventura';
  /** Estatística do jogador/grupo que dispara a conquista. */
  estatistica: string;
  quantidade: number;
  recompensa: { xp?: number; ouro?: number; titulo?: string; cosmetico?: string };
}

export type ModificadorId = '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'erro' | 'veneno' | 'queimando';

// ---------------------------------------------------------------------------
// Dados salvos

export interface HeroiSalvo {
  id: string;
  classe: string;
  versao: string;
  nome: string;
  xp: number;
  ouro: number;
  /** Cartas escolhidas ao subir de nível (ids). */
  cartasExtras: string[];
  talentos: string[];
  itens: string[];
  criadoEm: string;
}

export interface Jogador {
  id: string;
  nome: string;
  avatar?: string;
  herois: HeroiSalvo[];
  conquistas: { id: string; data: string; aventura?: string }[];
  estatisticas: Record<string, number>;
  titulos: string[];
}

export interface ProgressoAventura {
  aventura: string;
  versaoPacote: number;
  cenariosConcluidos: string[];
  cenariosDesbloqueados: string[];
  escolhas: Record<string, string>;
  lanternas: number;
  jogadores: string[];
}

export interface Save {
  versao: number;
  jogadores: Jogador[];
  progresso: ProgressoAventura[];
  atualizadoEm: string;
}
