import type { Domain } from '../../types';
import { fracAdd, fracDiv, fracMul, fracSub, fracTexBig, fracValue, gcd, lcm, reduce, roundTo } from '../../lib/math';
import { fracAns, lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const broeker: Domain = {
  id: 'broeker',
  name: 'Brøker',
  category: 'tal-algebra',
  icon: '1/2',
  blurb: 'Fra at forstå hvad en brøk er, til at regne med dem uden at tænke over det.',
  skills: [
    /* ---------------------------------------------------------------- */
    {
      id: 'broek-forstaa',
      domainId: 'broeker',
      name: 'Hvad er en brøk?',
      goal: 'Du kan aflæse en brøk og forklare hvad tæller og nævner betyder.',
      prerequisites: [],
      tier: 1,
      explain: [
        {
          kind: 'analogy',
          body: 'Tænk på en pizza. Nævneren fortæller hvor mange stykker pizzaen er skåret i. Tælleren fortæller hvor mange af stykkerne du har taget.',
        },
        {
          kind: 'rule',
          title: 'Brøkens to tal',
          math: '\\frac{\\text{tæller}}{\\text{nævner}} \\quad\\text{fx}\\quad \\frac{3}{4}',
          body: 'Tælleren står øverst — den tæller stykkerne. Nævneren står nederst — den nævner hvor store de er.',
        },
        {
          kind: 'visual',
          visual: {
            kind: 'fractionBar',
            rows: [
              { num: 3, den: 4, label: '3/4' },
              { num: 5, den: 8, label: '5/8' },
            ],
          },
          caption: '3/4 er mere end 5/8 — selvom både 5 og 8 er større tal.',
        },
        {
          kind: 'warning',
          body: 'Jo større nævner, jo mindre er hvert stykke. 1/8 er mindre end 1/3, ikke større.',
        },
      ],
      worked: [
        {
          title: 'Hvor stor en del er farvet?',
          prompt: 'En bjælke er delt i 6 lige store dele. 4 af dem er farvet.',
          steps: [
            s('Nævneren er antallet af lige store dele.', '\\text{nævner} = 6'),
            s('Tælleren er antallet af farvede dele.', '\\text{tæller} = 4'),
            s('Brøken er altså.', '\\frac{4}{6}'),
            s('Den kan forkortes med 2.', '\\frac{4}{6} = \\frac{2}{3}'),
          ],
          takeaway: 'Brøken skrives altid tæller over nævner — og forkortes hvis den kan.',
        },
      ],
      generators: [
        {
          id: 'broek-aflaes',
          label: 'Aflæs brøken af en figur',
          make: ({ rng, level }) => {
            const den = rng.int(lv(level, [3, 4, 5, 6, 8]), lv(level, [6, 8, 10, 12, 16]));
            const numr = rng.int(1, den - 1);
            return {
              prompt: 'Hvor stor en del af bjælken er farvet? Skriv svaret som en brøk.',
              instruction: 'Skriv fx 3/4.',
              input: { kind: 'fraction' },
              answer: fracAns({ n: numr, d: den }),
              visual: { kind: 'fractionBar', rows: [{ num: numr, den, tone: 'brand' }] },
              hints: [
                'Tæl først hvor mange lige store dele bjælken er delt i. Det er nævneren.',
                'Tæl derefter hvor mange der er farvet. Det er tælleren.',
                `Bjælken har ${den} dele, og ${numr} er farvet.`,
              ],
              solution: [
                s('Antal dele i alt bliver nævneren.', `\\text{nævner} = ${den}`),
                s('Antal farvede dele bliver tælleren.', `\\text{tæller} = ${numr}`),
                s('Brøken er.', `\\frac{${numr}}{${den}}`),
              ],
              seconds: 30,
            };
          },
        },
        {
          id: 'broek-stoerst',
          label: 'Hvilken brøk er størst?',
          make: ({ rng, level }) => {
            const pool = lv<[number, number][]>(level, [
              [[1, 2], [1, 3], [1, 4], [1, 6]],
              [[1, 2], [1, 3], [2, 3], [3, 4]],
              [[2, 3], [3, 4], [5, 8], [1, 2]],
              [[3, 5], [5, 8], [7, 12], [2, 3]],
              [[5, 9], [7, 12], [4, 7], [9, 16]],
            ]);
            const picks = rng.sample(pool, 3);
            const best = picks.reduce((a, b) => (a[0] / a[1] >= b[0] / b[1] ? a : b));
            const biggestDen = picks.reduce((a, b) => (a[1] >= b[1] ? a : b));
            return mcq(rng, {
              prompt: 'Hvilken brøk er størst?',
              options: picks.map((f) => ({
                text: `${f[0]}/${f[1]}`,
                correct: f === best,
                misconceptionId: f === biggestDen && f !== best ? 'broek-stoerre-naevner' : undefined,
                feedback: f === biggestDen && f !== best ? `${f[0]}/${f[1]} har den største nævner, men det gør netop stykkerne mindre. Omsæt til decimaltal og sammenlign: ${f[0]}/${f[1]} = ${roundTo(f[0] / f[1], 3)}` : undefined,
              })),
              visual: { kind: 'fractionBar', rows: picks.map((f) => ({ num: f[0], den: f[1], label: `${f[0]}/${f[1]}` })) },
              hints: [
                'Tegn brøkerne som bjælker, eller find en fælles nævner.',
                'Du kan også dividere tæller med nævner og sammenligne decimaltallene.',
                `${best[0]}/${best[1]} = ${roundTo(best[0] / best[1], 3)}`,
              ],
              solution: [
                s('Omsæt hver brøk til decimaltal.', picks.map((f) => `\\frac{${f[0]}}{${f[1]}} = ${roundTo(f[0] / f[1], 3)}`).join(',\\quad ')),
                s('Den største er.', `\\frac{${best[0]}}{${best[1]}}`),
              ],
              seconds: 40,
            });
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'broek-forkort',
      domainId: 'broeker',
      name: 'Forkorte og udvide',
      goal: 'Du kan forkorte en brøk til den enkleste form og udvide til en ønsket nævner.',
      prerequisites: ['broek-forstaa'],
      tier: 2,
      explain: [
        {
          kind: 'idea',
          title: 'Samme værdi, andet udseende',
          body: 'Brøker kan skrives på uendeligt mange måder. 1/2, 2/4 og 50/100 er præcis det samme tal.',
        },
        {
          kind: 'rule',
          title: 'Forkort og udvid',
          math: '\\frac{a}{b} = \\frac{a \\cdot k}{b \\cdot k} = \\frac{a : k}{b : k}',
          body: 'Så længe du gør nøjagtig det samme med tæller og nævner, ændrer værdien sig ikke.',
        },
        {
          kind: 'warning',
          body: 'At dividere kun tælleren er ikke forkortning — det ændrer brøkens værdi.',
        },
      ],
      worked: [
        {
          title: 'Forkort 18/24',
          prompt: '\\frac{18}{24}',
          steps: [
            s('Find det største tal der går op i begge.', '\\text{SFD}(18, 24) = 6'),
            s('Divider både tæller og nævner med 6.', '\\frac{18 : 6}{24 : 6}'),
            s('Resultat.', '= \\frac{3}{4}', '3 og 4 har ingen fælles divisor — brøken er nu uforkortelig.'),
          ],
          takeaway: 'Bruger du den største fælles divisor, er du færdig på ét skridt.',
        },
      ],
      generators: [
        {
          id: 'forkort',
          label: 'Forkort brøken',
          make: ({ rng, level }) => {
            const base = rng.pick([
              [1, 2], [2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [5, 6], [3, 8], [5, 8], [7, 10], [4, 9], [5, 12],
            ]) as [number, number];
            const k = rng.int(2, lv(level, [3, 4, 6, 9, 12]));
            const n = base[0] * k;
            const d = base[1] * k;
            return {
              prompt: `Forkort brøken $\\frac{${n}}{${d}}$ mest muligt.`,
              input: { kind: 'fraction' },
              answer: { type: 'fraction', value: { n: base[0], d: base[1] }, requireReduced: true },
              hints: [
                'Hvilke tal går op i både tæller og nævner?',
                `Prøv at dividere begge med ${gcd(n, d) > 2 ? 2 : gcd(n, d)}.`,
                `Den største fælles divisor er ${gcd(n, d)}.`,
              ],
              solution: [
                s('Find største fælles divisor.', `\\text{SFD}(${n}, ${d}) = ${gcd(n, d)}`),
                s('Divider begge med den.', `\\frac{${n} : ${gcd(n, d)}}{${d} : ${gcd(n, d)}} = \\frac{${base[0]}}{${base[1]}}`),
              ],
              concept: 'Forkortning: divider tæller OG nævner med det samme tal.',
              seconds: 40,
            };
          },
        },
        {
          id: 'udvid',
          label: 'Udvid til given nævner',
          make: ({ rng, level }) => {
            const base = rng.pick([[1, 2], [2, 3], [3, 4], [1, 5], [3, 5], [5, 6], [3, 8]]) as [number, number];
            const k = rng.int(2, lv(level, [4, 5, 7, 9, 12]));
            const target = base[1] * k;
            return {
              prompt: `Udvid $\\frac{${base[0]}}{${base[1]}}$ så nævneren bliver ${target}. Hvad bliver tælleren?`,
              input: { kind: 'number' },
              answer: numAns(base[0] * k),
              hints: [
                `Hvad skal ${base[1]} ganges med for at blive ${target}?`,
                `${base[1]} · ${k} = ${target}.`,
                'Gang tælleren med præcis det samme tal.',
              ],
              solution: [
                s('Find faktoren.', `${target} : ${base[1]} = ${k}`),
                s('Gang tælleren med den samme faktor.', `${base[0]} \\cdot ${k} = ${base[0] * k}`),
                s('Brøken bliver.', `\\frac{${base[0]}}{${base[1]}} = \\frac{${base[0] * k}}{${target}}`),
              ],
              traps: trapIfDifferent(base[0] * k, base[0] + k, 'broek-forkort-taeller', `Du lagde til i stedet for at gange. Nævneren blev ganget med ${k}, så tælleren skal også ganges med ${k}.`),
              seconds: 40,
            };
          },
        },
        {
          id: 'faellesnaevner',
          label: 'Find fællesnævner',
          minLevel: 2,
          make: ({ rng, level }) => {
            const d1 = rng.int(2, lv(level, [5, 6, 8, 10, 12]));
            let d2 = rng.int(2, lv(level, [5, 6, 8, 10, 12]));
            while (d2 === d1) d2 = rng.int(2, 12);
            return {
              prompt: `Hvad er den mindste fællesnævner for $\\frac{1}{${d1}}$ og $\\frac{1}{${d2}}$?`,
              input: { kind: 'number' },
              answer: numAns(lcm(d1, d2)),
              hints: [
                `Skriv tabellerne op: ${d1}, ${d1 * 2}, ${d1 * 3} … og ${d2}, ${d2 * 2}, ${d2 * 3} …`,
                'Det første tal der står i begge rækker, er den mindste fællesnævner.',
                `Prøv ${lcm(d1, d2)}.`,
              ],
              solution: [
                s('Multipla af den første nævner.', `${[1, 2, 3, 4, 5, 6].map((i) => d1 * i).join(', ')} \\dots`),
                s('Multipla af den anden nævner.', `${[1, 2, 3, 4, 5, 6].map((i) => d2 * i).join(', ')} \\dots`),
                s('Det mindste fælles tal.', `\\text{MFN} = ${lcm(d1, d2)}`),
              ],
              traps: trapIfDifferent(lcm(d1, d2), d1 + d2, 'broek-add-naevnere', 'Du lagde nævnerne sammen. Fællesnævneren er det mindste tal som begge nævnere går op i — ikke summen.'),
              seconds: 40,
            };
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'broek-plusminus',
      domainId: 'broeker',
      name: 'Plus og minus med brøker',
      goal: 'Du kan lægge brøker sammen og trække dem fra hinanden — også med forskellige nævnere.',
      prerequisites: ['broek-forkort'],
      tier: 3,
      explain: [
        {
          kind: 'analogy',
          body: 'Du kan kun lægge stykker sammen, hvis de er lige store. 1/2 pizza + 1/3 pizza kan ikke tælles direkte — først skal begge skæres i sjettedele.',
        },
        {
          kind: 'rule',
          title: 'Fremgangsmåde',
          math: '\\frac{a}{b} + \\frac{c}{d} = \\frac{a\\cdot d}{b\\cdot d} + \\frac{c\\cdot b}{d\\cdot b} = \\frac{ad + cb}{bd}',
          body: 'Find fælles nævner, udvid begge brøker, og læg kun tællerne sammen.',
        },
        {
          kind: 'warning',
          body: 'Nævnerne lægges ALDRIG sammen. 1/2 + 1/3 er ikke 2/5 — prøv efter: 2/5 = 0,4, men 1/2 + 1/3 = 0,83.',
        },
      ],
      worked: [
        {
          title: '1/2 + 1/3',
          prompt: '\\frac{1}{2} + \\frac{1}{3}',
          steps: [
            s('Find fællesnævner.', '\\text{MFN}(2,3) = 6'),
            s('Udvid begge brøker.', '\\frac{1}{2} = \\frac{3}{6} \\quad \\frac{1}{3} = \\frac{2}{6}'),
            s('Læg tællerne sammen — nævneren bliver stående.', '\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}'),
          ],
          takeaway: 'Nævneren fortæller hvilken slags stykker vi tæller. Den ændrer sig ikke når vi tæller flere af dem.',
        },
      ],
      generators: [
        {
          id: 'broek-add-samme',
          label: 'Samme nævner',
          make: ({ rng, level }) => {
            const d = rng.int(lv(level, [3, 4, 5, 6, 8]), lv(level, [6, 8, 10, 12, 16]));
            const a = rng.int(1, d - 1);
            const b = rng.int(1, d - 1);
            const plus = rng.bool(0.65);
            const res = plus ? reduce({ n: a + b, d }) : reduce({ n: a - b, d });
            return {
              prompt: `Beregn $\\frac{${a}}{${d}} ${plus ? '+' : '-'} \\frac{${b}}{${d}}$`,
              instruction: 'Forkort svaret hvis det kan lade sig gøre.',
              input: { kind: 'fraction' },
              answer: fracAns(res),
              hints: [
                'Nævnerne er allerede ens — så der er ikke noget at udvide.',
                `${plus ? 'Læg' : 'Træk'} kun tællerne ${plus ? 'sammen' : 'fra hinanden'}.`,
                `${a} ${plus ? '+' : '-'} ${b} = ${plus ? a + b : a - b}, og nævneren bliver ${d}.`,
              ],
              solution: [
                s('Nævnerne er ens, så vi regner kun med tællerne.', `\\frac{${a} ${plus ? '+' : '-'} ${b}}{${d}} = ${fracTexBig({ n: plus ? a + b : a - b, d })}`),
                ...(gcd(Math.abs(plus ? a + b : a - b), d) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: trapIfDifferent(fracValue(res), (plus ? a + b : a - b) / (2 * d), 'broek-add-naevnere', `Du lagde også nævnerne sammen. Nævneren fortæller hvor store stykkerne er — den bliver stående som ${d}.`),
              seconds: 35,
            };
          },
        },
        {
          id: 'broek-add-forskellig',
          label: 'Forskellige nævnere',
          minLevel: 2,
          make: ({ rng, level }) => {
            const d1 = rng.int(2, lv(level, [4, 5, 6, 8, 10]));
            let d2 = rng.int(2, lv(level, [4, 6, 8, 10, 12]));
            while (d2 === d1) d2 = rng.int(2, 12);
            const a = rng.int(1, d1 - 1);
            const b = rng.int(1, d2 - 1);
            const plus = rng.bool(0.6);
            const f1 = { n: a, d: d1 };
            const f2 = { n: b, d: d2 };
            const res = plus ? fracAdd(f1, f2) : fracSub(f1, f2);
            const mfn = lcm(d1, d2);
            return {
              prompt: `Beregn $\\frac{${a}}{${d1}} ${plus ? '+' : '-'} \\frac{${b}}{${d2}}$`,
              instruction: 'Forkort svaret hvis det kan lade sig gøre.',
              input: { kind: 'fraction' },
              answer: fracAns(res),
              visual: { kind: 'fractionBar', rows: [{ num: a, den: d1, label: `${a}/${d1}` }, { num: b, den: d2, label: `${b}/${d2}`, tone: 'accent' }] },
              hints: [
                'Du kan ikke regne før stykkerne er lige store. Find fællesnævneren.',
                `Fællesnævneren er ${mfn}.`,
                `${a}/${d1} = ${(a * mfn) / d1}/${mfn} og ${b}/${d2} = ${(b * mfn) / d2}/${mfn}.`,
              ],
              solution: [
                s('Find fællesnævner.', `\\text{MFN}(${d1}, ${d2}) = ${mfn}`),
                s('Udvid begge brøker.', `${fracTexBig({ n: (a * mfn) / d1, d: mfn })} ${plus ? '+' : '-'} ${fracTexBig({ n: (b * mfn) / d2, d: mfn })}`),
                s('Regn med tællerne.', `= ${fracTexBig({ n: (a * mfn) / d1 + (plus ? 1 : -1) * ((b * mfn) / d2), d: mfn })}`),
                ...(gcd(Math.abs((a * mfn) / d1 + (plus ? 1 : -1) * ((b * mfn) / d2)), mfn) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: [
                ...trapIfDifferent(fracValue(res), (plus ? a + b : a - b) / (d1 + d2), 'broek-add-naevnere', `Du lagde nævnerne sammen. Nævnerne skal gøres ens — fællesnævneren her er ${mfn} — og så regner du kun med tællerne.`),
              ],
              concept: 'Fælles nævner først. Derefter kun tællerne.',
              seconds: 70,
            };
          },
        },
        {
          id: 'broek-tekst',
          label: 'Tekstopgave med brøker',
          minLevel: 3,
          make: ({ rng }) => {
            const who = name(rng);
            const d1 = rng.pick([3, 4, 5, 6]);
            const d2 = rng.pick([2, 3, 4, 5].filter((x) => x !== d1));
            const a = rng.int(1, d1 - 1);
            const b = rng.int(1, d2 - 1);
            const used = fracAdd({ n: a, d: d1 }, { n: b, d: d2 });
            const left = fracSub({ n: 1, d: 1 }, used);
            const valid = fracValue(left) > 0;
            const res = valid ? left : used;
            return {
              prompt: valid
                ? `${who} bruger $\\frac{${a}}{${d1}}$ af sin lommepenge på mad og $\\frac{${b}}{${d2}}$ på transport. Hvor stor en del er der tilbage?`
                : `${who} bruger $\\frac{${a}}{${d1}}$ af sin lommepenge på mad og $\\frac{${b}}{${d2}}$ på transport. Hvor stor en del bruger ${who} i alt?`,
              instruction: 'Svar med en forkortet brøk.',
              input: { kind: 'fraction' },
              answer: fracAns(res),
              hints: [
                'Det hele er 1 — altså hele lommepengene.',
                'Læg først de to brøker sammen. Husk fællesnævner.',
                valid ? `Tilsammen bruges ${fracTexBig(used).replace(/\\frac/g, '').replace(/[{}]/g, '/')}. Træk det fra 1.` : 'Læg de to brøker sammen.',
              ],
              solution: [
                s('Læg forbruget sammen med fællesnævner.', `${fracTexBig({ n: a, d: d1 })} + ${fracTexBig({ n: b, d: d2 })} = ${fracTexBig(used)}`),
                ...(valid ? [s('Træk fra det hele.', `1 - ${fracTexBig(used)} = ${fracTexBig(left)}`, 'Skriv 1 som en brøk med samme nævner.')] : []),
              ],
              seconds: 90,
            };
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'broek-gange-dividere',
      domainId: 'broeker',
      name: 'Gange og dividere brøker',
      goal: 'Du kan gange brøker og dividere med en brøk.',
      prerequisites: ['broek-forkort'],
      tier: 3,
      explain: [
        {
          kind: 'rule',
          title: 'Multiplikation',
          math: '\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{a \\cdot c}{b \\cdot d}',
          body: 'Lige ud ad landevejen: tæller gange tæller, nævner gange nævner. Ingen fællesnævner nødvendig.',
        },
        {
          kind: 'rule',
          title: 'Division',
          math: '\\frac{a}{b} : \\frac{c}{d} = \\frac{a}{b} \\cdot \\frac{d}{c}',
          body: 'Vend den bagerste brøk om og gang i stedet.',
        },
        {
          kind: 'analogy',
          body: '2/3 af 3/4 betyder "tag 3/4, og tag så to tredjedele af det". Derfor bliver produktet mindre end begge brøker.',
        },
        {
          kind: 'warning',
          body: 'Den fælles nævner hører til plus og minus. Ved gange skal du ikke bruge den — det gør bare arbejdet større.',
        },
      ],
      worked: [
        {
          title: '3/4 : 2/5',
          prompt: '\\frac{3}{4} : \\frac{2}{5}',
          steps: [
            s('Vend den bagerste brøk om.', '\\frac{2}{5} \\rightarrow \\frac{5}{2}'),
            s('Skift division ud med multiplikation.', '\\frac{3}{4} \\cdot \\frac{5}{2}'),
            s('Gang tællere og nævnere.', '= \\frac{15}{8}'),
          ],
          takeaway: 'Dividerer man med noget mindre end 1, bliver resultatet større. Det er derfor 15/8 > 3/4.',
        },
      ],
      generators: [
        {
          id: 'broek-gange',
          label: 'Gang to brøker',
          make: ({ rng, level }) => {
            const hi = lv(level, [4, 6, 8, 10, 12]);
            const d1 = rng.int(2, hi);
            const d2 = rng.int(2, hi);
            const a = rng.int(1, d1 - 1 || 1);
            const b = rng.int(1, d2 - 1 || 1);
            const res = fracMul({ n: a, d: d1 }, { n: b, d: d2 });
            return {
              prompt: `Beregn $\\frac{${a}}{${d1}} \\cdot \\frac{${b}}{${d2}}$`,
              instruction: 'Forkort svaret hvis det kan lade sig gøre.',
              input: { kind: 'fraction' },
              answer: fracAns(res),
              hints: [
                'Ved multiplikation skal du ikke finde fællesnævner.',
                'Gang tæller med tæller og nævner med nævner.',
                `${a} · ${b} = ${a * b} og ${d1} · ${d2} = ${d1 * d2}.`,
              ],
              solution: [
                s('Gang lige over.', `\\frac{${a} \\cdot ${b}}{${d1} \\cdot ${d2}} = ${fracTexBig({ n: a * b, d: d1 * d2 })}`),
                ...(gcd(a * b, d1 * d2) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: trapIfDifferent(fracValue(res), (a * d2) / (d1 * b), 'broek-gange-kryds', 'Du gangede på kryds. Det hører til når man sammenligner brøker. Ved multiplikation ganger man lige over: tæller·tæller og nævner·nævner.'),
              seconds: 40,
            };
          },
        },
        {
          id: 'broek-dividere',
          label: 'Divider med en brøk',
          minLevel: 2,
          make: ({ rng, level }) => {
            const hi = lv(level, [4, 5, 6, 8, 10]);
            const d1 = rng.int(2, hi);
            const d2 = rng.int(2, hi);
            const a = rng.int(1, d1 - 1 || 1);
            const b = rng.int(1, d2 - 1 || 1);
            const res = fracDiv({ n: a, d: d1 }, { n: b, d: d2 });
            return {
              prompt: `Beregn $\\frac{${a}}{${d1}} : \\frac{${b}}{${d2}}$`,
              instruction: 'Forkort svaret hvis det kan lade sig gøre.',
              input: { kind: 'fraction' },
              answer: fracAns(res),
              hints: [
                'Division med en brøk laves om til multiplikation.',
                `Vend ${b}/${d2} om, så den bliver ${d2}/${b}.`,
                `Regn nu ${a}/${d1} · ${d2}/${b}.`,
              ],
              solution: [
                s('Vend den bagerste brøk om og gang.', `\\frac{${a}}{${d1}} \\cdot \\frac{${d2}}{${b}}`),
                s('Gang lige over.', `= ${fracTexBig({ n: a * d2, d: d1 * b })}`),
                ...(gcd(a * d2, d1 * b) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              traps: trapIfDifferent(fracValue(res), a / b / (d1 / d2), 'broek-div-direkte', 'Du dividerede tæller med tæller og nævner med nævner. Reglen er: vend den bagerste brøk om og gang.'),
              concept: 'Divider med en brøk = gang med den omvendte.',
              seconds: 50,
            };
          },
        },
        {
          id: 'broek-af-antal',
          label: 'Brøkdel af et antal',
          make: ({ rng, level }) => {
            const d = rng.pick([2, 3, 4, 5, 6, 8]);
            const numr = rng.int(1, d - 1);
            const k = rng.int(lv(level, [2, 3, 4, 6, 9]), lv(level, [8, 12, 20, 30, 50]));
            const total = d * k;
            return {
              prompt: `Der er ${total} elever på årgangen. $\\frac{${numr}}{${d}}$ af dem går til ${rng.pick(['håndbold', 'fodbold', 'svømning', 'musik'])}. Hvor mange er det?`,
              input: { kind: 'number', unit: 'elever' },
              answer: numAns((total / d) * numr),
              hints: [
                `Del først de ${total} elever i ${d} lige store grupper.`,
                `${total} : ${d} = ${total / d} elever i hver gruppe.`,
                `Tag ${numr} af grupperne: ${total / d} · ${numr}.`,
              ],
              solution: [
                s('Divider med nævneren for at finde én del.', `${total} : ${d} = ${total / d}`),
                s('Gang med tælleren for at få det ønskede antal dele.', `${total / d} \\cdot ${numr} = ${(total / d) * numr}`),
              ],
              traps: trapIfDifferent((total / d) * numr, total / d, 'broek-forkort-taeller', `Du fandt kun 1/${d} af eleverne. Der spørges om ${numr}/${d}, så du skal gange med ${numr} bagefter.`),
              concept: 'Brøkdel af et tal: divider med nævneren, gang med tælleren.',
              seconds: 45,
              visual: { kind: 'fractionBar', rows: [{ num: numr, den: d, label: `${numr}/${d} af ${total}`, tone: 'accent' }] },
            };
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'broek-omregning',
      domainId: 'broeker',
      name: 'Brøk, decimaltal og procent',
      goal: 'Du kan skifte mellem brøk, decimaltal og procent.',
      prerequisites: ['broek-forkort'],
      tier: 3,
      explain: [
        {
          kind: 'idea',
          title: 'Tre sprog for det samme tal',
          body: '1/4, 0,25 og 25 % er tre måder at skrive den samme mængde på. Vælg den der gør regningen lettest.',
        },
        {
          kind: 'rule',
          title: 'Fra brøk til decimaltal',
          math: '\\frac{3}{8} = 3 : 8 = 0{,}375',
          body: 'Brøkstregen betyder division. Divider tæller med nævner.',
        },
        {
          kind: 'rule',
          title: 'Fra decimaltal til procent',
          math: '0{,}375 \\cdot 100 = 37{,}5\\,\\%',
          body: 'Procent betyder "pr. hundrede", så gang med 100.',
        },
        {
          kind: 'list',
          title: 'Dem du bør kunne udenad',
          items: ['1/2 = 0,5 = 50 %', '1/4 = 0,25 = 25 %', '3/4 = 0,75 = 75 %', '1/5 = 0,2 = 20 %', '1/10 = 0,1 = 10 %', '1/3 ≈ 0,333 ≈ 33,3 %'],
        },
      ],
      worked: [
        {
          title: 'Fra 0,6 til brøk',
          prompt: 'Skriv 0,6 som en forkortet brøk',
          steps: [
            s('Sidste ciffer står på tiendedelspladsen.', '0{,}6 = \\frac{6}{10}'),
            s('Forkort med 2.', '= \\frac{3}{5}'),
          ],
          takeaway: 'Antallet af decimaler bestemmer nævneren: 1 decimal → 10, 2 decimaler → 100.',
        },
      ],
      generators: [
        {
          id: 'broek-til-decimal',
          label: 'Brøk til decimaltal',
          make: ({ rng, level }) => {
            const options = lv<[number, number][]>(level, [
              [[1, 2], [1, 4], [3, 4], [1, 10]],
              [[1, 5], [2, 5], [3, 5], [1, 4], [3, 4]],
              [[1, 8], [3, 8], [5, 8], [7, 20], [9, 25]],
              [[7, 8], [11, 20], [13, 25], [17, 50]],
              [[9, 16], [13, 40], [21, 32], [27, 80]],
            ]);
            const f = rng.pick(options);
            const value = roundTo(f[0] / f[1], 6);
            return {
              prompt: `Skriv $\\frac{${f[0]}}{${f[1]}}$ som decimaltal.`,
              input: { kind: 'number' },
              answer: numAns(value, 1e-6),
              hints: [
                'Brøkstregen betyder division.',
                `Regn ${f[0]} : ${f[1]}.`,
                `Udvid eventuelt til nævner 10, 100 eller 1000 først.`,
              ],
              solution: [
                s('Divider tæller med nævner.', `${f[0]} : ${f[1]} = ${String(value).replace('.', '{,}')}`),
              ],
              seconds: 35,
            };
          },
        },
        {
          id: 'decimal-til-broek',
          label: 'Decimaltal til brøk',
          make: ({ rng, level }) => {
            const decimals = lv(level, [1, 1, 2, 2, 2]);
            const p = 10 ** decimals;
            const n = rng.int(1, p - 1);
            const res = reduce({ n, d: p });
            return {
              prompt: `Skriv $${String(n / p).replace('.', '{,}')}$ som en forkortet brøk.`,
              input: { kind: 'fraction' },
              answer: { type: 'fraction', value: res, requireReduced: true },
              hints: [
                `Der er ${decimals} decimal${decimals > 1 ? 'er' : ''}, så nævneren bliver ${p}.`,
                `Start med ${n}/${p}.`,
                `Forkort med ${gcd(n, p)}.`,
              ],
              solution: [
                s('Skriv som brøk med 10-potens i nævneren.', `${String(n / p).replace('.', '{,}')} = ${fracTexBig({ n, d: p })}`),
                ...(gcd(n, p) > 1 ? [s('Forkort.', `= ${fracTexBig(res)}`)] : []),
              ],
              seconds: 40,
            };
          },
        },
        {
          id: 'broek-til-procent',
          label: 'Brøk til procent',
          minLevel: 2,
          make: ({ rng, level }) => {
            const opts = lv<[number, number][]>(level, [
              [[1, 2], [1, 4], [1, 10], [3, 4]],
              [[1, 5], [2, 5], [3, 10], [7, 10]],
              [[1, 8], [3, 8], [9, 20], [13, 25]],
              [[5, 8], [7, 8], [17, 20], [21, 50]],
              [[7, 16], [11, 16], [23, 40], [29, 80]],
            ]);
            const f = rng.pick(opts);
            const pct = roundTo((f[0] / f[1]) * 100, 4);
            return {
              prompt: `Hvor mange procent er $\\frac{${f[0]}}{${f[1]}}$?`,
              input: { kind: 'number', unit: '%' },
              answer: numAns(pct, 0.05),
              hints: [
                'Lav først brøken om til et decimaltal.',
                `${f[0]} : ${f[1]} = ${roundTo(f[0] / f[1], 5)}`,
                'Gang med 100 for at få procent.',
              ],
              solution: [
                s('Brøk til decimaltal.', `${f[0]} : ${f[1]} = ${String(roundTo(f[0] / f[1], 5)).replace('.', '{,}')}`),
                s('Decimaltal til procent.', `${String(roundTo(f[0] / f[1], 5)).replace('.', '{,}')} \\cdot 100 = ${String(pct).replace('.', '{,}')}\\,\\%`),
              ],
              traps: trapIfDifferent(pct, f[0] * 100, 'procent-grundtal', `Du gangede kun tælleren med 100. Regn hele brøken ud først: ${f[0]} : ${f[1]} = ${roundTo(f[0] / f[1], 4)}, og gang så med 100.`),
              seconds: 45,
            };
          },
        },
      ],
    },
  ],
};
