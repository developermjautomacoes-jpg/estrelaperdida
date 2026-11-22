import { useId, type ReactNode } from 'react';
import type { Visual } from '../../engine/types';

// Retratos dos personagens. Se existir arte pintada em src/assets/arte/<id>.(png|jpg|webp),
// ela é usada; senão o retrato é desenhado em SVG a partir do campo `visual` do JSON.

const PINTADAS = import.meta.glob('../../assets/arte/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const porId: Record<string, string> = Object.fromEntries(
  Object.entries(PINTADAS).map(([caminho, url]) => [caminho.split('/').pop()!.replace(/\.(png|jpe?g|webp)$/, ''), url]),
);

export const artePintada = (id: string): string | undefined => porId[id];

interface Props {
  id: string;
  visual?: Visual;
  /** Quando usado dentro de outro SVG (tabuleiro). */
  x?: number;
  y?: number;
  largura?: number;
  altura?: number;
  className?: string;
  titulo?: string;
}

const PADRAO: Visual = { forma: 'humano', pele: '#d9b896', cabelo: '#3a2a1a', roupa: '#3a4150', destaque: '#6cc3ff' };

export function Retrato({ id, visual = PADRAO, x, y, largura, altura, className, titulo }: Props) {
  const uid = useId().replace(/:/g, '');
  const url = artePintada(id);
  const v = visual;
  return (
    <svg viewBox="0 0 200 240" x={x} y={y} width={largura} height={altura} className={className} role="img" aria-label={titulo ?? id}>
      <defs>
        <radialGradient id={`luz-${uid}`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor={v.destaque} stopOpacity="0.55" />
          <stop offset="55%" stopColor={v.destaque} stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0b0e13" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`nevoa-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa3b2" stopOpacity="0" />
          <stop offset="100%" stopColor="#9aa3b2" stopOpacity="0.28" />
        </linearGradient>
        <clipPath id={`moldura-${uid}`}>
          <rect x="4" y="4" width="192" height="232" rx="14" />
        </clipPath>
      </defs>
      <g clipPath={`url(#moldura-${uid})`}>
        <rect width="200" height="240" fill="#11151c" />
        {url ? (
          <image href={url} width="200" height="240" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <rect width="200" height="240" fill={`url(#luz-${uid})`} />
            <Estrelas cor={v.destaque} />
            {desenhar(v, uid)}
            <rect y="150" width="200" height="90" fill={`url(#nevoa-${uid})`} />
          </>
        )}
      </g>
      <rect x="4" y="4" width="192" height="232" rx="14" fill="none" stroke="#5c4b2e" strokeWidth="3" />
      <rect x="9" y="9" width="182" height="222" rx="11" fill="none" stroke={v.destaque} strokeOpacity="0.45" strokeWidth="1" />
    </svg>
  );
}

function Estrelas({ cor }: { cor: string }) {
  const pts = [
    [24, 30], [170, 42], [150, 20], [36, 70], [182, 92], [14, 120], [60, 18], [128, 60],
  ];
  return (
    <g fill={cor} opacity="0.5">
      {pts.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 1.6 : 1} />
      ))}
    </g>
  );
}

const escurecer = (hex: string, f = 0.7) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

function desenhar(v: Visual, uid: string): ReactNode {
  switch (v.forma) {
    case 'sombra':
      return <Sombra v={v} />;
    case 'lobo':
      return <Lobo v={v} />;
    case 'cogumelo':
      return <Cogumelo v={v} />;
    case 'mimico':
      return <Mimico v={v} />;
    case 'sapo':
      return <Sapo v={v} />;
    case 'colosso':
      return <Colosso v={v} />;
    case 'polvo':
      return <Polvo v={v} />;
    case 'livro':
      return <LivroVivo v={v} />;
    case 'mascara':
      return <Mascara v={v} />;
    default:
      return <Humanoide v={v} uid={uid} />;
  }
}

// ---------------------------------------------------------------------------
// Humanoides: anões, elfos, humanos, goblins, vulpinos, golens, ocos, cavaleiros, reis, esqueletos

