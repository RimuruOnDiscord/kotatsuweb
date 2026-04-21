import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Star, Tag, User, Loader2, Bookmark, Languages,
  Info, Search, ArrowDownUp, BookOpen,
  Users, Link2, MessageSquare, Trophy, TrendingUp, Heart,
  Calendar, Library, Play, ExternalLink, Film, Tv
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { handleRippleMouseDown } from '../utils/ripple';
import { isBookmarked, readBookmarks, toggleBookmark } from '../utils/bookmarks';
import {
  AnimeEpisode,
  AnimeWatchProviderPayload,
  fetchAnimeEpisodes,
  getEpisodeSlug,
  getPreferredAnimeProvider,
  getProviderEpisodes,
} from '../utils/animeApi';

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const genreToParam = (genre: string) => genre.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const createSlug = (title: string) => {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const getEpisodeHref = (animeSlugOrId: string | number, provider: string, category: 'sub' | 'dub', episodeId: string) =>
  `/watch/${animeSlugOrId}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(getEpisodeSlug(episodeId))}`;

interface RelatedAnime {
  id: number;
  title: string;
  slug: string;
  format: string;
  relationType: string;
}

interface ProviderSeason {
  title?: string;
  poster?: string;
  url?: string;
  episodes?: number;
}

interface AnimeData {
  mal_id: number;
  anilist_id?: number;
  title: string;
  title_english?: string;
  title_romaji?: string;
  title_japanese?: string;
  synopsis?: string;
  episodes?: number;
  duration?: number;
  score?: number;
  status?: string;
  type?: string;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  season?: string;
  seasonYear?: number;
  published?: { string: string };
  studios?: { name: string }[];
  genres?: { mal_id: number; name: string }[];
  images: { jpg: { image_url: string; large_image_url: string } };
  bannerImage?: string;
  externalLinks?: { site: string; url: string }[];
  relations?: RelatedAnime[];
  franchise?: RelatedAnime[];
}

interface ContinueWatchingData {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string;
  episodeTitle: string;
  episodeNumber: number;
  href: string;
  updatedAt: number;
}

interface Recommendation {
  entry: { id: number; title: string; images: { jpg: { image_url: string } }; };
}

interface Review {
  id: number;
  user: { username: string; images: { jpg: { image_url: string } }; };
  score: number; review: string; is_spoiler: boolean; date: string; url?: string;
}

interface AniListSupplement {
  characters: Array<{ id: number; name: string; role: string; image?: string | null; }>;
}

type SortOrder = 'desc' | 'asc';

// Helper to gracefully handle 429 Too Many Requests
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status === 429) {
      await new Promise(r => setTimeout(r, 800)); // wait 800ms and retry
      continue;
    }
    return res;
  }
  return fetch(url, options);
};

const ANILIST_SEARCH_QUERY = `
  query SearchAnime($search: String, $id: Int, $idMal: Int, $sort: [MediaSort]) {
    Media(search: $search, id: $id, idMal: $idMal, type: ANIME, sort: $sort) {
      id idMal title { romaji english native userPreferred } description(asHtml: false) bannerImage episodes duration season seasonYear meanScore status(version: 2) format rankings { rank type } popularity favourites startDate { year month day } endDate { year month day } genres studios(isMain: true) { edges { node { name } } } externalLinks { site url } coverImage { extraLarge large } characters(perPage: 6, sort:[ROLE, RELEVANCE, ID]) { edges { role node { id name { full userPreferred } image { large medium } } } } recommendations(perPage: 6, sort: [RATING_DESC]) { edges { node { mediaRecommendation { id idMal title { userPreferred } coverImage { large } } } } } reviews(perPage: 4, sort: [SCORE_DESC]) { edges { node { id summary body(asHtml: false) score createdAt user { name avatar { large } } } } } relations { edges { relationType node { id type format title { userPreferred english romaji } } } }
    }
  }
`;

const fetchAniListSearch = async (slug: string): Promise<any> => {
  const isNumeric = /^\d+$/.test(slug);
  const variables = isNumeric
    ? { id: parseInt(slug, 10) }
    : { search: slug.replace(/-/g, ' '), sort: ["SEARCH_MATCH", "POPULARITY_DESC"] };

  let response = await fetchWithRetry('https://graphql.anilist.co', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // Inject token if available
    },
    body: JSON.stringify({ query: ANILIST_SEARCH_QUERY, variables }),
  });

  if (response.status === 404 && isNumeric) {
    response = await fetchWithRetry('https://graphql.anilist.co', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: ANILIST_SEARCH_QUERY, variables: { idMal: parseInt(slug, 10) }, }),
    });
  }

  if (!response.ok) throw new Error(`AniList search failed with status ${response.status}`);
  const payload = await response.json();
  if (!payload?.data?.Media) {
    throw new Error('AniList returned empty Media data');
  }
  return payload.data.Media;
};

