import type { Attempt, Difficulty, LessonPhase, Problem, Skill, SkillState } from '../types';
import { buildProblem, generatorsFor } from '../content';
import { abilityToLevel } from './mastery';
import { readBehaviour } from './diagnosis';
import { clamp } from '../lib/math';

/**
 * Den adaptive motor: hvilket niveau skal næste opgave have, og hvilken
 * slags opgave skal det være?
 */

export interface LevelDecision {
  level: Difficulty;
  /** Hvad der udløste ændringen - vises for eleven og bruges i test. */
  reason:
    | 'start'
    | 'op-klarer-let'
    | 'ned-mange-fejl'
    | 'ned-for-mange-hints'
    | 'hold-stabil'
    | 'fase-udfordring'
    | 'fase-guidet';
  changed: boolean;
}

/**
 * Bestemmer sværhedsgraden for næste opgave.
 *
 * Elo-vurderingen er grundlaget, men de seneste forsøg får lov at
 * overstyre den. Det er bevidst: en elev der lige har lavet tre fejl i
 * træk skal have en lettere opgave NU, ikke om fem opgaver når
 * gennemsnittet har flyttet sig.
 */
export function chooseLevel(state: SkillState, attempts: Attempt[], phase: LessonPhase): LevelDecision {
  const base = abilityToLevel(state.ability);
  const skillAttempts = attempts.filter((a) => a.skillId === state.skillId);
  const previous = skillAttempts.length ? (skillAttempts[skillAttempts.length - 1] as Attempt).level : null;
  const decide = (level: number, reason: LevelDecision['reason']): LevelDecision => ({
    level: clamp(level, 1, 5) as Difficulty,
    reason,
    changed: previous !== null && clamp(level, 1, 5) !== previous,
  });

  // Fasen sætter gulvet og loftet, også på den allerførste opgave.
  // Ellers blev den første guidede opgave sværere end den næste.
  if (phase === 'guided') return decide(clamp(base - 1, 1, 4), 'fase-guidet');
  if (phase === 'challenge') return decide(clamp(base + 1, 2, 5), 'fase-udfordring');

  if (skillAttempts.length === 0) return decide(clamp(base, 1, 3), 'start');

  const behaviour = readBehaviour(skillAttempts, 6);

  // Tre rigtige i træk uden hints: eleven keder sig, sæt niveauet op.
  if (state.cleanStreak >= 3 && behaviour.cruising) return decide(base + 1, 'op-klarer-let');

  // Under 45 % rigtige for nylig: gå et trin tilbage.
  if (behaviour.struggling) return decide(base - 1, 'ned-mange-fejl');

  // Eleven klarer den, men kun med hints. Det er ikke forståelse endnu.
  if (behaviour.hintDependent && behaviour.recentAccuracy < 0.8) return decide(base - 1, 'ned-for-mange-hints');

  return decide(base, 'hold-stabil');
}

/* ------------------------------------------------------------------ */
/* Valg af opgavetype                                                  */
/* ------------------------------------------------------------------ */

/**
 * Vælger hvilken generator næste opgave skal komme fra.
 *
 * Fase 5 ("Variation") er hele pointen her: eleven skal møde en ANDEN
 * opgavetype inden for samme færdighed, så den lærte opskrift ikke bare
 * bliver en rutine der kun virker på én indpakning.
 */
