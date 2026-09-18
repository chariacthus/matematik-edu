import type { Attempt, Difficulty, LessonPhase, Problem, SkillState } from '../types';
import { clamp, roundTo } from '../lib/math';

/* ------------------------------------------------------------------ */
/* Bayesian Knowledge Tracing                                          */
/* ------------------------------------------------------------------ */

/**
 * BKT-parametre.
 *
 * pSlip  — sandsynligheden for at fejle noget man faktisk kan (sjusk).
 * pGuess — sandsynligheden for at ramme rigtigt uden at kunne det.
 * pLearn — sandsynligheden for at lære det af netop denne opgave.
 *
 * pGuess er bevidst høj for multiple choice: der ER en reel chance for
 * at ramme rigtigt ved at gætte, og modellen skal ikke tolke et heldigt
 * gæt som forståelse.
 */
export interface BktParams {
  pInit: number;
  pSlip: number;
  pGuess: number;
  pLearn: number;
  /** Grænsen for hvornår vi kalder en færdighed mestret. */
  masteryThreshold: number;
}

export const BKT: BktParams = {
  pInit: 0.25,
  pSlip: 0.1,
  pGuess: 0.2,
  pLearn: 0.18,
  masteryThreshold: 0.92,
};

export interface EvidenceOptions {
  correct: boolean;
  /** Antal hints brugt. Hjælp tæller som svagere bevis. */
  hints: number;
  /** Antal forsøg på opgaven. */
  tries: number;
  /** Sekunder brugt. */
  seconds: number;
  /** Opgavens forventede tid. */
  expectedSeconds: number;
  /** Var det et multiple choice? Så er gættechancen større. */
  multipleChoice: boolean;
  /** Antal svarmuligheder, hvis multiple choice. */
  choiceCount?: number;
  level: Difficulty;
  /** Elevens nuværende evne. Bruges til at vurdere om opgaven var svær. */
  ability: number;
}

/**
 * Opdaterer sandsynligheden for at eleven kan færdigheden.
 *
 * Det vigtige ved den her funktion er at den ikke behandler alle rigtige
 * svar ens. Et rigtigt svar på 3 sekunder på en let multiple choice er
 * næsten intet bevis. Et rigtigt svar på en svær opgave uden hints er
 * stærkt bevis.
 */
export function updateMastery(pKnown: number, ev: EvidenceOptions): number {
  // Et rigtigt svar der kommer hurtigere end opgaven kan læses, er ikke
  // et svar. Det får lov at være neutralt: det trækker ikke ned, men det
  // bygger heller ikke mestring op - uanset hvor mange gange det
  // gentager sig. Ellers kunne man klikke sig til "mestret".
  if (ev.correct && isImplausiblyFast(ev)) {
    return clamp(roundTo(pKnown, 6), 0.001, 0.999);
  }

  const guess = effectiveGuessRate(ev);
  const slip = effectiveSlipRate(ev);

  let posterior: number;
  if (ev.correct) {
    const num = pKnown * (1 - slip);
    const den = num + (1 - pKnown) * guess;
    posterior = den === 0 ? pKnown : num / den;
  } else {
    const num = pKnown * slip;
    const den = num + (1 - pKnown) * (1 - guess);
    posterior = den === 0 ? pKnown : num / den;
  }

  // Selve det at arbejde med opgaven kan have lært eleven noget.
  const learned = posterior + (1 - posterior) * BKT.pLearn * learningWeight(ev);
  return clamp(roundTo(learned, 6), 0.001, 0.999);
}

/**
 * Er svaret afgivet hurtigere end opgaven overhovedet kan læses?
 *
 * Grænsen er tre sekunder, eller en tiendedel af den forventede tid for
 * de længste opgaver. Under den kan man ikke have læst opgaveteksten.
 */
export function isImplausiblyFast(ev: Pick<EvidenceOptions, 'seconds' | 'expectedSeconds'>): boolean {
  return ev.seconds < Math.max(3, ev.expectedSeconds * 0.1);
}

