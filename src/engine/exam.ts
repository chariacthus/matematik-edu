import type { CategoryId, Difficulty, Problem, Skill, SkillState, Visual } from '../types';
import { ALL_SKILLS, DOMAINS, buildProblem, getSkill, matchesAids } from '../content';
import { EXAM_THEMES } from '../content/examThemes';
import { abilityToLevel } from './mastery';
import { clamp, makeRng, randomSeed } from '../lib/math';

/**
 * FP9-prøvetræning.
 *
 * Folkeskolens Prøve i matematik efter 9. klasse består af to dele, og
 * de stiller vidt forskellige krav:
 *
 *  - "Uden hjælpemidler": kort, ingen lommeregner. Tester talforståelse,
 *    hovedregning og simpel algebra.
 *  - "Med hjælpemidler": lang, alt er tilladt. Tester problembehandling
 *    og modellering på større opgaver.
 *
 * Træningen her efterligner strukturen, ikke ordlyden: opgaverne er
 * appens egne. Det er ikke officielt prøvemateriale.
 */

export type ExamPart = 'uden' | 'med';

export interface ExamConfig {
  part: ExamPart;
  /** Antal opgaver. */
  count: number;
  /** Samlet tid i minutter. */
  minutes: number;
  title: string;
  description: string;
}

export const EXAM_PARTS: Record<ExamPart, ExamConfig> = {
  uden: {
    part: 'uden',
    count: 20,
    minutes: 60,
    title: 'Uden hjælpemidler',
    description:
      'Ingen lommeregner, formelsamling eller computer. Tester talforståelse, hovedregning og simpel algebra. 1 time.',
  },
  med: {
    part: 'med',
    count: 12,
    minutes: 90,
    title: 'Med hjælpemidler',
    description:
      'Lommeregner, formelsamling og regneark er tilladt. Tre opgaver med hver sin historie og fire delopgaver, som til den rigtige prøve.',
  },
};

export interface ExamTheme {
  id: string;
  /** Opgavens nummer i sættet, fra 1. */
  number: number;
  title: string;
  intro: string;
  visual?: Visual;
}

export interface ExamItem {
  problem: Problem;
  skill: Skill;
  category: CategoryId;
  /** Opgaven delopgaven hører til, når prøven er bygget af temaer. */
  theme?: ExamTheme;
  /** "2.3" som på et rigtigt opgaveark. */
  label?: string;
}

const THEMES_PER_EXAM = 3;

export interface ExamSession {
  config: ExamConfig;
  items: ExamItem[];
  /** Elevens svar pr. opgave; null = ikke besvaret. */
  answers: (boolean | null)[];
  index: number;
  startedAt: number;
  finishedAt: number | null;
}

/**
 * Fordelingen af opgaver på kompetenceområder. Vægtene afspejler at
 * tal og algebra fylder mest i prøven, og at rene kompetenceopgaver
 * (problembehandling, modellering) fylder mere i delen med hjælpemidler.
 */
const WEIGHTS: Record<ExamPart, Record<CategoryId, number>> = {
  uden: { 'tal-algebra': 0.55, 'geometri-maaling': 0.25, 'statistik-sandsynlighed': 0.15, kompetencer: 0.05 },
  med: { 'tal-algebra': 0.35, 'geometri-maaling': 0.25, 'statistik-sandsynlighed': 0.15, kompetencer: 0.25 },
};

function categoryOf(skill: Skill): CategoryId {
  return DOMAINS.find((d) => d.id === skill.domainId)?.category ?? 'tal-algebra';
}

/**
 * Sætter et prøvesæt sammen.
 *
 * Niveauet følger elevens egne evner, men spredes: en rigtig prøve har
 * både lette og svære opgaver, så den skal ikke kun ramme elevens
 * nuværende kant.
 */
