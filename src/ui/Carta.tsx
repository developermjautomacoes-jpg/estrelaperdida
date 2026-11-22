import type { Carta as TCarta } from '../engine/types';
import { descreverMetade } from './texto';

interface Props {
  carta: TCarta;
  selecionada?: boolean;
  lider?: boolean;
  destaque?: 'cima' | 'baixo';
  onClick?: () => void;
  /** Posição na mão (atraso da animação de entrada). */
  indice?: number;
  /** Cor do herói no topo da carta. */
  cor?: string;
}

export function Carta({ carta, selecionada, lider, destaque, onClick, indice = 0, cor }: Props) {
  return (
    <button
      type="button"
      className={`carta ${selecionada ? 'carta--selecionada' : ''}`}
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selecionada}
      style={{ animationDelay: `${indice * 60}ms`, ['--cor-heroi' as string]: cor ?? '#6cc3ff' }}
    >
      <span className="carta__brilho" aria-hidden="true" />
      <div className="carta__topo">
        <span className="carta__nome">{carta.nome}</span>
        <span className={`carta__ini ${lider ? 'carta__ini--lider' : ''}`} title="Iniciativa">
          {carta.iniciativa}
        </span>
      </div>
      <div className={`carta__metade ${destaque === 'cima' ? 'carta__metade--ativa' : ''}`}>
        {descreverMetade(carta.cima).map((t) => (
          <div key={t}>{t}</div>
        ))}
      </div>
      <div className="carta__divisor" />
      <div className={`carta__metade ${destaque === 'baixo' ? 'carta__metade--ativa' : ''}`}>
        {descreverMetade(carta.baixo).map((t) => (
          <div key={t}>{t}</div>
        ))}
      </div>
      {carta.nivel > 1 && <div className="carta__nivel">Nível {carta.nivel}</div>}
    </button>
  );
}
