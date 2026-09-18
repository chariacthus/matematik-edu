import { describe, expect, it } from 'vitest';
import { detectIntent, feedbackForWrongAnswer, greeting, misconceptionClinic, respond, type TutorContext } from './tutor';
import { buildSystemPrompt } from './llm';
import { buildProblem, getSkill } from '../content';
import { getMisconception } from '../content/misconceptions';
import { answerToString } from '../lib/answer';

const skill = getSkill('ligning-totrin')!;
const problem = buildProblem(skill, { level: 2, seed: 7 });

function ctx(over: Partial<TutorContext> = {}): TutorContext {
  return {
    problem,
    skill,
    helpLevel: 0,
    strugglingWith: [],
    attemptedWrong: false,
    ...over,
  };
}

describe('fortolkning af elevens besked', () => {
  it('genkender at eleven beder om svaret', () => {
    for (const t of ['hvad er svaret?', 'bare sig mig svaret', 'giv mig facit', 'Hvad bliver det?']) {
      expect(detectIntent(t), t).toBe('giv-mig-svaret');
    }
  });

  it('genkender de andre hensigter', () => {
    expect(detectIntent('hvordan starter jeg?')).toBe('hvordan-starter-jeg');
    expect(detectIntent('næste trin')).toBe('naeste-trin');
    expect(detectIntent('forklar det på en anden måde')).toBe('forklar-anderledes');
    expect(detectIntent('hvorfor gør vi det?')).toBe('hvorfor');
    expect(detectIntent('jeg forstår det ikke')).toBe('forstaar-ikke');
    expect(detectIntent('hej')).toBe('hilsen');
  });

  it('falder tilbage til ukendt for noget den ikke kan placere', () => {
    expect(detectIntent('bananer')).toBe('ukendt');
    expect(detectIntent('')).toBe('ukendt');
  });
});

describe('tutoren giver ikke svaret væk', () => {
  const facit = answerToString(problem.answer, problem.choices);

  it('svarer med et modspørgsmål første gang der spørges om facit', () => {
    const reply = respond(ctx(), 'giv-mig-svaret', 'hvad er svaret?');
    expect(reply.text).not.toContain(facit);
    expect(reply.text.toLowerCase()).toContain('første trin');
    expect(reply.helpLevel).toBe(1);
  });

  it('holder facit tilbage gennem de første tre hjælpetrin', () => {
    for (const helpLevel of [0, 1, 2]) {
      const reply = respond(ctx({ helpLevel }), 'giv-mig-svaret', 'hvad er svaret?');
      expect(reply.text, `trin ${helpLevel} afslørede facit`).not.toContain(`Svaret er ${facit}`);
    }
  });

  it('giver hele løsningen når eleven har spurgt fire gange', () => {
    const reply = respond(ctx({ helpLevel: 4 }), 'giv-mig-svaret', 'hvad er svaret?');
    expect(reply.text).toContain(`Svaret er ${facit}`);
    expect(reply.text).toContain('1.');
  });

  it('trapper hjælpen op ét trin ad gangen', () => {
    let helpLevel = 0;
    const seen: number[] = [];
    for (let i = 0; i < 4; i++) {
      const reply = respond(ctx({ helpLevel }), 'giv-mig-svaret', 'hvad er svaret?');
      helpLevel = reply.helpLevel ?? helpLevel;
      seen.push(helpLevel);
    }
    // Strengt stigende, indtil den lander på fuld løsning.
    expect(seen[0]).toBeLessThan(seen[1] as number);
    expect(seen[1]).toBeLessThan(seen[2] as number);
  });
});

describe('optrapning af hjælp', () => {
  it('giver hints i rækkefølge når eleven ikke forstår', () => {
    const first = respond(ctx({ helpLevel: 0 }), 'forstaar-ikke', 'jeg forstår det ikke');
    const second = respond(ctx({ helpLevel: 1 }), 'forstaar-ikke', 'jeg forstår det ikke');
    expect(first.text).toContain(problem.hints[0]!);
    expect(second.text).toContain(problem.hints[1]!);
  });

  it('går videre til løsningstrin når hintene er brugt op', () => {
    const reply = respond(ctx({ helpLevel: problem.hints.length }), 'forstaar-ikke', 'forstår det ikke');
    expect(reply.text.length).toBeGreaterThan(0);
  });

  it('går kun ét trin frem ad gangen', () => {
    const reply = respond(ctx({ helpLevel: 0 }), 'naeste-trin', 'næste trin');
    expect(reply.text).toContain(problem.solution[0]!.text);
    if (problem.solution.length > 1) {
      expect(reply.text).not.toContain(problem.solution[problem.solution.length - 1]!.text);
    }
  });
});

