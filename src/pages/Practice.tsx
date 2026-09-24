import { useEffect, useRef, useState } from 'react';
import type { Problem, Skill } from '../types';
import { buildProblem, domainName, getSkill } from '../content';
import { useStore } from '../state/store';
import { dueSkills } from '../engine/srs';
import { abilityToLevel, newSkillState } from '../engine/mastery';
import { navigate } from '../lib/router';
import { randomSeed } from '../lib/math';
import { ProblemCard, type SubmitInfo } from '../components/ProblemCard';
import { Card, EmptyState, FocusBar, MetaChip } from '../components/ui';
import { useFocusMode } from '../components/Layout';
import { SessionSummary } from '../components/SessionSummary';

/**
 * Fri træning: ti opgaver i én færdighed.
 *
 * Adskilt fra lektionsforløbet med vilje: her flyttes eleven ikke gennem
 * faser, og der er ingen mestring at vinde eller tabe. Runden startes fra
 * emnets side under Emner.
 */
const ROUND = 10;

function practiceProblem(skill: Skill, avoid?: string): Problem {
  const state = useStore.getState().skills[skill.id] ?? newSkillState(skill.id);
  return buildProblem(skill, { level: abilityToLevel(state.ability), seed: randomSeed(), avoidGeneratorId: avoid });
}

export function PracticePage({ skillId }: { skillId: string }) {
  const skill = getSkill(skillId);
  const skills = useStore((s) => s.skills);
  const recordAttempt = useStore((s) => s.recordAttempt);
  const xpNow = useStore((s) => s.gamification.xp);
  const [problem, setProblem] = useState<Problem | null>(() => (skill ? practiceProblem(skill) : null));
  const [round, setRound] = useState({ correct: 0, total: 0 });
  const [roundDone, setRoundDone] = useState(false);
  const roundStart = useRef({ at: Date.now(), xp: xpNow });

  useFocusMode(Boolean(skill && problem && !roundDone));

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [roundDone]);

  if (!skill || !problem) {
    return (
      <EmptyState
        icon="compass"
        title="Færdigheden findes ikke"
        body="Linket peger på en færdighed der ikke er i biblioteket."
        action={
          <button onClick={() => navigate({ name: 'library' })} className="btn-primary">
            Til Emner
          </button>
        }
      />
    );
  }

  const toTopic = () => navigate({ name: 'domain', domainId: skill.domainId });

  if (roundDone) {
    const finished = round.total >= ROUND;
    return (
      <SessionSummary
        title={finished ? 'Runden er færdig' : 'Stop for nu'}
        subtitle={`${round.total} af ${ROUND} opgaver i ${skill.name.toLowerCase()}.`}
        correct={round.correct}
        total={round.total}
        xp={xpNow - roundStart.current.xp}
        since={roundStart.current.at}
        skillId={skill.id}
        again={{
          label: finished ? `${ROUND} til` : 'Fortsæt runden',
          onClick: () => {
            if (finished) {
              setRound({ correct: 0, total: 0 });
              roundStart.current = { at: Date.now(), xp: useStore.getState().gamification.xp };
              setProblem(practiceProblem(skill, problem.generatorId));
            }
            setRoundDone(false);
          },
        }}
        exit={{ label: `Tilbage til ${domainName(skill.domainId).toLowerCase()}`, onClick: toTopic }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FocusBar
        title={skill.name}
        meta={`${round.total} af ${ROUND}`}
        progress={(round.total / ROUND) * 100}
        progressLabel="Runden"
        onExit={() => (round.total > 0 ? setRoundDone(true) : toTopic())}
        exitLabel="Stop runden"
        right={<MetaChip tone="good" icon="check">{round.correct}</MetaChip>}
      />

      <ProblemCard
        key={problem.id}
        problem={problem}
        skill={skill}
        state={skills[skill.id]}
        onSubmit={(info: SubmitInfo) => {
          if (info.correct || info.tries >= 2) {
            setRound((r) => ({ correct: r.correct + (info.correct ? 1 : 0), total: r.total + 1 }));
          }
          recordAttempt({ problem, ...info, phase: 'practice' });
        }}
        onNext={() => (round.total >= ROUND ? setRoundDone(true) : setProblem(practiceProblem(skill, problem.generatorId)))}
        nextLabel={round.total >= ROUND ? 'Se runden' : 'Ny opgave'}
      />
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
  const xpNow = useStore((s) => s.gamification.xp);
  const xpAtStart = useRef(xpNow);
  const startedAt = useRef(Date.now());

  const [queue] = useState<string[]>(() => dueSkills(skills).map((s) => s.skillId));
  const [index, setIndex] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [results, setResults] = useState<{ skillId: string; correct: boolean }[]>([]);

  const currentId = queue[index];
  const skill = currentId ? getSkill(currentId) : null;
  useFocusMode(index < queue.length);

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
      <FocusBar
        title={skill.name}
        meta={`Repetition ${index + 1} af ${queue.length}`}
        progress={(index / queue.length) * 100}
        progressLabel="Fremgang i repetitionen"
        tone="accent"
        onExit={() => (results.length ? setIndex(queue.length) : navigate({ name: 'dashboard' }))}
        exitLabel="Stop repetitionen"
      />

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
