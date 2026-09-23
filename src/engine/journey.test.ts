import { describe, expect, it } from 'vitest';
import { getSkill } from '../content';
import { applyAttempt, newSkillState } from './mastery';
import { chooseLevel, nextProblem } from './adaptive';
import { startingAbility } from './diagnostic';
import type { Attempt, LessonPhase } from '../types';

const skill = getSkill('ligning-totrin')!;

describe('sværhedsgrad ved lektionsstart', () => {
  it('starter den guidede fase under elevens eget niveau', () => {
    // Samme situation som en elev der lige har taget niveautesten med
    // middel selvvurdering og ikke nåede ligninger.
    const ability = startingAbility(3, 'ligninger', ['broeker'], ['statistik']);
    const state = { ...newSkillState(skill.id, ability) };
    const base = chooseLevel(state, [], 'independent').level;
    const guided = chooseLevel(state, [], 'guided').level;

    expect(guided).toBeLessThanOrEqual(base);
    expect(guided).toBeLessThanOrEqual(3);
  });

  it('holder den allerførste opgave på et roligt niveau', () => {
    // En helt ny elev uden diagnose må aldrig møde niveau 4-5 med det samme.
    for (const startAbility of [1, 1.6, 2.55, 3.2]) {
      const state = newSkillState(skill.id, startAbility);
      const { problem } = nextProblem(skill, state, [], 'guided', 1);
      expect(problem.level, `startevne ${startAbility}`).toBeLessThanOrEqual(3);
    }
  });

  it('giver en meget usikker elev niveau 1', () => {
    const ability = startingAbility(1, 'ligninger', ['ligninger'], []);
    const state = newSkillState(skill.id, ability);
    expect(chooseLevel(state, [], 'guided').level).toBe(1);
  });
});

describe('et helt forløb', () => {
  /** Simulerer en elev der svarer rigtigt med sandsynlighed p på sit niveau. */
  function simulate(competence: number, rounds: number) {
    let state = newSkillState(skill.id, 1.6);
    const attempts: Attempt[] = [];
    const levels: number[] = [];

    for (let i = 0; i < rounds; i++) {
      const { problem } = nextProblem(skill, state, attempts, 'independent', i + 1);
      levels.push(problem.level);
      // Eleven klarer opgaver op til sit kompetenceniveau.
      const correct = problem.level <= competence;
      attempts.push({
        ts: Date.now(),
        skillId: skill.id,
        domainId: 'ligninger',
        generatorId: problem.generatorId,
        level: problem.level,
        correct,
        seconds: 40,
        hints: 0,
        tries: 1,
        phase: 'independent',
      });
      state = applyAttempt(state, problem, { correct, hints: 0, tries: 1, seconds: 40, phase: 'independent' });
    }
    return { levels, state };
  }

  it('finder niveauet for en stærk elev', () => {
    const { levels } = simulate(5, 30);
    const late = levels.slice(-8);
    expect(Math.max(...late)).toBeGreaterThanOrEqual(4);
  });

  it('finder niveauet for en svag elev', () => {
    const { levels } = simulate(1, 30);
    const late = levels.slice(-8);
    expect(Math.max(...late)).toBeLessThanOrEqual(2);
  });

  it('lander midt imellem for en elev der kan til og med niveau 3', () => {
    const { levels } = simulate(3, 40);
    const late = levels.slice(-10);
    const avg = late.reduce((a, b) => a + b, 0) / late.length;
    expect(avg).toBeGreaterThan(2);
    expect(avg).toBeLessThan(4.5);
  });
});

describe('fra bunden og opad', () => {
  const run = (correct: (i: number) => boolean, steps = 12) => {
    let state = newSkillState(skill.id);
    const attempts: Attempt[] = [];
    const levels: number[] = [];
    const phases: LessonPhase[] = ['guided', 'guided', 'independent', 'independent', 'variation', 'variation', 'challenge', 'mastery', 'mastery', 'mastery', 'mastery', 'mastery'];

    for (let i = 0; i < steps; i++) {
      const phase = phases[Math.min(i, phases.length - 1)]!;
      const { problem, decision } = nextProblem(skill, state, attempts, phase, 1000 + i);
      levels.push(decision.level);
      const ok = correct(i);
      attempts.push({
        id: String(i), ts: Date.now(), skillId: skill.id, domainId: skill.domainId,
        generatorId: problem.generatorId, problemId: problem.id, level: decision.level,
        correct: ok, hints: 0, tries: 1, seconds: problem.seconds, phase,
      } as Attempt);
      state = applyAttempt(state, problem, { correct: ok, hints: 0, tries: 1, seconds: problem.seconds, phase });
    }
    return { levels, state };
  };

  it('giver en helt ny elev den letteste opgave først', () => {
    const state = newSkillState(skill.id);
    expect(chooseLevel(state, [], 'guided').level).toBe(1);
    expect(chooseLevel(state, [], 'independent').level).toBe(1);
  });

  it('bliver aldrig lettere mens eleven svarer rigtigt', () => {
    const { levels, state } = run(() => true);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]!).toBeGreaterThanOrEqual(levels[i - 1]!);
    }
    expect(levels[0]).toBe(1);
    expect(levels[levels.length - 1]!).toBeGreaterThanOrEqual(4);
    expect(state.ability).toBeGreaterThan(3);
  });

  it('holder en elev der svarer forkert nede på det letteste niveau', () => {
    const { levels, state } = run(() => false);
    expect(Math.max(...levels)).toBeLessThanOrEqual(2);
    expect(state.ability).toBeLessThan(1.5);
  });
});
