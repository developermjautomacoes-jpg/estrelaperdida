// Efeitos sonoros sintetizados com Web Audio: nenhum arquivo, nenhum custo.
// Cada som é curto e suave (o jogo é para crianças), e tudo pode ser silenciado.

export type Som =
  | 'flecha'
  | 'magia'
  | 'chama'
  | 'faca'
  | 'golpe'
  | 'pedra'
  | 'garra'
  | 'sombra'
  | 'impacto'
  | 'erro'
  | 'cura'
  | 'escudo'
  | 'passo'
  | 'derrota'
  | 'carta'
  | 'vitoria'
  | 'fim';

const CHAVE_MUDO = 'estrela.som.mudo';
let ctx: AudioContext | undefined;
let mudo = lerMudo();

function lerMudo() {
  try {
    return localStorage.getItem(CHAVE_MUDO) === '1';
  } catch {
    return false;
  }
}

export const somMudo = () => mudo;
export const alternarSom = () => {
  mudo = !mudo;
  try {
    localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0');
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  return mudo;
};

const audio = () => {
  if (typeof window === 'undefined') return undefined;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return undefined;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const saida = (c: AudioContext, volume: number) => {
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(c.destination);
  return g;
};

/** Nota com envelope rápido. */
const tom = (c: AudioContext, destino: AudioNode, freq: number, ini: number, dur: number, tipo: OscillatorType = 'sine', freqFim?: number, vol = 0.5) => {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, ini);
  if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, ini + dur);
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  o.connect(g).connect(destino);
  o.start(ini);
  o.stop(ini + dur + 0.02);
};

/** Ruído filtrado (vento, corte, poeira). */
const ruido = (c: AudioContext, destino: AudioNode, ini: number, dur: number, filtro: BiquadFilterType, freq: number, freqFim?: number, vol = 0.5) => {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filtro;
  f.frequency.setValueAtTime(freq, ini);
  if (freqFim) f.frequency.exponentialRampToValueAtTime(freqFim, ini + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, ini);
  g.gain.exponentialRampToValueAtTime(vol, ini + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ini + dur);
  src.connect(f).connect(g).connect(destino);
  src.start(ini);
  src.stop(ini + dur + 0.02);
};

export function tocar(som: Som) {
  if (mudo) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const s = saida(c, 0.35);
  switch (som) {
    case 'flecha':
      ruido(c, s, t, 0.28, 'bandpass', 2400, 700, 0.6);
      tom(c, s, 900, t, 0.12, 'triangle', 500, 0.15);
      break;
    case 'magia':
      [660, 880, 1175, 1568].forEach((f, i) => tom(c, s, f, t + i * 0.05, 0.25, 'sine', f * 1.02, 0.25));
      ruido(c, s, t, 0.4, 'highpass', 3000, 6000, 0.12);
      break;
    case 'chama':
      ruido(c, s, t, 0.45, 'lowpass', 600, 2500, 0.5);
      tom(c, s, 220, t, 0.35, 'sawtooth', 440, 0.08);
      break;
    case 'faca':
      ruido(c, s, t, 0.12, 'highpass', 4000, 8000, 0.5);
      tom(c, s, 1800, t + 0.02, 0.08, 'square', 1200, 0.06);
      break;
    case 'golpe':
      ruido(c, s, t, 0.15, 'bandpass', 1200, 300, 0.6);
      tom(c, s, 140, t + 0.05, 0.2, 'sine', 60, 0.6);
      break;
    case 'pedra':
      tom(c, s, 90, t, 0.35, 'sine', 40, 0.8);
      ruido(c, s, t, 0.4, 'lowpass', 500, 120, 0.5);
      break;
    case 'garra':
      [0, 0.06, 0.12].forEach((d) => ruido(c, s, t + d, 0.08, 'bandpass', 3000, 1500, 0.4));
      break;
    case 'sombra':
      tom(c, s, 180, t, 0.45, 'sawtooth', 70, 0.12);
      ruido(c, s, t, 0.45, 'lowpass', 900, 200, 0.3);
      break;
    case 'impacto':
      tom(c, s, 160, t, 0.18, 'sine', 70, 0.7);
      ruido(c, s, t, 0.1, 'lowpass', 1500, 400, 0.3);
      break;
    case 'erro':
      tom(c, s, 330, t, 0.15, 'triangle', 220, 0.25);
      tom(c, s, 220, t + 0.15, 0.2, 'triangle', 160, 0.25);
      break;
    case 'cura':
      [523, 659, 784, 1047].forEach((f, i) => tom(c, s, f, t + i * 0.08, 0.4, 'sine', undefined, 0.22));
      break;
    case 'escudo':
      tom(c, s, 880, t, 0.5, 'triangle', 860, 0.25);
      tom(c, s, 1320, t, 0.4, 'sine', undefined, 0.12);
      break;
    case 'passo':
      tom(c, s, 120, t, 0.07, 'sine', 80, 0.25);
      break;
    case 'derrota':
      tom(c, s, 392, t, 0.25, 'triangle', 330, 0.3);
      tom(c, s, 262, t + 0.2, 0.45, 'triangle', 196, 0.3);
      break;
    case 'carta':
      ruido(c, s, t, 0.08, 'bandpass', 2500, 1800, 0.25);
      break;
    case 'vitoria':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tom(c, s, f, t + i * 0.12, i === 4 ? 0.9 : 0.25, 'triangle', undefined, 0.3));
      break;
    case 'fim':
      [392, 349, 311, 262].forEach((f, i) => tom(c, s, f, t + i * 0.22, 0.4, 'triangle', undefined, 0.25));
      break;
  }
}

/** Som e estilo visual do ataque conforme quem ataca. */
export type EstiloAtaque = 'flecha' | 'magia' | 'chama' | 'faca' | 'golpe' | 'pedra' | 'garra' | 'sombra';

export const estiloDoAtaque = (classe: string | undefined, lado: 'heroi' | 'monstro', alcance: number): EstiloAtaque => {
  if (lado === 'monstro') return alcance > 1 ? 'sombra' : 'garra';
  const c = classe ?? '';
  if (c.includes('atirador')) return 'flecha';
  if (c.includes('mago')) return 'magia';
  if (c.includes('curandeiro')) return 'chama';
  if (c.includes('ladino')) return alcance > 1 ? 'faca' : 'golpe';
  if (c.includes('protetor')) return 'pedra';
  return 'golpe';
};
