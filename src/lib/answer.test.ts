import { describe, expect, it } from 'vitest';
import { checkAnswer, normalizeExpression, parseFraction, parseNumber } from './answer';
import type { AnswerSpec } from '../types';

describe('parseNumber', () => {
  it('accepterer både dansk komma og engelsk punktum', () => {
    expect(parseNumber('3,14')).toBe(3.14);
    expect(parseNumber('3.14')).toBe(3.14);
  });

  it('tåler mellemrum, enheder og fortegn', () => {
    expect(parseNumber('  -42 ')).toBe(-42);
    expect(parseNumber('125 kr')).toBe(125);
    expect(parseNumber('7,5 cm')).toBe(7.5);
    expect(parseNumber('20%')).toBe(20);
  });

  it('læser punktum som tusindtalsseparator når der også er komma', () => {
    expect(parseNumber('2.500,50')).toBe(2500.5);
  });

  it('afviser det der ikke er tal', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('tolv')).toBeNull();
    expect(parseNumber('3,4,5')).toBeNull();
  });
});

describe('parseFraction', () => {
  it('læser brøker', () => {
    expect(parseFraction('3/4')).toEqual({ n: 3, d: 4 });
    expect(parseFraction('-3 / 4')).toEqual({ n: -3, d: 4 });
  });

  it('laver decimaltal om til brøk', () => {
    expect(parseFraction('0,75')).toEqual({ n: 3, d: 4 });
  });

  it('afviser nævner 0', () => {
    expect(parseFraction('3/0')).toBeNull();
  });
});

describe('normalizeExpression', () => {
  it('er ligeglad med rækkefølgen af led', () => {
    expect(normalizeExpression('2x + 3')).toBe(normalizeExpression('3 + 2x'));
  });

  it('samler ens led', () => {
    expect(normalizeExpression('x + x + 3')).toBe(normalizeExpression('2x + 3'));
  });

  it('håndterer potenser', () => {
    expect(normalizeExpression('2x^2 + 3x')).toBe(normalizeExpression('3x + 2x²'));
  });

  it('holder forskellige udtryk adskilt', () => {
    expect(normalizeExpression('2x + 3')).not.toBe(normalizeExpression('2x - 3'));
    expect(normalizeExpression('2x')).not.toBe(normalizeExpression('2y'));
  });
});

describe('checkAnswer', () => {
  it('godtager ækvivalente brøker, men kræver forkortning når der bedes om det', () => {
    expect(checkAnswer({ type: 'fraction', value: { n: 1, d: 2 } }, { kind: 'text', value: '2/4' })).toBe(true);
    expect(checkAnswer({ type: 'fraction', value: { n: 1, d: 2 }, requireReduced: true }, { kind: 'text', value: '2/4' })).toBe(false);
    expect(checkAnswer({ type: 'fraction', value: { n: 1, d: 2 }, requireReduced: true }, { kind: 'text', value: '1/2' })).toBe(true);
  });

  it('bruger tolerance på tal', () => {
    expect(checkAnswer({ type: 'number', value: 3.14159, tolerance: 0.01 }, { kind: 'text', value: '3,14' })).toBe(true);
    expect(checkAnswer({ type: 'number', value: 3.14159, tolerance: 0.0001 }, { kind: 'text', value: '3,14' })).toBe(false);
  });

  it('afviser tomme svar', () => {
    expect(checkAnswer({ type: 'number', value: 5 }, { kind: 'text', value: '' })).toBe(false);
    expect(checkAnswer({ type: 'choice', correct: 1 }, { kind: 'choice', index: null })).toBe(false);
  });

  it('er ligeglad med rækkefølge i multi-svar', () => {
    expect(checkAnswer({ type: 'multi', correct: [0, 2] }, { kind: 'multi', indices: [2, 0] })).toBe(true);
    expect(checkAnswer({ type: 'multi', correct: [0, 2] }, { kind: 'multi', indices: [0] })).toBe(false);
  });
});

describe('svar tastet på tastrækken', () => {
  it('forstår minus fra tastrækken', () => {
    expect(checkAnswer({ type: 'number', value: -12 }, { kind: 'text', value: '−12' })).toBe(true);
    expect(checkAnswer({ type: 'fraction', value: { n: -3, d: 4 } }, { kind: 'text', value: '−3/4' })).toBe(true);
    expect(checkAnswer({ type: 'point', x: -2, y: 5 }, { kind: 'point', x: '−2', y: '5' })).toBe(true);
    expect(checkAnswer({ type: 'pair', values: [-1.5, 4] }, { kind: 'pair', a: '−1,5', b: '4' })).toBe(true);
  });

  it('forstår potens og rod', () => {
    expect(checkAnswer({ type: 'expression', value: '2x² - 3' }, { kind: 'text', value: '2x^2 − 3' })).toBe(true);
    expect(checkAnswer({ type: 'expression', value: '3√2' }, { kind: 'text', value: '3√2' })).toBe(true);
  });
});

describe('svar eleverne faktisk skriver', () => {
  const text = (value: string) => ({ kind: 'text' as const, value });
  const num = (value: number): AnswerSpec => ({ type: 'number', value });

  it('godtager "x = 5" på en ligning', () => {
    expect(checkAnswer(num(5), text('x = 5'))).toBe(true);
    expect(checkAnswer(num(-3), text('x=−3'))).toBe(true);
  });

  it('godtager enheder med hævet 2 og 3', () => {
    expect(checkAnswer(num(24), text('24 cm²'))).toBe(true);
    expect(checkAnswer(num(8), text('8 m³'))).toBe(true);
    expect(checkAnswer(num(90), text('90 min'))).toBe(true);
  });

  it('læser 2.500 som både 2500 og 2,5', () => {
    expect(checkAnswer(num(2500), text('2.500'))).toBe(true);
    expect(checkAnswer(num(2.5), text('2.500'))).toBe(true);
    expect(checkAnswer(num(1250000), text('1.250.000'))).toBe(true);
    expect(checkAnswer(num(0.125), text('0.125'))).toBe(true);
    expect(checkAnswer(num(125), text('0.125'))).toBe(false);
  });

  it('læser et blandet tal som et blandet tal', () => {
    expect(parseFraction('1 3/4')).toEqual({ n: 7, d: 4 });
    expect(parseFraction('-2 1/2')).toEqual({ n: -5, d: 2 });
    expect(checkAnswer({ type: 'fraction', value: { n: 7, d: 4 } }, text('1 3/4'))).toBe(true);
    expect(checkAnswer({ type: 'fraction', value: { n: 13, d: 4 } }, text('1 3/4'))).toBe(false);
  });

  it('godtager "y =" foran en forskrift', () => {
    expect(checkAnswer({ type: 'expression', value: '2x+3' }, text('y = 2x + 3'))).toBe(true);
    expect(checkAnswer({ type: 'expression', value: '2x+3' }, text('f(x) = 3 + 2x'))).toBe(true);
  });
});
