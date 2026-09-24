import { describe, expect, it } from 'vitest';
import { describeResponse, findSlip } from './slips';
import type { AnswerSpec } from '../types';

const num = (value: number): AnswerSpec => ({ type: 'number', value });
const text = (value: string) => ({ kind: 'text' as const, value });
const kind = (spec: AnswerSpec, raw: string) => findSlip(spec, text(raw))?.kind ?? null;

describe('sjuskefejl', () => {
  it('fortegn', () => {
    expect(kind(num(-7), '7')).toBe('fortegn');
    expect(kind(num(12), '−12')).toBe('fortegn');
  });

  it('komma flyttet', () => {
    expect(kind(num(3.5), '35')).toBe('komma');
    expect(kind(num(250), '2,5')).toBe('komma');
    expect(kind(num(0.8), '0,008')).toBe('komma');
  });

  it('afrundet forkert', () => {
    expect(kind(num(12.35), '12,3')).toBe('afrunding');
    expect(kind(num(3.14159), '3,1')).toBe(null);
    expect(kind(num(50), '49')).toBe(null);
  });

  it('brøken på hovedet', () => {
    expect(kind({ type: 'fraction', value: { n: 3, d: 4 } }, '4/3')).toBe('omvendt');
    expect(kind(num(0.25), '4')).toBe('omvendt');
  });

  it('brøk der ikke er forkortet', () => {
    expect(kind({ type: 'fraction', value: { n: 3, d: 4 }, requireReduced: true }, '6/8')).toBe('forkort');
  });

  it('cifre byttet om', () => {
    expect(kind(num(45), '54')).toBe('cifre');
    expect(kind(num(7), '7')).toBe(null);
  });

  it('x og y byttet om', () => {
    expect(findSlip({ type: 'point', x: 2, y: -3 }, { kind: 'point', x: '-3', y: '2' })?.kind).toBe('xy');
  });

  it('slår ikke alarm ved et rigtigt svar eller et helt andet tal', () => {
    expect(kind(num(-7), '-7')).toBe(null);
    expect(kind(num(3.5), '3,5')).toBe(null);
    expect(kind(num(17), '4')).toBe(null);
    expect(kind({ type: 'fraction', value: { n: 3, d: 4 } }, '3/4')).toBe(null);
    expect(kind({ type: 'fraction', value: { n: 3, d: 4 } }, '6/8')).toBe(null);
    expect(kind(num(0), '0')).toBe(null);
  });

  it('gentager elevens svar som eleven skrev det', () => {
    expect(describeResponse(text(' −7 '))).toBe('−7');
    expect(describeResponse({ kind: 'choice', index: 1 })).toBe('B');
    expect(describeResponse({ kind: 'point', x: '2', y: '3' })).toBe('(2, 3)');
  });
});