/** Hvor meget eleven kan forventes at have lært af forsøget. */
function learningWeight(ev: EvidenceOptions): number {
  // Man lærer ikke af en opgave man ikke har læst.
  const speedRatio = ev.seconds / Math.max(5, ev.expectedSeconds);
  const engagement = speedRatio < 0.2 ? 0.1 : speedRatio < 0.4 ? 0.6 : 1;

  // Man lærer mest af at kæmpe sig igennem med lidt hjælp, mindre af at
  // få det hele foræret, og mindre af at svare rigtigt uden at tænke.
  let base: number;
  if (ev.correct && ev.hints === 0 && ev.tries === 1) base = 1;
  else if (ev.correct && ev.hints > 0) base = 0.8;
  else if (!ev.correct && ev.hints > 0) base = 0.5;
  else base = 0.35;

  return base * engagement;
}

/**
 * Hvor sandsynligt er det at et rigtigt svar er et gæt?
 *
 * Tre ting hæver gættechancen: multiple choice med få muligheder, et
 * svar der kommer mistænkeligt hurtigt, og en opgave der ligger over
 * elevens niveau.
 */
export function effectiveGuessRate(ev: EvidenceOptions): number {
  let guess = BKT.pGuess;

  if (ev.multipleChoice) {
    const n = Math.max(2, ev.choiceCount ?? 4);
    // Ren tilfældighed giver 1/n. Vi lægger lidt til, fordi elever
    // sjældent gætter helt tilfældigt - de kan ofte udelukke noget.
    guess = Math.max(guess, 1 / n + 0.12);
  }

  // Svar afgivet på under en fjerdedel af den forventede tid ser ud som
  // klik, ikke som regning.
  const speedRatio = ev.seconds / Math.max(5, ev.expectedSeconds);
  if (speedRatio < 0.25) guess = Math.min(0.75, guess + 0.2);
  else if (speedRatio < 0.5) guess = Math.min(0.65, guess + 0.08);

  // En opgave langt over elevens niveau: et rigtigt svar er mere
  // sandsynligt et held.
  const stretch = ev.level - ev.ability;
  if (stretch > 1.5) guess = Math.min(0.75, guess + 0.1);

  // Hints giver information væk. Et rigtigt svar efter tre hints - hvor
  // det sidste næsten er facit - beviser langt mindre end et rigtigt
  // svar fundet på egen hånd, og skal tælle derefter.
  if (ev.hints > 0) guess = Math.min(0.85, guess + ev.hints * 0.09);

  return guess;
}

/** Hvor sandsynligt er det at et forkert svar bare er sjusk? */
export function effectiveSlipRate(ev: EvidenceOptions): number {
  let slip = BKT.pSlip;

  // Mange hints betyder at eleven var i tvivl - så er et forkert svar
  // mindre sandsynligt "bare" sjusk. Gælder kun forkerte svar: for et
  // rigtigt svar håndteres hints i gættesandsynligheden i stedet.
  if (!ev.correct && ev.hints >= 2) slip = Math.max(0.04, slip - 0.05);

  // Et meget hurtigt forkert svar er ofte sjusk eller et fejlklik.
  if (ev.seconds < Math.max(4, ev.expectedSeconds * 0.2)) slip = Math.min(0.3, slip + 0.12);

  // En opgave under elevens niveau: en fejl her er mere sandsynligt sjusk.
  if (ev.ability - ev.level > 1.5) slip = Math.min(0.3, slip + 0.08);

  return slip;
}

/* ------------------------------------------------------------------ */
/* Elo-agtig evnevurdering                                             */
/* ------------------------------------------------------------------ */

/**
 * Elevens evne på en skala der matcher sværhedsgraderne 1-5. Den styrer
 * hvilket niveau næste opgave trækkes på.
 *
 * Elo passer godt her, fordi den automatisk vægter overraskelser
 * tungest: at klare en svær opgave rykker meget, at klare en let rykker
 * næsten ingenting.
 */
export function updateAbility(ability: number, ev: EvidenceOptions): number {
  const expected = 1 / (1 + 10 ** ((ev.level - ability) / 1.2));
  let actual = ev.correct ? 1 : 0;

  // Hints er delvis hjælp - så er præstationen ikke en hel sejr.
  if (ev.correct && ev.hints > 0) actual = Math.max(0.5, 1 - ev.hints * 0.2);
  if (ev.correct && ev.tries > 1) actual = Math.min(actual, 0.6);

  // K-faktor: store spring i starten, finere justering når vi kender
  // eleven bedre.
  const k = 0.32;
  return clamp(roundTo(ability + k * (actual - expected), 4), 0.5, 5.5);
}

