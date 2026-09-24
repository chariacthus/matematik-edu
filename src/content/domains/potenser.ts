import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const potenser: Domain = {
  id: 'potenser',
  name: 'Potenser',
  category: 'tal-algebra',
  area: 'tal',
  blurb: 'Kort skrivemåde for gentagen multiplikation, og reglerne der gør den nem at regne med.',
  skills: [
    {
      id: 'potens-grund',
      domainId: 'potenser',
      name: 'Hvad er en potens?',
      goal: 'Du kan udregne en potens og forklare hvad grundtal og eksponent betyder.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'rule', title: 'Grundtal og eksponent', math: '2^5 = \\underbrace{2 \\cdot 2 \\cdot 2 \\cdot 2 \\cdot 2}_{5 \\text{ faktorer}} = 32', body: 'Grundtallet er det der ganges. Eksponenten fortæller hvor mange gange.' },
        { kind: 'warning', body: '2³ er ikke 2 · 3 = 6. Det er 2 · 2 · 2 = 8. Eksponenten tæller faktorer. Den er ikke selv en faktor.' },
        { kind: 'warning', body: 'Pas på fortegn: (−3)² = 9, men −3² = −9. I den sidste er minusset ikke med i potensen.' },
        { kind: 'list', title: 'Vær vant til disse', items: ['2² = 4, 2³ = 8, 2⁴ = 16, 2⁵ = 32', '3² = 9, 3³ = 27', '5² = 25, 10² = 100', '11² = 121, 12² = 144'] },
      ],
      worked: [
        {
          title: 'Udregn (−2)⁴',
          prompt: '(-2)^4',
          steps: [
            s('Parentesen viser at minusset hører med.', '(-2)\\cdot(-2)\\cdot(-2)\\cdot(-2)'),
            s('To ad gangen.', '(-2)\\cdot(-2) = 4'),
            s('Og igen.', '4 \\cdot 4 = 16'),
            s('Lige eksponent → positivt svar.', '(-2)^4 = 16'),
          ],
          takeaway: 'Negativt grundtal: lige eksponent giver plus, ulige giver minus.',
        },
      ],
      generators: [
        {
          id: 'potens-udregn',
          label: 'Udregn potensen',
          make: ({ rng, level }) => {
            const base = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            const exp = rng.int(2, lv(level, [3, 3, 4, 4, 5]));
            const negative = level >= 3 && rng.bool(0.3);
            const b = negative ? -base : base;
            const value = b ** exp;
            if (Math.abs(value) > 10 ** 7) {
              return {
                prompt: `Beregn $${base}^2$`,
                input: { kind: 'number' as const },
                answer: numAns(base ** 2),
                hints: ['Gang grundtallet med sig selv.', `${base} · ${base}`],
                solution: [s('Kvadrér.', `${base}^2 = ${base ** 2}`)],
                seconds: 25,
              };
            }
            return {
              prompt: `Beregn $${negative ? `(${b})` : b}^{${exp}}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                `Eksponenten ${exp} betyder at grundtallet skal ganges med sig selv ${exp} gange.`,
                `${Array(exp).fill(negative ? `(${b})` : b).join(' · ')}`,
                negative ? `Eksponenten er ${exp % 2 === 0 ? 'lige, så svaret bliver positivt' : 'ulige, så svaret bliver negativt'}.` : `Start med ${b} · ${b} = ${b * b}.`,
              ],
              solution: [
                s('Skriv potensen ud.', `${Array(exp).fill(negative ? `(${b})` : `${b}`).join(' \\cdot ')}`),
                s('Regn trin for trin.', `= ${value}`),
              ],
              traps: [
                ...trapIfDifferent(value, b * exp, 'potens-base-gange', `Du gangede grundtallet med eksponenten. Eksponenten tæller hvor mange faktorer der er. Den er ikke selv en faktor: ${b}^${exp} = ${value}.`),
                ...(negative ? trapIfDifferent(value, -(base ** exp), 'negativ-multiplikation', `Fortegnet passer ikke. Eksponenten ${exp} er ${exp % 2 === 0 ? 'lige' : 'ulige'}, så svaret bliver ${exp % 2 === 0 ? 'positivt' : 'negativt'}.`) : []),
              ],
              seconds: 35,
            };
          },
        },
        {
          id: 'potens-skriv',
          label: 'Skriv som potens',
          make: ({ rng, level }) => {
            const base = rng.int(2, lv(level, [4, 5, 7, 9, 12]));
            // Grundtal og eksponent må ikke være ens - så ville flere af
            // svarmulighederne se præcis ens ud.
            let exp = rng.int(2, lv(level, [3, 4, 4, 5, 5]));
            if (exp === base) exp = base === 2 ? 3 : 2;
            const value = base ** exp;
            return mcq(rng, {
              prompt: `Hvad er $${Array(exp).fill(base).join(' \\cdot ')}$ skrevet som potens?`,
              options: [
                { text: `${base}^${exp}`, correct: true },
                { text: `${exp}^${base}`, misconceptionId: 'potens-base-gange', feedback: `Grundtallet er det der ganges, altså ${base}. Eksponenten er antallet af faktorer, altså ${exp}.` },
                { text: `${base} \\cdot ${exp}`, misconceptionId: 'potens-base-gange', feedback: `${base} · ${exp} = ${base * exp}, men ${Array(exp).fill(base).join(' · ')} = ${value}.` },
              ],
              hints: ['Tæl hvor mange faktorer der er.', 'Grundtallet står nederst, antallet af faktorer står som eksponent.'],
              solution: [s('Tæl faktorerne.', `${Array(exp).fill(base).join(' \\cdot ')} = ${base}^{${exp}} = ${value}`)],
              seconds: 25,
            });
          },
        },
      ],
    },

    {
      id: 'potens-regler',
      domainId: 'potenser',
      name: 'Potensreglerne',
      goal: 'Du kan bruge potensreglerne til at forenkle udtryk.',
      prerequisites: ['potens-grund'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Samme grundtal, gange', math: 'a^m \\cdot a^n = a^{m+n}', body: 'Fordi faktorerne bare stilles i forlængelse af hinanden.' },
        { kind: 'rule', title: 'Samme grundtal, dividere', math: '\\frac{a^m}{a^n} = a^{m-n}', body: 'Faktorerne går ud mod hinanden.' },
        { kind: 'rule', title: 'Potens af potens', math: '(a^m)^n = a^{m \\cdot n}', body: 'Her ganges eksponenterne. Kun her.' },
        { kind: 'rule', title: 'Nul og negative eksponenter', math: 'a^0 = 1 \\qquad a^{-n} = \\frac{1}{a^n}' },
        { kind: 'warning', body: 'Reglerne virker kun med samme grundtal. 2³ · 5² kan ikke slås sammen.' },
      ],
      worked: [
        {
          title: 'Forenkl (a³)² · a⁴',
          prompt: '(a^3)^2 \\cdot a^4',
          steps: [
            s('Potens af potens: gang eksponenterne.', '(a^3)^2 = a^{6}'),
            s('Samme grundtal ganges: læg eksponenterne sammen.', 'a^6 \\cdot a^4 = a^{10}'),
          ],
          takeaway: 'Gange → plus. Potens af potens → gange. De to forveksles nemt.',
        },
      ],
      generators: [
        {
          id: 'potens-gange-regel',
          label: 'Gang potenser sammen',
          make: ({ rng, level }) => {
            const base = rng.int(2, lv(level, [3, 4, 5, 6, 9]));
            const m = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const n = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            return {
              prompt: `Skriv $${base}^{${m}} \\cdot ${base}^{${n}}$ som én potens. Hvad bliver eksponenten?`,
              input: { kind: 'number' },
              answer: numAns(m + n),
              hints: [
                'Grundtallet er det samme i begge potenser.',
                'Ved multiplikation lægges eksponenterne sammen.',
                `${m} + ${n}`,
              ],
              solution: [
                s('Brug reglen.', `a^m \\cdot a^n = a^{m+n}`),
                s('Indsæt.', `${base}^{${m}} \\cdot ${base}^{${n}} = ${base}^{${m + n}}`),
              ],
              traps: trapIfDifferent(m + n, m * n, 'potens-gang-eksponenter', `Du gangede eksponenterne. Det gør man kun ved potens af potens. Her ganges to potenser sammen, og så LÆGGES eksponenterne sammen: ${m} + ${n} = ${m + n}.`),
              concept: 'aᵐ · aⁿ = aᵐ⁺ⁿ',
              seconds: 35,
            };
          },
        },
        {
          id: 'potens-dividere-regel',
          label: 'Divider potenser',
          minLevel: 2,
          make: ({ rng, level }) => {
            const base = rng.int(2, lv(level, [3, 4, 5, 6, 9]));
            const n = rng.int(2, lv(level, [3, 4, 5, 6, 7]));
            const m = n + rng.int(1, lv(level, [3, 4, 5, 6, 7]));
            return {
              prompt: `Skriv $\\dfrac{${base}^{${m}}}{${base}^{${n}}}$ som én potens. Hvad bliver eksponenten?`,
              input: { kind: 'number' },
              answer: numAns(m - n),
              hints: [
                'Grundtallet er det samme, så reglen for division kan bruges.',
                'Ved division trækkes eksponenterne fra hinanden.',
                `${m} − ${n}`,
              ],
              solution: [
                s('Brug reglen.', `\\frac{a^m}{a^n} = a^{m-n}`),
                s('Indsæt.', `\\frac{${base}^{${m}}}{${base}^{${n}}} = ${base}^{${m - n}}`),
              ],
              traps: trapIfDifferent(m - n, roundTo(m / n, 6), 'potens-gang-eksponenter', `Du dividerede eksponenterne. Ved division af potenser med samme grundtal TRÆKKER man eksponenterne fra hinanden: ${m} − ${n} = ${m - n}.`),
              concept: 'aᵐ : aⁿ = aᵐ⁻ⁿ',
              seconds: 35,
            };
          },
        },
        {
          id: 'potens-special',
          label: 'Nul og negative eksponenter',
          minLevel: 3,
          make: ({ rng, level }) => {
            const base = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const kind = rng.pick(['nul', 'negativ'] as const);
            if (kind === 'nul') {
              return {
                prompt: `Beregn $${base}^0$`,
                input: { kind: 'number' as const },
                answer: numAns(1),
                hints: [
                  'Tænk på reglen for division af potenser.',
                  `${base}³ : ${base}³ = ${base}^{3-3} = ${base}^0. Men et tal divideret med sig selv er jo 1.`,
                ],
                solution: [
                  s('Brug divisionsreglen.', `\\frac{${base}^3}{${base}^3} = ${base}^{3-3} = ${base}^0`),
                  s('Og et tal divideret med sig selv er 1.', `${base}^0 = 1`),
                ],
                traps: [
                  ...trapIfDifferent(1, 0, 'potens-nul', 'Alt (undtagen 0) opløftet i nulte er 1, ikke 0. Det følger af at aⁿ : aⁿ = 1.'),
                  ...trapIfDifferent(1, base, 'potens-nul', `${base}^1 er ${base}. Men eksponenten er 0, og så er svaret 1.`),
                ],
                concept: 'a⁰ = 1',
                seconds: 30,
              };
            }
            const n = rng.int(1, 3);
            const value = roundTo(1 / base ** n, 8);
            return {
              prompt: `Beregn $${base}^{-${n}}$ som decimaltal.`,
              input: { kind: 'number' as const },
              answer: numAns(value, 1e-6),
              hints: [
                'En negativ eksponent betyder "én divideret med".',
                `${base}^{-${n}} = \\frac{1}{${base}^{${n}}}`,
                `${base}^${n} = ${base ** n}, så svaret er 1 : ${base ** n}.`,
              ],
              solution: [
                s('Vend om.', `${base}^{-${n}} = \\frac{1}{${base}^{${n}}}`),
                s('Regn ud.', `= \\frac{1}{${base ** n}} = ${num(value)}`),
              ],
              traps: trapIfDifferent(value, -(base ** n), 'potens-nul', `En negativ eksponent giver ikke et negativt tal. Den betyder at man skal dividere: 1 : ${base ** n} = ${num(value)}.`),
              concept: 'a⁻ⁿ = 1/aⁿ',
              seconds: 40,
            };
          },
        },
      ],
    },

    {
      id: 'potens-titalspotenser',
      domainId: 'potenser',
      name: 'Titalspotenser og standardform',
      goal: 'Du kan skrive store og små tal på standardform.',
      prerequisites: ['potens-grund'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Standardform', body: 'Et tal på standardform skrives som a · 10ⁿ, hvor a ligger mellem 1 og 10.' },
        { kind: 'math', math: '4\\,500\\,000 = 4{,}5 \\cdot 10^6 \\qquad 0{,}00032 = 3{,}2 \\cdot 10^{-4}' },
        { kind: 'idea', title: 'Eksponenten er antal pladser', body: 'Tæl hvor mange pladser kommaet skal flyttes. Flyttes det til venstre, er eksponenten positiv. Til højre: negativ.' },
      ],
      worked: [
        {
          title: 'Skriv 0,00047 på standardform',
          prompt: '0{,}00047',
          steps: [
            s('Flyt kommaet så der står ét ciffer foran.', '4{,}7'),
            s('Tæl hvor mange pladser kommaet flyttede.', '4 \\text{ pladser mod højre}'),
            s('Tallet er mindre end 1, så eksponenten er negativ.', '0{,}00047 = 4{,}7 \\cdot 10^{-4}'),
          ],
          takeaway: 'Lille tal → negativ eksponent. Stort tal → positiv eksponent.',
        },
      ],
      generators: [
        {
          id: 'standardform-eksponent',
          label: 'Find eksponenten',
          make: ({ rng, level }) => {
            const big = rng.bool(0.6);
            const exp = big ? rng.int(3, lv(level, [4, 5, 6, 8, 11])) : -rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const mantissa = roundTo(rng.int(10, 99) / 10, 1);
            const value = mantissa * 10 ** exp;
            return {
              prompt: `Tallet $${num(roundTo(value, 12))}$ skrives på standardform som $${num(mantissa)} \\cdot 10^{n}$. Hvad er $n$?`,
              input: { kind: 'number' },
              answer: numAns(exp),
              hints: [
                'Flyt kommaet så der står præcis ét ciffer foran kommaet.',
                'Tæl hvor mange pladser du flyttede det.',
                big ? 'Tallet er større end 10, så eksponenten er positiv.' : 'Tallet er mindre end 1, så eksponenten er negativ.',
              ],
              solution: [
                s('Sæt kommaet efter første ciffer.', `${num(mantissa)}`),
                s('Tæl pladserne.', `n = ${exp}`),
                s('Standardform.', `${num(roundTo(value, 12))} = ${num(mantissa)} \\cdot 10^{${exp}}`),
              ],
              traps: trapIfDifferent(exp, -exp, 'decimal-komma', `Fortegnet på eksponenten er byttet om. Et tal ${big ? 'større end 10 har positiv' : 'mindre end 1 har negativ'} eksponent.`),
              seconds: 45,
            };
          },
        },
        {
          id: 'standardform-tilbage',
          label: 'Fra standardform til almindeligt tal',
          make: ({ rng, level }) => {
            const exp = rng.int(2, lv(level, [3, 4, 5, 6, 7]));
            const mantissa = roundTo(rng.int(11, 99) / 10, 1);
            const value = roundTo(mantissa * 10 ** exp, 6);
            return {
              prompt: `Skriv $${num(mantissa)} \\cdot 10^{${exp}}$ som et almindeligt tal.`,
              input: { kind: 'number' },
              answer: numAns(value, 1e-6),
              hints: [
                `10^${exp} betyder at kommaet flyttes ${exp} pladser mod højre.`,
                `10^${exp} = ${10 ** exp}`,
                `${num(mantissa)} · ${10 ** exp}`,
              ],
              solution: [
                s('Udregn titalspotensen.', `10^{${exp}} = ${10 ** exp}`),
                s('Gang.', `${num(mantissa)} \\cdot ${10 ** exp} = ${num(value)}`),
              ],
              seconds: 40,
            };
          },
        },
      ],
    },
  ],
};
