import type { Carta as TCarta } from '../engine/types';
import { descreverMetade } from './texto';

interface Props {
  carta: TCarta;
  selecionada?: boolean;
  lider?: boolean;
  destaque?: 'cima' | 'baixo';
  onClick?: () => void;
}

export function Carta({ carta, selecionada, lider, destaque, onClick }: Props) {
  return (
    <button
      type="button"
      className={`carta ${selecionada ? 'carta--selecionada' : ''}`}
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selecionada}
    >
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
