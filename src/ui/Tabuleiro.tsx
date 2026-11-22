import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { caminho, chave, deChave, paraPixel, vizinhos } from '../engine/hex';
import type { Hex } from '../engine/types';
import type { EstadoBatalha, EventoVisual } from '../engine/batalha';
import { estiloDoAtaque, tocar, type EstiloAtaque } from './som';
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
/** Achatamento vertical: o tabuleiro parece deitado na mesa, visto de lado. */
const ACH = 0.72;
const px = (h: Hex) => {
  const p = paraPixel(h, T);
  return { x: p.x, y: p.y * ACH };
};

// caminhada: 8 quadros por ciclo = 2 passos; 4 quadros por casa
const MS_POR_CASA = 420;
const QUADRO_PARADO = 2; // pernas juntas
const ALTURA_MINI = 72;
const ALTURA_MINI_CHEFE = 92;

interface Pose {
  x: number;
  y: number;
  quadro: number;
  virado: boolean; // olhando para a esquerda
}

/** Tamanho natural das faixas de caminhada (para recortar 1 quadro). */
const tamanhos: Record<string, { w: number; h: number }> = {};
function useTamanho(url?: string) {
  const [, setV] = useState(0);
  useEffect(() => {
    if (!url || tamanhos[url]) return;
    const img = new Image();
    img.onload = () => {
      tamanhos[url] = { w: img.naturalWidth, h: img.naturalHeight };
      setV((v) => v + 1);
    };
    img.src = url;
  }, [url]);
  return url ? tamanhos[url] : undefined;
}

const pontos = (cx: number, cy: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const ang = (Math.PI / 180) * (60 * i - 30);
    return `${cx + T * Math.cos(ang)},${cy + T * Math.sin(ang) * ACH}`;
  }).join(' ');

interface Efeito {
  chave: number;
  ev: EventoVisual;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  estilo?: EstiloAtaque;
}

const INTERVALO_EFEITOS = 420; // ms entre eventos seguidos (ex.: turno dos monstros)

interface Flutuante {
  chave: number;
  x: number;
  y: number;
  texto: string;
  tipo: 'dano' | 'cura';
}

