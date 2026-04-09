import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Star, Tag, Loader2, Bookmark, Search, ArrowDownUp, BookOpen, RadioTower, Check, X } from 'lucide-react';
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

type ChapterSortOrder = 'desc' | 'asc';

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

  const handleStartReading = async () => {
    const mangaToRead = selectedSource;

    if (mangaToRead?.status === 'available' && mangaToRead.chapters.length && mangaToRead.mangaId) {
      setIsLinking(true);
      const firstChapter = mangaToRead.chapters[0];
      navigate(buildReaderHref(mangaToRead.mangaId, firstChapter.id, mangaToRead.key));
      setIsLinking(false);
    }
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

  if (loading) return <div className="min-h-screen bg-[#111214] flex items-center justify-center"><div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-[#111214] flex flex-col items-center justify-center gap-5 px-4 text-center text-white">
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
    <div className="relative min-h-screen bg-[#111214] text-white pb-20 selection:bg-emerald-500/30 font-sans">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="relative z-10 mx-auto w-full max-w-[1420px] px-4 pt-8">
        <button onClick={() => navigate(-1)} onMouseDown={handleRippleMouseDown} className="ripple-button flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 mb-8 group">
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-black uppercase tracking-widest">BACK</span>
        </button>

        {/* --- TOP SECTION: SIDE-BY-SIDE --- */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
            {/* 1. Poster */}
            <div className="w-full md:w-56 lg:w-72 flex-shrink-0 group perspective-1000">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-emerald-500/20 group-hover:scale-[1.02] transition-transform duration-500">
                    <img src={data.images.jpg.large_image_url} className="w-full h-full object-cover" alt={data.title} />
                    <div className="absolute top-4 left-4 bg-emerald-500 text-black px-2 py-1 rounded text-[10px] font-black tracking-widest shadow-xl shadow-emerald-500/20">
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
                    <span className="text-white flex items-center gap-1"><Tag size={12} className="text-emerald-500" /> {data.authors?.[0]?.name || "Unknown"}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span className={data.status === 'Publishing' ? 'text-emerald-400' : 'text-blue-400'}>{data.status}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <div className="flex items-center gap-1 text-white">
                        <Star size={12} fill="#10B981" className="text-emerald-500" />
                        {data.score}
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {data.genres?.map(g => (
                        <span key={g.mal_id} onClick={() => navigate(`/browse?q=${g.name}`)} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 hover:border-white-500 hover:bg-opacity-10 transition-all cursor-pointer">
                            {g.name}
                        </span>
                    ))}
                </div>

                {/* Action Buttons (Matches Layout of Screenshot, Style of Premium) */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleStartReading}
                        onMouseDown={handleRippleMouseDown}
                        disabled={selectedSource?.status !== 'available' || !selectedSource.chapters.length || isLinking}
                        className={`ripple-button h-12 px-8 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${
                            selectedSource?.status !== 'available' || !selectedSource.chapters.length ? 'rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors cursor-not-allowed' : 
                            'bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 shadow-emerald-500/20'
                        }`}
                    >
                        <BookOpen size={16} fill="currentColor" className="relative z-10" />
                        {isLinking ? <Loader2 className="animate-spin" size={18} /> : sourceScanLoading ? 'Scanning...' : selectedSource?.status !== 'available' ? 'Unavailable' : 'Read Chapter 1'}
                    </button>
                    <button onMouseDown={handleRippleMouseDown} className="ripple-button h-12 w-12 flex active:scale-95 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
                        <Bookmark size={20} />
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-zinc-300">
                        Selected Source: {selectedSource ? selectedSource.label : 'None'}
                    </span>
                    {selectedSource?.status === 'available' ? (
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-emerald-300">
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

                         <div className="rounded-[2rem] border border-white/[0.05] bg-[#0d0f11] p-5 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                                <RadioTower size={14} className="text-emerald-400" />
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
                                    onMouseDown={isAvailable ? handleRippleMouseDown : undefined}
                                    disabled={!isAvailable}
                                    className={`ripple-button rounded-[1.35rem] border px-4 py-4 text-left transition-all ${
                                        isSelected && isAvailable
                                          ? 'border-emerald-500/35 bg-emerald-500/[0.08] shadow-[0_20px_40px_-28px_rgba(16,185,129,0.55)]'
                                          : isAvailable
                                            ? 'border-white/[0.08] bg-[#101114] hover:border-white-500/20 hover:bg-white/[0.05]'
                                            : 'cursor-not-allowed border-white/[0.05] bg-[#101114] opacity-70'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white">{source.label}</span>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                                            isAvailable ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border border-white/[0.08] bg-white/[0.03] text-zinc-500'
                                        }`}>
                                            {isAvailable ? <Check size={11} /> : <X size={11} />}
                                            {isAvailable ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{source.message}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Chapter List (Vertical Rows) */}
                <div className="rounded-[2rem] border border-white/[0.05] bg-[#0d0f11] p-4 shadow-[0_24px_60px_-38px_rgba(0,0,0,0.9)]">
                    <div className="mb-4 flex flex-col gap-4 px-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">
                                    Chapters <span className="ml-2 text-base not-italic text-emerald-500">({selectedSource?.status === 'available' ? selectedSource.chapters.length : 0})</span>
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
                                className="w-full rounded-[1.4rem] border border-white/[0.08] bg-[#111214] py-3 pl-12 pr-4 text-[11px] font-black uppercase tracking-[0.16em] text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/30"
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
                                            className="group flex items-center gap-4 rounded-[1.45rem] border border-white/[0.05] bg-[#0a0a0b] px-4 py-3.5 transition-all duration-300 hover:border-emerald-500/20 hover:bg-[#111214] cursor-pointer"
                                        >
                                            <div className="hidden h-14 min-w-[5.25rem] flex-col items-center justify-center rounded-[1.1rem] border border-emerald-500/10 bg-emerald-500/[0.06] sm:flex">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Volume</span>
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

                                            <span className="ml-4 flex-shrink-0 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors group-hover:border-emerald-500/20 group-hover:text-emerald-300">
                                                Open
                                            </span>
                                        </div>
                                        );
                                    })
                                ) : (
                                    <div className="rounded-[1.4rem] border border-white/[0.05] bg-[#0a0a0b] p-8 text-center text-xs font-black uppercase tracking-[0.22em] text-gray-600">
                                        No chapters match this search
                                    </div>
                                )
                            ) : sourceScanLoading ? (
                                 [1,2,3,4,5,6].map(i => (
                                    <div key={i} className="h-16 rounded-[1.2rem] bg-white/5 animate-pulse" />
                                 ))
                            ) : (
                                <div className="rounded-[1.4rem] border border-white/[0.05] bg-[#0a0a0b] p-8 text-center">
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
                                        <h4 className="text-xs font-black text-gray-200 line-clamp-2 group-hover:text-emerald-400 transition-colors uppercase leading-tight">{item.entry.title}</h4>
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
