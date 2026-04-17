import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Star, Flame, BookOpen, ShieldCheck, Play, Settings
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

// Helper function to turn strings into clean URLs
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/(^-|-$)+/g, '');   
};

// --- Components ---

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-accent-muted)]">
        <Icon className="text-[var(--app-accent)]" size={18} />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white antialiased">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500 antialiased">{subtitle}</p>
        ) : null}
      </div>
    </div>
  </div>
);

const MangaListCard: React.FC<{ manga: Manga; navigate: any }> = ({ manga, navigate }) => (
  <div
    onClick={() => navigate(`/read/${createSlug(manga.title)}`)}
    style={{ fontFamily: APP_FONT }}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-700 "
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--app-card)] text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500 antialiased">
          No Cover
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)] antialiased">
              {manga.type || 'Manga'}
            </span>
            {manga.score ? (
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold text-white/75 antialiased">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {manga.score.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-bold leading-tight text-white transition-colors group-hover:text-white/90 antialiased">
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            {manga.authors?.[0]?.name || 'Unknown author'}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Status</span>
            <span className={`mt-2 block text-[11px] font-bold uppercase tracking-[0.1em] antialiased ${manga.status === 'Publishing' ? 'text-[var(--app-accent)]' : 'text-zinc-300'}`}>
              {manga.status || 'Unknown'}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Started</span>
            <span className="mt-2 block text-sm font-bold text-white antialiased">
              {manga.published?.from ? new Date(manga.published.from).getFullYear() : 'N/A'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Chapters</span>
            <span className="mt-2 block truncate text-sm font-bold uppercase text-white antialiased">
              {getChapterCountDisplay(manga)}
            </span>
          </div>
        </div>
      </div>
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
    <div 
      onClick={() => navigate(`/read/${createSlug(data.mangaTitle)}`)}
      style={{ fontFamily: APP_FONT }}
      className="group relative flex min-h-44 gap-3 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
    >
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={data.mangaTitle}
            className="h-full w-full object-cover transition-transform duration-700 "
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--app-accent)]/50">
            <BookOpen size={26} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-2">
          <div className="min-w-0">
            <span className="mb-2 inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--app-accent)] antialiased">
              Continue Reading
            </span>
            <h3 className="truncate text-[1.08rem] font-bold leading-tight text-white transition-colors group-hover:text-white/90 antialiased">
              {data.mangaTitle}
            </h3>
            <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
              {data.chapterTitle}
            </p>
          </div>
        </div>

        <div 
          onClick={(e) => e.stopPropagation()}
          className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
        >
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Progress</span>
                <span className="mt-1 block text-sm font-bold text-white antialiased">
                  Page {data.pageIndex + 1}
                  <span className="ml-1 text-white/40 antialiased">/ {data.totalPages}</span>
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 antialiased">
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(data.href);
                }}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button group/button relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
                style={{ backgroundColor: 'var(--app-accent)' }}
              >
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                <Play size={13} fill="currentColor" className="relative z-10" />
                <span className="relative z-10">Resume</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear(data.mangaId);
                }}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button rounded-xl bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-[0.98] antialiased"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
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
  const [formatFilter] = useState<FormatFilter>('all');

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
    <div className="min-h-screen bg-[var(--app-bg)] text-white font-sans antialiased selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_30px_80px_-45px_rgba(0,0,0,0.9)]">
          {loading ? (
             <div className="h-[440px] w-full bg-white/5 animate-pulse" />
          ) : heroManga ? (
            <>
              {/* MOBILE HERO SECTION */}
              <div className="lg:hidden px-4 py-4">
                <div className="rounded-[1.7rem] border border-[var(--app-border)] bg-[var(--app-surface-2)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="flex items-start gap-4">
                    <div className="relative w-[124px] flex-shrink-0 overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[var(--app-card)] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.95)]">
                      <img
                        src={heroManga.images.jpg.large_image_url || heroManga.images.jpg.image_url}
                        alt={heroManga.title}
                        className="aspect-[2/3] w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)] antialiased">
                          #{heroManga.rank || 1} Top Publishing
                        </span>
                        {heroManga.score ? (
                          <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[9px] font-black text-white/80 antialiased">
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            {heroManga.score.toFixed(2)}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="mt-4 text-[2rem] font-black uppercase leading-[0.92] tracking-tight text-white antialiased">
                        {heroManga.title}
                      </h1>

                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500 antialiased">
                        {[heroAuthor, heroYear].filter(Boolean).join(' / ') || (heroManga.type || 'Manga')}
                      </p>
                    </div>
                  </div>

                  {heroManga.synopsis ? (
                    <p className="mt-5 text-sm leading-7 text-zinc-300/85 antialiased">
                      {heroManga.synopsis.length > 180 ? `${heroManga.synopsis.slice(0, 180)}...` : heroManga.synopsis}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={() => navigate(`/read/${createSlug(heroManga.title)}`)} 
                      onMouseDown={handleRippleMouseDown}
                      className="ripple-button group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
                      style={{ backgroundColor: 'var(--app-accent)' }}
                    >
                      <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                      <BookOpen size={16} fill="currentColor" className="relative z-10" />
                      <span className="relative z-10">Open Series</span>
                    </button>
                    <button
                      onClick={() => navigate('/browse')}
                      onMouseDown={handleRippleMouseDown}
                      className="ripple-button inline-flex items-center justify-center rounded-2xl bg-white/[0.03] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/[0.06] active:scale-[0.98] antialiased"
                    >
                      Browse Library
                    </button>
                  </div>


              </div>
              </div>

              {/* DESKTOP HERO SECTION */}
              <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="relative overflow-hidden">
                <div className="relative z-10 flex h-full flex-col justify-between px-7 py-7 md:px-10 md:py-8 lg:px-12 lg:py-10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--app-accent)] antialiased">
                      #{heroManga.rank || 1} Top Publishing
                    </span>
                    {heroManga.score ? (
                      <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10px] font-black text-white/80 antialiased">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {heroManga.score.toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  <div className="max-w-3xl py-6">
                    <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight text-white md:text-5xl lg:text-[4rem] lg:leading-[0.94] antialiased">
                      {heroManga.title}
                    </h1>
                    {heroManga.synopsis ? (
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300/85 md:text-[15px] antialiased">
                        {heroManga.synopsis.length > 220 ? `${heroManga.synopsis.slice(0, 220)}...` : heroManga.synopsis}
                      </p>
                    ) : null}

                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(`/read/${createSlug(heroManga.title)}`)} 
                        onMouseDown={handleRippleMouseDown}
                        className="ripple-button group relative inline-flex items-center gap-2 overflow-hidden rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
                        style={{ backgroundColor: 'var(--app-accent)' }}
                      >
                        <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                        <BookOpen size={16} fill="currentColor" className="relative z-10" />
                        <span className="relative z-10">Open Series</span>
                      </button>
                      <button
                        onClick={() => navigate('/browse')}
                        onMouseDown={handleRippleMouseDown}
                        className="ripple-button inline-flex items-center rounded-2xl bg-white/[0.03] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/[0.06] active:scale-[0.98] antialiased"
                      >
                        Browse Library
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">

                </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center border-t border-[var(--app-border)] bg-[var(--app-card)] p-6 lg:border-l lg:border-t-0">
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
            </>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center px-6 py-12 text-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 antialiased">No Matches</p>
                <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white antialiased">No {formatFilter} titles in this feed</h3>
                <p className="mt-3 text-sm text-zinc-400 antialiased">Try another format filter to load a different front-page selection.</p>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
               [...Array(9)].map((_, i) => (
                 <div key={i} className="flex h-44 gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-1)] p-4 animate-pulse">
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