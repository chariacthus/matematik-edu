import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Difficulty, LessonPhase, Misconception, Problem, Skill } from '../types';
import { LESSON_PHASES } from '../types';
import { buildProblem, domainName, getSkill } from '../content';
import {
  PHASE_HELP,
  PHASE_LABELS,
  PHASE_TARGETS,
  isPracticePhase,
  nextProblem,
  type ProblemOverride,
} from '../engine/adaptive';
import { abilityToLevel, newSkillState } from '../engine/mastery';
import { isDue, retention } from '../engine/srs';
import { solidEnough } from '../engine/planner';
import { INTERRUPT_THRESHOLD } from '../engine/diagnosis';
import { misconceptionClinic } from '../tutor/tutor';
import { getMisconception } from '../content/misconceptions';
import { useStore } from '../state/store';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { MathBlock, MathText } from './../components/MathText';
import { Visual } from '../components/visuals/Visual';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, CardTitle, MetaChip, ComboMeter, EmptyState, FocusBar, Modal, Page, PageHeader, Skeleton } from '../components/ui';
import { useFocusMode } from '../components/Layout';
import { Icon } from '../components/Icon';
import { SessionSummary } from '../components/SessionSummary';
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
  const reviewSkill = useStore((s) => s.reviewSkill);
  const addMinutes = useStore((s) => s.addMinutes);
  const profile = useStore((s) => s.profile);
  const allStates = useStore((s) => s.skills);
  const xpNow = useStore((s) => s.gamification.xp);

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
  const [stopped, setStopped] = useState(false);
  const [answered, setAnswered] = useState(false);
  /** Efter en tabt opgave kommer en magen til, så løsningen kan bruges med det samme. */
  const [retry, setRetry] = useState<{ generatorId: string; level: Difficulty } | null>(null);
  /** En opgave i noget den her bygger på, hvis det er ved at blive glemt. */
  const [warmup, setWarmup] = useState<{ skill: Skill; problem: Problem } | null>(null);
  const warmedUp = useRef(false);
  const [rereading, setRereading] = useState(false);
  const enteredAt = useRef(Date.now());
  const xpAtStart = useRef(xpNow);

  useEffect(() => {
    ensureSkill(skillId);
    enteredAt.current = Date.now();
    xpAtStart.current = useStore.getState().gamification.xp;
    return () => {
      const minutes = (Date.now() - enteredAt.current) / 60000;
      if (minutes >= 0.5) addMinutes(minutes);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const makeProblem = useCallback(
    (phase: LessonPhase, override: ProblemOverride = {}) => {
      if (!skill) return;
      // Tilstanden læses frisk, så en fase der lige er skiftet kommer med.
      const store = useStore.getState();
      const fresh = store.skills[skillId] ?? newSkillState(skillId);
      // Springer eleven forklaringen over, skal testen ikke kunne klares på
      // de letteste opgaver.
      const floor: ProblemOverride = fresh.testingOut ? { minLevel: 3 } : {};
      const { problem: p, decision } = nextProblem(skill, fresh, store.attempts, phase, randomSeed(), { ...floor, ...override });
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
    [skill, skillId],
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

  // Opvarmning: er noget af det den her færdighed bygger på, ved at
  // blive glemt, tages én opgave i det først. Det genopfrisker netop det
  // der skal bruges, og tæller som repetition.
  useEffect(() => {
    if (!skill || warmedUp.current || !isPracticePhase(state.phase) || state.testingOut) return;
    warmedUp.current = true;
    const states = useStore.getState().skills;
    const fading = skill.prerequisites
      .map((id) => states[id])
      .find((st) => st && st.masteredAt !== null && (isDue(st) || retention(st) < 0.8));
    const pre = fading ? getSkill(fading.skillId) : undefined;
    if (!fading || !pre) return;
    setWarmup({ skill: pre, problem: buildProblem(pre, { level: abilityToLevel(fading.ability), seed: randomSeed() }) });
  }, [skill, state.phase, state.testingOut]);

  const phaseIdx = LESSON_PHASES.indexOf(state.phase);

  const handleSubmit = (info: SubmitInfo) => {
    if (!problem) return;
    setAnswered(true);
    if (info.correct || info.tries >= 2) setSessionTotal((n) => n + 1);
    if (info.correct) {
      setSessionCorrect((n) => n + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }

    const before = state.phase;
    const result = recordAttempt({ problem, ...info, phase: state.phase });
    setXpGained((x) => x + result.xp);

    if (result.mastered) setJustMastered(true);
    if (result.testOutFailed) {
      setLevelNote('Den sad ikke i første hug. Du får et par opgaver med hjælp først, så sidder det bedre bagefter.');
    } else if (result.regressed) {
      setLevelNote('Du går et trin tilbage og får lidt mere øvelse.');
    } else if (!result.mastered && result.phase !== before) {
      const next = LESSON_PHASES.indexOf(result.phase) + 1;
      setLevelNote(`Videre til trin ${next} af 7: ${PHASE_LABELS[result.phase].toLowerCase()}. ${PHASE_HELP[result.phase]}`);
    }

    // En tabt opgave følges af en magen til: samme type, ikke sværere.
    if (!info.correct && info.tries >= 2) setRetry({ generatorId: problem.generatorId, level: problem.level });
    else if (info.correct) setRetry(null);

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

  // Mens der løses opgaver, er der kun opgaven og en smal bjælke.
  // Forklaring og eksempel læses med menuerne fremme.
  const working = Boolean(skill) && isPracticePhase(state.phase) && !clinic && !justMastered && !stopped;
  useFocusMode(working);

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

  const missing = skill.prerequisites
    .filter((id) => !solidEnough(allStates[id]))
    .map((id) => getSkill(id))
    .filter((p): p is Skill => p !== undefined);
  // Stærk nok til at springe forklaringen over? Niveautesten, elevens eget
  // valg i onboarding, eller det eleven allerede har vist.
  const strong =
    (profile.diagnostic[skill.domainId] ?? 0) >= 65 || profile.easyTopics.includes(skill.domainId) || state.pKnown >= 0.6;
  const testOut = () => {
    setPhase(skillId, 'mastery', true);
    makeProblem('mastery');
    setLevelNote('Tre opgaver i første hug, så er den mestret. Går én galt, får du nogle med hjælp i stedet.');
  };

  /* ---------------- Opvarmning ---------------- */
  if (warmup && working) {
    const pre = warmup.skill;
    return (
      <Page>
        <FocusBar
          title={skill.name}
          meta="Opvarmning"
          progress={0}
          progressLabel="Opvarmning"
          onExit={() => setWarmup(null)}
          exitLabel="Spring opvarmningen over"
        />
        <p className="text-sm text-ink-500 dark:text-ink-400">
          <span className="font-semibold text-ink-800 dark:text-ink-100">Opvarmning.</span> {skill.name} bygger på{' '}
          {pre.name.toLowerCase()}. Én hurtig opgave i den først, så den er frisk.
        </p>
        <ProblemCard
          key={warmup.problem.id}
          problem={warmup.problem}
          skill={pre}
          state={allStates[pre.id]}
          onSubmit={(info) => {
            recordAttempt({ problem: warmup.problem, ...info, phase: 'review' });
            if (!info.correct && info.tries < 2) return;
            reviewSkill(pre.id, info.correct, info.hints, info.tries, info.seconds, warmup.problem.seconds);
          }}
          onNext={() => setWarmup(null)}
          nextLabel={`Videre til ${skill.name.toLowerCase()}`}
        />
      </Page>
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

  /* ---------------- Gennemført eller stoppet ---------------- */
  if (justMastered || stopped) {
    return (
      <SessionSummary
        title={justMastered ? `${skill.name} er mestret` : 'Stop for nu'}
        subtitle={
          justMastered
            ? 'Emnet kommer igen om et par dage som en kort repetition, så du ikke glemmer det.'
            : `Du er på trin ${phaseIdx + 1} af 7. Næste gang fortsætter du herfra.`
        }
        mastered={justMastered}
        correct={sessionCorrect}
        total={sessionTotal}
        xp={xpNow - xpAtStart.current}
        since={enteredAt.current}
        skillId={justMastered ? skillId : undefined}
        again={
          justMastered
            ? {
                label: 'Træn lidt mere',
                onClick: () => {
                  setJustMastered(false);
                  setPhase(skillId, 'mastery');
                  makeProblem('mastery');
                },
              }
            : { label: 'Fortsæt alligevel', onClick: () => setStopped(false) }
        }
      />
    );
  }

  return (
    <Page>
      {working ? (
        <FocusBar
          title={skill.name}
          meta={`Trin ${phaseIdx + 1} af 7`}
          progress={((phaseIdx + state.phaseProgress / PHASE_TARGETS[state.phase]) / LESSON_PHASES.length) * 100}
          progressLabel="Fremgang i forløbet"
          track={<PhaseSegments phase={state.phase} progress={state.phaseProgress} />}
          onExit={() => (answered ? setStopped(true) : navigate({ name: 'domain', domainId: skill.domainId }))}
          exitLabel="Stop for nu"
          right={
            <>
              <ComboMeter streak={combo} />
              {xpGained > 0 ? (
                <span className="num flex items-center gap-1 text-xs font-bold text-xp-600 dark:text-xp-400">
                  <Icon name="bolt" size={12} />+{xpGained}
                </span>
              ) : null}
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          <PageHeader
            title={skill.name}
            subtitle={skill.goal}
            back={{ label: domainName(skill.domainId), onClick: () => navigate({ name: 'domain', domainId: skill.domainId }) }}
          />
          {/* Trinstriben hører til overskriften, ikke til indholdet - derfor
              tættere på den end sidens almindelige afstand. */}
          <PhaseTrack phase={state.phase} progress={state.phaseProgress} />
        </div>
      )}

      {levelNote ? (
        <Callout tone="brand" icon="chart">
          {levelNote}
        </Callout>
      ) : null}

      {state.phase === 'explain' ? (
        <ExplainStep
          skill={skill}
          missing={missing}
          strong={strong}
          onTestOut={testOut}
          onDone={() => setPhase(skillId, 'example')}
        />
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
        // key på opgaven: hver ny opgave glider ind, så man kan se at der
        // ER en ny. Ikke på fasen - så kom den samme opgave igen, tom, når
        // et rigtigt svar gjorde fasen færdig.
        <div key={problem.id} className="animate-swap-in space-y-4">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            <span className="font-semibold text-ink-800 dark:text-ink-100">{PHASE_LABELS[state.phase]}.</span>{' '}
            {PHASE_HELP[state.phase]}
          </p>
          <ProblemCard
            problem={problem}
            skill={skill}
            state={state}
            onSubmit={handleSubmit}
            onNext={() => {
              makeProblem(state.phase, retry ? { generatorId: retry.generatorId, maxLevel: retry.level } : {});
              setRetry(null);
            }}
            nextLabel={retry ? 'Prøv en magen til' : 'Næste opgave'}
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
          {/* Forklaringen åbner ovenpå. Før sendte knappen eleven tilbage til
              trin 1, og det man havde nået i faserne var væk. */}
          <button onClick={() => setRereading(true)} className="btn-ghost text-xs">
            Læs forklaringen igen
          </button>
        </div>
      ) : null}

      <Modal open={rereading} onClose={() => setRereading(false)} title={skill.name} wide>
        <ExplainBlocks skill={skill} />
      </Modal>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Trin 1: forklaringen                                                */
/* ------------------------------------------------------------------ */

function ExplainStep({
  skill,
  missing,
  strong,
  onTestOut,
  onDone,
}: {
  skill: Skill;
  /** Forudsætninger eleven ikke har på plads endnu. */
  missing: Skill[];
  strong: boolean;
  onTestOut: () => void;
  onDone: () => void;
}) {
  const first = missing[0];
  return (
    <div className="space-y-4">
      {first ? (
        <Callout tone="warn" icon="layers" title="Den her bygger på noget du ikke er færdig med">
          <p>
            {skill.name} bruger {missing.map((m) => m.name.toLowerCase()).join(' og ')}. Det går hurtigere at tage{' '}
            {missing.length > 1 ? 'dem' : 'den'} først.
          </p>
          <button onClick={() => navigate({ name: 'lesson', skillId: first.id })} className="btn-secondary btn-sm mt-3">
            Tag {first.name.toLowerCase()} først
          </button>
        </Callout>
      ) : strong ? (
        <Callout tone="good" icon="bolt" title="Du kan måske det meste allerede">
          <p>Tag tre opgaver med det samme. Klarer du dem i første hug, er den mestret, og du sparer forklaringen.</p>
          <button onClick={onTestOut} className="btn-primary btn-sm mt-3">
            Tag testen
          </button>
        </Callout>
      ) : null}

      <ExplainBlocks skill={skill} />

      <button onClick={onDone} className="btn-primary w-full py-3 text-base">
        Vis mig et eksempel
      </button>
      {!strong && !first ? (
        <div className="flex justify-center">
          <button onClick={onTestOut} className="btn-ghost text-xs">
            Jeg kan det allerede. Giv mig testen
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ExplainBlocks({ skill }: { skill: Skill }) {
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
                {block.caption ? <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">{block.caption}</p> : null}
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
                {block.caption ? <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-400">{block.caption}</p> : null}
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
          <>
            <p className="mt-4 text-center text-xs text-ink-500 dark:text-ink-400">Gæt selv næste skridt, før du trykker.</p>
            <button onClick={() => setRevealed((r) => r + 1)} className="btn-secondary mt-2 w-full">
              Vis næste trin
            </button>
          </>
        ) : example.takeaway ? (
          <Callout tone="good" title="Det du skal tage med dig" icon="target">
            <MathText>{example.takeaway}</MathText>
          </Callout>
        ) : null}
      </Card>

      {skill.worked.length > 1 && allShown ? (
        <Card>
          <p className="text-sm font-bold text-ink-500 dark:text-ink-400">{skill.worked[1]!.title}</p>
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
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-brand-700 dark:text-brand-300" aria-hidden>
        Trin {idx + 1} af 7 · {PHASE_LABELS[phase]}
      </p>
      <PhaseSegments phase={phase} progress={progress} />
    </div>
  );
}

/**
 * Syv felter, ét pr. trin. Det trin man står på fyldes op mens man
 * løser opgaver, så stregen bevæger sig mens man arbejder.
 */
function PhaseSegments({ phase, progress }: { phase: LessonPhase; progress: number }) {
  const idx = LESSON_PHASES.indexOf(phase);
  const target = PHASE_TARGETS[phase];
  const within = target > 0 ? progress / target : 0;
  return (
    <ol
      className="flex gap-1"
      role="img"
      aria-label={`Trin ${idx + 1} af 7: ${PHASE_LABELS[phase]}, ${progress} af ${target} opgaver`}
    >
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
