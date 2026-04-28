import { containsNovelToken, isAllowedSeriesType } from './contentFilters';

export type ReaderSourceKey =
  | 'mangapill'
  | 'asurascans'
  | 'mangakakalot'
  | 'manganato'
  | 'batoto'
  | 'webtoon';

export interface ReaderChapter {
  id: string;
  title: string;
  date?: string;
  chapterNumber?: string;
  volume?: string;
}

export interface ReaderSourceDefinition {
  key: ReaderSourceKey;
  label: string;
  implemented: boolean;
  iconText: string;
  iconClassName: string;
}

export interface ResolvedReaderSource extends ReaderSourceDefinition {
  status: 'available' | 'unavailable';
  message: string;
  mangaId?: string;
  mangaTitle?: string;
  mangaCover?: string;
  chapters: ReaderChapter[];
}

export interface ReaderPayload {
  sourceKey: ReaderSourceKey;
  sourceLabel: string;
  mangaId: string;
  mangaTitle: string;
  mangaCover: string;
  chapters: ReaderChapter[];
  pages: string[];
}

interface ScraperSearchResult {
  id: string;
  title: string;
  image?: string;
  type?: string;
}

interface ScraperChapterEntry {
  id: string;
  title: string;
  date?: string;
}

interface ScraperInfoPayload {
  results?: {
    id?: string;
    title?: string;
    image?: string;
    type?: string;
    chapters?: ScraperChapterEntry[];
  };
}

const SCRAPER_API_BASE = '/manga-scrapers';
const DEFAULT_READER_SOURCE: ReaderSourceKey = 'mangapill';
const UNAVAILABLE_MESSAGE = 'Not wired into this build yet';

export { DEFAULT_READER_SOURCE };

export const READER_SOURCE_DEFINITIONS: ReaderSourceDefinition[] = [
  {
    key: 'mangapill',
    label: 'Mangapill',
    implemented: true,
    iconText: 'MP',
    iconClassName: 'border border-emerald-500/20 bg-emerald-500/12 text-emerald-300',
  },
  {
    key: 'asurascans',
    label: 'AsuraScans',
    implemented: true,
    iconText: 'AS',
    iconClassName: 'border border-orange-500/20 bg-orange-500/12 text-orange-300',
  },
  {
    key: 'mangakakalot',
    label: 'Mangakakalot',
    implemented: false,
    iconText: 'MK',
    iconClassName: 'border border-sky-500/20 bg-sky-500/12 text-sky-300',
  },
  {
    key: 'manganato',
    label: 'MangaDex',
    implemented: false,
    iconText: 'MD',
    iconClassName: 'border border-rose-500/20 bg-rose-500/12 text-rose-300',
  },
  {
    key: 'batoto',
    label: 'MangaFire',
    implemented: false,
    iconText: 'MF',
    iconClassName: 'border border-amber-500/20 bg-amber-500/12 text-amber-300',
  },
  {
    key: 'webtoon',
    label: 'Webtoon',
    implemented: false,
    iconText: 'WT',
    iconClassName: 'border border-lime-500/20 bg-lime-500/12 text-lime-300',
  },
];

const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const getChapterSortValue = (value: string) => {
  const match = value.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
};

const ensureReadingOrder = (chapters: ReaderChapter[]) => {
  if (chapters.length < 2) return chapters;

  const firstValue = getChapterSortValue(chapters[0].chapterNumber || chapters[0].title);
  const lastValue = getChapterSortValue(chapters[chapters.length - 1].chapterNumber || chapters[chapters.length - 1].title);

  if (Number.isFinite(firstValue) && Number.isFinite(lastValue) && firstValue > lastValue) {
    return [...chapters].reverse();
  }

  return chapters;
};

const buildUnavailableSource = (definition: ReaderSourceDefinition, message: string): ResolvedReaderSource => ({
  ...definition,
  status: 'unavailable',
  message,
  chapters: [],
});

