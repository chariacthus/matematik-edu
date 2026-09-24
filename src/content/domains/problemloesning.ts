import type { Domain } from '../../types';
import { roundTo } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const problemloesning: Domain = {
  id: 'problemloesning',
  name: 'Problemløsning',
  category: 'kompetencer',
  area: 'problembehandling',
  blurb: 'Tekstopgaver i flere trin, baglæns tænkning og talmønstre.',
  skills: [
    {
      id: 'prob-flertrin',
      domainId: 'problemloesning',
      name: 'Tekstopgaver i flere trin',
      goal: 'Du kan bryde en sammensat tekstopgave ned i trin og løse den.',
      prerequisites: ['tal-regnearter'],
      tier: 2,
      explain: [
        { kind: 'list', title: 'De fire skridt', items: ['1. LÆS: hvad spørges der egentlig om?', '2. SKRIV OP: hvilke tal har du, og hvad betyder de?', '3. PLANLÆG: hvilke regnestykker, i hvilken rækkefølge?', '4. TJEK: er svaret realistisk?'] },
        { kind: 'idea', title: 'Skriv mellemregningerne', body: 'Sæt navn på hvert delresultat: "pris i alt", "rabat", "til rest". Så mister du ikke tråden.' },
        { kind: 'warning', body: 'Signalord som "i alt" og "forskel" hjælper, men de er ikke en facitliste. Tegn eller skriv situationen op før du vælger regneart.' },
        { kind: 'idea', title: 'Tjek altid til sidst', body: 'Kan en pizza koste 4500 kr? Kan et menneske være 19 m højt? Urealistiske svar afslører en regnefejl.' },
      ],
      worked: [
        {
          title: 'Klassetur',
          prompt: '24 elever skal på tur. Bussen koster 3600 kr, og hver elev betaler 75 kr til mad. Hvad koster turen pr. elev?',
          steps: [
            s('Busudgiften pr. elev.', '3600 : 24 = 150\\text{ kr}'),
            s('Læg madpengene til.', '150 + 75 = 225\\text{ kr}'),
            s('Tjek.', '24 \\cdot 225 = 5400 = 3600 + 24\\cdot75 \;\\checkmark'),
          ],
          takeaway: 'Del op i to spørgsmål du kan svare på hver for sig.',
        },
      ],
      generators: [
        {
          id: 'prob-tur',
          label: 'Flertrins tekstopgave',
          make: ({ rng, level }) => {
            const students = rng.int(4, lv(level, [10, 15, 24, 30, 40]));
            const perStudent = rng.int(2, lv(level, [10, 20, 40, 80, 150]));
            const bus = students * perStudent;
            const food = rng.int(10, lv(level, [40, 60, 90, 150, 250]));
            const value = perStudent + food;
            return {
              prompt: `${students} elever skal på tur. Bussen koster ${bus} kr i alt, og hver elev betaler desuden ${food} kr til mad. Hvad koster turen pr. elev?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(value, 0.005),
              hints: [
                'Del det op: hvad koster bussen pr. elev?',
                `${bus} : ${students} = ${perStudent} kr.`,
                'Læg madpengene til.',
              ],
              solution: [
                s('Busudgift pr. elev.', `${bus} : ${students} = ${perStudent}`),
                s('Læg madpengene til.', `${perStudent} + ${food} = ${value}`),
                s('Kontrol.', `${students} \\cdot ${value} = ${students * value}`, `Det passer med ${bus} + ${students}·${food} = ${bus + students * food}.`),
              ],
              traps: [
                ...trapIfDifferent(value, bus + food, 'tekst-forkert-regneart', `${bus} kr er bussens SAMLEDE pris. Den skal deles med de ${students} elever først.`),
                ...trapIfDifferent(value, perStudent, 'tekst-forkert-regneart', `Det er kun busudgiften pr. elev. Madpengene på ${food} kr skal lægges til.`),
              ],
              seconds: 90,
            };
          },
        },
        {
          id: 'prob-baglaens',
          label: 'Tænk baglæns',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const rest = rng.int(10, lv(level, [50, 80, 120, 200, 350]));
            const spent = rng.int(10, lv(level, [50, 80, 120, 200, 350]));
            const half = rest + spent;
            const start = half * 2;
            return {
              prompt: `${who} bruger halvdelen af sine penge på en gave og derefter ${spent} kr på mad. Nu er der ${rest} kr tilbage. Hvor mange penge havde ${who} fra start?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(start, 0.005),
              hints: [
                'Start i den anden ende: hvad var der før madpengene blev brugt?',
                `${rest} + ${spent} = ${half} kr, og det er halvdelen af det oprindelige.`,
                'Gang med 2.',
              ],
              solution: [
                s('Læg madpengene tilbage.', `${rest} + ${spent} = ${half}`, 'Det er hvad der var efter gaven.'),
                s('Det er halvdelen, så gang med 2.', `${half} \\cdot 2 = ${start}`),
                s('Kontrol.', `${start} : 2 = ${half},\\quad ${half} - ${spent} = ${rest} \;\\checkmark`),
              ],
              traps: [
                ...trapIfDifferent(start, half, 'tekst-forkert-regneart', `${half} kr er kun HALVDELEN af startbeløbet. Gang med 2.`),
                ...trapIfDifferent(start, roundTo(rest * 2 + spent, 4), 'tekst-forkert-regneart', 'Rækkefølgen er vigtig baglæns: madpengene skal lægges tilbage FØR du fordobler.'),
              ],
              concept: 'Baglæns: gør det modsatte i omvendt rækkefølge.',
              seconds: 110,
            };
          },
        },
      ],
    },

    {
      id: 'prob-moenstre',
      domainId: 'problemloesning',
      name: 'Talmønstre og talfølger',
      goal: 'Du kan finde reglen i en talfølge og forudsige næste tal.',
      prerequisites: ['algebra-udtryk'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Kig på forskellene', body: 'Udregn forskellen mellem nabotallene. Er den den samme hver gang, er følgen lineær.' },
        { kind: 'rule', title: 'Lineær talfølge', math: 'a_n = a_1 + (n-1) \\cdot d', body: 'd er den faste forskel mellem to naboer.' },
        { kind: 'idea', title: 'Er forskellene ikke ens?', body: 'Prøv at dividere nabotallene i stedet. Er kvotienten den samme, er følgen eksponentiel.' },
        { kind: 'list', title: 'Mønstre du bør kende', items: ['Kvadrattal: 1, 4, 9, 16, 25 …', 'Ulige tal: 1, 3, 5, 7 …', 'Fordoblinger: 2, 4, 8, 16 …', 'Fibonacci: 1, 1, 2, 3, 5, 8 …'] },
      ],
      worked: [
        {
          title: 'Følgen 4, 7, 10, 13 …',
          prompt: 'Find det 10. tal',
          steps: [
            s('Find forskellen.', '7 - 4 = 3,\; 10 - 7 = 3', 'Samme forskel, så det er en lineær følge.'),
            s('Brug formlen.', 'a_{10} = 4 + (10-1) \\cdot 3'),
            s('Regn ud.', '= 4 + 27 = 31'),
          ],
          takeaway: 'Der er (n − 1) skridt op til det n’te tal, ikke n skridt.',
        },
      ],
      generators: [
        {
          id: 'moenster-naeste',
          label: 'Hvad er næste tal?',
          make: ({ rng, level }) => {
            const type = level >= 3 && rng.bool(0.4) ? 'eksp' : 'lin';
            if (type === 'eksp') {
              const start = rng.int(1, 6);
              const k = rng.pick([2, 3]);
              const seq = [0, 1, 2, 3].map((i) => start * k ** i);
              const next = start * k ** 4;
              return {
                prompt: `Hvilket tal kommer næst i følgen: ${seq.join(', ')}, ___ ?`,
                input: { kind: 'number' as const },
                answer: numAns(next),
                hints: ['Prøv at dividere nabotallene med hinanden.', `${seq[1]} : ${seq[0]} = ${k}`, `Gang det sidste tal med ${k}.`],
                solution: [
                  s('Forskellene er ikke ens. Prøv division.', `${seq[1]} : ${seq[0]} = ${k}`),
                  s('Hvert tal ganges med den samme faktor.', `${seq[3]} \\cdot ${k} = ${next}`),
                ],
                traps: trapIfDifferent(next, (seq[3] as number) + ((seq[3] as number) - (seq[2] as number)), 'eksponentiel-lineaer', `Du lagde forskellen til. Her GANGES der med ${k} hver gang i stedet.`),
                seconds: 50,
              };
            }
            const start = rng.int(1, lv(level, [10, 15, 25, 40, 60]));
            const d = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const seq = [0, 1, 2, 3].map((i) => start + i * d);
            const next = start + 4 * d;
            return {
              prompt: `Hvilket tal kommer næst i følgen: ${seq.join(', ')}, ___ ?`,
              input: { kind: 'number' },
              answer: numAns(next),
              hints: ['Udregn forskellen mellem nabotallene.', `${seq[1]} − ${seq[0]} = ${d}`, `Læg ${d} til det sidste tal.`],
              solution: [
                s('Find forskellen.', `${seq[1]} - ${seq[0]} = ${d}`, 'Den er den samme hele vejen.'),
                s('Læg den til det sidste tal.', `${seq[3]} ${d < 0 ? '-' : '+'} ${Math.abs(d)} = ${next}`),
              ],
              seconds: 40,
            };
          },
        },
        {
          id: 'moenster-nte',
          label: 'Find det n’te tal',
          minLevel: 3,
          make: ({ rng, level }) => {
            const start = rng.int(1, lv(level, [8, 12, 20, 30, 45]));
            const d = rng.int(2, lv(level, [4, 6, 8, 12, 15]));
            const n = rng.int(8, lv(level, [12, 15, 20, 30, 50]));
            const seq = [0, 1, 2, 3].map((i) => start + i * d);
            const value = start + (n - 1) * d;
            return {
              prompt: `En talfølge starter ${seq.join(', ')}, … Hvad er det ${n}. tal?`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                `Forskellen mellem nabotallene er ${d}.`,
                `Brug aₙ = a₁ + (n − 1)·d med a₁ = ${start} og d = ${d}.`,
                `Der er ${n} − 1 = ${n - 1} skridt fra det første tal.`,
              ],
              solution: [
                s('Find forskellen.', `d = ${d}`),
                s('Brug formlen.', `a_{${n}} = ${start} + (${n} - 1)\\cdot ${d}`),
                s('Regn ud.', `= ${start} + ${(n - 1) * d} = ${value}`),
              ],
              traps: trapIfDifferent(value, start + n * d, 'tekst-forkert-regneart', `Du gangede med ${n} i stedet for ${n - 1}. Det første tal er allerede a₁, så der er kun ${n - 1} skridt derfra.`),
              concept: 'aₙ = a₁ + (n − 1)·d',
              seconds: 75,
            };
          },
        },
        {
          id: 'moenster-type',
          label: 'Hvilken slags følge?',
          minLevel: 2,
          make: ({ rng }) => {
            const kind = rng.pick(['lineær', 'eksponentiel', 'kvadrat'] as const);
            const seq =
              kind === 'lineær'
                ? (() => { const a = rng.int(1, 9); const d = rng.int(2, 7); return [0, 1, 2, 3, 4].map((i) => a + i * d); })()
                : kind === 'eksponentiel'
                  ? (() => { const a = rng.int(1, 4); const k = rng.pick([2, 3]); return [0, 1, 2, 3, 4].map((i) => a * k ** i); })()
                  : [1, 4, 9, 16, 25];
            return mcq(rng, {
              prompt: `Hvilken slags mønster er ${seq.join(', ')}, … ?`,
              options: [
                { text: 'Lineær: der lægges det samme til hver gang', correct: kind === 'lineær' },
                { text: 'Eksponentiel: der ganges med det samme hver gang', correct: kind === 'eksponentiel', misconceptionId: kind === 'lineær' ? 'eksponentiel-lineaer' : undefined, feedback: kind === 'lineær' ? `Forskellene er ens (${(seq[1] as number) - (seq[0] as number)} hver gang), så der LÆGGES til. Det er lineært.` : undefined },
                { text: 'Kvadrattal', correct: kind === 'kvadrat' },
              ],
              hints: ['Udregn forskellene mellem nabotallene.', 'Er de ens? Prøv ellers at dividere nabotallene.'],
              solution: [s('Undersøg forskelle og kvotienter.', seq.slice(1).map((v, i) => `${v} - ${seq[i]} = ${v - (seq[i] as number)}`).join(',\; '), `Mønstret er ${kind}.`)],
              seconds: 45,
            });
          },
        },
      ],
    },
  ],
};
