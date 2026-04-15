export interface BookmarkEntry {
  malId: number;
  title: string;
  cover?: string;
  type?: string;
  status?: string;
  score?: number;
  author?: string;
  year?: number;
  updatedAt: number;
}

export const BOOKMARKS_STORAGE_KEY = 'mangavel:bookmarks';

const isBookmarkEntry = (value: unknown): value is BookmarkEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<BookmarkEntry>;
  return typeof entry.malId === 'number' && typeof entry.title === 'string' && typeof entry.updatedAt === 'number';
};

export const readBookmarks = (): BookmarkEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBookmarkEntry) : [];
  } catch {
    return [];
  }
};

export const writeBookmarks = (entries: BookmarkEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(entries));
};

export const isBookmarked = (malId: number, entries?: BookmarkEntry[]) => {
  const bookmarkEntries = entries ?? readBookmarks();
  return bookmarkEntries.some((entry) => entry.malId === malId);
};

export const toggleBookmark = (entry: Omit<BookmarkEntry, 'updatedAt'>) => {
  const existing = readBookmarks();
  const alreadyBookmarked = existing.some((bookmark) => bookmark.malId === entry.malId);

  const nextEntries = alreadyBookmarked
    ? existing.filter((bookmark) => bookmark.malId !== entry.malId)
    : [{ ...entry, updatedAt: Date.now() }, ...existing].sort((left, right) => right.updatedAt - left.updatedAt);

  if (nextEntries.length > 0) {
    writeBookmarks(nextEntries);
  } else if (typeof window !== 'undefined') {
    window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  }

  return {
    nextEntries,
    bookmarked: !alreadyBookmarked,
  };
};

export const removeBookmark = (malId: number) => {
  const nextEntries = readBookmarks().filter((entry) => entry.malId !== malId);

  if (nextEntries.length > 0) {
    writeBookmarks(nextEntries);
  } else if (typeof window !== 'undefined') {
    window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY);
  }

  return nextEntries;
};
