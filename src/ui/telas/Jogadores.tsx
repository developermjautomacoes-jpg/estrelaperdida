import { useState, type ReactNode } from 'react';
import { criarJogador } from '../../engine/save';
import type { Jogador } from '../../engine/types';

interface Props {
  conta?: ReactNode;
  jogadores: Jogador[];
  onCriar: (j: Jogador) => void;
  onAbrir: (id: string) => void;
  onCampanha: () => void;
}

export function Jogadores({ conta, jogadores, onCriar, onAbrir, onCampanha }: Props) {
  const [nome, setNome] = useState('');
  return (
    <div className="tela">
      <header className="capa">
        <p className="rotulo">Estúdio Gamer Neeko apresenta</p>
        <h1>A Estrela Partida</h1>
        <p className="narracao">Nenhuma luz brilha sozinha.</p>
      </header>

      {conta}

      <section className="bloco">
        <h2>Jogadores</h2>
        {jogadores.length === 0 && <p className="dica">Crie um perfil para cada pessoa que vai jogar.</p>}
        <div className="lista">
          {jogadores.map((j) => (
            <button key={j.id} className="item" onClick={() => onAbrir(j.id)}>
              <strong>{j.nome}</strong>
              <span>
                {j.herois.length} herói(s) · {j.conquistas.length} conquista(s)
                {j.titulos.length > 0 && ` · ${j.titulos.at(-1)}`}
              </span>
            </button>
          ))}
        </div>
        <form
          className="linha"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!nome.trim()) return;
            onCriar(criarJogador(nome.trim()));
            setNome('');
          }}
        >
          <input value={nome} onChange={(ev) => setNome(ev.target.value)} placeholder="Nome do jogador" aria-label="Nome do jogador" />
          <button className="botao">Criar jogador</button>
        </form>
      </section>

      <button className="botao botao--principal" onClick={onCampanha} disabled={!jogadores.some((j) => j.herois.length)}>
        Ir para a campanha
      </button>
    </div>
  );
}
