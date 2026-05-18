/* --- START OF FILE BookmarksPage.tsx --- */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { 
  Trash2, Search, CheckSquare, Library, X, ArrowUpDown, 
  ChevronDown, Check, Plus, Play, FolderPlus, AlertTriangle, Star,
  PlayCircle, CheckCircle2, PauseCircle, XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookmarkEntry, readBookmarks, removeBookmark, writeBookmarks } from '../utils/bookmarks';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────
// DYNAMIC STYLE INJECTION FROM WATCHPAGE
// ─────────────────────────────────────────
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700;800&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      rgba(255, 255, 255, 0.08);
    --aw-border-hi:   rgba(255, 255, 255, 0.15);
    --aw-accent:      var(--app-accent, #8b5cf6);
    --aw-accent-dim:  var(--app-accent-muted, #6d28d9);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-m3-root {
    font-family: var(--aw-font-body) !important;
    color: var(--aw-text);
    min-height: 100vh;
    padding-bottom: 120px;
    background: transparent;
    position: relative;
    overflow: hidden;
  }

  .aw-m3-container {
    max-width: 1540px;
    margin: 0 auto;
    padding: 28px 16px 64px;
    position: relative;
    z-index: 10;
  }
  @media (min-width: 768px) {
    .aw-m3-container { padding: 36px 24px 80px; }
  }

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

  .aw-m3-title {
    font-family: var(--aw-font-display) !important;
    font-size: clamp(2.15rem, 4vw, 3.15rem);
    font-weight: 800;
    line-height: 1.02;
    letter-spacing: 0;
    background: linear-gradient(135deg, #ffffff 40%, rgba(255,255,255,0.65) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Scrollbars hidden */
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Redesigned Glassmorphism Cards to match Watchpage .modern-card */
  .aw-modern-card-base {
    background: rgba(10, 10, 15, 0.36) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    box-sizing: border-box;
    box-shadow:
      0 28px 70px -36px rgba(0,0,0,0.85),
      inset 0 0 0 1px rgba(255,255,255,0.04);
  }

  .aw-modern-card {
    background: rgba(10, 10, 15, 0.4) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    border: 1px solid var(--aw-border) !important;
    box-sizing: border-box;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);
    padding: 24px 28px;
  }

  /* Status Glowing Badges */
  .status-badge-watching { background: rgb(52, 211, 153); box-shadow: 0 0 14px rgba(52, 211, 153, 0.45); }
  .status-badge-completed { background: rgb(168, 85, 247); box-shadow: 0 0 14px rgba(168, 85, 247, 0.45); }
  .status-badge-on-hold { background: rgb(245, 158, 11); box-shadow: 0 0 14px rgba(245, 158, 11, 0.45); }
  .status-badge-on_hold { background: rgb(245, 158, 11); box-shadow: 0 0 14px rgba(245, 158, 11, 0.45); }
  .status-badge-dropped { background: rgb(239, 68, 68); box-shadow: 0 0 14px rgba(239, 68, 68, 0.45); }
  .status-badge-uncategorized { background: rgb(156, 163, 175); box-shadow: 0 0 14px rgba(156, 163, 175, 0.45); }

  /* Tab Interactive Hover animations */
  .aw-tab-btn {
    border: 1px solid transparent;
    transition:
      transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.22s ease,
      border-color 0.22s ease,
      color 0.22s ease;
  }
  .aw-tab-btn:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.035);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .aw-tab-btn:hover .aw-tab-icon {
    transform: translateY(-1px) scale(1.08);
  }
  .aw-tab-btn:hover .aw-tab-badge {
    background: rgba(255, 255, 255, 0.12) !important;
    color: #ffffff !important;
  }

  /* Card components using Watchpage aesthetics */
  .aw-m3-card {
    position: relative;
    border-radius: 16px;
    padding: 8px;
    overflow: visible;
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.03);
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    cursor: pointer;
    transform-origin: center;
    --status-rgb: 156, 163, 175;
    transition:
      transform 0.3s cubic-bezier(0.22, 1, 0.36, 1),
      border-color 0.3s ease,
      background 0.3s ease,
      box-shadow 0.3s ease,
      opacity 0.3s ease,
      filter 0.3s ease;
  }

  .aw-m3-card:hover {
    transform: translateY(-4px);
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 28px rgba(0,0,0,0.4);
  }

  .aw-m3-card.status-watching { --status-rgb: 52, 211, 153; }
  .aw-m3-card.status-completed { --status-rgb: 168, 85, 247; }
  .aw-m3-card.status-on_hold { --status-rgb: 245, 158, 11; }
  .aw-m3-card.status-dropped { --status-rgb: 239, 68, 68; }
  .aw-m3-card.status-uncategorized { --status-rgb: 156, 163, 175; }

  .aw-m3-card:hover .aw-list-poster {
    border-color: rgba(var(--status-rgb), 0.24);
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.38),
      0 0 0 1px rgba(var(--status-rgb), 0.1);
  }

  .aw-list-poster {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    overflow: hidden;
    border-radius: 12px;
    background: var(--aw-s2);
    border: 1px solid rgba(255, 255, 255, 0.04);
    box-shadow: 0 2px 10px rgba(0,0,0,0.25);
    transition:
      transform 0.3s ease,
      border-color 0.3s ease,
      box-shadow 0.3s ease;
  }

  .aw-list-poster img {
    transition:
      transform 0.5s ease,
      opacity 0.3s ease,
      filter 0.3s ease;
  }

  .aw-m3-card:hover .aw-list-poster img {
    transform: scale(1.04);
    opacity: 1;
  }

  .aw-list-poster::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: rgb(var(--status-rgb));
    opacity: 0;
    transition: opacity 0.18s ease;
    z-index: 15;
  }

  .aw-m3-card:hover .aw-list-poster::after {
    opacity: 1;
  }

  .aw-m3-card:active {
    transform: scale(0.97);
  }

  .aw-m3-card.selected {
    border-color: rgba(var(--status-rgb), 0.35) !important;
    background: rgba(var(--status-rgb), 0.055);
    box-shadow:
      0 0 0 1px rgba(var(--status-rgb), 0.28),
      0 14px 32px rgba(0,0,0,0.42) !important;
  }

  .aw-card-action-row {
    transform: translateY(8px);
    opacity: 0;
    transition:
      transform 0.24s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.2s ease;
  }

  .aw-m3-card:hover .aw-card-action-row,
  .aw-card-action-row.is-open {
    transform: translateY(0);
    opacity: 1;
  }

  .aw-card-icon-button,
  .aw-card-play-button,
  .aw-menu-row,
  .aw-link-action {
    transition:
      transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease,
      box-shadow 0.18s ease;
  }

  .aw-card-icon-button:hover,
  .aw-card-play-button:hover,
  .aw-menu-row:hover,
  .aw-link-action:hover {
    transform: translateY(-1px);
  }

  .aw-card-icon-button:active,
  .aw-card-play-button:active,
  .aw-menu-row:active,
  .aw-link-action:active {
    transform: scale(0.96);
  }

  .aw-library-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 28px 16px;
  }

  @media (min-width: 640px) {
    .aw-library-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 30px 18px; }
  }

  @media (min-width: 1280px) {
    .aw-library-grid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
  }

  .aw-status-drop {
    transition:
      transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.22s ease,
      border-color 0.22s ease,
      color 0.22s ease,
      box-shadow 0.22s ease;
  }

  .aw-status-drop:hover,
  .aw-status-drop.is-drag-over {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.045);
    border-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .aw-status-drop.is-active {
    color: white;
    background: color-mix(in srgb, var(--aw-accent) 12%, rgba(255,255,255,0.035));
    border-color: color-mix(in srgb, var(--aw-accent) 34%, rgba(255,255,255,0.08));
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.035);
  }

  /* Watchpage .input-glow dynamic implementation for Search */
  .aw-search-glow {
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s, background 0.3s, box-shadow 0.3s !important;
  }
  .aw-search-glow:hover {
    transform: scale(1.015);
    background: rgba(255,255,255,0.05) !important;
    border-color: rgba(255,255,255,0.12) !important;
  }
  .aw-search-glow:focus-within {
    border-color: color-mix(in srgb, var(--aw-accent) 40%, transparent) !important;
    transform: scale(1.02);
    background: rgba(255,255,255,0.06) !important;
    box-shadow: 0 0 20px -5px color-mix(in srgb, var(--aw-accent) 30%, transparent) !important;
  }

  /* Sorter segment controls button hover animations */
  .aw-sort-btn-hover {
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .aw-sort-btn-hover:hover {
    transform: scale(1.03);
    background: rgba(255,255,255,0.05) !important;
    border-color: rgba(255,255,255,0.12) !important;
    color: white !important;
  }
  .aw-sort-btn-hover:active {
    transform: scale(0.95);
  }

  /* Trash Zone active hover transitions */
  .trash-zone-active {
    background: linear-gradient(to top, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0.04) 100%) !important;
    border-color: rgba(239, 68, 68, 0.45) !important;
    box-shadow: 0 -25px 60px rgba(239, 68, 68, 0.2) !important;
  }

  @keyframes float-slower {
    0%, 100% { transform: translate(0px, 0px) scale(1); }
    50% { transform: translate(15px, -15px) scale(1.05); }
  }

  .floating-drift {
    animation: float-slower 12s infinite ease-in-out;
  }