export function createExam(part: ExamPart, states: Record<string, SkillState>, seed = randomSeed()): ExamSession {
  const config = EXAM_PARTS[part];
  const rng = makeRng(seed);

  if (part === 'med') {
    const items = themedItems(rng, seed);
    return { config, items, answers: items.map(() => null), index: 0, startedAt: Date.now(), finishedAt: null };
  }

  // Kun færdigheder med mindst én generator der hører til denne prøvedel.
  const eligible = ALL_SKILLS.map((skill) => ({
    skill,
    generators: skill.generators.filter((g) => matchesAids(skill, g, part)),
  })).filter((x) => x.generators.length > 0);

  const items: ExamItem[] = [];
  const byCategory = new Map<CategoryId, typeof eligible>();
  for (const e of eligible) {
    const cat = categoryOf(e.skill);
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    (byCategory.get(cat) as typeof eligible).push(e);
  }

  // Hvor mange opgaver hvert kompetenceområde skal bidrage med.
  const quota: [CategoryId, number][] = (Object.entries(WEIGHTS[part]) as [CategoryId, number][]).map(
    ([cat, w]) => [cat, Math.max(1, Math.round(config.count * w))],
  );

  for (const [cat, n] of quota) {
    const pool = byCategory.get(cat) ?? [];
    if (!pool.length) continue;
    for (let i = 0; i < n && items.length < config.count; i++) {
      const pick = rng.pick(pool);
      const gen = rng.pick(pick.generators);
      const ability = states[pick.skill.id]?.ability ?? 2.2;
      // Spredning: cirka en tredjedel under, en tredjedel på og en
      // tredjedel over elevens niveau.
      const offset = [-1, 0, 0, 1][i % 4] as number;
      const level = clamp(abilityToLevel(ability) + offset, 1, 5) as Difficulty;
      items.push({
        problem: buildProblem(pick.skill, { level, generatorId: gen.id, seed: rng.int(1, 2 ** 30) }),
        skill: pick.skill,
        category: cat,
      });
    }
  }

  // Bland, så opgaverne ikke kommer emnevis - det gør en rigtig prøve heller ikke.
  const shuffled = rng.shuffle(items).slice(0, config.count);

  return {
    config,
    items: shuffled,
    answers: shuffled.map(() => null),
    index: 0,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

function themedItems(rng: ReturnType<typeof makeRng>, seed: number): ExamItem[] {
  const items: ExamItem[] = [];
  rng.sample(EXAM_THEMES, THEMES_PER_EXAM).forEach((def, t) => {
    const built = def.build(rng);
    const theme: ExamTheme = { id: def.id, number: t + 1, title: def.title, intro: built.intro, visual: built.visual };
    built.parts.forEach((part, p) => {
      const skill = getSkill(part.skillId);
      if (!skill) throw new Error(`Temaet ${def.id} peger på en ukendt færdighed: ${part.skillId}`);
      items.push({
        problem: {
          ...part.draft,
          id: `tema-${def.id}-${p + 1}:${seed}`,
          skillId: skill.id,
          domainId: skill.domainId,
          generatorId: `tema-${def.id}-${p + 1}`,
          level: 3,
          seconds: part.draft.seconds ?? 90,
        },
        skill,
        category: categoryOf(skill),
        theme,
        label: `${t + 1}.${p + 1}`,
      });
    });
  });
  return items;
}

export function answerExamItem(session: ExamSession, correct: boolean): ExamSession {
  const answers = [...session.answers];
  answers[session.index] = correct;
  return { ...session, answers, index: session.index + 1 };
}

export function currentExamItem(session: ExamSession): ExamItem | null {
  return session.items[session.index] ?? null;
}

export function examFinished(session: ExamSession): boolean {
  return session.index >= session.items.length;
}

/** Resterende tid i sekunder. Går aldrig under nul. */
export function timeLeft(session: ExamSession): number {
  const elapsed = (Date.now() - session.startedAt) / 1000;
  return Math.max(0, session.config.minutes * 60 - elapsed);
}

export interface ExamResult {
  correct: number;
  total: number;
  answered: number;
  percent: number;
  minutesUsed: number;
  /** Resultat pr. kompetenceområde, så eleven ved hvor der skal øves. */
  byCategory: { category: CategoryId; correct: number; total: number }[];
  /** Færdigheder eleven fejlede i - direkte link til at træne dem. */
  weakSkills: { skillId: string; name: string; wrong: number }[];
}

export function summariseExam(session: ExamSession): ExamResult {
  const answered = session.answers.filter((a) => a !== null).length;
  const correct = session.answers.filter((a) => a === true).length;

  const catMap = new Map<CategoryId, { correct: number; total: number }>();
  const weakMap = new Map<string, { name: string; wrong: number }>();

  session.items.forEach((item, i) => {
    const entry = catMap.get(item.category) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (session.answers[i] === true) entry.correct += 1;
    catMap.set(item.category, entry);

    if (session.answers[i] === false) {
      const w = weakMap.get(item.skill.id) ?? { name: item.skill.name, wrong: 0 };
      w.wrong += 1;
      weakMap.set(item.skill.id, w);
    }
  });

  return {
    correct,
    total: session.items.length,
    answered,
    percent: session.items.length ? Math.round((correct / session.items.length) * 100) : 0,
    minutesUsed: Math.round(((session.finishedAt ?? Date.now()) - session.startedAt) / 60000),
    byCategory: [...catMap.entries()].map(([category, v]) => ({ category, ...v })),
    weakSkills: [...weakMap.entries()]
      .map(([skillId, v]) => ({ skillId, ...v }))
      .sort((a, b) => b.wrong - a.wrong),
  };
}

/**
 * En grov karakterindikation på 7-trinsskalaen.
 *
 * Det er bevidst en INDIKATION, ikke en karakter: den rigtige prøve
 * bedømmes af en censor efter andre kriterier, og procenten alene
 * afgør den ikke. Teksten i brugerfladen siger det samme.
 */
export function gradeIndication(percent: number): { grade: string; note: string } {
  if (percent >= 90) return { grade: '12', note: 'Fremragende, med ingen eller få uvæsentlige mangler.' };
  if (percent >= 78) return { grade: '10', note: 'Fortrinlig, med nogle mindre mangler.' };
  if (percent >= 63) return { grade: '7', note: 'God, med en del mangler.' };
  if (percent >= 45) return { grade: '4', note: 'Jævn, med en del væsentlige mangler.' };
  if (percent >= 30) return { grade: '02', note: 'Tilstrækkelig, lige nok til at bestå.' };
  return { grade: '00', note: 'Ikke tilstrækkelig endnu.' };
}