/** Evne → hvilket sværhedsniveau opgaver skal trækkes på. */
export function abilityToLevel(ability: number): Difficulty {
  return clamp(Math.round(ability), 1, 5) as Difficulty;
}

/* ------------------------------------------------------------------ */
/* Ny færdighedstilstand                                               */
/* ------------------------------------------------------------------ */

export function newSkillState(skillId: string, startAbility = 1.6): SkillState {
  return {
    skillId,
    pKnown: BKT.pInit,
    ability: startAbility,
    attempts: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    phase: 'explain',
    phaseProgress: 0,
    lastSeen: null,
    masteredAt: null,
    interval: 0,
    ease: 2.5,
    due: null,
    reviews: 0,
    lapses: 0,
    avgSeconds: 0,
    hintsUsed: 0,
    cleanStreak: 0,
  };
}

/** Bygger bevis-objektet ud fra en opgave og et forsøg. */
export function evidenceFrom(
  problem: Problem,
  state: SkillState,
  outcome: { correct: boolean; hints: number; tries: number; seconds: number },
): EvidenceOptions {
  return {
    correct: outcome.correct,
    hints: outcome.hints,
    tries: outcome.tries,
    seconds: outcome.seconds,
    expectedSeconds: problem.seconds,
    multipleChoice: problem.answer.type === 'choice',
    choiceCount: problem.choices?.length,
    level: problem.level,
    ability: state.ability,
  };
}

/**
 * Anvender et forsøg på færdighedens tilstand. Returnerer en ny
 * tilstand - vi muterer aldrig, så React kan se ændringen.
 */
export function applyAttempt(
  state: SkillState,
  problem: Problem,
  outcome: { correct: boolean; hints: number; tries: number; seconds: number; phase: Attempt['phase'] },
): SkillState {
  const ev = evidenceFrom(problem, state, outcome);
  const attempts = state.attempts + 1;
  const correct = state.correct + (outcome.correct ? 1 : 0);
  const streak = outcome.correct ? state.streak + 1 : 0;
  const cleanStreak = outcome.correct && outcome.hints === 0 && outcome.tries === 1 ? state.cleanStreak + 1 : 0;

  const pKnown = updateMastery(state.pKnown, ev);
  const ability = updateAbility(state.ability, ev);

  // Løbende gennemsnit, så enkelte udsving ikke dominerer.
  const avgSeconds = state.attempts === 0
    ? outcome.seconds
    : roundTo((state.avgSeconds * state.attempts + outcome.seconds) / attempts, 2);

  return {
    ...state,
    pKnown,
    ability,
    attempts,
    correct,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    cleanStreak,
    hintsUsed: state.hintsUsed + outcome.hints,
    avgSeconds,
    lastSeen: Date.now(),
  };
}

export function accuracy(state: SkillState): number {
  return state.attempts === 0 ? 0 : state.correct / state.attempts;
}

export function isMastered(state: SkillState): boolean {
  return state.pKnown >= BKT.masteryThreshold && state.phase === 'mastery' && state.masteredAt !== null;
}

/** Færdighedens status, som den vises i brugerfladen. */
export function skillStatus(
  state: SkillState | undefined,
  prerequisitesMet: boolean,
): 'locked' | 'ready' | 'learning' | 'review' | 'mastered' {
  if (!state) return prerequisitesMet ? 'ready' : 'locked';
  if (state.masteredAt !== null) {
    if (state.due !== null && state.due <= Date.now()) return 'review';
    return 'mastered';
  }
  if (state.attempts > 0 || state.phase !== 'explain') return 'learning';
  return prerequisitesMet ? 'ready' : 'locked';
}

/** Hvor langt eleven er i 7-trins-forløbet, som en andel. */
export function phaseIndex(phase: LessonPhase): number {
  return ['explain', 'example', 'guided', 'independent', 'variation', 'challenge', 'mastery'].indexOf(phase);
}
