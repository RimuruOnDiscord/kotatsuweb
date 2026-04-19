import { ContentMode } from './contentMode';

export interface ContinueReadingEntry {
  kind: 'manga';
  mangaId: string;
  chapterId: string;
  mangaTitle: string;
  mangaCover?: string;
  chapterTitle: string;
  pageIndex: number;
  totalPages: number;
  href: string;
  updatedAt: number;
}

export interface ContinueWatchingEntry {
  kind: 'anime';
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string;
  episodeNumber?: number;
  episodeTitle: string;
  currentTime?: number;
  duration?: number;
  href: string;
  updatedAt: number;
}

export type ContinueEntry = ContinueReadingEntry | ContinueWatchingEntry;

export const getContinueStorageKey = (mode: ContentMode) =>
  mode === 'anime' ? 'mangavel:continue-watching' : 'mangavel:continue-reading';

const isContinueReadingEntry = (value: unknown): value is ContinueReadingEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ContinueReadingEntry>;
  return (
    entry.kind === 'manga' &&
    typeof entry.mangaId === 'string' &&
    typeof entry.chapterId === 'string' &&
    typeof entry.mangaTitle === 'string' &&
    typeof entry.chapterTitle === 'string' &&
    typeof entry.href === 'string' &&
    typeof entry.updatedAt === 'number'
  );
};

const isContinueWatchingEntry = (value: unknown): value is ContinueWatchingEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<ContinueWatchingEntry>;
  return (
    entry.kind === 'anime' &&
    typeof entry.animeId === 'string' &&
    typeof entry.episodeId === 'string' &&
    typeof entry.animeTitle === 'string' &&
    typeof entry.episodeTitle === 'string' &&
    typeof entry.href === 'string' &&
    typeof entry.updatedAt === 'number'
  );
};

export const readContinueEntries = (mode: ContentMode): ContinueEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(getContinueStorageKey(mode));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return mode === 'anime'
      ? parsed.filter(isContinueWatchingEntry)
      : parsed.filter(isContinueReadingEntry);
  } catch {
    return [];
  }
};

export const writeContinueEntries = (mode: ContentMode, entries: ContinueEntry[]) => {
  if (typeof window === 'undefined') return;
  const key = getContinueStorageKey(mode);

  if (entries.length === 0) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(entries));
};

export const removeContinueEntry = (mode: ContentMode, seriesId: string) => {
  const nextEntries = readContinueEntries(mode).filter((entry) =>
    mode === 'anime' ? entry.animeId !== seriesId : entry.mangaId !== seriesId
  );
  writeContinueEntries(mode, nextEntries);
  return nextEntries;
};

export const upsertContinueEntry = (
  mode: ContentMode,
  entry: ContinueEntry,
  limit = 8
) => {
  const nextEntries = [
    entry,
    ...readContinueEntries(mode).filter((existing) =>
      mode === 'anime'
        ? existing.kind === 'anime' && existing.animeId !== entry.animeId
        : existing.kind === 'manga' && existing.mangaId !== entry.mangaId
    ),
  ].slice(0, limit);

  writeContinueEntries(mode, nextEntries);
  return nextEntries;
};
