import type { Domain } from '../../types';
import { lv, mcq, numAns, s } from '../helpers';

/**
 * "Placeringer og flytninger" er et selvstændigt færdigheds- og
 * vidensområde i Fælles Mål, og det optræder fast i FP9. Det manglede i
 * første udgave af pensum.
 */
export const flytninger: Domain = {
  id: 'flytninger',
  name: 'Flytninger og symmetri',
  category: 'geometri-maaling',
  area: 'placeringer-flytninger',
  icon: '⇄',
  blurb: 'Spejling, drejning, parallelforskydning og symmetri — i og uden for koordinatsystemet.',
  skills: [
    {
      id: 'flyt-symmetri',
      domainId: 'flytninger',
      name: 'Symmetri',
      goal: 'Du kan genkende spejlingssymmetri og drejningssymmetri i en figur.',
      prerequisites: [],
      tier: 2,
      aids: 'begge',
      explain: [
        { kind: 'idea', title: 'Spejlingssymmetri', body: 'En figur har spejlingssymmetri, hvis den kan foldes sammen om en linje, så de to halvdele dækker hinanden præcist. Linjen hedder symmetriaksen.' },
        { kind: 'idea', title: 'Drejningssymmetri', body: 'En figur har drejningssymmetri, hvis den kommer til at se ud præcis som før, når den drejes mindre end en hel omgang om sit centrum.' },
        { kind: 'list', title: 'Antal symmetriakser', items: ['Ligesidet trekant: 3', 'Kvadrat: 4', 'Rektangel (ikke kvadrat): 2', 'Rombe (ikke kvadrat): 2', 'Regulær femkant: 5', 'Cirkel: uendelig mange'] },
        { kind: 'warning', body: 'Et parallelogram der ikke er en rombe eller et rektangel har INGEN symmetriakser — men det har drejningssymmetri af orden 2.' },
      ],
      worked: [
        {
          title: 'Hvor mange symmetriakser har et rektangel?',
          prompt: '\\text{Rektangel, der ikke er et kvadrat}',
          steps: [
            s('Prøv den lodrette midterlinje.', undefined, 'Venstre og højre halvdel dækker hinanden.'),
            s('Prøv den vandrette midterlinje.', undefined, 'Øverste og nederste halvdel dækker hinanden.'),
            s('Prøv diagonalerne.', undefined, 'De virker ikke — halvdelene får forskellig form.'),
            s('Svar.', '2 \\text{ symmetriakser}'),
          ],
          takeaway: 'Test hver mulig akse ved at spørge: dækker de to halvdele hinanden præcist?',
        },
      ],
      generators: [
        {
          id: 'symmetri-akser',
          label: 'Antal symmetriakser',
          make: ({ rng, level }) => {
            const figures = lv<{ name: string; axes: number }[]>(level, [
              [{ name: 'et kvadrat', axes: 4 }, { name: 'en ligesidet trekant', axes: 3 }, { name: 'et rektangel (ikke kvadrat)', axes: 2 }],
              [{ name: 'et kvadrat', axes: 4 }, { name: 'en ligebenet trekant', axes: 1 }, { name: 'et rektangel (ikke kvadrat)', axes: 2 }],
              [{ name: 'en rombe (ikke kvadrat)', axes: 2 }, { name: 'en regulær femkant', axes: 5 }, { name: 'en ligebenet trekant', axes: 1 }],
              [{ name: 'en regulær sekskant', axes: 6 }, { name: 'et parallelogram (ikke rombe eller rektangel)', axes: 0 }, { name: 'en regulær ottekant', axes: 8 }],
              [{ name: 'et parallelogram (ikke rombe eller rektangel)', axes: 0 }, { name: 'en regulær tikant', axes: 10 }, { name: 'en skæv trekant', axes: 0 }],
            ]);
            const f = rng.pick(figures);
            return {
              prompt: `Hvor mange symmetriakser har ${f.name}?`,
              input: { kind: 'number', unit: 'akser' },
              answer: numAns(f.axes),
              hints: [
                'En symmetriakse er en linje du kan folde figuren om, så de to halvdele dækker hinanden.',
                'Prøv systematisk: lodret, vandret og diagonalerne.',
                f.axes === 0 ? 'Der er ingen af dem der virker.' : `Der er ${f.axes} linjer der virker.`,
              ],
              solution: [
                s('Prøv hver mulig foldelinje.'),
                s('Tæl dem der giver to halvdele der dækker hinanden.', `${f.axes}`),
              ],
              concept: 'Symmetriakse: figuren foldes om linjen og dækker sig selv.',
              seconds: 40,
            };
          },
        },
        {
          id: 'symmetri-type',
          label: 'Hvilken slags symmetri?',
          make: ({ rng }) => {
            const cases = [
              { text: 'Et bogstav S', spejl: false, drej: true },
              { text: 'Et bogstav A', spejl: true, drej: false },
              { text: 'Et bogstav H', spejl: true, drej: true },
              { text: 'Et parallelogram der hverken er rombe eller rektangel', spejl: false, drej: true },
              { text: 'En ligebenet trekant', spejl: true, drej: false },
              { text: 'Et kvadrat', spejl: true, drej: true },
            ];
            const c = rng.pick(cases);
            const answer = c.spejl && c.drej ? 'Både spejlings- og drejningssymmetri' : c.spejl ? 'Kun spejlingssymmetri' : c.drej ? 'Kun drejningssymmetri' : 'Ingen af delene';
            return mcq(rng, {
              prompt: `${c.text} — hvilken symmetri har figuren?`,
              options: [
                { text: 'Kun spejlingssymmetri', correct: answer === 'Kun spejlingssymmetri' },
                { text: 'Kun drejningssymmetri', correct: answer === 'Kun drejningssymmetri' },
                { text: 'Både spejlings- og drejningssymmetri', correct: answer === 'Både spejlings- og drejningssymmetri' },
                { text: 'Ingen af delene', correct: answer === 'Ingen af delene' },
              ],
              hints: [
                'Spejling: kan figuren foldes om en linje og dække sig selv?',
                'Drejning: ser figuren ens ud efter en drejning på mindre end en hel omgang?',
              ],
              solution: [s('Test begge dele hver for sig.', undefined, answer)],
              seconds: 40,
            });
          },
        },
      ],
    },

    {
      id: 'flyt-koordinater',
      domainId: 'flytninger',
      name: 'Flytninger i koordinatsystemet',
      goal: 'Du kan spejle, dreje og parallelforskyde et punkt i koordinatsystemet.',
      prerequisites: ['koord-punkter'],
      tier: 3,
      aids: 'begge',
      explain: [
        { kind: 'rule', title: 'Parallelforskydning', math: '(x,\\, y) \\rightarrow (x + a,\; y + b)', body: 'Hele figuren flyttes samme vej og lige langt. Form og størrelse ændrer sig ikke.' },
        { kind: 'rule', title: 'Spejling i akserne', math: '\\text{i } x\\text{-aksen}: (x,\\,y) \\rightarrow (x,\\,-y) \\qquad \\text{i } y\\text{-aksen}: (x,\\,y) \\rightarrow (-x,\\,y)' },
        { kind: 'rule', title: 'Drejning 180° om (0,0)', math: '(x,\\, y) \\rightarrow (-x,\\, -y)' },
        { kind: 'idea', title: 'Det der IKKE ændrer sig', body: 'Spejling, drejning og parallelforskydning ændrer aldrig længder eller vinkler. Figuren er kongruent med sig selv bagefter.' },
        { kind: 'warning', body: 'Spejling i x-aksen ændrer y-værdien — ikke x. Det er let at bytte om, fordi man spejler "om x-aksen".' },
      ],
      worked: [
        {
          title: 'Spejl (3, 5) i x-aksen',
          prompt: 'A(3,\\, 5) \\text{ spejles i } x\\text{-aksen}',
          steps: [
            s('x-aksen er den vandrette akse.', undefined, 'Punktet flytter sig lodret, altså ændres y.'),
            s('x bliver stående.', 'x = 3'),
            s('y skifter fortegn.', 'y = -5'),
            s('Billedpunktet.', "A'(3,\\, -5)"),
          ],
          takeaway: 'Spejling i x-aksen: behold x, vend fortegnet på y.',
        },
      ],
      generators: [
        {
          id: 'flyt-parallel',
          label: 'Parallelforskydning',
          make: ({ rng, level }) => {
            const r = lv(level, [5, 6, 8, 10, 12]);
            const x = rng.nonZero(-r, r);
            const y = rng.nonZero(-r, r);
            const a = rng.nonZero(-6, 6);
            const b = rng.nonZero(-6, 6);
            return {
              prompt: `Punktet $A(${x},\\, ${y})$ parallelforskydes ${Math.abs(a)} ${a > 0 ? 'til højre' : 'til venstre'} og ${Math.abs(b)} ${b > 0 ? 'op' : 'ned'}. Hvor havner det?`,
              input: { kind: 'point' },
              answer: { type: 'point', x: x + a, y: y + b },
              visual: {
                kind: 'coordinate',
                xRange: [Math.min(x, x + a) - 3, Math.max(x, x + a) + 3],
                yRange: [Math.min(y, y + b) - 3, Math.max(y, y + b) + 3],
                points: [{ x, y, label: 'A', tone: 'brand' }, { x: x + a, y: y + b, label: "A'", tone: 'accent' }],
                segments: [{ x1: x, y1: y, x2: x + a, y2: y + b, dashed: true }],
              },
              hints: [
                'Til højre og venstre ændrer x. Op og ned ændrer y.',
                `x: ${x} ${a > 0 ? '+' : '−'} ${Math.abs(a)}`,
                `y: ${y} ${b > 0 ? '+' : '−'} ${Math.abs(b)}`,
              ],
              solution: [
                s('Læg forskydningen til hver koordinat.', `(${x} + ${a},\; ${y} + ${b})`),
                s('Regn ud.', `(${x + a},\; ${y + b})`),
              ],
              concept: '(x, y) → (x + a, y + b)',
              seconds: 50,
            };
          },
        },
        {
          id: 'flyt-spejl',
          label: 'Spejling i en akse',
          make: ({ rng, level }) => {
            const r = lv(level, [5, 6, 8, 10, 12]);
            const x = rng.nonZero(-r, r);
            const y = rng.nonZero(-r, r);
            const inX = rng.bool();
            const rx = inX ? x : -x;
            const ry = inX ? -y : y;
            return {
              prompt: `Punktet $A(${x},\\, ${y})$ spejles i $${inX ? 'x' : 'y'}$-aksen. Hvor havner det?`,
              input: { kind: 'point' },
              answer: { type: 'point', x: rx, y: ry },
              visual: {
                kind: 'coordinate',
                xRange: [-r - 2, r + 2],
                yRange: [-r - 2, r + 2],
                points: [{ x, y, label: 'A', tone: 'brand' }, { x: rx, y: ry, label: "A'", tone: 'accent' }],
                segments: [{ x1: x, y1: y, x2: rx, y2: ry, dashed: true }],
              },
              hints: [
                `${inX ? 'x' : 'y'}-aksen er den ${inX ? 'vandrette' : 'lodrette'} akse.`,
                `Punktet flytter sig ${inX ? 'lodret' : 'vandret'}, så det er ${inX ? 'y' : 'x'} der skifter fortegn.`,
                `${inX ? 'x' : 'y'}-værdien bliver stående.`,
              ],
              solution: [
                s(`Spejling i ${inX ? 'x' : 'y'}-aksen vender fortegnet på ${inX ? 'y' : 'x'}.`, `(${x},\\, ${y}) \\rightarrow (${rx},\\, ${ry})`),
              ],
              traps: [
                { misconceptionId: 'koordinat-byttet', match: (raw) => raw.replace(/\s/g, '') === `(${inX ? -x : x},${inX ? y : -y})`, feedback: `Du vendte fortegnet på den forkerte koordinat. Ved spejling i ${inX ? 'x' : 'y'}-aksen er det ${inX ? 'y' : 'x'} der skifter fortegn.` },
              ],
              concept: inX ? 'Spejl i x-aksen: (x, y) → (x, −y)' : 'Spejl i y-aksen: (x, y) → (−x, y)',
              seconds: 50,
            };
          },
        },
        {
          id: 'flyt-drej',
          label: 'Drejning om origo',
          minLevel: 3,
          make: ({ rng, level }) => {
            const r = lv(level, [5, 6, 8, 10, 12]);
            const x = rng.nonZero(-r, r);
            const y = rng.nonZero(-r, r);
            return {
              prompt: `Punktet $A(${x},\\, ${y})$ drejes 180° om $(0,\\,0)$. Hvor havner det?`,
              input: { kind: 'point' },
              answer: { type: 'point', x: -x, y: -y },
              visual: {
                kind: 'coordinate',
                xRange: [-r - 2, r + 2],
                yRange: [-r - 2, r + 2],
                points: [{ x, y, label: 'A', tone: 'brand' }, { x: -x, y: -y, label: "A'", tone: 'accent' }, { x: 0, y: 0, label: 'O', tone: 'bad' }],
                segments: [{ x1: x, y1: y, x2: -x, y2: -y, dashed: true }],
              },
              hints: [
                'En drejning på 180° sender punktet lige igennem origo og lige så langt ud på den anden side.',
                'Begge koordinater skifter fortegn.',
              ],
              solution: [s('Vend fortegnet på begge koordinater.', `(${x},\\, ${y}) \\rightarrow (${-x},\\, ${-y})`)],
              concept: 'Drejning 180° om origo: (x, y) → (−x, −y)',
              seconds: 45,
            };
          },
        },
      ],
    },
  ],
};