export function Tabuleiro({ estado, ambiente = 'porto', visuais, hexesValidos, unidadesValidas, vezDe, onHex, onUnidade }: Props) {
  const todos = [...estado.andaveis, ...estado.paredes].map(deChave);
  const pxs = todos.map((h) => px(h));
  const minX = Math.min(...pxs.map((p) => p.x)) - T - 4;
  const minY = Math.min(...pxs.map((p) => p.y)) - T - 60;
  const maxX = Math.max(...pxs.map((p) => p.x)) + T + 4;
  const maxY = Math.max(...pxs.map((p) => p.y)) + T + 4;
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
        const { x, y } = px(u.pos);
        novos.push({ chave: Math.random(), x, y: y - 70, texto: u.vida < antes ? `-${antes - u.vida}` : `+${u.vida - antes}`, tipo: u.vida < antes ? 'dano' : 'cura' });
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

  // efeitos de ação: projéteis, golpes, cura, escudo, com som
  const ultimoEvento = useRef<number>(estado.eventos?.[estado.eventos.length - 1]?.id ?? 0);
  const [efeitos, setEfeitos] = useState<Efeito[]>([]);
  const timersEfeitos = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timersEfeitos.current.forEach(clearTimeout), []);
  useEffect(() => {
    const novos = (estado.eventos ?? []).filter((ev) => ev.id > ultimoEvento.current);
    if (!novos.length) return;
    ultimoEvento.current = novos[novos.length - 1].id;
    const pos = (id: string) => {
      const u = estado.unidades.find((x) => x.id === id);
      return u ? px(u.pos) : { x: 0, y: 0 };
    };
    const timers = timersEfeitos.current;
    novos.forEach((ev, i) => {
      timers.push(
        setTimeout(() => {
          const origem = pos(ev.tipo === 'ataque' || ev.tipo === 'mover' ? ev.de : ev.para);
          const destino = pos(ev.tipo === 'ataque' ? ev.para : ev.tipo === 'mover' ? ev.de : ev.para);
          let estilo: EstiloAtaque | undefined;
          if (ev.tipo === 'ataque') {
            const a = estado.unidades.find((x) => x.id === ev.de);
            estilo = estiloDoAtaque(a?.defId, a?.lado ?? 'monstro', ev.alcance);
            tocar(estilo);
            timers.push(setTimeout(() => tocar(ev.erro ? 'erro' : ev.dano > 0 ? 'impacto' : 'escudo'), 300));
          } else if (ev.tipo === 'cura') tocar('cura');
          else if (ev.tipo === 'escudo') tocar('escudo');
          else if (ev.tipo === 'derrota') tocar('derrota');
          // mira no meio do corpo do token, não no chão
          const meio = ev.tipo === 'mover' ? 0 : 30;
          const ef: Efeito = { chave: Math.random(), ev, x1: origem.x, y1: origem.y - meio, x2: destino.x, y2: destino.y - meio, estilo };
          setEfeitos((l) => [...l, ef]);
          timers.push(setTimeout(() => setEfeitos((l) => l.filter((x) => x !== ef)), 900));
        }, i * INTERVALO_EFEITOS),
      );
    });
    // descarta referências de timers já disparados
    if (timers.length > 200) timersEfeitos.current = timers.slice(-100);
  }, [estado]);

  // caminhada: cada unidade anda casa por casa até a nova posição
  const ultimaPos = useRef<Record<string, Hex>>({});
  const viradoRef = useRef<Record<string, boolean>>({});
  const [poses, setPoses] = useState<Record<string, Pose>>({});
  const andando = useRef<Record<string, number>>({});
  useEffect(() => {
    const andaveis = new Set(estado.andaveis);
    for (const u of estado.unidades) {
      const antes = ultimaPos.current[u.id];
      ultimaPos.current[u.id] = u.pos;
      if (viradoRef.current[u.id] === undefined) viradoRef.current[u.id] = u.lado === 'monstro';
      if (!antes || (antes.q === u.pos.q && antes.r === u.pos.r) || u.fora) continue;
      const ocupados = new Set(estado.unidades.filter((o) => o.id !== u.id && !o.fora).map((o) => chave(o.pos)));
      const achado = caminho(antes, u.pos, { andaveis, bloqueados: ocupados });
      const rota = [antes, ...(achado && achado.length ? achado : [u.pos])];
      const ultimo = rota[rota.length - 1];
      if (ultimo.q !== u.pos.q || ultimo.r !== u.pos.r) rota.push(u.pos);
      const pontosRota = rota.map(px);
      if (andando.current[u.id]) cancelAnimationFrame(andando.current[u.id]);
      const inicio = performance.now();
      let passoTocado = -1;
      const total = (pontosRota.length - 1) * MS_POR_CASA;
      const quadro = (t: number) => {
        const dec = Math.min(t - inicio, total);
        const i = Math.min(pontosRota.length - 2, Math.floor(dec / MS_POR_CASA));
        const f = (dec - i * MS_POR_CASA) / MS_POR_CASA;
        const a = pontosRota[Math.max(0, i)];
        const b = pontosRota[Math.max(0, i) + 1] ?? a;
        if (i !== passoTocado && dec < total) {
          passoTocado = i;
          tocar('passo');
        }
        if (Math.abs(b.x - a.x) > 1) viradoRef.current[u.id] = b.x < a.x;
        const fim = dec >= total;
        setPoses((p) => ({
          ...p,
          [u.id]: {
            x: a.x + (b.x - a.x) * f,
            y: a.y + (b.y - a.y) * f,
            quadro: fim ? QUADRO_PARADO : Math.floor((dec / MS_POR_CASA) * 4) % 8,
            virado: viradoRef.current[u.id],
          },
        }));
        if (!fim) andando.current[u.id] = requestAnimationFrame(quadro);
        else {
          delete andando.current[u.id];
          setPoses((p) => {
            const { [u.id]: _, ...resto } = p;
            return resto;
          });
        }
      };
      andando.current[u.id] = requestAnimationFrame(quadro);
    }
  }, [estado]);
  useEffect(() => () => Object.values(andando.current).forEach(cancelAnimationFrame), []);

  const fundo = artePintada(`ambiente.${ambiente}`);

  return (
    <div className={`tabuleiro-moldura ambiente--${ambiente} ${fundo ? 'tabuleiro-moldura--pintada' : ''}`} style={fundo ? { backgroundImage: `url(${fundo})` } : undefined}>
      <svg className="tabuleiro" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="img" aria-label="Tabuleiro">
        {todos.map((h) => {
          const k = chave(h);
          const { x, y } = px(h);
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
            const pose = poses[u.id];
            const p = pose ?? { ...px(u.pos), quadro: QUADRO_PARADO, virado: viradoRef.current[u.id] ?? u.lado === 'monstro' };
            return { u, ...p };
          })
          // quem está mais embaixo na tela fica na frente
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map(({ u, x, y, quadro, virado }) => (
            <Unidade
              key={u.id}
              u={u}
              x={x}
              y={y}
              quadro={quadro}
              virado={virado}
              visual={visuais[u.arteId]}
              alvo={unidadesValidas.includes(u.id)}
              vez={vezDe === u.id}
              atingida={atingidos.includes(u.id)}
              onClick={unidadesValidas.includes(u.id) && onUnidade ? () => onUnidade(u.id) : undefined}
            />
          ))}
        {efeitos.map((f) => (
          <DesenhoEfeito key={f.chave} efeito={f} />
        ))}
        {flutuantes.map((f) => (
          <text key={f.chave} x={f.x} y={f.y} textAnchor="middle" className={`flutuante flutuante--${f.tipo}`}>
            {f.texto}
          </text>
        ))}
      </svg>
    </div>
  );
}

