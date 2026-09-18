import type { Misconception, Problem, Skill, SkillState } from '../types';
import { answerToString } from '../lib/answer';
import { getMisconception } from '../content/misconceptions';

/**
 * AI-tutoren.
 *
 * Det bærende princip: tutoren giver ikke svaret. Den prøver først at få
 * eleven til selv at tage første skridt, og trapper hjælpen op hvis det
 * ikke lykkes. Facit kommer først når eleven har arbejdet for det - og
 * selv da med forklaringen på hvordan man kom derhen.
 *
 * Al hjælp bygger på opgavens egne data: `hints` er trappen, `solution`
 * er trinene, `traps` er de kendte fejl. Tutoren opfinder ikke matematik.
 */

export type TutorRole = 'tutor' | 'elev';

export interface TutorMessage {
  id: string;
  role: TutorRole;
  text: string;
  /** Formler der hører til beskeden, vist som matematik. */
  math?: string[];
  /** Forslag eleven kan trykke på i stedet for at skrive. */
  suggestions?: string[];
  /** Hvilket hjælpetrin beskeden svarer til. */
  helpLevel?: number;
}

/** Hvad eleven kan bede om. */
export type Intent =
  | 'giv-mig-svaret'
  | 'forstaar-ikke'
  | 'hvordan-starter-jeg'
  | 'forklar-anderledes'
  | 'hvorfor'
  | 'naeste-trin'
  | 'tjek-mit-svar'
  | 'flere-opgaver'
  | 'hilsen'
  | 'ukendt';

/* ------------------------------------------------------------------ */
/* Fortolkning af det eleven skriver                                   */
/* ------------------------------------------------------------------ */

const PATTERNS: [Intent, RegExp][] = [
  ['giv-mig-svaret', /(hvad er (svaret|facit|resultatet)|giv mig (svaret|facit)|bare sig( mig)? svaret|sig svaret|facit|løsningen tak|hvad bliver det)/i],
  ['hvordan-starter-jeg', /(hvordan (starter|begynder)|hvor (skal jeg )?(starte|begynde)|første (trin|skridt)|hvad gør jeg først|kom i gang)/i],
  ['naeste-trin', /(næste (trin|skridt)|hvad (så|nu)|videre herfra|og så|hvad skal jeg nu)/i],
  ['forklar-anderledes', /(forklar (det )?(igen|anderledes|på en anden måde)|en anden måde|forstår (det )?ikke sådan|kan du sige det simplere|simplere)/i],
  ['hvorfor', /(hvorfor|hvordan kan det (være|passe)|hvad er grunden|giver ikke mening)/i],
  ['tjek-mit-svar', /(er (det|mit svar) (rigtigt|korrekt)|tjek (mit svar|det)|passer det|har jeg ret)/i],
  ['flere-opgaver', /(flere opgaver|en (mere|til)|øve mere|mere træning|prøve igen med en ny)/i],
  ['forstaar-ikke', /(forstår (det )?ikke|fatter (det )?ikke|aner ikke|jeg er (helt )?lost|svært|kan ikke find|hjælp)/i],
  ['hilsen', /^(hej|halløj|hallo|yo|godmorgen|hey)\b/i],
];

export function detectIntent(text: string): Intent {
  const t = text.trim();
  if (!t) return 'ukendt';
  for (const [intent, re] of PATTERNS) {
    if (re.test(t)) return intent;
  }
  return 'ukendt';
}

/* ------------------------------------------------------------------ */
/* Tutorens tilstand                                                   */
/* ------------------------------------------------------------------ */

export interface TutorContext {
  problem: Problem;
  skill: Skill;
  state?: SkillState;
  /** Hvor mange gange eleven har bedt om hjælp i denne opgave. */
  helpLevel: number;
  /** Fejl eleven gentager på tværs af appen. */
  strugglingWith: string[];
  /** Har eleven allerede svaret forkert på opgaven? */
  attemptedWrong: boolean;
  /** Elevens seneste forkerte svar, hvis der er et. */
  lastWrongAnswer?: string;
}

let messageId = 0;
const nextId = () => `m${(messageId += 1)}`;

export function tutorMessage(text: string, extra: Partial<TutorMessage> = {}): TutorMessage {
  return { id: nextId(), role: 'tutor', text, ...extra };
}

export function studentMessage(text: string): TutorMessage {
  return { id: nextId(), role: 'elev', text };
}

/* ------------------------------------------------------------------ */
/* Åbningsreplik                                                       */
/* ------------------------------------------------------------------ */

