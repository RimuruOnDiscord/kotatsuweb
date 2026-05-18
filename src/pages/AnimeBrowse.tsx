/* --- START OF FILE AnimeBrowse.tsx --- */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, LayoutGrid, Library,
  List, Play, Star, Bookmark, BookmarkCheck, SearchX, ServerCrash, Building, Tv
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DesktopBrowseFilters from '../components/desktop/DesktopBrowseFilters';
import MobileBrowseFilters from '../components/mobile/MobileBrowseFilters';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  AnimeResult,
  fetchAnimeFilter,
  fetchAnimeSearch,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeStatusLabel,
  getAnimeTypeLabel,
  fetchAnimeByStudio,
} from '../utils/animeApi';

// ─────────────────────────────────────────
// TYPES & CONSTANTS
// ─────────────────────────────────────────
type FilterOption = { value: string; label: string; disabled?: boolean };

const ITEMS_PER_PAGE = 24;
const FETCH_PER_PAGE = 40;

const FORMAT_OPTIONS: FilterOption[] = [
  { value: '', label: 'Format' },
  { value: 'TV', label: 'TV' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'MUSIC', label: 'Music' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Status' },
  { value: 'RELEASING', label: 'Releasing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'HIATUS', label: 'Hiatus' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
];

const EPISODE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Episodes' },
  { value: 'short', label: '1 - 12 Episodes' },
  { value: 'medium', label: '13 - 24 Episodes' },
  { value: 'long', label: '25+ Episodes' },
];

const STUDIO_OPTIONS: FilterOption[] = [
  { value: '', label: 'Studio' },
  { value: 'MAPPA', label: 'MAPPA' },
  { value: 'ufotable', label: 'ufotable' },
  { value: 'Bones', label: 'Bones' },
  { value: 'Madhouse', label: 'Madhouse' },
  { value: 'Kyoto Animation', label: 'Kyoto Animation' },
  { value: 'A-1 Pictures', label: 'A-1 Pictures' },
  { value: 'CloverWorks', label: 'CloverWorks' },
  { value: 'Wit Studio', label: 'Wit Studio' },
  { value: 'Trigger', label: 'Trigger' },
  { value: 'Production I.G', label: 'Production I.G' },
  { value: 'J.C.Staff', label: 'J.C.Staff' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: '', label: 'Sort' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'START_DATE_DESC', label: 'Newest First' },
  { value: 'START_DATE', label: 'Oldest First' },
];

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha',
  'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
].map((genre) => ({
  value: genre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label: genre,
  queryValue: genre,
}));

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
    --aw-accent-glow: var(--app-accent);
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

.aw-pagination-btn {
  display: inline-flex;
  height: 36px;
  min-width: 36px;
  padding: 0 14px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  
  /* Matches card background depth */
  background: rgba(255, 255, 255, 0.03); 
  border: none;
  
  /* Thin, light-weight typography */
  color: var(--aw-muted);
  font-family: var(--aw-font-display);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  
  position: relative;
  transition: all 0.2s ease;
}

.aw-pagination-btn:hover:not(:disabled) {
  /* Subtle lift like the Goblin Slayer card */
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  cursor: pointer;
}

/* The active state matching your 'Finished' status text style */
.aw-pagination-btn.is-active {
  background: transparent;
  color: var(--aw-accent);
}

/* Thin indicator line to match your current UI */
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
  transform: scale(0.95);
  opacity: 0.7;
}

.aw-pagination-btn:disabled {
  opacity: 0.1;
  cursor: not-allowed;
}



  .aw-skeleton-card {
    position: relative; background: var(--aw-s1); backdrop-filter: blur(12px);
    border: 1px solid var(--aw-border); 
    border-radius: 14px; overflow: hidden;
  }
  .aw-skeleton-card::before {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--aw-text), transparent 97%), transparent);
    transform: translateX(-100%);
    animation: aw-shimmer 2s infinite ease-in-out;
  }
  @keyframes aw-shimmer {
    100% { transform: translateX(100%); }
  }
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

