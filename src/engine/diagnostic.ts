import type { Difficulty, DomainId, Problem } from '../types';
import { DOMAINS, buildProblem, skillsOf } from '../content';
import { clamp, randomSeed } from '../lib/math';

/**
 * Den diagnostiske test.
 *
 * Den giver ikke én samlet score. Den kører en lille trappe inden for
 * HVERT af de 19 emner: rigtigt svar → sværere opgave, forkert → lettere.
 * Det giver et niveauskøn pr. emne i stedet for et gennemsnit der skjuler
 * at eleven er stærk i statistik og svag i brøker.
 */

export const ITEMS_PER_DOMAIN = 2;

export interface DiagnosticItem {
  domainId: DomainId;
  skillId: string;
  problem: Problem;
  level: Difficulty;
}

export interface DomainResult {
  correct: number;
  total: number;
  /** Løbende niveauskøn 1-5. */
  ability: number;
}

export interface DiagnosticSession {
  order: DomainId[];
  results: Partial<Record<DomainId, DomainResult>>;
  /** Hvilket nummer i rækken vi er nået til. */
  index: number;
  items: DiagnosticItem[];
}

/** Startniveau ud fra elevens egen vurdering og emnevalg i onboarding. */
export function startingAbility(confidence: number, domainId: DomainId, hard: DomainId[], easy: DomainId[]): number {
  let base = clamp(0.6 + confidence * 0.65, 1, 4.2);
  if (hard.includes(domainId)) base -= 0.8;
  if (easy.includes(domainId)) base += 0.7;
  return clamp(base, 1, 4.5);
}

export function createSession(confidence: number, hard: DomainId[], easy: DomainId[]): DiagnosticSession {
  // Emnerne kommer i pensums rækkefølge, så testen starter med det
  // grundlæggende. At begynde med trigonometri ville slå modet ud af en
  // elev der er usikker.
  const order = DOMAINS.map((d) => d.id);
  const results: Partial<Record<DomainId, DomainResult>> = {};
  for (const id of order) {
    results[id] = { correct: 0, total: 0, ability: startingAbility(confidence, id, hard, easy) };
  }
  const session: DiagnosticSession = { order, results, index: 0, items: [] };
  session.items = [buildItem(session, 0)];
  return session;
}

/** Hvilket emne og hvilken runde hører et givet nummer til? */
function positionOf(index: number): { domainIdx: number; round: number } {
  return { domainIdx: Math.floor(index / ITEMS_PER_DOMAIN), round: index % ITEMS_PER_DOMAIN };
}

export function totalItems(): number {
  return DOMAINS.length * ITEMS_PER_DOMAIN;
}

function buildItem(session: DiagnosticSession, index: number): DiagnosticItem {
  const { domainIdx, round } = positionOf(index);
  const domainId = session.order[domainIdx] as DomainId;
  const result = session.results[domainId] as DomainResult;
  const level = clamp(Math.round(result.ability), 1, 5) as Difficulty;

  // Første runde tager en grundlæggende færdighed, anden runde en der
  // ligger tættere på det niveau eleven ser ud til at være på.
  const skills = skillsOf(domainId);
  const wanted = round === 0 ? Math.min(...skills.map((s) => s.tier)) : level;
  const skill =
    skills.reduce((best, s) => (Math.abs(s.tier - wanted) < Math.abs(best.tier - wanted) ? s : best), skills[0]!) ??
    skills[0]!;

  return {
    domainId,
    skillId: skill.id,
    level,
    problem: buildProblem(skill, { level, seed: randomSeed() }),
  };
}

/**
 * Registrerer et svar og bygger næste opgave.
 *
 * Trappen bevæger sig hurtigere ned end op: det er værre at overvurdere
 * en elev end at undervurdere, fordi for svære opgaver får folk til at
 * give op.
 */
export function answerItem(session: DiagnosticSession, correct: boolean): DiagnosticSession {
  const item = session.items[session.index];
  if (!item) return session;

  const prev = session.results[item.domainId] as DomainResult;
  const ability = clamp(prev.ability + (correct ? 0.75 : -1.0), 1, 5);
  const results = {
    ...session.results,
    [item.domainId]: { correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1, ability },
  };

  const index = session.index + 1;
  const next: DiagnosticSession = { ...session, results, index, items: session.items };
  if (index < totalItems()) {
    next.items = [...session.items, buildItem(next, index)];
  }
  return next;
}

export function currentItem(session: DiagnosticSession): DiagnosticItem | null {
  return session.items[session.index] ?? null;
}

export function isComplete(session: DiagnosticSession): boolean {
  return session.index >= totalItems();
}

/* ------------------------------------------------------------------ */
/* Resultat                                                            */
/* ------------------------------------------------------------------ */

/** Niveauskøn (1-5) omregnet til den procent eleven får vist. */
export function abilityToPercent(ability: number): number {
  return Math.round(clamp(12 + ((ability - 1) / 4) * 82, 0, 100));
}

export interface DiagnosticOutcome {
  scores: Partial<Record<DomainId, number>>;
  abilities: Partial<Record<DomainId, number>>;
  /** Emner der aldrig blev testet, fordi eleven stoppede før tid. */
  untested: DomainId[];
  strongest: DomainId[];
  weakest: DomainId[];
}

/**
 * Samler resultatet. Emner eleven nåede at svare på vurderes ud fra
 * svarene; emner der ikke blev nået beholder skønnet fra onboarding,
 * men markeres som utestede, så profilen ikke lader som om den ved mere
 * end den gør.
 */
export function summarise(session: DiagnosticSession): DiagnosticOutcome {
  const scores: Partial<Record<DomainId, number>> = {};
  const abilities: Partial<Record<DomainId, number>> = {};
  const untested: DomainId[] = [];

  for (const id of session.order) {
    const r = session.results[id];
    if (!r) continue;
    abilities[id] = r.ability;
    scores[id] = abilityToPercent(r.ability);
    if (r.total === 0) untested.push(id);
  }

  const ranked = (Object.entries(scores) as [DomainId, number][])
    .filter(([id]) => !untested.includes(id))
    .sort((a, b) => b[1] - a[1]);

  return {
    scores,
    abilities,
    untested,
    strongest: ranked.slice(0, 3).map(([id]) => id),
    weakest: ranked.slice(-3).reverse().map(([id]) => id),
  };
}
