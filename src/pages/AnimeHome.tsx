import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, MonitorPlay, Search, X, BookOpen, BadgeCheck, Flame, StepForward } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import {
  AnimeResult,
  fetchAnimePopular,
  fetchAnimeSpotlight,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeScore,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { handleRippleMouseDown } from '../utils/ripple';
import { useAuth } from '../lib/AuthContext';

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

  .aw-layout {
    max-width: 1540px;
    margin: 0 auto;
    width: 100%;
    padding: 28px 24px;
    gap: 24px;
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .aw-main {
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
    z-index: 50;
  }

  .aw-sidebar {
    width: 100%;
    max-width: none;
    display: flex;
    flex-direction: column;
    background: var(--aw-s1);
    border: 1px solid var(--aw-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,0.6);
  }

  @media (min-width: 1180px) {
    .aw-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
      align-items: start;
    }

    .aw-sidebar {
      position: sticky;
      top: 96px;
      height: calc(100vh - 120px);
    }
  }

  @media (max-width: 1179px) {
    .aw-layout {
      padding: 24px 16px;
    }
  }

  /* Scrollbar */
  .aw-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .aw-scroll::-webkit-scrollbar-track { background: transparent; }
  .aw-scroll::-webkit-scrollbar-thumb { background: var(--aw-accent-dim); border-radius: 2px; }
  .aw-scroll::-webkit-scrollbar-thumb:hover { background: var(--aw-accent); }

  /* Info section label */
  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* Media Card Styles */
  .aw-media-card {
    transition: transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94);
  }
  .aw-media-card-img {
    transition: all 0.3s cubic-bezier(0.25,1,0.5,1);
    border: 1px solid var(--aw-border);
  }
  .aw-media-card:hover .aw-media-card-img {
    transform: translateY(-4px);
    border-color: var(--aw-accent-dim);
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.5);
  }
  .aw-media-card:hover img {
    transform: scale(1.08);
  }
  .aw-media-card-play {
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5); 
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
`;

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

// ─────────────────────────────────────────
// PREMIUM SECTION HEADER
// ─────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div style={{ marginBottom: 4 }}>
    {subtitle && (
      <p className="aw-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        {subtitle}
      </p>
    )}
    <h2 style={{
      fontFamily: 'var(--aw-font-display)',
      fontSize: 'clamp(20px, 3vw, 24px)',
      fontWeight: 700,
      color: 'var(--aw-text)',
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
      margin: 0,
    }}>
      {title}
    </h2>
  </div>
);


// ─────────────────────────────────────────
// MEDIA CARD (STYLED WITH DESIGN TOKENS)
// ─────────────────────────────────────────

interface MediaCardProps {
  title: string;
  image: string;
  subtitle?: string;
  badge?: string;
  progress?: number;
  onClick: () => void;
  onClear?: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({
  title,
  image,
  subtitle,
  badge,
  progress,
  onClick,
  onClear,
}) => {
  const clampedProgress = progress !== undefined ? Math.max(2, Math.min(100, progress)) : undefined;

  return (
    <div
      className="aw-media-card group relative flex w-full cursor-pointer flex-col gap-3"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="aw-media-card-img relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[var(--aw-card)]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-90 group-hover:opacity-100"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 z-20 rounded-md border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md">
            <span className="block text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}>
              {badge}
            </span>
          </div>
        )}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100">
          <div
            className="aw-media-card-play flex h-12 w-12 items-center justify-center rounded-full translate-y-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-y-0"
            style={{ background: 'var(--aw-accent)', color: '#04110d' }}
          >
            <Play size={20} className="ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Clear Button */}
        {onClear && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="absolute top-2 right-2 z-20 rounded-full border border-white/10 bg-black/60 p-1.5 text-white/70 backdrop-blur-md shadow-lg opacity-0 transition-all duration-300 hover:bg-white hover:text-black group-hover:opacity-100 pointer-events-auto"
          >
            <X size={14} strokeWidth={3} />
          </button>
        )}

        {/* Progress Rail */}
        {clampedProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 z-20 h-1.5 bg-black/50 backdrop-blur-sm">
            <div
              className="h-full rounded-r-full shadow-[0_0_10px_var(--aw-accent-glow)] transition-all duration-500 ease-out"
              style={{ width: `${clampedProgress}%`, background: 'var(--aw-accent)' }}
            />
          </div>
        )}
      </div>

      {/* Text Info */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3 style={{
          fontFamily: 'var(--aw-font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--aw-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2
        }}>
          {title}
        </h3>
        {subtitle && (
          <span style={{
            fontFamily: 'var(--aw-font-body)',
            fontSize: 11,
            fontWeight: 400,
            color: 'var(--aw-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};


const GENRES = ["All Genres", "Action", "Fantasy", "Slice of Life", "Adventure", "Comedy", "Romance", "School", "Time Travel", "Comic Anime"];

const token = localStorage.getItem('anilist_access_token');

const AnimeHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Inject Design Styles
  useEffect(() => {
    const id = 'aw-design-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

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

  const heroItems = useMemo(() => {
    const items = spotlight.length > 0 ? spotlight : popularAnime;
    return items.slice(0, 6);
  }, [spotlight, popularAnime]);

  useEffect(() => {
    if (heroItems.length === 0) return;

    const fetchDesc = async (item: AnimeResult) => {
      if (anilistDescriptions[item.id]) return null;
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            query: `query ($search: String) { Media (search: $search, type: ANIME) { description(asHtml: false) } }`,
            variables: { search: getAnimeDisplayTitle(item.title) }
          })
        });
        const data = await response.json();
        const cleanDesc = data?.data?.Media?.description?.replace(/<br><br>/g, ' ').replace(/<[^>]*>/g, '');
        return { id: item.id, desc: cleanDesc || 'No description available for this series.' };
      } catch (e) {
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

  useEffect(() => {
    if (heroItems.length <= 1 || isDragging) return;
    const intervalId = setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroItems.length);
    }, 7000);
    return () => clearInterval(intervalId);
  }, [heroItems.length, activeHeroIndex, isDragging]);

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
    if (dragDistance > 10) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(path);
  };

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--app-accent-muted)]">

      {/* Ambient Cinematic Background Glows */}
      <div className="pointer-events-none fixed -top-[10%] left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-[100%] bg-[var(--aw-accent)]/10 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-[20%] right-[-10%] h-[500px] w-[800px] rounded-[100%] bg-[var(--aw-accent)]/5 blur-[160px]" />

      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      </div>

      {/* Main container with design system spacing */}
      <main className="relative z-10 mx-auto w-full max-w-[1460px] space-y-10 px-4 md:px-8 py-8">

        {/* === HERO SECTION === */}
        <section className="w-full relative">
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
                        <h1
                          className="text-3xl sm:text-4xl lg:text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg pr-4"
                          style={{ fontFamily: 'var(--aw-font-display)' }}
                        >
                          {title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-[0.2em]"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            #{index + 1} Spotlight
                          </span>
                          <span
                            className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            {getAnimeTypeLabel(anime) || 'TV'}
                          </span>
                          {score ? (
                            <span
                              className="flex items-center gap-1 border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] backdrop-blur-md"
                              style={{ fontFamily: 'var(--aw-font-display)' }}
                            >
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {score.toFixed(1)}
                            </span>
                          ) : null}
                          <span
                            className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            HD
                          </span>
                          <span
                            className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            CC
                          </span>
                        </div>

                        <p
                          className={`text-sm md:text-base leading-relaxed line-clamp-3 lg:line-clamp-4 drop-shadow-md ${desc.includes('No description') ? 'text-white/40 italic tracking-wide' : 'text-zinc-300'}`}
                          style={{ fontFamily: 'var(--aw-font-body)' }}
                        >
                          {desc}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            onClick={(e) => handleNavigation(e, `/watch/${anime.id}`)}
                            onMouseDown={handleRippleMouseDown}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#04110d] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--app-accent)', fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <MonitorPlay size={16} fill="currentColor" className="relative z-10" />
                            <span className="relative z-10">Open Series</span>
                          </button>

                          <button
                            onClick={(e) => handleNavigation(e, '/anibrowse')}
                            onMouseDown={handleRippleMouseDown}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-white border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <span className="relative z-10">Browse Catalog</span>
                          </button>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Poster */}
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

              {/* Functional Carousel Dots */}
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
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${index === activeHeroIndex
                      ? 'w-8 bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-muted)]'
                      : 'w-2 bg-white/20 hover:bg-white/50 cursor-pointer'
                      }`}
                  />
                ))}
              </div>

            </div>
          )}
        </section>

        {/* === TRENDING NOW === */}
        <section style={{
          padding: '24px 28px 36px',
          background: 'var(--aw-s1)',
          borderRadius: 16,
          border: '1px solid var(--aw-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <SectionHeader title="Trending Now" subtitle="The Most Popular Series This Week" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] w-full rounded-[14px] bg-[var(--aw-card)] border border-[var(--aw-border)] aw-skeleton" />
              ))
              : popularAnime.slice(0, 6).map((anime) => (
                <MediaCard
                  key={anime.id}
                  title={getAnimeDisplayTitle(anime.title)}
                  image={getAnimeCover(anime)}
                  onClick={() => navigate(`/watch/${anime.id}`)}
                />
              ))}
          </div>
        </section>

        {/* === CONTINUE WATCHING === */}
        {continueWatching.length > 0 && (
          <section style={{
            padding: '24px 28px 36px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <SectionHeader title="Continue Watching" subtitle={`${continueWatching.length} in progress`} />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {continueWatching.slice(0, 6).map((entry) => {
                const progressNum = entry.currentTime && entry.duration ? (entry.currentTime / entry.duration) * 100 : Math.floor(Math.random() * 60) + 20;
                return (
                  <MediaCard
                    key={`${entry.animeId}-${entry.episodeId}`}
                    title={entry.animeTitle}
                    image={entry.animeCover || ''}
                    subtitle={`Episode ${entry.episodeNumber || '?'}`}
                    progress={progressNum}
                    onClick={() => navigate(entry.href || `/watch/${entry.animeId}`)}
                    onClear={() => clearContinueWatching(entry.animeId)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* === RECOMMENDED FOR YOU === */}
        <section style={{
          padding: '24px 28px 36px',
          background: 'var(--aw-s1)',
          borderRadius: 16,
          border: '1px solid var(--aw-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <SectionHeader title="Recommended For You" subtitle="Our personal choice for you" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] w-full rounded-[14px] bg-[var(--aw-card)] border border-[var(--aw-border)] aw-skeleton" />
              ))
              : spotlight.slice(0, 6).map((anime) => (
                <MediaCard
                  key={anime.id}
                  title={getAnimeDisplayTitle(anime.title)}
                  image={getAnimeCover(anime)}
                  onClick={() => navigate(`/watch/${anime.id}`)}
                />
              ))}
          </div>
        </section>

      </main>
    </div>
  );
};

export default AnimeHome;