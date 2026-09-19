import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Problem, Skill, SkillState } from '../types';
import { detectIntent, greeting, respond, studentMessage, tutorMessage, type TutorContext, type TutorMessage } from '../tutor/tutor';
import { askClaude, buildSystemPrompt, type LlmTurn } from '../tutor/llm';
import { MathBlock, MathText } from './MathText';
import { Icon } from './Icon';
import { useStore } from '../state/store';

/**
 * Chatten med AI-læreren.
 *
 * Panelet holder styr på hjælpetrinnet — det er den mekanik der gør at
 * tutoren ikke bare udleverer facit. Er der indsat en Claude-nøgle,
 * bruges den; ellers svarer den indbyggede tutor. Fejler kaldet, falder
 * vi tilbage uden at eleven står med en app der ikke svarer.
 */
export function TutorPanel({
  problem,
  skill,
  state,
  attemptedWrong,
  onHintUsed,
}: {
  problem: Problem;
  skill: Skill;
  state?: SkillState;
  attemptedWrong: boolean;
  onHintUsed: () => void;
}) {
  const settings = useStore((s) => s.settings);
  const recordLlmUsage = useStore((s) => s.recordLlmUsage);
  const misconceptions = useStore((s) => s.misconceptions);
  const struggling = Object.values(misconceptions)
    .filter((m) => !m.resolved && m.count >= 1)
    .sort((a, b) => b.count - a.count)
    .map((m) => m.id);

  const [helpLevel, setHelpLevel] = useState(0);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [llmNote, setLlmNote] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ctx = (): TutorContext => ({ problem, skill, state, helpLevel, strugglingWith: struggling, attemptedWrong });

  // Ny opgave betyder ny samtale: hjælpetrinnet skal starte forfra, ellers
  // ville eleven få facit med det samme på næste opgave.
  useEffect(() => {
    setMessages([greeting({ problem, skill, state, helpLevel: 0, strugglingWith: struggling, attemptedWrong })]);
    setHelpLevel(0);
    setLlmNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const useLlm = settings.useLlmTutor && settings.apiKey.trim().length > 0;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const history = [...messages, studentMessage(trimmed)];
    setMessages(history);
    setInput('');
    onHintUsed();

    if (!useLlm) {
      const intent = detectIntent(trimmed);
      const reply = respond(ctx(), intent, trimmed);
      setHelpLevel(reply.helpLevel ?? helpLevel + 1);
      // En kort pause gør samtalen lettere at følge end et øjeblikkeligt svar.
      setBusy(true);
      setTimeout(() => {
        setMessages((m) => [...m, reply]);
        setBusy(false);
      }, 280);
      return;
    }

    setBusy(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const turns: LlmTurn[] = history
      .filter((m) => m.text.trim().length > 0)
      .slice(-10)
      .map((m) => ({ role: m.role === 'elev' ? ('user' as const) : ('assistant' as const), content: m.text }));
    // Claude kræver at samtalen starter med eleven.
    while (turns.length && turns[0]!.role === 'assistant') turns.shift();

    const result = await askClaude({
      apiKey: settings.apiKey,
      model: settings.llmModel,
      system: buildSystemPrompt({ problem, skill, state, strugglingWith: struggling, helpLevel }),
      turns,
      signal: controller.signal,
    });
    if (result.usage) recordLlmUsage(result.usage.input, result.usage.output);

    if (result.ok) {
      setMessages((m) => [...m, tutorMessage(result.text, { helpLevel: helpLevel + 1 })]);
      setHelpLevel((h) => h + 1);
      setLlmNote(null);
    } else if (result.error !== 'Afbrudt.') {
      // Falder tilbage til den indbyggede tutor, så eleven aldrig står uden svar.
      const reply = respond(ctx(), detectIntent(trimmed), trimmed);
      setMessages((m) => [...m, reply]);
      setHelpLevel(reply.helpLevel ?? helpLevel + 1);
      setLlmNote(result.error ?? 'Kunne ikke nå Claude — bruger den indbyggede lærer.');
    }
    setBusy(false);
  }

  const last = messages[messages.length - 1];
  const suggestions = last?.role === 'tutor' ? last.suggestions ?? [] : [];

  return (
    <div className="flex h-full flex-col">
      <p className="flex items-center gap-1.5 border-b border-ink-200/70 pb-2.5 text-[11px] text-ink-500 dark:border-white/[0.08] dark:text-ink-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-xp-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-xp-500" />
        </span>
        {useLlm ? 'Claude er tilkoblet' : 'Indbygget lærer — virker uden internet'}
      </p>

      <div className="flex-1 space-y-3 overflow-y-auto py-4" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={clsx('flex', m.role === 'elev' ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[85%] animate-fade-up whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                m.role === 'elev'
                  ? 'rounded-br-sm bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-inset'
                  : 'rounded-bl-sm border border-ink-200/70 bg-white/70 text-ink-800 backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-ink-100',
              )}
            >
              <MathText>{m.text}</MathText>
              {m.math?.map((tex, i) => (
                <MathBlock key={i} tex={tex} className="mt-1.5 overflow-x-auto" />
              ))}
            </div>
          </div>
        ))}
        {busy ? (
          <div className="flex justify-start">
            <div className="flex animate-fade-in items-center gap-1.5 rounded-2xl rounded-bl-sm border border-ink-200/70 bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.06]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-ink-400 dark:bg-ink-300"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {llmNote ? (
        <p className="mb-2 rounded-lg bg-warn-100 px-3 py-2 text-xs text-warn-800 dark:bg-warn-900/30 dark:text-warn-200">{llmNote}</p>
      ) : null}

      {suggestions.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={busy}
              className="rounded-full border border-ink-200/80 bg-white/60 px-3 py-1.5 text-xs font-semibold text-ink-600 backdrop-blur-sm transition-all duration-150 ease-spring hover:-translate-y-0.5 hover:border-brand-400 hover:text-brand-700 active:scale-95 disabled:opacity-50 dark:border-white/[0.10] dark:bg-white/[0.05] dark:text-ink-300 dark:hover:border-brand-400/60"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-ink-200/70 pt-3 dark:border-white/[0.08]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv hvad du er i tvivl om …"
          className="field flex-1 text-sm"
          aria-label="Besked til AI-læreren"
          disabled={busy}
        />
        <button type="submit" className="btn-primary px-3.5" disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="send" size={16} />
        </button>
      </form>
    </div>
  );
}