`;

// Helper Functions
const getNormalizedStatus = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (['watching', 'completed', 'on_hold', 'dropped'].includes(s)) return s;
  return 'uncategorized';
};

const createSlug = (title: string) => 
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const TABS = [
  { id: 'all', label: 'All Library', icon: Library, color: 'text-zinc-300', accent: '#ffffff' },
  { id: 'uncategorized', label: 'Plan to Watch', icon: FolderPlus, color: 'text-zinc-400', accent: 'rgb(156, 163, 175)' },
  { id: 'watching', label: 'Watching', icon: PlayCircle, color: 'text-emerald-400', accent: 'rgb(52, 211, 153)' },
  { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-purple-400', accent: 'rgb(168, 85, 247)' },
  { id: 'on_hold', label: 'On Hold', icon: PauseCircle, color: 'text-amber-400', accent: 'rgb(245, 158, 11)' },
  { id: 'dropped', label: 'Dropped', icon: XCircle, color: 'text-red-400', accent: 'rgb(239, 68, 68)' },
];

// ─────────────────────────────────────────
// MATERIAL DESIGN 3 CARD COMPONENT
// ─────────────────────────────────────────
const BookmarkCard: React.FC<{
  entry: BookmarkEntry;
  navigate: (path: string) => void;
  isSelected: boolean;
  selectionMode: boolean;
  onLongPress: (id: number) => void;
  onToggleSelect: (id: number) => void;
  onQuickMove: (id: number, newStatus: string) => void;
  onQuickDelete: (id: number) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrag: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  index: number;
  isDragging: boolean;
}> = ({ 
  entry, navigate, isSelected, selectionMode, onToggleSelect, onLongPress, 
  onQuickMove, onQuickDelete, onDragStart, onDrag, onDragEnd, index, isDragging 
}) => {
  const isManga = !entry.type || entry.type.toLowerCase() === 'manga' || entry.type.toLowerCase() === 'manhwa';
  const [isPressing, setIsPressing] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const wasLongPressed = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const startHold = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    if (selectionMode) return;
    wasLongPressed.current = false;
    setIsPressing(true);
    startPos.current = { x: e.clientX, y: e.clientY };

    holdTimeout.current = setTimeout(() => {
      wasLongPressed.current = true;
      onLongPress(entry.malId);
      setIsPressing(false);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(60);
      }
    }, 450);
  };

  const checkMoveCancel = (e: React.PointerEvent) => {
    if (!isPressing) return;
    if (Math.abs(e.clientX - startPos.current.x) > 8 || Math.abs(e.clientY - startPos.current.y) > 8) {
      cancelHold();
    }
  };

  const cancelHold = () => {
    setIsPressing(false);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect(entry.malId);
    } else {
      navigate(isManga ? `/read/${createSlug(entry.title)}` : `/watch/${createSlug(entry.title)}`);
    }
  };

  const handleQuickPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(isManga ? `/read/${createSlug(entry.title)}` : `/watch/${createSlug(entry.title)}`);
  };

  const cardStatus = getNormalizedStatus(entry.status);

  return (
    <motion.div
      draggable
      onDragStartCapture={(e) => { setIsPressing(false); onDragStart(e, entry.malId); }}
      onDragCapture={onDrag}
      onDragEndCapture={onDragEnd}
      onPointerDown={startHold}
      onPointerMove={checkMoveCancel}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); }}
      layout
      initial={{ opacity: 0, y: 35, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, delay: Math.min(index * 0.02, 0.3) }}
      className={`aw-m3-card status-${cardStatus} relative group flex flex-col ${isSelected ? 'selected' : ''} ${isPressing ? 'brightness-90 scale-[0.98]' : ''} ${isDragging ? 'opacity-35 saturate-0 scale-[0.94]' : ''}`}
    >
      {/* ── CARD COVER IMAGE ── */}
      {entry.cover ? (
        <img 
          src={entry.cover} 
          alt={entry.title} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08] group-hover:brightness-[0.85] group-hover:saturate-[1.1]" 
          draggable={false} 
          loading="lazy" 
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 border border-white/[0.04] text-xs text-white/40">
          <Library size={32} className="text-zinc-700 mb-2" />
          No Cover Available
        </div>
      )}

      {/* ── GRADIENT SHADOW HOVER EFFECTS ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/10 opacity-75 group-hover:opacity-90 transition-opacity duration-350 pointer-events-none" />

      {/* ── SELECTION PILL CHECKS (TOP LEFT) ── */}
      <div 
        onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.malId); }}
        className={`absolute top-4 left-4 z-20 flex items-center justify-center w-8.5 h-8.5 rounded-full border-2 transition-all duration-300 cursor-pointer backdrop-blur-md
          ${isSelected 
            ? 'bg-[var(--aw-accent,#8b5cf6)] border-transparent text-white shadow-[0_4px_12px_rgba(139,92,246,0.4)]' 
            : 'bg-black/35 border-white/35 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
          }
          ${selectionMode ? 'opacity-100 scale-100' : ''}
        `}
      >
        {isSelected ? <Check size={15} strokeWidth={3.5} className="text-white" /> : <Plus size={16} className="text-white/80" />}
      </div>

      {/* ── DYNAMIC STATUS BADGE (TOP RIGHT) ── */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-[9.5px] font-black uppercase tracking-wider text-zinc-300 shadow-md">
        <span className={`h-1.5 w-1.5 rounded-full status-badge-${cardStatus}`} />
        {TABS.find(t => t.id === cardStatus)?.label || 'Plan'}
      </div>

      {/* ── RATINGS GOLD STAR PILL ── */}
      {entry.score && entry.score > 0 && (
        <div className="absolute top-14 left-4 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-yellow-500/90 text-black text-[10.5px] font-extrabold shadow-md">
          <Star size={10} fill="black" />
          {entry.score.toFixed(1)}
        </div>
      )}

      {/* ── CARD DATA WRAPPER ── */}
      <div className="relative z-10 p-4 sm:p-5 flex flex-col justify-end min-h-[42%] transition-transform duration-300 group-hover:-translate-y-1">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded-md border border-white/15 bg-white/5 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-zinc-300">
            {entry.type || 'Anime'}
          </span>
          {entry.year && (
            <span className="text-[11px] font-bold text-zinc-400">
              {entry.year}
            </span>
          )}
        </div>

        <h3 className="text-sm sm:text-[14.5px] font-extrabold leading-[1.35] text-white tracking-wide line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]" style={{ fontFamily: 'var(--aw-font-body)' }}>
          {entry.title}
        </h3>

        {/* ── CARD QUICK HOVER ACTION ROW ── */}
        <div className="h-0 opacity-0 overflow-hidden group-hover:h-auto group-hover:opacity-100 group-hover:mt-3.5 transition-all duration-350 flex items-center gap-2 relative z-30">
          <button 
            onClick={handleQuickPlay}
            className="flex-1 flex items-center justify-center gap-1.5 h-[34px] rounded-xl bg-white text-black font-extrabold text-[11.5px] tracking-wide hover:bg-zinc-200 transition-colors cursor-pointer shadow-lg active:scale-95 duration-200"
          >
            <Play size={11} fill="black" /> Play
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setShowQuickMenu(!showQuickMenu); }}
            className="flex shrink-0 items-center justify-center w-[34px] h-[34px] rounded-xl bg-white/[0.08] hover:bg-white/[0.18] text-white transition-colors cursor-pointer border border-white/10 active:scale-95 duration-200"
            title="Update Status"
          >
            <FolderPlus size={13} />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); onQuickDelete(entry.malId); }}
            className="flex shrink-0 items-center justify-center w-[34px] h-[34px] rounded-xl bg-red-500/15 hover:bg-red-500/35 text-red-300 hover:text-white transition-colors cursor-pointer border border-red-500/25 active:scale-95 duration-200"
            title="Delete from Library"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── CARD INLINE QUICK MOVE MODAL ── */}
      <AnimatePresence>
        {showQuickMenu && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 380 }}
            className="absolute inset-x-2 bottom-2 z-[40] rounded-2xl bg-zinc-950/95 border border-white/10 p-2 flex flex-col gap-1 shadow-2xl backdrop-blur-2xl"
          >
            <div className="px-2 py-1 text-[10px] font-black tracking-widest text-zinc-500 uppercase flex items-center justify-between">
              <span>Quick Move</span>
              <X size={10} className="cursor-pointer hover:text-white" onClick={(e) => { e.stopPropagation(); setShowQuickMenu(false); }} />
            </div>
            {TABS.filter(t => t.id !== 'all').map((t) => (
              <button
                key={t.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickMove(entry.malId, t.id);
                  setShowQuickMenu(false);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] font-semibold transition-colors cursor-pointer hover:bg-white/[0.06]
                  ${cardStatus === t.id ? 'text-[var(--aw-accent,#8b5cf6)] bg-white/[0.03]' : 'text-zinc-300'}
                `}
              >
                <span className={`h-1.5 w-1.5 rounded-full status-badge-${t.id}`} />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────
