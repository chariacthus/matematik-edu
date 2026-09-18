import type { Domain } from '../../types';
import { coef, linearTex, num, roundTo, signed } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const uligheder: Domain = {
  id: 'uligheder',
  name: 'Uligheder',
  category: 'tal-algebra',
  area: 'ligninger',
  blurb: 'Når svaret ikke er ét tal, men et helt interval — og den ene regel du skal huske.',
  skills: [
    {
      id: 'ulighed-grund',
      domainId: 'uligheder',
      name: 'Løs en ulighed',
      goal: 'Du kan løse en simpel ulighed og tegne løsningen på en tallinje.',
      prerequisites: ['ligning-totrin'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Næsten som en ligning', body: 'Du løser en ulighed på nøjagtig samme måde som en ligning. Svaret er bare ikke ét tal, men alle tal der opfylder betingelsen.' },
        { kind: 'list', title: 'Tegnene', items: ['x < 5: alle tal under 5', 'x ≤ 5: alle tal til og med 5', 'x > 5: alle tal over 5', 'x ≥ 5: alle tal fra 5 og opefter'] },
        { kind: 'visual', visual: { kind: 'numberLine', min: -2, max: 10, step: 1, interval: { from: null, to: 5, openTo: true } }, caption: 'x < 5. Den åbne cirkel viser at 5 selv ikke er med.' },
        { kind: 'idea', title: 'Åben eller lukket cirkel', body: 'Ved < og > er cirklen åben — tallet er ikke med. Ved ≤ og ≥ er den fyldt.' },
      ],
      worked: [
        {
          title: 'Løs 3x + 2 ≤ 14',
          prompt: '3x + 2 \\le 14',
          steps: [
            s('Træk 2 fra på begge sider.', '3x \\le 12'),
            s('Divider med 3 — et positivt tal, så tegnet bliver stående.', 'x \\le 4'),
            s('Kontrol med et tal i intervallet.', '3 \\cdot 0 + 2 = 2 \\le 14 \;\\checkmark'),
          ],
          takeaway: 'Test altid et tal fra dit svar i den oprindelige ulighed.',
        },
      ],
      generators: [
        {
          id: 'ulighed-loes',
          label: 'Løs uligheden',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [4, 6, 8, 10, 12]));
            const x = rng.nonZero(-lv(level, [6, 9, 12, 15, 20]), lv(level, [6, 9, 12, 15, 20]));
            const b = rng.nonZero(-lv(level, [8, 12, 20, 30, 40]), lv(level, [8, 12, 20, 30, 40]));
            const c = a * x + b;
            const sign = rng.pick(['<', '>', '\\le', '\\ge'] as const);
            const plain = { '<': '<', '>': '>', '\\le': '≤', '\\ge': '≥' }[sign];
            return {
              prompt: `Løs uligheden $${linearTex(a, b)} ${sign} ${c}$. Hvilket tal står på højre side af $x ${plain}\;?$`,
              instruction: `Skriv kun tallet. Tegnet bliver ${plain}, fordi vi kun dividerer med positive tal.`,
              input: { kind: 'number' },
              answer: numAns(x),
              visual: {
                kind: 'numberLine',
                min: x - 6,
                max: x + 6,
                step: 1,
                interval: sign === '<' || sign === '\\le' ? { from: null, to: x, openTo: sign === '<' } : { from: x, to: null, openFrom: sign === '>' },
              },
              hints: [
                'Behandl uligheden præcis som en ligning.',
                `${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider: ${coef(a)} ${plain} ${c - b}.`,
                `Divider med ${a}. Tallet er positivt, så tegnet bliver stående.`,
              ],
              solution: [
                s(`${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider.`, `${coef(a)} ${sign} ${c - b}`),
                s(`Divider med ${a}.`, `x ${sign} ${x}`, 'Positivt tal — tegnet vendes ikke.'),
              ],
              seconds: 60,
            };
          },
        },
        {
          id: 'ulighed-tallinje',
          label: 'Aflæs en tallinje',
          make: ({ rng, level }) => {
            const x = rng.int(-lv(level, [5, 8, 10, 12, 15]), lv(level, [5, 8, 10, 12, 15]));
            const sign = rng.pick(['<', '>', '≤', '≥'] as const);
            const lower = sign === '>' || sign === '≥';
            const open = sign === '<' || sign === '>';
            return mcq(rng, {
              prompt: 'Hvilken ulighed passer til tallinjen?',
              options: [
                { text: `x ${sign} ${x}`, correct: true },
                { text: `x ${lower ? (open ? '<' : '≤') : open ? '>' : '≥'} ${x}`, misconceptionId: 'ulighed-vend-glemt', feedback: `Tegnet peger den forkerte vej. Det farvede område ligger ${lower ? 'til højre for' : 'til venstre for'} ${x}.` },
                { text: `x ${open ? (lower ? '≥' : '≤') : lower ? '>' : '<'} ${x}`, misconceptionId: 'ulighed-vend-glemt', feedback: `Cirklen er ${open ? 'åben' : 'fyldt'}, så ${x} ${open ? 'er ikke' : 'er'} med i løsningen.` },
                { text: `x ${sign} ${x + 1}` },
              ],
              visual: {
                kind: 'numberLine',
                min: x - 6,
                max: x + 6,
                step: 1,
                interval: lower ? { from: x, to: null, openFrom: open } : { from: null, to: x, openTo: open },
              },
              hints: [
                'Kig først på hvilken vej det farvede område går.',
                'Kig så på cirklen: åben betyder at tallet ikke er med.',
              ],
              solution: [
                s(`Området går mod ${lower ? 'højre' : 'venstre'}, så tegnet er ${lower ? '> eller ≥' : '< eller ≤'}.`),
                s(`Cirklen er ${open ? 'åben' : 'fyldt'}, så tegnet er ${sign}.`, `x ${sign} ${x}`),
              ],
              seconds: 40,
            });
          },
        },
      ],
    },

    {
      id: 'ulighed-negativ',
      domainId: 'uligheder',
      name: 'Når tegnet skal vendes',
      goal: 'Du kan løse uligheder hvor tegnet skal vendes, fordi du ganger eller dividerer med et negativt tal.',
      prerequisites: ['ulighed-grund'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Den ene regel der er anderledes', body: 'Ganger eller dividerer du med et NEGATIVT tal, skal ulighedstegnet vendes om.' },
        { kind: 'math', math: '3 < 5 \\quad\\xrightarrow{\\cdot(-1)}\\quad -3 > -5', caption: '3 er mindre end 5, men −3 er større end −5.' },
        { kind: 'visual', visual: { kind: 'numberLine', min: -6, max: 6, step: 1, marks: [{ value: 3, label: '3', tone: 'brand' }, { value: 5, label: '5', tone: 'brand' }, { value: -3, label: '-3', tone: 'bad' }, { value: -5, label: '-5', tone: 'bad' }] }, caption: 'Gang med −1 spejler tallene om 0 — og dermed vender rækkefølgen.' },
        { kind: 'warning', body: 'Plus og minus vender ALDRIG tegnet. Kun gange og dividere med negative tal gør.' },
      ],
      worked: [
        {
          title: 'Løs −2x > 6',
          prompt: '-2x > 6',
          steps: [
            s('Divider med −2 på begge sider.', undefined, 'Vi dividerer med et negativt tal.'),
            s('Vend tegnet!', 'x < \\frac{6}{-2}'),
            s('Regn ud.', 'x < -3'),
            s('Kontrol med x = −4.', '-2 \\cdot (-4) = 8 > 6 \;\\checkmark'),
          ],
          takeaway: 'Er du i tvivl, så test et tal. Det afslører med det samme om tegnet vender rigtigt.',
        },
      ],
      generators: [
        {
          id: 'ulighed-vend',
          label: 'Vend tegnet',
          make: ({ rng, level }) => {
            const a = -rng.int(2, lv(level, [4, 5, 6, 8, 10]));
            const x = rng.nonZero(-lv(level, [6, 8, 10, 12, 15]), lv(level, [6, 8, 10, 12, 15]));
            const b = a * x;
            const sign = rng.pick(['<', '>'] as const);
            const flipped = sign === '<' ? '>' : '<';
            return mcq(rng, {
              prompt: `Løs uligheden $${coef(a)} ${sign} ${b}$`,
              options: [
                { text: `x ${flipped} ${x}`, correct: true },
                { text: `x ${sign} ${x}`, misconceptionId: 'ulighed-vend-glemt', feedback: `Du glemte at vende tegnet. Du dividerede med ${a}, som er negativt, og så skal ${sign} blive til ${flipped}.` },
                { text: `x ${flipped} ${-x}`, misconceptionId: 'negativ-multiplikation', feedback: `Tegnet er rigtigt vendt, men fortegnet på tallet er forkert: ${b} : ${a} = ${x}.` },
                { text: `x ${sign} ${-x}` },
              ],
              hints: [
                `Du skal dividere begge sider med ${a}.`,
                `${a} er et negativt tal — hvad sker der så med ulighedstegnet?`,
                `${b} : ${a} = ${x}, og tegnet vendes til ${flipped}.`,
              ],
              solution: [
                s(`Divider begge sider med ${a}.`, `\\frac{${coef(a)}}{${a}} \;?\; \\frac{${b}}{${a}}`),
                s('Tallet er negativt, så tegnet vendes.', `x ${flipped} ${x}`),
                s('Kontrol.', `x = ${x - 1}:\; ${a} \\cdot (${x - 1}) = ${a * (x - 1)}`, `${a * (x - 1)} ${flipped === '<' ? (a * (x - 1) > b ? '>' : '<') : a * (x - 1) > b ? '>' : '<'} ${b}`),
              ],
              concept: 'Gange/dividere med negativt tal → vend tegnet.',
              seconds: 55,
            });
          },
        },
        {
          id: 'ulighed-negativ-tal',
          label: 'Find tallet efter vending',
          minLevel: 3,
          make: ({ rng, level }) => {
            const a = -rng.int(2, lv(level, [4, 5, 6, 8, 10]));
            const x = rng.nonZero(-lv(level, [6, 8, 10, 12, 15]), lv(level, [6, 8, 10, 12, 15]));
            const b = rng.nonZero(-lv(level, [8, 12, 20, 30, 40]), lv(level, [8, 12, 20, 30, 40]));
            const c = a * x + b;
            return {
              prompt: `Løs uligheden $${linearTex(a, b)} < ${c}$. Hvilket tal ender på højre side?`,
              instruction: 'Skriv kun tallet. Husk selv at tegnet vender til >.',
              input: { kind: 'number' },
              answer: numAns(x),
              visual: { kind: 'numberLine', min: x - 6, max: x + 6, step: 1, interval: { from: x, to: null, openFrom: true } },
              hints: [
                `Fjern først ${signed(b)} fra venstre side.`,
                `${coef(a)} < ${c - b}`,
                `Divider med ${a} — og husk at vende tegnet fordi ${a} er negativt.`,
              ],
              solution: [
                s(`${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider.`, `${coef(a)} < ${c - b}`),
                s(`Divider med ${a} og vend tegnet.`, `x > ${num(x)}`),
              ],
              traps: trapIfDifferent(x, roundTo((c + b) / a, 6), 'ligning-fortegn', `Fortegnet på ${b} blev ikke vendt da leddet skiftede side.`),
              seconds: 70,
            };
          },
        },
      ],
    },
  ],
};
