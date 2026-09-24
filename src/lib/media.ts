import { useEffect, useState } from 'react';

/**
 * Lytter på en media query.
 *
 * Bruges til layout der ikke kan laves med CSS alene — færdighedskortet
 * skal fx vende retning på en telefon, og det kræver at komponenten ved
 * hvor bred skærmen er.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Sandt på telefonbredde. */
export const useIsNarrow = () => useMediaQuery('(max-width: 639px)');

/** Sandt når skærmen styres med en finger. */
export const useIsTouch = () => useMediaQuery('(pointer: coarse)');
