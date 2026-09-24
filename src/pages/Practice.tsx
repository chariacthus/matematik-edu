import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { CategoryId, DomainId, Problem, Skill } from '../types';
import { ALL_SKILLS, CATEGORIES, DOMAINS, buildProblem, domainName, getDomain, getSkill } from '../content';
import { useStore } from '../state/store';
import { dueSkills } from '../engine/srs';
import { abilityToLevel, newSkillState } from '../engine/mastery';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Card, EmptyState, ListRow, MetaChip, Page, PageHeader, ProgressBar, Section } from '../components/ui';
import { domainIcon } from '../components/Icon';
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
  const [openDomain, setOpenDomain] = useState<DomainId | null>(null);
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

  const recent = useMemo(
    () =>
      ALL_SKILLS.filter((s) => (skills[s.id]?.attempts ?? 0) > 0).sort(
        (a, b) => (skills[b.id]?.lastSeen ?? 0) - (skills[a.id]?.lastSeen ?? 0),
      ),
    [skills],
  );
  const [showAll, setShowAll] = useState(false);
  const [category, setCategory] = useState<CategoryId>(
    () => (recent[0] ? getDomain(recent[0].domainId)?.category : undefined) ?? 'tal-algebra',
  );
  const domain = openDomain ? getDomain(openDomain) : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [openDomain, selected]);

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
            label: domain ? domain.name : 'Træn',
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

  // Et emne er åbent: kun dets færdigheder, på deres egen side.
  if (domain) {
    return (
      <Page>
        <PageHeader title={domain.name} subtitle={domain.blurb} back={{ label: 'Træn', onClick: () => setOpenDomain(null) }} />
        <div className="stagger grid gap-2 sm:grid-cols-2">
          {domain.skills.map((sk) => {
            const st = skills[sk.id];
            const tried = (st?.attempts ?? 0) > 0;
            return (
              <ListRow
                key={sk.id}
                icon="pencil"
                tone={st?.masteredAt ? 'xp' : tried ? 'brand' : 'neutral'}
                title={sk.name}
                subtitle={
                  st && tried
                    ? `Niveau ${abilityToLevel(st.ability)} · ${Math.round(st.pKnown * 100)} % sikker`
                    : 'Ikke prøvet endnu'
                }
                trailing={st?.masteredAt ? <MetaChip tone="good" icon="star">Mestret</MetaChip> : null}
                onClick={() => start(sk)}
              />
            );
          })}
        </div>
      </Page>
    );
  }

  const topics = DOMAINS.filter((d) => d.category === category);

  return (
    <Page>
      <PageHeader title="Træn" subtitle="Vælg et emne. Du får 10 opgaver ad gangen på dit niveau." />

      {recent.length ? (
        <Section
          title="Fortsæt"
          action={
            recent.length > 3 ? (
              <button onClick={() => setShowAll((v) => !v)} className="btn-ghost btn-sm -mr-2">
                {showAll ? 'Vis færre' : `Vis alle ${recent.length}`}
              </button>
            ) : undefined
          }
        >
          <div className="stagger grid gap-2 sm:grid-cols-2">
            {(showAll ? recent : recent.slice(0, 3)).map((s) => {
              const st = skills[s.id]!;
              return (
                <ListRow
                  key={s.id}
                  icon={domainIcon(s.domainId)}
                  tone={st.masteredAt ? 'xp' : 'brand'}
                  title={s.name}
                  subtitle={`${domainName(s.domainId)} · niveau ${abilityToLevel(st.ability)}`}
                  trailing={st.masteredAt ? <MetaChip tone="good" icon="star">Mestret</MetaChip> : null}
                  onClick={() => start(s)}
                />
              );
            })}
          </div>
        </Section>
      ) : null}

      <Section title="Vælg et emne">
        <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="Kompetenceområder">
          {CATEGORIES.map((c) => {
            const on = c.id === category;
            const count = DOMAINS.filter((d) => d.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(c.id)}
                className={clsx(
                  'rounded-2xl border px-3.5 py-3 text-left transition-colors duration-150',
                  on
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-400/60 dark:bg-brand-500/[0.12]'
                    : 'border-ink-200 bg-white hover:border-ink-300 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/20',
                )}
              >
                <span className="block text-sm font-semibold leading-snug">{c.name}</span>
                <span className="num mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{count} emner</span>
              </button>
            );
          })}
        </div>

        <Card key={category} pad="none" className="animate-swap-in divide-y divide-ink-100 p-1.5 dark:divide-white/[0.05]">
          {topics.map((d) => {
            const busy = d.skills.filter((sk) => (skills[sk.id]?.attempts ?? 0) > 0).length;
            return (
              <ListRow
                key={d.id}
                variant="plain"
                icon={domainIcon(d.id)}
                tone="brand"
                title={d.name}
                subtitle={`${d.skills.length} færdigheder${busy ? ` · ${busy} i gang` : ''}`}
                onClick={() => setOpenDomain(d.id)}
              />
            );
          })}
        </Card>
      </Section>
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
