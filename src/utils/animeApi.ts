export interface AnimeTitle {
  romaji?: string | null;
  english?: string | null;
  native?: string | null;
}

export interface AnimeResult {
  id: number;
  idMal?: number | null;
  title: AnimeTitle;
  description?: string | null;
  coverImage?: {
    large?: string | null;
    extraLarge?: string | null;
    color?: string | null;
  };
  bannerImage?: string | null;
  format?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  status?: string | null;
  averageScore?: number | null;
  meanScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  genres?: string[];
  source?: string | null;
  countryOfOrigin?: string | null;
  isAdult?: boolean;
  nextAiringEpisode?: {
    episode?: number | null;
    airingAt?: number | null;
    timeUntilAiring?: number | null;
  } | null;
  startDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  };
  endDate?: {
    year?: number | null;
    month?: number | null;
    day?: number | null;
  };
  studios?: {
    nodes?: Array<{ name?: string | null; isAnimationStudio?: boolean | null }>;
  };
  tags?: Array<{ name?: string | null; rank?: number | null; isMediaSpoiler?: boolean | null }>;
  trailer?: {
    id?: string | null;
    site?: string | null;
    thumbnail?: string | null;
  } | null;
  siteUrl?: string | null;
  externalLinks?: Array<{ url?: string | null; site?: string | null; type?: string | null }>;
  recommendations?: {
    nodes?: Array<{
      rating?: number | null;
      mediaRecommendation?: AnimeResult | null;
    }>;
  };
  relations?: {
    edges?: Array<{
      relationType?: string | null;
      node?: AnimeResult | null;
    }>;
  };
  characters?: {
    edges?: Array<{
      role?: string | null;
      node?: {
        id?: number | null;
        name?: { full?: string | null; native?: string | null };
        image?: { large?: string | null; medium?: string | null };
      } | null;
      voiceActors?: Array<{
        id?: number | null;
        name?: { full?: string | null; native?: string | null };
        image?: { large?: string | null };
        languageV2?: string | null;
      }>;
    }>;
  };
  staff?: {
    edges?: Array<{
      role?: string | null;
      node?: {
        id?: number | null;
        name?: { full?: string | null; native?: string | null };
        image?: { large?: string | null };
      } | null;
    }>;
  };
}

export interface AnimeSearchResponse {
  page: number;
  perPage: number;
  total: number;
  hasNextPage: boolean;
  results: AnimeResult[];
}

export interface AnimeEpisode {
  id: string;
  number?: number | null;
  title?: string | null;
  image?: string | null;
  airDate?: string | null;
  duration?: number | null;
  audio?: string | null;
  description?: string | null;
  filler?: boolean | null;
  uncensored?: boolean | null;
}

export interface AnimeWatchProviderPayload {
  meta?: {
    id?: string | null;
    title?: string | null;
    poster?: string | null;
    details?: {
      episodes?: string | null;
      status?: string | null;
      premiered?: string | null;
      duration?: string | null;
      studios?: string[];
    };
    counts?: {
      sub?: number | null;
      dub?: number | null;
    };
  };
  episodes?: {
    sub?: AnimeEpisode[];
    dub?: AnimeEpisode[];
  };
}

export interface AnimeEpisodesResponse {
  mappings?: {
    aniId?: number | null;
    malId?: number | null;
    providers?: Record<string, unknown>;
  };
  providers?: Record<string, AnimeWatchProviderPayload>;
}

export interface AnimeStream {
  url: string;
  type?: string | null;
  quality?: string | null;
  codec?: string | null;
  audio?: string | null;
  fansub?: string | null;
  isActive?: boolean | null;
  referer?: string | null;
  resolution?: {
    width?: number | null;
    height?: number | null;
  };
}

export interface AnimeStreamsResponse {
  streams: AnimeStream[];
  subtitles?: { file: string; label: string }[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  download?: string | null;
}

// --- CONFIG ---
const MIRUO_API_BASE = '/api';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
};

export const getAnimeDisplayTitle = (title?: AnimeTitle) =>
  title?.english || title?.romaji || title?.native || 'Untitled';

