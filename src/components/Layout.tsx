import { type ReactNode, useEffect } from 'react';
import clsx from 'clsx';
import { hrefFor, navigate, type Route } from '../lib/router';
import { useStore } from '../state/store';
import { levelProgress, levelTitle } from '../engine/gamification';
import { ProgressBar } from './ui';

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: { name: 'dashboard' }, label: 'I dag', icon: '◎' },
  { route: { name: 'library' }, label: 'Bibliotek', icon: '☰' },
  { route: { name: 'practice' }, label: 'Træn', icon: '✎' },
  { route: { name: 'profile' }, label: 'Profil', icon: '◈' },
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

  const isActive = (r: Route) =>
    r.name === route.name ||
    (r.name === 'library' && (route.name === 'domain' || route.name === 'lesson'));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-ink-50/85 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
          <a href={hrefFor({ name: 'dashboard' })} className="flex shrink-0 items-center gap-2 font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 font-serif text-lg text-white" aria-hidden>
              π
            </span>
            <span className="hidden sm:inline">MatematikAI</span>
          </a>

          <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Hovedmenu">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={hrefFor(item.route)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
                  isActive(item.route)
                    ? 'bg-brand-600 text-white'
                    : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                )}
                aria-current={isActive(item.route) ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {profile.onboarded ? (
            <div className="ml-auto flex items-center gap-3 sm:ml-2">
              {gamification.streakDays > 0 ? (
                <span className="chip bg-warn-100 text-warn-700 dark:bg-warn-900/40 dark:text-warn-200" title={`${gamification.streakDays} dage i træk`}>
                  🔥 {gamification.streakDays}
                </span>
              ) : null}
              <button
                onClick={() => navigate({ name: 'profile' })}
                className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-ink-100 dark:hover:bg-ink-800"
                title={`${levelTitle(progress.level)} — ${gamification.xp} XP`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-600 text-xs font-extrabold text-white">
                  {progress.level}
                </span>
                <span className="hidden w-20 md:block">
                  <ProgressBar value={progress.percent} size="sm" tone="accent" label="Fremgang mod næste niveau" />
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-5 sm:pb-12">{children}</main>

      {/* Mobilnavigation i bunden — tommelfingervenlig */}
      {profile.onboarded ? (
        <nav
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/95 sm:hidden"
          aria-label="Hovedmenu"
        >
          <div className="mx-auto flex max-w-lg">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={hrefFor(item.route)}
                className={clsx(
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold',
                  isActive(item.route) ? 'text-brand-600 dark:text-brand-300' : 'text-ink-500 dark:text-ink-400',
                )}
                aria-current={isActive(item.route) ? 'page' : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
