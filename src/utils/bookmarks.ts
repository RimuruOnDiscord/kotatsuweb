import { ContentMode, getStoredContentMode } from './contentMode';

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
  originLabel?: string; // New field for the source/origin of the entry
}

export const BOOKMARKS_STORAGE_KEY = 'mangavel:bookmarks';
export const ANIME_BOOKMARKS_STORAGE_KEY = 'mangavel:anime-bookmarks';
export const ANIME_FOLLOWS_STORAGE_KEY = 'mangavel:anime-follows';

export const getBookmarksStorageKey = (mode: ContentMode = getStoredContentMode()) =>
  mode === 'anime' ? ANIME_BOOKMARKS_STORAGE_KEY : BOOKMARKS_STORAGE_KEY;

const isBookmarkEntry = (value: unknown): value is BookmarkEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<BookmarkEntry>;
  return typeof entry.malId === 'number' && typeof entry.title === 'string' && typeof entry.updatedAt === 'number';
};

export const readBookmarks = (): BookmarkEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getBookmarksStorageKey());
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBookmarkEntry) : [];
  } catch {
    return [];
  }
};

export const writeBookmarks = (entries: BookmarkEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getBookmarksStorageKey(), JSON.stringify(entries));
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
    window.localStorage.removeItem(getBookmarksStorageKey());
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
    window.localStorage.removeItem(getBookmarksStorageKey());
  }

  return nextEntries;
};

export const readFollows = (): BookmarkEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ANIME_FOLLOWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isBookmarkEntry) : [];
  } catch {
    return [];
  }
};

export const writeFollows = (entries: BookmarkEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ANIME_FOLLOWS_STORAGE_KEY, JSON.stringify(entries));
};

export const isFollowed = (malId: number, entries?: BookmarkEntry[]) => {
  const followEntries = entries ?? readFollows();
  return followEntries.some((entry) => entry.malId === malId);
};

export const toggleFollow = (entry: Omit<BookmarkEntry, 'updatedAt'>) => {
  const existing = readFollows();
  const alreadyFollowed = existing.some((f) => f.malId === entry.malId);
  const nextEntries = alreadyFollowed
    ? existing.filter((f) => f.malId !== entry.malId)
    : [{ ...entry, updatedAt: Date.now() }, ...existing].sort((a, b) => b.updatedAt - a.updatedAt);
  
  if (nextEntries.length > 0) writeFollows(nextEntries);
  else if (typeof window !== 'undefined') window.localStorage.removeItem(ANIME_FOLLOWS_STORAGE_KEY);
  
  return { nextEntries, followed: !alreadyFollowed };
};