const getBaseTitle = (title: string) => {
  if (!title) return '';
  let t = title;

  // Strip trailing season/part markers so they aren't included as part of the core base title
  const seasonMatch = t.match(/\b(?:Season|Part|Arc|Chapter|Cour|Act)\s*\d+\b/i);
  if (seasonMatch && seasonMatch.index !== undefined) {
    t = t.substring(0, seasonMatch.index);
  }

  const nthSeasonMatch = t.match(/\b\d+(?:st|nd|rd|th)\s+Season\b/i);
  if (nthSeasonMatch && nthSeasonMatch.index !== undefined) {
    t = t.substring(0, nthSeasonMatch.index);
  }

  // Split by first occurrence of colon or dashed separator
  const separatorMatch = t.match(/:|\s+-\s+/);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const candidate = t.substring(0, separatorMatch.index).trim();
    // Safely prevent reducing titles like "Re:ZERO" to "Re"
    if (candidate.length > 2 || !t.includes(' - ')) {
      t = candidate;
    } else {
      t = t.split(' - ')[0];
    }
  }

  t = t.replace(/\s+(I{1,3}|IV|V|VI{0,3}|IX|X|\d+)$/i, '');
  return t.trim();
};

// Generates dynamic and accurate tabs based on the actual subtitle/arc rather than hallucinating "Season X"
const generateTabLabel = (title: string, baseTitle: string, index: number) => {
  if (!title) return `Season ${index + 1}`;

  let label = title;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseRegex = new RegExp(`^${escapeRegExp(baseTitle)}[\\s:\\-]*`, 'i');

  // Remove the base title (e.g. "Jujutsu Kaisen") to expose just the arc/cour
  label = label.replace(baseRegex, '').trim();

  if (!label) {
    return index === 0 ? 'Season 1' : `Entry ${index + 1}`;
  }

  if (/^(\d+(st|nd|rd|th)\s+season)$/i.test(label)) {
    const match = label.match(/^(\d+)/);
    if (match) return `Season ${match[1]}`;
  }
  if (/^(season\s*\d+)$/i.test(label)) {
    return label;
  }
  if (/^\d+$/.test(label)) {
    return `Season ${label}`;
  }
  if (/^(part|cour)\s*\d+$/i.test(label)) {
    return `Part ${label.match(/\d+/)?.[0]}`;
  }

  if (label.length > 30) {
    label = label.substring(0, 27) + '...';
  }

  return label;
};

const formatAniListDate = (dateObj?: { year?: number; month?: number; day?: number }) => {
  if (!dateObj?.year) return null;
  const parts: string[] = [];
  if (dateObj.month) parts.push(new Date(2000, dateObj.month - 1).toLocaleString('en-US', { month: 'short' }));
  if (dateObj.day) parts.push(String(dateObj.day) + ',');
  parts.push(String(dateObj.year));
  return parts.join(' ');
};

const aniListMediaToAnimeData = (media: any): AnimeData => {
  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || '';
  const ratedRanking = media.rankings?.find((r: any) => r.type === 'RATED');
  const studioEdge = media.studios?.edges?.[0];

  const startStr = formatAniListDate(media.startDate);
  const endStr = formatAniListDate(media.endDate);
  let publishedString: string | undefined;
  if (startStr && endStr) publishedString = `${startStr} to ${endStr}`;
  else if (startStr) publishedString = `${startStr} to ?`;

  const allowedRelations = ['SEQUEL', 'PREQUEL', 'PARENT', 'SIDE_STORY', 'ALTERNATIVE'];
  const excludedFormats = ['MOVIE', 'OVA', 'SPECIAL', 'MUSIC'];

  const mappedRelations = media.relations?.edges
    ?.filter((edge: any) =>
      edge.node?.type === 'ANIME' &&
      allowedRelations.includes(edge.relationType) &&
      !excludedFormats.includes(edge.node?.format)
    )
    .map((edge: any) => {
      const t = edge.node.title;
      const displayTitle = t.english || t.romaji || t.userPreferred || '?';
      const slug = createSlug(t.english || t.romaji || t.userPreferred || '');
      return {
        id: edge.node.id,
        title: displayTitle,
        slug: slug,
        format: edge.node.format,
        relationType: edge.relationType
      };
    }) || [];

  return {
    mal_id: media.idMal || media.id || 0,
    anilist_id: media.id,
    title: media.title?.userPreferred || media.title?.romaji || media.title?.english || '?',
    title_english: media.title?.english || undefined,
    title_romaji: media.title?.romaji || undefined,
    title_japanese: media.title?.native || undefined,
    synopsis: media.description?.replace(/<[^>]*>/g, '') || undefined,
    bannerImage: media.bannerImage,
    episodes: media.episodes,
    duration: media.duration,
    season: media.season,
    seasonYear: media.seasonYear,
    score: media.meanScore ? media.meanScore / 10 : undefined,
    status: media.status || undefined,
    type: media.format || undefined,
    rank: ratedRanking?.rank || undefined,
    popularity: media.popularity || undefined,
    favorites: media.favourites || undefined,
    published: publishedString ? { string: publishedString } : undefined,
    studios: studioEdge ? [{ name: studioEdge.node?.name || '?' }] : undefined,
    genres: media.genres?.map((g: string, i: number) => ({ mal_id: i, name: g })) || undefined,
    externalLinks: media.externalLinks,
    images: { jpg: { image_url: coverUrl, large_image_url: coverUrl } },
    relations: mappedRelations,
  };
};

