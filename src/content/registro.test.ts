import { describe, expect, it } from 'vitest';
import { registro, validarRegistro } from './registro';

describe('pacotes de aventura', () => {
  const r = registro();

  it('carrega a biblioteca base e A Estrela Partida', () => {
    expect(Object.keys(r.aventuras)).toEqual(expect.arrayContaining(['base.biblioteca', 'estrela.aventura']));
    expect(Object.keys(r.classes)).toHaveLength(6);
  });

  it('não tem inconsistências', () => {
    expect(validarRegistro(r)).toEqual([]);
  });

  it('cada classe tem uma versão feminina e uma masculina', () => {
    for (const c of Object.values(r.classes)) {
      expect(c.versoes.map((v) => v.genero).sort()).toEqual(['f', 'm']);
    }
  });
});