export function greeting(ctx: TutorContext): TutorMessage {
  const struggles = ctx.strugglingWith
    .map((id) => getMisconception(id))
    .filter((m): m is Misconception => m !== undefined);

  // Tutoren husker hvad eleven kæmper med og nævner det - men kun når
  // det faktisk er relevant for den opgave der er på skærmen.
  const relevant = struggles.find((m) => m.domainId === ctx.problem.domainId);

  const text = relevant
    ? `Hej! Jeg kan se at ${relevant.name.toLowerCase()} har drillet dig før — så lad os holde ekstra øje med det her. Hvor er du henne i opgaven?`
    : ctx.attemptedWrong
      ? 'Det er helt i orden at den gik galt. Lad os finde ud af hvor det skred — hvad gjorde du først?'
      : 'Hej! Jeg hjælper dig gerne. Sig hvor du er gået i stå, så tager vi den derfra.';

  return tutorMessage(text, {
    suggestions: ['Hvordan starter jeg?', 'Jeg forstår det ikke', 'Forklar det på en anden måde'],
    helpLevel: 0,
  });
}

/* ------------------------------------------------------------------ */
/* Svar på elevens henvendelse                                         */
/* ------------------------------------------------------------------ */

/**
 * Kernen: oversætter en hensigt til det rigtige svar på det rigtige
 * hjælpetrin.
 *
 * `helpLevel` trappes op hver gang eleven beder om mere. Det er den
 * mekanik der gør at "hvad er svaret?" ikke bliver besvaret med svaret
 * første gang — men heller ikke bliver ved med at være et modspørgsmål
 * hvis eleven virkelig er gået i stå.
 */
export function respond(ctx: TutorContext, intent: Intent, raw: string): TutorMessage {
  const { problem } = ctx;
  const steps = problem.solution;
  const hints = problem.hints;
  const level = ctx.helpLevel;

  switch (intent) {
    case 'hilsen':
      return tutorMessage('Hej! Hvad er du gået i stå med?', {
        suggestions: ['Hvordan starter jeg?', 'Jeg forstår ikke opgaven'],
        helpLevel: level,
      });

    case 'giv-mig-svaret':
      return refuseAnswer(ctx);

    case 'hvordan-starter-jeg':
      return openingNudge(ctx);

    case 'naeste-trin':
      return nextStep(ctx);

    case 'forklar-anderledes':
      return reframe(ctx);

    case 'hvorfor':
      return explainWhy(ctx);

    case 'tjek-mit-svar':
      return tutorMessage(
        'Jeg kan ikke se hvad du har skrevet i feltet herfra — men tryk på "Tjek svar", så siger jeg med det samme om det passer, og hvad der gik galt hvis ikke.',
        { suggestions: ['Hvordan starter jeg?', 'Næste trin'], helpLevel: level },
      );

    case 'flere-opgaver':
      return tutorMessage(
        `Ja — når du har den her på plads, kan du trykke "Ny opgave" for at få en af samme slags. Vil du hellere prøve en lidt sværere, kan du skifte niveau i ${ctx.skill.name.toLowerCase()}.`,
        { helpLevel: level },
      );

    case 'forstaar-ikke':
      return escalate(ctx);

    default:
      // Har eleven skrevet et tal eller et udtryk, tolker vi det som et
      // forsøg på et delsvar og reagerer på det.
      if (/[0-9x]/.test(raw)) {
        return tutorMessage(
          `Godt — du er i gang. ${hints[Math.min(level, hints.length - 1)] ?? (steps[0]?.text ?? '')} Passer det med det du har regnet?`,
          { suggestions: ['Næste trin', 'Hvorfor er det sådan?'], helpLevel: level + 1 },
        );
      }
      return escalate(ctx);
  }
}

/* ------------------------------------------------------------------ */
/* De enkelte svartyper                                                */
/* ------------------------------------------------------------------ */

/**
 * "Hvad er svaret?"
 *
 * Trin 0-1: modspørgsmål, der peger på første skridt.
 * Trin 2-3: konkret hjælp til trinet.
 * Trin 4+: hele løsningen — for på det tidspunkt hjælper det ikke eleven
 * at blive holdt hen.
 */
