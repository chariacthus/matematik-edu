import type { AreaId, CategoryId, DomainId, LearnerProfile, MisconceptionState, Skill, SkillState } from '../types';
import { ALL_SKILLS, DOMAINS, domainName, getSkill, skillsOf } from '../content';
import { retention } from './srs';
import { activeMisconceptions } from './diagnosis';
import { skillStatus } from './mastery';

/**
 * Planlæggeren afgør hvad eleven skal lave nu.
 *
 * Prioriteringen er bevidst: en fejl der gentager sig kommer før alt
 * andet, derefter det der er ved at blive glemt, og først til sidst nyt
 * stof. Ellers bygger man nyt oven på et hul.
 */

export type TaskKind = 'fejlklinik' | 'repetition' | 'fortsaet' | 'nyt' | 'diagnose';

export interface PlanItem {
  kind: TaskKind;
  skillId: string;
  title: string;
  reason: string;
  /** Højere tal = højere prioritet. */
  priority: number;
  estimatedMinutes: number;
}

/**
 * Er eleven gået i gang med selve lektionen? Opgaver fra en prøve, en
 * træningsrunde eller niveautesten tæller ikke - kun at have læst
 * forklaringen og være kommet videre.
 */
export function lessonStarted(state: SkillState | undefined): boolean {
  return state !== undefined && state.phase !== 'explain';
}

/**
 * Sidder færdigheden godt nok til at bygge videre på? Enten mestret,
 * eller tydeligt på vej.
 */
export function solidEnough(state: SkillState | undefined): boolean {
  return state !== undefined && (state.masteredAt !== null || state.pKnown >= 0.6);
}

export function prerequisitesMet(skill: Skill, states: Record<string, SkillState>): boolean {
  return skill.prerequisites.every((id) => solidEnough(states[id]));
}

/** Færdigheder eleven kan gå i gang med nu. */
export function availableSkills(states: Record<string, SkillState>): Skill[] {
  return ALL_SKILLS.filter((s) => {
    const st = states[s.id];
    if (st?.masteredAt) return false;
    return prerequisitesMet(s, states);
  });
}

export interface PlanContext {
  states: Record<string, SkillState>;
  misconceptions: Record<string, MisconceptionState>;
  profile: LearnerProfile;
  now?: number;
}

/**
 * Bygger dagens plan. Returnerer en sorteret liste — den første post er
 * den appen anbefaler.
 */