// ─────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────
const generateSlug = (titleObj: any) => (getAnimeDisplayTitle(titleObj) || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalizeTitle = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const getStudioSafe = (anime: any) => {
  if (!anime.studios) return 'Unknown Studio';
  if (Array.isArray(anime.studios) && anime.studios.length > 0) {
    return typeof anime.studios[0] === 'object' ? anime.studios[0].name : anime.studios[0];
  }
  if (anime.studios.nodes && Array.isArray(anime.studios.nodes) && anime.studios.nodes.length > 0) {
    const studioNode = anime.studios.nodes.find((s: any) => s.isAnimationStudio) || anime.studios.nodes[0];
    return studioNode?.name || 'Unknown Studio';
  }
  if (typeof anime.studios === 'string') return anime.studios;
  return 'Unknown Studio';
};

const getBaseFranchiseTitle = (title: string) => {
  if (!title) return '';
  let t = title.toLowerCase();
  t = t.replace(/\s+(season|part|cour|chapter|act)\s*\d+.*$/i, '');
  t = t.replace(/\s+\d+(st|nd|rd|th)\s+(season|part).*$/i, '');
  t = t.replace(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/i, '');
  t = t.replace(/\s+\d+$/, '');
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
};

const isSameFranchise = (title1: string, title2: string) => {
  const t1 = title1.toLowerCase();
  const t2 = title2.toLowerCase();
  const b1 = getBaseFranchiseTitle(t1);
  const b2 = getBaseFranchiseTitle(t2);

  if (b1 === b2 && b1.length > 0) return true;
  if (b1.length > 4 && b2.length > 4) {
    if (t1.startsWith(t2 + ' 2') || t2.startsWith(t1 + ' 2')) return true;
    if (t1.startsWith(t2 + ' 3') || t2.startsWith(t1 + ' 3')) return true;
  }
  return false;
};

const resolvePageParam = (value: string | null) => {
  const parsed = Number(value || '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const parseMultiValueParam = (value: string | null) => (value || '').split(',').map((item) => item.trim()).filter(Boolean);

const getVisiblePages = (currentPage: number, lastPage: number) => {
  if (lastPage <= 3) return Array.from({ length: lastPage }, (_, index) => index + 1);
  if (currentPage <= 1) return [1, 2, 3];
  if (currentPage >= lastPage) return [lastPage - 2, lastPage - 1, lastPage];
  return [currentPage - 1, currentPage, currentPage + 1];
};

const matchesEpisodeFilter = (anime: AnimeResult, filter: string) => {
  if (!filter) return true;
  const episodes = anime.episodes || 0;
  if (filter === 'short') return episodes > 0 && episodes <= 12;
  if (filter === 'medium') return episodes >= 13 && episodes <= 24;
  if (filter === 'long') return episodes >= 25 || anime.episodes == null;
  return true;
};

// ─────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────

const AnimeCard: React.FC<{
  anime: AnimeResult;
  viewMode: 'list' | 'grid';
  navigate: ReturnType<typeof useNavigate>;
  bookmarkedIds: Set<string>;
  bookmarkedTitles: Set<string>;
  user: any;
}> = ({ anime, viewMode, navigate, bookmarkedIds, bookmarkedTitles, user }) => {
  const coverUrl = getAnimeCover(anime);
  const titleStr = getAnimeDisplayTitle(anime.title) || '';
  const normTitle = normalizeTitle(titleStr);

  const currentIds = useMemo(() => [String(anime.id), String((anime as any).malId), String((anime as any).idMal)].filter(id => id && id !== 'undefined' && id !== 'null'), [anime]);

  const isBookmarked = useMemo(() => {
    return currentIds.some(id => bookmarkedIds.has(id)) || (normTitle && bookmarkedTitles.has(normTitle));
  }, [currentIds, bookmarkedIds, bookmarkedTitles, normTitle]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const primaryMalId = (anime as any).malId || (anime as any).idMal || anime.id;

    if (isBookmarked) {
      try {
        ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
          let saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(saved)) {
            saved = saved.filter((b: any) => {
              const storedIds = [String(b.id), String(b.malId), String(b.mediaId), String(b.mal_id)].filter(id => id && id !== 'undefined' && id !== 'null');
              return !(storedIds.some(sId => currentIds.includes(sId)) || (b.title && normalizeTitle(b.title) === normTitle));
            });
            localStorage.setItem(key, JSON.stringify(saved));
          }
        });
      } catch (err) { }

      if (user) {
        try {
          if (currentIds.length > 0) await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).in('mal_id', currentIds);
          if (titleStr) await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('title', titleStr);
        } catch (err) { }
      }
    } else {
      const newBookmark = {
        id: anime.id, malId: primaryMalId, title: titleStr || 'Unknown Title', cover: coverUrl,
        type: getAnimeTypeLabel(anime) || 'Anime', status: 'uncategorized', score: anime.score || 0,
        author: getStudioSafe(anime) !== 'Unknown Studio' ? getStudioSafe(anime) : undefined, updatedAt: Date.now()
      };

      try {
        const saved = JSON.parse(localStorage.getItem('mv_bookmarks') || '[]');
        if (Array.isArray(saved)) { saved.push(newBookmark); localStorage.setItem('mv_bookmarks', JSON.stringify(saved)); }
      } catch (err) { }

      if (user) {
        try {
          await supabase.from('anime_bookmarks').upsert({
            user_id: user.id, mal_id: String(newBookmark.malId), title: newBookmark.title, cover: newBookmark.cover,
            type: newBookmark.type, status: newBookmark.status, score: newBookmark.score, author: newBookmark.author,
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id, mal_id' });
        } catch (err) { }
      }
    }
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('mv_bookmark_updated'));
  };

  const bookmarkVariants = {
    initial: { scale: 0.5, opacity: 0, rotate: -45 },
    animate: { scale: 1, opacity: 1, rotate: 0, transition: { type: 'spring', stiffness: 400, damping: 15 } },
    exit: { scale: 0.5, opacity: 0, rotate: 45, transition: { duration: 0.2 } }
  };

  if (viewMode === 'list') {
    return (
      <motion.div variants={itemVariants} className="relative h-[190px] w-full">
        <motion.div
          whileHover={{ y: -6, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.8 }}
          onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
          className="group relative flex h-full gap-4 sm:gap-5 rounded-[14px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_30%)] backdrop-blur-md p-3 cursor-pointer select-none hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.25),0_0_24px_rgba(0,0,0,0.1)]"
          style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
        >

          <div className="absolute top-4 right-4 z-[60]">
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
              onClick={toggleBookmark}
              // FIX: Replaced transition-all duration-300 with transition-colors duration-200
              className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-colors duration-200 ${isBookmarked
                ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] text-[var(--aw-accent)]'
                : 'bg-[var(--aw-s2)] border-[var(--aw-border)] text-zinc-400 hover:text-white hover:bg-black/20'
                }`}
            >
              <AnimatePresence mode="wait">
                {isBookmarked ? (
                  <motion.div key="checked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit">
                    <BookmarkCheck size={16} />
                  </motion.div>
                ) : (
                  <motion.div key="unchecked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit">
                    <Bookmark size={14} />
                  </motion.div>
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
                  {anime.score && (
                    <span className="flex items-center gap-1.5 rounded-[6px] bg-[var(--aw-s2)] border border-[var(--aw-border)] px-2 py-0.5 text-[9px] font-extrabold tracking-widest text-amber-400 shadow-sm transition-colors duration-300 group-hover:border-[color-mix(in_srgb,theme(colors.amber.500),transparent_30%)] group-hover:bg-[color-mix(in_srgb,theme(colors.amber.500),transparent_80%)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                      <Star size={10} className="fill-current" />
                      <span className="truncate">{(anime.score / 10).toFixed(1)}</span>
                    </span>
                  )}
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
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>Status</span>
                <span className="text-[13px] font-semibold text-[var(--aw-accent)] capitalize leading-none" style={{ fontFamily: 'var(--aw-font-body)' }}>{getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}</span>
              </div>
              <div className="h-6 w-[1px] bg-[var(--aw-border)] transition-colors duration-300" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>Year</span>
                <span className="text-[13px] font-semibold text-white/90 leading-none" style={{ fontFamily: 'var(--aw-font-body)' }}>{anime.seasonYear || anime.startDate?.year || 'TBA'}</span>
              </div>
              <div className="h-6 w-[1px] bg-[var(--aw-border)] transition-colors duration-300" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>Episodes</span>
                <span className="text-[13px] font-semibold text-white/90 leading-none" style={{ fontFamily: 'var(--aw-font-body)' }}>{anime.episodes || '--'}</span>
              </div>
            </div>


          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="relative w-full h-full">
      <motion.div
        whileHover={{ y: -6, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320, mass: 0.8 }}
        onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
        className="group relative flex h-full cursor-pointer flex-col rounded-[14px] border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md select-none overflow-hidden hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] hover:shadow-[0_16px_40px_-8px_rgba(0,0,0,0.8),0_0_24px_color-mix(in_srgb,var(--aw-accent),transparent_75%)]"
        style={{ transition: 'border-color 0.15s ease, box-shadow 0.15s ease' }}
      >

        <div className="absolute top-3 right-3 z-[60]">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={toggleBookmark}
            // FIX: Replaced transition-all duration-150 with transition-colors duration-150
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-colors duration-150 ${isBookmarked
              ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_80%)] border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] text-[var(--aw-accent)]'
              : 'bg-[var(--aw-s2)] border-[var(--aw-border)] text-zinc-400 hover:text-white hover:bg-black/20'
              }`}
          >
            <AnimatePresence mode="wait">
              {isBookmarked ? (
                <motion.div key="checked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit">
                  <BookmarkCheck size={16} />
                </motion.div>
              ) : (
                <motion.div key="unchecked" variants={bookmarkVariants} initial="initial" animate="animate" exit="exit">
                  <Bookmark size={14} />
                </motion.div>
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
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-white/95 transition-colors duration-150 group-hover:text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {titleStr}
          </h3>

          <div className="flex items-center justify-between mt-auto pt-3 transition-colors duration-150 group-hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_70%)]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 truncate group-hover:text-zinc-300 transition-colors duration-150" style={{ fontFamily: 'var(--aw-font-body)' }}>
              <Building size={11} className="shrink-0" />
              <span className="truncate">{getStudioSafe(anime)}</span>
            </span>
            <span className="text-[11px] font-bold text-zinc-500 group-hover:text-[var(--aw-accent)] transition-colors duration-150">
              {anime.seasonYear || anime.startDate?.year || 'TBA'}
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
const AnimeBrowse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('browseViewMode') as 'list' | 'grid') || 'list');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('browseViewMode', viewMode); }, [viewMode]);

  const currentPage = resolvePageParam(searchParams.get('page'));

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentPage]);

  const committedQuery = searchParams.get('q') || '';
  const committedFormat = searchParams.get('format') || '';
  const committedStatus = searchParams.get('status') || '';
  const committedYear = searchParams.get('year') || '';
  const committedEpisodeLength = searchParams.get('length') || '';
  const committedSort = searchParams.get('release') || '';
  const committedStudio = searchParams.get('studio') || '';
  const rawGenres = searchParams.get('genres');
  const committedGenres = useMemo(() => parseMultiValueParam(rawGenres), [rawGenres]);

  const [searchQuery, setSearchQuery] = useState(committedQuery);
  const [formatFilter, setFormatFilter] = useState(committedFormat);
  const [genreFilter, setGenreFilter] = useState(committedGenres);
  const [statusFilter, setStatusFilter] = useState(committedStatus);
  const [yearFilter, setYearFilter] = useState(committedYear);
  const [episodeFilter, setEpisodeFilter] = useState(committedEpisodeLength);
  const [sortFilter, setSortFilter] = useState(committedSort);
  const [studioFilter, setStudioFilter] = useState(committedStudio);

  const [animeList, setAnimeList] = useState<AnimeResult[]>([]);
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, lastPage: 1, hasNextPage: false, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingPage, setIsEditingPage] = useState(false);
  const [jumpToPageValue, setJumpToPageValue] = useState('');

  // Bookmarks Logic
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedTitles, setBookmarkedTitles] = useState<Set<string>>(new Set());

  const refreshBookmarks = useCallback(async () => {
    const ids = new Set<string>();
    const titles = new Set<string>();
    const processBookmark = (b: any) => {
      if (!b) return;
      ['id', 'malId', 'mal_id', 'mediaId', 'aniId', 'idMal'].forEach(k => {
        if (b[k] !== undefined && b[k] !== null && b[k] !== '') ids.add(String(b[k]));
      });
      if (b.title && typeof b.title === 'string') titles.add(normalizeTitle(b.title));
    };

    try {
      ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(local)) local.forEach(processBookmark);
      });
    } catch (e) { }

    if (user) {
      try {
        const { data, error } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id);
        if (!error && data) data.forEach(processBookmark);
      } catch (e) { }
    }

    setBookmarkedIds(new Set(ids));
    setBookmarkedTitles(new Set(titles));
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

  const yearOptions = useMemo<FilterOption[]>(
    () => [{ value: '', label: 'Year' }, ...Array.from({ length: 40 }, (_, index) => { const year = new Date().getFullYear() - index; return { value: String(year), label: String(year) }; })], []
  );

  const visiblePages = useMemo(() => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage), [pageInfo.currentPage, pageInfo.lastPage]);

  useEffect(() => {
    document.title = 'Browse';
    const id = 'aw-design-styles-anime';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style'); tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => { setSearchQuery(committedQuery); }, [committedQuery]);

  const commitBrowseParams = useCallback(
    (overrides?: Partial<Record<'q' | 'format' | 'status' | 'language' | 'year' | 'length' | 'release' | 'studio', string> & { genres: string[] }> & { page?: number }) => {
      const nextParams = new URLSearchParams(searchParams);
      const nextValues = {
        q: (overrides?.q ?? searchQuery).trim(), format: overrides?.format ?? formatFilter, genres: overrides?.genres ?? genreFilter,
        status: overrides?.status ?? statusFilter, year: (overrides?.year ?? yearFilter).trim(),
        length: overrides?.length ?? episodeFilter, release: overrides?.release ?? sortFilter, studio: overrides?.studio ?? studioFilter, page: overrides?.page ?? 1,
      };

      Object.entries(nextValues).forEach(([key, value]) => {
        if (key === 'genres' || key === 'page') return;
        if (value) nextParams.set(key, String(value)); else nextParams.delete(key);
      });

      if (nextValues.genres.length) nextParams.set('genres', nextValues.genres.join(',')); else nextParams.delete('genres');
      if (nextValues.page > 1) nextParams.set('page', String(nextValues.page)); else nextParams.delete('page');

      setSearchParams(nextParams);
    }, [episodeFilter, formatFilter, genreFilter, searchParams, searchQuery, setSearchParams, sortFilter, statusFilter, studioFilter, yearFilter]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery(''); setFormatFilter(''); setGenreFilter([]); setStatusFilter('');
    setYearFilter(''); setEpisodeFilter(''); setSortFilter(''); setStudioFilter('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  useEffect(() => {
    if (searchQuery === committedQuery) return;
    const timeoutId = window.setTimeout(() => { commitBrowseParams({ q: searchQuery, page: 1 }); }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [commitBrowseParams, committedQuery, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true); setError(null);
        let payload: any;
        const isSearch = committedQuery.trim().length > 0;

        if (isSearch) {
          payload = await fetchAnimeSearch(committedQuery.trim(), currentPage);
        } else if (committedStudio) {
          const res = await fetchAnimeByStudio(committedStudio, FETCH_PER_PAGE, currentPage);
          payload = { results: res.results, hasNextPage: res.hasNextPage, total: res.results.length };
        } else {
          const params = new URLSearchParams({ page: String(currentPage), per_page: String(FETCH_PER_PAGE), sort: committedSort || 'POPULARITY_DESC' });
          params.set('isAdult', 'false');
          if (committedFormat) params.set('format', committedFormat);
          if (committedStatus) params.set('status', committedStatus);
          if (committedYear) params.set('year', committedYear);
          if (committedGenres.length > 0) {
            const firstGenreObj = GENRE_OPTIONS.find((option) => option.value === committedGenres[0]);
            if (firstGenreObj) params.set('genre', firstGenreObj.queryValue);
          }
          payload = await fetchAnimeFilter(params);
        }

        if (controller.signal.aborted) return;

        const rawResults = payload?.results || payload?.data?.results || payload?.data || [];
        const hasNext = payload?.hasNextPage ?? payload?.data?.hasNextPage ?? false;
        const total = payload?.total ?? payload?.data?.total ?? rawResults.length;

        const filteredResults = rawResults.filter((entry: AnimeResult) => {
          if ((entry as any).isAdult) return false;
          if (entry.genres && entry.genres.some(g => ['Hentai'].includes(g))) return false;
          if (isSearch) {
            if (committedFormat && entry.format !== committedFormat) return false;
            if (committedStatus && entry.status !== committedStatus) return false;
            if (committedYear && String(entry.seasonYear || entry.startDate?.year || '') !== committedYear) return false;
          }
          if (committedGenres.length > (isSearch ? 0 : 1)) {
            const hasAllGenres = committedGenres.every((val) => {
              const queryVal = GENRE_OPTIONS.find((o) => o.value === val)?.queryValue;
              return queryVal && entry.genres?.includes(queryVal);
            });
            if (!hasAllGenres) return false;
          }
          if (!matchesEpisodeFilter(entry, committedEpisodeLength)) return false;
          return true;
        });

        const uniqueResults = filteredResults.filter((v: AnimeResult, i: number, a: AnimeResult[]) => {
          const isFirstId = a.findIndex((t) => t.id === v.id) === i;
          if (!isFirstId) return false;
          if (isSearch) return true;
          const titleV = getAnimeDisplayTitle(v.title) || '';
          const firstFranchiseIndex = a.findIndex((t) => isSameFranchise(titleV, getAnimeDisplayTitle(t.title) || ''));
          return firstFranchiseIndex === i;
        });

        // FIX: Sliced the items to match ITEMS_PER_PAGE. This maps to the skeletons exactly and stops jagged/missing bottom grids 
        setAnimeList(uniqueResults.slice(0, ITEMS_PER_PAGE));
        setPageInfo({ currentPage, lastPage: Math.max(1, hasNext ? currentPage + 1 : currentPage), hasNextPage: hasNext, total: total });

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') return;
        setError(fetchError.message || 'Failed to load anime browse results.');
        setAnimeList([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => { controller.abort(); };
  }, [committedEpisodeLength, committedFormat, committedGenres, committedQuery, committedSort, committedStatus, committedStudio, committedYear, currentPage]);

  const hasActiveFilters = Boolean(committedQuery || committedFormat || committedGenres.length || committedStatus || committedYear || committedEpisodeLength || committedSort || committedStudio);

  const updateGenreFilter = useCallback((value: string) => {
    const nextValue = value === '' ? [] : genreFilter.includes(value) ? genreFilter.filter((entry) => entry !== value) : [...genreFilter, value];
    setGenreFilter(nextValue); commitBrowseParams({ genres: nextValue, page: 1 });
  }, [commitBrowseParams, genreFilter]);

  const contentKey = `${viewMode}-${currentPage}-${committedQuery}-${committedFormat}-${committedStatus}-${committedYear}-${committedEpisodeLength}-${committedSort}-${committedStudio}-${committedGenres.join()}`;

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent)]/20">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: 'color-mix(in srgb, var(--aw-bg), transparent 15%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}></div>

      <main className="mx-auto w-full max-w-[1460px] space-y-8 px-4 py-10 md:px-8 relative z-10">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-2">
          <p className="aw-label flex items-center gap-2"><Library size={12} /> Digital Library</p>
          <div className="flex items-center justify-between">
            <motion.h1
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm flex items-center gap-3"
              style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}
            >
              DISCOVER
            </motion.h1>
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex w-full flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <DesktopBrowseFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..." fieldLabels={{ format: 'Format', genre: 'Genre', status: 'Status', year: 'Year', length: 'Episodes', studio: 'Studio' }}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} formatFilter={formatFilter ? [formatFilter] : []} genreFilter={genreFilter}
              statusFilter={statusFilter ? [statusFilter] : []} yearFilter={yearFilter ? [yearFilter] : []} lengthFilter={episodeFilter ? [episodeFilter] : []} studioFilter={studioFilter ? [studioFilter] : []}
              formatOptions={FORMAT_OPTIONS} genreOptions={GENRE_OPTIONS} statusOptions={STATUS_OPTIONS} yearOptions={yearOptions}
              lengthOptions={EPISODE_OPTIONS} studioOptions={STUDIO_OPTIONS}
              updateFormatFilter={(v) => { setFormatFilter(v); commitBrowseParams({ format: v, page: 1 }); }} updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(v) => { setStatusFilter(v); commitBrowseParams({ status: v, page: 1 }); }}
              updateYearFilter={(v) => { setYearFilter(v); commitBrowseParams({ year: v, page: 1 }); }} updateLengthFilter={(v) => { setEpisodeFilter(v); commitBrowseParams({ length: v, page: 1 }); }}
              updateStudioFilter={(v) => { setStudioFilter(v); commitBrowseParams({ studio: v, page: 1 }); }}
              hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
            />
            <MobileBrowseFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..." fieldLabels={{ format: 'Format', genre: 'Genre', status: 'Status', year: 'Year', length: 'Episodes', studio: 'Studio' }}
              formatFilter={formatFilter} genreFilter={genreFilter} statusFilter={statusFilter} yearFilter={yearFilter} lengthFilter={episodeFilter} studioFilter={studioFilter}
              formatOptions={FORMAT_OPTIONS} genreOptions={GENRE_OPTIONS} statusOptions={STATUS_OPTIONS} yearOptions={yearOptions} lengthOptions={EPISODE_OPTIONS} studioOptions={STUDIO_OPTIONS}
              updateFormatFilter={(v) => { setFormatFilter(v); commitBrowseParams({ format: v, page: 1 }); }} updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(v) => { setStatusFilter(v); commitBrowseParams({ status: v, page: 1 }); }}
              updateYearFilter={(v) => { setYearFilter(v); commitBrowseParams({ year: v, page: 1 }); }} updateLengthFilter={(v) => { setEpisodeFilter(v); commitBrowseParams({ length: v, page: 1 }); }}
              updateStudioFilter={(v) => { setStudioFilter(v); commitBrowseParams({ studio: v, page: 1 }); }} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end mt-2 xl:mt-0">
            <div className="flex h-[45px] items-center gap-1 rounded-[14px] border border-[var(--aw-border)] bg-[var(--aw-s1)] p-1 backdrop-blur-md transition-colors duration-300">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setViewMode('list')}
                className="relative flex h-full w-[40px] items-center justify-center rounded-[10px] outline-none"
                title="List View"
              >
                {viewMode === 'list' && (
                  <motion.div
                    layoutId="viewModePill"
                    className="absolute inset-0 rounded-[10px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)]"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <List size={16} strokeWidth={viewMode === 'list' ? 2.5 : 2} className={`relative z-10 transition-colors duration-300 ${viewMode === 'list' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 hover:text-white'}`} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setViewMode('grid')}
                className="relative flex h-full w-[40px] items-center justify-center rounded-[10px] outline-none"
                title="Grid View"
              >
                {viewMode === 'grid' && (
                  <motion.div
                    layoutId="viewModePill"
                    className="absolute inset-0 rounded-[10px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)]"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}
                <LayoutGrid size={16} strokeWidth={viewMode === 'grid' ? 2.5 : 2} className={`relative z-10 transition-colors duration-300 ${viewMode === 'grid' ? 'text-[var(--aw-accent)]' : 'text-zinc-500 hover:text-white'}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.section key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center min-h-[320px] rounded-[1.7rem] border border-[var(--aw-border)] bg-[var(--aw-s1)] px-6 py-12 text-center backdrop-blur-md">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--aw-s2)] border border-[var(--aw-border)] mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <ServerCrash size={28} className="text-red-400" />
              </motion.div>
              <p className="aw-label text-red-400">Browse Failed</p>
              <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Miruo encountered an error</h3>
              <p className="mt-2 text-sm max-w-md" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{error}</p>
            </motion.section>
          ) : loading ? (
            <motion.div key="loading" initial="hidden" animate="visible" exit="hidden" variants={containerVariants} className="w-full">
              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <motion.div variants={itemVariants} key={i} className="aw-skeleton-card h-[190px]" />)}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <motion.div variants={itemVariants} key={i} className="aw-skeleton-card aspect-[3/4]" />)}
                </div>
              )}
            </motion.div>
          ) : animeList.length ? (
            <motion.div key={contentKey} variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full">

              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {animeList.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} viewMode="list" navigate={navigate} bookmarkedIds={bookmarkedIds} bookmarkedTitles={bookmarkedTitles} user={user} />
                  ))}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {animeList.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} viewMode="grid" navigate={navigate} bookmarkedIds={bookmarkedIds} bookmarkedTitles={bookmarkedTitles} user={user} />
                  ))}
                </div>
              )}

              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2 pt-10 pb-6">
                <motion.button
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  type="button"
                  onClick={() => currentPage > 1 && commitBrowseParams({ page: currentPage - 1 })}
                  disabled={currentPage <= 1}
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
                        {currentPage === page ? (
                          <div className={`relative flex h-10 items-center justify-center transition-[min-width] duration-150 ease-out ${isEditingPage ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                            {/* Removed shadow utility here */}
                            <div className={`absolute bottom-0 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)] transition-[width] duration-150 ease-out ${isEditingPage ? 'w-full' : 'w-8'}`} />
                            {isEditingPage ? (
                              <input
                                autoFocus type="text" value={jumpToPageValue} onChange={(e) => setJumpToPageValue(e.target.value.replace(/\D/g, ''))} onBlur={() => setIsEditingPage(false)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault(); const target = parseInt(jumpToPageValue);
                                    if (!isNaN(target) && target > 0 && target <= Math.max(pageInfo.lastPage, 9999)) commitBrowseParams({ page: target });
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
                            whileHover={{ y: -2, scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.1, ease: "easeInOut" }}
                            type="button"
                            onClick={() => commitBrowseParams({ page })}
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
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1, ease: "easeInOut" }}
                  type="button"
                  onClick={() => pageInfo.hasNextPage && commitBrowseParams({ page: currentPage + 1 })}
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
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>This browse page came back empty.</h3>
                <p className="mt-2 text-sm max-w-sm mx-auto" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Try a looser search, another genre, or a different format filter to find what you're looking for.</p>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default AnimeBrowse;

/* --- END OF FILE AnimeBrowse.tsx --- */