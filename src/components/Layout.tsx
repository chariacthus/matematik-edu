import { type ReactNode, useEffect } from 'react';
import clsx from 'clsx';
import { hrefFor, navigate, type Route } from '../lib/router';
import { useStore } from '../state/store';
import { levelProgress } from '../engine/gamification';
import { Icon, type IconName } from './Icon';
import { ProgressBar } from './ui';

const NAV: { route: Route; label: string; icon: IconName }[] = [
  { route: { name: 'dashboard' }, label: 'I dag', icon: 'home' },
  { route: { name: 'library' }, label: 'Emner', icon: 'book' },
  { route: { name: 'practice' }, label: 'Træn', icon: 'pencil' },
  { route: { name: 'exam' }, label: 'Prøve', icon: 'exam' },
  { route: { name: 'profile' }, label: 'Profil', icon: 'user' },
];

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  const gamification = useStore((s) => s.gamification);
  const profile = useStore((s) => s.profile);
  const settings = useStore((s) => s.settings);
  const progress = levelProgress(gamification.xp);

  // Temaet sættes på <html>, så Tailwinds dark-klasse virker overalt —
  // også på elementer uden for React-roden.
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', dark);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [settings.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('calm', settings.reducedMotion);
  }, [settings.reducedMotion]);

  const isActive = (r: Route) =>
    r.name === route.name ||
    (r.name === 'library' && (route.name === 'domain' || route.name === 'lesson'));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/85">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <nav className="hidden h-full items-stretch gap-1 sm:flex" aria-label="Hovedmenu">
            {NAV.map((item) => {
              const on = isActive(item.route);
              return (
                <a
                  key={item.label}
                  href={hrefFor(item.route)}
                  data-tour={`nav-${item.route.name}`}
                  className={clsx(
                    'relative flex items-center gap-2 px-3.5 text-sm font-medium transition-colors',
                    on ? 'text-ink-950 dark:text-white' : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
                  )}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={16} className={on ? 'text-brand-400' : undefined} />
                  {item.label}
                  {on ? (
                    <span
                      className="absolute inset-x-3 -bottom-px h-0.5 animate-tab-slide rounded-full bg-brand-500"
                      aria-hidden
                    />
                  ) : null}
                </a>
              );
            })}
          </nav>

          {profile.onboarded ? (
            <div className="ml-auto flex items-center gap-2.5">
              {gamification.streakDays > 0 ? (
                <span
                  className="flex items-center gap-1 rounded-lg bg-warn-100 px-2 py-1 text-xs font-extrabold tabular-nums text-warn-700 dark:bg-warn-500/15 dark:text-warn-300"
                  title={`${gamification.streakDays} dage i træk`}
                >
                  <Icon name="flame" size={13} />
                  {gamification.streakDays}
                </span>
              ) : null}
              <button
                onClick={() => navigate({ name: 'profile' })}
                className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-ink-100 dark:hover:bg-white/[0.06]"
                title={`Niveau ${progress.level} — ${gamification.xp} XP`}
              >
                <span className="num flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white shadow-inset">
                  {progress.level}
                </span>
                <span className="hidden w-16 md:block">
                  <ProgressBar value={progress.percent} size="sm" tone="xp" label="Fremgang mod næste niveau" />
                </span>
              </button>
              <button
                onClick={() => navigate({ name: 'settings' })}
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-ink-100 dark:hover:bg-white/[0.06]',
                  route.name === 'settings' ? 'text-ink-900 dark:text-white' : 'text-ink-500 dark:text-ink-400',
                )}
                aria-label="Indstillinger"
                title="Indstillinger"
              >
                <Icon name="settings" size={18} />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main
        // key på ruten: React monterer indholdet på ny ved sideskift, så
        // indtoningen spilles forfra i stedet for kun første gang.
        key={route.name}
        className="mx-auto w-full max-w-5xl flex-1 animate-swap-in px-4 pb-28 pt-5 sm:pb-12"
      >
        {children}
      </main>

      {/* Mobilnavigation i bunden — tommelfingervenlig */}
      {profile.onboarded ? (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/90 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/90 sm:hidden"
          aria-label="Hovedmenu"
        >
          <div className="mx-auto flex max-w-lg">
            {NAV.map((item) => {
              const on = isActive(item.route);
              return (
                <a
                  key={item.label}
                  href={hrefFor(item.route)}
                  data-tour={`nav-${item.route.name}`}
                  className="relative flex flex-1 flex-col items-center gap-1 pb-1.5 pt-2.5"
                  aria-current={on ? 'page' : undefined}
                >
                  {on ? <span className="absolute inset-x-5 top-0 h-0.5 animate-tab-slide rounded-full bg-brand-500" aria-hidden /> : null}
                  <span
                    className={clsx(
                      'flex h-7 w-12 items-center justify-center transition-colors',
                      on ? 'text-brand-400' : 'text-ink-400 dark:text-ink-500',
                    )}
                  >
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className={clsx('text-[11px] font-medium', on ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-ink-500')}>
                    {item.label}
                  </span>
                </a>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