function refuseAnswer(ctx: TutorContext): TutorMessage {
  const { problem } = ctx;
  const firstStep = problem.solution[0];
  const level = ctx.helpLevel;

  if (level === 0) {
    return tutorMessage(
      `Jeg kan godt hjælpe dig — men du lærer ingenting af at få tallet. Lad os tage første trin sammen: ${openingQuestion(ctx)}`,
      { suggestions: ['Jeg ved det ikke', 'Hvordan starter jeg?'], helpLevel: 1 },
    );
  }

  if (level === 1) {
    return tutorMessage(
      `Prøv lige at se på det her først:`,
      {
        math: firstStep?.math ? [firstStep.math] : undefined,
        suggestions: ['Og hvad så?', 'Jeg forstår det stadig ikke'],
        helpLevel: 2,
      },
    );
  }

  if (level === 2) {
    return tutorMessage(
      `${firstStep?.text ?? problem.hints[0]} Prøv at lave det trin, så tager vi den derfra.`,
      {
        math: firstStep?.math ? [firstStep.math] : undefined,
        suggestions: ['Næste trin', 'Jeg forstår det ikke'],
        helpLevel: 3,
      },
    );
  }

  // Nu har vi prøvet tre gange. At blive ved ville være stædighed, ikke
  // undervisning — så nu får eleven hele løsningen med forklaring.
  return fullSolution(ctx, 'Okay — nu tager vi den hele vejen igennem sammen, og så prøver du en tilsvarende bagefter.');
}

/** Et spørgsmål der får eleven i gang uden at afsløre noget. */
function openingQuestion(ctx: TutorContext): string {
  const { problem } = ctx;
  const first = problem.hints[0];
  if (first) return first;
  const step = problem.solution[0];
  return step ? `Hvad tror du vi skal gøre først — ${step.text.toLowerCase()}` : 'Hvad ved du, og hvad leder du efter?';
}

function openingNudge(ctx: TutorContext): TutorMessage {
  const level = ctx.helpLevel;
  const hint = ctx.problem.hints[Math.min(level, ctx.problem.hints.length - 1)];
  return tutorMessage(hint ?? (ctx.problem.solution[0]?.text ?? 'Start med at skrive ned hvad du ved, og hvad du skal finde.'), {
    suggestions: ['Næste trin', 'Forklar det på en anden måde'],
    helpLevel: level + 1,
  });
}

/** Går ét trin frem i løsningen — ikke længere. */
function nextStep(ctx: TutorContext): TutorMessage {
  const steps = ctx.problem.solution;
  const idx = Math.min(ctx.helpLevel, steps.length - 1);
  const step = steps[idx];
  if (!step) return fullSolution(ctx, 'Der er ikke flere trin — så lad os samle op:');

  const isLast = idx >= steps.length - 1;
  return tutorMessage(
    isLast ? `${step.text} Og dermed er vi færdige.` : `${step.text}${step.why ? ` (${step.why})` : ''}`,
    {
      math: step.math ? [step.math] : undefined,
      suggestions: isLast ? ['Forklar hvorfor', 'Ny opgave'] : ['Næste trin', 'Hvorfor gør vi det?'],
      helpLevel: ctx.helpLevel + 1,
    },
  );
}

/**
 * "Forklar det på en anden måde."
 *
 * Her henter vi færdighedens analogi, idé eller regel — altså en anden
 * indgang end den trinvise. Nogle elever har brug for billedet frem for
 * fremgangsmåden.
 */
function reframe(ctx: TutorContext): TutorMessage {
  const blocks = ctx.skill.explain;
  const analogy = blocks.find((b) => b.kind === 'analogy');
  const idea = blocks.find((b) => b.kind === 'idea');
  const rule = blocks.find((b) => b.kind === 'rule');

  if (analogy && ctx.helpLevel % 3 === 0) {
    return tutorMessage(analogy.body, {
      suggestions: ['Hvordan bruger jeg det her?', 'Næste trin'],
      helpLevel: ctx.helpLevel + 1,
    });
  }
  if (idea) {
    return tutorMessage(`${idea.title}: ${idea.body}`, {
      suggestions: ['Vis det på opgaven', 'Næste trin'],
      helpLevel: ctx.helpLevel + 1,
    });
  }
  if (rule) {
    return tutorMessage(`Reglen er den her — ${rule.title.toLowerCase()}:`, {
      math: [rule.math],
      suggestions: ['Hvordan bruger jeg den?', 'Næste trin'],
      helpLevel: ctx.helpLevel + 1,
    });
  }
  return tutorMessage(ctx.problem.concept ?? ctx.skill.goal, { helpLevel: ctx.helpLevel + 1 });
}

