import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Star, Tag, Loader2, Bookmark, Search, ArrowDownUp, BookOpen, RadioTower, Check, X, Users, Link2 } from 'lucide-react';
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

// --- Interfaces ---
interface MangaData {
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  chapters?: number;
  volumes?: number;
  score?: number;
  status?: string;
  type?: string; 
  rank?: number;
  popularity?: number;
  authors?: { name: string }[];
  genres?: { mal_id: number; name: string }[];
  images: { jpg: { image_url: string; large_image_url: string; }; };
}

interface Recommendation {
  entry: {
    mal_id: number;
    title: string;
    images: { jpg: { image_url: string } };
  };
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

const ANILIST_SUPPLEMENT_QUERY = `
  query MangaSupplement($idMal: Int) {
    Media(idMal: $idMal, type: MANGA) {
      relations(perPage: 6) {
        edges {
          relationType(version: 2)
          node {
            id
            siteUrl
            format
            status(version: 2)
            title {
              userPreferred
            }
            coverImage {
              large
            }
          }
        }
      }
      characters(perPage: 6, sort: [ROLE, RELEVANCE, ID]) {
        edges {
          role
          node {
            id
            name {
              full
              userPreferred
            }
            image {
              large
              medium
            }
          }
        }
      }
      staff(perPage: 6, sort: [RELEVANCE]) {
        edges {
          role
          node {
            id
            name {
              full
              userPreferred
            }
            image {
              large
              medium
            }
          }
        }
      }
    }
  }
`;

const JIKAN_RETRY_DELAYS_MS = [450, 900, 1500];

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const fetchJsonWithRetry = async <T,>(url: string, retryDelays = JIKAN_RETRY_DELAYS_MS): Promise<T> => {
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    const response = await fetch(url);

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    if (response.status === 429 && attempt < retryDelays.length) {
      await wait(retryDelays[attempt]);
      continue;
    }

    throw new Error(`Request failed with status ${response.status} for ${url}`);
  }

  throw new Error(`Request failed for ${url}`);
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
  if (!isoDate) return 'Release date unavailable';

  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return 'Release date unavailable';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsedDate);
};