const buildAvailableSource = (
  definition: ReaderSourceDefinition,
  mangaId: string,
  mangaTitle: string,
  mangaCover: string,
  chapters: ReaderChapter[]
): ResolvedReaderSource => ({
  ...definition,
  status: 'available',
  message: `${chapters.length} chapters available`,
  mangaId,
  mangaTitle,
  mangaCover,
  chapters,
});

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} for ${url}`);
  }

  return response.json() as Promise<T>;
};

const pickBestSearchMatch = (results: ScraperSearchResult[], title: string) => {
  const target = sanitize(title);

  return [...results].sort((a, b) => {
    const score = (entry: ScraperSearchResult) => {
      const normalizedTitle = sanitize(entry.title || '');
      const normalizedId = sanitize(entry.id.split('/').pop() || '');

      if (!normalizedTitle && !normalizedId) return -1;
      if (normalizedTitle === target || normalizedId === target) return 5;
      if (normalizedTitle.startsWith(target) || target.startsWith(normalizedTitle)) return 4;
      if (normalizedTitle.includes(target) || normalizedId.includes(target)) return 3;
      if (sanitize(entry.title).includes(target.slice(0, Math.max(3, target.length - 2)))) return 2;
      return 0;
    };

    return score(b) - score(a);
  })[0];
};

const normalizeScraperChapters = (chapters: ScraperChapterEntry[]) =>
  ensureReadingOrder(
    chapters.map((chapter) => {
      const chapterNumberMatch = chapter.title.match(/(\d+(\.\d+)?)/);

      return {
        id: chapter.id,
        title: chapter.title.trim() || 'Untitled Chapter',
        date: chapter.date,
        chapterNumber: chapterNumberMatch ? chapterNumberMatch[1] : undefined,
      };
    })
  );

const resolveScraperSource = async (sourceKey: 'mangapill' | 'asurascans', title: string): Promise<ResolvedReaderSource> => {
  const definition = getReaderSourceDefinition(sourceKey);

  try {
    const searchData = await fetchJson<{ results?: ScraperSearchResult[] }>(
      `${SCRAPER_API_BASE}/${sourceKey}/search/${encodeURIComponent(title)}`
    );
    const searchResults = (Array.isArray(searchData.results) ? searchData.results : []).filter((entry) => {
      if (!isAllowedSeriesType(entry.type)) return false;
      if (containsNovelToken(entry.title) || containsNovelToken(entry.id)) return false;
      return true;
    });
    const bestMatch = pickBestSearchMatch(searchResults, title);

    if (!bestMatch) {
      return buildUnavailableSource(definition, 'No readable match found');
    }

    const infoData = await fetchJson<ScraperInfoPayload>(
      `${SCRAPER_API_BASE}/${sourceKey}/info/${encodeURIComponent(bestMatch.id)}`
    );
    const details = infoData.results;
    const normalizedTitle = details?.title || bestMatch.title;

    if (!normalizedTitle || containsNovelToken(normalizedTitle) || !isAllowedSeriesType(details?.type || bestMatch.type)) {
      return buildUnavailableSource(definition, 'Source match was filtered out');
    }

    const chapters = normalizeScraperChapters(Array.isArray(details?.chapters) ? details.chapters : []);

    if (chapters.length === 0 || !details?.id) {
      return buildUnavailableSource(definition, 'Matched, but no chapters were returned');
    }

    return buildAvailableSource(definition, details.id, normalizedTitle, details.image || bestMatch.image || '', chapters);
  } catch (error) {
    console.error(`${definition.label} resolve failed:`, error);
    return buildUnavailableSource(definition, 'Source lookup failed');
  }
};

const fetchScraperReaderPayload = async (sourceKey: 'mangapill' | 'asurascans', mangaId: string, chapterId: string): Promise<ReaderPayload> => {
  const definition = getReaderSourceDefinition(sourceKey);
  const infoData = await fetchJson<ScraperInfoPayload>(`${SCRAPER_API_BASE}/${sourceKey}/info/${encodeURIComponent(mangaId)}`);
  const details = infoData.results;
  const pagesData = await fetchJson<{ results?: string[] }>(`${SCRAPER_API_BASE}/${sourceKey}/pages/${encodeURIComponent(chapterId)}`);

  return {
    sourceKey,
    sourceLabel: definition.label,
    mangaId,
    mangaTitle: details?.title || 'Manga Online',
    mangaCover: details?.image || '',
    chapters: normalizeScraperChapters(Array.isArray(details?.chapters) ? details.chapters : []),
    pages: Array.isArray(pagesData.results) ? pagesData.results : [],
  };
};

export const getReaderSourceDefinition = (sourceKey: ReaderSourceKey) =>
  READER_SOURCE_DEFINITIONS.find((definition) => definition.key === sourceKey)
  || READER_SOURCE_DEFINITIONS[0];

export const normalizeReaderSourceKey = (value?: string | null): ReaderSourceKey | null => {
  if (!value) return null;

  const normalized = value.toLowerCase();
  return READER_SOURCE_DEFINITIONS.find((definition) => definition.key === normalized)?.key || null;
};

export const buildReaderHref = (mangaId: string, chapterId: string, sourceKey: ReaderSourceKey) =>
  `/read/${encodeURIComponent(mangaId)}/chapter/${encodeURIComponent(chapterId)}?source=${encodeURIComponent(sourceKey)}`;

export const getPreferredReaderSource = (sources: ResolvedReaderSource[], requestedSourceKey?: ReaderSourceKey | null) => {
  if (requestedSourceKey) {
    const requestedSource = sources.find((source) => source.key === requestedSourceKey && source.status === 'available');
    if (requestedSource) return requestedSource;
  }

  const defaultSource = sources.find((source) => source.key === DEFAULT_READER_SOURCE && source.status === 'available');
  if (defaultSource) return defaultSource;

  return sources.find((source) => source.status === 'available') || null;
};

export const resolveReaderSourceCatalog = async (title: string) => {
  const resolvedSources = await Promise.all(
    READER_SOURCE_DEFINITIONS.map(async (definition) => {
      if (!definition.implemented) {
        return buildUnavailableSource(definition, UNAVAILABLE_MESSAGE);
      }

      if (definition.key === 'mangapill' || definition.key === 'asurascans') {
        return resolveScraperSource(definition.key, title);
      }

      return buildUnavailableSource(definition, UNAVAILABLE_MESSAGE);
    })
  );

  return resolvedSources;
};

export const fetchReaderPayload = async (sourceKey: ReaderSourceKey, mangaId: string, chapterId: string): Promise<ReaderPayload> => {
  if (sourceKey === 'mangapill' || sourceKey === 'asurascans') {
    return fetchScraperReaderPayload(sourceKey, mangaId, chapterId);
  }

  throw new Error(`Reader source ${sourceKey} is unavailable`);
};
