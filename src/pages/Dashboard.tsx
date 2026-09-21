import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { buildPlan, domainProgress, overallProgress, type PlanItem } from '../engine/planner';
import { activeMisconceptions, readBehaviour } from '../engine/diagnosis';
import { dueSkills } from '../engine/srs';
import { levelProgress, levelTitle } from '../engine/gamification';
import { CATEGORIES, getSkill } from '../content';
import { navigate } from '../lib/router';
import { DAY_MS, dayKey, relativeDays } from '../lib/dates';
import { Icon, type IconName } from '../components/Icon';
import {
  Callout, Card, Chip, CountUp, EmptyState, IconTile, Page,
  ProgressBar, ProgressRing, Section, Segmented, StreakStrip, XpBar,
} from '../components/ui';

type Tab = 'plan' | 'repetition' | 'fejl';

/**
 * Forsiden er elevens HUD.
 *
 * Øverst står status: niveau, XP og stribe. Derunder ét stort mål man
 * kan trykke på. Resten ligger bag en vælger, så siden har ét
 * fokuspunkt frem for otte konkurrerende kasser.
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
  const pendingLevelUp = useStore((s) => s.pendingLevelUp);

  // De seneste syv dage. Vi tæller både registrerede forsøg og dagens
  // optjente XP med - ellers kan striben sige 1 dag mens kalenderen står
  // tom, hvilket ser ud som en fejl.
  const week = useMemo(() => {
    const active = new Set(attempts.map((a) => dayKey(a.ts)));
    if (gamification.todayXp > 0 && gamification.today) active.add(gamification.today);
    if (gamification.lastActiveDay) active.add(gamification.lastActiveDay);
    return Array.from({ length: 7 }, (_, i) => active.has(dayKey(Date.now() - (6 - i) * DAY_MS)));
  }, [attempts, gamification.todayXp, gamification.today, gamification.lastActiveDay]);

  const [tab, setTab] = useState<Tab>('plan');
  const first = plan[0];
  const rest = plan.filter((p) => p !== first && p.kind !== 'repetition' && p.kind !== 'fejlklinik');
  const goalPct = Math.min(100, (gamification.todayXp / gamification.dailyGoalXp) * 100);
  const hour = new Date().getHours();

  return (
    <Page className="animate-fade-in">
      {/* HUD */}
      <section>
        <p className="eyebrow mb-1">{hour < 10 ? 'Godmorgen' : hour < 17 ? 'Eftermiddag' : 'Godaften'}</p>
        <h1 className="title-page mb-3 truncate">{profile.name || 'Kom i gang'}</h1>

        <Card pad="lg" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="eyebrow block">{levelTitle(level.level)}</span>
              <span className="mt-0.5 block text-lg font-extrabold tabular-nums">
                <CountUp value={gamification.xp} /> <span className="text-sm text-ink-400">XP i alt</span>
              </span>
            </span>
            <ProgressRing value={overall.percent} size={48} stroke={5} />
          </div>

          <XpBar level={level.level} into={level.into} needed={level.needed} levelUp={pendingLevelUp !== null} />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-200/60 pt-3.5 dark:border-white/[0.07]">
            <StreakStrip days={week} active={gamification.streakDays} />
            <span className="shrink-0 text-right">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">I dag</span>
              <span className={clsx('block text-base font-extrabold tabular-nums', goalPct >= 100 && 'text-xp-500')}>
                {gamification.todayXp}/{gamification.dailyGoalXp}
              </span>
            </span>
          </div>
        </Card>
      </section>

      {behaviour.rushing ? (
        <div>
          <Callout tone="warn" icon="clock">
            Du svarer hurtigere end opgaverne kan læses, og de fleste bliver forkerte. Læs opgaven færdig først.
          </Callout>
        </div>
      ) : behaviour.hintDependent ? (
        <div>
          <Callout tone="brand" icon="bulb">
            Skriv første skridt ned selv, før du åbner et hint. Det er dér læringen sker.
          </Callout>
        </div>
      ) : null}

      {/* Dagens mål */}
      {first ? (
        <Section title="Dagens Missioner">
          <MissionCard item={first} />
        </Section>
      ) : null}

      {/* Resten */}
      <section>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: 'plan', label: 'Missioner', icon: 'flag', count: rest.length || undefined },
            { id: 'repetition', label: 'Repetition', icon: 'refresh', count: due.length || undefined },
            { id: 'fejl', label: 'Fejl', icon: 'search', count: errors.length || undefined },
          ]}
        />

        {tab === 'plan' ? (
          rest.length ? (
            <div className="stagger grid gap-2 sm:grid-cols-2">
              {rest.slice(0, 4).map((item) => (
                <PlanCard key={`${item.kind}-${item.skillId}`} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState icon="check" title="Planen er tom" body="Du har taget alt det vi anbefalede. Vælg selv et emne på kortet." />
          )
        ) : null}

        {tab === 'repetition' ? (
          due.length ? (
            <Card>
              <p className="mb-3 text-sm text-ink-600 dark:text-ink-300">
                De her emner er ved at falde ud igen. Fem minutter nu sparer en genindlæring senere.
              </p>
              <ul className="mb-3 divide-y divide-ink-100 dark:divide-white/[0.07]">
                {due.slice(0, 5).map((s) => (
                  <li key={s.skillId} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="truncate font-semibold">{getSkill(s.skillId)?.name ?? s.skillId}</span>
                    <span className="shrink-0 text-xs text-ink-500 dark:text-ink-400">{relativeDays(s.due)}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate({ name: 'review' })} className="btn-primary w-full">
                <Icon name="refresh" size={16} /> Start repetition ({due.length})
              </button>
            </Card>
          ) : (
            <EmptyState icon="seedling" title="Intet at repetere" body="Alt du har mestret sidder stadig fast. Vi giver besked når noget skal op igen." />
          )
        ) : null}

        {tab === 'fejl' ? (
          errors.length ? (
            <ul className="stagger space-y-2">
              {errors.slice(0, 5).map(({ state, def }) => (
                <Card key={def.id} as="li" pad="md">
                  <div className="flex items-start gap-3">
                    <IconTile name="search" tone="warn" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{def.name}</p>
                      <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{def.correction}</p>
                      <p className="mt-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">{def.tip}</p>
                    </div>
                    <Chip tone="warn">{state.count}×</Chip>
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title="Ingen fejl der går igen" body="Når den samme fejl dukker op to gange, stopper vi op og forklarer den her." />
          )
        ) : null}
      </section>

      {/* Kompetenceområder */}
      <Section
        title="Kompetenceområder"
        action={
          <button onClick={() => navigate({ name: 'library' })} className="text-xs font-bold text-brand-600 dark:text-brand-300">
            Se kortet
          </button>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((cat) => {
            const inCat = domains.filter((d) => d.category === cat.id);
            if (!inCat.length) return null;
            const pct = Math.round(inCat.reduce((n, d) => n + d.percent, 0) / inCat.length);
            const mastered = inCat.reduce((n, d) => n + d.mastered, 0);
            const total = inCat.reduce((n, d) => n + d.total, 0);
            const icon: IconName = { 'tal-algebra': 'sigma', 'geometri-maaling': 'shapes', 'statistik-sandsynlighed': 'chart', kompetencer: 'brain' }[cat.id] as IconName;
            return (
              <button
                key={cat.id}
                onClick={() => navigate({ name: 'library' })}
                className="card-interactive group flex items-center gap-3 p-3 text-left"
              >
                <IconTile name={icon} tone="brand" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{cat.name}</span>
                  <span className="mt-1 block">
                    <ProgressBar value={pct} size="sm" tone={pct >= 70 ? 'xp' : 'brand'} label={cat.name} />
                  </span>
                </span>
                <span className="shrink-0 text-xs font-extrabold tabular-nums text-ink-400">
                  {mastered}/{total}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* FP9 */}
      <Section title="Prøvetræning">
        <button
          onClick={() => navigate({ name: 'exam' })}
          className="card-interactive group flex w-full items-center gap-3 p-4 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-[11px] font-extrabold tracking-tight text-white dark:bg-white dark:text-ink-950">
            FP9
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Træn til prøven</span>
            <span className="block text-sm text-ink-500 dark:text-ink-400">Begge prøvedele, på tid.</span>
          </span>
          <Icon name="chevron" size={18} className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5" />
        </button>
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ */

const KIND: Record<PlanItem['kind'], { icon: IconName; label: string; tone: 'warn' | 'brand' | 'accent' | 'xp' }> = {
  fejlklinik: { icon: 'search', label: 'Ryd op i en fejl', tone: 'warn' },
  repetition: { icon: 'refresh', label: 'Repetition', tone: 'accent' },
  fortsaet: { icon: 'play', label: 'Fortsæt', tone: 'brand' },
  nyt: { icon: 'sparkle', label: 'Nyt emne', tone: 'xp' },
  diagnose: { icon: 'map', label: 'Niveautest', tone: 'brand' },
};

const go = (item: PlanItem) =>
  item.kind === 'diagnose' ? navigate({ name: 'diagnose' }) : navigate({ name: 'lesson', skillId: item.skillId });

/** Det store, trykbare mål. Det skal se ud som en knap man vil trykke på. */
function MissionCard({ item }: { item: PlanItem }) {
  const style = KIND[item.kind];
  return (
    <button
      onClick={() => go(item)}
      className="shine shine-2 shine-live group relative w-full overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-brand-500/95 via-brand-600 to-brand-700 p-5 text-left text-white shadow-glow backdrop-blur-xl transition-all duration-200 ease-spring hover:-translate-y-1 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_16px_48px_-12px_rgba(99,102,241,0.7)] active:translate-y-0 active:scale-[0.99]"
    >
      {/* To bløde lysfelter, så fladen ikke er død — og en glans der
          løber hen over kortet ved hover. */}
      <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" aria-hidden />
      <span className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-xp-400/20 blur-3xl" aria-hidden />
      <span
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100"
        aria-hidden
      />
      <span className="relative flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
          <Icon name={style.icon} size={22} filled={style.icon === 'play'} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{style.label}</span>
          <span className="mt-0.5 block text-xl font-extrabold leading-tight">{item.title}</span>
          <span className="mt-1.5 block text-sm leading-snug text-white/80">{item.reason}</span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-bold">
            <Icon name="clock" size={12} />
            {item.estimatedMinutes} min
          </span>
        </span>
        <Icon name="chevron" size={20} className="mt-1 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
      </span>
    </button>
  );
}

function PlanCard({ item }: { item: PlanItem }) {
  const style = KIND[item.kind];
  return (
    <button
      onClick={() => go(item)}
      className="card-interactive group flex w-full items-start gap-3 p-4 text-left"
    >
      <IconTile name={style.icon} tone={style.tone} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">{style.label}</span>
        <span className="block text-sm font-bold leading-snug">{item.title}</span>
        <span className="mt-1 block text-xs leading-snug text-ink-500 dark:text-ink-400">{item.reason}</span>
      </span>
    </button>
  );
}
