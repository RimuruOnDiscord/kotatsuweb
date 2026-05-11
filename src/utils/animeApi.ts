// ─── Types ───────────────────────────────────────────────────────────────────

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
  type?: string | null;
  season?: string | null;
  parsedSeason?: {
    season: number;
    part: number;
    parsedString: string;
    isParsed: boolean;
  } | null;
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
  startDate?: { year?: number | null; month?: number | null; day?: number | null };
  endDate?: { year?: number | null; month?: number | null; day?: number | null };
  studios?: { nodes?: Array<{ name?: string | null; isAnimationStudio?: boolean | null }> };
  tags?: Array<{ name?: string | null; rank?: number | null; isMediaSpoiler?: boolean | null }>;
  trailer?: { id?: string | null; site?: string | null; thumbnail?: string | null } | null;
  siteUrl?: string | null;
  externalLinks?: Array<{ url?: string | null; site?: string | null; type?: string | null }>;
  recommendations?: {
    nodes?: Array<{ rating?: number | null; mediaRecommendation?: AnimeResult | null }>;
  };
  relations?: {
    edges?: Array<{ relationType?: string | null; node?: AnimeResult | null }>;
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
    counts?: { sub?: number | null; dub?: number | null };
  };
  episodes?: { sub?: AnimeEpisode[]; dub?: AnimeEpisode[] };
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
  resolution?: { width?: number | null; height?: number | null };
}

