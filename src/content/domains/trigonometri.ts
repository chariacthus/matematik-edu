import type { Domain } from '../../types';
import { PYTHAGOREAN_TRIPLES, deg, num, rad, roundTo } from '../../lib/math';
import { lv, mcq, numAns, s, trapIfDifferent } from '../helpers';

export const trigonometri: Domain = {
  id: 'trigonometri',
  name: 'Trigonometri',
  category: 'geometri-maaling',
  area: 'geometriske-egenskaber',
  blurb: 'Sinus, cosinus og tangens — sådan finder du sider og vinkler i retvinklede trekanter.',
  skills: [
    {
      id: 'trig-forhold',
      domainId: 'trigonometri',
      name: 'Sinus, cosinus og tangens',
      goal: 'Du kan vælge det rigtige forhold ud fra hvilke sider opgaven giver dig.',
      prerequisites: ['geo-pythagoras'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Siderne navngives ud fra vinklen', body: 'Hypotenusen er altid den længste side. Den modstående katete ligger OVER FOR vinklen. Den hosliggende ligger op ad vinklen.' },
        { kind: 'rule', title: 'De tre forhold', math: '\\sin v = \\frac{\\text{mod}}{\\text{hyp}} \\quad \\cos v = \\frac{\\text{hos}}{\\text{hyp}} \\quad \\tan v = \\frac{\\text{mod}}{\\text{hos}}' },
        { kind: 'idea', title: 'Huskeregel', body: 'SOH-CAH-TOA: Sinus = Modstående/Hypotenuse, Cosinus = Hosliggende/Hypotenuse, Tangens = Modstående/Hosliggende.' },
        { kind: 'visual', visual: { kind: 'triangle', a: 3, b: 4, c: 5, right: true, angleA: 37, labels: { a: 'modstående', b: 'hosliggende', c: 'hypotenuse', A: 'v' } }, caption: 'Set fra vinkel v.' },
        { kind: 'warning', body: 'Tjek at lommeregneren står i grader (DEG), ikke i radianer (RAD).' },
      ],
      worked: [
        {
          title: 'Hvilket forhold skal jeg bruge?',
          prompt: 'Du kender hypotenusen og skal finde den modstående katete.',
          steps: [
            s('Skriv op hvad du har og hvad du søger.', '\\text{hyp kendt},\; \\text{mod søges}'),
            s('Find det forhold der indeholder netop de to.', '\\sin v = \\frac{\\text{mod}}{\\text{hyp}}'),
            s('Isolér den ukendte.', '\\text{mod} = \\text{hyp} \\cdot \\sin v'),
          ],
          takeaway: 'Skriv altid først ned hvilke to sider der er i spil. Så vælger forholdet sig selv.',
        },
      ],
      generators: [
        {
          id: 'trig-vaelg',
          label: 'Vælg det rigtige forhold',
          make: ({ rng }) => {
            const cases = [
              { known: 'hypotenusen', want: 'den modstående katete', a: 'sinus', why: 'sin v = modstående/hypotenuse — netop de to sider der er i spil.' },
              { known: 'hypotenusen', want: 'den hosliggende katete', a: 'cosinus', why: 'cos v = hosliggende/hypotenuse.' },
              { known: 'den hosliggende katete', want: 'den modstående katete', a: 'tangens', why: 'tan v = modstående/hosliggende — det er det eneste forhold uden hypotenusen.' },
              { known: 'den modstående katete', want: 'hypotenusen', a: 'sinus', why: 'sin v = modstående/hypotenuse indeholder begge.' },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: `Du kender en vinkel og ${c.known}, og du skal finde ${c.want}. Hvilket forhold skal du bruge?`,
              options: [
                { text: 'Sinus', correct: c.a === 'sinus', misconceptionId: c.a !== 'sinus' ? 'trig-forkert-forhold' : undefined, feedback: c.a !== 'sinus' ? `Sinus bruger modstående og hypotenuse. Her er det ${c.a}: ${c.why}` : undefined },
                { text: 'Cosinus', correct: c.a === 'cosinus', misconceptionId: c.a !== 'cosinus' ? 'trig-forkert-forhold' : undefined, feedback: c.a !== 'cosinus' ? `Cosinus bruger hosliggende og hypotenuse. Her er det ${c.a}: ${c.why}` : undefined },
                { text: 'Tangens', correct: c.a === 'tangens', misconceptionId: c.a !== 'tangens' ? 'trig-forkert-forhold' : undefined, feedback: c.a !== 'tangens' ? `Tangens bruger de to kateter. Her er det ${c.a}: ${c.why}` : undefined },
              ],
              hints: [
                'Skriv ned hvilke to sider der er i spil.',
                'SOH-CAH-TOA: find det forhold der lige præcis rummer de to sider.',
              ],
              solution: [s('Se på de to sider.', undefined, c.why)],
              seconds: 40,
            });
          },
        },
        {
          id: 'trig-navngiv',
          label: 'Navngiv siderne',
          make: ({ rng }) => {
            const which = rng.pick(['modstående', 'hosliggende', 'hypotenusen'] as const);
            const desc = {
              modstående: 'Den side der ligger over for vinklen v',
              hosliggende: 'Den korte side der støder op til vinklen v',
              hypotenusen: 'Den længste side, som ligger over for den rette vinkel',
            }[which];
            return mcq(rng, {
              prompt: `${desc} — hvad hedder den, når vi ser fra vinkel v?`,
              options: [
                { text: 'Den modstående katete', correct: which === 'modstående', misconceptionId: which !== 'modstående' ? 'trig-hos-mod' : undefined, feedback: which !== 'modstående' ? 'Den modstående katete ligger over for vinklen — den rører den ikke.' : undefined },
                { text: 'Den hosliggende katete', correct: which === 'hosliggende', misconceptionId: which !== 'hosliggende' ? 'trig-hos-mod' : undefined, feedback: which !== 'hosliggende' ? 'Den hosliggende katete støder op til vinklen (og er ikke hypotenusen).' : undefined },
                { text: 'Hypotenusen', correct: which === 'hypotenusen' },
              ],
              visual: { kind: 'triangle', a: 3, b: 4, c: 5, right: true, angleA: 37, labels: { A: 'v' } },
              hints: ['Peg fra vinklen og tværs over trekanten — det du rammer, er den modstående.', 'Hypotenusen er altid den længste side, over for den rette vinkel.'],
              solution: [s(`${desc}.`, undefined, `Det er ${which === 'hypotenusen' ? 'hypotenusen' : `den ${which} katete`}.`)],
              seconds: 30,
            });
          },
        },
      ],
    },

    {
      id: 'trig-find-side',
      aids: 'med',
      domainId: 'trigonometri',
      name: 'Find en side',
      goal: 'Du kan beregne en manglende side når du kender en vinkel og en side.',
      prerequisites: ['trig-forhold'],
      tier: 5,
      explain: [
        { kind: 'list', title: 'Fremgangsmåde', items: ['1. Tegn og markér vinklen', '2. Navngiv siderne ud fra vinklen', '3. Vælg sin, cos eller tan', '4. Opstil og isolér den ukendte'] },
        { kind: 'math', math: '\\sin v = \\frac{a}{c} \;\\Rightarrow\; a = c \\cdot \\sin v' },
        { kind: 'idea', title: 'Står den ukendte i nævneren?', body: 'Så gang over og divider: hvis sin v = a/c og du søger c, bliver c = a / sin v.' },
      ],
      worked: [
        {
          title: 'Find den modstående katete',
          prompt: 'v = 35^\\circ,\; \\text{hypotenuse} = 12',
          steps: [
            s('Vi kender hypotenusen og søger den modstående.', '\\sin 35^\\circ = \\frac{a}{12}'),
            s('Gang med 12 på begge sider.', 'a = 12 \\cdot \\sin 35^\\circ'),
            s('Regn ud (lommeregner i grader).', 'a \\approx 12 \\cdot 0{,}5736 \\approx 6{,}88'),
          ],
          takeaway: 'Kateten er altid kortere end hypotenusen. Er dit svar større, er noget galt.',
        },
      ],
      generators: [
        {
          id: 'trig-side-sin',
          label: 'Find katete ud fra hypotenuse',
          make: ({ rng, level }) => {
            const v = rng.int(lv(level, [30, 25, 20, 15, 10]), 75);
            const c = rng.int(5, lv(level, [15, 20, 30, 45, 60]));
            const useSin = rng.bool();
            const value = roundTo(c * (useSin ? Math.sin(rad(v)) : Math.cos(rad(v))), 2);
            return {
              prompt: `I en retvinklet trekant er hypotenusen ${c} og den ene spidse vinkel ${v}°. Find den ${useSin ? 'modstående' : 'hosliggende'} katete.`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number' },
              answer: numAns(value, 0.02),
              visual: { kind: 'triangle', c, angleA: v, right: true, labels: { c: String(c), A: `${v}°`, [useSin ? 'a' : 'b']: '?' } },
              hints: [
                `Du kender hypotenusen og søger den ${useSin ? 'modstående' : 'hosliggende'} katete.`,
                `Brug ${useSin ? 'sin' : 'cos'} v = ${useSin ? 'mod' : 'hos'}/hyp.`,
                `Siden = ${c} · ${useSin ? 'sin' : 'cos'}(${v}°)`,
              ],
              solution: [
                s('Opstil forholdet.', `${useSin ? '\\sin' : '\\cos'} ${v}^\\circ = \\frac{x}{${c}}`),
                s(`Gang begge sider med ${c}.`, `x = ${c} \\cdot ${useSin ? '\\sin' : '\\cos'} ${v}^\\circ`),
                s('Regn ud.', `x \\approx ${num(value, 2)}`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(c * (useSin ? Math.cos(rad(v)) : Math.sin(rad(v))), 2), 'trig-forkert-forhold', `Du brugte ${useSin ? 'cos' : 'sin'}. Den ${useSin ? 'modstående' : 'hosliggende'} katete hører sammen med ${useSin ? 'sinus' : 'cosinus'}.`),
                ...trapIfDifferent(value, roundTo(c / (useSin ? Math.sin(rad(v)) : Math.cos(rad(v))), 2), 'trig-forkert-forhold', 'Du dividerede. Den ukendte står i tælleren, så du skal gange hypotenusen med forholdet.'),
              ],
              concept: 'SOH-CAH-TOA',
              seconds: 80,
            };
          },
        },
        {
          id: 'trig-side-tan',
          label: 'Find katete ud fra den anden katete',
          minLevel: 3,
          make: ({ rng, level }) => {
            const v = rng.int(lv(level, [30, 25, 20, 15, 10]), 70);
            const hos = rng.int(4, lv(level, [12, 18, 25, 40, 55]));
            const value = roundTo(hos * Math.tan(rad(v)), 2);
            return {
              prompt: `I en retvinklet trekant er den hosliggende katete til vinklen ${v}° lig ${hos}. Find den modstående katete.`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number' },
              answer: numAns(value, 0.02),
              visual: { kind: 'triangle', a: value, b: hos, right: true, angleA: v, labels: { b: String(hos), a: '?', A: `${v}°` } },
              hints: [
                'Begge sider er kateter, så hypotenusen er ikke i spil.',
                'Brug tan v = modstående/hosliggende.',
                `x = ${hos} · tan(${v}°)`,
              ],
              solution: [
                s('Opstil forholdet.', `\\tan ${v}^\\circ = \\frac{x}{${hos}}`),
                s(`Gang med ${hos}.`, `x = ${hos} \\cdot \\tan ${v}^\\circ`),
                s('Regn ud.', `x \\approx ${num(value, 2)}`),
              ],
              traps: trapIfDifferent(value, roundTo(hos / Math.tan(rad(v)), 2), 'trig-hos-mod', 'Du byttede om på modstående og hosliggende. Den modstående ligger over for vinklen.'),
              concept: 'tan v = mod / hos',
              seconds: 80,
            };
          },
        },
      ],
    },

    {
      id: 'trig-find-vinkel',
      aids: 'med',
      domainId: 'trigonometri',
      name: 'Find en vinkel',
      goal: 'Du kan bruge de omvendte funktioner til at finde en vinkel ud fra to sider.',
      prerequisites: ['trig-find-side'],
      tier: 5,
      explain: [
        { kind: 'idea', title: 'Den omvendte vej', body: 'Kender du forholdet mellem to sider, kan du finde vinklen med sin⁻¹, cos⁻¹ eller tan⁻¹ på lommeregneren.' },
        { kind: 'math', math: '\\sin v = 0{,}6 \;\\Rightarrow\; v = \\sin^{-1}(0{,}6) \\approx 36{,}87^\\circ' },
        { kind: 'warning', body: 'sin⁻¹ betyder IKKE 1/sin. Det er en helt anden knap på lommeregneren (ofte SHIFT + sin).' },
      ],
      worked: [
        {
          title: 'Find vinklen i en 3-4-5-trekant',
          prompt: '\\text{mod} = 3,\; \\text{hyp} = 5',
          steps: [
            s('Vælg forholdet.', '\\sin v = \\frac{3}{5} = 0{,}6'),
            s('Brug den omvendte funktion.', 'v = \\sin^{-1}(0{,}6)'),
            s('Regn ud.', 'v \\approx 36{,}87^\\circ'),
          ],
          takeaway: 'Tjek at svaret er mellem 0° og 90° — det skal en spids vinkel være.',
        },
      ],
      generators: [
        {
          id: 'trig-vinkel-sin',
          label: 'Find vinklen ud fra to sider',
          make: ({ rng, level }) => {
            const [a, b, c] = rng.pick(PYTHAGOREAN_TRIPLES.slice(0, lv(level, [4, 6, 8, 10, 12])));
            const which = rng.pick(['sin', 'cos', 'tan'] as const);
            const ratio = which === 'sin' ? a / c : which === 'cos' ? b / c : a / b;
            const v = roundTo(deg(Math.atan(a / b)), 2);
            const known = which === 'sin' ? `den modstående katete ${a} og hypotenusen ${c}` : which === 'cos' ? `den hosliggende katete ${b} og hypotenusen ${c}` : `den modstående katete ${a} og den hosliggende katete ${b}`;
            return {
              prompt: `I en retvinklet trekant kender du ${known}. Find vinklen $v$.`,
              instruction: 'Rund til to decimaler (i grader).',
              input: { kind: 'number', unit: '°' },
              answer: numAns(v, 0.05),
              visual: { kind: 'triangle', a, b, c, right: true, angleA: v, labels: { a: String(a), b: String(b), c: String(c), A: 'v' } },
              hints: [
                `De to sider peger på ${which === 'sin' ? 'sinus' : which === 'cos' ? 'cosinus' : 'tangens'}.`,
                `${which} v = ${num(roundTo(ratio, 4))}`,
                `Brug ${which}⁻¹ på lommeregneren.`,
              ],
              solution: [
                s('Opstil forholdet.', `\\${which} v = ${which === 'tan' ? `\\frac{${a}}{${b}}` : which === 'sin' ? `\\frac{${a}}{${c}}` : `\\frac{${b}}{${c}}`} = ${num(roundTo(ratio, 4))}`),
                s('Brug den omvendte funktion.', `v = \\${which}^{-1}(${num(roundTo(ratio, 4))})`),
                s('Regn ud.', `v \\approx ${num(v, 2)}^\\circ`),
              ],
              traps: [
                ...trapIfDifferent(v, roundTo(90 - v, 2), 'trig-hos-mod', `Du fandt den ANDEN spidse vinkel. Tjek hvilken side der er modstående i forhold til den vinkel du søger.`),
                ...trapIfDifferent(v, roundTo(ratio, 2), 'trig-forkert-forhold', `${num(roundTo(ratio, 2))} er selve forholdet, ikke vinklen. Brug ${which}⁻¹ for at komme fra forhold til grader.`),
              ],
              seconds: 90,
            };
          },
        },
        {
          id: 'trig-anvendelse',
          label: 'Trigonometri i praksis',
          minLevel: 4,
          make: ({ rng, level }) => {
            const v = rng.int(lv(level, [30, 25, 20, 18, 15]), 70);
            const dist = rng.int(5, lv(level, [20, 30, 40, 60, 90]));
            const height = roundTo(dist * Math.tan(rad(v)), 2);
            const scenario = rng.pick([
              `Du står ${dist} m fra foden af et træ og ser toppen i en vinkel på ${v}° over vandret. Hvor højt er træet?`,
              `En rampe stiger ${v}° og er ${dist} m lang målt vandret. Hvor højt kommer den op?`,
              `Fra et punkt ${dist} m fra en flagstang måles vinklen op til toppen til ${v}°. Hvor høj er flagstangen?`,
            ]);
            return {
              prompt: scenario,
              instruction: 'Rund til to decimaler. Svar i meter.',
              input: { kind: 'number', unit: 'm' },
              answer: numAns(height, 0.02),
              visual: { kind: 'triangle', a: height, b: dist, right: true, angleA: v, labels: { b: `${dist} m`, a: '?', A: `${v}°` } },
              hints: [
                'Tegn situationen som en retvinklet trekant.',
                'Du kender den hosliggende katete (afstanden) og søger den modstående (højden).',
                `Højde = ${dist} · tan(${v}°)`,
              ],
              solution: [
                s('Tegn og navngiv.', undefined, `Afstanden ${dist} m er hosliggende, højden er modstående.`),
                s('Vælg tangens.', `\\tan ${v}^\\circ = \\frac{h}{${dist}}`),
                s('Isolér og regn.', `h = ${dist} \\cdot \\tan ${v}^\\circ \\approx ${num(height, 2)}\\text{ m}`),
              ],
              traps: trapIfDifferent(height, roundTo(dist / Math.tan(rad(v)), 2), 'trig-hos-mod', 'Du vendte forholdet om. Højden er den modstående katete og står i tælleren i tan v.'),
              seconds: 110,
            };
          },
        },
      ],
    },
  ],
};
