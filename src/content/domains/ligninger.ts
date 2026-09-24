import type { Domain } from '../../types';
import { coef, linearTex, num, roundTo, signed } from '../../lib/math';
import { lv, mcq, name, numAns, s, trapIfDifferent } from '../helpers';

export const ligninger: Domain = {
  id: 'ligninger',
  name: 'Ligninger',
  category: 'tal-algebra',
  area: 'ligninger',
  blurb: 'Vægten der skal holdes i balance, fra ét trin til ligninger med parenteser og brøker.',
  skills: [
    {
      id: 'ligning-ettrin',
      domainId: 'ligninger',
      name: 'Ligninger i ét trin',
      goal: 'Du kan isolere x når der kun mangler ét skridt.',
      prerequisites: [],
      tier: 1,
      explain: [
        { kind: 'analogy', body: 'En ligning er en vægt i balance. Lighedstegnet er midterpunktet. Det du gør på den ene side, SKAL du gøre på den anden, ellers vælter vægten.' },
        { kind: 'visual', visual: { kind: 'balance', left: { x: 1, ones: 4 }, right: { x: 0, ones: 12 } }, caption: 'x + 4 = 12. Fjerner du 4 klodser til venstre, skal du fjerne 4 til højre.' },
        { kind: 'rule', title: 'Det handler om at komme af med det der står hos x', math: 'x + a = b \;\\Rightarrow\; x = b - a \\qquad a \\cdot x = b \;\\Rightarrow\; x = \\tfrac{b}{a}' },
        { kind: 'idea', title: 'Tjek altid', body: 'Sæt dit svar ind i den oprindelige ligning. Passer begge sider, er du færdig.' },
      ],
      worked: [
        {
          title: 'Løs 5x = 35',
          prompt: '5x = 35',
          steps: [
            s('x er ganget med 5. Det modsatte er at dividere med 5.', undefined, 'Vi gør det på begge sider.'),
            s('Divider.', '\\frac{5x}{5} = \\frac{35}{5}'),
            s('Resultat.', 'x = 7'),
            s('Kontrol.', '5 \\cdot 7 = 35 \;\\checkmark'),
          ],
          takeaway: 'Gør det modsatte af det der sker med x, og gør det på begge sider.',
        },
      ],
      generators: [
        {
          id: 'ligning-plus',
          label: 'x + a = b',
          make: ({ rng, level }) => {
            const hi = lv(level, [10, 20, 40, 80, 150]);
            const x = rng.int(1, hi);
            const a = rng.nonZero(-hi, hi);
            const b = x + a;
            return {
              prompt: `Løs ligningen $x ${signed(a)} = ${b}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              visual: a > 0 ? { kind: 'balance', left: { x: 1, ones: a }, right: { x: 0, ones: b } } : undefined,
              visualAid: true,
              hints: [
                `Der står ${signed(a)} på x's side. Hvordan får du det væk?`,
                `${a > 0 ? 'Træk' : 'Læg'} ${Math.abs(a)} ${a > 0 ? 'fra' : 'til'} på BEGGE sider.`,
                `x = ${b} ${signed(-a)}`,
              ],
              solution: [
                s(`${a > 0 ? 'Træk' : 'Læg'} ${Math.abs(a)} ${a > 0 ? 'fra' : 'til'} på begge sider.`, `x ${signed(a)} ${signed(-a)} = ${b} ${signed(-a)}`),
                s('Venstre side står nu alene.', `x = ${x}`),
                s('Kontrol.', `${x} ${signed(a)} = ${b} \;\\checkmark`),
              ],
              traps: trapIfDifferent(x, b + a, 'ligning-fortegn', `Du lagde ${Math.abs(a)} til i stedet for at trække fra (eller omvendt). Når et led skifter side, skifter det fortegn.`),
              concept: 'Samme handling på begge sider.',
              seconds: 35,
            };
          },
        },
        {
          id: 'ligning-gange',
          label: 'ax = b',
          make: ({ rng, level }) => {
            const hi = lv(level, [6, 9, 12, 15, 20]);
            const a = rng.nonZero(-hi, hi);
            const x = rng.nonZero(-lv(level, [9, 12, 20, 30, 50]), lv(level, [9, 12, 20, 30, 50]));
            const b = a * x;
            return {
              prompt: `Løs ligningen $${coef(a)} = ${b}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              hints: [
                `x er ganget med ${a}. Hvad er det modsatte af at gange?`,
                `Divider begge sider med ${a}.`,
                `x = ${b} : ${a}`,
              ],
              solution: [
                s(`Divider begge sider med ${a}.`, `\\frac{${coef(a)}}{${a}} = \\frac{${b}}{${a}}`),
                s('Resultat.', `x = ${x}`),
                s('Kontrol.', `${a} \\cdot ${x} = ${b} \;\\checkmark`),
              ],
              traps: trapIfDifferent(x, b - a, 'ligning-fortegn', `Du trak ${a} fra. Men x er GANGET med ${a}, så du skal dividere.`),
              seconds: 35,
            };
          },
        },
      ],
    },

    {
      id: 'ligning-totrin',
      domainId: 'ligninger',
      name: 'Ligninger i to trin',
      goal: 'Du kan løse ligninger på formen ax + b = c.',
      prerequisites: ['ligning-ettrin'],
      tier: 2,
      explain: [
        { kind: 'idea', title: 'Pak x ud i omvendt rækkefølge', body: 'x er først ganget med a og derefter er der lagt b til. Pak ud bagfra: fjern b først, dividér med a bagefter.' },
        { kind: 'visual', visual: { kind: 'balance', left: { x: 2, ones: 4 }, right: { x: 0, ones: 12 } }, caption: '2x + 4 = 12. Fjern 4 fra begge sider, og del så begge sider i to.' },
        { kind: 'list', title: 'Opskrift', items: ['1. Få alle tal væk fra x-siden (plus/minus)', '2. Divider med tallet foran x', '3. Sæt svaret ind og kontrollér'] },
        { kind: 'warning', body: 'Når du dividerer, rammer divisionen HELE siden. (2x + 6) : 2 er x + 3, ikke x + 6.' },
      ],
      worked: [
        {
          title: 'Løs 2x + 4 = 12',
          prompt: '2x + 4 = 12',
          steps: [
            s('Træk 4 fra på begge sider.', '2x + 4 - 4 = 12 - 4'),
            s('Reducer.', '2x = 8'),
            s('Divider med 2 på begge sider.', '\\frac{2x}{2} = \\frac{8}{2}'),
            s('Resultat.', 'x = 4'),
            s('Kontrol.', '2 \\cdot 4 + 4 = 12 \;\\checkmark'),
          ],
          takeaway: 'Plus og minus først, gange og dividere bagefter. Det er omvendt af regnehierarkiet.',
        },
      ],
      generators: [
        {
          id: 'ligning-ax-b',
          label: 'ax + b = c',
          make: ({ rng, level }) => {
            const a = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const x = rng.nonZero(-lv(level, [8, 10, 15, 20, 30]), lv(level, [8, 10, 15, 20, 30]));
            const b = rng.nonZero(-lv(level, [10, 15, 25, 40, 60]), lv(level, [10, 15, 25, 40, 60]));
            const c = a * x + b;
            return {
              prompt: `Løs ligningen $${linearTex(a, b)} = ${c}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              visual: a > 0 && b > 0 && c > 0 && a <= 5 && b <= 8 && c <= 20 ? { kind: 'balance', left: { x: a, ones: b }, right: { x: 0, ones: c } } : undefined,
              visualAid: true,
              hints: [
                `Få først ${b} væk fra venstre side.`,
                `${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider: ${coef(a)} = ${c - b}.`,
                `Divider begge sider med ${a}.`,
              ],
              solution: [
                s(`${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider.`, `${coef(a)} = ${c} ${signed(-b)} = ${c - b}`),
                s(`Divider begge sider med ${a}.`, `x = \\frac{${c - b}}{${a}}`),
                s('Resultat.', `x = ${x}`),
                s('Kontrol.', `${a} \\cdot ${x} ${signed(b)} = ${c} \;\\checkmark`),
              ],
              traps: [
                ...trapIfDifferent(x, roundTo((c + b) / a, 6), 'ligning-fortegn', `Du lagde ${Math.abs(b)} til i stedet for at trække fra. Når ${signed(b)} skifter side, skifter fortegnet til ${signed(-b)}.`),
                ...trapIfDifferent(x, roundTo(c / a - b, 6), 'ligning-divider-delvis', `Du dividerede kun x-leddet med ${a}. Divisionen skal ramme hele siden, så fjern først ${b}.`),
              ],
              concept: 'Plus/minus først, derefter gange/dividere.',
              seconds: 55,
            };
          },
        },
        {
          id: 'ligning-tekst-totrin',
          label: 'Tekstopgave',
          minLevel: 2,
          make: ({ rng, level }) => {
            const who = name(rng);
            const per = rng.int(2, lv(level, [6, 10, 15, 25, 40]));
            const fixed = rng.int(5, lv(level, [30, 60, 100, 180, 300]));
            const hours = rng.int(2, lv(level, [6, 8, 12, 16, 24]));
            const total = per * hours + fixed;
            return {
              prompt: `${who} lejer en kajak. Det koster ${fixed} kr i fast leje plus ${per} kr pr. time. ${who} betaler ${total} kr i alt. Hvor mange timer var kajakken lejet?`,
              input: { kind: 'number', unit: 'timer' },
              answer: numAns(hours),
              hints: [
                'Kald antallet af timer for x og opstil en ligning.',
                `${per}x + ${fixed} = ${total}`,
                `Træk ${fixed} fra begge sider og divider med ${per}.`,
              ],
              solution: [
                s('Opstil ligningen.', `${per}x + ${fixed} = ${total}`),
                s(`Træk ${fixed} fra begge sider.`, `${per}x = ${total - fixed}`),
                s(`Divider med ${per}.`, `x = ${hours}`),
              ],
              traps: [
                ...trapIfDifferent(hours, roundTo(total / per, 4), 'ligning-divider-delvis', `Du glemte det faste beløb. Træk de ${fixed} kr fra først: ${total} − ${fixed} = ${total - fixed}.`),
                ...trapIfDifferent(hours, total - fixed, 'ligning-fortegn', `Det er hvad timerne koster i alt (${total - fixed} kr). Divider med timeprisen ${per} for at få antallet af timer.`),
              ],
              seconds: 80,
            };
          },
        },
      ],
    },

    {
      id: 'ligning-begge-sider',
      domainId: 'ligninger',
      name: 'x på begge sider',
      goal: 'Du kan løse ligninger hvor x optræder på begge sider af lighedstegnet.',
      prerequisites: ['ligning-totrin'],
      tier: 3,
      explain: [
        { kind: 'idea', title: 'Saml x ét sted', body: 'Flyt alle x-led over på den ene side og alle tal over på den anden. Så er du tilbage til en ligning du kender.' },
        { kind: 'rule', title: 'Flyt = skift fortegn', math: '5x - 3 = 2x + 9 \;\\Rightarrow\; 5x - 2x = 9 + 3', body: 'At "flytte over" er i virkeligheden at trække fra på begge sider. Derfor skifter fortegnet.' },
        { kind: 'idea', title: 'Vælg den største', body: 'Saml x der hvor koefficienten er størst. Så slipper du for et negativt tal foran x.' },
      ],
      worked: [
        {
          title: 'Løs 5x − 3 = 2x + 9',
          prompt: '5x - 3 = 2x + 9',
          steps: [
            s('Træk 2x fra på begge sider.', '5x - 2x - 3 = 9'),
            s('Reducer.', '3x - 3 = 9'),
            s('Læg 3 til på begge sider.', '3x = 12'),
            s('Divider med 3.', 'x = 4'),
            s('Kontrol.', '5\\cdot4 - 3 = 17 \\quad 2\\cdot4 + 9 = 17 \;\\checkmark'),
          ],
          takeaway: 'Kontrollen er ekstra vigtig her: begge sider skal give det samme tal.',
        },
      ],
      generators: [
        {
          id: 'ligning-x-begge',
          label: 'ax + b = cx + d',
          make: ({ rng, level }) => {
            const hi = lv(level, [6, 8, 10, 12, 15]);
            const a = rng.nonZero(-hi, hi);
            let c = rng.nonZero(-hi, hi);
            while (c === a) c = rng.nonZero(-hi, hi);
            const x = rng.nonZero(-lv(level, [6, 9, 12, 15, 20]), lv(level, [6, 9, 12, 15, 20]));
            const b = rng.nonZero(-lv(level, [10, 15, 25, 40, 60]), lv(level, [10, 15, 25, 40, 60]));
            const d = a * x + b - c * x;
            return {
              prompt: `Løs ligningen $${linearTex(a, b)} = ${linearTex(c, d)}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              hints: [
                'Saml x-leddene på den ene side og tallene på den anden.',
                `${c > 0 ? 'Træk' : 'Læg'} ${coef(Math.abs(c))} ${c > 0 ? 'fra' : 'til'} på begge sider: ${coef(a - c)} ${signed(b)} = ${d}.`,
                `Flyt så ${b} over: ${coef(a - c)} = ${d - b}.`,
              ],
              solution: [
                s('Saml x-leddene.', `${coef(a)} ${c > 0 ? '-' : '+'} ${coef(Math.abs(c))} = ${d} ${signed(-b)}`),
                s('Reducer begge sider.', `${coef(a - c)} = ${d - b}`),
                s(`Divider med ${a - c}.`, `x = ${x}`),
                s('Kontrol.', `${a}\\cdot${x} ${signed(b)} = ${a * x + b} \\quad ${c}\\cdot${x} ${signed(d)} = ${c * x + d} \;\\checkmark`),
              ],
              traps: [
                ...trapIfDifferent(x, roundTo((d + b) / (a - c), 6), 'ligning-fortegn', `Fortegnet på ${b} blev ikke vendt da leddet skiftede side. ${signed(b)} bliver til ${signed(-b)} på den anden side.`),
                ...trapIfDifferent(x, roundTo((d - b) / (a + c), 6), 'ligning-fortegn', `Du lagde x-koefficienterne sammen i stedet for at trække dem fra hinanden. ${coef(c)} flyttes over ved at trække ${coef(c)} fra begge sider.`),
              ],
              seconds: 75,
            };
          },
        },
        {
          id: 'ligning-tjek',
          label: 'Er løsningen rigtig?',
          minLevel: 2,
          make: ({ rng, level }) => {
            const hi = lv(level, [5, 7, 9, 12, 15]);
            const a = rng.int(2, hi);
            const c = rng.int(1, a - 1) || 1;
            const x = rng.nonZero(-9, 12);
            const b = rng.nonZero(-20, 20);
            const d = a * x + b - c * x;
            const guess = rng.bool(0.5) ? x : x + rng.nonZero(-3, 3);
            const isRight = guess === x;
            return mcq(rng, {
              prompt: `Er $x = ${guess}$ en løsning til ligningen $${linearTex(a, b)} = ${linearTex(c, d)}$?`,
              instruction: 'Sæt tallet ind på begge sider og sammenlign.',
              options: [
                { text: 'Ja', correct: isRight },
                { text: 'Nej', correct: !isRight },
              ],
              hints: [
                'Indsæt tallet på venstre side og regn ud.',
                `Venstre: ${a}·(${guess}) ${signed(b)} = ${a * guess + b}`,
                `Højre: ${c}·(${guess}) ${signed(d)} = ${c * guess + d}`,
              ],
              solution: [
                s('Indsæt i venstre side.', `${a}\\cdot(${guess}) ${signed(b)} = ${a * guess + b}`),
                s('Indsæt i højre side.', `${c}\\cdot(${guess}) ${signed(d)} = ${c * guess + d}`),
                s(isRight ? 'Begge sider giver det samme, så tallet er en løsning.' : 'Siderne giver ikke det samme, så tallet er ikke en løsning.', `${a * guess + b} ${isRight ? '=' : '\\ne'} ${c * guess + d}`),
              ],
              seconds: 50,
            });
          },
        },
      ],
    },

    {
      id: 'ligning-parenteser',
      domainId: 'ligninger',
      name: 'Ligninger med parenteser og brøker',
      goal: 'Du kan løse ligninger der først skal ryddes op i.',
      prerequisites: ['ligning-begge-sider', 'algebra-parentes'],
      tier: 4,
      explain: [
        { kind: 'list', title: 'Ryd op først', items: ['1. Gang parenteser ud', '2. Gang igennem med fællesnævneren hvis der er brøker', '3. Reducer hver side', '4. Løs som sædvanlig'] },
        { kind: 'rule', title: 'Væk med brøkerne', math: '\\frac{x}{3} + \\frac{x}{2} = 5 \;\\xrightarrow{\\cdot 6}\; 2x + 3x = 30', body: 'Gang HELE ligningen med fællesnævneren. Alle led, på begge sider.' },
        { kind: 'warning', body: 'Ganger du igennem med et tal, skal alle led rammes. Glemmer du ét led, er ligningen en anden.' },
      ],
      worked: [
        {
          title: 'Løs 3(x − 2) = 2x + 5',
          prompt: '3(x - 2) = 2x + 5',
          steps: [
            s('Gang 3 ind i parentesen.', '3x - 6 = 2x + 5'),
            s('Træk 2x fra begge sider.', 'x - 6 = 5'),
            s('Læg 6 til begge sider.', 'x = 11'),
            s('Kontrol.', '3(11-2) = 27 \\quad 2\\cdot11+5 = 27 \;\\checkmark'),
          ],
          takeaway: 'Ryd op først. En ligning bliver aldrig lettere af at du løser den i rod.',
        },
      ],
      generators: [
        {
          id: 'ligning-parentes',
          label: 'Med parentes',
          make: ({ rng, level }) => {
            const k = rng.int(2, lv(level, [3, 4, 5, 6, 8])) * (rng.bool(0.75) ? 1 : -1);
            const p = rng.nonZero(-lv(level, [5, 7, 9, 12, 15]), lv(level, [5, 7, 9, 12, 15]));
            const x = rng.nonZero(-lv(level, [6, 8, 10, 15, 20]), lv(level, [6, 8, 10, 15, 20]));
            let c = rng.nonZero(-6, 6);
            while (c === k) c = rng.nonZero(-6, 6);
            const d = k * (x + p) - c * x;
            return {
              prompt: `Løs ligningen $${k}(x ${signed(p)}) = ${linearTex(c, d)}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              hints: [
                `Gang ${k} ind i parentesen, på BEGGE led.`,
                `${k}(x ${signed(p)}) = ${linearTex(k, k * p)}`,
                'Nu er det en almindelig ligning med x på begge sider.',
              ],
              solution: [
                s('Gang ind i parentesen.', `${linearTex(k, k * p)} = ${linearTex(c, d)}`),
                s('Saml x-leddene.', `${coef(k - c)} = ${d - k * p}`),
                s(`Divider med ${k - c}.`, `x = ${x}`),
                s('Kontrol.', `${k}(${x} ${signed(p)}) = ${k * (x + p)} \;\\checkmark`),
              ],
              traps: [
                ...trapIfDifferent(x, roundTo((d - p) / (k - c), 6), 'algebra-parentes-delvis', `Du gangede kun ${k} ind på x. Faktoren skal ganges på begge led: ${k} · (${p}) = ${k * p}.`),
              ],
              seconds: 85,
            };
          },
        },
        {
          id: 'ligning-broek',
          label: 'Med brøk',
          minLevel: 3,
          make: ({ rng, level }) => {
            const d1 = rng.int(2, lv(level, [3, 4, 5, 6, 8]));
            const x = d1 * rng.nonZero(-8, 10);
            const b = rng.nonZero(-lv(level, [6, 10, 15, 20, 30]), lv(level, [6, 10, 15, 20, 30]));
            const c = x / d1 + b;
            return {
              prompt: `Løs ligningen $\\dfrac{x}{${d1}} ${signed(b)} = ${c}$`,
              input: { kind: 'number' },
              answer: numAns(x),
              hints: [
                `Få først ${b} væk: ${b > 0 ? 'træk' : 'læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider.`,
                `\\frac{x}{${d1}} = ${c - b}`,
                `Gang begge sider med ${d1}.`,
              ],
              solution: [
                s(`${b > 0 ? 'Træk' : 'Læg'} ${Math.abs(b)} ${b > 0 ? 'fra' : 'til'} på begge sider.`, `\\frac{x}{${d1}} = ${c - b}`),
                s(`Gang begge sider med ${d1}.`, `x = ${c - b} \\cdot ${d1} = ${x}`),
                s('Kontrol.', `\\frac{${x}}{${d1}} ${signed(b)} = ${c} \;\\checkmark`),
              ],
              traps: [
                ...trapIfDifferent(x, roundTo((c - b) / d1, 6), 'ligning-fortegn', `x er DIVIDERET med ${d1}, så du skal gange med ${d1} for at få x alene.`),
                ...trapIfDifferent(x, roundTo(c * d1, 6), 'ligning-fortegn', `Du gangede igennem uden først at fjerne ${signed(b)}. Ganger du hele ligningen med ${d1}, skal ${b} også ganges: x ${signed(b * d1)} = ${c * d1}.`),
              ],
              seconds: 80,
            };
          },
        },
      ],
    },

    {
      id: 'ligning-formler',
      domainId: 'ligninger',
      name: 'Isolér en variabel i en formel',
      goal: 'Du kan omskrive en formel så en anden variabel står alene.',
      prerequisites: ['ligning-totrin'],
      tier: 4,
      explain: [
        { kind: 'idea', title: 'Samme regler, bare med bogstaver', body: 'At isolere h i V = l · b · h er præcis det samme som at løse en ligning. Bogstaverne opfører sig som tal.' },
        { kind: 'math', math: 'V = l \\cdot b \\cdot h \;\\Rightarrow\; h = \\frac{V}{l \\cdot b}' },
        { kind: 'idea', title: 'Hvorfor gøre det?', body: 'Skal du bruge den samme formel mange gange til at finde det samme, er det hurtigere at omskrive én gang.' },
      ],
      worked: [
        {
          title: 'Isolér b i A = ½ · h · b',
          prompt: 'A = \\tfrac{1}{2} h b',
          steps: [
            s('Gang begge sider med 2.', '2A = h b'),
            s('Divider begge sider med h.', '\\frac{2A}{h} = b'),
            s('Skriv med b først.', 'b = \\frac{2A}{h}'),
          ],
          takeaway: 'Fjern først det der er lagt til, så det der er ganget på.',
        },
      ],
      generators: [
        {
          id: 'formel-isoler',
          label: 'Isolér variablen',
          make: ({ rng }) => {
            // Distraktorerne er skrevet i hånden, så hver forkert svarmulighed
            // svarer til en fejl en elev faktisk laver.
            const cases = [
              {
                formula: 'A = l \\cdot b',
                solveFor: 'b',
                answer: '\\frac{A}{l}',
                wrong: [
                  { text: 'A \\cdot l', why: 'b er ganget med l, så du skal dividere med l, ikke gange.' },
                  { text: 'A - l', why: 'l er ganget på, ikke lagt til. Det modsatte af gange er at dividere.' },
                ],
                hint: 'b er ganget med l. Divider begge sider med l.',
              },
              {
                formula: 'O = 2(l + b)',
                solveFor: 'l',
                answer: '\\frac{O}{2} - b',
                wrong: [
                  { text: '\\frac{O - b}{2}', why: 'Du trak b fra før du dividerede. Parentesen ganges med 2, så divider først med 2.' },
                  { text: 'O - 2b', why: 'Der mangler divisionen med 2. Hele parentesen er ganget med 2.' },
                ],
                hint: 'Divider først begge sider med 2, og træk så b fra.',
              },
              {
                formula: 'V = l \\cdot b \\cdot h',
                solveFor: 'h',
                answer: '\\frac{V}{l \\cdot b}',
                wrong: [
                  { text: '\\frac{V}{l}', why: 'Der divideres kun med l. Men h er ganget med både l og b.' },
                  { text: 'V \\cdot l \\cdot b', why: 'h er ganget med l og b, så der skal divideres, ikke ganges igen.' },
                ],
                hint: 'h er ganget med både l og b. Divider med begge.',
              },
              {
                formula: 'y = ax + b',
                solveFor: 'x',
                answer: '\\frac{y - b}{a}',
                wrong: [
                  { text: '\\frac{y}{a} - b', why: 'Du dividerede før du fjernede b. Plus og minus skal væk først.' },
                  { text: '\\frac{y + b}{a}', why: 'b skifter fortegn når det flytter side: + b bliver til − b.' },
                ],
                hint: 'Træk b fra på begge sider, og divider så med a.',
              },
              {
                formula: 'F = m \\cdot a',
                solveFor: 'a',
                answer: '\\frac{F}{m}',
                wrong: [
                  { text: 'F \\cdot m', why: 'a er ganget med m, så du skal dividere med m.' },
                  { text: '\\frac{m}{F}', why: 'Brøken vender forkert. Det er F der skal deles med m.' },
                ],
                hint: 'a er ganget med m. Divider begge sider med m.',
              },
              {
                formula: 'A = \\tfrac{1}{2} h \\cdot g',
                solveFor: 'g',
                answer: '\\frac{2A}{h}',
                wrong: [
                  { text: '\\frac{A}{2h}', why: 'Der står en halv foran. Gang med 2 for at få den væk. Divider ikke.' },
                  { text: '\\frac{A}{h}', why: 'Faktoren ½ blev glemt. Gang begge sider med 2 først.' },
                ],
                hint: 'Gang først begge sider med 2, og divider så med h.',
              },
            ];
            const c = rng.pick(cases);
            return mcq(rng, {
              prompt: `Isolér $${c.solveFor}$ i formlen $${c.formula}$`,
              options: [
                { text: `${c.solveFor} = ${c.answer}`, correct: true },
                ...c.wrong.map((w) => ({
                  text: `${c.solveFor} = ${w.text}`,
                  misconceptionId: 'ligning-fortegn',
                  feedback: w.why,
                })),
              ],
              hints: [c.hint, 'Gør det modsatte af det der sker med variablen, og gør det på begge sider.'],
              solution: [s('Isolér variablen skridt for skridt.', `${c.solveFor} = ${c.answer}`, c.hint)],
              seconds: 60,
            });
          },
        },
        {
          id: 'formel-indsaet',
          label: 'Brug formlen',
          make: ({ rng, level }) => {
            const l = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const b = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const h = rng.int(2, lv(level, [8, 12, 20, 30, 45]));
            const V = l * b * h;
            return {
              prompt: `Rumfanget af en kasse er $V = l \\cdot b \\cdot h$. En kasse har $V = ${V}\\text{ cm}^3$, $l = ${l}\\text{ cm}$ og $b = ${b}\\text{ cm}$. Find $h$.`,
              input: { kind: 'number', unit: 'cm' },
              answer: numAns(h, 0.005),
              hints: [
                'Isolér h i formlen først.',
                'h = V : (l · b)',
                `l · b = ${l * b}`,
              ],
              solution: [
                s('Isolér h.', `h = \\frac{V}{l \\cdot b}`),
                s('Indsæt tallene.', `h = \\frac{${V}}{${l} \\cdot ${b}} = \\frac{${V}}{${l * b}}`),
                s('Resultat.', `h = ${num(h)}\\text{ cm}`),
              ],
              traps: trapIfDifferent(h, roundTo(V / l, 4), 'ligning-divider-delvis', `Du dividerede kun med l. Både l og b er ganget på h, så der skal divideres med begge: ${l} · ${b} = ${l * b}.`),
              seconds: 70,
            };
          },
        },
      ],
    },
  ],
};
