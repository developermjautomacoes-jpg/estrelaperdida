import { describe, expect, it } from 'vitest';
import { escolherSave } from './nuvem';
import { criarJogador, novoSave } from '../engine/save';
import type { Save } from '../engine/types';

const com = (data: string, jogadores = 1): Save => ({
  ...novoSave(),
  atualizadoEm: data,
  jogadores: Array.from({ length: jogadores }, (_, i) => criarJogador(`J${i}`)),
});

describe('escolha entre save local e da nuvem', () => {
  it('sem save na nuvem, envia o local', () => {
    expect(escolherSave(com('2026-01-02'), null)).toMatchObject({ enviar: true });
  });
  it('local vazio nunca apaga a nuvem', () => {
    const remoto = com('2026-01-01');
    expect(escolherSave(com('2026-02-01', 0), remoto)).toEqual({ save: remoto, enviar: false });
  });
  it('vale o mais recente', () => {
    const local = com('2026-03-01');
    const remoto = com('2026-02-01');
    expect(escolherSave(local, remoto)).toEqual({ save: local, enviar: true });
    expect(escolherSave(remoto, local)).toEqual({ save: local, enviar: false });
  });
});
