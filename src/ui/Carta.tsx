import type { Carta as TCarta, Visual } from '../engine/types';
import { artePintada, Retrato } from './arte/Retrato';
import { descreverMetade } from './texto';

export type CategoriaCarta = 'ataque' | 'defesa' | 'movimento';

/** Categoria pela metade de cima: ataque, defesa/suporte ou movimento. */
export const categoriaDaCarta = (c: TCarta): CategoriaCarta => {
  const tipos = [...c.cima.acoes, ...c.baixo.acoes].map((a) => a.tipo);
  const cima = c.cima.acoes.map((a) => a.tipo);
  if (cima.includes('atacar')) return 'ataque';
  if (cima.some((t) => t === 'escudo' || t === 'curar' || t === 'provocar' || t === 'fortalecer')) return 'defesa';
  if (cima.includes('mover')) return tipos.includes('atacar') ? 'ataque' : 'movimento';
  return 'defesa';
};

/**
 * Arte da carta, na ordem: arte própria (carta.<id>), arte da categoria da classe
 * (carta.<classe>.<categoria>) ou, sem nenhuma, o retrato do herói.
 */
export const arteDaCarta = (c: TCarta, classe?: string): string | undefined =>
  artePintada(`carta.${c.id}`) ?? (classe ? artePintada(`carta.${classe}.${categoriaDaCarta(c)}`) : undefined);

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
  /** Herói dono da carta (para escolher a arte). */
  heroi?: { classe: string; versao: string; visual?: Visual };
}

export function Carta({ carta, selecionada, lider, destaque, onClick, indice = 0, cor, heroi }: Props) {
  const arte = arteDaCarta(carta, heroi?.classe);
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
      {(arte || heroi) && (
        <div className="carta__arte" aria-hidden="true">
          {arte ? <img src={arte} alt="" loading="lazy" /> : <Retrato id={heroi!.versao} visual={heroi!.visual} className="carta__retrato" />}
        </div>
      )}
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
