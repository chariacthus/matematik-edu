import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Problem, Skill } from '../types';
import { ALL_SKILLS, DOMAINS, buildProblem, getSkill } from '../content';
import { useStore } from '../state/store';
import { dueSkills } from '../engine/srs';
import { abilityToLevel, newSkillState } from '../engine/mastery';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Callout, Card, Chip, EmptyState, ProgressBar, SectionTitle } from '../components/ui';
import { Icon } from '../components/Icon';

/**
 * Fri træning.
 *
 * Adskilt fra lektionsforløbet med vilje: her flyttes eleven ikke gennem
 * faser, og der er ingen mestring at vinde eller tabe. Man kan bare øve
 * det man har lyst til, på det niveau man selv vælger.
 */
export function PracticePage() {
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [round, setRound] = useState({ correct: 0, total: 0 });

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

  const started = useMemo(
    () => ALL_SKILLS.filter((s) => (skills[s.id]?.attempts ?? 0) > 0),
    [skills],
  );

  if (skill && problem) {
    const accuracy = round.total ? Math.round((round.correct / round.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button
          onClick={() => {
            setSelected(null);
            setProblem(null);
            setRound({ correct: 0, total: 0 });
          }}
          className="btn-ghost -ml-2 px-2 py-1 text-xs"
        >
          ← Vælg et andet emne
        </button>

        <Card>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{skill.name}</span>
            <span className="tabular-nums text-ink-500 dark:text-ink-400">
              {round.correct}/{round.total} rigtige{round.total ? ` · ${accuracy} %` : ''}
            </span>
          </div>
          {round.total > 0 ? (
            <div className="mt-2">
              <ProgressBar value={accuracy} size="sm" tone={accuracy >= 70 ? 'good' : 'warn'} />
            </div>
          ) : null}
        </Card>

        <ProblemCard
          problem={problem}
          skill={skill}
          state={skills[skill.id]}
          onSubmit={(info: SubmitInfo) => {
            setRound((r) => ({ correct: r.correct + (info.correct ? 1 : 0), total: r.total + 1 }));
            recordAttempt({ problem, ...info, phase: 'practice' });
          }}
          onNext={() => next(skill)}
          nextLabel="Ny opgave"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Fri træning</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Øv lige så meget du vil. Her er der ingen faser og ingen mestring at miste — bare opgaver på dit niveau.
        </p>
      </header>

      {started.length ? (
        <section>
          <SectionTitle hint="dine niveauer følger med">Du er i gang med</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {started.map((s) => {
              const st = skills[s.id]!;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelected(s.id);
                    setRound({ correct: 0, total: 0 });
                    next(s);
                  }}
                  className="card flex items-center gap-3 p-3 text-left transition-shadow hover:shadow-lift"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{s.name}</span>
                    <span className="block text-xs text-ink-500 dark:text-ink-400">
                      niveau {abilityToLevel(st.ability)} · {Math.round(st.pKnown * 100)} % sikker
                    </span>
                  </span>
                  {st.masteredAt ? <Chip tone="good">★</Chip> : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <Callout tone="brand" icon="info">
          Du har ikke trænet nogen færdigheder endnu. Vælg et emne herunder, eller start et forløb fra forsiden — så
          lærer appen dit niveau at kende.
        </Callout>
      )}

      <section>
        <SectionTitle>Alle emner</SectionTitle>
        <div className="space-y-4">
          {DOMAINS.map((d) => (
            <div key={d.id}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">{d.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelected(s.id);
                      setRound({ correct: 0, total: 0 });
                      next(s);
                    }}
                    className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-ink-700 dark:text-ink-300"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
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
        body="Alle dine mestrede emner sidder stadig fast. Kom tilbage når et af dem er klar igen — appen giver besked på forsiden."
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
      <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
        <div className="mx-auto flex h-16 w-16 animate-pop items-center justify-center rounded-3xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-glow">
          <Icon name="refresh" size={30} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Repetition gennemført</h1>
        <p className="text-ink-600 dark:text-ink-300">
          {correct} af {results.length} rigtige. De emner der drillede, kommer hurtigere tilbage — resten venter længere.
        </p>
        <Card className="text-left">
          <ul className="space-y-2">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{getSkill(r.skillId)?.name}</span>
                <Chip tone={r.correct ? 'good' : 'warn'}>{r.correct ? 'sidder fast' : 'tages op igen'}</Chip>
              </li>
            ))}
          </ul>
        </Card>
        <button onClick={() => navigate({ name: 'dashboard' })} className="btn-primary w-full py-3">
          Tilbage til forsiden
        </button>
      </div>
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
