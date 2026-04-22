
import React, { useState, useEffect, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Star, Tag, User, Loader2, Bookmark, Languages,
  Info, Search, ArrowDownUp, BookOpen,
  Users, Link2, Trophy, TrendingUp, Heart,
  Calendar, Library, Play, ExternalLink
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { handleRippleMouseDown } from '../utils/ripple';
import {
  buildReaderHref,
  normalizeReaderSourceKey,
  resolveReaderSourceCatalog,
  type ReaderChapter,
  type ResolvedReaderSource,
} from '../utils/readerSources';
import { isBookmarked, readBookmarks, toggleBookmark } from '../utils/bookmarks';

// --- Design Styles ---
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

// --- Interfaces ---
interface MangaData {
  mal_id: number;
  anilist_id?: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  synopsis?: string;
  chapters?: number;
  volumes?: number;
  score?: number;
  status?: string;
  type?: string;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  published?: { string: string };
  serializations?: { name: string }[];
  authors?: { name: string }[];
  genres?: { mal_id: number; name: string }[];
  images: { jpg: { image_url: string; large_image_url: string } };
}

interface ContinueReadingData {
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

interface Recommendation {
  entry: {
    id: number;
    title: string;
    images: { jpg: { image_url: string } };
  };
}

interface Review {
  id: number;
  user: {
    username: string;
    images: { jpg: { image_url: string } };
  };
  score: number;
  review: string;
  is_spoiler: boolean;
  date: string;
  url?: string;
}

interface AniListSupplement {
  relations: Array<{
    id: number;
    title: string;
    relationType: string;
    format?: string | null;
    status?: string | null;
    siteUrl?: string | null;
    coverImage?: string | null;
  }>;
  characters: Array<{
    id: number;
    name: string;
    role: string;
    image?: string | null;
  }>;
  staff: Array<{
    id: number;
    name: string;
    role: string;
    image?: string | null;
  }>;
}

type ChapterSortOrder = 'desc' | 'asc';

// Added format_not_in: [NOVEL] to prevent Light Novels from shadowing Manga in string searches
const ANILIST_SEARCH_QUERY = `
  query SearchManga($search: String, $id: Int, $idMal: Int, $sort: [MediaSort]) {
    Media(search: $search, id: $id, idMal: $idMal, type: MANGA, format_not_in: [NOVEL], sort: $sort) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      description(asHtml: false)
      chapters
      volumes
      meanScore
      status(version: 2)
      format
      rankings {
        rank
        type
      }
      popularity
      favourites
      startDate { year month day }
      endDate { year month day }
      genres
      staff(perPage: 4, sort: [RELEVANCE]) {
        edges {
          role
          node {
            name { full userPreferred }
          }
        }
      }
      coverImage {
        extraLarge
        large
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            siteUrl
            format
            status(version: 2)
            title { userPreferred }
            coverImage { large }
          }
        }
      }
      characters(perPage: 6, sort: [ROLE, RELEVANCE, ID]) {
        edges {
          role
          node {
            id
            name { full userPreferred }
            image { large medium }
          }
        }
      }
      recommendations(perPage: 5, sort: [RATING_DESC]) {
        edges {
          node {
            mediaRecommendation {
              id
              idMal
              title { userPreferred }
              coverImage { large }
            }
          }
        }
      }
      reviews(perPage: 4, sort: [SCORE_DESC]) {
        edges {
          node {
            id
            summary
            body(asHtml: false)
            score
            createdAt
            user {
              name
              avatar { large }
            }
          }
        }
      }
    }
  }
`;

const fetchAniListSearch = async (slug: string): Promise<any> => {
  const isNumeric = /^\d+$/.test(slug);

  // If the slug is numeric, prioritize MAL ID first (since bookmarks and external sources usually track MAL)
  const variables = isNumeric
    ? { idMal: parseInt(slug, 10) }
    : { search: slug.replace(/-/g, ' '), sort: ["SEARCH_MATCH", "POPULARITY_DESC"] };

  let response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ANILIST_SEARCH_QUERY,
      variables,
    }),
  });

  // If idMal fails (e.g. 404), maybe it was an AniList ID instead
  if (response.status === 404 && isNumeric) {
    response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_SEARCH_QUERY,
        variables: { id: parseInt(slug, 10) },
      }),
    });

    // If AL ID ALSO fails, try it as a string search (e.g., manga is literally titled "86" or "1999")
    if (response.status === 404) {
      response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ANILIST_SEARCH_QUERY,
          variables: { search: slug, sort: ["SEARCH_MATCH", "POPULARITY_DESC"] },
        }),
      });
    }
  }

  if (!response.ok) {
    const errPayload = await response.json().catch(() => null);
    console.error('AniList GraphQL Error:', errPayload);
    throw new Error(`AniList search failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.data?.Media) {
    throw new Error('AniList returned empty Media data');
  }

  return payload.data.Media;
};

const fetchJikanFallback = async (slug: string): Promise<MangaData> => {
  const isNumeric = /^\d+$/.test(slug);
  let url = '';

  if (isNumeric) {
    url = `https://api.jikan.moe/v4/manga/${slug}`;
  } else {
    const query = encodeURIComponent(slug.replace(/-/g, ' '));
    url = `https://api.jikan.moe/v4/manga?q=${query}&order_by=popularity&sort=asc&limit=1`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jikan fallback failed with status ${response.status}`);
  }

  const payload = await response.json();
  const rawData = isNumeric ? payload.data : payload.data?.[0];

  if (!rawData) {
    throw new Error('No manga found on Jikan fallback');
  }

  return {
    mal_id: rawData.mal_id,
    anilist_id: undefined,
    title: rawData.title,
    title_english: rawData.title_english,
    title_japanese: rawData.title_japanese,
    synopsis: rawData.synopsis,
    chapters: rawData.chapters,
    volumes: rawData.volumes,
    score: rawData.score,
    status: rawData.status,
    type: rawData.type,
    rank: rawData.rank,
    popularity: rawData.popularity,
    members: rawData.members,
    favorites: rawData.favorites,
    published: rawData.published,
    serializations: rawData.serializations,
    authors: rawData.authors,
    genres: rawData.genres,
    images: rawData.images,
  };
};

const formatAniListDate = (dateObj?: { year?: number; month?: number; day?: number }) => {
  if (!dateObj?.year) return null;
  const parts: string[] = [];
  if (dateObj.month) parts.push(new Date(2000, dateObj.month - 1).toLocaleString('en-US', { month: 'short' }));
  if (dateObj.day) parts.push(String(dateObj.day) + ',');
  parts.push(String(dateObj.year));
  return parts.join(' ');
};

const aniListMediaToMangaData = (media: any): MangaData => {
  const coverUrl = media.coverImage?.extraLarge || media.coverImage?.large || '';
  const ratedRanking = media.rankings?.find((r: any) => r.type === 'RATED');
  const authorEdge = media.staff?.edges?.find((e: any) =>
    /story|original/i.test(e.role || '')
  );

  const startStr = formatAniListDate(media.startDate);
  const endStr = formatAniListDate(media.endDate);
  let publishedString: string | undefined;
  if (startStr && endStr) publishedString = `${startStr} to ${endStr}`;
  else if (startStr) publishedString = `${startStr} to ?`;

  return {
    mal_id: media.idMal || media.id || 0,
    anilist_id: media.id,
    title: media.title?.userPreferred || media.title?.romaji || media.title?.english || '?',
    title_english: media.title?.english || undefined,
    title_japanese: media.title?.native || undefined,
    synopsis: media.description?.replace(/<[^>]*>/g, '') || undefined,
    chapters: media.chapters || undefined,
    volumes: media.volumes || undefined,
    score: media.meanScore ? media.meanScore / 10 : undefined,
    status: media.status || undefined,
    type: media.format || undefined,
    rank: ratedRanking?.rank || undefined,
    popularity: media.popularity || undefined,
    members: undefined,
    favorites: media.favourites || undefined,
    published: publishedString ? { string: publishedString } : undefined,
    serializations: undefined,
    authors: authorEdge
      ? [{ name: authorEdge.node?.name?.userPreferred || authorEdge.node?.name?.full || '?' }]
      : undefined,
    genres: media.genres?.map((g: string, i: number) => ({ mal_id: i, name: g })) || undefined,
    images: {
      jpg: {
        image_url: coverUrl,
        large_image_url: coverUrl,
      },
    },
  };
};

const extractAniListSupplement = (media: any): AniListSupplement => {
  return {
    relations: Array.isArray(media.relations?.edges)
      ? media.relations.edges
        .filter((edge: any) => edge?.node?.id)
        .map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title?.userPreferred || '?',
          relationType: edge.relationType || '?',
          format: edge.node.format ?? null,
          status: edge.node.status ?? null,
          siteUrl: edge.node.siteUrl ?? null,
          coverImage: edge.node.coverImage?.large || null,
        }))
      : [],
    characters: Array.isArray(media.characters?.edges)
      ? media.characters.edges
        .filter((edge: any) => edge?.node?.id)
        .map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.name?.userPreferred || edge.node.name?.full || '?',
          role: edge.role || '?',
          image: edge.node.image?.large || edge.node.image?.medium || null,
        }))
      : [],
    staff: Array.isArray(media.staff?.edges)
      ? media.staff.edges
        .filter((edge: any) => edge?.node)
        .map((edge: any, i: number) => ({
          id: edge.node.id ?? i,
          name: edge.node.name?.userPreferred || edge.node.name?.full || '?',
          role: edge.role || '?',
          image: edge.node.image?.large || edge.node.image?.medium || null,
        }))
      : [],
  };
};

const extractAniListRecs = (media: any): Recommendation[] => {
  if (!Array.isArray(media.recommendations?.edges)) return [];
  return media.recommendations.edges
    .filter((e: any) => e?.node?.mediaRecommendation)
    .map((e: any) => {
      const rec = e.node.mediaRecommendation;
      return {
        entry: {
          id: rec.idMal || rec.id || 0,
          title: rec.title?.userPreferred || '?',
          images: { jpg: { image_url: rec.coverImage?.large || '' } },
        },
      };
    });
};

const extractAniListReviews = (media: any): Review[] => {
  if (!Array.isArray(media.reviews?.edges)) return [];
  return media.reviews.edges
    .filter((e: any) => e?.node)
    .map((e: any) => ({
      id: e.node.id,
      user: {
        username: e.node.user?.name || '?',
        images: { jpg: { image_url: e.node.user?.avatar?.large || '' } },
      },
      score: e.node.score || 0,
      review: e.node.body || e.node.summary || '',
      is_spoiler: false,
      date: e.node.createdAt ? new Date(e.node.createdAt * 1000).toISOString() : '',
      url: `https://anilist.co/review/${e.node.id}`,
    }));
};

