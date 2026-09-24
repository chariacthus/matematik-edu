import type { Domain } from '../../types';
import { PYTHAGOREAN_TRIPLES, num, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const geometri: Domain = {
  id: 'geometri',
  name: 'Geometri',
  category: 'geometri-maaling',
  area: 'geometriske-egenskaber',
  blurb: 'Vinkler, trekanter, firkanter, cirklen og Pythagoras.',
  skills: [
    {
      id: 'geo-vinkler',
      domainId: 'geometri',
      name: 'Vinkler',
      goal: 'Du kan bestemme ukendte vinkler ud fra vinkelsummer og vinkelpar.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'list', title: 'Vinkeltyper', items: ['Spids vinkel: under 90°', 'Ret vinkel: præcis 90°', 'Stump vinkel: mellem 90° og 180°', 'Lige vinkel: 180°'] },
        { kind: 'rule', title: 'Vinkler på en ret linje', math: 'v + u = 180^\\circ', body: 'To nabovinkler på en ret linje giver tilsammen 180°.' },
        { kind: 'rule', title: 'Hele vejen rundt', math: '\\text{Vinkler om et punkt} = 360^\\circ' },
        { kind: 'idea', title: 'Topvinkler', body: 'Når to linjer skærer hinanden, er de vinkler der ligger over for hinanden lige store.' },
        { kind: 'visual', visual: { kind: 'angles', type: 'lines', values: [65, null, null, null], labels: ['65°', 'a', 'b', 'c'] }, caption: 'a er nabovinkel til 65° (giver 180°). b er topvinkel til 65° og er derfor også 65°.' },
      ],
      worked: [
        {
          title: 'To linjer skærer hinanden',
          prompt: 'Den ene vinkel er 65°. Find de tre andre.',
          steps: [
            s('Nabovinklen ligger på en ret linje.', '180^\\circ - 65^\\circ = 115^\\circ'),
            s('Topvinklen er lige stor med den givne.', '65^\\circ'),
            s('Den sidste er topvinkel til nabovinklen.', '115^\\circ'),
            s('Kontrol: alle fire skal give 360°.', '65 + 115 + 65 + 115 = 360 \;\\checkmark'),
          ],
          takeaway: 'Der er kun to forskellige vinkler i figuren. De gentager sig over kryds.',
        },
      ],
      generators: [
        {
          id: 'vinkel-nabo',
          label: 'Nabovinkel',
          make: ({ rng, level }) => {
            const v = rng.int(lv(level, [20, 15, 10, 10, 5]), lv(level, [70, 80, 160, 170, 175]));
            return {
              prompt: `To vinkler ligger som nabovinkler på en ret linje. Den ene er ${v}°. Hvor stor er den anden?`,
              input: { kind: 'number', unit: '°' },
              answer: numAns(180 - v),
              visual: { kind: 'angles', type: 'straight', values: [v], labels: [`${v}°`, 'v'] },
              hints: [
                'To nabovinkler på en ret linje giver tilsammen 180°.',
                `180° − ${v}°`,
              ],
              solution: [
                s('Nabovinkler giver 180° tilsammen.', `v = 180^\\circ - ${v}^\\circ`),
                s('Regn ud.', `v = ${180 - v}^\\circ`),
              ],
              traps: trapIfDifferent(180 - v, 360 - v, 'vinkelsum-forkert', 'Du brugte 360°. Det gælder hele vejen rundt om et punkt. På en ret linje er summen 180°.'),
              seconds: 30,
            };
          },
        },
        {
          id: 'vinkel-punkt',
          label: 'Vinkler om et punkt',
          minLevel: 2,
          make: ({ rng, level }) => {
            const n = lv(level, [3, 3, 3, 4, 4]);
            const parts: number[] = [];
            let rest = 360;
            for (let i = 0; i < n - 1; i++) {
              const v = rng.int(30, Math.max(40, Math.floor(rest / (n - i)) + 30));
              parts.push(v);
              rest -= v;
            }
            if (rest < 10) return { prompt: 'Tre vinkler om et punkt er 120°, 90° og v. Hvor stor er v?', input: { kind: 'number' as const, unit: '°' }, answer: numAns(150), hints: ['Vinklerne om et punkt giver 360°.', '360 − 120 − 90'], solution: [s('Træk fra 360°.', '360 - 120 - 90 = 150')], seconds: 35 };
            return {
              prompt: `${n} vinkler ligger rundt om det samme punkt. ${n - 1} af dem er ${parts.join('°, ')}°. Hvor stor er den sidste?`,
              input: { kind: 'number', unit: '°' },
              answer: numAns(rest),
              hints: [
                'Hele vejen rundt om et punkt er der 360°.',
                `360° − ${parts.join(' − ')}°`,
                `De kendte vinkler giver tilsammen ${parts.reduce((a, b) => a + b, 0)}°.`,
              ],
              solution: [
                s('Vinkler om et punkt giver 360°.', `v = 360^\\circ - (${parts.join(' + ')})^\\circ`),
                s('Regn ud.', `v = 360^\\circ - ${parts.reduce((a, b) => a + b, 0)}^\\circ = ${rest}^\\circ`),
              ],
              traps: trapIfDifferent(rest, 180 - parts.reduce((a, b) => a + b, 0), 'vinkelsum-forkert', 'Du brugte 180°. Rundt om et punkt er summen 360°.'),
              seconds: 45,
            };
          },
        },
        {
          id: 'vinkel-type',
          label: 'Hvilken type vinkel?',
          make: ({ rng }) => {
            const v = rng.int(5, 175);
            const type = v < 90 ? 'Spids' : v === 90 ? 'Ret' : 'Stump';
            return mcq(rng, {
              prompt: `En vinkel er ${v}°. Hvilken type er det?`,
              options: [
                { text: 'Spids vinkel', correct: type === 'Spids' },
                { text: 'Ret vinkel', correct: type === 'Ret' },
                { text: 'Stump vinkel', correct: type === 'Stump' },
              ],
              visual: { kind: 'angles', type: 'single', values: [v, null], labels: [`${v}°`, ''] },
              hints: ['Sammenlign med 90°.', 'Under 90° er spids, præcis 90° er ret, over 90° er stump.'],
              solution: [s(`${v}° er ${v < 90 ? 'mindre end' : v === 90 ? 'præcis' : 'større end'} 90°.`, undefined, `Derfor er det en ${type.toLowerCase()} vinkel.`)],
              seconds: 20,
            });
          },
        },
      ],
    },

    {
      id: 'geo-trekanter',
      domainId: 'geometri',
      name: 'Trekanter',
      goal: 'Du kan bestemme vinkler i en trekant og genkende de forskellige trekanttyper.',
      prerequisites: ['geo-vinkler'],
      tier: 2,
      explain: [
        { kind: 'rule', title: 'Vinkelsummen', math: 'A + B + C = 180^\\circ', body: 'Uanset hvordan trekanten ser ud, giver de tre vinkler tilsammen 180°.' },
        { kind: 'list', title: 'Trekanttyper efter sider', items: ['Ligesidet: alle tre sider lige lange, alle vinkler 60°', 'Ligebenet: to sider lige lange, og de to vinkler ved grundlinjen er lige store', 'Skæv: alle sider forskellige'] },
        { kind: 'list', title: 'Efter vinkler', items: ['Retvinklet: én vinkel er 90°', 'Spidsvinklet: alle vinkler under 90°', 'Stumpvinklet: én vinkel over 90°'] },
        { kind: 'warning', body: 'Vinkelsummen er 180°, ikke 360°. Det er firkanten der har 360°.' },
      ],
      worked: [
        {
          title: 'Find den sidste vinkel',
          prompt: 'A = 47^\\circ,\; B = 68^\\circ. \\text{ Find } C.',
          steps: [
            s('Læg de kendte vinkler sammen.', '47 + 68 = 115'),
            s('Træk fra vinkelsummen.', '180 - 115 = 65'),
            s('Svar.', 'C = 65^\\circ'),
          ],
          takeaway: 'To vinkler er altid nok: den tredje følger af sig selv.',
        },
      ],
      generators: [
        {
          id: 'trekant-vinkelsum',
          label: 'Find den manglende vinkel',
          make: ({ rng, level }) => {
            const A = rng.int(lv(level, [30, 25, 20, 15, 11]), 80);
            const B = rng.int(20, Math.max(25, 170 - A));
            const C = 180 - A - B;
            if (C < 5) {
              return { prompt: 'I en trekant er A = 60° og B = 70°. Hvor stor er C?', input: { kind: 'number' as const, unit: '°' }, answer: numAns(50), hints: ['Vinkelsummen i en trekant er 180°.', '180 − 60 − 70'], solution: [s('Træk de kendte fra 180°.', '180 - 60 - 70 = 50')], seconds: 35 };
            }
            return {
              prompt: `I en trekant er $A = ${A}^\\circ$ og $B = ${B}^\\circ$. Hvor stor er $C$?`,
              input: { kind: 'number', unit: '°' },
              answer: numAns(C),
              visual: { kind: 'triangle', angleA: A, angleB: B, labels: { A: `${A}°`, B: `${B}°` }, caption: 'C er den sidste vinkel.' },
              hints: [
                'Vinkelsummen i en trekant er 180°.',
                `${A} + ${B} = ${A + B}`,
                `180 − ${A + B}`,
              ],
              solution: [
                s('Vinkelsummen er 180°.', `A + B + C = 180^\\circ`),
                s('Indsæt de kendte.', `${A} + ${B} + C = 180`),
                s('Isolér C.', `C = 180 - ${A + B} = ${C}^\\circ`),
              ],
              traps: trapIfDifferent(C, 360 - A - B, 'vinkelsum-forkert', 'Du brugte 360°. En trekant har vinkelsum 180°. Det er firkanten der har 360°.'),
              concept: 'A + B + C = 180°',
              seconds: 40,
            };
          },
        },
        {
          id: 'trekant-ligebenet',
          label: 'Ligebenet trekant',
          minLevel: 2,
          make: ({ rng, level }) => {
            const top = rng.int(lv(level, [20, 20, 16, 12, 10]), 140);
            const base = roundTo((180 - top) / 2, 2);
            return {
              prompt: `En ligebenet trekant har topvinkel ${top}°. Hvor store er de to lige store grundvinkler?`,
              input: { kind: 'number', unit: '°' },
              answer: numAns(base, 0.05),
              visual: { kind: 'triangle', angleA: base, angleB: base, labels: { A: 'v', B: 'v' }, caption: `Topvinklen er ${top}°.` },
              hints: [
                'I en ligebenet trekant er de to vinkler ved grundlinjen lige store.',
                `De to grundvinkler giver tilsammen 180° − ${top}° = ${180 - top}°.`,
                'Del det tal i to.',
              ],
              solution: [
                s('Træk topvinklen fra vinkelsummen.', `180^\\circ - ${top}^\\circ = ${180 - top}^\\circ`),
                s('De to grundvinkler er lige store.', `${180 - top} : 2 = ${num(base)}^\\circ`),
              ],
              traps: trapIfDifferent(base, 180 - top, 'vinkelsum-forkert', `${180 - top}° er hvad de TO vinkler giver tilsammen. Hver af dem er halvdelen.`),
              seconds: 55,
            };
          },
        },
        {
          id: 'trekant-type',
          label: 'Hvilken slags trekant?',
          make: ({ rng }) => {
            const kind = rng.pick(['ret', 'ligesidet', 'ligebenet', 'stump'] as const);
            const data =
              kind === 'ret' ? { A: 90, B: rng.int(20, 60) }
              : kind === 'ligesidet' ? { A: 60, B: 60 }
              : kind === 'stump' ? { A: rng.int(100, 140), B: rng.int(15, 35) }
              : { A: 50, B: 50 };
            const C = 180 - data.A - data.B;
            const answers = {
              ret: 'Retvinklet',
              ligesidet: 'Ligesidet',
              ligebenet: 'Ligebenet',
              stump: 'Stumpvinklet',
            };
            return mcq(rng, {
              prompt: `En trekant har vinklerne ${data.A}°, ${data.B}° og ${C}°. Hvilken beskrivelse passer bedst?`,
              options: [
                { text: 'Retvinklet', correct: kind === 'ret' },
                { text: 'Ligesidet', correct: kind === 'ligesidet' },
                { text: 'Ligebenet (men ikke ligesidet)', correct: kind === 'ligebenet' },
                { text: 'Stumpvinklet', correct: kind === 'stump' },
              ],
              hints: [
                'Er der en vinkel på præcis 90°? Så er den retvinklet.',
                'Er alle tre vinkler 60°? Så er den ligesidet.',
                'Er to vinkler lige store? Så er den ligebenet.',
              ],
              solution: [s(`Vinklerne er ${data.A}°, ${data.B}° og ${C}°.`, undefined, `Derfor: ${answers[kind].toLowerCase()}.`)],
              seconds: 40,
            });
          },
        },
      ],
    },

    {
      id: 'geo-firkanter',
      domainId: 'geometri',
      name: 'Firkanter',
      goal: 'Du kan kende firkanternes egenskaber og finde manglende vinkler.',
      prerequisites: ['geo-vinkler'],
      tier: 2,
      explain: [
        { kind: 'rule', title: 'Vinkelsum i en firkant', math: 'A + B + C + D = 360^\\circ', body: 'En firkant kan deles i to trekanter. Derfor 2 · 180° = 360°.' },
        { kind: 'list', title: 'Firkanttyper', items: ['Kvadrat: fire lige sider, fire rette vinkler', 'Rektangel: fire rette vinkler, modstående sider lige lange', 'Parallelogram: modstående sider parallelle og lige lange', 'Rombe: fire lige sider, men ikke nødvendigvis rette vinkler', 'Trapez: mindst ét par parallelle sider'] },
        { kind: 'idea', title: 'Et kvadrat er også et rektangel', body: 'Alle kvadrater opfylder rektanglets krav. Modsat gælder det ikke.' },
      ],
      worked: [
        {
          title: 'Find den sidste vinkel i en firkant',
          prompt: 'A = 95^\\circ,\; B = 80^\\circ,\; C = 110^\\circ',
          steps: [
            s('Læg de kendte sammen.', '95 + 80 + 110 = 285'),
            s('Træk fra 360°.', '360 - 285 = 75'),
            s('Svar.', 'D = 75^\\circ'),
          ],
          takeaway: 'Del firkanten i to trekanter, hvis du glemmer hvorfor det er 360°.',
        },
      ],
      generators: [
        {
          id: 'firkant-vinkelsum',
          label: 'Manglende vinkel i firkant',
          make: ({ rng, level }) => {
            const A = rng.int(lv(level, [60, 50, 45, 40, 35]), 120);
            const B = rng.int(50, 130);
            const C = rng.int(50, Math.max(60, 340 - A - B));
            const D = 360 - A - B - C;
            if (D < 10) {
              return { prompt: 'I en firkant er tre vinkler 90°, 80° og 100°. Hvor stor er den fjerde?', input: { kind: 'number' as const, unit: '°' }, answer: numAns(90), hints: ['Vinkelsummen i en firkant er 360°.', '360 − 90 − 80 − 100'], solution: [s('Træk fra 360°.', '360 - 270 = 90')], seconds: 40 };
            }
            return {
              prompt: `I en firkant er tre vinkler ${A}°, ${B}° og ${C}°. Hvor stor er den fjerde?`,
              input: { kind: 'number', unit: '°' },
              answer: numAns(D),
              hints: [
                'Vinkelsummen i en firkant er 360°.',
                `${A} + ${B} + ${C} = ${A + B + C}`,
                `360 − ${A + B + C}`,
              ],
              solution: [
                s('Vinkelsummen i en firkant.', 'A + B + C + D = 360^\\circ'),
                s('Læg de kendte sammen.', `${A} + ${B} + ${C} = ${A + B + C}`),
                s('Træk fra.', `D = 360 - ${A + B + C} = ${D}^\\circ`),
              ],
              traps: trapIfDifferent(D, 180 - A - B - C, 'vinkelsum-forkert', 'Du brugte 180°. Det er trekantens vinkelsum. Firkanten har 360°.'),
              seconds: 45,
            };
          },
        },
        {
          id: 'firkant-type',
          label: 'Firkanternes egenskaber',
          make: ({ rng }) => {
            const cases = [
              { q: 'Hvilken firkant har fire lige lange sider OG fire rette vinkler?', a: 'Kvadrat', wrong: ['Rektangel', 'Rombe', 'Parallelogram'] },
              { q: 'Hvilken firkant har fire lige lange sider, men ikke nødvendigvis rette vinkler?', a: 'Rombe', wrong: ['Rektangel', 'Trapez', 'Kvadrat'] },
              { q: 'Hvilken firkant har mindst ét par parallelle sider?', a: 'Trapez', wrong: ['Kvadrat', 'Rombe', 'Rektangel'] },
              { q: 'Hvilken firkant har modstående sider parallelle og lige lange, men ikke nødvendigvis rette vinkler?', a: 'Parallelogram', wrong: ['Rektangel', 'Kvadrat', 'Trapez'] },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: c.q,
              options: [{ text: c.a, correct: true }, ...c.wrong.map((w) => ({ text: w }))],
              hints: ['Tænk på hvilke krav der stilles til sider, og hvilke der stilles til vinkler.', 'Tegn figuren og se om den opfylder alle kravene.'],
              solution: [s('Sammenhold kravene med hver figur.', undefined, `Svaret er ${c.a.toLowerCase()}.`)],
              seconds: 35,
            });
          },
        },
      ],
    },

    {
      id: 'geo-pythagoras',
      domainId: 'geometri',
      name: 'Pythagoras',
      goal: 'Du kan finde en manglende side i en retvinklet trekant.',
      prerequisites: ['rod-kvadratrod', 'geo-trekanter'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Pythagoras’ sætning', math: 'a^2 + b^2 = c^2', body: 'c er hypotenusen, den længste side, der ligger over for den rette vinkel. a og b er kateterne.' },
        { kind: 'visual', visual: { kind: 'triangle', a: 3, b: 4, c: 5, right: true, labels: { a: 'a', b: 'b', c: 'c' } }, caption: '3² + 4² = 9 + 16 = 25 = 5². Den klassiske 3-4-5-trekant.' },
        { kind: 'idea', title: 'Skal du finde en katete?', body: 'Så vend formlen: a² = c² − b². Træk kvadratet på den kendte katete fra kvadratet på hypotenusen.' },
        { kind: 'warning', body: 'Sætningen gælder KUN i retvinklede trekanter. Og c er altid den længste side.' },
      ],
      worked: [
        {
          title: 'Find hypotenusen',
          prompt: 'a = 6,\; b = 8. \\text{ Find } c.',
          steps: [
            s('Sæt ind i formlen.', '6^2 + 8^2 = c^2'),
            s('Regn kvadraterne.', '36 + 64 = c^2'),
            s('Læg sammen.', '100 = c^2'),
            s('Tag kvadratroden.', 'c = \\sqrt{100} = 10'),
          ],
          takeaway: 'Svaret skal altid være større end hver af kateterne, men mindre end deres sum.',
        },
      ],
      generators: [
        {
          id: 'pyt-hypotenuse',
          label: 'Find hypotenusen',
          make: ({ rng, level }) => {
            const [a, b, c] = rng.pick(PYTHAGOREAN_TRIPLES.slice(0, lv(level, [3, 5, 8, 10, 12])));
            return {
              prompt: `En retvinklet trekant har kateterne $a = ${a}$ og $b = ${b}$. Find hypotenusen $c$.`,
              input: { kind: 'number' },
              answer: numAns(c, 0.005),
              visual: { kind: 'triangle', a, b, c, right: true, labels: { a: String(a), b: String(b), c: 'c' }, highlight: ['c'] },
              hints: [
                'Brug a² + b² = c².',
                `${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}`,
                `c = √${a * a + b * b}`,
              ],
              solution: [
                s('Sæt ind i Pythagoras.', `${a}^2 + ${b}^2 = c^2`),
                s('Regn kvadraterne.', `${a * a} + ${b * b} = ${a * a + b * b}`),
                s('Tag kvadratroden.', `c = \\sqrt{${a * a + b * b}} = ${c}`),
              ],
              traps: [
                ...trapIfDifferent(c, a + b, 'pythagoras-uden-kvadrat', `Du lagde siderne sammen. Pythagoras handler om KVADRATERNE: ${a}² + ${b}² = ${a * a + b * b}, og c = √${a * a + b * b} = ${c}.`),
                ...trapIfDifferent(c, a * a + b * b, 'pythagoras-uden-kvadrat', `Du glemte kvadratroden. ${a * a + b * b} er c², ikke c. Tag roden: √${a * a + b * b} = ${c}.`),
              ],
              concept: 'a² + b² = c²',
              seconds: 60,
            };
          },
        },
        {
          id: 'pyt-katete',
          label: 'Find en katete',
          minLevel: 2,
          make: ({ rng, level }) => {
            const [a, b, c] = rng.pick(PYTHAGOREAN_TRIPLES.slice(0, lv(level, [3, 5, 8, 10, 12])));
            const findA = rng.bool();
            const known = findA ? b : a;
            const answer = findA ? a : b;
            return {
              prompt: `En retvinklet trekant har hypotenusen $c = ${c}$ og den ene katete $= ${known}$. Find den anden katete.`,
              input: { kind: 'number' },
              answer: numAns(answer, 0.005),
              visual: { kind: 'triangle', a, b, c, right: true, labels: { a: findA ? '?' : String(a), b: findA ? String(b) : '?', c: String(c) }, highlight: findA ? ['a'] : ['b'] },
              hints: [
                'Du kender hypotenusen, så formlen skal vendes.',
                `katete² = c² − ${known}² = ${c * c} − ${known * known}`,
                `= ${c * c - known * known}. Tag så kvadratroden.`,
              ],
              solution: [
                s('Vend formlen.', `\\text{katete}^2 = c^2 - ${known}^2`),
                s('Indsæt.', `= ${c * c} - ${known * known} = ${c * c - known * known}`),
                s('Tag kvadratroden.', `= \\sqrt{${c * c - known * known}} = ${answer}`),
              ],
              traps: [
                ...trapIfDifferent(answer, roundTo(Math.sqrt(c * c + known * known), 4), 'pythagoras-katete', `Du lagde kvadraterne sammen. Men ${c} er hypotenusen, så den kendte katete skal TRÆKKES FRA: ${c * c} − ${known * known} = ${c * c - known * known}.`),
                ...trapIfDifferent(answer, c - known, 'pythagoras-uden-kvadrat', `Du trak siderne fra hinanden. Det er kvadraterne der skal trækkes fra: ${c}² − ${known}² = ${c * c - known * known}, og svaret er √${c * c - known * known} = ${answer}.`),
              ],
              concept: 'Katete: a² = c² − b²',
              seconds: 70,
            };
          },
        },
        {
          id: 'pyt-anvendelse',
          label: 'Pythagoras i praksis',
          minLevel: 3,
          make: ({ rng, level }) => {
            const [a, b, c] = rng.pick(PYTHAGOREAN_TRIPLES.slice(2, lv(level, [6, 6, 8, 10, 12])));
            const scenario = rng.pick([
              { text: `En stige på ${c} m står op ad en mur. Stigens fod står ${b} m fra muren. Hvor højt op ad muren når stigen?`, answer: a, unknown: 'a' as const },
              { text: `En flagstang er ${a} m høj. Der spændes en wire fra toppen ned til et punkt ${b} m fra foden. Hvor lang er wiren?`, answer: c, unknown: 'c' as const },
              { text: `En rektangulær have er ${a} m gange ${b} m. Hvor lang er stien tværs over fra hjørne til hjørne?`, answer: c, unknown: 'c' as const },
            ]);
            return {
              prompt: scenario.text,
              instruction: 'Svar i meter.',
              input: { kind: 'number', unit: 'm' },
              answer: numAns(scenario.answer, 0.005),
              visual: {
                kind: 'triangle',
                a,
                b,
                c,
                right: true,
                labels: {
                  a: scenario.unknown === 'a' ? '?' : `${a} m`,
                  b: `${b} m`,
                  c: scenario.unknown === 'c' ? '?' : `${c} m`,
                },
                highlight: [scenario.unknown],
              },
              hints: [
                'Tegn situationen. Der dannes en retvinklet trekant.',
                'Find ud af hvilke to sider du kender, og om den ukendte er hypotenusen eller en katete.',
                scenario.answer === c ? `Den ukendte er hypotenusen: c = √(${a}² + ${b}²).` : `Den ukendte er en katete: a = √(${c}² − ${b}²).`,
              ],
              solution: [
                s('Tegn og find den retvinklede trekant.'),
                s(scenario.answer === c ? 'Den søgte side er hypotenusen.' : 'Den søgte side er en katete.', scenario.answer === c ? `c^2 = ${a}^2 + ${b}^2 = ${c * c}` : `a^2 = ${c}^2 - ${b}^2 = ${a * a}`),
                s('Tag kvadratroden.', `= ${scenario.answer}\\text{ m}`),
              ],
              seconds: 100,
            };
          },
        },
      ],
    },

    {
      id: 'geo-ligedannethed',
      domainId: 'geometri',
      name: 'Ligedannethed og kongruens',
      goal: 'Du kan bruge skalafaktoren til at finde manglende sider i ligedannede figurer.',
      prerequisites: ['geo-trekanter', 'forhold-grund'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Kongruente figurer', body: 'Kongruente figurer er helt ens: samme form OG samme størrelse. De kan lægges oven på hinanden.' },
        { kind: 'idea', title: 'Ligedannede figurer', body: 'Ligedannede figurer har samme form, men forskellig størrelse. Alle vinkler er ens, og alle sider er skaleret med den samme faktor.' },
        { kind: 'rule', title: 'Skalafaktor', math: 'k = \\frac{\\text{side i den store}}{\\text{tilsvarende side i den lille}}' },
        { kind: 'warning', body: 'Ligedannethed handler om at GANGE med en faktor, ikke om at lægge det samme til alle sider.' },
      ],
      worked: [
        {
          title: 'To ligedannede trekanter',
          prompt: 'Den lille har siderne 3 og 5. Den store har 9 som modsvarer 3. Find den sidste side.',
          steps: [
            s('Find skalafaktoren.', 'k = \\frac{9}{3} = 3'),
            s('Gang den anden side med faktoren.', '5 \\cdot 3 = 15'),
            s('Kontrol.', '\\frac{15}{5} = 3 \;\\checkmark', 'Samme faktor i begge forhold.'),
          ],
          takeaway: 'Find skalafaktoren først. Så er resten bare gange eller dividere.',
        },
      ],
      generators: [
        {
          id: 'ligedan-side',
          label: 'Find den manglende side',
          make: ({ rng, level }) => {
            const k = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const a = rng.int(2, lv(level, [6, 8, 10, 12, 15]));
            const b = rng.int(2, lv(level, [6, 8, 10, 12, 15]));
            return {
              prompt: `To trekanter er ligedannede. Den lille har siderne ${a} cm og ${b} cm. I den store svarer ${a * k} cm til siden på ${a} cm. Hvor lang er den side der svarer til ${b} cm?`,
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(b * k, 0.005),
              hints: [
                'Find først skalafaktoren.',
                `k = ${a * k} : ${a} = ${k}`,
                `Gang ${b} med ${k}.`,
              ],
              solution: [
                s('Find skalafaktoren.', `k = \\frac{${a * k}}{${a}} = ${k}`),
                s('Gang den anden side med faktoren.', `${b} \\cdot ${k} = ${b * k}`),
              ],
              traps: [
                ...trapIfDifferent(b * k, b + (a * k - a), 'ligedannet-plus', `Du lagde ${a * k - a} til. Ved ligedannethed GANGES alle sider med den samme faktor, her ${k}.`),
                ...trapIfDifferent(b * k, roundTo(b / k, 4), 'ligedannet-plus', `Du dividerede. Den store figur er ${k} gange større, så siden skal ganges med ${k}.`),
              ],
              concept: 'Alle sider ganges med den samme skalafaktor.',
              seconds: 70,
            };
          },
        },
        {
          id: 'ligedan-faktor',
          label: 'Find skalafaktoren',
          make: ({ rng, level }) => {
            const k = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const a = rng.int(2, lv(level, [8, 10, 12, 15, 20]));
            return {
              prompt: `En figur forstørres, så en side på ${a} cm bliver til ${a * k} cm. Hvad er skalafaktoren?`,
              input: { kind: 'number' },
              answer: numAns(k, 0.005),
              hints: [
                'Skalafaktoren er forholdet mellem den nye og den gamle side.',
                `${a * k} : ${a}`,
              ],
              solution: [s('Del den nye side med den gamle.', `k = \\frac{${a * k}}{${a}} = ${k}`)],
              traps: trapIfDifferent(k, a * k - a, 'ligedannet-plus', `${a * k - a} er forskellen i cm. Skalafaktoren er hvor mange GANGE større figuren er blevet: ${a * k} : ${a} = ${k}.`),
              seconds: 40,
            };
          },
        },
      ],
    },
  ],
};
