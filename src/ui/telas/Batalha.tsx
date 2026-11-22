import { useEffect, useMemo, useState } from 'react';
import { deChave } from '../../engine/hex';
import {
  alvosValidos,
  descansar,
  desfazerEscolha,
  encerrarTurnoHeroi,
  escolherCartas,
  escolherMetades,
  executarPasso,
  iniciarRodada,
  passoAtual,
  podeDescansar,
  prontoParaRodada,
  pularPasso,
  turnoConcluido,
  unidade,
  type EstadoBatalha,
} from '../../engine/batalha';
import type { Cenario, Monstro, Visual } from '../../engine/types';
import { Retrato } from '../arte/Retrato';
import { Carta } from '../Carta';
import { Tabuleiro } from '../Tabuleiro';
import { descreverAcao, NOMES_CONDICAO } from '../texto';

interface Props {
  cenario: Cenario;
  monstros: Record<string, Monstro>;
  inicial: EstadoBatalha;
  visuais: Record<string, Visual | undefined>;
  onFim: (e: EstadoBatalha) => void;
  onSair: () => void;
}

export function Batalha({ cenario, monstros, inicial, visuais, onFim, onSair }: Props) {
  const [e, setE] = useState(inicial);
  const [erro, setErro] = useState<string>();
  const [selecao, setSelecao] = useState<Record<string, string[]>>({});
  const [introVista, setIntroVista] = useState(false);
  /** Estados anteriores dentro do turno do herói, para o botão Voltar. */
  const [historico, setHistorico] = useState<EstadoBatalha[]>([]);

  const fazer = (f: () => EstadoBatalha) => {
    try {
      setErro(undefined);
      setE(f());
    } catch (err) {
      setErro((err as Error).message);
    }
  };

  useEffect(() => setSelecao({}), [e.rodada]);
  useEffect(() => setHistorico([]), [e.rodada, e.turno?.unidadeId]);

  /** Ação do turno do herói que pode ser desfeita com Voltar. */
  const fazerNoTurno = (f: () => EstadoBatalha) => {
    try {
      setErro(undefined);
      const novo = f();
      setHistorico((h) => [...h, e]);
      setE(novo);
    } catch (err) {
      setErro((err as Error).message);
    }
  };
  const voltarNoTurno = () => {
    const anterior = historico[historico.length - 1];
    if (!anterior) return;
    setErro(undefined);
    setHistorico((h) => h.slice(0, -1));
    setE(anterior);
  };

  const validos = useMemo(() => alvosValidos(e), [e]);
  const passo = passoAtual(e);

  if (!introVista)
    return (
      <div className="tela tela--narrativa">
        <p className="rotulo">Cenário {cenario.numero}</p>
        <h1>{cenario.nome}</h1>
        <p className="narracao">{cenario.introducao}</p>
        <p className="objetivo">Objetivo: {textoObjetivo(cenario)}</p>
        <button className="botao botao--principal" onClick={() => setIntroVista(true)}>
          Entrar no cenário
        </button>
      </div>
    );

  const alternar = (unidadeId: string, cartaId: string) =>
    setSelecao((s) => {
      const atual = s[unidadeId] ?? [];
      const novo = atual.includes(cartaId) ? atual.filter((c) => c !== cartaId) : [...atual, cartaId].slice(-2);
      return { ...s, [unidadeId]: novo };
    });

  const confirmar = (unidadeId: string) => {
    const [a, b] = selecao[unidadeId] ?? [];
    if (!a || !b) return setErro('Escolha duas cartas');
    fazer(() => escolherCartas(e, unidadeId, a, b, a));
  };

  const heroiDaVez = e.turno ? e.herois.find((h) => h.unidadeId === e.turno!.unidadeId) : undefined;
  const terminou = e.fase === 'vitoria' || e.fase === 'derrota';

  return (
    <div className="batalha">
      <header className="batalha__topo">
        <button className="botao botao--leve" onClick={onSair}>
          ← Sair
        </button>
        <div>
          <strong>{cenario.nome}</strong> · Rodada {e.rodada} · {textoObjetivo(cenario)}
        </div>
      </header>

      <main className="batalha__corpo">
        <section className="batalha__mapa">
          {e.fase === 'acao' && e.ordem.length > 0 && (
            <div className="ordem" key={e.rodada} aria-label="Ordem de iniciativa">
              {e.ordem.map((id, i) => {
                const u = unidade(e, id);
                return (
                  <div key={id} className={`ordem__item ordem__item--${u.lado} ${i === e.vez ? 'ordem__item--vez' : ''} ${u.fora || i < e.vez ? 'ordem__item--feito' : ''}`} style={{ animationDelay: `${i * 90}ms` }} title={u.nome}>
                    <Retrato id={u.arteId} visual={visuais[u.arteId]} className="ordem__retrato" titulo={u.nome} />
                  </div>
                );
              })}
            </div>
          )}
          <Tabuleiro
            estado={e}
            ambiente={cenario.ambiente}
            visuais={visuais}
            hexesValidos={validos.hexes}
            unidadesValidas={validos.unidades}
            vezDe={e.turno?.unidadeId}
            onHex={(k) => fazerNoTurno(() => executarPasso(e, { hex: deChave(k) }))}
            onUnidade={(id) => fazerNoTurno(() => executarPasso(e, { unidadeId: id }))}
          />
          <div className="status-unidades">
            {e.unidades
              .filter((u) => !u.fora)
              .map((u) => (
                <div key={u.id} className={`status status--${u.lado}`}>
                  <span>{u.nome}</span>
                  <span>
                    {u.vida}/{u.vidaMax}
                    {u.condicoes.length > 0 && ` · ${u.condicoes.map((c) => NOMES_CONDICAO[c]).join(', ')}`}
                  </span>
                </div>
              ))}
          </div>
        </section>

        <aside className="batalha__painel">
          {erro && <div className="aviso">{erro}</div>}

          {terminou && (
            <div className="bloco">
              <h2>{e.fase === 'vitoria' ? 'Vitória!' : 'Derrota'}</h2>
              <button className="botao botao--principal" onClick={() => onFim(e)}>
                Continuar
              </button>
            </div>
          )}

          {e.fase === 'planejamento' &&
            e.herois
              .filter((h) => !unidade(e, h.unidadeId).fora)
              .map((h) => {
                const u = unidade(e, h.unidadeId);
                const pronto = h.escolhidas.length === 2 || h.descanso;
                const sel = selecao[h.unidadeId] ?? [];
                return (
                  <div className="bloco" key={h.unidadeId}>
                    <div className="cabeca-heroi">
                      <Retrato id={u.arteId} visual={visuais[u.arteId]} className="cabeca-heroi__retrato" titulo={u.nome} />
                      <h3>
                        {u.nome} {pronto && <span className="etiqueta">pronto</span>}
                      </h3>
                    </div>
                    <p className="dica">
                      Escolha 2 cartas. A primeira define a iniciativa (menor age antes). Mão {h.mao.length} · descarte {h.descarte.length} · perdidas {h.perdidas.length}
                    </p>
                    <div className="mao">
                      {h.mao.map((c, i) => (
                        <Carta
                          key={c.id}
                          indice={i}
                          cor={visuais[u.arteId]?.destaque}
                          heroi={{ classe: u.defId, versao: u.arteId, visual: visuais[u.arteId] }}
                          carta={c}
                          selecionada={sel.includes(c.id) || h.escolhidas.some((x) => x.id === c.id)}
                          lider={(sel[0] ?? h.lider) === c.id}
                          onClick={() => alternar(h.unidadeId, c.id)}
                        />
                      ))}
                    </div>
                    <div className="acoes">
                      {pronto ? (
                        <button
                          className="botao botao--leve"
                          onClick={() => {
                            fazer(() => desfazerEscolha(e, h.unidadeId));
                            setSelecao((s) => ({ ...s, [h.unidadeId]: [] }));
                          }}
                        >
                          ↶ Voltar e trocar
                        </button>
                      ) : (
                        sel.length > 0 && (
                          <button className="botao botao--leve" onClick={() => setSelecao((s) => ({ ...s, [h.unidadeId]: sel.slice(0, -1) }))}>
                            ↶ Voltar
                          </button>
                        )
                      )}
                      <button className="botao" onClick={() => confirmar(h.unidadeId)} disabled={sel.length !== 2 || !!pronto}>
                        Confirmar cartas
                      </button>
                      <button className="botao botao--leve" onClick={() => fazer(() => descansar(e, h.unidadeId))} disabled={!podeDescansar(e, h.unidadeId)}>
                        Descansar
                      </button>
                    </div>
                  </div>
                );
              })}

          {e.fase === 'planejamento' && (
            <button className="botao botao--principal" disabled={!prontoParaRodada(e)} onClick={() => fazer(() => iniciarRodada(e, monstros))}>
              Revelar iniciativa e começar a rodada
            </button>
          )}

          {e.fase === 'acao' && heroiDaVez && e.turno && (
            <div className="bloco">
              <div className="cabeca-heroi">
                <Retrato id={unidade(e, heroiDaVez.unidadeId).arteId} visual={visuais[unidade(e, heroiDaVez.unidadeId).arteId]} className="cabeca-heroi__retrato" />
                <h3>Vez de {unidade(e, heroiDaVez.unidadeId).nome}</h3>
              </div>
              {!e.turno.metadesEscolhidas ? (
                <>
                  <p className="dica">Use a parte de cima de uma carta e a de baixo da outra.</p>
                  <div className="mao">
                    {heroiDaVez.escolhidas.map((c, i) => (
                      <div key={c.id} className="escolha-metade">
                        <Carta
                          carta={c}
                          indice={i}
                          cor={visuais[unidade(e, heroiDaVez.unidadeId).arteId]?.destaque}
                          heroi={{ classe: unidade(e, heroiDaVez.unidadeId).defId, versao: unidade(e, heroiDaVez.unidadeId).arteId, visual: visuais[unidade(e, heroiDaVez.unidadeId).arteId] }}
                        />
                        <button className="botao" onClick={() => fazerNoTurno(() => escolherMetades(e, c.id))}>
                          Cima desta
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <ol className="fila">
                    {e.turno.fila.map((p, i) => (
                      <li key={i} className={i === e.turno!.indice ? 'fila--atual' : i < e.turno!.indice ? 'fila--feita' : ''}>
                        {descreverAcao(p.acao)}
                      </li>
                    ))}
                  </ol>
                  {passo && (
                    <p className="dica">
                      {passo.acao.tipo === 'mover'
                        ? 'Clique num hexágono destacado para mover.'
                        : passo.acao.tipo === 'atacar'
                          ? validos.unidades.length
                            ? 'Clique num inimigo destacado para atacar.'
                            : 'Nenhum inimigo ao alcance.'
                          : 'Clique num aliado destacado.'}
                    </p>
                  )}
                  <div className="acoes">
                    {historico.length > 0 && (
                      <button className="botao botao--leve" onClick={voltarNoTurno} title="Desfaz a última escolha deste turno">
                        ↶ Voltar
                      </button>
                    )}
                    {passo && (
                      <button className="botao botao--leve" onClick={() => fazerNoTurno(() => pularPasso(e))}>
                        Pular ação
                      </button>
                    )}
                    {turnoConcluido(e) && (
                      <button className="botao botao--principal" onClick={() => fazer(() => encerrarTurnoHeroi(e, monstros))}>
                        Encerrar turno
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="bloco log">
            {e.log.slice(-10).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

const textoObjetivo = (c: Cenario) =>
  c.objetivo.tipo === 'derrotar_todos'
    ? 'derrotar todos os inimigos'
    : c.objetivo.tipo === 'derrotar_chefe'
      ? 'derrotar o chefe'
      : `sobreviver ${c.objetivo.rodadas} rodadas`;
