import { useMemo } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { ACHIEVEMENTS, levelProgress, levelTitle, xpForLevel } from '../engine/gamification';
import { domainProgress, overallProgress } from '../engine/planner';
import { activeMisconceptions } from '../engine/diagnosis';
import { formatMinutes } from '../lib/dates';
import { navigate } from '../lib/router';
import { Card, Chip, IconTile, LabelledBar, PageHeader, ProgressRing, SectionTitle, XpBar } from '../components/ui';

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
      <PageHeader
        title={profile.name || 'Din profil'}
        subtitle={`${profile.grade}. klasse · niveau ${level.level}, ${levelTitle(level.level)}`}
        right={
          <button onClick={() => navigate({ name: 'settings' })} className="btn-secondary">
            Indstillinger
          </button>
        }
      />

      <Card pad="md" className="-mt-1">
        <XpBar level={level.level} into={level.into} needed={level.needed} />
        <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">I alt {gamification.xp} XP optjent</p>
      </Card>

      {/* Nøgletal */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Opgaver løst" value={String(attempts.length)} />
        <Stat label="Rigtige" value={`${accuracy} %`} />
        <Stat label="Mestret" value={`${overall.mastered}/${overall.total}`} />
        <Stat label="Tid brugt" value={formatMinutes(gamification.totalMinutes)} />
      </div>

      {/* Emneprofil */}
      <section>
        <SectionTitle hint={`${overall.percent} % samlet`}>Din profil, emne for emne</SectionTitle>
        <Card>
          <ul className="space-y-3">
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
          <section>
            <SectionTitle>Dine styrker</SectionTitle>
            <Card>
              {strong.length ? (
                <ul className="space-y-2.5">
                  {strong.map((d) => (
                    <li key={d.domainId} className="flex items-center gap-3">
                      <ProgressRing value={d.percent} size={38} stroke={4} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-500">Træn lidt mere, så dukker de op her.</p>
              )}
            </Card>
          </section>

          <section>
            <SectionTitle>Her er der mest at hente</SectionTitle>
            <Card>
              <ul className="space-y-2.5">
                {weak.map((d) => (
                  <li key={d.domainId} className="flex items-center gap-3">
                    <ProgressRing value={d.percent} size={38} stroke={4} />
                    <button
                      onClick={() => navigate({ name: 'domain', domainId: d.domainId })}
                      className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:text-brand-600"
                    >
                      {d.name}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
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

      <p className="text-center text-xs text-ink-400 dark:text-ink-500">
        Næste niveau kræver {xpForLevel(level.level)} XP i alt.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card pad="sm" className="text-center">
      <p className="num text-xl font-extrabold">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</p>
    </Card>
  );
}
