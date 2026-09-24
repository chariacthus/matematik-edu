import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { ACHIEVEMENTS, levelProgress, levelTitle, xpForLevel } from '../engine/gamification';
import { buildPlan, domainProgress, overallProgress } from '../engine/planner';
import { dailyActivity } from '../engine/activity';
import { activeMisconceptions } from '../engine/diagnosis';
import { formatMinutes } from '../lib/dates';
import { navigate } from '../lib/router';
import { openPlanItem } from '../lib/plan';
import { Card, IconTile, LabelledBar, ListRow, MetaChip, Section, SectionTitle, StatTile, XpBar } from '../components/ui';
import { Icon, domainIcon } from '../components/Icon';
import { ActivityChart } from '../components/ActivityChart';

/** Elevens profil: fremgang, styrker, svagheder og badges. */
export function ProfilePage() {
  const profile = useStore((s) => s.profile);
  const skills = useStore((s) => s.skills);
  const attempts = useStore((s) => s.attempts);
  const gamification = useStore((s) => s.gamification);
  const misconceptions = useStore((s) => s.misconceptions);

  const level = levelProgress(gamification.xp);
  const overall = useMemo(() => overallProgress(skills), [skills]);
  const domains = useMemo(() => domainProgress(skills, profile), [skills, profile]);
  const errors = useMemo(() => activeMisconceptions(misconceptions), [misconceptions]);

  const next = useMemo(() => buildPlan({ states: skills, misconceptions, profile }, 1)[0], [skills, misconceptions, profile]);
  const [allBadges, setAllBadges] = useState(false);
  const days = useMemo(() => dailyActivity(attempts), [attempts]);
  const recent = days.reduce((n, d) => n + d.total, 0);

  const fresh = attempts.length === 0;
  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const started = domains.filter((d) => d.mastered + d.inProgress > 0);
  const ranked = [...started].sort((a, b) => b.percent - a.percent);
  const strong = ranked.filter((d) => d.percent > 0).slice(0, 3);
  const weak = ranked.filter((d) => !strong.includes(d)).slice(-3).reverse();
  const earned = ACHIEVEMENTS.filter((a) => gamification.achievements[a.id]);
  const locked = ACHIEVEMENTS.filter((a) => !gamification.achievements[a.id]);
  const badges = allBadges ? [...earned, ...locked] : [...earned, ...locked.slice(0, 3)];

  return (
    <div className="space-y-6">
      <header className="paper-head flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-semibold text-white shadow-inset">
          {(profile.name || '?').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="title-page truncate">{profile.name || 'Din profil'}</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {profile.grade}. klasse · {levelTitle(level.level)}
          </p>
        </div>
      </header>

      {fresh ? (
        <Card pad="lg" className="paper-tile">
          <h2 className="text-lg font-semibold">Din profil fyldes ud når du går i gang</h2>
          <p className="mt-1.5 max-w-md text-sm text-ink-600 dark:text-ink-300">
            Her kommer dine tal, de emner du arbejder med, og de badges du får. Løs de første opgaver, så er der noget at se.
          </p>
          {next ? (
            <button onClick={() => openPlanItem(next)} className="btn-primary mt-5">
              Start dagens mission <Icon name="arrow-right" size={16} />
            </button>
          ) : null}
        </Card>
      ) : (
        <>
          <Card pad="md">
            <XpBar level={level.level} into={level.into} needed={level.needed} />
            <p className="num mt-2 text-xs text-ink-500 dark:text-ink-400">
              {gamification.xp} XP i alt · næste niveau ved {xpForLevel(level.level)} XP
            </p>
          </Card>

          <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Opgaver løst" icon="check" value={attempts.length} />
            <StatTile label="Rigtige" icon="target" value={accuracy} suffix="%" />
            <StatTile label="Mestret" icon="star" tone="xp" value={overall.mastered} suffix={`/ ${overall.total}`} />
            <StatTile label="Tid brugt" icon="clock" value={formatMinutes(gamification.totalMinutes)} />
          </div>

          {recent ? (
            <section>
              <SectionTitle hint={`${recent} ${recent === 1 ? 'opgave' : 'opgaver'}`}>De sidste 14 dage</SectionTitle>
              <Card>
                <ActivityChart days={days} />
              </Card>
            </section>
          ) : null}

          <section>
            <SectionTitle hint={`${overall.percent} % samlet`}>Dine emner</SectionTitle>
            <Card>
              {started.length ? (
                <ul className="stagger space-y-3">
                  {started.map((d) => (
                    <li key={d.domainId}>
                      <LabelledBar
                        label={d.name}
                        value={d.percent}
                        right={`${d.percent} %`}
                        onClick={() => navigate({ name: 'domain', domainId: d.domainId })}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
              {domains.length > started.length ? (
                <button
                  onClick={() => navigate({ name: 'library' })}
                  className={clsx(
                    'flex w-full items-center justify-between gap-3 text-left text-sm text-ink-500 transition-colors hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
                    started.length && 'mt-4 border-t border-ink-100 pt-3.5 dark:border-white/[0.06]',
                  )}
                >
                  <span>
                    {domains.length - started.length} {domains.length - started.length === 1 ? 'emne' : 'emner'} ikke startet endnu
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              ) : null}
            </Card>
          </section>
        </>
      )}

      {/* Styrker og svagheder */}
      {started.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Section title="Dine styrker">
            {strong.length ? (
              <div className="space-y-2">
                {strong.map((d) => (
                  <ListRow
                    key={d.domainId}
                    icon={domainIcon(d.domainId)}
                    tone="xp"
                    title={d.name}
                    trailing={<span className="num text-xs text-ink-500 dark:text-ink-400">{d.percent} %</span>}
                    onClick={() => navigate({ name: 'domain', domainId: d.domainId })}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <p className="text-sm text-ink-500 dark:text-ink-400">Træn lidt mere, så dukker de op her.</p>
              </Card>
            )}
          </Section>

          {weak.length ? (
          <Section title="Her er der mest at hente">
            <div className="space-y-2">
              {weak.map((d) => (
                <ListRow
                  key={d.domainId}
                  icon={domainIcon(d.domainId)}
                  tone="warn"
                  title={d.name}
                  trailing={<span className="num text-xs text-ink-500 dark:text-ink-400">{d.percent} %</span>}
                  onClick={() => navigate({ name: 'domain', domainId: d.domainId })}
                />
              ))}
            </div>
          </Section>
          ) : null}
        </div>
      ) : null}

      {/* Fejlprofil */}
      {errors.length ? (
        <section>
          <SectionTitle hint={`${errors.filter((e) => !e.state.resolved).length} åbne`}>Fejl du har mødt</SectionTitle>
          <Card>
            <ul className="space-y-3">
              {errors.slice(0, 6).map(({ state, def }) => (
                <li key={def.id} className="flex items-start gap-3">
                  <IconTile name={state.resolved ? 'check' : 'search'} tone={state.resolved ? 'good' : 'warn'} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{def.name}</p>
                    <p className="text-xs text-ink-600 dark:text-ink-300">{def.tip}</p>
                  </div>
                  <MetaChip tone={state.resolved ? 'good' : 'warn'}>{state.count}×</MetaChip>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Badges */}
      <section>
        <SectionTitle hint={`${earned.length} af ${ACHIEVEMENTS.length}`}>{earned.length ? 'Badges' : 'Dine første badges'}</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {badges.map((a) => {
            const earned = Boolean(gamification.achievements[a.id]);
            return (
              <div
                key={a.id}
                className={clsx('card flex items-start gap-2.5 p-3', !earned && 'opacity-45 grayscale')}
              >
                <IconTile name={a.icon} tone={earned ? 'xp' : 'neutral'} size="sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.name}</span>
                  <span className="block text-2xs leading-snug text-ink-500 dark:text-ink-400">{a.description}</span>
                </span>
              </div>
            );
          })}
        </div>
        {locked.length > 3 ? (
          <button onClick={() => setAllBadges((v) => !v)} className="btn-ghost btn-sm mt-2.5">
            {allBadges ? 'Vis færre' : `Vis alle ${ACHIEVEMENTS.length}`}
          </button>
        ) : null}
      </section>

      <div className="flex justify-center">
        <button onClick={() => navigate({ name: 'settings' })} className="btn-secondary btn-sm">
          <Icon name="settings" size={14} /> Indstillinger
        </button>
      </div>
    </div>
  );
}
