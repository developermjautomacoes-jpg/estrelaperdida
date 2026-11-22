import { alcancaveis, chave, deChave, distancia, iguais, offsetParaAxial, temLinhaDeVisao, vizinhos } from './hex';
import { aplicarModificador, comprar, embaralharSePreciso, montarBaralho, novaPilha, type PilhaModificadores } from './modificadores';
import { criarRng, type Rng } from './rng';
import type { Acao, Carta, Cenario, Classe, Condicao, HabilidadeMonstro, Hex, HeroiSalvo, Monstro } from './types';
import { baralhoDoHeroi, nivelPorXp, vidaMaxima } from './progressao';

// ---------------------------------------------------------------------------
// Estado da batalha (sempre serializável em JSON)

export interface Unidade {
  id: string;
  lado: 'heroi' | 'monstro';
  nome: string;
  defId: string; // id da classe ou do monstro
  /** id usado para achar o retrato (versão do herói ou monstro). */
  arteId: string;
  pos: Hex;
  vida: number;
  vidaMax: number;
  escudo: number;
  condicoes: Condicao[];
  provocando: boolean;
  fora: boolean; // desmaiado / derrotado
  chefe: boolean;
}

export interface EstadoHeroi {
  unidadeId: string;
  heroiSalvoId: string;
  jogadorId: string;
  mao: Carta[];
  descarte: Carta[];
  perdidas: Carta[];
  escolhidas: Carta[];
  lider?: string; // id da carta que define a iniciativa
  descanso?: 'longo';
  modificadores: PilhaModificadores;
  xpGanho: number;
}

export interface PassoTurno {
  acao: Acao;
  cartaId: string;
  metade: 'cima' | 'baixo';
}

export interface TurnoHeroi {
  unidadeId: string;
  fila: PassoTurno[];
  indice: number;
  alvosRestantes: number;
  atingidos: string[];
  metadesEscolhidas: boolean;
}

export type Fase = 'planejamento' | 'acao' | 'vitoria' | 'derrota';

export interface EstadoBatalha {
  cenarioId: string;
  objetivo: Cenario['objetivo'];
  rodada: number;
  fase: Fase;
  andaveis: string[];
  paredes: string[];
  unidades: Unidade[];
  herois: EstadoHeroi[];
  habilidades: Record<string, HabilidadeMonstro>;
  ordem: string[];
  vez: number;
  turno?: TurnoHeroi;
  modMonstros: PilhaModificadores;
  rng: number;
  log: string[];
  estatisticas: Record<string, Record<string, number>>; // por jogador
}

export interface ParticipanteBatalha {
  jogadorId: string;
  heroi: HeroiSalvo;
  classe: Classe;
}

// ---------------------------------------------------------------------------
// Utilitários internos

const comRng = <T>(e: EstadoBatalha, f: (rng: Rng) => T): T => {
  const rng = criarRng(e.rng);
  const r = f(rng);
  e.rng = rng.estado();
  return r;
};

const clonar = (e: EstadoBatalha): EstadoBatalha => structuredClone(e);

export const unidade = (e: EstadoBatalha, id: string): Unidade => {
  const u = e.unidades.find((x) => x.id === id);
  if (!u) throw new Error(`Unidade ${id} não existe`);
  return u;
};

export const vivas = (e: EstadoBatalha, lado?: Unidade['lado']) =>
  e.unidades.filter((u) => !u.fora && (!lado || u.lado === lado));

const ocupados = (e: EstadoBatalha, excetoId?: string) =>
  new Set(vivas(e).filter((u) => u.id !== excetoId).map((u) => chave(u.pos)));

const contar = (e: EstadoBatalha, jogadorId: string, stat: string, n = 1) => {
  const s = (e.estatisticas[jogadorId] ??= {});
  s[stat] = (s[stat] ?? 0) + n;
};

const heroiDaUnidade = (e: EstadoBatalha, unidadeId: string) => e.herois.find((h) => h.unidadeId === unidadeId);

// ---------------------------------------------------------------------------
// Criação