export interface AnimeStreamsResponse {
  streams: AnimeStream[];
  subtitles?: { file: string; label: string }[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  download?: string | null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const MIRUO_API_BASE = '/api';

const fetchJson = async <T,>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
};

// ─── Jikan (MAL) Fallback Fields ──────────────────────────────────────────────
// Mirrors the fields in MEDIA_LIST_FIELDS from the Python backend
const ANILIST_MEDIA_LIST_FIELDS = `
  id idMal
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  format
  season
  seasonYear
  episodes
  duration
  status
  averageScore
  meanScore
  popularity
  favourites
  genres
  source
  countryOfOrigin
  isAdult
  studios(isMain: true) { nodes { name isAnimationStudio } }
  nextAiringEpisode { episode airingAt timeUntilAiring }
  startDate { year month day }
  endDate { year month day }
`;

/**
 * Maps a raw Jikan anime entry to the AnimeResult shape so the app can
 * display it even when AniList's idMal_in step also fails.
 * NOTE: `id` here is the MAL ID — the watch page handles this via slug routing.
 */
const mapJikanToAnimeResult = (d: any): AnimeResult => ({
  id: d.mal_id,
  idMal: d.mal_id,
  title: {
    romaji: d.title,
    english: d.title_english || d.title,
    native: d.title_japanese || null,
  },
  coverImage: {
    large: d.images?.jpg?.large_image_url || d.images?.jpg?.image_url || null,
    extraLarge: d.images?.jpg?.large_image_url || null,
  },
  bannerImage: null,
  format: (d.type || 'TV').toUpperCase().replace('TV (SHORT)', 'TV_SHORT'),
  status: d.status === 'Finished Airing' ? 'FINISHED'
    : d.status === 'Currently Airing' ? 'RELEASING'
    : d.status === 'Not yet aired' ? 'NOT_YET_RELEASED'
    : 'FINISHED',
  seasonYear: d.year || null,
  episodes: d.episodes || null,
  averageScore: d.score ? Math.round(d.score * 10) : null,
  meanScore: d.score ? Math.round(d.score * 10) : null,
  popularity: d.popularity || null,
  genres: (d.genres || []).map((g: any) => g.name),
  isAdult: d.rating?.includes('Rx') ?? false,
  studios: { nodes: (d.studios || []).map((s: any) => ({ name: s.name, isAnimationStudio: true })) },
  startDate: { year: d.year || null, month: null, day: null },
});

/**
 * Jikan (MyAnimeList) → AniList fallback search.
 * Used when the primary AniList search endpoint returns empty results.
 *
 * Tier 1: Jikan search → AniList idMal_in → full AniList objects with real AniList IDs ✓
 * Tier 2: If idMal_in also returns nothing → map Jikan raw data to AnimeResult shape
 *         (uses MAL ID as `id`, navigates via title slug — still works correctly)
 */
const fetchAnimeSearchViaJikan = async (query: string, limit = 20): Promise<AnimeSearchResponse> => {
  // ── Step 1: Jikan search ───────────────────────────────────────────────────
  let jikanItems: any[] = [];
  try {
    const jRes = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 25)}&sfw=true`
    );
    if (jRes.ok) {
      const jJson = await jRes.json();
      jikanItems = (jJson.data as any[]) || [];
    }
  } catch { /* Jikan unavailable — return empty */ }

  if (jikanItems.length === 0) {
    return { page: 1, perPage: limit, total: 0, hasNextPage: false, results: [] };
  }

  const malIds: number[] = jikanItems.map((d: any) => d.mal_id).filter(Boolean);

  // ── Step 2: AniList idMal_in → proper AniList IDs + full metadata ──────────
  try {
    const gql = `
      query ($ids: [Int], $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          pageInfo { total currentPage hasNextPage perPage }
          media(idMal_in: $ids, type: ANIME) {
            ${ANILIST_MEDIA_LIST_FIELDS}
          }
        }
      }
    `;
    const aRes = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { ids: malIds, perPage: malIds.length } }),
    });

    if (aRes.ok) {
      const aJson = await aRes.json();
      const pageData = aJson?.data?.Page ?? {};
      const info = pageData?.pageInfo ?? {};
      const anilistMedia = (pageData?.media ?? []) as AnimeResult[];

      if (anilistMedia.length > 0) {
        // Re-sort to match Jikan's relevance order
        const byMalId: Record<number, AnimeResult> = {};
        for (const m of anilistMedia) {
          if (m.idMal) byMalId[m.idMal] = m;
        }
        const results = malIds
          .map((id) => byMalId[id])
          .filter((m): m is AnimeResult => Boolean(m) && !m.isAdult);

        if (results.length > 0) {
          return {
            page: info.currentPage ?? 1,
            perPage: info.perPage ?? limit,
            total: info.total ?? results.length,
            hasNextPage: info.hasNextPage ?? false,
            results,
          };
        }
      }
    }
  } catch { /* AniList idMal_in failed — fall through to tier 2 */ }

  // ── Step 3 (Tier 2): Pure Jikan mapping as last resort ─────────────────────
  // IDs here are MAL IDs. Navigation works because the watch page resolves via title slug.
  console.info('[animeApi] AniList idMal_in returned nothing — using raw Jikan data as last resort');
  const results = jikanItems
    .filter((d: any) => !d.rating?.includes('Rx')) // filter adult
    .map(mapJikanToAnimeResult)
    .slice(0, limit);

  return {
    page: 1,
    perPage: limit,
    total: results.length,
    hasNextPage: false,
    results,
  };
};

// ─── Display helpers ──────────────────────────────────────────────────────────

export const getAnimeDisplayTitle = (title?: AnimeTitle): string =>
  title?.english ?? title?.romaji ?? title?.native ?? 'Untitled';

export const getAnimeCover = (entry?: Pick<AnimeResult, 'coverImage'>): string =>
  entry?.coverImage?.extraLarge ?? entry?.coverImage?.large ?? '';

export const getAnimeScore = (entry?: Pick<AnimeResult, 'averageScore' | 'meanScore'>): number | undefined => {
  const raw = entry?.averageScore ?? entry?.meanScore;
  return typeof raw === 'number' ? raw / 10 : undefined;
};

export const getAnimeStatusLabel = (status?: string | null): string => {
  switch (status) {
    case 'RELEASING':        return 'Releasing';
    case 'FINISHED':         return 'Finished';
    case 'HIATUS':           return 'Hiatus';
    case 'CANCELLED':        return 'Cancelled';
    case 'NOT_YET_RELEASED': return 'Upcoming';
    default:                 return 'Unknown';
  }
};

export const getAnimeTypeLabel = (entry?: Pick<AnimeResult, 'format' | 'type'>): string => {
  const format = (entry?.format ?? entry?.type ?? '').toUpperCase();
  switch (format) {
    case 'TV':       return 'TV';
    case 'TV_SHORT': return 'TV Short';
    case 'MOVIE':    return 'Movie';
    case 'ONA':      return 'ONA';
    case 'OVA':      return 'OVA';
    case 'SPECIAL':  return 'Special';
    case 'MUSIC':    return 'Music';
    case 'MANGA':    return 'Manga';
    case 'NOVEL':    return 'Novel';
    case 'ONE_SHOT': return 'One-Shot';
    default:
      return format
        ? format.charAt(0).toUpperCase() + format.slice(1).toLowerCase()
        : 'TV';
  }
};

// ─── API calls ────────────────────────────────────────────────────────────────

/** Keyword search – returns a list of results.
 *  Tries the backend proxy first. If AniList search is down (empty results),
 *  automatically falls back to Jikan (MAL) → AniList idMal_in lookup.
 */
export const fetchAnimeSearch = async (query: string, limit = 20): Promise<AnimeSearchResponse> => {
  try {
    const data = await fetchJson<AnimeSearchResponse>(
      `${MIRUO_API_BASE}/search?query=${encodeURIComponent(query)}&limit=${limit}`
    );
    if ((data.results?.length ?? 0) > 0) return data;
    // Primary returned empty — try Jikan fallback
    console.info('[animeApi] AniList search returned 0 results, falling back to Jikan (MAL)…');
    return await fetchAnimeSearchViaJikan(query, limit);
  } catch {
    // Primary threw — try Jikan fallback
    console.info('[animeApi] AniList search failed, falling back to Jikan (MAL)…');
    return await fetchAnimeSearchViaJikan(query, limit);
  }
};

/** Autocomplete suggestions for the search dropdown.
 *  Tries the backend proxy first. Falls back to Jikan (MAL) → AniList when empty.
 */
export const fetchAnimeSuggestions = async (
  query: string,
  signal?: AbortSignal
): Promise<{ results?: AnimeResult[] }> => {
  try {
    const data = await fetchJson<{ results?: AnimeResult[]; suggestions?: AnimeResult[] }>(
      `${MIRUO_API_BASE}/suggestions?query=${encodeURIComponent(query)}`,
      signal
    );
    // Backend may return { suggestions } or { results }
    const results = data.results ?? (data as any).suggestions ?? [];
    if (results.length > 0) return { results };
    // Primary returned empty — fall back to Jikan
    console.info('[animeApi] AniList suggestions returned 0 results, falling back to Jikan (MAL)…');
    const fallback = await fetchAnimeSearchViaJikan(query, 8);
    return { results: fallback.results };
  } catch (err: any) {
    // Propagate AbortError so callers can detect cancellation
    if (err?.name === 'AbortError') throw err;
    console.info('[animeApi] AniList suggestions failed, falling back to Jikan (MAL)…');
    const fallback = await fetchAnimeSearchViaJikan(query, 8);
    return { results: fallback.results };
  }
};

/** Search for anime produced by a specific studio using AniList GraphQL */
export const fetchAnimeByStudio = async (studioQuery: string, limit = 10, page = 1): Promise<{ results: AnimeResult[], hasNextPage: boolean }> => {
  const query = `
    query ($search: String, $perPage: Int, $mediaPage: Int, $mediaPerPage: Int) {
      Page(page: 1, perPage: $perPage) {
        studios(search: $search) {
          id
          name
          media(sort: POPULARITY_DESC, isMain: true, page: $mediaPage, perPage: $mediaPerPage) {
            pageInfo { hasNextPage }
            nodes {
              id idMal
              title { romaji english native }
              coverImage { large extraLarge }
              bannerImage format season seasonYear episodes status
              averageScore meanScore genres isAdult
              studios(isMain: true) { nodes { name isAnimationStudio } }
              startDate { year month day }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables: { search: studioQuery, perPage: 1, mediaPage: page, mediaPerPage: limit } }),
    });
    const json = await res.json();
    const studios = json?.data?.Page?.studios || [];
    const allMedia: AnimeResult[] = [];
    let hasNextPage = false;
    for (const studio of studios) {
      if (studio?.media?.pageInfo?.hasNextPage) hasNextPage = true;
      const media = studio?.media?.nodes || [];
      for (const m of media) {
        if (m && !m.isAdult && !allMedia.some(e => e.id === m.id)) {
          allMedia.push(m);
        }
      }
    }
    return { results: allMedia, hasNextPage };
  } catch {
    return { results: [], hasNextPage: false };
  }
};