export const getAnimeCover = (entry?: Pick<AnimeResult, 'coverImage'>) =>
  entry?.coverImage?.extraLarge || entry?.coverImage?.large || '';

export const getAnimeScore = (entry?: Pick<AnimeResult, 'averageScore' | 'meanScore'>) => {
  const rawScore = entry?.averageScore ?? entry?.meanScore;
  return typeof rawScore === 'number' ? rawScore / 10 : undefined;
};

export const getAnimeStatusLabel = (status?: string | null) => {
  switch (status) {
    case 'RELEASING': return 'Releasing';
    case 'FINISHED': return 'Finished';
    case 'HIATUS': return 'Hiatus';
    case 'CANCELLED': return 'Cancelled';
    case 'NOT_YET_RELEASED': return 'Upcoming';
    default: return 'Unknown';
  }
};

export const getAnimeTypeLabel = (entry?: Pick<AnimeResult, 'format' | 'episodes'>) => {
  const episodeCount = entry?.episodes;
  if (typeof episodeCount === 'number' && episodeCount > 1) {
    return episodeCount >= 24 ? '2 Seasons' : '1 Season';
  }
  if (episodeCount === 1) return 'Feature';

  switch (entry?.format) {
    case 'MOVIE': return 'Movie';
    case 'ONA': return 'ONA';
    case 'OVA': return 'OVA';
    case 'SPECIAL': return 'Special';
    case 'MUSIC': return 'Music';
    default: return 'Series';
  }
};

// --- STANDARD FETCHES (Uses Local /api) ---

export const fetchAnimeSearch = async (searchString: string, limit: number = 20) => {
  const res = await fetch(`/api/search?query=${searchString}&limit=${limit}`);
  return res.json();
};

export const fetchAnimeSuggestions = (query: string) =>
  fetchJson<{ results?: AnimeResult[] }>(
    `${MIRUO_API_BASE}/suggestions?query=${encodeURIComponent(query)}`
  );

export const fetchAnimeFilter = async (params: URLSearchParams, signal?: AbortSignal) => {
  const response = await fetch(`${MIRUO_API_BASE}/filter?${params.toString()}`, { signal });
  return response.json();
};

export const fetchAnimeSpotlight = () =>
  fetchJson<{ results?: AnimeResult[] }>(`${MIRUO_API_BASE}/spotlight`);

export const fetchAnimePopular = (page = 1, perPage = 24) =>
  fetchJson<AnimeSearchResponse>(`${MIRUO_API_BASE}/popular?page=${page}&per_page=${perPage}`);

export const fetchAnimeInfo = (animeId: number | string) =>
  fetchJson<AnimeResult>(`${MIRUO_API_BASE}/info/${animeId}`);

export const fetchAnimeEpisodes = (animeId: number | string) =>
  fetchJson<AnimeEpisodesResponse>(`${MIRUO_API_BASE}/episodes/${animeId}`);

// --- STREAM FETCH ---

export const fetchAnimeStreams = (
  provider: string,
  animeId: number | string,
  category: 'sub' | 'dub',
  slug: string
) =>
  fetchJson<AnimeStreamsResponse>(
    `${MIRUO_API_BASE}/watch/${encodeURIComponent(provider)}/${animeId}/${category}/${encodeURIComponent(slug)}`
  );

// --- HELPERS ---

export const getPreferredAnimeProvider = (providers?: Record<string, AnimeWatchProviderPayload>) => {
  if (!providers) return null;
  const entries = Object.entries(providers);
  if (entries.length === 0) return null;
  const providerWithSub = entries.find(([, payload]) => (payload.episodes?.sub?.length || 0) > 0);
  return providerWithSub?.[0] || entries[0][0];
};

export const getProviderEpisodes = (
  response: AnimeEpisodesResponse | null,
  provider: string,
  category: 'sub' | 'dub'
) => response?.providers?.[provider]?.episodes?.[category] || [];

export const getEpisodeSlug = (episodeId: string) => episodeId.split('/').pop() || episodeId;