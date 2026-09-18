import type { Domain } from '../../types';
import { gcd, num, roundTo } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const forhold: Domain = {
  id: 'forhold',
  name: 'Forhold og proportionalitet',
  category: 'tal-algebra',
  area: 'regnestrategier',
  blurb: 'Opskrifter, blandingsforhold, målestok og sammenhænge der følges ad.',
  skills: [
    {
      id: 'forhold-grund',
      domainId: 'forhold',
      name: 'Forhold',
      goal: 'Du kan forkorte et forhold og fordele et antal efter et givet forhold.',
      prerequisites: [],
      tier: 2,
      explain: [
        { kind: 'idea', title: 'Hvad er et forhold?', body: 'Forholdet 2:3 betyder at for hver 2 dele af det første er der 3 dele af det andet. I alt 5 dele.' },
        { kind: 'rule', title: 'Forkort som en brøk', math: '12:18 = 2:3', body: 'Divider begge tal med største fælles divisor — præcis som når du forkorter en brøk.' },
        { kind: 'idea', title: 'Fordeling efter forhold', body: 'Læg forholdstallene sammen for at få antal dele. Divider mængden med antal dele — så ved du hvad én del er værd.' },
      ],
      worked: [
        {
          title: 'Del 350 kr i forholdet 2:5',
          prompt: '350 \\text{ kr fordelt } 2:5',
          steps: [
            s('Antal dele i alt.', '2 + 5 = 7'),
            s('Hvad er én del værd?', '350 : 7 = 50'),
            s('Gang op.', '2 \\cdot 50 = 100 \\quad\\text{og}\\quad 5 \\cdot 50 = 250'),
            s('Kontrol.', '100 + 250 = 350', 'Altid værd at tjekke at delene giver det hele.'),
          ],
          takeaway: 'Find værdien af én del — så er resten bare gange.',
        },
      ],
      generators: [
        {
          id: 'forhold-forkort',
          label: 'Forkort forholdet',
          make: ({ rng, level }) => {
            const base = rng.pick([[1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 7]]) as [number, number];
            const k = rng.int(2, lv(level, [3, 4, 6, 9, 12]));
            const a = base[0] * k;
            const b = base[1] * k;
            return {
              prompt: `Forkort forholdet $${a}:${b}$ mest muligt. Skriv svaret som fx 2:3.`,
              input: { kind: 'text', placeholder: 'fx 2:3' },
              answer: { type: 'text', value: `${base[0]}:${base[1]}`, accept: [`${base[0]} : ${base[1]}`, `${base[0]}/${base[1]}`] },
              hints: [
                'Et forhold forkortes som en brøk.',
                `Hvilket tal går op i både ${a} og ${b}?`,
                `Den største fælles divisor er ${gcd(a, b)}.`,
              ],
              solution: [
                s('Find største fælles divisor.', `\\text{SFD}(${a}, ${b}) = ${gcd(a, b)}`),
                s('Divider begge tal.', `${a}:${b} = ${base[0]}:${base[1]}`),
              ],
              seconds: 40,
            };
          },
        },
        {
          id: 'forhold-fordel',
          label: 'Fordel efter forhold',
          make: ({ rng, level }) => {
            const [a, b] = rng.pick([[1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [1, 4], [4, 5]]) as [number, number];
            const parts = a + b;
            const perPart = rng.int(lv(level, [5, 10, 15, 20, 30]), lv(level, [20, 40, 60, 90, 150]));
            const total = parts * perPart;
            const who = name(rng);
            return {
              prompt: `${who} og en ven deler ${total} kr i forholdet ${a}:${b}. Hvor meget får den der får mest?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(Math.max(a, b) * perPart),
              hints: [
                `Læg forholdstallene sammen: ${a} + ${b} = ${parts} dele.`,
                `Én del er ${total} : ${parts} = ${perPart} kr.`,
                `Den største andel er ${Math.max(a, b)} dele.`,
              ],
              solution: [
                s('Antal dele i alt.', `${a} + ${b} = ${parts}`),
                s('Værdien af én del.', `${total} : ${parts} = ${perPart}`),
                s('Den største andel.', `${Math.max(a, b)} \\cdot ${perPart} = ${Math.max(a, b) * perPart}`),
              ],
              traps: [
                ...trapIfDifferent(Math.max(a, b) * perPart, Math.min(a, b) * perPart, 'forhold-omvendt', `Det er den mindste andel. Den største andel svarer til forholdstallet ${Math.max(a, b)}.`),
                ...trapIfDifferent(Math.max(a, b) * perPart, roundTo(total / 2, 2), 'forhold-omvendt', `De deler ikke lige over — forholdet ${a}:${b} betyder at den ene får flere dele end den anden.`),
              ],
              seconds: 70,
            };
          },
        },
        {
          id: 'forhold-opskrift',
          label: 'Opskrift op- eller nedskaleret',
          minLevel: 2,
          make: ({ rng, level }) => {
            const forPersons = rng.pick([2, 3, 4]);
            const amount = rng.int(1, 12) * 25;
            const target = forPersons * rng.int(2, lv(level, [2, 3, 4, 5, 6]));
            const value = roundTo((amount / forPersons) * target, 2);
            const ingredient = rng.pick(['mel', 'sukker', 'havregryn', 'mælk', 'smør']);
            return {
              prompt: `En opskrift til ${forPersons} personer bruger ${amount} g ${ingredient}. Hvor meget skal der bruges til ${target} personer?`,
              input: { kind: 'number', unit: 'g' },
              answer: numAns(value, 0.05),
              hints: [
                'Find først hvor meget der skal bruges til én person.',
                `${amount} : ${forPersons} = ${num(roundTo(amount / forPersons, 3))} g pr. person.`,
                `Gang med ${target}.`,
              ],
              solution: [
                s('Mængde pr. person.', `${amount} : ${forPersons} = ${num(roundTo(amount / forPersons, 3))}`),
                s('Gang op til det ønskede antal.', `${num(roundTo(amount / forPersons, 3))} \\cdot ${target} = ${num(value)}`),
              ],
              traps: trapIfDifferent(value, roundTo(amount * target, 2), 'forhold-omvendt', `Du gangede med antallet af personer uden først at finde mængden pr. person. Divider med ${forPersons} først.`),
              concept: 'Gå via "én enhed" — så bliver alle skaleringer ens.',
              seconds: 60,
            };
          },
        },
      ],
    },

    {
      id: 'forhold-proportional',
      domainId: 'forhold',
      name: 'Ligefrem og omvendt proportionalitet',
      goal: 'Du kan kende forskel på ligefrem og omvendt proportionalitet og regne med begge.',
      prerequisites: ['forhold-grund'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Ligefrem proportional', math: '\\frac{y}{x} = k \\quad\\text{eller}\\quad y = k \\cdot x', body: 'Dobbelt så meget af det ene giver dobbelt så meget af det andet. Grafen er en ret linje gennem (0,0).' },
        { kind: 'rule', title: 'Omvendt proportional', math: 'x \\cdot y = k', body: 'Dobbelt så meget af det ene giver halvt så meget af det andet. Produktet er konstant.' },
        { kind: 'analogy', body: 'Flere liter benzin koster flere kroner — ligefrem. Flere malere gør arbejdet på kortere tid — omvendt.' },
      ],
      worked: [
        {
          title: '4 malere bruger 9 timer. Hvor længe om 6 malere?',
          prompt: '4 \\text{ malere} \\rightarrow 9 \\text{ t}. \\quad 6 \\text{ malere} \\rightarrow ?',
          steps: [
            s('Flere malere → kortere tid. Det er omvendt proportionalt.'),
            s('Find konstanten.', 'k = 4 \\cdot 9 = 36', 'Det svarer til 36 "mandetimer".'),
            s('Del med det nye antal.', '36 : 6 = 6 \\text{ timer}'),
          ],
          takeaway: 'Spørg altid: bliver det andet større eller mindre? Det afgør hvilken type det er.',
        },
      ],
      generators: [
        {
          id: 'prop-ligefrem',
          label: 'Ligefrem proportional',
          make: ({ rng, level }) => {
            const unit = rng.int(2, lv(level, [8, 12, 20, 40, 60]));
            const x1 = rng.int(2, 9);
            const x2 = rng.int(2, 15);
            const y1 = unit * x1;
            return {
              prompt: `${x1} liter maling koster ${y1} kr. Hvad koster ${x2} liter?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(unit * x2),
              hints: [
                'Prisen er ligefrem proportional med mængden.',
                `Find prisen pr. liter: ${y1} : ${x1} = ${unit} kr.`,
                `Gang med ${x2}.`,
              ],
              solution: [
                s('Pris pr. liter.', `${y1} : ${x1} = ${unit}`),
                s('Gang op.', `${unit} \\cdot ${x2} = ${unit * x2}`),
              ],
              seconds: 50,
            };
          },
        },
        {
          id: 'prop-omvendt',
          label: 'Omvendt proportional',
          minLevel: 2,
          make: ({ rng, level }) => {
            const k = rng.int(2, lv(level, [6, 10, 15, 24, 36])) * 12;
            const divisors = [2, 3, 4, 6, 8, 12].filter((d) => k % d === 0);
            const n1 = rng.pick(divisors);
            const n2 = rng.pick(divisors.filter((d) => d !== n1));
            return {
              prompt: `${n1} maskiner kan lave et stykke arbejde på ${k / n1} timer. Hvor lang tid tager det med ${n2} maskiner?`,
              instruction: 'Antag at alle maskiner arbejder lige hurtigt.',
              input: { kind: 'number', unit: 'timer' },
              answer: numAns(roundTo(k / n2, 4), 0.005),
              hints: [
                'Flere maskiner betyder kortere tid — det er omvendt proportionalt.',
                `Find konstanten: ${n1} · ${k / n1} = ${k}.`,
                `Del med ${n2}.`,
              ],
              solution: [
                s('Produktet er konstant.', `k = ${n1} \\cdot ${k / n1} = ${k}`),
                s('Find den nye tid.', `${k} : ${n2} = ${num(roundTo(k / n2, 4))}`),
              ],
              traps: trapIfDifferent(roundTo(k / n2, 4), roundTo((k / n1) * (n2 / n1), 4), 'forhold-omvendt', `Du regnede som om det var ligefrem proportionalt. Flere maskiner giver kortere tid, så tiden skal ned når antallet går op.`),
              concept: 'Omvendt proportional: x · y er konstant.',
              seconds: 70,
            };
          },
        },
        {
          id: 'prop-type',
          label: 'Hvilken type er det?',
          minLevel: 2,
          make: ({ rng }) => {
            const cases = [
              { text: 'Antal liter benzin og prisen i kroner', type: 'ligefrem' },
              { text: 'Antal personer der deler en kage, og hvor stort et stykke hver får', type: 'omvendt' },
              { text: 'Antal timer du arbejder og din løn', type: 'ligefrem' },
              { text: 'Hastigheden på en tur og tiden turen tager', type: 'omvendt' },
              { text: 'Sidelængden i et kvadrat og omkredsen', type: 'ligefrem' },
              { text: 'Antal malere og tiden det tager at male et hus', type: 'omvendt' },
              { text: 'Antal kilometer kørt og forbrugt benzin', type: 'ligefrem' },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: `${c.text}. Hvilken sammenhæng er der?`,
              options: [
                { text: 'Ligefrem proportional', correct: c.type === 'ligefrem', misconceptionId: c.type === 'omvendt' ? 'forhold-omvendt' : undefined, feedback: c.type === 'omvendt' ? 'Her bliver det ene mindre når det andet bliver større — så produktet er konstant, ikke forholdet.' : undefined },
                { text: 'Omvendt proportional', correct: c.type === 'omvendt', misconceptionId: c.type === 'ligefrem' ? 'forhold-omvendt' : undefined, feedback: c.type === 'ligefrem' ? 'Her følges de to ad: bliver det ene dobbelt så stort, gør det andet også. Så det er ligefrem proportionalt.' : undefined },
              ],
              hints: [
                'Spørg: hvis det ene fordobles, hvad sker der så med det andet?',
                'Fordobles begge → ligefrem. Halveres det ene → omvendt.',
              ],
              solution: [s(c.type === 'ligefrem' ? 'Begge vokser i takt — y/x er konstant.' : 'Det ene vokser når det andet falder — x·y er konstant.')],
              seconds: 35,
            });
          },
        },
      ],
    },

    {
      id: 'forhold-maalestok',
      domainId: 'forhold',
      name: 'Målestoksforhold',
      goal: 'Du kan regne mellem mål på en tegning og mål i virkeligheden.',
      prerequisites: ['forhold-grund'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Målestok 1:n', math: '1\\text{ cm på tegning} = n\\text{ cm i virkeligheden}', body: '1:100 betyder at virkeligheden er 100 gange større end tegningen.' },
        { kind: 'list', title: 'To retninger', items: ['Tegning → virkelighed: gang med n', 'Virkelighed → tegning: divider med n'] },
        { kind: 'warning', body: 'Husk enhederne. 1:100 giver et svar i cm — det skal du selv lave om til meter bagefter.' },
      ],
      worked: [
        {
          title: 'Målestok 1:50',
          prompt: 'En væg er 7 cm på tegningen. Hvor lang er den i virkeligheden?',
          steps: [
            s('Gang med målestokstallet.', '7 \\cdot 50 = 350\\text{ cm}'),
            s('Omregn til meter.', '350\\text{ cm} = 3{,}5\\text{ m}'),
          ],
          takeaway: 'Regn først i samme enhed som tegningen, og omregn til sidst.',
        },
      ],
      generators: [
        {
          id: 'maalestok-op',
          label: 'Fra tegning til virkelighed',
          make: ({ rng, level }) => {
            const scale = rng.pick(lv<number[]>(level, [[10, 50], [50, 100], [100, 200], [200, 500], [250, 1000]]));
            const drawCm = roundTo(rng.int(10, 120) / 10, 1);
            const realCm = roundTo(drawCm * scale, 2);
            const inMeters = realCm / 100;
            return {
              prompt: `På en tegning i målestok 1:${scale} er en strækning ${num(drawCm)} cm. Hvor lang er den i virkeligheden? Svar i meter.`,
              input: { kind: 'number', unit: 'm' },
              answer: numAns(roundTo(inMeters, 4), 0.005),
              hints: [
                `1:${scale} betyder at virkeligheden er ${scale} gange større end tegningen.`,
                `${num(drawCm)} · ${scale} = ${num(realCm)} cm.`,
                'Divider med 100 for at få meter.',
              ],
              solution: [
                s('Gang med målestokstallet.', `${num(drawCm)} \\cdot ${scale} = ${num(realCm)}\\text{ cm}`),
                s('Omregn til meter.', `${num(realCm)}\\text{ cm} = ${num(roundTo(inMeters, 4))}\\text{ m}`),
              ],
              traps: [
                ...trapIfDifferent(roundTo(inMeters, 4), roundTo(realCm, 4), 'enhed-potens', `Det er svaret i centimeter. Der spørges om meter, så divider med 100.`),
                ...trapIfDifferent(roundTo(inMeters, 4), roundTo(drawCm / scale / 100, 6), 'maalestok-vej', `Du dividerede. Virkeligheden er ${scale} gange STØRRE end tegningen, så der skal ganges.`),
              ],
              seconds: 65,
            };
          },
        },
        {
          id: 'maalestok-ned',
          label: 'Fra virkelighed til tegning',
          minLevel: 2,
          make: ({ rng, level }) => {
            const scale = rng.pick(lv<number[]>(level, [[10, 50], [50, 100], [100, 200], [200, 500], [250, 1000]]));
            const realM = roundTo(rng.int(5, 400) / 10, 1);
            const drawCm = roundTo((realM * 100) / scale, 3);
            return {
              prompt: `Et hus er ${num(realM)} m langt. Hvor langt bliver det på en tegning i målestok 1:${scale}? Svar i cm.`,
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(drawCm, 0.005),
              hints: [
                'Omregn først til centimeter.',
                `${num(realM)} m = ${num(realM * 100)} cm.`,
                `Divider med ${scale}.`,
              ],
              solution: [
                s('Omregn til cm.', `${num(realM)}\\text{ m} = ${num(realM * 100)}\\text{ cm}`),
                s('Divider med målestokstallet.', `${num(realM * 100)} : ${scale} = ${num(drawCm)}\\text{ cm}`),
              ],
              traps: trapIfDifferent(drawCm, roundTo(realM * 100 * scale, 3), 'maalestok-vej', `Du gangede. Tegningen er ${scale} gange MINDRE end virkeligheden, så der skal divideres.`),
              seconds: 65,
            };
          },
        },
      ],
    },
  ],
};