/** "Hvorfor?" — begrundelsen bag trinet, ikke bare trinet. */
function explainWhy(ctx: TutorContext): TutorMessage {
  const withWhy = ctx.problem.solution.find((s) => s.why);
  if (withWhy?.why) {
    return tutorMessage(`${withWhy.why}`, {
      math: withWhy.math ? [withWhy.math] : undefined,
      suggestions: ['Næste trin', 'Forklar det på en anden måde'],
      helpLevel: ctx.helpLevel + 1,
    });
  }
  const rule = ctx.skill.explain.find((b) => b.kind === 'rule');
  if (rule && rule.kind === 'rule') {
    return tutorMessage(`Det følger af reglen ${rule.title.toLowerCase()}${rule.body ? `: ${rule.body}` : '.'}`, {
      math: [rule.math],
      helpLevel: ctx.helpLevel + 1,
    });
  }
  return tutorMessage(ctx.problem.concept ?? 'Det følger af den regel vi lige har brugt.', { helpLevel: ctx.helpLevel + 1 });
}

/** Optrapning når eleven bare siger "jeg forstår det ikke". */
function escalate(ctx: TutorContext): TutorMessage {
  const level = ctx.helpLevel;
  const hints = ctx.problem.hints;

  if (level < hints.length) {
    const hint = hints[level] as string;
    return tutorMessage(
      level === 0 ? `Lad os tage det roligt. ${hint}` : hint,
      { suggestions: ['Næste trin', 'Forklar det på en anden måde'], helpLevel: level + 1 },
    );
  }
  if (level < hints.length + ctx.problem.solution.length) {
    return nextStep({ ...ctx, helpLevel: level - hints.length });
  }
  return fullSolution(ctx, 'Lad os tage hele opgaven sammen — så prøver du en magen til bagefter.');
}

/** Hele løsningen, trin for trin, med facit til sidst. */
export function fullSolution(ctx: TutorContext, intro: string): TutorMessage {
  const { problem } = ctx;
  const lines = problem.solution.map((s, i) => `${i + 1}. ${s.text}`).join('\n');
  return tutorMessage(`${intro}\n\n${lines}\n\nSvaret er ${answerToString(problem.answer, problem.choices)}.`, {
    math: problem.solution.map((s) => s.math).filter((m): m is string => Boolean(m)),
    suggestions: ['Giv mig en lignende opgave', 'Forklar hvorfor det virker'],
    helpLevel: 99,
  });
}

/* ------------------------------------------------------------------ */
/* Feedback på et forkert svar                                         */
/* ------------------------------------------------------------------ */

export interface WrongAnswerFeedback {
  headline: string;
  body: string;
  /** Huskeregel fra misforståelseskataloget, hvis vi genkendte fejlen. */
  tip?: string;
  /** Skal vi stoppe progressionen og køre fejlklinik? */
  interrupt: boolean;
}

export function feedbackForWrongAnswer(opts: {
  problem: Problem;
  misconception: Misconception | null;
  trapFeedback: string | null;
  repeatCount: number;
  triesSoFar: number;
}): WrongAnswerFeedback {
  if (opts.misconception && opts.trapFeedback) {
    return {
      headline:
        opts.repeatCount >= 2
          ? `Den her fejl har vi set før — ${opts.misconception.name.toLowerCase()}`
          : 'Ikke helt — og jeg kan se præcis hvad der skete',
      body: opts.trapFeedback,
      tip: opts.misconception.tip,
      interrupt: opts.repeatCount >= 2,
    };
  }

  if (opts.triesSoFar === 1) {
    return {
      headline: 'Ikke helt endnu',
      body: opts.problem.hints[0] ?? 'Prøv at gennemgå opgaven en gang til — hvad ved du, og hvad leder du efter?',
      interrupt: false,
    };
  }

  return {
    headline: 'Stadig ikke rigtigt',
    body: opts.problem.hints[Math.min(opts.triesSoFar - 1, opts.problem.hints.length - 1)]
      ?? (opts.problem.solution[0]?.text ?? 'Se løsningen og prøv en tilsvarende opgave bagefter.'),
    interrupt: false,
  };
}

/* ------------------------------------------------------------------ */
/* Fejlklinik                                                          */
/* ------------------------------------------------------------------ */

/** Den målrettede forklaring der kører når progressionen stoppes. */
export function misconceptionClinic(m: Misconception): TutorMessage[] {
  return [
    tutorMessage(
      `Lad os stoppe op her. Du har lavet den samme fejl et par gange nu, og den er værd at få ryddet af vejen — ellers slæber den rundt i alle de næste opgaver.`,
      { helpLevel: 0 },
    ),
    tutorMessage(`Fejlen hedder "${m.name}". Det der sker, er at man tror: ${m.belief}`),
    tutorMessage(m.correction),
    tutorMessage(`Huskeregel: ${m.tip}`, {
      suggestions: ['Jeg er med — giv mig en opgave', 'Forklar det en gang til'],
    }),
  ];
}
