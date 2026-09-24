import type { AnswerSpec } from '../types';
import { fracEq, isReduced } from './math';
import { parseFraction, parseNumber, type Response } from './answer';

export type SlipKind = 'fortegn' | 'komma' | 'afrunding' | 'omvendt' | 'forkort' | 'cifre' | 'xy';

export interface Slip {
  kind: SlipKind;
  text: string;
}

const TEXT: Record<SlipKind, string> = {
  fortegn: 'Tallet passer, men fortegnet gør ikke. Tjek om svaret skal være positivt eller negativt.',
  komma: 'Cifrene passer, men kommaet står forkert. Tjek om du har ganget eller divideret med 10, 100 eller 1000 et sted.',
  afrunding: 'Du er meget tæt på. Tjek hvordan du har afrundet, og hvor mange decimaler opgaven beder om.',
  omvendt: 'Brøken står på hovedet. Tæller og nævner er byttet om.',
  forkort: 'Brøken har den rigtige værdi, men den kan forkortes mere.',
  cifre: 'Du har de rigtige cifre, men i en anden rækkefølge. Se efter om du har skrevet et tal af forkert.',
  xy: 'Du har byttet om på x og y. Første tal er x, det vandrette.',
};

const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

function numericSlip(got: number, want: number): SlipKind | null {
  if (near(got, want)) return null;
  if (want !== 0 && near(got, -want)) return 'fortegn';
  if (want !== 0 && got !== 0) {
    const ratio = got / want;
    for (const f of [10, 100, 1000]) {
      if (near(ratio, f) || near(ratio, 1 / f)) return 'komma';
    }
    if (Math.abs(want) !== 1 && near(got * want, 1)) return 'omvendt';
  }
  const decimals = !Number.isInteger(want) || !Number.isInteger(got);
  if (decimals && want !== 0 && Math.abs(got - want) / Math.abs(want) < 0.01) return 'afrunding';
  if (Number.isInteger(got) && Number.isInteger(want) && Math.abs(want) >= 10 && Math.sign(got) === Math.sign(want)) {
    const digits = (n: number) => String(Math.abs(n)).split('').sort().join('');
    if (digits(got) === digits(want)) return 'cifre';
  }
  return null;
}

/** Genkender en typisk sjuskefejl bag et forkert svar. Rører ikke svar der allerede er rigtige. */
export function findSlip(spec: AnswerSpec, r: Response): Slip | null {
  let kind: SlipKind | null = null;
  if (spec.type === 'number' && r.kind === 'text') {
    const got = parseNumber(r.value);
    if (got !== null) kind = numericSlip(got, spec.value);
  } else if (spec.type === 'fraction' && r.kind === 'text') {
    const f = parseFraction(r.value);
    if (f) {
      if (fracEq(f, spec.value)) kind = spec.requireReduced && !isReduced(f) ? 'forkort' : null;
      else if (f.n !== 0 && fracEq({ n: f.d, d: f.n }, spec.value) && Math.abs(spec.value.n) !== Math.abs(spec.value.d)) kind = 'omvendt';
      else kind = numericSlip(f.n / f.d, spec.value.n / spec.value.d);
    }
  } else if (spec.type === 'point' && r.kind === 'point') {
    const x = parseNumber(r.x);
    const y = parseNumber(r.y);
    if (x !== null && y !== null && spec.x !== spec.y && near(x, spec.y) && near(y, spec.x)) kind = 'xy';
  }
  return kind ? { kind, text: TEXT[kind] } : null;
}

/** Elevens svar som det skal gentages i feedbacken. */
export function describeResponse(r: Response): string {
  switch (r.kind) {
    case 'text':
      return r.value.trim();
    case 'choice':
      return r.index === null ? '' : String.fromCharCode(65 + r.index);
    case 'multi':
      return r.indices.map((i) => String.fromCharCode(65 + i)).join(', ');
    case 'pair':
      return `${r.a.trim()} og ${r.b.trim()}`;
    case 'point':
      return `(${r.x.trim()}, ${r.y.trim()})`;
  }
}
