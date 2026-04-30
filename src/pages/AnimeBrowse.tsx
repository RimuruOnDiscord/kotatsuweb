/* --- START OF FILE AnimeBrowse.tsx --- */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, LayoutGrid, Library, List, Play, Star, Bookmark, BookmarkCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BrowseTopbar from '../components/BrowseTopbar';
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
} from '../utils/animeApi';

type FilterOption = { value: string; label: string; disabled?: boolean };

const ITEMS_PER_PAGE = 24;

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

const SEASON_OPTIONS: FilterOption[] = [
  { value: '', label: 'Season' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
];

const EPISODE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Episodes' },
  { value: 'short', label: '1 - 12 Episodes' },
  { value: 'medium', label: '13 - 24 Episodes' },
  { value: 'long', label: '25+ Episodes' },
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
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }

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

  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* --- EXTREME HOVER ANIMATIONS --- */
  .aw-media-card {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    z-index: 1;
    overflow: hidden; 
    transform-origin: center;
  }

  /* Premium Foil Shine Sweep */
  .aw-media-card::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 60%;
    height: 100%;
    transition: left 0.7s cubic-bezier(0.25, 1, 0.5, 1);
    z-index: 20;
    pointer-events: none;
  }
  
  .aw-media-card:hover::after {
    left: 200%;
  }

  /* Hover Lift */
  .aw-media-card:hover {
    z-index: 30;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 50%);
    box-shadow: 0 40px 80px -15px rgba(0,0,0,0.9), 0 0 30px -5px rgba(var(--app-accent-rgb), 0.4);
    background: color-mix(in srgb, var(--aw-accent), transparent 90%);
    transform: translateY(-8px) scale(1.05);
  }

  /* Active Squish */
  .aw-media-card:active {
    transform: translateY(0) scale(0.96);
    filter: brightness(0.8);
  }

  /* Bookmark Button */
  .aw-bookmark-btn {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-bookmark-btn:active {
    transform: scale(0.85);
  }
  .aw-bookmark-btn:hover {
    transform: scale(1.15);
  }

  /* Pagination Buttons */
  .aw-pagination-btn {
    display: inline-flex;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    border: 1px solid var(--aw-border);
    background: color-mix(in_srgb, var(--aw-accent), transparent 97%);
    color: var(--aw-muted);
    font-family: var(--aw-font-display);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-pagination-btn:hover:not(:disabled) {
    background: color-mix(in_srgb, var(--aw-accent), transparent 85%);
    border-color: var(--aw-accent);
    color: white;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 10px 20px -5px rgba(0,0,0,0.5);
  }
  .aw-pagination-btn.active {
    background: var(--aw-accent);
    border-color: var(--aw-accent);
    color: #04110d;
    box-shadow: 0 8px 20px -6px var(--aw-accent-glow);
  }
  .aw-pagination-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Skeleton Pulse */
  .aw-skeleton-card {
    position: relative;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--aw-border);
    border-radius: 20px;
    overflow: hidden;
    transform: translateZ(0);
    animation: aw-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes aw-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: .5; }
  }
