import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALL_SKILLS, buildProblem } from './index';
import { answerToString } from '../lib/answer';
import { Visual } from '../components/visuals/Visual';
import type { Difficulty, Problem, Visual as VisualSpec } from '../types';

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];

const numbers = (s: string) =>
  (s.replace(/−/g, '-').match(/-?\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(',', '.')));

// Det der står skrevet på figuren, sådan som den vises i en opgave.
function figureText(v: VisualSpec): string[] {
  const out: string[] = [];
  JSON.stringify(v, (key, val) => {
    if (typeof val === 'string' && !['kind', 'tone', 'type'].includes(key)) out.push(val);
    return val;
  });
  return out;
}

function givenText(p: Problem): string {
  return `${p.prompt} ${p.instruction ?? ''}`.replace(/\\[dt]?frac\{(-?\d+)\}\{(-?\d+)\}/g, '$1/$2');
}

function leaks(p: Problem): string | null {
  if (!p.visual) return null;
  const shown = figureText(p.visual);
  const given = givenText(p);
  const a = p.answer;
  if (a.type === 'number') {
    if (numbers(given).some((n) => Math.abs(n - a.value) < 1e-9)) return null;
    return shown.find((s) => numbers(s).some((n) => Math.abs(n - a.value) < 1e-9)) ?? null;
  }
  if (a.type === 'fraction') {
    const f = `${a.value.n}/${a.value.d}`;
    if (given.replace(/\s/g, '').includes(f)) return null;
    return shown.find((s) => s.replace(/\s/g, '').includes(f)) ?? null;
  }
  if (a.type === 'point') {
    const pt = `(${a.x},${a.y})`;
    return shown.find((s) => s.replace(/\s/g, '').includes(pt)) ?? null;
  }
  const facit = answerToString(a, p.choices).trim();
  if (given.includes(facit)) return null;
  return shown.find((s) => s.trim() === facit) ?? null;
}

const rendered = (spec: VisualSpec, mode: 'teach' | 'problem') =>
  renderToStaticMarkup(createElement(Visual, { spec, mode }))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

describe('figurerne viser ikke svaret', () => {
  it('ingen opgave skriver sit eget facit på figuren', () => {
    const found: string[] = [];
    for (const skill of ALL_SKILLS) {
      for (const gen of skill.generators) {
        for (const level of LEVELS) {
          for (let seed = 1; seed <= 12; seed++) {
            const p = buildProblem(skill, { level, generatorId: gen.id, seed });
            const hit = leaks(p);
            if (hit) found.push(`${skill.id}/${gen.id} niveau ${level}: "${hit}" i "${p.prompt.slice(0, 60)}"`);
          }
        }
      }
    }
    expect([...new Set(found)].slice(0, 10)).toEqual([]);
  });

  it('en brøkbjælke i en opgave skriver ikke brøken', () => {
    const spec: VisualSpec = { kind: 'fractionBar', rows: [{ num: 2, den: 3 }] };
    expect(rendered(spec, 'problem')).not.toContain('2/3');
    expect(rendered(spec, 'teach')).toContain('2/3');
  });

  it('en procentbjælke i en opgave skriver ikke procenten', () => {
    const spec: VisualSpec = { kind: 'percentBar', whole: 80, part: 22 };
    expect(rendered(spec, 'problem')).not.toContain('%');
    expect(rendered(spec, 'teach')).toContain('%');
  });

  it('et boksplot i en opgave aflæses på aksen', () => {
    const spec: VisualSpec = { kind: 'boxPlot', min: 4, q1: 10, median: 14, q3: 18, max: 22, step: 2 };
    const text = rendered(spec, 'problem');
    expect(text).not.toMatch(/Q₁|md|min|max/);
    expect(numbers(text)).not.toContain(10);
    expect(numbers(text)).not.toContain(14);
    expect(numbers(text).every((n) => n >= 0)).toBe(true);
    expect(numbers(text).length).toBeGreaterThanOrEqual(4);
    expect(rendered(spec, 'teach')).toContain('Q₁');
  });

  it('et søjlediagram i en opgave skriver ikke søjlernes tal', () => {
    const spec: VisualSpec = { kind: 'barChart', data: [{ label: 'A', value: 13 }, { label: 'B', value: 7 }], step: 1 };
    const text = numbers(rendered(spec, 'problem'));
    expect(text).not.toContain(13);
    expect(text).not.toContain(7);
  });

  it('søjler og boksplot i opgaverne ligger på aksens inddeling', () => {
    for (const skill of ALL_SKILLS) {
      for (const gen of skill.generators) {
        for (const level of LEVELS) {
          for (let seed = 1; seed <= 12; seed++) {
            const v = buildProblem(skill, { level, generatorId: gen.id, seed }).visual;
            if (v?.kind === 'barChart' && v.step) for (const d of v.data) expect(d.value % v.step, gen.id).toBe(0);
            if (v?.kind === 'boxPlot' && v.step) {
              for (const x of [v.min, v.q1, v.median, v.q3, v.max]) expect(x % v.step, gen.id).toBe(0);
            }
          }
        }
      }
    }
  });

  it('nabovinkler tegnes som to vinkler på en ret linje', () => {
    const skill = ALL_SKILLS.find((s) => s.id === 'geo-vinkler')!;
    const p = buildProblem(skill, { level: 2, generatorId: 'vinkel-nabo', seed: 3 });
    expect(p.visual?.kind === 'angles' && p.visual.type).toBe('straight');
    const text = rendered(p.visual!, 'problem');
    expect(text).toMatch(/\d+°/);
    expect(text).toMatch(/\bv\b/);
  });
});
