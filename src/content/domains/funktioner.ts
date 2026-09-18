import type { Domain } from '../../types';
import { linearTex, num, roundTo, signed } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const funktioner: Domain = {
  id: 'funktioner',
  name: 'Funktioner',
  category: 'funktioner',
  icon: 'f(x)',
  blurb: 'Lineære og eksponentielle sammenhænge — forskrift, graf og virkelighed.',
  skills: [
    {
      id: 'funk-begreb',
      domainId: 'funktioner',
      name: 'Hvad er en funktion?',
      goal: 'Du kan beregne funktionsværdier og aflæse en graf.',
      prerequisites: ['koord-punkter', 'algebra-udtryk'],
      tier: 2,
      explain: [
        { kind: 'analogy', body: 'En funktion er en maskine. Du putter et tal ind (x), og der kommer præcis ét tal ud (y). Forskriften fortæller hvad maskinen gør.' },
        { kind: 'rule', title: 'Notation', math: 'f(x) = 2x + 3 \;\\Rightarrow\; f(4) = 2 \\cdot 4 + 3 = 11', body: 'f(4) betyder "funktionsværdien når x er 4". Det er ikke f gange 4.' },
        { kind: 'idea', title: 'Graf og forskrift er det samme', body: 'Hvert punkt på grafen har koordinaterne (x, f(x)). Grafen er alle løsningerne tegnet op.' },
      ],
      worked: [
        {
          title: 'Beregn f(−2) for f(x) = 3x − 5',
          prompt: 'f(x) = 3x - 5,\; f(-2) = ?',
          steps: [
            s('Sæt −2 ind i stedet for x.', 'f(-2) = 3 \\cdot (-2) - 5'),
            s('Regn gangestykket.', '= -6 - 5'),
            s('Resultat.', '= -11'),
          ],
          takeaway: 'Parentes om det indsatte tal — især når det er negativt.',
        },
      ],
      generators: [
        {
          id: 'funk-vaerdi',
          label: 'Beregn funktionsværdien',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [4, 6, 8, 10, 12]), lv(level, [4, 6, 8, 10, 12]));
            const b = rng.nonZero(-lv(level, [8, 12, 18, 25, 40]), lv(level, [8, 12, 18, 25, 40]));
            const x = rng.nonZero(-lv(level, [4, 6, 8, 10, 12]), lv(level, [4, 6, 8, 10, 12]));
            const value = a * x + b;
            return {
              prompt: `For funktionen $f(x) = ${linearTex(a, b)}$, hvad er $f(${x})$?`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                `Sæt ${x} ind i stedet for x.`,
                `${a} · (${x}) = ${a * x}`,
                `Læg ${b} til.`,
              ],
              solution: [
                s('Indsæt.', `f(${x}) = ${a} \\cdot (${x}) ${signed(b)}`),
                s('Regn gangestykket.', `= ${a * x} ${signed(b)}`),
                s('Resultat.', `= ${value}`),
              ],
              traps: trapIfDifferent(value, a + x + b, 'algebra-uens-led', `${a}x betyder ${a} GANGE x. Du lagde tallene sammen i stedet.`),
              seconds: 40,
            };
          },
        },
        {
          id: 'funk-aflaes',
          label: 'Aflæs grafen',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [2, 3, 3, 4, 5]), lv(level, [2, 3, 3, 4, 5]));
            const b = rng.int(-6, 6);
            const x = rng.nonZero(-4, 4);
            const value = a * x + b;
            if (Math.abs(value) > 12) {
              const safeX = 1;
              return {
                prompt: `Aflæs $f(${safeX})$ på grafen.`,
                input: { kind: 'number' as const },
                answer: numAns(a * safeX + b),
                visual: { kind: 'coordinate' as const, xRange: [-8, 8] as [number, number], yRange: [-12, 12] as [number, number], lines: [{ a, b, label: 'f', tone: 'brand' as const }], points: [{ x: safeX, y: a * safeX + b, tone: 'accent' as const }] },
                hints: [`Gå til x = ${safeX} på den vandrette akse.`, 'Gå lodret op eller ned til grafen og aflæs y-værdien.'],
                solution: [s('Aflæs y-værdien over x.', `f(${safeX}) = ${a * safeX + b}`)],
                seconds: 40,
              };
            }
            return {
              prompt: `Aflæs $f(${x})$ på grafen.`,
              input: { kind: 'number' },
              answer: numAns(value),
              visual: {
                kind: 'coordinate',
                xRange: [-8, 8],
                yRange: [-12, 12],
                lines: [{ a, b, label: 'f', tone: 'brand' }],
                points: [{ x, y: value, tone: 'accent' }],
              },
              hints: [
                `Find ${x} på den vandrette akse.`,
                'Gå lodret op (eller ned) indtil du rammer grafen.',
                'Gå derfra vandret ind til y-aksen og aflæs.',
              ],
              solution: [
                s(`Gå til x = ${x}.`),
                s('Aflæs hvor grafen ligger dér.', `f(${x}) = ${value}`),
              ],
              traps: trapIfDifferent(value, x, 'koordinat-byttet', 'Du aflæste x-værdien. f(x) er y-værdien — hvor højt grafen ligger.'),
              seconds: 45,
            };
          },
        },
      ],
    },

    {
      id: 'funk-lineaer',
      domainId: 'funktioner',
      name: 'Lineære funktioner',
      goal: 'Du kan forklare hvad a og b betyder og aflæse dem på en graf.',
      prerequisites: ['funk-begreb'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Forskriften', math: 'y = ax + b', body: 'a er hældningen — hvor meget y ændrer sig når x vokser med 1. b er skæringen med y-aksen — værdien når x = 0.' },
        { kind: 'visual', visual: { kind: 'coordinate', xRange: [-6, 6], yRange: [-6, 8], lines: [{ a: 2, b: 1, label: 'y = 2x + 1', tone: 'brand' }], points: [{ x: 0, y: 1, label: 'b = 1', tone: 'accent' }] }, caption: 'Grafen skærer y-aksen i 1 og stiger 2 for hvert skridt til højre.' },
        { kind: 'rule', title: 'Hældningen mellem to punkter', math: 'a = \\frac{y_2 - y_1}{x_2 - x_1}', body: 'Op divideret med hen.' },
        { kind: 'list', title: 'Hvad fortæller a?', items: ['a > 0: grafen stiger', 'a < 0: grafen falder', 'a = 0: vandret linje', 'Stor |a|: stejl linje'] },
        { kind: 'warning', body: 'Hældningen er Δy/Δx — ikke omvendt. Brøken har "op" i tælleren.' },
      ],
      worked: [
        {
          title: 'Find forskriften gennem (1,3) og (4,12)',
          prompt: 'y = ax + b',
          steps: [
            s('Find hældningen.', 'a = \\frac{12 - 3}{4 - 1} = \\frac{9}{3} = 3'),
            s('Indsæt et punkt for at finde b.', '3 = 3 \\cdot 1 + b'),
            s('Isolér b.', 'b = 3 - 3 = 0'),
            s('Forskriften.', 'y = 3x'),
          ],
          takeaway: 'Altid a først. Så kan b findes ved at indsætte et hvilket som helst af punkterne.',
        },
      ],
      generators: [
        {
          id: 'lin-haeldning',
          label: 'Find hældningen',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [3, 4, 5, 6, 8]), lv(level, [3, 4, 5, 6, 8]));
            const b = rng.int(-8, 8);
            const x1 = rng.int(-5, 2);
            const x2 = x1 + rng.int(1, 5);
            const y1 = a * x1 + b;
            const y2 = a * x2 + b;
            return {
              prompt: `En ret linje går gennem punkterne $(${x1}, ${y1})$ og $(${x2}, ${y2})$. Hvad er hældningen $a$?`,
              input: { kind: 'number' },
              answer: numAns(a, 0.005),
              visual: {
                kind: 'coordinate',
                xRange: [Math.min(x1, x2) - 2, Math.max(x1, x2) + 2],
                yRange: [Math.min(y1, y2) - 2, Math.max(y1, y2) + 2],
                points: [{ x: x1, y: y1, tone: 'brand' }, { x: x2, y: y2, tone: 'accent' }],
                segments: [{ x1, y1, x2, y2 }],
              },
              hints: [
                'Hældningen er ændringen i y divideret med ændringen i x.',
                `Δy = ${y2} − ${y1} = ${y2 - y1} og Δx = ${x2} − ${x1} = ${x2 - x1}.`,
                `a = ${y2 - y1} : ${x2 - x1}`,
              ],
              solution: [
                s('Find ændringerne.', `\\Delta y = ${y2 - y1},\\quad \\Delta x = ${x2 - x1}`),
                s('Divider.', `a = \\frac{${y2 - y1}}{${x2 - x1}} = ${num(a)}`),
              ],
              traps: trapIfDifferent(a, roundTo((x2 - x1) / (y2 - y1), 6), 'haeldning-omvendt', `Du vendte brøken om. Hældningen er Δy/Δx — "op divideret med hen": ${y2 - y1}/${x2 - x1} = ${num(a)}.`),
              concept: 'a = Δy / Δx',
              seconds: 70,
            };
          },
        },
        {
          id: 'lin-b',
          label: 'Aflæs skæring med y-aksen',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [2, 3, 3, 4, 5]), lv(level, [2, 3, 3, 4, 5]));
            const b = rng.nonZero(-8, 8);
            return {
              prompt: `Hvad er skæringen med y-aksen for $y = ${linearTex(a, b)}$?`,
              input: { kind: 'number' },
              answer: numAns(b),
              visual: { kind: 'coordinate', xRange: [-8, 8], yRange: [-12, 12], lines: [{ a, b, tone: 'brand' }], points: [{ x: 0, y: b, label: 'b', tone: 'accent' }] },
              hints: [
                'Skæringen med y-aksen er værdien når x = 0.',
                `Sæt x = 0 ind: y = ${a} · 0 ${signed(b)}`,
                'I forskriften y = ax + b er b netop det tal.',
              ],
              solution: [
                s('Sæt x = 0.', `y = ${a} \\cdot 0 ${signed(b)} = ${b}`),
                s('Skæringspunktet er.', `(0, ${b})`),
              ],
              traps: trapIfDifferent(b, a, 'funktion-a-og-b', `${a} er HÆLDNINGEN. Skæringen med y-aksen er det tal der står alene — altså ${b}.`),
              concept: 'b = skæring med y-aksen',
              seconds: 35,
            };
          },
        },
        {
          id: 'lin-forskrift',
          label: 'Find forskriften',
          minLevel: 3,
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [3, 3, 4, 5, 6]), lv(level, [3, 3, 4, 5, 6]));
            const b = rng.int(-8, 8);
            const x1 = rng.int(-4, 1);
            const x2 = x1 + rng.int(1, 4);
            const y1 = a * x1 + b;
            const y2 = a * x2 + b;
            return {
              prompt: `En ret linje går gennem $(${x1}, ${y1})$ og $(${x2}, ${y2})$. Angiv $a$ og $b$ i forskriften $y = ax + b$.`,
              input: { kind: 'pair', labels: ['a', 'b'] },
              answer: { type: 'pair', values: [a, b], tolerance: 0.005 },
              visual: {
                kind: 'coordinate',
                xRange: [-8, 8],
                yRange: [Math.min(y1, y2, b) - 3, Math.max(y1, y2, b) + 3],
                points: [{ x: x1, y: y1, tone: 'brand' }, { x: x2, y: y2, tone: 'accent' }],
                lines: [{ a, b, tone: 'brand' }],
              },
              hints: [
                'Find hældningen først.',
                `a = (${y2} − ${y1}) : (${x2} − ${x1}) = ${num(a)}`,
                `Indsæt et af punkterne i y = ${num(a)}x + b og isolér b.`,
              ],
              solution: [
                s('Hældningen.', `a = \\frac{${y2 - y1}}{${x2 - x1}} = ${num(a)}`),
                s('Indsæt et punkt.', `${y1} = ${num(a)} \\cdot (${x1}) + b`),
                s('Isolér b.', `b = ${y1} - ${a * x1} = ${b}`),
                s('Forskriften.', `y = ${linearTex(a, b)}`),
              ],
              seconds: 110,
            };
          },
        },
        {
          id: 'lin-tekst',
          label: 'Lineær model fra tekst',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const start = rng.int(2, lv(level, [20, 40, 80, 150, 300]));
            const rate = rng.int(2, lv(level, [8, 15, 25, 40, 60]));
            const x = rng.int(2, 12);
            return {
              prompt: `${who} har ${start} kr og sparer ${rate} kr op hver uge. Hvor mange kroner har ${who} efter ${x} uger?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(start + rate * x),
              hints: [
                'Opskriv en forskrift: y = ax + b.',
                `b er startbeløbet ${start}, og a er de ${rate} kr pr. uge.`,
                `y = ${rate} · ${x} + ${start}`,
              ],
              solution: [
                s('Opstil modellen.', `y = ${rate}x + ${start}`, `${rate} kr pr. uge er hældningen, ${start} kr er startværdien.`),
                s('Indsæt antal uger.', `y = ${rate} \\cdot ${x} + ${start}`),
                s('Regn ud.', `y = ${start + rate * x}\\text{ kr}`),
              ],
              traps: trapIfDifferent(start + rate * x, start * x + rate, 'funktion-a-og-b', `Du byttede om på a og b. Startbeløbet ${start} kr får man kun én gang; det er de ${rate} kr der gentages hver uge.`),
              seconds: 70,
            };
          },
        },
      ],
    },

    {
      id: 'funk-proportional',
      domainId: 'funktioner',
      name: 'Proportionalitet og grafer',
      goal: 'Du kan genkende en ligefrem proportional sammenhæng på graf og forskrift.',
      prerequisites: ['funk-lineaer'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Ligefrem proportional', math: 'y = ax', body: 'Et specialtilfælde af den lineære funktion, hvor b = 0. Grafen går gennem (0,0).' },
        { kind: 'idea', title: 'Kendetegnet', body: 'Fordobles x, fordobles y. Forholdet y/x er det samme for alle punkter på grafen.' },
        { kind: 'visual', visual: { kind: 'coordinate', xRange: [-1, 6], yRange: [-1, 10], lines: [{ a: 1.5, b: 0, label: 'y = 1,5x', tone: 'brand' }, { a: 1.5, b: 3, label: 'y = 1,5x + 3', tone: 'accent' }] }, caption: 'Kun den blå går gennem origo og er proportional.' },
      ],
      worked: [
        {
          title: 'Er sammenhængen proportional?',
          prompt: 'x: 2, 4, 6 \\quad y: 5, 10, 15',
          steps: [
            s('Beregn y/x for hvert par.', '\\tfrac{5}{2} = 2{,}5,\; \\tfrac{10}{4} = 2{,}5,\; \\tfrac{15}{6} = 2{,}5'),
            s('Forholdet er det samme hver gang.', undefined, 'Så er sammenhængen proportional.'),
            s('Forskriften.', 'y = 2{,}5x'),
          ],
          takeaway: 'Konstant y/x → proportional. Grafen rammer så automatisk (0,0).',
        },
      ],
      generators: [
        {
          id: 'prop-genkend',
          label: 'Er den proportional?',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [3, 4, 4, 5, 6]), lv(level, [3, 4, 4, 5, 6]));
            const isProp = rng.bool();
            const b = isProp ? 0 : rng.nonZero(-6, 6);
            return mcq(rng, {
              prompt: `Er sammenhængen $y = ${linearTex(a, b)}$ ligefrem proportional?`,
              options: [
                { text: 'Ja', correct: isProp },
                { text: 'Nej', correct: !isProp, misconceptionId: isProp ? 'funktion-a-og-b' : undefined, feedback: isProp ? 'Der er ingen konstant lagt til (b = 0), og grafen går gennem (0,0). Så er den proportional.' : undefined },
              ],
              visual: { kind: 'coordinate', xRange: [-6, 6], yRange: [-10, 10], lines: [{ a, b, tone: 'brand' }] },
              hints: [
                'En proportional sammenhæng har formen y = ax — altså uden konstantled.',
                'Går grafen gennem (0,0)?',
                isProp ? 'Der er ikke lagt noget til.' : `Der er lagt ${b} til, så grafen rammer y-aksen i ${b} — ikke i 0.`,
              ],
              solution: [
                s(isProp ? 'Forskriften har formen y = ax.' : `Forskriften har et konstantled på ${b}.`, undefined, isProp ? 'Grafen går gennem (0,0) — den er proportional.' : 'Grafen går ikke gennem (0,0) — den er lineær, men ikke proportional.'),
              ],
              seconds: 40,
            });
          },
        },
        {
          id: 'prop-konstant',
          label: 'Find proportionalitetskonstanten',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [6, 9, 12, 20, 30]));
            const x = rng.int(2, 12);
            return {
              prompt: `En sammenhæng er ligefrem proportional. Når $x = ${x}$, er $y = ${a * x}$. Hvad er proportionalitetskonstanten $a$?`,
              input: { kind: 'number' },
              answer: numAns(a, 0.005),
              hints: [
                'I y = ax er a forholdet y/x.',
                `a = ${a * x} : ${x}`,
              ],
              solution: [
                s('Brug y = ax.', `${a * x} = a \\cdot ${x}`),
                s('Isolér a.', `a = \\frac{${a * x}}{${x}} = ${a}`),
              ],
              traps: trapIfDifferent(a, a * x * x, 'haeldning-omvendt', 'Du gangede i stedet for at dividere. a er y divideret med x.'),
              seconds: 40,
            };
          },
        },
      ],
    },

    {
      id: 'funk-eksponentiel',
      domainId: 'funktioner',
      name: 'Eksponentielle funktioner',
      goal: 'Du kan regne med eksponentiel vækst og kende forskel på den og lineær vækst.',
      prerequisites: ['funk-lineaer', 'procent-vaekstfaktor'],
      tier: 5,
      explain: [
        { kind: 'rule', title: 'Forskriften', math: 'y = b \\cdot a^x', body: 'b er begyndelsesværdien (når x = 0). a er fremskrivningsfaktoren — det tal der GANGES med hver gang.' },
        { kind: 'idea', title: 'Forskellen på de to væksttyper', body: 'Lineær: du lægger det samme til hver gang. Eksponentiel: du ganger med det samme hver gang.' },
        { kind: 'visual', visual: { kind: 'coordinate', xRange: [0, 6], yRange: [0, 40], curves: [{ type: 'exp', a: 1.6, b: 3, label: 'eksponentiel', tone: 'brand' }], lines: [{ a: 5, b: 3, label: 'lineær', tone: 'accent' }] }, caption: 'Eksponentiel vækst starter langsomt og overhaler senere alt.' },
        { kind: 'rule', title: 'Vækstrate', math: 'a = 1 + r', body: 'En vækst på 8 % om året giver a = 1,08. Et fald på 8 % giver a = 0,92.' },
        { kind: 'warning', body: 'a > 1 betyder vækst. 0 < a < 1 betyder fald. a kan aldrig være negativ.' },
      ],
      worked: [
        {
          title: 'En bakteriekultur fordobles hver time',
          prompt: 'Start: 200. Hvor mange efter 5 timer?',
          steps: [
            s('Fremskrivningsfaktoren er 2.', 'a = 2'),
            s('Opstil forskriften.', 'y = 200 \\cdot 2^x'),
            s('Indsæt x = 5.', 'y = 200 \\cdot 2^5 = 200 \\cdot 32'),
            s('Resultat.', 'y = 6400'),
          ],
          takeaway: 'Læg mærke til hvor hurtigt det løber: 5 fordoblinger er en faktor 32.',
        },
      ],
      generators: [
        {
          id: 'eksp-vaerdi',
          label: 'Beregn en eksponentiel værdi',
          make: ({ rng, level }) => {
            const b = rng.int(2, lv(level, [10, 20, 50, 100, 200])) * 10;
            const a = rng.pick(lv<number[]>(level, [[2], [2, 3], [1.5, 2, 3], [1.2, 1.5, 2.5], [1.08, 1.25, 1.75]]));
            const x = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const value = roundTo(b * a ** x, 2);
            return {
              prompt: `En bestand beskrives ved $y = ${b} \\cdot ${num(a)}^x$, hvor $x$ er antal år. Hvad er $y$ efter ${x} år?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number' },
              answer: numAns(value, Math.max(0.05, value * 0.0005)),
              hints: [
                'Sæt x ind i forskriften.',
                `${num(a)}^${x} = ${num(roundTo(a ** x, 5))}`,
                `Gang med begyndelsesværdien ${b}.`,
              ],
              solution: [
                s('Indsæt x.', `y = ${b} \\cdot ${num(a)}^{${x}}`),
                s('Regn potensen.', `${num(a)}^{${x}} = ${num(roundTo(a ** x, 5))}`),
                s('Gang.', `y = ${num(value, 2)}`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(b * a * x, 2), 'eksponentiel-lineaer', `Du gangede kun én gang og ganske med x. Ved eksponentiel udvikling ganges der med ${num(a)} ${x} gange — altså ${num(a)} opløftet i ${x}.`),
                ...trapIfDifferent(value, roundTo(b + a * x, 2), 'eksponentiel-lineaer', 'Det er en lineær model. Her GANGES der med faktoren hver gang i stedet for at lægge til.'),
              ],
              concept: 'y = b · aˣ',
              seconds: 80,
            };
          },
        },
        {
          id: 'eksp-faktor',
          label: 'Find fremskrivningsfaktoren',
          minLevel: 3,
          make: ({ rng, level }) => {
            const p = rng.pick(lv<number[]>(level, [[10, 50], [10, 20, 25], [5, 8, 15, 30], [3, 12, 24, 45], [2.5, 7.5, 18, 62]]));
            const up = rng.bool();
            const a = roundTo(up ? 1 + p / 100 : 1 - p / 100, 5);
            return {
              prompt: `En bestand ${up ? 'vokser' : 'falder'} med ${num(p)} % om året. Hvad er fremskrivningsfaktoren $a$?`,
              input: { kind: 'number' },
              answer: numAns(a, 1e-5),
              hints: [
                'Fremskrivningsfaktoren er 1 plus vækstraten.',
                `${num(p)} % som decimaltal er ${num(p / 100)}.`,
                `a = 1 ${up ? '+' : '−'} ${num(p / 100)}`,
              ],
              solution: [s('Brug a = 1 + r.', `a = 1 ${up ? '+' : '-'} ${num(p / 100)} = ${num(a)}`)],
              traps: [
                ...trapIfDifferent(a, roundTo(p / 100, 5), 'eksponentiel-lineaer', 'Du glemte 1-tallet. Faktoren indeholder hele den oprindelige bestand plus ændringen.'),
                ...trapIfDifferent(a, roundTo(up ? 1 - p / 100 : 1 + p / 100, 5), 'eksponentiel-lineaer', `Ved ${up ? 'vækst' : 'fald'} skal a være ${up ? 'større' : 'mindre'} end 1.`),
              ],
              seconds: 45,
            };
          },
        },
        {
          id: 'eksp-vs-lineaer',
          label: 'Lineær eller eksponentiel?',
          minLevel: 2,
          make: ({ rng }) => {
            const cases = [
              { text: 'En telefon falder 3000 kr i værdi hvert år', a: 'lineær' },
              { text: 'En telefon mister 20 % af sin værdi hvert år', a: 'eksponentiel' },
              { text: 'Du sparer 250 kr op om måneden', a: 'lineær' },
              { text: 'Et beløb i banken vokser med 2 % om året', a: 'eksponentiel' },
              { text: 'En bakteriekultur fordobles hver time', a: 'eksponentiel' },
              { text: 'En taxa koster 45 kr i starttakst plus 12 kr pr. km', a: 'lineær' },
              { text: 'Antallet af sms’er stiger med 15 % om måneden', a: 'eksponentiel' },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: `${c.text}. Hvilken slags udvikling er det?`,
              options: [
                { text: 'Lineær', correct: c.a === 'lineær', misconceptionId: c.a === 'eksponentiel' ? 'eksponentiel-lineaer' : undefined, feedback: c.a === 'eksponentiel' ? 'Her er der tale om en fast PROCENT hver gang. Procent af et tal der selv ændrer sig → eksponentiel.' : undefined },
                { text: 'Eksponentiel', correct: c.a === 'eksponentiel', misconceptionId: c.a === 'lineær' ? 'model-vaelg-forkert' : undefined, feedback: c.a === 'lineær' ? 'Her er der tale om det samme ANTAL kroner hver gang. Fast beløb → lineær.' : undefined },
              ],
              hints: [
                'Spørg: lægges der det samme til hver gang, eller ganges der med det samme?',
                'Faste kroner eller enheder → lineær. Fast procent → eksponentiel.',
              ],
              solution: [s(c.a === 'lineær' ? 'Der ændres med et fast beløb hver gang.' : 'Der ændres med en fast procent hver gang.', undefined, `Derfor ${c.a}.`)],
              seconds: 40,
            });
          },
        },
      ],
    },
  ],
};
