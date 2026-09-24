import { create } from 'zustand';
import type {
  Attempt,
  DomainId,
  Gamification,
  LearnerProfile,
  LessonPhase,
  MisconceptionState,
  Problem,
  Settings,
  SkillState,
} from '../types';
import { applyAttempt, newSkillState } from '../engine/mastery';
import { advancePhase } from '../engine/adaptive';
import { gradeFromOutcome, scheduleFirstReview, scheduleReview } from '../engine/srs';
import { recordMisconception, resolveMisconceptions } from '../engine/diagnosis';
import { XP, addXp, checkAchievements, newGamification, touchDay } from '../engine/gamification';
import { DOMAINS, getSkill } from '../content';
import * as storage from '../lib/storage';
import { dayKey } from '../lib/dates';
import { DEFAULT_MODEL } from '../tutor/models';

/* ------------------------------------------------------------------ */
/* Tilstand                                                            */
/* ------------------------------------------------------------------ */

export interface AttemptInput {
  problem: Problem;
  correct: boolean;
  hints: number;
  tries: number;
  seconds: number;
  phase: Attempt['phase'];
  misconceptionId?: string;
  confidence?: 1 | 2 | 3;
}

export interface AttemptResult {
  /** XP optjent på dette forsøg. */
  xp: number;
  /** Faseovergang, hvis forsøget var en del af et lektionsforløb. */
  phase: LessonPhase;
  phaseProgress: number;
  regressed: boolean;
  /** Blev færdigheden lige mestret? */
  mastered: boolean;
  /** Eleven sprang forklaringen over, men klarede ikke mestringstjekket. */
  testOutFailed: boolean;
  /** Nye badges optjent lige nu. */
  unlocked: string[];
}

export interface AppState {
  profile: LearnerProfile;
  skills: Record<string, SkillState>;
  misconceptions: Record<string, MisconceptionState>;
  /** Vi gemmer de seneste forsøg — nok til analyse, ikke nok til at fylde. */
  attempts: Attempt[];
  gamification: Gamification;
  settings: Settings;
  /** Badges der lige er optjent og endnu ikke vist. */
  pendingBadges: string[];
  /** Sat til det nye niveau i det øjeblik eleven stiger. Ryddes af brugerfladen. */
  pendingLevelUp: number | null;
  hydrated: boolean;

