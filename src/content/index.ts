import type { Aids, Area, AreaId, Category, Difficulty, Domain, DomainId, Generator, Problem, Rng, Skill } from '../types';
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
import { flytninger } from './domains/flytninger';
import { tegning } from './domains/tegning';

/**
 * Registret over hele pensum. Rækkefølgen her er den rækkefølge emnerne
 * vises i — den går fra fundament mod anvendelse.
 */
export const DOMAINS: Domain[] = [tal, broeker, decimaler, procenter, forhold, potenser, roedder, algebra, ligninger, uligheder, geometri, arealRumfang, trigonometri, koordinatsystem, flytninger, tegning, funktioner, statistik, sandsynlighed, problemloesning, modeller];

/**
 * Kompetenceområderne fra Fælles Mål for matematik, 7.-9. klasse. Samme
 * inddeling som eleven møder i skolen og til FP9.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'tal-algebra',
    name: 'Tal og algebra',
    description: 'Tal, regnestrategier, ligninger, formler og funktioner.',
    faellesMaal: 'Eleven kan anvende reelle tal og algebraiske udtryk i matematiske undersøgelser.',
  },
  {
    id: 'geometri-maaling',
    name: 'Geometri og måling',
    description: 'Figurer, tegning, flytninger og måling.',
    faellesMaal: 'Eleven kan forklare geometriske sammenhænge og beregne mål.',
  },
  {
    id: 'statistik-sandsynlighed',
    name: 'Statistik og sandsynlighed',
    description: 'Beskriv data og vurdér chancer.',
    faellesMaal: 'Eleven kan vurdere statistiske undersøgelser og anvende sandsynlighed.',
  },
  {
    id: 'kompetencer',
    name: 'Matematiske kompetencer',
    description: 'Problembehandling, modellering og ræsonnement.',
    faellesMaal: 'Eleven kan handle med dømmekraft i komplekse situationer med matematik.',
  },
];

/** Færdigheds- og vidensområderne under hvert kompetenceområde. */
export const AREAS: Area[] = [
  { id: 'tal', category: 'tal-algebra', name: 'Tal' },
  { id: 'regnestrategier', category: 'tal-algebra', name: 'Regnestrategier' },
  { id: 'ligninger', category: 'tal-algebra', name: 'Ligninger' },
  { id: 'formler', category: 'tal-algebra', name: 'Formler og algebraiske udtryk' },
  { id: 'funktioner', category: 'tal-algebra', name: 'Funktioner' },
  { id: 'geometriske-egenskaber', category: 'geometri-maaling', name: 'Geometriske egenskaber og sammenhænge' },
  { id: 'geometrisk-tegning', category: 'geometri-maaling', name: 'Geometrisk tegning' },
  { id: 'placeringer-flytninger', category: 'geometri-maaling', name: 'Placeringer og flytninger' },
  { id: 'maaling', category: 'geometri-maaling', name: 'Måling' },
  { id: 'statistik', category: 'statistik-sandsynlighed', name: 'Statistik' },
  { id: 'sandsynlighed', category: 'statistik-sandsynlighed', name: 'Sandsynlighed' },
  { id: 'problembehandling', category: 'kompetencer', name: 'Problembehandling' },
  { id: 'modellering', category: 'kompetencer', name: 'Modellering' },
  { id: 'raesonnement', category: 'kompetencer', name: 'Ræsonnement og tankegang' },
  { id: 'repraesentation', category: 'kompetencer', name: 'Repræsentation og symbolbehandling' },
  { id: 'kommunikation', category: 'kompetencer', name: 'Kommunikation' },
  { id: 'hjaelpemidler', category: 'kompetencer', name: 'Hjælpemidler' },
];

const areaById = new Map(AREAS.map((a) => [a.id, a]));

export function areaName(id: AreaId): string {
  return areaById.get(id)?.name ?? id;
}

/** Samler emner under deres færdigheds- og vidensområde, i pensums rækkefølge. */
export function groupByArea(domains: Domain[]): [AreaId, Domain[]][] {
  const groups = new Map<AreaId, Domain[]>();
  for (const d of domains) {
    const list = groups.get(d.area);
    if (list) list.push(d);
    else groups.set(d.area, [d]);
  }
  return [...groups];
}

/** Emner der hører under et bestemt færdigheds- og vidensområde. */
export function domainsInArea(id: AreaId): Domain[] {
  return DOMAINS.filter((d) => d.area === id);
}

/**
 * Hvilken FP9-prøve en færdighed hører til. Generatoren kan overstyre
 * færdigheden, fordi en enkelt opgavetype kan kræve lommeregner selvom
 * resten af færdigheden ikke gør.
 */
export function aidsOf(skill: Skill, generator?: Generator): Aids {
  return generator?.aids ?? skill.aids ?? 'begge';
}

export function matchesAids(skill: Skill, generator: Generator, want: 'uden' | 'med'): boolean {
  const a = aidsOf(skill, generator);
  return a === 'begge' || a === want;
}

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