const cleanChapterTitle = (rawTitle: string) => {
  const chapterIndex = rawTitle.search(/\b(chapter|chap|ch\.)\b/i);
  if (chapterIndex > 0) {
    return rawTitle.slice(chapterIndex).trim();
  }
  return rawTitle.replace(/^group\s*\d+\s*/i, '').trim();
};

const getChapterSortValue = (chapter: ReaderChapter) => {
  const match = cleanChapterTitle(chapter.title).match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : Number.NEGATIVE_INFINITY;
};

const extractChapterNumber = (chapterTitle: string) => {
  const match = cleanChapterTitle(chapterTitle).match(/(\d+(\.\d+)?)/);
  return match ? match[1] : '';
};

const formatChapterDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
};

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return '?';
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

export const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const Manga: React.FC = () => {
  const { mangaId: urlSlug } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<MangaData | null>(null);
  const [readerSources, setReaderSources] = useState<ResolvedReaderSource[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceScanLoading, setSourceScanLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [aniListSupplement, setAniListSupplement] = useState<AniListSupplement>({ relations: [], characters: [], staff: [] });
  const [readingProgress, setReadingProgress] = useState<ContinueReadingData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<ChapterSortOrder>('desc');

  // Inject Design Styles
  useEffect(() => {
    const id = 'aw-design-styles-manga-detail';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  useEffect(() => {
    const id = 'vf-ui-animations';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      .animate-in { will-change: transform, opacity; }
      .fade-in { animation: vf-fade-in .3s both; }
      .zoom-in { animation: vf-zoom-in .3s cubic-bezier(.2,.9,.3,1) both; }
      .zoom-out { animation: vf-zoom-out .2s cubic-bezier(.4,0,.2,1) both; }
      @keyframes vf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vf-zoom-in { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes vf-zoom-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(10px) scale(.95); } }
      @keyframes bounceCustom { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1.2); } }
      .animate-bounce-bar { animation: bounceCustom 0.8s infinite ease-in-out; }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!data) return;
    try {
      const raw = window.localStorage.getItem('mangavel:continue-reading');
      if (raw) {
        const parsed = JSON.parse(raw);
        const entries = Array.isArray(parsed) ? parsed : [parsed];
        const match = entries.find(e => e.mangaId === String(data.mal_id) || e.mangaTitle === data.title);
        if (match) setReadingProgress(match);
      }
    } catch (e) {
      console.warn('Failed to parse reading history', e);
    }
  }, [data]);

  useEffect(() => {
    const fetchAll = async () => {
      if (!urlSlug) return;

      try {
        setLoading(true);
        setLoadFailed(false);
        setData(null);
        setRecs([]);
        setReviews([]);
        setReaderSources([]);
        setAniListSupplement({ relations: [], characters: [], staff: [] });
        setSourceScanLoading(true);

        let mangaData: MangaData | null = null;

        try {
          const aniMedia = await fetchAniListSearch(urlSlug);
          mangaData = aniListMediaToMangaData(aniMedia);
          setAniListSupplement(extractAniListSupplement(aniMedia));
          setRecs(extractAniListRecs(aniMedia));
          setReviews(extractAniListReviews(aniMedia));
        } catch (aniError) {
          console.warn('AniList fetch failed. Attempting Jikan API fallback...', aniError);
          mangaData = await fetchJikanFallback(urlSlug);
        }

        if (!mangaData) {
          throw new Error('Both AniList and Jikan APIs failed to return data');
        }

        setData(mangaData);

        if (mangaData.title) {
          const resolvedSources = await resolveReaderSourceCatalog(mangaData.title.trim());
          setReaderSources(resolvedSources);
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

  const urlSourceKey = normalizeReaderSourceKey(searchParams.get('source'));
  const availableSources = readerSources.filter(s => s.status === 'available');

  let selectedSource: ResolvedReaderSource | null = null;

  if (urlSourceKey) {
    selectedSource = availableSources.find(s => s.key === urlSourceKey) || null;
  }

  if (!selectedSource && availableSources.length > 0) {
    selectedSource = availableSources.reduce((prev, curr) =>
      (prev.chapters?.length || 0) > (curr.chapters?.length || 0) ? prev : curr
    );
  }

  if (!selectedSource && readerSources.length > 0) {
    selectedSource = readerSources.find(s => s.key === urlSourceKey) || readerSources[0] || null;
  }

  const selectedSourceKey = selectedSource?.key || '';

  useEffect(() => {
    const currentSourceParam = searchParams.get('source');
    if (!selectedSource || currentSourceParam === selectedSource.key) return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('source', selectedSource.key);
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, selectedSource, setSearchParams]);

  useEffect(() => {
    if (!data?.mal_id) {
      setBookmarked(false);
      return;
    }
    const syncBookmarkState = () => setBookmarked(isBookmarked(data.mal_id, readBookmarks()));
    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState);
    window.addEventListener('focus', syncBookmarkState);
    return () => {
      window.removeEventListener('storage', syncBookmarkState);
      window.removeEventListener('focus', syncBookmarkState);
    };
  }, [data?.mal_id]);

  const handleBookmarkToggle = useCallback(() => {
    if (!data) return;
    const result = toggleBookmark({
      malId: data.mal_id,
      title: data.title,
      cover: data.images.jpg.large_image_url || data.images.jpg.image_url,
      type: data.type,
      status: data.status,
      score: data.score,
      author: data.authors?.[0]?.name,
    });
    setBookmarked(result.bookmarked);
  }, [data]);

  const handleReadFirst = async () => {
    if (selectedSource?.status !== 'available' || !selectedSource.chapters.length || !selectedSource.mangaId) return;
    setIsLinking(true);
    const sorted = [...selectedSource.chapters].sort((a, b) => getChapterSortValue(a) - getChapterSortValue(b));
    navigate(buildReaderHref(selectedSource.mangaId, sorted[0].id, selectedSource.key));
    setIsLinking(false);
  };

  const handleReadLast = async () => {
    if (selectedSource?.status !== 'available' || !selectedSource.chapters.length || !selectedSource.mangaId) return;
    setIsLinking(true);
    const sorted = [...selectedSource.chapters].sort((a, b) => getChapterSortValue(b) - getChapterSortValue(a));
    navigate(buildReaderHref(selectedSource.mangaId, sorted[0].id, selectedSource.key));
    setIsLinking(false);
  };

  const chapterPool = selectedSource?.status === 'available' ? [...selectedSource.chapters] : [];
  const sortedChapters = [...chapterPool].sort((a, b) => {
    const aValue = getChapterSortValue(a);
    const bValue = getChapterSortValue(b);
    if (aValue !== bValue) return chapterSortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    return chapterSortOrder === 'desc' ? b.title.localeCompare(a.title) : a.title.localeCompare(b.title);
  });
  const visibleChapters = sortedChapters.filter((chapter) =>
    cleanChapterTitle(chapter.title).toLowerCase().includes(chapterSearchQuery.trim().toLowerCase())
  );

  const hasAniListSupplement = aniListSupplement.relations.length > 0 || aniListSupplement.characters.length > 0 || aniListSupplement.staff.length > 0;

  const reviewsUrl = data?.anilist_id ? `https://anilist.co/manga/${data.anilist_id}/reviews` : undefined;
  const statsUrl = data?.anilist_id ? `https://anilist.co/manga/${data.anilist_id}/stats` : undefined;

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
          {loadFailed ? 'Manga data failed to load' : 'Manga not found'}
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
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <img
                src={data.images.jpg.large_image_url}
                className="w-full h-full object-cover"
                alt={data.title}
              />
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
              <span className="text-white flex items-center gap-1.5"><Tag size={12} style={{ color: 'var(--aw-accent)' }} /> {data.authors?.[0]?.name || '?'}</span>
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
                  onClick={() => navigate(`/browse?genres=${g.name}`)}
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
              {readingProgress ? (
                <>
                  <button
                    onClick={() => { setIsLinking(true); navigate(readingProgress.href); }}
                    disabled={isLinking || sourceScanLoading}
                    className="flex h-[48px] items-center gap-2 rounded-[14px] px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onMouseEnter={(e) => { if (!isLinking && !sourceScanLoading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { if (!isLinking && !sourceScanLoading) e.currentTarget.style.filter = 'none'; }}
                  >
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Play size={15} fill="currentColor" />}
                    Resume {extractChapterNumber(readingProgress.chapterTitle) ? `Ch. ${extractChapterNumber(readingProgress.chapterTitle)}` : 'Reading'}
                  </button>
                  <div className={`flex items-center rounded-[14px] overflow-hidden border transition-all ${selectedSource?.status !== 'available' || !selectedSource.chapters.length ? 'opacity-40 pointer-events-none' : ''}`} style={{ borderColor: 'var(--aw-border)' }}>
                    <button
                      onClick={handleReadFirst}
                      disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
                      className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all"
                      style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      onMouseEnter={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                      onMouseLeave={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                    >
                      First
                    </button>
                    <div className="w-px self-stretch" style={{ background: 'var(--aw-border)' }} />
                    <button
                      onClick={handleReadLast}
                      disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
                      className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all"
                      style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      onMouseEnter={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                      onMouseLeave={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                    >
                      Latest
                    </button>
                  </div>
                </>
              ) : (
                <div className={`flex items-center rounded-[14px] overflow-hidden transition-all ${selectedSource?.status !== 'available' || !selectedSource.chapters.length ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button
                    onClick={handleReadFirst}
                    disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
                    className="flex h-[48px] items-center gap-2 border px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: '14px', borderBottomLeftRadius: '14px' }}
                    onMouseEnter={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.filter = 'none'; }}
                  >
                    <BookOpen size={15} />
                    {sourceScanLoading ? 'Scanning\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read First'}
                  </button>
                  <button
                    onClick={handleReadLast}
                    disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
                    className="flex h-[48px] items-center gap-2 border-t border-b border-r px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopRightRadius: '14px', borderBottomRightRadius: '14px' }}
                    onMouseEnter={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }}
                    onMouseLeave={(e) => { if (selectedSource?.chapters?.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}
                  >
                    <BookOpen size={15} fill="currentColor" />
                    {sourceScanLoading ? 'Scanning\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read Last'}
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
              <div className="aw-label flex items-center gap-1.5">
                <Info size={14} style={{ color: 'var(--aw-accent)' }} />
                Statistics
              </div>
              {statsUrl && (
                <a
                  href={statsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group"
                  style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                >
                  Full stats
                  <ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
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
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Users size={12} style={{ color: 'var(--aw-accent)' }} /> Members</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{formatNumber(data.members)}</span>
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
                  <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Published</span>
                  <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.published?.string || '?'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Library size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Serialization</span>
                  <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.serializations?.[0]?.name || '?'}</span>
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
                  <a href={`https://anilist.co/manga/${data.anilist_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    AniList<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {data?.mal_id && (
                  <a href={`https://myanimelist.net/manga/${data.mal_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    MAL<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
          <div className="space-y-10">

            <div className="rounded-[24px] border p-4 shadow-lg transition-colors duration-300" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}>
              <div className="mb-4 flex flex-col gap-4 px-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
                      Chapters <span className="ml-2 text-base" style={{ color: 'var(--aw-accent)' }}>({selectedSource?.status === 'available' ? selectedSource.chapters.length : 0})</span>
                    </h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
                      {selectedSource ? `${selectedSource.label} / ` : ''}{visibleChapters.length} visible / {chapterSortOrder === 'desc' ? 'newest first' : 'oldest first'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChapterSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-300"
                      style={{ background: 'var(--aw-card)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                    >
                      <ArrowDownUp size={14} />
                      {chapterSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--aw-muted)' }} />
                  <input
                    value={chapterSearchQuery}
                    onChange={(event) => setChapterSearchQuery(event.target.value)}
                    placeholder="Search chapter number or title"
                    className="w-full rounded-[14px] border py-3 pl-12 pr-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}
                  />
                </div>
              </div>

              <div className="max-h-[720px] overflow-y-auto pr-2 aw-scrollbar">
                <div className="flex flex-col gap-1.5">
                  {selectedSource?.status === 'available' ? (
                    visibleChapters.length > 0 ? (
                      visibleChapters.map((chapter) => {
                        const chapterLabel = cleanChapterTitle(chapter.title);
                        const chapterNumber = extractChapterNumber(chapter.title);
                        const chapterReleaseDate = formatChapterDate(chapter.date);
                        const chapterVolume = chapter.volume;
                        return (
                          <div
                            key={chapter.id}
                            onClick={() => selectedSource && selectedSource.mangaId && navigate(buildReaderHref(selectedSource.mangaId, chapter.id, selectedSource.key))}
                            className="group flex items-center gap-4 rounded-[14px] border px-4 py-3.5 transition-all duration-300 cursor-pointer"
                            style={{ background: 'transparent', borderColor: 'transparent' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                          >
                            <div className="hidden h-[56px] min-w-[5.25rem] flex-col items-center justify-center rounded-[12px] border sm:flex transition-colors duration-300" style={{ background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)' }}>
                              <span className="text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}>Volume</span>
                              <span className="mt-1 text-lg font-bold leading-none text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{chapterVolume || '?'}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-[1rem] font-bold text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>{chapterLabel || '?'}</span>
                                <span className="rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] sm:hidden" style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Vol {chapterVolume || '?'}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
                                <span>{chapterReleaseDate}</span>
                                {chapterNumber ? <span className="h-1 w-1 rounded-full" style={{ background: 'var(--aw-border)' }} /> : null}
                                {chapterNumber ? <span>Chapter {chapterNumber}</span> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[14px] border p-8 text-center text-xs font-semibold uppercase tracking-[0.22em]" style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>No chapters match this search</div>
                    )
                  ) : sourceScanLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (<div key={i} className="h-[76px] rounded-[14px] aw-skeleton mb-1.5" />))
                  ) : (
                    <div className="rounded-[14px] border p-8 text-center" style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)' }}>
                      <div className="aw-label">No active source</div>
                      <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>We couldn't find an available source for this manga</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="aw-label flex items-center gap-1.5">
                  <Trophy size={14} style={{ color: 'var(--aw-accent)' }} />
                  Reviews
                </div>
                {reviewsUrl && (
                  <a
                    href={reviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group"
                    style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                  >
                    View all
                    <ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="rounded-[16px] border p-4 shadow-lg transition-colors duration-300" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={review.user?.images?.jpg?.image_url} alt={review.user?.username || '?'} className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate" style={{ fontFamily: 'var(--aw-font-body)' }}>{review.user?.username || '?'}</div>
                            <div className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>{formatChapterDate(review.date)}</div>
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
                      {review.url && (
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] transition-colors duration-150 w-fit group"
                          style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                        >
                          Read full review
                          <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      )}
                    </div>
                  ))
                ) : !loading ? (
                  <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>No reviews found.</div>
                ) : (
                  <div className="text-[10px] font-semibold uppercase tracking-widest aw-skeleton h-10 w-full rounded" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}></div>
                )}
              </div>
            </div>

            <div className="rounded-[16px] border p-4 shadow-lg transition-colors duration-300" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}>
              <CommentSection pageType="manga" pageId={urlSlug || ''} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Manga;
