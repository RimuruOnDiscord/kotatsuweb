/* --- START OF FILE AnimeSchedule.tsx --- */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock, ChevronLeft, ChevronRight, LayoutGrid, List, Play,
  Bookmark, BookmarkCheck, Clock, Building, Search, X, SearchX, ServerCrash, Tv, ChevronDown, Sparkles
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AnimeResult,
  getAnimeDisplayTitle,
  getAnimeCover,
  getAnimeTypeLabel,
  fetchAnimeSearch
} from '../utils/animeApi';

// ─────────────────────────────────────────
// API FETCH
// ─────────────────────────────────────────
const ITEMS_PER_PAGE = 18;

// Fetch enough items to cover a full week so client-side day filtering actually works
const fetchScheduleChunk = async (): Promise<AnimeResult[]> => {
  try {
    const [res1, res2] = await Promise.all([
      fetch(`/api/schedule?page=1&perPage=50`),
      fetch(`/api/schedule?page=2&perPage=50`)
    ]);
    const data1 = res1.ok ? await res1.json() : { results: [] };
    const data2 = res2.ok ? await res2.json() : { results: [] };
    return [...(data1.results || []), ...(data2.results || [])];
  } catch (err) {
    throw new Error('Failed to fetch schedule data.');
  }
};

const getSmartWeekDates = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      value: d.getDay().toString(),
      label: i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate().toString()
    });
  }
  return days;
};

// ─────────────────────────────────────────
// STYLES & VARIANTS
// ─────────────────────────────────────────
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }

  .aw-noise::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 180px;
  }

  .aw-label {
    font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em;
    font-weight: 600; text-transform: uppercase; color: var(--aw-accent);
  }

  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  .aw-pagination-btn {
    display: inline-flex; height: 40px; min-width: 40px; padding: 0 16px;
    align-items: center; justify-content: center; border-radius: 12px;
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
    color: #a1a1aa; font-family: var(--aw-font-display);
    font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.08em;
    position: relative; transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  }
  .aw-pagination-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #fff;
    cursor: pointer;
  }
  .aw-pagination-btn.is-active {
    background: transparent;
    color: var(--aw-accent);
  }
  .aw-pagination-btn.is-active::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 30%;
    right: 30%;
    height: 2px;
    background: var(--aw-accent);
    border-radius: 4px;
  }
  .aw-pagination-btn:active:not(:disabled) { 
    background: rgba(255, 255, 255, 0.12) !important;
    transform: scale(0.95);
    opacity: 0.8; 
  }
  .aw-pagination-btn:disabled { opacity: 0.2; cursor: not-allowed; }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 as const } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 20, stiffness: 200 } },
  exit: { opacity: 0, y: -20, scale: 0.96, transition: { duration: 0.2, ease: "easeIn" } }
};

const bookmarkVariants = {
  initial: { scale: 0.5, opacity: 0, rotate: -45 },
  animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 15 } },
  exit: { scale: 0.5, opacity: 0, rotate: 45, transition: { duration: 0.2 } }
};

// ─────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────
const generateSlug = (titleObj: any) => getAnimeDisplayTitle(titleObj).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalizeTitle = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const getStudioSafe = (anime: AnimeResult) => {
  if (!anime.studios?.nodes) return 'Unknown Studio';
  const studioNode = anime.studios.nodes.find(s => s.isAnimationStudio) || anime.studios.nodes[0];
  return studioNode?.name || 'Unknown Studio';
};