function Humanoide({ v, uid }: { v: Visual; uid: string }) {
  const largo = v.forma === 'ana' || v.forma === 'golem' || v.forma === 'cavaleiro' || v.forma === 'rei';
  const ombro = largo ? 82 : v.forma === 'goblin' ? 56 : 68;
  const cabecaY = v.forma === 'ana' ? 122 : v.forma === 'goblin' ? 128 : 112;
  const rx = v.forma === 'ana' ? 36 : v.forma === 'goblin' ? 30 : v.forma === 'golem' ? 38 : 31;
  const ry = v.forma === 'ana' ? 35 : v.forma === 'goblin' ? 30 : 38;
  const roupaEsc = escurecer(v.roupa, 0.75);
  const pedra = v.forma === 'golem';
  const metal = v.forma === 'cavaleiro' || v.forma === 'rei';
  const ossos = v.forma === 'esqueleto';
  const vazio = v.forma === 'oco';
  const raposa = v.forma === 'vulpino';
  const olhoCor = vazio ? '#0b0d10' : ossos || pedra ? v.destaque : '#1a1410';

  return (
    <g>
      {v.companheiro === 'coruja' && <Coruja x={44} y={150} />}
      {/* corpo */}
      <path d={`M${100 - ombro - 20} 240 C ${100 - ombro} 200, ${100 - ombro + 6} 178, 100 172 C ${100 + ombro - 6} 178, ${100 + ombro} 200, ${100 + ombro + 20} 240 Z`} fill={v.roupa} />
      <path d={`M${100 - ombro + 10} 240 C ${100 - ombro + 16} 210, ${100 - 20} 186, 100 184 L 100 240 Z`} fill={roupaEsc} opacity="0.6" />
      {metal && <path d={`M${100 - ombro} 205 Q 100 186 ${100 + ombro} 205`} stroke={v.destaque} strokeOpacity="0.5" strokeWidth="3" fill="none" />}
      {v.detalhe === 'cristais' && (
        <g fill={v.destaque} opacity="0.9">
          <polygon points="40,190 52,150 60,192" />
          <polygon points="140,192 150,148 162,190" />
          <polygon points="58,186 64,164 70,188" />
        </g>
      )}
      {v.detalhe === 'musgo' && (
        <g fill="#5f8a3a">
          <ellipse cx="52" cy="196" rx="18" ry="8" />
          <ellipse cx="150" cy="198" rx="16" ry="7" />
          <circle cx="60" cy="190" r="3" fill="#f2d27a" />
          <circle cx="146" cy="193" r="2.5" fill="#f2a0c0" />
        </g>
      )}
      {pedra && (
        <g>
          <path d="M100 186 l-6 14 l8 8 l-5 16" stroke={v.destaque} strokeWidth="4" fill="none" />
          <path d="M100 186 l-6 14 l8 8 l-5 16" stroke="#ffffff" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="98" cy="205" r="14" fill={v.destaque} opacity="0.25" />
        </g>
      )}
      {/* pescoço */}
      {!metal && <rect x={100 - 11} y={cabecaY + ry - 12} width="22" height="22" fill={ossos ? v.pele : escurecer(v.pele, 0.85)} />}

      {/* capuz por trás */}
      {v.detalhe === 'capuz' && <path d={`M${100 - rx - 14} ${cabecaY + 36} Q ${100 - rx - 18} ${cabecaY - ry - 16} 100 ${cabecaY - ry - 18} Q ${100 + rx + 18} ${cabecaY - ry - 16} ${100 + rx + 14} ${cabecaY + 36} Z`} fill={escurecer(v.roupa, 0.85)} />}

      {/* tranças por trás */}
      {v.detalhe === 'trancas' && v.cabelo && (
        <g fill={v.cabelo}>
          <path d={`M${100 - rx + 2} ${cabecaY} q -10 40 -4 76 l 10 -2 q -2 -36 6 -70 z`} />
          <path d={`M${100 + rx - 2} ${cabecaY} q 10 40 4 76 l -10 -2 q 2 -36 -6 -70 z`} />
        </g>
      )}

      {/* orelhas */}
      {(v.forma === 'elfo' || v.forma === 'goblin') && (
        <g fill={v.pele}>
          <polygon points={`${100 - rx + 4},${cabecaY - 4} ${100 - rx - (v.forma === 'goblin' ? 30 : 18)},${cabecaY - 22} ${100 - rx + 6},${cabecaY + 10}`} />
          <polygon points={`${100 + rx - 4},${cabecaY - 4} ${100 + rx + (v.forma === 'goblin' ? 30 : 18)},${cabecaY - 22} ${100 + rx - 6},${cabecaY + 10}`} />
        </g>
      )}
      {raposa && (
        <g fill={v.pele}>
          <polygon points={`${100 - 30},${cabecaY - 20} ${100 - 38},${cabecaY - 62} ${100 - 8},${cabecaY - 34}`} />
          <polygon points={`${100 + 30},${cabecaY - 20} ${100 + 38},${cabecaY - 62} ${100 + 8},${cabecaY - 34}`} />
          <polygon points={`${100 - 28},${cabecaY - 26} ${100 - 33},${cabecaY - 52} ${100 - 14},${cabecaY - 34}`} fill="#3a2a2a" />
          <polygon points={`${100 + 28},${cabecaY - 26} ${100 + 33},${cabecaY - 52} ${100 + 14},${cabecaY - 34}`} fill="#3a2a2a" />
        </g>
      )}

      {/* cabeça */}
      {pedra ? (
        <rect x={100 - rx} y={cabecaY - ry} width={rx * 2} height={ry * 2} rx="18" fill={v.pele} stroke={escurecer(v.pele, 0.6)} strokeWidth="2" />
      ) : metal ? (
        <path d={`M${100 - rx - 4} ${cabecaY + ry} L ${100 - rx - 4} ${cabecaY - 6} Q 100 ${cabecaY - ry - 26} ${100 + rx + 4} ${cabecaY - 6} L ${100 + rx + 4} ${cabecaY + ry} Z`} fill={v.roupa} stroke={escurecer(v.roupa, 0.5)} strokeWidth="2" />
      ) : (
        <ellipse cx="100" cy={cabecaY} rx={rx} ry={ry} fill={v.pele} />
      )}
      {raposa && (
        <g>
          <ellipse cx="100" cy={cabecaY + 18} rx="18" ry="14" fill="#f3e6d6" />
          <ellipse cx="100" cy={cabecaY + 10} rx="5" ry="3.5" fill="#1a1410" />
        </g>
      )}
      {pedra && (
        <path d={`M${100 - 20} ${cabecaY - ry + 8} l 8 12 l -4 10`} stroke={escurecer(v.pele, 0.55)} strokeWidth="2" fill="none" />
      )}

      {/* rosto */}
      {v.forma === 'rei' ? (
        <ellipse cx="100" cy={cabecaY + 8} rx="22" ry="27" fill={v.pele} stroke="#9aa3b2" strokeWidth="1.5" />
      ) : v.forma === 'cavaleiro' ? (
        <g>
          <rect x={100 - 24} y={cabecaY - 2} width="48" height="6" rx="2" fill="#0b0d10" />
          <path d={`M100 ${cabecaY - 2} q -10 -12 -4 -26 q 8 10 4 26`} fill={v.destaque} opacity="0.25" />
        </g>
      ) : (
        <g>
          {v.detalhe === 'olhos-vendados' ? (
            <rect x={100 - rx} y={cabecaY - 9} width={rx * 2} height="10" fill="#e8e0cc" />
          ) : (
            <g>
              <ellipse cx={100 - 12} cy={cabecaY - 3} rx={vazio || ossos ? 6 : 4} ry={vazio || ossos ? 7 : 4.5} fill={olhoCor} />
              {v.detalhe === 'tapa-olho' ? (
                <g>
                  <path d={`M${100 - rx} ${cabecaY - 16} L ${100 + rx} ${cabecaY + 6}`} stroke="#1a1410" strokeWidth="3" />
                  <ellipse cx={100 + 12} cy={cabecaY - 3} rx="8" ry="7" fill="#1a1410" />
                </g>
              ) : (
                <ellipse cx={100 + 12} cy={cabecaY - 3} rx={vazio || ossos ? 6 : 4} ry={vazio || ossos ? 7 : 4.5} fill={olhoCor} />
              )}
              {(pedra || ossos) && (
                <g fill={v.destaque} opacity="0.5">
                  <circle cx={100 - 12} cy={cabecaY - 3} r="9" />
                  <circle cx={100 + 12} cy={cabecaY - 3} r="9" />
                </g>
              )}
            </g>
          )}
          {!raposa && (
            <path d={vazio ? `M${100 - 7} ${cabecaY + 20} q 7 -4 14 0` : `M${100 - 8} ${cabecaY + 17} q 8 6 16 0`} stroke={escurecer(v.pele, 0.5)} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          )}
          {ossos && <path d={`M${100 - 10} ${cabecaY + 22} h 20`} stroke="#1a1410" strokeWidth="1.5" strokeDasharray="3 2" />}
          {vazio && <path d={`M100 ${cabecaY + 22} q -6 -16 2 -30 q 10 12 -2 30`} fill="#c8cdd6" opacity="0.35" />}
        </g>
      )}

      {/* barba */}
      {v.detalhe === 'barba' && (
        <path d={`M${100 - rx + 4} ${cabecaY + 6} Q 100 ${cabecaY + ry + 34} ${100 + rx - 4} ${cabecaY + 6} Q 100 ${cabecaY + 26} ${100 - rx + 4} ${cabecaY + 6} Z`} fill={v.cabelo ?? v.pele} />
      )}

      {/* cabelo por cima */}
      {v.cabelo && !pedra && !metal && !ossos && !raposa && v.detalhe !== 'careca' && v.detalhe !== 'capuz' && (
        <path d={`M${100 - rx - 2} ${cabecaY - 2} Q ${100 - rx - 4} ${cabecaY - ry - 12} 100 ${cabecaY - ry - 8} Q ${100 + rx + 4} ${cabecaY - ry - 12} ${100 + rx + 2} ${cabecaY - 2} Q ${100 + rx - 6} ${cabecaY - ry + 6} ${100 + 6} ${cabecaY - ry + 12} Q ${100 - 10} ${cabecaY - ry + 4} ${100 - rx - 2} ${cabecaY - 2} Z`} fill={v.cabelo} />
      )}
      {v.detalhe === 'coque' && v.cabelo && <circle cx="100" cy={cabecaY - ry - 10} r="14" fill={v.cabelo} />}
      {v.detalhe === 'capuz' && <path d={`M${100 - rx - 6} ${cabecaY + 10} Q ${100 - rx - 8} ${cabecaY - ry - 10} 100 ${cabecaY - ry - 12} Q ${100 + rx + 8} ${cabecaY - ry - 10} ${100 + rx + 6} ${cabecaY + 10} Q ${100 + rx - 2} ${cabecaY - ry + 4} 100 ${cabecaY - ry + 2} Q ${100 - rx + 2} ${cabecaY - ry + 4} ${100 - rx - 6} ${cabecaY + 10} Z`} fill={v.roupa} />}
      {v.detalhe === 'chapeu' && (
        <g fill={escurecer(v.roupa, 0.9)}>
          <ellipse cx="100" cy={cabecaY - ry + 4} rx={rx + 26} ry="9" />
          <path d={`M${100 - rx + 6} ${cabecaY - ry + 4} Q 100 ${cabecaY - ry - 40} ${100 + rx - 6} ${cabecaY - ry + 4} Z`} />
          <path d={`M${100 + 14} ${cabecaY - ry - 14} q 26 -20 34 -6`} stroke={v.destaque} strokeWidth="4" fill="none" />
        </g>
      )}
      {v.detalhe === 'coroa' && (
        <polygon
          points={`${100 - 30},${cabecaY - ry - 2} ${100 - 30},${cabecaY - ry - 22} ${100 - 18},${cabecaY - ry - 10} ${100 - 6},${cabecaY - ry - 28} ${100 + 6},${cabecaY - ry - 10} ${100 + 18},${cabecaY - ry - 26} ${100 + 30},${cabecaY - ry - 10} ${100 + 30},${cabecaY - ry - 2}`}
          fill={v.destaque}
          stroke={escurecer(v.destaque, 0.6)}
          strokeWidth="1.5"
        />
      )}
      {v.detalhe === 'cristais' && (
        <g fill={v.destaque}>
          <polygon points={`${100 - 22},${cabecaY - ry + 6} ${100 - 16},${cabecaY - ry - 26} ${100 - 8},${cabecaY - ry + 4}`} />
          <polygon points={`${100 - 6},${cabecaY - ry + 2} ${100 + 2},${cabecaY - ry - 36} ${100 + 10},${cabecaY - ry + 2}`} />
          <polygon points={`${100 + 10},${cabecaY - ry + 4} ${100 + 18},${cabecaY - ry - 22} ${100 + 24},${cabecaY - ry + 6}`} />
        </g>
      )}
      {v.detalhe === 'musgo' && <ellipse cx="96" cy={cabecaY - ry + 4} rx="26" ry="8" fill="#5f8a3a" />}
      {(metal || vazio) && <rect y="168" width="200" height="72" fill="#c8cdd6" opacity="0.08" />}

      {v.item && <Item tipo={v.item} cor={v.destaque} uid={uid} />}
      {v.companheiro === 'lince' && <Lince x={40} y={214} />}
    </g>
  );
}

