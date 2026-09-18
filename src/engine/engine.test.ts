import { describe, expect, it } from 'vitest';
import { applyAttempt, effectiveGuessRate, newSkillState, updateAbility, updateMastery } from './mastery';
import { advancePhase, chooseGenerator, chooseLevel } from './adaptive';
import { gradeFromOutcome, isDue, retention, scheduleFirstReview, scheduleReview } from './srs';
import { analyseError, readBehaviour, recordMisconception } from './diagnosis';
import { addXp, levelFromXp, levelProgress, touchDay, xpForAttempt } from './gamification';
import { newGamification } from './gamification';
import { buildProblem, getSkill } from '../content';
import type { Attempt, Difficulty, Problem, SkillState } from '../types';
import { DAY_MS, dayKey } from '../lib/dates';

const skill = getSkill('ligning-totrin')!;

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    ts: Date.now(),
    skillId: skill.id,
    domainId: 'ligninger',
    generatorId: 'ligning-ax-b',
    level: 2,
    correct: true,
    seconds: 40,
    hints: 0,
    tries: 1,
    phase: 'independent',
    ...over,
  };
}

function ev(over: Partial<Parameters<typeof updateMastery>[1]> = {}) {
  return {
    correct: true,
    hints: 0,
    tries: 1,
    seconds: 40,
    expectedSeconds: 45,
    multipleChoice: false,
    level: 2 as Difficulty,
    ability: 2,
    ...over,
  };
}

