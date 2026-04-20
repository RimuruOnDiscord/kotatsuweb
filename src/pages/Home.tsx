import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Star, Flame, BookOpen, ShieldCheck, Play, Settings, Search
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
  originLabel?: string;
  year?: number;
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
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
              {manga.type || 'Manga'}
            </span>
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-bold leading-tight text-white transition-colors group-hover:text-white/90 antialiased">
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-zinc-400">
            {[manga.originLabel, manga.year].filter(Boolean).join(' / ')}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] p-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-[1.2fr_.8fr_1fr] sm:gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-1 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Status</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold antialiased text-[var(--app-accent)]">
              {manga.status ? manga.status.charAt(0).toUpperCase() + manga.status.slice(1).toLowerCase() : "Unknown"}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Started</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold antialiased text-white">
              {manga.year || 'N/A'}
            </span>
          </div>
          <div className="min-w-0 pl-1 sm:pl-0">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Chapters</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold uppercase antialiased text-white">
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
            <p className="mt-1 truncate text-sm font-medium text-zinc-400">
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

  // Hero Carousel State
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [anilistDescriptions, setAnilistDescriptions] = useState<Record<number, string>>({});
  const [anilistBanners, setAnilistBanners] = useState<Record<number, string>>({});

  // Physics Drag State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

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
        
        const mappedData = (data.data || []).map((manga: any) => {
          let originLabel = 'Japan';
          const t = manga.type?.toLowerCase();
          
          if (t === 'manhwa') originLabel = 'South Korea';
          else if (t === 'manhua') originLabel = 'China';
          else if (t === 'oel') originLabel = 'Global';

          let year: number | undefined = undefined;
          if (manga.published && manga.published.from) {
            year = new Date(manga.published.from).getFullYear();
          }

          return { ...manga, originLabel, year };
        });

        setTopManga(mappedData);
      } finally { setLoading(false); }
    };
    fetchTop();
  }, []);

  const filteredTopManga = topManga.filter((manga) => isAllowedSeriesType(manga.type) && matchesFormatFilter(manga.type, formatFilter));
  
  // Compute top 6 for the Hero Carousel
  const heroItems = useMemo(() => filteredTopManga.slice(0, 6), [filteredTopManga]);

  // Fetch High-Quality Anilist Descriptions & Banners for the carousel
  useEffect(() => {
    if (heroItems.length === 0) return;

    const fetchDesc = async (item: Manga) => {
      if (anilistDescriptions[item.mal_id]) return null;
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ($search: String) { Media (search: $search, type: MANGA) { description(asHtml: false), bannerImage } }`,
            variables: { search: item.title_english || item.title }
          })
        });
        const data = await response.json();
        const cleanDesc = data?.data?.Media?.description?.replace(/<br><br>/g, ' ').replace(/<[^>]*>/g, '');
        const bannerImage = data?.data?.Media?.bannerImage;
        return { id: item.mal_id, desc: cleanDesc || 'No synopsis available for this series.', bannerImage };
      } catch(e) {
        return { id: item.mal_id, desc: 'No synopsis available for this series.', bannerImage: null };
      }
    };

    Promise.all(heroItems.map(fetchDesc)).then(results => {
      const newDescs: Record<number, string> = {};
      const newBanners: Record<number, string> = {};
      let updated = false;
      results.forEach(res => {
        if (res) {
          newDescs[res.id] = res.desc;
          if (res.bannerImage) newBanners[res.id] = res.bannerImage;
          updated = true;
        }
      });
      if (updated) {
        setAnilistDescriptions(prev => ({ ...prev, ...newDescs }));
        setAnilistBanners(prev => ({ ...prev, ...newBanners }));
      }
    });
  }, [heroItems, anilistDescriptions]);

  // Auto-slide effect for the hero banner
  useEffect(() => {
    if (heroItems.length <= 1 || isDragging) return;
    const intervalId = setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroItems.length);
    }, 7000); 
    return () => clearInterval(intervalId);
  }, [heroItems.length, activeHeroIndex, isDragging]);

  // Physics Drag Handlers
  const handleDragStart = (clientX: number) => {
    setTouchStart(clientX);
    setIsDragging(true);
    setDragOffset(0);
    setDragDistance(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || touchStart === null) return;
    const offset = clientX - touchStart;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragDistance(Math.abs(dragOffset));

    if (dragOffset > 75) {
      setActiveHeroIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length);
    } else if (dragOffset < -75) {
      setActiveHeroIndex((prev) => (prev + 1) % heroItems.length);
    }
    
    setDragOffset(0);
    setTouchStart(null);
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    // Prevent accidental clicks if the user was sliding the carousel
    if (dragDistance > 10) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-white font-sans antialiased selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
        
        {/* === HERO SECTION === */}
        <section className="w-full relative mb-8">
          {loading || heroItems.length === 0 ? (
            <div className="h-[400px] lg:h-[480px] w-full rounded-[24px] bg-[var(--app-surface-1)] animate-pulse border border-white/5 shadow-2xl" />
          ) : (
            <div 
              className="relative w-full rounded-[24px] bg-[var(--app-surface-1)] border border-white/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] overflow-hidden min-h-[400px] lg:min-h-[480px] cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => handleDragStart(e.clientX)}
              onMouseMove={(e) => handleDragMove(e.clientX)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={handleDragEnd}
            >
              
              {/* Sliding Track */}
              <div 
                className={`flex w-full h-full ${isDragging ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]'}`}
                style={{ transform: `translateX(calc(-${activeHeroIndex * 100}% + ${dragOffset}px))` }}
              >
                {heroItems.map((manga, index) => {
                  const author = manga.authors?.[0]?.name;
                  const year = manga.year;
                  const cover = manga.images.jpg.large_image_url || manga.images.jpg.image_url;
                  const banner = anilistBanners[manga.mal_id] || cover;
                  const desc = anilistDescriptions[manga.mal_id] || manga.synopsis || 'Loading synopsis...';

                  return (
                    <div key={manga.mal_id} className="w-full h-full flex-shrink-0 relative flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 p-8 md:p-12 lg:p-16 min-h-[400px] lg:min-h-[480px]">
                      
                      {/* Immersive Cinematic Background */}
                      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                        <img 
                          src={banner} 
                          draggable="false"
                          className="w-full h-full object-cover opacity-[0.25] scale-125 pointer-events-none" 
                          alt="" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--app-surface-1)] via-[var(--app-surface-1)]/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-surface-1)] via-transparent to-[var(--app-surface-1)]/20" />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>

                      {/* LEFT COLUMN: Text Content */}
                      <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col gap-5 z-10">
                        
                        {/* Title - Unclamped to allow natural wrapping */}
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black uppercase leading-[1.1] tracking-tight text-white drop-shadow-lg pr-4">
                          {manga.title}
                        </h1>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-[0.2em]">
                            #{manga.rank || index + 1} Top Publishing
                          </span>
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md">
                            {manga.type || 'Manga'}
                          </span>
                          {manga.score ? (
                            <span className="flex items-center gap-1 border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] backdrop-blur-md">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {manga.score.toFixed(2)}
                            </span>
                          ) : null}
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md">
                            {[author, year].filter(Boolean).join(' / ')}
                          </span>
                        </div>

                        {/* Description Text */}
                        <p className={`text-sm md:text-base leading-relaxed line-clamp-3 lg:line-clamp-4 drop-shadow-md ${desc.includes('No synopsis') ? 'text-white/40 italic tracking-wide' : 'text-zinc-300'}`}>
                          {desc}
                        </p>

                        {/* Action Buttons */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            onClick={(e) => handleNavigation(e, `/read/${createSlug(manga.title)}`)}
                            onMouseDown={(e) => { e.stopPropagation(); handleRippleMouseDown(e); }}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#04110d] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--app-accent)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <BookOpen size={16} fill="currentColor" className="relative z-10" />
                            <span className="relative z-10">Open Series</span>
                          </button>
                          <button
                            onClick={(e) => handleNavigation(e, '/browse')}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#04110d] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--app-accent)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <Search size={16} fill="currentColor" className="relative z-10" />
                            <span className="relative z-10">Browse</span>
                          </button>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Crisp Uncropped Poster */}
                      <div className="hidden md:block w-48 lg:w-[260px] xl:w-[280px] flex-shrink-0 z-10 pb-4">
                        <div 
                          onClick={(e) => handleNavigation(e, `/read/${createSlug(manga.title)}`)}
                          className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 cursor-pointer transform transition-transform duration-500 hover:-translate-y-2"
                        >
                          <img 
                            src={cover} 
                            alt={manga.title} 
                            draggable="false"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                          />
                          
                          {/* Play Button Overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-[var(--app-accent)] text-[#04110d] p-5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out ">
                              <BookOpen size={26} fill="currentColor" className="" />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Functional Carousel Dots - Absolute positioned so they don't slide */}
              <div 
                className="absolute bottom-6 md:bottom-8 left-8 md:left-12 lg:left-16 flex gap-2.5 items-center z-20 pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()} 
                onTouchStart={(e) => e.stopPropagation()}
              >
                {heroItems.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    onClick={() => setActiveHeroIndex(index)}
                    aria-label={`View slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${
                      index === activeHeroIndex
                        ? 'w-8 bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-muted)]'
                        : 'w-2 bg-white/20 hover:bg-white/50 cursor-pointer'
                    }`}
                  />
                ))}
              </div>

            </div>
          )}
        </section>
        {/* === END HERO SECTION === */}

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