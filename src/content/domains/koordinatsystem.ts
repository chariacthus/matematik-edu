import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const koordinatsystem: Domain = {
  id: 'koordinatsystem',
  name: 'Koordinatsystem',
  category: 'geometri-maaling',
  area: 'placeringer-flytninger',
  blurb: 'Punkter, afstande og midtpunkter i koordinatsystemet.',
  skills: [
    {
      id: 'koord-punkter',
      domainId: 'koordinatsystem',
      name: 'Punkter og koordinater',
      goal: 'Du kan aflæse og afsætte punkter i et koordinatsystem.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'rule', title: 'Rækkefølgen', math: 'P(x, y)', body: 'Første tal er x og fortæller hvor langt hen ad den vandrette akse. Andet tal er y og fortæller hvor langt op ad den lodrette.' },
        { kind: 'analogy', body: 'Først hen ad gangen, så op ad trappen. Altid i den rækkefølge.' },
        { kind: 'visual', visual: { kind: 'coordinate', xRange: [-5, 5], yRange: [-5, 5], points: [{ x: 3, y: 2, label: 'A(3, 2)', tone: 'brand' }, { x: -2, y: 3, label: 'B(-2, 3)', tone: 'accent' }] } },
        { kind: 'list', title: 'De fire kvadranter', items: ['1. kvadrant: x > 0, y > 0 (øverst til højre)', '2. kvadrant: x < 0, y > 0', '3. kvadrant: x < 0, y < 0', '4. kvadrant: x > 0, y < 0'] },
        { kind: 'warning', body: '(3, 5) og (5, 3) er to forskellige punkter. Rækkefølgen betyder alt.' },
      ],
      worked: [
        {
          title: 'Afsæt punktet (−3, 4)',
          prompt: 'P(-3, 4)',
          steps: [
            s('Start i (0,0).', undefined, 'Origo, hvor akserne skærer.'),
            s('x = −3: gå 3 til venstre.'),
            s('y = 4: gå 4 op.'),
            s('Sæt punktet.', 'P(-3, 4)', 'Det ligger i 2. kvadrant.'),
          ],
          takeaway: 'Negativt x → venstre. Negativt y → ned.',
        },
      ],
      generators: [
        {
          id: 'koord-aflaes',
          label: 'Aflæs punktets koordinater',
          make: ({ rng, level }) => {
            const range = lv(level, [5, 6, 8, 10, 12]);
            const x = rng.nonZero(-range, range);
            const y = rng.nonZero(-range, range);
            return {
              prompt: 'Aflæs koordinaterne for punktet i koordinatsystemet.',
              input: { kind: 'point' },
              answer: { type: 'point', x, y },
              visual: { kind: 'coordinate', xRange: [-range, range], yRange: [-range, range], points: [{ x, y, label: 'P', tone: 'brand' }] },
              hints: [
                'Se først hvor langt punktet ligger hen ad den vandrette akse.',
                'Se derefter hvor langt op eller ned det ligger.',
                `x-værdien er ${x}.`,
              ],
              solution: [
                s('Aflæs x på den vandrette akse.', `x = ${x}`),
                s('Aflæs y på den lodrette akse.', `y = ${y}`),
                s('Skriv som et punkt.', `P(${x}, ${y})`),
              ],
              seconds: 35,
            };
          },
        },
        {
          id: 'koord-kvadrant',
          label: 'Hvilken kvadrant?',
          minLevel: 2,
          make: ({ rng, level }) => {
            const range = lv(level, [5, 6, 8, 10, 12]);
            const x = rng.nonZero(-range, range);
            const y = rng.nonZero(-range, range);
            const q = x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
            // Kvadranten man ender i hvis man bytter om på x og y.
            const swapped = y > 0 ? (x > 0 ? 1 : 4) : x > 0 ? 2 : 3;
            return mcq(rng, {
              prompt: `I hvilken kvadrant ligger punktet $P(${x}, ${y})$?`,
              options: [1, 2, 3, 4].map((n) => ({
                text: `${n}. kvadrant`,
                correct: n === q,
                misconceptionId: n === swapped && n !== q ? 'koordinat-byttet' : undefined,
                feedback:
                  n !== q
                    ? n === swapped
                      ? `Du byttede om på x og y. Første tal er altid x: her er x = ${x} og y = ${y}, og det giver ${q}. kvadrant.`
                      : `x = ${x} er ${x > 0 ? 'positiv' : 'negativ'} og y = ${y} er ${y > 0 ? 'positiv' : 'negativ'}. Det giver ${q}. kvadrant.`
                    : undefined,
              })),
              visual: { kind: 'coordinate', xRange: [-range, range], yRange: [-range, range], points: [{ x, y, label: 'P', tone: 'brand' }] },
              hints: [
                'Kvadranterne tælles mod uret fra øverst til højre.',
                `x = ${x} er ${x > 0 ? 'positiv' : 'negativ'}, y = ${y} er ${y > 0 ? 'positiv' : 'negativ'}.`,
              ],
              solution: [s('Se på fortegnene.', `x ${x > 0 ? '>' : '<'} 0,\; y ${y > 0 ? '>' : '<'} 0`, `Det er ${q}. kvadrant.`)],
              seconds: 30,
            });
          },
        },
      ],
    },

    {
      id: 'koord-afstand',
      aids: 'med',
      domainId: 'koordinatsystem',
      name: 'Afstand og midtpunkt',
      goal: 'Du kan beregne afstanden mellem to punkter og finde midtpunktet.',
      prerequisites: ['koord-punkter', 'geo-pythagoras'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Afstand er Pythagoras', body: 'Tegn en retvinklet trekant mellem punkterne. Den vandrette forskel og den lodrette forskel er kateterne, og afstanden er hypotenusen.' },
        { kind: 'rule', title: 'Afstandsformlen', math: '|AB| = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}' },
        { kind: 'rule', title: 'Midtpunktet', math: 'M = \\left(\\frac{x_1 + x_2}{2},\; \\frac{y_1 + y_2}{2}\\right)', body: 'Gennemsnittet af x-værdierne og gennemsnittet af y-værdierne.' },
        { kind: 'warning', body: 'Kvadraterne gør fortegnet ligegyldigt. Det er derfor det er lige meget hvilket punkt du kalder nummer 1.' },
      ],
      worked: [
        {
          title: 'Afstand mellem A(1,2) og B(4,6)',
          prompt: '|AB| = ?',
          steps: [
            s('Find forskellene.', '\\Delta x = 4 - 1 = 3,\\quad \\Delta y = 6 - 2 = 4'),
            s('Kvadrér og læg sammen.', '3^2 + 4^2 = 9 + 16 = 25'),
            s('Tag kvadratroden.', '|AB| = \\sqrt{25} = 5'),
          ],
          takeaway: 'Det er bare Pythagoras med koordinater i stedet for sidelængder.',
        },
      ],
      generators: [
        {
          id: 'afstand-punkter',
          label: 'Afstand mellem to punkter',
          make: ({ rng, level }) => {
            const range = lv(level, [6, 8, 10, 12, 14]);
            const x1 = rng.int(-range, range);
            const y1 = rng.int(-range, range);
            const dx = rng.nonZero(-6, 6);
            const dy = rng.nonZero(-6, 6);
            const x2 = x1 + dx;
            const y2 = y1 + dy;
            const value = roundTo(Math.sqrt(dx * dx + dy * dy), 2);
            return {
              prompt: `Find afstanden mellem $A(${x1}, ${y1})$ og $B(${x2}, ${y2})$.`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number' },
              answer: numAns(value, 0.02),
              visual: {
                kind: 'coordinate',
                xRange: [Math.min(x1, x2) - 2, Math.max(x1, x2) + 2],
                yRange: [Math.min(y1, y2) - 2, Math.max(y1, y2) + 2],
                points: [{ x: x1, y: y1, label: 'A', tone: 'brand' }, { x: x2, y: y2, label: 'B', tone: 'accent' }],
                segments: [{ x1, y1, x2, y2 }],
              },
              hints: [
                'Find forskellen i x og forskellen i y.',
                `Δx = ${x2} − ${x1} = ${dx} og Δy = ${y2} − ${y1} = ${dy}.`,
                `Afstand = √(${dx}² + ${dy}²) = √${dx * dx + dy * dy}`,
              ],
              solution: [
                s('Find forskellene.', `\\Delta x = ${dx},\\quad \\Delta y = ${dy}`),
                s('Kvadrér og læg sammen.', `${dx * dx} + ${dy * dy} = ${dx * dx + dy * dy}`),
                s('Tag kvadratroden.', `|AB| = \\sqrt{${dx * dx + dy * dy}} \\approx ${num(value, 2)}`),
              ],
              traps: [
                ...trapIfDifferent(value, Math.abs(dx) + Math.abs(dy), 'pythagoras-uden-kvadrat', `Du lagde forskellene sammen. De er kateter i en retvinklet trekant, så afstanden er √(${dx}² + ${dy}²) = ${num(value, 2)}.`),
                ...trapIfDifferent(value, dx * dx + dy * dy, 'pythagoras-uden-kvadrat', `Du glemte kvadratroden. ${dx * dx + dy * dy} er afstanden i anden.`),
              ],
              concept: '|AB| = √(Δx² + Δy²)',
              seconds: 90,
            };
          },
        },
        {
          id: 'midtpunkt',
          label: 'Midtpunkt',
          minLevel: 2,
          make: ({ rng, level }) => {
            const range = lv(level, [6, 8, 10, 12, 14]);
            const x1 = rng.int(-range, range);
            const y1 = rng.int(-range, range);
            const x2 = rng.int(-range, range);
            const y2 = rng.int(-range, range);
            const mx = roundTo((x1 + x2) / 2, 4);
            const my = roundTo((y1 + y2) / 2, 4);
            return {
              prompt: `Find midtpunktet mellem $A(${x1}, ${y1})$ og $B(${x2}, ${y2})$.`,
              input: { kind: 'point' },
              answer: { type: 'point', x: mx, y: my, tolerance: 0.005 },
              visual: {
                kind: 'coordinate',
                xRange: [Math.min(x1, x2) - 2, Math.max(x1, x2) + 2],
                yRange: [Math.min(y1, y2) - 2, Math.max(y1, y2) + 2],
                points: [{ x: x1, y: y1, label: 'A', tone: 'brand' }, { x: x2, y: y2, label: 'B', tone: 'accent' }],
                segments: [{ x1, y1, x2, y2, dashed: true }],
              },
              hints: [
                'Midtpunktet er gennemsnittet af koordinaterne.',
                `x: (${x1} + ${x2}) : 2`,
                `y: (${y1} + ${y2}) : 2`,
              ],
              solution: [
                s('Gennemsnittet af x-værdierne.', `\\frac{${x1} + ${x2}}{2} = ${num(mx)}`),
                s('Gennemsnittet af y-værdierne.', `\\frac{${y1} + ${y2}}{2} = ${num(my)}`),
                s('Midtpunktet.', `M(${num(mx)}, ${num(my)})`),
              ],
              seconds: 60,
            };
          },
        },
      ],
    },
  ],
};
