import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, DOMAINS, buildProblem } from './index';
import { checkAnswer, findTrap, parseNumber } from '../lib/answer';
import type { Difficulty, Problem } from '../types';
import { makeRng } from '../lib/math';
import { getMisconception } from './misconceptions';

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];
const SAMPLES = 24;

/** Svarer "som facit" på en opgave, så vi kan kontrollere generatoren. */
function correctResponse(p: Problem) {
  switch (p.answer.type) {
    case 'number':
      return { kind: 'text' as const, value: String(p.answer.value).replace('.', ',') };
    case 'fraction':
      return { kind: 'text' as const, value: `${p.answer.value.n}/${p.answer.value.d}` };
    case 'text':
    case 'expression':
      return { kind: 'text' as const, value: p.answer.value };
    case 'choice':
      return { kind: 'choice' as const, index: p.answer.correct };
    case 'multi':
      return { kind: 'multi' as const, indices: p.answer.correct };
    case 'pair':
      return { kind: 'pair' as const, a: String(p.answer.values[0]), b: String(p.answer.values[1]) };
    case 'point':
      return { kind: 'point' as const, x: String(p.answer.x), y: String(p.answer.y) };
  }
}

function finiteNumbers(p: Problem): boolean {
  const json = JSON.stringify(p, (_k, v) => (typeof v === 'function' ? undefined : v));
  return !/NaN|Infinity|null,"d"/.test(json);
}

describe('pensum', () => {
  it('har unikke emne-id\'er', () => {
    const ids = DOMAINS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('har unikke færdigheds-id\'er', () => {
    const ids = ALL_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('har unikke generator-id\'er inden for hver færdighed', () => {
    for (const skill of ALL_SKILLS) {
      const ids = skill.generators.map((g) => g.id);
      expect(new Set(ids).size, `${skill.id}`).toBe(ids.length);
    }
  });

  it('peger kun på forudsætninger der findes', () => {
    const known = new Set(ALL_SKILLS.map((s) => s.id));
    for (const skill of ALL_SKILLS) {
      for (const pre of skill.prerequisites) {
        expect(known.has(pre), `${skill.id} -> ${pre}`).toBe(true);
      }
    }
  });

  it('har forklaring, eksempel og mindst to generatorer pr. færdighed', () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.explain.length, `${skill.id} mangler forklaring`).toBeGreaterThan(0);
      expect(skill.worked.length, `${skill.id} mangler eksempel`).toBeGreaterThan(0);
      expect(skill.generators.length, `${skill.id} har for få generatorer`).toBeGreaterThanOrEqual(2);
      expect(skill.goal.startsWith('Du kan'), `${skill.id} mangler læringsmål`).toBe(true);
    }
  });

  it('bruger kun misforståelser der findes i kataloget', () => {
    const rng = makeRng(7);
    for (const skill of ALL_SKILLS) {
      for (const level of LEVELS) {
        for (const gen of skill.generators) {
          if ((gen.minLevel ?? 1) > level) continue;
          const draft = gen.make({ rng, level });
          for (const t of draft.traps ?? []) {
            expect(getMisconception(t.misconceptionId), `ukendt misforståelse: ${t.misconceptionId} (${skill.id}/${gen.id})`).toBeDefined();
          }
        }
      }
    }
  });
});

describe('opgavegeneratorer', () => {
  for (const skill of ALL_SKILLS) {
    for (const gen of skill.generators) {
      it(`${skill.id} / ${gen.id} producerer gyldige opgaver`, () => {
        for (const level of LEVELS) {
          if ((gen.minLevel ?? 1) > level) continue;
          for (let i = 0; i < SAMPLES; i++) {
            const p = buildProblem(skill, { level, generatorId: gen.id, seed: level * 1000 + i });

            // Selve opgaven skal være komplet.
            expect(p.prompt.length, 'tom opgavetekst').toBeGreaterThan(0);
            expect(p.hints.length, 'ingen hints').toBeGreaterThan(0);
            expect(p.solution.length, 'ingen løsning').toBeGreaterThan(0);
            expect(p.hints.every((h) => h.trim().length > 0), 'tomt hint').toBe(true);
            expect(finiteNumbers(p), `NaN/Infinity i opgaven: ${p.prompt}`).toBe(true);

            // Facit skal faktisk godkendes af retteren. Det er den vigtigste
            // kontrol: den fanger generatorer der regner forkert på sig selv.
            expect(checkAnswer(p.answer, correctResponse(p)), `facit afvises: ${p.prompt} -> ${JSON.stringify(p.answer)}`).toBe(true);

            if (p.answer.type === 'choice') {
              expect(p.choices?.length ?? 0, 'mangler svarmuligheder').toBeGreaterThan(1);
              expect(p.answer.correct).toBeGreaterThanOrEqual(0);
              expect(p.answer.correct).toBeLessThan(p.choices?.length ?? 0);
              expect(new Set(p.choices).size, `ens svarmuligheder: ${p.choices?.join(' | ')}`).toBe(p.choices?.length);
            }

            // En fælde må aldrig ramme det rigtige svar - så ville eleven
            // få at vide at et korrekt svar er en misforståelse.
            const facit = correctResponse(p);
            const hit = findTrap(p, facit);
            expect(hit, `fælde rammer det rigtige svar i ${p.prompt}: ${hit?.feedback}`).toBeNull();

            for (const t of p.traps ?? []) {
              expect(t.feedback.length, 'tom fældeforklaring').toBeGreaterThan(10);
              if (typeof t.value === 'number' && p.answer.type === 'number') {
                expect(t.value, `fælde = facit i ${p.prompt}`).not.toBe(p.answer.value);
              }
            }

            // Tal-svar skal kunne tastes igen af en elev med dansk komma.
            if (p.answer.type === 'number') {
              const typed = String(p.answer.value).replace('.', ',');
              expect(parseNumber(typed), `kan ikke parses: ${typed}`).not.toBeNull();
            }
          }
        }
      });
    }
  }
});
