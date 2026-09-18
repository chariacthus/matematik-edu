import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { buildPlan, domainProgress, overallProgress, type PlanItem } from '../engine/planner';
import { activeMisconceptions, readBehaviour } from '../engine/diagnosis';
import { dueSkills } from '../engine/srs';
import { levelProgress } from '../engine/gamification';
import { CATEGORIES, getSkill } from '../content';
import { navigate } from '../lib/router';
import { relativeDays } from '../lib/dates';
import { Callout, Card, Chip, EmptyState, PageHeader, ProgressBar, ProgressRing, SectionTitle, StatRow, Tabs } from '../components/ui';

type Tab = 'plan' | 'repetition' | 'fejl';

/**
 * Forsiden.
 *
 * Den var tidligere en stak af syv sektioner under hinanden. Nu er der
 * fire blokke: status, ét anbefalet næste skridt, faneblade til resten
 * og et emneoverblik. Kun én fane vises ad gangen, så siden kan læses
 * uden at scrolle forbi ting man ikke skal bruge.
 */
export function DashboardPage() {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const misconceptions = useStore((s) => s.misconceptions);
  const attempts = useStore((s) => s.attempts);
  const gamification = useStore((s) => s.gamification);

  const plan = useMemo(() => buildPlan({ states: skills, misconceptions, profile }, 8), [skills, misconceptions, profile]);
  const overall = useMemo(() => overallProgress(skills), [skills]);
  const domains = useMemo(() => domainProgress(skills, profile), [skills, profile]);
  const due = useMemo(() => dueSkills(skills), [skills]);
  const errors = useMemo(() => activeMisconceptions(misconceptions).filter((m) => m.state.count >= 2), [misconceptions]);
  const behaviour = useMemo(() => readBehaviour(attempts, 10), [attempts]);
  const level = levelProgress(gamification.xp);

  const [tab, setTab] = useState<Tab>('plan');
  const first = plan[0];
  const rest = plan.filter((p) => p !== first && p.kind !== 'repetition' && p.kind !== 'fejlklinik');
  const goalPct = Math.min(100, (gamification.todayXp / gamification.dailyGoalXp) * 100);
  const hour = new Date().getHours();

  return (
    <div>
      <PageHeader
        title={`${hour < 10 ? 'Godmorgen' : hour < 17 ? 'Hej' : 'Godaften'}${profile.name ? `, ${profile.name}` : ''}`}
        subtitle={`Niveau ${level.level} · ${overall.mastered} af ${overall.total} færdigheder mestret`}
        right={<ProgressRing value={overall.percent} size={56} />}
      />

      {/* Status i én række i stedet for tre kort */}
      <div className="mb-4">
        <StatRow
          stats={[
            { label: 'Dage i træk', value: String(gamification.streakDays), tone: gamification.streakDays > 0 ? 'warn' : undefined },
            { label: 'XP i dag', value: `${gamification.todayXp}/${gamification.dailyGoalXp}`, tone: goalPct >= 100 ? 'good' : 'accent' },
            { label: 'Mestret', value: String(overall.mastered), tone: 'brand' },
          ]}
        />
        <div className="mt-2">
          <ProgressBar value={goalPct} tone={goalPct >= 100 ? 'good' : 'accent'} size="sm" label="Dagens mål" />
        </div>
      </div>

      {/* Én besked om arbejdsvaner ad gangen, ikke flere */}
      {behaviour.rushing ? (
        <div className="mb-4">
          <Callout tone="warn" icon={<span aria-hidden>⏱️</span>}>
            Du svarer hurtigere end opgaverne kan læses — og de fleste bliver forkerte. Læs opgaven færdig først.
          </Callout>
        </div>
      ) : behaviour.hintDependent ? (
        <div className="mb-4">
          <Callout tone="brand" icon={<span aria-hidden>💡</span>}>
            Prøv at skrive første skridt ned selv, før du åbner et hint. Det er dér læringen sker.
          </Callout>
        </div>
      ) : null}

      {/* Ét tydeligt næste skridt */}
      {first ? (
        <section className="mb-6">
          <SectionTitle>Næste skridt</SectionTitle>
          <PlanCard item={first} primary />
        </section>
      ) : null}

      {/* Resten bag faneblade */}
      <section className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'plan', label: 'Plan', count: rest.length || undefined },
            { id: 'repetition', label: 'Repetition', count: due.length || undefined },
            { id: 'fejl', label: 'Fejl', count: errors.length || undefined },
          ]}
        />

        {tab === 'plan' ? (
          rest.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {rest.slice(0, 4).map((item) => (
                <PlanCard key={`${item.kind}-${item.skillId}`} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState icon="✅" title="Planen er tom" body="Du har taget alt det vi anbefalede. Vælg selv et emne i biblioteket." />
          )
        ) : null}

        {tab === 'repetition' ? (
          due.length ? (
            <Card>
              <p className="mb-3 text-sm text-ink-600 dark:text-ink-300">
                De her emner er ved at falde ud igen. Fem minutter nu sparer en genindlæring senere.
              </p>
              <ul className="mb-3 divide-y divide-ink-100 dark:divide-ink-800">
                {due.slice(0, 5).map((s) => (
                  <li key={s.skillId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-semibold">{getSkill(s.skillId)?.name ?? s.skillId}</span>
                    <span className="shrink-0 text-xs text-ink-500 dark:text-ink-400">{relativeDays(s.due)}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate({ name: 'review' })} className="btn-primary w-full">
                Start repetition ({due.length})
              </button>
            </Card>
          ) : (
            <EmptyState icon="🌱" title="Intet at repetere" body="Alt du har mestret, sidder stadig fast. Vi giver besked når noget skal op igen." />
          )
        ) : null}

        {tab === 'fejl' ? (
          errors.length ? (
            <ul className="space-y-2">
              {errors.slice(0, 5).map(({ state, def }) => (
                <Card key={def.id} as="li" pad="md">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-base" aria-hidden>🔍</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{def.name}</p>
                      <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{def.correction}</p>
                      <p className="mt-1.5 text-xs font-semibold text-brand-700 dark:text-brand-300">{def.tip}</p>
                    </div>
                    <Chip tone="warn">{state.count}×</Chip>
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="👌" title="Ingen fejl der går igen" body="Når den samme fejl dukker op to gange, stopper vi op og forklarer den her." />
          )
        ) : null}
      </section>

      {/* Emneoverblik, grupperet som i Fælles Mål */}
      <section>
        <SectionTitle
          action={
            <a href="#/bibliotek" className="text-xs font-semibold text-brand-600 dark:text-brand-300">
              Se alle
            </a>
          }
        >
          Dine kompetenceområder
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const inCat = domains.filter((d) => d.category === cat.id);
            if (!inCat.length) return null;
            const pct = Math.round(inCat.reduce((n, d) => n + d.percent, 0) / inCat.length);
            const mastered = inCat.reduce((n, d) => n + d.mastered, 0);
            const total = inCat.reduce((n, d) => n + d.total, 0);
            return (
              <button
                key={cat.id}
                onClick={() => navigate({ name: 'library' })}
                className="card flex items-center gap-3 p-3 text-left transition-shadow hover:shadow-lift"
              >
                <ProgressRing value={pct} size={44} stroke={5} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{cat.name}</span>
                  <span className="block text-xs text-ink-500 dark:text-ink-400">
                    {mastered}/{total} færdigheder
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* FP9 */}
      <section className="mt-6">
        <SectionTitle>Prøvetræning</SectionTitle>
        <button
          onClick={() => navigate({ name: 'exam' })}
          className="card flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-lift"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-lg text-white dark:bg-ink-100 dark:text-ink-900" aria-hidden>
            FP9
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Træn til prøven</span>
            <span className="block text-sm text-ink-600 dark:text-ink-300">
              Begge prøvedele — med og uden hjælpemidler — på tid.
            </span>
          </span>
          <span className="shrink-0 text-ink-400" aria-hidden>›</span>
        </button>
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
        primary ? 'border-brand-300 p-5 dark:border-brand-800' : 'p-4',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            'flex shrink-0 items-center justify-center rounded-xl',
            primary ? 'h-11 w-11 text-xl' : 'h-9 w-9 text-base',
            {
              warn: 'bg-warn-100 dark:bg-warn-900/40',
              brand: 'bg-brand-100 dark:bg-brand-950',
              accent: 'bg-accent-100 dark:bg-accent-900/40',
              good: 'bg-good-100 dark:bg-good-900/40',
            }[style.tone],
          )}
          aria-hidden
        >
          {style.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">
            {style.label}
          </span>
          <span className={clsx('block font-bold leading-snug', primary ? 'text-lg' : 'text-sm')}>{item.title}</span>
          <span className="mt-1 block text-sm leading-snug text-ink-600 dark:text-ink-300">{item.reason}</span>
        </span>
        {primary ? <Chip tone="neutral" className="shrink-0">{item.estimatedMinutes} min</Chip> : null}
      </div>
    </button>
  );
}
