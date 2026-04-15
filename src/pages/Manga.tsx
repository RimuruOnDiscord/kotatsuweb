
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ChevronLeft, Star, Tag, User, Loader2, Bookmark, Languages, 
  Info, Search, ArrowDownUp, BookOpen, RadioTower, Check, X, 
  Users, Link2, MessageSquare, Trophy, TrendingUp, Heart, 
  Calendar, Library, Play, ExternalLink 
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { handleRippleMouseDown } from '../utils/ripple';
import {
  buildReaderHref,
  DEFAULT_READER_SOURCE,
  getPreferredReaderSource,
  normalizeReaderSourceKey,
  resolveReaderSourceCatalog,
  type ReaderChapter,
  type ResolvedReaderSource,
} from '../utils/readerSources';
import { isBookmarked, readBookmarks, toggleBookmark } from '../utils/bookmarks';

// --- Custom Font Stack ---
const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

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

const ANILIST_SEARCH_QUERY = `
  query SearchManga($search: String, $id: Int, $idMal: Int) {
    Media(search: $search, id: $id, idMal: $idMal, type: MANGA) {
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
  // Check if slug is numeric (could be an AniList ID or an old MAL bookmark)
  const isNumeric = /^\d+$/.test(slug);
  const variables = isNumeric
    ? { id: parseInt(slug, 10) }
    : { search: slug.replace(/-/g, ' ') };

  let response = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: ANILIST_SEARCH_QUERY,
      variables,
    }),
  });

  // If it fails with 404 and it was numeric, fallback to checking idMal 
  // (Provides backwards compatibility for legacy Jikan bookmarks)
  if (response.status === 404 && isNumeric) {
    response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_SEARCH_QUERY,
        variables: { idMal: parseInt(slug, 10) },
      }),
    });
  }

  if (!response.ok) {
    const errPayload = await response.json().catch(() => null);
    console.error('AniList GraphQL Error:', errPayload);
    throw new Error(`AniList search failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.data?.Media ?? null;
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
  const requestedSourceKey = normalizeReaderSourceKey(searchParams.get('source')) || DEFAULT_READER_SOURCE;

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

        const aniMedia = await fetchAniListSearch(urlSlug);

        if (!aniMedia) {
          throw new Error('AniList failed to return data');
        }

        const mangaData = aniListMediaToMangaData(aniMedia);
        setData(mangaData);
        setAniListSupplement(extractAniListSupplement(aniMedia));
        setRecs(extractAniListRecs(aniMedia));
        setReviews(extractAniListReviews(aniMedia));

        // --- Reader sources ---
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

  const selectedSource = getPreferredReaderSource(readerSources, requestedSourceKey);
  const selectedSourceKey = selectedSource?.key || '';

  useEffect(() => {
    const currentSourceParam = searchParams.get('source');
    if (!currentSourceParam || !selectedSource || currentSourceParam === selectedSource.key) return;
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('source', selectedSource.key);
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, selectedSource, setSearchParams]);

  const selectSource = (sourceKey: string) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('source', sourceKey);
    setSearchParams(nextSearchParams, { replace: true });
  };

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
  
  // External Links URLs
  const reviewsUrl = data?.anilist_id ? `https://anilist.co/manga/${data.anilist_id}/reviews` : undefined;
  const statsUrl = data?.anilist_id ? `https://anilist.co/manga/${data.anilist_id}/stats` : undefined;

  if (loading) return <div style={{ fontFamily: APP_FONT }} className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) {
    return (
      <div style={{ fontFamily: APP_FONT }} className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center gap-5 px-4 text-center text-white">
        <div className="text-xl font-bold uppercase tracking-[0.16em]">
          {loadFailed ? 'Manga data failed to load' : 'Manga not found'}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: APP_FONT }} className="relative min-h-screen bg-[var(--app-bg)] text-white pb-20 selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="relative z-10 mx-auto w-full max-w-[1420px] px-4 pt-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 mb-8 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">BACK</span>
        </button>

        {/* --- TOP SECTION: SIDE-BY-SIDE --- */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
            {/* 1. Poster */}
            <div className="w-full md:w-56 lg:w-72 flex-shrink-0 group perspective-1000">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-[var(--app-accent-soft)] group-hover:scale-[1.02] transition-transform duration-500">
                    <img src={data.images.jpg.large_image_url} className="w-full h-full object-cover" alt={data.title} />
                </div>
            </div>

            {/* 2. Info & Actions (Middle) */}
            <div className="flex-1 flex flex-col justify-end pb-2">
                <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3">
                    {data.title || '?'}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
                    <span className="text-white flex items-center gap-1"><Tag size={12} className="text-[var(--app-accent)]" /> {data.authors?.[0]?.name || '?'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span className={data.status === 'Publishing' || data.status === 'RELEASING' ? 'text-[var(--app-accent)]' : 'text-blue-400'}>{data.status || '?'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <div className="flex items-center gap-1 text-white">
                        <Star size={12} fill="currentColor" className="text-[var(--app-accent)]" />
                        {data.score ?? '?'}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                    {data.genres?.map(g => (
                        <span key={g.mal_id} onClick={() => navigate(`/browse?genres=${g.name}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 hover:border-[var(--app-accent-soft)] hover:bg-opacity-10 transition-all cursor-pointer">
                            {g.name}
                        </span>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {readingProgress ? (
                    <>
                      <button
                        onClick={() => { setIsLinking(true); navigate(readingProgress.href); }}
                        onMouseDown={handleRippleMouseDown}
                        disabled={isLinking || sourceScanLoading}
                        className="ripple-button flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-bold transition-all hover:brightness-110 active:scale-[0.98] shadow-[0_4px_14px_0_var(--app-accent-muted)]"
                        style={{ backgroundColor: 'var(--app-accent)', color: '#04110d' }}
                      >
                        {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Play size={15} fill="currentColor" />}
                        Resume {extractChapterNumber(readingProgress.chapterTitle) ? `Ch. ${extractChapterNumber(readingProgress.chapterTitle)}` : 'Reading'}
                      </button>
                      <div className={`flex items-center rounded-xl overflow-hidden border border-white/10 transition-all ${
                        selectedSource?.status !== 'available' || !selectedSource.chapters.length ? 'opacity-40 pointer-events-none' : ''
                      }`}>
                        <button onClick={handleReadFirst} onMouseDown={handleRippleMouseDown} disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking} className="ripple-button flex h-12 items-center justify-center px-5 text-sm font-bold transition-all bg-white/5 text-white hover:bg-white/10 active:bg-white/20">First</button>
                        <div className="w-px self-stretch bg-white/10" />
                        <button onClick={handleReadLast} onMouseDown={handleRippleMouseDown} disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking} className="ripple-button flex h-12 items-center justify-center px-5 text-sm font-bold transition-all bg-white/5 text-white hover:bg-white/10 active:bg-white/20">Latest</button>
                      </div>
                    </>
                  ) : (
                    <div className={`flex items-center rounded-xl overflow-hidden transition-all ${
                      selectedSource?.status !== 'available' || !selectedSource.chapters.length ? 'opacity-40 pointer-events-none' : ''
                    }`}>
                      <button onClick={handleReadFirst} onMouseDown={handleRippleMouseDown} disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking} className="ripple-button flex h-12 items-center gap-2 rounded-l-xl border-t border-b border-l px-6 text-sm font-bold transition-all" style={{ backgroundColor: 'var(--app-accent-muted)', color: 'var(--app-accent)', borderColor: 'var(--app-accent-soft)' }}>
                        <BookOpen size={15} />
                        {sourceScanLoading ? 'Scanning\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read First'}
                      </button>
                      <div className="w-px self-stretch bg-[var(--app-accent-soft)]" />
                      <div className="w-px self-stretch bg-white/10" />
                      <button onClick={handleReadLast} onMouseDown={handleRippleMouseDown} disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking} className="ripple-button h-12 px-6 font-bold text-sm flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 transition-all border-t border-b border-r border-white/10 rounded-r-xl">
                        <BookOpen size={15} fill="currentColor" />
                        {sourceScanLoading ? 'Scanning\u2026' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read Last'}
                      </button>
                    </div>
                  )}

                  <button type="button" onClick={handleBookmarkToggle} onMouseDown={handleRippleMouseDown} className={`ripple-button h-12 w-12 flex flex-shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    bookmarked ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]' : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}>
                    <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300">
                        Selected Source: {selectedSource ? selectedSource.label : 'None'}
                    </span>
                    {selectedSource?.status === 'available' ? (
                        <span className="rounded-full border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] px-3 py-2 text-[var(--app-accent)]">
                            {selectedSource.chapters.length} chapters available
                        </span>
                    ) : null}
                </div>
            </div>

            {/* 3. Stats & Details Panel (Upper Right) */}
            <div className="hidden xl:flex flex-col justify-end pb-2 w-[320px] flex-shrink-0">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                        <Info size={14} className="text-[var(--app-accent)]" />
                        Statistics
                    </div>
                    {statsUrl && (
                        <a
                            href={statsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:text-[var(--app-accent)] transition-colors duration-150 group"
                        >
                            Full stats
                            <ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                        </a>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Trophy size={12} className="text-[var(--app-accent)]"/> Rank</span>
                        <span className="text-xl font-bold text-white">#{data.rank ?? '?'}</span>
                    </div>
                    <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><TrendingUp size={12} className="text-[var(--app-accent)]"/> Popularity</span>
                        <span className="text-xl font-bold text-white">#{data.popularity ?? '?'}</span>
                    </div>
                    <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Users size={12} className="text-[var(--app-accent)]"/> Members</span>
                        <span className="text-xl font-bold text-white">{formatNumber(data.members)}</span>
                    </div>
                    <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-1 hover:border-white/10 transition-colors">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Heart size={12} className="text-[var(--app-accent)]"/> Favorites</span>
                        <span className="text-xl font-bold text-white">{formatNumber(data.favorites)}</span>
                    </div>
                </div>

                <div className="bg-black/20 border border-white/5 p-4 rounded-2xl shadow-lg flex flex-col gap-4 hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-3">
                        <Calendar size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Published</span>
                            <span className="block text-xs font-bold text-gray-300 mt-1">{data.published?.string || '?'}</span>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Library size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Serialization</span>
                            <span className="block text-xs font-bold text-gray-300 mt-1">{data.serializations?.[0]?.name || '?'}</span>
                        </div>
                    </div>
                    {data.title_japanese && (
                        <div className="flex items-start gap-3">
                        <Languages size={14} className="text-[var(--app-accent)] flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Alternative Title</span>
                                <span className="block text-xs font-bold text-gray-300 mt-1">{data.title_japanese}</span>
                            </div>
                        </div>
                    )}

                    {/* Tracker Redirect Buttons */}
                    <div className="mt-2 flex gap-2 pt-2 border-t border-white/5">
                        {data?.anilist_id && (
                            <a href={`https://anilist.co/manga/${data.anilist_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.03] text-zinc-300 text-[10px] font-semibold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.08] group">
                                AniList
                                <ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                        )}
                        {data?.mal_id && (
                            <a href={`https://myanimelist.net/manga/${data.mal_id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.03] text-zinc-300 text-[10px] font-semibold uppercase tracking-widest hover:bg-white/[0.08] hover:text-white transition-colors border border-white/[0.08] group">
                                MyAnimeList
                                <ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN BODY GRID --- */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">
            <div className="space-y-10">
                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-sm">
                    <h3 className="text-white font-semibold uppercase tracking-widest text-[11px] mb-3 text-opacity-50">Synopsis</h3>
                    <p className="text-gray-300 leading-relaxed text-sm font-medium">{data.synopsis || '?'}</p>
                </div>

{hasAniListSupplement ? (
  <div className="rounded-[2rem] border border-white/[0.05] bg-black/20 p-5 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
    {aniListSupplement.characters.length > 0 ? (
      <div className="mt-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          <Link2 size={13} className="text-[var(--app-accent)]" />
          Characters
        </h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {aniListSupplement.characters.map((character, i) => (
            <div
              key={character.id}
              className="group relative flex gap-3 rounded-[1.3rem] border border-white/[0.06] bg-white/[0.03] p-3 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Gradient border glow on hover */}
              <div className="pointer-events-none absolute inset-0 rounded-[1.3rem] opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(135deg, rgba(var(--app-accent-rgb), 0.08), transparent 60%)' }} />

              {/* Character Image */}
              <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                {character.image ? (
                  <img
                    src={character.image}
                    alt={character.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User size={18} className="text-white/20" />
                  </div>
                )}
              </div>

              {/* Character Info */}
              <div className="relative min-w-0 flex flex-col justify-center">
                <div className="line-clamp-2 text-[13px] font-bold leading-snug text-white/90 transition-colors duration-200 group-hover:text-white">
                  {character.name}
                </div>
                <span className="mt-1.5 inline-flex w-fit rounded-full bg-[var(--app-accent)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--app-accent)]/70">
                  {character.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </div>
) : null}

  <div className="rounded-[2rem] border border-white/[0.05] bg-black/20 p-5 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  <RadioTower size={14} className="text-[var(--app-accent)]" />
                  Reader Sources
              </div>
              <h3 className="mt-2 text-xl font-bold uppercase tracking-tight text-white">Select Source</h3>
              <p className="mt-2 text-sm text-zinc-400">Some sources have been disabled. Sources not wired into this build stay listed as unavailable.</p>
          </div>
          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
              {readerSources.filter((source) => source.status === 'available').length}/{readerSources.length || 0} available
          </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {readerSources.map((source) => {
              const isSelected = source.key === selectedSourceKey;
              const isAvailable = source.status === 'available';
              return (
                  <button key={source.key} type="button" onClick={() => isAvailable && selectSource(source.key)} disabled={!isAvailable} className={`active:scale-95 rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
                      isSelected && isAvailable ? 'border-[var(--app-accent)] bg-[var(--app-accent-muted)] shadow-[0_10px_30px_-15px_var(--app-accent-soft)]' : isAvailable ? 'border-white/[0.08] bg-black/40 hover:border-white/20 hover:bg-white/[0.05]' : 'cursor-not-allowed border-white/[0.05] bg-black/40 opacity-70'
                  }`}>
                      <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                              <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-[11px] font-bold uppercase tracking-[0.16em] ${source.iconClassName}`}>{source.iconText}</span>
                              <div className="min-w-0">
                                  <span className="block truncate text-[11px] font-bold uppercase tracking-[0.18em] text-white">{source.label}</span>
                                  <p className="mt-2 text-[11px] font-medium tracking-[0.02em] text-zinc-500">{source.message}</p>
                              </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${
                              isAvailable ? 'border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]' : 'border border-white/[0.08] bg-white/[0.03] text-zinc-500'
                          }`}>
                              {isAvailable ? <Check size={11} /> : <X size={11} />}
                              {isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                      </div>
                  </button>
              );
          })}
      </div>
  </div>

                {/* Chapter List */}
                <div className="rounded-[2rem] border border-white/[0.05] bg-black/20 p-4 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
                    <div className="mb-4 flex flex-col gap-4 px-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-bold uppercase italic tracking-tighter text-white">
                                    Chapters <span className="ml-2 text-base not-italic text-[var(--app-accent)]">({selectedSource?.status === 'available' ? selectedSource.chapters.length : 0})</span>
                                </h3>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                                    {selectedSource ? `${selectedSource.label} / ` : ''}{visibleChapters.length} visible / {chapterSortOrder === 'desc' ? 'newest first' : 'oldest first'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setChapterSortOrder((current) => current === 'desc' ? 'asc' : 'desc')} onMouseDown={handleRippleMouseDown} className="ripple-button inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                                    <ArrowDownUp size={14} />
                                    {chapterSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input value={chapterSearchQuery} onChange={(event) => setChapterSearchQuery(event.target.value)} placeholder="Search chapter number or title" className="w-full rounded-[1.4rem] border border-white/[0.08] bg-black/40 py-3 pl-12 pr-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--app-accent-soft)]" />
                        </div>
                    </div>

                    <div className="max-h-[720px] overflow-y-auto pr-2">
                        <div className="flex flex-col gap-1.5">
                            {selectedSource?.status === 'available' ? (
                                visibleChapters.length > 0 ? (
                                    visibleChapters.map((chapter) => {
                                        const chapterLabel = cleanChapterTitle(chapter.title);
                                        const chapterNumber = extractChapterNumber(chapter.title);
                                        const chapterReleaseDate = formatChapterDate(chapter.date);
                                        const chapterVolume = chapter.volume;
                                        return (
                                        <div key={chapter.id} onClick={() => selectedSource.mangaId && navigate(buildReaderHref(selectedSource.mangaId, chapter.id, selectedSource.key))} className="group flex items-center gap-4 rounded-[1.45rem] border border-white/[0.05] bg-black/40 px-4 py-3.5 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-white/5 cursor-pointer">
                                            <div className="hidden h-14 min-w-[5.25rem] flex-col items-center justify-center rounded-[1.1rem] border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] sm:flex">
                                                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--app-accent)] opacity-80">Volume</span>
                                                <span className="mt-1 text-lg font-bold leading-none text-white">{chapterVolume || '?'}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-[1rem] font-bold text-white">{chapterLabel || '?'}</span>
                                                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-400 sm:hidden">Vol {chapterVolume || '?'}</span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                                    <span>{chapterReleaseDate}</span>
                                                    {chapterNumber ? <span className="h-1 w-1 rounded-full bg-zinc-700" /> : null}
                                                    {chapterNumber ? <span>Chapter {chapterNumber}</span> : null}
                                                </div>
                                            </div>
                                            <span className="ml-4 flex-shrink-0 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 transition-colors group-hover:border-[var(--app-accent)] group-hover:text-[var(--app-accent)]">Open</span>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-[1.4rem] border border-white/[0.05] bg-black/40 p-8 text-center text-xs font-semibold uppercase tracking-[0.22em] text-gray-600">No chapters match this search</div>
                                )
                            ) : sourceScanLoading ? (
                                 [1,2,3,4,5,6].map(i => (<div key={i} className="h-16 rounded-[1.2rem] bg-white/5 animate-pulse" />))
                            ) : (
                                <div className="rounded-[1.4rem] border border-white/[0.05] bg-black/40 p-8 text-center">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">No active source</div>
                                    <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white">Pick an available reader source above</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-10">
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                            <MessageSquare size={14} className="text-[var(--app-accent)]" />
                            Reviews
                        </div>
                        {reviewsUrl && (
                            <a
                                href={reviewsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500 hover:text-[var(--app-accent)] transition-colors duration-150 group"
                            >
                                View all
                                <ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </a>
                        )}
                    </div>
                    <div className="space-y-4">
                        {reviews.length > 0 ? (
                            reviews.map((review) => (
                                <div key={review.id} className="rounded-2xl border border-white/[0.05] bg-black/20 p-4 shadow-lg transition-colors hover:border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <img src={review.user?.images?.jpg?.image_url} alt={review.user?.username || '?'} className="w-9 h-9 rounded-full object-cover bg-white/10 ring-1 ring-white/10" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-white truncate">{review.user?.username || '?'}</div>
                                                <div className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">{formatChapterDate(review.date)}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[var(--app-accent)] bg-[var(--app-accent-muted)] px-2 py-1 rounded-lg border border-[var(--app-accent-soft)]">
                                            <Star size={10} fill="currentColor" />
                                            <span className="text-[10px] font-bold">{review.score ? `${review.score}/100` : '?'}</span>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        {review.is_spoiler && (<span className="inline-block mb-2 text-[8px] font-bold uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">Spoiler</span>)}
                                        <p className="text-xs text-gray-300 leading-relaxed font-medium line-clamp-5">{review.review || '?'}</p>
                                    </div>
                                    {review.url && (
                                        <a
                                            href={review.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-3 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-600 hover:text-[var(--app-accent)] transition-colors duration-150 w-fit group"
                                        >
                                            Read full review
                                            <ExternalLink size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    )}
                                </div>
                            ))
                        ) : !loading ? (
                            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">No reviews found.</div>
                        ) : (
                            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest animate-pulse">Loading reviews...</div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500 mb-5">
                        <Tag size={14} className="text-[var(--app-accent)]" />
                        Recommendations
                    </div>
                    <div className="space-y-3">
                        {recs.length > 0 ? (
                            recs.map((item, idx) => (
                                <div key={`${item.entry.id}-${idx}`} onClick={() => navigate(`/read/${createSlug(item.entry.title)}`)} className="flex gap-3 group cursor-pointer p-2 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/[0.05]">
                                    <div className="w-14 h-20 flex-shrink-0 rounded-[1rem] overflow-hidden bg-gray-800 ring-1 ring-white/10">
                                        {item.entry.images?.jpg?.image_url ? <img src={item.entry.images.jpg.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" /> : <div className="w-full h-full bg-white/5" />}
                                    </div>
                                    <div className="flex flex-col justify-center min-w-0">
                                        <h4 className="text-xs font-bold text-gray-200 line-clamp-2 group-hover:text-[var(--app-accent)] transition-colors uppercase leading-tight">{item.entry.title || '?'}</h4>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest animate-pulse">Scanning recommendations...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Manga;