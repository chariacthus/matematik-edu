import type { AchievementContext, AchievementDef, Difficulty, Gamification, LessonPhase } from '../types';
import { dayKey, daysBetween } from '../lib/dates';

/**
 * XP, niveauer og badges.
 *
 * Bevidst tilbageholdende: gamification skal motivere til at møde op,
 * ikke til at klikke hurtigt igennem. Derfor gives der ikke XP for at
 * svare hurtigt, og der gives mest XP for det der er svært.
 */

export const XP = {
  correctBase: 10,
  /** Ekstra pr. sværhedsgrad over 1. */
  perLevel: 4,
  /** Fradrag pr. brugt hint. Aldrig så stort at hints ikke kan betale sig. */
  hintPenalty: 2,
  /** Fradrag for hvert ekstra forsøg. */
  retryPenalty: 3,
  /** Mindste XP for et rigtigt svar — at kæmpe sig igennem skal tælle. */
  minimumCorrect: 3,
  /** For at gennemføre et mestringstjek. */
  mastery: 60,
  /** For at rette op på en misforståelse. */
  misconceptionFixed: 25,
  /** For at gennemføre en repetition. */
  review: 15,
} as const;

export function xpForAttempt(opts: {
  correct: boolean;
  level: Difficulty;
  hints: number;
  tries: number;
  phase: LessonPhase | 'diagnostic' | 'practice' | 'review';
}): number {
  if (!opts.correct) return 0;
  // Den guidede fase er beregnet til at man bruger hints. Der skal ikke
  // straffes for at gøre det man bliver bedt om.
  const hintCost = opts.phase === 'guided' ? 0 : opts.hints * XP.hintPenalty;
  const raw = XP.correctBase + (opts.level - 1) * XP.perLevel - hintCost - (opts.tries - 1) * XP.retryPenalty;
  return Math.max(XP.minimumCorrect, Math.round(raw));
}

/* ------------------------------------------------------------------ */
/* Niveauer                                                            */
/* ------------------------------------------------------------------ */

/**
 * XP-kravet vokser, så et niveau altid føles som noget man har arbejdet
 * for — men ikke så hurtigt at det bliver uopnåeligt.
 */
export function xpForLevel(level: number): number {
  return Math.round(60 * level ** 1.45);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level) && level < 99) level += 1;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; needed: number; percent: number } {
  const level = levelFromXp(xp);
  const floor = level === 1 ? 0 : xpForLevel(level - 1);
  const ceiling = xpForLevel(level);
  const into = xp - floor;
  const needed = ceiling - floor;
  return { level, into, needed, percent: Math.round((into / needed) * 100) };
}

export const LEVEL_TITLES = [
  'Nybegynder', 'Opdagelsesrejsende', 'Regnehoved', 'Talknuser', 'Formelsamler',
  'Ligningsløser', 'Geometriker', 'Funktionsmester', 'Problemknuser', 'Matematiker',
];

export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 3))] as string;
}

/* ------------------------------------------------------------------ */
/* Streak                                                              */
/* ------------------------------------------------------------------ */

/**
 * Opdaterer dagsstribe og dagsmål. Kaldes ved hver aktivitet.
 *
 * En stribe brydes kun hvis der er gået mere end én dag — ellers ville
 * en elev der arbejder sent om aftenen og igen næste formiddag miste
 * sin stribe helt urimeligt.
 */
export function touchDay(g: Gamification, now = Date.now()): Gamification {
  const today = dayKey(now);
  if (g.today === today) return g;

  const gap = g.lastActiveDay ? daysBetween(g.lastActiveDay, today) : null;
  const streakDays = gap === 1 ? g.streakDays + 1 : gap === 0 ? g.streakDays : 1;

  return { ...g, today, todayXp: 0, lastActiveDay: today, streakDays };
}

export function addXp(g: Gamification, amount: number, now = Date.now()): Gamification {
  if (amount <= 0) return g;
  const touched = touchDay(g, now);
  const xp = touched.xp + amount;
  return { ...touched, xp, level: levelFromXp(xp), todayXp: touched.todayXp + amount };
}

export function newGamification(): Gamification {
  return {
    xp: 0,
    level: 1,
    streakDays: 0,
    lastActiveDay: null,
    achievements: {},
    dailyGoalXp: 120,
    todayXp: 0,
    today: null,
    totalMinutes: 0,
  };
}

