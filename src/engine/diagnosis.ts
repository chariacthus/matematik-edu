import type { Attempt, Misconception, MisconceptionState, Problem, SkillState } from '../types';
import { findTrap, type Response } from '../lib/answer';
import { getMisconception } from '../content/misconceptions';

/**
 * Fejlanalyse.
 *
 * Kernen i kravet "hvis eleven laver den samme fejl flere gange, så stop
 * progressionen og forklar præcis den fejl". Vi tæller ikke bare forkerte
 * svar - vi tæller HVILKEN fejl der blev lavet.
 */

/** Hvor mange gange samme fejl skal ses, før vi afbryder og forklarer. */
export const INTERRUPT_THRESHOLD = 2;

export interface ErrorAnalysis {
  /** Den identificerede misforståelse, hvis vi kunne genkende fejlen. */
  misconception: Misconception | null;
  /** Målrettet forklaring til netop dette fejlsvar. */
  feedback: string | null;
  /** Er det nu tredje gang? Så skal progressionen stoppes. */
  shouldInterrupt: boolean;
  /** Hvor mange gange eleven har lavet denne fejl i alt. */
  count: number;
}

export function analyseError(
  problem: Problem,
  response: Response,
  misconceptions: Record<string, MisconceptionState>,
): ErrorAnalysis {
  const trap = findTrap(problem, response);
  if (!trap) {
    return { misconception: null, feedback: null, shouldInterrupt: false, count: 0 };
  }
  const known = misconceptions[trap.misconceptionId];
  const count = (known?.count ?? 0) + 1;
  return {
    misconception: getMisconception(trap.misconceptionId) ?? null,
    feedback: trap.feedback,
    shouldInterrupt: count >= INTERRUPT_THRESHOLD,
    count,
  };
}

/** Registrerer en fejl i elevens fejlprofil. */
export function recordMisconception(
  misconceptions: Record<string, MisconceptionState>,
  id: string,
  skillId: string,
): Record<string, MisconceptionState> {
  const prev = misconceptions[id];
  return {
    ...misconceptions,
    [id]: {
      id,
      count: (prev?.count ?? 0) + 1,
      lastSeen: Date.now(),
      resolved: false,
      skillIds: prev?.skillIds.includes(skillId) ? prev.skillIds : [...(prev?.skillIds ?? []), skillId],
    },
  };
}

/**
 * Markerer en fejl som overstået. Det sker først når eleven svarer
 * rigtigt på en opgave der netop kunne have udløst den fejl - ikke bare
 * fordi der er gået noget tid.
 */
export function resolveMisconceptions(
  misconceptions: Record<string, MisconceptionState>,
  problem: Problem,
): Record<string, MisconceptionState> {
  const ids = (problem.traps ?? []).map((t) => t.misconceptionId);
  if (!ids.length) return misconceptions;
  let changed = false;
  const next = { ...misconceptions };
  for (const id of ids) {
    const m = next[id];
    if (m && !m.resolved) {
      next[id] = { ...m, resolved: true };
      changed = true;
    }
  }
  return changed ? next : misconceptions;
}

/** De fejl der stadig driller, sorteret efter hvor tit de sker. */
export function activeMisconceptions(
  misconceptions: Record<string, MisconceptionState>,
): { state: MisconceptionState; def: Misconception }[] {
  return Object.values(misconceptions)
    .filter((m) => !m.resolved && m.count > 0)
    .map((state) => ({ state, def: getMisconception(state.id) }))
    .filter((x): x is { state: MisconceptionState; def: Misconception } => x.def !== undefined)
    .sort((a, b) => b.state.count - a.state.count || b.state.lastSeen - a.state.lastSeen);
}

/* ------------------------------------------------------------------ */
/* Adfærdsmønstre                                                      */
/* ------------------------------------------------------------------ */

export interface BehaviourSignals {
  /** Svarer eleven så hurtigt at det ligner klik frem for regning? */
  rushing: boolean;
  /** Bruger eleven hints på næsten alt? */
  hintDependent: boolean;
  /** Bruger eleven meget længere tid end forventet? */
  struggling: boolean;
  /** Har eleven mange rigtige i træk uden hjælp? */
  cruising: boolean;
  /** Andel rigtige i de seneste forsøg. */
  recentAccuracy: number;
}

/**
 * Kigger på de seneste forsøg og finder mønstre. Det er dem der styrer
 * om sværhedsgraden skal op eller ned - og om appen skal sige noget til
 * eleven om arbejdsvanerne.
 */
export function readBehaviour(attempts: Attempt[], window = 8): BehaviourSignals {
  const recent = attempts.slice(-window);
  if (recent.length < 3) {
    return { rushing: false, hintDependent: false, struggling: false, cruising: false, recentAccuracy: 1 };
  }
  const correct = recent.filter((a) => a.correct).length;
  const recentAccuracy = correct / recent.length;
  const withHints = recent.filter((a) => a.hints > 0).length / recent.length;
  const avgSeconds = recent.reduce((sum, a) => sum + a.seconds, 0) / recent.length;
  const fast = recent.filter((a) => a.seconds < 5).length / recent.length;

  return {
    rushing: fast > 0.5 && recentAccuracy < 0.6,
    hintDependent: withHints > 0.6,
    struggling: recentAccuracy < 0.45 || avgSeconds > 150,
    cruising: recentAccuracy >= 0.9 && withHints < 0.2,
    recentAccuracy,
  };
}

/** Færdigheder hvor eleven er gået tilbage siden sidst. */
export function slippingSkills(states: Record<string, SkillState>): SkillState[] {
  return Object.values(states)
    .filter((s) => s.attempts >= 4 && s.correct / s.attempts < 0.5 && s.masteredAt === null)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);
}
