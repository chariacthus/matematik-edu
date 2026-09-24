import type { ProblemDraft, Rng, Visual } from '../types';
import { NAMES, choices, exprAns, fracAns, name, numAns, s } from './helpers';
import { median, num, quartile1, roundTo } from '../lib/math';

/**
 * Opgavesæt med tema, som i FP9 med hjælpemidler: én historie, én tabel
 * eller figur, og fire delopgaver der bygger på den. Tallene trækkes
 * tilfældigt, så sættet kan tages igen.
 */

export interface ThemePart {
  skillId: string;
  draft: ProblemDraft;
}

export interface BuiltTheme {
  intro: string;
  visual?: Visual;
  parts: ThemePart[];
}

export interface ExamTheme {
  id: string;
  title: string;
  build(rng: Rng): BuiltTheme;
}

const tex = (v: number) => num(v).replace(',', '{,}');

const number = (unit?: string) => ({ kind: 'number' as const, unit });

const bornholm: ExamTheme = {
  id: 'bornholm',
  title: 'Lejrskole på Bornholm',
  build(rng) {
    const n = rng.int(20, 26);
    const pu = rng.pick([145, 155, 165, 175]);
    const pv = pu + rng.pick([60, 80, 100]);
    const rab = rng.pick([10, 15, 20, 25]);
    const dist = rng.int(68, 74);
    const minutes = rng.pick([75, 80, 90]);
    const total = n * pu + 2 * pv;
    const discounted = roundTo(total * (1 - rab / 100), 2);
    const speed = roundTo(dist / (minutes / 60), 1);
    const saved = Math.round((discounted * rng.pick([0.4, 0.5, 0.6, 0.75])) / 50) * 50;
    const share = Math.round((saved / discounted) * 100);

    return {
      intro: `9.B skal på lejrskole på Bornholm. Klassen er ${n} elever og 2 lærere, og de sejler med færgen fra Ystad til Rønne. Færgens priser står i tabellen.`,
      visual: {
        kind: 'table',
        head: ['Billet', 'Pris'],
        rows: [
          ['Voksen', `${pv} kr`],
          ['Ung under 26 år', `${pu} kr`],
          ['Grupper på mindst 20', `${rab} % rabat på hele prisen`],
        ],
      },
      parts: [
        {
          skillId: 'prob-flertrin',
          draft: {
            prompt: 'Hvad koster billetterne til hele klassen og de to lærere, uden rabat?',
            input: number('kr'),
            answer: numAns(total),
            hints: ['Eleverne er under 26 år. Lærerne er voksne.', `Regn ${n} · ${pu} og 2 · ${pv} ud, og læg dem sammen.`],
            solution: [
              s('Elevernes billetter.', `${n} \\cdot ${pu} = ${n * pu}`),
              s('Lærernes billetter.', `2 \\cdot ${pv} = ${2 * pv}`),
              s('Læg sammen.', `${n * pu} + ${2 * pv} = ${total} \\text{ kr}`),
            ],
            seconds: 120,
          },
        },
        {
          skillId: 'procent-af-tal',
          draft: {
            prompt: 'De er mindst 20, så de får grupperabat. Hvad koster billetterne så?',
            input: number('kr'),
            answer: numAns(discounted, 0.5),
            hints: [`${rab} % rabat betyder at de betaler ${100 - rab} % af prisen.`],
            solution: [
              s(`De betaler ${100 - rab} % af ${total} kr.`, `${total} \\cdot ${tex((100 - rab) / 100)} = ${tex(discounted)} \\text{ kr}`),
            ],
            seconds: 90,
          },
        },
        {
          skillId: 'forhold-proportional',
          draft: {
            prompt: `Færgen sejler ${dist} km på ${minutes} minutter. Hvad er færgens gennemsnitsfart i km/t?`,
            instruction: 'Afrund til én decimal.',
            input: number('km/t'),
            answer: numAns(speed, 0.06),
            hints: ['Omregn tiden til timer først.', 'Fart er strækning divideret med tid.'],
            solution: [
              s('Tiden i timer.', `\\frac{${minutes}}{60} \\approx ${tex(roundTo(minutes / 60, 3))} \\text{ timer}`),
              s('Divider strækningen med tiden.', `\\frac{${dist}}{${minutes}/60} \\approx ${tex(speed)} \\text{ km/t}`),
            ],
            seconds: 150,
          },
        },
        {
          skillId: 'procent-find-procenten',
          draft: {
            prompt: `Klassen har samlet ${saved} kr ind til færgen. Hvor mange procent af prisen med rabat har de samlet ind?`,
            instruction: 'Afrund til hele procent.',
            input: number('%'),
            answer: numAns(share, 0.6),
            hints: ['Del det de har samlet ind med prisen med rabat.', 'Gang med 100 for at få procent.'],
            solution: [s('Del og gang med 100.', `\\frac{${saved}}{${tex(discounted)}} \\cdot 100 \\approx ${share} \\,\\%`)],
            seconds: 120,
          },
        },
      ],
    };
  },
};

