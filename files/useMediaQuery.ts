import { useState, useEffect } from 'react';

/**
 * Reactive wrapper around `window.matchMedia`.
 *
 * @example
 *   const isMobile = useMediaQuery('(max-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    // Sync in case the query changed between render and effect
    if (media.matches !== matches) setMatches(media.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
    // Intentionally omit `matches` – we only want to re-subscribe when the query string changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}
