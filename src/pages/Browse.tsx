import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Star, X, ShieldCheck, Globe } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { isAllowedSeriesType } from '../utils/contentFilters';
import { handleRippleMouseDown } from '../utils/ripple';

interface Manga {
  mal_id: number;
  title: string;
  score?: number;
  chapters?: number;
  type?: string;
  status?: string;
  rank?: number;
  published?: { from: string };
  authors?: { name: string }[];
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
}

interface BrowseProps {
  initialSort?: string;
  title?: string;
}

const FORBIDDEN_GENRE_IDS = [12, 49, 9, 10, 14, 37, 38];
const FORMAT_FILTERS = ['all', 'manga', 'manhwa', 'manhua'] as const;
type FormatFilter = typeof FORMAT_FILTERS[number];

const resolveFormatFilter = (value: string | null): FormatFilter => {
  if (value && FORMAT_FILTERS.includes(value as FormatFilter)) {
    return value as FormatFilter;
  }

  return 'all';
};

const matchesFormatFilter = (mangaType: string | undefined, filter: FormatFilter) => {
  if (filter === 'all') return true;
  return (mangaType || '').toLowerCase() === filter;
};

const getChapterCountDisplay = (manga: Manga) =>
  typeof manga.chapters === 'number' && manga.chapters > 0 ? String(manga.chapters) : '--';