export const fetchAnimeFilter = (params: URLSearchParams, signal?: AbortSignal) =>
  fetchJson<AnimeSearchResponse>(`${MIRUO_API_BASE}/filter?${params.toString()}`, signal);

export const fetchAnimeSpotlight = () =>
  fetchJson<{ results?: AnimeResult[] }>(`${MIRUO_API_BASE}/spotlight`);

export const fetchAnimePopular = (page = 1, perPage = 24) =>
  fetchJson<AnimeSearchResponse>(`${MIRUO_API_BASE}/popular?page=${page}&per_page=${perPage}`);

export const fetchAnimeInfo = (animeId: number | string) =>
  fetchJson<AnimeResult>(`${MIRUO_API_BASE}/info/${animeId}`);

export const fetchAnimeEpisodes = (animeId: number | string) =>
  fetchJson<AnimeEpisodesResponse>(`${MIRUO_API_BASE}/episodes/${animeId}`);

export const fetchAnimeStreams = (
  provider: string,
  animeId: number | string,
  category: 'sub' | 'dub',
  slug: string
) =>
  fetchJson<AnimeStreamsResponse>(
    `${MIRUO_API_BASE}/watch/${encodeURIComponent(provider)}/${animeId}/${category}/${encodeURIComponent(slug)}`
  );

