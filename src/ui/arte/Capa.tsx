import { artePintada } from './Retrato';

// Capa do jogo: arte pintada (src/assets/arte/capa.png) quando existir; senão a ilustração em SVG.

const FRAGMENTOS = [
  [-58, -20, -30], [-30, -52, 15], [6, -62, -10], [42, -44, 25], [60, -8, -20], [34, 28, 10], [-36, 26, -15],
];

export function Capa() {
  const url = artePintada('capa');
  return (
    <div className="capa-arte">
      {url ? (
        <img src={url} alt="A Estrela Partida" />
      ) : (
        <svg viewBox="0 0 960 420" role="img" aria-label="A Estrela Partida — ilustração da capa">
          <defs>
            <linearGradient id="capa-ceu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#05070b" />
              <stop offset="60%" stopColor="#121a28" />
              <stop offset="100%" stopColor="#1c2433" />
            </linearGradient>
            <radialGradient id="capa-estrela" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#bfe6ff" />
              <stop offset="60%" stopColor="#6cc3ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6cc3ff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="capa-farol" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#bfe6ff" />
              <stop offset="40%" stopColor="#6cc3ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6cc3ff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="capa-nevoa" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a93a6" stopOpacity="0" />
              <stop offset="100%" stopColor="#8a93a6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <rect width="960" height="420" fill="url(#capa-ceu)" />
          {Array.from({ length: 70 }, (_, i) => (
            <circle key={i} cx={(i * 137) % 960} cy={(i * 59) % 230} r={i % 7 === 0 ? 1.6 : 0.9} fill="#e9e1cf" opacity={0.3 + ((i * 13) % 50) / 100} className={i % 5 === 0 ? 'cintila' : undefined} />
          ))}

          {/* estrela partida */}
          <g transform="translate(600 120)">
            <circle r="120" fill="url(#capa-estrela)" opacity="0.55" className="pulsa" />
            <circle r="16" fill="#ffffff" />
            {FRAGMENTOS.map(([x, y, r], i) => (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`} className="fragmento" style={{ animationDelay: `${i * 0.4}s` }}>
                <polygon points="0,-11 6,0 0,11 -6,0" fill="#dff3ff" />
                <polygon points="0,-11 6,0 0,11 -6,0" fill="#6cc3ff" opacity="0.5" transform="scale(1.8)" />
              </g>
            ))}
            <path d="M-8 -6 L -58 -20 M6 -8 L 6 -62 M8 4 L 60 -8 M-6 8 L -36 26" stroke="#bfe6ff" strokeWidth="1" opacity="0.5" />
          </g>

          {/* montanhas e falésia */}
          <path d="M0 300 L 120 230 L 210 270 L 320 210 L 430 280 L 560 240 L 700 290 L 820 236 L 960 280 L 960 420 L 0 420 Z" fill="#0d121a" />
          <path d="M0 330 L 80 300 L 160 312 L 230 290 L 300 330 L 300 420 L 0 420 Z" fill="#0a0e14" />

          {/* farol */}
          <g transform="translate(200 230)">
            <circle cx="0" cy="-8" r="70" fill="url(#capa-farol)" className="pulsa" />
            <path d="M-6 -8 L -380 -60 L -380 40 Z" fill="#6cc3ff" opacity="0.07" />
            <path d="M6 -8 L 420 -70 L 420 30 Z" fill="#6cc3ff" opacity="0.08" />
            <polygon points="-14,80 -9,0 9,0 14,80" fill="#2a3242" />
            <rect x="-9" y="20" width="18" height="8" fill="#c8574d" opacity="0.7" />
            <rect x="-9" y="48" width="18" height="8" fill="#c8574d" opacity="0.7" />
            <rect x="-12" y="-20" width="24" height="20" fill="#1a2030" stroke="#c9a24a" strokeWidth="1.5" />
            <ellipse cx="0" cy="-10" rx="6" ry="8" fill="#bfe6ff" />
            <polygon points="-14,-20 0,-34 14,-20" fill="#1a2030" />
          </g>

          {/* cidade portuária */}
          <g fill="#121822">
            {[[300, 300, 40, 50], [345, 290, 30, 60], [380, 305, 46, 45], [430, 296, 28, 54], [462, 310, 40, 40]].map(([x, y, w, h], i) => (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} />
                <polygon points={`${x - 4},${y} ${x + w / 2},${y - 18} ${x + w + 4},${y}`} />
                <rect x={x + w / 2 - 3} y={y + 14} width="6" height="8" fill="#f2d27a" opacity="0.7" />
              </g>
            ))}
          </g>

          {/* mar e névoa */}
          <rect y="350" width="960" height="70" fill="#0b1018" />
          <path d="M0 360 q40 -8 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" stroke="#6cc3ff" strokeOpacity="0.25" fill="none" />
          <rect y="250" width="960" height="170" fill="url(#capa-nevoa)" className="nevoa-movel" />

          {/* heróis em silhueta */}
          <g fill="#06080c" transform="translate(690 300)">
            <path d="M0 80 L 4 30 Q 0 10 12 4 Q 24 10 20 30 L 24 80 Z" />
            <circle cx="12" cy="-4" r="9" />
            <path d="M40 80 L 42 40 Q 40 22 52 18 Q 64 22 62 40 L 64 80 Z" />
            <circle cx="52" cy="10" r="8" />
            <path d="M58 30 L 80 -6" stroke="#06080c" strokeWidth="3" />
            <path d="M84 80 Q 84 30 104 24 Q 124 30 124 80 Z" />
            <circle cx="104" cy="14" r="11" />
            <circle cx="104" cy="44" r="5" fill="#6cc3ff" className="pulsa" />
            <path d="M136 80 L 138 36 Q 136 20 148 16 Q 160 20 158 36 L 160 80 Z" />
            <polygon points="140,6 148,-14 156,6" />
          </g>
        </svg>
      )}
    </div>
  );
}
