import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { LessonPhase, Misconception, Problem, Skill } from '../types';
import { LESSON_PHASES } from '../types';
import { domainName, getSkill } from '../content';
import { PHASE_HELP, PHASE_LABELS, PHASE_TARGETS, isPracticePhase, nextProblem } from '../engine/adaptive';
import { newSkillState } from '../engine/mastery';
import { INTERRUPT_THRESHOLD } from '../engine/diagnosis';
import { misconceptionClinic } from '../tutor/tutor';
import { getMisconception } from '../content/misconceptions';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { MathBlock, MathText } from './../components/MathText';
import { Visual } from '../components/visuals/Visual';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, CardTitle, MetaChip, ComboMeter, EmptyState, Page, PageHeader, Skeleton } from '../components/ui';
import { Icon } from '../components/Icon';
import { xpForAttempt } from '../engine/gamification';

/**
 * Lektionsafspilleren: de syv trin fra forklaring til mestringstjek.
 *
 * Fasen ligger i den gemte færdighedstilstand, ikke i komponenten — så
 * kan eleven lukke appen midt i et forløb og fortsætte præcis samme sted
 * dagen efter.
 */
export function LessonPage({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const stored = useStore((s) => s.skills[skillId]);
  const attempts = useStore((s) => s.attempts);
  const misconceptions = useStore((s) => s.misconceptions);
  const ensureSkill = useStore((s) => s.ensureSkill);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const setPhase = useStore((s) => s.setPhase);
  const addMinutes = useStore((s) => s.addMinutes);

  const state = stored ?? newSkillState(skillId);

  /** Sat når progressionen er afbrudt af en gentagen fejl. */
  const [clinic, setClinic] = useState<Misconception | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [justMastered, setJustMastered] = useState(false);
  const [levelNote, setLevelNote] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    ensureSkill(skillId);
    enteredAt.current = Date.now();
    return () => {
      const minutes = (Date.now() - enteredAt.current) / 60000;
      if (minutes >= 0.5) addMinutes(minutes);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const makeProblem = useCallback(
    (phase: LessonPhase) => {
      if (!skill) return;
      const { problem: p, decision } = nextProblem(skill, state, attempts, phase, randomSeed());
      setProblem(p);
      setLevelNote(
        decision.changed
          ? {
              'op-klarer-let': 'Du klarer det her let, så opgaverne bliver lidt sværere.',
              'ned-mange-fejl': 'Opgaverne bliver lidt lettere, så du kan få det til at sidde.',
              'ned-for-mange-hints': 'Her er en lidt lettere en. Prøv den uden hints.',
              'fase-udfordring': 'Her kommer en sværere en. Tag dig god tid.',
              'fase-guidet': null,
              'hold-stabil': null,
              start: null,
            }[decision.reason]
          : null,
      );
    },
    // `state` og `attempts` læses bevidst på kaldstidspunktet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skill, state.ability, state.cleanStreak, attempts.length],
  );

  // Hold altid en opgave klar når vi er i en øvefase.
  useEffect(() => {
    if (!skill) return;
    if (clinic) return;
    if (!isPracticePhase(state.phase)) {
      setProblem(null);
      return;
    }
    if (!problem || problem.skillId !== skillId) makeProblem(state.phase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill, skillId, state.phase, clinic]);

  const phaseIdx = LESSON_PHASES.indexOf(state.phase);

  const handleSubmit = (info: SubmitInfo) => {
    if (!problem) return;
    setSessionTotal((n) => n + 1);
    if (info.correct) {
      setSessionCorrect((n) => n + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    const result = recordAttempt({ problem, ...info, phase: state.phase });
    setXpGained((x) => x + result.xp);

    if (result.mastered) setJustMastered(true);
    if (result.regressed) {
      setLevelNote('Du går et trin tilbage og får lidt mere øvelse.');
    }

    // Gentagen fejl: stop progressionen og forklar netop den fejl.
    if (!info.correct && info.misconceptionId) {
      const count = (misconceptions[info.misconceptionId]?.count ?? 0) + 1;
      if (count >= INTERRUPT_THRESHOLD) {
        const m = getMisconception(info.misconceptionId);
        if (m) setClinic(m);
      }
    }
  };

  const summary = useMemo(
    () => attempts.filter((a) => a.skillId === skillId).slice(-30),
    [attempts, skillId],
  );

  if (!skill) {
    return (
      <EmptyState
        icon="compass"
        title="Emnet findes ikke"
        body="Linket peger på en færdighed der ikke er i biblioteket."
        action={
          <button onClick={() => navigate({ name: 'library' })} className="btn-primary">
            Til biblioteket
          </button>
        }
      />
    );
  }

  /* ---------------- Fejlklinik ---------------- */
  if (clinic) {
    return (
      <MisconceptionClinic
        misconception={clinic}
        onDone={() => {
          setClinic(null);
          // Efter klinikken starter vi i den guidede fase igen — eleven
          // skal have lov at bruge det nye med støtte først.
          setPhase(skillId, 'guided');
          makeProblem('guided');
        }}
      />
    );
  }

  /* ---------------- Gennemført ---------------- */
  if (justMastered) {
    return (
      <MasteredScreen
        skill={skill}
        correct={sessionCorrect}
        total={sessionTotal}
        onContinue={() => navigate({ name: 'dashboard' })}
        onPractice={() => {
          setJustMastered(false);
          setPhase(skillId, 'mastery');
          makeProblem('mastery');
        }}
      />
    );
  }

  return (
    <Page>
      <div className="space-y-4">
        <PageHeader
          title={skill.name}
          subtitle={skill.goal}
          back={{ label: domainName(skill.domainId), onClick: () => navigate({ name: 'domain', domainId: skill.domainId }) }}
          right={
            <span className="flex flex-col items-end gap-1.5">
              <ComboMeter streak={combo} />
              {xpGained > 0 ? (
                <span className="num flex items-center gap-1 text-xs font-bold text-xp-600 dark:text-xp-400">
                  <Icon name="bolt" size={12} />+{xpGained} XP
                </span>
              ) : null}
            </span>
          }
        />
        {/* Trinstriben hører til overskriften, ikke til indholdet - derfor
            tættere på den end sidens almindelige afstand. */}
        <PhaseTrack phase={state.phase} progress={state.phaseProgress} />
      </div>

      {levelNote ? (
        <Callout tone="brand" icon="chart">
          {levelNote}
        </Callout>
      ) : null}

      {state.phase === 'explain' ? (
        <ExplainStep skill={skill} onDone={() => setPhase(skillId, 'example')} />
      ) : state.phase === 'example' ? (
        <ExampleStep
          skill={skill}
          onDone={() => {
            setPhase(skillId, 'guided');
            makeProblem('guided');
          }}
          onBack={() => setPhase(skillId, 'explain')}
        />
      ) : problem ? (
        // key på fasen og opgaven: hver ny opgave glider ind i stedet for
        // at bytte tekst ud på stedet, så man kan se at der ER en ny.
        <div key={`${state.phase}-${problem.id}`} className="animate-swap-in space-y-4">
          <p className="-mt-1 text-sm text-ink-500 dark:text-ink-400">{PHASE_HELP[state.phase]}</p>
          <ProblemCard
            problem={problem}
            skill={skill}
            state={state}
            onSubmit={handleSubmit}
            onNext={() => makeProblem(state.phase)}
            nextLabel="Næste opgave"
            allowHints={state.phase !== 'mastery'}
            showConfidence={state.phase === 'mastery'}
            xpOnCorrect={xpForAttempt({ correct: true, level: problem.level, hints: 0, tries: 1, phase: state.phase })}
            headerRight={
              <MetaChip tone="brand">
                {state.phaseProgress}/{PHASE_TARGETS[state.phase]} i denne fase
              </MetaChip>
            }
          />
          {summary.length >= 3 ? <SessionStrip skillId={skillId} /> : null}
        </div>
      ) : (
        <Skeleton />
      )}

      {phaseIdx > 1 ? (
        <div className="flex justify-center">
          <button
            onClick={() => setPhase(skillId, 'explain')}
            className="btn-ghost text-xs"
            title="Gå tilbage til forklaringen uden at miste din fremgang"
          >
            Læs forklaringen igen
          </button>
        </div>
      ) : null}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Trin 1: forklaringen                                                */
/* ------------------------------------------------------------------ */

function ExplainStep({ skill, onDone }: { skill: Skill; onDone: () => void }) {
  return (
    <div className="space-y-4">
      {skill.explain.map((block, i) => {
        switch (block.kind) {
          case 'idea':
            return (
              <Card key={i} className="border-l-4 !border-l-brand-500">
                <p className="mb-1 text-sm font-bold text-brand-700 dark:text-brand-300">{block.title}</p>
                <p className="leading-relaxed"><MathText>{block.body}</MathText></p>
              </Card>
            );
          case 'analogy':
            return (
              <Callout key={i} tone="brand" title="Tænk på det sådan her" icon="brain">
                <MathText>{block.body}</MathText>
              </Callout>
            );
          case 'rule':
            return (
              <Card key={i}>
                <CardTitle>{block.title}</CardTitle>
                <MathBlock tex={block.math} className="my-1 text-center" />
                {block.body ? (
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-300"><MathText>{block.body}</MathText></p>
                ) : null}
              </Card>
            );
          case 'math':
            return (
              <Card key={i}>
                <MathBlock tex={block.math} className="text-center" />
                {block.caption ? <p className="mt-2 text-center text-xs text-ink-500">{block.caption}</p> : null}
              </Card>
            );
          case 'list':
            return (
              <Card key={i}>
                {block.title ? <CardTitle>{block.title}</CardTitle> : null}
                <ul className="space-y-1.5">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex gap-2.5 text-sm leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                      <MathText>{item}</MathText>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          case 'warning':
            return (
              <Callout key={i} tone="warn" title="Pas på her" icon="warning">
                <MathText>{block.body}</MathText>
              </Callout>
            );
          case 'visual':
            return (
              <Card key={i}>
                <Visual spec={block.visual} />
                {block.caption ? <p className="mt-2 text-center text-xs text-ink-500">{block.caption}</p> : null}
              </Card>
            );
          default:
            return (
              <Card key={i}>
                <p className="leading-relaxed"><MathText>{block.body}</MathText></p>
              </Card>
            );
        }
      })}

      <button onClick={onDone} className="btn-primary w-full py-3 text-base">
        Vis mig et eksempel
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trin 2: eksemplet                                                   */
/* ------------------------------------------------------------------ */

function ExampleStep({ skill, onDone, onBack }: { skill: Skill; onDone: () => void; onBack: () => void }) {
  const [revealed, setRevealed] = useState(1);
  const example = skill.worked[0]!;
  const allShown = revealed >= example.steps.length;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-bold text-ink-500 dark:text-ink-400">{example.title}</p>
        <MathBlock tex={example.prompt} className="my-3 text-center text-lg" />
        {example.visual ? <Visual spec={example.visual} className="mb-4" /> : null}

        <ol className="space-y-3">
          {example.steps.slice(0, revealed).map((step, i) => (
            <li key={i} className="flex gap-3 animate-fade-up">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <MathText className="text-sm leading-relaxed">{step.text}</MathText>
                {step.math ? <MathBlock tex={step.math} className="mt-1.5" /> : null}
                {step.why ? <p className="mt-1 text-xs italic text-ink-500 dark:text-ink-400">{step.why}</p> : null}
              </div>
            </li>
          ))}
        </ol>

        {/* Trinene afsløres ét ad gangen, så eleven får en chance for selv
            at gætte næste skridt i stedet for bare at læse hele facit. */}
        {!allShown ? (
          <button onClick={() => setRevealed((r) => r + 1)} className="btn-secondary mt-4 w-full">
            Vis næste trin
          </button>
        ) : example.takeaway ? (
          <Callout tone="good" title="Det du skal tage med dig" icon="target">
            <MathText>{example.takeaway}</MathText>
          </Callout>
        ) : null}
      </Card>

      {skill.worked.length > 1 && allShown ? (
        <Card>
          <p className="text-sm font-bold text-ink-500">{skill.worked[1]!.title}</p>
          <MathBlock tex={skill.worked[1]!.prompt} className="my-2 text-center" />
          <ol className="mt-2 space-y-2">
            {skill.worked[1]!.steps.map((s, i) => (
              <li key={i} className="text-sm">
                <MathText>{`${i + 1}. ${s.text}`}</MathText>
                {s.math ? <MathBlock tex={s.math} className="mt-1" /> : null}
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <div className="flex gap-2">
        <button onClick={onBack} className="btn-secondary">
          Tilbage
        </button>
        <button onClick={onDone} disabled={!allShown} className="btn-primary flex-1 py-3 text-base">
          Nu prøver jeg selv
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fasesporet                                                          */
/* ------------------------------------------------------------------ */

function PhaseTrack({ phase, progress }: { phase: LessonPhase; progress: number }) {
  const idx = LESSON_PHASES.indexOf(phase);
  const target = PHASE_TARGETS[phase];
  const within = target > 0 ? progress / target : 0;
  const overall = ((idx + within) / LESSON_PHASES.length) * 100;

  return (
    <div
      role="group"
      aria-label={`Trin ${idx + 1} af 7: ${PHASE_LABELS[phase]}, ${Math.round(overall)} procent af forløbet`}
    >
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-bold text-brand-700 dark:text-brand-300">
          Trin {idx + 1} af 7 · {PHASE_LABELS[phase]}
        </span>
      </div>
      {/*
        Syv felter — ét pr. trin. Det trin man står på fyldes op mens
        man løser opgaver, så stregen bevæger sig mens man arbejder.
        Tidligere var der både en samlet procentlinje og de syv felter;
        de sagde det samme, og den ene kunne undværes.
      */}
      <ol className="flex gap-1" aria-hidden>
        {LESSON_PHASES.map((p, i) => (
          <li
            key={p}
            className={clsx(
              'h-1.5 flex-1 overflow-hidden rounded-full',
              i < idx ? 'bg-good-500' : 'bg-ink-200 dark:bg-white/[0.08]',
            )}
            title={PHASE_LABELS[p]}
          >
            {i === idx ? (
              <span
                className="neon-xp block h-full rounded-full transition-[width] duration-500 ease-spring"
                style={{ width: `${Math.max(8, within * 100)}%` }}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fejlklinik                                                          */
/* ------------------------------------------------------------------ */

function MisconceptionClinic({ misconception, onDone }: { misconception: Misconception; onDone: () => void }) {
  const messages = useMemo(() => misconceptionClinic(misconception), [misconception]);
  const [shown, setShown] = useState(1);
  const done = shown >= messages.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warn-500 text-ink-950">
          <Icon name="search" size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Stop lige et øjeblik</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Den samme fejl er dukket op flere gange</p>
        </div>
      </div>

      <div className="space-y-3">
        {messages.slice(0, shown).map((m) => (
          <Card key={m.id} className="animate-fade-up">
            <MathText className="leading-relaxed">{m.text}</MathText>
          </Card>
        ))}
      </div>

      {!done ? (
        <button onClick={() => setShown((s) => s + 1)} className="btn-secondary w-full">
          Fortsæt
        </button>
      ) : (
        <button onClick={onDone} className="btn-primary w-full py-3 text-base">
          Giv mig en opgave med hjælp
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mestret                                                             */
/* ------------------------------------------------------------------ */

function MasteredScreen({
  skill,
  correct,
  total,
  onContinue,
  onPractice,
}: {
  skill: Skill;
  correct: number;
  total: number;
  onContinue: () => void;
  onPractice: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
      <div className="mx-auto flex h-20 w-20 animate-pop items-center justify-center rounded-3xl bg-xp-500 text-ink-950 shadow-glow-xp">
        <Icon name="star" size={40} />
      </div>
      <div>
        <h1 className="title-page">{skill.name} er mestret</h1>
        <p className="mt-2 text-ink-600 dark:text-ink-300">{skill.goal}</p>
      </div>

      <Card className="text-left">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Rigtige" value={`${correct}/${total}`} />
          <Stat label="Optjent" value="+60 XP" />
          <Stat label="Næste tjek" value="om 2 dage" />
        </div>
        <p className="mt-4 text-sm text-ink-600 dark:text-ink-300">
          Emnet kommer igen om et par dage som en kort repetition, så du ikke glemmer det.
        </p>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button onClick={onPractice} className="btn-secondary flex-1">
          Træn lidt mere
        </button>
        <button onClick={onContinue} className="btn-primary flex-1 py-3">
          Videre til næste emne
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-bold num">{value}</p>
      <p className="text-2xs uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sessionsstribe                                                      */
/* ------------------------------------------------------------------ */

/** De seneste svar som prikker — så eleven kan se sin egen kurve. */
function SessionStrip({ skillId }: { skillId: string }) {
  const attempts = useStore((s) => s.attempts);
  const recent = attempts.filter((a) => a.skillId === skillId).slice(-12);
  if (!recent.length) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs text-ink-500 dark:text-ink-400">Seneste:</span>
      <div className="flex gap-1">
        {recent.map((a, i) => (
          <span
            key={i}
            className={clsx('h-2.5 w-2.5 rounded-full', a.correct ? 'bg-good-500' : 'bg-bad-400')}
            title={`${a.correct ? 'Rigtig' : 'Forkert'} · niveau ${a.level}${a.hints ? ` · ${a.hints} hint` : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
