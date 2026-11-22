import { describe, expect, it } from 'vitest';
import { registro } from '../content/registro';
import { criarHeroi } from './save';
import { simularPartida } from './simulacao';

const r = registro();
const grupo = (n: number) =>
  Object.values(r.classes)
    .slice(0, n)
    .map((classe, i) => ({ jogadorId: `j${i}`, classe, heroi: criarHeroi(classe.id, classe.versoes[i % 2].id, classe.versoes[i % 2].nome) }));

describe('simulação dos cenários jogáveis', () => {
  const jogaveis = Object.values(r.cenarios).filter((c) => !c.rascunho);
  for (const cenario of jogaveis) {
    for (const n of [2, 4]) {
      it(`${cenario.numero} · ${cenario.nome} com ${n} heróis termina sem erros`, () => {
        const res = Array.from({ length: 20 }, (_, s) => simularPartida(cenario, r.monstros, grupo(n), s + 1));
        const vitorias = res.filter((x) => x.venceu).length;
        console.log(`${cenario.numero} (${n} heróis): ${vitorias}/20 vitórias, média ${(res.reduce((a, b) => a + b.rodadas, 0) / 20).toFixed(1)} rodadas`);
        expect(res.every((x) => x.rodadas >= 1)).toBe(true);
      });
    }
  }
});
