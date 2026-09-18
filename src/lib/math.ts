import type { Frac, Rng } from '../types';

/* ------------------------------------------------------------------ */
/* Deterministisk tilfældighed                                         */
/* ------------------------------------------------------------------ */

/**
 * mulberry32 — lille, hurtig og deterministisk. At den er deterministisk
 * er ikke kosmetik: det gør opgavegeneratorerne testbare, og det gør at en
 * opgave kan genskabes præcist, fx når eleven vender tilbage til den.
 */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    int: (min, max) => {
      if (max < min) [min, max] = [max, min];
      return Math.floor(next() * (max - min + 1)) + min;
    },
    nonZero: (min, max) => {
      for (let i = 0; i < 40; i++) {
        const v = rng.int(min, max);
        if (v !== 0) return v;
      }
      return min === 0 ? max || 1 : min;
    },
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    sample: <T,>(items: readonly T[], n: number): T[] => rng.shuffle(items).slice(0, n),
    shuffle: <T,>(items: readonly T[]): T[] => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j] as T, out[i] as T];
      }
      return out;
    },
    bool: (p = 0.5) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return rng;
}

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) >>> 0;
}

/* ------------------------------------------------------------------ */
/* Heltalsværktøj                                                      */
/* ------------------------------------------------------------------ */

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

export function divisors(n: number): number[] {
  const out: number[] = [];
  for (let i = 1; i <= Math.abs(n); i++) if (n % i === 0) out.push(i);
  return out;
}

export function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Runder til n decimaler uden flydende-komma-støj (0.1+0.2-problemet). */
export function roundTo(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON * Math.sign(value || 1)) * f) / f;
}

/* ------------------------------------------------------------------ */
/* Brøker                                                              */
/* ------------------------------------------------------------------ */

export function frac(n: number, d: number): Frac {
  if (d === 0) throw new Error('Brøk med nævner 0');
  return reduce({ n, d });
}

export function reduce(f: Frac): Frac {
  const g = gcd(f.n, f.d);
  let n = f.n / g;
  let d = f.d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

export function fracAdd(a: Frac, b: Frac): Frac {
  return reduce({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
}
export function fracSub(a: Frac, b: Frac): Frac {
  return reduce({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
}
export function fracMul(a: Frac, b: Frac): Frac {
  return reduce({ n: a.n * b.n, d: a.d * b.d });
}
export function fracDiv(a: Frac, b: Frac): Frac {
  if (b.n === 0) throw new Error('Division med 0');
  return reduce({ n: a.n * b.d, d: a.d * b.n });
}
export function fracValue(f: Frac): number {
  return f.n / f.d;
}
export function fracEq(a: Frac, b: Frac): boolean {
  return a.n * b.d === b.n * a.d;
}
export function isReduced(f: Frac): boolean {
  return gcd(f.n, f.d) === 1;
}

/** "3/4", eller bare "3" når nævneren er 1. */
export function fracToString(f: Frac): string {
  const r = reduce(f);
  return r.d === 1 ? String(r.n) : `${r.n}/${r.d}`;
}

/** LaTeX — bevarer bevidst nævneren, også en uforkortet. */
export function fracTex(f: Frac, reduceFirst = false): string {
  const r = reduceFirst ? reduce(f) : f;
  if (r.d === 1) return String(r.n);
  if (r.n < 0) return `-\\tfrac{${Math.abs(r.n)}}{${r.d}}`;
  return `\\tfrac{${r.n}}{${r.d}}`;
}

/** Stor brøk til display-formler. */
export function fracTexBig(f: Frac): string {
  if (f.d === 1) return String(f.n);
  if (f.n < 0) return `-\\frac{${Math.abs(f.n)}}{${f.d}}`;
  return `\\frac{${f.n}}{${f.d}}`;
}

/** Blandet tal: 7/3 -> "2 1/3". */
export function mixedTex(f: Frac): string {
  const r = reduce(f);
  const whole = Math.trunc(r.n / r.d);
  const rest = Math.abs(r.n % r.d);
  if (rest === 0) return String(whole);
  if (whole === 0) return fracTex(r);
  return `${whole}\\tfrac{${rest}}{${r.d}}`;
}

/* ------------------------------------------------------------------ */
/* Dansk talformatering                                                */
/* ------------------------------------------------------------------ */

/**
 * Dansk notation bruger komma som decimaltegn. Vi udskriver bevidst aldrig
 * tusindtalsseparator: det ville gøre elevens svar tvetydigt at parse.
 */
export function num(value: number, decimals?: number): string {
  const v = decimals === undefined ? value : roundTo(value, decimals);
  let s: string;
  if (decimals === undefined) {
    s = String(roundTo(v, 6));
  } else {
    s = v.toFixed(decimals);
  }
  return s.replace('.', ',');
}

/** Som num(), men skærer overflødige nuller væk: 2,50 -> 2,5. */
export function numTrim(value: number, maxDecimals = 4): string {
  const v = roundTo(value, maxDecimals);
  return String(v).replace('.', ',');
}

/** Fortegn foran et led: 5 -> "+ 5", -5 -> "- 5". */
export function signed(value: number, space = true): string {
  const sep = space ? ' ' : '';
  return value < 0 ? `-${sep}${Math.abs(value)}` : `+${sep}${value}`;
}

/** Koefficient foran en variabel: 1 -> "x", -1 -> "-x", 3 -> "3x". */
export function coef(a: number, v = 'x'): string {
  if (a === 1) return v;
  if (a === -1) return `-${v}`;
  return `${a}${v}`;
}

/** Bygger "ax + b" pænt, med de led der faktisk er der. */
export function linearTex(a: number, b: number, v = 'x'): string {
  if (a === 0) return String(b);
  if (b === 0) return coef(a, v);
  return `${coef(a, v)} ${signed(b)}`;
}

/** Sætter led sammen og rydder op i "+ -". */
export function termsTex(parts: string[]): string {
  return parts
    .filter((p) => p !== '')
    .join(' + ')
    .replace(/\+ -/g, '- ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Statistik                                                           */
/* ------------------------------------------------------------------ */

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}

/** Nedre kvartil efter dansk folkeskolepraksis: median af nedre halvdel. */
export function quartile1(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const lower = s.slice(0, Math.floor(s.length / 2));
  return median(lower);
}

export function quartile3(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const upper = s.slice(Math.ceil(s.length / 2));
  return median(upper);
}

export function modeOf(xs: number[]): number[] {
  const counts = new Map<number, number>();
  xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
  const max = Math.max(...counts.values());
  return [...counts.entries()].filter(([, c]) => c === max).map(([v]) => v).sort((a, b) => a - b);
}

export function rangeOf(xs: number[]): number {
  return Math.max(...xs) - Math.min(...xs);
}

/* ------------------------------------------------------------------ */
/* Geometri                                                            */
/* ------------------------------------------------------------------ */

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;

/** Heltalstrekanter så Pythagoras-opgaver går pænt op. */
export const PYTHAGOREAN_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [9, 12, 15],
  [8, 15, 17],
  [12, 16, 20],
  [7, 24, 25],
  [10, 24, 26],
  [20, 21, 29],
  [15, 20, 25],
  [9, 40, 41],
  [12, 35, 37],
];
