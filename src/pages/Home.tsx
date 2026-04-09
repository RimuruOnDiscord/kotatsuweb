import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Star, Flame, BookOpen, ShieldCheck, Play
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { containsNovelToken, isAllowedSeriesType } from '../utils/contentFilters';
import { handleRippleMouseDown } from '../utils/ripple';

// --- Interfaces ---
interface Manga {
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  chapters?: number;
  score?: number;
  status?: string;
  type?: string; 
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

const CONTINUE_READING_KEY = 'mangavel:continue-reading';
const FORMAT_FILTERS = ['all', 'manga', 'manhwa', 'manhua'] as const;
type FormatFilter = typeof FORMAT_FILTERS[number];

const matchesFormatFilter = (mangaType: string | undefined, filter: FormatFilter) => {
  if (filter === 'all') return true;
  return (mangaType || '').toLowerCase() === filter;
};

const getChapterCountDisplay = (manga: Manga) =>
  typeof manga.chapters === 'number' && manga.chapters > 0 ? String(manga.chapters) : '--';

const normalizeContinueReading = (raw: string | null): ContinueReadingData[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is ContinueReadingData =>
        Boolean(item?.mangaId && item?.href) &&
        !containsNovelToken(item.mangaId) &&
        !containsNovelToken(item.chapterId) &&
        !containsNovelToken(item.mangaTitle) &&
        !containsNovelToken(item.chapterTitle) &&
        !containsNovelToken(item.href)
      );
    }
    if (
      parsed?.mangaId &&
      parsed?.href &&
      !containsNovelToken(parsed.mangaId) &&
      !containsNovelToken(parsed.chapterId) &&
      !containsNovelToken(parsed.mangaTitle) &&
      !containsNovelToken(parsed.chapterTitle) &&
      !containsNovelToken(parsed.href)
    ) {
      return [parsed as ContinueReadingData];
    }
  } catch {
    return [];
  }

  return [];
};

// --- Components ---

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.08]">
        <Icon className="text-emerald-400" size={18} />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

// 3. The New Horizontal Manga Card
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

const ContinueReadingCard: React.FC<{
  data: ContinueReadingData;
  navigate: any;
  onClear: (mangaId: string) => void;
}> = ({ data, navigate, onClear }) => {
  const coverSrc = data.mangaCover
    ? `/api/image?url=${encodeURIComponent(data.mangaCover)}`
    : '';
  const progressPercent = Math.max(((data.pageIndex + 1) / Math.max(data.totalPages, 1)) * 100, 6);

  return (
    <div className="group relative flex min-h-44 gap-3 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[#111214] p-3 transition-all duration-300 hover:border-emerald-400/15 hover:bg-[#15171a] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)]">
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[#121418] ring-1 ring-white/[0.08]">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={data.mangaTitle}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-500/50">
            <BookOpen size={26} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-2">
          <div className="min-w-0">
            <span className="mb-2 inline-flex items-center rounded-full border border-emerald-400/10 bg-emerald-400/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-emerald-300">
              Continue Reading
            </span>
            <h3 className="truncate text-[1.08rem] font-black leading-tight text-white transition-colors group-hover:text-white/90">
              {data.mangaTitle}
            </h3>
            <p className="mt-1 truncate text-[12px] font-semibold text-zinc-400">
              {data.chapterTitle}
            </p>
          </div>
        </div>

        <div className="mt-auto rounded-[1.15rem] bg-[#1a1b1e] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Progress</span>
                <span className="mt-1 block text-sm font-black text-white">
                  Page {data.pageIndex + 1}
                  <span className="ml-1 text-white/40">/ {data.totalPages}</span>
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => navigate(data.href)}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button group/button relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-400 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#04110d] transition-all active:scale-[0.98] hover:bg-emerald-300"
              >
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                <Play size={13} fill="currentColor" className="relative z-10" />
                <span className="relative z-10">Resume</span>
              </button>
              <button
                onClick={() => onClear(data.mangaId)}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px] opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
};

