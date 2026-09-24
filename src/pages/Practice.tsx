import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Problem, Skill } from '../types';
import { ALL_SKILLS, DOMAINS, buildProblem, getSkill } from '../content';
import { useStore } from '../state/store';
import { dueSkills } from '../engine/srs';
import { abilityToLevel, newSkillState } from '../engine/mastery';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, ChoiceCard, EmptyState, FormulaTile, ListRow, MetaChip, Page, PageHeader, ProgressBar, Section } from '../components/ui';
import { DOMAIN_SIGNATURES } from '../content/signatures';
import { Icon, domainIcon } from '../components/Icon';
import { SessionSummary } from '../components/SessionSummary';

/**
 * Fri træning.
 *
 * Adskilt fra lektionsforløbet med vilje: her flyttes eleven ikke gennem
 * faser, og der er ingen mestring at vinde eller tabe. Man kan bare øve
 * det man har lyst til, på det niveau man selv vælger.
 */
const ROUND = 10;

export function PracticePage() {
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const xpNow = useStore((s) => s.gamification.xp);
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [round, setRound] = useState({ correct: 0, total: 0 });
  const [roundDone, setRoundDone] = useState(false);
  const [openDomain, setOpenDomain] = useState<string | null>(null);
  const roundStart = useRef({ at: Date.now(), xp: xpNow });

  const skill = selected ? getSkill(selected) : null;

  const next = useCallback(
    (s: Skill) => {
      const state = skills[s.id] ?? newSkillState(s.id);
      setProblem(
        buildProblem(s, {
          level: abilityToLevel(state.ability),
          seed: randomSeed(),
          avoidGeneratorId: problem?.generatorId,
        }),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [skills, problem?.generatorId],
  );

  const newRound = (s: Skill) => {
    setRound({ correct: 0, total: 0 });
    setRoundDone(false);
    roundStart.current = { at: Date.now(), xp: useStore.getState().gamification.xp };
    next(s);
  };

  const start = (s: Skill) => {
    setSelected(s.id);
    newRound(s);
  };

  const started = useMemo(
    () => ALL_SKILLS.filter((s) => (skills[s.id]?.attempts ?? 0) > 0),
    [skills],
  );

  if (skill && roundDone) {
    return (
      <SessionSummary
        title="Runden er færdig"
        subtitle={`${ROUND} opgaver i ${skill.name.toLowerCase()}.`}
        correct={round.correct}
        total={round.total}
        xp={xpNow - roundStart.current.xp}
        since={roundStart.current.at}
        skillId={skill.id}
        again={{ label: `${ROUND} til`, onClick: () => newRound(skill) }}
      />
    );
  }

  if (skill && problem) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          title={skill.name}
          back={{
            label: 'Fri træning',
            onClick: () => {
              setSelected(null);
              setProblem(null);
              setRound({ correct: 0, total: 0 });
            },
          }}
        />

        <Card pad="md">
          <div className="flex items-center justify-between text-sm">
            <span className="num font-semibold">
              {round.total} af {ROUND} opgaver
            </span>
            <span className="num text-ink-500 dark:text-ink-400">{round.correct} rigtige</span>
          </div>
          <div className="mt-2">
            <ProgressBar value={(round.total / ROUND) * 100} size="sm" label="Runden" />
          </div>
        </Card>

        <ProblemCard
          problem={problem}
          skill={skill}
          state={skills[skill.id]}
          onSubmit={(info: SubmitInfo) => {
            if (info.correct || info.tries >= 2) {
              setRound((r) => ({ correct: r.correct + (info.correct ? 1 : 0), total: r.total + 1 }));
            }
            recordAttempt({ problem, ...info, phase: 'practice' });
          }}
          onNext={() => (round.total >= ROUND ? setRoundDone(true) : next(skill))}
          nextLabel={round.total >= ROUND ? 'Se runden' : 'Ny opgave'}
        />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Fri træning"
        subtitle="Øv så meget du vil. Her er ingen faser, bare opgaver på dit niveau."
      />

      {started.length ? (
        <Section title="Du er i gang med" hint="dine niveauer følger med">
          <div className="stagger grid gap-2 sm:grid-cols-2">
            {started.map((s) => {
              const st = skills[s.id]!;
              return (
                <ListRow
                  key={s.id}
                  icon={domainIcon(s.domainId)}
                  tone={st.masteredAt ? 'xp' : 'brand'}
                  title={s.name}
                  subtitle={`Niveau ${abilityToLevel(st.ability)} · ${Math.round(st.pKnown * 100)} % sikker`}
                  trailing={st.masteredAt ? <MetaChip tone="good" icon="star">Mestret</MetaChip> : null}
                  onClick={() => start(s)}
                />
              );
            })}
          </div>
        </Section>
      ) : (
        <Callout tone="brand" icon="info">
          Du har ikke trænet noget endnu. Vælg et emne herunder, eller start fra forsiden.
        </Callout>
      )}

      {openDomain ? (
        <Section
          title={DOMAINS.find((d) => d.id === openDomain)?.name ?? ''}
          action={
            <button onClick={() => setOpenDomain(null)} className="btn-ghost btn-sm -mr-2">
              <Icon name="arrow-left" size={14} /> Alle emner
            </button>
          }
        >
          <div className="stagger grid gap-2 sm:grid-cols-2">
            {(DOMAINS.find((d) => d.id === openDomain)?.skills ?? []).map((sk) => {
              const st = skills[sk.id];
              return (
                <ListRow
                  key={sk.id}
                  icon="pencil"
                  tone={st?.masteredAt ? 'xp' : 'neutral'}
                  title={sk.name}
                  subtitle={st ? `Niveau ${abilityToLevel(st.ability)}` : 'Ikke prøvet endnu'}
                  onClick={() => start(sk)}
                />
              );
            })}
          </div>
        </Section>
      ) : (
        <Section title="Vælg et emne">
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
            {DOMAINS.map((d) => {
              const tried = d.skills.filter((sk) => skills[sk.id]).length;
              return (
                <ChoiceCard
                  key={d.id}
                  size="md"
                  preview={<FormulaTile tex={DOMAIN_SIGNATURES[d.id]} />}
                  tone="brand"
                  title={d.name}
                  meta={[{ icon: 'pencil', label: `${d.skills.length} færdigheder` }]}
                  onClick={() => setOpenDomain(d.id)}
                  aria-label={`${d.name}: ${tried} af ${d.skills.length} prøvet`}
                />
              );
            })}
          </div>
        </Section>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Repetition                                                          */
/* ------------------------------------------------------------------ */

/**
 * Repetitionsrunden. Går igennem de færdigheder der er forfaldne, og
 * planlægger hver enkelt på ny ud fra hvor godt det gik.
 */
export function ReviewPage() {
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const reviewSkill = useStore((s) => s.reviewSkill);
  const xpNow = useStore((s) => s.gamification.xp);
  const xpAtStart = useRef(xpNow);
  const startedAt = useRef(Date.now());

  const [queue] = useState<string[]>(() => dueSkills(skills).map((s) => s.skillId));
  const [index, setIndex] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [results, setResults] = useState<{ skillId: string; correct: boolean }[]>([]);

  const currentId = queue[index];
  const skill = currentId ? getSkill(currentId) : null;

  useEffect(() => {
    if (!skill) return;
    const state = skills[skill.id];
    setProblem(buildProblem(skill, { level: abilityToLevel(state?.ability ?? 2), seed: randomSeed() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  if (!queue.length) {
    return (
      <EmptyState
        icon="check"
        title="Ingenting at repetere lige nu"
        body="Du kan stadig alt det du har lært. Når et emne skal repeteres, står det på forsiden."
        action={
          <button onClick={() => navigate({ name: 'dashboard' })} className="btn-primary">
            Til forsiden
          </button>
        }
      />
    );
  }

  if (index >= queue.length) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <SessionSummary
        title="Repetitionen er færdig"
        subtitle="Emner der drillede, kommer hurtigere igen. Resten venter lidt længere."
        correct={correct}
        total={results.length}
        xp={xpNow - xpAtStart.current}
        since={startedAt.current}
      >
        <Card pad="md">
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{getSkill(r.skillId)?.name}</span>
                <MetaChip tone={r.correct ? 'good' : 'warn'}>{r.correct ? 'sidder fast' : 'tages op igen'}</MetaChip>
              </li>
            ))}
          </ul>
        </Card>
      </SessionSummary>
    );
  }

  if (!skill || !problem) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-bold text-accent-700 dark:text-accent-300">
            Repetition {index + 1} af {queue.length}
          </span>
          <span className="text-ink-500 dark:text-ink-400">{skill.name}</span>
        </div>
        <ProgressBar value={(index / queue.length) * 100} tone="accent" label="Fremgang i repetitionen" />
      </header>

      <ProblemCard
        key={problem.id}
        problem={problem}
        skill={skill}
        state={skills[skill.id]}
        onSubmit={(info) => {
          recordAttempt({ problem, ...info, phase: 'review' });
          reviewSkill(skill.id, info.correct, info.hints, info.tries, info.seconds, problem.seconds);
          setResults((r) => [...r, { skillId: skill.id, correct: info.correct }]);
        }}
        onNext={() => setIndex((i) => i + 1)}
        nextLabel={index + 1 >= queue.length ? 'Afslut repetition' : 'Næste emne'}
      />

      <p className="text-center text-xs text-ink-500 dark:text-ink-400">
        Klarer du den uden hjælp, går der længere tid til næste gang du ser emnet.
      </p>
    </div>
  );
}
