/* --- START OF FILE AnimeHome.tsx --- */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, MonitorPlay, Search, X, BookOpen, BadgeCheck, Flame, StepForward, ChevronRight, ChevronDown, SlidersHorizontal, Bookmark, BookmarkCheck } from 'lucide-react';
import { motion } from 'framer-motion'; // <-- IMPORTED FRAMER MOTION
import AppTopbar from '../components/AppTopbar';
import {
  AnimeResult,
  fetchAnimePopular,
  fetchAnimeSpotlight,
  fetchAnimeInfo,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeScore,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { handleRippleMouseDown } from '../utils/ripple';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { BookmarkEntry, readBookmarks, removeBookmark } from '../utils/bookmarks';

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

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }

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
    z-index: 2;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px;
  }

  /* Quick Filter Styles */
  .qf-section {
    padding: 20px 24px;
    background: var(--aw-s1);
    border-radius: 16px;
    border: 1px solid var(--aw-border);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .qf-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  @media (min-width: 640px) {
    .qf-grid {
      grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    }
  }
  .qf-select-wrap {
    position: relative;
  }
  .qf-select-wrap .qf-chevron {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--aw-muted);
    opacity: 0.5;
    transition: opacity 0.2s;
  }
  .qf-select-wrap:hover .qf-chevron {
    opacity: 0.8;
  }
  .qf-select {
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--aw-border);
    background: var(--aw-s2);
    color: var(--aw-muted);
    font-family: var(--aw-font-display);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    outline: none;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .qf-select:hover {
    border-color: var(--aw-accent-dim);
    background: color-mix(in srgb, var(--aw-accent), transparent 94%);
    color: white;
  }
  .qf-filter-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: var(--aw-accent);
    color: #04110d;
    font-family: var(--aw-font-display);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }
  .qf-filter-btn:hover {
    transform: translateY(-2px) scale(1.02);
    filter: brightness(1.1);
  }
  .qf-filter-btn:active {
    transform: translateY(0) scale(0.96);
  }

  .qf-dropdown-glass {
    background-color: color-mix(in srgb, var(--aw-accent), #09090e 92%);
    background-image: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 100%);
    box-shadow: inset 0 1px 1px rgba(255,255,255,0.1), 0 24px 60px -10px rgba(0,0,0,0.95);
  }

  @keyframes qf-pop {
    0% { opacity: 0; transform: translateY(10px) scale(0.95); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .qf-animate-pop {
    animation: qf-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
`;

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
// FRAMER MOTION VARIANTS FOR STAGGERED LOAD
// ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12, // Time between each section appearing
      delayChildren: 0.1,    // Initial delay before starting
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 }, // Starts invisible and slightly down
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200,
    },
  },
};

// ─────────────────────────────────────────
// PREMIUM SECTION HEADER
// ─────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewMore?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, onViewMore }) => (
  <div className="flex w-full items-end justify-between" style={{ marginBottom: 4 }}>
    <div>
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
        lineHeight: 1.4,
        margin: 1,
        paddingBottom: 4,
      }}>
        {title}
      </h2>
    </div>
    {onViewMore && (
      <button
        onClick={onViewMore}
        className="group flex items-center gap-1 pb-1 text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-zinc-400 hover:text-[var(--aw-accent)] transition-colors"
        style={{ fontFamily: 'var(--aw-font-display)' }}
      >
        <span>View More</span>
        <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
      </button>
    )}
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
      <div className="bg-black/40 aw-media-card-img relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[var(--aw-card)]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-90 group-hover:opacity-100"
        />

        {/* Badge */}
        {badge && (
          <div className="absolute top-2 left-2 z-20 rounded-md border border-white/10 bg-black/80 px-2 py-1">
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
            className="absolute top-2 right-2 z-20 rounded-full border border-white/10 bg-black/80 p-1.5 text-white/70 shadow-lg opacity-0 transition-all duration-300 hover:bg-white hover:text-black group-hover:opacity-100 pointer-events-auto"
          >
            <X size={14} strokeWidth={3} />
          </button>
        )}

        {/* Progress Rail */}
        {clampedProgress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 z-20 h-1.5 bg-black/80">
            <div
              className="h-full rounded-r-full shadow-[0_0_10px_var(--aw-accent-glow)] transition-all duration-500 ease-out"
              style={{ width: `${clampedProgress}%`, background: 'var(--aw-accent)' }}
            />
          </div>
        )}
      </div>

      {/* Text Info */}
      <div className="flex flex-col gap-1 px-0.5 mt-1">
        <h3 className="line-clamp-2 pb-1" style={{
          fontFamily: 'var(--aw-font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--aw-text)',
          lineHeight: 1.4
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

// ─────────────────────────────────────────
// QUICK FILTER OPTIONS
// ─────────────────────────────────────────

const QF_GENRE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Action', label: 'Action' },
  { value: 'Adventure', label: 'Adventure' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Drama', label: 'Drama' },
  { value: 'Fantasy', label: 'Fantasy' },
  { value: 'Horror', label: 'Horror' },
  { value: 'Mecha', label: 'Mecha' },
  { value: 'Music', label: 'Music' },
  { value: 'Mystery', label: 'Mystery' },
  { value: 'Psychological', label: 'Psychological' },
  { value: 'Romance', label: 'Romance' },
  { value: 'Sci-Fi', label: 'Sci-Fi' },
  { value: 'Slice of Life', label: 'Slice of Life' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Supernatural', label: 'Supernatural' },
  { value: 'Thriller', label: 'Thriller' },
];

const QF_THEME_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Isekai', label: 'Isekai' },
  { value: 'Reincarnation', label: 'Reincarnation' },
  { value: 'School', label: 'School' },
  { value: 'Military', label: 'Military' },
  { value: 'Martial Arts', label: 'Martial Arts' },
  { value: 'Super Power', label: 'Super Power' },
  { value: 'Vampire', label: 'Vampire' },
  { value: 'Demons', label: 'Demons' },
  { value: 'Historical', label: 'Historical' },
  { value: 'Space', label: 'Space' },
  { value: 'Survival', label: 'Survival' },
];

const QF_COUNTRY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'CN', label: 'China' },
];

const QF_SEASON_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
];

const QF_YEAR_OPTIONS = (() => {
  const opts = [{ value: '', label: 'All' }];
  for (let y = new Date().getFullYear(); y >= 1990; y--) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
})();

const QF_TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'TV', label: 'TV' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'MUSIC', label: 'Music' },
];

const QF_STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'RELEASING', label: 'Releasing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'HIATUS', label: 'Hiatus' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
];

const QF_LANGUAGE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'sub', label: 'Sub' },
  { value: 'dub', label: 'Dub' },
];

const QF_SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'START_DATE', label: 'Oldest' },
];

interface QFSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}

const QFSelect: React.FC<QFSelectProps> = ({ id, label, value, options, onChange, activeId, setActiveId }) => {
  const isOpen = activeId === id;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) setActiveId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setActiveId]);

  const displayLabel = options.find(o => o.value === value)?.label || 'All';

  return (
    <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
      <span style={{
        fontFamily: 'var(--aw-font-display)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        color: 'var(--aw-muted)',
        opacity: 0.6,
      }}>{label}</span>
      <div className="qf-select-wrap">
        <button
          type="button"
          onClick={() => setActiveId(isOpen ? null : id)}
          className={`qf-select flex items-center justify-between text-left transition-all duration-300 ${isOpen ? 'border-[var(--aw-accent-dim)] bg-white/5' : ''}`}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[var(--aw-accent)]' : 'opacity-50'}`} />
        </button>

        {isOpen && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-[100] max-h-[220px] overflow-y-auto rounded-xl border border-white/10 p-1.5 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full qf-animate-pop qf-dropdown-glass">
            {options.map(o => (
              <button
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setActiveId(null);
                }}
                className={`w-full px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${value === o.value
                  ? 'bg-[var(--aw-accent)] text-[#04110d]'
                  : 'text-zinc-400 hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] hover:text-white'
                  }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const AnimeHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState<AnimeResult[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeResult[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);

  // Hero Carousel State
  const [internalIndex, setInternalIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [anilistDescriptions, setAnilistDescriptions] = useState<Record<string, string>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null); // Added ref for reliable infinite loop reflows

  // Physics Drag State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  // Quick Filter State
  const [qfGenre, setQfGenre] = useState('');
  const [qfTheme, setQfTheme] = useState('');
  const [qfCountry, setQfCountry] = useState('');
  const [qfSeason, setQfSeason] = useState('');
  const [qfYear, setQfYear] = useState('');
  const [qfType, setQfType] = useState('');
  const [qfStatus, setQfStatus] = useState('');
  const [qfLanguage, setQfLanguage] = useState('');
  const [qfSort, setQfSort] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const handleQuickFilter = useCallback(() => {
    const params = new URLSearchParams();
    if (qfGenre) {
      const slug = qfGenre.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      params.set('genres', slug);
    }
    if (qfType) params.set('format', qfType);
    if (qfStatus) params.set('status', qfStatus);
    if (qfSeason) params.set('language', qfSeason); // "language" param is used for season in browse
    if (qfYear) params.set('year', qfYear);
    if (qfSort) params.set('release', qfSort);
    // Country & Theme & Language (sub/dub) are for future API expansion, but still pass what we can
    navigate(`/browse?${params.toString()}`);
  }, [navigate, qfGenre, qfType, qfStatus, qfSeason, qfYear, qfSort]);

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
    const syncContinue = async () => {
      try {
        if (user) {
          const { data, error } = await supabase
            .from('anime_watch_history')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(10);

          if (!error && data) {
            setContinueWatching(data.map((d: any) => ({
              kind: 'anime',
              animeId: d.anime_id,
              episodeId: d.episode_id,
              animeTitle: d.anime_title,
              animeCover: d.anime_cover,
              episodeTitle: d.episode_title,
              episodeNumber: d.episode_number,
              href: d.href,
              duration: d.duration,
              currentTime: d.progress_time,
              updatedAt: new Date(d.updated_at).getTime()
            })));
            return;
          }
        }

        // Fallback to local storage if not signed in or error
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
  }, [user]);

  // ── SYNC BOOKMARKS ──
  useEffect(() => {
    const syncBookmarks = async () => {
      try {
        if (user) {
          const { data, error } = await supabase
            .from('anime_bookmarks')
            .select('mal_id')
            .eq('user_id', user.id);
          if (!error && data) {
            setBookmarkedIds(new Set(data.map((d: any) => parseInt(d.mal_id, 10)).filter((n: number) => !isNaN(n))));
            return;
          }
        }
        const local = readBookmarks();
        setBookmarkedIds(new Set(local.map((b: BookmarkEntry) => b.malId)));
      } catch (e) {
        console.error('Failed to sync bookmarks', e);
      }
    };
    syncBookmarks();
    const onStorage = () => syncBookmarks();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [user]);

  const toggleBookmark = useCallback(async (anime: AnimeResult) => {
    if (bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const malId = Number(anime.id);
      const isBookmarked = bookmarkedIds.has(malId);
      const title = getAnimeDisplayTitle(anime.title);
      const cover = getAnimeCover(anime);
      const typeLabel = getAnimeTypeLabel(anime) || 'TV';

      if (user) {
        if (isBookmarked) {
          await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('mal_id', String(malId));
        } else {
          await supabase.from('anime_bookmarks').upsert({
            user_id: user.id,
            mal_id: String(malId),
            title,
            cover,
            type: typeLabel,
            status: 'uncategorized',
            score: getAnimeScore(anime),
            created_at: new Date().toISOString(),
          }, { onConflict: 'user_id, mal_id' });
        }
        const { data } = await supabase.from('anime_bookmarks').select('mal_id').eq('user_id', user.id);
        setBookmarkedIds(new Set((data || []).map((d: any) => parseInt(d.mal_id, 10)).filter((n: number) => !isNaN(n))));
      } else {
        if (isBookmarked) {
          removeBookmark(malId);
        } else {
          const current = readBookmarks();
          const entry: BookmarkEntry = {
            malId,
            title,
            cover,
            type: typeLabel,
            status: 'uncategorized',
            score: getAnimeScore(anime),
            updatedAt: Date.now(),
          };
          localStorage.setItem('mv_bookmarks', JSON.stringify([entry, ...current.filter(b => b.malId !== malId)]));
        }
        setBookmarkedIds(new Set(readBookmarks().map((b: BookmarkEntry) => b.malId)));
      }
    } catch (e) {
      console.error('Bookmark toggle failed', e);
    } finally {
      setBookmarkLoading(false);
    }
  }, [bookmarkedIds, bookmarkLoading, user]);

  const clearContinueWatching = useCallback(async (animeId: string) => {
    try {
      if (user) {
        await supabase
          .from('anime_watch_history')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_id', animeId);

        setContinueWatching(prev => prev.filter(e => String(e.animeId) !== String(animeId)));
        return;
      }

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
  }, [user]);

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

  const carouselItems = useMemo(() => {
    if (heroItems.length <= 1) return heroItems;
    return [heroItems[heroItems.length - 1], ...heroItems, heroItems[0]];
  }, [heroItems]);

  const activeHeroIndex = useMemo(() => {
    if (heroItems.length <= 1) return 0;
    if (internalIndex === 0) return heroItems.length - 1;
    if (internalIndex === heroItems.length + 1) return 0;
    return internalIndex - 1;
  }, [internalIndex, heroItems.length]);

  useEffect(() => {
    if (heroItems.length === 0) return;

    const fetchDesc = async (item: AnimeResult) => {
      if (anilistDescriptions[item.id]) return null;
      try {
        const info = await fetchAnimeInfo(Number(item.id));
        let cleanDesc = info?.description || info?.synopsis || 'No description available for this series.';
        cleanDesc = cleanDesc.replace(/<[^>]*>?/gm, ''); // Strip HTML tags

        return { id: item.id, desc: cleanDesc };
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

  // Handle Autoplay Loop Smoothly (Re-triggers strictly on index settle to prevent bad slides)
  useEffect(() => {
    if (heroItems.length <= 1 || isDragging || !isTransitioning) return;
    
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      setInternalIndex((current) => current + 1);
    }, 7000);

    return () => clearInterval(intervalId);
  }, [heroItems.length, isDragging, isTransitioning, internalIndex]);

  // Handle CSS Transition Toggle & Reflow Snap Reliably
  useEffect(() => {
    if (!isTransitioning) {
      // Force a synchronous layout repaint without transition to instantly jump the slide
      if (sliderRef.current) {
        void sliderRef.current.offsetHeight;
      }
      // Re-enable smooth transition safely after the snap is verified by the browser
      const timer = setTimeout(() => {
        setIsTransitioning(true);
      }, 40); 
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

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
      setInternalIndex((prev) => prev - 1);
    } else if (dragOffset < -75) {
      setInternalIndex((prev) => prev + 1);
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

      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
      </div>

      {/* STAGGERED MOTION CONTAINER */}
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto w-full max-w-[1460px] space-y-10 px-4 md:px-8 py-8"
      >

        {/* === HERO SECTION === */}
        <motion.section variants={itemVariants} className="w-full relative">
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
                ref={sliderRef}
                className={`flex w-full h-full ${isDragging || !isTransitioning ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]'}`}
                style={{ transform: `translateX(calc(-${(heroItems.length <= 1 ? 0 : internalIndex) * 100}% + ${dragOffset}px))` }}
                onTransitionEnd={(e) => {
                  // VERY IMPORTANT: Ensure we ONLY trigger the wrap when the main slider transforms.
                  // This stops inner buttons/hovers from accidentally resetting the carousel frame early.
                  if (e.target !== sliderRef.current) return;

                  if (heroItems.length <= 1) return;
                  if (internalIndex === 0) {
                    setIsTransitioning(false);
                    setInternalIndex(heroItems.length);
                  } else if (internalIndex === carouselItems.length - 1) {
                    setIsTransitioning(false);
                    setInternalIndex(1);
                  }
                }}
              >
                {carouselItems.map((anime, index) => {
                  const key = heroItems.length > 1 ? (index === 0 ? `${anime.id}-clone-start` : index === carouselItems.length - 1 ? `${anime.id}-clone-end` : anime.id) : anime.id;
                  const title = getAnimeDisplayTitle(anime.title);
                  const score = getAnimeScore(anime);
                  const desc = anilistDescriptions[anime.id] || anime.description || (anime as any).synopsis || 'Loading synopsis...';

                  return (
                    <div key={key} className="w-full h-full flex-shrink-0 relative flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 p-8 md:p-12 lg:p-16 min-h-[400px] lg:min-h-[480px]">

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
                            className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-wider"
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
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-wider text-[#04110d] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--app-accent)', fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <MonitorPlay size={16} fill="currentColor" className="relative z-10" />
                            <span className="relative z-10">Open Series</span>
                          </button>

                          <button
                            onClick={(e) => handleNavigation(e, '/browse')}
                            onMouseDown={handleRippleMouseDown}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-white border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <span className="relative z-10">Browse Catalog</span>
                          </button>

                          {/* Bookmark Toggle */}
                          {heroItems[activeHeroIndex] && (() => {
                            const currentAnime = heroItems[activeHeroIndex];
                            const isBookmarked = bookmarkedIds.has(Number(currentAnime.id));
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleBookmark(currentAnime);
                                }}
                                disabled={bookmarkLoading}
                                className={`group relative flex h-[46px] w-[46px] items-center justify-center rounded-xl border transition-all duration-300 hover:scale-[1.08] active:scale-[0.95] ${isBookmarked
                                  ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/15 text-[var(--app-accent)] shadow-[0_0_20px_rgba(var(--app-accent-rgb),0.25)]'
                                  : 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20 hover:bg-white/[0.08]'
                                  } ${bookmarkLoading ? 'opacity-50 cursor-wait' : ''}`}
                                title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
                              >
                                {isBookmarked ? (
                                  <BookmarkCheck size={20} className="transition-transform duration-300 group-hover:scale-110" />
                                ) : (
                                  <Bookmark size={20} className="transition-transform duration-300 group-hover:scale-110" />
                                )}
                              </button>
                            );
                          })()}
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
                    onClick={() => {
                      if (heroItems.length <= 1) return;
                      setIsTransitioning(true);
                      setInternalIndex(index + 1);
                    }}
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
        </motion.section>

        {/* === QUICK FILTER === */}
        <motion.section variants={itemVariants} className="qf-section">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} style={{ color: 'var(--aw-accent)' }} />
            <h2 style={{
              fontFamily: 'var(--aw-font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--aw-text)',
              letterSpacing: '0.01em',
              margin: 0,
            }}>Quick Filters</h2>
          </div>

          <div className="qf-grid">
            <QFSelect id="genre" label="Genre" value={qfGenre} options={QF_GENRE_OPTIONS} onChange={setQfGenre} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="theme" label="Theme" value={qfTheme} options={QF_THEME_OPTIONS} onChange={setQfTheme} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="country" label="Country" value={qfCountry} options={QF_COUNTRY_OPTIONS} onChange={setQfCountry} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="season" label="Season" value={qfSeason} options={QF_SEASON_OPTIONS} onChange={setQfSeason} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="year" label="Year" value={qfYear} options={QF_YEAR_OPTIONS} onChange={setQfYear} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="type" label="Type" value={qfType} options={QF_TYPE_OPTIONS} onChange={setQfType} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="status" label="Status" value={qfStatus} options={QF_STATUS_OPTIONS} onChange={setQfStatus} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <QFSelect id="language" label="Language" value={qfLanguage} options={QF_LANGUAGE_OPTIONS} onChange={setQfLanguage} activeId={activeDropdown} setActiveId={setActiveDropdown} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <QFSelect id="sort" label="Sort" value={qfSort} options={QF_SORT_OPTIONS} onChange={setQfSort} activeId={activeDropdown} setActiveId={setActiveDropdown} />
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: 9, opacity: 0 }}>‎</span>
              <button className="qf-filter-btn group" onClick={handleQuickFilter}>
                <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                <SlidersHorizontal size={14} className="relative z-10" />
                <span className="relative z-10">Filter</span>
              </button>
            </div>
          </div>
        </motion.section>

        {/* === TRENDING NOW === */}
        <motion.section 
          variants={itemVariants}
          style={{
            padding: '24px 28px 36px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <SectionHeader
            title="Trending Now"
            subtitle="The Most Popular Series This Week"
            onViewMore={() => navigate('/browse')}
          />

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
        </motion.section>

        {/* === CONTINUE WATCHING === */}
        {continueWatching.length > 0 && (
          <motion.section 
            variants={itemVariants}
            style={{
              padding: '24px 28px 36px',
              background: 'var(--aw-s1)',
              borderRadius: 16,
              border: '1px solid var(--aw-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            <SectionHeader
              title="Continue Watching"
              subtitle={`${continueWatching.length} in progress`}
              onViewMore={() => navigate('/continuewatching')}
            />
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
          </motion.section>
        )}

        {/* === RECOMMENDED FOR YOU === */}
        <motion.section 
          variants={itemVariants}
          style={{
            padding: '24px 28px 36px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}
        >
          <SectionHeader
            title="Recommended For You"
            subtitle="Our personal choice for you"
            onViewMore={() => navigate('/browse')}
          />
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
        </motion.section>

      </motion.main>
    </div>
  );
};

export default AnimeHome;