export interface AnimeHybridStreamsResponse {
  videoUrl?: string;
  audioUrl?: string;
  videoCategory?: string;
  audioCategory?: string;
  subtitles?: Array<{ file: string; label?: string; kind?: string }>;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export const fetchAnimeHybridStreams = (
  provider: string,
  animeId: number | string,
  episodeId: string,
  videoCategory: 'sub' | 'dub' = 'sub',
  audioCategory: 'sub' | 'dub' = 'dub'
) =>
  fetchJson<AnimeHybridStreamsResponse>(
    `${MIRUO_API_BASE}/sources/${encodeURIComponent(provider)}/hybrid?episodeId=${encodeURIComponent(episodeId)}&anilistId=${animeId}&videoCategory=${videoCategory}&audioCategory=${audioCategory}`
  );

export const fetchRemuxStream = async (
  videoUrl: string,
  audioUrl: string,
  proxyUrl: string
): Promise<string> => {
  const b64e = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${proxyUrl}/remux?videoUrl=${b64e(videoUrl)}&audioUrl=${b64e(audioUrl)}`;
};

// ─── Provider helpers ─────────────────────────────────────────────────────────

export const getPreferredAnimeProvider = (
  providers?: Record<string, AnimeWatchProviderPayload>
): string | null => {
  if (!providers) return null;
  const entries = Object.entries(providers);
  if (entries.length === 0) return null;
  const withSub = entries.find(([, p]) => (p.episodes?.sub?.length ?? 0) > 0);
  return withSub?.[0] ?? entries[0][0];
};

export const getProviderEpisodes = (
  response: AnimeEpisodesResponse | null,
  provider: string,
  category: 'sub' | 'dub'
): AnimeEpisode[] =>
  response?.providers?.[provider]?.episodes?.[category] ?? [];

export const getEpisodeSlug = (episodeId: string): string =>
  episodeId.split('/').pop() ?? episodeId;