const cykelsti: ExamTheme = {
  id: 'cykelsti',
  title: 'En ny cykelsti',
  build(rng) {
    const m = rng.pick([500, 1000, 2000]);
    const a = rng.int(7, 12);
    const b = rng.int(4, a - 2);
    const realA = (a * m) / 100;
    const realB = (b * m) / 100;
    const mapPath = roundTo(Math.sqrt(a * a + b * b), 1);
    const realPath = Math.round((Math.sqrt(a * a + b * b) * m) / 100);

    return {
      intro: `Kommunen vil lave en cykelsti skråt over en rektangulær eng, fra det ene hjørne til det modsatte. På kortet er engen ${a} cm lang og ${b} cm bred. Kortets målestok er 1 : ${m}.`,
      visual: { kind: 'rect', w: a, h: b, labelW: `${a} cm`, labelH: `${b} cm`, caption: 'Engen på kortet' },
      parts: [
        {
          skillId: 'forhold-maalestok',
          draft: {
            prompt: 'Hvor lang er engen i virkeligheden?',
            instruction: 'Svar i meter.',
            input: number('m'),
            answer: numAns(realA),
            hints: [`1 cm på kortet er ${m} cm i virkeligheden.`, 'Der er 100 cm i en meter.'],
            solution: [
              s('Gang med målestokken.', `${a} \\cdot ${m} = ${a * m} \\text{ cm}`),
              s('Omregn til meter.', `${a * m} : 100 = ${realA} \\text{ m}`),
            ],
            seconds: 90,
          },
        },
        {
          skillId: 'geo-pythagoras',
          draft: {
            prompt: 'Hvor lang er stien på kortet?',
            instruction: 'Svar i cm med én decimal.',
            input: number('cm'),
            answer: numAns(mapPath, 0.06),
            hints: ['Stien er hypotenusen i en retvinklet trekant.', 'Brug Pythagoras: a² + b² = c².'],
            solution: [s('Pythagoras.', `c = \\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a + b * b}} \\approx ${tex(mapPath)} \\text{ cm}`)],
            seconds: 120,
          },
        },
        {
          skillId: 'tegn-maalfast',
          draft: {
            prompt: 'Hvor lang bliver stien i virkeligheden?',
            instruction: 'Svar i hele meter.',
            input: number('m'),
            answer: numAns(realPath, 1.1),
            hints: ['Gang stiens længde på kortet med målestokken, og omregn til meter.'],
            solution: [s('Gang med målestokken og omregn.', `${tex(mapPath)} \\cdot ${m} : 100 \\approx ${realPath} \\text{ m}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'areal-omkreds',
          draft: {
            prompt: 'Hvor stort er engens areal i virkeligheden?',
            instruction: 'Svar i m².',
            input: number('m²'),
            answer: numAns(realA * realB),
            hints: ['Find engens bredde i virkeligheden på samme måde som længden.', 'Areal = længde · bredde.'],
            solution: [
              s('Bredden i virkeligheden.', `${b} \\cdot ${m} : 100 = ${realB} \\text{ m}`),
              s('Areal.', `${realA} \\cdot ${realB} = ${realA * realB} \\text{ m}^2`),
            ],
            seconds: 120,
          },
        },
      ],
    };
  },
};

const loppemarked: ExamTheme = {
  id: 'loppemarked',
  title: 'Loppemarkedet',
  build(rng) {
    const who = name(rng);
    const hours = ['9-10', '10-11', '11-12', '12-13', '13-14', '14-15'];
    const values = hours.map(() => rng.int(3, 30) * 5);
    const sum = values.reduce((x, y) => x + y, 0);
    const avg = roundTo(sum / values.length, 2);
    const med = median(values);
    const red = rng.int(3, 9);
    const blue = rng.int(2, 9);

    return {
      intro: `${who} har haft en bod på skolens loppemarked. Tabellen viser hvor mange kroner ${who} tjente i hver time.`,
      visual: { kind: 'table', head: ['Tidsrum', 'Indtjening'], rows: hours.map((h, i) => [`kl. ${h}`, `${values[i]} kr`]) },
      parts: [
        {
          skillId: 'tal-regnearter',
          draft: {
            prompt: `Hvor mange kroner tjente ${who} i alt?`,
            input: number('kr'),
            answer: numAns(sum),
            hints: ['Læg alle seks beløb sammen.'],
            solution: [s('Læg sammen.', `${values.join(' + ')} = ${sum}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'stat-deskriptorer',
          draft: {
            prompt: `Hvor meget tjente ${who} i gennemsnit pr. time?`,
            instruction: 'Afrund til to decimaler, hvis det er nødvendigt.',
            input: number('kr'),
            answer: numAns(avg, 0.01),
            hints: ['Gennemsnit = summen divideret med antallet.'],
            solution: [s('Divider summen med antallet af timer.', `\\frac{${sum}}{${values.length}} \\approx ${tex(avg)} \\text{ kr}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'stat-kvartiler',
          draft: {
            prompt: 'Hvad er medianen for indtjeningen pr. time?',
            input: number('kr'),
            answer: numAns(med, 0.01),
            hints: ['Sortér beløbene fra mindst til størst.', 'Der er et lige antal, så tag gennemsnittet af de to midterste.'],
            solution: [
              s('Sortér.', [...values].sort((x, y) => x - y).join(',\\; ')),
              s('Tag gennemsnittet af de to midterste.', `= ${tex(med)}`),
            ],
            seconds: 90,
          },
        },
        {
          skillId: 'sand-grund',
          draft: {
            prompt: `Til sidst er der ${red} røde og ${blue} blå kopper tilbage i en kasse. En kunde tager en kop uden at kigge. Hvad er sandsynligheden for at koppen er rød?`,
            instruction: 'Skriv svaret som en brøk.',
            input: { kind: 'fraction' },
            answer: fracAns({ n: red, d: red + blue }),
            hints: ['Sandsynlighed = gunstige udfald divideret med mulige udfald.'],
            solution: [s('Gunstige over mulige.', `P = \\frac{${red}}{${red + blue}}`)],
            seconds: 60,
          },
        },
      ],
    };
  },
};

const drivhus: ExamTheme = {
  id: 'drivhus',
  title: 'Drivhuset',
  build(rng) {
    const who = name(rng);
    const l = rng.int(3, 6);
    const b = rng.int(2, 4);
    const h = rng.pick([1.8, 2, 2.2]);
    const t = rng.pick([1, 1.2, 1.5]);
    const v = Math.round((Math.atan(t / (b / 2)) * 180) / Math.PI);

    return {
      intro: `${who} bygger et drivhus af glas. Grundfladen er et rektangel på ${l} m × ${b} m, og væggene er ${num(h)} m høje. Oven på kommer et saddeltag, hvor toppen ligger ${num(t)} m over væggene.`,
      visual: { kind: 'solid', type: 'box', dims: { w: l, h, d: b }, labels: { w: `${l} m`, h: `${num(h)} m`, d: `${b} m` }, caption: 'Drivhuset uden tag' },
      parts: [
        {
          skillId: 'areal-omkreds',
          draft: {
            prompt: 'Hvor stort er grundfladens areal?',
            input: number('m²'),
            answer: numAns(l * b),
            hints: ['Areal af et rektangel = længde · bredde.'],
            solution: [s('Gang længde og bredde.', `${l} \\cdot ${b} = ${l * b} \\text{ m}^2`)],
            seconds: 45,
          },
        },
        {
          skillId: 'rumfang-kasse',
          draft: {
            prompt: 'Hvad er rumfanget af drivhuset op til tagkanten?',
            input: number('m³'),
            answer: numAns(roundTo(l * b * h, 2), 0.01),
            hints: ['Op til tagkanten er drivhuset en kasse.', 'Rumfang = længde · bredde · højde.'],
            solution: [s('Gang de tre mål.', `${l} \\cdot ${b} \\cdot ${tex(h)} = ${tex(roundTo(l * b * h, 2))} \\text{ m}^3`)],
            seconds: 60,
          },
        },
        {
          skillId: 'areal-trekant',
          draft: {
            prompt: `Gavlen under taget er en trekant med grundlinjen ${b} m og højden ${num(t)} m. Hvad er arealet af én gavltrekant?`,
            input: number('m²'),
            answer: numAns(roundTo((b * t) / 2, 2), 0.01),
            hints: ['Areal af en trekant = ½ · højde · grundlinje.'],
            solution: [s('Halvdelen af højde gange grundlinje.', `\\tfrac{1}{2} \\cdot ${tex(t)} \\cdot ${b} = ${tex(roundTo((b * t) / 2, 2))} \\text{ m}^2`)],
            seconds: 60,
          },
        },
        {
          skillId: 'geo-trekanter',
          draft: {
            prompt: `Tagfladerne hælder ${v}° i forhold til vandret. Hvor stor er vinklen i toppen af gavlen?`,
            input: number('°'),
            answer: numAns(180 - 2 * v),
            hints: ['Gavlen er en ligebenet trekant, så de to vinkler ved grundlinjen er lige store.', 'Vinkelsummen i en trekant er 180°.'],
            solution: [s('Træk de to ens vinkler fra 180°.', `180^\\circ - 2 \\cdot ${v}^\\circ = ${180 - 2 * v}^\\circ`)],
            seconds: 60,
          },
        },
      ],
    };
  },
};

const mobil: ExamTheme = {
  id: 'mobil',
  title: 'Mobilabonnement',
  build(rng) {
    const who = name(rng);
    const pb = rng.pick([10, 15, 20]);
    const pa = pb + rng.pick([10, 15, 20]);
    const fa = rng.pick([79, 99, 119]);
    const x0 = rng.int(3, 8);
    const fb = fa + (pa - pb) * x0;
    const g = rng.int(2, 12);
    const u = x0 + rng.int(2, 5);
    const pick = choices(rng, [{ text: 'Abonnement A' }, { text: 'Abonnement B', correct: true }]);

    return {
      intro: `${who} skal have et nyt mobilabonnement. To selskaber har disse priser pr. måned:`,
      visual: {
        kind: 'table',
        head: ['', 'Fast pris', 'Pris pr. GB'],
        rows: [
          ['Abonnement A', `${fa} kr`, `${pa} kr`],
          ['Abonnement B', `${fb} kr`, `${pb} kr`],
        ],
      },
      parts: [
        {
          skillId: 'funk-begreb',
          draft: {
            prompt: `Hvad koster abonnement A en måned, hvor ${who} bruger ${g} GB?`,
            input: number('kr'),
            answer: numAns(fa + pa * g),
            hints: ['Fast pris plus prisen for de GB der bruges.'],
            solution: [s('Fast pris plus pris pr. GB gange antal GB.', `${fa} + ${pa} \\cdot ${g} = ${fa + pa * g} \\text{ kr}`)],
            seconds: 60,
          },
        },
        {
          skillId: 'funk-lineaer',
          draft: {
            prompt: 'Skriv en forskrift for prisen $y$ i kroner for abonnement B, når $x$ er antal GB.',
            input: { kind: 'expression', placeholder: 'fx y = 3x + 100' },
            answer: exprAns(`${pb}x + ${fb}`, [`y = ${pb}x + ${fb}`, `y = ${fb} + ${pb}x`, `f(x) = ${pb}x + ${fb}`]),
            hints: ['Prisen pr. GB er hældningen.', 'Den faste pris er det tal der står alene.'],
            solution: [s('Hældning er prisen pr. GB, og startværdien er den faste pris.', `y = ${pb}x + ${fb}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'ligning-begge-sider',
          draft: {
            prompt: 'Ved hvor mange GB koster de to abonnementer det samme?',
            input: number('GB'),
            answer: numAns(x0),
            hints: ['Sæt de to priser lig hinanden.', `${fa} + ${pa}x = ${fb} + ${pb}x`],
            solution: [
              s('Sæt priserne lig hinanden.', `${fa} + ${pa}x = ${fb} + ${pb}x`),
              s('Saml x på den ene side og tallene på den anden.', `${pa - pb}x = ${fb - fa}`),
              s('Divider.', `x = ${x0}`),
            ],
            seconds: 120,
          },
        },
        {
          skillId: 'funk-lineaer',
          draft: {
            prompt: `${who} bruger normalt ${u} GB om måneden. Hvilket abonnement er billigst for ${who}?`,
            input: { kind: 'choice' },
            choices: pick.choices,
            answer: pick.answer,
            hints: [`Regn begge priser ud for ${u} GB.`],
            solution: [
              s('Abonnement A.', `${fa} + ${pa} \\cdot ${u} = ${fa + pa * u}`),
              s('Abonnement B.', `${fb} + ${pb} \\cdot ${u} = ${fb + pb * u}`),
            ],
            seconds: 90,
          },
        },
      ],
    };
  },
};

const koncert: ExamTheme = {
  id: 'koncert',
  title: 'Koncerten',
  build(rng) {
    const city = rng.pick(['Aarhus', 'Odense', 'Aalborg', 'Esbjerg']);
    const cap = rng.pick([1200, 1600, 2000, 2400]);
    const p = rng.pick([280, 320, 360, 450]);
    const g = rng.pick([5, 8, 10]);
    const sold = rng.pick([25, 35, 40, 60]);
    const [a, b] = rng.pick([[3, 1], [2, 3], [3, 5], [1, 3]] as const);
    const old = p - rng.pick([20, 30, 40]);
    const withFee = roundTo(p * (1 + g / 100), 2);
    const rise = roundTo(((p - old) / old) * 100, 1);

    return {
      intro: `Et band giver koncert i ${city}. Arrangøren har lavet en oversigt over pladser og priser.`,
      visual: {
        kind: 'table',
        head: ['Koncerten', ''],
        rows: [
          ['Pladser i alt', `${cap}`],
          ['Billetpris', `${p} kr`],
          ['Gebyr', `${g} % oven i billetprisen`],
        ],
      },
      parts: [
        {
          skillId: 'procent-af-tal',
          draft: {
            prompt: 'Hvad koster én billet med gebyr?',
            input: number('kr'),
            answer: numAns(withFee, 0.01),
            hints: [`Gebyret er ${g} % af ${p} kr.`],
            solution: [s(`Læg ${g} % til.`, `${p} \\cdot ${tex(1 + g / 100)} = ${tex(withFee)} \\text{ kr}`)],
            seconds: 60,
          },
        },
        {
          skillId: 'procent-af-tal',
          draft: {
            prompt: `${sold} % af billetterne blev solgt den første dag. Hvor mange billetter var det?`,
            input: number('billetter'),
            answer: numAns((cap * sold) / 100),
            hints: [`Find ${sold} % af ${cap}.`],
            solution: [s('Procent af et tal.', `${cap} \\cdot ${tex(sold / 100)} = ${(cap * sold) / 100}`)],
            seconds: 60,
          },
        },
        {
          skillId: 'forhold-grund',
          draft: {
            prompt: `Forholdet mellem siddepladser og ståpladser er ${a} : ${b}. Hvor mange ståpladser er der?`,
            input: number('pladser'),
            answer: numAns((cap * b) / (a + b)),
            hints: [`Der er ${a} + ${b} = ${a + b} dele i alt.`, `Find hvor mange pladser én del er.`],
            solution: [
              s('Én del.', `${cap} : ${a + b} = ${cap / (a + b)}`),
              s('Ståpladserne er ' + b + (b === 1 ? ' del.' : ' dele.'), `${cap / (a + b)} \\cdot ${b} = ${(cap * b) / (a + b)}`),
            ],
            seconds: 90,
          },
        },
        {
          skillId: 'procent-aendring',
          draft: {
            prompt: `Sidste år kostede en billet ${old} kr uden gebyr. Hvor mange procent er billetprisen steget?`,
            instruction: 'Afrund til én decimal.',
            input: number('%'),
            answer: numAns(rise, 0.06),
            hints: ['Find stigningen i kroner først.', 'Del stigningen med den gamle pris.'],
            solution: [
              s('Stigningen i kroner.', `${p} - ${old} = ${p - old}`),
              s('Del med den gamle pris og gang med 100.', `\\frac{${p - old}}{${old}} \\cdot 100 \\approx ${tex(rise)} \\,\\%`),
            ],
            seconds: 90,
          },
        },
      ],
    };
  },
};

const opskrift: ExamTheme = {
  id: 'opskrift',
  title: 'Boller til morgenmaden',
  build(rng) {
    const who = name(rng);
    const n = rng.pick([12, 16, 20]);
    const per = rng.pick([40, 45, 50]);
    const m = n * per;
    const sm = rng.pick([50, 75, 100]);
    const milk = rng.pick([{ n: 1, d: 2 }, { n: 3, d: 4 }, { n: 2, d: 5 }]);
    const k = n * rng.pick([1.5, 2, 3]);
    const f = rng.pick([2, 3]);
    const price = rng.pick([18, 20, 24]);
    const have = rng.int(5, 12) * 100 + rng.pick([0, 30, 60]);
    const flourCost = roundTo((price * m) / 2000, 2);

    return {
      intro: `${who} bager boller til klassens morgenmad. Opskriften giver ${n} boller.`,
      visual: {
        kind: 'table',
        head: ['Ingrediens', 'Mængde'],
        rows: [
          ['Hvedemel', `${m} g`],
          ['Smør', `${sm} g`],
          ['Mælk', `${milk.n}/${milk.d} L`],
          ['Gær', '25 g'],
        ],
      },
      parts: [
        {
          skillId: 'forhold-proportional',
          draft: {
            prompt: `Hvor meget mel skal der bruges til ${k} boller?`,
            input: number('g'),
            answer: numAns((m * k) / n),
            hints: [`Find først hvor meget mel der går til én bolle.`],
            solution: [
              s('Mel til én bolle.', `${m} : ${n} = ${per} \\text{ g}`),
              s(`Gang med ${k}.`, `${per} \\cdot ${k} = ${(m * k) / n} \\text{ g}`),
            ],
            seconds: 60,
          },
        },
        {
          skillId: 'broek-gange-dividere',
          draft: {
            prompt: `${who} laver ${f === 2 ? 'dobbelt' : 'tredobbelt'} portion. Hvor meget mælk skal der bruges?`,
            instruction: 'Svar i liter. Du må skrive en brøk eller et decimaltal.',
            input: { kind: 'fraction' },
            answer: fracAns({ n: milk.n * f, d: milk.d }),
            hints: [`Gang brøken med ${f}.`],
            solution: [s(`Gang tælleren med ${f}.`, `\\frac{${milk.n}}{${milk.d}} \\cdot ${f} = \\frac{${milk.n * f}}{${milk.d}} \\text{ L}`)],
            seconds: 60,
          },
        },
        {
          skillId: 'decimal-regning',
          draft: {
            prompt: `Mel koster ${price} kr for en pose på 2 kg. Hvad koster melet til én portion af opskriften?`,
            instruction: 'Svar i kroner med to decimaler.',
            input: number('kr'),
            answer: numAns(flourCost, 0.01),
            hints: ['2 kg er 2000 g.', 'Find prisen for ét gram, eller hvor stor en del af posen der bruges.'],
            solution: [s('Del af posen gange prisen.', `\\frac{${m}}{2000} \\cdot ${price} = ${tex(flourCost)} \\text{ kr}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'prob-flertrin',
          draft: {
            prompt: `${who} har kun ${have} g mel. Hvor mange boller kan der højst bages?`,
            input: number('boller'),
            answer: numAns(Math.floor(have / per)),
            hints: ['Find hvor meget mel der går til én bolle.', 'Rund ned. En halv bolle tæller ikke.'],
            solution: [
              s('Mel til én bolle.', `${m} : ${n} = ${per} \\text{ g}`),
              s('Divider og rund ned.', `${have} : ${per} \\approx ${tex(roundTo(have / per, 2))} \\rightarrow ${Math.floor(have / per)}`),
            ],
            seconds: 90,
          },
        },
      ],
    };
  },
};

const sportsdag: ExamTheme = {
  id: 'sportsdag',
  title: 'Sportsdagen',
  build(rng) {
    const times: number[] = [];
    while (times.length < 11) {
      const t = times.length < 3 ? rng.int(150, 178) : rng.int(160, 240);
      if (!times.includes(t)) times.push(t);
    }
    const shown = rng.shuffle(times);
    const runners = rng.sample(NAMES, 11);
    const sorted = [...times].sort((x, y) => x - y);
    const under = times.filter((t) => t < 180).length;
    const q1 = quartile1(times);

    return {
      intro: 'Til sportsdagen løb 11 elever fra 9.A 800 m. Tabellen viser deres tider.',
      visual: {
        kind: 'table',
        head: ['Elev', 'Tid'],
        rows: runners.map((who, i) => [who, `${shown[i]} sek.`]),
      },
      parts: [
        {
          skillId: 'stat-deskriptorer',
          draft: {
            prompt: 'Hvad er variationsbredden?',
            input: number('sek.'),
            answer: numAns(sorted[10]! - sorted[0]!),
            hints: ['Variationsbredden er største minus mindste værdi.'],
            solution: [s('Største minus mindste.', `${sorted[10]} - ${sorted[0]} = ${sorted[10]! - sorted[0]!}`)],
            seconds: 60,
          },
        },
        {
          skillId: 'stat-kvartiler',
          draft: {
            prompt: 'Hvad er medianen?',
            input: number('sek.'),
            answer: numAns(sorted[5]!),
            hints: ['Sortér tiderne fra mindst til størst.', 'Med 11 tal er medianen tal nummer 6.'],
            solution: [s('Sortér og tag den midterste.', sorted.join(',\\; ')), s('Tal nummer 6.', `= ${sorted[5]}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'stat-kvartiler',
          draft: {
            prompt: 'Hvad er nedre kvartil?',
            input: number('sek.'),
            answer: numAns(q1),
            hints: ['Nedre kvartil er medianen af den nederste halvdel, uden selve medianen.', 'Den nederste halvdel er de 5 hurtigste tider.'],
            solution: [s('Medianen af de 5 hurtigste.', `${sorted.slice(0, 5).join(',\\; ')} \\rightarrow ${q1}`)],
            seconds: 90,
          },
        },
        {
          skillId: 'tal-regnearter',
          draft: {
            prompt: 'Hvor mange elever løb de 800 m på under 3 minutter?',
            input: number('elever'),
            answer: numAns(under),
            hints: ['3 minutter er 180 sekunder.'],
            solution: [s('Tæl tiderne under 180 sekunder.', sorted.filter((t) => t < 180).join(',\\; ')), s('Antal.', `= ${under}`)],
            seconds: 60,
          },
        },
      ],
    };
  },
};

export const EXAM_THEMES: ExamTheme[] = [bornholm, cykelsti, loppemarked, drivhus, mobil, koncert, opskrift, sportsdag];
