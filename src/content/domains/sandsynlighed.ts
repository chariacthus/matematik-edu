import type { Domain } from '../../types';
import { fracTexBig, gcd, num, reduce, roundTo } from '../../lib/math';
import { fracAns, lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const sandsynlighed: Domain = {
  id: 'sandsynlighed',
  name: 'Sandsynlighed',
  category: 'statistik-sandsynlighed',
  area: 'sandsynlighed',
  blurb: 'Fra ét terningkast til kombinerede forsøg med og uden tilbagelægning.',
  skills: [
    {
      id: 'sand-grund',
      domainId: 'sandsynlighed',
      name: 'Sandsynlighed ved ét forsøg',
      goal: 'Du kan beregne sandsynligheden for en hændelse i et enkelt forsøg.',
      prerequisites: ['broek-forstaa'],
      tier: 1,
      explain: [
        { kind: 'rule', title: 'Grundformlen', math: 'P = \\frac{\\text{gunstige udfald}}{\\text{mulige udfald}}', body: 'Gælder når alle udfald er lige sandsynlige.' },
        { kind: 'idea', title: 'Altid mellem 0 og 1', body: 'P = 0 betyder umuligt. P = 1 betyder helt sikkert. Får du noget udenfor, er der en regnefejl.' },
        { kind: 'math', math: 'P(\\text{sekser}) = \\frac{1}{6} \\approx 0{,}167 = 16{,}7\\,\\%' },
        { kind: 'rule', title: 'Komplementærhændelsen', math: 'P(\\text{ikke } A) = 1 - P(A)', body: 'Nogle gange er det meget lettere at regne på det modsatte.' },
      ],
      worked: [
        {
          title: 'En pose med 5 røde og 3 blå kugler',
          prompt: 'P(\\text{rød}) = ?',
          steps: [
            s('Tæl gunstige udfald.', '5 \\text{ røde}'),
            s('Tæl mulige udfald.', '5 + 3 = 8 \\text{ kugler i alt}'),
            s('Sæt op som brøk.', 'P = \\frac{5}{8} = 0{,}625 = 62{,}5\\,\\%'),
          ],
          takeaway: 'Nævneren er ALTID det samlede antal muligheder.',
        },
      ],
      generators: [
        {
          id: 'sand-pose',
          label: 'Kugler i en pose',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            const b = rng.int(2, lv(level, [5, 7, 9, 12, 15]));
            const total = a + b;
            const colors = rng.sample(['røde', 'blå', 'grønne', 'gule', 'hvide'], 2) as [string, string];
            return {
              prompt: `En pose indeholder ${a} ${colors[0]} og ${b} ${colors[1]} kugler. Hvad er sandsynligheden for at trække en ${colors[0].slice(0, -1)}?`,
              instruction: 'Svar som en forkortet brøk, fx 3/8.',
              input: { kind: 'fraction' },
              answer: fracAns(reduce({ n: a, d: total }), true),
              hints: [
                'Tæl først hvor mange kugler der er i alt.',
                `${a} + ${b} = ${total} kugler.`,
                `Gunstige udfald er de ${a} ${colors[0]}.`,
              ],
              solution: [
                s('Antal gunstige udfald.', `${a}`),
                s('Antal mulige udfald.', `${a} + ${b} = ${total}`),
                s('Sandsynligheden.', `P = ${fracTexBig({ n: a, d: total })}${gcd(a, total) > 1 ? ` = ${fracTexBig(reduce({ n: a, d: total }))}` : ''}`),
              ],
              traps: [
                { misconceptionId: 'sandsyn-over-1', value: `${a}/${b}`, feedback: `Nævneren skal være det SAMLEDE antal kugler (${total}), ikke antallet af den anden farve.` },
              ],
              concept: 'P = gunstige / mulige',
              seconds: 45,
            };
          },
        },
        {
          id: 'sand-terning',
          label: 'Terningkast',
          make: ({ rng, level }) => {
            const cases = lv<{ text: string; count: number }[]>(level, [
              [{ text: 'en 6’er', count: 1 }, { text: 'et lige tal', count: 3 }],
              [{ text: 'et lige tal', count: 3 }, { text: 'et tal større end 4', count: 2 }],
              [{ text: 'et tal større end 2', count: 4 }, { text: 'et ulige tal', count: 3 }, { text: 'en 1’er eller en 2’er', count: 2 }],
              [{ text: 'et primtal', count: 3 }, { text: 'et tal mindre end 5', count: 4 }],
              [{ text: 'et primtal', count: 3 }, { text: 'et tal der ikke er 6', count: 5 }, { text: 'et kvadrattal', count: 2 }],
            ]);
            const c = rng.pick(cases);
            const value = roundTo(c.count / 6, 6);
            return {
              prompt: `Du kaster en almindelig terning. Hvad er sandsynligheden for at slå ${c.text}?`,
              instruction: 'Svar som en forkortet brøk, fx 1/3.',
              input: { kind: 'fraction' },
              answer: fracAns(reduce({ n: c.count, d: 6 }), true),
              hints: [
                'En terning har 6 mulige udfald.',
                `Tæl hvor mange af 1, 2, 3, 4, 5, 6 der passer på "${c.text}".`,
                `Der er ${c.count} gunstige udfald.`,
              ],
              solution: [
                s('Mulige udfald.', '1, 2, 3, 4, 5, 6 \\Rightarrow 6'),
                s('Gunstige udfald.', `${c.count}`),
                s('Sandsynligheden.', `P = ${fracTexBig({ n: c.count, d: 6 })}${gcd(c.count, 6) > 1 ? ` = ${fracTexBig(reduce({ n: c.count, d: 6 }))}` : ''} \\approx ${num(value, 3)}`),
              ],
              seconds: 45,
            };
          },
        },
        {
          id: 'sand-komplement',
          label: 'Komplementærhændelsen',
          minLevel: 2,
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [6, 8, 10, 14, 18]));
            const total = a + rng.int(2, lv(level, [6, 8, 10, 14, 18]));
            const pct = roundTo(((total - a) / total) * 100, 2);
            return {
              prompt: `I en klasse på ${total} elever har ${a} elever cykel. Hvad er sandsynligheden for at en tilfældig elev IKKE har cykel?`,
              instruction: 'Svar i procent, rundet til højst to decimaler.',
              input: { kind: 'number', unit: '%' },
              answer: numAns(pct, 0.05),
              hints: [
                'Du kan finde det direkte, eller gå via komplementærhændelsen.',
                `Antal uden cykel: ${total} − ${a} = ${total - a}.`,
                `${total - a} : ${total} · 100 %`,
              ],
              solution: [
                s('Antal uden cykel.', `${total} - ${a} = ${total - a}`),
                s('Sandsynligheden.', `P = \\frac{${total - a}}{${total}} = ${num(roundTo((total - a) / total, 4))}`),
                s('Som procent.', `= ${num(pct)}\\,\\%`),
                s('Kontrol med komplementærreglen.', `1 - \\frac{${a}}{${total}} = ${num(roundTo(1 - a / total, 4))} \;\\checkmark`),
              ],
              traps: trapIfDifferent(pct, roundTo((a / total) * 100, 2), 'sandsyn-over-1', `Det er sandsynligheden for at eleven HAR cykel. Der spørges om det modsatte: 100 % − ${num(roundTo((a / total) * 100, 2))} % = ${num(pct)} %.`),
              concept: 'P(ikke A) = 1 − P(A)',
              seconds: 60,
            };
          },
        },
      ],
    },

    {
      id: 'sand-kombineret',
      domainId: 'sandsynlighed',
      name: 'Kombinerede forsøg',
      goal: 'Du kan beregne sandsynligheder for to forsøg efter hinanden.',
      prerequisites: ['sand-grund', 'broek-gange-dividere'],
      tier: 4,
      explain: [
        { kind: 'rule', title: 'Multiplikationsreglen', math: 'P(A \\text{ og } B) = P(A) \\cdot P(B)', body: 'Gælder når de to forsøg er uafhængige — når det første ikke påvirker det andet.' },
        { kind: 'idea', title: '"Og" betyder gange', body: 'Skal begge dele ske, ganger du. Skal det ene ELLER det andet ske (og de udelukker hinanden), lægger du sammen.' },
        { kind: 'visual', visual: { kind: 'probTree', levels: [{ label: '1. kast', branches: [{ label: 'Plat', p: '1/2' }, { label: 'Krone', p: '1/2' }] }, { label: '2. kast', branches: [{ label: 'Plat', p: '1/2' }, { label: 'Krone', p: '1/2' }] }] }, caption: 'Gang sandsynlighederne langs grenene. Plat-Plat giver ½ · ½ = ¼.' },
        { kind: 'warning', body: 'Sandsynligheder lægges ikke sammen når begge ting skal ske. ½ + ½ = 1 ville betyde at to plat i træk var helt sikkert.' },
      ],
      worked: [
        {
          title: 'To 6’ere i træk',
          prompt: 'P = ?',
          steps: [
            s('Sandsynligheden for en 6’er i ét kast.', '\\tfrac{1}{6}'),
            s('Kastene er uafhængige, så gang.', '\\tfrac{1}{6} \\cdot \\tfrac{1}{6}'),
            s('Resultat.', '= \\tfrac{1}{36} \\approx 2{,}8\\,\\%'),
          ],
          takeaway: 'Sandsynligheden bliver altid MINDRE når flere ting skal gå op i en højere enhed.',
        },
      ],
      generators: [
        {
          id: 'sand-to-forsoeg',
          label: 'To uafhængige forsøg',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [4, 5, 7, 9, 12]));
            const total = a + rng.int(2, lv(level, [4, 5, 7, 9, 12]));
            const res = reduce({ n: a * a, d: total * total });
            return {
              prompt: `En pose har ${a} røde kugler ud af ${total} i alt. Du trækker en kugle, lægger den tilbage og trækker igen. Hvad er sandsynligheden for at få rød begge gange?`,
              instruction: 'Svar som en forkortet brøk.',
              input: { kind: 'fraction' },
              answer: fracAns(res, true),
              hints: [
                'Kuglen lægges tilbage, så de to træk er uafhængige.',
                `P(rød) = ${a}/${total} begge gange.`,
                'Gang de to sandsynligheder.',
              ],
              solution: [
                s('Sandsynligheden ved hvert træk.', `P = \\frac{${a}}{${total}}`),
                s('Gang dem sammen.', `\\frac{${a}}{${total}} \\cdot \\frac{${a}}{${total}} = ${fracTexBig({ n: a * a, d: total * total })}`),
                ...(gcd(a * a, total * total) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: [
                { misconceptionId: 'sandsyn-plus-gange', value: `${2 * a}/${total}`, feedback: `Du lagde sandsynlighederne sammen. Når BEGGE ting skal ske, skal du gange: ${a}/${total} · ${a}/${total}.` },
                { misconceptionId: 'sandsyn-plus-gange', value: `${a}/${total}`, feedback: 'Det er sandsynligheden for ét træk. Der skal trækkes rødt to gange, så de to sandsynligheder skal ganges.' },
              ],
              concept: '"Og" → gange.',
              seconds: 70,
            };
          },
        },
        {
          id: 'sand-uden-tilbage',
          label: 'Uden tilbagelægning',
          minLevel: 3,
          make: ({ rng, level }) => {
            const a = rng.int(3, lv(level, [5, 6, 8, 10, 12]));
            const total = a + rng.int(2, lv(level, [5, 6, 8, 10, 12]));
            const res = reduce({ n: a * (a - 1), d: total * (total - 1) });
            return {
              prompt: `En pose har ${a} røde kugler ud af ${total} i alt. Du trækker to kugler UDEN at lægge den første tilbage. Hvad er sandsynligheden for at begge er røde?`,
              instruction: 'Svar som en forkortet brøk.',
              input: { kind: 'fraction' },
              answer: fracAns(res, true),
              hints: [
                'Første træk er som sædvanlig.',
                `Efter første træk er der én rød færre OG én kugle færre i alt: ${a - 1}/${total - 1}.`,
                'Gang de to sandsynligheder.',
              ],
              solution: [
                s('Første træk.', `\\frac{${a}}{${total}}`),
                s('Andet træk — både tæller og nævner er faldet med 1.', `\\frac{${a - 1}}{${total - 1}}`),
                s('Gang.', `\\frac{${a}}{${total}} \\cdot \\frac{${a - 1}}{${total - 1}} = ${fracTexBig({ n: a * (a - 1), d: total * (total - 1) })}`),
                ...(gcd(a * (a - 1), total * (total - 1)) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: [
                { misconceptionId: 'sandsyn-tilbagelaegning', value: `${a * a}/${total * total}`, feedback: `Du regnede som om kuglen blev lagt tilbage. Uden tilbagelægning er der ved andet træk kun ${a - 1} røde ud af ${total - 1}.` },
              ],
              concept: 'Uden tilbagelægning: både tæller og nævner falder.',
              seconds: 90,
            };
          },
        },
        {
          id: 'sand-kombinationer',
          label: 'Hvor mange muligheder?',
          minLevel: 2,
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [4, 5, 6, 8, 10]));
            const b = rng.int(2, lv(level, [4, 5, 6, 8, 10]));
            const c = level >= 4 ? rng.int(2, 5) : 1;
            const value = a * b * c;
            return mcq(rng, {
              prompt: c > 1
                ? `En menu har ${a} forretter, ${b} hovedretter og ${c} desserter. Hvor mange forskellige 3-retters menuer kan man sammensætte?`
                : `Du har ${a} trøjer og ${b} par bukser. Hvor mange forskellige sæt tøj kan du sammensætte?`,
              options: [
                { text: String(value), correct: true },
                { text: String(c > 1 ? a + b + c : a + b), misconceptionId: 'sandsyn-plus-gange', feedback: `Du lagde antallene sammen. For hver af de ${a} muligheder kan du kombinere med alle ${b}${c > 1 ? ` og alle ${c}` : ''} — derfor ganger man.` },
                { text: String(value * 2) },
                { text: String(Math.max(a, b, c)) },
              ],
              hints: [
                'For hver mulighed i den første gruppe kan du kombinere med alle i den anden.',
                c > 1 ? `${a} · ${b} · ${c}` : `${a} · ${b}`,
              ],
              solution: [
                s('Gang antallet af muligheder i hvert valg.', c > 1 ? `${a} \\cdot ${b} \\cdot ${c} = ${value}` : `${a} \\cdot ${b} = ${value}`),
              ],
              seconds: 50,
            });
          },
        },
      ],
    },
  ],
};
