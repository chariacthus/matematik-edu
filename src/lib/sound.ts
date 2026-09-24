type Kind = 'correct' | 'wrong' | 'levelUp' | 'badge';

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    // Så følger lyden iPhonens lydløs-knap i stedet for at spille alligevel.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'ambient';
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, at: number, length: number, type: OscillatorType = 'sine', level = 0.05) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t = c.currentTime + at;
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(level, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

const SOUNDS: Record<Kind, (c: AudioContext) => void> = {
  correct: (c) => {
    tone(c, 659.25, 0, 0.12);
    tone(c, 880, 0.08, 0.18);
  },
  wrong: (c) => tone(c, 196, 0, 0.2, 'triangle', 0.04),
  levelUp: (c) => {
    tone(c, 523.25, 0, 0.14);
    tone(c, 659.25, 0.1, 0.14);
    tone(c, 783.99, 0.2, 0.26);
  },
  badge: (c) => {
    tone(c, 1046.5, 0, 0.3, 'sine', 0.035);
    tone(c, 1318.5, 0.06, 0.34, 'sine', 0.02);
  },
};

export function play(kind: Kind) {
  if (!enabled) return;
  try {
    const c = audio();
    if (c) SOUNDS[kind](c);
  } catch {
    /* ingen lyd er bedre end en fejl midt i en opgave */
  }
}