const MangaListCard: React.FC<{ manga: Manga; navigate: any }> = ({ manga, navigate }) => (
  <div
    onClick={() => navigate(`/read/${manga.mal_id}`)}
    className="group relative flex h-48 cursor-pointer gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[#111214] p-3 transition-all duration-300 hover:border-emerald-400/15 hover:bg-[#15171a] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)]"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[#121418] ring-1 ring-white/[0.08]">
      <img
        src={manga.images.jpg.image_url}
        alt={manga.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
              {manga.type || 'Manga'}
            </span>
            {manga.score ? (
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] font-black text-white/75">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {manga.score.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-black leading-tight text-white transition-colors group-hover:text-white/90">
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-[12px] font-semibold text-zinc-400">
            {manga.authors?.[0]?.name || 'Unknown author'}
          </p>
        </div>

        <div className="hidden rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400 sm:block">
          #{manga.rank || 'N/A'}
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[#1a1b1e] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Status</span>
            <span className={`mt-2 block text-[11px] font-black uppercase tracking-[0.1em] ${manga.status === 'Publishing' ? 'text-emerald-300' : 'text-sky-300'}`}>
              {manga.status || 'Unknown'}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Started</span>
            <span className="mt-2 block text-sm font-black text-white">
              {manga.published?.from ? new Date(manga.published.from).getFullYear() : 'N/A'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Chapters</span>
            <span className="mt-2 block truncate text-sm font-black uppercase text-white">
              {getChapterCountDisplay(manga)}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px] opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  </div>
);

const Browse: React.FC<BrowseProps> = ({ initialSort = 'popularity', title = 'Explore Manga' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get('q') || '';
  const formatFilter = resolveFormatFilter(searchParams.get('type'));

  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(queryFromUrl);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [safeSearch, setSafeSearch] = useState(true);
  const [hdImages, setHdImages] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const id = 'vf-ui-animations';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      .animate-in { will-change: transform, opacity; }
      .fade-in { animation: vf-fade-in .3s cubic-bezier(.2,.9,.3,1) both; }
      .zoom-in { animation: vf-zoom-in .3s cubic-bezier(.2,.9,.3,1) both; }
      @keyframes vf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vf-zoom-in { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    setSearchQuery(queryFromUrl);
    setPage(1);
    setHasMore(true);
  }, [queryFromUrl]);

  const performSearch = useCallback(async (pageNum: number = 1) => {
    if (pageNum === 1) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('page', pageNum.toString());
      const hasCommittedQuery = Boolean(queryFromUrl.trim());

      if (hasCommittedQuery) {
        // Match the same Jikan search behavior used by the top-right HUD.
        params.append('q', queryFromUrl.trim());
      } else {
        params.append('sfw', safeSearch ? 'true' : 'false');
        params.append('order_by', initialSort);
        params.append('sort', 'desc');
      }

      const res = await fetch(`https://api.jikan.moe/v4/manga?${params.toString()}`);
      const data = await res.json();
      const items = Array.isArray(data.data) ? data.data : [];

      const filteredData = hasCommittedQuery
        ? items.filter((m: any) => isAllowedSeriesType(m.type) && matchesFormatFilter(m.type, formatFilter))
        : items.filter((m: any) =>
            isAllowedSeriesType(m.type) &&
            !(m.genres ?? []).some((g: any) => FORBIDDEN_GENRE_IDS.includes(g.mal_id)) &&
            matchesFormatFilter(m.type, formatFilter)
          );

      setMangaList(prev => (pageNum === 1 ? filteredData : [...prev, ...filteredData]));
      setHasMore(Boolean(data.pagination?.has_next_page));
    } catch (e) {
      console.error(e);
      if (pageNum === 1) {
        setMangaList([]);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [formatFilter, initialSort, queryFromUrl, safeSearch]);

  useEffect(() => {
    performSearch(1);
  }, [performSearch]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const nextPage = prev + 1;
          performSearch(nextPage);
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [hasMore, loading, performSearch]);

  const submitBrowseSearch = useCallback((rawQuery: string) => {
    const trimmed = rawQuery.trim();
    const nextParams = new URLSearchParams(searchParams);
    if (trimmed) nextParams.set('q', trimmed);
    else nextParams.delete('q');
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  const setBrowseFormatFilter = useCallback((nextFilter: FormatFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === 'all') nextParams.delete('type');
    else nextParams.set('type', nextFilter);
    setSearchParams(nextParams);
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-screen bg-[#111214] text-white font-sans selection:bg-emerald-500/30">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onSearchSubmit={submitBrowseSearch} />

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-lg bg-[#080809] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">System Config</h2>
                <button onClick={() => setIsSettingsOpen(false)}><X className="text-gray-500 hover:text-red-500" /></button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="text-emerald-500" />
                    <div><div className="text-xs font-black uppercase">Safe Search</div><div className="text-[10px] text-gray-500">Filter explicit content</div></div>
                  </div>
                  <button onClick={() => setSafeSearch(!safeSearch)} className={`w-12 h-6 rounded-full relative transition-colors ${safeSearch ? 'bg-emerald-600' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${safeSearch ? 'left-7' : 'left-1'}`} /></button>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Globe className="text-emerald-500" />
                    <div><div className="text-xs font-black uppercase">HD Images</div><div className="text-[10px] text-gray-500">High bandwidth usage</div></div>
                  </div>
                  <button onClick={() => setHdImages(!hdImages)} className={`w-12 h-6 rounded-full relative transition-colors ${hdImages ? 'bg-emerald-600' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${hdImages ? 'left-7' : 'left-1'}`} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1420px] px-4 py-8 space-y-6">
        <div className="flex flex-col gap-4 border-b border-white/5 pb-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white mb-1">{title}</h2>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Index: {mangaList.length} Items Found</p>
            </div>
            
          <div className="flex flex-wrap gap-2">
            {FORMAT_FILTERS.map((filter) => {
              const isActive = formatFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setBrowseFormatFilter(filter)}
                  onMouseDown={handleRippleMouseDown}
                  className={`rounded-2xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
                    isActive
                      ? 'ripple-button border-emerald-400/30 bg-emerald-400 text-[#04110d] shadow-[0_16px_32px_-20px_rgba(52,211,153,0.9)]'
                      : 'ripple-button border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
          </div>


        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mangaList.map((manga, idx) => (
            <MangaListCard key={`${manga.mal_id}-${idx}`} manga={manga} navigate={navigate} />
          ))}
        </div>

        <div ref={lastElementRef} className="h-24 w-full flex items-center justify-center">
          {loading && (
             <div className="flex flex-col items-center gap-2">
                 <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">Syncing Database</span>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Browse;

