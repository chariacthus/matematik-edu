import { describe, expect, it } from 'vitest';
import { EXAM_PARTS, answerExamItem, createExam, examFinished, gradeIndication, summariseExam } from './exam';
import { aidsOf, matchesAids } from '../content';
import { EXAM_THEMES } from '../content/examThemes';
import { checkAnswer, type Response } from '../lib/answer';
import { makeRng } from '../lib/math';
import type { Problem } from '../types';

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
    const exam = createExam('uden', {}, 11);
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

describe('gennemgang af prøven', () => {
  it('gemmer det eleven svarede, og markerer overspring', () => {
    let exam = createExam('med', {}, 21);
    exam = answerExamItem(exam, true, ' 42 ');
    exam = answerExamItem(exam, false, 'B');
    exam = answerExamItem(exam, false);
    expect(exam.responses.slice(0, 3)).toEqual(['42', 'B', null]);
    expect(exam.responses).toHaveLength(exam.items.length);
    expect(exam.responses.slice(3).every((r) => r === null)).toBe(true);
  });

  it('klarer en session gemt før svarene blev husket', () => {
    const { responses: _, ...old } = createExam('uden', {}, 3);
    const exam = answerExamItem(old as ReturnType<typeof createExam>, false, '7');
    expect(exam.responses[0]).toBe('7');
    expect(exam.responses).toHaveLength(exam.items.length);
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

function facit(p: Problem): Response {
  switch (p.answer.type) {
    case 'number':
      return { kind: 'text', value: String(p.answer.value).replace('.', ',') };
    case 'fraction':
      return { kind: 'text', value: `${p.answer.value.n}/${p.answer.value.d}` };
    case 'text':
    case 'expression':
      return { kind: 'text', value: p.answer.value };
    case 'choice':
      return { kind: 'choice', index: p.answer.correct };
    case 'multi':
      return { kind: 'multi', indices: p.answer.correct };
    case 'pair':
      return { kind: 'pair', a: String(p.answer.values[0]), b: String(p.answer.values[1]) };
    case 'point':
      return { kind: 'point', x: String(p.answer.x), y: String(p.answer.y) };
  }
}

describe('opgavesæt med tema', () => {
  it('hvert tema giver fire delopgaver med gyldige tal og et facit der kan rettes', () => {
    for (const theme of EXAM_THEMES) {
      for (let seed = 1; seed <= 50; seed++) {
        const built = theme.build(makeRng(seed));
        expect(built.parts, theme.id).toHaveLength(4);
        expect(built.intro.length).toBeGreaterThan(20);
        expect(built.visual, `${theme.id} har hverken tabel eller figur`).toBeDefined();
        for (const part of built.parts) {
          const json = JSON.stringify(part.draft);
          expect(json, `${theme.id}/${seed}`).not.toMatch(/NaN|Infinity|undefined/);
          expect(part.draft.hints.length).toBeGreaterThan(0);
          expect(part.draft.solution.length).toBeGreaterThan(0);
          const p = { ...part.draft, id: 'x', skillId: part.skillId, domainId: 'tal', generatorId: 'x', level: 3, seconds: 60 } as Problem;
          expect(checkAnswer(p.answer, facit(p)), `${theme.id}/${seed}: ${p.prompt}`).toBe(true);
        }
      }
    }
  });

  it('prøven med hjælpemidler består af tre forskellige temaer med delopgaver i rækkefølge', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const exam = createExam('med', {}, seed);
      expect(exam.items).toHaveLength(EXAM_PARTS.med.count);
      const ids = [...new Set(exam.items.map((i) => i.theme?.id))];
      expect(ids).toHaveLength(3);
      expect(exam.items.map((i) => i.label)).toEqual(['1.1', '1.2', '1.3', '1.4', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4']);
      expect(new Set(exam.items.map((i) => i.problem.id)).size).toBe(12);
    }
  });

  it('prøven uden hjælpemidler har ingen temaer', () => {
    expect(createExam('uden', {}, 4).items.every((i) => !i.theme)).toBe(true);
  });
});
