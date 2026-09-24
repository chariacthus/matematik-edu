import { useMemo } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { ACHIEVEMENTS, levelProgress, levelTitle, xpForLevel } from '../engine/gamification';
import { domainProgress, overallProgress } from '../engine/planner';
import { activeMisconceptions } from '../engine/diagnosis';
import { formatMinutes } from '../lib/dates';
import { navigate } from '../lib/router';
import { Card, Chip, IconTile, LabelledBar, ListRow, Section, SectionTitle, StatTile, XpBar } from '../components/ui';
import { Icon, domainIcon } from '../components/Icon';

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

  const correct = attempts.filter((a) => a.correct).length;
  const accuracy = attempts.length ? Math.round((correct / attempts.length) * 100) : 0;
  const ranked = [...domains].sort((a, b) => b.percent - a.percent);
  const strong = ranked.filter((d) => d.percent > 0).slice(0, 3);
  const weak = ranked.filter((d) => d.total > 0).slice(-3).reverse();

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

      <Card pad="md">
        <XpBar level={level.level} into={level.into} needed={level.needed} />
        <p className="num mt-2 text-xs text-ink-500 dark:text-ink-400">
          {gamification.xp} XP i alt · næste niveau ved {xpForLevel(level.level)} XP
        </p>
      </Card>

      {/* Nøgletal */}
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Opgaver løst" icon="check" value={attempts.length} />
        <StatTile label="Rigtige" icon="target" value={accuracy} suffix="%" />
        <StatTile label="Mestret" icon="star" tone="xp" value={overall.mastered} suffix={`/ ${overall.total}`} />
        <StatTile label="Tid brugt" icon="clock" value={formatMinutes(gamification.totalMinutes)} />
      </div>

      {/* Emneprofil */}
      <section>
        <SectionTitle hint={`${overall.percent} % samlet`}>Din profil, emne for emne</SectionTitle>
        <Card>
          <ul className="stagger space-y-3">
            {domains.map((d) => (
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
        </Card>
      </section>

      {/* Styrker og svagheder */}
      {attempts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
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
                <p className="text-sm text-ink-500">Træn lidt mere, så dukker de op her.</p>
              </Card>
            )}
          </Section>

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
                  <Chip tone={state.resolved ? 'good' : 'warn'}>{state.count}×</Chip>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* Badges */}
      <section>
        <SectionTitle hint={`${Object.keys(gamification.achievements).length} af ${ACHIEVEMENTS.length}`}>Badges</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const earned = Boolean(gamification.achievements[a.id]);
            return (
              <div
                key={a.id}
                className={clsx('card flex items-start gap-2.5 p-3', !earned && 'opacity-45 grayscale')}
              >
                <IconTile name={a.icon} tone={earned ? 'xp' : 'neutral'} size="sm" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.name}</span>
                  <span className="block text-[11px] leading-snug text-ink-500 dark:text-ink-400">{a.description}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex justify-center">
        <button onClick={() => navigate({ name: 'settings' })} className="btn-secondary btn-sm">
          <Icon name="settings" size={14} /> Indstillinger
        </button>
      </div>
    </div>
  );
}
