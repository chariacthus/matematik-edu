import type { AnswerSpec, Difficulty, Frac, ProblemDraft, Rng, SolutionStep, Trap } from '../types';
import { normalizeExpression, normalizeText } from '../lib/answer';

/* ------------------------------------------------------------------ */
/* Små byggeklodser                                                    */
/* ------------------------------------------------------------------ */

/** Et løsningstrin. */
export const s = (text: string, math?: string, why?: string): SolutionStep => ({ text, math, why });

export const numAns = (value: number, tolerance?: number): AnswerSpec => ({ type: 'number', value, tolerance });
export const fracAns = (value: Frac, requireReduced = false): AnswerSpec => ({
  type: 'fraction',
  value,
  requireReduced,
});
export const exprAns = (value: string, accept?: string[]): AnswerSpec => ({ type: 'expression', value, accept });
export const textAns = (value: string, accept?: string[]): AnswerSpec => ({ type: 'text', value, accept });

/** Vælger værdi efter niveau 1-5. */
export function lv<T>(level: Difficulty, values: [T, T, T, T, T]): T {
  return values[level - 1] as T;
}

/** Heltal i et niveauafhængigt interval. */
export function lvInt(rng: Rng, level: Difficulty, ranges: [number, number][]): number {
  const r = ranges[Math.min(level, ranges.length) - 1] ?? ranges[ranges.length - 1];
  return rng.int((r as [number, number])[0], (r as [number, number])[1]);
}

/* ------------------------------------------------------------------ */
/* Multiple choice                                                     */
/* ------------------------------------------------------------------ */

export interface ChoiceOption {
  text: string;
  correct?: boolean;
  /** Er valget en kendt fejl, forklarer vi hvorfor netop den er forkert. */
  misconceptionId?: string;
  feedback?: string;
}

export interface ShuffledChoices {
  choices: string[];
  answer: AnswerSpec;
  traps: Trap[];
}

/**
 * Blander svarmulighederne og holder styr på hvor det rigtige svar og de
 * kendte fejlsvar endte. Uden blanding ville eleven hurtigt lære at
 * facitten står et bestemt sted.
 */
export function choices(rng: Rng, options: ChoiceOption[]): ShuffledChoices {
  // To ens svarmuligheder er altid en fejl: eleven kan vælge "rigtigt" og
  // få forkert. Vi fjerner dubletter og beholder altid det rigtige svar.
  const seen = new Set<string>();
  const unique = options.filter((o) => {
    const key = o.text.trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const correctText = options.find((o) => o.correct)?.text.trim();
  if (correctText !== undefined && !unique.some((o) => o.correct)) {
    const idx = unique.findIndex((o) => o.text.trim() === correctText);
    if (idx >= 0) unique[idx] = { ...(unique[idx] as ChoiceOption), correct: true, misconceptionId: undefined, feedback: undefined };
  }
  const shuffled = rng.shuffle(unique);
  const correct = shuffled.findIndex((o) => o.correct);
  const traps: Trap[] = [];
  shuffled.forEach((o, i) => {
    if (!o.correct && o.misconceptionId && o.feedback) {
      traps.push({ misconceptionId: o.misconceptionId, value: i, feedback: o.feedback });
    }
  });
  return {
    choices: shuffled.map((o) => o.text),
    answer: { type: 'choice', correct: correct < 0 ? 0 : correct },
    traps,
  };
}

/** Kortform til et rent multiple-choice-spørgsmål. */
export function mcq(
  rng: Rng,
  opts: {
    prompt: string;
    instruction?: string;
    options: ChoiceOption[];
    hints: string[];
    solution: SolutionStep[];
    concept?: string;
    visual?: ProblemDraft['visual'];
    seconds?: number;
  },
): ProblemDraft {
  const c = choices(rng, opts.options);
  return {
    prompt: opts.prompt,
    instruction: opts.instruction,
    input: { kind: 'choice' },
    answer: c.answer,
    choices: c.choices,
    traps: c.traps,
    hints: opts.hints,
    solution: opts.solution,
    concept: opts.concept,
    visual: opts.visual,
    seconds: opts.seconds ?? 35,
  };
}

/** En fælde på et bestemt talsvar. */
export const trap = (misconceptionId: string, value: number | string, feedback: string): Trap => ({
  misconceptionId,
  value,
  feedback,
});

/**
 * Samme som trap(), men dropper fælden hvis fejlsvaret tilfældigvis er lig
 * det rigtige svar. Det sker oftere end man tror — fx giver 20 + 4·5 − 21:3
 * det samme resultat både med og uden regnehierarki. Uden dette filter ville
 * eleven få at vide at et korrekt svar var en misforståelse.
 *
 * Returnerer et array, så den kan spredes direkte ind i `traps`.
 */
export function trapIfDifferent(
  correct: number,
  wrong: number,
  misconceptionId: string,
  feedback: string,
): Trap[] {
  if (!Number.isFinite(wrong)) return [];
  if (Math.abs(correct - wrong) < 1e-9) return [];
  return [{ misconceptionId, value: wrong, feedback }];
}

/**
 * Samme filter for tekst- og udtrykssvar. Sammenligningen sker gennem den
 * samme normalisering som retteren bruger, så "8x + 0" og "8x" tæller som
 * ens - ellers ville fælden ramme et rigtigt svar.
 */
export function trapIfDifferentText(
  correct: string,
  wrong: string,
  misconceptionId: string,
  feedback: string,
): Trap[] {
  if (normalizeExpression(correct) === normalizeExpression(wrong)) return [];
  if (normalizeText(correct) === normalizeText(wrong)) return [];
  return [{ misconceptionId, value: wrong, feedback }];
}

/* ------------------------------------------------------------------ */
/* Kontekst til tekstopgaver                                           */
/* ------------------------------------------------------------------ */

export const NAMES = [
  'Emma', 'Noah', 'Freja', 'William', 'Alma', 'Oscar', 'Clara', 'Malthe', 'Ida', 'Victor',
  'Sofia', 'Elias', 'Laura', 'Magnus', 'Liva', 'Alfred', 'Karla', 'Storm', 'Merle', 'Villads',
  'Agnes', 'Valdemar', 'Ellen', 'Anton', 'Vilma', 'August', 'Josefine', 'Oliver',
] as const;

export const ITEMS = [
  { name: 'en T-shirt', plural: 'T-shirts', price: 120 },
  { name: 'et par sko', plural: 'par sko', price: 450 },
  { name: 'en bog', plural: 'bøger', price: 180 },
  { name: 'et spil', plural: 'spil', price: 320 },
  { name: 'en madpakke', plural: 'madpakker', price: 35 },
  { name: 'en biografbillet', plural: 'biografbilletter', price: 95 },
  { name: 'en cykellygte', plural: 'cykellygter', price: 75 },
  { name: 'et pennalhus', plural: 'pennalhuse', price: 60 },
] as const;

export const PLACES = [
  'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Herning',
] as const;

export const SPORTS = ['håndbold', 'fodbold', 'svømning', 'badminton', 'basketball', 'atletik'] as const;

export const name = (rng: Rng) => rng.pick(NAMES);
export const two = (rng: Rng) => rng.sample(NAMES, 2) as [string, string];

/* ------------------------------------------------------------------ */
/* Tekst                                                               */
/* ------------------------------------------------------------------ */

/** "3 bøger" / "1 bog" — undgår "1 bøger". */
export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Kroner uden tusindtalsseparator, så svaret er entydigt at taste. */
export const kr = (v: number) => `${String(Math.round(v * 100) / 100).replace('.', ',')} kr`;