export const criarBatalha = (
  cenario: Cenario,
  monstros: Record<string, Monstro>,
  participantes: ParticipanteBatalha[],
  semente = Date.now(),
): EstadoBatalha => {
  if (!cenario.mapa) throw new Error(`O cenário ${cenario.id} ainda não tem mapa jogável`);
  const andaveis: string[] = [];
  const paredes: string[] = [];
  const inicios: Hex[] = [];
  cenario.mapa.forEach((linhaMapa, l) =>
    [...linhaMapa].forEach((c, col) => {
      const h = offsetParaAxial(l, col);
      if (c === '#') paredes.push(chave(h));
      else if (c !== ' ') andaveis.push(chave(h));
      if (c === 'S') inicios.push(h);
    }),
  );
  if (inicios.length < participantes.length) throw new Error('Pontos de início insuficientes no mapa');

  const rng = criarRng(semente);
  const unidades: Unidade[] = [];
  const herois: EstadoHeroi[] = participantes.map((p, i) => {
    const nivel = nivelPorXp(p.heroi.xp);
    const vida = vidaMaxima(p.classe, nivel);
    const id = `h${i}`;
    unidades.push({
      id,
      lado: 'heroi',
      nome: p.heroi.nome,
      defId: p.classe.id,
      arteId: p.heroi.versao,
      pos: inicios[i],
      vida,
      vidaMax: vida,
      escudo: 0,
      condicoes: [],
      provocando: false,
      fora: false,
      chefe: false,
    });
    const talentos = p.classe.talentos.filter((t) => p.heroi.talentos.includes(t.id));
    return {
      unidadeId: id,
      heroiSalvoId: p.heroi.id,
      jogadorId: p.jogadorId,
      mao: baralhoDoHeroi(p.classe, p.heroi),
      descarte: [],
      perdidas: [],
      escolhidas: [],
      modificadores: novaPilha(montarBaralho(talentos), rng),
      xpGanho: 0,
    };
  });

  (cenario.inimigos ?? [])
    .filter((ini) => (ini.minHerois ?? 1) <= participantes.length)
    .forEach((ini, i) => {
    const m = monstros[ini.tipo];
    if (!m) throw new Error(`Monstro ${ini.tipo} não existe`);
    const vidaM = m.vidaPorHeroi ? m.vidaPorHeroi * participantes.length : m.vida;
    unidades.push({
      id: `m${i}`,
      lado: 'monstro',
      nome: m.nome,
      defId: m.id,
      arteId: m.id,
      pos: offsetParaAxial(ini.linha, ini.coluna),
      vida: vidaM,
      vidaMax: vidaM,
      escudo: 0,
      condicoes: [],
      provocando: false,
      fora: false,
      chefe: !!m.chefe,
    });
  });

  return {
    cenarioId: cenario.id,
    objetivo: cenario.objetivo,
    rodada: 1,
    fase: 'planejamento',
    andaveis,
    paredes,
    unidades,
    herois,
    habilidades: {},
    ordem: [],
    vez: 0,
    modMonstros: novaPilha(montarBaralho(), rng),
    rng: rng.estado(),
    log: [`Rodada 1 — escolham suas cartas.`],
    estatisticas: Object.fromEntries(participantes.map((p) => [p.jogadorId, {}])),
  };
};

// ---------------------------------------------------------------------------
// Planejamento

/** O herói escolhe duas cartas da mão; `lider` define a iniciativa. */
export const escolherCartas = (e0: EstadoBatalha, unidadeId: string, cartaA: string, cartaB: string, lider: string): EstadoBatalha => {
  const e = clonar(e0);
  if (e.fase !== 'planejamento') throw new Error('Fora da fase de planejamento');
  const h = heroiDaUnidade(e, unidadeId)!;
  if (cartaA === cartaB) throw new Error('Escolha duas cartas diferentes');
  const a = h.mao.find((c) => c.id === cartaA);
  const b = h.mao.find((c) => c.id === cartaB);
  if (!a || !b) throw new Error('Carta não está na mão');
  if (lider !== cartaA && lider !== cartaB) throw new Error('A carta líder precisa ser uma das escolhidas');
  h.escolhidas = [a, b];
  h.lider = lider;
  h.descanso = undefined;
  return e;
};

/** Descanso longo: iniciativa 99, recupera o descarte, cura 2 e perde 1 carta. */
export const descansar = (e0: EstadoBatalha, unidadeId: string): EstadoBatalha => {
  const e = clonar(e0);
  const h = heroiDaUnidade(e, unidadeId)!;
  if (h.descarte.length < 2) throw new Error('É preciso ter ao menos 2 cartas no descarte para descansar');
  h.escolhidas = [];
  h.lider = undefined;
  h.descanso = 'longo';
  return e;
};

