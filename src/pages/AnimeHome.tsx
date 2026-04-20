import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Flame, Play, Star, Tv } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import {
  AnimeResult,
  fetchAnimePopular,
  fetchAnimeSpotlight,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeScore,
  getAnimeStatusLabel,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { handleRippleMouseDown } from '../utils/ripple';

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

export interface ContinueWatchingEntry {
  kind: string;
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string;
  episodeTitle: string;
  episodeNumber: number;
  href: string;
  duration?: number;
  currentTime?: number;
  updatedAt: number;
}

const getEpisodeLabel = (anime: AnimeResult) =>
  typeof anime.episodes === 'number' && anime.episodes > 0 ? String(anime.episodes) : 'TBA';

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-accent-muted)]">
        <Icon className="text-[var(--app-accent)]" size={18} />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white antialiased">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500 antialiased">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);

const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/(^-|-$)+/g, '');   
};

const AnimeCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => (
  <div
    onClick={() => navigate(`/watch/${anime.id}`)}
    style={{ fontFamily: APP_FONT }}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
      <img src={getAnimeCover(anime)} alt={getAnimeDisplayTitle(anime.title)} className="h-full w-full object-cover transition-transform duration-700 " />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)] antialiased">
              {getAnimeTypeLabel(anime)}
            </span>
          </div>
          <h3 className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90">
            {getAnimeDisplayTitle(anime.title)}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            {[anime.studios?.nodes?.find((studio) => studio.isAnimationStudio)?.name, anime.seasonYear].filter(Boolean).join(' / ') || 'Anime series'}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] p-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-[1.2fr_.8fr_1fr] sm:gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-1 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Status</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold capitalize text-[var(--app-accent)]">
              {getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Season</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold antialiased text-white">
              {[anime.seasonYear].filter(Boolean).join(' ') || 'TBA'}
            </span>
          </div>
          <div className="min-w-0 pl-1 sm:pl-0">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Episodes</span>
            <span className="mt-2 block truncate text-xs sm:text-sm font-semibold antialiased text-white">
              {getEpisodeLabel(anime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ContinueWatchingCard: React.FC<{
  entry: ContinueWatchingEntry;
  navigate: ReturnType<typeof useNavigate>;
  onClear: (animeId: string) => void;
}> = ({ entry, navigate, onClear }) => {
  return (
    <div
      onClick={() => navigate(entry.href || `/watch/${entry.animeId}`)}
      style={{ fontFamily: APP_FONT }}
      className="group relative flex min-h-44 gap-3 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
    >
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
        {entry.animeCover ? (
          <img src={entry.animeCover} alt={entry.animeTitle} className="h-full w-full object-cover transition-transform duration-700 " />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--app-accent)]/50">
            <Tv size={26} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-2 min-w-0">
          <span className="mb-2 inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--app-accent)] antialiased">
            Continue Watching
          </span>
          <h3 className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90">
            {entry.animeTitle}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            Episode {entry.episodeNumber || '?'} {entry.episodeTitle ? `• ${entry.episodeTitle}` : ''}
          </p>
        </div>

        <div onClick={(event) => event.stopPropagation()} className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] flex flex-col justify-center">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                // Navigate directly to episode, no more saving progress/timestamps
                if (entry.href) {
                  navigate(entry.href);
                } else {
                  navigate(`/watch/${entry.animeId}`);
                }
              }}
              onMouseDown={handleRippleMouseDown}
              className="ripple-button group/button relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
              style={{ backgroundColor: 'var(--app-accent)' }}
            >
              <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
              <Play size={13} fill="currentColor" className="relative z-10" />
              <span className="relative z-10">Resume</span>
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onClear(entry.animeId);
              }}
              onMouseDown={handleRippleMouseDown}
              className="ripple-button rounded-xl bg-white/[0.03] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-[0.98] antialiased"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimeHome: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState<AnimeResult[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeResult[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);
  
  // Hero Carousel State
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [anilistDescriptions, setAnilistDescriptions] = useState<Record<string, string>>({});

  // Physics Drag State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  useEffect(() => {
    const syncContinue = () => {
      try {
        const raw = localStorage.getItem('anime-continue-watching');
        if (raw) {
          const parsed = JSON.parse(raw);
          const validEntries = (Array.isArray(parsed) ? parsed : []).filter((e: any) => e.kind === 'anime');
          setContinueWatching(validEntries);
        } else {
          setContinueWatching([]);
        }
      } catch (e) {
        console.error("Failed to parse continue watching state", e);
      }
    };

    syncContinue();
    window.addEventListener('storage', syncContinue);
    window.addEventListener('focus', syncContinue);
    return () => {
      window.removeEventListener('storage', syncContinue);
      window.removeEventListener('focus', syncContinue);
    };
  }, []);

  const clearContinueWatching = useCallback((animeId: string) => {
    try {
      const raw = localStorage.getItem('anime-continue-watching');
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((entry: ContinueWatchingEntry) => String(entry.animeId) !== String(animeId));
        localStorage.setItem('anime-continue-watching', JSON.stringify(filtered));
        setContinueWatching(filtered);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error("Failed to clear continue watching entry", e);
    }
  }, []);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        setLoading(true);
        const [spotlightData, popularData] = await Promise.all([fetchAnimeSpotlight(), fetchAnimePopular(1, 24)]);
        setSpotlight(Array.isArray(spotlightData.results) ? spotlightData.results : []);
        setPopularAnime(Array.isArray(popularData.results) ? popularData.results : []);
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, []);

  // Compute the top 6 anime for the carousel
  const heroItems = useMemo(() => {
    const items = spotlight.length > 0 ? spotlight : popularAnime;
    return items.slice(0, 6);
  }, [spotlight, popularAnime]);

  // Fetch High-Quality Anilist Descriptions for the carousel
  useEffect(() => {
    if (heroItems.length === 0) return;

    const fetchDesc = async (item: AnimeResult) => {
      if (anilistDescriptions[item.id]) return null;
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ($search: String) { Media (search: $search, type: ANIME) { description(asHtml: false) } }`,
            variables: { search: getAnimeDisplayTitle(item.title) }
          })
        });
        const data = await response.json();
        const cleanDesc = data?.data?.Media?.description?.replace(/<br><br>/g, ' ').replace(/<[^>]*>/g, '');
        return { id: item.id, desc: cleanDesc || 'No description available for this series.' };
      } catch(e) {
        return { id: item.id, desc: 'No description available for this series.' };
      }
    };

    Promise.all(heroItems.map(fetchDesc)).then(results => {
      const newDescs: Record<string, string> = {};
      let updated = false;
      results.forEach(res => {
        if (res) {
          newDescs[res.id] = res.desc;
          updated = true;
        }
      });
      if (updated) setAnilistDescriptions(prev => ({ ...prev, ...newDescs }));
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

      <main className="mx-auto w-full max-w-[1420px] space-y-12 px-4 py-8">
        
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
                {heroItems.map((anime, index) => {
                  const title = getAnimeDisplayTitle(anime.title);
                  const score = getAnimeScore(anime);
                  const desc = anilistDescriptions[anime.id] || anime.description || (anime as any).synopsis || 'Loading synopsis...';

                  return (
                    <div key={anime.id} className="w-full h-full flex-shrink-0 relative flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 p-8 md:p-12 lg:p-16 min-h-[400px] lg:min-h-[480px]">
                      
                      {/* Immersive Cinematic Background */}
                      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                        <img 
                          src={(anime as any).bannerImage || getAnimeCover(anime)} 
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
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg pr-4">
                          {title}
                        </h1>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-[0.2em]">
                            #{index + 1} Spotlight
                          </span>
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md">
                            {getAnimeTypeLabel(anime) || 'TV'}
                          </span>
                          {score ? (
                            <span className="flex items-center gap-1 border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] backdrop-blur-md">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {score.toFixed(1)}
                            </span>
                          ) : null}
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md">HD</span>
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md">CC</span>
                        </div>

                        {/* Description Text */}
                        <p className={`text-sm md:text-base leading-relaxed line-clamp-3 lg:line-clamp-4 drop-shadow-md ${desc.includes('No description') ? 'text-white/40 italic tracking-wide' : 'text-zinc-300'}`}>
                          {desc}
                        </p>

                        {/* Action Button */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            onClick={(e) => handleNavigation(e, `/watch/${anime.id}`)}
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
                            className="inline-flex items-center justify-center rounded-xl bg-white/[0.03] px-6 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/[0.06] active:scale-[0.98] antialiased z-20"
                          >
                            Browse
                          </button>
                        </div>
                        </div>

                      {/* RIGHT COLUMN: Crisp Uncropped Poster */}
                      <div className="hidden md:block w-48 lg:w-[260px] xl:w-[280px] flex-shrink-0 z-10 pb-4">
                        <div 
                          onClick={(e) => handleNavigation(e, `/watch/${anime.id}`)}
                          className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 cursor-pointer transform transition-transform duration-500 hover:-translate-y-2"
                        >
                          <img 
                            src={getAnimeCover(anime)} 
                            alt={title} 
                            draggable="false"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                          />
                          
                          {/* Play Button Overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-[var(--app-accent)] text-[#04110d] p-5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out ">
                              <Play size={26} fill="currentColor" className="ml-1" />
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

        {continueWatching.length > 0 ? (
          <section className="space-y-6 pt-4">
            <SectionHeader icon={BookOpen} title="Continue Watching" subtitle={`${continueWatching.length} in progress`} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {continueWatching.map((entry) => (
                <div key={`${entry.animeId}-${entry.episodeId}`} className="xl:max-w-[760px]">
                  <ContinueWatchingCard entry={entry} navigate={navigate} onClear={clearContinueWatching} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-6 pt-4">
          <SectionHeader icon={Flame} title="Popular Anime" subtitle={`${popularAnime.length} titles loaded`} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="flex h-44 gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-1)] p-4 animate-pulse">
                    <div className="w-32 rounded-lg bg-white/5" />
                    <div className="flex-1 space-y-2 py-2">
                      <div className="h-4 w-3/4 rounded bg-white/5" />
                      <div className="h-3 w-1/4 rounded bg-white/5" />
                      <div className="mt-auto space-y-2 pt-4">
                        <div className="h-6 w-full rounded bg-white/5" />
                        <div className="h-6 w-full rounded bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))
              : popularAnime.map((anime) => <AnimeCard key={anime.id} anime={anime} navigate={navigate} />)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnimeHome;