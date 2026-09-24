import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Misconception, Problem, Skill, SkillState } from '../types';
import { checkAnswer, emptyResponse, findTrap, isBlank, answerToString, type Response } from '../lib/answer';
import { MathBlock, MathText } from './MathText';
import { Tick } from './Tick';
import { Icon } from './Icon';
import { Visual } from './visuals/Visual';
import { AnswerInput, InputHint, type Verdict } from './AnswerInput';
import { Callout, Chip, Disclosure, LevelDots, XpPop } from './ui';
import { TutorDock } from './TutorDock';
import { feedbackForWrongAnswer } from '../tutor/tutor';
import { getMisconception } from '../content/misconceptions';

export interface SubmitInfo {
  correct: boolean;
  hints: number;
  tries: number;
  seconds: number;
  misconceptionId?: string;
  confidence?: 1 | 2 | 3;
}

/**
 * Selve opgavekortet: opgaven, svarfeltet, hints, feedback og adgang til
 * AI-læreren.
 *
 * Kortet måler selv hvor lang tid eleven bruger og hvor mange hints der
 * blev åbnet — de tal er det, den adaptive motor arbejder ud fra, så de
 * skal måles her hvor de rent faktisk sker.
 */
export function ProblemCard({
  problem,
  skill,
  state,
  onSubmit,
  onNext,
  xpOnCorrect,
  nextLabel = 'Næste',
  showConfidence,
  allowHints = true,
  allowTutor = true,
  autoAdvance,
  headerRight,
}: {
  problem: Problem;
  skill: Skill;
  state?: SkillState;
  onSubmit: (info: SubmitInfo) => void;
  onNext: () => void;
  /** XP der skal flyve op når svaret er rigtigt. */
  xpOnCorrect?: number;
  nextLabel?: string;
  showConfidence?: boolean;
  allowHints?: boolean;
  /** Til prøvetræning: ingen AI-lærer, som til den rigtige prøve. */
  allowTutor?: boolean;
  autoAdvance?: boolean;
  headerRight?: React.ReactNode;
}) {
  const [response, setResponse] = useState<Response>(() => emptyResponse(inputKind(problem)));
  const [verdict, setVerdict] = useState<Verdict>('idle');
  const [hintsShown, setHintsShown] = useState(0);
  const [tries, setTries] = useState(0);
  const [settled, setSettled] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ headline: string; body: string; tip?: string; misconception: Misconception | null } | null>(null);
  const [confidence, setConfidence] = useState<1 | 2 | 3 | undefined>();
  const [showSolution, setShowSolution] = useState(false);
  const [xpPop, setXpPop] = useState(false);
  const startedAt = useRef(Date.now());

  // Ny opgave: nulstil alt, inklusive uret.
  useEffect(() => {
    setResponse(emptyResponse(inputKind(problem)));
    setVerdict('idle');
    setHintsShown(0);
    setTries(0);
    setSettled(false);
    setFeedback(null);
    setConfidence(undefined);
    setShowSolution(false);
    setXpPop(false);
    startedAt.current = Date.now();
  }, [problem.id]);

  const elapsed = () => Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));

  function submit() {
    if (settled || isBlank(response)) return;
    const nextTries = tries + 1;
    setTries(nextTries);
    const correct = checkAnswer(problem.answer, response);

    if (correct) {
      setVerdict('correct');
      setSettled(true);
      setFeedback(null);
      if (xpOnCorrect) setXpPop(true);
      onSubmit({ correct: true, hints: hintsShown, tries: nextTries, seconds: elapsed(), confidence });
      if (autoAdvance) setTimeout(onNext, 1100);
      return;
    }

    setVerdict('wrong');
    const trap = findTrap(problem, response);
    const misconception = trap ? getMisconception(trap.misconceptionId) ?? null : null;
    const fb = feedbackForWrongAnswer({
      problem,
      misconception,
      trapFeedback: trap?.feedback ?? null,
      repeatCount: 0,
      triesSoFar: nextTries,
    });
    setFeedback({ ...fb, misconception });

    // To forsøg er nok: derefter er det mere hjælpsomt at vise vejen end
    // at lade eleven blive ved med at gætte.
    const done = nextTries >= 2;
    if (done) setSettled(true);
    onSubmit({
      correct: false,
      hints: hintsShown,
      tries: nextTries,
      seconds: elapsed(),
      misconceptionId: trap?.misconceptionId,
      confidence,
    });
  }

  const hintsAvailable = allowHints && hintsShown < problem.hints.length;

  const facit = useMemo(() => answerToString(problem.answer, problem.choices), [problem]);

  return (
    <article
      className={clsx(
        'card relative overflow-visible rounded-3xl transition-colors duration-300',
        // Grønt pulsslag ved rigtigt svar, ryst ved forkert, og kanten
        // tager svarets farve. Bevægelsen slås fra af "Mindre bevægelse".
        verdict === 'correct' && 'animate-pulse-correct border-xp-500/50',
        verdict === 'wrong' && 'animate-shake border-bad-500/50',
      )}
    >
      {xpPop && xpOnCorrect ? <XpPop amount={xpOnCorrect} onDone={() => setXpPop(false)} /> : null}
      {/* Hoved */}
      <div className="flex flex-wrap items-center gap-2 rounded-t-3xl border-b border-ink-200 px-5 py-3 dark:border-white/[0.07] sm:px-6">
        <Chip tone="neutral">{skill.name}</Chip>
        <LevelDots level={problem.level} />
        <span className="ml-auto flex items-center gap-2">{headerRight}</span>
      </div>

      <div className="p-5 sm:p-6">
        {/* Opgaven */}
        <div className="prose-math text-xl leading-relaxed text-ink-900 dark:text-ink-50">
          <MathText>{problem.prompt}</MathText>
        </div>
        {problem.instruction ? (
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{problem.instruction}</p>
        ) : null}

        {problem.visual ? <Visual spec={problem.visual} className="mt-4" /> : null}

        {/* Svar */}
        <div className="mt-5">
          <AnswerInput
            spec={problem.input}
            choices={problem.choices}
            value={response}
            onChange={(r) => {
              setResponse(r);
              if (verdict === 'wrong') setVerdict('idle');
            }}
            onSubmit={submit}
            verdict={verdict}
            disabled={settled}
            autoFocus
          />
          {!settled ? <InputHint spec={problem.input} /> : null}
        </div>

        {/* Sikkerhed — kalibrering af elevens egen vurdering */}
        {showConfidence && !settled ? (
          <fieldset className="mt-4">
            <legend className="mb-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">Hvor sikker er du?</legend>
            <div className="flex gap-1.5">
              {([1, 2, 3] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConfidence(c)}
                  className={clsx(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    confidence === c
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200'
                      : 'border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400',
                  )}
                  aria-pressed={confidence === c}
                >
                  {['Gætter', 'Lidt usikker', 'Helt sikker'][c - 1]}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {/* Hints */}
        {hintsShown > 0 ? (
          <div className="mt-4 space-y-2">
            {problem.hints.slice(0, hintsShown).map((h, i) => (
              <Callout key={i} className="roll-in" tone="warn" icon="bulb">
                <MathText>{h}</MathText>
              </Callout>
            ))}
          </div>
        ) : null}

        {/* Feedback */}
        {feedback ? (
          <div className="mt-4">
            <Callout tone={feedback.misconception ? 'warn' : 'bad'} title={feedback.headline}>
              <MathText>{feedback.body}</MathText>
              {feedback.tip ? (
                <p className="mt-2 rounded-lg bg-white/60 px-2.5 py-1.5 text-xs font-semibold dark:bg-ink-950/40">
                  Huskeregel: {feedback.tip}
                </p>
              ) : null}
            </Callout>
          </div>
        ) : null}

        {verdict === 'correct' ? (
          <div className="mt-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-good-500/15 text-good-600 dark:text-good-300">
              <Tick />
            </span>
            <div className="min-w-0 flex-1">
              <Callout tone="good" title={hintsShown > 0 ? 'Rigtigt, med lidt hjælp' : 'Rigtigt'}>
                {problem.concept ? <MathText>{`Husk reglen: ${problem.concept}`}</MathText> : null}
              </Callout>
            </div>
          </div>
        ) : null}

        {/* Løsning */}
        {(settled && verdict === 'wrong') || showSolution ? (
          <div className="mt-4">
            <Disclosure summary="Se løsningen trin for trin" defaultOpen={settled && verdict === 'wrong'}>
              <ol className="space-y-3">
                {problem.solution.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <MathText className="text-sm">{step.text}</MathText>
                      {step.math ? <MathBlock tex={step.math} className="mt-1" /> : null}
                      {step.why ? <p className="mt-1 text-xs italic text-ink-500 dark:text-ink-400">{step.why}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 border-t border-ink-200 pt-3 text-sm font-bold dark:border-ink-800">
                Svar: <span className="num">{facit}</span>
              </p>
            </Disclosure>
          </div>
        ) : null}

        {/* Knapper */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!settled ? (
            <button onClick={submit} disabled={isBlank(response)} className="btn-primary">
              <Icon name="check" size={16} /> Tjek svar
            </button>
          ) : (
            <button onClick={onNext} className="btn-primary">
              {nextLabel} <Icon name="arrow-right" size={16} />
            </button>
          )}

          {hintsAvailable && !settled ? (
            <button onClick={() => setHintsShown((h) => h + 1)} className="btn-secondary">
              <Icon name="bulb" size={16} /> {hintsShown === 0 ? 'Hint' : 'Et hint mere'}
            </button>
          ) : null}

          {allowTutor ? (
            <button onClick={() => setTutorOpen(true)} className="btn-secondary ml-auto">
              <Icon name="hand" size={16} /> Få hjælp
            </button>
          ) : null}

          {settled && verdict === 'wrong' && !showSolution ? (
            <button onClick={() => setShowSolution(true)} className="btn-ghost">
              Vis løsning
            </button>
          ) : null}
        </div>

        {tries === 1 && !settled ? (
          <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">Du har ét forsøg mere. Læs beskeden ovenfor først.</p>
        ) : null}
      </div>

      <TutorDock
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        problem={problem}
        skill={skill}
        state={state}
        attemptedWrong={tries > 0 && verdict === 'wrong'}
        // At spørge læreren tæller som hjælp, præcis som et hint. Ellers
        // kunne man få hele vejen forklaret uden at det påvirkede
        // vurderingen af hvor sikkert emnet sidder.
        onHintUsed={() => setHintsShown((h) => Math.min(h + 1, problem.hints.length + 3))}
      />
    </article>
  );
}

function inputKind(problem: Problem): Response['kind'] {
  switch (problem.input.kind) {
    case 'choice':
      return 'choice';
    case 'multi':
      return 'multi';
    case 'pair':
      return 'pair';
    case 'point':
      return 'point';
    default:
      return 'text';
  }
}
