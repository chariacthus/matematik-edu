import type { Domain } from '../../types';
import { num, roundTo } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const decimaler: Domain = {
  id: 'decimaler',
  name: 'Decimaltal',
  category: 'tal-algebra',
  icon: '0,5',
  blurb: 'Pladsværdi, regning med kommatal og de omregninger du bruger hele tiden.',
  skills: [
    {
      id: 'decimal-pladsvaerdi',
      domainId: 'decimaler',
      name: 'Pladsværdi og sammenligning',
      goal: 'Du kan aflæse pladsværdier og afgøre hvilket decimaltal der er størst.',
      prerequisites: [],
      tier: 1,
      explain: [
        {
          kind: 'idea',
          title: 'Hver plads er ti gange mindre',
          body: 'Til venstre for kommaet: enere, tiere, hundreder. Til højre: tiendedele, hundrededele, tusindedele.',
        },
        {
          kind: 'math',
          math: '3{,}47 = 3 + \\tfrac{4}{10} + \\tfrac{7}{100}',
          caption: 'Cifrene efter kommaet er brøkdele med 10, 100, 1000 i nævneren.',
        },
        {
          kind: 'warning',
          body: 'Flere cifre betyder ikke større tal. 0,25 er mindre end 0,7, fordi 2 tiendedele er mindre end 7 tiendedele.',
        },
        {
          kind: 'idea',
          title: 'Fyld op med nuller',
          body: 'Skal du sammenligne 0,7 og 0,25, så skriv 0,70 og 0,25. Nu har de lige mange decimaler, og du kan sammenligne som hele tal.',
        },
      ],
      worked: [
        {
          title: 'Hvilket er størst: 0,8 eller 0,75?',
          prompt: '0{,}8 \;?\; 0{,}75',
          steps: [
            s('Giv dem lige mange decimaler.', '0{,}80 \;?\; 0{,}75'),
            s('Sammenlign som hele tal.', '80 > 75'),
            s('Altså.', '0{,}8 > 0{,}75'),
          ],
          takeaway: 'Ekstra nuller til højre ændrer ikke værdien — men gør sammenligningen let.',
        },
      ],
      generators: [
        {
          id: 'decimal-stoerst',
          label: 'Hvilket tal er størst?',
          make: ({ rng, level }) => {
            const decimals = lv(level, [1, 2, 2, 3, 3]);
            const vals = new Set<number>();
            while (vals.size < 4) {
              const d = rng.int(1, decimals);
              vals.add(roundTo(rng.int(1, 10 ** d - 1) / 10 ** d, 4));
            }
            const list = [...vals];
            const max = Math.max(...list);
            const longest = list.reduce((a, b) => (String(b).length > String(a).length ? b : a));
            return mcq(rng, {
              prompt: 'Hvilket tal er størst?',
              options: list.map((v) => ({
                text: num(v),
                correct: v === max,
                misconceptionId: v === longest && v !== max ? 'decimal-laengere-stoerre' : undefined,
                feedback: v === longest && v !== max ? `${num(v)} har flest cifre, men det gør det ikke størst. Skriv tallene med lige mange decimaler og sammenlign fra venstre.` : undefined,
              })),
              hints: [
                'Skriv tallene med lige mange decimaler ved at sætte nuller bagpå.',
                'Sammenlign så cifrene fra venstre mod højre.',
                `Tiendedelene afgør det her: den største er ${num(max)}.`,
              ],
              solution: [
                s('Giv alle tal lige mange decimaler.', list.map((v) => num(v, 3)).join(' \\quad ')),
                s('Sammenlign fra venstre.', `\\text{Størst: } ${num(max)}`),
              ],
              seconds: 30,
            });
          },
        },
        {
          id: 'decimal-plads',
          label: 'Pladsværdi',
          make: ({ rng, level }) => {
            const decimals = lv(level, [2, 2, 3, 3, 3]);
            const whole = rng.int(1, lv(level, [9, 99, 99, 999, 9999]));
            const decPart = rng.int(10 ** (decimals - 1), 10 ** decimals - 1);
            const value = Number(`${whole}.${decPart}`);
            const places = ['tiendedele', 'hundrededele', 'tusindedele'];
            const idx = rng.int(0, decimals - 1);
            const digit = Number(String(decPart).padStart(decimals, '0')[idx]);
            return {
              prompt: `Hvilket ciffer står på ${places[idx]}-pladsen i tallet $${num(value)}$?`,
              input: { kind: 'number' },
              answer: numAns(digit, 1e-9),
              hints: [
                'Tæl pladserne efter kommaet: 1. plads er tiendedele, 2. er hundrededele, 3. er tusindedele.',
                `Du skal bruge den ${idx + 1}. plads efter kommaet.`,
                `Decimalerne er ${String(decPart).padStart(decimals, '0').split('').join(' - ')}.`,
              ],
              solution: [
                s('Navngiv pladserne efter kommaet.', `${String(decPart).padStart(decimals, '0').split('').map((c, i) => `${c}\\,(\\text{${places[i]}})`).join('\;')}`),
                s('Aflæs den ønskede plads.', `${digit}`),
              ],
              seconds: 30,
            };
          },
        },
      ],
    },

    {
      id: 'decimal-regning',
      domainId: 'decimaler',
      name: 'Plus, minus, gange og dividere',
      goal: 'Du kan regne med decimaltal og placere kommaet rigtigt.',
      prerequisites: ['decimal-pladsvaerdi'],
      tier: 2,
      explain: [
        {
          kind: 'rule',
          title: 'Plus og minus',
          math: '\\begin{aligned} 12{,}40 \\\\ +\;3{,}75 \\end{aligned}',
          body: 'Sæt kommaerne under hinanden. Fyld op med nuller, så tallene er lige lange.',
        },
        {
          kind: 'rule',
          title: 'Multiplikation',
          math: '0{,}3 \\cdot 0{,}4 = 0{,}12',
          body: 'Regn uden komma (3 · 4 = 12). Tæl decimalerne i de to faktorer (1 + 1 = 2) og sæt lige så mange i svaret.',
        },
        {
          kind: 'rule',
          title: 'Division',
          math: '4{,}8 : 0{,}6 = 48 : 6 = 8',
          body: 'Gang begge tal med 10 (eller 100) indtil divisoren er et helt tal. Svaret ændrer sig ikke.',
        },
        {
          kind: 'warning',
          body: 'Ganger du med et tal mellem 0 og 1, bliver resultatet mindre. Ganger du med noget under 1, så forvent et fald.',
        },
      ],
      worked: [
        {
          title: '2,5 · 0,4',
          prompt: '2{,}5 \\cdot 0{,}4',
          steps: [
            s('Fjern kommaerne og gang.', '25 \\cdot 4 = 100'),
            s('Tæl decimaler i opgaven.', '1 + 1 = 2', '2,5 har én decimal, 0,4 har én.'),
            s('Sæt 2 decimaler i svaret.', '100 \\rightarrow 1{,}00 = 1'),
          ],
          takeaway: 'Antallet af decimaler i svaret er summen af decimalerne i faktorerne — hver gang.',
        },
      ],
      generators: [
        {
          id: 'decimal-plusminus',
          label: 'Plus og minus',
          make: ({ rng, level }) => {
            const dec = lv(level, [1, 1, 2, 2, 2]);
            const p = 10 ** dec;
            const a = roundTo(rng.int(p, 100 * p) / p, dec);
            const b = roundTo(rng.int(p, Math.round(a * p)) / p, dec);
            const plus = rng.bool(0.6);
            const value = roundTo(plus ? a + b : a - b, dec);
            return {
              prompt: `Beregn $${num(a)} ${plus ? '+' : '-'} ${num(b)}$`,
              input: { kind: 'number' },
              answer: numAns(value, 1e-6),
              hints: [
                'Sæt tallene under hinanden med kommaerne lige over hinanden.',
                'Fyld op med nuller, så begge tal har lige mange decimaler.',
                `Regn som med hele tal og sæt kommaet ned i svaret.`,
              ],
              solution: [
                s('Stil op med komma under komma.', `${num(a, dec)} ${plus ? '+' : '-'} ${num(b, dec)}`),
                s('Regn og sæt kommaet lige ned.', `= ${num(value)}`),
              ],
              seconds: 40,
            };
          },
        },
        {
          id: 'decimal-gange',
          label: 'Multiplikation',
          make: ({ rng, level }) => {
            const decA = lv(level, [1, 1, 1, 2, 2]);
            const decB = lv(level, [1, 1, 2, 2, 2]);
            const a = roundTo(rng.int(1, 10 ** (decA + 1) - 1) / 10 ** decA, decA);
            const b = roundTo(rng.int(1, 10 ** (decB + 1) - 1) / 10 ** decB, decB);
            const value = roundTo(a * b, decA + decB);
            const intProduct = Math.round(a * 10 ** decA) * Math.round(b * 10 ** decB);
            return {
              prompt: `Beregn $${num(a)} \\cdot ${num(b)}$`,
              input: { kind: 'number' },
              answer: numAns(value, 1e-6),
              hints: [
                'Fjern kommaerne og gang tallene som hele tal.',
                `${Math.round(a * 10 ** decA)} · ${Math.round(b * 10 ** decB)} = ${intProduct}`,
                `Der er ${decA} + ${decB} = ${decA + decB} decimaler i alt, så sæt ${decA + decB} decimaler i svaret.`,
              ],
              solution: [
                s('Gang uden komma.', `${Math.round(a * 10 ** decA)} \\cdot ${Math.round(b * 10 ** decB)} = ${intProduct}`),
                s('Tæl decimalerne.', `${decA} + ${decB} = ${decA + decB}`),
                s('Sæt kommaet.', `= ${num(value)}`),
              ],
              traps: [
                ...trapIfDifferent(value, roundTo(intProduct, 6), 'decimal-komma', `Du glemte kommaet. Der er ${decA + decB} decimaler i alt i opgaven, så svaret skal have ${decA + decB} decimaler: ${num(value)}.`),
                ...trapIfDifferent(value, roundTo(intProduct / 10 ** (decA + decB - 1), 6), 'decimal-komma', `Kommaet står én plads forkert. Tæl decimalerne i begge faktorer og læg dem sammen: ${decA} + ${decB} = ${decA + decB}.`),
              ],
              concept: 'Decimaler i svaret = decimaler i faktor 1 + decimaler i faktor 2.',
              seconds: 50,
            };
          },
        },
        {
          id: 'decimal-dividere',
          label: 'Division',
          minLevel: 2,
          make: ({ rng, level }) => {
            const dec = lv(level, [1, 1, 1, 2, 2]);
            const divisor = roundTo(rng.int(1, 9) / 10 ** dec, dec);
            const quotient = rng.int(2, lv(level, [9, 12, 20, 40, 80]));
            const dividend = roundTo(divisor * quotient, dec + 2);
            return {
              prompt: `Beregn $${num(dividend)} : ${num(divisor)}$`,
              input: { kind: 'number' },
              answer: numAns(quotient, 1e-6),
              hints: [
                'Gang begge tal med 10 (eller 100) indtil divisoren er et helt tal.',
                `Gang begge med ${10 ** dec}: ${num(roundTo(dividend * 10 ** dec, 4))} : ${Math.round(divisor * 10 ** dec)}`,
                'Nu er det en almindelig division.',
              ],
              solution: [
                s(`Gang begge tal med ${10 ** dec}.`, `${num(dividend)} : ${num(divisor)} = ${num(roundTo(dividend * 10 ** dec, 4))} : ${Math.round(divisor * 10 ** dec)}`, 'Forholdet mellem tallene er uændret.'),
                s('Regn divisionen.', `= ${quotient}`),
              ],
              concept: 'Gang begge tal med det samme — kvotienten er den samme.',
              seconds: 55,
            };
          },
        },
        {
          id: 'decimal-indkoeb',
          label: 'Indkøb med decimaltal',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const count = rng.int(2, lv(level, [4, 5, 7, 9, 12]));
            const price = roundTo(rng.int(150, 9950) / 100, 2);
            const paid = Math.ceil((count * price) / 50) * 50;
            const total = roundTo(count * price, 2);
            return {
              prompt: `${who} køber ${count} stk. af en vare der koster ${num(price, 2)} kr. pr. stk. og betaler med ${paid} kr. Hvor meget får ${who} tilbage?`,
              input: { kind: 'number', unit: 'kr' },
              answer: numAns(roundTo(paid - total, 2), 0.005),
              hints: [
                'Find først hvad varerne koster i alt.',
                `${count} · ${num(price, 2)} = ${num(total, 2)} kr.`,
                `Træk det fra de ${paid} kr.`,
              ],
              solution: [
                s('Samlet pris.', `${count} \\cdot ${num(price, 2)} = ${num(total, 2)}`),
                s('Byttepenge.', `${paid} - ${num(total, 2)} = ${num(roundTo(paid - total, 2), 2)}`),
              ],
              traps: trapIfDifferent(roundTo(paid - total, 2), roundTo(total, 2), 'tekst-forkert-regneart', 'Det er prisen i alt, ikke byttepengene. Træk prisen fra det beløb der blev betalt med.'),
              seconds: 70,
            };
          },
        },
      ],
    },

    {
      id: 'decimal-tipotenser',
      domainId: 'decimaler',
      name: 'Gange og dividere med 10, 100 og 1000',
      goal: 'Du kan flytte kommaet og omregne mellem enheder.',
      prerequisites: ['decimal-pladsvaerdi'],
      tier: 2,
      explain: [
        {
          kind: 'idea',
          title: 'Kommaet flytter sig',
          body: 'Gange med 10 flytter kommaet én plads til højre. Dividere med 10 flytter det én plads til venstre. Ét nul = én plads.',
        },
        { kind: 'math', math: '4{,}7 \\cdot 100 = 470 \\qquad 4{,}7 : 100 = 0{,}047' },
        {
          kind: 'list',
          title: 'Enheder du skal kunne',
          items: ['1 m = 100 cm', '1 km = 1000 m', '1 kg = 1000 g', '1 L = 100 cl = 1000 mL', '1 cm = 10 mm'],
        },
        {
          kind: 'warning',
          body: 'Går du fra en stor enhed til en lille (m → cm), bliver tallet større. Går du den anden vej, bliver det mindre. Tjek altid at svaret peger den rigtige vej.',
        },
      ],
      worked: [
        {
          title: 'Omregn 3,4 km til meter',
          prompt: '3{,}4 \\text{ km} = ?\\text{ m}',
          steps: [
            s('1 km er 1000 m, så vi går fra stor til lille enhed.', undefined, 'Tallet skal blive større.'),
            s('Gang med 1000.', '3{,}4 \\cdot 1000 = 3400'),
            s('Svar.', '3{,}4\\text{ km} = 3400\\text{ m}'),
          ],
          takeaway: 'Stor enhed → lille enhed: gang. Lille → stor: divider.',
        },
      ],
      generators: [
        {
          id: 'tipotens-flyt',
          label: 'Flyt kommaet',
          make: ({ rng, level }) => {
            const power = rng.pick(lv<number[]>(level, [[10], [10, 100], [10, 100, 1000], [100, 1000], [100, 1000, 10000]]));
            const dec = rng.int(1, 3);
            const value = roundTo(rng.int(1, 999) / 10 ** dec, dec);
            const multiply = rng.bool();
            const result = roundTo(multiply ? value * power : value / power, 8);
            return {
              prompt: `Beregn $${num(value)} ${multiply ? '\\cdot' : ':'} ${power}$`,
              input: { kind: 'number' },
              answer: numAns(result, 1e-8),
              hints: [
                `${power} har ${String(power).length - 1} nuller.`,
                `Flyt kommaet ${String(power).length - 1} plads${String(power).length - 1 > 1 ? 'er' : ''} mod ${multiply ? 'højre' : 'venstre'}.`,
                'Fyld op med nuller hvis der mangler cifre.',
              ],
              solution: [
                s(`${multiply ? 'Gange' : 'Dividere'} med ${power} flytter kommaet ${String(power).length - 1} plads${String(power).length - 1 > 1 ? 'er' : ''} mod ${multiply ? 'højre' : 'venstre'}.`),
                s('Resultat.', `= ${num(result)}`),
              ],
              traps: trapIfDifferent(result, roundTo(multiply ? value / power : value * power, 8), 'decimal-komma', `Kommaet flyttede den forkerte vej. Når man ${multiply ? 'ganger' : 'dividerer'}, bliver tallet ${multiply ? 'større' : 'mindre'}.`),
              seconds: 30,
            };
          },
        },
        {
          id: 'enhedsomregning',
          label: 'Omregn enheder',
          make: ({ rng, level }) => {
            const table = [
              { from: 'km', to: 'm', factor: 1000 },
              { from: 'm', to: 'cm', factor: 100 },
              { from: 'cm', to: 'mm', factor: 10 },
              { from: 'kg', to: 'g', factor: 1000 },
              { from: 'L', to: 'mL', factor: 1000 },
              { from: 'L', to: 'cl', factor: 100 },
            ];
            const row = rng.pick(table);
            const up = rng.bool(0.55);
            const dec = lv(level, [1, 1, 2, 2, 3]);
            const value = roundTo(rng.int(1, 999) / 10 ** dec, dec);
            const result = roundTo(up ? value * row.factor : value / row.factor, 8);
            return {
              prompt: up
                ? `Omregn $${num(value)}\\text{ ${row.from}}$ til ${row.to}.`
                : `Omregn $${num(value)}\\text{ ${row.to}}$ til ${row.from}.`,
              input: { kind: 'number', unit: up ? row.to : row.from },
              answer: numAns(result, 1e-8),
              hints: [
                `1 ${row.from} = ${row.factor} ${row.to}.`,
                up ? 'Du går fra en stor enhed til en lille, så tallet bliver større.' : 'Du går fra en lille enhed til en stor, så tallet bliver mindre.',
                `${up ? 'Gang' : 'Divider'} med ${row.factor}.`,
              ],
              solution: [
                s('Find omregningsfaktoren.', `1\\text{ ${row.from}} = ${row.factor}\\text{ ${row.to}}`),
                s(up ? 'Gang.' : 'Divider.', `${num(value)} ${up ? '\\cdot' : ':'} ${row.factor} = ${num(result)}`),
              ],
              traps: trapIfDifferent(result, roundTo(up ? value / row.factor : value * row.factor, 8), 'decimal-komma', `Du regnede den forkerte vej. ${up ? `Der er ${row.factor} ${row.to} i én ${row.from}, så tallet skal blive større.` : `Der skal ${row.factor} ${row.to} til én ${row.from}, så tallet skal blive mindre.`}`),
              seconds: 45,
            };
          },
        },
      ],
    },
  ],
};
