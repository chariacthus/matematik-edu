import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';
import { getSkill, skillsOf } from '../content';
import { nextProblem } from '../engine/adaptive';
import { buildPlan, lessonStarted } from '../engine/planner';
import { newSkillState } from '../engine/mastery';
import type { LessonPhase } from '../types';

const store = () => useStore.getState();
const skill = getSkill('ligning-ettrin')!;

/** Én opgave i lektionen, som eleven ville få den. */
function answer(correct: boolean, tries = 1) {
  const s = store();
  const state = s.skills[skill.id] ?? newSkillState(skill.id);
  const { problem } = nextProblem(skill, state, s.attempts, state.phase, 7 + s.attempts.length);
  return s.recordAttempt({ problem, correct, hints: 0, tries, seconds: problem.seconds, phase: state.phase });
}

/** Taber en opgave: forkert, og forkert igen. */
function lose() {
  answer(false, 1);
  return answer(false, 2);
}

const phase = (): LessonPhase => store().skills[skill.id]!.phase;

beforeEach(() => {
  store().resetAll();
  store().completeOnboarding({ name: 'Test', confidence: 3, hard: [], easy: [] });
});

describe('niveautesten', () => {
  it('markerer ikke de testede færdigheder som påbegyndt', () => {
    const { problem } = nextProblem(skill, newSkillState(skill.id), [], 'guided', 1);
    store().recordAttempt({ problem, correct: true, hints: 0, tries: 1, seconds: 30, phase: 'diagnostic' });
    expect(store().skills[skill.id]).toBeUndefined();
    expect(store().attempts).toHaveLength(1);
  });

  it('giver også den testede færdighed det niveau testen fandt', () => {
    const { problem } = nextProblem(skill, newSkillState(skill.id), [], 'guided', 1);
    store().recordAttempt({ problem, correct: true, hints: 0, tries: 1, seconds: 30, phase: 'diagnostic' });
    store().completeDiagnostic({ ligninger: 84 }, { ligninger: 4.4 }, []);
    const st = store().skills[skill.id]!;
    expect(st.ability).toBeGreaterThan(3.5);
    expect(lessonStarted(st)).toBe(false);
  });

  it('låser op for de lette færdigheder i et emne eleven klarede godt', () => {
    store().completeDiagnostic({ ligninger: 84 }, { ligninger: 4.4 }, []);
    const next = skillsOf('ligninger').find((s) => s.prerequisites.includes(skill.id))!;
    const plan = buildPlan({ states: store().skills, misconceptions: {}, profile: store().profile }, 30);
    expect(plan.some((p) => p.skillId === next.id)).toBe(true);
  });

  it('låser ikke op ud fra selvvurdering alene', () => {
    store().completeDiagnostic({ ligninger: 84 }, { ligninger: 4.4 }, ['ligninger']);
    expect(store().skills[skill.id]!.pKnown).toBeLessThan(0.6);
  });

  it('fylder ikke planen med "fortsæt" efter testen', () => {
    store().completeDiagnostic({ ligninger: 50, broeker: 40 }, { ligninger: 3, broeker: 2.6 }, []);
    const plan = buildPlan({ states: store().skills, misconceptions: {}, profile: store().profile }, 10);
    expect(plan.filter((p) => p.kind === 'fortsaet')).toEqual([]);
    expect(plan.some((p) => p.kind === 'nyt')).toBe(true);
  });
});

describe('et lektionsforløb', () => {
  beforeEach(() => store().setPhase(skill.id, 'guided'));

  it('er mestret efter ti opgaver i første hug', () => {
    let mastered = false;
    let count = 0;
    while (!mastered && count < 30) {
      mastered = answer(true).mastered;
      count++;
    }
    expect(count).toBe(10);
    expect(store().skills[skill.id]!.masteredAt).not.toBeNull();
    expect(store().skills[skill.id]!.due).not.toBeNull();
  });

  it('giver et forsøg mere uden at trække fra', () => {
    answer(true);
    answer(true);
    expect(phase()).toBe('independent');
    answer(false, 1);
    expect(store().skills[skill.id]!).toMatchObject({ phase: 'independent', phaseMisses: 0 });
  });

  it('sender først tilbage efter to tabte opgaver i træk', () => {
    answer(true);
    answer(true);
    lose();
    expect(phase()).toBe('independent');
    const out = lose();
    expect(out.regressed).toBe(true);
    expect(phase()).toBe('guided');
  });

  it('husker ikke gamle fejl når eleven kommer tilbage til fasen', () => {
    answer(true);
    answer(true);
    lose();
    lose();
    expect(phase()).toBe('guided');
    answer(true);
    answer(true);
    expect(phase()).toBe('independent');
    const out = lose();
    expect(out.regressed).toBe(false);
    expect(phase()).toBe('independent');
  });
});

describe('spring forklaringen over', () => {
  it('er mestret efter tre rigtige i første hug', () => {
    store().setPhase(skill.id, 'mastery', true);
    expect(answer(true).mastered).toBe(false);
    expect(answer(true).mastered).toBe(false);
    expect(answer(true).mastered).toBe(true);
    expect(store().skills[skill.id]!.testingOut).toBe(false);
  });

  it('sender til guidet træning ved første fejl', () => {
    store().setPhase(skill.id, 'mastery', true);
    answer(true);
    const out = answer(false, 1);
    expect(out.testOutFailed).toBe(true);
    expect(store().skills[skill.id]!).toMatchObject({ phase: 'guided', testingOut: false, masteredAt: null });
  });
});
