import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, DOMAINS } from './index';

describe('pensummets omfang', () => {
  it('dækker alle 19 emner fra kravspecifikationen', () => {
    expect(DOMAINS.length).toBe(19);
  });

  it('rapporterer sit omfang', () => {
    const generators = ALL_SKILLS.reduce((n, s) => n + s.generators.length, 0);
    // eslint-disable-next-line no-console
    console.log(`Emner: ${DOMAINS.length} | Færdigheder: ${ALL_SKILLS.length} | Generatorer: ${generators}`);
    expect(ALL_SKILLS.length).toBeGreaterThan(40);
    expect(generators).toBeGreaterThan(90);
  });
});
