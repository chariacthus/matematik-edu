import { describe, expect, it } from 'vitest';
import { EXAM_PARTS, answerExamItem, createExam, examFinished, gradeIndication, summariseExam } from './exam';
import { aidsOf, matchesAids } from '../content';

describe('FP9-prøvesæt', () => {
  it('bygger et sæt med det rigtige antal opgaver', () => {
    for (const part of ['uden', 'med'] as const) {
      const exam = createExam(part, {}, 42);
      expect(exam.items.length, part).toBe(EXAM_PARTS[part].count);
      expect(exam.answers.length).toBe(exam.items.length);
    }
  });

  it('bruger kun opgaver uden hjælpemidler i den prøvedel', () => {
    // Det her er hele pointen: en lommeregneropgave må ikke dukke op i
    // prøven hvor eleven ikke har en lommeregner.
    for (let seed = 1; seed <= 25; seed++) {
      const exam = createExam('uden', {}, seed);
      for (const item of exam.items) {
        const gen = item.skill.generators.find((g) => g.id === item.problem.generatorId);
        expect(gen, 'generator ikke fundet').toBeDefined();
        expect(
          matchesAids(item.skill, gen!, 'uden'),
          `${item.skill.id}/${gen!.id} kræver hjælpemidler (${aidsOf(item.skill, gen!)})`,
        ).toBe(true);
      }
    }
  });

  it('spreder opgaverne over flere kompetenceområder', () => {
    const exam = createExam('uden', {}, 7);
    const cats = new Set(exam.items.map((i) => i.category));
    expect(cats.size).toBeGreaterThanOrEqual(3);
  });

  it('blander emnerne, så prøven ikke kommer i blokke', () => {
    const exam = createExam('med', {}, 11);
    const domains = exam.items.map((i) => i.skill.domainId);
    // Mindst halvdelen af naboparrene skal være forskellige emner.
    let changes = 0;
    for (let i = 1; i < domains.length; i++) if (domains[i] !== domains[i - 1]) changes += 1;
    expect(changes).toBeGreaterThan(domains.length / 2);
  });

  it('har både lettere og sværere opgaver end elevens niveau', () => {
    const exam = createExam('uden', {}, 3);
    const levels = new Set(exam.items.map((i) => i.problem.level));
    expect(levels.size).toBeGreaterThan(1);
  });

  it('er deterministisk for samme seed', () => {
    const a = createExam('uden', {}, 99);
    const b = createExam('uden', {}, 99);
    expect(a.items.map((i) => i.problem.prompt)).toEqual(b.items.map((i) => i.problem.prompt));
  });
});

describe('prøveresultat', () => {
  it('tæller rigtige og fordeler dem på kompetenceområder', () => {
    let exam = createExam('uden', {}, 5);
    exam.items.forEach((_, i) => {
      exam = answerExamItem(exam, i % 2 === 0);
    });
    expect(examFinished(exam)).toBe(true);

    const r = summariseExam(exam);
    expect(r.total).toBe(exam.items.length);
    expect(r.answered).toBe(exam.items.length);
    expect(r.correct).toBe(Math.ceil(exam.items.length / 2));
    expect(r.byCategory.reduce((n, c) => n + c.total, 0)).toBe(r.total);
    expect(r.percent).toBeGreaterThan(0);
  });

  it('peger på de færdigheder eleven fejlede i', () => {
    let exam = createExam('uden', {}, 8);
    exam.items.forEach(() => {
      exam = answerExamItem(exam, false);
    });
    const r = summariseExam(exam);
    expect(r.weakSkills.length).toBeGreaterThan(0);
    expect(r.weakSkills[0]!.wrong).toBeGreaterThan(0);
    expect(r.correct).toBe(0);
  });

  it('håndterer en prøve der afsluttes før tid', () => {
    let exam = createExam('uden', {}, 12);
    exam = answerExamItem(exam, true);
    exam = answerExamItem(exam, false);
    const r = summariseExam(exam);
    expect(r.answered).toBe(2);
    expect(r.total).toBe(exam.items.length);
  });
});

describe('karakterindikation', () => {
  it('følger 7-trinsskalaen opad', () => {
    const grades = [0, 35, 50, 70, 85, 95].map((p) => gradeIndication(p).grade);
    expect(grades).toEqual(['00', '02', '4', '7', '10', '12']);
  });

  it('har en note til hver karakter', () => {
    for (const p of [0, 30, 45, 63, 78, 90, 100]) {
      expect(gradeIndication(p).note.length).toBeGreaterThan(10);
    }
  });
});
