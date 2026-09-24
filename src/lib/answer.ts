import type { AnswerSpec, Frac, Problem, Trap } from '../types';
import { fracEq, isReduced, reduce, roundTo } from './math';

/** Hvad et input-felt leverer tilbage til motoren. */
export type Response =
  | { kind: 'text'; value: string }
  | { kind: 'choice'; index: number | null }
  | { kind: 'multi'; indices: number[] }
  | { kind: 'pair'; a: string; b: string }
  | { kind: 'point'; x: string; y: string };

export const emptyResponse = (kind: Response['kind']): Response => {
  switch (kind) {
    case 'choice':
      return { kind: 'choice', index: null };
    case 'multi':
      return { kind: 'multi', indices: [] };
    case 'pair':
      return { kind: 'pair', a: '', b: '' };
    case 'point':
      return { kind: 'point', x: '', y: '' };
    default:
      return { kind: 'text', value: '' };
  }
};

export function isBlank(r: Response): boolean {
  switch (r.kind) {
    case 'text':
      return r.value.trim() === '';
    case 'choice':
      return r.index === null;
    case 'multi':
      return r.indices.length === 0;
    case 'pair':
      return r.a.trim() === '' || r.b.trim() === '';
    case 'point':
      return r.x.trim() === '' || r.y.trim() === '';
  }
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tolker elevens tal. Dansk komma og engelsk punktum accepteres begge —
 * eleven skal ikke miste point på tastaturvaner. Mellemrum, valuta og
 * enheder ryddes væk.
 */
export function parseNumber(raw: string): number | null {
  const s = cleanNumber(raw);
  if (s === null) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

const UNITS =
  /(kroner|kr|procent|%|cm²|cm³|dm²|dm³|m²|m³|km²|mm²|cm2|cm3|dm2|dm3|m2|m3|km2|mm2|cm|dm|mm|km\/t|km|m|kg|g|dl|cl|ml|l|stk|grader|°|timer|time|t|minutter|min|sekunder|sek|s|år|dage|dag|personer|elever)\.?$/i;

/** Rydder et tal-svar: "x = 2.500 kr." bliver "2.500". */
function cleanNumber(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw
    .trim()
    .toLowerCase()
    .replace(/−|–|—/g, '-')
    .replace(/\s| /g, '')
    // "x = 5" er et fuldt gyldigt svar på "løs ligningen".
    .replace(/^[a-zæøå]=/, '')
    .replace(UNITS, '');
  if (s === '') return null;
  // "2.500,50" -> punktum er tusindtalsseparator
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '');
  // "1.250.000" kan kun være tusindtal.
  if (/^[+-]?\d{1,3}(\.\d{3}){2,}$/.test(s)) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(s)) return null;
  return s;
}

/**
 * De tal et svar kan betyde. "2.500" er 2500 på dansk, men 2,5 for en
 * elev der er vant til engelsk tastatur - begge læsninger godtages.
 */
export function numberReadings(raw: string): number[] {
  const v = parseNumber(raw);
  if (v === null) return [];
  const cleaned = cleanNumber(raw) ?? '';
  if (/^[+-]?[1-9]\d{0,2}\.\d{3}$/.test(cleaned)) return [v, Number(cleaned.replace('.', ''))];
  return [v];
}

/** Tolker "3/4", "-3/4" og almindelige tal som brøk. */
export function parseFraction(raw: string): Frac | null {
  // Blandet tal: "1 3/4" er 7/4. Mellemrummet må ikke bare fjernes,
  // for så bliver det til 13/4.
  const mixed = raw.trim().replace(/−/g, '-').match(/^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const [, sign, whole, num, den] = mixed;
    const d = Number(den);
    if (d === 0) return null;
    const n = Number(whole) * d + Number(num);
    return { n: sign === '-' ? -n : n, d };
  }
  const s = raw.trim().replace(/\s| /g, '').replace(/−/g, '-');
  const m = s.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (m) {
    const d = Number(m[2]);
    if (d === 0) return null;
    return { n: Number(m[1]), d };
  }
  const v = parseNumber(raw);
  if (v === null) return null;
  if (Number.isInteger(v)) return { n: v, d: 1 };
  // 0,75 -> 3/4
  const decimals = (String(roundTo(v, 6)).split('.')[1] ?? '').length;
  const p = 10 ** decimals;
  return reduce({ n: Math.round(v * p), d: p });
}