const extractAniListSupplement = (media: any): AniListSupplement => ({
  characters: Array.isArray(media.characters?.edges)
    ? media.characters.edges.filter((edge: any) => edge?.node?.id).map((edge: any) => ({
      id: edge.node.id, name: edge.node.name?.userPreferred || edge.node.name?.full || '?', role: edge.role || '?', image: edge.node.image?.large || edge.node.image?.medium || null,
    })) : [],
});

const extractAniListRecs = (media: any): Recommendation[] => {
  if (!Array.isArray(media.recommendations?.edges)) return [];
  return media.recommendations.edges.filter((e: any) => e?.node?.mediaRecommendation).map((e: any) => {
    const rec = e.node.mediaRecommendation;
    return { entry: { id: rec.idMal || rec.id || 0, title: rec.title?.userPreferred || '?', images: { jpg: { image_url: rec.coverImage?.large || '' } } } };
  });
};

const extractAniListReviews = (media: any): Review[] => {
  if (!Array.isArray(media.reviews?.edges)) return [];
  return media.reviews.edges.filter((e: any) => e?.node).map((e: any) => ({
    id: e.node.id, user: { username: e.node.user?.name || '?', images: { jpg: { image_url: e.node.user?.avatar?.large || '' } } }, score: e.node.score || 0, review: e.node.body || e.node.summary || '', is_spoiler: false, date: e.node.createdAt ? new Date(e.node.createdAt * 1000).toISOString() : '', url: `https://anilist.co/review/${e.node.id}`,
  }));
};

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return '?';
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

const formatEpisodeDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsedDate);
};

// ── Season chain traversal ────────────────────────────────────────
// Uses AniList IDs directly — no slug guessing, no imprecise text search.
// BFS through SEQUEL/PREQUEL edges to build the complete ordered chain.

interface SeasonChainEntry { id: number; title: string; }

const SEASON_TRAVERSE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id title { english romaji userPreferred }
      relations { edges { relationType node { id type format } } }
    }
  }
