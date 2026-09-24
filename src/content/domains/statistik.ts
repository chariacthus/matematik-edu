import type { Domain } from '../../types';
import { mean, median, modeOf, num, quartile1, quartile3, rangeOf, roundTo } from '../../lib/math';
import { lv, numAns, s, trapIfDifferent } from '../helpers';

export const statistik: Domain = {
  id: 'statistik',
  name: 'Statistik',
  category: 'statistik-sandsynlighed',
  area: 'statistik',
  blurb: 'Beskriv et datasæt med de rigtige tal, og vælg det der passer til spørgsmålet.',
  skills: [
    {
      id: 'stat-deskriptorer',
      domainId: 'statistik',
      name: 'Middeltal, median, typetal og variationsbredde',
      goal: 'Du kan beregne de fire grundlæggende deskriptorer for et datasæt.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'rule', title: 'Middeltal (gennemsnit)', math: '\\bar{x} = \\frac{\\text{sum af alle}}{\\text{antal}}' },
        { kind: 'idea', title: 'Median', body: 'SORTÉR tallene først. Medianen er tallet i midten. Er der et lige antal, tager du gennemsnittet af de to midterste.' },
        { kind: 'idea', title: 'Typetal', body: 'Den værdi der optræder flest gange. Læg mærke til: det er værdien, ikke hvor mange gange den forekommer.' },
        { kind: 'idea', title: 'Variationsbredde', body: 'Største værdi minus mindste værdi. Den fortæller hvor spredt data er.' },
        { kind: 'warning', body: 'Medianen kan ikke findes uden at sortere. Gør du det ikke, finder du bare et tilfældigt tal i midten af listen.' },
      ],
      worked: [
        {
          title: 'Datasæt: 7, 3, 9, 3, 8',
          prompt: 'Find middeltal, median, typetal og variationsbredde',
          steps: [
            s('Middeltal: læg sammen og del med antallet.', '\\frac{7+3+9+3+8}{5} = \\frac{30}{5} = 6'),
            s('Sortér først.', '3,\; 3,\; 7,\; 8,\; 9'),
            s('Median: tallet i midten.', '7'),
            s('Typetal: den værdi der går igen.', '3'),
            s('Variationsbredde.', '9 - 3 = 6'),
          ],
          takeaway: 'Sortering er første skridt til både median og variationsbredde.',
        },
      ],
      generators: [
        {
          id: 'stat-middeltal',
          label: 'Beregn middeltallet',
          make: ({ rng, level }) => {
            const n = lv(level, [4, 5, 6, 7, 9]);
            const hi = lv(level, [10, 15, 25, 40, 60]);
            const values = Array.from({ length: n }, () => rng.int(1, hi));
            const value = roundTo(mean(values), 4);
            return {
              prompt: `Find middeltallet af: ${values.join(', ')}`,
              instruction: 'Rund til højst to decimaler.',
              input: { kind: 'number' },
              answer: numAns(value, 0.05),
              visual: { kind: 'dotPlot', values },
              hints: [
                'Læg alle tallene sammen.',
                `Summen er ${values.reduce((a, b) => a + b, 0)}.`,
                `Del med antallet, som er ${n}.`,
              ],
              solution: [
                s('Læg sammen.', `${values.join(' + ')} = ${values.reduce((a, b) => a + b, 0)}`),
                s('Del med antallet.', `\\frac{${values.reduce((a, b) => a + b, 0)}}{${n}} = ${num(value)}`),
              ],
              traps: trapIfDifferent(value, median(values), 'middel-median', `${num(median(values))} er MEDIANEN. Middeltallet findes ved at lægge alle sammen og dele med antallet.`),
              concept: 'Middeltal = sum / antal',
              seconds: 50,
            };
          },
        },
        {
          id: 'stat-median',
          label: 'Find medianen',
          make: ({ rng, level }) => {
            const n = lv(level, [5, 5, 7, 8, 9]);
            const hi = lv(level, [12, 18, 25, 40, 60]);
            const values = Array.from({ length: n }, () => rng.int(1, hi));
            const value = roundTo(median(values), 4);
            const sorted = [...values].sort((a, b) => a - b);
            const unsortedMiddle = values[Math.floor(n / 2)] as number;
            return {
              prompt: `Find medianen af: ${values.join(', ')}`,
              input: { kind: 'number' },
              answer: numAns(value, 0.005),
              visual: { kind: 'dotPlot', values },
              hints: [
                'Sortér tallene i rækkefølge først.',
                `Sorteret: ${sorted.join(', ')}`,
                n % 2 === 0 ? 'Der er et lige antal, så tag gennemsnittet af de to midterste.' : 'Tag tallet lige i midten.',
              ],
              solution: [
                s('Sortér.', sorted.join(',\; ')),
                s(n % 2 === 0 ? 'Gennemsnittet af de to midterste.' : 'Tallet i midten.', `= ${num(value)}`),
              ],
              traps: [
                ...trapIfDifferent(value, unsortedMiddle, 'median-usorteret', `Du tog tallet i midten af den USORTEREDE liste. Sortér først: ${sorted.join(', ')}, og så er medianen ${num(value)}.`),
                ...trapIfDifferent(value, roundTo(mean(values), 4), 'middel-median', `${num(roundTo(mean(values), 2))} er MIDDELTALLET. Medianen er den midterste værdi efter sortering.`),
              ],
              concept: 'Sortér → tag midten.',
              seconds: 55,
            };
          },
        },
        {
          id: 'stat-typetal-bredde',
          label: 'Typetal og variationsbredde',
          make: ({ rng, level }) => {
            const hi = lv(level, [8, 10, 12, 15, 20]);
            const modeVal = rng.int(1, hi);
            const rest = Array.from({ length: lv(level, [3, 4, 5, 6, 7]) }, () => rng.int(1, hi));
            const values = rng.shuffle([modeVal, modeVal, modeVal, ...rest]);
            const modes = modeOf(values);
            const wantMode = rng.bool();
            const value = wantMode ? (modes[0] as number) : rangeOf(values);
            if (wantMode && modes.length > 1) {
              return {
                prompt: `Find variationsbredden af: ${values.join(', ')}`,
                input: { kind: 'number' as const },
                answer: numAns(rangeOf(values)),
                visual: { kind: 'dotPlot' as const, values },
                hints: ['Variationsbredde er største minus mindste.', `${Math.max(...values)} − ${Math.min(...values)}`],
                solution: [s('Træk mindste fra største.', `${Math.max(...values)} - ${Math.min(...values)} = ${rangeOf(values)}`)],
                seconds: 40,
              };
            }
            const counts = new Map<number, number>();
            values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
            const modeCount = counts.get(modes[0] as number) ?? 0;
            return {
              prompt: wantMode ? `Find typetallet i: ${values.join(', ')}` : `Find variationsbredden af: ${values.join(', ')}`,
              input: { kind: 'number' },
              answer: numAns(value),
              visual: { kind: 'dotPlot', values },
              hints: wantMode
                ? ['Tæl hvor mange gange hvert tal optræder.', 'Typetallet er den værdi der optræder flest gange.', `Et af tallene går igen ${modeCount} gange.`]
                : ['Find det største og det mindste tal.', `${Math.max(...values)} og ${Math.min(...values)}`, 'Træk det mindste fra det største.'],
              solution: wantMode
                ? [s('Tæl forekomsterne.', undefined, `${modes[0]} optræder ${modeCount} gange, flere end nogen anden værdi.`), s('Typetallet er værdien.', `= ${modes[0]}`)]
                : [s('Største og mindste.', `${Math.max(...values)},\; ${Math.min(...values)}`), s('Træk fra.', `${Math.max(...values)} - ${Math.min(...values)} = ${rangeOf(values)}`)],
              traps: wantMode
                ? trapIfDifferent(value, modeCount, 'typetal-hyppighed', `${modeCount} er HYPPIGHEDEN, altså hvor mange gange værdien optræder. Typetallet er selve værdien, altså ${modes[0]}.`)
                : [],
              seconds: 50,
            };
          },
        },
      ],
    },

    {
      id: 'stat-kvartiler',
      domainId: 'statistik',
      name: 'Kvartiler og boksplot',
      goal: 'Du kan finde kvartilsættet og aflæse et boksplot.',
      prerequisites: ['stat-deskriptorer'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Kvartiler deler data i fire', body: 'Medianen deler i to. Nedre kvartil er medianen af den nedre halvdel, øvre kvartil er medianen af den øvre halvdel.' },
        { kind: 'rule', title: 'Kvartilsættet', math: '(\\text{mindste},\; Q_1,\; \\text{median},\; Q_3,\; \\text{største})', body: 'De fem tal der tegner et boksplot.' },
        { kind: 'visual', visual: { kind: 'boxPlot', min: 2, q1: 5, median: 8, q3: 12, max: 18 }, caption: 'Kassen dækker de midterste 50 % af observationerne.' },
        { kind: 'idea', title: 'Hvorfor er det nyttigt?', body: 'Boksplottet viser med ét blik hvor data ligger tæt og hvor der er spredt ud. Det kan et middeltal ikke vise.' },
      ],
      worked: [
        {
          title: 'Kvartilsæt for 2, 4, 5, 7, 8, 11, 14',
          prompt: 'Find de fem tal',
          steps: [
            s('Tallene er allerede sorteret. Medianen er den midterste.', '7'),
            s('Nedre halvdel: 2, 4, 5. Median heraf.', 'Q_1 = 4'),
            s('Øvre halvdel: 8, 11, 14. Median heraf.', 'Q_3 = 11'),
            s('Kvartilsæt.', '(2,\; 4,\; 7,\; 11,\; 14)'),
          ],
          takeaway: 'Ved et ulige antal tæller selve medianen ikke med i halvdelene.',
        },
      ],
      generators: [
        {
          id: 'kvartil-find',
          label: 'Find en kvartil',
          make: ({ rng, level }) => {
            const n = lv(level, [7, 7, 8, 9, 11]);
            const hi = lv(level, [15, 20, 30, 45, 60]);
            const values = Array.from({ length: n }, () => rng.int(1, hi)).sort((a, b) => a - b);
            const which = rng.pick(['Q1', 'median', 'Q3'] as const);
            const value = which === 'Q1' ? quartile1(values) : which === 'Q3' ? quartile3(values) : median(values);
            const label = which === 'Q1' ? 'nedre kvartil' : which === 'Q3' ? 'øvre kvartil' : 'medianen';
            return {
              prompt: `Find ${label} i datasættet: ${values.join(', ')}`,
              input: { kind: 'number' },
              answer: numAns(roundTo(value, 4), 0.005),
              hints: [
                'Tallene er sorteret. Find først medianen.',
                `Medianen er ${num(median(values))}.`,
                which === 'median' ? 'Det er svaret.' : `${label} er medianen af den ${which === 'Q1' ? 'nedre' : 'øvre'} halvdel.`,
              ],
              solution: [
                s('Find medianen.', `= ${num(median(values))}`),
                ...(which === 'median' ? [] : [s(`Tag den ${which === 'Q1' ? 'nedre' : 'øvre'} halvdel og find dens median.`, `= ${num(roundTo(value, 4))}`)]),
              ],
              traps: which !== 'median' ? trapIfDifferent(roundTo(value, 4), roundTo(median(values), 4), 'median-usorteret', `Det er medianen for hele datasættet. ${label} er medianen af den ${which === 'Q1' ? 'nedre' : 'øvre'} halvdel.`) : [],
              seconds: 70,
            };
          },
        },
        {
          id: 'boksplot-aflaes',
          label: 'Aflæs et boksplot',
          make: ({ rng, level }) => {
            // Alle fem tal ligger på en inddeling af aksen, så de kan aflæses
            // præcist, som på et opgaveark.
            const hi = lv(level, [20, 30, 40, 60, 90]);
            const step = hi <= 20 ? 1 : hi <= 40 ? 2 : 5;
            const k = Math.max(3, Math.floor(hi / 5 / step));
            const min = step * rng.int(0, k);
            const q1 = min + step * rng.int(2, k);
            const med = q1 + step * rng.int(2, k);
            const q3 = med + step * rng.int(2, k);
            const max = q3 + step * rng.int(2, k);
            const ask = rng.pick(['median', 'bredde', 'kasse'] as const);
            const value = ask === 'median' ? med : ask === 'bredde' ? max - min : q3 - q1;
            const question = { median: 'Hvad er medianen?', bredde: 'Hvad er variationsbredden?', kasse: 'Hvor bred er kassen (kvartilbredden)?' }[ask];
            return {
              prompt: `${question}`,
              instruction: 'Aflæs på boksplottet.',
              input: { kind: 'number' },
              answer: numAns(value),
              visual: { kind: 'boxPlot', min, q1, median: med, q3, max, step },
              hints: [
                'Stregen inde i kassen er medianen.',
                'Kassens kanter er nedre og øvre kvartil.',
                'De yderste streger er mindste og største værdi.',
              ],
              solution: [
                s('Aflæs de fem tal.', `(${min},\; ${q1},\; ${med},\; ${q3},\; ${max})`),
                s(ask === 'median' ? 'Medianen er stregen i kassen.' : ask === 'bredde' ? 'Variationsbredde = største − mindste.' : 'Kvartilbredde = Q₃ − Q₁.', `= ${value}`),
              ],
              traps: ask === 'bredde' ? trapIfDifferent(value, q3 - q1, 'middel-median', 'Det er kassens bredde (kvartilbredden). Variationsbredden går fra det mindste til det største tal, altså hele boksplottets bredde.') : [],
              seconds: 55,
            };
          },
        },
      ],
    },

    {
      id: 'stat-diagrammer',
      domainId: 'statistik',
      name: 'Diagrammer og hyppighed',
      goal: 'Du kan aflæse søjlediagrammer og beregne hyppighed og frekvens.',
      prerequisites: ['stat-deskriptorer', 'procent-find-procenten'],
      tier: 2,
      explain: [
        { kind: 'idea', title: 'Hyppighed og frekvens', body: 'Hyppighed er ANTALLET af gange noget forekommer. Frekvens er andelen: hyppigheden divideret med det samlede antal, typisk i procent.' },
        { kind: 'rule', title: 'Frekvens', math: 'f = \\frac{\\text{hyppighed}}{\\text{samlet antal}} \\cdot 100\\,\\%' },
        { kind: 'list', title: 'Vælg det rigtige diagram', items: ['Søjlediagram: sammenlign kategorier', 'Cirkeldiagram: vis andele af en helhed', 'Kurvediagram: udvikling over tid', 'Boksplot: sammenlign spredning'] },
      ],
      worked: [
        {
          title: 'Frekvens ud fra hyppighed',
          prompt: '12 ud af 40 elever cykler',
          steps: [
            s('Sæt hyppigheden over det samlede antal.', '\\frac{12}{40}'),
            s('Divider.', '= 0{,}3'),
            s('Gang med 100.', '= 30\\,\\%'),
          ],
          takeaway: 'Frekvenserne skal give 100 % tilsammen. Det er en god kontrol.',
        },
      ],
      generators: [
        {
          id: 'diagram-aflaes',
          label: 'Aflæs søjlediagram',
          make: ({ rng, level }) => {
            const cats = rng.sample(['Fodbold', 'Håndbold', 'Svømning', 'Badminton', 'Basketball', 'Atletik'], lv(level, [3, 4, 4, 5, 5]));
            // Søjlerne ender på en hjælpelinje, så de kan aflæses på aksen.
            const step = lv(level, [1, 2, 2, 5, 5]);
            const data = cats.map((c) => ({ label: c, value: step * rng.int(1, Math.floor(lv(level, [12, 18, 25, 40, 60]) / step)) }));
            const total = data.reduce((a, b) => a + b.value, 0);
            const ask = rng.pick(['total', 'diff', 'max'] as const);
            const sorted = [...data].sort((a, b) => b.value - a.value);
            const value = ask === 'total' ? total : ask === 'max' ? (sorted[0] as { value: number }).value : (sorted[0] as { value: number }).value - (sorted[sorted.length - 1] as { value: number }).value;
            const question = {
              total: 'Hvor mange elever er der i alt?',
              max: 'Hvor mange elever går til den mest populære sport?',
              diff: 'Hvad er forskellen mellem den mest og den mindst populære sport?',
            }[ask];
            return {
              prompt: question,
              instruction: 'Aflæs på søjlediagrammet.',
              input: { kind: 'number', unit: 'elever' },
              answer: numAns(value),
              visual: { kind: 'barChart', data, yLabel: 'Antal elever', step },
              hints: [
                'Aflæs højden af hver søjle.',
                data.map((d) => `${d.label}: ${d.value}`).join(', '),
                ask === 'total' ? 'Læg alle søjler sammen.' : ask === 'max' ? 'Find den højeste søjle.' : 'Træk den laveste fra den højeste.',
              ],
              solution: [
                s('Aflæs søjlerne.', data.map((d) => `${d.label}: ${d.value}`).join(',\; ')),
                s(ask === 'total' ? 'Læg sammen.' : ask === 'max' ? 'Tag den største.' : 'Træk fra.', `= ${value}`),
              ],
              seconds: 55,
            };
          },
        },
        {
          id: 'frekvens',
          label: 'Beregn frekvensen',
          make: ({ rng, level }) => {
            const total = rng.pick(lv<number[]>(level, [[20, 25, 50], [20, 25, 40, 50], [25, 40, 50, 80], [32, 60, 120, 150], [36, 64, 125, 200]]));
            const count = rng.int(1, total - 1);
            const value = roundTo((count / total) * 100, 2);
            return {
              prompt: `${count} ud af ${total} elever har cykel. Hvad er frekvensen i procent?`,
              instruction: 'Rund til højst to decimaler.',
              input: { kind: 'number', unit: '%' },
              answer: numAns(value, 0.05),
              visual: { kind: 'percentBar', whole: total, part: count, wholeLabel: `${total} elever`, partLabel: `${count} med cykel` },
              visualAid: true,
              hints: [
                'Frekvens er hyppighed divideret med det samlede antal.',
                `${count} : ${total} = ${num(roundTo(count / total, 5))}`,
                'Gang med 100 for at få procent.',
              ],
              solution: [
                s('Sæt hyppigheden over det samlede antal.', `\\frac{${count}}{${total}}`),
                s('Divider.', `= ${num(roundTo(count / total, 5))}`),
                s('Gang med 100.', `= ${num(value)}\\,\\%`),
              ],
              traps: trapIfDifferent(value, count, 'typetal-hyppighed', `${count} er HYPPIGHEDEN, altså antallet. Frekvensen er andelen: ${count} : ${total} · 100 % = ${num(value)} %.`),
              seconds: 55,
            };
          },
        },
      ],
    },
  ],
};