export function buildPlan(ctx: PlanContext, limit = 6): PlanItem[] {
  const now = ctx.now ?? Date.now();
  const items: PlanItem[] = [];

  if (!ctx.profile.diagnosticDone) {
    return [
      {
        kind: 'diagnose',
        skillId: '',
        title: 'Tag niveautesten',
        reason: 'Vi skal vide hvor du står, før vi kan tilpasse opgaverne til dig.',
        priority: 1000,
        estimatedMinutes: 12,
      },
    ];
  }

  /* 1. Fejl der gentager sig — de blokerer al videre progression. */
  for (const { state, def } of activeMisconceptions(ctx.misconceptions)) {
    if (state.count < 2) continue;
    const skillId = state.skillIds[state.skillIds.length - 1];
    if (!skillId) continue;
    const skill = getSkill(skillId);
    if (!skill) continue;
    items.push({
      kind: 'fejlklinik',
      skillId,
      title: def.name,
      reason: `Du har lavet den her fejl ${state.count} gange. Tag den først.`,
      priority: 900 + state.count * 10,
      estimatedMinutes: 6,
    });
  }

  /* 2. Repetition af noget der er ved at blive glemt. */
  for (const state of Object.values(ctx.states)) {
    if (state.masteredAt === null || state.due === null || state.due > now) continue;
    const skill = getSkill(state.skillId);
    if (!skill) continue;
    const r = retention(state, now);
    items.push({
      kind: 'repetition',
      skillId: state.skillId,
      title: skill.name,
      reason: r < 0.6
        ? 'Det er et stykke tid siden. Se om du stadig kan det.'
        : 'Kort genopfriskning, så det bliver siddende.',
      priority: 700 + Math.round((1 - r) * 100),
      estimatedMinutes: 4,
    });
  }

  /* 3. Fortsæt hvor eleven slap. */
  for (const state of Object.values(ctx.states)) {
    if (state.masteredAt !== null || !lessonStarted(state)) continue;
    const skill = getSkill(state.skillId);
    if (!skill) continue;
    items.push({
      kind: 'fortsaet',
      skillId: state.skillId,
      title: skill.name,
      // Sig hvor langt man ER, ikke hvor meget der mangler. "Du mangler
      // 89%" lyder som om man ikke er kommet i gang.
      reason: `Du er ${Math.round(state.pKnown * 100)} % inde. Fortsæt til den sidder.`,
      priority: 500 + Math.round(state.pKnown * 100),
      estimatedMinutes: 8,
    });
  }

  /* 4. Nyt stof, styret af diagnosen og af hvad der er lav-hængende. */
  const weakest = [...ctx.profile.recommended];
  const ready = availableSkills(ctx.states).filter((s) => !lessonStarted(ctx.states[s.id]));
  for (const skill of ready) {
    const domainRank = weakest.indexOf(skill.domainId);
    const diagnosticScore = ctx.profile.diagnostic[skill.domainId] ?? 50;
    items.push({
      kind: 'nyt',
      skillId: skill.id,
      title: skill.name,
      reason:
        domainRank >= 0
          ? `${domainName(skill.domainId)} er et af de emner din niveautest pegede på.`
          : skill.goal,
      // Anbefalede emner først, og inden for dem de letteste færdigheder.
      priority: 300 + (domainRank >= 0 ? 60 - domainRank * 10 : 0) + (100 - diagnosticScore) / 4 - skill.tier * 5,
      estimatedMinutes: 12,
    });
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Overblik                                                            */
/* ------------------------------------------------------------------ */

export interface DomainProgress {
  domainId: DomainId;
  name: string;
  category: CategoryId;
  area: AreaId;
  /** 0-100. Vægter mestrede færdigheder fuldt og igangværende delvist. */
  percent: number;
  mastered: number;
  total: number;
  inProgress: number;
  /** Fra diagnosen, hvis der er en. */
  diagnostic: number | null;
}

export function domainProgress(
  states: Record<string, SkillState>,
  profile: LearnerProfile,
): DomainProgress[] {
  return DOMAINS.map((domain) => {
    const skills = domain.skills;
    let sum = 0;
    let mastered = 0;
    let inProgress = 0;
    for (const skill of skills) {
      const st = states[skill.id];
      if (!st) continue;
      if (st.masteredAt !== null) {
        mastered += 1;
        sum += 1;
      } else if (st.attempts > 0) {
        inProgress += 1;
        sum += st.pKnown;
      }
    }
    return {
      domainId: domain.id,
      name: domain.name,
      category: domain.category,
      area: domain.area,
      percent: skills.length ? Math.round((sum / skills.length) * 100) : 0,
      mastered,
      total: skills.length,
      inProgress,
      diagnostic: profile.diagnostic[domain.id] ?? null,
    };
  });
}

/** Overordnet fremdrift på tværs af hele pensum. */
export function overallProgress(states: Record<string, SkillState>): {
  percent: number;
  mastered: number;
  total: number;
} {
  const total = ALL_SKILLS.length;
  let sum = 0;
  let mastered = 0;
  for (const skill of ALL_SKILLS) {
    const st = states[skill.id];
    if (!st) continue;
    if (st.masteredAt !== null) {
      mastered += 1;
      sum += 1;
    } else {
      sum += st.pKnown * 0.9;
    }
  }
  return { percent: Math.round((sum / total) * 100), mastered, total };
}

/** Næste færdighed i et emne som eleven kan gå i gang med. */
export function nextSkillInDomain(domainId: DomainId, states: Record<string, SkillState>): Skill | null {
  const skills = skillsOf(domainId);
  const started = skills.find((s) => {
    const st = states[s.id];
    return st && st.masteredAt === null && lessonStarted(st);
  });
  if (started) return started;
  const ready = skills.find((s) => {
    const st = states[s.id];
    return !st?.masteredAt && prerequisitesMet(s, states);
  });
  return ready ?? skills.find((s) => !states[s.id]?.masteredAt) ?? null;
}

/** Status pr. færdighed, klar til visning i biblioteket. */
export function skillOverview(states: Record<string, SkillState>) {
  return ALL_SKILLS.map((skill) => ({
    skill,
    state: states[skill.id],
    status: skillStatus(states[skill.id], prerequisitesMet(skill, states)),
  }));
}
