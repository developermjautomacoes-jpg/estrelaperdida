import { useState } from 'react';
import type { Classe, Monstro, Personagem } from '../../engine/types';
import { Retrato } from '../arte/Retrato';

interface Props {
  classes: Record<string, Classe>;
  monstros: Record<string, Monstro>;
  personagens: Personagem[];
  onVoltar: () => void;
}

type Aba = 'herois' | 'aliados' | 'viloes' | 'criaturas';

interface Ficha {
  id: string;
  nome: string;
  sub: string;
  texto: string;
  visual?: Personagem['visual'];
}

export function Lenda({ classes, monstros, personagens, onVoltar }: Props) {
  const [aba, setAba] = useState<Aba>('herois');
  const fichas: Record<Aba, Ficha[]> = {
    herois: Object.values(classes).flatMap((c) =>
      c.versoes.map((v) => ({ id: v.id, nome: v.nome, sub: `${c.nome} · ${v.genero === 'f' ? 'ela' : 'ele'}`, texto: v.descricao, visual: v.visual })),
    ),
    aliados: personagens.map((p) => ({ id: p.id, nome: p.nome, sub: p.papel, texto: p.descricao, visual: p.visual })),
    viloes: Object.values(monstros)
      .filter((m) => m.chefe)
      .map((m) => ({ id: m.id, nome: m.nome, sub: 'Chefe', texto: m.descricao, visual: m.visual })),
    criaturas: Object.values(monstros)
      .filter((m) => !m.chefe)
      .map((m) => ({ id: m.id, nome: m.nome, sub: `Vida ${m.vida} · Ataque ${m.ataque}`, texto: m.descricao, visual: m.visual })),
  };
  const NOMES: Record<Aba, string> = { herois: 'Heróis', aliados: 'Aliados', viloes: 'Vilões', criaturas: 'Criaturas' };

  return (
    <div className="tela tela--larga">
      <button className="botao botao--leve" onClick={onVoltar}>
        ← Voltar
      </button>
      <h1>Livro da Lenda</h1>
      <div className="abas" role="tablist">
        {(Object.keys(NOMES) as Aba[]).map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} className={`aba ${aba === a ? 'aba--ativa' : ''}`} onClick={() => setAba(a)}>
            {NOMES[a]}
          </button>
        ))}
      </div>
      <div className="galeria">
        {fichas[aba].map((f, i) => (
          <article key={f.id} className="ficha" style={{ animationDelay: `${i * 50}ms` }}>
            <Retrato id={f.id} visual={f.visual} className="ficha__retrato" titulo={f.nome} />
            <h3>{f.nome}</h3>
            <p className="rotulo">{f.sub}</p>
            <p className="dica">{f.texto}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