// MAIN MAIN MY LIST / BOOKMARKS PAGE
// ─────────────────────────────────────────
void BookmarkCard;

const BookmarkPosterCard: React.FC<{
  entry: BookmarkEntry;
  navigate: (path: string) => void;
  isSelected: boolean;
  selectionMode: boolean;
  onLongPress: (id: number) => void;
  onToggleSelect: (id: number) => void;
  onQuickMove: (id: number, newStatus: string) => void;
  onQuickDelete: (id: number) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDrag: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  index: number;
  isDragging: boolean;
}> = ({
  entry, navigate, isSelected, selectionMode, onToggleSelect, onLongPress,
  onQuickMove, onQuickDelete, onDragStart, onDrag, onDragEnd, index, isDragging
}) => {
  const isManga = !entry.type || entry.type.toLowerCase() === 'manga' || entry.type.toLowerCase() === 'manhwa';
  const [isPressing, setIsPressing] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const wasLongPressed = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const cardStatus = getNormalizedStatus(entry.status);
  const statusLabel = TABS.find(t => t.id === cardStatus)?.label || 'Plan';

  const clearHold = () => {
    setIsPressing(false);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
  };

  const startHold = (e: React.PointerEvent) => {
    if (e.button === 2 || selectionMode) return;
    wasLongPressed.current = false;
    setIsPressing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    holdTimeout.current = setTimeout(() => {
      wasLongPressed.current = true;
      onLongPress(entry.malId);
      setIsPressing(false);
      window.navigator?.vibrate?.(60);
    }, 450);
  };

  const checkMoveCancel = (e: React.PointerEvent) => {
    if (!isPressing) return;
    if (Math.abs(e.clientX - startPos.current.x) > 8 || Math.abs(e.clientY - startPos.current.y) > 8) clearHold();
  };

  const openTitle = () => navigate(isManga ? `/read/${createSlug(entry.title)}` : `/watch/${createSlug(entry.title)}`);

  const handleClick = (e: React.MouseEvent) => {
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      onToggleSelect(entry.malId);
      return;
    }
    openTitle();
  };

  return (
    <motion.div
      draggable
      onDragStartCapture={(e) => { clearHold(); onDragStart(e, entry.malId); }}
      onDragCapture={onDrag}
      onDragEndCapture={onDragEnd}
      onPointerDown={startHold}
      onPointerMove={checkMoveCancel}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onPointerCancel={clearHold}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      layout
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(index * 0.015, 0.18) }}
      className={`aw-m3-card status-${cardStatus} group relative flex flex-col ${isSelected ? 'selected' : ''} ${isPressing ? 'brightness-90 scale-[0.98]' : ''} ${isDragging ? 'opacity-35 saturate-0 scale-[0.94]' : ''}`}
    >
      <div className="aw-list-poster">
        {entry.cover ? (
          <img
            src={entry.cover}
            alt={entry.title}
            className="absolute inset-0 h-full w-full object-cover opacity-90 pointer-events-none"
            draggable={false}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-xs text-white/40">
            <Library size={30} className="mb-2 text-zinc-700" />
            No Cover
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-80 pointer-events-none" />

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.malId); }}
          className={`absolute left-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-[10px] border transition-all duration-200 backdrop-blur-md
            ${isSelected
              ? 'bg-[var(--aw-accent,#34d399)] border-transparent text-black shadow-[0_4px_14px_rgba(0,0,0,0.35)]'
              : 'bg-black/45 border-white/20 text-white/80 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 hover:bg-white/10 hover:text-white'
            }
            ${selectionMode ? 'opacity-100 scale-100' : ''}
          `}
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? <Check size={15} strokeWidth={3.2} /> : <Plus size={16} />}
        </button>

        <div className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-black/55 px-2 py-1 text-[9px] font-bold uppercase text-zinc-300 shadow-md backdrop-blur-md transition-colors group-hover:text-white">
          <span className={`h-1.5 w-1.5 rounded-full status-badge-${cardStatus}`} />
          {statusLabel}
        </div>

        {entry.score && entry.score > 0 && (
          <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 rounded-[8px] border border-white/10 bg-black/60 px-2 py-1 text-[10px] font-bold text-white shadow-md backdrop-blur-md">
            <Star size={10} className="text-yellow-300" fill="currentColor" />
            {entry.score.toFixed(1)}
          </div>
        )}

        <div className={`aw-card-action-row ${showQuickMenu ? 'is-open' : ''} absolute inset-x-2.5 bottom-2.5 z-30 flex items-center gap-1.5`}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openTitle(); }}
            className="aw-card-play-button flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-white text-black text-[11px] font-extrabold shadow-lg hover:bg-zinc-200"
          >
            <Play size={11} fill="black" /> Watch
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowQuickMenu(v => !v); }}
            className="aw-card-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 bg-black/50 text-white backdrop-blur-md hover:bg-white/10 hover:border-white/20"
            title="Update status"
          >
            <FolderPlus size={13} />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuickDelete(entry.malId); }}
            className="aw-card-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-red-500/25 bg-red-500/20 text-red-200 backdrop-blur-md hover:bg-red-500/35 hover:text-white"
            title="Delete from library"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex h-[74px] flex-col justify-start gap-1.5 px-0.5 pt-2.5">
        <h3 className="line-clamp-1 text-[13px] font-semibold leading-snug text-white/90 transition-colors group-hover:text-[var(--aw-accent)]" style={{ fontFamily: 'var(--aw-font-body)' }}>
          {entry.title}
        </h3>

        <div className="flex flex-wrap items-center gap-[5px] opacity-80 transition-all duration-150 group-hover:-translate-y-[2px] group-hover:opacity-100">
          <span className="rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold leading-none tracking-wide text-[#b5b5bd] transition-colors group-hover:text-white">
            {entry.type || 'Anime'}
          </span>
          {entry.year && (
            <span className="rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold leading-none tracking-wide text-[#b5b5bd] transition-colors group-hover:text-white">
              {entry.year}
            </span>
          )}
          <span className="flex items-center gap-1 rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold leading-none tracking-wide text-[#b5b5bd] transition-colors group-hover:text-white">
            <span className={`h-1.5 w-1.5 rounded-full status-badge-${cardStatus}`} />
            {statusLabel}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {showQuickMenu && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 380 }}
            className="aw-material-menu absolute inset-x-2 top-2 z-[40] flex flex-col gap-1 rounded-[14px] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              <span>Quick Move</span>
              <X size={10} className="cursor-pointer transition-colors hover:text-white" onClick={() => setShowQuickMenu(false)} />
            </div>
            {TABS.filter(t => t.id !== 'all').map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onQuickMove(entry.malId, t.id);
                  setShowQuickMenu(false);
                }}
                className={`aw-menu-row flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold cursor-pointer hover:bg-white/[0.06]
                  ${cardStatus === t.id ? 'text-[var(--aw-accent,#8b5cf6)] bg-white/[0.03]' : 'text-zinc-300'}
                `}
              >
                <span className={`h-1.5 w-1.5 rounded-full status-badge-${t.id}`} />
                {t.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const BookmarksPage: React.FC = () => {
  useEffect(() => {
    document.title = 'My List | kotatsutv';
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering & Sorting Preferences
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title' | 'year' | 'score'>('updatedAt');

  // Selection & UI Focus states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  // Custom Confirmation Dialog Modals
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [itemToDeleteDirect, setItemToDeleteDirect] = useState<number | null>(null);

  const ghostRef = useRef<HTMLDivElement>(null);
  const selectionMode = selectedIds.length > 0;

  const emptyImg = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    return img;
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
    }
  }, []);

  // Fetch / Sync Bookmarks from Supabase or LocalStorage
  const syncBookmarks = useCallback(async () => {
    if (user) {
      const { data, error } = await supabase
        .from('anime_bookmarks')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setBookmarks(data.map((d: any) => ({
          malId: parseInt(d.mal_id, 10), 
          title: d.title, 
          cover: d.cover, 
          type: d.type, 
          status: d.status, 
          score: d.score, 
          author: d.author, 
          year: d.year, 
          updatedAt: new Date(d.created_at).getTime()
        })));
        return;
      }
    }
    // local fallback
    setBookmarks(readBookmarks().filter(b => !b.type || b.type.toLowerCase().includes('anime') || b.type.toLowerCase() === 'tv' || b.type.toLowerCase() === 'movie' || b.type.toLowerCase().includes('manga')));
  }, [user]);

  useEffect(() => {
    syncBookmarks();
  }, [syncBookmarks]);

  // Bulk Status Modification
  const handleBulkStatusChange = async (newStatus: string) => {
    const idsToChange = selectedIds;
    if (idsToChange.length === 0) return;

    setBookmarks(prev => prev.map(b => idsToChange.includes(b.malId) ? { ...b, status: newStatus, updatedAt: Date.now() } : b));

    if (user) {
      await supabase
        .from('anime_bookmarks')
        .update({ status: newStatus })
        .in('mal_id', idsToChange.map(String))
        .eq('user_id', user.id);
    } else {
      const updatedLocal = readBookmarks().map(b => idsToChange.includes(b.malId) ? { ...b, status: newStatus, updatedAt: Date.now() } : b);
      writeBookmarks(updatedLocal);
    }
    setSelectedIds([]);
  };

  // Quick Inline Status Update for individual card
  const handleQuickMove = async (id: number, newStatus: string) => {
    setBookmarks(prev => prev.map(b => b.malId === id ? { ...b, status: newStatus, updatedAt: Date.now() } : b));
    if (user) {
      await supabase
        .from('anime_bookmarks')
        .update({ status: newStatus })
        .eq('mal_id', String(id))
        .eq('user_id', user.id);
    } else {
      const updatedLocal = readBookmarks().map(b => b.malId === id ? { ...b, status: newStatus, updatedAt: Date.now() } : b);
      writeBookmarks(updatedLocal);
    }
  };

  // Trigger delete modal for a single card or bulk select
  const triggerQuickDelete = (id: number) => {
    setItemToDeleteDirect(id);
    setShowDeleteConfirmModal(true);
  };

  // Perform Bookmarks Deletion
  const handleExecuteDelete = async () => {
    const idsToDelete = itemToDeleteDirect ? [itemToDeleteDirect] : selectedIds;
    if (idsToDelete.length === 0) return;

    setBookmarks(prev => prev.filter(b => !idsToDelete.includes(b.malId)));

    if (user) {
      await supabase
        .from('anime_bookmarks')
        .delete()
        .in('mal_id', idsToDelete.map(String))
        .eq('user_id', user.id);
    } else {
      idsToDelete.forEach(id => removeBookmark(id));
    }
    
    setSelectedIds([]);
    setItemToDeleteDirect(null);
    setShowDeleteConfirmModal(false);
  };

  // Checkbox helpers
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleLongPress = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const selectAll = () => {
    const activeIds = filteredAndSortedBookmarks.map(b => b.malId);
    setSelectedIds(activeIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setIsDragActive(true);
    if (ghostRef.current) {
      ghostRef.current.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
      ghostRef.current.style.opacity = '1';
    }

    let idsToMove = selectedIds;
    if (!selectedIds.includes(id)) {
      idsToMove = selectedIds.length > 0 ? [...selectedIds, id] : [id];
      setSelectedIds(idsToMove);
    }

    if (emptyImg) {
      e.dataTransfer.setDragImage(emptyImg, 0, 0);
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToMove));
  };

  const handleDragEnd = () => {
    setIsDragActive(false);
    setDragOverTab(null);
    if (ghostRef.current) {
      ghostRef.current.style.opacity = '0';
    }
  };

  const handleDrop = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    setIsDragActive(false);
    setDragOverTab(null);
    try {
      const ids = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (Array.isArray(ids) && ids.length > 0) {
        setSelectedIds(ids);
        if (tabId === 'trash') {
          triggerQuickDelete(ids.length === 1 ? ids[0] : 0);
        } else {
          handleBulkStatusChange(tabId);
        }
      }
    } catch (err) { }
  };

  // Filtered & Sorted Bookmark List selector
  const filteredAndSortedBookmarks = useMemo(() => {
    let result = [...bookmarks];
    
    // 1. Tab Status Filter
    if (activeTab !== 'all') {
      result = result.filter(b => getNormalizedStatus(b.status) === activeTab);
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q));
    }

    // 3. Sort Configuration
    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'year') {
        return (b.year || 0) - (a.year || 0);
      }
      if (sortBy === 'score') {
        return (b.score || 0) - (a.score || 0);
      }
      // default: updatedAt / last updated
      return b.updatedAt - a.updatedAt;
    });

    return result;
  }, [bookmarks, activeTab, searchQuery, sortBy]);

  const statusCounts = useMemo(() => {
    return TABS.reduce<Record<string, number>>((acc, tab) => {
      acc[tab.id] = tab.id === 'all'
        ? bookmarks.length
        : bookmarks.filter(b => getNormalizedStatus(b.status) === tab.id).length;
      return acc;
    }, {});
  }, [bookmarks]);

  const sortLabel =
    sortBy === 'updatedAt' ? 'Last Updated' :
    sortBy === 'title' ? 'Title (A-Z)' :
    sortBy === 'year' ? 'Release Year' : 'Rating Score';

  useEffect(() => {
    const id = 'aw-m3-design-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; 
      tag.textContent = DESIGN_STYLES; 
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div className={`aw-m3-root aw-noise ${selectionMode ? 'selection-mode' : ''}`}>
      
      {/* ── PREMIUM DYNAMIC AMBIENT BACKLIGHT GLOW BLOBS ── */}
      <motion.div 
        animate={{ scale: [1, 1.08, 1], x: [0, 15, 0], y: [0, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="aw-ambient-glow-1 floating-drift hidden md:block" 
      />
      <motion.div 
        animate={{ scale: [1, 1.05, 1], x: [0, -10, 0], y: [0, 15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="aw-ambient-glow-2 floating-drift hidden md:block" 
      />

      <div className="aw-m3-container">
        
        {/* ── 1. HEADER TITLE SECTION ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 mt-2 relative z-20">
          <div>
            <div className="flex items-center gap-3 text-[var(--aw-accent,#8b5cf6)] mb-2.5 font-black tracking-[0.25em] text-[10px] uppercase">
              <Library size={13} className="animate-pulse text-[var(--aw-accent)]" /> Personal Collection
            </div>
            <h1 className="aw-m3-title">My List</h1>
            <p className="text-zinc-400 mt-3 text-xs sm:text-[14px] leading-relaxed font-semibold">
              Total of <span className="text-white font-black">{bookmarks.length}</span> items cataloged. Hold a card to multiselect.
              <span className="hidden lg:inline text-zinc-500"> Drag and drop cards onto chips to categorize instantly.</span>
            </p>
          </div>
        </div>

        {/* ── 2. FILTER TABS & ADVANCED SORTERS SECTION ── */}
        <div className="grid gap-6 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="aw-modern-card-base sticky top-[104px] rounded-[18px] p-2">
              <div className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Library
              </div>
              <div className="flex flex-col gap-1">
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id;
                  const isDragOver = dragOverTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); deselectAll(); }}
                      onDragOver={(e) => { e.preventDefault(); if (tab.id !== activeTab) setDragOverTab(tab.id); }}
                      onDragEnter={(e) => { e.preventDefault(); if (tab.id !== activeTab) setDragOverTab(tab.id); }}
                      onDragLeave={() => setDragOverTab(null)}
                      onDrop={(e) => handleDrop(e, tab.id)}
                      className={`aw-status-drop flex h-11 items-center justify-between rounded-[12px] border px-3 text-left text-[13px] font-bold
                        ${isActive ? 'is-active' : 'border-transparent text-zinc-400'}
                        ${isDragOver ? 'is-drag-over ring-1 ring-[var(--aw-accent)]' : ''}
                      `}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <tab.icon size={15} className={isActive ? 'text-[var(--aw-accent)]' : 'text-zinc-500'} />
                        <span className="truncate">{tab.label}</span>
                      </span>
                      <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10.5px] text-zinc-400">
                        {statusCounts[tab.id] || 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
        <div className="flex flex-col gap-4 mb-8 relative z-20">
          
          {/* Row 1: Spacious, Beautiful Status Segmented Controller (matching Watchpage .modern-card) */}
          <div className="aw-modern-card-base xl:hidden p-1.5 rounded-[18px] overflow-x-auto no-scrollbar w-full select-none shadow-lg border border-white/[0.06] bg-zinc-950/20">
            <div className="flex items-center justify-between gap-1.5 w-full flex-nowrap min-w-max">
              {TABS.map(tab => {
                  const count = statusCounts[tab.id] || 0;
                const isDragOver = dragOverTab === tab.id;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); deselectAll(); }}
                    onDragOver={(e) => { e.preventDefault(); if (tab.id !== activeTab) setDragOverTab(tab.id); }}
                    onDragEnter={(e) => { e.preventDefault(); if (tab.id !== activeTab) setDragOverTab(tab.id); }}
                    onDragLeave={() => setDragOverTab(null)}
                    onDrop={(e) => handleDrop(e, tab.id)}
                    className={`aw-tab-btn relative flex items-center justify-center gap-2 h-[42px] px-5 rounded-xl font-bold text-[13.5px] tracking-normal flex-1 cursor-pointer outline-none focus:outline-none select-none
                      ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'}
                      ${isDragOver ? 'scale-105 bg-white/10 ring-2 ring-[var(--aw-accent,#8b5cf6)]' : ''}
                      ${tab.id === 'watching' ? 'hover:bg-emerald-500/5 hover:border-emerald-500/10' : ''}
                      ${tab.id === 'completed' ? 'hover:bg-purple-500/5 hover:border-purple-500/10' : ''}
                      ${tab.id === 'on_hold' ? 'hover:bg-amber-500/5 hover:border-amber-500/10' : ''}
                      ${tab.id === 'dropped' ? 'hover:bg-red-500/5 hover:border-red-500/10' : ''}
                    `}
                  >
                    <tab.icon size={15} className="aw-tab-icon shrink-0 relative z-10 transition-transform duration-300 hidden sm:block" />
                    <span className="relative z-10">{tab.label}</span>
                    <span className="aw-tab-badge relative z-10 px-2 py-0.5 rounded-md bg-white/[0.06] text-[10.5px] font-bold text-zinc-400 transition-all duration-300">{count}</span>
                    
                    {isActive && (
                      <motion.div
                        layoutId="m3ActiveTabBubbleRefined"
                        className="absolute inset-0 rounded-xl bg-white/[0.07] border border-white/[0.08] shadow-md"
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Search Box (Left, dynamic expand) & Sorter Option Trigger (Right) */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
            
            {/* Elegant Search Capsule using Watchpage .input-glow */}
            <motion.div 
              animate={{ width: isSearchFocused ? '100%' : '100%' }}
              className="aw-modern-card-base aw-search-glow flex items-center shrink-0 w-full md:max-w-md h-[54px] rounded-full px-5 transition-all duration-300 py-0"
            >
              <Search className={`shrink-0 transition-colors duration-300 ${isSearchFocused ? 'text-[var(--aw-accent,#8b5cf6)]' : 'text-zinc-500'}`} size={17} />
              <input
                type="text"
                placeholder="Search catalog titles..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none focus:outline-none text-[13.5px] font-semibold text-white placeholder:text-zinc-500 pl-3 pr-2"
                style={{ fontFamily: 'var(--aw-font-body)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex items-center justify-center h-6 w-6 rounded-full bg-white/[0.08] hover:bg-white/[0.18] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={11} strokeWidth={3} />
                </button>
              )}
            </motion.div>

            {/* Sorter Selector Menu Dropdown Capsule using Watchpage aesthetics */}
            <div className="relative shrink-0 w-full md:w-auto">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="aw-modern-card-base aw-sort-btn-hover flex items-center justify-between gap-3 w-full md:w-auto h-[54px] px-6 rounded-2xl text-[13px] font-bold text-zinc-300 transition-all cursor-pointer select-none py-0"
              >
                <ArrowUpDown size={15} className="text-[var(--aw-accent,#8b5cf6)]" />
                <span>Sort: {sortLabel}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${showSortDropdown ? 'rotate-180 text-white' : ''}`} />
              </button>

              <AnimatePresence>
                {showSortDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 22, stiffness: 380 }}
                      className="aw-material-menu absolute right-0 top-[62px] z-50 w-full md:w-56 rounded-[16px] p-2.5 shadow-2xl flex flex-col gap-1"
                    >
                      {[
                        { id: 'updatedAt', label: 'Last Updated' },
                        { id: 'title', label: 'Title (A-Z)' },
                        { id: 'year', label: 'Release Year' },
                        { id: 'score', label: 'Rating Score' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSortBy(item.id as any);
                            setShowSortDropdown(false);
                          }}
                          className={`aw-menu-row flex items-center justify-between w-full px-4 py-3 rounded-xl text-left text-[13px] font-bold tracking-normal uppercase cursor-pointer
                            ${sortBy === item.id 
                              ? 'text-[var(--aw-accent,#8b5cf6)] bg-white/[0.03]' 
                              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                            }
                          `}
                        >
                          {item.label}
                          {sortBy === item.id && <Check size={14} strokeWidth={2.5} />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Action select header row if in select mode */}
          {selectionMode && (
            <div className="flex items-center justify-between px-2 py-1 select-none">
              <div className="text-xs font-bold text-zinc-400 flex items-center gap-2">
                <CheckSquare size={13} className="text-[var(--aw-accent,#8b5cf6)] animate-pulse" />
                <span>{selectedIds.length} Selected</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={selectAll}
                  className="text-xs font-bold text-[var(--aw-accent,#8b5cf6)] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-600">|</span>
                <button 
                  onClick={deselectAll}
                  className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. TACTILE CARDS COLLECTION GRID ── */}
        <div className="relative z-10">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedBookmarks.length > 0 ? (
              <motion.div 
                layout
                className="aw-library-grid"
              >
                {filteredAndSortedBookmarks.map((entry, index) => (
                  <BookmarkPosterCard
                    key={entry.malId}
                    entry={entry}
                    navigate={navigate}
                    index={index}
                    isSelected={selectedIds.includes(entry.malId)}
                    selectionMode={selectionMode}
                    onToggleSelect={toggleSelect}
                    onLongPress={handleLongPress}
                    onQuickMove={handleQuickMove}
                    onQuickDelete={triggerQuickDelete}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    isDragging={isDragActive && selectedIds.includes(entry.malId)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-40 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center mb-5 shadow-inner">
                  <Library size={24} className="text-zinc-600" />
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold mb-1 tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>No Titles Found</h3>
                <p className="text-xs sm:text-sm text-zinc-500 max-w-[340px] leading-relaxed mx-auto">
                  {bookmarks.length === 0 
                    ? 'Your tracking list is currently empty. Explore the discover feed to populate your catalog!' 
                    : 'No tracking titles match your active filter preferences.'
                  }
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 4. DESKTOP DRAG DELAY GHOST STACK ── */}
        </div>
      </div>

      <div
        ref={ghostRef}
        className="pointer-events-none fixed z-[99999] opacity-0"
        style={{
          transform: 'translate(-1000px, -1000px)',
          transition: 'transform 0.05s linear'
        }}
      >
        <div className="relative w-24 h-36">
          {bookmarks.filter(b => selectedIds.includes(b.malId)).slice(0, 3).map((item, idx) => (
            <img
              key={item.malId}
              src={item.cover}
              className="absolute inset-0 w-full h-full object-cover rounded-[14px] shadow-2xl border border-white/20"
              style={{
                transform: `rotate(${idx * 7 - 7}deg) translate(${idx * 5}px, ${idx * 5}px)`,
                zIndex: 3 - idx
              }}
            />
          ))}
          {selectedIds.length > 3 && (
            <div className="absolute -top-3 -right-3 z-10 bg-[var(--aw-accent,#8b5cf6)] text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-lg">
              +{selectedIds.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* ── 5. PREMIUM FLOATING BULK ACTIONS CAPSULE ACTION DOCK ── */}
      <AnimatePresence>
        {selectionMode && !isDragActive && (
          <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 100, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 220 }}
            className="fixed bottom-6 left-1/2 z-[200] max-w-[95%] w-[580px] bg-zinc-950/90 border border-white/10 rounded-full px-5 py-3.5 flex items-center justify-between shadow-[0_24px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            <div className="flex items-center gap-2.5 pl-2">
              <span className="h-5 px-2.5 rounded-full bg-[var(--aw-accent,#8b5cf6)] text-black text-[11.5px] font-extrabold flex items-center justify-center">
                {selectedIds.length}
              </span>
              <span className="text-[12px] font-bold text-zinc-300 hidden sm:inline">
                Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-1 max-w-[320px] overflow-x-auto no-scrollbar">
                {TABS.filter(t => t.id !== 'all').map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleBulkStatusChange(t.id)}
                    className="flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-full text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer whitespace-nowrap uppercase"
                    title={`Move to ${t.label}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full status-badge-${t.id}`} />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="h-5 w-px bg-white/10 mx-1.5" />

              <button
                onClick={() => triggerQuickDelete(0)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/15 hover:bg-red-500/35 text-red-300 hover:text-white transition-colors cursor-pointer border border-red-500/25"
                title="Remove selected items"
              >
                <Trash2 size={15} />
              </button>

              <button
                onClick={deselectAll}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/5"
                title="Deselect All"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 6. DRAG-TO-DELETE BOTTOM DRAWER AREA (DESKTOP ONLY) ── */}
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragOverTab('trash'); }}
        onDragOver={(e) => { e.preventDefault(); setDragOverTab('trash'); }}
        onDragLeave={() => setDragOverTab(null)}
        onDrop={(e) => handleDrop(e, 'trash')}
        className={`hidden md:flex fixed bottom-0 left-0 right-0 h-48 z-[200] items-end justify-center transition-all duration-300 pointer-events-none
          ${isDragActive ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        `}
      >
        <div className={`relative w-full max-w-2xl h-28 rounded-t-[40px] border-t border-x flex flex-col items-center justify-center transition-all duration-500 pointer-events-auto
          ${dragOverTab === 'trash' ? 'trash-zone-active scale-[1.02] origin-bottom' : 'bg-black/95 border-white/10 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl'}
        `}>
          <div className="absolute inset-0 bg-radial-gradient-trash opacity-20 pointer-events-none" />
          <Trash2 
            size={32} 
            className={`mb-1.5 z-10 transition-all duration-300 ${dragOverTab === 'trash' ? 'scale-110 text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'text-zinc-500'}`} 
          />
          <span className="z-10 font-black tracking-[0.25em] uppercase text-xs transition-colors duration-300" style={{ fontFamily: 'var(--aw-font-display)', color: dragOverTab === 'trash' ? '#fee2e2' : '#71717a' }}>
            Drop Here to Delete From Library
          </span>
        </div>
      </div>

      {/* ── 7. CUSTOM MATERIAL DESIGN 3 CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
              onClick={() => { setShowDeleteConfirmModal(false); setItemToDeleteDirect(null); }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 240 }}
              className="aw-modern-card-base relative z-10 w-full max-w-md rounded-[32px] p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_35px_70px_rgba(0,0,0,0.8)] border border-white/[0.08]"
              style={{ fontFamily: 'var(--aw-font-body)' }}
            >
              <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-6 animate-pulse">
                <AlertTriangle size={28} />
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold tracking-wide text-white mb-2" style={{ fontFamily: 'var(--aw-font-display)' }}>
                Remove From Collection?
              </h2>

              <p className="text-sm text-zinc-400 leading-relaxed mb-8">
                {itemToDeleteDirect 
                  ? 'Are you sure you want to remove this title from your collection? This action will clear your tracking status and history.'
                  : `Are you sure you want to remove the ${selectedIds.length} selected titles from your collection? This action cannot be undone.`
                }
              </p>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => { setShowDeleteConfirmModal(false); setItemToDeleteDirect(null); }}
                  className="flex-1 h-[48px] rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.08] text-[13px] font-bold uppercase text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteDelete}
                  className="flex-1 h-[48px] rounded-full bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BookmarksPage;
/* --- END OF FILE BookmarksPage.tsx --- */