const Homer: React.FC = () => {
  const navigate = useNavigate();
  const [topManga, setTopManga] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState<ContinueReadingData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [safeSearch, setSafeSearch] = useState(true);

  // Animations
  useEffect(() => {
    const id = 'vf-ui-animations';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      .animate-in { will-change: transform, opacity; }
      .fade-in { animation: vf-fade-in .3s both; }
      .zoom-in { animation: vf-zoom-in .3s cubic-bezier(.2,.9,.3,1) both; }
      @keyframes vf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vf-zoom-in { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncContinueReading = () => {
      try {
        const raw = window.localStorage.getItem(CONTINUE_READING_KEY);
        const nextEntries = normalizeContinueReading(raw);
        setContinueReading(nextEntries);
        if (nextEntries.length > 0) {
          window.localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(nextEntries));
        } else {
          window.localStorage.removeItem(CONTINUE_READING_KEY);
        }
      } catch {
        setContinueReading([]);
      }
    };

    syncContinueReading();
    window.addEventListener('storage', syncContinueReading);
    window.addEventListener('focus', syncContinueReading);

    return () => {
      window.removeEventListener('storage', syncContinueReading);
      window.removeEventListener('focus', syncContinueReading);
    };
  }, []);

  const clearContinueReading = useCallback((mangaId: string) => {
    if (typeof window === 'undefined') return;

    const next = continueReading.filter((entry) => entry.mangaId !== mangaId);
    setContinueReading(next);

    if (next.length > 0) {
      window.localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(CONTINUE_READING_KEY);
    }
  }, [continueReading]);

  // Fetch Logic
  useEffect(() => {
    const fetchTop = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://api.jikan.moe/v4/top/manga?filter=publishing&limit=24');
        const data = await res.json();
        setTopManga(data.data || []);
      } finally { setLoading(false); }
    };
    fetchTop();
  }, []);

  const filteredTopManga = topManga.filter((manga) => isAllowedSeriesType(manga.type) && matchesFormatFilter(manga.type, formatFilter));
  const heroManga = filteredTopManga[0];
  const heroYear = heroManga?.published?.from ? new Date(heroManga.published.from).getFullYear() : null;
  const heroAuthor = heroManga?.authors?.[0]?.name;

  return (
    <div className="min-h-screen bg-[#111214] text-white font-sans selection:bg-emerald-500/30">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsSettingsOpen(false)} />
            <div className="relative w-full max-w-lg bg-[#080809] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 p-8">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Config</h2>
                    <button onClick={() => setIsSettingsOpen(false)}><X className="text-gray-500 hover:text-red-500" /></button>
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="text-emerald-500" />
                            <div><div className="text-xs font-black uppercase">Safe Search</div></div>
                        </div>
                        <button onClick={() => setSafeSearch(!safeSearch)} className={`w-12 h-6 rounded-full relative transition-colors ${safeSearch ? 'bg-emerald-600' : 'bg-gray-700'}`}><div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${safeSearch ? 'left-7' : 'left-1'}`} /></button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1420px] px-4 py-8 space-y-10">
        
        <section className="overflow-hidden rounded-[2rem] border border-white/[0.05] bg-[#111214] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]">
          {loading ? (
             <div className="h-[440px] w-full bg-white/5 animate-pulse" />
          ) : heroManga ? (
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative overflow-hidden">
                <div className="relative z-10 flex h-full flex-col justify-between px-7 py-7 md:px-10 md:py-8 lg:px-12 lg:py-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                      #{heroManga.rank || 1} Top Publishing
                    </span>
                    {heroManga.score ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10px] font-black text-white/80">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {heroManga.score.toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  <div className="max-w-3xl py-6">
                    <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight text-white md:text-5xl lg:text-[4rem] lg:leading-[0.94]">
                      {heroManga.title}
                    </h1>
                    {heroManga.synopsis ? (
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300/85 md:text-[15px]">
                        {heroManga.synopsis.length > 220 ? `${heroManga.synopsis.slice(0, 220)}...` : heroManga.synopsis}
                      </p>
                    ) : null}

                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(`/read/${heroManga.mal_id}`)}
                        onMouseDown={handleRippleMouseDown}
                        className="ripple-button group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl bg-emerald-400 px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-[#04110d] transition-all hover:bg-emerald-300 active:scale-[0.98]"
                      >
                        <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                        <BookOpen size={16} fill="currentColor" className="relative z-10" />
                        <span className="relative z-10">Open Series</span>
                      </button>
                      <button
                        onClick={() => navigate('/browse')}
                        onMouseDown={handleRippleMouseDown}
                        className="ripple-button inline-flex items-center rounded-2xl bg-white/[0.03] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/[0.06] active:scale-[0.98]"
                      >
                        Browse Library
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[#1a1b1e] px-4 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">Status</div>
                      <div className="mt-2 text-sm font-black uppercase text-emerald-300">{heroManga.status || 'Unknown'}</div>
                    </div>
                    <div className="rounded-2xl bg-[#1a1b1e] px-4 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">Type</div>
                      <div className="mt-2 text-sm font-black uppercase text-white">{heroManga.type || 'Manga'}</div>
                    </div>
                    <div className="rounded-2xl bg-[#1a1b1e] px-4 py-3">
                      <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-500">Chapters</div>
                      <div className="mt-2 text-sm font-black uppercase text-white">{getChapterCountDisplay(heroManga)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center border-t border-white/[0.06] bg-[#1a1b1e] p-6 lg:border-l lg:border-t-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.025),transparent_60%)]" />
                <div className="relative mx-auto flex h-full max-w-[280px] items-center justify-center">
                  <div className="absolute inset-x-6 top-10 h-16 rounded-full bg-white/[0.04] blur-3xl" />
                  <img
                    src={heroManga.images.jpg.large_image_url || heroManga.images.jpg.image_url}
                    alt={heroManga.title}
                    className="relative aspect-[2/3] w-full rounded-[1.8rem] border border-white/[0.08] object-cover shadow-[0_25px_60px_-28px_rgba(0,0,0,0.95)]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">No Matches</p>
                <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">No {formatFilter} titles in this feed</h3>
                <p className="mt-3 text-sm text-zinc-400">Try another format filter to load a different front-page selection.</p>
              </div>
            </div>
          )}
        </section>

        {continueReading.length > 0 && (
          <section className="space-y-6">
            <SectionHeader icon={BookOpen} title="Continue Reading" subtitle={`${continueReading.length} in progress`} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {continueReading.map((entry) => (
                <div key={entry.mangaId} className="xl:max-w-[760px]">
                <ContinueReadingCard
                  data={entry}
                  navigate={navigate}
                  onClear={clearContinueReading}
                />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- MAIN GRID --- */}
        <section className="space-y-6">
          <SectionHeader
            icon={Flame}
            title="Top Publishing"
            subtitle={formatFilter === 'all' ? 'current top manga' : `${filteredTopManga.length} ${formatFilter} titles loaded`}
          />
          
          {/* THE NEW HORIZONTAL GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
               // Skeleton Loaders
               [...Array(9)].map((_, i) => (
                 <div key={i} className="flex bg-[#0c0c0e] border border-white/5 rounded-xl h-44 animate-pulse p-4 gap-4">
                    <div className="w-32 bg-white/5 rounded-lg" />
                    <div className="flex-1 space-y-2 py-2">
                        <div className="h-4 bg-white/5 w-3/4 rounded" />
                        <div className="h-3 bg-white/5 w-1/4 rounded" />
                        <div className="mt-auto space-y-2 pt-4">
                            <div className="h-6 bg-white/5 w-full rounded" />
                            <div className="h-6 bg-white/5 w-full rounded" />
                        </div>
                    </div>
                 </div>
               ))
            ) : (
               filteredTopManga.map((manga, idx) => (
                <MangaListCard key={`${manga.mal_id}-${idx}`} manga={manga} navigate={navigate} />
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Homer;