/**
 * Normaliserer et algebraisk udtryk, så "3 + 2x", "2x+3" og "x + x + 3"
 * alle tæller som samme svar.
 *
 * Bevidst begrænsning: den ganger ikke parenteser ud og reducerer ikke
 * brøker med variable. Indeholder udtrykket "(", ")" eller "/", falder vi
 * tilbage til en ren tegn-sammenligning — og generatoren angiver så de
 * gyldige former via `accept`.
 */
export function normalizeExpression(raw: string): string {
  let s = raw
    .toLowerCase()
    .replace(/−|–|—/g, '-')
    .replace(/[·×⋅*]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\s| /g, '')
    .replace(/,/g, '.');
  if (s === '') return '';
  // Parenteser, brøkstreger og rodtegn kræver rigtig algebra for at kunne
  // sammenlignes; dem rører vi ikke ved. Potenser klarer led-samlingen selv.
  if (/[()/√]/.test(s) === false) {
    const canon = canonicalPolynomial(s);
    if (canon !== null) return canon;
  }
  return s.replace(/\*/g, '');
}

/** Samler ensartede led: returnerer fx "1:3|x:2" for 2x + 3. */
function canonicalPolynomial(s: string): string | null {
  const terms = s.match(/[+-]?[^+-]+/g);
  if (!terms) return null;
  const buckets = new Map<string, number>();
  for (const term of terms) {
    const m = term.match(/^([+-]?)(\d*\.?\d*)(.*)$/);
    if (!m) return null;
    const sign = m[1] === '-' ? -1 : 1;
    const rest = (m[3] ?? '').replace(/\*/g, '');
    const atoms = rest.match(/[a-zæøå](\^-?\d+)?/g) ?? [];
    // Noget vi ikke forstår (fx en funktion) -> giv op og brug rå sammenligning.
    if (atoms.join('') !== rest) return null;
    const numPart = m[2] ?? '';
    const coefficient = numPart === '' || numPart === '.' ? 1 : Number(numPart);
    if (!Number.isFinite(coefficient)) return null;
    const key = atoms.slice().sort().join('*') || '1';
    buckets.set(key, (buckets.get(key) ?? 0) + sign * coefficient);
  }
  return [...buckets.entries()]
    .filter(([, v]) => roundTo(v, 9) !== 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${roundTo(v, 9)}`)
    .join('|');
}

/** Løs tekstsammenligning: ignorerer store/små bogstaver og tegnsætning. */
export function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');
}

/* ------------------------------------------------------------------ */
/* Kontrol                                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_TOLERANCE = 0.005;

function numbersMatch(a: number, b: number, tolerance?: number): boolean {
  return Math.abs(a - b) <= (tolerance ?? DEFAULT_TOLERANCE);
}

export function checkAnswer(spec: AnswerSpec, r: Response): boolean {
  switch (spec.type) {
    case 'number': {
      if (r.kind !== 'text') return false;
      return numberReadings(r.value).some((v) => numbersMatch(v, spec.value, spec.tolerance));
    }
    case 'fraction': {
      if (r.kind !== 'text') return false;
      const f = parseFraction(r.value);
      if (!f) return false;
      if (!fracEq(f, spec.value)) return false;
      if (spec.requireReduced && !isReduced(f)) return false;
      return true;
    }
    case 'text': {
      if (r.kind !== 'text') return false;
      const got = normalizeText(r.value);
      if (got === '') return false;
      return [spec.value, ...(spec.accept ?? [])].some((a) => normalizeText(a) === got);
    }
    case 'expression': {
      if (r.kind !== 'text') return false;
      // "y = 2x + 3" og "f(x) = 2x + 3" er samme svar som "2x + 3".
      const bare = spec.value.includes('=') ? r.value : r.value.replace(/^\s*(y|f\s*\(\s*x\s*\))\s*=/i, '');
      const got = normalizeExpression(bare);
      if (got === '') return false;
      return [spec.value, ...(spec.accept ?? [])].some((a) => normalizeExpression(a) === got);
    }
    case 'choice':
      return r.kind === 'choice' && r.index === spec.correct;
    case 'multi': {
      if (r.kind !== 'multi') return false;
      const want = [...spec.correct].sort((a, b) => a - b);
      const got = [...r.indices].sort((a, b) => a - b);
      return want.length === got.length && want.every((v, i) => v === got[i]);
    }
    case 'pair': {
      if (r.kind !== 'pair') return false;
      return (
        numberReadings(r.a).some((a) => numbersMatch(a, spec.values[0], spec.tolerance)) &&
        numberReadings(r.b).some((b) => numbersMatch(b, spec.values[1], spec.tolerance))
      );
    }
    case 'point': {
      if (r.kind !== 'point') return false;
      const x = parseNumber(r.x);
      const y = parseNumber(r.y);
      if (x === null || y === null) return false;
      return numbersMatch(x, spec.x, spec.tolerance) && numbersMatch(y, spec.y, spec.tolerance);
    }
  }
}

/**
 * Leder efter en kendt misforståelse bag et forkert svar. Det er forskellen
 * på "forkert, prøv igen" og "du lagde nævnerne sammen — se her hvorfor
 * det ikke virker".
 */
export function findTrap(problem: Problem, r: Response): Trap | null {
  if (!problem.traps?.length) return null;
  const raw = responseToString(r);
  const numeric = r.kind === 'text' ? parseNumber(r.value) : null;

  for (const trap of problem.traps) {
    if (trap.match && trap.match(raw, numeric)) return trap;
    if (trap.value === undefined) continue;
    if (typeof trap.value === 'number') {
      if (numeric !== null && numbersMatch(numeric, trap.value, 1e-6)) return trap;
      if (r.kind === 'choice' && r.index === trap.value) return trap;
    } else {
      const want = trap.value;
      if (normalizeText(raw) === normalizeText(want)) return trap;
      if (normalizeExpression(raw) !== '' && normalizeExpression(raw) === normalizeExpression(want)) return trap;
    }
  }
  return null;
}

export function responseToString(r: Response): string {
  switch (r.kind) {
    case 'text':
      return r.value;
    case 'choice':
      return r.index === null ? '' : String(r.index);
    case 'multi':
      return r.indices.join(',');
    case 'pair':
      return `${r.a}; ${r.b}`;
    case 'point':
      return `(${r.x}, ${r.y})`;
  }
}

/** Facitten i læsbar form — bruges i "Se løsningen". */
export function answerToString(spec: AnswerSpec, choices?: string[]): string {
  switch (spec.type) {
    case 'number':
      return String(spec.value).replace('.', ',');
    case 'fraction':
      return spec.value.d === 1 ? String(spec.value.n) : `${spec.value.n}/${spec.value.d}`;
    case 'text':
    case 'expression':
      return spec.value;
    case 'choice':
      return choices?.[spec.correct] ?? String(spec.correct + 1);
    case 'multi':
      return spec.correct.map((i) => choices?.[i] ?? String(i + 1)).join(', ');
    case 'pair':
      return `${String(spec.values[0]).replace('.', ',')} og ${String(spec.values[1]).replace('.', ',')}`;
    case 'point':
      return `(${String(spec.x).replace('.', ',')}, ${String(spec.y).replace('.', ',')})`;
  }
}
