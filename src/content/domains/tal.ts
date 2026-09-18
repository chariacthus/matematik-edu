import type { Domain } from '../../types';
import { gcd, isPrime, lcm } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const tal: Domain = {
  id: 'tal',
  name: 'Tal og regning',
  category: 'tal-algebra',
  icon: '123',
  blurb: 'Fundamentet: de fire regningsarter, rækkefølgen de skal bruges i, negative tal og overslag.',
  skills: [
    /* ---------------------------------------------------------------- */
    {
      id: 'tal-regnearter',
      domainId: 'tal',
      name: 'De fire regningsarter',
      goal: 'Du kan lægge sammen, trække fra, gange og dividere med flercifrede tal.',
      prerequisites: [],
      tier: 1,
      explain: [
        {
          kind: 'idea',
          title: 'De fire grundregninger',
          body: 'Plus samler. Minus fjerner. Gange er gentagen addition. Division er at dele i lige store portioner.',
        },
        {
          kind: 'list',
          title: 'Ordene du møder i opgaverne',
          items: [
            'Sum og i alt → plus',
            'Forskel, mindre end, tilbage → minus',
            'Produkt, gange så mange, pr. stk. → gange',
            'Kvotient, del ligeligt, hver får → division',
          ],
        },
        {
          kind: 'rule',
          title: 'Division og gange hænger sammen',
          math: '84 : 7 = 12 \\quad \\text{fordi} \\quad 12 \\cdot 7 = 84',
          body: 'Er du i tvivl om et divisionsstykke, så gang dig frem til det i stedet.',
        },
      ],
      worked: [
        {
          title: 'Division med tocifret divisor',
          prompt: '468 : 12',
          steps: [
            s('Hvor mange 12-taller er der i 46?', '12 \\cdot 3 = 36', 'Vi tager cifrene forfra.'),
            s('Træk fra og tag næste ciffer ned.', '46 - 36 = 10 \;\\rightarrow\; 108'),
            s('Hvor mange 12-taller er der i 108?', '12 \\cdot 9 = 108'),
            s('Resultatet er derfor 39.', '468 : 12 = 39'),
          ],
          takeaway: 'Gang dit svar med divisoren til sidst — så ved du med sikkerhed om det passer.',
        },
      ],
      generators: [
        {
          id: 'tal-plusminus',
          label: 'Plus og minus',
          make: ({ rng, level }) => {
            const [lo, hi] = lv<[number, number]>(level, [[10, 99], [20, 400], [100, 999], [500, 9999], [1000, 99999]]);
            const a = rng.int(lo, hi);
            const b = rng.int(lo, Math.min(hi, a));
            const plus = rng.bool();
            const value = plus ? a + b : a - b;
            return {
              prompt: `Beregn $${a} ${plus ? '+' : '-'} ${b}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                'Sæt tallene under hinanden, så enerne står under enerne.',
                plus ? 'Husk mente når en søjle giver 10 eller mere.' : 'Husk at låne fra næste søjle, hvis du ikke kan trække fra.',
                `Start fra højre: ${plus ? 'læg' : 'træk'} enerne ${plus ? 'sammen' : 'fra'} først.`,
              ],
              solution: [
                s('Stil tallene op under hinanden.', `${a} ${plus ? '+' : '-'} ${b}`),
                s('Regn fra højre mod venstre.', `= ${value}`),
              ],
              seconds: 30,
            };
          },
        },
        {
          id: 'tal-gange',
          label: 'Multiplikation',
          make: ({ rng, level }) => {
            const a = lv(level, [rng.int(2, 9), rng.int(3, 12), rng.int(11, 40), rng.int(12, 99), rng.int(23, 199)]);
            const b = lv(level, [rng.int(2, 9), rng.int(3, 12), rng.int(3, 12), rng.int(11, 40), rng.int(12, 60)]);
            return {
              prompt: `Beregn $${a} \\cdot ${b}$`,
              input: { kind: 'number' },
              answer: numAns(a * b),
              hints: [
                'Del det op: gang med tierne først, så med enerne.',
                `${a} · ${b} = ${a} · ${Math.floor(b / 10) * 10} + ${a} · ${b % 10}`,
                `${a} · ${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10}, og ${a} · ${b % 10} = ${a * (b % 10)}.`,
              ],
              solution: [
                s('Split den ene faktor op i tiere og enere.', `${b} = ${Math.floor(b / 10) * 10} + ${b % 10}`),
                s('Gang hver del for sig.', `${a}\\cdot${Math.floor(b / 10) * 10} = ${a * Math.floor(b / 10) * 10},\\quad ${a}\\cdot${b % 10} = ${a * (b % 10)}`),
                s('Læg de to resultater sammen.', `= ${a * b}`),
              ],
              concept: 'Man må altid dele en faktor op og gange hver del for sig.',
              seconds: 40,
            };
          },
        },
        {
          id: 'tal-division',
          label: 'Division der går op',
          make: ({ rng, level }) => {
            const q = lv(level, [rng.int(2, 9), rng.int(3, 12), rng.int(6, 25), rng.int(12, 60), rng.int(20, 150)]);
            const d = lv(level, [rng.int(2, 5), rng.int(2, 9), rng.int(3, 12), rng.int(4, 16), rng.int(7, 25)]);
            return {
              prompt: `Beregn $${q * d} : ${d}$`,
              input: { kind: 'number' },
              answer: numAns(q),
              hints: [
                `Spørg dig selv: hvad skal jeg gange ${d} med for at få ${q * d}?`,
                `Prøv dig frem: ${d} · 10 = ${d * 10}. Er det for meget eller for lidt?`,
                `${d} · ${q} = ${q * d}.`,
              ],
              solution: [
                s('Division er det omvendte af multiplikation.', `${q * d} : ${d} = ?\;\\Leftrightarrow\;? \\cdot ${d} = ${q * d}`),
                s('Find tallet.', `${q} \\cdot ${d} = ${q * d}`),
                s('Svaret er derfor.', `${q * d} : ${d} = ${q}`),
              ],
              seconds: 35,
            };
          },
        },
        {
          id: 'tal-tekst',
          label: 'Tekstopgave med flere regningsarter',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const packs = rng.int(3, lv(level, [5, 7, 9, 12, 16]));
            const per = rng.int(4, lv(level, [8, 10, 12, 16, 24]));
            const spist = rng.int(2, Math.min(9, packs * per - 1));
            return {
              prompt: `${who} køber ${packs} poser med ${per} boller i hver. ${who} spiser ${spist} boller. Hvor mange boller er der tilbage?`,
              input: { kind: 'number', unit: 'boller' },
              answer: numAns(packs * per - spist),
              hints: [
                'Hvor mange boller var der i alt, før der blev spist noget?',
                `${packs} poser med ${per} i hver: det er et gangestykke.`,
                `${packs} · ${per} = ${packs * per}. Træk så ${spist} fra.`,
              ],
              solution: [
                s('Find det samlede antal.', `${packs} \\cdot ${per} = ${packs * per}`, 'Lige store poser → gange.'),
                s('Træk det spiste fra.', `${packs * per} - ${spist} = ${packs * per - spist}`),
              ],
              traps: [
                ...trapIfDifferent(packs * per - spist, packs * per + spist, 'tekst-forkert-regneart', 'Du lagde til i stedet for at trække fra. Bollerne blev spist, så antallet skal ned.'),
                ...trapIfDifferent(packs * per - spist, packs + per - spist, 'tekst-forkert-regneart', 'Poserne skal ganges med indholdet, ikke lægges sammen.'),
              ],
              seconds: 55,
            };
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'tal-hierarki',
      domainId: 'tal',
      name: 'Regnehierarki',
      goal: 'Du kan regne et blandet regnestykke i den rigtige rækkefølge.',
      prerequisites: ['tal-regnearter'],
      tier: 1,
      explain: [
        {
          kind: 'idea',
          title: 'Rækkefølgen er aftalt på forhånd',
          body: 'Et regnestykke læses ikke som en tekst fra venstre mod højre. Der er en fast rangorden, så alle i hele verden får det samme svar.',
        },
        {
          kind: 'list',
          title: 'Rangordenen',
          items: [
            '1. Parenteser — inderst først',
            '2. Potenser og rødder',
            '3. Gange og dividere — fra venstre mod højre',
            '4. Plus og minus — fra venstre mod højre',
          ],
        },
        {
          kind: 'math',
          math: '3 + 4 \\cdot 5 = 3 + 20 = 23',
          caption: 'Ikke 35. Gangestykket bliver regnet først, uanset at det står sidst.',
        },
        {
          kind: 'warning',
          body: 'Gange og dividere står på samme trin. Står de begge i stykket, tager du dem fra venstre mod højre — ikke gange før division.',
        },
      ],
      worked: [
        {
          title: 'Et stykke med alle fire trin',
          prompt: '2 \\cdot (7 - 3)^2 - 12 : 4',
          steps: [
            s('Parentesen først.', '7 - 3 = 4', 'Inderste niveau har altid førsteret.'),
            s('Så potensen.', '4^2 = 16'),
            s('Gange og dividere, fra venstre.', '2 \\cdot 16 = 32 \\quad\\text{og}\\quad 12 : 4 = 3'),
            s('Til sidst minus.', '32 - 3 = 29'),
          ],
          takeaway: 'Skriv hele stykket af igen for hvert trin. Så mister du ikke et led undervejs.',
        },
      ],
      generators: [
        {
          id: 'hierarki-gange-foerst',
          label: 'Gange før plus',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [9, 12, 20, 30, 50]));
            const b = rng.int(2, lv(level, [6, 9, 12, 12, 15]));
            const c = rng.int(2, lv(level, [6, 9, 12, 12, 15]));
            const plus = rng.bool(0.6);
            const value = plus ? a + b * c : a * b - c;
            const leftToRight = plus ? (a + b) * c : a * (b - c);
            const expr = plus ? `${a} + ${b} \\cdot ${c}` : `${a} \\cdot ${b} - ${c}`;
            return {
              prompt: `Beregn $${expr}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                'Hvilket regnetegn har højest rang her?',
                'Gange kommer før plus og minus — også når gangestykket står til sidst.',
                plus ? `Regn ${b} · ${c} = ${b * c} først, og læg så ${a} til.` : `Regn ${a} · ${b} = ${a * b} først, og træk så ${c} fra.`,
              ],
              solution: plus
                ? [s('Gangestykket først.', `${b} \\cdot ${c} = ${b * c}`), s('Derefter plus.', `${a} + ${b * c} = ${value}`)]
                : [s('Gangestykket først.', `${a} \\cdot ${b} = ${a * b}`), s('Derefter minus.', `${a * b} - ${c} = ${value}`)],
              traps: trapIfDifferent(
                value,
                leftToRight,
                'regnehierarki-venstre',
                `Du regnede fra venstre mod højre. Gange har højere rang end plus og minus, så gangestykket skal regnes først — svaret er ${value}.`,
              ),
              concept: 'Parenteser → potenser → gange/dividere → plus/minus.',
              seconds: 35,
            };
          },
        },
        {
          id: 'hierarki-parentes',
          label: 'Med parentes',
          make: ({ rng, level }) => {
            const a = rng.int(2, lv(level, [9, 12, 15, 20, 30]));
            const b = rng.int(2, lv(level, [9, 12, 15, 20, 30]));
            const c = rng.int(2, lv(level, [6, 8, 9, 12, 15]));
            const value = (a + b) * c;
            return {
              prompt: `Beregn $(${a} + ${b}) \\cdot ${c}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                'Parentesen har førsteret.',
                `${a} + ${b} = ${a + b}`,
                `Gang så resultatet med ${c}.`,
              ],
              solution: [
                s('Regn parentesen ud.', `${a} + ${b} = ${a + b}`),
                s('Gang med faktoren udenfor.', `${a + b} \\cdot ${c} = ${value}`),
              ],
              traps: trapIfDifferent(
                value,
                a + b * c,
                'regnehierarki-venstre',
                'Du regnede gangestykket først. Men parentesen står øverst i rangordenen — den skal ud af vejen inden noget andet.',
              ),
              seconds: 35,
            };
          },
        },
        {
          id: 'hierarki-blandet',
          label: 'Blandet stykke',
          minLevel: 3,
          make: ({ rng, level }) => {
            const b = rng.int(2, 9);
            const c = rng.int(2, 9);
            const d = rng.int(2, 6);
            const e = d * rng.int(2, 9);
            const a = rng.int(3, lv(level, [10, 15, 20, 30, 40]));
            const value = a + b * c - e / d;
            return {
              prompt: `Beregn $${a} + ${b} \\cdot ${c} - ${e} : ${d}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                'Find først alle gange- og divisionsstykker.',
                `${b} · ${c} = ${b * c} og ${e} : ${d} = ${e / d}.`,
                `Nu står der ${a} + ${b * c} − ${e / d}.`,
              ],
              solution: [
                s('Gange og dividere klares først.', `${b} \\cdot ${c} = ${b * c},\\quad ${e} : ${d} = ${e / d}`),
                s('Nu er der kun plus og minus tilbage — fra venstre.', `${a} + ${b * c} - ${e / d} = ${value}`),
              ],
              traps: trapIfDifferent(
                value,
                ((a + b) * c - e) / d,
                'regnehierarki-venstre',
                'Her er alt regnet fra venstre mod højre. Gange og division skal klares først, og derefter plus og minus.',
              ),
              seconds: 55,
            };
          },
        },
        {
          id: 'hierarki-vaelg',
          label: 'Hvad regnes først?',
          make: ({ rng, level }) => {
            const a = rng.int(2, 9);
            const b = rng.int(2, 9);
            const c = rng.int(2, 9);
            const d = rng.int(2, 9);
            const expr = lv(level, [
              `${a} + ${b} \\cdot ${c}`,
              `${a} \\cdot ${b} + ${c} \\cdot ${d}`,
              `(${a} + ${b}) \\cdot ${c} - ${d}`,
              `${a} + ${b} \\cdot ${c}^2`,
              `${a} \\cdot (${b} + ${c})^2 - ${d}`,
            ]);
            const answers = lv(level, [
              `${b} · ${c}`,
              `${a} · ${b}`,
              `${a} + ${b}`,
              `${c}²`,
              `${b} + ${c}`,
            ]);
            const wrongs = lv<string[]>(level, [
              [`${a} + ${b}`, `hele stykket fra venstre`],
              [`${b} + ${c}`, `${c} · ${d} sidst`],
              [`${b} · ${c}`, `${c} − ${d}`],
              [`${a} + ${b}`, `${b} · ${c}`],
              [`${a} · ${b}`, `${c}² først`],
            ]);
            return mcq(rng, {
              prompt: `I regnestykket $${expr}$ — hvilken del skal regnes allerførst?`,
              options: [
                { text: answers, correct: true },
                ...wrongs.map((w) => ({
                  text: w,
                  misconceptionId: 'regnehierarki-venstre',
                  feedback: `Rangordenen afgør det, ikke rækkefølgen på papiret. Her skal ${answers} regnes først.`,
                })),
              ],
              hints: [
                'Se efter parenteser først. Er der ingen, kigger du efter potenser.',
                'Derefter gange og dividere. Plus og minus kommer altid til sidst.',
              ],
              solution: [s('Følg rangordenen.', undefined, `Parenteser → potenser → gange/dividere → plus/minus. Her giver det ${answers}.`)],
              seconds: 30,
            });
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'tal-negative',
      domainId: 'tal',
      name: 'Negative tal',
      goal: 'Du kan regne med negative tal og styr på fortegnene.',
      prerequisites: ['tal-regnearter'],
      tier: 2,
      explain: [
        {
          kind: 'analogy',
          body: 'Tænk på tallinjen som en termometerskala. Plus flytter dig til højre (varmere), minus flytter dig til venstre (koldere). −5 er koldere end −2, selvom 5 er større end 2.',
        },
        {
          kind: 'visual',
          visual: {
            kind: 'numberLine',
            min: -6,
            max: 6,
            step: 1,
            marks: [
              { value: -4, label: '-4', tone: 'bad' },
              { value: 2, label: '2', tone: 'good' },
            ],
          },
          caption: 'Jo længere mod venstre, jo mindre er tallet.',
        },
        {
          kind: 'rule',
          title: 'Plus og minus',
          math: 'a - (-b) = a + b \\qquad a + (-b) = a - b',
          body: 'To minusser i træk bliver til plus.',
        },
        {
          kind: 'rule',
          title: 'Gange og dividere',
          math: '(-)\\cdot(-) = + \\qquad (-)\\cdot(+) = -',
          body: 'Ens fortegn giver plus. Forskellige fortegn giver minus. Det gælder både for gange og for division.',
        },
        {
          kind: 'warning',
          body: 'Pas på (−3)² og −3². Den første er (−3)·(−3) = 9. Den anden er −(3·3) = −9, fordi minusset ikke er med inde i potensen.',
        },
      ],
      worked: [
        {
          title: 'Minus foran en parentes',
          prompt: '-4 - (-7)',
          steps: [
            s('Find de to minusser i træk.', '-4 - (-7)', 'Der står "træk −7 fra".'),
            s('At trække et negativt tal fra er at lægge til.', '= -4 + 7'),
            s('Regn videre på tallinjen: 7 skridt til højre fra −4.', '= 3'),
          ],
          takeaway: 'Omskriv altid til plus eller minus uden dobbelttegn, før du regner.',
        },
      ],
      generators: [
        {
          id: 'neg-plusminus',
          label: 'Plus og minus med negative tal',
          make: ({ rng, level }) => {
            const hi = lv(level, [9, 12, 20, 40, 80]);
            const a = rng.nonZero(-hi, hi);
            const b = rng.nonZero(-hi, hi);
            const minus = rng.bool();
            const value = minus ? a - b : a + b;
            const bTex = b < 0 ? `(${b})` : `${b}`;
            return {
              prompt: `Beregn $${a} ${minus ? '-' : '+'} ${bTex}$`,
              input: { kind: 'number' },
              answer: numAns(value),
              visual: {
                kind: 'numberLine',
                min: Math.min(a, value) - 2,
                max: Math.max(a, value) + 2,
                step: Math.max(1, Math.round((Math.abs(value - a) + 4) / 10)),
                marks: [{ value: a, label: 'start', tone: 'brand' }],
              },
              hints: [
                'Skriv først stykket om, så der ikke står to tegn i træk.',
                minus && b < 0 ? 'Minus og minus bliver til plus.' : 'Start ved det første tal på tallinjen og flyt dig.',
                `Stykket svarer til ${a} ${(minus ? -b : b) < 0 ? '-' : '+'} ${Math.abs(minus ? -b : b)}.`,
              ],
              solution: [
                s('Ryd op i fortegnene.', `${a} ${minus ? '-' : '+'} ${bTex} = ${a} ${(minus ? -b : b) < 0 ? '-' : '+'} ${Math.abs(minus ? -b : b)}`),
                s('Regn ud.', `= ${value}`),
              ],
              // Fælden giver kun mening når der står to tegn i træk, altså
              // når b selv er negativ. Ellers er der intet fortegn at overse.
              traps:
                b < 0
                  ? trapIfDifferent(
                      value,
                      minus ? a - Math.abs(b) : a + Math.abs(b),
                      'negativ-dobbelt-minus',
                      minus
                        ? `Du overså at ${b} selv er negativt. At trække ${b} fra er det samme som at lægge ${Math.abs(b)} til.`
                        : `Du overså minusset inde i parentesen. At lægge ${b} til er det samme som at trække ${Math.abs(b)} fra.`,
                    )
                  : [],
              seconds: 35,
            };
          },
        },
        {
          id: 'neg-gange',
          label: 'Gange og dividere med fortegn',
          make: ({ rng, level }) => {
            const hi = lv(level, [6, 9, 12, 15, 20]);
            const a = rng.nonZero(-hi, hi);
            const b = rng.nonZero(2, hi) * rng.sign();
            const divide = rng.bool(0.35);
            const value = divide ? a * b : a * b;
            const prompt = divide
              ? `Beregn $${a * b} : ${b < 0 ? `(${b})` : b}$`
              : `Beregn $${a < 0 ? `(${a})` : a} \\cdot ${b < 0 ? `(${b})` : b}$`;
            const ans = divide ? a : value;
            return {
              prompt,
              input: { kind: 'number' },
              answer: numAns(ans),
              hints: [
                'Regn først med tallene uden fortegn.',
                'Tæl derefter hvor mange minusser der er. Et lige antal giver plus, et ulige antal giver minus.',
                `Fortegnet bliver ${ans < 0 ? 'minus' : 'plus'}.`,
              ],
              solution: [
                s('Regn med talværdierne.', divide ? `${Math.abs(a * b)} : ${Math.abs(b)} = ${Math.abs(a)}` : `${Math.abs(a)} \\cdot ${Math.abs(b)} = ${Math.abs(value)}`),
                s('Sæt fortegnet på.', `= ${ans}`, ans < 0 ? 'Forskellige fortegn giver minus.' : 'Ens fortegn giver plus.'),
              ],
              traps: trapIfDifferent(ans, -ans, 'negativ-multiplikation', 'Talværdien er rigtig, men fortegnet er byttet om. Ens fortegn giver plus, forskellige fortegn giver minus.'),
              concept: '(−)·(−) = + og (−)·(+) = −',
              seconds: 30,
            };
          },
        },
        {
          id: 'neg-sammenlign',
          label: 'Hvilket tal er størst?',
          make: ({ rng, level }) => {
            const hi = lv(level, [9, 12, 20, 40, 60]);
            const vals = rng.sample([...Array(hi * 2 + 1).keys()].map((i) => i - hi).filter((v) => v !== 0), 4);
            const max = Math.max(...vals);
            return mcq(rng, {
              prompt: `Hvilket af tallene er størst?`,
              options: vals.map((v) => ({
                text: String(v),
                correct: v === max,
                misconceptionId: v < 0 && Math.abs(v) === Math.max(...vals.map(Math.abs)) ? 'negativ-multiplikation' : undefined,
                feedback: v < 0 ? `${v} har den største talværdi, men det ligger længst til venstre på tallinjen — altså er det det mindste.` : undefined,
              })),
              hints: [
                'Tegn tallinjen for dig selv.',
                'Jo længere mod højre på tallinjen, jo større er tallet.',
                'Et negativt tal er altid mindre end et positivt.',
              ],
              solution: [s('Placér tallene på tallinjen og tag det yderste til højre.', undefined, `${max} ligger længst mod højre.`)],
              visual: {
                kind: 'numberLine',
                min: -hi - 1,
                max: hi + 1,
                step: Math.max(1, Math.round(hi / 5)),
                marks: vals.map((v) => ({ value: v, label: String(v), tone: 'brand' as const })),
              },
              seconds: 25,
            });
          },
        },
        {
          id: 'neg-temperatur',
          label: 'Temperaturforskel',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const lowT = -rng.int(2, lv(level, [8, 12, 18, 25, 30]));
            const highT = rng.int(1, lv(level, [8, 12, 18, 25, 30]));
            return {
              prompt: `${who} aflæser termometeret. Om natten viser det ${lowT} °C, og om dagen er det steget til ${highT} °C. Hvor mange grader er temperaturen steget?`,
              input: { kind: 'number', unit: '°C' },
              answer: numAns(highT - lowT),
              visual: {
                kind: 'numberLine',
                min: lowT - 3,
                max: highT + 3,
                step: Math.max(1, Math.round((highT - lowT) / 8)),
                marks: [
                  { value: lowT, label: 'nat', tone: 'brand' },
                  { value: highT, label: 'dag', tone: 'good' },
                ],
              },
              hints: [
                'Tegn de to temperaturer på en tallinje.',
                'Forskellen er hvor mange skridt der er fra det ene til det andet — også hen over nul.',
                `Fra ${lowT} op til 0 er ${Math.abs(lowT)} grader. Derfra videre op til ${highT}.`,
              ],
              solution: [
                s('Forskellen er det høje minus det lave.', `${highT} - (${lowT})`),
                s('To minusser bliver til plus.', `= ${highT} + ${Math.abs(lowT)} = ${highT - lowT}`),
              ],
              traps: trapIfDifferent(
                highT - lowT,
                highT + lowT,
                'negativ-dobbelt-minus',
                'Du trak i stedet for at lægge sammen. Fra en negativ til en positiv temperatur går man først op til 0 og så videre op.',
              ),
              seconds: 50,
            };
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'tal-afrunding',
      domainId: 'tal',
      name: 'Afrunding og overslag',
      goal: 'Du kan runde tal af og lave et hurtigt overslag, der afslører urimelige svar.',
      prerequisites: ['tal-regnearter'],
      tier: 2,
      explain: [
        {
          kind: 'idea',
          title: 'Afrunding',
          body: 'Se på cifret lige efter det sted, du runder til. Er det 0–4, runder du ned. Er det 5–9, runder du op.',
        },
        { kind: 'math', math: '3{,}47 \\approx 3{,}5 \\qquad 3{,}44 \\approx 3{,}4', caption: 'Rundet til én decimal.' },
        {
          kind: 'idea',
          title: 'Overslag',
          body: 'Rund tallene til noget du kan regne i hovedet, og se om dit rigtige svar er i nærheden. Det fanger de fleste tastefejl.',
        },
        {
          kind: 'warning',
          body: 'Rund altid ud fra det oprindelige tal — ikke i flere omgange. 3,449 bliver til 3,4, ikke 3,45 og så 3,5.',
        },
      ],
      worked: [
        {
          title: 'Overslag før beregning',
          prompt: '197 \\cdot 4',
          steps: [
            s('Rund 197 op til 200.', '200 \\cdot 4 = 800', 'Nu kan det klares i hovedet.'),
            s('Vi rundede op, så det rigtige svar er lidt mindre end 800.'),
            s('Regn præcist.', '197 \\cdot 4 = 788', 'Tæt på 800 — svaret er troværdigt.'),
          ],
          takeaway: 'Et overslag først gør dig i stand til at opdage når et svar er helt skævt.',
        },
      ],
      generators: [
        {
          id: 'afrund-decimal',
          label: 'Afrund decimaltal',
          make: ({ rng, level }) => {
            const decimals = lv(level, [1, 1, 2, 2, 3]);
            const raw = rng.int(100, 99999) / 10 ** (decimals + 1);
            const rounded = Math.round(raw * 10 ** decimals) / 10 ** decimals;
            const truncated = Math.floor(raw * 10 ** decimals) / 10 ** decimals;
            return {
              prompt: `Rund $${String(raw).replace('.', '{,}')}$ af til ${decimals === 1 ? 'én decimal' : `${decimals} decimaler`}.`,
              input: { kind: 'number' },
              answer: numAns(rounded, 1e-9),
              hints: [
                `Find det ${decimals}. ciffer efter kommaet.`,
                'Kig på cifret lige efter det. 0–4 runder ned, 5–9 runder op.',
                `Cifret efter er ${String(raw).split('.')[1]?.[decimals] ?? '0'}.`,
              ],
              solution: [
                s('Se på cifret efter afrundingsstedet.', undefined, `Det er ${String(raw).split('.')[1]?.[decimals] ?? '0'}.`),
                s(Number(String(raw).split('.')[1]?.[decimals] ?? '0') >= 5 ? 'Det er 5 eller derover, så vi runder op.' : 'Det er under 5, så vi runder ned.', `${String(raw).replace('.', '{,}')} \\approx ${String(rounded).replace('.', '{,}')}`),
              ],
              traps: trapIfDifferent(rounded, truncated, 'afrunding-altid-ned', 'Du skar cifrene væk i stedet for at runde. Når cifret efter er 5 eller større, skal der rundes op.'),
              seconds: 30,
            };
          },
        },
        {
          id: 'afrund-hele',
          label: 'Afrund til nærmeste hele',
          make: ({ rng, level }) => {
            const unit = lv(level, [10, 10, 100, 100, 1000]);
            const n = rng.int(unit, unit * 100);
            const rounded = Math.round(n / unit) * unit;
            const down = Math.floor(n / unit) * unit;
            return {
              prompt: `Rund $${n}$ af til nærmeste ${unit === 10 ? 'tier' : unit === 100 ? 'hundrede' : 'tusinde'}.`,
              input: { kind: 'number' },
              answer: numAns(rounded, 1e-9),
              hints: [
                `Hvilke to ${unit === 10 ? 'tiere' : unit === 100 ? 'hundreder' : 'tusinder'} ligger ${n} imellem?`,
                `Det er ${down} og ${down + unit}. Hvilken er ${n} tættest på?`,
                `Midtpunktet er ${down + unit / 2}.`,
              ],
              solution: [
                s('Find naboerne.', `${down} \;<\; ${n} \;<\; ${down + unit}`),
                s('Vælg den nærmeste.', `${n} \\approx ${rounded}`),
              ],
              traps: trapIfDifferent(rounded, down, 'afrunding-altid-ned', `Du rundede ned. ${n} ligger over midtpunktet ${down + unit / 2}, så det skal rundes op til ${rounded}.`),
              seconds: 30,
            };
          },
        },
        {
          id: 'overslag',
          label: 'Overslag',
          minLevel: 2,
          make: ({ rng, level }) => {
            const a = rng.int(lv(level, [18, 18, 180, 180, 1800]), lv(level, [99, 99, 999, 999, 9999]));
            const b = rng.int(3, lv(level, [9, 12, 12, 19, 29]));
            const exact = a * b;
            const roundA = Math.round(a / 10 ** (String(a).length - 1)) * 10 ** (String(a).length - 1);
            const est = roundA * b;
            const options = rng.shuffle([exact, Math.round(exact / 10), exact * 10, exact + roundA]);
            return mcq(rng, {
              prompt: `Lav et overslag: hvilket svar kan passe på $${a} \\cdot ${b}$?`,
              instruction: 'Du skal ikke regne præcist — du skal vurdere størrelsesordenen.',
              options: options.map((o) => ({
                text: String(o),
                correct: o === exact,
                misconceptionId: o === Math.round(exact / 10) || o === exact * 10 ? 'afrunding-altid-ned' : undefined,
                feedback: o !== exact ? `Overslaget ${roundA} · ${b} = ${est} viser at svaret skal ligge omkring ${est}.` : undefined,
              })),
              hints: [
                `Rund ${a} af til ${roundA}.`,
                `${roundA} · ${b} = ${est}. Svaret skal ligge tæt på det.`,
              ],
              solution: [
                s('Rund det store tal af.', `${a} \\approx ${roundA}`),
                s('Regn overslaget.', `${roundA} \\cdot ${b} = ${est}`),
                s('Kun ét af svarene ligger i nærheden.', `${a} \\cdot ${b} = ${exact}`),
              ],
              seconds: 40,
            });
          },
        },
      ],
    },

    /* ---------------------------------------------------------------- */
    {
      id: 'tal-primtal',
      domainId: 'tal',
      name: 'Primtal, faktorer og fælles divisorer',
      goal: 'Du kan faktorisere et tal og finde største fælles divisor og mindste fælles multiplum.',
      prerequisites: ['tal-regnearter'],
      tier: 3,
      explain: [
        {
          kind: 'idea',
          title: 'Primtal',
          body: 'Et primtal kan kun deles med 1 og sig selv. 2, 3, 5, 7, 11, 13, 17, 19 … 1 er ikke et primtal.',
        },
        {
          kind: 'rule',
          title: 'Primfaktoropløsning',
          math: '60 = 2 \\cdot 2 \\cdot 3 \\cdot 5 = 2^2 \\cdot 3 \\cdot 5',
          body: 'Ethvert helt tal over 1 kan skrives som et produkt af primtal — og kun på én måde.',
        },
        {
          kind: 'list',
          title: 'Hurtige delelighedsregler',
          items: [
            'Delelig med 2: sidste ciffer er lige',
            'Delelig med 3: cifrenes sum er delelig med 3',
            'Delelig med 5: slutter på 0 eller 5',
            'Delelig med 9: cifrenes sum er delelig med 9',
          ],
        },
        {
          kind: 'idea',
          title: 'SFD og MFM',
          body: 'Største fælles divisor (SFD) bruges til at forkorte brøker. Mindste fælles multiplum (MFM) bruges til at finde fællesnævner.',
        },
      ],
      worked: [
        {
          title: 'Primfaktoropløs 84',
          prompt: 'Skriv 84 som et produkt af primtal',
          steps: [
            s('Start med det mindste primtal der går op.', '84 : 2 = 42'),
            s('Bliv ved så længe 2 går op.', '42 : 2 = 21'),
            s('2 går ikke op i 21. Prøv 3.', '21 : 3 = 7'),
            s('7 er selv et primtal — vi er færdige.', '84 = 2 \\cdot 2 \\cdot 3 \\cdot 7 = 2^2\\cdot 3\\cdot 7'),
          ],
          takeaway: 'Arbejd dig opad gennem primtallene: 2, 3, 5, 7, 11 …',
        },
      ],
      generators: [
        {
          id: 'primtal-mcq',
          label: 'Er tallet et primtal?',
          make: ({ rng, level }) => {
            const hi = lv(level, [30, 50, 80, 120, 200]);
            const pool = [...Array(hi).keys()].map((i) => i + 2);
            const primes = pool.filter(isPrime);
            const composites = pool.filter((n) => !isPrime(n) && n > 3);
            const target = rng.bool() ? rng.pick(primes) : rng.pick(composites);
            const prime = isPrime(target);
            const divisor = prime ? 0 : [2, 3, 5, 7, 11, 13].find((d) => target % d === 0 && target !== d) ?? 2;
            return mcq(rng, {
              prompt: `Er $${target}$ et primtal?`,
              options: [
                { text: 'Ja', correct: prime },
                { text: 'Nej', correct: !prime },
              ],
              hints: [
                'Et primtal kan kun deles med 1 og sig selv.',
                'Prøv at dividere med 2, 3, 5, 7, 11 … indtil kvadratroden af tallet.',
                prime ? `Ingen af primtallene op til ${Math.floor(Math.sqrt(target))} går op i ${target}.` : `Prøv at dividere med ${divisor}.`,
              ],
              solution: prime
                ? [s(`Ingen primtal op til √${target} ≈ ${Math.floor(Math.sqrt(target))} går op.`, undefined, `${target} er et primtal.`)]
                : [s(`${divisor} går op i tallet.`, `${target} : ${divisor} = ${target / divisor}`, `${target} er derfor ikke et primtal.`)],
              seconds: 30,
            });
          },
        },
        {
          id: 'primfaktor',
          label: 'Primfaktoropløsning',
          minLevel: 2,
          make: ({ rng, level }) => {
            const hi = lv(level, [30, 60, 120, 250, 500]);
            let n = rng.int(12, hi);
            while (isPrime(n)) n = rng.int(12, hi);
            const factors: number[] = [];
            let rest = n;
            for (let p = 2; p <= rest; p++) {
              while (rest % p === 0) {
                factors.push(p);
                rest /= p;
              }
            }
            const plain = factors.join('*');
            const counts = new Map<number, number>();
            factors.forEach((f) => counts.set(f, (counts.get(f) ?? 0) + 1));
            const powerForm = [...counts.entries()].map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join('*');
            return {
              prompt: `Skriv $${n}$ som et produkt af primtal.`,
              instruction: 'Skriv primtallene i stigende rækkefølge med gangetegn, fx 2·2·3.',
              input: { kind: 'expression', placeholder: 'fx 2·2·3' },
              answer: { type: 'expression', value: plain, accept: [powerForm, factors.join('·'), factors.join(' * ')] },
              hints: [
                'Start med det mindste primtal der går op i tallet.',
                'Bliv ved med at dividere, indtil du står med et primtal.',
                `Første skridt: ${n} : ${factors[0]} = ${n / (factors[0] as number)}.`,
              ],
              solution: [
                s('Divider igennem med primtal nedefra.', `${n} : ${factors[0]} = ${n / (factors[0] as number)}`),
                s('Fortsæt indtil der kun står primtal tilbage.', `${n} = ${factors.join(' \\cdot ')}`),
                s('Skrevet med potenser.', `= ${powerForm.replace(/\*/g, ' \\cdot ')}`),
              ],
              seconds: 60,
            };
          },
        },
        {
          id: 'sfd-mfm',
          label: 'SFD og MFM',
          minLevel: 3,
          make: ({ rng, level }) => {
            const hi = lv(level, [20, 30, 40, 60, 90]);
            const a = rng.int(6, hi);
            const b = rng.int(6, hi);
            const wantGcd = rng.bool();
            const value = wantGcd ? gcd(a, b) : lcm(a, b);
            return {
              prompt: wantGcd
                ? `Find den største fælles divisor for $${a}$ og $${b}$.`
                : `Find det mindste fælles multiplum af $${a}$ og $${b}$.`,
              input: { kind: 'number' },
              answer: numAns(value),
              hints: [
                wantGcd ? 'Skriv alle tal op, der går op i begge.' : 'Skriv de første multipla af hvert tal op.',
                wantGcd ? 'Primfaktoropløs begge tal og tag de faktorer, de har til fælles.' : 'Primfaktoropløs begge og tag hver primfaktor med den højeste eksponent.',
                wantGcd ? `Prøv om ${value} går op i begge.` : `Prøv ${value}.`,
              ],
              solution: wantGcd
                ? [
                    s('Find de tal der går op i begge.', `${a}: ${[...Array(a).keys()].map((i) => i + 1).filter((d) => a % d === 0).join(', ')}`),
                    s('Og for det andet tal.', `${b}: ${[...Array(b).keys()].map((i) => i + 1).filter((d) => b % d === 0).join(', ')}`),
                    s('Den største fælles er.', `\\text{SFD} = ${value}`),
                  ]
                : [
                    s('Skriv multipla op.', `${a}: ${[1, 2, 3, 4, 5].map((i) => a * i).join(', ')} \\dots`),
                    s('Og for det andet tal.', `${b}: ${[1, 2, 3, 4, 5].map((i) => b * i).join(', ')} \\dots`),
                    s('Det mindste der går igen.', `\\text{MFM} = ${value}`),
                  ],
              concept: wantGcd ? 'SFD bruges til at forkorte brøker.' : 'MFM bruges til at finde fællesnævner.',
              seconds: 60,
            };
          },
        },
      ],
    },
  ],
};