`;
const SEASON_EXCLUDED = ['MOVIE', 'OVA', 'SPECIAL', 'MUSIC'];

async function buildSeasonChain(startMedia: any): Promise<SeasonChainEntry[]> {
  const cache = new Map<number, any>([[startMedia.id, startMedia]]);
  const toExpand = new Set<number>([startMedia.id]);
  const expanded = new Set<number>();

  while (toExpand.size > 0) {
    // Collect neighbour IDs not yet in cache
    const nextIds: number[] = [];
    for (const id of toExpand) {
      expanded.add(id);
      const m = cache.get(id);
      (m?.relations?.edges ?? []).forEach((e: any) => {
        if (
          ['SEQUEL', 'PREQUEL'].includes(e.relationType) &&
          e.node?.type === 'ANIME' &&
          !SEASON_EXCLUDED.includes(e.node?.format) &&
          !cache.has(e.node.id)
        ) nextIds.push(e.node.id);
      });
    }
    toExpand.clear();

    const unique = [...new Set(nextIds)].filter(id => !expanded.has(id));
    if (!unique.length) break;

    const results = await Promise.allSettled(unique.map(id =>
      fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SEASON_TRAVERSE_QUERY, variables: { id } }),
      }).then(r => r.json()).then(j => j.data?.Media)
    ));

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value?.id) {
        cache.set(r.value.id, r.value);
        if (!expanded.has(r.value.id)) toExpand.add(r.value.id);
      }
    }
  }

  // Find root: an entry whose known PREQUEL (if any) is NOT in our cache
  let rootId: number | null = null;
  for (const [id, m] of cache) {
    const knownPrequel = (m.relations?.edges ?? []).find((e: any) =>
      e.relationType === 'PREQUEL' &&
      e.node?.type === 'ANIME' &&
      !SEASON_EXCLUDED.includes(e.node?.format) &&
      cache.has(e.node.id)
    );
    if (!knownPrequel) { rootId = id; break; }
  }
  if (rootId === null) rootId = [...cache.keys()][0] ?? null;

  // Walk SEQUEL chain from root to build ordered list
  const ordered: SeasonChainEntry[] = [];
  const seen = new Set<number>();
  let cur: number | null = rootId;

  while (cur !== null && !seen.has(cur) && cache.has(cur)) {
    seen.add(cur);
    const m = cache.get(cur)!;
    ordered.push({
      id: cur,
      title: m.title?.english || m.title?.romaji || m.title?.userPreferred || '?',
    });
    const next = (m.relations?.edges ?? []).find((e: any) =>
      e.relationType === 'SEQUEL' &&
      e.node?.type === 'ANIME' &&
      !SEASON_EXCLUDED.includes(e.node?.format) &&
      cache.has(e.node.id) &&
      !seen.has(e.node.id)
    );
    cur = next ? next.node.id : null;
  }

  return ordered.length >= 2 ? ordered : [];
}

const token = localStorage.getItem('anilist_access_token');

const AnimeDetail: React.FC = () => {
  const { animeId: urlSlug } = useParams<{ animeId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AnimeData | null>(null);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');

  const [providerSeasons, setProviderSeasons] = useState<ProviderSeason[]>([]);
  const [seasonChain, setSeasonChain] = useState<SeasonChainEntry[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceScanLoading, setSourceScanLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [aniListSupplement, setAniListSupplement] = useState<AniListSupplement>({ characters: [] });
  const [watchProgress, setWatchProgress] = useState<ContinueWatchingData | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<SortOrder>('desc');

  const resolvedSlug = useMemo(() => {
    if (urlSlug && Number.isNaN(Number(urlSlug))) return urlSlug;
    if (data) return createSlug(data.title_english || data.title_romaji || data.title);
    return '';
  }, [urlSlug, data]);

  const navTabs = useMemo(() => {
    if (!data) return [];

    const currentId = data.anilist_id ?? data.mal_id;

    // Priority 1: AniList chain traversal — complete franchise, navigated by AniList ID
    if (seasonChain.length > 1) {
      return seasonChain.map((entry, index) => ({
        id: entry.id,
        title: entry.title,
        slug: String(entry.id),
        active: entry.id === currentId,
        displayLabel: `Season ${index + 1}`,
      }));
    }

    // Priority 2: AniList direct relations (fallback, 1-hop only)
    const excludedFormats = ['MOVIE', 'OVA', 'SPECIAL', 'MUSIC'];
    const tabs: Array<{ id: number; title: string; slug: string; format?: string; active: boolean; displayLabel?: string }> = [];
    const seenIds = new Set<number>();

    const addTab = (item: any, active = false) => {
      if (excludedFormats.includes(item.format)) return;
      if (!seenIds.has(item.id)) { seenIds.add(item.id); tabs.push({ ...item, active }); }
    };

    addTab({ id: currentId, title: data.title_english || data.title_romaji || data.title, format: data.type, slug: resolvedSlug }, true);
    data.relations?.forEach(r => addTab(r));
    tabs.sort((a, b) => a.id - b.id);

    return tabs.map((tab, index) => ({ ...tab, displayLabel: `Season ${index + 1}` }));
  }, [data, resolvedSlug, seasonChain]);

  useEffect(() => {
    if (!data && !urlSlug) return;

    const syncProgress = () => {
      try {
        const raw = window.localStorage.getItem('anime-continue-watching');
        if (raw) {
          const parsed = JSON.parse(raw);
          const entries = Array.isArray(parsed) ? parsed : [];

          const match = entries.find(e =>
            String(e.animeId) === String(data?.mal_id) ||
            String(e.animeId) === String(data?.anilist_id) ||
            String(e.animeId) === String(urlSlug) ||
            (data?.title && e.animeTitle === data.title)
          );

          setWatchProgress(match || null);
        }
      } catch (e) {
        console.warn('Failed to parse watching history', e);
      }
    };

    syncProgress();
    window.addEventListener('storage', syncProgress);
    window.addEventListener('focus', syncProgress);
    return () => {
      window.removeEventListener('storage', syncProgress);
      window.removeEventListener('focus', syncProgress);
    };
  }, [data, urlSlug]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!urlSlug) return;
      try {
        setLoading(true);
        setLoadFailed(false);
        setData(null);
        setRecs([]);
        setReviews([]);
        setEpisodesData({});
        setProviderSeasons([]);
        setSeasonChain([]);
        setAniListSupplement({ characters: [] });
        setSourceScanLoading(true);

        let animeData: AnimeData | null = null;
        let aniMedia = null;

        // Attempt AniList GraphQL standard fetch
        aniMedia = await fetchAniListSearch(urlSlug);
        animeData = aniListMediaToAnimeData(aniMedia);
        setAniListSupplement(extractAniListSupplement(aniMedia));
        setRecs(extractAniListRecs(aniMedia));
        setReviews(extractAniListReviews(aniMedia));

        if (!animeData) {
          throw new Error('AniList API failed to return data');
        }

        setData(animeData);

        // Kick off season chain traversal in background (doesn't block page load)
        if (aniMedia?.id) {
          buildSeasonChain(aniMedia).then(chain => {
            if (chain.length > 1) setSeasonChain(chain);
          }).catch(() => {/* silent — navTabs falls back to relations */ });
        }

        // Fetch Episodes
        // Prefers AniList ID, falls back to MAL ID or the string slug
        const fetchId = aniMedia?.id || animeData.mal_id || urlSlug;

        try {
          const episodesPayload = await fetchAnimeEpisodes(fetchId);
          const providersMap = episodesPayload.providers || {};
          setEpisodesData(providersMap);

          const availableKeys = Object.keys(providersMap);
          const kiwiKey = availableKeys.find(k => k.toLowerCase() === 'kiwi');

          // Extract seasons from the first provider that has them (kept as fallback)
          for (const p of Object.values(providersMap)) {
            const seasons = (p as any).meta?.seasons;
            if (Array.isArray(seasons) && seasons.length > 0) {
              setProviderSeasons(seasons);
              break;
            }
          }

          const defaultProvider =
            kiwiKey ||
            getPreferredAnimeProvider(providersMap) ||
            availableKeys[0];

          if (defaultProvider) {
            setProvider(defaultProvider);
            const hasDub =
              (providersMap[defaultProvider]?.episodes?.dub?.length || 0) > 0;
            setCategory(hasDub ? 'sub' : 'sub');
          }
        } catch (epError) {
          console.error('Failed to fetch anime episodes:', epError);
        }

      } catch (e) {
        console.error('Fetch Error:', e);
        setLoadFailed(true);
      } finally {
        setSourceScanLoading(false);
        setLoading(false);
      }
    };

    fetchAll();
    window.scrollTo(0, 0);
  }, [urlSlug]);

  useEffect(() => {
    if (!data?.mal_id) { setBookmarked(false); return; }
    const syncBookmarkState = () => setBookmarked(isBookmarked(data.mal_id, readBookmarks()));
    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState); window.addEventListener('focus', syncBookmarkState);
    return () => { window.removeEventListener('storage', syncBookmarkState); window.removeEventListener('focus', syncBookmarkState); };
  }, [data?.mal_id]);

  useEffect(() => {
    if (!provider || !episodesData[provider]) return;
    const hasCategoryEpisodes = (episodesData[provider].episodes?.[category]?.length || 0) > 0;
    if (!hasCategoryEpisodes) {
      setCategory((episodesData[provider].episodes?.sub?.length || 0) > 0 ? 'sub' : 'dub');
    }
  }, [category, episodesData, provider]);

  const providerNames = useMemo(() => {
    const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai'];
    return Object.keys(episodesData).sort((a, b) => {
      const rankA = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
      const rankB = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
      return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    });
  }, [episodesData]);

  const providerEpisodes = useMemo(() => getProviderEpisodes({ providers: episodesData }, provider, category), [category, episodesData, provider]);

  const handleBookmarkToggle = useCallback(() => {
    if (!data) return;
    const result = toggleBookmark({
      malId: data.mal_id, title: data.title, cover: data.images.jpg.large_image_url || data.images.jpg.image_url, type: data.type || 'Anime', status: data.status, score: data.score, author: data.studios?.[0]?.name,
    });
    setBookmarked(result.bookmarked);
  }, [data]);

  const sortedEpisodes = [...providerEpisodes].sort((a, b) => {
    const aVal = a.number || 0;
    const bVal = b.number || 0;
    return episodeSortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const visibleEpisodes = sortedEpisodes.filter((ep) =>
    String(ep.number).includes(episodeSearchQuery.trim()) ||
    (ep.title && ep.title.toLowerCase().includes(episodeSearchQuery.trim().toLowerCase()))
  );

  const handleWatchFirst = () => {
    if (!providerEpisodes.length || !provider) return;
    setIsLinking(true);
    const sortedAsc = [...providerEpisodes].sort((a, b) => (a.number || 0) - (b.number || 0));
    navigate(getEpisodeHref(resolvedSlug, provider, category, sortedAsc[0].id));
  };

  const handleWatchLatest = () => {
    if (!providerEpisodes.length || !provider) return;
    setIsLinking(true);
    const sortedDesc = [...providerEpisodes].sort((a, b) => (b.number || 0) - (a.number || 0));
    navigate(getEpisodeHref(resolvedSlug, provider, category, sortedDesc[0].id));
  };

  const reviewsUrl = data?.anilist_id ? `https://anilist.co/anime/${data.anilist_id}/reviews` : undefined;
  const statsUrl = data?.anilist_id ? `https://anilist.co/anime/${data.anilist_id}/stats` : undefined;

  if (loading) return <div style={{ fontFamily: APP_FONT }} className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) {
    return (
      <div style={{ fontFamily: APP_FONT }} className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center gap-5 px-4 text-center text-white">
        <div className="text-xl font-bold uppercase tracking-[0.16em]">
          {loadFailed ? 'Anime data failed to load' : 'Anime not found'}
        </div>
        <button type="button" onClick={() => window.location.reload()} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:bg-white/10 hover:text-white">Retry</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: APP_FONT }} className="relative min-h-screen bg-[var(--app-bg)] text-white pb-20 selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="relative z-10 mx-auto w-full max-w-[1420px] px-4 pt-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 mb-8 group w-fit">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">BACK</span>
        </button>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
          <div className="w-full md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 group perspective-1000">
            <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500">
              <img src={data.images.jpg.large_image_url} className="w-full h-full object-cover" alt={data.title} />
              {data.bannerImage && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-2">
            <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3">
              {data.title || '?'}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
              <span className="text-white flex items-center gap-1"><Film size={12} className="text-[var(--app-accent)]" /> {data.studios?.[0]?.name || '?'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <span className={data.status === 'Publishing' || data.status === 'RELEASING' ? 'text-[var(--app-accent)]' : 'text-[var(--app-accent)]'}>{data.status || '?'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-700" />
              <div className="flex items-center gap-1 text-white">
                <Star size={12} fill="currentColor" className="text-[var(--app-accent)]" />
                {data.score ?? '?'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.genres?.map(g => (
                <span key={g.mal_id} onClick={() => navigate(`/anibrowse?genres=${genreToParam(g.name)}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 hover:border-[var(--app-accent-soft)] hover:bg-opacity-10 transition-all cursor-pointer">
                  {g.name}
                </span>
              ))}
            </div>

            <p className="mt-5 mb-6 text-sm font-medium leading-relaxed text-zinc-300 line-clamp-3 md:line-clamp-4 md:max-w-[55ch]">
              {data.synopsis || 'No synopsis available.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {watchProgress ? (
                <>
                  <button onClick={() => { setIsLinking(true); navigate(watchProgress.href); }} disabled={isLinking || sourceScanLoading} className="ripple-button flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] shadow-[0_4px_14px_0_var(--app-accent-muted)]" style={{ backgroundColor: 'var(--app-accent)', color: '#04110d' }}>
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Play size={15} fill="currentColor" />}
                    Resume {watchProgress.episodeNumber ? `Ep. ${watchProgress.episodeNumber}` : 'Watching'}
                  </button>
                  <div className={`flex items-center rounded-xl overflow-hidden border border-white/10 transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                    <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="ripple-button flex h-12 items-center justify-center px-5 text-sm font-bold transition-all bg-white/5 text-white hover:bg-white/10 active:bg-white/20">First</button>
                    <div className="w-px self-stretch bg-white/10" />
                    <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="ripple-button flex h-12 items-center justify-center px-5 text-sm font-bold transition-all bg-white/5 text-white hover:bg-white/10 active:bg-white/20">Latest</button>
                  </div>
                </>
              ) : (
                <div className={`flex items-center rounded-xl overflow-hidden transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="ripple-button flex h-12 items-center gap-2 rounded-l-xl border-t border-b border-l px-6 text-sm font-bold transition-all duration-100 hover:brightness-125 disabled:opacity-50 disabled:brightness-100" style={{ backgroundColor: 'var(--app-accent-muted)', color: 'var(--app-accent)', borderColor: 'var(--app-accent-soft)' }}>
                    <Play size={15} fill="currentColor" />
                    {sourceScanLoading ? 'Fetching\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch First'}
                  </button>
                  <div className="w-px self-stretch bg-[var(--app-accent-soft)]" />
                  <div className="w-px self-stretch bg-white/10" />
                  <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="ripple-button h-12 px-6 font-bold text-sm flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 transition-all border-t border-b border-r border-white/10 rounded-r-xl">
                    <Tv size={15} />
                    {sourceScanLoading ? 'Fetching\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch Latest'}
                  </button>
                </div>
              )}

              <button type="button" onClick={handleBookmarkToggle} className={`ripple-button h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-xl border transition-all duration-100 ${bookmarked ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)] hover:brightness-110' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'}`}>
                <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="hidden xl:flex flex-col justify-end pb-2 w-[320px] flex-shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                <Info size={14} className="text-[var(--app-accent)]" /> Statistics
              </div>
              {statsUrl && <a href={statsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:text-[var(--app-accent)] transition-colors duration-150 group">Full stats<ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors"><span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Trophy size={12} className="text-[var(--app-accent)]" /> Rank</span><span className="text-xl font-bold text-white">#{data.rank ?? '?'}</span></div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors"><span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><TrendingUp size={12} className="text-[var(--app-accent)]" /> Popularity</span><span className="text-xl font-bold text-white">#{data.popularity ?? '?'}</span></div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors"><span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Users size={12} className="text-[var(--app-accent)]" /> Format</span><span className="text-xl font-bold text-white">{data.type || '?'}</span></div>
              <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors"><span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Heart size={12} className="text-[var(--app-accent)]" /> Favorites</span><span className="text-xl font-bold text-white">{formatNumber(data.favorites)}</span></div>
            </div>

            <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-4 hover:border-white/10 transition-colors">
              <div className="flex items-start gap-3"><Calendar size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" /><div><span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Season</span><span className="block text-xs font-bold text-gray-300 mt-1">{[data.season, data.seasonYear].filter(Boolean).join(' ') || data.published?.string || '?'}</span></div></div>
              <div className="flex items-start gap-3"><Library size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" /><div><span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Episodes</span><span className="block text-xs font-bold text-gray-300 mt-1">{data.episodes || 'TBA'} {data.duration ? `(${data.duration}m)` : ''}</span></div></div>
              {data.title_japanese && <div className="flex items-start gap-3"><Languages size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" /><div><span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Alternative Title</span><span className="block text-xs font-bold text-gray-300 mt-1">{data.title_japanese}</span></div></div>}

              <div className="mt-2 flex gap-2 pt-2 border-t border-white/5">
                {data?.anilist_id && <a href={`https://anilist.co/anime/${data.anilist_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.03] text-zinc-300 text-[10px] font-semibold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.08] group">AniList<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
                {data?.mal_id && <a href={`https://myanimelist.net/anime/${data.mal_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.03] text-zinc-300 text-[10px] font-semibold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.08] group">MyAnimeList<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          <div className="space-y-10 min-w-0">
            <div className="flex flex-col min-w-0">

              {/* All Seasons Tab Navigation with Visible Styled Scrollbar and Beautiful Pill Design */}
              {navTabs.length > 1 && (
                <div className="flex overflow-x-auto gap-3 mb-10 pb-2 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 scrollbar-thumb-rounded-full">
                  {navTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.active && navigate(`/watch/${tab.slug}`)}
                      title={tab.title} // Tooltip shows the actual arc/season title on hover
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all outline-none border ${tab.active
                        ? 'bg-[var(--app-accent-muted)] border-[var(--app-accent-soft)] text-[var(--app-accent)] shadow-sm'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/10'
                        }`}
                    >
                      {tab.displayLabel}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-6 flex items-end justify-between border-b border-white/10 pb-3">
                <h3 className="text-xl md:text-2xl font-semibold text-white">Episodes</h3>
              </div>

              <div className="mb-6 flex flex-col gap-4 px-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {providerNames.map((providerName) => (
                      <button key={providerName} type="button" onClick={() => setProvider(providerName)} className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${provider === providerName ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]' : 'border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'}`}>{providerName}</button>
                    ))}
                    {providerNames.length > 0 && <div className="mx-1 h-6 w-px bg-white/10" />}
                    {(['sub', 'dub'] as const).map((audioMode) => (
                      <button key={audioMode} type="button" onClick={() => setCategory(audioMode)} disabled={(episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0} className={`rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors ${category === audioMode ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'} disabled:cursor-not-allowed disabled:opacity-35`}>{audioMode}</button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"><ArrowDownUp size={14} />{episodeSortOrder === 'desc' ? 'Newest' : 'Oldest'}</button>
                  </div>
                </div>
              </div>

              <div className="max-h-[800px] overflow-y-auto overflow-x-hidden pr-2">
                <div className="flex flex-col">
                  {providerEpisodes.length > 0 ? (
                    visibleEpisodes.length > 0 ? (
                      visibleEpisodes.map((episode) => (
                        <div key={episode.id} onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))} className="group flex items-start gap-4 p-4 rounded-2xl transition-colors hover:bg-white/5 cursor-pointer border-b border-white/[0.04] last:border-0 hover:border-transparent">
                          <div className="flex h-[72px] w-6 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-light text-[#a3a3a3] transition-colors group-hover:text-white">{episode.number || '-'}</div>
                          <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-md bg-[#181818]"><img src={episode.image || data?.images?.jpg?.large_image_url || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${episode.number}`} className="h-full w-full object-cover opacity-80 transition-transform duration-300  group-hover:opacity-100" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />{episode.filler && (<div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white">Filler</div>)}</div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center"><div className="flex items-start justify-between gap-4"><h4 className="text-sm font-bold text-white md:text-base line-clamp-1">{episode.title || `Episode ${episode.number || '?'}`}</h4>{episode.duration && (<span className="shrink-0 text-sm font-medium text-[#d2d2d2]">{Math.round(episode.duration / 60)}m</span>)}</div><p className="mt-1.5 line-clamp-2 text-xs md:text-sm text-[#a3a3a3] group-hover:text-zinc-300 transition-colors">{episode.description || `Episode ${episode.number} of ${data?.title || 'this series'}. ${episode.airDate ? `Originally aired on ${formatEpisodeDate(episode.airDate)}.` : 'No synopsis available for this episode.'}`}</p></div>
                        </div>
                      ))
                    ) : (<div className="p-12 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600">No episodes match this search</div>)
                  ) : sourceScanLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (<div key={i} className="flex gap-4 p-4 border-b border-white/[0.04] last:border-0"><div className="h-[72px] w-6 md:w-8 shrink-0 bg-white/5 animate-pulse rounded" /><div className="h-[72px] w-[128px] shrink-0 bg-white/5 animate-pulse rounded-md" /><div className="flex-1 space-y-2 py-1"><div className="flex justify-between"><div className="h-4 w-1/3 bg-white/5 animate-pulse rounded" /><div className="h-4 w-8 bg-white/5 animate-pulse rounded" /></div><div className="h-3 w-2/3 bg-white/5 animate-pulse rounded mt-3" /><div className="h-3 w-1/2 bg-white/5 animate-pulse rounded" /></div></div>))
                  ) : (<div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10 mt-4"><div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">No Provider</div><div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white">We couldn't find available episodes for this anime</div></div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500"><MessageSquare size={14} className="text-[var(--app-accent)]" /> Reviews</div>{reviewsUrl && <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:text-[var(--app-accent)] transition-colors duration-150 group">View all<ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}</div>
              <div className="space-y-4">
                {reviews.length > 0 ? (reviews.map((review) => (<div key={review.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-4 shadow-lg transition-colors hover:border-white/10"><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-3 min-w-0"><img src={review.user?.images?.jpg?.image_url} alt={review.user?.username || '?'} className="w-9 h-9 rounded-full object-cover bg-white/10 ring-1 ring-white/10" /><div className="min-w-0"><div className="text-xs font-semibold text-white truncate">{review.user?.username || '?'}</div><div className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">{formatEpisodeDate(review.date)}</div></div></div><div className="flex items-center gap-1 text-[var(--app-accent)] bg-[var(--app-accent-muted)] px-2 py-1 rounded-lg border border-[var(--app-accent-soft)]"><Star size={10} fill="currentColor" /><span className="text-[10px] font-bold">{review.score ? `${review.score}/100` : '?'}</span></div></div><div className="relative">{review.is_spoiler && (<span className="inline-block mb-2 text-[8px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">Spoiler</span>)}<p className="text-xs text-gray-300 leading-relaxed font-medium line-clamp-5">{review.review || '?'}</p></div>{review.url && <a href={review.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600 hover:text-[var(--app-accent)] transition-colors duration-150 w-fit group">Read full review<ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a>}</div>))) : !loading ? (<div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">No reviews found.</div>) : (<div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest animate-pulse">Loading reviews...</div>)}
              </div>
            </div>

            <CommentSection pageType="anime" pageId={urlSlug || ''} />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;