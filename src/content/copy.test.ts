import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, DOMAINS, buildProblem } from './index';
import { MISCONCEPTIONS } from './misconceptions';
import { EXAM_THEMES } from './examThemes';
import { makeRng } from '../lib/math';
import { feedbackForWrongAnswer, greeting, misconceptionClinic, respond, type Intent, type TutorContext } from '../tutor/tutor';
import type { Difficulty } from '../types';

// Brugerens egen formulering fra det oprindelige oplæg. Den bliver.
const ALLOWED = ['Lad os tage første trin sammen'];

const BANNED: [RegExp, string][] = [
  [/—/, 'tankestreg'],
  [/\blad os\b/i, '"lad os"'],
  [/\bAI\b/, '"AI"'],
  [/det er dér|hold fast|godt klaret|det er sådan man|godt spørgsmål/i, 'floskel'],
];

function problems(text: string): string[] {
  let t = text;
  for (const a of ALLOWED) t = t.split(a).join('');
  return BANNED.filter(([re]) => re.test(t)).map(([, name]) => name);
}

function strings(value: unknown): string[] {
  const out: string[] = [];
  JSON.stringify(value, (_k, v) => {
    if (typeof v === 'string') out.push(v);
    return typeof v === 'function' ? undefined : v;
  });
  return out;
}

function expectClean(where: string, texts: string[]) {
  const hits = texts.flatMap((t) => problems(t).map((p) => `${where}: ${p} i "${t.slice(0, 90)}"`));
  expect(hits).toEqual([]);
}

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];
const INTENTS: Intent[] = [
  'giv-mig-svaret', 'forstaar-ikke', 'hvordan-starter-jeg', 'forklar-anderledes', 'hvorfor',
  'naeste-trin', 'tjek-mit-svar', 'flere-opgaver', 'hilsen', 'ukendt',
];

describe('teksten lyder som en lærer', () => {
  it('forklaringer, eksempler og emnetekster', () => {
    expectClean('pensum', strings(DOMAINS));
  });

  it('prøvens opgavesæt med tema', () => {
    for (const theme of EXAM_THEMES) {
      for (const seed of [1, 2, 3]) expectClean(theme.id, [theme.title, ...strings(theme.build(makeRng(seed)))]);
    }
  });

  it('misforståelserne', () => {
    expectClean('misforståelser', strings(MISCONCEPTIONS));
  });

  it('opgaverne fra alle generatorer på alle niveauer', () => {
    for (const skill of ALL_SKILLS) {
      for (const gen of skill.generators) {
        for (const level of LEVELS) {
          for (const seed of [1, 2, 3]) {
            const p = buildProblem(skill, { level, generatorId: gen.id, seed });
            expectClean(`${skill.id}/${gen.id}`, [
              ...strings(p),
              ...(p.traps ?? []).map((t) => t.feedback),
            ]);
          }
        }
      }
    }
  });

  it('hjælpen, uanset hvad eleven skriver', () => {
    for (const skill of ALL_SKILLS) {
      const problem = buildProblem(skill, { level: 3, seed: 11 });
      const base: TutorContext = { problem, skill, helpLevel: 0, strugglingWith: [], attemptedWrong: false };
      const texts: string[] = [
        greeting(base).text,
        greeting({ ...base, attemptedWrong: true }).text,
        greeting({ ...base, strugglingWith: MISCONCEPTIONS.filter((m) => m.domainId === skill.domainId).map((m) => m.id) }).text,
      ];
      for (const intent of INTENTS) {
        for (const helpLevel of [0, 1, 2, 3, 4, 6, 12]) {
          const reply = respond({ ...base, helpLevel }, intent, intent === 'ukendt' ? '2x' : 'hjælp');
          texts.push(reply.text, ...(reply.suggestions ?? []));
        }
      }
      for (const triesSoFar of [1, 2]) {
        const fb = feedbackForWrongAnswer({ problem, misconception: null, trapFeedback: null, repeatCount: 0, triesSoFar });
        texts.push(fb.headline, fb.body);
      }
      expectClean(skill.id, texts);
    }

    for (const m of MISCONCEPTIONS) {
      const problem = buildProblem(ALL_SKILLS[0]!, { level: 1, seed: 1 });
      const texts = misconceptionClinic(m).flatMap((msg) => [msg.text, ...(msg.suggestions ?? [])]);
      for (const repeatCount of [0, 2]) {
        const fb = feedbackForWrongAnswer({ problem, misconception: m, trapFeedback: 'x', repeatCount, triesSoFar: 1 });
        texts.push(fb.headline);
      }
      expectClean(m.id, texts);
    }
  });
});