function Item({ tipo, cor, uid }: { tipo: NonNullable<Visual['item']>; cor: string; uid: string }) {
  const brilho = (
    <circle cx="0" cy="0" r="18" fill={cor} opacity="0.3" filter={`url(#borrar-${uid})`} />
  );
  const g = (filhos: ReactNode) => (
    <g transform="translate(156 186)">
      <defs>
        <filter id={`borrar-${uid}`}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {filhos}
    </g>
  );
  switch (tipo) {
    case 'martelo':
      return g(<>{brilho}<rect x="-3" y="-6" width="6" height="46" fill="#6b4a2a" /><rect x="-18" y="-22" width="36" height="20" rx="3" fill="#6a6f78" stroke={cor} strokeWidth="2" /></>);
    case 'escudo':
      return g(<path d="M-22 -26 h44 v20 q0 26 -22 38 q-22 -12 -22 -38 z" fill="#5a5f68" stroke={cor} strokeWidth="3" />);
    case 'arco':
      return g(<><path d="M-10 -34 q30 34 0 68" stroke="#8a6a3a" strokeWidth="4" fill="none" /><path d="M-10 -34 L -10 34" stroke="#e9e1cf" strokeWidth="1" /></>);
    case 'besta':
      return g(<><rect x="-4" y="-10" width="8" height="40" fill="#6b4a2a" /><path d="M-26 -6 q26 -12 52 0" stroke="#5a5f68" strokeWidth="4" fill="none" /><path d="M0 -24 v20" stroke={cor} strokeWidth="2" /></>);
    case 'adagas':
      return g(<><path d="M-14 24 L 4 -26 L 8 -24 L -8 26 Z" fill="#c8cdd6" /><path d="M14 24 L -4 -26 L -8 -24 L 8 26 Z" fill="#c8cdd6" /><circle cx="-10" cy="24" r="4" fill={cor} /><circle cx="10" cy="24" r="4" fill={cor} /></>);
    case 'lanterna':
      return g(<>{brilho}<circle r="26" fill={cor} opacity="0.2" /><rect x="-12" y="-16" width="24" height="30" rx="4" fill="#3a3a3a" stroke="#c9a24a" strokeWidth="2" /><ellipse cx="0" cy="0" rx="7" ry="10" fill={cor} /><path d="M-8 -22 q8 -10 16 0" stroke="#c9a24a" strokeWidth="2" fill="none" /></>);
    case 'sino':
      return g(<><path d="M-16 14 q0 -32 16 -34 q16 2 16 34 z" fill="#c9a24a" stroke={cor} strokeWidth="1.5" /><circle cx="0" cy="18" r="4" fill="#8a6a2a" /></>);
    case 'livro':
      return g(<><rect x="-22" y="-16" width="44" height="32" rx="3" fill="#7a4a2a" stroke="#c9a24a" strokeWidth="2" /><circle cx="-8" cy="-2" r="5" fill="#f3e6d6" /><circle cx="8" cy="-2" r="5" fill="#f3e6d6" /><circle cx="-8" cy="-2" r="2" fill="#1a1410" /><circle cx="8" cy="-2" r="2" fill="#1a1410" /><path d="M-14 -12 l8 3 M14 -12 l-8 3" stroke="#3a2a1a" strokeWidth="2" /></>);
    case 'cajado':
      return g(<><rect x="-3" y="-30" width="6" height="70" fill="#6b4a2a" />{brilho}<circle cy="-34" r="7" fill={cor} /></>);
    case 'runa':
      return g(<>{brilho}<circle r="22" fill="none" stroke={cor} strokeWidth="2.5" /><circle r="14" fill="none" stroke={cor} strokeWidth="1.2" /><path d="M0 -14 L 0 14 M-12 -7 L 12 7 M-12 7 L 12 -7" stroke={cor} strokeWidth="1.5" /></>);
    case 'leque':
      return g(<path d="M0 20 L -24 -14 Q 0 -30 24 -14 Z" fill={cor} opacity="0.8" />);
    case 'leme':
      return g(<><circle r="20" fill="none" stroke="#8a6a3a" strokeWidth="4" /><circle r="5" fill="#8a6a3a" />{[0, 45, 90, 135].map((a) => <rect key={a} x="-2" y="-28" width="4" height="56" fill="#8a6a3a" transform={`rotate(${a})`} />)}</>);
  }
}