interface PropsUnidade {
  u: EstadoBatalha['unidades'][number];
  x: number;
  y: number;
  quadro: number;
  virado: boolean;
  visual?: Visual;
  alvo: boolean;
  vez: boolean;
  atingida: boolean;
  onClick?: () => void;
}

/** Miniatura em pé: caminhada em quadros quando existe; senão, o retrato num token. */
function Unidade({ u, x, y, quadro, virado, visual, alvo, vez, atingida, onClick }: PropsUnidade) {
  const urlAndar = artePintada(`andar.${u.arteId}`);
  const tam = useTamanho(urlAndar);
  const hw = u.chefe ? 22 : 17;
  const titulo = `${u.nome} — ${u.vida}/${u.vidaMax} de vida${u.escudo ? `, escudo ${u.escudo}` : ''}${u.condicoes.length ? ` · ${u.condicoes.map((c) => NOMES_CONDICAO[c]).join(', ')}` : ''}`;
  const altura = u.chefe ? ALTURA_MINI_CHEFE : ALTURA_MINI;
  let figura: ReactNode;
  let topo: number;
  if (urlAndar && tam) {
    const fw = tam.w / 8;
    // bichos compridos (lobo) não podem ocupar a casa vizinha
    const larguraMax = u.chefe ? 90 : 66;
    let alt = altura;
    let largura = (alt * fw) / tam.h;
    if (largura > larguraMax) {
      alt = (alt * larguraMax) / largura;
      largura = larguraMax;
    }
    topo = -alt + 2;
    figura = (
      <g transform={virado ? 'scale(-1 1)' : undefined}>
        <svg x={-largura / 2} y={topo} width={largura} height={alt} viewBox={`${quadro * fw} 0 ${fw} ${tam.h}`} preserveAspectRatio="xMidYMax meet" className="unidade__mini">
          <image href={urlAndar} width={tam.w} height={tam.h} />
        </svg>
      </g>
    );
  } else {
    const w = hw * 2 + 2;
    const h = u.chefe ? 60 : 47;
    const base = 2;
    topo = base - h;
    const silhueta = `M ${-w / 2} ${base} V ${topo + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${w / 2} ${topo + w / 2} V ${base} Z`;
    const alt = h + 6;
    figura = (
      <>
        <defs>
          <clipPath id={`recorte-${u.id}`}>
            <path d={silhueta} />
          </clipPath>
        </defs>
        <path d={silhueta} className="unidade__aro" />
        <g clipPath={`url(#recorte-${u.id})`}>
          <Retrato id={u.arteId} visual={visual} x={-alt / 2.4} y={topo - 2} largura={alt / 1.2} altura={alt} />
        </g>
        <path d={silhueta} className="unidade__borda" />
      </>
    );
  }
  return (
    <g
      className={`unidade unidade--${u.lado} ${alvo ? 'unidade--alvo' : ''} ${vez ? 'unidade--vez' : ''} ${u.chefe ? 'unidade--chefe' : ''} ${atingida ? 'unidade--atingida' : ''}`}
      transform={`translate(${x} ${y})`}
      onClick={onClick}
    >
      <title>{titulo}</title>
      <ellipse cx={0} cy={3} rx={hw + 6} ry={(hw + 6) * ACH * 0.5} className="unidade__sombra" />
      <ellipse cx={0} cy={1} rx={hw + 3} ry={(hw + 3) * ACH * 0.45} className="unidade__base" />
      <g className="unidade__figura">{figura}</g>
      <rect x={-16} y={10} width={32} height={4} rx={2} className="unidade__vida-fundo" />
      <rect x={-16} y={10} width={(32 * u.vida) / u.vidaMax} height={4} rx={2} className="unidade__vida" />
      {u.escudo > 0 && (
        <text x={hw} y={topo + 8} className="unidade__escudo">
          ◆{u.escudo}
        </text>
      )}
      {u.condicoes.length > 0 && <circle cx={-hw} cy={topo + 10} r={4} className="unidade__condicao" />}
      {/* área de clique generosa */}
      <rect x={-hw - 4} y={topo} width={(hw + 4) * 2} height={-topo + 14} fill="transparent" />
    </g>
  );
}