describe('mestringsmodel (BKT)', () => {
  it('hæver mestringen ved et rigtigt svar og sænker den ved et forkert', () => {
    const start = 0.5;
    expect(updateMastery(start, ev({ correct: true }))).toBeGreaterThan(start);
    expect(updateMastery(start, ev({ correct: false }))).toBeLessThan(start);
  });

  it('vægter et rigtigt svar uden hints tungere end et med hints', () => {
    const clean = updateMastery(0.5, ev({ hints: 0 }));
    const helped = updateMastery(0.5, ev({ hints: 3 }));
    expect(clean).toBeGreaterThan(helped);
  });

  it('behandler et lynhurtigt rigtigt svar på multiple choice som svagt bevis', () => {
    const thoughtful = updateMastery(0.4, ev({ seconds: 40, multipleChoice: false }));
    const guessed = updateMastery(0.4, ev({ seconds: 2, multipleChoice: true, choiceCount: 2 }));
    expect(guessed).toBeLessThan(thoughtful);
  });

  it('regner gættechancen højere for få svarmuligheder', () => {
    const two = effectiveGuessRate(ev({ multipleChoice: true, choiceCount: 2 }));
    const four = effectiveGuessRate(ev({ multipleChoice: true, choiceCount: 4 }));
    expect(two).toBeGreaterThan(four);
  });

  it('holder sig inden for 0 og 1 uanset hvor mange gange den opdateres', () => {
    let p = 0.5;
    for (let i = 0; i < 200; i++) p = updateMastery(p, ev({ correct: i % 3 !== 0 }));
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('evnevurdering (Elo)', () => {
  it('rykker mere ved en uventet præstation end ved en forventet', () => {
    const surprising = updateAbility(2, ev({ correct: true, level: 5 })) - 2;
    const expected = updateAbility(2, ev({ correct: true, level: 1 })) - 2;
    expect(surprising).toBeGreaterThan(expected);
  });

  it('nærmer sig elevens rigtige niveau over tid', () => {
    let ability = 1.5;
    // En elev der konsekvent klarer niveau 4 men fejler niveau 5.
    for (let i = 0; i < 60; i++) {
      const level = (i % 2 === 0 ? 4 : 5) as Difficulty;
      ability = updateAbility(ability, ev({ correct: level === 4, level, ability }));
    }
    expect(ability).toBeGreaterThan(3);
    expect(ability).toBeLessThan(5);
  });
});

describe('sværhedsstyring', () => {
  it('sætter niveauet op når eleven klarer opgaverne let', () => {
    const state: SkillState = { ...newSkillState(skill.id, 3), cleanStreak: 4 };
    const attempts = Array.from({ length: 6 }, () => attempt({ level: 3 }));
    const d = chooseLevel(state, attempts, 'independent');
    expect(d.reason).toBe('op-klarer-let');
    expect(d.level).toBe(4);
  });

  it('går et trin tilbage når eleven laver mange fejl', () => {
    const state = newSkillState(skill.id, 3);
    const attempts = Array.from({ length: 6 }, (_, i) => attempt({ correct: i === 0, level: 3 }));
    const d = chooseLevel(state, attempts, 'independent');
    expect(d.reason).toBe('ned-mange-fejl');
    expect(d.level).toBe(2);
  });

  it('sænker niveauet når eleven kun klarer den ved hjælp af hints', () => {
    const state = newSkillState(skill.id, 3);
    const attempts = Array.from({ length: 6 }, (_, i) => attempt({ correct: i < 4, hints: 2, level: 3 }));
    const d = chooseLevel(state, attempts, 'independent');
    expect(d.reason).toBe('ned-for-mange-hints');
    expect(d.level).toBe(2);
  });

  it('gør den guidede fase lettere og udfordringen sværere', () => {
    const state = newSkillState(skill.id, 3);
    const attempts = [attempt({ level: 3 })];
    expect(chooseLevel(state, attempts, 'guided').level).toBe(2);
    expect(chooseLevel(state, attempts, 'challenge').level).toBe(4);
  });

  it('holder niveauet inden for 1-5 uanset hvor godt eller skidt det går', () => {
    for (const ability of [0.5, 5.5]) {
      for (const correct of [true, false]) {
        const state: SkillState = { ...newSkillState(skill.id, ability), cleanStreak: 9 };
        const attempts = Array.from({ length: 6 }, () => attempt({ correct }));
        const level = chooseLevel(state, attempts, 'challenge').level;
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('valg af opgavetype', () => {
  it('vælger en ny opgavetype i variationsfasen', () => {
    const attempts = [attempt({ generatorId: skill.generators[0]!.id })];
    const pick = chooseGenerator(skill, 3, 'variation', attempts);
    expect(pick.generatorId).toBeDefined();
    expect(pick.generatorId).not.toBe(skill.generators[0]!.id);
  });

  it('bruger kernetypen i den guidede fase', () => {
    const pick = chooseGenerator(skill, 3, 'guided', []);
    expect(pick.generatorId).toBe(skill.generators[0]!.id);
  });
});

describe('faseprogression', () => {
  it('rykker videre når fasens mål er nået', () => {
    const state: SkillState = { ...newSkillState(skill.id), phase: 'guided', phaseProgress: 1 };
    const out = advancePhase(state, true, 0);
    expect(out.phase).toBe('independent');
    expect(out.progress).toBe(0);
  });

  it('sender eleven tilbage efter to fejl i træk i samme fase', () => {
    const state: SkillState = { ...newSkillState(skill.id), phase: 'variation', phaseProgress: 1 };
    const out = advancePhase(state, false, 2);
    expect(out.regressed).toBe(true);
    expect(out.phase).toBe('independent');
  });

  it('sender ikke eleven tilbage fra en udfordring - den må gerne være svær', () => {
    const state: SkillState = { ...newSkillState(skill.id), phase: 'challenge', phaseProgress: 0 };
    const out = advancePhase(state, false, 3);
    expect(out.regressed).toBe(false);
    expect(out.phase).toBe('challenge');
  });

  it('markerer forløbet som gennemført efter mestringstjekket', () => {
    const state: SkillState = { ...newSkillState(skill.id), phase: 'mastery', phaseProgress: 2 };
    expect(advancePhase(state, true, 0).completed).toBe(true);
  });
});

describe('spaced repetition', () => {
  it('forlænger intervallet når det går godt og nulstiller når det fejler', () => {
    let state = scheduleFirstReview(newSkillState(skill.id));
    const first = state.interval;
    state = scheduleReview(state, 'godt');
    expect(state.interval).toBeGreaterThan(first);
    const grown = state.interval;
    state = scheduleReview(state, 'igen');
    expect(state.interval).toBe(0);
    expect(state.lapses).toBe(1);
    expect(grown).toBeGreaterThan(0);
  });

  it('gør intervallet kortere ved "svært" end ved "let"', () => {
    const base = { ...scheduleFirstReview(newSkillState(skill.id)), reviews: 1, interval: 10 };
    expect(scheduleReview(base, 'svaert').interval).toBeLessThan(scheduleReview(base, 'let').interval);
  });

  it('oversætter et forsøg til en karakter', () => {
    expect(gradeFromOutcome({ correct: false, hints: 0, tries: 1, seconds: 10, expectedSeconds: 30 })).toBe('igen');
    expect(gradeFromOutcome({ correct: true, hints: 3, tries: 1, seconds: 10, expectedSeconds: 30 })).toBe('svaert');
    expect(gradeFromOutcome({ correct: true, hints: 0, tries: 1, seconds: 20, expectedSeconds: 30 })).toBe('let');
  });

  it('lader hukommelsen falde med tiden', () => {
    const state: SkillState = {
      ...newSkillState(skill.id),
      masteredAt: Date.now() - 20 * DAY_MS,
      lastSeen: Date.now() - 20 * DAY_MS,
      interval: 3,
    };
    const fresh: SkillState = { ...state, lastSeen: Date.now() };
    expect(retention(state)).toBeLessThan(retention(fresh));
  });

  it('melder en færdighed som forfalden når tiden er gået', () => {
    const state: SkillState = {
      ...newSkillState(skill.id),
      masteredAt: Date.now() - 10 * DAY_MS,
      due: Date.now() - DAY_MS,
    };
    expect(isDue(state)).toBe(true);
  });
});

describe('fejlanalyse', () => {
  it('genkender en kendt fejl og afbryder når den gentages', () => {
    // Find en opgave med en talfælde vi kan ramme med vilje.
    let problem: Problem | null = null;
    for (let seed = 0; seed < 400 && !problem; seed++) {
      const p = buildProblem(skill, { level: 3, seed });
      if (p.traps?.some((t) => typeof t.value === 'number')) problem = p;
    }
    expect(problem, 'fandt ingen opgave med en talfælde').not.toBeNull();

    const trap = problem!.traps!.find((t) => typeof t.value === 'number')!;
    const response = { kind: 'text' as const, value: String(trap.value) };

    const first = analyseError(problem!, response, {});
    expect(first.misconception).not.toBeNull();
    expect(first.feedback).toBe(trap.feedback);
    expect(first.shouldInterrupt).toBe(false);

    const after = recordMisconception({}, trap.misconceptionId, skill.id);
    const second = analyseError(problem!, response, after);
    expect(second.shouldInterrupt).toBe(true);
    expect(second.count).toBe(2);
  });

  it('siger ingenting når fejlen ikke er en kendt fælde', () => {
    const p = buildProblem(skill, { level: 2, seed: 1 });
    const out = analyseError(p, { kind: 'text', value: '99999991' }, {});
    expect(out.misconception).toBeNull();
    expect(out.shouldInterrupt).toBe(false);
  });
});

describe('adfærdsmønstre', () => {
  it('opdager at eleven klikker sig igennem', () => {
    const attempts = Array.from({ length: 8 }, () => attempt({ seconds: 2, correct: false }));
    expect(readBehaviour(attempts).rushing).toBe(true);
  });

  it('opdager afhængighed af hints', () => {
    const attempts = Array.from({ length: 8 }, () => attempt({ hints: 2 }));
    expect(readBehaviour(attempts).hintDependent).toBe(true);
  });

  it('opdager at det går for let', () => {
    expect(readBehaviour(Array.from({ length: 8 }, () => attempt())).cruising).toBe(true);
  });

  it('siger ingenting før der er nok data', () => {
    const b = readBehaviour([attempt({ correct: false, seconds: 1 })]);
    expect(b.rushing).toBe(false);
    expect(b.struggling).toBe(false);
  });
});

describe('XP og niveauer', () => {
  it('giver mere XP for svære opgaver', () => {
    const easy = xpForAttempt({ correct: true, level: 1, hints: 0, tries: 1, phase: 'independent' });
    const hard = xpForAttempt({ correct: true, level: 5, hints: 0, tries: 1, phase: 'independent' });
    expect(hard).toBeGreaterThan(easy);
  });

  it('giver ingen XP for et forkert svar', () => {
    expect(xpForAttempt({ correct: false, level: 3, hints: 0, tries: 1, phase: 'independent' })).toBe(0);
  });

  it('straffer ikke hints i den guidede fase', () => {
    const guided = xpForAttempt({ correct: true, level: 3, hints: 3, tries: 1, phase: 'guided' });
    const solo = xpForAttempt({ correct: true, level: 3, hints: 3, tries: 1, phase: 'independent' });
    expect(guided).toBeGreaterThan(solo);
  });

  it('giver altid lidt XP for et rigtigt svar, uanset hvor meget hjælp der blev brugt', () => {
    expect(xpForAttempt({ correct: true, level: 1, hints: 9, tries: 9, phase: 'independent' })).toBeGreaterThan(0);
  });

  it('kræver mere XP for hvert nyt niveau', () => {
    expect(levelFromXp(0)).toBe(1);
    const l5 = levelProgress(5000);
    expect(l5.level).toBeGreaterThan(5);
    expect(l5.percent).toBeGreaterThanOrEqual(0);
    expect(l5.percent).toBeLessThanOrEqual(100);
  });

  it('tæller striben op ved aktivitet dagen efter', () => {
    const yesterday = dayKey(Date.now() - DAY_MS);
    const g = { ...newGamification(), lastActiveDay: yesterday, streakDays: 4, today: yesterday };
    expect(touchDay(g).streakDays).toBe(5);
  });

  it('nulstiller striben når en dag springes over', () => {
    const before = dayKey(Date.now() - 3 * DAY_MS);
    const g = { ...newGamification(), lastActiveDay: before, streakDays: 9, today: before };
    expect(touchDay(g).streakDays).toBe(1);
  });

  it('nulstiller dagens XP ved døgnskifte men beholder den samlede', () => {
    const yesterday = dayKey(Date.now() - DAY_MS);
    const g = { ...newGamification(), xp: 500, todayXp: 200, today: yesterday, lastActiveDay: yesterday };
    const next = addXp(g, 10);
    expect(next.xp).toBe(510);
    expect(next.todayXp).toBe(10);
  });
});

describe('samlet forsøgshåndtering', () => {
  it('opdaterer alle tællere konsistent', () => {
    const problem = buildProblem(skill, { level: 3, seed: 42 });
    let state = newSkillState(skill.id, 2);
    state = applyAttempt(state, problem, { correct: true, hints: 0, tries: 1, seconds: 30, phase: 'independent' });
    expect(state.attempts).toBe(1);
    expect(state.correct).toBe(1);
    expect(state.streak).toBe(1);
    expect(state.cleanStreak).toBe(1);
    expect(state.lastSeen).not.toBeNull();

    state = applyAttempt(state, problem, { correct: false, hints: 1, tries: 2, seconds: 60, phase: 'independent' });
    expect(state.streak).toBe(0);
    expect(state.cleanStreak).toBe(0);
    expect(state.bestStreak).toBe(1);
    expect(state.hintsUsed).toBe(1);
  });

  it('lader en vedholdende elev nå mestringsgrænsen', () => {
    let state = newSkillState(skill.id, 2);
    for (let i = 0; i < 12; i++) {
      const p = buildProblem(skill, { level: 3, seed: i });
      state = applyAttempt(state, p, { correct: true, hints: 0, tries: 1, seconds: 35, phase: 'independent' });
    }
    expect(state.pKnown).toBeGreaterThan(0.92);
  });

  it('lader en elev der svarer hurtigt men troværdigt bygge mestring op', () => {
    let state = newSkillState(skill.id, 3);
    for (let i = 0; i < 14; i++) {
      const p = buildProblem(skill, { level: 3, seed: 100 + i });
      // Hurtigt, men ikke hurtigere end opgaven kan læses.
      state = applyAttempt(state, p, { correct: true, hints: 0, tries: 1, seconds: 14, phase: 'independent' });
    }
    expect(state.pKnown).toBeGreaterThan(0.92);
  });

  it('lader ikke en elev der klikker sig igennem nå mestringsgrænsen', () => {
    const mcqSkill = getSkill('tal-hierarki')!;
    let state = newSkillState(mcqSkill.id, 2);
    for (let i = 0; i < 12; i++) {
      const p = buildProblem(mcqSkill, { level: 2, generatorId: 'hierarki-vaelg', seed: i });
      // Rigtigt svar, men efter 1 sekund på en multiple choice.
      state = applyAttempt(state, p, { correct: true, hints: 0, tries: 1, seconds: 1, phase: 'independent' });
    }
    expect(state.pKnown).toBeLessThan(0.92);
  });
});
