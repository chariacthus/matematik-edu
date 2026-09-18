import type { Domain } from '../../types';
import { isPerfectSquare, num, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const roedder: Domain = {
  id: 'roedder',
  name: 'Kvadratrødder',
  category: 'tal-algebra',
  area: 'tal',
  icon: '√',
  blurb: 'Det omvendte af at kvadrere — og det værktøj Pythagoras hviler på.',
  skills: [
    {
      id: 'rod-kvadratrod',
      domainId: 'roedder',
      name: 'Kvadratrod',
      goal: 'Du kan udregne kvadratrødder og vurdere rødder af tal der ikke går op.',
      prerequisites: [],
      tier: 2,
      explain: [
        { kind: 'idea', title: 'Det omvendte af at kvadrere', body: '√25 spørger: hvilket positivt tal ganget med sig selv giver 25? Svaret er 5, fordi 5 · 5 = 25.' },
        { kind: 'rule', title: 'Definition', math: '\\sqrt{a} = b \\iff b^2 = a \;\; (b \\ge 0)' },
        { kind: 'warning', body: '√16 er ikke 8. Kvadratroden halverer ikke — den spørger efter tallet der ganget med sig selv giver 16, altså 4.' },
        { kind: 'list', title: 'Kvadrattal du bør kende', items: ['1, 4, 9, 16, 25, 36, 49, 64, 81, 100', '121, 144, 169, 196, 225'] },
        { kind: 'idea', title: 'Når det ikke går op', body: '√20 ligger mellem √16 = 4 og √25 = 5, altså mellem 4 og 5. Regn med lommeregner og rund af.' },
      ],
      worked: [
        {
          title: 'Hvad er √20 cirka?',
          prompt: '\\sqrt{20}',
          steps: [
            s('Find de nærmeste kvadrattal.', '16 < 20 < 25'),
            s('Tag kvadratroden af dem.', '4 < \\sqrt{20} < 5'),
            s('20 ligger tættere på 16 end på 25, så svaret er lidt over 4,4.', '\\sqrt{20} \\approx 4{,}47'),
          ],
          takeaway: 'Indkreds altid med kvadrattallene først. Så opdager du hvis lommeregneren giver noget urimeligt.',
        },
      ],
      generators: [
        {
          id: 'rod-eksakt',
          label: 'Kvadratrod der går op',
          make: ({ rng, level }) => {
            const root = rng.int(2, lv(level, [9, 12, 15, 20, 30]));
            const value = root * root;
            return {
              prompt: `Beregn $\\sqrt{${value}}$`,
              input: { kind: 'number' },
              answer: numAns(root),
              hints: [
                'Spørg dig selv: hvilket tal ganget med sig selv giver dette?',
                `Prøv dig frem. ${Math.max(2, root - 2)} · ${Math.max(2, root - 2)} = ${Math.max(2, root - 2) ** 2}. For lidt eller for meget?`,
                `${root} · ${root} = ${value}`,
              ],
              solution: [
                s('Find tallet der ganget med sig selv giver tallet under roden.', `${root} \\cdot ${root} = ${value}`),
                s('Altså.', `\\sqrt{${value}} = ${root}`),
              ],
              traps: trapIfDifferent(root, value / 2, 'rod-halverer', `Du halverede tallet. Kvadratroden spørger hvilket tal der ganget med SIG SELV giver ${value} — og det er ${root}.`),
              seconds: 30,
            };
          },
        },
        {
          id: 'rod-mellem',
          label: 'Mellem hvilke hele tal ligger roden?',
          minLevel: 2,
          make: ({ rng, level }) => {
            const lo = rng.int(2, lv(level, [7, 9, 12, 15, 20]));
            const value = rng.int(lo * lo + 1, (lo + 1) ** 2 - 1);
            const half = Math.floor(value / 2);
            return mcq(rng, {
              prompt: `Mellem hvilke to hele tal ligger $\\sqrt{${value}}$?`,
              options: [
                { text: `${lo} og ${lo + 1}`, correct: true },
                { text: `${lo - 1} og ${lo}` },
                { text: `${lo + 1} og ${lo + 2}` },
                ...(half > lo + 2
                  ? [{ text: `${half} og ${half + 1}`, misconceptionId: 'rod-halverer', feedback: `Du halverede ${value}. Kvadratroden er langt mindre end halvdelen — find i stedet de nærmeste kvadrattal.` }]
                  : []),
              ],
              hints: [
                'Find de nærmeste kvadrattal over og under.',
                `${lo}² = ${lo * lo} og ${lo + 1}² = ${(lo + 1) ** 2}.`,
                `${lo * lo} < ${value} < ${(lo + 1) ** 2}`,
              ],
              solution: [
                s('Indkreds med kvadrattal.', `${lo}^2 = ${lo * lo} \;<\; ${value} \;<\; ${(lo + 1) ** 2} = (${lo + 1})^2`),
                s('Tag kvadratroden af alle tre.', `${lo} < \\sqrt{${value}} < ${lo + 1}`),
              ],
              seconds: 40,
            });
          },
        },
        {
          id: 'rod-decimal',
          aids: 'med',
          label: 'Kvadratrod med decimaler',
          minLevel: 3,
          make: ({ rng, level }) => {
            let value = rng.int(10, lv(level, [50, 80, 120, 300, 600]));
            while (isPerfectSquare(value)) value = rng.int(10, 600);
            const root = roundTo(Math.sqrt(value), 2);
            return {
              prompt: `Beregn $\\sqrt{${value}}$`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number' },
              answer: numAns(root, 0.006),
              hints: [
                'Find først de nærmeste kvadrattal, så du ved hvad svaret cirka skal være.',
                `${Math.floor(Math.sqrt(value))}² = ${Math.floor(Math.sqrt(value)) ** 2} og ${Math.ceil(Math.sqrt(value))}² = ${Math.ceil(Math.sqrt(value)) ** 2}.`,
                'Brug så lommeregneren og rund til to decimaler.',
              ],
              solution: [
                s('Indkreds svaret.', `${Math.floor(Math.sqrt(value))} < \\sqrt{${value}} < ${Math.ceil(Math.sqrt(value))}`),
                s('Regn præcist.', `\\sqrt{${value}} \\approx ${num(root)}`),
              ],
              seconds: 45,
            };
          },
        },
      ],
    },

    {
      id: 'rod-regler',
      domainId: 'roedder',
      name: 'Regneregler for rødder',
      goal: 'Du kan forenkle kvadratrødder og undgå de klassiske fælder.',
      prerequisites: ['rod-kvadratrod'],
      tier: 4,
      explain: [
        { kind: 'rule', title: 'Rod af produkt', math: '\\sqrt{a \\cdot b} = \\sqrt{a} \\cdot \\sqrt{b}' },
        { kind: 'rule', title: 'Rod af brøk', math: '\\sqrt{\\frac{a}{b}} = \\frac{\\sqrt{a}}{\\sqrt{b}}' },
        { kind: 'rule', title: 'Rod og kvadrat ophæver hinanden', math: '(\\sqrt{a})^2 = a \\qquad \\sqrt{a^2} = |a|' },
        { kind: 'warning', body: 'Der findes INGEN regel for √(a + b). Det er ikke √a + √b. Prøv: √(9+16) = √25 = 5, men 3 + 4 = 7.' },
      ],
      worked: [
        {
          title: 'Forenkl √72',
          prompt: '\\sqrt{72}',
          steps: [
            s('Find det største kvadrattal der går op i 72.', '72 = 36 \\cdot 2'),
            s('Del roden op.', '\\sqrt{36 \\cdot 2} = \\sqrt{36} \\cdot \\sqrt{2}'),
            s('Udregn den der går op.', '= 6\\sqrt{2}'),
          ],
          takeaway: 'Led efter kvadrattal-faktorer: 4, 9, 16, 25, 36 …',
        },
      ],
      generators: [
        {
          id: 'rod-produkt',
          label: 'Rod af et produkt',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            const b = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            return {
              prompt: `Beregn $\\sqrt{${a * a} \\cdot ${b * b}}$`,
              input: { kind: 'number' },
              answer: numAns(a * b),
              hints: [
                'Roden af et produkt kan deles op i to rødder.',
                `\\sqrt{${a * a}} \\cdot \\sqrt{${b * b}}`,
                `${a} · ${b}`,
              ],
              solution: [
                s('Del roden op.', `\\sqrt{${a * a} \\cdot ${b * b}} = \\sqrt{${a * a}} \\cdot \\sqrt{${b * b}}`),
                s('Udregn hver rod.', `= ${a} \\cdot ${b} = ${a * b}`),
              ],
              traps: trapIfDifferent(a * b, a + b, 'rod-sum', `Du lagde rødderne sammen. √(a·b) = √a · √b — rødderne skal ganges, ikke lægges sammen.`),
              concept: '√(a·b) = √a · √b',
              seconds: 40,
            };
          },
        },
        {
          id: 'rod-sum-faelde',
          label: 'Roden af en sum',
          minLevel: 2,
          make: ({ rng, level }) => {
            const trip = rng.pick(lv<[number, number][]>(level, [
              [[3, 4], [6, 8]],
              [[3, 4], [6, 8], [5, 12]],
              [[5, 12], [8, 15], [9, 12]],
              [[7, 24], [8, 15], [20, 21]],
              [[9, 40], [12, 35], [28, 45]],
            ]));
            const a = trip[0];
            const b = trip[1];
            const sum = a * a + b * b;
            const value = Math.sqrt(sum);
            return {
              prompt: `Beregn $\\sqrt{${a * a} + ${b * b}}$`,
              input: { kind: 'number' },
              answer: numAns(value, 1e-6),
              hints: [
                'Der findes ingen regel for roden af en sum. Regn først det der står under roden.',
                `${a * a} + ${b * b} = ${sum}`,
                `√${sum} = ?`,
              ],
              solution: [
                s('Læg sammen inde under roden først.', `${a * a} + ${b * b} = ${sum}`),
                s('Tag kvadratroden.', `\\sqrt{${sum}} = ${value}`),
              ],
              traps: trapIfDifferent(value, a + b, 'rod-sum', `Du tog roden af hvert led for sig. √(a + b) er IKKE √a + √b. Her: √${a * a} + √${b * b} = ${a + b}, men √${sum} = ${value}.`),
              concept: 'Regn altid færdig under rodtegnet først.',
              seconds: 40,
            };
          },
        },
        {
          id: 'rod-ligning',
          label: 'Løs x² = k',
          minLevel: 3,
          make: ({ rng, level }) => {
            // root = 2 ville give k/2 = 2, altså en dublet af den rigtige rod.
            const root = rng.int(3, lv(level, [7, 9, 12, 15, 20]));
            const k = root * root;
            return mcq(rng, {
              prompt: `Løs ligningen $x^2 = ${k}$`,
              options: [
                { text: `x = ${root} \\text{ eller } x = -${root}`, correct: true },
                { text: `x = ${root}`, misconceptionId: 'negativ-multiplikation', feedback: `${root} er rigtigt, men der er også en negativ løsning: (−${root})² = ${k}. En andengradsligning har typisk to løsninger.` },
                { text: `x = ${k / 2}`, misconceptionId: 'rod-halverer', feedback: `Du halverede ${k}. Du skal finde det tal der ganget med sig selv giver ${k}.` },
                { text: `x = ${k * 2}` },
              ],
              hints: [
                'Tag kvadratroden på begge sider.',
                'Husk at der findes to tal der kvadreret giver det samme.',
                `${root}² = ${k} og (−${root})² = ${k}.`,
              ],
              solution: [
                s('Tag kvadratroden på begge sider.', `x = \\pm\\sqrt{${k}}`),
                s('Begge fortegn virker.', `x = ${root} \;\\vee\; x = -${root}`, 'Et negativt tal i anden bliver positivt.'),
              ],
              seconds: 45,
            });
          },
        },
      ],
    },
  ],
};