function Coruja({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="10" rx="14" ry="18" fill="#8a8a92" />
      <circle cx="0" cy="-8" r="12" fill="#9a9aa2" />
      <circle cx="-5" cy="-9" r="4" fill="#f5c542" />
      <circle cx="5" cy="-9" r="4" fill="#f5c542" />
      <circle cx="-5" cy="-9" r="1.6" fill="#1a1410" />
      <circle cx="5" cy="-9" r="1.6" fill="#1a1410" />
      <polygon points="-10,-18 -6,-26 -3,-18" fill="#9a9aa2" />
      <polygon points="10,-18 6,-26 3,-18" fill="#9a9aa2" />
      <polygon points="0,-5 -2,-1 2,-1" fill="#c9a24a" />
    </g>
  );
}

function Lince({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="22" ry="18" fill="#c99a5a" />
      <polygon points="-18,-8 -14,-30 -6,-14" fill="#c99a5a" />
      <polygon points="18,-8 14,-30 6,-14" fill="#c99a5a" />
      <path d="M-14 -30 v-6 M14 -30 v-6" stroke="#1a1410" strokeWidth="2" />
      <ellipse cx="-7" cy="-2" rx="3" ry="4" fill="#3a5a2a" />
      <ellipse cx="7" cy="-2" rx="3" ry="4" fill="#3a5a2a" />
      <ellipse cx="0" cy="8" rx="8" ry="5" fill="#f3e6d6" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Criaturas

function Sombra({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M100 52 C 150 52 160 120 156 170 C 150 210 170 230 150 240 L 50 240 C 30 230 50 210 44 170 C 40 120 50 52 100 52 Z" fill={v.roupa} opacity="0.85" />
      <path d="M100 70 C 136 70 140 120 136 160 C 130 200 120 220 100 240 C 80 220 70 200 64 160 C 60 120 64 70 100 70 Z" fill={v.pele} opacity="0.35" />
      <ellipse cx="84" cy="116" rx="8" ry="5" fill={v.destaque} />
      <ellipse cx="116" cy="116" rx="8" ry="5" fill={v.destaque} />
      <path d="M86 146 q14 10 28 0" stroke={v.destaque} strokeWidth="2" fill="none" opacity="0.6" />
      <path d="M40 200 q20 -20 40 0 q20 20 40 0 q20 -20 40 0" stroke={v.pele} strokeWidth="2" fill="none" opacity="0.4" />
    </g>
  );
}

function Lobo({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M40 240 C 40 190 60 170 100 166 C 140 170 160 190 160 240 Z" fill={v.roupa} />
      <polygon points="56,108 62,40 92,84" fill={v.pele} />
      <polygon points="144,108 138,40 108,84" fill={v.pele} />
      <path d="M52 110 Q 100 60 148 110 L 132 160 Q 100 200 68 160 Z" fill={v.pele} />
      <path d="M78 150 Q 100 196 122 150 Q 100 166 78 150 Z" fill={escurecer(v.pele, 0.6)} />
      <ellipse cx="100" cy="166" rx="9" ry="6" fill="#1a1410" />
      <path d="M72 116 l18 8 M128 116 l-18 8" stroke={v.destaque} strokeWidth="5" strokeLinecap="round" />
      <path d="M86 178 l4 10 l4 -10 M106 178 l4 10 l4 -10" fill="#f3e6d6" />
    </g>
  );
}

function Cogumelo({ v }: { v: Visual }) {
  return (
    <g>
      {[30, 60, 150, 170, 120].map((cx, i) => (
        <circle key={i} cx={cx} cy={60 + i * 24} r={2 + (i % 2)} fill={v.destaque} opacity="0.8" />
      ))}
      <path d="M70 140 Q 66 200 76 240 L 124 240 Q 134 200 130 140 Z" fill={v.roupa} />
      <path d="M30 140 Q 30 60 100 56 Q 170 60 170 140 Q 100 156 30 140 Z" fill={v.pele} />
      {[[60, 100, 10], [100, 80, 12], [140, 104, 9], [84, 124, 7], [124, 128, 6]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#f3e6d6" />
      ))}
      <path d="M84 168 l10 6 M116 168 l-10 6" stroke="#1a1410" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="88" cy="180" rx="4" ry="5" fill="#1a1410" />
      <ellipse cx="112" cy="180" rx="4" ry="5" fill="#1a1410" />
      <path d="M90 204 q10 -8 20 0" stroke="#1a1410" strokeWidth="3" fill="none" />
    </g>
  );
}

function Mimico({ v }: { v: Visual }) {
  return (
    <g>
      <rect x="34" y="140" width="132" height="86" rx="8" fill={v.pele} stroke={v.roupa} strokeWidth="4" />
      <path d="M34 140 Q 30 70 100 64 Q 170 70 166 140 L 150 120 Q 100 90 50 120 Z" fill={escurecer(v.pele, 0.85)} stroke={v.roupa} strokeWidth="4" />
      <path d="M44 138 Q 100 172 156 138 L 156 150 Q 100 196 44 150 Z" fill="#3a0c10" />
      {[54, 70, 86, 102, 118, 134].map((x) => (
        <polygon key={x} points={`${x},140 ${x + 8},${156 + (x % 3) * 2} ${x + 14},143`} fill="#f3e6d6" />
      ))}
      <path d="M90 160 q20 30 50 20" stroke={v.destaque} strokeWidth="9" fill="none" strokeLinecap="round" />
      <circle cx="78" cy="104" r="7" fill={v.destaque} />
      <circle cx="122" cy="104" r="7" fill={v.destaque} />
      <circle cx="56" cy="232" r="6" fill={v.roupa} />
      <circle cx="74" cy="234" r="5" fill={v.roupa} />
    </g>
  );
}

function Sapo({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M10 240 Q 20 150 100 140 Q 180 150 190 240 Z" fill={escurecer(v.pele, 0.85)} />
      <path d="M22 170 Q 30 92 100 90 Q 170 92 178 170 Q 100 210 22 170 Z" fill={v.pele} />
      <circle cx="62" cy="96" r="22" fill={v.pele} />
      <circle cx="138" cy="96" r="22" fill={v.pele} />
      <circle cx="62" cy="96" r="13" fill="#f5c542" />
      <circle cx="138" cy="96" r="13" fill="#f5c542" />
      <rect x="57" y="88" width="10" height="16" rx="4" fill="#1a1410" />
      <rect x="133" y="88" width="10" height="16" rx="4" fill="#1a1410" />
      <path d="M40 158 Q 100 192 160 158" stroke="#1a1410" strokeWidth="4" fill="none" />
      <circle cx="70" cy="132" r="5" fill={escurecer(v.pele, 0.7)} />
      <circle cx="130" cy="138" r="4" fill={escurecer(v.pele, 0.7)} />
      <polygon points="70,72 70,46 84,60 100,38 116,60 130,46 130,72" fill={v.destaque} stroke={escurecer(v.destaque, 0.6)} strokeWidth="2" />
      <polygon points="96,58 100,46 104,58 100,66" fill="#7cc8ff" />
    </g>
  );
}

function Colosso({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M0 240 L 10 150 Q 100 120 190 150 L 200 240 Z" fill={v.roupa} />
      <rect x="54" y="40" width="92" height="96" rx="16" fill={v.pele} stroke={escurecer(v.pele, 0.55)} strokeWidth="3" />
      <rect x="66" y="78" width="22" height="10" fill={v.destaque} opacity="0.85" />
      <rect x="112" y="78" width="22" height="10" fill={v.destaque} opacity="0.85" />
      <path d="M66 52 l14 16 l-6 10 M134 116 l-12 -10 l4 -14" stroke={escurecer(v.pele, 0.5)} strokeWidth="3" fill="none" />
      <path d="M100 160 l-10 20 l12 12 l-8 26" stroke={v.destaque} strokeWidth="6" fill="none" />
      <circle cx="98" cy="186" r="22" fill={v.destaque} opacity="0.25" />
      <rect y="150" width="200" height="90" fill="#c8cdd6" opacity="0.1" />
    </g>
  );
}

function Polvo({ v }: { v: Visual }) {
  return (
    <g>
      {[-60, -36, -12, 12, 36, 60].map((dx, i) => (
        <path key={i} d={`M${100 + dx * 0.4} 160 q ${dx} 30 ${dx * 1.3} 70`} stroke={v.pele} strokeWidth="14" fill="none" strokeLinecap="round" />
      ))}
      <rect x="66" y="150" width="68" height="60" rx="6" fill={v.roupa} />
      <ellipse cx="100" cy="112" rx="56" ry="58" fill={v.pele} />
      <circle cx="80" cy="112" r="11" fill="#f3e6d6" />
      <circle cx="120" cy="112" r="11" fill="#f3e6d6" />
      <circle cx="82" cy="114" r="5" fill="#1a1410" />
      <circle cx="122" cy="114" r="5" fill="#1a1410" />
      <path d="M84 140 q16 12 32 0" stroke="#1a1410" strokeWidth="3" fill="none" />
      <g transform="translate(150 150)">
        <rect x="-12" y="-14" width="24" height="28" rx="4" fill={v.destaque} />
        <rect x="-12" y="-18" width="24" height="8" rx="3" fill="#f3e6d6" />
      </g>
      <g transform="translate(48 156)">
        <rect x="-10" y="-12" width="20" height="24" rx="4" fill={v.destaque} />
      </g>
    </g>
  );
}

function LivroVivo({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M28 160 Q 100 130 172 160 L 172 210 Q 100 186 28 210 Z" fill="#efe4cc" />
      <rect x="40" y="62" width="120" height="110" rx="8" fill={v.pele} stroke={v.roupa} strokeWidth="4" />
      <rect x="52" y="74" width="96" height="86" rx="4" fill="none" stroke={v.roupa} strokeWidth="2" />
      <ellipse cx="80" cy="110" rx="13" ry="14" fill="#f3e6d6" />
      <ellipse cx="120" cy="110" rx="13" ry="14" fill="#f3e6d6" />
      <circle cx="82" cy="113" r="6" fill="#1a1410" />
      <circle cx="118" cy="113" r="6" fill="#1a1410" />
      <path d="M64 90 l26 8 M136 90 l-26 8" stroke="#e8e0cc" strokeWidth="6" strokeLinecap="round" />
      <path d="M84 144 q16 -8 32 0" stroke="#1a1410" strokeWidth="3" fill="none" />
      <circle cx="100" cy="180" r="30" fill={v.destaque} opacity="0.18" />
    </g>
  );
}

function Mascara({ v }: { v: Visual }) {
  return (
    <g>
      <path d="M30 240 Q 40 160 100 150 Q 160 160 170 240 Z" fill={v.roupa} />
      <path d="M70 240 Q 100 180 130 240" fill={escurecer(v.roupa, 0.7)} />
      <ellipse cx="100" cy="104" rx="36" ry="44" fill="#2a1a24" />
      <path d="M68 96 Q 100 60 132 96 Q 130 140 100 152 Q 70 140 68 96 Z" fill={v.pele} />
      <path d="M78 98 q10 -8 20 0 q-10 6 -20 0 Z M102 98 q10 -8 20 0 q-10 6 -20 0 Z" fill="#1a1410" />
      <path d="M90 130 q10 6 20 0" stroke={v.destaque} strokeWidth="2.5" fill="none" />
      <path d="M68 70 q32 -30 64 0" stroke={v.destaque} strokeWidth="3" fill="none" />
      {[[34, 60, -14], [166, 74, 12], [40, 150, 8], [162, 150, -10]].map(([cx, cy, r], i) => (
        <g key={i} transform={`translate(${cx} ${cy}) rotate(${r})`} opacity="0.75">
          <path d="M-14 -4 Q 0 -18 14 -4 Q 12 14 0 18 Q -12 14 -14 -4 Z" fill={v.pele} />
          <circle cx="-5" cy="-2" r="2.5" fill="#1a1410" />
          <circle cx="5" cy="-2" r="2.5" fill="#1a1410" />
        </g>
      ))}
    </g>
  );
}
