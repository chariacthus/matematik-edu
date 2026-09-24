import { useEffect, useState } from 'react';

/**
 * En meget lille hash-router.
 *
 * Appen har ti skærme og ingen behov for indlejrede ruter eller
 * data-loaders, så et routing-bibliotek ville koste mere end det gav.
 * Hash-ruter gør desuden at appen kan hostes som rene statiske filer
 * uden serveropsætning.
 */

export type Route =
  | { name: 'dashboard' }
  | { name: 'onboarding' }
  | { name: 'diagnose' }
  | { name: 'lesson'; skillId: string }
  | { name: 'library' }
  | { name: 'domain'; domainId: string }
  | { name: 'practice'; skillId: string }
  | { name: 'review' }
  | { name: 'exam' }
  | { name: 'profile' }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);

  switch (parts[0]) {
    case undefined:
    case '':
      return { name: 'dashboard' };
    case 'start':
      return { name: 'onboarding' };
    case 'diagnose':
      return { name: 'diagnose' };
    case 'laer':
      return parts[1] ? { name: 'lesson', skillId: parts[1] } : { name: 'library' };
    case 'bibliotek':
      return parts[1] ? { name: 'domain', domainId: parts[1] } : { name: 'library' };
    case 'traen':
      // Træning ligger nu under Emner. Et gammelt link uden færdighed
      // lander der.
      return parts[1] ? { name: 'practice', skillId: parts[1] } : { name: 'library' };
    case 'repeter':
      return { name: 'review' };
    case 'proeve':
      return { name: 'exam' };
    case 'profil':
      return { name: 'profile' };
    case 'indstillinger':
      return { name: 'settings' };
    default:
      return { name: 'dashboard' };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'dashboard':
      return '#/';
    case 'onboarding':
      return '#/start';
    case 'diagnose':
      return '#/diagnose';
    case 'lesson':
      return `#/laer/${encodeURIComponent(route.skillId)}`;
    case 'library':
      return '#/bibliotek';
    case 'domain':
      return `#/bibliotek/${encodeURIComponent(route.domainId)}`;
    case 'practice':
      return `#/traen/${encodeURIComponent(route.skillId)}`;
    case 'review':
      return '#/repeter';
    case 'exam':
      return '#/proeve';
    case 'profile':
      return '#/profil';
    case 'settings':
      return '#/indstillinger';
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      // Nye skærme skal starte i toppen — ellers lander eleven midt i en
      // opgave fordi den forrige side var scrollet ned.
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
