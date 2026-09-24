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
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f1114' : '#f7f8fa');
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
  const activeIndex = NAV.findIndex((n) => isActive(n.route));
  const section = activeIndex >= 0 ? NAV[activeIndex]!.label : route.name === 'settings' ? 'Indstillinger' : '';

  return (
    <div className="min-h-full">
      {profile.onboarded ? (
        <aside
          className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-ink-200 bg-white/70 px-3 pb-4 pt-6 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/70 lg:flex"
          aria-label="Sidemenu"
        >
          <nav className="relative flex flex-col gap-1" aria-label="Hovedmenu">
            {activeIndex >= 0 ? (
              // Markeringen glider mellem punkterne. Hvert punkt er 40px højt
              // med 4px mellemrum, så placeringen kan regnes ud uden måling.
              <span
                className="absolute inset-x-0 top-0 h-10 rounded-xl bg-ink-100 transition-transform duration-300 ease-spring dark:bg-white/[0.06]"
                style={{ transform: `translateY(${activeIndex * 44}px)` }}
                aria-hidden
              >
                <span className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-brand-500" />
              </span>
            ) : null}
            {NAV.map((item) => {
              const on = isActive(item.route);
              return (
                <a
                  key={item.label}
                  href={hrefFor(item.route)}
                  data-tour={`nav-${item.route.name}`}
                  className={clsx(
                    'relative flex h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors',
                    on ? 'text-ink-950 dark:text-white' : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
                  )}
                  aria-current={on ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={18} className={on ? 'text-brand-400' : undefined} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <button
              onClick={() => navigate({ name: 'profile' })}
              className="card-interactive w-full rounded-2xl p-3 text-left"
              title={`Niveau ${progress.level} · ${gamification.xp} XP`}
            >
              <span className="flex items-center gap-3">
                <span className="num flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-semibold text-white shadow-inset">
                  {progress.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{profile.name || 'Dig'}</span>
                  <span className="num block text-xs text-ink-500 dark:text-ink-400">
                    {progress.into} / {progress.needed} XP
                  </span>
                </span>
                {gamification.streakDays > 0 ? (
                  <span
                    className="num flex items-center gap-1 rounded-lg bg-warn-500/15 px-2 py-1 text-xs font-semibold text-warn-700 dark:text-warn-300"
                    title={`${gamification.streakDays} dage i træk`}
                  >
                    <Icon name="flame" size={13} />
                    {gamification.streakDays}
                  </span>
                ) : null}
              </span>
              <span className="mt-2.5 block">
                <ProgressBar value={progress.percent} size="sm" tone="xp" label="Fremgang mod næste niveau" />
              </span>
            </button>
            <a
              href={hrefFor({ name: 'settings' })}
              className={clsx(
                'flex h-10 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors',
                route.name === 'settings'
                  ? 'bg-ink-100 text-ink-950 dark:bg-white/[0.06] dark:text-white'
                  : 'text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-white',
              )}
              aria-current={route.name === 'settings' ? 'page' : undefined}
            >
              <Icon name="settings" size={18} />
              Indstillinger
            </a>
          </div>
        </aside>
      ) : null}

      {/* Under 1024px: en smal topbjælke der siger hvor man er, og en fanebjælke i bunden. */}
      <header className="sticky top-0 z-30 border-b border-ink-200 bg-ink-50/85 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/85 lg:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <span className="text-sm font-semibold text-ink-900 dark:text-white">{profile.onboarded ? section : ''}</span>
          {profile.onboarded ? (
            <div className="ml-auto flex items-center gap-2">
              {gamification.streakDays > 0 ? (
                <span
                  className="num flex items-center gap-1 rounded-lg bg-warn-500/15 px-2 py-1 text-xs font-semibold text-warn-700 dark:text-warn-300"
                  title={`${gamification.streakDays} dage i træk`}
                >
                  <Icon name="flame" size={13} />
                  {gamification.streakDays}
                </span>
              ) : null}
              <button
                onClick={() => navigate({ name: 'profile' })}
                className="num flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white shadow-inset"
                title={`Niveau ${progress.level} · ${gamification.xp} XP`}
                aria-label={`Niveau ${progress.level}. Gå til profil`}
              >
                {progress.level}
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

      <div className={clsx(profile.onboarded && 'lg:pl-60')}>
        <main
          // key på ruten: React monterer indholdet på ny ved sideskift, så
          // indtoningen spilles forfra i stedet for kun første gang.
          key={route.name}
          className="mx-auto w-full max-w-5xl flex-1 animate-swap-in px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-10"
        >
          {children}
        </main>
      </div>

      {profile.onboarded ? (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/90 backdrop-blur-xl dark:border-white/[0.07] dark:bg-ink-950/90 lg:hidden"
          aria-label="Hovedmenu"
        >
          <div className="relative mx-auto flex max-w-lg">
            {activeIndex >= 0 ? (
              // Stregen glider hen over den aktive fane. Fanerne er lige
              // brede, så dens egen bredde er et helt fanefelt.
              <span
                className="absolute left-0 top-0 flex h-0.5 w-1/5 justify-center transition-transform duration-300 ease-spring"
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
                aria-hidden
              >
                <span className="h-full w-8 rounded-full bg-brand-500" />
              </span>
            ) : null}
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
                  <span
                    className={clsx(
                      'flex h-7 w-12 items-center justify-center transition-colors',
                      on ? 'text-brand-400' : 'text-ink-400 dark:text-ink-500',
                    )}
                  >
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className={clsx('text-2xs font-medium', on ? 'text-ink-900 dark:text-white' : 'text-ink-400 dark:text-ink-500')}>
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
