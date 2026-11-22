import { chave, deChave, paraPixel } from '../engine/hex';
import type { EstadoBatalha } from '../engine/batalha';
import { NOMES_CONDICAO } from './texto';

interface Props {
  estado: EstadoBatalha;
  hexesValidos: string[];
  unidadesValidas: string[];
  vezDe?: string;
  onHex?: (k: string) => void;
  onUnidade?: (id: string) => void;
}

const T = 30; // tamanho do hexágono

const pontos = (cx: number, cy: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i - 30);
    return `${cx + T * Math.cos(ang)},${cy + T * Math.sin(ang)}`;
  }).join(' ');

export function Tabuleiro({ estado, hexesValidos, unidadesValidas, vezDe, onHex, onUnidade }: Props) {
  const todos = [...estado.andaveis, ...estado.paredes].map(deChave);
  const px = todos.map((h) => paraPixel(h, T));
  const minX = Math.min(...px.map((p) => p.x)) - T - 4;
  const minY = Math.min(...px.map((p) => p.y)) - T - 4;
  const maxX = Math.max(...px.map((p) => p.x)) + T + 4;
  const maxY = Math.max(...px.map((p) => p.y)) + T + 4;
  const validos = new Set(hexesValidos);
  const paredes = new Set(estado.paredes);

  return (
    <svg className="tabuleiro" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="Tabuleiro">
      {todos.map((h) => {
        const k = chave(h);
        const { x, y } = paraPixel(h, T);
        const parede = paredes.has(k);
        const valido = validos.has(k);
        return (
          <polygon
            key={k}
            points={pontos(x, y)}
            className={`hex ${parede ? 'hex--parede' : ''} ${valido ? 'hex--valido' : ''}`}
            onClick={valido && onHex ? () => onHex(k) : undefined}
          />
        );
      })}
      {estado.unidades
        .filter((u) => !u.fora)
        .map((u) => {
          const { x, y } = paraPixel(u.pos, T);
          const alvo = unidadesValidas.includes(u.id);
          const iniciais = u.nome
            .split(/[\s,]+/)
            .filter((p) => p.length > 2)
            .slice(0, 2)
            .map((p) => p[0])
            .join('');
          return (
            <g
              key={u.id}
              className={`unidade unidade--${u.lado} ${alvo ? 'unidade--alvo' : ''} ${vezDe === u.id ? 'unidade--vez' : ''} ${u.chefe ? 'unidade--chefe' : ''}`}
              onClick={alvo && onUnidade ? () => onUnidade(u.id) : undefined}
            >
              <title>
                {`${u.nome} — ${u.vida}/${u.vidaMax} de vida${u.escudo ? `, escudo ${u.escudo}` : ''}${u.condicoes.length ? ` · ${u.condicoes.map((c) => NOMES_CONDICAO[c]).join(', ')}` : ''}`}
              </title>
              <circle cx={x} cy={y} r={u.chefe ? 22 : 18} />
              <text x={x} y={y + 4} textAnchor="middle" className="unidade__sigla">
                {iniciais}
              </text>
              <rect x={x - 16} y={y + 20} width={32} height={4} className="unidade__vida-fundo" />
              <rect x={x - 16} y={y + 20} width={(32 * u.vida) / u.vidaMax} height={4} className="unidade__vida" />
              {u.escudo > 0 && (
                <text x={x + 16} y={y - 12} className="unidade__escudo">
                  ◆{u.escudo}
                </text>
              )}
            </g>
          );
        })}
    </svg>
  );
}
