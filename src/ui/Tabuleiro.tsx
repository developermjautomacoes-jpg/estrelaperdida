import { useEffect, useRef, useState, type ReactNode } from 'react';
import { chave, deChave, paraPixel, vizinhos } from '../engine/hex';
import type { EstadoBatalha } from '../engine/batalha';
import type { Ambiente, Visual } from '../engine/types';
import { artePintada, Retrato } from './arte/Retrato';
import { NOMES_CONDICAO } from './texto';

interface Props {
  estado: EstadoBatalha;
  ambiente?: Ambiente;
  visuais: Record<string, Visual | undefined>;
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

interface Flutuante {
  chave: number;
  x: number;
  y: number;
  texto: string;
  tipo: 'dano' | 'cura';
}

export function Tabuleiro({ estado, ambiente = 'porto', visuais, hexesValidos, unidadesValidas, vezDe, onHex, onUnidade }: Props) {
  const todos = [...estado.andaveis, ...estado.paredes].map(deChave);
  const px = todos.map((h) => paraPixel(h, T));
  const minX = Math.min(...px.map((p) => p.x)) - T - 4;
  const minY = Math.min(...px.map((p) => p.y)) - T - 4;
  const maxX = Math.max(...px.map((p) => p.x)) + T + 4;
  const maxY = Math.max(...px.map((p) => p.y)) + T + 4;
  const validos = new Set(hexesValidos);
  const paredes = new Set(estado.paredes);
  const existentes = new Set([...estado.andaveis, ...estado.paredes]);
  // a borda do mapa fica lisa; só obstáculos internos ganham desenho
  const interna = (h: { q: number; r: number }) => vizinhos(h).every((n) => existentes.has(chave(n)));

  // números de dano/cura flutuando e unidades tremendo ao serem atingidas
  const anterior = useRef<Record<string, number>>({});
  const [flutuantes, setFlutuantes] = useState<Flutuante[]>([]);
  const [atingidos, setAtingidos] = useState<string[]>([]);
  useEffect(() => {
    const novos: Flutuante[] = [];
    const feridos: string[] = [];
    for (const u of estado.unidades) {
      const antes = anterior.current[u.id];
      if (antes !== undefined && antes !== u.vida) {
        const { x, y } = paraPixel(u.pos, T);
        novos.push({ chave: Math.random(), x, y: y - 20, texto: u.vida < antes ? `-${antes - u.vida}` : `+${u.vida - antes}`, tipo: u.vida < antes ? 'dano' : 'cura' });
        if (u.vida < antes) feridos.push(u.id);
      }
      anterior.current[u.id] = u.vida;
    }
    if (novos.length) {
      setFlutuantes((f) => [...f, ...novos]);
      setAtingidos(feridos);
      const t = setTimeout(() => {
        setFlutuantes((f) => f.filter((x) => !novos.includes(x)));
        setAtingidos([]);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [estado]);

  const fundo = artePintada(`ambiente.${ambiente}`);

  return (
    <div className={`tabuleiro-moldura ambiente--${ambiente}`} style={fundo ? { backgroundImage: `url(${fundo})` } : undefined}>
      <svg className="tabuleiro" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="Tabuleiro">
        {todos.map((h) => {
          const k = chave(h);
          const { x, y } = paraPixel(h, T);
          const parede = paredes.has(k);
          const valido = validos.has(k);
          return (
            <g key={k}>
              <polygon
                points={pontos(x, y)}
                className={`hex ${parede ? 'hex--parede' : ''} ${valido ? 'hex--valido' : ''}`}
                onClick={valido && onHex ? () => onHex(k) : undefined}
              />
              {parede && interna(h) && decoracao(ambiente, x, y, Math.abs(h.q * 7 + h.r * 13) % 3)}
            </g>
          );
        })}
        {estado.unidades
          .filter((u) => !u.fora)
          .map((u) => {
            const { x, y } = paraPixel(u.pos, T);
            const alvo = unidadesValidas.includes(u.id);
            const r = u.chefe ? 24 : 20;
            return (
              <g
                key={u.id}
                className={`unidade unidade--${u.lado} ${alvo ? 'unidade--alvo' : ''} ${vezDe === u.id ? 'unidade--vez' : ''} ${u.chefe ? 'unidade--chefe' : ''} ${atingidos.includes(u.id) ? 'unidade--atingida' : ''}`}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onClick={alvo && onUnidade ? () => onUnidade(u.id) : undefined}
              >
                <title>
                  {`${u.nome} — ${u.vida}/${u.vidaMax} de vida${u.escudo ? `, escudo ${u.escudo}` : ''}${u.condicoes.length ? ` · ${u.condicoes.map((c) => NOMES_CONDICAO[c]).join(', ')}` : ''}`}
                </title>
                <defs>
                  <clipPath id={`recorte-${u.id}`}>
                    <circle r={r - 2} />
                  </clipPath>
                </defs>
                <circle r={r} className="unidade__aro" />
                <g clipPath={`url(#recorte-${u.id})`}>
                  <Retrato id={u.arteId} visual={visuais[u.arteId]} x={-r * 1.25} y={-r * 1.1} largura={r * 2.5} altura={r * 3} />
                </g>
                <circle r={r} className="unidade__borda" />
                <rect x={-16} y={r + 2} width={32} height={4} rx={2} className="unidade__vida-fundo" />
                <rect x={-16} y={r + 2} width={(32 * u.vida) / u.vidaMax} height={4} rx={2} className="unidade__vida" />
                {u.escudo > 0 && (
                  <text x={r - 4} y={-r + 6} className="unidade__escudo">
                    ◆{u.escudo}
                  </text>
                )}
                {u.condicoes.length > 0 && <circle cx={-r + 4} cy={-r + 4} r={4} className="unidade__condicao" />}
              </g>
            );
          })}
        {flutuantes.map((f) => (
          <text key={f.chave} x={f.x} y={f.y} textAnchor="middle" className={`flutuante flutuante--${f.tipo}`}>
            {f.texto}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Obstáculos desenhados conforme a região do cenário. */
function decoracao(amb: Ambiente, x: number, y: number, v: number): ReactNode {
  switch (amb) {
    case 'bosque':
      return (
        <g className="decor" transform={`translate(${x} ${y})`}>
          <rect x="-2" y="4" width="4" height="10" fill="#4a3424" />
          <circle cx="0" cy="-2" r={12 - v} fill="#2f4a2c" />
          <circle cx="-6" cy="2" r="7" fill="#355a32" />
          <circle cx="6" cy="1" r="7" fill="#29432a" />
        </g>
      );
    case 'pantano':
      return (
        <g className="decor" transform={`translate(${x} ${y})`} stroke="#5f7a3a" strokeWidth="2">
          <ellipse cx="0" cy="8" rx="16" ry="5" fill="#1d2a1c" stroke="none" />
          <path d="M-8 8 q-2 -14 2 -20 M0 8 q0 -16 -2 -24 M8 8 q2 -12 -2 -18" fill="none" />
        </g>
      );
    case 'porto':
    case 'biblioteca':
      return (
        <g className="decor" transform={`translate(${x} ${y})`}>
          <rect x="-12" y="-10" width="24" height="20" rx="2" fill={amb === 'porto' ? '#4a3a2a' : '#3a2a3a'} stroke="#6b5a3a" />
          <path d="M-12 -10 L 12 10 M12 -10 L -12 10" stroke="#6b5a3a" />
        </g>
      );
    case 'mar':
      return <path className="decor" d={`M${x - 14} ${y} q7 -6 14 0 t14 0`} stroke="#6cc3ff" strokeOpacity="0.5" fill="none" strokeWidth="2" />;
    case 'ceu':
      return <ellipse className="decor" cx={x} cy={y} rx="14" ry="8" fill="#c8d8f0" opacity="0.35" />;
    case 'nevoa':
      return <ellipse className="decor nevoa-movel" cx={x} cy={y} rx="16" ry="9" fill="#c8cdd6" opacity="0.25" />;
    default:
      return (
        <polygon
          className="decor"
          points={`${x - 13},${y + 8} ${x - 8},${y - 8} ${x + 2},${y - 12} ${x + 12},${y - 2} ${x + 10},${y + 9}`}
          fill={amb === 'deserto' ? '#8a6a3a' : amb === 'cratera' ? '#3a2a4a' : '#3a3c42'}
          stroke="#55575e"
        />
      );
  }
}