export function chooseGenerator(
  skill: Skill,
  level: Difficulty,
  phase: LessonPhase,
  attempts: Attempt[],
): { generatorId?: string; avoidGeneratorId?: string } {
  const forSkill = attempts.filter((a) => a.skillId === skill.id);
  const last = forSkill[forSkill.length - 1];
  const available = generatorsFor(skill, level);

  if (phase === 'guided' || phase === 'independent') {
    // Kernetypen først - den der svarer til det gennemregnede eksempel.
    return { generatorId: available[0]?.id };
  }

  if (phase === 'variation') {
    const used = new Set(forSkill.map((a) => a.generatorId));
    const unseen = available.find((g) => !used.has(g.id));
    if (unseen) return { generatorId: unseen.id };
    // Alle typer er set - tag bare en anden end den sidste.
    const other = available.filter((g) => g.id !== last?.generatorId);
    return { generatorId: (other.length ? other : available)[0]?.id };
  }

  if (phase === 'mastery') {
    // Mastery-check skal blande typerne, så det er forståelse og ikke
    // genkendelse der testes.
    const counts = new Map<string, number>();
    forSkill.forEach((a) => counts.set(a.generatorId, (counts.get(a.generatorId) ?? 0) + 1));
    const leastUsed = [...available].sort((a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
    return { generatorId: leastUsed[0]?.id };
  }

  return { avoidGeneratorId: last?.generatorId };
}

export interface ProblemOverride {
  /** Samme opgavetype igen, fx lige efter en opgave der gik galt. */
  generatorId?: string;
  maxLevel?: Difficulty;
  minLevel?: Difficulty;
}

/** Bygger den næste opgave for en færdighed i en given fase. */
export function nextProblem(
  skill: Skill,
  state: SkillState,
  attempts: Attempt[],
  phase: LessonPhase,
  seed?: number,
  override: ProblemOverride = {},
): { problem: Problem; decision: LevelDecision } {
  const decision = chooseLevel(state, attempts, phase);
  let level = decision.level;
  if (override.maxLevel !== undefined) level = Math.min(level, override.maxLevel) as Difficulty;
  if (override.minLevel !== undefined) level = Math.max(level, override.minLevel) as Difficulty;
  const pick = override.generatorId ? { generatorId: override.generatorId } : chooseGenerator(skill, level, phase, attempts);
  const problem = buildProblem(skill, { level, seed, ...pick });
  return { problem, decision: { ...decision, level } };
}

/* ------------------------------------------------------------------ */
/* Faseprogression                                                     */
/* ------------------------------------------------------------------ */

/** Hvor mange opgaver der skal klares i hver fase før man går videre. */
export const PHASE_TARGETS: Record<LessonPhase, number> = {
  explain: 0,
  example: 0,
  guided: 2,
  independent: 2,
  variation: 2,
  challenge: 1,
  mastery: 3,
};

export const PHASE_LABELS: Record<LessonPhase, string> = {
  explain: 'Forklaring',
  example: 'Eksempel',
  guided: 'Guidet træning',
  independent: 'Selvstændig opgave',
  variation: 'Variation',
  challenge: 'Udfordring',
  mastery: 'Mestringstjek',
};

export const PHASE_HELP: Record<LessonPhase, string> = {
  explain: 'Her får du ideen bag emnet, kort og med eksempler.',
  example: 'Se en opgave blive løst trin for trin.',
  guided: 'Nu prøver du selv, men du får hjælp undervejs.',
  independent: 'Samme type opgave, men nu uden hjælp.',
  variation: 'En anden slags opgave i samme emne, så du ikke bare lærer én opskrift.',
  challenge: 'En sværere opgave. Tag dig god tid.',
  mastery: 'Tre blandede opgaver. Klarer du dem, er emnet mestret.',
};

const ORDER: LessonPhase[] = ['explain', 'example', 'guided', 'independent', 'variation', 'challenge', 'mastery'];

export function nextPhase(phase: LessonPhase): LessonPhase | null {
  const i = ORDER.indexOf(phase);
  return i < 0 || i === ORDER.length - 1 ? null : (ORDER[i + 1] as LessonPhase);
}

export function previousPhase(phase: LessonPhase): LessonPhase | null {
  const i = ORDER.indexOf(phase);
  return i <= 0 ? null : (ORDER[i - 1] as LessonPhase);
}

export interface PhaseOutcome {
  phase: LessonPhase;
  progress: number;
  /** Opgaver i træk der ikke blev klaret i den nye fase. */
  misses: number;
  /** Skal eleven et trin tilbage? */
  regressed: boolean;
  /** Er hele forløbet gennemført? */
  completed: boolean;
  /** Eleven prøvede at springe forklaringen over, men det holdt ikke. */
  testOutFailed: boolean;
}

/**
 * Flytter eleven gennem 7-trins-forløbet.
 *
 * Der tælles i opgaver, ikke i forsøg: første forkerte svar giver et
 * forsøg mere, og først når opgaven er tabt, tæller den som en fejl.
 * To tabte opgaver i træk i samme fase sender eleven et trin tilbage,
 * hvor der er mere støtte. Det gælder ikke udfordringen - dér må man
 * gerne fejle.
 *
 * Et rigtigt svar i andet forsøg rykker kun i den guidede fase. I de
 * andre faser skal det sidde i første hug for at tælle.
 */
export function advancePhase(state: SkillState, correct: boolean, tries: number): PhaseOutcome {
  const target = PHASE_TARGETS[state.phase];
  const misses = state.phaseMisses ?? 0;
  const stay = (progress: number, missCount: number): PhaseOutcome => ({
    phase: state.phase,
    progress,
    misses: missCount,
    regressed: false,
    completed: false,
    testOutFailed: false,
  });

  if (state.testingOut) {
    if (!correct || tries > 1) {
      return { phase: 'guided', progress: 0, misses: 0, regressed: true, completed: false, testOutFailed: true };
    }
  } else if (!correct) {
    if (tries < 2) return stay(state.phaseProgress, misses);
    const lost = misses + 1;
    const canRegress = state.phase !== 'challenge' && state.phase !== 'guided';
    if (lost >= 2 && canRegress) {
      const back = previousPhase(state.phase);
      const backPhase = back && back !== 'explain' && back !== 'example' ? back : 'guided';
      return { phase: backPhase, progress: 0, misses: 0, regressed: true, completed: false, testOutFailed: false };
    }
    return stay(Math.max(0, state.phaseProgress - 1), lost);
  } else if (tries > 1 && state.phase !== 'guided') {
    return stay(state.phaseProgress, 0);
  }

  const progress = state.phaseProgress + 1;
  if (progress < target) return stay(progress, 0);

  const next = nextPhase(state.phase);
  if (!next) {
    return { phase: 'mastery', progress, misses: 0, regressed: false, completed: true, testOutFailed: false };
  }
  return { phase: next, progress: 0, misses: 0, regressed: false, completed: false, testOutFailed: false };
}

/** Er en fase en hvor eleven løser opgaver? */
export function isPracticePhase(phase: LessonPhase): boolean {
  return phase !== 'explain' && phase !== 'example';
}

/** Hints er tilgængelige uden straf i den guidede fase. */
export function hintsAreFree(phase: LessonPhase): boolean {
  return phase === 'guided';
}
