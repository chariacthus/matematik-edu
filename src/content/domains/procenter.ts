import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const procenter: Domain = {
  id: 'procenter',
  name: 'Procenter',
  category: 'tal-algebra',
  icon: '%',
  blurb: 'Rabat, moms, renter og procentvis ændring — den matematik du møder uden for skolen.',
  skills: [
    {
      id: 'procent-af-tal',
      domainId: 'procenter',
      name: 'Procent af et tal',
      goal: 'Du kan udregne hvor meget en given procentdel udgør.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'idea', title: 'Procent betyder "pr. hundrede"', body: '25 % betyder 25 ud af 100, altså brøken 25/100 = 0,25.' },
        {
          kind: 'rule',
          title: 'Procent af et tal',
          math: 'p\\,\\% \\text{ af } T = \\frac{p}{100} \\cdot T',
          body: 'Lav procenten om til et decimaltal og gang med tallet.',
        },
        {
          kind: 'visual',
          visual: { kind: 'percentBar', whole: 100, part: 25, wholeLabel: 'det hele', partLabel: '25 %' },
          caption: '25 % er en fjerdedel af det hele.',
        },
        {
          kind: 'list',
          title: 'Hovedregning der virker',
          items: ['10 % → divider med 10', '1 % → divider med 100', '50 % → halvér', '25 % → halvér to gange', '5 % → tag halvdelen af 10 %'],
        },
      ],
      worked: [
        {
          title: '15 % af 840 kr',
          prompt: '15\\,\\% \\text{ af } 840',
          steps: [
            s('Find 10 %.', '840 : 10 = 84'),
            s('Find 5 % som halvdelen af 10 %.', '84 : 2 = 42'),
            s('Læg sammen.', '84 + 42 = 126'),
            s('Kontrol med decimaltal.', '0{,}15 \\cdot 840 = 126'),
          ],
          takeaway: 'Byg procenten op af 10 %, 5 % og 1 % — så kan du klare det uden lommeregner.',
        },
      ],
      generators: [
        {
          id: 'procent-simpel',
          label: 'Find procenten af et tal',
          make: ({ rng, level }) => {
            const p = rng.pick(lv<number[]>(level, [
              [10, 50, 25, 20],
              [10, 20, 25, 50, 75],
              [5, 15, 30, 40, 60],
              [12, 18, 35, 45, 85],
              [7, 13, 23, 37, 62],
            ]));
            const base = rng.int(2, lv(level, [20, 40, 60, 100, 200])) * 20;
            const value = roundTo((p / 100) * base, 4);
            return {
              prompt: `Hvad er $${p}\\,\\%$ af $${base}$?`,
              input: { kind: 'number' },
              answer: numAns(value, 0.005),
              visual: { kind: 'percentBar', whole: 100, part: p, wholeLabel: String(base), partLabel: `${p} %` },
              hints: [
                'Lav procenten om til et decimaltal ved at dividere med 100.',
                `${p} % = ${num(p / 100)}`,
                `Gang: ${num(p / 100)} · ${base}`,
              ],
              solution: [
                s('Procent til decimaltal.', `${p}\\,\\% = ${num(p / 100)}`),
                s('Gang med grundtallet.', `${num(p / 100)} \\cdot ${base} = ${num(value)}`),
              ],
              traps: trapIfDifferent(value, roundTo(p * base, 4), 'procent-grundtal', `Du gangede med ${p} i stedet for med ${num(p / 100)}. Procenten skal først divideres med 100.`),
              seconds: 40,
            };
          },
        },
        {
          id: 'procent-rabat',
          label: 'Rabat og moms',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const p = rng.pick(lv<number[]>(level, [[10, 50], [10, 20, 25], [15, 20, 30, 40], [12, 35, 45], [17, 23, 38]]));
            const price = rng.int(2, 60) * 25;
            const discount = roundTo((p / 100) * price, 2);
            const newPrice = roundTo(price - discount, 2);
            return {
              prompt: `En jakke koster ${price} kr. ${who} får ${p} % rabat. Hvad kommer jakken til at koste?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(newPrice, 0.005),
              hints: [
                'Først: hvor mange kroner er rabatten?',
                `${p} % af ${price} = ${num(discount, 2)} kr.`,
                'Træk rabatten fra den oprindelige pris.',
              ],
              solution: [
                s('Beregn rabatten.', `${num(p / 100)} \\cdot ${price} = ${num(discount, 2)}`),
                s('Træk fra prisen.', `${price} - ${num(discount, 2)} = ${num(newPrice, 2)}`),
                s('Genvej.', `${price} \\cdot ${num(1 - p / 100)} = ${num(newPrice, 2)}`, 'Vækstfaktoren gør det på ét skridt.'),
              ],
              traps: [
                ...trapIfDifferent(newPrice, discount, 'procent-grundtal', `Det er selve rabatten, ikke den nye pris. Rabatten skal trækkes fra de ${price} kr.`),
                ...trapIfDifferent(newPrice, roundTo(price + discount, 2), 'procent-grundtal', 'Rabat gør prisen mindre, ikke større.'),
              ],
              seconds: 55,
            };
          },
        },
        {
          id: 'procent-hovedregning',
          label: 'Procent i hovedet',
          make: ({ rng, level }) => {
            const p = rng.pick([10, 20, 25, 50, 75]);
            const base = rng.int(1, lv(level, [10, 20, 40, 80, 150])) * 40;
            const value = roundTo((p / 100) * base, 2);
            const wrongs = [roundTo(value / 2, 2), roundTo(value * 2, 2), roundTo(base - value, 2)].filter((w) => w !== value);
            return mcq(rng, {
              prompt: `Hvad er $${p}\\,\\%$ af $${base}$?`,
              instruction: 'Prøv at klare den i hovedet.',
              options: [
                { text: num(value), correct: true },
                ...rng.sample(wrongs, Math.min(3, wrongs.length)).map((w) => ({ text: num(w) })),
              ],
              hints: [
                p === 50 ? 'Halvér tallet.' : p === 25 ? 'Halvér to gange.' : p === 10 ? 'Divider med 10.' : p === 20 ? 'Find 10 % og gang med 2.' : 'Find 25 % og gang med 3.',
                `10 % af ${base} er ${num(base / 10)}.`,
              ],
              solution: [s('Regn med udgangspunkt i 10 %.', `10\\,\\% = ${num(base / 10)} \\Rightarrow ${p}\\,\\% = ${num(value)}`)],
              seconds: 25,
            });
          },
        },
      ],
    },

    {
      id: 'procent-find-procenten',
      domainId: 'procenter',
      name: 'Hvor mange procent udgør det?',
      goal: 'Du kan finde hvor mange procent en del udgør af en helhed.',
      prerequisites: ['procent-af-tal'],
      tier: 2,
      explain: [
        {
          kind: 'rule',
          title: 'Del delen med det hele',
          math: '\\text{procent} = \\frac{\\text{delen}}{\\text{det hele}} \\cdot 100\\,\\%',
          body: 'Divider først, gang så med 100.',
        },
        { kind: 'analogy', body: 'Spørg altid: procent af hvad? Det tal du sammenligner med, er det der står i nævneren.' },
        { kind: 'warning', body: 'Får du over 100 %, er delen større end helheden. Så har du sandsynligvis byttet om på tæller og nævner.' },
      ],
      worked: [
        {
          title: '18 ud af 24 elever',
          prompt: 'Hvor mange procent er 18 af 24?',
          steps: [
            s('Sæt delen over det hele.', '\\frac{18}{24}'),
            s('Divider.', '18 : 24 = 0{,}75'),
            s('Gang med 100.', '0{,}75 \\cdot 100 = 75\\,\\%'),
          ],
          takeaway: 'Tjek at svaret er rimeligt: 18 er lidt over trefjerdedele af 24 — 75 % passer.',
        },
      ],
      generators: [
        {
          id: 'find-procent',
          label: 'Del af helhed i procent',
          make: ({ rng, level }) => {
            const total = rng.pick(lv<number[]>(level, [[10, 20, 50, 100], [20, 25, 40, 50], [25, 40, 80, 200], [32, 60, 120, 250], [36, 64, 140, 320]]));
            const part = rng.int(1, total - 1);
            const pct = roundTo((part / total) * 100, 2);
            return {
              prompt: `Hvor mange procent er $${part}$ af $${total}$?`,
              instruction: 'Rund til højst to decimaler.',
              input: { kind: 'number', unit: '%' },
              answer: numAns(pct, 0.05),
              visual: { kind: 'percentBar', whole: total, part, wholeLabel: String(total), partLabel: String(part) },
              hints: [
                'Sæt delen over det hele som en brøk.',
                `${part}/${total}`,
                'Divider og gang med 100.',
              ],
              solution: [
                s('Delen over det hele.', `\\frac{${part}}{${total}}`),
                s('Divider.', `${part} : ${total} = ${num(roundTo(part / total, 5))}`),
                s('Gang med 100.', `= ${num(pct)}\\,\\%`),
              ],
              traps: trapIfDifferent(pct, roundTo((total / part) * 100, 2), 'procent-grundtal', `Du byttede om på tæller og nævner. Det hele (${total}) skal stå i nævneren.`),
              seconds: 50,
            };
          },
        },
        {
          id: 'find-grundtal',
          label: 'Find det hele',
          minLevel: 3,
          make: ({ rng, level }) => {
            const p = rng.pick(lv<number[]>(level, [[50, 25], [20, 25, 50], [20, 25, 40], [15, 30, 60], [12, 35, 80]]));
            const total = rng.int(2, lv(level, [10, 20, 30, 50, 80])) * 20;
            const part = roundTo((p / 100) * total, 2);
            return {
              prompt: `${p} % af et tal er ${num(part)}. Hvad er tallet?`,
              input: { kind: 'number' },
              answer: numAns(total, 0.05),
              hints: [
                'Kald tallet x. Så gælder der, at p % af x giver den kendte del.',
                `${num(p / 100)} · x = ${num(part)}`,
                `Divider begge sider med ${num(p / 100)}.`,
              ],
              solution: [
                s('Opstil ligningen.', `${num(p / 100)} \\cdot x = ${num(part)}`),
                s('Isolér x.', `x = \\frac{${num(part)}}{${num(p / 100)}} = ${num(total)}`),
              ],
              traps: trapIfDifferent(total, roundTo((p / 100) * part, 2), 'procent-grundtal', `Du tog ${p} % af ${num(part)}. Men ${num(part)} ER allerede de ${p} % — du skal den anden vej og dividere.`),
              concept: 'Kender du delen og procenten, finder du det hele ved at dividere.',
              seconds: 60,
            };
          },
        },
      ],
    },

    {
      id: 'procent-aendring',
      domainId: 'procenter',
      name: 'Procentvis ændring',
      goal: 'Du kan beregne hvor mange procent noget er steget eller faldet.',
      prerequisites: ['procent-find-procenten'],
      tier: 3,
      explain: [
        {
          kind: 'rule',
          title: 'Procentvis ændring',
          math: '\\text{ændring i \\%} = \\frac{\\text{ny} - \\text{gammel}}{\\text{gammel}} \\cdot 100\\,\\%',
          body: 'Det er altid den gamle værdi der står i nævneren — det er den vi sammenligner med.',
        },
        { kind: 'warning', body: 'Procent og procentpoint er ikke det samme. Går noget fra 20 % til 25 %, er det en stigning på 5 procentpoint — men på 25 %.' },
        { kind: 'warning', body: 'En stigning på 20 % efterfulgt af et fald på 20 % giver ikke udgangspunktet. 100 → 120 → 96.' },
      ],
      worked: [
        {
          title: 'Fra 250 kr til 300 kr',
          prompt: 'Hvor mange procent er prisen steget?',
          steps: [
            s('Find ændringen i kroner.', '300 - 250 = 50'),
            s('Sammenlign med den gamle pris.', '\\frac{50}{250} = 0{,}2'),
            s('Gang med 100.', '0{,}2 \\cdot 100 = 20\\,\\%'),
          ],
          takeaway: 'Havde vi delt med 300, havde vi fået 16,7 % — og det er svaret på et andet spørgsmål.',
        },
      ],
      generators: [
        {
          id: 'aendring-procent',
          label: 'Hvor mange procent er det ændret?',
          make: ({ rng, level }) => {
            const old = rng.int(2, lv(level, [10, 20, 30, 50, 80])) * 25;
            const pct = rng.pick(lv<number[]>(level, [[10, 20, 50], [10, 20, 25, 40], [15, 20, 30, 60], [12, 24, 45, 80], [8, 16, 35, 64]]));
            const up = rng.bool(0.6);
            const now = roundTo(old * (1 + (up ? 1 : -1) * (pct / 100)), 2);
            return {
              prompt: `En vare kostede ${old} kr. Nu koster den ${num(now)} kr. Hvor mange procent er prisen ${up ? 'steget' : 'faldet'}?`,
              input: { kind: 'number', unit: '%' },
              answer: numAns(pct, 0.05),
              hints: [
                'Find først forskellen i kroner.',
                `|${num(now)} − ${old}| = ${num(Math.abs(now - old))} kr.`,
                `Del med den oprindelige pris (${old}) og gang med 100.`,
              ],
              solution: [
                s('Ændringen i kroner.', `${num(now)} - ${old} = ${num(roundTo(now - old, 2))}`),
                s('Del med den gamle værdi.', `\\frac{${num(roundTo(Math.abs(now - old), 2))}}{${old}} = ${num(roundTo(Math.abs(now - old) / old, 4))}`),
                s('Gang med 100.', `= ${num(pct)}\\,\\%`),
              ],
              traps: trapIfDifferent(pct, roundTo((Math.abs(now - old) / now) * 100, 2), 'procent-grundtal', `Du delte med den nye pris. Ændringen skal sammenlignes med udgangspunktet, altså de ${old} kr.`),
              concept: 'Ændring / gammel værdi · 100 %.',
              seconds: 60,
            };
          },
        },
        {
          id: 'procentpoint',
          label: 'Procent eller procentpoint?',
          minLevel: 3,
          make: ({ rng }) => {
            const from = rng.int(10, 40);
            const to = from + rng.int(3, 20);
            const points = to - from;
            const pct = roundTo(((to - from) / from) * 100, 1);
            const askPoints = rng.bool();
            return mcq(rng, {
              prompt: `Andelen af elever der cykler til skole er steget fra ${from} % til ${to} %. ${askPoints ? 'Hvor mange procentpoint er det steget?' : 'Hvor mange procent er andelen steget?'}`,
              options: [
                { text: askPoints ? `${points} procentpoint` : `${num(pct)} %`, correct: true },
                {
                  text: askPoints ? `${num(pct)} procentpoint` : `${points} %`,
                  misconceptionId: 'procentpoint',
                  feedback: askPoints
                    ? `Procentpoint er den rene forskel: ${to} − ${from} = ${points}. De ${num(pct)} % er den procentvise stigning.`
                    : `Det er ${points} procent*point*. Den procentvise stigning er ${points}/${from} · 100 % = ${num(pct)} %.`,
                },
                { text: askPoints ? `${to} procentpoint` : `${to} %` },
              ],
              hints: [
                'Procentpoint er forskellen mellem to procenttal.',
                'Procentvis ændring sammenligner forskellen med udgangspunktet.',
                `Forskellen er ${points}. Udgangspunktet er ${from} %.`,
              ],
              solution: [
                s('Forskellen i procentpoint.', `${to} - ${from} = ${points}`),
                s('Den procentvise stigning.', `\\frac{${points}}{${from}} \\cdot 100 = ${num(pct)}\\,\\%`),
              ],
              seconds: 55,
            });
          },
        },
      ],
    },

    {
      id: 'procent-vaekstfaktor',
      domainId: 'procenter',
      name: 'Vækstfaktor og gentagne ændringer',
      goal: 'Du kan bruge vækstfaktor og regne på renter over flere år.',
      prerequisites: ['procent-aendring'],
      tier: 4,
      explain: [
        {
          kind: 'idea',
          title: 'Vækstfaktoren',
          body: 'I stedet for at regne ændringen og lægge til, ganger du bare med ét tal. En stigning på 8 % svarer til at gange med 1,08.',
        },
        { kind: 'rule', title: 'Vækstfaktor', math: 'k = 1 + \\frac{p}{100}', body: 'Fald: k = 1 − p/100. Et fald på 30 % giver k = 0,7.' },
        { kind: 'rule', title: 'Flere ændringer i træk', math: 'N = B \\cdot k^n', body: 'B er begyndelsesværdien, k vækstfaktoren, n antal gange.' },
        { kind: 'warning', body: 'Vækstfaktorer ganges sammen — de lægges ikke sammen. To stigninger på 10 % giver 1,1 · 1,1 = 1,21, altså 21 %.' },
      ],
      worked: [
        {
          title: '5000 kr til 3 % rente i 4 år',
          prompt: 'Hvor meget står der efter 4 år?',
          steps: [
            s('Find vækstfaktoren.', 'k = 1 + \\tfrac{3}{100} = 1{,}03'),
            s('Brug formlen med n = 4.', 'N = 5000 \\cdot 1{,}03^4'),
            s('Regn ud.', '= 5000 \\cdot 1{,}12551 = 5627{,}54', 'Runder til to decimaler til sidst.'),
          ],
          takeaway: 'Renters rente betyder at renten selv giver rente — derfor potensen.',
        },
      ],
      generators: [
        {
          id: 'vaekstfaktor-find',
          label: 'Find vækstfaktoren',
          make: ({ rng, level }) => {
            const p = rng.pick(lv<number[]>(level, [[10, 20, 50], [5, 10, 25], [8, 15, 30], [3, 12, 45], [2.5, 7.5, 62]]));
            const up = rng.bool();
            const k = roundTo(up ? 1 + p / 100 : 1 - p / 100, 5);
            return {
              prompt: `Hvad er vækstfaktoren ved ${up ? 'en stigning' : 'et fald'} på ${num(p)} %?`,
              input: { kind: 'number' },
              answer: numAns(k, 1e-5),
              hints: [
                up ? 'Ved stigning lægges procenten til 1.' : 'Ved fald trækkes procenten fra 1.',
                `${num(p)} % som decimaltal er ${num(p / 100)}.`,
                `k = 1 ${up ? '+' : '−'} ${num(p / 100)}`,
              ],
              solution: [s('Brug formlen.', `k = 1 ${up ? '+' : '-'} \\frac{${num(p)}}{100} = ${num(k)}`)],
              traps: [
                ...trapIfDifferent(k, roundTo(up ? 1 - p / 100 : 1 + p / 100, 5), 'procent-tilbage', `Du regnede den forkerte vej. Ved ${up ? 'stigning' : 'fald'} skal k være ${up ? 'større' : 'mindre'} end 1.`),
                ...trapIfDifferent(k, roundTo(p / 100, 5), 'procent-grundtal', 'Du glemte 1-tallet. Vækstfaktoren indeholder hele det oprindelige beløb plus ændringen.'),
              ],
              seconds: 35,
            };
          },
        },
        {
          id: 'renters-rente',
          label: 'Renters rente',
          minLevel: 3,
          make: ({ rng, level }) => {
            const who = name(rng);
            const start = rng.int(2, 40) * 500;
            const p = rng.pick(lv<number[]>(level, [[10], [5, 10], [2, 3, 5], [1.5, 2.5, 4], [1.25, 3.75, 6]]));
            const years = rng.int(2, lv(level, [3, 4, 5, 8, 12]));
            const k = 1 + p / 100;
            const value = roundTo(start * k ** years, 2);
            return {
              prompt: `${who} sætter ${start} kr i banken til ${num(p)} % i rente om året. Hvor meget står der efter ${years} år?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(value, 0.05),
              hints: [
                'Brug formlen N = B · kⁿ.',
                `Vækstfaktoren er k = ${num(roundTo(k, 5))}.`,
                `N = ${start} · ${num(roundTo(k, 5))}^${years}`,
              ],
              solution: [
                s('Find vækstfaktoren.', `k = 1 + \\frac{${num(p)}}{100} = ${num(roundTo(k, 5))}`),
                s('Indsæt i formlen.', `N = ${start} \\cdot ${num(roundTo(k, 5))}^{${years}}`),
                s('Regn ud.', `N = ${num(value, 2)}`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(start * (1 + (p * years) / 100), 2), 'procent-laeg-sammen', `Du lagde renten sammen år for år. Men renten forrenter sig selv, så vækstfaktoren skal opløftes i ${years}: ${start} · ${num(roundTo(k, 4))}^${years}.`),
                ...trapIfDifferent(value, roundTo(start * k, 2), 'procent-laeg-sammen', `Det er efter ét år. Der skal ganges med vækstfaktoren ${years} gange i alt.`),
              ],
              concept: 'N = B · kⁿ',
              seconds: 90,
            };
          },
        },
        {
          id: 'to-aendringer',
          label: 'To ændringer efter hinanden',
          minLevel: 3,
          make: ({ rng, level }) => {
            const start = rng.int(2, 20) * 100;
            const p1 = rng.pick(lv<number[]>(level, [[10, 20], [10, 20, 25], [15, 20, 30], [12, 24, 40], [8, 18, 35]]));
            const p2 = rng.pick([10, 20, 25, 30]);
            const value = roundTo(start * (1 + p1 / 100) * (1 - p2 / 100), 2);
            return {
              prompt: `En pris på ${start} kr stiger først med ${p1} % og falder derefter med ${p2} %. Hvad er prisen til sidst?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(value, 0.05),
              hints: [
                'Lav hver ændring om til en vækstfaktor.',
                `k₁ = ${num(roundTo(1 + p1 / 100, 4))} og k₂ = ${num(roundTo(1 - p2 / 100, 4))}`,
                'Gang begge vækstfaktorer på startprisen.',
              ],
              solution: [
                s('To vækstfaktorer.', `k_1 = ${num(roundTo(1 + p1 / 100, 4))},\\quad k_2 = ${num(roundTo(1 - p2 / 100, 4))}`),
                s('Gang dem på efter hinanden.', `${start} \\cdot ${num(roundTo(1 + p1 / 100, 4))} \\cdot ${num(roundTo(1 - p2 / 100, 4))}`),
                s('Resultat.', `= ${num(value, 2)}`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(start * (1 + (p1 - p2) / 100), 2), 'procent-laeg-sammen', `Du trak procenterne fra hinanden. De to ændringer regnes af forskellige grundtal, så vækstfaktorerne skal ganges: ${num(roundTo(1 + p1 / 100, 3))} · ${num(roundTo(1 - p2 / 100, 3))}.`),
                ...trapIfDifferent(value, start, 'procent-tilbage', 'Prisen ender ikke hvor den startede. Faldet regnes af den nye, højere pris, så de to ændringer ophæver ikke hinanden.'),
              ],
              seconds: 80,
            };
          },
        },
      ],
    },
  ],
};
