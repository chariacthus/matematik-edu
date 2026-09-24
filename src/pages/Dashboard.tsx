import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { buildPlan, domainProgress, overallProgress, type PlanItem } from '../engine/planner';
import { activeMisconceptions, readBehaviour } from '../engine/diagnosis';
import { dueSkills } from '../engine/srs';
import { levelProgress, levelTitle } from '../engine/gamification';
import { CATEGORIES, getSkill } from '../content';
import { CATEGORY_SIGNATURES, skillSignature } from '../content/signatures';
import { navigate } from '../lib/router';
import { openPlanItem } from '../lib/plan';
import { DAY_MS, dayKey, relativeDays } from '../lib/dates';
import { Icon, type IconName } from '../components/Icon';
import { Tour, type TourStep } from '../components/Tour';
import {
  Callout, Card, ChoiceCard, EmptyState, FormulaTile, IconTile, ListRow, MetaChip, Page,
  ProgressBar, Section, Segmented, StatTile, XpBar,
} from '../components/ui';
import { LESSON_PHASES } from '../types';

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
    title: 'Stime og dagens mål',
    body:
      'Stimen tæller hvor mange dage i træk du har lavet noget. Dagens mål er cirka ti minutters arbejde. ' +
      'Dit niveau og din XP står ved dit navn i menuen.',
  },
  {
    target: 'mission',
    title: 'Dagens mission',
    body:
      'Her står det du skal lave nu. Det er valgt ud fra din niveautest, det du er i gang med, ' +
      'og det du er ved at glemme. Tryk på det, så går du i gang.',
  },
  {
    target: 'tabs',
    title: 'Missioner, repetition og fejl',
    body:
      'Missioner er resten af dagens plan. Repetition er emner du har lært, men som er ved at blive glemt. ' +
      'Fejl viser de fejl du har lavet mere end én gang, så du kan få dem rettet.',
  },
  {
    target: 'nav-library',
    title: 'Emner',
    body:
      'Hele pensum efter Fælles Mål: 21 emner og 70 færdigheder. Hvert emne har et kort, hvor du kan se ' +
      'hvad der er låst op, hvad du er i gang med, og hvad du kan.',
  },
  {
    target: 'nav-practice',
    title: 'Fri træning',
    body: 'Her kan du øve et bestemt emne, uden faser og uden at miste noget.',
  },
  {
    target: 'nav-exam',
    title: 'Prøvetræning',
    body:
      'Begge dele af FP9 på tid. Til delen med hjælpemidler har du formelsamlingen, ' +
      'ligesom til den rigtige prøve.',
  },
  {
    title: 'Sådan lærer du her',
    body:
      'Hvert emne går gennem syv trin: forklaring, eksempel, guidet træning, selvstændig opgave, variation, ' +
      'udfordring og mestringstjek. Sidder du fast, kan du tage et hint eller trykke på Få hjælp. ' +
      'Du får ikke svaret, men hjælp til det næste skridt.',
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
  const anyMastered = useMemo(() => Object.values(skills).some((s) => s.masteredAt !== null), [skills]);
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

  const daysLabel = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
  const firstState = first ? skills[first.skillId] : undefined;
  const firstPhase = first?.kind === 'fortsaet' && firstState ? LESSON_PHASES.indexOf(firstState.phase) : -1;

  return (
    <Page className="animate-fade-in">
      {profile.onboarded && !profile.tourDone ? <Tour steps={TOUR} onDone={() => setTourDone(true)} /> : null}

      <header className="paper-head">
        <p className="eyebrow mb-1">{hour < 10 ? 'Godmorgen' : hour < 17 ? 'God eftermiddag' : 'Godaften'}</p>
        <h1 className="title-page truncate">{profile.name || 'Kom i gang'}</h1>
      </header>

      {behaviour.rushing ? (
        <Callout tone="warn" icon="clock">
          Du svarer hurtigere end opgaverne kan læses, og de fleste bliver forkerte. Læs opgaven færdig først.
        </Callout>
      ) : behaviour.hintDependent ? (
        <Callout tone="brand" icon="bulb">
          Prøv at skrive første skridt selv, før du åbner et hint.
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {first ? (
          <div className="lg:col-span-2" data-tour="mission">
            <p className="eyebrow mb-2.5">Dagens Missioner</p>
            <MissionCard item={first} phase={firstPhase} />
          </div>
        ) : null}

        <div data-tour="hud" className={clsx('grid grid-cols-2 gap-3 lg:grid-cols-1 lg:content-start', first && 'lg:pt-[26px]')}>
          <StatTile
            label="Stime"
            icon="flame"
            tone="warn"
            value={gamification.streakDays}
            suffix={gamification.streakDays === 1 ? 'dag' : 'dage'}
            hint={
              gamification.streakDays === 0
                ? 'Start i dag. Én opgave er nok.'
                : gamification.streakDays === 1
                  ? 'Kom igen i morgen.'
                  : 'Kom igen i morgen.'
            }
          >
            <span className="flex gap-1" aria-label="De sidste syv dage">
              {week.map((on, i) => (
                <span key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={clsx(
                      'h-1.5 w-full animate-streak-lift rounded-full transition-colors',
                      on ? 'bg-orange-400' : 'bg-ink-200 dark:bg-white/[0.08]',
                    )}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                  <span className="text-2xs font-medium text-ink-500 dark:text-ink-400">{daysLabel[(new Date(Date.now() - (6 - i) * DAY_MS).getDay() + 6) % 7]}</span>
                </span>
              ))}
            </span>
          </StatTile>
          <StatTile
            label="Dagens mål"
            icon="target"
            tone="xp"
            value={gamification.todayXp}
            suffix={`/ ${gamification.dailyGoalXp} XP`}
            hint={goalPct >= 100 ? 'Nået. Resten er bonus.' : 'Cirka ti minutter.'}
          >
            <ProgressBar value={goalPct} tone="xp" size="sm" label="Dagens mål" />
          </StatTile>
        </div>
      </div>

      {/* Niveauet står i sidemenuen på en computer; på telefon får det sin egen række. */}
      <Card pad="md" className="lg:hidden">
        <p className="eyebrow mb-3">{levelTitle(level.level)}</p>
        <XpBar level={level.level} into={level.into} needed={level.needed} levelUp={pendingLevelUp !== null} />
      </Card>

      <section>
        {/* Rundvisningen peger på fanebjælken alene - hele sektionen er for
            høj til at kortet kan stå over eller under den på en telefon. */}
        <div data-tour="tabs" className="mb-4">
          <Segmented
            className=""
            value={tab}
            onChange={setTab}
            options={[
              { id: 'plan', label: 'Missioner', icon: 'flag', count: rest.length || undefined },
              { id: 'repetition', label: 'Repetition', icon: 'refresh', count: due.length || undefined },
              { id: 'fejl', label: 'Fejl', icon: 'search', count: errors.length || undefined },
            ]}
          />
        </div>

        {tab === 'plan' ? (
          rest.length ? (
            <div className="stagger grid gap-2 sm:grid-cols-2">
              {rest.slice(0, 4).map((item) => {
                const k = KIND[item.kind];
                return (
                  <ListRow
                    key={`${item.kind}-${item.skillId}`}
                    icon={k.icon}
                    tone={k.tone}
                    title={item.title}
                    subtitle={item.reason}
                    trailing={<span className="num text-xs text-ink-500 dark:text-ink-400">{item.estimatedMinutes} min</span>}
                    onClick={() => openPlanItem(item)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState icon="check" title="Planen er tom" body="Du har taget alt det vi anbefalede. Vælg selv et emne under Emner." />
          )
        ) : null}

        {tab === 'repetition' ? (
          due.length ? (
            <Card pad="sm">
              <div className="mb-2 space-y-0.5">
                {due.slice(0, 5).map((s) => (
                  <ListRow
                    key={s.skillId}
                    variant="plain"
                    icon="refresh"
                    tone="accent"
                    title={getSkill(s.skillId)?.name ?? s.skillId}
                    trailing={<span className="text-xs text-ink-500 dark:text-ink-400">{relativeDays(s.due)}</span>}
                  />
                ))}
              </div>
              <button onClick={() => navigate({ name: 'review' })} className="btn-primary w-full">
                <Icon name="refresh" size={16} /> Start repetition ({due.length})
              </button>
            </Card>
          ) : (
            <EmptyState
              icon="seedling"
              title="Intet at repetere endnu"
              body={
                anyMastered
                  ? 'Du kan stadig det du har lært. Når et emne skal repeteres, står det her.'
                  : 'Når du har lært et emne, kommer det tilbage her efter et par dage, så du ikke glemmer det.'
              }
            />
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
                      <p className="text-sm font-semibold">{def.name}</p>
                      <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{def.correction}</p>
                      <p className="mt-1.5 text-xs font-medium text-brand-600 dark:text-brand-300">{def.tip}</p>
                    </div>
                    <MetaChip tone="warn">{state.count}×</MetaChip>
                  </div>
                </Card>
              ))}
            </ul>
          ) : (
            <EmptyState icon="check" title="Ingen fejl der går igen" body="Laver du den samme fejl to gange, kommer den her, så du kan få den forklaret." />
          )
        ) : null}
      </section>

      <Section title="Kompetenceområder" hint={`${overall.percent} % af pensum`}>
        <div className="stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const inCat = domains.filter((d) => d.category === cat.id);
            if (!inCat.length) return null;
            const pct = Math.round(inCat.reduce((n, d) => n + d.percent, 0) / inCat.length);
            const mastered = inCat.reduce((n, d) => n + d.mastered, 0);
            const total = inCat.reduce((n, d) => n + d.total, 0);
            const started = inCat.some((d) => d.mastered + d.inProgress > 0);
            return (
              <ChoiceCard
                key={cat.id}
                size="md"
                preview={<FormulaTile tex={CATEGORY_SIGNATURES[cat.id]} />}
                tone={pct >= 70 ? 'xp' : 'brand'}
                title={cat.name}
                meta={started ? [{ icon: 'star', label: `${mastered}/${total} mestret` }] : [{ label: 'Ikke startet' }]}
                onClick={() => navigate({ name: 'library' })}
              >
                {started ? <ProgressBar value={pct} size="sm" tone={pct >= 70 ? 'xp' : 'brand'} label={cat.name} /> : null}
              </ChoiceCard>
            );
          })}
        </div>
      </Section>

      <Section title="Prøvetræning">
        <ListRow
          icon="exam"
          tone="neutral"
          title="Træn til FP9"
          subtitle="Begge prøvedele på tid, med formelsamling til delen med hjælpemidler."
          onClick={() => navigate({ name: 'exam' })}
        />
      </Section>
    </Page>
  );
}

/* ------------------------------------------------------------------ */

const KIND: Record<PlanItem['kind'], { icon: IconName; label: string; tone: 'warn' | 'brand' | 'accent' | 'xp' }> = {
  fejlklinik: { icon: 'search', label: 'Ryd op i en fejl', tone: 'warn' },
  repetition: { icon: 'refresh', label: 'Repetition', tone: 'accent' },
  fortsaet: { icon: 'play', label: 'Fortsæt', tone: 'brand' },
  nyt: { icon: 'plus', label: 'Nyt emne', tone: 'xp' },
  diagnose: { icon: 'map', label: 'Niveautest', tone: 'brand' },
};

/** Dagens mission: prøvevalgets kort, med det der skal ske som eneste handling. */
function MissionCard({ item, phase }: { item: PlanItem; phase: number }) {
  const style = KIND[item.kind];
  const skill = item.kind === 'diagnose' ? undefined : getSkill(item.skillId);
  const meta: { icon: IconName; label: string }[] = [{ icon: 'clock', label: `${item.estimatedMinutes} min` }];
  if (phase >= 0) meta.push({ icon: 'layers', label: `Trin ${phase + 1} af 7` });
  return (
    <ChoiceCard
      icon={style.icon}
      preview={skill ? <FormulaTile tex={skillSignature(skill)} size="lg" /> : undefined}
      tone={style.tone}
      eyebrow={style.label}
      title={item.title}
      description={item.reason}
      meta={meta}
      action={{ label: item.kind === 'fortsaet' ? 'Fortsæt' : 'Start', onClick: () => openPlanItem(item) }}
    />
  );
}
