import { describe, expect, it } from 'vitest';
import { alcancaveis, caminho, chave, distancia, offsetParaAxial, temLinhaDeVisao } from './hex';
import { aplicarModificador, montarBaralho } from './modificadores';
import { aplicarRecompensa, baralhoDoHeroi, nivelPorXp, opcoesDeCarta } from './progressao';
import { avaliarConquistas, registrarEstatisticas } from './conquistas';
import { armazenamentoMemoria, carregar, concluirCenario, criarHeroi, criarJogador, novoSave, obterProgresso, salvar, atualizarJogador } from './save';
import {
  alvosValidos,
  criarBatalha,
  descansar,
  desfazerEscolha,
  prontoParaRodada,
  encerrarTurnoHeroi,
  escolherCartas,
  escolherMetades,
  executarPasso,
  iniciarRodada,
  passoAtual,
  pularPasso,
  turnoConcluido,
  vivas,
  type EstadoBatalha,
} from './batalha';
import { registro } from '../content/registro';

const r = registro();

describe('hexágonos', () => {
  it('calcula distância', () => {
    expect(distancia({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(distancia(offsetParaAxial(0, 0), offsetParaAxial(2, 2))).toBe(3);
  });

  it('bloqueia linha de visão por parede', () => {
    const paredes = new Set([chave({ q: 1, r: 0 })]);
    expect(temLinhaDeVisao({ q: 0, r: 0 }, { q: 2, r: 0 }, paredes)).toBe(false);
    expect(temLinhaDeVisao({ q: 0, r: 0 }, { q: 0, r: 2 }, paredes)).toBe(true);
  });

  it('encontra caminho contornando obstáculo', () => {
    const andaveis = new Set<string>();
    for (let q = -3; q <= 3; q++) for (let rr = -3; rr <= 3; rr++) andaveis.add(chave({ q, r: rr }));
    andaveis.delete(chave({ q: 1, r: 0 }));
    const c = caminho({ q: 0, r: 0 }, { q: 2, r: 0 }, { andaveis, bloqueados: new Set() });
    expect(c).not.toBeNull();
    expect(c!.length).toBe(3);
    expect(alcancaveis({ q: 0, r: 0 }, 1, { andaveis, bloqueados: new Set() }).size).toBe(6);
  });
});

describe('modificadores', () => {
  it('baralho base tem 20 cartas e talentos alteram', () => {
    expect(montarBaralho()).toHaveLength(20);
    const b = montarBaralho([{ id: 't', descricao: '', remove: ['-1', '-1'], adiciona: ['+0', '+0'] }]);
    expect(b.filter((m) => m === '-1')).toHaveLength(3);
  });
  it('aplica x2 e erro', () => {
    expect(aplicarModificador(3, 'x2').dano).toBe(6);
    expect(aplicarModificador(3, 'erro').dano).toBe(0);
    expect(aplicarModificador(1, '-2').dano).toBe(0);
  });
});

describe('progressão', () => {
  const classe = r.classes['base.defensor'];
  it('sobe de nível pela tabela de XP', () => {
    expect(nivelPorXp(0)).toBe(1);
    expect(nivelPorXp(44)).toBe(1);
    expect(nivelPorXp(45)).toBe(2);
    expect(nivelPorXp(9999)).toBe(9);
    const h = criarHeroi(classe.id, 'base.defensor.rocco', 'Rocco');
    const res = aplicarRecompensa(h, 100, 10);
    expect(res.niveisGanhos).toEqual([2, 3]);
    expect(res.heroi.ouro).toBe(10);
  });
  it('baralho respeita o tamanho da mão e oferece cartas novas', () => {
    const h = { ...criarHeroi(classe.id, 'base.defensor.brasa', 'Brasa'), xp: 100 };
    expect(baralhoDoHeroi(classe, h)).toHaveLength(classe.tamanhoMao);
    expect(opcoesDeCarta(classe, h).map((c) => c.nivel)).toEqual([2, 3]);
  });
});

describe('conquistas e save', () => {
  it('desbloqueia conquista ao atingir estatística', () => {
    let j = criarJogador('Ana');
    j = registrarEstatisticas(j, { cenarios_vencidos: 1 });
    const { jogador, novas } = avaliarConquistas(j, r.conquistas);
    expect(novas.map((n) => n.conquista.id)).toContain('base.primeira-lanterna');
    expect(avaliarConquistas(jogador, r.conquistas).novas).toHaveLength(0);
  });
  it('salva e carrega com progresso de campanha', () => {
    const arm = armazenamentoMemoria();
    let s = atualizarJogador(novoSave(), criarJogador('Ana'));
    const p = concluirCenario(obterProgresso(s, 'estrela.aventura', 1, 'estrela.cenario-00'), 'estrela.cenario-00', true, ['estrela.cenario-01']);
    s = salvar(arm, { ...s, progresso: [p] });
    const lido = carregar(arm);
    expect(lido.jogadores[0].nome).toBe('Ana');
    expect(lido.progresso[0].cenariosDesbloqueados).toContain('estrela.cenario-01');
    expect(lido.progresso[0].lanternas).toBe(1);
  });
});

describe('batalha', () => {
  const novo = (): EstadoBatalha => {
    const classe = r.classes['base.defensor'];
    const heroi = criarHeroi(classe.id, 'base.defensor.brasa', 'Brasa');
    return criarBatalha(r.cenarios['estrela.cenario-00'], r.monstros, [{ jogadorId: 'j1', heroi, classe }], 42);
  };

  it('monta o tabuleiro do prólogo', () => {
    const e = novo();
    expect(vivas(e, 'heroi')).toHaveLength(1);
    expect(vivas(e, 'monstro')).toHaveLength(2); // 1 herói: só os inimigos sem minHerois
    expect(e.fase).toBe('planejamento');
    expect(vivas(e, 'heroi')[0].arteId).toBe('base.defensor.brasa');
  });

  it('desfaz a escolha de cartas e o descanso no planejamento', () => {
    let e = novo();
    const mao = e.herois[0].mao;
    e = escolherCartas(e, 'h0', mao[0].id, mao[1].id, mao[0].id);
    expect(prontoParaRodada(e)).toBe(true);
    const antes = e;
    e = desfazerEscolha(e, 'h0');
    expect(e.herois[0].escolhidas).toHaveLength(0);
    expect(e.herois[0].lider).toBeUndefined();
    expect(prontoParaRodada(e)).toBe(false);
    expect(antes.herois[0].escolhidas).toHaveLength(2); // estado anterior intacto
    e = escolherCartas(e, 'h0', mao[2].id, mao[3].id, mao[3].id);
    expect(e.herois[0].lider).toBe(mao[3].id);
    // descanso também pode ser desfeito
    e = { ...e, herois: [{ ...e.herois[0], descarte: [mao[4], mao[5]] }] };
    e = desfazerEscolha(descansar(e, 'h0'), 'h0');
    expect(e.herois[0].descanso).toBeUndefined();
  });

  it('registra eventos visuais de movimento e ataque com ids crescentes', () => {
    let e = novo();
    const mao = e.herois[0].mao;
    e = escolherCartas(e, 'h0', mao[0].id, mao[1].id, mao[0].id);
    e = iniciarRodada(e, r.monstros);
    let guarda = 0;
    while (e.fase === 'acao' && guarda++ < 20) {
      if (!e.turno) break;
      if (!e.turno.metadesEscolhidas) e = escolherMetades(e, e.herois[0].escolhidas[0].id);
      const v = alvosValidos(e);
      if (!passoAtual(e)) e = encerrarTurnoHeroi(e, r.monstros);
      else if (v.unidades.length) e = executarPasso(e, { unidadeId: v.unidades[0] });
      else if (v.hexes.length) e = executarPasso(e, { hex: { q: Number(v.hexes[0].split(',')[0]), r: Number(v.hexes[0].split(',')[1]) } });
      else e = pularPasso(e);
    }
    const ev = e.eventos ?? [];
    expect(ev.length).toBeGreaterThan(0);
    expect(ev.some((x) => x.tipo === 'mover' || x.tipo === 'ataque')).toBe(true);
    ev.slice(1).forEach((x, i) => expect(x.id).toBeGreaterThan(ev[i].id));
    expect(ev.length).toBeLessThanOrEqual(40);
  });

  it('joga uma rodada completa sem erros', () => {
    let e = novo();
    const mao = e.herois[0].mao;
    e = escolherCartas(e, 'h0', mao[0].id, mao[1].id, mao[0].id);
    e = iniciarRodada(e, r.monstros);
    // avança até a vez do herói (ou fim da rodada)
    if (e.turno) {
      e = escolherMetades(e, mao[0].id);
      let guarda = 0;
      while (passoAtual(e) && guarda++ < 10) {
        const v = alvosValidos(e);
        if (v.hexes.length) e = executarPasso(e, { hex: { q: Number(v.hexes[0].split(',')[0]), r: Number(v.hexes[0].split(',')[1]) } });
        else if (v.unidades.length) e = executarPasso(e, { unidadeId: v.unidades[0] });
        else e = pularPasso(e);
      }
      expect(turnoConcluido(e)).toBe(true);
      e = encerrarTurnoHeroi(e, r.monstros);
    }
    expect(['planejamento', 'vitoria', 'derrota']).toContain(e.fase);
    expect(e.herois[0].descarte.length + e.herois[0].perdidas.length).toBe(2);
  });

  it('é determinística com a mesma semente', () => {
    const jogar = () => {
      let e = novo();
      const mao = e.herois[0].mao;
      e = escolherCartas(e, 'h0', mao[2].id, mao[3].id, mao[2].id);
      return iniciarRodada(e, r.monstros).log.join('\n');
    };
    expect(jogar()).toBe(jogar());
  });
});
