import type { Domain } from '../../types';
import { coef, linearTex, signed } from '../../lib/math';
import { exprAns, lv, mcq, name, numAns, s, trapIfDifferent, trapIfDifferentText } from '../helpers';

export const algebra: Domain = {
  id: 'algebra',
  name: 'Algebra',
  category: 'tal-algebra',
  area: 'formler',
  icon: 'x',
  blurb: 'Bogstavregning: udtryk, reducering, parenteser og kvadratsætninger.',
  skills: [
    {
      id: 'algebra-udtryk',
      domainId: 'algebra',
      name: 'Variable og udtryk',
      goal: 'Du kan indsætte tal i et udtryk og beregne værdien.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'idea', title: 'Et bogstav er bare et tal vi ikke kender endnu', body: 'I 3x betyder x et tal. 3x betyder "3 gange det tal". Gangetegnet skrives ikke.' },
        { kind: 'rule', title: 'Indsæt og regn', math: 'x = 4:\\quad 3x + 5 = 3 \\cdot 4 + 5 = 17' },
        { kind: 'warning', body: 'Sæt parentes om negative tal når du indsætter. x = −2 i 3x giver 3·(−2) = −6, ikke 3−2.' },
      ],
      worked: [
        {
          title: 'Beregn 2a − 3b for a = 5 og b = −2',
          prompt: '2a - 3b,\\quad a=5,\; b=-2',
          steps: [
            s('Sæt tallene ind med parentes.', '2 \\cdot 5 - 3 \\cdot (-2)'),
            s('Regn gangestykkerne.', '= 10 - (-6)'),
            s('To minusser bliver til plus.', '= 10 + 6 = 16'),
          ],
          takeaway: 'Parenteser om de indsatte tal redder dig fra fortegnsfejl.',
        },
      ],
      generators: [
        {
          id: 'udtryk-indsaet',
          label: 'Indsæt en værdi',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const b = rng.nonZero(-lv(level, [5, 9, 12, 15, 20]), lv(level, [5, 9, 12, 15, 20]));
            const x = rng.nonZero(-lv(level, [3, 5, 7, 9, 12]), lv(level, [4, 6, 8, 10, 12]));
            const value = a * x + b;
            return {
              prompt: `Beregn $${linearTex(a, b)}$ når $x = ${x}$.`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                `Sæt ${x} ind i stedet for x — husk parentes hvis tallet er negativt.`,
                `${a} · (${x}) = ${a * x}`,
                `Læg så ${b} til: ${a * x} ${signed(b)}`,
              ],
              solution: [
                s('Indsæt værdien.', `${a} \\cdot (${x}) ${signed(b)}`),
                s('Regn gangestykket først.', `= ${a * x} ${signed(b)}`),
                s('Regn resten.', `= ${value}`),
              ],
              traps: trapIfDifferent(value, a + x + b, 'algebra-uens-led', `${coef(a)} betyder ${a} GANGE x, ikke ${a} plus x.`),
              seconds: 40,
            };
          },
        },
        {
          id: 'udtryk-to-variable',
          label: 'Udtryk med to variable',
          minLevel: 2,
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [4, 5, 7, 9, 12]), lv(level, [4, 5, 7, 9, 12]));
            const b = rng.nonZero(-lv(level, [4, 5, 7, 9, 12]), lv(level, [4, 5, 7, 9, 12]));
            const x = rng.nonZero(-6, 8);
            const y = rng.nonZero(-6, 8);
            const value = a * x + b * y;
            return {
              prompt: `Beregn $${coef(a, 'a')} ${signed(b)}b$ — altså $${coef(a, 'a')} ${b < 0 ? '-' : '+'} ${Math.abs(b)}b$ — når $a = ${x}$ og $b = ${y}$.`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                'Indsæt begge værdier med parentes omkring.',
                `${a} · (${x}) = ${a * x} og ${b} · (${y}) = ${b * y}`,
                'Læg de to resultater sammen.',
              ],
              solution: [
                s('Indsæt.', `${a}\\cdot(${x}) ${signed(b)}\\cdot(${y})`),
                s('Regn gangestykkerne.', `= ${a * x} ${signed(b * y)}`),
                s('Læg sammen.', `= ${value}`),
              ],
              seconds: 50,
            };
          },
        },
        {
          id: 'udtryk-opstil',
          label: 'Opstil et udtryk fra tekst',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const per = rng.int(2, lv(level, [5, 9, 15, 25, 40]));
            const fixed = rng.int(2, lv(level, [15, 30, 60, 120, 250]));
            return mcq(rng, {
              prompt: `${who} betaler ${fixed} kr i fast gebyr plus ${per} kr pr. time. Hvilket udtryk viser prisen for $t$ timer?`,
              options: [
                { text: `${per}t + ${fixed}`, correct: true },
                { text: `${fixed}t + ${per}`, misconceptionId: 'funktion-a-og-b', feedback: `Gebyret på ${fixed} kr betales kun én gang, så det skal stå alene. Det er de ${per} kr der ganges med antal timer.` },
                { text: `${per} + ${fixed} + t`, misconceptionId: 'algebra-uens-led', feedback: `Timeprisen skal ganges med antal timer, ikke lægges til. Det giver ${per}t.` },
                { text: `${per + fixed}t` },
              ],
              hints: [
                'Hvad koster det uanset hvor mange timer der går?',
                'Hvad afhænger af antallet af timer?',
                `De ${per} kr gentages for hver time, så de skal ganges med t.`,
              ],
              solution: [
                s('Det faste beløb betales én gang.', `${fixed}`),
                s('Timeprisen ganges med antal timer.', `${per} \\cdot t`),
                s('Læg sammen.', `${per}t + ${fixed}`),
              ],
              seconds: 50,
            });
          },
        },
      ],
    },

    {
      id: 'algebra-reducer',
      domainId: 'algebra',
      name: 'Reducering',
      goal: 'Du kan samle ens led og gøre et udtryk så kort som muligt.',
      prerequisites: ['algebra-udtryk'],
      tier: 2,
      explain: [
        { kind: 'analogy', body: '2 æbler + 3 æbler er 5 æbler. 2 æbler + 3 pærer kan ikke lægges sammen. Sådan er det også med x, y og tal.' },
        { kind: 'rule', title: 'Ens led', math: '5x + 3x = 8x \\qquad 5x + 3 \\ne 8x', body: 'Led er ens når variabeldelen er præcis den samme — også eksponenten.' },
        { kind: 'list', title: 'Fremgangsmåde', items: ['Marker leddene med hver deres variabel', 'Husk at fortegnet hører til leddet foran det', 'Læg koefficienterne sammen for hver gruppe'] },
        { kind: 'warning', body: 'x² og x er IKKE ens led. 2x² + 3x kan ikke gøres kortere.' },
      ],
      worked: [
        {
          title: 'Reducer 5x − 3 + 2x + 8',
          prompt: '5x - 3 + 2x + 8',
          steps: [
            s('Marker leddene med fortegn.', '+5x \;\; -3 \;\; +2x \;\; +8'),
            s('Saml x-leddene.', '5x + 2x = 7x'),
            s('Saml tallene.', '-3 + 8 = 5'),
            s('Skriv sammen.', '= 7x + 5'),
          ],
          takeaway: 'Fortegnet står altid FORAN leddet. Det følger med når du flytter rundt.',
        },
      ],
      generators: [
        {
          id: 'reducer-simpel',
          label: 'Saml ens led',
          make: ({ rng, level }) => {
            const a1 = rng.nonZero(-lv(level, [6, 8, 10, 12, 15]), lv(level, [6, 8, 10, 12, 15]));
            const a2 = rng.nonZero(-lv(level, [6, 8, 10, 12, 15]), lv(level, [6, 8, 10, 12, 15]));
            const b1 = rng.nonZero(-lv(level, [8, 10, 15, 20, 25]), lv(level, [8, 10, 15, 20, 25]));
            const b2 = rng.nonZero(-lv(level, [8, 10, 15, 20, 25]), lv(level, [8, 10, 15, 20, 25]));
            const a = a1 + a2;
            const b = b1 + b2;
            if (a === 0) {
              return {
                prompt: `Reducer udtrykket $${coef(a1)} ${signed(b1)} ${signed(a2 + 1)}x ${signed(b2)}$`,
                input: { kind: 'expression' as const, placeholder: 'fx 3x + 5' },
                answer: exprAns(linearTex(a1 + a2 + 1, b)),
                hints: ['Saml x-leddene for sig og tallene for sig.', `x-led: ${a1} ${signed(a2 + 1)}`, `tal: ${b1} ${signed(b2)}`],
                solution: [s('Saml leddene.', `${linearTex(a1 + a2 + 1, b)}`)],
                seconds: 45,
              };
            }
            return {
              prompt: `Reducer udtrykket $${coef(a1)} ${signed(b1)} ${a2 < 0 ? '-' : '+'} ${coef(Math.abs(a2))} ${signed(b2)}$`,
              instruction: 'Skriv svaret så kort som muligt, fx 3x + 5.',
              input: { kind: 'expression', placeholder: 'fx 3x + 5' },
              answer: exprAns(linearTex(a, b)),
              hints: [
                'Del leddene i to hold: dem med x, og dem uden.',
                `x-leddene: ${coef(a1)} ${a2 < 0 ? '-' : '+'} ${coef(Math.abs(a2))} = ${coef(a)}`,
                `Tallene: ${b1} ${signed(b2)} = ${b}`,
              ],
              solution: [
                s('Saml x-leddene.', `${a1} ${signed(a2)} = ${a}`),
                s('Saml tallene.', `${b1} ${signed(b2)} = ${b}`),
                s('Skriv resultatet.', `= ${linearTex(a, b)}`),
              ],
              traps: [
                ...trapIfDifferentText(linearTex(a, b), `${a + b}x`, 'algebra-uens-led', `Du lagde x-led og tal sammen. ${coef(a)} og ${b} er forskellige slags led og kan ikke slås sammen.`),
                ...trapIfDifferentText(linearTex(a, b), `${a + b}`, 'algebra-uens-led', `Du lagde alt sammen til ét tal. x-leddene og tallene skal holdes adskilt: ${linearTex(a, b)}.`),
              ],
              concept: 'Kun led med præcis samme variabeldel kan lægges sammen.',
              seconds: 50,
            };
          },
        },
        {
          id: 'reducer-to-variable',
          label: 'To variable',
          minLevel: 2,
          make: ({ rng, level }) => {
            const hi = lv(level, [5, 7, 9, 12, 15]);
            const a1 = rng.nonZero(-hi, hi);
            const a2 = rng.nonZero(-hi, hi);
            const b1 = rng.nonZero(-hi, hi);
            const b2 = rng.nonZero(-hi, hi);
            const a = a1 + a2;
            const b = b1 + b2;
            if (a === 0 || b === 0) {
              const aa = a === 0 ? a1 + a2 + 1 : a;
              const bb = b === 0 ? b1 + b2 + 1 : b;
              return {
                prompt: `Reducer $${coef(aa)} ${signed(bb)}y$`,
                input: { kind: 'expression' as const, placeholder: 'fx 3x + 2y' },
                answer: exprAns(`${coef(aa)} ${signed(bb)}y`.replace(/\+ -/g, '- ')),
                hints: ['Udtrykket er allerede reduceret.', 'x-led og y-led kan ikke slås sammen.'],
                solution: [s('x og y er forskellige slags led.', `${coef(aa)} ${signed(bb)}y`)],
                seconds: 40,
              };
            }
            const answer = `${coef(a)} ${b < 0 ? '-' : '+'} ${coef(Math.abs(b), 'y')}`;
            return {
              prompt: `Reducer $${coef(a1)} ${signed(b1)}y ${a2 < 0 ? '-' : '+'} ${coef(Math.abs(a2))} ${signed(b2)}y$`,
              instruction: 'Skriv svaret som fx 3x + 2y.',
              input: { kind: 'expression', placeholder: 'fx 3x + 2y' },
              answer: exprAns(answer),
              hints: [
                'x-led hører sammen med x-led, y-led med y-led.',
                `x: ${a1} ${signed(a2)} = ${a}`,
                `y: ${b1} ${signed(b2)} = ${b}`,
              ],
              solution: [
                s('Saml x-leddene.', `${a1}x ${signed(a2)}x = ${coef(a)}`),
                s('Saml y-leddene.', `${b1}y ${signed(b2)}y = ${coef(b, 'y')}`),
                s('Skriv sammen.', `= ${answer}`),
              ],
              traps: trapIfDifferentText(answer, `${a + b}x`, 'algebra-uens-led', 'x og y er forskellige variable og kan ikke slås sammen til ét led.'),
              seconds: 55,
            };
          },
        },
      ],
    },

    {
      id: 'algebra-parentes',
      domainId: 'algebra',
      name: 'Parenteser',
      goal: 'Du kan gange ind i en parentes og hæve parenteser med minus foran.',
      prerequisites: ['algebra-reducer'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Den distributive lov', math: 'a(b + c) = ab + ac', body: 'Faktoren uden for parentesen ganges på HVERT led indeni.' },
        { kind: 'visual', visual: { kind: 'rect', w: 7, h: 3, labelW: 'b + c', labelH: 'a', grid: true }, caption: 'Arealet af hele rektanglet er a(b+c) — og det er summen af de to delarealer ab og ac.' },
        { kind: 'rule', title: 'Minus foran parentes', math: '-(x - 3) = -x + 3', body: 'Minus vender fortegnet på alle led i parentesen.' },
        { kind: 'warning', body: '3(x + 4) er ikke 3x + 4. Alle led skal ganges: 3x + 12.' },
      ],
      worked: [
        {
          title: 'Reducer 2(3x − 4) − (x + 5)',
          prompt: '2(3x - 4) - (x + 5)',
          steps: [
            s('Gang 2 ind i den første parentes.', '2 \\cdot 3x - 2 \\cdot 4 = 6x - 8'),
            s('Minus foran den anden parentes vender begge fortegn.', '-(x + 5) = -x - 5'),
            s('Skriv alt ud.', '6x - 8 - x - 5'),
            s('Saml ens led.', '= 5x - 13'),
          ],
          takeaway: 'Et minus foran en parentes er det samme som at gange med −1.',
        },
      ],
      generators: [
        {
          id: 'parentes-gang',
          label: 'Gang ind i parentesen',
          make: ({ rng, level }) => {
            // |k| = 1 ville gøre opgaven triviel og få fælderne til at falde
            // sammen med det rigtige svar.
            const k = rng.int(2, lv(level, [4, 6, 8, 10, 12])) * rng.sign();
            const a = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const b = rng.nonZero(-lv(level, [6, 9, 12, 15, 20]), lv(level, [6, 9, 12, 15, 20]));
            return {
              prompt: `Gang ind i parentesen og reducer: $${k}(${linearTex(a, b)})$`,
              instruction: 'Skriv svaret som fx 6x − 8.',
              input: { kind: 'expression', placeholder: 'fx 6x - 8' },
              answer: exprAns(linearTex(k * a, k * b)),
              hints: [
                `${k} skal ganges på begge led inde i parentesen.`,
                `${k} · ${coef(a)} = ${coef(k * a)}`,
                `${k} · (${b}) = ${k * b}`,
              ],
              solution: [
                s('Gang på første led.', `${k} \\cdot ${coef(a)} = ${coef(k * a)}`),
                s('Gang på andet led.', `${k} \\cdot (${b}) = ${k * b}`),
                s('Skriv sammen.', `= ${linearTex(k * a, k * b)}`),
              ],
              traps: [
                ...trapIfDifferentText(linearTex(k * a, k * b), linearTex(k * a, b), 'algebra-parentes-delvis', `Du gangede kun ind på x-leddet. ${k} skal også ganges på ${b}: ${k} · (${b}) = ${k * b}.`),
                ...trapIfDifferentText(linearTex(k * a, k * b), linearTex(a, k * b), 'algebra-parentes-delvis', `Du gangede kun ind på tallet. ${k} skal også ganges på ${coef(a)}.`),
              ],
              concept: 'a(b + c) = ab + ac',
              seconds: 50,
            };
          },
        },
        {
          id: 'parentes-minus',
          label: 'Minus foran parentes',
          minLevel: 2,
          make: ({ rng, level }) => {
            const a1 = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const b1 = rng.nonZero(-lv(level, [6, 9, 12, 15, 20]), lv(level, [6, 9, 12, 15, 20]));
            const a2 = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const b2 = rng.nonZero(-lv(level, [6, 9, 12, 15, 20]), lv(level, [6, 9, 12, 15, 20]));
            const a = a1 - a2;
            const b = b1 - b2;
            if (a === 0 && b === 0) {
              return {
                prompt: `Reducer $(${linearTex(a1, b1)}) - (${linearTex(a2, b2)})$`,
                input: { kind: 'expression' as const, placeholder: 'fx 0' },
                answer: exprAns('0'),
                hints: ['Vend fortegnene i den sidste parentes.', 'De to parenteser er ens — de går ud med hinanden.'],
                solution: [s('Parenteserne er identiske.', '= 0')],
                seconds: 45,
              };
            }
            return {
              prompt: `Reducer $(${linearTex(a1, b1)}) - (${linearTex(a2, b2)})$`,
              instruction: 'Skriv svaret som fx 5x − 13.',
              input: { kind: 'expression', placeholder: 'fx 5x - 13' },
              answer: exprAns(linearTex(a, b)),
              hints: [
                'Den første parentes kan bare fjernes.',
                'Minus foran den anden parentes vender fortegnet på BEGGE led indeni.',
                `-(${linearTex(a2, b2)}) = ${linearTex(-a2, -b2)}`,
              ],
              solution: [
                s('Hæv den første parentes uændret.', `${linearTex(a1, b1)}`),
                s('Vend fortegnene i den anden.', `${linearTex(-a2, -b2)}`),
                s('Saml ens led.', `= ${linearTex(a, b)}`),
              ],
              traps: [
                ...trapIfDifferentText(linearTex(a, b), linearTex(a1 - a2, b1 + b2), 'algebra-minus-parentes', `Du vendte kun fortegnet på det første led. Minus foran parentesen rammer ALLE led: −(${linearTex(a2, b2)}) = ${linearTex(-a2, -b2)}.`),
                ...trapIfDifferentText(linearTex(a, b), linearTex(a1 + a2, b1 + b2), 'algebra-minus-parentes', 'Du lagde parenteserne sammen. Der står minus mellem dem, så fortegnene i den anden skal vendes.'),
              ],
              seconds: 65,
            };
          },
        },
        {
          id: 'parentes-to',
          label: 'To parenteser ganget sammen',
          minLevel: 4,
          make: ({ rng, level }) => {
            const hi = lv(level, [3, 4, 5, 6, 8]);
            const a = rng.nonZero(-hi, hi);
            const b = rng.nonZero(-hi * 2, hi * 2);
            const c = rng.nonZero(-hi, hi);
            const d = rng.nonZero(-hi * 2, hi * 2);
            const x2 = a * c;
            const x1 = a * d + b * c;
            const k = b * d;
            const answer = `${x2}x^2${x1 >= 0 ? '+' : '-'}${Math.abs(x1)}x${k >= 0 ? '+' : '-'}${Math.abs(k)}`;
            return {
              prompt: `Gang parenteserne ud og reducer: $(${linearTex(a, b)})(${linearTex(c, d)})$`,
              instruction: 'Skriv svaret som fx 2x^2 + 5x - 3.',
              input: { kind: 'expression', placeholder: 'fx 2x^2 + 5x - 3' },
              answer: exprAns(answer),
              hints: [
                'Hvert led i den første parentes skal ganges med hvert led i den anden — fire gangestykker i alt.',
                `${coef(a)} · ${coef(c)} = ${coef(x2)}x og ${coef(a)} · (${d}) = ${coef(a * d)}`,
                `Saml de to x-led: ${a * d} ${signed(b * c)} = ${x1}`,
              ],
              solution: [
                s('Gang hvert led med hvert led.', `${coef(a)}\\cdot${coef(c)} + ${coef(a)}\\cdot(${d}) + (${b})\\cdot${coef(c)} + (${b})\\cdot(${d})`),
                s('Regn de fire produkter.', `${x2}x^2 ${signed(a * d)}x ${signed(b * c)}x ${signed(k)}`),
                s('Saml x-leddene.', `= ${x2}x^2 ${signed(x1)}x ${signed(k)}`),
              ],
              concept: 'Hvert led gange hvert led — fire produkter.',
              seconds: 90,
            };
          },
        },
      ],
    },

    {
      id: 'algebra-kvadratsaetninger',
      domainId: 'algebra',
      name: 'Kvadratsætningerne',
      goal: 'Du kan bruge de tre kvadratsætninger begge veje.',
      prerequisites: ['algebra-parentes'],
      tier: 4,
      explain: [
        { kind: 'rule', title: 'Første kvadratsætning', math: '(a + b)^2 = a^2 + 2ab + b^2' },
        { kind: 'rule', title: 'Anden kvadratsætning', math: '(a - b)^2 = a^2 - 2ab + b^2' },
        { kind: 'rule', title: 'Tredje kvadratsætning', math: '(a + b)(a - b) = a^2 - b^2' },
        { kind: 'visual', visual: { kind: 'rect', w: 8, h: 8, labelW: 'a + b', labelH: 'a + b', grid: true }, caption: 'Kvadratet med side a+b består af a², b² og to rektangler med areal ab. Derfor 2ab.' },
        { kind: 'warning', body: '(a + b)² er IKKE a² + b². Prøv med tal: (2+3)² = 25, men 2² + 3² = 13. Der mangler 2·2·3 = 12.' },
      ],
      worked: [
        {
          title: 'Udregn (x + 5)²',
          prompt: '(x + 5)^2',
          steps: [
            s('Identificér a og b.', 'a = x,\; b = 5'),
            s('Brug første kvadratsætning.', 'a^2 + 2ab + b^2'),
            s('Indsæt.', 'x^2 + 2 \\cdot x \\cdot 5 + 5^2'),
            s('Reducer.', '= x^2 + 10x + 25'),
          ],
          takeaway: 'Midterleddet 2ab er det man glemmer. Tjek altid at det er der.',
        },
      ],
      generators: [
        {
          id: 'kvadrat-udvid',
          label: 'Brug kvadratsætningen',
          make: ({ rng, level }) => {
            const b = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            const plus = rng.bool();
            const mid = 2 * b * (plus ? 1 : -1);
            const answer = `x^2${mid >= 0 ? '+' : '-'}${Math.abs(mid)}x+${b * b}`;
            return {
              prompt: `Udregn $(x ${plus ? '+' : '-'} ${b})^2$`,
              instruction: 'Skriv svaret som fx x^2 + 10x + 25.',
              input: { kind: 'expression', placeholder: 'fx x^2 + 10x + 25' },
              answer: exprAns(answer),
              hints: [
                `Brug ${plus ? 'første' : 'anden'} kvadratsætning: (a ${plus ? '+' : '-'} b)² = a² ${plus ? '+' : '-'} 2ab + b².`,
                `Her er a = x og b = ${b}.`,
                `Midterleddet er 2 · x · ${b} = ${2 * b}x — med ${plus ? 'plus' : 'minus'} foran.`,
              ],
              solution: [
                s('Identificér a og b.', `a = x,\; b = ${b}`),
                s('Indsæt i kvadratsætningen.', `x^2 ${plus ? '+' : '-'} 2 \\cdot x \\cdot ${b} + ${b}^2`),
                s('Reducer.', `= x^2 ${signed(mid)}x + ${b * b}`),
              ],
              traps: [
                ...trapIfDifferentText(answer, `x^2+${b * b}`, 'algebra-kvadrat-sum', `Du glemte midterleddet. (x ${plus ? '+' : '-'} ${b})² har et led 2 · x · ${b} = ${2 * b}x i midten.`),
                ...trapIfDifferentText(answer, `x^2+${b}`, 'algebra-kvadrat-sum', `Både midterleddet og kvadratet på ${b} mangler. Facit er x² ${signed(mid)}x + ${b * b}.`),
              ],
              concept: '(a ± b)² = a² ± 2ab + b²',
              seconds: 60,
            };
          },
        },
        {
          id: 'kvadrat-tredje',
          label: 'Tredje kvadratsætning',
          minLevel: 3,
          make: ({ rng, level }) => {
            const b = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            return {
              prompt: `Udregn $(x + ${b})(x - ${b})$`,
              instruction: 'Skriv svaret som fx x^2 - 25.',
              input: { kind: 'expression', placeholder: 'fx x^2 - 25' },
              answer: exprAns(`x^2-${b * b}`),
              hints: [
                'Her er det tredje kvadratsætning: (a + b)(a − b) = a² − b².',
                `a = x og b = ${b}.`,
                `x-leddene går ud med hinanden: +${b}x − ${b}x = 0.`,
              ],
              solution: [
                s('Gang ud.', `x^2 - ${b}x + ${b}x - ${b * b}`),
                s('De to x-led går ud.', `= x^2 - ${b * b}`),
              ],
              traps: trapIfDifferentText(`x^2-${b * b}`, `x^2+${b * b}`, 'algebra-kvadrat-sum', `Fortegnet er forkert. (x + b)(x − b) = x² − b², altså x² − ${b * b}.`),
              concept: '(a + b)(a − b) = a² − b²',
              seconds: 50,
            };
          },
        },
        {
          id: 'kvadrat-tal',
          label: 'Hovedregning med kvadratsætning',
          minLevel: 4,
          make: ({ rng }) => {
            const base = rng.pick([20, 30, 40, 50, 60, 70, 80, 90, 100]);
            const d = rng.pick([1, 2, 3]);
            const plus = rng.bool();
            const n = base + (plus ? d : -d);
            return {
              prompt: `Brug kvadratsætningerne til at beregne $${n}^2$ i hovedet.`,
              input: { kind: 'number' },
              answer: numAns(n * n),
              hints: [
                `Skriv ${n} som ${base} ${plus ? '+' : '−'} ${d}.`,
                `(${base} ${plus ? '+' : '-'} ${d})² = ${base}² ${plus ? '+' : '-'} 2·${base}·${d} + ${d}²`,
                `${base * base} ${plus ? '+' : '-'} ${2 * base * d} + ${d * d}`,
              ],
              solution: [
                s('Del tallet op.', `${n} = ${base} ${plus ? '+' : '-'} ${d}`),
                s('Brug kvadratsætningen.', `${base}^2 ${plus ? '+' : '-'} 2\\cdot${base}\\cdot${d} + ${d}^2`),
                s('Regn ud.', `${base * base} ${plus ? '+' : '-'} ${2 * base * d} + ${d * d} = ${n * n}`),
              ],
              traps: trapIfDifferent(n * n, base * base + d * d, 'algebra-kvadrat-sum', `Du glemte midterleddet 2 · ${base} · ${d} = ${2 * base * d}.`),
              seconds: 70,
            };
          },
        },
      ],
    },

    {
      id: 'algebra-faktorisering',
      domainId: 'algebra',
      name: 'Faktorisering',
      goal: 'Du kan sætte uden for parentes og genkende kvadratsætningerne baglæns.',
      prerequisites: ['algebra-parentes'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Den modsatte vej', body: 'At faktorisere er at gå fra en sum til et produkt: 6x + 9 = 3(2x + 3).' },
        { kind: 'rule', title: 'Sæt uden for parentes', math: 'ab + ac = a(b + c)', body: 'Find den største fælles faktor i alle led og træk den udenfor.' },
        { kind: 'rule', title: 'Kvadratsætning baglæns', math: 'x^2 - 9 = (x + 3)(x - 3)', body: 'Ser du en forskel mellem to kvadrater, kan den altid deles op.' },
        { kind: 'idea', title: 'Tjek altid', body: 'Gang parenteserne ud igen. Får du det oprindelige udtryk, er du sikker.' },
      ],
      worked: [
        {
          title: 'Faktoriser 12x + 18',
          prompt: '12x + 18',
          steps: [
            s('Find fælles faktor.', '\\text{SFD}(12, 18) = 6'),
            s('Divider hvert led med 6.', '12x : 6 = 2x \\quad 18 : 6 = 3'),
            s('Skriv som produkt.', '= 6(2x + 3)'),
            s('Kontrol.', '6 \\cdot 2x + 6 \\cdot 3 = 12x + 18 \;\\checkmark'),
          ],
          takeaway: 'Tag den STØRSTE fælles faktor — ellers kan der faktoriseres videre.',
        },
      ],
      generators: [
        {
          id: 'faktor-udenfor',
          label: 'Sæt uden for parentes',
          make: ({ rng, level }) => {
            const k = rng.int(2, lv(level, [4, 6, 8, 10, 12]));
            const a = rng.int(2, lv(level, [5, 7, 9, 11, 13]));
            const b = rng.nonZero(-lv(level, [6, 8, 10, 12, 15]), lv(level, [6, 8, 10, 12, 15]));
            return mcq(rng, {
              prompt: `Faktoriser $${k * a}x ${signed(k * b)}$`,
              options: [
                { text: `${k}(${linearTex(a, b)})`, correct: true },
                { text: `${k}(${linearTex(a * k, b)})`, misconceptionId: 'ligning-divider-delvis', feedback: `Begge led skal divideres med ${k}. ${k * a}x : ${k} = ${a}x, ikke ${a * k}x.` },
                { text: `${k}x(${linearTex(a, b)})`, misconceptionId: 'algebra-parentes-delvis', feedback: `Der er ikke et x i begge led, så x kan ikke sættes uden for parentesen — kun tallet ${k}.` },
                { text: `${k * a}(${linearTex(1, b)})` },
              ],
              hints: [
                `Hvad går op i både ${k * a} og ${Math.abs(k * b)}?`,
                `Den fælles faktor er ${k}.`,
                `Divider hvert led med ${k}: ${k * a}x : ${k} = ${a}x og ${k * b} : ${k} = ${b}.`,
              ],
              solution: [
                s('Find fælles faktor.', `${k}`),
                s('Divider hvert led.', `${k * a}x : ${k} = ${coef(a)},\\quad ${k * b} : ${k} = ${b}`),
                s('Skriv som produkt.', `${k}(${linearTex(a, b)})`),
              ],
              seconds: 60,
            });
          },
        },
        {
          id: 'faktor-kvadrat',
          label: 'Forskel mellem to kvadrater',
          minLevel: 3,
          make: ({ rng, level }) => {
            const b = rng.int(2, lv(level, [5, 6, 8, 10, 12]));
            return mcq(rng, {
              prompt: `Faktoriser $x^2 - ${b * b}$`,
              options: [
                { text: `(x + ${b})(x - ${b})`, correct: true },
                { text: `(x - ${b})(x - ${b})`, misconceptionId: 'algebra-kvadrat-sum', feedback: `Det giver x² − ${2 * b}x + ${b * b}. Der er ikke noget x-led i opgaven, så fortegnene skal være forskellige.` },
                { text: `(x + ${b})(x + ${b})`, misconceptionId: 'algebra-kvadrat-sum', feedback: `Det giver x² + ${2 * b}x + ${b * b}. Vi skal have MINUS ${b * b} og intet x-led.` },
                { text: `x(x - ${b * b})` },
              ],
              hints: [
                'Der er ingen x-led — det peger på tredje kvadratsætning.',
                'a² − b² = (a + b)(a − b).',
                `Her er a = x og b = ${b}, fordi ${b}² = ${b * b}.`,
              ],
              solution: [
                s('Genkend forskellen mellem to kvadrater.', `x^2 - ${b * b} = x^2 - ${b}^2`),
                s('Brug tredje kvadratsætning.', `= (x + ${b})(x - ${b})`),
              ],
              seconds: 55,
            });
          },
        },
      ],
    },
  ],
};