describe('forklaring på flere måder', () => {
  it('bruger færdighedens analogi eller idé i stedet for at gentage trinene', () => {
    const ligning = getSkill('ligning-ettrin')!;
    const p = buildProblem(ligning, { level: 1, seed: 3 });
    const reply = respond({ ...ctx(), problem: p, skill: ligning }, 'forklar-anderledes', 'forklar anderledes');
    expect(reply.text.toLowerCase()).toContain('vægt');
  });
});

describe('åbningsreplik', () => {
  it('nævner det eleven tidligere har kæmpet med, når det er relevant', () => {
    const m = getMisconception('ligning-fortegn')!;
    const reply = greeting(ctx({ strugglingWith: [m.id] }));
    expect(reply.text.toLowerCase()).toContain(m.name.toLowerCase());
  });

  it('nævner ikke en fejl fra et helt andet emne', () => {
    const reply = greeting(ctx({ strugglingWith: ['cirkel-areal-formel'] }));
    expect(reply.text.toLowerCase()).not.toContain('cirkel');
  });

  it('møder eleven anderledes efter et forkert svar', () => {
    expect(greeting(ctx({ attemptedWrong: true })).text.toLowerCase()).toContain('i orden');
  });
});

describe('feedback på forkert svar', () => {
  it('forklarer den konkrete misforståelse når fejlen kan genkendes', () => {
    const m = getMisconception('ligning-fortegn')!;
    const fb = feedbackForWrongAnswer({
      problem,
      misconception: m,
      trapFeedback: 'Du glemte at vende fortegnet.',
      repeatCount: 1,
      triesSoFar: 1,
    });
    expect(fb.body).toBe('Du glemte at vende fortegnet.');
    expect(fb.tip).toBe(m.tip);
    expect(fb.interrupt).toBe(false);
  });

  it('afbryder progressionen når fejlen gentages', () => {
    const fb = feedbackForWrongAnswer({
      problem,
      misconception: getMisconception('ligning-fortegn')!,
      trapFeedback: 'Igen fortegnet.',
      repeatCount: 2,
      triesSoFar: 2,
    });
    expect(fb.interrupt).toBe(true);
    expect(fb.headline.toLowerCase()).toContain('set før');
  });

  it('falder tilbage til et hint når fejlen ikke kan genkendes', () => {
    const fb = feedbackForWrongAnswer({ problem, misconception: null, trapFeedback: null, repeatCount: 0, triesSoFar: 1 });
    expect(fb.body).toBe(problem.hints[0]);
    expect(fb.interrupt).toBe(false);
  });
});

describe('fejlklinik', () => {
  it('forklarer troen, rettelsen og huskereglen', () => {
    const m = getMisconception('broek-add-naevnere')!;
    const msgs = misconceptionClinic(m);
    const all = msgs.map((x) => x.text).join(' ');
    expect(all).toContain(m.belief);
    expect(all).toContain(m.correction);
    expect(all).toContain(m.tip);
  });
});

describe('systemprompt til Claude', () => {
  it('indeholder opgaven, hints og løsningstrin', () => {
    const prompt = buildSystemPrompt({ problem, skill, strugglingWith: [], helpLevel: 0 });
    expect(prompt).toContain(problem.prompt);
    problem.hints.forEach((h) => expect(prompt).toContain(h));
    expect(prompt).toContain('Giv ALDRIG facit med det samme');
  });

  it('fortæller modellen hvilket hjælpetrin eleven er på', () => {
    expect(buildSystemPrompt({ problem, skill, strugglingWith: [], helpLevel: 3 })).toContain('hjælpetrin 3');
  });

  it('videregiver elevens kendte svagheder', () => {
    const prompt = buildSystemPrompt({ problem, skill, strugglingWith: ['ligning-fortegn'], helpLevel: 0 });
    expect(prompt).toContain('TIDLIGERE KÆMPET MED');
  });
});
