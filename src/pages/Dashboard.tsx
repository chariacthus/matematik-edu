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
import { Tour, type TourStep } from '../components/Tour';
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

const TOUR: TourStep[] = [
  {
    target: 'hud',
    title: 'Din fremgang',
    body:
      'XP og niveau viser hvor langt du er kommet i alt. Stimen tæller de dage i træk du har lavet noget — ' +
      'og dagens mål er det du skal nå i dag. Det tager omkring ti minutter.',
  },
  {
    target: 'mission',
    title: 'Dagens mission',
    body:
      'Her ligger det du skal lave nu. Appen vælger det ud fra din niveautest, hvad du er i gang med, ' +
      'og hvad der er ved at glide ud igen. Du skal ikke selv finde ud af hvor du begynder — tryk bare.',
  },
  {
    target: 'tabs',
    title: 'Missioner, repetition og fejl',
    body:
      'Missioner er resten af dagens plan. Repetition er emner du har lært, men som er ved at blive glemt. ' +
      'Fejl samler de misforståelser du er faldet i mere end én gang, så du kan få dem ryddet af vejen.',
  },
  {
    target: 'nav-library',
    title: 'Kortet',
    body:
      'Hele pensum efter Fælles Mål — 21 emner og 70 færdigheder. Hvert emne er et kort hvor du kan se ' +
      'hvad der er låst op, hvad du er i gang med, og hvad du har mestret.',
  },
  {
    target: 'nav-practice',
    title: 'Fri træning',
    body: 'Vil du bare øve et bestemt emne, uden faser og uden at kunne miste noget, er det her du gør det.',
  },
  {
    target: 'nav-exam',
    title: 'Prøvetræning',
    body:
      'FP9 som den rigtige prøve: en del uden hjælpemidler på tid, og en del med — hvor du har formelsamlingen ' +
      'ved hånden, ligesom til den rigtige prøve.',
  },
  {
    title: 'Sådan lærer du her',
    body:
      'Hvert emne går gennem syv trin: forklaring, eksempel, guidet træning, selvstændig opgave, variation, ' +
      'udfordring og mestringstjek. Sidder du fast undervejs, er der hints og en AI-lærer — den giver dig ' +
      'ikke svaret, men hjælper dig et skridt videre ad gangen.',
  },
];

export function DashboardPage() {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const misconceptions = useStore((s) => s.misconceptions);
  const attempts = useStore((s) => s.attempts);
  const gamification = useStore((s) => s.gamification);
  const setTourDone = useStore((s) => s.setTourDone);

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
      {profile.onboarded && !profile.tourDone ? <Tour steps={TOUR} onDone={() => setTourDone(true)} /> : null}

      {/* HUD */}
      <section>
        <p className="eyebrow mb-1">{hour < 10 ? 'Godmorgen' : hour < 17 ? 'Eftermiddag' : 'Godaften'}</p>
        <h1 className="title-page mb-3 truncate">{profile.name || 'Kom i gang'}</h1>

        <div data-tour="hud">
        <Card pad="lg" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="eyebrow block">{levelTitle(level.level)}</span>
              <span className="num mt-0.5 block text-lg font-extrabold">
                <CountUp value={gamification.xp} /> <span className="text-sm text-ink-400">XP i alt</span>
              </span>
            </span>
            <ProgressRing value={overall.percent} size={48} stroke={5} />
          </div>

          <XpBar level={level.level} into={level.into} needed={level.needed} levelUp={pendingLevelUp !== null} />

          <div className="grid gap-3 border-t border-ink-200/60 pt-4 dark:border-white/[0.07] sm:grid-cols-2">
            <div>
              <p className="eyebrow mb-2">Din stime</p>
              <StreakStrip days={week} active={gamification.streakDays} />
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                {gamification.streakDays === 0
                  ? 'Løs én opgave i dag, så er stimen i gang.'
                  : gamification.streakDays === 1
                    ? 'Første dag. Kom igen i morgen, så vokser den.'
                    : `${gamification.streakDays} dage i træk. Hold fast.`}
              </p>
            </div>
            <div className="sm:border-l sm:border-ink-200/60 sm:pl-4 sm:dark:border-white/[0.07]">
              <p className="eyebrow mb-2">Dagens mål</p>
              <p className={clsx('num text-2xl font-extrabold leading-none', goalPct >= 100 && 'text-xp-500')}>
                {gamification.todayXp}
                <span className="text-base text-ink-400">/{gamification.dailyGoalXp} XP</span>
              </p>
              <div className="mt-2">
                <ProgressBar value={goalPct} tone="xp" size="sm" label="Dagens mål" />
              </div>
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                {goalPct >= 100 ? 'Målet er nået i dag. Alt herfra er bonus.' : 'Cirka ti minutters arbejde.'}
              </p>
            </div>
          </div>
        </Card>
        </div>
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
        <Section title="Dagens Missioner" className="scroll-mt-24" >
          <div data-tour="mission">
            <MissionCard item={first} />
          </div>
        </Section>
      ) : null}

      {/* Resten */}
      <section data-tour="tabs">
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
      className="card-interactive group flex w-full items-start gap-4 p-5 text-left"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-inset">
        <Icon name={style.icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-brand-600 dark:text-brand-300">
          {style.label}
        </span>
        <span className="mt-0.5 block text-lg font-extrabold leading-tight">{item.title}</span>
        <span className="mt-1.5 block text-sm leading-snug text-ink-500 dark:text-ink-400">{item.reason}</span>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2 py-1 text-[11px] font-bold text-ink-600 dark:bg-white/[0.07] dark:text-ink-300">
          <Icon name="clock" size={12} />
          {item.estimatedMinutes} min
        </span>
      </span>
      <Icon
        name="chevron"
        size={20}
        className="mt-1 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
      />
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