const Manga: React.FC = () => {
  const { mangaId } = useParams<{ mangaId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSourceKey = normalizeReaderSourceKey(searchParams.get('source')) || DEFAULT_READER_SOURCE;

  const [data, setData] = useState<MangaData | null>(null);
  const [readerSources, setReaderSources] = useState<ResolvedReaderSource[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceScanLoading, setSourceScanLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [aniListSupplement, setAniListSupplement] = useState<AniListSupplement>({ relations: [], characters: [], staff: [] });

  const [searchQuery, setSearchQuery] = useState('');
  const [chapterSearchQuery, setChapterSearchQuery] = useState('');
  const [chapterSortOrder, setChapterSortOrder] = useState<ChapterSortOrder>('desc');

  // Animations CSS Injection (ORIGINAL)
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

  // Main Detail Fetch (UPDATED for Recs)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setLoadFailed(false);
        setData(null);
        setRecs([]);
        setReaderSources([]);
        setAniListSupplement({ relations: [], characters: [], staff: [] });
        setSourceScanLoading(true);
        let mangaPayload: { data?: MangaData };

        try {
          mangaPayload = await fetchJsonWithRetry<{ data?: MangaData }>(`https://api.jikan.moe/v4/manga/${mangaId}/full`);
        } catch (fullError) {
          console.warn('Jikan full endpoint failed, falling back to base manga endpoint:', fullError);
          mangaPayload = await fetchJsonWithRetry<{ data?: MangaData }>(`https://api.jikan.moe/v4/manga/${mangaId}`);
        }

        const mangaData = mangaPayload.data || null;
        setData(mangaData);

        if (!mangaData) {
          throw new Error(`No manga payload returned for id ${mangaId}`);
        }

        // Fetch Recommendations for Sidebar
        try {
          const recJson = await fetchJsonWithRetry<{ data?: Recommendation[] }>(`https://api.jikan.moe/v4/manga/${mangaId}/recommendations`, [700]);
          setRecs(recJson.data?.slice(0, 5) || []);
        } catch (recError) {
          console.warn('Recommendation fetch failed:', recError);
          setRecs([]);
        }

        if (mangaData.title) {
          const resolvedSources = await resolveReaderSourceCatalog(mangaData.title.trim());
          setReaderSources(resolvedSources);
        }

        if (mangaData.mal_id) {
          try {
            const response = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: ANILIST_SUPPLEMENT_QUERY,
                variables: { idMal: mangaData.mal_id },
              }),
            });

            const payload = await response.json();
            const media = payload?.data?.Media;

            if (media) {
              setAniListSupplement({
                relations: Array.isArray(media.relations?.edges)
                  ? media.relations.edges
                      .filter((edge: any) => edge?.node?.id)
                      .map((edge: any) => ({
                        id: edge.node.id,
                        title: edge.node.title?.userPreferred || 'Untitled',
                        relationType: edge.relationType || 'Related',
                        format: edge.node.format,
                        status: edge.node.status,
                        siteUrl: edge.node.siteUrl,
                        coverImage: edge.node.coverImage?.large || null,
                      }))
                  : [],
                characters: Array.isArray(media.characters?.edges)
                  ? media.characters.edges
                      .filter((edge: any) => edge?.node?.id)
                      .map((edge: any) => ({
                        id: edge.node.id,
                        name: edge.node.name?.userPreferred || edge.node.name?.full || 'Unknown',
                        role: edge.role || 'Character',
                        image: edge.node.image?.large || edge.node.image?.medium || null,
                      }))
                  : [],
                staff: Array.isArray(media.staff?.edges)
                  ? media.staff.edges
                      .filter((edge: any) => edge?.node?.id)
                      .map((edge: any) => ({
                        id: edge.node.id,
                        name: edge.node.name?.userPreferred || edge.node.name?.full || 'Unknown',
                        role: edge.role || 'Staff',
                        image: edge.node.image?.large || edge.node.image?.medium || null,
                      }))
                  : [],
              });
            }
          } catch (aniListError) {
            console.warn('AniList supplement fetch failed:', aniListError);
          }
        }
      } catch (e) { 
        console.error("Fetch Error:", e); 
        setLoadFailed(true);
      } finally { 
        setSourceScanLoading(false);
        setLoading(false); 
      }
    };
    fetchAll();
    window.scrollTo(0, 0);
  }, [mangaId]);

  const selectedSource = getPreferredReaderSource(readerSources, requestedSourceKey);
  const selectedSourceKey = selectedSource?.key || '';

  useEffect(() => {
    const currentSourceParam = searchParams.get('source');

    if (!currentSourceParam || !selectedSource || currentSourceParam === selectedSource.key) {
      return;
    }

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
  // "First" = oldest chapter = lowest number
  const sorted = [...selectedSource.chapters].sort((a, b) => getChapterSortValue(a) - getChapterSortValue(b));
  navigate(buildReaderHref(selectedSource.mangaId, sorted[0].id, selectedSource.key));
  setIsLinking(false);
};

const handleReadLast = async () => {
  if (selectedSource?.status !== 'available' || !selectedSource.chapters.length || !selectedSource.mangaId) return;
  setIsLinking(true);
  // "Last" = newest chapter = highest number
  const sorted = [...selectedSource.chapters].sort((a, b) => getChapterSortValue(b) - getChapterSortValue(a));
  navigate(buildReaderHref(selectedSource.mangaId, sorted[0].id, selectedSource.key));
  setIsLinking(false);
};

  const chapterPool = selectedSource?.status === 'available' ? [...selectedSource.chapters] : [];
  const sortedChapters = [...chapterPool].sort((a, b) => {
    const aValue = getChapterSortValue(a);
    const bValue = getChapterSortValue(b);

    if (aValue !== bValue) {
      return chapterSortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    }

    return chapterSortOrder === 'desc'
      ? b.title.localeCompare(a.title)
      : a.title.localeCompare(b.title);
  });
  const visibleChapters = sortedChapters.filter((chapter) =>
    cleanChapterTitle(chapter.title).toLowerCase().includes(chapterSearchQuery.trim().toLowerCase())
  );
  const hasAniListSupplement = aniListSupplement.relations.length > 0 || aniListSupplement.characters.length > 0 || aniListSupplement.staff.length > 0;

  if (loading) return <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center"><div className="w-10 h-10 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex flex-col items-center justify-center gap-5 px-4 text-center text-white">
        <div className="text-xl font-black uppercase tracking-[0.16em]">
          {loadFailed ? 'Manga data failed to load' : 'Manga not found'}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--app-bg)] text-white pb-20 selection:bg-[var(--app-accent-muted)] font-sans">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="relative z-10 mx-auto w-full max-w-[1420px] px-4 pt-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 mb-8 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest">BACK</span>
        </button>

        {/* --- TOP SECTION: SIDE-BY-SIDE --- */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
            {/* 1. Poster */}
            <div className="w-full md:w-56 lg:w-72 flex-shrink-0 group perspective-1000">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-[var(--app-accent-soft)] group-hover:scale-[1.02] transition-transform duration-500">
                    <img src={data.images.jpg.large_image_url} className="w-full h-full object-cover" alt={data.title} />
                    <div className="absolute top-4 left-4 bg-[var(--app-accent)] text-white px-2 py-1 rounded text-[10px] font-black tracking-widest shadow-xl shadow-[var(--app-accent-soft)]">
                        #{data.rank || 'N/A'}
                    </div>
                </div>
            </div>

            {/* 2. Info & Actions */}
            <div className="flex-1 flex flex-col justify-end pb-2">
                <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.9] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4">
                    {data.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-wider text-gray-500 mb-6">
                    <span className="text-white flex items-center gap-1"><Tag size={12} className="text-[var(--app-accent)]" /> {data.authors?.[0]?.name || "Unknown"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span className={data.status === 'Publishing' ? 'text-[var(--app-accent)]' : 'text-blue-400'}>{data.status}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <div className="flex items-center gap-1 text-white">
                        <Star size={12} fill="currentColor" className="text-[var(--app-accent)]" />
                        {data.score}
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {data.genres?.map(g => (
                        <span key={g.mal_id} onClick={() => navigate(`/browse?genres=${g.name}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 hover:border-[var(--app-accent-soft)] hover:bg-opacity-10 transition-all cursor-pointer">
                            {g.name}
                        </span>
                    ))}
                </div>

                {/* Action Buttons (Matches Layout of Screenshot, Style of Premium) */}
<div className="flex items-center gap-3">
  {/* Split pill button */}
<div className={`flex items-center rounded-xl overflow-hidden transition-all ${
  selectedSource?.status !== 'available' || !selectedSource.chapters.length
    ? 'opacity-40 pointer-events-none'
    : ''
}`}>
  {/* Left: Read First */}
  <button
    onClick={handleReadFirst}
    onMouseDown={handleRippleMouseDown}
    disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
    className="ripple-button flex h-12 items-center gap-2 rounded-l-xl border-t border-b border-l px-6 text-sm font-black transition-all"
    style={{
      backgroundColor: 'var(--app-accent-muted)',
      color: 'var(--app-accent)',
      borderColor: 'var(--app-accent-soft)',
    }}
  >
    <BookOpen size={15} />
    {sourceScanLoading ? 'Scanning…' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read First'}
  </button>

  {/* Divider */}
  <div className="w-px self-stretch bg-[var(--app-accent-soft)]" />
  <div className="w-px self-stretch bg-white/10" />

  {/* Right: Read Last */}
  <button
    onClick={handleReadLast}
    onMouseDown={handleRippleMouseDown}
    disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
    className="ripple-button h-12 px-6 font-black text-sm flex items-center gap-2 bg-white/5 text-white hover:bg-white/10 transition-all border-t border-b border-r border-white/10 rounded-r-xl"
  >
    <BookOpen size={15} fill="currentColor" />
    {sourceScanLoading ? 'Scanning…' : isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Read Last'}
  </button>
</div>

  <button
    type="button"
    onClick={handleBookmarkToggle}
    onMouseDown={handleRippleMouseDown}
    className={`ripple-button h-12 w-12 flex items-center justify-center rounded-xl border transition-colors ${
      bookmarked
        ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]'
        : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
    }`}
  >
    <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
  </button>
</div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
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
        </div>

        {/* --- MAIN BODY GRID --- */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-12">
            
            {/* LEFT COLUMN: Sources + Synopsis + Chapter List */}
            <div className="space-y-10">

                {/* Synopsis */}
                <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                    <h3 className="text-white font-black uppercase tracking-widest text-[11px] mb-3 text-opacity-50">Synopsis</h3>
                    <p className="text-gray-300 leading-relaxed text-sm font-medium">{data.synopsis}</p>
                </div>

                {hasAniListSupplement ? (
                    <div className="rounded-[2rem] border border-white/[0.05] bg-black/20 p-5 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                            <Users size={14} className="text-[var(--app-accent)]" />
                            AniList Data
                        </div>

                        {aniListSupplement.relations.length > 0 ? (
                            <div className="mt-5">
                                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Relations</h3>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {aniListSupplement.relations.map((relation) => (
                                        <a
                                            key={relation.id}
                                            href={relation.siteUrl || undefined}
                                            target={relation.siteUrl ? '_blank' : undefined}
                                            rel={relation.siteUrl ? 'noreferrer' : undefined}
                                            className="group flex gap-3 rounded-[1.3rem] border border-white/[0.05] bg-black/40 p-3 transition-colors hover:border-[var(--app-accent-soft)] hover:bg-white/[0.04]"
                                        >
                                            <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-[1rem] bg-white/[0.04]">
                                                {relation.coverImage ? <img src={relation.coverImage} alt={relation.title} className="h-full w-full object-cover" /> : null}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)]">{relation.relationType}</div>
                                                <div className="mt-1 line-clamp-2 text-sm font-black text-white">{relation.title}</div>
                                                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                                    {[relation.format, relation.status].filter(Boolean).join(' / ')}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {aniListSupplement.characters.length > 0 ? (
                            <div className="mt-6">
                                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                                    <Link2 size={14} className="text-[var(--app-accent)]" />
                                    Characters
                                </h3>
                                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {aniListSupplement.characters.map((character) => (
                                        <div key={character.id} className="flex gap-3 rounded-[1.3rem] border border-white/[0.05] bg-black/40 p-3">
                                            <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-[1rem] bg-white/[0.04]">
                                                {character.image ? <img src={character.image} alt={character.name} className="h-full w-full object-cover" /> : null}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="line-clamp-2 text-sm font-black text-white">{character.name}</div>
                                                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{character.role}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {aniListSupplement.staff.length > 0 ? (
                            <div className="mt-6">
                                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Staff</h3>
                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    {aniListSupplement.staff.map((staffMember) => (
                                        <div key={staffMember.id} className="flex gap-3 rounded-[1.3rem] border border-white/[0.05] bg-black/40 p-3">
                                            <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-[1rem] bg-white/[0.04]">
                                                {staffMember.image ? <img src={staffMember.image} alt={staffMember.name} className="h-full w-full object-cover" /> : null}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="line-clamp-2 text-sm font-black text-white">{staffMember.name}</div>
                                                <div className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{staffMember.role}</div>
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
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                                <RadioTower size={14} className="text-[var(--app-accent)]" />
                                Reader Sources
                            </div>
                            <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Select Source</h3>
                            <p className="mt-2 text-sm text-zinc-400">Some sources have been disabled. Sources not wired into this build stay listed as unavailable.</p>
                        </div>
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300">
                            {readerSources.filter((source) => source.status === 'available').length}/{readerSources.length || 0} available
                        </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {readerSources.map((source) => {
                            const isSelected = source.key === selectedSourceKey;
                            const isAvailable = source.status === 'available';

                            return (
                                <button
                                    key={source.key}
                                    type="button"
                                    onClick={() => isAvailable && selectSource(source.key)}
                                    onMouseDown={isAvailable ? undefined : undefined}
                                    disabled={!isAvailable}
                                    className={`active:scale-95 rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
                                        isSelected && isAvailable
                                          ? 'border-[var(--app-accent)] bg-[var(--app-accent-muted)] shadow-[0_10px_30px_-15px_var(--app-accent-soft)]'
                                          : isAvailable
                                            ? 'border-white/[0.08] bg-black/40 hover:border-white/20 hover:bg-white/[0.05]'
                                            : 'cursor-not-allowed border-white/[0.05] bg-black/40 opacity-70'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-[11px] font-black uppercase tracking-[0.16em] ${source.iconClassName}`}>
                                                {source.iconText}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="block truncate text-[11px] font-black uppercase tracking-[0.18em] text-white">{source.label}</span>
                                                <p className="mt-2 text-[11px] font-semibold tracking-[0.02em] text-zinc-500">{source.message}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
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

                {/* Chapter List (Vertical Rows) */}
                <div className="rounded-[2rem] border border-white/[0.05] bg-black/20 p-4 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
                    <div className="mb-4 flex flex-col gap-4 px-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                                    Chapters <span className="ml-2 text-base not-italic text-[var(--app-accent)]">({selectedSource?.status === 'available' ? selectedSource.chapters.length : 0})</span>
                                </h3>
                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                                    {selectedSource ? `${selectedSource.label} / ` : ''}{visibleChapters.length} visible / {chapterSortOrder === 'desc' ? 'newest first' : 'oldest first'}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setChapterSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                                    onMouseDown={handleRippleMouseDown}
                                    className="ripple-button inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                                >
                                    <ArrowDownUp size={14} />
                                    {chapterSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input
                                value={chapterSearchQuery}
                                onChange={(event) => setChapterSearchQuery(event.target.value)}
                                placeholder="Search chapter number or title"
                                className="w-full rounded-[1.4rem] border border-white/[0.08] bg-black/40 py-3 pl-12 pr-4 text-[11px] font-black uppercase tracking-[0.16em] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-[var(--app-accent-soft)]"
                            />
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
                                        <div 
                                            key={chapter.id}
                                            onClick={() => selectedSource.mangaId && navigate(buildReaderHref(selectedSource.mangaId, chapter.id, selectedSource.key))}
                                            className="group flex items-center gap-4 rounded-[1.45rem] border border-white/[0.05] bg-black/40 px-4 py-3.5 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-white/5 cursor-pointer"
                                        >
                                            <div className="hidden h-14 min-w-[5.25rem] flex-col items-center justify-center rounded-[1.1rem] border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] sm:flex">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)] opacity-80">Volume</span>
                                                <span className="mt-1 text-lg font-black leading-none text-white">
                                                    {chapterVolume || '--'}
                                                </span>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate text-[1rem] font-black text-white">{chapterLabel}</span>
                                                    <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:hidden">
                                                        Vol {chapterVolume || '--'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
                                                    <span>{chapterReleaseDate}</span>
                                                    {chapterNumber ? <span className="h-1 w-1 rounded-full bg-zinc-700" /> : null}
                                                    {chapterNumber ? <span>Chapter {chapterNumber}</span> : null}
                                                </div>
                                            </div>

                                            <span className="ml-4 flex-shrink-0 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors group-hover:border-[var(--app-accent)] group-hover:text-[var(--app-accent)]">
                                                Open
                                            </span>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-[1.4rem] border border-white/[0.05] bg-black/40 p-8 text-center text-xs font-black uppercase tracking-[0.22em] text-gray-600">
                                        No chapters match this search
                                    </div>
                                )
                            ) : sourceScanLoading ? (
                                 [1,2,3,4,5,6].map(i => (
                                    <div key={i} className="h-16 rounded-[1.2rem] bg-white/5 animate-pulse" />
                                 ))
                            ) : (
                                <div className="rounded-[1.4rem] border border-white/[0.05] bg-black/40 p-8 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">No active source</div>
                                    <div className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white">Pick an available reader source above</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Sidebar (Recommendations) */}
            <div className="space-y-8">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                    </h3>
                    <div className="space-y-3">
                        {recs.length > 0 ? (
                            recs.map((item) => (
                                <div 
                                    key={item.entry.mal_id} 
                                    onClick={() => navigate(`/read/${item.entry.mal_id}`)}
                                    className="flex gap-3 group cursor-pointer p-2 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800 ring-1 ring-white/10">
                                        <img src={item.entry.images.jpg.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                    </div>
                                    <div className="flex flex-col justify-center min-w-0">
                                        <h4 className="text-xs font-black text-gray-200 line-clamp-2 group-hover:text-[var(--app-accent)] transition-colors uppercase leading-tight">{item.entry.title}</h4>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest animate-pulse">Scanning database...</div>
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