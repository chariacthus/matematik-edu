import type { Difficulty, Domain, DomainId, Generator, Problem, Rng, Skill } from '../types';
import { makeRng, randomSeed } from '../lib/math';

import { tal } from './domains/tal';
import { broeker } from './domains/broeker';
import { decimaler } from './domains/decimaler';
import { procenter } from './domains/procenter';
import { forhold } from './domains/forhold';
import { potenser } from './domains/potenser';
import { roedder } from './domains/roedder';
import { algebra } from './domains/algebra';
import { ligninger } from './domains/ligninger';
import { uligheder } from './domains/uligheder';
import { geometri } from './domains/geometri';
import { arealRumfang } from './domains/arealRumfang';
import { trigonometri } from './domains/trigonometri';
import { koordinatsystem } from './domains/koordinatsystem';
import { funktioner } from './domains/funktioner';
import { statistik } from './domains/statistik';
import { sandsynlighed } from './domains/sandsynlighed';
import { problemloesning } from './domains/problemloesning';
import { modeller } from './domains/modeller';

/**
 * Registret over hele pensum. Rækkefølgen her er den rækkefølge emnerne
 * vises i — den går fra fundament mod anvendelse.
 */
export const DOMAINS: Domain[] = [tal, broeker, decimaler, procenter, forhold, potenser, roedder, algebra, ligninger, uligheder, geometri, arealRumfang, trigonometri, koordinatsystem, funktioner, statistik, sandsynlighed, problemloesning, modeller];

export const CATEGORIES = [
  { id: 'tal-algebra' as const, name: 'Tal & algebra', description: 'Tal, brøker, procenter og bogstavregning.' },
  { id: 'geometri' as const, name: 'Geometri', description: 'Figurer, vinkler, mål og trigonometri.' },
  { id: 'funktioner' as const, name: 'Funktioner', description: 'Koordinatsystem, grafer og sammenhænge.' },
  { id: 'data' as const, name: 'Statistik & sandsynlighed', description: 'Beskriv data og vurdér chancer.' },
  { id: 'anvendelse' as const, name: 'Anvendelse', description: 'Tekstopgaver, problemløsning og modeller.' },
];

const domainById = new Map(DOMAINS.map((d) => [d.id, d]));
const skillById = new Map<string, Skill>();
DOMAINS.forEach((d) => d.skills.forEach((sk) => skillById.set(sk.id, sk)));

export const ALL_SKILLS: Skill[] = DOMAINS.flatMap((d) => d.skills);

export function getDomain(id: DomainId): Domain | undefined {
  return domainById.get(id);
}

export function getSkill(id: string): Skill | undefined {
  return skillById.get(id);
}

export function domainName(id: DomainId): string {
  return domainById.get(id)?.name ?? id;
}

/** Færdigheder i et emne, sorteret efter stigende sværhedsgrad. */
export function skillsOf(id: DomainId): Skill[] {
  return (domainById.get(id)?.skills ?? []).slice().sort((a, b) => a.tier - b.tier);
}

/* ------------------------------------------------------------------ */
/* Opgavefremstilling                                                  */
/* ------------------------------------------------------------------ */

let counter = 0;

/** Generatorer der er frigivet på et givet niveau. */
export function generatorsFor(skill: Skill, level: Difficulty): Generator[] {
  const open = skill.generators.filter((g) => (g.minLevel ?? 1) <= level);
  return open.length ? open : [skill.generators[0] as Generator];
}

export interface BuildOptions {
  level: Difficulty;
  /** Vælg en bestemt generator (bruges til variation og mastery-check). */
  generatorId?: string;
  /** Undgå at gentage den samme opgavetype lige efter hinanden. */
  avoidGeneratorId?: string;
  seed?: number;
  rng?: Rng;
}

/**
 * Bygger en konkret opgave ud fra en færdighed. Alt det tilfældige sker
 * gennem én Rng, så en opgave kan genskabes 1:1 fra sit seed.
 */
export function buildProblem(skill: Skill, opts: BuildOptions): Problem {
  const level = opts.level;
  const seed = opts.seed ?? randomSeed();
  const rng = opts.rng ?? makeRng(seed);

  let pool = generatorsFor(skill, level);
  if (opts.generatorId) {
    const wanted = skill.generators.find((g) => g.id === opts.generatorId);
    if (wanted) pool = [wanted];
  } else if (opts.avoidGeneratorId && pool.length > 1) {
    const filtered = pool.filter((g) => g.id !== opts.avoidGeneratorId);
    if (filtered.length) pool = filtered;
  }

  const gen = rng.pick(pool);
  const draft = gen.make({ rng, level });
  counter += 1;
  return {
    ...draft,
    id: `${skill.id}:${gen.id}:${seed}:${counter}`,
    skillId: skill.id,
    domainId: skill.domainId,
    generatorId: gen.id,
    level,
    seconds: draft.seconds ?? 45,
  };
}