`;

// ─────────────────────────────────────────
// FRAMER MOTION VARIANTS
// ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.04, staggerDirection: -1 as const },
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 22, stiffness: 220 },
  },
  exit: { 
    opacity: 0, y: -20, scale: 0.95, 
    transition: { duration: 0.2, ease: "easeIn" } 
  }
};

// ─────────────────────────────────────────
// HELPER FUNCTIONS 
// ─────────────────────────────────────────
const generateSlug = (titleObj: any) => {
  const displayTitle = getAnimeDisplayTitle(titleObj) || '';
  return displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const normalizeTitle = (t: string) => {
  if (!t) return '';
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '');
};

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
    if (t1.startsWith(t2 + ':') || t1.startsWith(t2 + ' -') || t1.startsWith(t2 + ' ')) return true;
    if (t2.startsWith(t1 + ':') || t2.startsWith(t1 + ' -') || t2.startsWith(t1 + ' ')) return true;
  }
  if (t1.includes(':') && t2.includes(':')) {
    const prefix1 = t1.split(':')[0].trim();
    const prefix2 = t2.split(':')[0].trim();
    if (prefix1 === prefix2 && prefix1.length > 3) return true;
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

const AnimeListCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate>; bookmarkedIds: Set<string>; bookmarkedTitles: Set<string>; user: any }> = ({ anime, navigate, bookmarkedIds, bookmarkedTitles, user }) => {
  const coverUrl = getAnimeCover(anime);
  const titleStr = getAnimeDisplayTitle(anime.title) || '';
  const normTitle = normalizeTitle(titleStr);

  // Cross-reference ID AND Exact Title
  const isBookmarked = useMemo(() => {
    const currentIds = [String(anime.id), String((anime as any).malId), String((anime as any).idMal)].filter(id => id && id !== 'undefined' && id !== 'null');
    const hasIdMatch = currentIds.some(id => bookmarkedIds.has(id));
    const hasTitleMatch = normTitle && bookmarkedTitles.has(normTitle);
    return hasIdMatch || hasTitleMatch;
  }, [anime, bookmarkedIds, bookmarkedTitles, normTitle]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentIds = [String(anime.id), String((anime as any).malId), String((anime as any).idMal)].filter(id => id && id !== 'undefined' && id !== 'null');
    const primaryMalId = (anime as any).malId || (anime as any).idMal || anime.id;

    if (isBookmarked) {
      // Aggressive Delete Locally (Matches ID OR Title)
      try {
        ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
          let saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(saved)) {
            saved = saved.filter((b: any) => {
              const storedIds = [String(b.id), String(b.malId), String(b.mediaId), String(b.mal_id)].filter(id => id && id !== 'undefined' && id !== 'null');
              const isIdMatch = storedIds.some(sId => currentIds.includes(sId));
              const isTitleMatch = b.title && normalizeTitle(b.title) === normTitle;
              return !(isIdMatch || isTitleMatch); // If it matches either, REMOVE IT
            });
            localStorage.setItem(key, JSON.stringify(saved));
          }
        });
      } catch (err) {}

      // Aggressive Delete from Database
      if (user) {
        try {
          if (currentIds.length > 0) {
            await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).in('mal_id', currentIds);
          }
          if (titleStr) {
            await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('title', titleStr);
          }
        } catch (err) {}
      }
    } else {
      // Add Locally
      const newBookmark = {
        id: anime.id,
        malId: primaryMalId,
        title: titleStr || 'Unknown Title',
        cover: getAnimeCover(anime),
        type: getAnimeTypeLabel(anime) || 'Anime',
        status: 'uncategorized', // 'To Watch'
        score: anime.score || 0,
        author: getStudioSafe(anime) !== 'Unknown Studio' ? getStudioSafe(anime) : undefined,
        updatedAt: Date.now()
      };

      try {
        const saved = JSON.parse(localStorage.getItem('mv_bookmarks') || '[]');
        if (Array.isArray(saved)) {
          saved.push(newBookmark);
          localStorage.setItem('mv_bookmarks', JSON.stringify(saved));
        }
      } catch (err) {}

      // Add to Database
      if (user) {
        try {
          await supabase.from('anime_bookmarks').upsert({
            user_id: user.id,
            mal_id: String(newBookmark.malId),
            title: newBookmark.title,
            cover: newBookmark.cover,
            type: newBookmark.type,
            status: newBookmark.status,
            score: newBookmark.score,
            author: newBookmark.author,
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id, mal_id' });
        } catch (err) {}
      }
    }
    
    // Force complete refresh
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('mv_bookmark_updated'));
  };

  return (
    <motion.div variants={itemVariants} className="relative h-[190px] w-full">
      <div
        onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
        className="aw-media-card group flex h-full gap-4 sm:gap-5 rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] p-3 cursor-pointer select-none"
      >
        <div className="absolute top-4 right-4 z-[60]">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={toggleBookmark}
            className={`aw-bookmark-btn flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-all duration-300 ${
              isBookmarked
                ? 'bg-[var(--aw-accent)]/20 border-[var(--aw-accent)] text-[var(--aw-accent)] shadow-[0_0_15px_rgba(var(--aw-accent-glow),0.3)]'
                : 'bg-[var(--aw-accent)]/20 border-white/10 text-zinc-400 hover:bg-black/60 hover:text-white'
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            {isBookmarked ? (
               <BookmarkCheck size={16} className="drop-shadow-md" />
            ) : (
               <Bookmark size={14} />
            )}
          </button>
        </div>

        <div className="relative w-[115px] sm:w-[125px] flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.02]">
          {coverUrl ? (
            <img src={coverUrl} alt={titleStr} className="h-full w-full object-cover transition-transform duration-[600ms] ease-out opacity-95 group-hover:opacity-100 pointer-events-none" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-600 pointer-events-none">No Cover</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none transition-opacity duration-300 group-hover:opacity-80" />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-2 pointer-events-none">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 w-full pr-8">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--aw-accent)] border border-white/5 shadow-sm transition-all duration-300 group-hover:bg-[var(--aw-accent)] group-hover:text-[#04110d] group-hover:shadow-[0_0_15px_rgba(var(--aw-accent-glow),0.4)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                  {getAnimeTypeLabel(anime) || 'TV'}
                </span>
                {anime.score && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 transition-transform duration-300 group-hover:scale-110" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    <Star size={11} className="fill-amber-400" />
                    {(anime.score / 10).toFixed(1)}
                  </span>
                )}
              </div>
              
              <h3 className="line-clamp-2 text-[16px] sm:text-[17px] font-bold leading-tight text-white/95 group-hover:text-white transition-all duration-[400ms] cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:translate-x-1.5" style={{ fontFamily: 'var(--aw-font-display)' }}>
                {titleStr}
              </h3>
              
              <p className="mt-1.5 flex items-center gap-2 text-[12px] font-medium text-zinc-400 transition-transform duration-[400ms] group-hover:translate-x-1.5 delay-75" style={{ fontFamily: 'var(--aw-font-body)' }}>
                <span>{anime.seasonYear || anime.startDate?.year || 'TBA'}</span>
                <span className="h-1 w-1 rounded-full bg-zinc-700 transition-colors group-hover:bg-[var(--aw-accent)]" />
                <span className="truncate">{getStudioSafe(anime)}</span>
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-1 sm:gap-2 rounded-2xl bg-white/[0.04] px-3 py-2 border border-white/5 backdrop-blur-md transition-all duration-500 group-hover:bg-white/[0.08] group-hover:border-white/10 group-hover:-translate-y-1">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[9px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400" style={{ fontFamily: 'var(--aw-font-display)' }}>Status</span>
              <span className="truncate text-[12px] font-bold text-[var(--aw-accent)] capitalize" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}
              </span>
            </div>
            <div className="h-6 w-[1px] shrink-0 bg-white/10 group-hover:bg-white/20" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[9px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400" style={{ fontFamily: 'var(--aw-font-display)' }}>Season</span>
              <span className="truncate text-[12px] font-bold text-white/90 capitalize group-hover:text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {anime.season ? anime.season.toLowerCase() : 'TBA'}
              </span>
            </div>
            <div className="h-6 w-[1px] shrink-0 bg-white/10 group-hover:bg-white/20" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[9px] font-black uppercase tracking-wider text-zinc-500 group-hover:text-zinc-400" style={{ fontFamily: 'var(--aw-font-display)' }}>Eps</span>
              <span className="truncate text-[12px] font-bold text-white/90 group-hover:text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {anime.episodes || '--'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const AnimeGridCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate>; bookmarkedIds: Set<string>; bookmarkedTitles: Set<string>; user: any }> = ({ anime, navigate, bookmarkedIds, bookmarkedTitles, user }) => {
  const coverUrl = getAnimeCover(anime);
  const titleStr = getAnimeDisplayTitle(anime.title) || '';
  const normTitle = normalizeTitle(titleStr);

  const isBookmarked = useMemo(() => {
    const currentIds = [String(anime.id), String((anime as any).malId), String((anime as any).idMal)].filter(id => id && id !== 'undefined' && id !== 'null');
    const hasIdMatch = currentIds.some(id => bookmarkedIds.has(id));
    const hasTitleMatch = normTitle && bookmarkedTitles.has(normTitle);
    return hasIdMatch || hasTitleMatch;
  }, [anime, bookmarkedIds, bookmarkedTitles, normTitle]);

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentIds = [String(anime.id), String((anime as any).malId), String((anime as any).idMal)].filter(id => id && id !== 'undefined' && id !== 'null');
    const primaryMalId = (anime as any).malId || (anime as any).idMal || anime.id;

    if (isBookmarked) {
      try {
        ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'].forEach(key => {
          let saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(saved)) {
            saved = saved.filter((b: any) => {
              const storedIds = [String(b.id), String(b.malId), String(b.mediaId), String(b.mal_id)].filter(id => id && id !== 'undefined' && id !== 'null');
              const isIdMatch = storedIds.some(sId => currentIds.includes(sId));
              const isTitleMatch = b.title && normalizeTitle(b.title) === normTitle;
              return !(isIdMatch || isTitleMatch);
            });
            localStorage.setItem(key, JSON.stringify(saved));
          }
        });
      } catch (err) {}

      if (user) {
        try {
          if (currentIds.length > 0) {
            await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).in('mal_id', currentIds);
          }
          if (titleStr) {
            await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('title', titleStr);
          }
        } catch (err) {}
      }
    } else {
      const newBookmark = {
        id: anime.id,
        malId: primaryMalId,
        title: titleStr || 'Unknown Title',
        cover: getAnimeCover(anime),
        type: getAnimeTypeLabel(anime) || 'Anime',
        status: 'uncategorized',
        score: anime.score || 0,
        author: getStudioSafe(anime) !== 'Unknown Studio' ? getStudioSafe(anime) : undefined,
        updatedAt: Date.now()
      };

      try {
        const saved = JSON.parse(localStorage.getItem('mv_bookmarks') || '[]');
        if (Array.isArray(saved)) {
          saved.push(newBookmark);
          localStorage.setItem('mv_bookmarks', JSON.stringify(saved));
        }
      } catch (err) {}

      if (user) {
        try {
          await supabase.from('anime_bookmarks').upsert({
            user_id: user.id,
            mal_id: String(newBookmark.malId),
            title: newBookmark.title,
            cover: newBookmark.cover,
            type: newBookmark.type,
            status: newBookmark.status,
            score: newBookmark.score,
            author: newBookmark.author,
            created_at: new Date().toISOString()
          }, { onConflict: 'user_id, mal_id' });
        } catch (err) {}
      }
    }
    
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('mv_bookmark_updated'));
  };

  return (
    <motion.div variants={itemVariants} className="relative w-full h-full">
      <div
        onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
        className="aw-media-card group flex h-full cursor-pointer flex-col rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] select-none overflow-hidden"
      >
        <div className="absolute top-3 right-3 z-[60]">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={toggleBookmark}
            className={`aw-bookmark-btn flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md border transition-all duration-300 ${
              isBookmarked
                ? 'bg-[var(--aw-accent)]/20 border-[var(--aw-accent)] text-[var(--aw-accent)] shadow-[0_0_15px_rgba(var(--aw-accent-glow),0.3)]'
                : 'bg-black/40 border-white/10 text-white/70 hover:bg-black/60 hover:text-white'
            }`}
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            {isBookmarked ? (
               <BookmarkCheck size={16} className="drop-shadow-md" />
            ) : (
               <Bookmark size={14} />
            )}
          </button>
        </div>

        <div className="relative aspect-[3/4] w-full overflow-hidden bg-white/[0.02]">
          {coverUrl ? (
            <img src={coverUrl} alt={titleStr} className="h-full w-full object-cover transition-transform duration-[600ms] ease-out opacity-95 group-hover:opacity-100 group-hover:scale-[1.15] group-hover:-rotate-1 pointer-events-none" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest pointer-events-none">No Cover</div>
          )}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--aw-accent)] text-[#04110d] shadow-[0_0_25px_rgba(var(--aw-accent-glow),0.6)] transform scale-50 rotate-12 group-hover:scale-100 group-hover:rotate-0 transition-all duration-[400ms] cubic-bezier(0.34, 1.56, 0.64, 1)">
              <Play size={26} className="ml-1" fill="currentColor" />
            </div>
          </div>
          {anime.score && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-lg bg-black/70 px-2 py-1 backdrop-blur-md border border-white/10 shadow-lg z-20 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(var(--aw-accent-glow),0.5)] pointer-events-none">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>{(anime.score / 10).toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col p-4 flex-1 pointer-events-none">
          <div className="flex flex-col gap-1.5 w-full">
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-white/95 transition-all duration-[400ms] cubic-bezier(0.34, 1.56, 0.64, 1) group-hover:text-white group-hover:translate-x-1" style={{ fontFamily: 'var(--aw-font-display)' }}>
              {titleStr}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 overflow-hidden transition-transform duration-[400ms] group-hover:translate-x-1 delay-75">
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--aw-accent)] border border-white/5 shadow-sm transition-colors duration-300 group-hover:bg-[var(--aw-accent)] group-hover:text-[#04110d]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                {getAnimeTypeLabel(anime) || 'TV'}
              </span>
              <span className="truncate text-[11px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {anime.episodes ?? '--'} EP Available
              </span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-3 mt-3 transition-colors duration-500 group-hover:border-white/10">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 transition-colors group-hover:text-zinc-300" style={{ fontFamily: 'var(--aw-font-body)' }}>
              <Calendar size={12} className="text-zinc-500 group-hover:text-[var(--aw-accent)] transition-colors" />
              <span>{anime.startDate?.year || anime.seasonYear || 'TBA'}</span>
            </div>
            <div className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-widest border backdrop-blur-sm transition-all duration-300 ${anime.status === 'RELEASING'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : 'bg-white/[0.03] text-zinc-400 border-white/5 group-hover:bg-white/[0.08] group-hover:text-white'
              }`} style={{ fontFamily: 'var(--aw-font-display)' }}>
              {getAnimeStatusLabel(anime.status)}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};


const AnimeBrowse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('browseViewMode') as 'list' | 'grid') || 'list');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('browseViewMode', viewMode);
  }, [viewMode]);

  const currentPage = resolvePageParam(searchParams.get('page'));
  const committedQuery = searchParams.get('q') || '';
  const committedFormat = searchParams.get('format') || '';
  const committedStatus = searchParams.get('status') || '';
  const committedSeason = searchParams.get('language') || '';
  const committedYear = searchParams.get('year') || '';
  const committedEpisodeLength = searchParams.get('length') || '';
  const committedSort = searchParams.get('release') || '';

  const rawGenres = searchParams.get('genres');
  const committedGenres = useMemo(() => parseMultiValueParam(rawGenres), [rawGenres]);

  const [searchQuery, setSearchQuery] = useState(committedQuery);
  const [formatFilter, setFormatFilter] = useState(committedFormat);
  const [genreFilter, setGenreFilter] = useState(committedGenres);
  const [statusFilter, setStatusFilter] = useState(committedStatus);
  const [seasonFilter, setSeasonFilter] = useState(committedSeason);
  const [yearFilter, setYearFilter] = useState(committedYear);
  const [episodeFilter, setEpisodeFilter] = useState(committedEpisodeLength);
  const [sortFilter, setSortFilter] = useState(committedSort);

  const [animeList, setAnimeList] = useState<AnimeResult[]>([]);
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, lastPage: 1, hasNextPage: false, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination Jump States
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [jumpToPageValue, setJumpToPageValue] = useState('');

  // ─────────────────────────────────────────
  // THE NEW ULTRA-GREEDY TITLE & ID DETECTION
  // ─────────────────────────────────────────
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarkedTitles, setBookmarkedTitles] = useState<Set<string>>(new Set());

  const refreshBookmarks = useCallback(async () => {
    const ids = new Set<string>();
    const titles = new Set<string>();
    
    const processBookmark = (b: any) => {
      if (!b) return;
      // Scrape ANY key that could possibly be the target ID
      const possibleKeys = ['id', 'malId', 'mal_id', 'mediaId', 'aniId', 'idMal'];
      possibleKeys.forEach(k => {
        if (b[k] !== undefined && b[k] !== null && b[k] !== '') {
          ids.add(String(b[k]));
        }
      });
      // Fallback Title Matcher
      if (b.title && typeof b.title === 'string') {
        titles.add(normalizeTitle(b.title));
      }
    };

    // 1. Scan Local Storage 
    try {
      const localKeys = ['mv_bookmarks', 'bookmarks', 'anime_bookmarks'];
      localKeys.forEach(key => {
        const local = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(local)) local.forEach(processBookmark);
      });
    } catch (e) {}

    // 2. Scan DB safely using select('*') to prevent PGRST106 Column Not Found crash
    if (user) {
      try {
        const { data, error } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id);
        if (!error && data) {
          data.forEach(processBookmark);
        }
      } catch (e) {}
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
    () => [
      { value: '', label: 'Year' },
      ...Array.from({ length: 40 }, (_, index) => {
        const year = new Date().getFullYear() - index;
        return { value: String(year), label: String(year) };
      }),
    ], []
  );

  const visiblePages = useMemo(() => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage), [pageInfo.currentPage, pageInfo.lastPage]);

  // Inject Design Styles
  useEffect(() => {
    const id = 'aw-design-styles-anime';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  useEffect(() => {
    const id = 'browse-filter-control-style-anime';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      .browse-filter-control { background-color: var(--aw-s2) !important; color: #f4f4f5 !important; -webkit-text-fill-color: #f4f4f5 !important; appearance: none; }
      .browse-filter-control::placeholder { color: #6b7280 !important; opacity: 1; }
      .browse-filter-control:-webkit-autofill, .browse-filter-control:-webkit-autofill:hover, .browse-filter-control:-webkit-autofill:focus {
        -webkit-text-fill-color: #f4f4f5; -webkit-box-shadow: 0 0 0px 1000px var(--aw-s2) inset; box-shadow: 0 0 0px 1000px var(--aw-s2) inset;
        transition: background-color 9999s ease-in-out 0s; caret-color: #f4f4f5;
      }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => { setSearchQuery(committedQuery); }, [committedQuery]);

  const commitBrowseParams = useCallback(
    (overrides?: Partial<Record<'q' | 'format' | 'status' | 'language' | 'year' | 'length' | 'release', string> & { genres: string[] }> & { page?: number }) => {
      const nextParams = new URLSearchParams(searchParams);
      const nextValues = {
        q: (overrides?.q ?? searchQuery).trim(), format: overrides?.format ?? formatFilter, genres: overrides?.genres ?? genreFilter,
        status: overrides?.status ?? statusFilter, language: overrides?.language ?? seasonFilter, year: (overrides?.year ?? yearFilter).trim(),
        length: overrides?.length ?? episodeFilter, release: overrides?.release ?? sortFilter, page: overrides?.page ?? 1,
      };

      Object.entries(nextValues).forEach(([key, value]) => {
        if (key === 'genres' || key === 'page') return;
        if (value) nextParams.set(key, String(value)); else nextParams.delete(key);
      });

      if (nextValues.genres.length) nextParams.set('genres', nextValues.genres.join(',')); else nextParams.delete('genres');
      if (nextValues.page > 1) nextParams.set('page', String(nextValues.page)); else nextParams.delete('page');

      setSearchParams(nextParams);
    }, [episodeFilter, formatFilter, genreFilter, searchParams, searchQuery, seasonFilter, setSearchParams, sortFilter, statusFilter, yearFilter]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery(''); setFormatFilter(''); setGenreFilter([]); setStatusFilter('');
    setSeasonFilter(''); setYearFilter(''); setEpisodeFilter(''); setSortFilter('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  useEffect(() => {
    if (searchQuery === committedQuery) return;
    const timeoutId = window.setTimeout(() => { commitBrowseParams({ q: searchQuery, page: 1 }); }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [commitBrowseParams, committedQuery, searchQuery]);

  // Robust Fetch Logic
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true); setError(null);
        let payload: any;
        const isSearch = committedQuery.trim().length > 0;

        if (isSearch) {
          payload = await fetchAnimeSearch(committedQuery.trim(), currentPage);
        } else {
          const params = new URLSearchParams({ page: String(currentPage), per_page: String(ITEMS_PER_PAGE), sort: committedSort || 'POPULARITY_DESC' });
          params.set('isAdult', 'false');
          if (committedFormat) params.set('format', committedFormat);
          if (committedStatus) params.set('status', committedStatus);
          if (committedSeason) params.set('season', committedSeason);
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
          const nsfwGenres = ['Hentai', 'Ecchi'];
          if (entry.genres && entry.genres.some(g => nsfwGenres.includes(g))) return false;
          if (isSearch) {
            if (committedFormat && entry.format !== committedFormat) return false;
            if (committedStatus && entry.status !== committedStatus) return false;
            if (committedSeason && entry.season !== committedSeason) return false;
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
          const titleV = getAnimeDisplayTitle(v.title) || '';
          const firstFranchiseIndex = a.findIndex((t) => isSameFranchise(titleV, getAnimeDisplayTitle(t.title) || ''));
          return firstFranchiseIndex === i;
        });

        setAnimeList(uniqueResults.slice(0, ITEMS_PER_PAGE));
        setPageInfo({ currentPage, lastPage: Math.max(1, hasNext ? currentPage + 1 : currentPage), hasNextPage: hasNext, total: total });

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') return;
        console.error("Browse Fetch Error:", fetchError);
        setError(fetchError.message || 'Failed to load anime browse results.');
        setAnimeList([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();
    return () => { controller.abort(); };
  }, [committedEpisodeLength, committedFormat, committedGenres, committedQuery, committedSeason, committedSort, committedStatus, committedYear, currentPage]);

  const hasActiveFilters = Boolean(committedQuery || committedFormat || committedGenres.length || committedStatus || committedSeason || committedYear || committedEpisodeLength || committedSort);

  const updateGenreFilter = useCallback((value: string) => {
    const nextValue = value === '' ? [] : genreFilter.includes(value) ? genreFilter.filter((entry) => entry !== value) : [...genreFilter, value];
    setGenreFilter(nextValue); commitBrowseParams({ genres: nextValue, page: 1 });
  }, [commitBrowseParams, genreFilter]);

  // Key to force animation when page/filters change
  const contentKey = `${viewMode}-${currentPage}-${committedQuery}-${committedFormat}-${committedStatus}-${committedSeason}-${committedYear}-${committedEpisodeLength}-${committedSort}-${committedGenres.join()}`;

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent-muted)]">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: '1px solid var(--aw-border)', background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(20px)' }}></div>

      <main className="mx-auto w-full max-w-[1460px] space-y-8 px-4 py-10 md:px-8 relative z-10">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-2">
          <p className="aw-label flex items-center gap-2">
            <Library size={12} /> Digital Library
          </p>
          <div className="flex items-center justify-between">
            <h1 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: 800, textTransform: 'uppercase', color: 'var(--aw-text)', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}>
              DISCOVER
            </h1>
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex w-full flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <DesktopBrowseFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..." fieldLabels={{ genre: 'Genre', status: 'Status', language: 'Season', year: 'Year', length: 'Episodes', release: 'Sort' }}
              activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} typeFilter={formatFilter} genreFilter={genreFilter}
              statusFilter={statusFilter} languageFilter={seasonFilter} yearFilter={yearFilter} lengthFilter={episodeFilter} releaseFilter={sortFilter}
              typeOptions={FORMAT_OPTIONS} genreOptions={GENRE_OPTIONS} statusOptions={STATUS_OPTIONS} languageOptions={SEASON_OPTIONS} yearOptions={yearOptions}
              lengthOptions={EPISODE_OPTIONS} releaseOptions={SORT_OPTIONS}
              updateTypeFilter={(v) => { setFormatFilter(v); commitBrowseParams({ format: v, page: 1 }); }} updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(v) => { setStatusFilter(v); commitBrowseParams({ status: v, page: 1 }); }}
              updateLanguageFilter={(v) => { setSeasonFilter(v); commitBrowseParams({ language: v, page: 1 }); }}
              updateYearFilter={(v) => { setYearFilter(v); commitBrowseParams({ year: v, page: 1 }); }}
              updateLengthFilter={(v) => { setEpisodeFilter(v); commitBrowseParams({ length: v, page: 1 }); }}
              updateReleaseFilter={(v) => { setSortFilter(v); commitBrowseParams({ release: v, page: 1 }); }}
              hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
            />
            <MobileBrowseFilters
              searchQuery={searchQuery} setSearchQuery={setSearchQuery} submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..." fieldLabels={{ type: 'Format', genre: 'Genre', status: 'Status', language: 'Season', year: 'Year', length: 'Episodes', release: 'Sort' }}
              typeFilter={formatFilter} genreFilter={genreFilter} statusFilter={statusFilter} languageFilter={seasonFilter} yearFilter={yearFilter} lengthFilter={episodeFilter} releaseFilter={sortFilter}
              typeOptions={FORMAT_OPTIONS} genreOptions={GENRE_OPTIONS} statusOptions={STATUS_OPTIONS} languageOptions={SEASON_OPTIONS} yearOptions={yearOptions} lengthOptions={EPISODE_OPTIONS} releaseOptions={SORT_OPTIONS}
              updateTypeFilter={(v) => { setFormatFilter(v); commitBrowseParams({ format: v, page: 1 }); }} updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(v) => { setStatusFilter(v); commitBrowseParams({ status: v, page: 1 }); }} updateLanguageFilter={(v) => { setSeasonFilter(v); commitBrowseParams({ language: v, page: 1 }); }}
              updateYearFilter={(v) => { setYearFilter(v); commitBrowseParams({ year: v, page: 1 }); }} updateLengthFilter={(v) => { setEpisodeFilter(v); commitBrowseParams({ length: v, page: 1 }); }}
              updateReleaseFilter={(v) => { setSortFilter(v); commitBrowseParams({ release: v, page: 1 }); }} hasActiveFilters={hasActiveFilters} clearFilters={clearFilters}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <div className="flex h-[42px] items-center gap-1 rounded-[12px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] p-1 backdrop-blur-md">
              <button type="button" onClick={() => setViewMode('list')} className={`flex aspect-square h-full items-center justify-center rounded-[8px] transition-all duration-500 ${viewMode === 'list' ? 'bg-[var(--aw-accent)] text-[#04110d] shadow-[0_8px_20px_-6px_rgba(var(--app-accent-rgb),0.5)] scale-[1.03]' : 'text-zinc-500 hover:bg-white/[0.05] hover:text-white'}`} title="List View">
                <List size={18} strokeWidth={2.5} />
              </button>
              <button type="button" onClick={() => setViewMode('grid')} className={`flex aspect-square h-full items-center justify-center rounded-[8px] transition-all duration-500 ${viewMode === 'grid' ? 'bg-[var(--aw-accent)] text-[#04110d] shadow-[0_8px_20px_-6px_rgba(var(--app-accent-rgb),0.5)] scale-[1.03]' : 'text-zinc-500 hover:bg-white/[0.05] hover:text-white'}`} title="Grid View">
                <LayoutGrid size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.section key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="rounded-[1.7rem] border px-6 py-10 text-center" style={{ borderColor: 'var(--aw-border)', background: 'var(--aw-s1)' }}>
              <p className="aw-label">Browse Failed</p>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Miruo did not return a usable page.</h3>
              <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{error}</p>
            </motion.section>
          ) : loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aw-skeleton-card h-[190px]" />)}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aw-skeleton-card aspect-[3/4]" />)}
                </div>
              )}
            </motion.div>
          ) : animeList.length ? (
            <motion.div key={contentKey} variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full">
              {viewMode === 'list' ? (
                <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {animeList.map((anime) => <AnimeListCard key={anime.id} anime={anime} navigate={navigate} bookmarkedIds={bookmarkedIds} bookmarkedTitles={bookmarkedTitles} user={user} />)}
                </div>
              ) : (
                <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {animeList.map((anime) => <AnimeGridCard key={anime.id} anime={anime} navigate={navigate} bookmarkedIds={bookmarkedIds} bookmarkedTitles={bookmarkedTitles} user={user} />)}
                </div>
              )}

              <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-2 pt-10 pb-6">
                <button type="button" onClick={() => currentPage > 1 && commitBrowseParams({ page: currentPage - 1 })} disabled={currentPage <= 1} className="aw-pagination-btn gap-2 pl-3 pr-5">
                  <ChevronLeft className="h-4 w-4" /> <span>Prev</span>
                </button>

                <div className="flex items-center gap-2">
                  {visiblePages.map((page, index) => {
                    const previousPage = visiblePages[index - 1];
                    const shouldShowGap = index > 0 && previousPage && page - previousPage > 1;

                    return (
                      <React.Fragment key={page}>
                        {shouldShowGap && <span className="flex h-11 w-6 items-center justify-center text-xs font-black text-zinc-600">...</span>}
                        {currentPage === page ? (
                          <div className={`relative flex h-11 items-center justify-center transition-all duration-500 ${isEditingPage ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                            <div className={`absolute bottom-1 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)] shadow-[0_0_15px_rgba(var(--app-accent-rgb),0.5)] transition-all duration-500 ${isEditingPage ? 'w-full' : 'w-8'}`} />
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
                                className="w-full bg-transparent text-center text-[10px] font-black tracking-[0.15em] text-[var(--aw-accent)] outline-none border-none selection:bg-[var(--aw-accent)]/20" placeholder="..."
                              />
                            ) : (
                              <button type="button" onClick={() => { setIsEditingPage(true); setJumpToPageValue(String(page)); }} className="group relative flex h-full items-center justify-center px-2 text-[10px] font-black tracking-[0.15em] text-white transition-all">
                                <span className="relative z-10">{page}</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <button type="button" onClick={() => commitBrowseParams({ page })} className="aw-pagination-btn min-w-[44px]">{page}</button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <button type="button" onClick={() => pageInfo.hasNextPage && commitBrowseParams({ page: currentPage + 1 })} disabled={!pageInfo.hasNextPage} className="aw-pagination-btn gap-2 pl-5 pr-3">
                  <span>Next</span> <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.section key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border px-6 py-12 text-center" style={{ borderColor: 'var(--aw-border)', background: 'var(--aw-s1)' }}>
              <div>
                <p className="aw-label">No Matches</p>
                <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>This browse page came back empty.</h3>
                <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Try a looser search, another genre, or a different format filter.</p>
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