const formatTimeUntil = (seconds: number) => {
  if (!seconds || seconds <= 0) return 'Airing Now';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h ${m}m`;
};

const getVisiblePages = (currentPage: number, lastPage: number) => {
  if (lastPage <= 3) return Array.from({ length: lastPage }, (_, i) => i + 1);
  if (currentPage <= 1) return [1, 2, 3];
  if (currentPage >= lastPage) return [lastPage - 2, lastPage - 1, lastPage];
  return [currentPage - 1, currentPage, currentPage + 1];
};

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────
const CountdownTimer: React.FC<{ initialSeconds: number }> = ({ initialSeconds }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
    const interval = setInterval(() => setSeconds(prev => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [initialSeconds]);

  return <span>{formatTimeUntil(seconds)}</span>;
};

const ScheduleCard: React.FC<{
  anime: AnimeResult;
  viewMode: 'list' | 'grid';
  navigate: ReturnType<typeof useNavigate>;
  bookmarkedIds: Set<string>;
  bookmarkedTitles: Set<string>;
  user: any;
}> = ({ anime, viewMode, navigate, bookmarkedIds, bookmarkedTitles, user }) => {
  const coverUrl = getAnimeCover(anime);
  const titleStr = getAnimeDisplayTitle(anime.title);
  const normTitle = normalizeTitle(titleStr);

  const episode = anime.nextAiringEpisode?.episode || (anime as any).next_episode || '--';
  const timeUntil = anime.nextAiringEpisode?.timeUntilAiring || (anime as any).timeUntilAiring || 0;

  const isBookmarked = useMemo(() => {
    const currentIds = [String(anime.id), String(anime.idMal)].filter(Boolean);
    const hasIdMatch = currentIds.some(id => bookmarkedIds.has(id));
    const hasTitleMatch = normTitle && bookmarkedTitles.has(normTitle);
    return hasIdMatch || hasTitleMatch;
  }, [anime.id, anime.idMal, bookmarkedIds, bookmarkedTitles, normTitle]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const currentIds = [String(anime.id), String(anime.idMal)].filter(Boolean);

    if (isBookmarked) {
      try {
        ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
          let saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(saved)) {
            saved = saved.filter((b: any) => {
              const bIds = [String(b.id), String(b.malId)].filter(Boolean);
              return !(currentIds.some(id => bIds.includes(id)) || normalizeTitle(b.title) === normTitle);
            });
            localStorage.setItem(key, JSON.stringify(saved));
          }
        });
      } catch (err) { }
      if (user) {
        try {
          if (currentIds.length > 0) await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).in('mal_id', currentIds);
          await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('title', titleStr);
        } catch (err) { }
      }
    } else {
      const newBookmark = {
        id: anime.id, malId: anime.idMal || anime.id, title: titleStr, cover: coverUrl,
        type: getAnimeTypeLabel(anime), status: 'uncategorized', score: anime.averageScore || 0,
        author: getStudioSafe(anime), updatedAt: Date.now()
      };
      try {
        const saved = JSON.parse(localStorage.getItem('mv_bookmarks') || '[]');
        if (Array.isArray(saved)) { saved.push(newBookmark); localStorage.setItem('mv_bookmarks', JSON.stringify(saved)); }
      } catch (err) { }
      if (user) {
        try {
          await supabase.from('anime_bookmarks').upsert({
            user_id: user.id, mal_id: String(newBookmark.malId), title: newBookmark.title,
            cover: newBookmark.cover, type: newBookmark.type, status: newBookmark.status,
            score: newBookmark.score, author: newBookmark.author, created_at: new Date().toISOString()
          }, { onConflict: 'user_id, mal_id' });
        } catch (err) { }
      }
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('mv_bookmark_updated'));
  };

  if (viewMode === 'list') {
    return (
      <motion.div variants={itemVariants} className="relative h-[190px] w-full">
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.8 }}
          onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
          className="group relative flex h-full gap-4 sm:gap-5 rounded-[14px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_30%)] backdrop-blur-md p-3 cursor-pointer select-none hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.4)]"
          style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
        >
          <div className="absolute top-4 right-4 z-[60]">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={toggleBookmark}
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-colors duration-200 ${isBookmarked
                ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] text-[var(--aw-accent)]'
                : 'bg-[var(--aw-s2)] border-[var(--aw-border)] text-zinc-400 hover:text-white hover:bg-black/20'
                }`}
            >
              <AnimatePresence mode="wait">
                {isBookmarked ? (
                  <motion.div key="checked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit"><BookmarkCheck size={16} /></motion.div>
                ) : (
                  <motion.div key="unchecked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit"><Bookmark size={14} /></motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

          <div className="relative w-[115px] sm:w-[125px] flex-shrink-0 overflow-hidden rounded-[8px] bg-[var(--aw-s2)] z-10">
            {coverUrl ? (
              <img src={coverUrl} alt={titleStr} className="h-full w-full object-cover transition-transform duration-200 ease-out opacity-95 group-hover:opacity-100 group-hover:scale-105 pointer-events-none" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-600 pointer-events-none">No Cover</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-70 pointer-events-none" />
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-2 pointer-events-none z-10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 w-full pr-8">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-[6px] bg-[var(--aw-s2)] border border-[var(--aw-border)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--aw-accent)] shadow-sm transition-colors duration-300 group-hover:bg-[var(--aw-accent)] group-hover:text-[#04110d] group-hover:border-[var(--aw-accent)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    <Tv size={10} />
                    <span className="truncate">{getAnimeTypeLabel(anime) || 'TV'}</span>
                  </span>
                </div>

                <h3 className="line-clamp-2 text-[16px] sm:text-[17px] font-bold leading-tight text-white/95 group-hover:text-white transition-colors duration-150" style={{ fontFamily: 'var(--aw-font-display)' }}>
                  {titleStr}
                </h3>

                <p className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-zinc-400 transition-colors duration-150 group-hover:text-zinc-300" style={{ fontFamily: 'var(--aw-font-body)' }}>
                  <Building size={12} className="shrink-0" />
                  <span className="truncate">{getStudioSafe(anime)}</span>
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 rounded-[10px] bg-[var(--aw-s2)] px-3 py-[10px] border border-[var(--aw-border)] transition-colors duration-300">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>Next Episode</span>
                <span className="text-[13px] font-semibold text-white/90 capitalize leading-none" style={{ fontFamily: 'var(--aw-font-body)' }}>{episode}</span>
              </div>
              <div className="h-6 w-[1px] bg-[var(--aw-border)] transition-colors duration-300" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>Airs In</span>
                <span className="text-[13px] font-semibold text-[var(--aw-accent)] capitalize leading-none flex items-center gap-1.5" style={{ fontFamily: 'var(--aw-font-body)' }}>
                  <CountdownTimer initialSeconds={timeUntil} />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div variants={itemVariants} className="relative w-full h-full">
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.8 }}
        onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
        className="group relative flex h-full cursor-pointer flex-col rounded-[14px] border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md select-none overflow-hidden hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9),0_0_30px_rgba(0,0,0,0.4)]"
        style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
      >
        <div className="absolute top-3 right-3 z-[60]">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={toggleBookmark}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-colors duration-150 ${isBookmarked
              ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_80%)] border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] text-[var(--aw-accent)]'
              : 'bg-[var(--aw-s2)] border-[var(--aw-border)] text-zinc-400 hover:text-white hover:bg-black/20'
              }`}
          >
            <AnimatePresence mode="wait">
              {isBookmarked ? (
                <motion.div key="checked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit"><BookmarkCheck size={16} /></motion.div>
              ) : (
                <motion.div key="unchecked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit"><Bookmark size={14} /></motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div className="relative z-10 aspect-[3/4] w-full overflow-hidden bg-[var(--aw-s2)]">
          {coverUrl ? (
            <img src={coverUrl} alt={titleStr} className="h-full w-full object-cover transition-transform duration-200 ease-out opacity-95 group-hover:opacity-100 group-hover:scale-105 pointer-events-none" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest pointer-events-none">No Cover</div>
          )}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-150 pointer-events-none group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aw-accent)] text-[#04110d] transform scale-50 rotate-12 group-hover:scale-100 group-hover:rotate-0 transition-all duration-200 ease-out">
              <Play size={26} className="ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col p-4 flex-1 pointer-events-none">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white/95 transition-colors duration-150 group-hover:text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {titleStr}
          </h3>

          {/* Metadata Pills */}
          <div className="flex flex-wrap items-center gap-[5px] mt-2.5 transition-all duration-150 group-hover:-translate-y-[1px] opacity-80 group-hover:opacity-100">
            <span className="rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold text-[#b5b5bd] leading-none tracking-wide group-hover:text-white transition-colors">
              EP {episode}
            </span>
            <div className="flex items-center gap-1.5 rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold text-[var(--aw-accent)] leading-none group-hover:brightness-110 transition-all">
              <Clock size={10} strokeWidth={2.5} />
              <span><CountdownTimer initialSeconds={timeUntil} /></span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.03]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 truncate group-hover:text-zinc-300 transition-colors duration-150" style={{ fontFamily: 'var(--aw-font-body)' }}>
              <Building size={11} className="shrink-0" />
              <span className="truncate">{getStudioSafe(anime)}</span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const AnimeSchedule: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('scheduleViewMode') as 'list' | 'grid') || 'list');
  useEffect(() => localStorage.setItem('scheduleViewMode', viewMode), [viewMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isEditingPage, setIsEditingPage] = useState(false);
  const [jumpToPageValue, setJumpToPageValue] = useState('');

  const filterOptions = useMemo(() => [
    { value: 'all', label: 'All Releases' },
    ...getSmartWeekDates()
  ], []);

  const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;
  const commitPage = (page: number) => setSearchParams(new URLSearchParams({ page: String(page) }));

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentPage]);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(searchQuery); commitPage(1); }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [rawAnimeList, setRawAnimeList] = useState<AnimeResult[]>([]);
  const [searchResults, setSearchResults] = useState<AnimeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedTitles, setBookmarkedTitles] = useState<Set<string>>(new Set());

  const refreshBookmarks = useCallback(async () => {
    const ids = new Set<string>();
    const titles = new Set<string>();
    const processBookmark = (b: any) => {
      if (!b) return;
      ['id', 'malId', 'mal_id', 'mediaId', 'aniId', 'idMal'].forEach(k => { if (b[k]) ids.add(String(b[k])); });
      if (b.title) titles.add(normalizeTitle(b.title));
    };
    try {
      ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(local)) local.forEach(processBookmark);
      });
    } catch (e) { }
    if (user) {
      try {
        const { data } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id);
        if (data) data.forEach(processBookmark);
      } catch (e) { }
    }
    setBookmarkedIds(ids); setBookmarkedTitles(titles);
  }, [user]);

  useEffect(() => {
    refreshBookmarks();
    window.addEventListener('storage', refreshBookmarks);
    window.addEventListener('mv_bookmark_updated', refreshBookmarks);
    return () => {
      window.removeEventListener('storage', refreshBookmarks);
      window.removeEventListener('mv_bookmark_updated', refreshBookmarks);
    };
  }, [refreshBookmarks]);

  useEffect(() => {
    document.title = 'Schedule';
    const id = 'aw-design-styles-schedule';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style'); tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
  }, []);

  // Fetch the massive background chunk ONCE so day filtering works instantly on client
  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true); setError(null);
      try {
        const chunk = await fetchScheduleChunk();
        setRawAnimeList(chunk);
      } catch (err: any) { setError(err.message || 'Failed to fetch the schedule.'); }
      finally { setLoading(false); }
    };
    loadSchedule();
  }, []);

  // Fetch search dynamically if queried
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setSearchResults([]); setIsSearchLoading(false); return;
    }
    let isMounted = true;
    const loadSearchResults = async () => {
      setIsSearchLoading(true);
      try {
        const res = await fetchAnimeSearch(debouncedQuery.trim());
        if (isMounted) {
          const airingOnly = (res.results || []).filter(a => a.status === 'RELEASING' || a.status === 'NOT_YET_RELEASED');
          setSearchResults(airingOnly);
        }
      } catch (e) { console.error(e); }
      finally { if (isMounted) setIsSearchLoading(false); }
    };
    loadSearchResults();
    return () => { isMounted = false; };
  }, [debouncedQuery]);

  const isSearching = debouncedQuery.trim().length >= 2;
  const currentStatusLoading = isSearching ? isSearchLoading : loading;

  // Filter and compute pagination exactly
  const filteredList = useMemo(() => {
    const baseList = isSearching ? searchResults : rawAnimeList;

    return baseList.filter((anime) => {
      const timeUntil = anime.nextAiringEpisode?.timeUntilAiring || (anime as any).timeUntilAiring || 0;

      if (activeFilter === 'upcoming') {
        return timeUntil > 604800 || timeUntil === 0;
      }

      if (activeFilter === 'all') {
        return true;
      }

      const airingAt = anime.nextAiringEpisode?.airingAt || (anime as any).airingAt;
      if (!airingAt) return false;

      const day = new Date(airingAt * 1000).getDay();
      return day === parseInt(activeFilter);
    });
  }, [rawAnimeList, searchResults, isSearching, activeFilter]);

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const displayAnimeList = useMemo(() => {
    return filteredList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  }, [filteredList, safePage]);

  const pageInfo = {
    currentPage: safePage,
    lastPage: totalPages,
    hasNextPage: safePage < totalPages,
  };

  const visiblePages = useMemo(() => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage), [pageInfo.currentPage, pageInfo.lastPage]);

  const contentKey = `${viewMode}-${safePage}-${activeFilter}`;

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent)]/20">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: 'color-mix(in srgb, var(--aw-bg), transparent 15%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}></div>

      <main className="mx-auto w-full max-w-[1460px] space-y-10 px-4 py-12 md:px-8 relative z-10">

        {/* Header Title */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-2">
          <motion.h1
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-[32px] sm:text-[42px] font-black tracking-tight text-white uppercase leading-none"
            style={{ fontFamily: 'var(--aw-font-display)' }}
          >
            Schedule
          </motion.h1>
        </motion.section>

        {/* Filter and View Toggles Row (Unified UI Style) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex w-full flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-white/[0.05] pb-8">

          {/* LEFT: Unified Day selection + Upcoming */}
          <div className="flex w-full xl:w-auto items-center gap-2.5">
            <div className="relative group">
              <div className={`flex items-center rounded-[14px] border transition-all duration-200 backdrop-blur-md overflow-hidden
                ${activeFilter !== 'upcoming'
                  ? 'border-[var(--aw-accent)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)]'
                  : 'border-white/[0.06] bg-transparent hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_55%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)]'
                }
              `}>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => { setActiveFilter('all'); commitPage(1); setIsDropdownOpen(false); }}
                  className={`flex h-[45px] items-center gap-2.5 px-5 transition-colors duration-200
                    ${activeFilter !== 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-400 hover:text-white'}
                  `}
                >
                  <CalendarClock size={15} className={`transition-colors duration-200 ${activeFilter !== 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 group-hover:text-[var(--aw-accent)]'}`} />
                  <span className="text-[13.5px] font-bold tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    {activeFilter === 'upcoming'
                      ? 'All Releases'
                      : (filterOptions.find(opt => opt.value === activeFilter)?.label || 'All Releases')}
                  </span>
                </motion.button>

                <div className={`h-4 w-[1px] ${activeFilter !== 'upcoming' ? 'bg-[var(--aw-accent)]/30' : 'bg-white/10'}`} />

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                  className={`flex h-[45px] items-center justify-center px-3 transition-colors duration-200
                    ${activeFilter !== 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-400 hover:text-white'}
                  `}
                >
                  <ChevronDown size={14} strokeWidth={2.5} className={`transition-all duration-200 ${isDropdownOpen ? 'rotate-180' : ''} ${activeFilter !== 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 group-hover:text-[var(--aw-accent)]'}`} />
                </motion.button>
              </div>

              {/* Dropdown Menu (Click Triggered) */}
              <AnimatePresence>
                {isDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[90]" onClick={() => setIsDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute top-[calc(100%+8px)] left-0 z-[100] w-full min-w-[198.5px]"
                    >
                      <div className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#18181b]/95 p-1.5 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),0_0_0_1px_color-mix(in_srgb,var(--aw-accent),transparent_90%)] backdrop-blur-xl">
                        <div className="flex flex-col gap-0.5">
                          {filterOptions.map((opt) => {
                            const isActive = activeFilter === opt.value;
                            const isAll = opt.value === 'all';

                            return (
                              <button
                                key={opt.value}
                                onClick={() => { setActiveFilter(opt.value); commitPage(1); setIsDropdownOpen(false); }}
                                className={`flex w-full items-center justify-between rounded-[11px] px-3.5 py-3 text-[12.5px] transition-all duration-150
                                  ${isActive
                                    ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_88%)] text-[var(--aw-accent)] font-bold border border-[color-mix(in_srgb,var(--aw-accent),transparent_70%)]'
                                    : 'bg-transparent text-zinc-400 hover:bg-white/[0.05] hover:text-white border border-transparent font-medium'
                                  }`}
                                style={{ fontFamily: 'var(--aw-font-display)' }}
                              >
                                <div className="flex flex-col items-start gap-0.5">
                                  <span className="tracking-wide">{opt.label}</span>
                                  {!isAll && opt.dateNum && (
                                    <span className="text-[10px] opacity-40 font-semibold tracking-widest">{opt.dateNum}</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Upcoming Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { setActiveFilter('upcoming'); commitPage(1); }}
              className={`group flex h-[45px] items-center gap-2 px-6 rounded-[14px] border transition-all duration-200 backdrop-blur-md text-[13px] font-bold tracking-wider
                ${activeFilter === 'upcoming'
                  ? 'border-[var(--aw-accent)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)] text-[var(--aw-accent)]'
                  : 'border-white/[0.06] bg-transparent text-zinc-400 hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_55%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)] hover:text-white'
                }
              `}
              style={{ fontFamily: 'var(--aw-font-display)' }}
            >
              <Sparkles size={14} className={`transition-colors duration-200 ${activeFilter === 'upcoming' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 group-hover:text-[var(--aw-accent)]'}`} />
              Upcoming Releases
            </motion.button>
          </div>

          {/* RIGHT: Search Bar & View Toggle */}
          <div className="flex shrink-0 items-center gap-2.5 w-full sm:w-auto">
            {/* Search Bar */}
            <motion.div
              layout
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.1 }}
              className={`group relative flex min-w-[260px] max-w-[320px] flex-1 items-center h-[45px] rounded-[14px] border transition-all duration-200 backdrop-blur-md overflow-hidden shrink-0
              ${searchQuery
                  ? 'border-[var(--aw-accent)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)]'
                  : 'border-white/[0.06] bg-transparent hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_55%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)]'
                }
              focus-within:border-[var(--aw-accent)] 
            `}>
              <div className={`flex shrink-0 items-center justify-center h-full w-[44px] transition-colors duration-200 relative z-10 ${searchQuery ? 'text-[var(--aw-accent)]' : 'text-zinc-500 group-hover:text-[var(--aw-accent)] group-focus-within:text-[var(--aw-accent)]'}`}>
                <Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[13.5px] font-bold text-white placeholder:text-zinc-500 group-hover:placeholder:text-white border-none outline-none ring-0 h-full pr-14 relative z-10 transition-colors duration-200"
                style={{ fontFamily: 'var(--aw-font-display)' }}
              />
              <div className="absolute right-2 top-0 bottom-0 flex items-center justify-center z-20 gap-1.5">
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      onClick={() => { setSearchQuery(''); commitPage(1); }}
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] text-zinc-400 hover:bg-white/10 hover:text-white outline-none"
                    >
                      <X size={13} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* View Toggle */}
            <div className="flex shrink-0 h-[45px] items-center gap-1 rounded-[12px] border border-white/[0.08] bg-transparent p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="relative flex h-full w-[38px] items-center justify-center rounded-[10px] outline-none transition-colors duration-200 z-10"
                title="List View"
              >
                {viewMode === 'list' && (
                  <motion.div
                    layoutId="scheduleViewModePill"
                    className="absolute inset-0 rounded-[10px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <List size={16} strokeWidth={viewMode === 'list' ? 2.5 : 2} className={`relative z-10 transition-colors duration-200 ${viewMode === 'list' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 hover:text-white'}`} />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="relative flex h-full w-[38px] items-center justify-center rounded-[10px] outline-none transition-colors duration-200 z-10"
                title="Grid View"
              >
                {viewMode === 'grid' && (
                  <motion.div
                    layoutId="scheduleViewModePill"
                    className="absolute inset-0 rounded-[10px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] -z-10"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <LayoutGrid size={16} strokeWidth={viewMode === 'grid' ? 2.5 : 2} className={`relative z-10 transition-colors duration-200 ${viewMode === 'grid' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 hover:text-white'}`} />
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.section key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center min-h-[320px] rounded-[1.7rem] border border-[var(--aw-border)] bg-[var(--aw-s1)] px-6 py-12 text-center backdrop-blur-md">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aw-s2)] border border-[var(--aw-border)] mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <ServerCrash size={28} className="text-red-400" />
              </motion.div>
              <p className="aw-label text-red-400">Schedule Failed</p>
              <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Miruo encountered an error</h3>
              <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{error}</p>
            </motion.section>
          ) : currentStatusLoading ? (
            <motion.div key="loading" initial="hidden" animate="visible" exit="hidden" variants={containerVariants} className="w-full">
              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <motion.div variants={itemVariants} key={i} className="aw-skeleton-card h-[190px]">
                      <div className="aw-skeleton-card-inner">
                        <div className="aw-skeleton-card-img" />
                        <div className="aw-skeleton-card-text">
                          <div className="aw-skeleton-card-line" style={{ width: '75%' }} />
                          <div className="aw-skeleton-card-line" style={{ width: '45%' }} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                    <motion.div variants={itemVariants} key={i} className="aw-skeleton-card aspect-[3/4]">
                      <div className="aw-skeleton-card-inner">
                        <div className="aw-skeleton-card-img" />
                        <div className="aw-skeleton-card-text">
                          <div className="aw-skeleton-card-line" style={{ width: '80%' }} />
                          <div className="aw-skeleton-card-line" style={{ width: '50%' }} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : displayAnimeList.length ? (
            <motion.div
              key={contentKey}
              layout
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {displayAnimeList.map((anime) => {
                    const uniqueKey =
                      anime.idMal ||
                      anime.id ||
                      generateSlug(anime.title);

                    const episode =
                      anime.nextAiringEpisode?.episode ||
                      (anime as any).next_episode ||
                      0;

                    return (
                      <ScheduleCard
                        key={`${uniqueKey}-${episode}`}
                        anime={anime}
                        viewMode="list"
                        navigate={navigate}
                        bookmarkedIds={bookmarkedIds}
                        bookmarkedTitles={bookmarkedTitles}
                        user={user}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayAnimeList.map((anime) => {
                    const uniqueKey =
                      anime.idMal ||
                      anime.id ||
                      generateSlug(anime.title);

                    const episode =
                      anime.nextAiringEpisode?.episode ||
                      (anime as any).next_episode ||
                      0;

                    return (
                      <ScheduleCard
                        key={`${uniqueKey}-${episode}`}
                        anime={anime}
                        viewMode="grid"
                        navigate={navigate}
                        bookmarkedIds={bookmarkedIds}
                        bookmarkedTitles={bookmarkedTitles}
                        user={user}
                      />
                    );
                  })}
                </div>
              )}

              {/* Client-Side Pagination rendering */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2 pt-10 pb-6">
                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  type="button"
                  onClick={() => safePage > 1 && commitPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="aw-pagination-btn gap-2 pl-3 pr-5"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Prev</span>
                </motion.button>

                <div className="flex items-center gap-2">
                  {visiblePages.map((page, index) => {
                    const previousPage = visiblePages[index - 1];
                    const shouldShowGap = index > 0 && previousPage && page - previousPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {shouldShowGap && <span className="flex h-10 w-6 items-center justify-center text-xs font-black text-zinc-600">...</span>}
                        {safePage === page ? (
                          <div className={`relative flex h-10 items-center justify-center transition-[min-width] duration-150 ease-out ${isEditingPage ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                            <div className={`absolute bottom-0 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)] transition-[width] duration-150 ease-out ${isEditingPage ? 'w-full' : 'w-8'}`} />
                            {isEditingPage ? (
                              <input
                                autoFocus type="text" value={jumpToPageValue} onChange={(e) => setJumpToPageValue(e.target.value.replace(/\D/g, ''))} onBlur={() => setIsEditingPage(false)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault(); const target = parseInt(jumpToPageValue);
                                    if (!isNaN(target) && target > 0 && target <= Math.max(pageInfo.lastPage, 9999)) commitPage(target);
                                    setIsEditingPage(false);
                                  }
                                  if (e.key === 'Escape') setIsEditingPage(false);
                                }}
                                className="w-full bg-transparent text-center text-[11px] font-black tracking-[0.1em] text-[var(--aw-accent)] outline-none border-none selection:bg-[color-mix(in_srgb,var(--aw-accent),transparent_80%)]" placeholder="..."
                              />
                            ) : (
                              <button type="button" onClick={() => { setIsEditingPage(true); setJumpToPageValue(String(page)); }} className="group relative flex h-full w-full items-center justify-center px-2 text-[11px] font-black tracking-[0.1em] text-white transition-colors duration-150">
                                <span className="relative z-10">{page}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                            whileTap={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                            transition={{ duration: 0.1, ease: "easeInOut" }}
                            type="button"
                            onClick={() => commitPage(page)}
                            className="aw-pagination-btn min-w-[40px]"
                          >
                            {page}
                          </motion.button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <motion.button
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                  whileTap={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  type="button"
                  onClick={() => pageInfo.hasNextPage && commitPage(safePage + 1)}
                  disabled={!pageInfo.hasNextPage}
                  className="aw-pagination-btn gap-2 pl-5 pr-3"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.section key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col min-h-[320px] items-center justify-center rounded-[1.7rem] border border-[var(--aw-border)] bg-[var(--aw-s1)] px-6 py-12 text-center backdrop-blur-md">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aw-s2)] border border-[var(--aw-border)] mb-4">
                <SearchX size={24} className="text-zinc-500" />
              </motion.div>
              <div>
                <p className="aw-label">No Matches</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Nothing airing right now.</h3>
                <p className="mt-2 text-sm max-w-sm mx-auto" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Try changing your day filter or searching another query to find upcoming episodes.</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AnimeSchedule;

/* --- END OF FILE AnimeSchedule.tsx --- */