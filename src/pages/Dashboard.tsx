import { useMemo } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { buildPlan, domainProgress, overallProgress, type PlanItem } from '../engine/planner';
import { activeMisconceptions, readBehaviour } from '../engine/diagnosis';
import { dueSkills } from '../engine/srs';
import { levelProgress, levelTitle } from '../engine/gamification';
import { getSkill } from '../content';
import { navigate } from '../lib/router';
import { relativeDays } from '../lib/dates';
import { Callout, Card, Chip, ProgressBar, ProgressRing, SectionTitle } from '../components/ui';

/**
 * Forsiden: hvad skal jeg lave lige nu?
 *
 * Planen er sorteret af planlæggeren, så det øverste kort altid er det
 * mest værdifulde næste skridt — ikke bare det næste i rækken.
 */
export function DashboardPage() {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const misconceptions = useStore((s) => s.misconceptions);
  const attempts = useStore((s) => s.attempts);
  const gamification = useStore((s) => s.gamification);

  const plan = useMemo(() => buildPlan({ states: skills, misconceptions, profile }), [skills, misconceptions, profile]);
  const overall = useMemo(() => overallProgress(skills), [skills]);
  const domains = useMemo(() => domainProgress(skills, profile), [skills, profile]);
  const due = useMemo(() => dueSkills(skills), [skills]);
  const errors = useMemo(() => activeMisconceptions(misconceptions).filter((m) => m.state.count >= 2), [misconceptions]);
  const behaviour = useMemo(() => readBehaviour(attempts, 10), [attempts]);
  const level = levelProgress(gamification.xp);

  const first = plan[0];
  const rest = plan.slice(1, 4);
  const goalPct = Math.min(100, (gamification.todayXp / gamification.dailyGoalXp) * 100);
  const hour = new Date().getHours();
  const hello = hour < 10 ? 'Godmorgen' : hour < 17 ? 'Hej' : 'Godaften';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {hello}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {overall.mastered > 0
              ? `${overall.mastered} af ${overall.total} færdigheder mestret · niveau ${level.level}, ${levelTitle(level.level)}`
              : 'Lad os komme i gang med den første færdighed.'}
          </p>
        </div>
        <ProgressRing value={overall.percent} size={58} />
      </header>

      {/* Dagens mål */}
      <Card className="!p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold">Dagens mål</span>
          <span className="tabular-nums text-ink-500 dark:text-ink-400">
            {gamification.todayXp} / {gamification.dailyGoalXp} XP
          </span>
        </div>
        <ProgressBar value={goalPct} tone={goalPct >= 100 ? 'good' : 'accent'} label="Dagens mål" />
        {goalPct >= 100 ? (
          <p className="mt-2 text-xs font-semibold text-good-600 dark:text-good-300">Målet er nået i dag. Alt herfra er bonus.</p>
        ) : null}
      </Card>

      {/* Adfærd værd at nævne */}
      {behaviour.rushing ? (
        <Callout tone="warn" title="Du svarer meget hurtigt" icon={<span aria-hidden>⏱️</span>}>
          Flere af de seneste svar kom hurtigere end opgaven kan læses — og de fleste var forkerte. Læs opgaven færdig
          først; det er hurtigere i sidste ende.
        </Callout>
      ) : behaviour.hintDependent ? (
        <Callout tone="brand" title="Du bruger mange hints" icon={<span aria-hidden>💡</span>}>
          Det er helt fint at bruge hints — men prøv at skrive det første skridt ned selv, før du åbner et. Det er dér
          læringen sker.
        </Callout>
      ) : null}

      {/* Anbefalet næste skridt */}
      {first ? (
        <section>
          <SectionTitle hint="anbefalet af din profil">Næste skridt</SectionTitle>
          <PlanCard item={first} primary />
        </section>
      ) : null}

      {/* Fejl der skal ryddes op i */}
      {errors.length ? (
        <section>
          <SectionTitle hint={`${errors.length} stk.`}>Fejl der går igen</SectionTitle>
          <div className="space-y-2">
            {errors.slice(0, 3).map(({ state, def }) => (
              <Card key={def.id} className="!p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-lg" aria-hidden>🔍</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{def.name}</p>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{def.correction}</p>
                    <p className="mt-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">Huskeregel: {def.tip}</p>
                  </div>
                  <Chip tone="warn">{state.count}×</Chip>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Repetition */}
      {due.length ? (
        <section>
          <SectionTitle hint={`${due.length} klar`}>Til repetition</SectionTitle>
          <Card className="!p-4">
            <p className="mb-3 text-sm text-ink-600 dark:text-ink-300">
              De her emner har du mestret — men de er ved at falde ud igen. Fem minutter nu sparer en hel genindlæring
              senere.
            </p>
            <ul className="mb-3 space-y-1.5">
              {due.slice(0, 4).map((s) => (
                <li key={s.skillId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold">{getSkill(s.skillId)?.name ?? s.skillId}</span>
                  <span className="shrink-0 text-xs text-ink-500 dark:text-ink-400">{relativeDays(s.due)}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => navigate({ name: 'review' })} className="btn-primary w-full">
              Start repetition ({due.length})
            </button>
          </Card>
        </section>
      ) : null}

      {/* Resten af planen */}
      {rest.length ? (
        <section>
          <SectionTitle>Også på din plan</SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {rest.map((item) => (
              <PlanCard key={`${item.kind}-${item.skillId}`} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Emneoverblik */}
      <section>
        <SectionTitle hint={<a href="#/bibliotek" className="font-semibold text-brand-600 dark:text-brand-300">se alle</a>}>
          Dine emner
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {domains
            .slice()
            .sort((a, b) => b.percent - a.percent || (b.diagnostic ?? 0) - (a.diagnostic ?? 0))
            .slice(0, 6)
            .map((d) => (
              <button
                key={d.domainId}
                onClick={() => navigate({ name: 'domain', domainId: d.domainId })}
                className="card flex items-center gap-3 !p-3 text-left transition-shadow hover:shadow-lift"
              >
                <ProgressRing value={d.percent} size={44} stroke={5} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{d.name}</span>
                  <span className="block text-xs text-ink-500 dark:text-ink-400">
                    {d.mastered}/{d.total} mestret
                    {d.diagnostic !== null ? ` · test ${d.diagnostic} %` : ''}
                  </span>
                </span>
              </button>
            ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const KIND_STYLE: Record<PlanItem['kind'], { icon: string; label: string; tone: 'warn' | 'brand' | 'accent' | 'good' }> = {
  fejlklinik: { icon: '🔍', label: 'Ryd op i en fejl', tone: 'warn' },
  repetition: { icon: '🔁', label: 'Repetition', tone: 'accent' },
  fortsaet: { icon: '▶', label: 'Fortsæt', tone: 'brand' },
  nyt: { icon: '✦', label: 'Nyt emne', tone: 'good' },
  diagnose: { icon: '🗺️', label: 'Niveautest', tone: 'brand' },
};

function PlanCard({ item, primary }: { item: PlanItem; primary?: boolean }) {
  const style = KIND_STYLE[item.kind];
  const go = () =>
    item.kind === 'diagnose' ? navigate({ name: 'diagnose' }) : navigate({ name: 'lesson', skillId: item.skillId });

  return (
    <button
      onClick={go}
      className={clsx(
        'card w-full text-left transition-shadow hover:shadow-lift',
        primary ? 'border-brand-300 !p-5 dark:border-brand-800' : '!p-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={clsx('flex shrink-0 items-center justify-center rounded-xl', primary ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-base', {
          warn: 'bg-warn-100 dark:bg-warn-900/40',
          brand: 'bg-brand-100 dark:bg-brand-950',
          accent: 'bg-accent-100 dark:bg-accent-900/40',
          good: 'bg-good-100 dark:bg-good-900/40',
        }[style.tone])} aria-hidden>
          {style.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-ink-400 dark:text-ink-500">
            {style.label}
          </span>
          <span className={clsx('block font-bold', primary ? 'text-lg' : 'text-sm')}>{item.title}</span>
          <span className="mt-1 block text-sm text-ink-600 dark:text-ink-300">{item.reason}</span>
          {primary ? (
            <span className="mt-3 inline-flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
              <Chip tone="neutral">ca. {item.estimatedMinutes} min</Chip>
            </span>
          ) : null}
        </span>
      </div>
    </button>
  );
}