/** Desfaz a escolha de cartas (ou o descanso) do herói ainda no planejamento. */
export const desfazerEscolha = (e0: EstadoBatalha, unidadeId: string): EstadoBatalha => {
  const e = clonar(e0);
  if (e.fase !== 'planejamento') throw new Error('Fora da fase de planejamento');
  const h = heroiDaUnidade(e, unidadeId)!;
  h.escolhidas = [];
  h.lider = undefined;
  h.descanso = undefined;
  return e;
};

export const podeDescansar =(e: EstadoBatalha, unidadeId: string) =>
  (heroiDaUnidade(e, unidadeId)?.descarte.length ?? 0) >= 2;

export const prontoParaRodada = (e: EstadoBatalha) =>
  e.herois.every((h) => unidade(e, h.unidadeId).fora || h.escolhidas.length === 2 || h.descanso);

const iniciativaHeroi = (h: EstadoHeroi) =>
  h.descanso ? 99 : (h.escolhidas.find((c) => c.id === h.lider)?.iniciativa ?? 99);

/** Revela as habilidades dos monstros, monta a ordem de iniciativa e começa a rodada. */
export const iniciarRodada = (e0: EstadoBatalha, monstros: Record<string, Monstro>): EstadoBatalha => {
  const e = clonar(e0);
  if (!prontoParaRodada(e)) throw new Error('Nem todos os heróis escolheram');
  const tipos = [...new Set(vivas(e, 'monstro').map((u) => u.defId))];
  e.habilidades = {};
  comRng(e, (rng) => {
    for (const t of tipos) {
      const hs = monstros[t].habilidades;
      e.habilidades[t] = hs[rng.inteiro(hs.length)];
    }
  });
  const itens = vivas(e).map((u) => ({
    id: u.id,
    ini: u.lado === 'heroi' ? iniciativaHeroi(heroiDaUnidade(e, u.id)!) : e.habilidades[u.defId].iniciativa,
    heroi: u.lado === 'heroi' ? 0 : 1,
  }));
  itens.sort((a, b) => a.ini - b.ini || a.heroi - b.heroi || a.id.localeCompare(b.id));
  e.ordem = itens.map((i) => i.id);
  e.vez = -1;
  e.fase = 'acao';
  e.log.push(`Ordem: ${e.ordem.map((id) => unidade(e, id).nome).join(' → ')}`);
  return avancar(e, monstros);
};

// ---------------------------------------------------------------------------
// Turnos

/** Passa para a próxima unidade; monstros jogam sozinhos até chegar a vez de um herói. */
export const avancar = (e: EstadoBatalha, monstros: Record<string, Monstro>): EstadoBatalha => {
  e.turno = undefined;
  while (true) {
    if (verificarFim(e)) return e;
    e.vez++;
    if (e.vez >= e.ordem.length) return fimDaRodada(e);
    const u = unidade(e, e.ordem[e.vez]);
    if (u.fora) continue;
    if (inicioDoTurno(e, u)) continue; // perdeu o turno (atordoado) ou caiu
    if (u.lado === 'monstro') {
      turnoMonstro(e, u, monstros[u.defId]);
      fimDoTurno(e, u);
      continue;
    }
    const h = heroiDaUnidade(e, u.id)!;
    if (h.descanso) {
      executarDescanso(e, u, h);
      fimDoTurno(e, u);
      continue;
    }
    e.turno = { unidadeId: u.id, fila: [], indice: 0, alvosRestantes: 0, atingidos: [], metadesEscolhidas: false };
    return e;
  }
};

/** Efeitos de início de turno. Retorna true se a unidade não age. */
const inicioDoTurno = (e: EstadoBatalha, u: Unidade): boolean => {
  if (u.condicoes.includes('veneno')) sofrerDano(e, u, 1, 'veneno');
  if (u.condicoes.includes('queimando')) {
    sofrerDano(e, u, 1, 'queimadura');
    u.condicoes = u.condicoes.filter((c) => c !== 'queimando');
  }
  if (u.fora) return true;
  if (u.condicoes.includes('atordoado')) {
    u.condicoes = u.condicoes.filter((c) => c !== 'atordoado');
    e.log.push(`${u.nome} está atordoado e perde o turno.`);
    return true;
  }
  return false;
};

