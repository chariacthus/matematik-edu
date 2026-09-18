import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, numAns, s, trapIfDifferent } from '../helpers';

const PI = Math.PI;

export const arealRumfang: Domain = {
  id: 'areal-rumfang',
  name: 'Areal og rumfang',
  category: 'geometri',
  icon: '▦',
  blurb: 'Omkreds, areal, overflade og rumfang — og hvornår man bruger hvad.',
  skills: [
    {
      id: 'areal-omkreds',
      domainId: 'areal-rumfang',
      name: 'Omkreds og areal af firkanter',
      goal: 'Du kan beregne omkreds og areal af rektangler og kvadrater — og kender forskellen.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'analogy', body: 'Omkredsen er hegnet rundt om haven. Arealet er græsset indeni. Det er to helt forskellige spørgsmål.' },
        { kind: 'rule', title: 'Rektangel', math: 'O = 2(l + b) \\qquad A = l \\cdot b' },
        { kind: 'visual', visual: { kind: 'rect', w: 6, h: 4, labelW: 'l = 6', labelH: 'b = 4', grid: true }, caption: 'Arealet er 24 tern. Omkredsen er 6+4+6+4 = 20.' },
        { kind: 'warning', body: 'Enheden afslører hvad du har regnet: cm for omkreds, cm² for areal. Har du fået cm² men skulle bruge omkreds, er der noget galt.' },
      ],
      worked: [
        {
          title: 'Rektangel 7 cm × 5 cm',
          prompt: 'Find omkreds og areal',
          steps: [
            s('Omkreds: hele vejen rundt.', 'O = 2(7 + 5) = 2 \\cdot 12 = 24\\text{ cm}'),
            s('Areal: længde gange bredde.', 'A = 7 \\cdot 5 = 35\\text{ cm}^2'),
          ],
          takeaway: 'Omkreds lægger sammen. Areal ganger. Derfor de forskellige enheder.',
        },
      ],
      generators: [
        {
          id: 'rekt-areal',
          label: 'Areal af rektangel',
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [10, 15, 25, 40, 60]));
            const b = rng.int(2, lv(level, [10, 15, 25, 40, 60]));
            return {
              prompt: `Et rektangel er ${l} cm langt og ${b} cm bredt. Hvad er arealet?`,
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(l * b),
              visual: { kind: 'rect', w: l, h: b, labelW: `${l} cm`, labelH: `${b} cm`, grid: l * b <= 120 },
              hints: ['Areal af et rektangel er længde gange bredde.', `${l} · ${b}`],
              solution: [s('Brug formlen.', `A = l \\cdot b = ${l} \\cdot ${b} = ${l * b}\\text{ cm}^2`)],
              traps: trapIfDifferent(l * b, 2 * (l + b), 'areal-omkreds', `${2 * (l + b)} cm er OMKREDSEN. Arealet er fladen indeni og findes ved at gange: ${l} · ${b} = ${l * b} cm².`),
              concept: 'A = l · b',
              seconds: 35,
            };
          },
        },
        {
          id: 'rekt-omkreds',
          label: 'Omkreds af rektangel',
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [10, 15, 25, 40, 60]));
            const b = rng.int(2, lv(level, [10, 15, 25, 40, 60]));
            return {
              prompt: `Et rektangel er ${l} cm langt og ${b} cm bredt. Hvad er omkredsen?`,
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(2 * (l + b)),
              visual: { kind: 'rect', w: l, h: b, labelW: `${l} cm`, labelH: `${b} cm` },
              hints: ['Omkredsen er turen hele vejen rundt.', `${l} + ${b} + ${l} + ${b}`, `Eller 2 · (${l} + ${b})`],
              solution: [
                s('Læg alle fire sider sammen.', `O = ${l} + ${b} + ${l} + ${b}`),
                s('Eller brug formlen.', `O = 2(${l} + ${b}) = ${2 * (l + b)}\\text{ cm}`),
              ],
              traps: trapIfDifferent(2 * (l + b), l * b, 'areal-omkreds', `${l * b} cm² er AREALET. Omkredsen er turen rundt om figuren: 2 · (${l} + ${b}) = ${2 * (l + b)} cm.`),
              concept: 'O = 2(l + b)',
              seconds: 35,
            };
          },
        },
        {
          id: 'rekt-baglaens',
          label: 'Find den manglende side',
          minLevel: 2,
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const b = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const fromArea = rng.bool();
            return {
              prompt: fromArea
                ? `Et rektangel har arealet ${l * b} cm² og er ${l} cm langt. Hvor bredt er det?`
                : `Et rektangel har omkredsen ${2 * (l + b)} cm og er ${l} cm langt. Hvor bredt er det?`,
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(b, 0.005),
              hints: [
                fromArea ? 'A = l · b. Isolér b.' : 'O = 2(l + b). Isolér b.',
                fromArea ? `b = ${l * b} : ${l}` : `Divider omkredsen med 2: ${2 * (l + b)} : 2 = ${l + b}. Det er l + b.`,
                fromArea ? undefined : `Træk ${l} fra.`,
              ].filter((h): h is string => Boolean(h)),
              solution: fromArea
                ? [s('Isolér b i arealformlen.', `b = \\frac{A}{l} = \\frac{${l * b}}{${l}} = ${b}\\text{ cm}`)]
                : [
                    s('Halvér omkredsen.', `\\frac{${2 * (l + b)}}{2} = ${l + b}`, 'Det er l + b.'),
                    s('Træk længden fra.', `${l + b} - ${l} = ${b}\\text{ cm}`),
                  ],
              traps: fromArea
                ? trapIfDifferent(b, roundTo(l * b - l, 4), 'areal-omkreds', 'Arealet er et produkt, så du skal dividere — ikke trække fra.')
                : trapIfDifferent(b, 2 * (l + b) - l, 'areal-omkreds', `Du glemte at omkredsen tæller hver side to gange. Halvér først: ${2 * (l + b)} : 2 = ${l + b}.`),
              seconds: 60,
            };
          },
        },
      ],
    },

    {
      id: 'areal-trekant',
      domainId: 'areal-rumfang',
      name: 'Areal af trekant og trapez',
      goal: 'Du kan beregne arealet af en trekant og et trapez.',
      prerequisites: ['areal-omkreds'],
      tier: 2,
      explain: [
        { kind: 'rule', title: 'Trekant', math: 'A = \\frac{1}{2} \\cdot h \\cdot g', body: 'g er grundlinjen, h er højden vinkelret ned på grundlinjen.' },
        { kind: 'analogy', body: 'En trekant er præcis det halve af et rektangel med samme grundlinje og højde. Derfor den halve.' },
        { kind: 'rule', title: 'Trapez', math: 'A = \\frac{(a + b)}{2} \\cdot h', body: 'a og b er de to parallelle sider. Man tager gennemsnittet af dem og ganger med højden.' },
        { kind: 'warning', body: 'Højden skal stå VINKELRET på grundlinjen. Den skrå side er ikke højden.' },
      ],
      worked: [
        {
          title: 'Trekant med g = 12 og h = 5',
          prompt: 'A = ?',
          steps: [
            s('Sæt ind i formlen.', 'A = \\tfrac{1}{2} \\cdot 5 \\cdot 12'),
            s('Gang de to tal.', '= \\tfrac{1}{2} \\cdot 60'),
            s('Halvér.', '= 30\\text{ cm}^2'),
          ],
          takeaway: 'Gang de to tal først, halvér til sidst — det er nemmest i hovedet.',
        },
      ],
      generators: [
        {
          id: 'trekant-areal',
          label: 'Areal af trekant',
          make: ({ rng, level }) => {
            const g = rng.int(2, lv(level, [12, 16, 24, 40, 60]));
            const h = rng.int(2, lv(level, [12, 16, 24, 40, 60]));
            const value = roundTo((g * h) / 2, 4);
            return {
              prompt: `En trekant har grundlinjen ${g} cm og højden ${h} cm. Hvad er arealet?`,
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value, 0.005),
              visual: { kind: 'triangle', a: h, b: g, right: true, labels: { a: `h = ${h}`, b: `g = ${g}` } },
              hints: ['Brug A = ½ · h · g.', `${h} · ${g} = ${h * g}`, 'Halvér resultatet.'],
              solution: [
                s('Sæt ind i formlen.', `A = \\frac{1}{2} \\cdot ${h} \\cdot ${g}`),
                s('Gang først.', `= \\frac{1}{2} \\cdot ${h * g}`),
                s('Halvér.', `= ${num(value)}\\text{ cm}^2`),
              ],
              traps: trapIfDifferent(value, g * h, 'areal-omkreds', `Du glemte at halvere. En trekant er halvdelen af et rektangel med samme grundlinje og højde: ${g * h} : 2 = ${num(value)}.`),
              concept: 'A = ½ · h · g',
              seconds: 40,
            };
          },
        },
        {
          id: 'trapez-areal',
          label: 'Areal af trapez',
          minLevel: 3,
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const b = a + rng.int(2, lv(level, [6, 8, 12, 18, 25]));
            const h = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const value = roundTo(((a + b) / 2) * h, 4);
            return {
              prompt: `Et trapez har de parallelle sider ${a} cm og ${b} cm og højden ${h} cm. Hvad er arealet?`,
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value, 0.005),
              hints: [
                'Brug A = (a + b)/2 · h.',
                `${a} + ${b} = ${a + b}, og halvdelen er ${num((a + b) / 2)}.`,
                `Gang med højden ${h}.`,
              ],
              solution: [
                s('Læg de parallelle sider sammen.', `${a} + ${b} = ${a + b}`),
                s('Tag gennemsnittet.', `\\frac{${a + b}}{2} = ${num((a + b) / 2)}`),
                s('Gang med højden.', `${num((a + b) / 2)} \\cdot ${h} = ${num(value)}\\text{ cm}^2`),
              ],
              traps: trapIfDifferent(value, roundTo((a + b) * h, 4), 'areal-omkreds', 'Du glemte at dividere med 2. Formlen bruger gennemsnittet af de to parallelle sider.'),
              concept: 'A = (a + b)/2 · h',
              seconds: 60,
            };
          },
        },
      ],
    },

    {
      id: 'areal-cirkel',
      domainId: 'areal-rumfang',
      name: 'Cirklens omkreds og areal',
      goal: 'Du kan beregne omkreds og areal af en cirkel.',
      prerequisites: ['areal-omkreds'],
      tier: 3,
      explain: [
        { kind: 'rule', title: 'Omkreds', math: 'O = 2 \\pi r = \\pi d', body: 'r er radius (fra centrum til kanten), d er diameteren (hele vejen igennem). d = 2r.' },
        { kind: 'rule', title: 'Areal', math: 'A = \\pi r^2' },
        { kind: 'visual', visual: { kind: 'circle', r: 4, show: ['radius', 'diameter'], label: 'r' }, caption: 'Diameteren er dobbelt så lang som radius.' },
        { kind: 'idea', title: 'Hvad er π?', body: 'π er forholdet mellem omkreds og diameter — det samme tal for alle cirkler, cirka 3,14.' },
        { kind: 'warning', body: 'Bland ikke formlerne sammen. r i anden hører til arealet — det passer med at areal måles i cm².' },
      ],
      worked: [
        {
          title: 'Cirkel med r = 6 cm',
          prompt: 'Find omkreds og areal',
          steps: [
            s('Omkreds.', 'O = 2 \\pi \\cdot 6 = 12\\pi \\approx 37{,}70\\text{ cm}'),
            s('Areal.', 'A = \\pi \\cdot 6^2 = 36\\pi \\approx 113{,}10\\text{ cm}^2'),
          ],
          takeaway: 'Kvadrér radius FØR du ganger med π. Ikke (πr)².',
        },
      ],
      generators: [
        {
          id: 'cirkel-omkreds',
          label: 'Omkreds af cirkel',
          make: ({ rng, level }) => {
            const r = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const fromDiameter = level >= 3 && rng.bool(0.4);
            const value = roundTo(2 * PI * r, 2);
            return {
              prompt: fromDiameter
                ? `En cirkel har diameteren ${2 * r} cm. Hvad er omkredsen?`
                : `En cirkel har radius ${r} cm. Hvad er omkredsen?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(value, 0.05),
              visual: { kind: 'circle', r, show: fromDiameter ? ['diameter'] : ['radius'], label: fromDiameter ? `d = ${2 * r}` : `r = ${r}` },
              hints: [
                fromDiameter ? 'O = π · d — eller find radius først.' : 'O = 2 · π · r',
                fromDiameter ? `π · ${2 * r}` : `2 · π · ${r}`,
                'Brug π ≈ 3,14159.',
              ],
              solution: [
                ...(fromDiameter ? [s('Diameteren er allerede kendt.', `d = ${2 * r}`)] : [s('Radius er kendt.', `r = ${r}`)]),
                s('Brug omkredsformlen.', fromDiameter ? `O = \\pi \\cdot ${2 * r}` : `O = 2\\pi \\cdot ${r}`),
                s('Regn ud.', `O \\approx ${num(value, 2)}\\text{ cm}`),
              ],
              traps: trapIfDifferent(value, roundTo(PI * r * r, 2), 'cirkel-areal-formel', `Du brugte arealformlen πr². Omkredsen er 2πr ≈ ${num(value, 2)} cm.`),
              concept: 'O = 2πr',
              seconds: 50,
            };
          },
        },
        {
          id: 'cirkel-areal',
          label: 'Areal af cirkel',
          minLevel: 2,
          make: ({ rng, level }) => {
            const r = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const value = roundTo(PI * r * r, 2);
            return {
              prompt: `En cirkel har radius ${r} cm. Hvad er arealet?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value, 0.05),
              visual: { kind: 'circle', r, show: ['radius'], label: `r = ${r}` },
              hints: ['A = π · r²', `Kvadrér radius først: ${r}² = ${r * r}.`, `Gang med π.`],
              solution: [
                s('Kvadrér radius.', `${r}^2 = ${r * r}`),
                s('Gang med π.', `A = \\pi \\cdot ${r * r} \\approx ${num(value, 2)}\\text{ cm}^2`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(2 * PI * r, 2), 'cirkel-areal-formel', `Du brugte 2πr, som er OMKREDSEN. Arealet er πr² ≈ ${num(value, 2)} cm².`),
                ...trapIfDifferent(value, roundTo((PI * r) ** 2, 2), 'cirkel-areal-formel', `Du kvadrerede hele πr. Det er kun radius der skal kvadreres: π · ${r}² = ${num(value, 2)}.`),
              ],
              concept: 'A = πr²',
              seconds: 50,
            };
          },
        },
        {
          id: 'cirkel-baglaens',
          label: 'Find radius',
          minLevel: 4,
          make: ({ rng, level }) => {
            const r = rng.int(2, lv(level, [8, 10, 15, 25, 40]));
            const o = roundTo(2 * PI * r, 2);
            return {
              prompt: `En cirkel har omkredsen ${num(o, 2)} cm. Hvad er radius?`,
              instruction: 'Rund til én decimal.',
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(r, 0.06),
              hints: [
                'Start med formlen O = 2πr og isolér r.',
                'r = O / (2π)',
                `${num(o, 2)} : ${num(roundTo(2 * PI, 4), 4)}`,
              ],
              solution: [
                s('Isolér r.', `r = \\frac{O}{2\\pi}`),
                s('Indsæt.', `r = \\frac{${num(o, 2)}}{2\\pi} \\approx ${r}\\text{ cm}`),
              ],
              traps: trapIfDifferent(r, roundTo(o / PI, 2), 'cirkel-areal-formel', `Du dividerede kun med π. Det giver diameteren. Radius er halvdelen: ${num(roundTo(o / PI, 2), 2)} : 2 = ${r}.`),
              seconds: 70,
            };
          },
        },
      ],
    },

    {
      id: 'areal-sammensat',
      domainId: 'areal-rumfang',
      name: 'Sammensatte figurer',
      goal: 'Du kan finde arealet af en figur der er sat sammen af flere enkle figurer.',
      prerequisites: ['areal-trekant', 'areal-cirkel'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Del figuren op', body: 'Enhver sammensat figur kan deles i rektangler, trekanter og cirkeldele. Regn hver del for sig og læg sammen.' },
        { kind: 'idea', title: 'Eller træk fra', body: 'Nogle gange er det lettere at tage hele det store rektangel og trække det udskårne hul fra.' },
        { kind: 'list', title: 'Fremgangsmåde', items: ['Tegn figuren og markér delene', 'Skriv hvilke mål du kender for hver del', 'Beregn hvert delareal', 'Læg sammen — eller træk fra'] },
      ],
      worked: [
        {
          title: 'Rektangel med halvcirkel på enden',
          prompt: 'Rektangel 10 × 6 med en halvcirkel med diameter 6 for enden',
          steps: [
            s('Rektanglets areal.', '10 \\cdot 6 = 60'),
            s('Halvcirklens radius er halvdelen af 6.', 'r = 3'),
            s('Halvcirklens areal.', '\\tfrac{1}{2}\\pi \\cdot 3^2 = \\tfrac{9\\pi}{2} \\approx 14{,}14'),
            s('Læg sammen.', '60 + 14{,}14 = 74{,}14\\text{ cm}^2'),
          ],
          takeaway: 'Skriv delene op hver for sig. Så mister du ikke overblikket.',
        },
      ],
      generators: [
        {
          id: 'sammensat-hul',
          label: 'Figur med udskæring',
          make: ({ rng, level }) => {
            const l = rng.int(6, lv(level, [12, 16, 22, 30, 40]));
            const b = rng.int(4, lv(level, [10, 14, 20, 26, 36]));
            const hl = rng.int(2, Math.max(2, Math.floor(l / 2)));
            const hb = rng.int(2, Math.max(2, Math.floor(b / 2)));
            const value = l * b - hl * hb;
            return {
              prompt: `Et rektangel er ${l} cm × ${b} cm. Der skæres et rektangulært hul på ${hl} cm × ${hb} cm ud af det. Hvad er arealet af det der er tilbage?`,
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value),
              visual: { kind: 'rect', w: l, h: b, labelW: `${l} cm`, labelH: `${b} cm` },
              hints: [
                'Find først arealet af hele rektanglet.',
                `${l} · ${b} = ${l * b} cm²`,
                `Træk hullets areal fra: ${hl} · ${hb} = ${hl * hb}.`,
              ],
              solution: [
                s('Hele rektanglets areal.', `${l} \\cdot ${b} = ${l * b}`),
                s('Hullets areal.', `${hl} \\cdot ${hb} = ${hl * hb}`),
                s('Træk fra.', `${l * b} - ${hl * hb} = ${value}\\text{ cm}^2`),
              ],
              traps: trapIfDifferent(value, l * b + hl * hb, 'areal-omkreds', 'Hullet skæres ud, så dets areal skal trækkes fra — ikke lægges til.'),
              seconds: 75,
            };
          },
        },
        {
          id: 'sammensat-halvcirkel',
          label: 'Rektangel med halvcirkel',
          minLevel: 3,
          make: ({ rng, level }) => {
            const b = rng.int(2, lv(level, [6, 8, 10, 14, 20])) * 2;
            const l = rng.int(b, lv(level, [14, 18, 24, 32, 45]));
            const r = b / 2;
            const value = roundTo(l * b + 0.5 * PI * r * r, 2);
            return {
              prompt: `En figur består af et rektangel på ${l} cm × ${b} cm med en halvcirkel sat på den ${b} cm lange side. Hvad er det samlede areal?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value, 0.05),
              hints: [
                'Del figuren i to: et rektangel og en halvcirkel.',
                `Rektanglet: ${l} · ${b} = ${l * b} cm².`,
                `Halvcirklen har radius ${b}/2 = ${r}. Arealet er ½ · π · ${r}².`,
              ],
              solution: [
                s('Rektanglets areal.', `${l} \\cdot ${b} = ${l * b}`),
                s('Halvcirklens radius.', `r = \\frac{${b}}{2} = ${r}`),
                s('Halvcirklens areal.', `\\frac{1}{2}\\pi \\cdot ${r}^2 \\approx ${num(roundTo(0.5 * PI * r * r, 2), 2)}`),
                s('Læg sammen.', `${l * b} + ${num(roundTo(0.5 * PI * r * r, 2), 2)} = ${num(value, 2)}\\text{ cm}^2`),
              ],
              traps: trapIfDifferent(value, roundTo(l * b + PI * r * r, 2), 'cirkel-areal-formel', 'Det er en HALV cirkel, så cirklens areal skal divideres med 2.'),
              seconds: 100,
            };
          },
        },
      ],
    },

    {
      id: 'rumfang-kasse',
      domainId: 'areal-rumfang',
      name: 'Rumfang af kasser og prismer',
      goal: 'Du kan beregne rumfang af kasser og prismer.',
      prerequisites: ['areal-omkreds'],
      tier: 2,
      explain: [
        { kind: 'rule', title: 'Kasse', math: 'V = l \\cdot b \\cdot h' },
        { kind: 'rule', title: 'Prisme (generelt)', math: 'V = A_{\\text{grundflade}} \\cdot h', body: 'Ethvert prisme: find arealet af grundfladen og gang med højden.' },
        { kind: 'visual', visual: { kind: 'solid', type: 'box', dims: { w: 6, h: 4, d: 3 }, labels: { w: 'l', h: 'h', d: 'b' } } },
        { kind: 'warning', body: 'Rumfang måles i cm³ (eller m³, liter). Tre dimensioner → eksponent 3.' },
        { kind: 'idea', title: 'Liter og cm³', body: '1 liter = 1000 cm³. En terning på 10 × 10 × 10 cm rummer præcis 1 liter.' },
      ],
      worked: [
        {
          title: 'Kasse 8 × 5 × 3 cm',
          prompt: 'V = ?',
          steps: [
            s('Gang de to første.', '8 \\cdot 5 = 40', 'Det er grundfladens areal.'),
            s('Gang med højden.', '40 \\cdot 3 = 120'),
            s('Enhed.', 'V = 120\\text{ cm}^3'),
          ],
          takeaway: 'Grundfladen gange højden — det virker for alle prismer.',
        },
      ],
      generators: [
        {
          id: 'kasse-rumfang',
          label: 'Rumfang af kasse',
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [8, 10, 15, 25, 40]));
            const b = rng.int(2, lv(level, [8, 10, 15, 25, 40]));
            const h = rng.int(2, lv(level, [8, 10, 15, 25, 40]));
            return {
              prompt: `En kasse er ${l} cm lang, ${b} cm bred og ${h} cm høj. Hvad er rumfanget?`,
              input: { kind: 'number', unit: 'cm³' },
              answer: numAns(l * b * h),
              visual: { kind: 'solid', type: 'box', dims: { w: l, h, d: b }, labels: { w: `${l}`, h: `${h}`, d: `${b}` } },
              hints: ['V = l · b · h', `${l} · ${b} = ${l * b}`, `Gang med højden ${h}.`],
              solution: [
                s('Find grundfladens areal.', `${l} \\cdot ${b} = ${l * b}`),
                s('Gang med højden.', `${l * b} \\cdot ${h} = ${l * b * h}\\text{ cm}^3`),
              ],
              traps: trapIfDifferent(l * b * h, l * b, 'rumfang-to-dimensioner', `${l * b} cm² er grundfladens AREAL. Rumfang kræver den tredje dimension: gang med højden ${h}.`),
              concept: 'V = l · b · h',
              seconds: 40,
            };
          },
        },
        {
          id: 'prisme-rumfang',
          label: 'Rumfang af prisme',
          minLevel: 3,
          make: ({ rng, level }) => {
            const g = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const hTri = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const h = rng.int(2, lv(level, [8, 12, 18, 25, 35]));
            const base = roundTo((g * hTri) / 2, 4);
            const value = roundTo(base * h, 4);
            return {
              prompt: `Et prisme har en trekantet grundflade med grundlinje ${g} cm og højde ${hTri} cm. Prismet er ${h} cm højt. Hvad er rumfanget?`,
              input: { kind: 'number', unit: 'cm³' },
              answer: numAns(value, 0.005),
              visual: { kind: 'solid', type: 'prism', dims: { w: g, h, d: hTri } },
              hints: [
                'Først grundfladens areal — det er en trekant.',
                `A = ½ · ${hTri} · ${g} = ${num(base)} cm²`,
                `Gang med prismets højde ${h}.`,
              ],
              solution: [
                s('Grundfladens areal (trekant).', `A = \\frac{1}{2}\\cdot ${hTri} \\cdot ${g} = ${num(base)}`),
                s('Gang med højden.', `V = ${num(base)} \\cdot ${h} = ${num(value)}\\text{ cm}^3`),
              ],
              traps: trapIfDifferent(value, roundTo(g * hTri * h, 4), 'rumfang-to-dimensioner', 'Grundfladen er en TREKANT, så dens areal er det halve af g · h. Husk ½.'),
              concept: 'V = grundflade · højde',
              seconds: 70,
            };
          },
        },
        {
          id: 'rumfang-liter',
          label: 'Rumfang og liter',
          minLevel: 2,
          make: ({ rng, level }) => {
            const l = rng.int(10, lv(level, [20, 30, 40, 60, 90]));
            const b = rng.int(10, lv(level, [20, 30, 40, 60, 90]));
            const h = rng.int(10, lv(level, [20, 30, 40, 60, 90]));
            const cm3 = l * b * h;
            const liter = roundTo(cm3 / 1000, 4);
            return {
              prompt: `Et akvarium er ${l} cm × ${b} cm × ${h} cm. Hvor mange liter vand kan der være i det?`,
              input: { kind: 'number', unit: 'L' },
              answer: numAns(liter, 0.005),
              visual: { kind: 'solid', type: 'box', dims: { w: l, h, d: b }, labels: { w: `${l}`, h: `${h}`, d: `${b}` } },
              hints: [
                'Find først rumfanget i cm³.',
                `${l} · ${b} · ${h} = ${cm3} cm³`,
                '1 liter = 1000 cm³, så divider med 1000.',
              ],
              solution: [
                s('Rumfang i cm³.', `${l} \\cdot ${b} \\cdot ${h} = ${cm3}`),
                s('Omregn til liter.', `${cm3} : 1000 = ${num(liter)}\\text{ L}`),
              ],
              traps: trapIfDifferent(liter, cm3, 'enhed-potens', `${cm3} er svaret i cm³. Der spørges om liter, og 1 L = 1000 cm³.`),
              seconds: 70,
            };
          },
        },
      ],
    },

    {
      id: 'rumfang-cylinder',
      domainId: 'areal-rumfang',
      name: 'Cylinder, kegle og kugle',
      goal: 'Du kan beregne rumfang af de runde rumfigurer.',
      prerequisites: ['areal-cirkel', 'rumfang-kasse'],
      tier: 4,
      explain: [
        { kind: 'rule', title: 'Cylinder', math: 'V = \\pi r^2 \\cdot h', body: 'Grundfladen er en cirkel — gang dens areal med højden.' },
        { kind: 'rule', title: 'Kegle', math: 'V = \\frac{1}{3} \\pi r^2 h', body: 'Præcis en tredjedel af cylinderen med samme grundflade og højde.' },
        { kind: 'rule', title: 'Kugle', math: 'V = \\frac{4}{3} \\pi r^3' },
        { kind: 'visual', visual: { kind: 'solid', type: 'cylinder', dims: { r: 3, h: 7 }, labels: { r: 'r', h: 'h' } } },
        { kind: 'idea', title: 'Husk mønsteret', body: 'Cylinder → hel. Kegle → en tredjedel. Kugle → fire tredjedele af πr³.' },
      ],
      worked: [
        {
          title: 'Cylinder med r = 4 cm og h = 10 cm',
          prompt: 'V = ?',
          steps: [
            s('Grundfladens areal.', 'A = \\pi \\cdot 4^2 = 16\\pi \\approx 50{,}27'),
            s('Gang med højden.', 'V = 50{,}27 \\cdot 10'),
            s('Resultat.', 'V \\approx 502{,}65\\text{ cm}^3'),
          ],
          takeaway: 'Regn grundfladen først, og gem afrundingen til allersidst.',
        },
      ],
      generators: [
        {
          id: 'cylinder-rumfang',
          label: 'Rumfang af cylinder',
          make: ({ rng, level }) => {
            const r = rng.int(2, lv(level, [5, 7, 10, 15, 22]));
            const h = rng.int(2, lv(level, [8, 12, 18, 25, 35]));
            const value = roundTo(PI * r * r * h, 2);
            return {
              prompt: `En cylinder har radius ${r} cm og højde ${h} cm. Hvad er rumfanget?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'cm³' },
              answer: numAns(value, 0.2),
              visual: { kind: 'solid', type: 'cylinder', dims: { r, h }, labels: { r: `${r}`, h: `${h}` } },
              hints: ['V = π · r² · h', `Grundfladen: π · ${r}² ≈ ${num(roundTo(PI * r * r, 2), 2)} cm².`, `Gang med højden ${h}.`],
              solution: [
                s('Grundfladens areal.', `A = \\pi \\cdot ${r}^2 \\approx ${num(roundTo(PI * r * r, 2), 2)}`),
                s('Gang med højden.', `V \\approx ${num(roundTo(PI * r * r, 2), 2)} \\cdot ${h} = ${num(value, 2)}\\text{ cm}^3`),
              ],
              traps: trapIfDifferent(value, roundTo(2 * PI * r * h, 2), 'cirkel-areal-formel', 'Du brugte 2πr, som er cirklens omkreds. Grundfladens AREAL er πr².'),
              concept: 'V = πr²h',
              seconds: 60,
            };
          },
        },
        {
          id: 'kegle-kugle',
          label: 'Kegle og kugle',
          minLevel: 4,
          make: ({ rng, level }) => {
            const r = rng.int(2, lv(level, [5, 6, 8, 12, 18]));
            const h = rng.int(3, lv(level, [8, 10, 15, 20, 30]));
            const isKegle = rng.bool();
            const value = isKegle ? roundTo((1 / 3) * PI * r * r * h, 2) : roundTo((4 / 3) * PI * r ** 3, 2);
            return {
              prompt: isKegle
                ? `En kegle har radius ${r} cm og højde ${h} cm. Hvad er rumfanget?`
                : `En kugle har radius ${r} cm. Hvad er rumfanget?`,
              instruction: 'Rund til to decimaler.',
              input: { kind: 'number', unit: 'cm³' },
              answer: numAns(value, 0.2),
              visual: { kind: 'solid', type: isKegle ? 'cone' : 'sphere', dims: { r, h }, labels: { r: `${r}`, h: isKegle ? `${h}` : '' } },
              hints: [
                isKegle ? 'V = ⅓ · π · r² · h' : 'V = ⁴⁄₃ · π · r³',
                isKegle ? `π · ${r}² · ${h} ≈ ${num(roundTo(PI * r * r * h, 2), 2)}` : `${r}³ = ${r ** 3}`,
                isKegle ? 'Divider med 3.' : 'Gang med 4/3 · π.',
              ],
              solution: isKegle
                ? [
                    s('Cylinderens rumfang først.', `\\pi \\cdot ${r}^2 \\cdot ${h} \\approx ${num(roundTo(PI * r * r * h, 2), 2)}`),
                    s('Keglen er en tredjedel af den.', `V \\approx ${num(value, 2)}\\text{ cm}^3`),
                  ]
                : [
                    s('Kvadrér og kubér radius.', `${r}^3 = ${r ** 3}`),
                    s('Brug kugleformlen.', `V = \\frac{4}{3}\\pi \\cdot ${r ** 3} \\approx ${num(value, 2)}\\text{ cm}^3`),
                  ],
              traps: isKegle
                ? trapIfDifferent(value, roundTo(PI * r * r * h, 2), 'rumfang-to-dimensioner', 'Det er cylinderens rumfang. Keglen er kun en tredjedel så stor.')
                : trapIfDifferent(value, roundTo(PI * r ** 3, 2), 'rumfang-to-dimensioner', 'Faktoren 4/3 mangler. Kuglens rumfang er ⁴⁄₃ · πr³.'),
              seconds: 80,
            };
          },
        },
        {
          id: 'overflade-kasse',
          label: 'Overfladeareal',
          minLevel: 3,
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const b = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const h = rng.int(2, lv(level, [8, 10, 14, 20, 30]));
            const value = 2 * (l * b + l * h + b * h);
            return {
              prompt: `En kasse er ${l} cm × ${b} cm × ${h} cm. Hvad er overfladearealet?`,
              input: { kind: 'number', unit: 'cm²' },
              answer: numAns(value),
              visual: { kind: 'solid', type: 'box', dims: { w: l, h, d: b }, labels: { w: `${l}`, h: `${h}`, d: `${b}` } },
              hints: [
                'En kasse har 6 sider — tre forskellige par.',
                `${l}·${b} = ${l * b}, ${l}·${h} = ${l * h}, ${b}·${h} = ${b * h}`,
                'Læg de tre sammen og gang med 2.',
              ],
              solution: [
                s('De tre forskellige sideflader.', `${l * b},\; ${l * h},\; ${b * h}`),
                s('Hver findes to gange.', `O = 2(${l * b} + ${l * h} + ${b * h}) = ${value}\\text{ cm}^2`),
              ],
              traps: trapIfDifferent(value, l * b * h, 'enhed-potens', `${l * b * h} cm³ er RUMFANGET. Overfladearealet er summen af de seks sideflader og måles i cm².`),
              concept: 'O = 2(lb + lh + bh)',
              seconds: 80,
            };
          },
        },
      ],
    },
  ],
};
