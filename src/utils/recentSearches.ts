export interface RecentSearchResult {
  id: string | number;
  title: string;
  cover: string;
}

export interface RecentSearchEntry {
  query: string;
  updatedAt: number;
  /** The anime/result the user actually clicked on from this search */
  result?: RecentSearchResult;
}

const RECENT_SEARCHES_KEY = 'kotatsutv:recent-searches';
const MAX_RECENT_SEARCHES = 8;

const normalizeQuery = (query: string) => query.trim().replace(/\s+/g, ' ');

export const readRecentSearches = (): RecentSearchEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((entry): entry is RecentSearchEntry =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.query === 'string' &&
        typeof entry.updatedAt === 'number'
      )
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
};

export const saveRecentSearch = (query: string, result?: RecentSearchResult) => {
  if (typeof window === 'undefined') return [];

  const normalized = normalizeQuery(query);
  if (!normalized) return readRecentSearches();

  const existing = readRecentSearches();
  const prev = existing.find(
    (entry) => entry.query.toLowerCase() === normalized.toLowerCase()
  );

  const next = [
    {
      query: normalized,
      updatedAt: Date.now(),
      // Keep previous result if no new one provided (e.g. on Enter-to-browse)
      result: result || prev?.result,
    },
    ...existing.filter(
      (entry) => entry.query.toLowerCase() !== normalized.toLowerCase()
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('recent-searches-changed'));
  return next;
};

export const clearRecentSearch = (query: string) => {
  if (typeof window === 'undefined') return [];

  const normalized = normalizeQuery(query).toLowerCase();
  const next = readRecentSearches().filter(
    (entry) => entry.query.toLowerCase() !== normalized
  );
  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('recent-searches-changed'));
  return next;
};
