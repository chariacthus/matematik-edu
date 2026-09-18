import type { SkillState } from '../types';
import { clamp, roundTo } from '../lib/math';
import { DAY_MS } from '../lib/dates';

/**
 * Spaced repetition, inspireret af SM-2.
 *
 * Formålet er ikke at eleven gentager alt hele tiden, men at et emne
 * dukker op igen lige før det bliver glemt. Klarer eleven det let,
 * vokser intervallet hurtigt. Fejler eleven, starter det forfra.
 */

export type ReviewGrade = 'igen' | 'svaert' | 'godt' | 'let';

const FIRST_INTERVALS: Record<ReviewGrade, number> = {
  igen: 0,
  svaert: 1,
  godt: 2,
  let: 4,
};

export function scheduleReview(state: SkillState, grade: ReviewGrade, now = Date.now()): SkillState {
  const failed = grade === 'igen';

  // Lethedsfaktoren justeres efter hvor let det gik.
  const easeDelta = { igen: -0.25, svaert: -0.14, godt: 0, let: 0.13 }[grade];
  const ease = clamp(roundTo(state.ease + easeDelta, 3), 1.3, 3.2);

  let interval: number;
  if (failed) {
    // Tilbage til start - men ikke helt, hvis eleven har set det mange gange.
    interval = 0;
  } else if (state.interval === 0) {
    // Første rigtige repetition, eller efter et tilbagefald.
    interval = FIRST_INTERVALS[grade];
  } else {
    const factor = grade === 'svaert' ? 1.25 : grade === 'let' ? ease * 1.25 : ease;
    interval = Math.max(1, Math.round(state.interval * factor));
  }

  // Loft: et halvt år er rigeligt inden for ét skoleår.
  interval = Math.min(interval, 180);

  return {
    ...state,
    ease,
    interval,
    // Fejler eleven, skal emnet op igen i dag.
    due: failed ? now : now + interval * DAY_MS,
    reviews: state.reviews + 1,
    lapses: state.lapses + (failed ? 1 : 0),
  };
}

/** Oversætter et forsøg til en karakter i SRS-forstand. */
export function gradeFromOutcome(outcome: {
  correct: boolean;
  hints: number;
  tries: number;
  seconds: number;
  expectedSeconds: number;
}): ReviewGrade {
  if (!outcome.correct) return 'igen';
  if (outcome.hints >= 2 || outcome.tries > 2) return 'svaert';
  if (outcome.hints === 0 && outcome.tries === 1 && outcome.seconds <= outcome.expectedSeconds * 1.1) return 'let';
  return 'godt';
}

/** Første planlægning når en færdighed lige er blevet mestret. */
export function scheduleFirstReview(state: SkillState, now = Date.now()): SkillState {
  return { ...state, interval: 2, due: now + 2 * DAY_MS, ease: state.ease, reviews: 0 };
}

export function isDue(state: SkillState, now = Date.now()): boolean {
  return state.masteredAt !== null && state.due !== null && state.due <= now;
}

/**
 * Hvor meget eleven forventes at huske lige nu, baseret på hvor længe
 * der er gået i forhold til det planlagte interval. Bruges til at
 * prioritere hvad der haster mest at repetere.
 */
export function retention(state: SkillState, now = Date.now()): number {
  if (state.masteredAt === null || state.lastSeen === null) return state.pKnown;
  const days = (now - state.lastSeen) / DAY_MS;
  const stability = Math.max(1, state.interval || 1);
  // Eksponentiel glemselskurve: R = e^(-t/S)
  return clamp(roundTo(Math.exp(-days / (stability * 1.6)), 4), 0, 1);
}

/** Færdigheder der skal repeteres, de mest trængende først. */
export function dueSkills(states: Record<string, SkillState>, now = Date.now()): SkillState[] {
  return Object.values(states)
    .filter((s) => isDue(s, now))
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
}