const fimDoTurno = (_e: EstadoBatalha, u: Unidade) => {
  u.condicoes = u.condicoes.filter((c) => c !== 'imobilizado' && c !== 'confuso');
};

const executarDescanso = (e: EstadoBatalha, u: Unidade, h: EstadoHeroi) => {
  const perdida = comRng(e, (rng) => h.descarte.splice(rng.inteiro(h.descarte.length), 1)[0]);
  h.perdidas.push(perdida);
  h.mao.push(...h.descarte);
  h.descarte = [];
  curar(e, u, 2);
  e.log.push(`${u.nome} descansa, recupera as cartas e perde "${perdida.nome}".`);
};

/** O herói da vez escolhe de qual carta usa a metade de cima (a outra dá a de baixo). */
export const escolherMetades = (e0: EstadoBatalha, cimaDe: string): EstadoBatalha => {
  const e = clonar(e0);
  const t = e.turno;
  if (!t || t.metadesEscolhidas) throw new Error('Não é hora de escolher metades');
  const h = heroiDaUnidade(e, t.unidadeId)!;
  const cima = h.escolhidas.find((c) => c.id === cimaDe);
  const baixo = h.escolhidas.find((c) => c.id !== cimaDe);
  if (!cima || !baixo) throw new Error('Carta inválida');
  t.fila = [
    ...cima.cima.acoes.map((acao) => ({ acao, cartaId: cima.id, metade: 'cima' as const })),
    ...baixo.baixo.acoes.map((acao) => ({ acao, cartaId: baixo.id, metade: 'baixo' as const })),
  ];
  t.metadesEscolhidas = true;
  prepararPasso(e);
  return e;
};

export const passoAtual = (e: EstadoBatalha): PassoTurno | undefined =>
  e.turno?.metadesEscolhidas ? e.turno.fila[e.turno.indice] : undefined;

const prepararPasso = (e: EstadoBatalha) => {
  const p = passoAtual(e);
  if (!p) return;
  e.turno!.alvosRestantes = p.acao.tipo === 'atacar' ? (p.acao.alvos ?? 1) : 1;
  e.turno!.atingidos = [];
  const u = unidade(e, e.turno!.unidadeId);
  // ações sem alvo resolvem sozinhas
  if (p.acao.tipo === 'escudo' || p.acao.tipo === 'provocar' || p.acao.tipo === 'sacrificio' || (p.acao.tipo === 'curar' && p.acao.todosAliados) || (p.acao.tipo === 'fortalecer' && p.acao.todosAliados)) {
    resolverAcaoSemAlvo(e, u, p.acao);
    proximoPasso(e);
  }
};

const proximoPasso = (e: EstadoBatalha) => {
  const t = e.turno!;
  t.indice++;
  if (t.indice < t.fila.length) prepararPasso(e);
};

export const turnoConcluido = (e: EstadoBatalha) =>
  !!e.turno && e.turno.metadesEscolhidas && e.turno.indice >= e.turno.fila.length;

/** Hexágonos/unidades válidos para o passo atual (para a interface destacar). */
export const alvosValidos = (e: EstadoBatalha): { hexes: string[]; unidades: string[] } => {
  const p = passoAtual(e);
  if (!p || !e.turno) return { hexes: [], unidades: [] };
  const u = unidade(e, e.turno.unidadeId);
  const a = p.acao;
  const paredes = new Set(e.paredes);
  if (a.tipo === 'mover') {
    if (u.condicoes.includes('imobilizado')) return { hexes: [], unidades: [] };
    const mapa = alcancaveis(u.pos, a.valor, { andaveis: new Set(e.andaveis), bloqueados: ocupados(e, u.id) });
    const occ = ocupados(e, u.id);
    return { hexes: [...mapa.keys()].filter((k) => !occ.has(k) && k !== chave(u.pos)), unidades: [] };
  }
  if (a.tipo === 'atacar') {
    return {
      hexes: [],
      unidades: vivas(e, 'monstro')
        .filter((m) => !e.turno!.atingidos.includes(m.id) && distancia(u.pos, m.pos) <= a.alcance && temLinhaDeVisao(u.pos, m.pos, paredes))
        .map((m) => m.id),
    };
  }
  if (a.tipo === 'curar' || a.tipo === 'fortalecer') {
    return {
      hexes: [],
      unidades: vivas(e, 'heroi')
        .filter((x) => distancia(u.pos, x.pos) <= a.alcance && (x.id === u.id || temLinhaDeVisao(u.pos, x.pos, paredes)))
        .map((x) => x.id),
    };
  }
  return { hexes: [], unidades: [] };
};

