import { describe, expect, it } from 'vitest';
import { dailyActivity } from './activity';
import type { Attempt } from '../types';

const at = (iso: string, correct: boolean): Attempt => ({
  ts: new Date(iso).getTime(),
  skillId: 'tal-regnearter',
  domainId: 'tal',
  generatorId: 'x',
  level: 1,
  correct,
  seconds: 10,
  hints: 0,
  tries: 1,
  phase: 'practice',
});

describe('opgaver pr. dag', () => {
  const now = new Date('2026-09-24T15:00:00').getTime();

  it('har en plads til hver dag, også dem uden opgaver, og i dag står sidst', () => {
    const days = dailyActivity([], 14, now);
    expect(days).toHaveLength(14);
    expect(days.at(-1)?.day).toBe('2026-09-24');
    expect(days[0]?.day).toBe('2026-09-11');
    expect(days.every((d) => d.total === 0)).toBe(true);
  });

  it('lægger opgaver på den rigtige dag, også lige før og efter midnat', () => {
    const days = dailyActivity(
      [at('2026-09-23T23:59:00', true), at('2026-09-24T00:01:00', false), at('2026-09-24T09:00:00', true)],
      14,
      now,
    );
    expect(days.at(-2)).toMatchObject({ day: '2026-09-23', total: 1, correct: 1 });
    expect(days.at(-1)).toMatchObject({ day: '2026-09-24', total: 2, correct: 1 });
  });

  it('springer opgaver over der ligger uden for perioden', () => {
    const days = dailyActivity([at('2026-09-01T12:00:00', true), at('2026-09-25T12:00:00', true)], 14, now);
    expect(days.reduce((n, d) => n + d.total, 0)).toBe(0);
  });
});
