import { useEffect, useRef, useState } from 'react';
import type { EstadoBatalha } from '../../engine/batalha';
import type { Cenario } from '../../engine/types';
import type { ResumoHeroi } from '../finalizar';

interface Props {
  cenario: Cenario;
  estado: EstadoBatalha;
  /** Calcula o resumo aplicando a escolha (quando o cenário tem uma). */
  onConcluir: (escolha?: { id: string; opcao: string; desbloqueia?: string[] }) => ResumoHeroi[];
  onVoltar: () => void;
}

export function Resultado({ cenario, estado, onConcluir, onVoltar }: Props) {
  const venceu = estado.fase === 'vitoria';
  const precisaEscolher = venceu && !!cenario.escolha;
  const [resumo, setResumo] = useState<ResumoHeroi[]>();
  const aplicado = useRef(false);
  const concluir = (escolha?: Parameters<Props['onConcluir']>[0]) => {
    if (aplicado.current) return; // nunca aplicar a recompensa duas vezes
    aplicado.current = true;
    setResumo(onConcluir(escolha));
  };

  useEffect(() => {
    if (!precisaEscolher) concluir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tela tela--narrativa">
      <p className="rotulo">{venceu ? 'Vitória' : 'Derrota'}</p>
      <h1>{cenario.nome}</h1>
      <p className="narracao">{venceu ? cenario.conclusao : 'A névoa avança. Uma lanterna se apaga no Jardim de Portobruma. Vocês podem tentar de novo.'}</p>

      {precisaEscolher && !resumo && (
        <section className="bloco">
          <h2>{cenario.escolha!.pergunta}</h2>
          <p className="dica">Essa decisão fica salva e muda a história.</p>
          <div className="lista">
            {cenario.escolha!.opcoes.map((o) => (
              <button key={o.id} className="item" onClick={() => concluir({ id: cenario.escolha!.id, opcao: o.id, desbloqueia: o.desbloqueia })}>
                {o.texto}
              </button>
            ))}
          </div>
        </section>
      )}

      {resumo && (
        <section className="bloco">
          {resumo.map((r) => (
            <div key={r.jogadorId} className="item">
              <strong>
                {r.heroiNome} ({r.jogadorNome})
              </strong>
              <span>
                +{r.xp} XP · +{r.ouro} ouro
                {r.niveisGanhos.length > 0 && ` · subiu para o nível ${r.niveisGanhos.at(-1)}! Escolha a carta e o talento no perfil.`}
              </span>
              {r.conquistas.map((c) => (
                <span key={c.conquista.id} className="etiqueta">
                  ★ {c.conquista.nome}
                </span>
              ))}
            </div>
          ))}
          <button className="botao botao--principal" onClick={onVoltar}>
            Voltar para Portobruma
          </button>
        </section>
      )}
    </div>
  );
}