/** Executa o passo atual no alvo escolhido (hexágono para mover, unidade para o resto). */
export const executarPasso = (e0: EstadoBatalha, alvo: { hex?: Hex; unidadeId?: string }): EstadoBatalha => {
  const e = clonar(e0);
  const p = passoAtual(e);
  if (!p || !e.turno) throw new Error('Nenhuma ação pendente');
  const u = unidade(e, e.turno.unidadeId);
  const validos = alvosValidos(e);
  const a = p.acao;
  if (a.tipo === 'mover') {
    if (!alvo.hex || !validos.hexes.includes(chave(alvo.hex))) throw new Error('Destino inválido');
    u.pos = alvo.hex;
    proximoPasso(e);
  } else if (a.tipo === 'atacar') {
    if (!alvo.unidadeId || !validos.unidades.includes(alvo.unidadeId)) throw new Error('Alvo inválido');
    atacar(e, u, unidade(e, alvo.unidadeId), a, heroiDaUnidade(e, u.id)!.modificadores);
    e.turno.atingidos.push(alvo.unidadeId);
    e.turno.alvosRestantes--;
    if (e.turno.alvosRestantes <= 0 || alvosValidos(e).unidades.length === 0) proximoPasso(e);
  } else if (a.tipo === 'curar' || a.tipo === 'fortalecer') {
    if (!alvo.unidadeId || !validos.unidades.includes(alvo.unidadeId)) throw new Error('Alvo inválido');
    const t = unidade(e, alvo.unidadeId);
    if (a.tipo === 'curar') {
      curar(e, t, a.valor, a.removeCondicoes);
      if (t.id !== u.id) contar(e, heroiDaUnidade(e, u.id)!.jogadorId, 'aliados_curados');
    } else adicionarCondicao(t, 'fortalecido');
    proximoPasso(e);
  }
  return e;
};

export const pularPasso = (e0: EstadoBatalha): EstadoBatalha => {
  const e = clonar(e0);
  if (!passoAtual(e)) throw new Error('Nenhuma ação pendente');
  proximoPasso(e);
  return e;
};

/** Encerra o turno do herói: cartas vão ao descarte (ou perdidas) e o XP é somado. */
export const encerrarTurnoHeroi = (e0: EstadoBatalha, monstros: Record<string, Monstro>): EstadoBatalha => {
  const e = clonar(e0);
  const t = e.turno;
  if (!t || !t.metadesEscolhidas) throw new Error('Escolha as metades primeiro');
  const u = unidade(e, t.unidadeId);
  const h = heroiDaUnidade(e, u.id)!;
  const usadaCima = h.escolhidas.find((c) => t.fila.some((p) => p.cartaId === c.id && p.metade === 'cima')) ?? h.escolhidas[0];
  const usadaBaixo = h.escolhidas.find((c) => c.id !== usadaCima.id)!;
  for (const [carta, metade] of [[usadaCima, usadaCima.cima], [usadaBaixo, usadaBaixo.baixo]] as const) {
    h.mao = h.mao.filter((c) => c.id !== carta.id);
    if (metade.perdida) h.perdidas.push(carta);
    else h.descarte.push(carta);
    h.xpGanho += metade.xp ?? 0;
  }
  h.escolhidas = [];
  fimDoTurno(e, u);
  return avancar(e, monstros);
};

// ---------------------------------------------------------------------------
// Resolução de efeitos

const adicionarCondicao = (u: Unidade, c: Condicao) => {
  if (!u.condicoes.includes(c)) u.condicoes.push(c);
};

const curar = (e: EstadoBatalha, u: Unidade, valor: number, removeCondicoes = false) => {
  const antes = u.vida;
  u.vida = Math.min(u.vidaMax, u.vida + valor);
  if (removeCondicoes) u.condicoes = u.condicoes.filter((c) => c === 'fortalecido');
  else u.condicoes = u.condicoes.filter((c) => c !== 'veneno');
  if (u.vida > antes) e.log.push(`${u.nome} recupera ${u.vida - antes} de vida.`);
};