/** Desenho animado de um efeito (a animação está no CSS). */
function DesenhoEfeito({ efeito: f }: { efeito: Efeito }) {
  const ev = f.ev;
  if (ev.tipo === 'ataque') {
    const dx = f.x2 - f.x1;
    const dy = f.y2 - f.y1;
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    const corpo = ev.alcance > 1 || f.estilo === 'flecha' || f.estilo === 'magia' || f.estilo === 'chama' || f.estilo === 'sombra' || f.estilo === 'faca';
    if (corpo && Math.hypot(dx, dy) > T * 1.2) {
      return (
        <g transform={`translate(${f.x1} ${f.y1})`}>
          <g className={`projetil projetil--${f.estilo}`} style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties}>
            <g transform={`rotate(${ang})`}>{projetil(f.estilo)}</g>
          </g>
        </g>
      );
    }
    // corpo a corpo: cortes / impacto sobre o alvo
    return (
      <g transform={`translate(${f.x2} ${f.y2}) rotate(${ang})`} className={`golpe golpe--${f.estilo}`}>
        {f.estilo === 'pedra' ? (
          <>
            <circle r="14" className="golpe__onda" />
            <circle r="8" className="golpe__onda golpe__onda--2" />
          </>
        ) : (
          [-9, 0, 9].map((o) => <path key={o} d={`M -16 ${o - 10} Q 0 ${o} 16 ${o + 10}`} className="golpe__corte" />)
        )}
      </g>
    );
  }
  if (ev.tipo === 'cura')
    return (
      <g transform={`translate(${f.x2} ${f.y2})`} className="brilho-cura">
        {[-12, -4, 5, 12].map((x, i) => (
          <text key={i} x={x} y={8} style={{ animationDelay: `${i * 90}ms` }}>
            ✦
          </text>
        ))}
      </g>
    );
  if (ev.tipo === 'escudo')
    return (
      <g transform={`translate(${f.x2} ${f.y2})`}>
        <circle r="22" className="anel-escudo" />
      </g>
    );
  if (ev.tipo === 'derrota')
    return (
      <g transform={`translate(${f.x2} ${f.y2})`}>
        <circle r="18" className="fumaca-derrota" />
      </g>
    );
  return (
    <g transform={`translate(${f.x2} ${f.y2 + 2})`}>
      <ellipse rx="14" ry="4" className="poeira-passo" />
    </g>
  );
}

const projetil = (estilo?: EstiloAtaque) => {
  switch (estilo) {
    case 'flecha':
      return (
        <>
          <line x1="-14" y1="0" x2="8" y2="0" stroke="#d9c7a0" strokeWidth="2" />
          <path d="M 8 -4 L 15 0 L 8 4 Z" fill="#cfd6dc" />
          <path d="M -14 0 L -18 -4 M -14 0 L -18 4" stroke="#7fa7c9" strokeWidth="2" />
        </>
      );
    case 'faca':
      return <path d="M -6 -2 L 8 0 L -6 2 Z" fill="#dfe6ea" className="giro" />;
    case 'chama':
      return (
        <>
          <circle r="7" fill="#8fd3ff" opacity="0.9" />
          <circle r="11" fill="#3a8dde" opacity="0.35" />
        </>
      );
    case 'sombra':
      return (
        <>
          <circle r="7" fill="#5b2b7a" />
          <circle r="11" fill="#2a1038" opacity="0.5" />
        </>
      );
    default:
      return (
        <>
          <circle r="6" fill="#e9f3ff" />
          <circle r="11" fill="#7a9cff" opacity="0.45" />
        </>
      );
  }
};

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
