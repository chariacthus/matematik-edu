import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  EXAM_PARTS,
  answerExamItem,
  createExam,
  currentExamItem,
  examFinished,
  gradeIndication,
  summariseExam,
  timeLeft,
  type ExamPart,
  type ExamSession,
  type ExamTheme as ExamThemeInfo,
} from '../engine/exam';
import { MathText } from '../components/MathText';
import { Visual } from '../components/visuals/Visual';
import { CATEGORIES } from '../content';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { ProblemCard, SolutionSteps, type SubmitInfo } from '../components/ProblemCard';
import { choiceText } from '../components/AnswerInput';
import { answerToString } from '../lib/answer';
import { Callout, Card, ChoiceCard, Disclosure, EmptyState, LabelledBar, ListRow, MetaChip, PageHeader, ProgressBar, ProgressRing, SectionTitle, Segmented, StatTile } from '../components/ui';
import { Icon } from '../components/Icon';
import { useFocusMode } from '../components/Layout';
import { FormelsamlingButton } from '../components/Formelsamling';

/**
 * FP9-prøvetræning.
 *
 * To prøvedele med hver deres regler, ligesom den rigtige prøve. Der er
 * hverken hints eller hjælp undervejs, for det ville ikke ligne noget.
 * Til gengæld får eleven en grundig gennemgang bagefter.
 */
