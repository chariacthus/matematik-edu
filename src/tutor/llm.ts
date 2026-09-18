import type { Problem, Skill, SkillState } from '../types';
import { answerToString } from '../lib/answer';
import { getMisconception } from '../content/misconceptions';

/**
 * Valgfri kobling til Claude.
 *
 * Appen virker fuldt ud uden. Den indbyggede tutor er regelbaseret og
 * bygger på opgavernes egne data, så der hverken kræves netværk eller
 * nøgle. Vælger brugeren at indsætte sin egen API-nøgle, kan
 * forklaringerne blive mere frit formulerede — men pædagogikken er den
 * samme, og den er skrevet ind i systemprompten.
 *
 * Nøglen gemmes kun i browserens localStorage og sendes kun til
 * Anthropics API.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';

export interface LlmTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function buildSystemPrompt(opts: {
  problem: Problem;
  skill: Skill;
  state?: SkillState;
  strugglingWith: string[];
  helpLevel: number;
}): string {
  const { problem, skill } = opts;
  const struggles = opts.strugglingWith
    .map((id) => getMisconception(id))
    .filter((m) => m !== undefined)
    .map((m) => `- ${m!.name}: eleven tror at ${m!.belief}`)
    .join('\n');

  return [
    'Du er en dansk matematiklærer for en elev i 9. klasse. Du svarer altid på dansk.',
    '',
    'REGLER — de gælder uden undtagelse:',
    '1. Giv ALDRIG facit med det samme, heller ikke hvis eleven beder direkte om det.',
    '   Stil i stedet et spørgsmål der får eleven til at tage første skridt selv.',
    '2. Trap hjælpen op gradvist: spørgsmål → hint → delvist trin → helt trin.',
    `   Eleven er nu på hjælpetrin ${opts.helpLevel}. Er trinnet 4 eller højere, må du gennemgå`,
    '   hele løsningen — for da hjælper det ikke længere eleven at blive holdt hen.',
    '3. Hold det kort. Højst 3-4 sætninger ad gangen. Eleven skal svare imellem.',
    '4. Brug LaTeX mellem $ ... $ til formler.',
    '5. Ros indsats og fremgang, ikke "du er klog". Vær venlig, aldrig nedladende.',
    '6. Hold dig til denne opgave. Du må ikke opfinde tal eller regler der ikke står nedenfor.',
    '',
    `EMNE: ${skill.name} — ${skill.goal}`,
    `OPGAVE: ${problem.prompt}`,
    `FACIT (må ikke afsløres før hjælpetrin 4): ${answerToString(problem.answer, problem.choices)}`,
    '',
    'HINTS i den rækkefølge de skal gives:',
    ...problem.hints.map((h, i) => `${i + 1}. ${h}`),
    '',
    'LØSNINGENS TRIN:',
    ...problem.solution.map((s, i) => `${i + 1}. ${s.text}${s.math ? ` — ${s.math}` : ''}${s.why ? ` (fordi: ${s.why})` : ''}`),
    '',
    ...(problem.traps?.length
      ? ['TYPISKE FEJL I DENNE OPGAVE:', ...problem.traps.map((t) => `- ${t.feedback}`), '']
      : []),
    ...(struggles ? ['ELEVEN HAR TIDLIGERE KÆMPET MED:', struggles, ''] : []),
    ...(opts.state
      ? [`ELEVENS NIVEAU I EMNET: ${Math.round(opts.state.pKnown * 100)} % sikker, ${opts.state.attempts} opgaver løst.`]
      : []),
  ].join('\n');
}

export interface LlmResult {
  ok: boolean;
  text: string;
  /** Sat når kaldet fejlede, så brugerfladen kan falde tilbage. */
  error?: string;
  /** Faktisk forbrug, så appen kan vise eleven hvad det kostede. */
  usage?: { input: number; output: number };
}

/**
 * Kalder Claude. Fejler kaldet — ingen nøgle, intet net, kvote opbrugt —
 * returnerer vi det pænt, så brugerfladen kan bruge den indbyggede tutor
 * i stedet. Eleven skal aldrig stå med en app der ikke svarer.
 */
export async function askClaude(opts: {
  apiKey: string;
  model: string;
  system: string;
  turns: LlmTurn[];
  signal?: AbortSignal;
}): Promise<LlmResult> {
  if (!opts.apiKey.trim()) {
    return { ok: false, text: '', error: 'Der er ikke indsat nogen API-nøgle.' };
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: opts.model,
        // Et socratisk svar er 3-4 sætninger. Et lavt loft holder
        // omkostningen nede uden at klippe svarene over.
        max_tokens: 400,
        system: opts.system,
        messages: opts.turns,
      }),
      signal: opts.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        ok: false,
        text: '',
        error:
          res.status === 401
            ? 'API-nøglen blev afvist. Tjek den i Indstillinger.'
            : res.status === 429
              ? 'Der er for mange forespørgsler lige nu. Prøv igen om lidt.'
              : `Kaldet fejlede (${res.status}). ${detail.slice(0, 160)}`,
      };
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('')
      .trim();

    if (!text) return { ok: false, text: '', error: 'Tomt svar fra modellen.' };
    return {
      ok: true,
      text,
      usage: { input: data.usage?.input_tokens ?? 0, output: data.usage?.output_tokens ?? 0 },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, text: '', error: 'Afbrudt.' };
    }
    return {
      ok: false,
      text: '',
      error: 'Kunne ikke få forbindelse. Den indbyggede lærer svarer i stedet.',
    };
  }
}