const sofrerDano = (e: EstadoBatalha, u: Unidade, dano: number, origem: string) => {
  u.vida -= dano;
  e.log.push(`${u.nome} sofre ${dano} de dano (${origem}).`);
  if (u.vida <= 0) {
    u.vida = 0;
    u.fora = true;
    e.log.push(u.lado === 'heroi' ? `${u.nome} desmaiou!` : `${u.nome} foi derrotado.`);
  }
};

const resolverAcaoSemAlvo = (e: EstadoBatalha, u: Unidade, a: Acao) => {
  if (a.tipo === 'escudo') {
    u.escudo += a.valor;
    if (a.aliadosAdjacentes)
      vivas(e, u.lado)
        .filter((x) => x.id !== u.id && distancia(x.pos, u.pos) === 1)
        .forEach((x) => (x.escudo += a.valor));
    e.log.push(`${u.nome} ganha escudo ${a.valor}.`);
  } else if (a.tipo === 'provocar') {
    u.provocando = true;
    e.log.push(`${u.nome} provoca os inimigos!`);
  } else if (a.tipo === 'curar') {
    vivas(e, u.lado)
      .filter((x) => distancia(x.pos, u.pos) <= a.alcance)
      .forEach((x) => curar(e, x, a.valor, a.removeCondicoes));
  } else if (a.tipo === 'fortalecer') {
    vivas(e, u.lado)
      .filter((x) => distancia(x.pos, u.pos) <= a.alcance)
      .forEach((x) => adicionarCondicao(x, 'fortalecido'));
  } else if (a.tipo === 'sacrificio') {
    sofrerDano(e, u, a.valor, 'sacrifício');
  }
};

const atacar = (e: EstadoBatalha, atacante: Unidade, alvo: Unidade, a: Extract<Acao, { tipo: 'atacar' }>, pilha: PilhaModificadores) => {
  let base = a.valor;
  if (atacante.condicoes.includes('fortalecido')) {
    base += 1;
    atacante.condicoes = atacante.condicoes.filter((c) => c !== 'fortalecido');
  }
  if (atacante.condicoes.includes('confuso')) base -= 1;
  const mod = comRng(e, (rng) => comprar(pilha, rng));
  const r = aplicarModificador(base, mod);
  const dano = Math.max(0, r.dano - alvo.escudo);
  e.log.push(`${atacante.nome} ataca ${alvo.nome} (${base} ${mod}) → ${dano} de dano.`);
  if (dano > 0) sofrerDano(e, alvo, dano, 'ataque');
  if (alvo.fora) {
    if (atacante.lado === 'heroi') {
      const j = heroiDaUnidade(e, atacante.id)!.jogadorId;
      contar(e, j, 'inimigos_derrotados');
      contar(e, j, `derrotou:${alvo.defId}`);
    }
    return;
  }
  for (const c of [...(a.aplica ?? []), ...(r.condicao ? [r.condicao] : [])]) adicionarCondicao(alvo, c);
  if (a.empurrar && mod !== 'erro') empurrar(e, atacante, alvo, a.empurrar);
};

const empurrar = (e: EstadoBatalha, de: Unidade, alvo: Unidade, n: number) => {
  const andaveis = new Set(e.andaveis);
  for (let i = 0; i < n; i++) {
    const occ = ocupados(e, alvo.id);
    const opcoes = vizinhos(alvo.pos).filter(
      (v) => andaveis.has(chave(v)) && !occ.has(chave(v)) && distancia(v, de.pos) > distancia(alvo.pos, de.pos),
    );
    if (!opcoes.length) break;
    alvo.pos = opcoes[0];
  }
};

// ---------------------------------------------------------------------------
// IA dos monstros

/** Foco: quem está provocando; senão, o herói mais perto por caminhada. */
export const escolherFoco = (e: EstadoBatalha, m: Unidade): Unidade | undefined => {
  const herois = vivas(e, 'heroi');
  if (!herois.length) return undefined;
  const provocadores = herois.filter((h) => h.provocando);
  const candidatos = provocadores.length ? provocadores : herois;
  const dist = alcancaveis(m.pos, 50, { andaveis: new Set(e.andaveis), bloqueados: ocupados(e, m.id) });
  const custo = (h: Unidade) =>
    Math.min(...vizinhos(h.pos).map((v) => dist.get(chave(v)) ?? Infinity), iguais(h.pos, m.pos) ? 0 : Infinity);
  return [...candidatos].sort((a, b) => custo(a) - custo(b) || distancia(a.pos, m.pos) - distancia(b.pos, m.pos))[0];
};

