import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

/**
 * "Geometrisk tegning" er det fjerde færdigheds- og vidensområde under
 * Geometri og måling i Fælles Mål. Det handler om at tegne præcist, læse
 * en tegning og vide hvilken tegneform der passer til formålet.
 */
export const tegning: Domain = {
  id: 'tegning',
  name: 'Geometrisk tegning',
  category: 'geometri-maaling',
  area: 'geometrisk-tegning',
  blurb: 'Konstruktion, målfast tegning og de tegneformer man bruger til hvad.',
  skills: [
    {
      id: 'tegn-former',
      domainId: 'tegning',
      name: 'Tegneformer',
      goal: 'Du kan vælge den rigtige tegneform til en given opgave.',
      prerequisites: [],
      tier: 2,
      aids: 'begge',
      explain: [
        { kind: 'list', title: 'De tegneformer du skal kende', items: [
          'Skitse: hurtig håndtegning uden mål, så du forstår opgaven',
          'Målfast tegning: alt er tegnet i en bestemt målestok',
          'Isometrisk tegning: rumlig tegning på isometrisk papir, hvor mål langs kanterne passer',
          'Perspektivtegning: ser realistisk ud, men mål kan ikke aflæses',
          'Konstruktion: tegnet med passer og lineal efter faste regler',
        ] },
        { kind: 'idea', title: 'Vælg efter formålet', body: 'Skal nogen bygge efter tegningen, skal den være målfast. Skal den bare forklare en idé, er en skitse nok.' },
        { kind: 'warning', body: 'I en perspektivtegning bliver fjerne ting mindre. Derfor kan man ikke måle på den, selvom den ligner virkeligheden mest.' },
      ],
      worked: [
        {
          title: 'Hvilken tegneform?',
          prompt: '\\text{En tømrer skal bygge en skur efter din tegning}',
          steps: [
            s('Tømreren skal kunne måle på tegningen.', undefined, 'Så en skitse er ikke nok.'),
            s('Perspektiv kan ikke måles på.', undefined, 'Så den ryger også ud.'),
            s('Svar: en målfast tegning med angivet målestok.'),
          ],
          takeaway: 'Spørg altid: skal nogen kunne MÅLE på tegningen?',
        },
      ],
      generators: [
        {
          id: 'tegneform-vaelg',
          label: 'Vælg tegneform',
          make: ({ rng }) => {
            const cases = [
              { q: 'Du skal hurtigt forklare en klassekammerat hvordan opgaven hænger sammen.', a: 'Skitse', why: 'En skitse er hurtig og skal ikke kunne måles på.' },
              { q: 'En håndværker skal bygge efter din tegning.', a: 'Målfast tegning', why: 'Der skal kunne måles på tegningen, og målestokken skal stå på.' },
              { q: 'Du skal vise en kasse rumligt, så man kan tælle terningerne langs kanterne.', a: 'Isometrisk tegning', why: 'Isometrisk papir holder målene langs de tre kantretninger.' },
              { q: 'Du skal tegne en gade, så den ser ud som øjet ser den.', a: 'Perspektivtegning', why: 'Perspektiv ligner virkeligheden, men kan ikke måles på.' },
              { q: 'Du skal halvere en vinkel præcist med passer og lineal.', a: 'Konstruktion', why: 'Konstruktion bruger passer og lineal efter faste regler.' },
            ];
            const c = rng.pick(cases);
            const all = ['Skitse', 'Målfast tegning', 'Isometrisk tegning', 'Perspektivtegning', 'Konstruktion'];
            return mcq(rng, {
              prompt: `${c.q} Hvilken tegneform passer bedst?`,
              options: [
                { text: c.a, correct: true },
                ...rng.sample(all.filter((x) => x !== c.a), 3).map((t) => ({ text: t })),
              ],
              hints: ['Spørg: skal nogen kunne måle på tegningen?', 'Spørg: skal den vise noget rumligt?'],
              solution: [s('Vælg efter formålet.', undefined, c.why)],
              seconds: 40,
            });
          },
        },
        {
          id: 'konstruktion-trin',
          label: 'Konstruktion med passer og lineal',
          minLevel: 2,
          make: ({ rng }) => {
            const cases = [
              { q: 'Hvordan halverer du en vinkel med passer og lineal?', a: 'Sæt passeren i vinkelspidsen, afsæt buer på begge ben, og tegn buer fra de to skæringspunkter', wrong: ['Mål vinklen med vinkelmåler og divider med 2', 'Tegn en linje på fri hånd midt imellem benene', 'Mål benene og find midtpunktet'] },
              { q: 'Hvordan konstruerer du midtnormalen til et linjestykke AB?', a: 'Slå buer med samme radius fra A og fra B, og forbind de to skæringspunkter', wrong: ['Mål AB og sæt et mærke på midten', 'Tegn en vinkelret linje gennem A', 'Slå en cirkel med AB som diameter'] },
              { q: 'Hvad kendetegner en konstruktion i geometri?', a: 'Den laves udelukkende med passer og lineal efter faste regler', wrong: ['Den tegnes på isometrisk papir', 'Den tegnes altid i målestok 1:1', 'Den laves på fri hånd'] },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: c.q,
              options: [{ text: c.a, correct: true }, ...c.wrong.map((w) => ({ text: w }))],
              hints: ['En konstruktion bruger kun passer og lineal, ikke vinkelmåler eller linealens målestreger.', 'Buer med samme radius er kernen i næsten alle konstruktioner.'],
              solution: [s('Konstruktion bygger på buer med samme radius.', undefined, c.a)],
              seconds: 45,
            });
          },
        },
      ],
    },

    {
      id: 'tegn-maalfast',
      domainId: 'tegning',
      name: 'Målfast tegning',
      goal: 'Du kan tegne og aflæse en målfast tegning i en given målestok.',
      prerequisites: ['forhold-maalestok'],
      tier: 3,
      aids: 'begge',
      explain: [
        { kind: 'idea', title: 'Målestokken er kontrakten', body: 'En målfast tegning er kun brugbar hvis målestokken står på. Uden den kan man ikke regne tilbage til virkeligheden.' },
        { kind: 'rule', title: 'Fra tegning til virkelighed', math: '\\text{virkelighed} = \\text{tegning} \\cdot n \\quad (\\text{målestok } 1:n)' },
        { kind: 'idea', title: 'Areal skalerer anderledes', body: 'Fordobles alle længder, bliver arealet fire gange så stort. I målestok 1:100 er arealet 100² = 10.000 gange større i virkeligheden.' },
        { kind: 'warning', body: 'Målestoksforholdet gælder for LÆNGDER. Til areal skal faktoren i anden, til rumfang i tredje.' },
      ],
      worked: [
        {
          title: 'Areal i målestok 1:50',
          prompt: '\\text{Et rum måler } 8 \\times 6 \\text{ cm på tegningen}',
          steps: [
            s('Omregn hver længde.', '8 \\cdot 50 = 400\\text{ cm} = 4\\text{ m}'),
            s('Og den anden.', '6 \\cdot 50 = 300\\text{ cm} = 3\\text{ m}'),
            s('Areal i virkeligheden.', '4 \\cdot 3 = 12\\text{ m}^2'),
            s('Kontrol med arealfaktoren.', '48\\text{ cm}^2 \\cdot 50^2 = 120000\\text{ cm}^2 = 12\\text{ m}^2 \;\\checkmark'),
          ],
          takeaway: 'Omregn længderne først. Så undgår du at glemme at arealfaktoren er kvadreret.',
        },
      ],
      generators: [
        {
          id: 'maalfast-areal',
          label: 'Areal fra målfast tegning',
          make: ({ rng, level }) => {
            const scale = rng.pick(lv<number[]>(level, [[50], [50, 100], [50, 100, 200], [100, 200], [100, 200, 500]]));
            const w = rng.int(3, 12);
            const h = rng.int(3, 12);
            const realW = (w * scale) / 100;
            const realH = (h * scale) / 100;
            const area = roundTo(realW * realH, 3);
            return {
              prompt: `På en tegning i målestok 1:${scale} er et rum ${w} cm × ${h} cm. Hvor stort er rummet i virkeligheden? Svar i m².`,
              input: { kind: 'number', unit: 'm²' },
              answer: numAns(area, 0.005),
              visual: { kind: 'rect', w, h, labelW: `${w} cm`, labelH: `${h} cm` },
              hints: [
                'Omregn hver længde til virkelige mål først.',
                `${w} · ${scale} = ${w * scale} cm = ${num(realW)} m`,
                `Gang så de to virkelige længder.`,
              ],
              solution: [
                s('Omregn længderne.', `${num(realW)}\\text{ m} \\times ${num(realH)}\\text{ m}`),
                s('Gang dem.', `${num(realW)} \\cdot ${num(realH)} = ${num(area)}\\text{ m}^2`),
              ],
              traps: trapIfDifferent(area, roundTo((w * h * scale) / 100, 3), 'maalestok-vej', `Du gangede arealet med ${scale} én gang. Målestokken gælder for LÆNGDER, så arealet skal ganges med ${scale}².`),
              concept: 'Længder ganges med n, arealer med n².',
              seconds: 80,
            };
          },
        },
        {
          id: 'maalfast-vaelg-skala',
          label: 'Vælg en passende målestok',
          minLevel: 2,
          make: ({ rng }) => {
            const cases = [
              { thing: 'et hus på 12 m', paper: 'et A4-ark', a: '1:100', wrong: ['1:1', '1:10', '1:10000'] },
              { thing: 'en myre på 5 mm', paper: 'et A4-ark', a: '10:1', wrong: ['1:10', '1:100', '1:1000'] },
              { thing: 'en by på 4 km', paper: 'et A4-ark', a: '1:20000', wrong: ['1:10', '1:100', '1:2'] },
              { thing: 'en skruetrækker på 20 cm', paper: 'et A4-ark', a: '1:1', wrong: ['1:1000', '1:500', '100:1'] },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: `Du skal tegne ${c.thing} på ${c.paper}. Hvilken målestok er mest passende?`,
              options: [{ text: c.a, correct: true }, ...c.wrong.map((w) => ({ text: w }))],
              hints: [
                'Tegningen skal kunne være på papiret, men også være stor nok til at man kan se noget.',
                'Et A4-ark er ca. 21 cm × 30 cm.',
              ],
              solution: [s('Vælg den målestok der fylder papiret bedst ud.', undefined, `Her passer ${c.a}.`)],
              seconds: 45,
            });
          },
        },
      ],
    },
  ],
};
