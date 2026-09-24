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
} from '../engine/exam';
import { CATEGORIES } from '../content';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, ChoiceCard, Chip, StatTile, LabelledBar, PageHeader, ProgressBar, ProgressRing, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';
import { FormelsamlingButton } from '../components/Formelsamling';

/**
 * FP9-prøvetræning.
 *
 * To prøvedele med hver deres regler, ligesom den rigtige prøve. Der er
 * hverken hints eller AI-lærer undervejs — det ville ikke ligne noget.
 * Til gengæld får eleven en grundig gennemgang bagefter.
 */
export function ExamPage() {
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Uret opdateres hvert sekund mens prøven kører.
  useEffect(() => {
    if (!session || finished) return;
    const t = setInterval(() => setSeconds(Math.round(timeLeft(session))), 500);
    return () => clearInterval(t);
  }, [session, finished]);

  // Tiden er gået: prøven lukker af sig selv, som til den rigtige prøve.
  useEffect(() => {
    if (session && !finished && seconds <= 0 && Date.now() - session.startedAt > 2000) setFinished(true);
  }, [seconds, session, finished]);

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

  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);
  const lowTime = seconds < 300;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Uret og fremgangen bliver stående øverst, også når en lang opgave
          skal rulles - man skal kunne se tiden uden at lede efter den. */}
      <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-ink-200 bg-ink-50/90 px-4 py-3 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/90 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">{session.config.title}</p>
            <p className="num mt-0.5 text-sm font-semibold">
              Opgave {session.index + 1} af {session.items.length}
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
            <Icon name="clock" size={16} className={lowTime ? '' : 'text-ink-400'} />
            {mm}:{String(ss).padStart(2, '0')}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar value={(session.index / session.items.length) * 100} size="sm" label="Fremgang i prøven" />
        </div>
      </div>

      <ProblemCard
        key={item.problem.id}
        problem={item.problem}
        skill={item.skill}
        state={skills[item.skill.id]}
        // Ingen hints og ingen hjælp til prøven — det ville ikke ligne
        // den rigtige situation.
        allowHints={false}
        allowTutor={false}
        onSubmit={(info: SubmitInfo) => {
          recordAttempt({ problem: item.problem, ...info, phase: 'practice' });
          setSession((s) => (s ? answerExamItem(s, info.correct) : s));
        }}
        onNext={() => undefined}
        nextLabel="Næste"
        headerRight={<Chip tone="neutral">{session.config.part === 'uden' ? 'uden hjælpemidler' : 'med hjælpemidler'}</Chip>}
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
    </div>
  );
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                { icon: 'layers', label: `${c.count} opgaver` },
                { icon: 'clock', label: `${c.minutes} min` },
              ]}
              action={{ label: 'Start', onClick: () => onStart(part) }}
            />
          );
        })}
      </div>

      <div className="mt-4">
        <Callout tone="neutral" icon="info">
          Opgaverne er appens egne og følger Fælles Mål og prøvens opbygning. Det er ikke officielle prøvesæt — dem
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

  // Resultatet er ikke en ny rute, så routeren ruller ikke op. Uden det
  // her åbner det midt på siden, der hvor man sidst stod i prøven.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Prøven er afleveret" subtitle={session.config.title} />

      <Card pad="lg" className="mb-5 mt-6 flex items-center gap-5 rounded-3xl">
        <ProgressRing value={result.percent} size={80} stroke={8} />
        <div className="min-w-0">
          <p className="text-3xl font-extrabold leading-none">{grade.grade}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-400">karakterindikation</p>
          <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{grade.note}</p>
        </div>
      </Card>

      <div className="stagger mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Rigtige" icon="check" tone="xp" value={result.correct} suffix={`/ ${result.total}`} />
        <StatTile label="Besvaret" icon="pencil" value={result.answered} suffix={`/ ${result.total}`} />
        <StatTile label="Tid" icon="clock" value={result.minutesUsed} suffix="min" />
      </div>

      <Callout tone="neutral" icon="info">
        Karakteren er en grov indikation ud fra hvor mange opgaver du fik rigtige. Den rigtige prøve bedømmes af en
        censor efter flere kriterier end det.
      </Callout>

      <section className="mt-5">
        <SectionTitle>Sådan gik det pr. kompetenceområde</SectionTitle>
        <Card>
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
        </Card>
      </section>

      {result.weakSkills.length ? (
        <section className="mt-5">
          <SectionTitle>Det du skal øve</SectionTitle>
          <ul className="space-y-2">
            {result.weakSkills.slice(0, 6).map((w) => (
              <Card key={w.skillId} as="li" pad="sm">
                <button
                  onClick={() => navigate({ name: 'lesson', skillId: w.skillId })}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{w.name}</span>
                  <Chip tone="warn">{w.wrong} forkert</Chip>
                  <Icon name="chevron" size={16} className="text-ink-400" />
                </button>
              </Card>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button onClick={onRetry} className="btn-secondary flex-1">
          Tag en prøve mere
        </button>
        <button onClick={() => navigate({ name: 'dashboard' })} className="btn-primary flex-1 py-3">
          Tilbage til forsiden
        </button>
      </div>
    </div>
  );
}
