import type { Domain } from '../../types';
import { linearTex, num, roundTo } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const modeller: Domain = {
  id: 'modeller',
  name: 'Matematiske modeller',
  category: 'anvendelse',
  icon: '📐',
  blurb: 'Oversæt virkeligheden til matematik — og husk at vurdere om modellen holder.',
  skills: [
    {
      id: 'model-opstil',
      domainId: 'modeller',
      name: 'Opstil en model',
      goal: 'Du kan oversætte en beskrevet situation til en forskrift.',
      prerequisites: ['funk-lineaer'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Hvad er en model?', body: 'En model er en forenklet beskrivelse af virkeligheden med matematik. Den er aldrig helt præcis — men den skal være god nok til at svare på spørgsmålet.' },
        { kind: 'list', title: 'Sådan opstiller du den', items: ['Find den variable — hvad ændrer sig?', 'Find startværdien — hvad gælder når x = 0?', 'Find ændringen pr. enhed', 'Skriv forskriften og navngiv variablene'] },
        { kind: 'rule', title: 'De to hovedtyper', math: 'y = ax + b \\quad\\text{eller}\\quad y = b \\cdot a^x', body: 'Fast beløb pr. gang → lineær. Fast procent pr. gang → eksponentiel.' },
        { kind: 'warning', body: 'Skriv altid hvad x og y BETYDER, og i hvilke enheder. En model uden enheder kan ikke fortolkes.' },
      ],
      worked: [
        {
          title: 'Taxa',
          prompt: '45 kr i starttakst plus 12 kr pr. km',
          steps: [
            s('Definér variablene.', 'x = \\text{antal km},\; y = \\text{pris i kr}'),
            s('Startværdien betales uanset hvad.', 'b = 45'),
            s('Prisen pr. km er hældningen.', 'a = 12'),
            s('Modellen.', 'y = 12x + 45'),
          ],
          takeaway: 'Det der betales ÉN gang er b. Det der gentages er a.',
        },
      ],
      generators: [
        {
          id: 'model-lineaer',
          label: 'Opstil lineær model',
          make: ({ rng, level }) => {
            const start = rng.int(10, lv(level, [50, 80, 150, 250, 400]));
            const rate = rng.int(2, lv(level, [10, 20, 35, 50, 80]));
            const ctx = rng.pick([
              { text: `En taxa koster ${start} kr i starttakst plus ${rate} kr pr. km.`, unit: 'km' },
              { text: `Et fitnesscenter koster ${start} kr i oprettelse plus ${rate} kr pr. måned.`, unit: 'måneder' },
              { text: `En håndværker tager ${start} kr i udkald plus ${rate} kr pr. time.`, unit: 'timer' },
            ]);
            return mcq(rng, {
              prompt: `${ctx.text} Hvilken model beskriver den samlede pris $y$ for $x$ ${ctx.unit}?`,
              options: [
                { text: `y = ${rate}x + ${start}`, correct: true },
                { text: `y = ${start}x + ${rate}`, misconceptionId: 'funktion-a-og-b', feedback: `Du byttede om på a og b. De ${start} kr betales kun én gang, så de er startværdien b. De ${rate} kr gentages og er hældningen.` },
                { text: `y = ${start + rate}x`, misconceptionId: 'model-vaelg-forkert', feedback: `Du lagde beløbene sammen. Startbeløbet på ${start} kr skal IKKE ganges med x.` },
                { text: `y = ${rate} \\cdot ${start}^x`, misconceptionId: 'model-vaelg-forkert', feedback: 'Det er en eksponentiel model. Her lægges et fast beløb til pr. enhed, så modellen er lineær.' },
              ],
              hints: [
                'Hvad betales uanset hvor mange enheder der er tale om?',
                'Hvad gentages for hver enhed?',
                'Det gentagne skal ganges med x.',
              ],
              solution: [
                s('Startværdien.', `b = ${start}`, 'Betales én gang.'),
                s('Ændringen pr. enhed.', `a = ${rate}`),
                s('Modellen.', `y = ${rate}x + ${start}`),
              ],
              seconds: 60,
            });
          },
        },
        {
          id: 'model-brug',
          label: 'Brug modellen',
          make: ({ rng, level }) => {
            const start = rng.int(10, lv(level, [50, 80, 150, 250, 400]));
            const rate = rng.int(2, lv(level, [10, 20, 35, 50, 80]));
            const budget = start + rate * rng.int(3, lv(level, [8, 12, 18, 25, 40]));
            const x = (budget - start) / rate;
            return {
              prompt: `En taxa koster ${start} kr i starttakst plus ${rate} kr pr. km. Du har ${budget} kr. Hvor mange km kan du køre?`,
              input: { kind: 'number', unit: 'km' },
              answer: numAns(x, 0.005),
              hints: [
                `Modellen er y = ${rate}x + ${start}.`,
                `Sæt y = ${budget} og løs for x.`,
                `Træk starttaksten fra: ${budget} − ${start} = ${budget - start}, og divider med ${rate}.`,
              ],
              solution: [
                s('Opstil ligningen.', `${rate}x + ${start} = ${budget}`),
                s('Træk starttaksten fra.', `${rate}x = ${budget - start}`),
                s('Divider.', `x = ${num(x)}\\text{ km}`),
              ],
              traps: trapIfDifferent(x, roundTo(budget / rate, 4), 'ligning-divider-delvis', `Du glemte starttaksten. De ${start} kr skal trækkes fra først.`),
              seconds: 75,
            };
          },
        },
      ],
    },

    {
      id: 'model-vaelg',
      domainId: 'modeller',
      name: 'Vælg og vurdér modellen',
      goal: 'Du kan vælge mellem en lineær og en eksponentiel model og vurdere modellens rækkevidde.',
      prerequisites: ['model-opstil', 'funk-eksponentiel'],
      tier: 5,
      explain: [
        { kind: 'idea', title: 'Det afgørende spørgsmål', body: 'Lægges der det samme til hver gang, eller ganges der med det samme? Det afgør modeltypen.' },
        { kind: 'list', title: 'Tjek på data', items: ['Konstante forskelle → lineær', 'Konstante kvotienter → eksponentiel', 'Hverken eller → en anden model'] },
        { kind: 'idea', title: 'Modellens gyldighedsområde', body: 'En model gælder kun i et bestemt interval. En model for en plantes vækst holder ikke i 100 år — planten dør.' },
        { kind: 'warning', body: 'Ekstrapolation — at bruge modellen langt uden for de data den er lavet på — er den hyppigste fejl ved matematiske modeller.' },
      ],
      worked: [
        {
          title: 'Hvilken model passer?',
          prompt: 'x: 0, 1, 2, 3 \\quad y: 100, 120, 144, 172{,}8',
          steps: [
            s('Test forskellene.', '20,\; 24,\; 28{,}8', 'Ikke konstante.'),
            s('Test kvotienterne.', '\\tfrac{120}{100} = 1{,}2,\; \\tfrac{144}{120} = 1{,}2', 'Konstante!'),
            s('Modellen er eksponentiel.', 'y = 100 \\cdot 1{,}2^x'),
          ],
          takeaway: 'Test altid begge dele. Forskellene først, så kvotienterne.',
        },
      ],
      generators: [
        {
          id: 'model-type-data',
          label: 'Hvilken model passer til data?',
          make: ({ rng, level }) => {
            const isExp = rng.bool();
            const b = rng.int(2, lv(level, [10, 20, 40, 80, 150])) * 10;
            const a = isExp ? rng.pick([1.5, 2, 1.2, 3]) : rng.int(5, 40);
            const ys = [0, 1, 2, 3].map((i) => roundTo(isExp ? b * a ** i : b + a * i, 2));
            return mcq(rng, {
              prompt: `Data: når $x$ er 0, 1, 2, 3 er $y$ henholdsvis ${ys.map((y) => num(y)).join(', ')}. Hvilken modeltype passer?`,
              options: [
                { text: 'Lineær (y = ax + b)', correct: !isExp, misconceptionId: isExp ? 'eksponentiel-lineaer' : undefined, feedback: isExp ? `Forskellene er ikke ens (${num(roundTo((ys[1] as number) - (ys[0] as number), 2))}, så ${num(roundTo((ys[2] as number) - (ys[1] as number), 2))}). Men kvotienterne er: ${num(a)} hver gang. Det er eksponentielt.` : undefined },
                { text: 'Eksponentiel (y = b · aˣ)', correct: isExp, misconceptionId: !isExp ? 'model-vaelg-forkert' : undefined, feedback: !isExp ? `Her lægges der ${a} til hver gang — forskellene er konstante. Det er en lineær model.` : undefined },
              ],
              hints: [
                'Udregn først forskellene mellem nabotallene.',
                `${num(roundTo((ys[1] as number) - (ys[0] as number), 2))}, ${num(roundTo((ys[2] as number) - (ys[1] as number), 2))}, ${num(roundTo((ys[3] as number) - (ys[2] as number), 2))}`,
                isExp ? 'Forskellene er ikke ens — prøv at dividere nabotallene i stedet.' : 'Forskellene er ens hele vejen.',
              ],
              solution: [
                s('Forskellene.', ys.slice(1).map((y, i) => num(roundTo(y - (ys[i] as number), 2))).join(',\; ')),
                s(isExp ? 'Ikke konstante. Kvotienterne:' : 'De er konstante.', isExp ? ys.slice(1).map((y, i) => num(roundTo(y / (ys[i] as number), 3))).join(',\; ') : undefined),
                s(isExp ? 'Kvotienterne er konstante → eksponentiel.' : 'Konstante forskelle → lineær.', isExp ? `y = ${b} \\cdot ${num(a)}^x` : `y = ${linearTex(a as number, b)}`),
              ],
              seconds: 80,
            });
          },
        },
        {
          id: 'model-vurder',
          label: 'Vurdér modellen',
          make: ({ rng }) => {
            const who = name(rng);
            const cases = [
              {
                q: `${who} er 12 år og 150 cm høj og er vokset 6 cm om året. Modellen h = 6t + 150 bruges til at forudsige højden om 30 år. Hvad er problemet?`,
                a: 'Mennesker holder op med at vokse — modellen gælder kun nogle få år frem.',
                wrong: ['Modellen bruger forkerte enheder.', 'Hældningen skulle have været negativ.', 'Der er ingen problemer med modellen.'],
              },
              {
                q: 'En bakteriekultur fordobles hver time. Modellen bruges til at forudsige antallet efter 3 uger. Hvad er problemet?',
                a: 'Der er ikke ubegrænset plads og næring — væksten stopper på et tidspunkt.',
                wrong: ['Fordobling er altid en lineær model.', 'Man kan ikke bruge potenser på tid.', 'Der er ingen problemer med modellen.'],
              },
              {
                q: 'En taxamodel y = 12x + 45 bruges til at beregne prisen for en tur på −5 km. Hvad er problemet?',
                a: 'Et negativt antal kilometer giver ingen mening — modellen gælder kun for x ≥ 0.',
                wrong: ['Starttaksten skulle have været negativ.', 'Modellen burde have været eksponentiel.', 'Der er ingen problemer med modellen.'],
              },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: c.q,
              options: [{ text: c.a, correct: true }, ...c.wrong.map((w) => ({ text: w }))],
              hints: [
                'Spørg: hvilke værdier af x giver overhovedet mening i virkeligheden?',
                'En model har altid et gyldighedsområde — uden for det holder den ikke.',
              ],
              solution: [s('Vurdér modellens gyldighedsområde.', undefined, c.a)],
              seconds: 60,
            });
          },
        },
      ],
    },
  ],
};