  /* Handlinger */
  completeOnboarding: (input: { name: string; confidence: number; hard: DomainId[]; easy: DomainId[] }) => void;
  completeDiagnostic: (
    scores: Partial<Record<DomainId, number>>,
    abilityByDomain: Partial<Record<DomainId, number>>,
    untested?: DomainId[],
  ) => void;
  ensureSkill: (skillId: string) => SkillState;
  recordAttempt: (input: AttemptInput) => AttemptResult;
  setPhase: (skillId: string, phase: LessonPhase, testingOut?: boolean) => void;
  reviewSkill: (skillId: string, correct: boolean, hints: number, tries: number, seconds: number, expectedSeconds: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  recordLlmUsage: (input: number, output: number) => void;
  clearBadges: () => void;
  dismissBadge: () => void;
  clearLevelUp: () => void;
  setTourDone: (done: boolean) => void;
  addMinutes: (minutes: number) => void;
  resetAll: () => void;
  importState: (json: string) => boolean;
}

const MAX_ATTEMPTS = 600;

function emptyProfile(): LearnerProfile {
  return {
    name: '',
    grade: 9,
    confidence: 3,
    hardTopics: [],
    easyTopics: [],
    createdAt: Date.now(),
    onboarded: false,
    diagnosticDone: false,
    tourDone: false,
    diagnostic: {},
    recommended: [],
  };
}

function defaultSettings(): Settings {
  return {
    // Appen er tegnet til mørkt tema. Lyst og "følg system" kan stadig
    // vælges i indstillingerne, men det mørke er udgangspunktet.
    theme: 'dark',
    sound: true,
    reducedMotion: false,
    askConfidence: true,
    apiKey: '',
    useLlmTutor: false,
    llmModel: DEFAULT_MODEL,
    llmUsage: { input: 0, output: 0, calls: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* Persistens                                                          */
/* ------------------------------------------------------------------ */

interface Persisted {
  profile: LearnerProfile;
  skills: Record<string, SkillState>;
  misconceptions: Record<string, MisconceptionState>;
  attempts: Attempt[];
  gamification: Gamification;
  settings: Settings;
}

function loadPersisted(): Persisted {
  return {
    profile: { ...emptyProfile(), ...storage.load('profile', {}) },
    skills: storage.load('skills', {} as Record<string, SkillState>),
    misconceptions: storage.load('misconceptions', {} as Record<string, MisconceptionState>),
    attempts: storage.load('attempts', [] as Attempt[]),
    gamification: { ...newGamification(), ...storage.load('gamification', {}) },
    settings: { ...defaultSettings(), ...storage.load('settings', {}) },
  };
}

function persist(state: AppState): void {
  storage.save('profile', state.profile);
  storage.save('skills', state.skills);
  storage.save('misconceptions', state.misconceptions);
  storage.save('attempts', state.attempts);
  storage.save('gamification', state.gamification);
  storage.save('settings', state.settings);
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useStore = create<AppState>((set, get) => {
  const initial = loadPersisted();

  return {
    ...initial,
    // Striben afgøres ved opstart, så et besøg uden aktivitet stadig
    // viser det rigtige antal dage.
    gamification: touchDay(initial.gamification),
    pendingBadges: [],
    pendingLevelUp: null,
    hydrated: true,

    completeOnboarding: ({ name, confidence, hard, easy }) => {
      set((s) => {
        const profile: LearnerProfile = {
          ...s.profile,
          name: name.trim(),
          confidence,
          hardTopics: hard,
          easyTopics: easy,
          onboarded: true,
          createdAt: s.profile.createdAt || Date.now(),
        };
        const next = { ...s, profile };
        persist(next);
        return { profile };
      });
    },

    completeDiagnostic: (scores, abilityByDomain, untested = []) => {
      set((s) => {
        // De tre svageste emner bliver anbefalingen. Emner eleven selv
        // har markeret som svære vægtes lidt tungere, fordi elevens egen
        // oplevelse af usikkerhed også betyder noget for motivationen.
        const ranked = (Object.entries(scores) as [DomainId, number][])
          .map(([id, score]) => ({ id, score: score - (s.profile.hardTopics.includes(id) ? 8 : 0) }))
          .sort((a, b) => a.score - b.score);

        const profile: LearnerProfile = {
          ...s.profile,
          diagnostic: scores,
          diagnosticDone: true,
          recommended: ranked.slice(0, 3).map((r) => r.id),
        };

        // Diagnosen sætter startniveauet for hver færdighed, så eleven
        // ikke skal starte forfra i noget der allerede sidder fast.
        const skills = { ...s.skills };
        for (const domain of DOMAINS) {
          const ability = abilityByDomain[domain.id];
          if (ability === undefined) continue;
          const score = scores[domain.id] ?? 30;
          for (const skill of domain.skills) {
            const existing = skills[skill.id];
            // Noget eleven allerede er gået i gang med, rører vi ikke.
            if (existing && (existing.attempts > 0 || existing.phase !== 'explain' || existing.masteredAt !== null)) continue;
            // Færdigheder over elevens niveau starter lavere end dem under.
            const start = Math.max(1, Math.min(5, ability - (skill.tier - 2) * 0.35));
            // Klarede eleven emnet godt, regnes de lette færdigheder som på
            // plads nok til at låse op for de næste. Ellers skulle en stærk
            // elev tage hvert eneste trin forfra.
            // Kun for emner der faktisk blev testet - ikke ud fra selvvurdering alene.
            const solid = !untested.includes(domain.id) && score >= 65 && skill.tier <= ability - 1;
            skills[skill.id] = { ...newSkillState(skill.id, start), pKnown: solid ? 0.65 : Math.min(0.55, score / 180) };
          }
        }

        const gamification = addXp(s.gamification, 80);
        const next = { ...s, profile, skills, gamification };
        persist(next);
        return { profile, skills, gamification };
      });
    },

    ensureSkill: (skillId) => {
      const existing = get().skills[skillId];
      if (existing) return existing;
      const created = newSkillState(skillId);
      set((s) => {
        const skills = { ...s.skills, [skillId]: created };
        persist({ ...s, skills });
        return { skills };
      });
      return created;
    },

    recordAttempt: (input) => {
      const { problem } = input;
      const skillId = problem.skillId;
      let result: AttemptResult = {
        xp: 0,
        phase: 'guided',
        phaseProgress: 0,
        regressed: false,
        mastered: false,
        testOutFailed: false,
        unlocked: [],
      };

      set((s) => {
        const before = s.skills[skillId] ?? newSkillState(skillId);
        // Niveautestens svar gemmes i historikken, men rører ikke
        // færdigheden. Resultatet lægges ind samlet bagefter, og ellers
        // stod alt man var blevet testet i som "i gang".
        const diagnostic = input.phase === 'diagnostic';
        let state = diagnostic ? before : applyAttempt(before, problem, input);

        /* Fejlprofil */
        let misconceptions = s.misconceptions;
        if (!input.correct && input.misconceptionId) {
          misconceptions = recordMisconception(misconceptions, input.misconceptionId, skillId);
        } else if (input.correct) {
          misconceptions = resolveMisconceptions(misconceptions, problem);
        }

        /* Faseprogression — kun når vi er inde i et lektionsforløb. */
        const inLesson = input.phase !== 'diagnostic' && input.phase !== 'practice' && input.phase !== 'review';
        let mastered = false;
        if (inLesson) {
          const outcome = advancePhase(state, input.correct, input.tries);
          state = {
            ...state,
            phase: outcome.phase,
            phaseProgress: outcome.progress,
            phaseMisses: outcome.misses,
            testingOut: state.testingOut && !outcome.testOutFailed && !outcome.completed,
          };
          result.regressed = outcome.regressed;
          result.testOutFailed = outcome.testOutFailed;

          if (outcome.completed && state.masteredAt === null) {
            state = scheduleFirstReview({ ...state, masteredAt: Date.now() });
            mastered = true;
          }
        }

        /* XP */
        let xp = 0;
        if (input.correct) {
          xp = XP.correctBase + (problem.level - 1) * XP.perLevel;
          const hintCost = input.phase === 'guided' ? 0 : input.hints * XP.hintPenalty;
          xp = Math.max(XP.minimumCorrect, xp - hintCost - (input.tries - 1) * XP.retryPenalty);
        }
        if (mastered) xp += XP.mastery;
        if (input.phase === 'review' && input.correct) xp += XP.review;

        const attempt: Attempt = {
          ts: Date.now(),
          skillId,
          domainId: problem.domainId,
          generatorId: problem.generatorId,
          level: problem.level,
          correct: input.correct,
          seconds: input.seconds,
          hints: input.hints,
          tries: input.tries,
          phase: input.phase,
          misconceptionId: input.misconceptionId,
          confidence: input.confidence,
        };

        const attempts = [...s.attempts, attempt].slice(-MAX_ATTEMPTS);
        const skills = diagnostic ? s.skills : { ...s.skills, [skillId]: state };
        const levelBefore = s.gamification.level;
        const gamification = addXp(s.gamification, xp);
        // Krydsede vi en niveaugrænse med dette forsøg?
        const leveledUp = gamification.level > levelBefore ? gamification.level : null;

        /* Badges */
        const masteredCount = Object.values(skills).filter((x) => x.masteredAt !== null).length;
        const domainsMastered = DOMAINS.filter((d) => d.skills.every((sk) => skills[sk.id]?.masteredAt)).length;
        const unlocked = checkAchievements({
          gamification,
          skills,
          attempts,
          profile: s.profile,
          masteredCount,
          domainsMastered,
        });
        const withBadges: Gamification = unlocked.length
          ? { ...gamification, achievements: { ...gamification.achievements, ...Object.fromEntries(unlocked.map((a) => [a.id, Date.now()])) } }
          : gamification;

        result = {
          xp,
          phase: state.phase,
          phaseProgress: state.phaseProgress,
          regressed: result.regressed,
          mastered,
          testOutFailed: result.testOutFailed,
          unlocked: unlocked.map((a) => a.id),
        };

        const next = { ...s, skills, attempts, misconceptions, gamification: withBadges };
        persist(next);
        return {
          skills,
          attempts,
          misconceptions,
          gamification: withBadges,
          pendingBadges: [...s.pendingBadges, ...unlocked.map((a) => a.id)],
          pendingLevelUp: leveledUp ?? s.pendingLevelUp,
        };
      });

      return result;
    },

    setPhase: (skillId, phase, testingOut = false) => {
      set((s) => {
        const state = s.skills[skillId] ?? newSkillState(skillId);
        const touched = state.masteredAt === null ? { lastSeen: Date.now() } : {};
        const skills = { ...s.skills, [skillId]: { ...state, ...touched, phase, phaseProgress: 0, phaseMisses: 0, testingOut } };
        persist({ ...s, skills });
        return { skills };
      });
    },

    reviewSkill: (skillId, correct, hints, tries, seconds, expectedSeconds) => {
      set((s) => {
        const state = s.skills[skillId];
        if (!state) return {};
        const grade = gradeFromOutcome({ correct, hints, tries, seconds, expectedSeconds });
        const skills = { ...s.skills, [skillId]: scheduleReview(state, grade) };
        persist({ ...s, skills });
        return { skills };
      });
    },

    updateSettings: (patch) => {
      set((s) => {
        const settings = { ...s.settings, ...patch };
        persist({ ...s, settings });
        return { settings };
      });
    },

    recordLlmUsage: (input, output) => {
      set((s) => {
        const llmUsage = {
          input: s.settings.llmUsage.input + input,
          output: s.settings.llmUsage.output + output,
          calls: s.settings.llmUsage.calls + 1,
        };
        const settings = { ...s.settings, llmUsage };
        persist({ ...s, settings });
        return { settings };
      });
    },

    clearBadges: () => set({ pendingBadges: [] }),

    dismissBadge: () => set((s) => ({ pendingBadges: s.pendingBadges.slice(1) })),

    clearLevelUp: () => set({ pendingLevelUp: null }),

    setTourDone: (done) => {
      set((s) => {
        const profile = { ...s.profile, tourDone: done };
        persist({ ...s, profile });
        return { profile };
      });
    },

    addMinutes: (minutes) => {
      set((s) => {
        const gamification = { ...touchDay(s.gamification), totalMinutes: s.gamification.totalMinutes + minutes };
        persist({ ...s, gamification });
        return { gamification };
      });
    },

    resetAll: () => {
      storage.clearAll();
      set({
        profile: emptyProfile(),
        skills: {},
        misconceptions: {},
        attempts: [],
        gamification: { ...newGamification(), today: dayKey() },
        settings: defaultSettings(),
        pendingBadges: [],
        pendingLevelUp: null,
      });
    },

    importState: (json) => {
      if (!storage.importAll(json)) return false;
      const loaded = loadPersisted();
      set({ ...loaded, gamification: touchDay(loaded.gamification), pendingBadges: [], pendingLevelUp: null });
      return true;
    },
  };
});

/** Hjælper til komponenter der bare skal bruge én færdigheds tilstand. */
export function useSkillState(skillId: string): SkillState | undefined {
  return useStore((s) => s.skills[skillId]);
}

export function skillName(skillId: string): string {
  return getSkill(skillId)?.name ?? skillId;
}
