import { useState } from 'react';
import { cartasPendentes, NIVEL_MAXIMO, XP_POR_NIVEL, nivelPorXp, opcoesDeCarta, progressoNivel, talentosPendentes, vidaMaxima } from '../../engine/progressao';
import { criarHeroi } from '../../engine/save';
import type { Classe, Conquista, HeroiSalvo, Jogador } from '../../engine/types';
import { Carta } from '../Carta';
import { Retrato } from '../arte/Retrato';

interface Props {
  jogador: Jogador;
  classes: Record<string, Classe>;
  conquistas: Conquista[];
  onSalvar: (j: Jogador) => void;
  onVoltar: () => void;
}

export function Perfil({ jogador, classes, conquistas, onSalvar, onVoltar }: Props) {
  const [classeSel, setClasseSel] = useState<string>();

  const atualizarHeroi = (h: HeroiSalvo) => onSalvar({ ...jogador, herois: jogador.herois.map((x) => (x.id === h.id ? h : x)) });

  return (
    <div className="tela">
      <button className="botao botao--leve" onClick={onVoltar}>
        ← Jogadores
      </button>
      <h1>{jogador.nome}</h1>
      {jogador.titulos.length > 0 && <p className="dica">Títulos: {jogador.titulos.join(', ')}</p>}

      <section className="bloco">
        <h2>Heróis</h2>
        {jogador.herois.length === 0 && <p className="dica">Escolha uma classe para criar seu primeiro herói.</p>}
        <div className="herois">
          {jogador.herois.map((h) => {
            const c = classes[h.classe];
            const v = c.versoes.find((x) => x.id === h.versao)!;
            const p = progressoNivel(h.xp);
            const piso = XP_POR_NIVEL[p.nivel - 1];
            const pctBase = p.proximo ? ((h.xp - piso) / (p.proximo - piso)) * 100 : 100;
            return (
              <article key={h.id} className="heroi">
                <Retrato id={h.versao} visual={v.visual} className="heroi__retrato" titulo={h.nome} />
                <header>
                  <strong>{h.nome}</strong>
                  <span>
                    {c.nome} · nível {p.nivel} · vida {vidaMaxima(c, p.nivel)} · ouro {h.ouro}
                  </span>
                </header>
                <div className="barra" aria-label={`XP ${h.xp}`}>
                  <div style={{ width: `${Math.min(100, pctBase)}%` }} />
                </div>
                <p className="dica">
                  {h.xp} XP {p.proximo ? `· próximo nível em ${p.proximo}` : `· nível máximo (${NIVEL_MAXIMO})`}
                </p>
                <p className="dica">{v.descricao}</p>
                {cartasPendentes(h) > 0 && opcoesDeCarta(c, h).length > 0 && (
                  <div className="subida">
                    <h3>Nova carta! Escolha uma:</h3>
                    <div className="mao">
                      {opcoesDeCarta(c, h).map((carta) => (
                        <Carta key={carta.id} carta={carta} cor={v.visual?.destaque} heroi={{ classe: c.id, versao: h.versao, visual: v.visual }} onClick={() => atualizarHeroi({ ...h, cartasExtras: [...h.cartasExtras, carta.id] })} />
                      ))}
                    </div>
                  </div>
                )}
                {talentosPendentes(h) > 0 && (
                  <div className="subida">
                    <h3>Novo talento! Escolha um:</h3>
                    <div className="lista">
                      {c.talentos
                        .filter((t) => !h.talentos.includes(t.id))
                        .map((t) => (
                          <button key={t.id} className="item" onClick={() => atualizarHeroi({ ...h, talentos: [...h.talentos, t.id] })}>
                            {t.descricao}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="bloco">
        <h2>Criar herói</h2>
        <div className="classes">
          {Object.values(classes).map((c) => (
            <button key={c.id} className={`item item--classe ${classeSel === c.id ? 'item--ativo' : ''}`} onClick={() => setClasseSel(c.id)}>
              <div className="classe__retratos">
                {c.versoes.map((v) => (
                  <Retrato key={v.id} id={v.id} visual={v.visual} className="classe__retrato" titulo={v.nome} />
                ))}
              </div>
              <strong>{c.nome}</strong>
              <span>
                {c.papel} · {c.dificuldade === 'facil' ? 'fácil' : c.dificuldade === 'media' ? 'média' : 'difícil'}
              </span>
            </button>
          ))}
        </div>
        {classeSel && (
          <div className="versoes">
            {classes[classeSel].versoes.map((v) => (
              <article key={v.id} className="versao">
                <Retrato id={v.id} visual={v.visual} className="versao__retrato" titulo={v.nome} />
                <h3>
                  {v.nome} <span className="etiqueta">{v.genero === 'f' ? 'ela' : 'ele'}</span>
                </h3>
                <p>{v.descricao}</p>
                {v.companheiro && <p className="dica">Companheiro: {v.companheiro}</p>}
                <button
                  className="botao"
                  onClick={() => {
                    onSalvar({ ...jogador, herois: [...jogador.herois, criarHeroi(classeSel, v.id, v.nome)] });
                    setClasseSel(undefined);
                  }}
                >
                  Jogar com {v.nome.split(' ')[0]}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bloco">
        <h2>Conquistas</h2>
        <div className="lista">
          {conquistas.map((c) => {
            const feita = jogador.conquistas.find((x) => x.id === c.id);
            const atual = Math.min(c.quantidade, jogador.estatisticas[c.estatistica] ?? 0);
            return (
              <div key={c.id} className={`item ${feita ? 'item--ativo' : 'item--bloqueado'}`}>
                <strong>
                  {feita ? '★' : '☆'} {c.nome}
                </strong>
                <span>
                  {c.descricao} {!feita && `(${atual}/${c.quantidade})`}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <p className="dica">Nível mais alto alcançado: {Math.max(1, ...jogador.herois.map((h) => nivelPorXp(h.xp)))}</p>
    </div>
  );
}