const turnoMonstro = (e: EstadoBatalha, m: Unidade, def: Monstro) => {
  const hab = e.habilidades[def.id];
  const foco = escolherFoco(e, m);
  if (!foco) return;
  const paredes = new Set(e.paredes);
  for (const a of hab.acoes) {
    if (m.fora || foco.fora) break;
    if (a.tipo === 'mover') {
      if (m.condicoes.includes('imobilizado')) continue;
      const alcanceAtaque = hab.acoes.find((x) => x.tipo === 'atacar') as Extract<Acao, { tipo: 'atacar' }> | undefined;
      const precisa = alcanceAtaque?.alcance ?? def.alcance;
      const destinos = alcancaveis(m.pos, a.valor, { andaveis: new Set(e.andaveis), bloqueados: ocupados(e, m.id) });
      const occ = ocupados(e, m.id);
      let melhor: Hex = m.pos;
      let melhorNota = Infinity;
      for (const [k, passos] of destinos) {
        if (occ.has(k)) continue;
        const h = deChave(k);
        const d = distancia(h, foco.pos);
        const atinge = d <= precisa && temLinhaDeVisao(h, foco.pos, paredes);
        const nota = atinge ? passos : 1000 + d * 10 + passos;
        if (nota < melhorNota) {
          melhorNota = nota;
          melhor = h;
        }
      }
      if (!iguais(melhor, m.pos)) e.log.push(`${m.nome} avança.`);
      m.pos = melhor;
    } else if (a.tipo === 'atacar') {
      if (distancia(m.pos, foco.pos) <= a.alcance && temLinhaDeVisao(m.pos, foco.pos, paredes)) {
        atacar(e, m, foco, a, e.modMonstros);
      }
    } else {
      resolverAcaoSemAlvo(e, m, a);
    }
  }
};

// ---------------------------------------------------------------------------
// Fim de rodada e de partida

const fimDaRodada = (e: EstadoBatalha): EstadoBatalha => {
  for (const u of e.unidades) {
    u.escudo = 0;
    u.provocando = false;
  }
  comRng(e, (rng) => {
    embaralharSePreciso(e.modMonstros, rng);
    e.herois.forEach((h) => embaralharSePreciso(h.modificadores, rng));
  });
  // exaustão: sem cartas para jogar nem para descansar
  for (const h of e.herois) {
    const u = unidade(e, h.unidadeId);
    h.descanso = undefined;
    if (!u.fora && h.mao.length < 2 && h.descarte.length < 2) {
      u.fora = true;
      e.log.push(`${u.nome} ficou exausto.`);
    }
  }
  if (verificarFim(e, true)) return e;
  e.rodada++;
  e.fase = 'planejamento';
  e.ordem = [];
  e.vez = 0;
  e.turno = undefined;
  e.log.push(`Rodada ${e.rodada} — escolham suas cartas.`);
  return e;
};

const verificarFim = (e: EstadoBatalha, fimRodada = false): boolean => {
  if (e.fase === 'vitoria' || e.fase === 'derrota') return true;
  if (!vivas(e, 'heroi').length) {
    e.fase = 'derrota';
    e.log.push('Todos os heróis caíram. A névoa avança.');
    return true;
  }
  const o = e.objetivo;
  const venceu =
    (o.tipo === 'derrotar_todos' && !vivas(e, 'monstro').length) ||
    (o.tipo === 'derrotar_chefe' && !vivas(e, 'monstro').some((m) => m.chefe)) ||
    (o.tipo === 'sobreviver' && fimRodada && e.rodada >= o.rodadas);
  if (venceu) {
    e.fase = 'vitoria';
    e.log.push('Vitória! Uma lanterna se acende em Portobruma.');
    for (const h of e.herois) {
      const u = unidade(e, h.unidadeId);
      contar(e, h.jogadorId, 'cenarios_vencidos');
      if (!u.fora && u.vida === 1) contar(e, h.jogadorId, 'vitorias_com_1_vida');
    }
    if (e.herois.every((h) => !unidade(e, h.unidadeId).fora)) e.herois.forEach((h) => contar(e, h.jogadorId, 'vitorias_sem_desmaio'));
  }
  return venceu;
};
