import { useMemo, type ReactNode } from 'react';
import { useStore } from '../state/store';
import { buildPlan } from '../engine/planner';
import { getSkill } from '../content';
import { skillSignature } from '../content/signatures';
import { navigate } from '../lib/router';
import { openPlanItem } from '../lib/plan';
import { ChoiceCard, FormulaTile, MetaChip, SectionTitle, StatTile } from './ui';
import { Icon } from './Icon';

function duration(ms: number): { value: number; unit: string } {
  if (ms < 60000) return { value: Math.max(1, Math.round(ms / 1000)), unit: 'sek' };
  return { value: Math.round(ms / 60000), unit: 'min' };
}

/** Skærmen efter en lektion, en runde fri træning eller en repetition. */
export function SessionSummary({
  title,
  subtitle,
  correct,
  total,
  xp,
  since,
  mastered,
  skillId,
  again,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  correct: number;
  total: number;
  xp: number;
  since: number;
  mastered?: boolean;
  skillId?: string;
  again?: { label: string; onClick: () => void };
  children?: ReactNode;
}) {
  const skills = useStore((s) => s.skills);
  const misconceptions = useStore((s) => s.misconceptions);
  const profile = useStore((s) => s.profile);
  const g = useStore((s) => s.gamification);

  const next = useMemo(
    () => buildPlan({ states: skills, misconceptions, profile }, 6).find((p) => p.skillId !== skillId),
    [skills, misconceptions, profile, skillId],
  );
  const nextSkill = next && next.kind !== 'diagnose' ? getSkill(next.skillId) : undefined;
  const goalMet = g.todayXp >= g.dailyGoalXp;
  const time = duration(Date.now() - since);

  return (
    <div className="mx-auto max-w-2xl space-y-6" data-summary>
      <header className="paper-head flex items-start gap-4">
        <span
          className={
            mastered
              ? 'flex h-12 w-12 shrink-0 animate-pop items-center justify-center rounded-2xl bg-xp-500 text-ink-950'
              : 'flex h-12 w-12 shrink-0 animate-pop items-center justify-center rounded-2xl bg-brand-600 text-white shadow-inset'
          }
        >
          <Icon name={mastered ? 'star' : 'check'} size={24} />
        </span>
        <div className="min-w-0">
          <h1 className="title-page">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
        </div>
      </header>

      <div className="stagger grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatTile label="Rigtige" icon="check" value={`${correct}/${total}`} />
        <StatTile label="XP" icon="bolt" tone="xp" value={`+${xp}`} />
        <StatTile label="Tid" icon="clock" value={time.value} suffix={time.unit} />
      </div>

      <div className="flex flex-wrap gap-2">
        <MetaChip icon="flame" tone={g.streakDays > 0 ? 'warn' : 'neutral'}>
          {g.streakDays} {g.streakDays === 1 ? 'dag' : 'dage'} i træk
        </MetaChip>
        <MetaChip icon="target" tone={goalMet ? 'good' : 'neutral'}>
          {goalMet ? 'Dagens mål er nået' : `${g.todayXp}/${g.dailyGoalXp} XP i dag`}
        </MetaChip>
      </div>

      {children}

      {next ? (
        <section>
          <SectionTitle>Næste skridt</SectionTitle>
          <ChoiceCard
            icon="map"
            preview={nextSkill ? <FormulaTile tex={skillSignature(nextSkill)} size="lg" /> : undefined}
            title={next.title}
            description={next.reason}
            meta={[{ icon: 'clock', label: `${next.estimatedMinutes} min` }]}
            action={{ label: 'Start', onClick: () => openPlanItem(next) }}
          />
        </section>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {again ? (
          <button onClick={again.onClick} className="btn-secondary flex-1">
            {again.label}
          </button>
        ) : null}
        <button onClick={() => navigate({ name: 'dashboard' })} className="btn-ghost flex-1">
          Til forsiden
        </button>
      </div>
    </div>
  );
}
