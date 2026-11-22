import type { Acao, Condicao, MetadeCarta } from '../engine/types';

const CONDICOES: Record<Condicao, string> = {
  veneno: 'envenena',
  queimando: 'queima',
  atordoado: 'atordoa',
  imobilizado: 'imobiliza',
  fortalecido: 'fortalece',
  confuso: 'confunde',
};

export const descreverAcao = (a: Acao): string => {
  switch (a.tipo) {
    case 'mover':
      return `Mover ${a.valor}`;
    case 'atacar': {
      const partes = [`Atacar ${a.valor}`];
      if (a.alcance > 1) partes.push(`alcance ${a.alcance}`);
      if (a.alvos && a.alvos > 1) partes.push(`${a.alvos} alvos`);
      if (a.empurrar) partes.push(`empurra ${a.empurrar}`);
      for (const c of a.aplica ?? []) partes.push(CONDICOES[c]);
      return partes.join(' · ');
    }
    case 'curar':
      return `${a.todosAliados ? 'Curar todos' : 'Curar'} ${a.valor}${a.alcance ? ` · alcance ${a.alcance}` : ' (si mesmo)'}${a.removeCondicoes ? ' · remove condições' : ''}`;
    case 'escudo':
      return `Escudo ${a.valor}${a.aliadosAdjacentes ? ' (e aliados ao lado)' : ''}`;
    case 'provocar':
      return `Provocar inimigos`;
    case 'fortalecer':
      return `${a.todosAliados ? 'Fortalecer todos' : 'Fortalecer'}${a.alcance ? ` · alcance ${a.alcance}` : ' (si mesmo)'}`;
    case 'sacrificio':
      return `Perde ${a.valor} de vida`;
  }
};

export const descreverMetade = (m: MetadeCarta): string[] => [
  ...m.acoes.map(descreverAcao),
  ...(m.xp ? [`+${m.xp} XP`] : []),
  ...(m.perdida ? ['Perdida após o uso'] : []),
];

export const NOMES_CONDICAO: Record<Condicao, string> = {
  veneno: 'Envenenado',
  queimando: 'Queimando',
  atordoado: 'Atordoado',
  imobilizado: 'Imobilizado',
  fortalecido: 'Fortalecido',
  confuso: 'Confuso',
};