export function ExamPage() {
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [finished, setFinished] = useState(false);
  const [, setTick] = useState(0);
  const running = session !== null && !finished;
  useFocusMode(running && !examFinished(session));

  // Tiden regnes altid ud fra prøvens starttidspunkt. Uret tikker kun for
  // at tegne siden igen; det startede før på 0:00, og et forsinket tik
  // kunne få prøven til at blive afleveret af sig selv.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [running]);

  const seconds = session ? Math.round(timeLeft(session)) : 0;

  // Tiden er gået: prøven lukker af sig selv, som til den rigtige prøve.
  useEffect(() => {
    if (running && seconds <= 0) setFinished(true);
  }, [running, seconds]);

  if (!session) return <ExamPicker onStart={(part) => { setSession(createExam(part, skills)); setFinished(false); }} />;

  if (finished || examFinished(session)) {
    return (
      <ExamResultView
        session={{ ...session, finishedAt: session.finishedAt ?? Date.now() }}
        onRetry={() => setSession(null)}
      />
    );
  }

  const item = currentExamItem(session);
  if (!item) return null;

  const theme = item.theme;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  const lowTime = seconds < 300;

  const question = (
    <>
      <ProblemCard
        key={item.problem.id}
        problem={item.problem}
        skill={item.skill}
        state={skills[item.skill.id]}
        // Ingen hints, ingen hjælp og ingen lyd til prøven. Det ville ikke
        // ligne den rigtige situation.
        allowHints={false}
        allowTutor={false}
        sounds={false}
        onSubmit={(info: SubmitInfo) => {
          recordAttempt({ problem: item.problem, ...info, phase: 'practice' });
          setSession((s) => (s ? answerExamItem(s, info.correct, info.answer) : s));
        }}
        onNext={() => undefined}
        nextLabel="Næste"
        label={`Opgave ${item.label ?? session.index + 1}`}
        headerRight={<MetaChip tone="neutral">{session.config.part === 'uden' ? 'uden hjælpemidler' : 'med hjælpemidler'}</MetaChip>}
      />

      {/* Til den rigtige prøve med hjælpemidler har man formelsamlingen
          med. Uden den tester prøven udenadslære frem for det den skal. */}
      {session.config.part === 'med' ? (
        <div className="mt-4">
          <FormelsamlingButton className="btn-secondary w-full sm:w-auto" />
        </div>
      ) : null}

      <div className="mt-4 flex justify-between">
        <button onClick={() => setSession((s) => (s ? answerExamItem(s, false) : s))} className="btn-ghost text-xs">
          Spring over
        </button>
        <button onClick={() => setFinished(true)} className="btn-ghost text-xs">
          Aflevér prøven
        </button>
      </div>
    </>
  );

  return (
    <div className={clsx('mx-auto', theme ? 'max-w-5xl' : 'max-w-2xl')}>
      {/* Uret og fremgangen bliver stående øverst, også når en lang opgave
          skal rulles - man skal kunne se tiden uden at lede efter den. */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/90 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{session.config.title}</p>
            <p className="num mt-0.5 text-sm font-semibold">
              {item.label ? `Opgave ${item.label} · ` : 'Opgave '}
              {session.index + 1} af {session.items.length}
            </p>
          </div>
          <div
            className={clsx(
              'num flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-lg font-semibold transition-colors',
              lowTime
                ? 'border-bad-400/40 bg-bad-100 text-bad-700 dark:bg-bad-500/15 dark:text-bad-200'
                : 'border-ink-200 bg-white dark:border-white/10 dark:bg-ink-900',
            )}
            role="timer"
            aria-label={`${mm} minutter og ${ss} sekunder tilbage`}
          >
            <Icon name="clock" size={16} className={lowTime ? '' : 'text-ink-500 dark:text-ink-400'} />
            {mm}:{String(ss).padStart(2, '0')}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={(session.index / session.items.length) * 100} size="sm" label="Fremgang i prøven" />
        </div>
      </div>

      {theme ? (
        <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
          <div className="hidden lg:sticky lg:top-32 lg:block">
            <ThemeSheet theme={theme} />
          </div>
          <div className="lg:hidden">
            {item.label?.endsWith('.1') ? (
              <ThemeSheet theme={theme} />
            ) : (
              <Card pad="sm">
                <Disclosure summary={`Oplysninger til opgave ${theme.number}`}>
                  <ThemeSheet theme={theme} bare />
                </Disclosure>
              </Card>
            )}
          </div>
          <div>{question}</div>
        </div>
      ) : (
        question
      )}
    </div>
  );
}

/** Opgavens historie og tabel, som øverst på et opgaveark. */
function ThemeSheet({ theme, bare }: { theme: ExamThemeInfo; bare?: boolean }) {
  const body = (
    <>
      <p className="eyebrow">Opgave {theme.number}</p>
      <h2 className="mt-1 text-lg font-semibold">{theme.title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
        <MathText>{theme.intro}</MathText>
      </p>
      {theme.visual ? <Visual spec={theme.visual} className="mt-4" /> : null}
    </>
  );
  if (bare) return <div className="pt-3">{body}</div>;
  return <Card data-theme-sheet>{body}</Card>;
}

/* ------------------------------------------------------------------ */

function ExamPicker({ onStart }: { onStart: (part: ExamPart) => void }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Prøvetræning"
        subtitle="FP9 i matematik består af to prøver med hver sine regler. Træn dem hver for sig."
        back={{ label: 'Forsiden', onClick: () => navigate({ name: 'dashboard' }) }}
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(['uden', 'med'] as const).map((part) => {
          const c = EXAM_PARTS[part];
          return (
            <ChoiceCard
              key={part}
              icon={part === 'uden' ? 'pencil' : 'calculator'}
              tone={part === 'uden' ? 'brand' : 'accent'}
              title={c.title}
              description={c.description}
              meta={[
                { icon: 'layers', label: part === 'med' ? `3 opgaver · ${c.count} delopgaver` : `${c.count} opgaver` },
                { icon: 'clock', label: `${c.minutes} min` },
              ]}
              action={{ label: 'Start', onClick: () => onStart(part) }}
            />
          );
        })}
      </div>

      <div className="mt-4">
        <Callout tone="neutral" icon="info">
          Opgaverne er appens egne og følger Fælles Mål og prøvens opbygning. Det er ikke officielle prøvesæt. Dem
          finder du hos Styrelsen for Undervisning og Kvalitet.
        </Callout>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ExamResultView({ session, onRetry }: { session: ExamSession; onRetry: () => void }) {
  const result = useMemo(() => summariseExam(session), [session]);
  const grade = gradeIndication(result.percent);
  const [reviewing, setReviewing] = useState(false);

  // Resultatet er ikke en ny rute, så routeren ruller ikke op. Uden det
  // her åbner det midt på siden, der hvor man sidst stod i prøven.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [reviewing]);

  if (reviewing) return <ExamReview session={session} onBack={() => setReviewing(false)} />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Prøven er afleveret" subtitle={session.config.title} />

      <Card pad="lg" className="flex items-center gap-5 rounded-3xl">
        <ProgressRing value={result.percent} size={80} stroke={8} />
        <div className="min-w-0">
          <p className="text-3xl font-bold leading-none">{grade.grade}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">karakterindikation</p>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{grade.note}</p>
        </div>
      </Card>

      <div className="stagger grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Rigtige" icon="check" tone="xp" value={result.correct} suffix={`/ ${result.total}`} />
        <StatTile label="Besvaret" icon="pencil" value={result.answered} suffix={`/ ${result.total}`} />
        <StatTile label="Tid" icon="clock" value={result.minutesUsed} suffix="min" />
      </div>

      {result.weakSkills.length ? (
        <section data-practice-these>
          <SectionTitle>Øv disse</SectionTitle>
          <Card pad="none" className="divide-y divide-ink-100 p-1.5 dark:divide-white/[0.05]">
            {result.weakSkills.slice(0, 3).map((w) => (
              <ListRow
                key={w.skillId}
                variant="plain"
                icon="target"
                tone="warn"
                title={w.name}
                trailing={<MetaChip tone="warn">{w.wrong} forkert</MetaChip>}
                onClick={() => navigate({ name: 'lesson', skillId: w.skillId })}
              />
            ))}
          </Card>
        </section>
      ) : null}

      <Disclosure summary="Detaljer">
        <p className="eyebrow mb-3">Pr. kompetenceområde</p>
        <ul className="space-y-3">
          {result.byCategory.map((c) => {
            const name = CATEGORIES.find((x) => x.id === c.category)?.name ?? c.category;
            const pct = c.total ? Math.round((c.correct / c.total) * 100) : 0;
            return (
              <li key={c.category}>
                <LabelledBar label={name} value={pct} right={`${c.correct}/${c.total}`} />
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
          Karakteren er en grov indikation ud fra hvor mange opgaver du fik rigtige. Den rigtige prøve bedømmes af en
          censor efter flere kriterier end det.
        </p>
      </Disclosure>

      <div className="flex flex-col gap-2">
        <button onClick={() => setReviewing(true)} className="btn-primary w-full py-3">
          <Icon name="eye" size={16} />
          Gennemgå opgaverne
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={onRetry} className="btn-secondary flex-1">
            Tag en prøve mere
          </button>
          <button onClick={() => navigate({ name: 'dashboard' })} className="btn-ghost flex-1">
            Til forsiden
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gennemgang: hver opgave med elevens svar og det rigtige              */
/* ------------------------------------------------------------------ */

function ExamReview({ session, onBack }: { session: ExamSession; onBack: () => void }) {
  const rows = session.items.map((item, i) => ({
    item,
    number: item.label ?? String(i + 1),
    correct: session.answers[i] === true,
    reached: session.answers[i] !== null,
    response: session.responses?.[i] ?? null,
  }));
  // Opgaver man ikke nåede før afleveringen, står kun under Alle.
  const wrong = rows.filter((r) => r.reached && !r.correct);
  const [show, setShow] = useState<'forkerte' | 'alle'>(wrong.length ? 'forkerte' : 'alle');
  const list = show === 'forkerte' ? wrong : rows;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Gennemgang"
        subtitle={`${session.config.title} · ${rows.filter((r) => r.correct).length} af ${rows.length} rigtige`}
        back={{ label: 'Resultatet', onClick: onBack }}
      />

      <Segmented
        value={show}
        onChange={setShow}
        options={[
          { id: 'forkerte', label: 'Forkerte', count: wrong.length || undefined },
          { id: 'alle', label: 'Alle', count: rows.length },
        ]}
      />

      {list.length ? (
        <ol className="space-y-3">
          {list.map((r) => (
            <ReviewItem key={r.number} {...r} />
          ))}
        </ol>
      ) : (
        <EmptyState icon="check" title="Ingen forkerte" body="Alle de opgaver du nåede, fik du rigtige." />
      )}
    </div>
  );
}

function ReviewItem({
  item,
  number,
  correct,
  reached,
  response,
}: {
  item: ExamSession['items'][number];
  number: string;
  correct: boolean;
  reached: boolean;
  response: string | null;
}) {
  const status = correct ? 'Rigtigt' : response ? 'Forkert' : reached ? 'Sprunget over' : 'Ikke nået';
  const p = item.problem;
  const hasChoices = Boolean(p.choices?.length);
  const shown = (text: string) =>
    hasChoices ? <MathText>{choiceText(text)}</MathText> : <span className="num">{text}</span>;

  return (
    <Card as="li" data-review-item>
      <div className="flex items-center gap-2">
        <span className="num text-sm font-semibold">Opgave {number}</span>
        <MetaChip tone={correct ? 'good' : response ? 'bad' : 'neutral'}>{status}</MetaChip>
      </div>
      {item.theme ? <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{item.theme.title}</p> : null}

      <div className="prose-math mt-3 leading-relaxed text-ink-900 dark:text-ink-50">
        <MathText>{p.prompt}</MathText>
      </div>
      {p.visual && !p.visualAid ? <Visual spec={p.visual} mode="problem" className="mt-3" /> : null}

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div
          className={clsx(
            'rounded-xl border px-3.5 py-2.5',
            correct
              ? 'border-good-500/30 bg-good-500/[0.06]'
              : response
                ? 'border-bad-400/30 bg-bad-500/[0.06]'
                : 'border-ink-200 dark:border-white/10',
          )}
        >
          <dt className="text-xs text-ink-500 dark:text-ink-400">Dit svar</dt>
          <dd className="mt-0.5 font-semibold">{response ? shown(response) : status}</dd>
        </div>
        {correct ? null : (
          <div className="rounded-xl border border-ink-200 px-3.5 py-2.5 dark:border-white/10">
            <dt className="text-xs text-ink-500 dark:text-ink-400">Rigtigt svar</dt>
            <dd className="mt-0.5 font-semibold">{shown(answerToString(p.answer, p.choices))}</dd>
          </div>
        )}
      </dl>

      {p.solution.length ? (
        <div className="mt-3">
          <Disclosure summary="Sådan regnes den">
            <SolutionSteps problem={p} />
          </Disclosure>
        </div>
      ) : null}
    </Card>
  );
}
