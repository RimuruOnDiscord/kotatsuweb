
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
  getProviderEpisodes,
  getPreferredAnimeProvider,
} from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: var(--aw-bg); color: var(--aw-text); }

  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* Skeleton shimmer */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .aw-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
  }

  /* Noise overlay */
  .aw-noise::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px;
  }
    
  /* Custom Scrollbar for inner containers */
  .aw-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .aw-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .aw-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 10px;
  }
  .aw-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.2);
  }
`;

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

const generateTabLabel = (title: string, baseTitle: string, index: number) => {
  if (!title) return `Season ${index + 1}`;

  let label = title;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseRegex = new RegExp(`^${escapeRegExp(baseTitle)}[\\s:\\-]*`, 'i');

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
  const { user } = useAuth();
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

    if (seasonChain.length > 1) {
      return seasonChain.map((entry, index) => ({
        id: entry.id,
        title: entry.title,
        slug: String(entry.id),
        active: entry.id === currentId,
        displayLabel: `Season ${index + 1}`,
      }));
    }

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
    const id = 'aw-design-styles-anime-detail';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Replace local fetch with Supabase logic for continue watching
  useEffect(() => {
    if (!data && !urlSlug) return;

    const syncProgress = async () => {
      try {
        if (user) {
          const { data: dbData, error } = await supabase
            .from('anime_watch_history')
            .select('*')
            .eq('user_id', user.id)
            .or(`anime_id.eq.${data?.mal_id},anime_id.eq.${data?.anilist_id},anime_id.eq.${urlSlug}`);
            
          if (!error && dbData && dbData.length > 0) {
            const match = dbData[0];
            setWatchProgress({
              animeId: match.anime_id,
              episodeId: match.episode_id,
              animeTitle: match.anime_title,
              animeCover: match.anime_cover,
              episodeTitle: match.episode_title,
              episodeNumber: match.episode_number,
              href: match.href,
              updatedAt: new Date(match.updated_at).getTime()
            });
            return;
          }
        }
        
        // Fallback to local storage if unauthenticated
        const raw = window.localStorage.getItem('anime-continue-watching');
        if (raw) {
          const parsed = JSON.parse(raw);
          const entries = Array.isArray(parsed) ? parsed : [];

          const match = entries.find((e: any) =>
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
  }, [data, urlSlug, user]);

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

        aniMedia = await fetchAniListSearch(urlSlug);
        animeData = aniListMediaToAnimeData(aniMedia);
        setAniListSupplement(extractAniListSupplement(aniMedia));
        setRecs(extractAniListRecs(aniMedia));
        setReviews(extractAniListReviews(aniMedia));

        if (!animeData) {
          throw new Error('AniList API failed to return data');
        }

        setData(animeData);

        if (aniMedia?.id) {
          buildSeasonChain(aniMedia).then(chain => {
            if (chain.length > 1) setSeasonChain(chain);
          }).catch(() => { });
        }

        const fetchId = aniMedia?.id || animeData.mal_id || urlSlug;

        try {
          const episodesPayload = await fetchAnimeEpisodes(fetchId);
          const providersMap = episodesPayload.providers || {};
          setEpisodesData(providersMap);

          const availableKeys = Object.keys(providersMap);
          const kiwiKey = availableKeys.find(k => k.toLowerCase() === 'kiwi');

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
            const hasDub = (providersMap[defaultProvider]?.episodes?.dub?.length || 0) > 0;
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
    const syncBookmarkState = async () => {
      if (user) {
        const { data: dbData } = await supabase
          .from('anime_bookmarks')
          .select('mal_id')
          .eq('user_id', user.id)
          .eq('mal_id', String(data.mal_id));
        setBookmarked(dbData && dbData.length > 0 ? true : false);
      } else {
        setBookmarked(isBookmarked(data.mal_id, readBookmarks()));
      }
    };
    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState); window.addEventListener('focus', syncBookmarkState);
    return () => { window.removeEventListener('storage', syncBookmarkState); window.removeEventListener('focus', syncBookmarkState); };
  }, [data?.mal_id, user]);

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

  const handleBookmarkToggle = useCallback(async () => {
    if (!data) return;
    
    if (user) {
      if (bookmarked) {
        const { error } = await supabase
          .from('anime_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('mal_id', String(data.mal_id));
          
        if (!error) {
          setBookmarked(false);
        } else {
          console.error("Failed to remove bookmark from db", error);
        }
      } else {
        const { error } = await supabase
          .from('anime_bookmarks')
          .insert({
            user_id: user.id,
            mal_id: String(data.mal_id),
            title: data.title || 'Unknown Title',
            cover: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url || null,
            type: data.type || 'Anime',
            status: data.status || 'Unknown',
            score: data.score || null,
            author: data.studios?.[0]?.name || null
          });
          
        if (!error) {
          setBookmarked(true);
        } else {
          console.error("Failed to insert bookmark into db", error);
        }
      }
    } else {
      const result = toggleBookmark({
        malId: data.mal_id, 
        title: data.title, 
        cover: data.images?.jpg?.large_image_url || data.images?.jpg?.image_url, 
        type: data.type || 'Anime', 
        status: data.status, 
        score: data.score, 
        author: data.studios?.[0]?.name,
      });
      setBookmarked(result.bookmarked);
    }
  }, [data, user, bookmarked]);

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

  if (loading) {
    return (
      <div className="aw-root min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--aw-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="aw-root aw-noise min-h-screen flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="text-xl font-bold uppercase tracking-[0.16em]" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {loadFailed ? 'Anime data failed to load' : 'Anime not found'}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full px-6 py-3 transition-colors"
          style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-display)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.style.background = 'var(--aw-s2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.background = 'var(--aw-s1)'; }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="aw-root aw-noise relative min-h-screen text-white pb-20 selection:bg-[var(--aw-accent-muted)]">

      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-8">

        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-300 mb-8 w-fit"
          style={{
            background: 'var(--aw-bg)',
            borderColor: 'var(--aw-border)',
            color: 'var(--aw-muted)',
            fontFamily: 'var(--aw-font-display)',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.18em'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>BACK</span>
        </button>

        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">

          <div className="w-full md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 group perspective-1000">
            <div
              className="relative aspect-[2/3] rounded-[16px] overflow-hidden shadow-2xl transition-transform duration-500 ring-1 ring-white/10"
              style={{ background: 'var(--aw-card)' }}
            >
              <img src={data.images.jpg.large_image_url} className="w-full h-full object-cover" alt={data.title} />
              {data.bannerImage && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-2">
            <h1
              className="text-4xl md:text-6xl lg:text-[4rem] font-black uppercase tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3"
              style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em' }}
            >
              {data.title || '?'}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider mb-6" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
              <span className="text-white flex items-center gap-1.5"><Film size={12} style={{ color: 'var(--aw-accent)' }} /> {data.studios?.[0]?.name || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <span style={{ color: 'var(--aw-accent)' }}>{data.status || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <div className="flex items-center gap-1 text-white">
                <Star size={12} fill="currentColor" style={{ color: 'var(--aw-accent)' }} />
                {data.score ?? '?'}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.genres?.map(g => (
                <span
                  key={g.mal_id}
                  onClick={() => navigate(`/anibrowse?genres=${genreToParam(g.name)}`)}
                  className="px-3 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-widest transition-all cursor-pointer"
                  style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
                >
                  {g.name}
                </span>
              ))}
            </div>

            <p className="mt-5 mb-6 text-sm font-medium leading-relaxed line-clamp-3 md:line-clamp-4 md:max-w-[55ch]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
              {data.synopsis || 'No synopsis available.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {watchProgress ? (
                <>
                  <button
                    onClick={() => { setIsLinking(true); navigate(watchProgress.href); }}
                    disabled={isLinking || sourceScanLoading}
                    className="flex h-[48px] items-center gap-2 rounded-[14px] px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onMouseEnter={(e) => { if (!isLinking && !sourceScanLoading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { if (!isLinking && !sourceScanLoading) e.currentTarget.style.filter = 'none'; }}
                  >
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Play size={15} fill="currentColor" />}
                    Resume {watchProgress.episodeNumber ? `Ep. ${watchProgress.episodeNumber}` : 'Watching'}
                  </button>
                  <div className={`flex items-center rounded-[14px] overflow-hidden border transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`} style={{ borderColor: 'var(--aw-border)' }}>
                    <button
                      onClick={handleWatchFirst}
                      disabled={!providerEpisodes.length || isLinking}
                      className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all"
                      style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                      onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                    >
                      First
                    </button>
                    <div className="w-px self-stretch" style={{ background: 'var(--aw-border)' }} />
                    <button
                      onClick={handleWatchLatest}
                      disabled={!providerEpisodes.length || isLinking}
                      className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all"
                      style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                      onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                    >
                      Latest
                    </button>
                  </div>
                </>
              ) : (
                <div className={`flex items-center rounded-[14px] overflow-hidden transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button
                    onClick={handleWatchFirst}
                    disabled={!providerEpisodes.length || isLinking}
                    className="flex h-[48px] items-center gap-2 border px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: '14px', borderBottomLeftRadius: '14px' }}
                    onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.filter = 'none'; }}
                  >
                    <Play size={15} fill="currentColor" />
                    {sourceScanLoading ? 'Fetching\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch First'}
                  </button>
                  <button
                    onClick={handleWatchLatest}
                    disabled={!providerEpisodes.length || isLinking}
                    className="flex h-[48px] items-center gap-2 border-t border-b border-r px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopRightRadius: '14px', borderBottomRightRadius: '14px' }}
                    onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                    onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                  >
                    <Tv size={15} />
                    {sourceScanLoading ? 'Fetching\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch Latest'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleBookmarkToggle}
                className={`flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border transition-all duration-150 ${bookmarked ? '' : 'hover:opacity-80'}`}
                style={bookmarked
                  ? { background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)', color: 'var(--aw-accent)' }
                  : { background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'white' }
                }
              >
                <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          <div className="hidden xl:flex flex-col justify-end pb-2 w-[320px] flex-shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div className="aw-label flex items-center gap-1.5"><Info size={14} style={{ color: 'var(--aw-accent)' }} /> Statistics</div>
              {statsUrl && <a href={statsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}>Full stats<ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Trophy size={12} style={{ color: 'var(--aw-accent)' }} /> Rank</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>#{data.rank ?? '?'}</span>
              </div>
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><TrendingUp size={12} style={{ color: 'var(--aw-accent)' }} /> Popular</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>#{data.popularity ?? '?'}</span>
              </div>
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Users size={12} style={{ color: 'var(--aw-accent)' }} /> Format</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.type || '?'}</span>
              </div>
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Heart size={12} style={{ color: 'var(--aw-accent)' }} /> Faves</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{formatNumber(data.favorites)}</span>
              </div>
            </div>

            <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-4 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
              <div className="flex items-start gap-3">
                <Calendar size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Season</span>
                  <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{[data.season, data.seasonYear].filter(Boolean).join(' ') || data.published?.string || '?'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Library size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Episodes</span>
                  <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.episodes || 'TBA'} {data.duration ? `(${data.duration}m)` : ''}</span>
                </div>
              </div>
              {data.title_japanese && (
                <div className="flex items-start gap-3">
                  <Languages size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Alternative Title</span>
                    <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.title_japanese}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-2 pt-3" style={{ borderTop: '1px solid var(--aw-border)' }}>
                {data?.anilist_id && (
                  <a href={`https://anilist.co/anime/${data.anilist_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    AniList<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {data?.mal_id && (
                  <a href={`https://myanimelist.net/anime/${data.mal_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    MAL<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          <div className="space-y-10 min-w-0">
            <div className="flex flex-col min-w-0">

              {/* Seasons Navigation Pill Tabs */}
              {navTabs.length > 1 && (
                <div className="flex overflow-x-auto gap-3 mb-10 pb-2 aw-scrollbar">
                  {navTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.active && navigate(`/watch/${tab.slug}`)}
                      title={tab.title}
                      className="px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-all duration-300 border"
                      style={tab.active
                        ? { background: 'var(--aw-accent)', color: '#04110d', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                        : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                      }
                      onMouseEnter={(e) => { if (!tab.active) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                      onMouseLeave={(e) => { if (!tab.active) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                    >
                      {tab.displayLabel}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-6 flex items-end justify-between border-b pb-3" style={{ borderColor: 'var(--aw-border)' }}>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</h3>
              </div>

              <div className="mb-6 flex flex-col gap-4 px-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {providerNames.map((providerName) => (
                      <button
                        key={providerName}
                        type="button"
                        onClick={() => setProvider(providerName)}
                        className="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300"
                        style={provider === providerName
                          ? { background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                        onMouseEnter={(e) => { if (provider !== providerName) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                        onMouseLeave={(e) => { if (provider !== providerName) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                      >
                        {providerName}
                      </button>
                    ))}
                    {providerNames.length > 0 && <div className="mx-2 h-6 w-px" style={{ background: 'var(--aw-border)' }} />}
                    {(['sub', 'dub'] as const).map((audioMode) => (
                      <button
                        key={audioMode}
                        type="button"
                        onClick={() => setCategory(audioMode)}
                        disabled={(episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0}
                        className="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35"
                        style={category === audioMode
                          ? { background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                        onMouseEnter={(e) => { if (category !== audioMode && (episodesData[provider]?.episodes?.[audioMode]?.length || 0) !== 0) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                        onMouseLeave={(e) => { if (category !== audioMode && (episodesData[provider]?.episodes?.[audioMode]?.length || 0) !== 0) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                      >
                        {audioMode}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-300"
                      style={{ background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                    >
                      <ArrowDownUp size={12} />{episodeSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[800px] overflow-y-auto overflow-x-hidden pr-2 aw-scrollbar">
                <div className="flex flex-col">
                  {providerEpisodes.length > 0 ? (
                    visibleEpisodes.length > 0 ? (
                      visibleEpisodes.map((episode) => (
                        <div
                          key={episode.id}
                          onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))}
                          className="group flex items-start gap-4 p-4 rounded-[14px] transition-all duration-300 cursor-pointer border mb-2"
                          style={{ borderColor: 'transparent', background: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                        >
                          <div className="flex h-[72px] w-6 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-light text-zinc-500 transition-colors group-hover:text-[var(--aw-accent)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {episode.number || '-'}
                          </div>
                          <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-md ring-1 ring-white/5" style={{ background: 'var(--aw-card)' }}>
                            <img src={episode.image || data?.images?.jpg?.large_image_url || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${episode.number}`} className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:opacity-100 group-hover:scale-105" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />
                            {episode.filler && (
                              <div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Filler</div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="text-sm font-bold text-white md:text-base line-clamp-1" style={{ fontFamily: 'var(--aw-font-display)' }}>{episode.title || `Episode ${episode.number || '?'}`}</h4>
                              {episode.duration && (<span className="shrink-0 text-sm font-medium" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{Math.round(episode.duration / 60)}m</span>)}
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs md:text-sm transition-colors" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
                              {episode.description || `Episode ${episode.number} of ${data?.title || 'this series'}. ${episode.airDate ? `Originally aired on ${formatEpisodeDate(episode.airDate)}.` : 'No synopsis available for this episode.'}`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (<div className="p-12 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600" style={{ fontFamily: 'var(--aw-font-display)' }}>No episodes match this search</div>)
                  ) : sourceScanLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                      <div key={i} className="flex gap-4 p-4 border-b last:border-0" style={{ borderColor: 'var(--aw-border)' }}>
                        <div className="h-[72px] w-6 md:w-8 shrink-0 aw-skeleton rounded" />
                        <div className="h-[72px] w-[128px] shrink-0 aw-skeleton rounded-md" />
                        <div className="flex-1 space-y-2 py-1">
                          <div className="flex justify-between"><div className="h-4 w-1/3 aw-skeleton rounded" /><div className="h-4 w-8 aw-skeleton rounded" /></div>
                          <div className="h-3 w-2/3 aw-skeleton rounded mt-3" />
                          <div className="h-3 w-1/2 aw-skeleton rounded" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center rounded-[16px] border mt-4" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}>
                      <div className="aw-label">No Provider</div>
                      <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>We couldn't find available episodes for this anime</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10 min-w-0">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="aw-label flex items-center gap-1.5"><MessageSquare size={14} style={{ color: 'var(--aw-accent)' }} /> Reviews</div>
                {reviewsUrl && <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}>View all<ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
              </div>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-[16px] border p-4 shadow-lg transition-colors duration-300" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={review.user?.images?.jpg?.image_url} alt={review.user?.username || '?'} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate" style={{ fontFamily: 'var(--aw-font-body)' }}>{review.user?.username || '?'}</div>
                            <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>{formatEpisodeDate(review.date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg border" style={{ color: 'var(--aw-accent)', background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)' }}>
                          <Star size={10} fill="currentColor" />
                          <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--aw-font-display)' }}>{review.score ? `${review.score}/100` : '?'}</span>
                        </div>
                      </div>
                      <div className="relative">
                        {review.is_spoiler && (<span className="inline-block mb-2 text-[8px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20" style={{ fontFamily: 'var(--aw-font-display)' }}>Spoiler</span>)}
                        <p className="text-xs leading-relaxed font-medium line-clamp-5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{review.review || '?'}</p>
                      </div>
                      {review.url && <a href={review.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-150 w-fit group" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}>Read full review<ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a>}
                    </div>
                  ))
                ) : !loading ? (
                  <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>No reviews found.</div>
                ) : (
                  <div className="text-[10px] font-semibold uppercase tracking-widest aw-skeleton h-10 w-full rounded" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} />
                )}
              </div>
            </div>

            <div className="mt-8 transition-colors duration-300">
              <CommentSection pageType="anime" pageId={urlSlug || ''} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;