/* ------------------------------------------------------------------ */
/* Achievements                                                        */
/* ------------------------------------------------------------------ */

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'foerste-skridt',
    name: 'Første skridt',
    description: 'Du løste din første opgave.',
    icon: 'seedling',
    check: (c) => c.attempts.length >= 1,
  },
  {
    id: 'diagnose-taget',
    name: 'Kortet er tegnet',
    description: 'Du gennemførte niveautesten.',
    icon: 'map',
    check: (c) => c.profile.diagnosticDone,
  },
  {
    id: 'foerste-mestring',
    name: 'Mestret',
    description: 'Du har mestret dit første emne.',
    icon: 'star',
    check: (c) => c.masteredCount >= 1,
  },
  {
    id: 'fem-mestringer',
    name: 'Fem på stribe',
    description: 'Du har mestret fem færdigheder.',
    icon: 'medal',
    check: (c) => c.masteredCount >= 5,
  },
  {
    id: 'femten-mestringer',
    name: 'Bygger fundamentet',
    description: 'Du har mestret femten færdigheder.',
    icon: 'layers',
    check: (c) => c.masteredCount >= 15,
  },
  {
    id: 'halvvejs',
    name: 'Halvvejs',
    description: 'Du har mestret halvdelen af alle færdigheder.',
    icon: 'target',
    check: (c) => c.masteredCount >= 33,
  },
  {
    id: 'streak-3',
    name: 'Tre dage i træk',
    description: 'Du har arbejdet tre dage i træk.',
    icon: 'flame',
    check: (c) => c.gamification.streakDays >= 3,
  },
  {
    id: 'streak-7',
    name: 'En hel uge',
    description: 'Syv dage i træk. Det er sådan man bliver god.',
    icon: 'bolt',
    check: (c) => c.gamification.streakDays >= 7,
  },
  {
    id: 'streak-30',
    name: 'En hel måned',
    description: 'Tredive dage i træk.',
    icon: 'trophy',
    check: (c) => c.gamification.streakDays >= 30,
  },
  {
    id: 'uden-hjaelp',
    name: 'Helt selv',
    description: 'Ti rigtige i træk uden et eneste hint.',
    icon: 'target',
    check: (c) => Object.values(c.skills).some((s) => s.cleanStreak >= 10 || s.bestStreak >= 10),
  },
  {
    id: 'svaer-opgave',
    name: 'Op ad bakke',
    description: 'Du løste en opgave på højeste sværhedsgrad.',
    icon: 'mountain',
    check: (c) => c.attempts.some((a) => a.level === 5 && a.correct),
  },
  {
    id: 'staaet-op-igen',
    name: 'Stået op igen',
    description: 'Du svarede rigtigt på en opgave du havde fejlet før.',
    icon: 'refresh',
    check: (c) => Object.values(c.skills).some((s) => s.lapses > 0 && s.masteredAt !== null),
  },
  {
    id: 'emne-mestret',
    name: 'Helt emne på plads',
    description: 'Du har mestret alle færdigheder i et emne.',
    icon: 'trophy',
    check: (c) => c.domainsMastered >= 1,
  },
  {
    id: 'fem-emner',
    name: 'Fem emner på plads',
    description: 'Fem hele emner mestret.',
    icon: 'star',
    check: (c) => c.domainsMastered >= 5,
  },
  {
    id: 'hundrede-opgaver',
    name: 'Hundrede opgaver',
    description: 'Du har løst 100 opgaver.',
    icon: 'flag',
    check: (c) => c.attempts.length >= 100,
  },
  {
    id: 'fem-hundrede',
    name: 'Fem hundrede opgaver',
    description: 'Du har løst 500 opgaver. Det er ikke småting.',
    icon: 'rocket',
    check: (c) => c.attempts.length >= 500,
  },
  {
    id: 'fejl-rettet',
    name: 'Fejlen er fanget',
    description: 'Du rettede op på en misforståelse du havde gentaget.',
    icon: 'search',
    check: (c) => c.attempts.filter((a) => a.misconceptionId).length > 0 && c.masteredCount >= 2,
  },
  {
    id: 'dagsmaal',
    name: 'Dagens mål nået',
    description: 'Du nåede dit daglige XP-mål.',
    icon: 'check',
    check: (c) => c.gamification.todayXp >= c.gamification.dailyGoalXp,
  },
];

/** Finder nyligt optjente badges. Returnerer kun dem der ikke allerede er givet. */
export function checkAchievements(ctx: AchievementContext): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !ctx.gamification.achievements[a.id] && a.check(ctx));
}

export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
