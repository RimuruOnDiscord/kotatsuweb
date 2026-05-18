/* --- START OF FILE AnimeDetailV2.tsx --- */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, ChevronLeft, Star, Loader2, Plus, Minus, Languages, Activity, Check,
  Info, ArrowDownUp, Youtube, Clock, Users, ExternalLink, TrendingUp, Heart,
  Calendar, Library, Play, Bell, ChevronDown, Building2, X, Clapperboard,
  CheckCircle2, CalendarDays, CalendarCheck, Sparkles, Maximize2, Share2, Trash2, Pencil
} from 'lucide-react';

import { readBookmarks, writeBookmarks, removeBookmark, isFollowed, toggleFollow, type BookmarkEntry } from '../utils/bookmarks';
import {
  AnimeWatchProviderPayload,
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  fetchAnimeInfo,
  getProviderEpisodes,
} from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

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

  /* CSS Animation for Lists */
  @keyframes fadeUpIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-up {
    animation: fadeUpIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    opacity: 0;
  }

  .aw-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .aw-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .aw-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  .aw-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

  .hover-lift {
    transition:
      border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.18s ease,
      color 0.18s ease,
      transform 0.1s ease;
  }
  .hover-lift:hover {
    border-color: rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 20%, transparent);
  }
  .hover-lift:active {
    transform: scale(0.97);
    transition-duration: 0.1s;
  }

  .press-squish {
    transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .press-squish:active {
    transform: scale(0.95);
  }

  /* Media Card Hover Styles — stationary glow */
  .aw-media-card {
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: center;
    will-change: transform;
  }
  .aw-media-card:hover {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    box-shadow: 0 0 20px -6px color-mix(in srgb, var(--aw-accent) 18%, transparent);
  }
  .aw-media-card:active {
    transform: scale(0.97);
    transition: all 0.1s ease;
  }

  .aw-btn-primary,
  .aw-btn-ghost,
  .bookmark-btn {
    transform-origin: center;
    position: relative;
    z-index: 1;
    transition:
      border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.18s ease,
      color 0.18s ease,
      transform 0.1s ease;
  }
  .aw-btn-primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 0 20px -4px color-mix(in srgb, var(--aw-accent) 40%, transparent);
    z-index: 10;
  }
  .aw-btn-primary svg,
  .aw-btn-ghost svg,
  .bookmark-btn svg {
    transition: color 0.18s ease;
  }
  .aw-btn-ghost:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 88%) !important;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 45%) !important;
    color: var(--aw-accent) !important;
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 30%, transparent);
    z-index: 10;
  }
  .subscribe-btn {
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .subscribe-btn.subscribed {
    border-color: var(--aw-accent);
    color: var(--aw-accent);
  }
  .subscribe-btn.subscribed:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 88%);
  }
  @keyframes subscribe-pulse {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--aw-accent), transparent 50%); }
    70% { box-shadow: 0 0 0 8px transparent; }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .subscribe-btn.just-subscribed {
    animation: subscribe-pulse 0.6s ease-out;
  }
  .bookmark-btn:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 88%) !important;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 45%) !important;
    color: var(--aw-accent) !important;
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 30%, transparent);
  }

  /* Episode Control Button Styles — Stationary Glass Glow */
  .aw-control-btn {
    transition: 
      background 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.18s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.18s ease,
      color 0.18s ease,
      transform 0.1s ease;
    transform-origin: center;
    position: relative;
    overflow: hidden;
    will-change: transform;
  }
  .aw-control-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--aw-accent), transparent 92%) !important;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 55%) !important;
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 25%, transparent);
    color: white !important;
  }
  .aw-control-btn:hover svg {
    color: var(--aw-accent);
  }
  .aw-control-btn:active:not(:disabled) {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }
  .aw-control-btn.is-active {
    background: color-mix(in srgb, var(--aw-accent), transparent 85%) !important;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 55%) !important;
    color: var(--aw-accent) !important;
    box-shadow: 0 0 14px -4px color-mix(in srgb, var(--aw-accent) 40%, transparent);
  }
  .aw-control-btn.is-active:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 78%) !important;
    box-shadow: 0 0 20px -4px color-mix(in srgb, var(--aw-accent) 50%, transparent);
  }
  .aw-control-btn svg {
    transition: color 0.18s ease;
  }

  /* Episode card — stationary left-bar reveal */
  .episode-card {
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    transform-origin: left center;
    position: relative;
  }
  .episode-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    bottom: 50%;
    width: 3px;
    border-radius: 2px;
    background: var(--aw-accent);
    opacity: 0;
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .episode-card:hover::before {
    top: 12px;
    bottom: 12px;
    opacity: 0.5;
  }
  .episode-card:hover {
    background: rgba(255, 255, 255, 0.03) !important;
    border-color: rgba(255, 255, 255, 0.08) !important;
  }
  .episode-card:active {
    transform: scale(0.99);
    transition-duration: 0.1s;
  }
  .episode-card .ep-number,
  .episode-card .ep-thumb {
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .episode-card:hover .ep-number {
    color: var(--aw-accent);
  }
  .episode-card:hover .ep-thumb {
    opacity: 1;
  }

  .aw-title-facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.25rem;
  }
  @media (min-width: 768px) {
    .aw-title-facts { justify-content: flex-start; }
  }
  .aw-fact-chip {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    border: 1px solid color-mix(in srgb, var(--aw-border), transparent 12%);
    background: color-mix(in srgb, var(--aw-s1), transparent 34%);
    color: rgba(255,255,255,0.82);
    border-radius: 999px;
    padding: 0 0.78rem;
    font-family: var(--aw-font-display);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    backdrop-filter: blur(14px);
    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  }
  button.aw-fact-chip {
    cursor: pointer;
  }
  .aw-fact-chip:hover {
    color: white;
    border-color: color-mix(in srgb, var(--aw-accent), transparent 45%);
    background: color-mix(in srgb, var(--aw-accent), transparent 88%);
    box-shadow: 0 0 12px -3px color-mix(in srgb, var(--aw-accent) 20%, transparent);
  }
  .aw-fact-chip:active {
    transform: scale(0.96);
  }
  .aw-fact-chip svg {
    color: var(--aw-accent);
    transition: color 0.18s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-fact-chip:hover svg {
    transform: scale(1.16) rotate(-6deg);
  }

  .trailer-modal-backdrop {
    position: fixed !important;
    inset: 0;
    z-index: 9999 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1rem, 4vw, 2.5rem);
    background: rgba(0, 0, 0, 0.62);
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
  }
  .trailer-modal-content {
    position: relative;
    width: 100%;
    max-width: min(1040px, calc(100vw - 2rem));
    max-height: min(86dvh, 760px);
    display: flex;
    flex-direction: column;
    border-radius: 24px;
    overflow: hidden;
  }
  .trailer-video-wrapper {
    position: relative;
    aspect-ratio: 16 / 9;
    width: calc(100% - 20px);
    margin: 10px;
    min-height: 0;
    overflow: hidden;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: #020204;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.05),
      0 22px 55px -32px rgba(0,0,0,0.95);
  }
  .trailer-video-wrapper iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .trailer-header {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.125rem 0.95rem 1.25rem;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background: rgb(12, 12, 16) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  .trailer-header-title {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .trailer-header-kicker {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    width: max-content;
    max-width: 100%;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--aw-accent), transparent 68%);
    background: color-mix(in srgb, var(--aw-accent), transparent 90%);
    padding: 0.32rem 0.62rem;
    color: var(--aw-accent);
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
  }
  .trailer-close-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.045);
    backdrop-filter: blur(16px) saturate(140%);
    -webkit-backdrop-filter: blur(16px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.09);
    color: white;
    transition: all 0.2s ease;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .trailer-close-btn:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.18);
    color: white;
    transform: scale(1.1);
  }
  @media (max-width: 640px) {
    .trailer-modal-backdrop {
      align-items: center;
      padding: 0.75rem;
    }
    .trailer-modal-content {
      max-width: calc(100vw - 1.5rem);
      border-radius: 20px;
    }
    .trailer-header {
      padding: 0.85rem 0.9rem 0.8rem 1rem;
    }
    .trailer-close-btn {
      width: 36px;
      height: 36px;
    }
    .trailer-video-wrapper {
      width: calc(100% - 14px);
      margin: 7px;
      border-radius: 14px;
    }
  }

  /* ── Mobile Hero (Crunchyroll-style) ────────────── */
  .mobile-hero-banner {
    position: relative;
    width: 100%;
    overflow: hidden;
    background: var(--aw-s1);
  }
  .mobile-hero-banner img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .mobile-hero-banner::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, transparent 30%, transparent 52%, var(--aw-bg) 100%),
      linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 60%);
    pointer-events: none;
    z-index: 1;
  }

  .mobile-cover-overlap {
    display: flex;
    align-items: flex-end;
    gap: 14px;
    padding: 0 16px;
    margin-top: -60px;
    position: relative;
    z-index: 10;
  }
  .mobile-cover-poster {
    width: 108px;
    height: 154px;
    flex-shrink: 0;
    border-radius: 14px;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.12);
    box-shadow: 0 12px 40px -8px rgba(0,0,0,0.75);
    background: var(--aw-s1);
    cursor: pointer;
  }
  .mobile-cover-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s ease;
  }
  .mobile-cover-poster:active img { transform: scale(0.96); }

  .mobile-title-beside {
    flex: 1;
    min-width: 0;
    padding-bottom: 6px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .mobile-rating-row {
    padding: 0 16px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mobile-stars { display: flex; align-items: center; gap: 2px; }

  .mobile-action-row {
    padding: 0 16px;
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 36px;
  }
  .mobile-action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    color: rgba(255,255,255,0.75);
    transition: color 0.2s ease, transform 0.2s ease;
  }
  .mobile-action-btn:active { transform: scale(0.9); }
  .mobile-action-btn span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-family: var(--aw-font-display);
  }
  .mobile-action-btn.active { color: var(--aw-accent); }

  .mobile-synopsis {
    padding: 0 16px;
    margin-top: 18px;
    font-size: 13.5px;
    line-height: 1.75;
    color: rgba(255,255,255,0.68);
    font-family: var(--aw-font-body);
  }
  .mobile-more-details {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--aw-accent);
    font-family: var(--aw-font-display);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .mobile-tabs-bar {
    display: flex;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin: 20px 0 0;
  }
  .mobile-tab {
    flex: 1;
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    color: rgba(255,255,255,0.4);
    font-family: var(--aw-font-display);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-bottom: 2px solid transparent;
    transition: color 0.2s ease, border-color 0.2s ease;
    margin-bottom: -1px;
  }
  .mobile-tab.active {
    color: var(--aw-accent);
    border-bottom-color: var(--aw-accent);
  }
`;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.03, staggerDirection: -1 as const } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' },
  visible: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring' as const, stiffness: 350, damping: 25 } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } }
};

const bookmarkModalFieldVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, damping: 22, stiffness: 260 } },
  exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.12 } }
};

const bookmarkModalFormVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.025, staggerDirection: -1 as const } }
};

const bookmarkStatusOptions = [
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'uncategorized', label: 'Plan to Watch' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const parseBookmarkDate = (value?: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toBookmarkDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatBookmarkDate = (value?: string) => {
  const date = parseBookmarkDate(value);
  if (!date) return 'mm/dd/yyyy';
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
};

const getBookmarkCalendarCells = (visibleMonth: Date) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

interface BookmarkDateFieldProps {
  value: string;
  isOpen: boolean;
  visibleMonth: Date;
  onChange: (value: string) => void;
  onToggle: () => void;
  onClose: () => void;
  setVisibleMonth: (date: Date) => void;
}

const BookmarkDateField: React.FC<BookmarkDateFieldProps> = ({
  value,
  isOpen,
  visibleMonth,
  onChange,
  onToggle,
  onClose,
  setVisibleMonth,
}) => {
  const selectedDate = parseBookmarkDate(value);
  const todayValue = toBookmarkDateValue(new Date());
  const monthLabel = visibleMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const openCalendar = () => {
    setVisibleMonth(selectedDate || new Date());
    onToggle();
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={openCalendar}
        className="aw-material-control flex h-11 w-full items-center justify-between rounded-[14px] px-3.5 text-left outline-none"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className={`text-sm font-black ${selectedDate ? 'text-white' : 'text-white/90'}`}>
          {formatBookmarkDate(value)}
        </span>
        <span className="flex items-center justify-center text-zinc-400">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isOpen ? 'calendar-open' : 'calendar-closed'}
              initial={{ opacity: 0, scale: 0.75, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.75, rotate: 12 }}
              transition={{ duration: 0.14 }}
              className="flex"
            >
              {isOpen ? <CalendarCheck size={15} strokeWidth={2.2} /> : <CalendarDays size={15} strokeWidth={2.2} />}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="aw-material-menu absolute left-0 top-[calc(100%+8px)] z-[90] w-[234px] rounded-[16px] p-2.5"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white">
                <ChevronLeft size={14} />
              </button>
              <div className="text-[12px] font-semibold text-zinc-100">
                {monthLabel}
              </div>
              <button type="button" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-[9px] text-zinc-400 transition-colors hover:bg-white/[0.07] hover:text-white">
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="py-1 text-[9px] font-bold uppercase text-zinc-500">{day}</div>
              ))}
              {getBookmarkCalendarCells(visibleMonth).map((date) => {
                const dateValue = toBookmarkDateValue(date);
                const active = value === dateValue;
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isToday = dateValue === todayValue;
                return (
                  <motion.button
                    key={dateValue}
                    type="button"
                    onClick={() => {
                      onChange(dateValue);
                      onClose();
                    }}
                    whileHover={{ scale: 1.06, backgroundColor: active ? 'var(--aw-accent)' : 'rgba(255,255,255,0.08)' }}
                    whileTap={{ scale: 0.94 }}
                    className={`flex h-7 items-center justify-center rounded-[8px] text-[11px] font-semibold transition-colors ${active ? 'text-black' : isCurrentMonth ? 'text-white' : 'text-zinc-600'}`}
                    style={{
                      background: active ? 'var(--aw-accent)' : isToday ? 'color-mix(in srgb, var(--aw-accent) 13%, transparent)' : 'transparent',
                      border: isToday && !active ? '1px solid color-mix(in srgb, var(--aw-accent) 28%, transparent)' : '1px solid transparent',
                    }}
                  >
                    {date.getDate()}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
              <button type="button" onClick={() => { onChange(''); onClose(); }} className="rounded-[9px] px-2.5 py-1.5 text-[10px] font-bold text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
                Clear
              </button>
              <button type="button" onClick={() => { onChange(todayValue); setVisibleMonth(new Date()); onClose(); }} className="rounded-[9px] px-2.5 py-1.5 text-[10px] font-bold text-[var(--aw-accent)] transition-colors hover:bg-[var(--app-accent-muted)]">
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────
// MEDIA CARD COMPONENT
// ─────────────────────────────────────────
interface MediaCardProps {
  title: string;
  image: string;
  type?: string;
  episodes?: number | string;
  score?: number | string;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ title, image, type, episodes, score, onClick }) => {
  return (
    <div
      className="aw-media-card group relative flex flex-col w-[160px] sm:w-[175px] md:w-[190px] lg:w-[200px] flex-shrink-0 cursor-pointer select-none rounded-[16px] p-2 bg-white/[0.01] border border-white/[0.03] shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-white/[0.03] hover:border-white/[0.05] hover:shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[12px] bg-[var(--aw-s2)] border border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-all duration-300 group-hover:scale-[1.05] pointer-events-none"
          onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/200x300/181818/3f3f46?text=?'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent pointer-events-none opacity-80" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--aw-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      </div>

      <div className="pt-3 px-1 flex flex-col gap-2">
        <h3 className="line-clamp-1 text-[13px] font-bold leading-tight text-white/90 group-hover:text-[var(--aw-accent)] transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {title}
        </h3>

        {/* Metadata Pills */}
        <div className="flex flex-wrap items-center gap-[5px] transition-all duration-150 opacity-80 group-hover:opacity-100">
          {!!type && (
            <span className="rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold text-[#b5b5bd] leading-none tracking-wide group-hover:text-white transition-colors">
              {type}
            </span>
          )}
          {!!episodes && (
            <span className="rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold text-[#b5b5bd] leading-none tracking-wide group-hover:text-white transition-colors">
              {episodes} {String(episodes).includes('EP') ? '' : 'EPS'}
            </span>
          )}
          {!!score && (
            <div className="flex items-center gap-1 rounded bg-[#202022] px-[5px] py-[3px] text-[10px] font-bold text-[#b5b5bd] leading-none group-hover:text-white transition-colors">
              <Star size={10} strokeWidth={2.5} />
              <span>{typeof score === 'number' ? score.toFixed(1) : score}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// CAROUSEL COMPONENT
// ─────────────────────────────────────────
interface CarouselProps {
  title?: string;
  children: React.ReactNode;
  onTitleClick?: () => void;
  onPageChange?: (page: number) => void;
}

const Carousel: React.FC<CarouselProps> = ({ title, children, onPageChange, onTitleClick }) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scrollDir, setScrollDir] = useState<'left' | 'right'>('right');

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick();
      return;
    }
    navigate('/browse');
  };

  const scroll = (direction: 'left' | 'right') => {
    setScrollDir(direction);
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (clientWidth === 0) return;

      const total = Math.max(1, Math.ceil(scrollWidth / clientWidth));
      const isAtEnd = scrollWidth - clientWidth - scrollLeft <= 5;

      let current = Math.round(scrollLeft / clientWidth) + 1;
      if (isAtEnd) {
        current = total;
      }

      current = Math.min(total, Math.max(1, current));

      setCurrentPage(current);
      setTotalPages(total);
      onPageChange?.(current);
    }
  }, [onPageChange]);

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [handleScroll, children]);

  useEffect(() => {
    const timer = setTimeout(handleScroll, 150);
    return () => clearTimeout(timer);
  }, [handleScroll, children]);

  return (
    <div className="flex flex-col w-full relative">
      {title && (
        <div className="flex w-full items-end justify-between mb-2 mt-2 px-1">
          <button
            type="button"
            onClick={handleTitleClick}
            className="group text-left focus-visible:outline-none cursor-pointer"
            aria-label={onTitleClick ? `Open ${title}` : `Browse from ${title}`}
            title="Click to view more"
          >
            <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-white transition-colors group-hover:text-[var(--aw-accent)] inline-flex items-center gap-2" style={{ fontFamily: 'var(--aw-font-display)' }}>
              {title}
              <ChevronRight size={20} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[var(--aw-accent)]" />
            </h2>
          </button>

          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              className="flex items-center gap-0.5 rounded-[14px] border border-white/[0.06] bg-[var(--aw-s2)]/80 backdrop-blur-sm p-1"
            >
              <motion.button
                onClick={() => scroll('left')}
                disabled={currentPage <= 1}
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-7 w-7 items-center justify-center rounded-[10px] text-zinc-500 hover:bg-[color-mix(in_srgb,var(--aw-accent)_12%,transparent)] hover:text-[var(--aw-accent)] disabled:opacity-20 disabled:pointer-events-none"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </motion.button>

              <div
                className="flex items-center gap-[3px] px-1.5 select-none pointer-events-none"
                style={{ fontFamily: 'var(--aw-font-body)' }}
              >
                <div className="relative h-[16px] w-4 overflow-hidden flex items-center justify-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={currentPage}
                      initial={{ y: scrollDir === 'right' ? 14 : -14, opacity: 0, filter: 'blur(4px)' }}
                      animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ y: scrollDir === 'right' ? -14 : 14, opacity: 0, filter: 'blur(4px)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      className="absolute text-[12px] font-bold tabular-nums leading-none text-white/90"
                    >
                      {currentPage}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <span className="text-[12px] font-medium leading-none text-zinc-600">/</span>
                <span className="text-[12px] font-medium tabular-nums leading-none text-zinc-500">
                  {totalPages}
                </span>
              </div>

              <motion.button
                onClick={() => scroll('right')}
                disabled={currentPage >= totalPages}
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex h-7 w-7 items-center justify-center rounded-[10px] text-zinc-500 hover:bg-[color-mix(in_srgb,var(--aw-accent)_12%,transparent)] hover:text-[var(--aw-accent)] disabled:opacity-20 disabled:pointer-events-none"
                aria-label="Next page"
              >
                <ChevronRight size={14} strokeWidth={2.5} />
              </motion.button>
            </motion.div>
          )}
        </div>
      )}

      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex items-start gap-3 overflow-x-auto overflow-y-visible py-2 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`
            .flex::-webkit-scrollbar { display: none; }
          `}</style>
          {children}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────
// HELPER COMPONENTS & UTILS
// ─────────────────────────────────────────
const NextAiringTimer: React.FC<{ airingAt: number; episode: number; compact?: boolean }> = ({ airingAt, episode, compact }) => {
  const [timeLeft, setTimeLeft] = useState(airingAt * 1000 - Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(airingAt * 1000 - Date.now()), 60000);
    return () => clearInterval(interval);
  }, [airingAt]);

  if (!airingAt || timeLeft <= 0) return <span>Airing Now / Aired</span>;

  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);

  let timeString = '';
  if (d > 0) timeString = `${d}d ${h}h`;
  else if (h > 0) timeString = `${h}h ${m}m`;
  else timeString = `${m}m`;

  return <span>{compact ? `Ep ${episode}: ` : `Episode ${episode} in `}{timeString}</span>;
};

export const createSlug = (title: string) => (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
const normalizeTitle = (t: string) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const getEpisodeHref = (animeSlugOrId: string | number, provider: string, category: 'sub' | 'dub', episodeId: string) => `/watch/${animeSlugOrId}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(episodeId.split('/').pop() || episodeId)}`;

const formatNumber = (num?: number) => {
  if (!num) return '?';
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num);
};

interface ContinueWatchingData {
  animeId: string; episodeId: string; animeTitle: string; animeCover?: string;
  episodeTitle: string; episodeNumber: number; href: string; updatedAt: number;
}

interface BookmarkFormState {
  status: string;
  score: string;
  episodeProgress: string;
  startDate: string;
  finishDate: string;
  totalRewatches: string;
  notes: string;
}

const emptyBookmarkForm = (): BookmarkFormState => ({
  status: 'watching',
  score: '0',
  episodeProgress: '0',
  startDate: new Date().toISOString().slice(0, 10),
  finishDate: '',
  totalRewatches: '0',
  notes: '',
});

const getNormalizedTrackingStatus = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (['watching', 'completed', 'on_hold', 'dropped', 'uncategorized'].includes(normalized)) return normalized;
  return 'watching';
};

const TRACKING_META_STORAGE_KEY = 'kotatsu:anime-tracking-meta';

const readTrackingMeta = (id?: string | null) => {
  if (!id || typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRACKING_META_STORAGE_KEY) || '{}');
    return parsed?.[id] || null;
  } catch {
    return null;
  }
};

const writeTrackingMeta = (id: string, value: Partial<BookmarkEntry>) => {
  if (typeof window === 'undefined') return;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRACKING_META_STORAGE_KEY) || '{}');
    parsed[id] = value;
    window.localStorage.setItem(TRACKING_META_STORAGE_KEY, JSON.stringify(parsed));
  } catch { }
};

const removeTrackingMeta = (id?: string | null) => {
  if (!id || typeof window === 'undefined') return;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TRACKING_META_STORAGE_KEY) || '{}');
    delete parsed[id];
    window.localStorage.setItem(TRACKING_META_STORAGE_KEY, JSON.stringify(parsed));
  } catch { }
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const AnimeDetailV2: React.FC = () => {
  const { user } = useAuth();
  const { animeId: urlSlug } = useParams<{ animeId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any | null>(null);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');

  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const [bookmarked, setBookmarked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [savedBookmarkId, setSavedBookmarkId] = useState<string | null>(null);
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [isBookmarkStatusMenuOpen, setIsBookmarkStatusMenuOpen] = useState(false);
  const [bookmarkDateMenu, setBookmarkDateMenu] = useState<'start' | 'finish' | null>(null);
  const [bookmarkCalendarMonth, setBookmarkCalendarMonth] = useState(() => new Date());
  const [bookmarkUpdateTargets, setBookmarkUpdateTargets] = useState({
    anikage: true,
    anilist: true,
    myanimelist: false,
  });
  const [bookmarkForm, setBookmarkForm] = useState<BookmarkFormState>(() => emptyBookmarkForm());
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const isSyncingBookmark = React.useRef(false);

  const [watchProgress, setWatchProgress] = useState<ContinueWatchingData | null>(null);
  const [episodeSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const [topStatsCollapsed, setTopStatsCollapsed] = useState(false);
  const [reviewsCollapsed, setReviewsCollapsed] = useState(false);
  const [streamingCollapsed, setStreamingCollapsed] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [navTabs, setNavTabs] = useState<any[]>([]);
  const [animeLogo, setAnimeLogo] = useState<string | null>(null);

  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'episodes' | 'similar'>('episodes');
  const activeTab = navTabs.find(tab => tab.active) || navTabs[0];

  const resolvedSlug = useMemo(() => {
    if (urlSlug && Number.isNaN(Number(urlSlug))) return urlSlug;
    if (data) return createSlug(data.title?.english || data.title?.romaji || data.title?.native || '');
    return '';
  }, [urlSlug, data]);

  const streamingLinks = useMemo(() => data?.externalLinks?.filter((link: any) => link.type === 'STREAMING') || [], [data]);

  // Build Related Seasons Tabs
  useEffect(() => {
    let isMounted = true;
    const buildSeasons = async () => {
      if (!data) return;
      const allowedRelations = ['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'];
      const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
      const currentTitle = data.title?.english || data.title?.romaji || data.title?.native || '?';
      const seenIds = new Set<number>([data.id]);
      const tabs: any[] = [{
        id: data.id,
        title: currentTitle,
        format: data.format,
        active: true,
        slug: resolvedSlug,
        displayLabel: data.parsedSeason?.isParsed ? data.parsedSeason.parsedString : ''
      }];

      let queue = [data]; let depth = 0; const MAX_DEPTH = 6; const MAX_TOTAL = 15;

      while (queue.length > 0 && depth < MAX_DEPTH && tabs.length < MAX_TOTAL) {
        const nextQueue: any[] = []; const idsToFetch: number[] = [];
        queue.forEach(item => {
          const relations = Array.isArray(item.relations) ? item.relations : item.relations?.edges?.map((e: any) => ({ ...e.node, relationType: e.relationType })) || [];
          relations.forEach((rel: any) => {
            if (rel?.type === 'ANIME' && allowedRelations.includes(rel.relationType) && !excludedFormats.includes(rel.format) && !seenIds.has(rel.id)) {
              idsToFetch.push(rel.id); seenIds.add(rel.id);
            }
          });
        });

        if (idsToFetch.length === 0) break;
        const results = await Promise.allSettled(idsToFetch.slice(0, 5).map(id => fetchAnimeInfo(id)));
        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            tabs.push({
              id: res.value.id,
              title: res.value.title?.english || res.value.title?.romaji || res.value.title?.native || '',
              format: res.value.format,
              active: false,
              slug: String(res.value.id),
              displayLabel: res.value.parsedSeason?.isParsed ? res.value.parsedSeason.parsedString : ''
            });
            nextQueue.push(res.value);
          }
        });
        queue = nextQueue; depth++;
      }

      if (!isMounted) return;
      tabs.sort((a, b) => a.id - b.id);
      tabs.forEach((tab, idx) => {
        if (!tab.displayLabel) tab.displayLabel = `Season ${idx + 1}`;
      });
      setNavTabs(tabs);
    };
    buildSeasons();
    return () => { isMounted = false; };
  }, [data, resolvedSlug]);

  useEffect(() => {
    const id = 'aw-design-styles-anime-detail-v2';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style'); tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
  }, []);

  // Sync Watch Progress
  useEffect(() => {
    if (!data && !urlSlug) return;
    const syncProgress = async () => {
      try {
        if (user) {
          const { data: dbData, error } = await supabase.from('anime_watch_history').select('*').eq('user_id', user.id).or(`anime_id.eq.${data?.idMal || 0},anime_id.eq.${data?.id || 0},anime_id.eq.${urlSlug}`);
          if (!error && dbData && dbData.length > 0) {
            const match = dbData[0];
            setWatchProgress({ animeId: match.anime_id, episodeId: match.episode_id, animeTitle: match.anime_title, animeCover: match.anime_cover, episodeTitle: match.episode_title, episodeNumber: match.episode_number, href: match.href, updatedAt: new Date(match.updated_at).getTime() });
            return;
          }
        }
        const raw = window.localStorage.getItem('anime-continue-watching');
        if (raw) {
          const entries = JSON.parse(raw);
          const match = (Array.isArray(entries) ? entries : []).find((e: any) => String(e.animeId) === String(data?.idMal) || String(e.animeId) === String(data?.id) || String(e.animeId) === String(urlSlug) || (data?.title?.romaji && e.animeTitle === data.title?.romaji));
          setWatchProgress(match || null);
        }
      } catch (e) { }
    };
    syncProgress();
    window.addEventListener('storage', syncProgress); window.addEventListener('focus', syncProgress);
    return () => { window.removeEventListener('storage', syncProgress); window.removeEventListener('focus', syncProgress); };
  }, [data, urlSlug, user]);

  // Main Fetch Logic
  useEffect(() => {
    const fetchAll = async () => {
      if (!urlSlug) return;
      try {
        setLoading(true); setLoadFailed(false); setData(null); setEpisodesData({});
        let fetchId = Number(urlSlug);
        if (isNaN(fetchId)) {
          const searchRes = await fetchAnimeSearch(urlSlug, 1);
          if (searchRes?.results?.length) fetchId = searchRes.results[0].id;
          else throw new Error("Anime not found in database.");
        }

        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(fetchId),
          fetchAnimeEpisodes(fetchId).catch(() => null)
        ]);

        if (!info) throw new Error('API returned no info data');

        setData(info);
        if (info.title) document.title = info.title.english || info.title.romaji || info.title.native || 'Anime Details';

        const providersMap = epsPayload?.providers || {};
        setEpisodesData(providersMap);

        const availableKeys = Object.keys(providersMap);

        // Auto-select Provider
        if (availableKeys.length > 0) {
          const lowerKeys = availableKeys.map(k => k.toLowerCase());
          const prefOrder = ['kiwi', 'bee', 'ally'];
          let bestProvider = '';

          for (const pref of prefOrder) {
            const matchIndex = lowerKeys.findIndex(k => k.includes(pref));
            if (matchIndex !== -1) {
              bestProvider = availableKeys[matchIndex];
              break;
            }
          }

          if (!bestProvider) {
            let maxEps = 0;
            bestProvider = availableKeys[0];
            for (const key of availableKeys) {
              const count = (providersMap[key]?.episodes?.sub?.length || 0) + (providersMap[key]?.episodes?.dub?.length || 0);
              if (count > maxEps) { maxEps = count; bestProvider = key; }
            }
          }

          setProvider(bestProvider);
          setCategory((providersMap[bestProvider]?.episodes?.sub?.length || 0) > 0 ? 'sub' : 'dub');
        }

        if (info.id) {
          setLoadingReviews(true);
          try {
            const query = `query ($id: Int) { 
              Media (id: $id) { 
                reviews (limit: 5, sort: [ID_DESC]) { nodes { id summary rating siteUrl user { name avatar { medium } } } }
                recommendations (sort: RATING_DESC, page: 1, perPage: 12) { nodes { rating mediaRecommendation { id title { romaji english native } coverImage { large extraLarge } format averageScore episodes } } }
              } 
            }`;
            const extraRes = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { id: info.id } }) });
            const extraJson = await extraRes.json();
            setReviews(extraJson.data?.Media?.reviews?.nodes || []);
            setRecommendations(extraJson.data?.Media?.recommendations?.nodes || []);
          } catch (err) { } finally { setLoadingReviews(false); }

          // Fetch clearlogo via AniZip (preferred) + TVDB (fallback)
          fetch(`https://api.ani.zip/mappings?anilist_id=${info.id}`)
            .then(res => { if (res.ok) return res.json(); throw new Error(); })
            .then(async (mappingData) => {
              let logoUrl = '';

              if (mappingData.images && Array.isArray(mappingData.images)) {
                const logoArt = mappingData.images.find((img: any) => img.coverType === 'Clearlogo');
                if (logoArt) logoUrl = logoArt.url;
              }

              if (!logoUrl && mappingData?.mappings?.thetvdb_id) {
                const tvdbId = mappingData.mappings.thetvdb_id;
                const tvdbRes = await fetch("https://api4.thetvdb.com/v4/login", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ apikey: "8d5ef3e7-1b6c-4474-ab39-ad6610bd4b80" })
                }).then(r => r.json()).catch(() => null);

                if (tvdbRes?.data?.token) {
                  const token = tvdbRes.data.token;
                  const extRes = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbId}/extended`, {
                    headers: { Authorization: `Bearer ${token}` }
                  }).then(r => r.json()).catch(() => null);

                  if (extRes?.data?.artworks) {
                    const logoArt = extRes.data.artworks.find((art: any) => art.type === 23 || art.type === 24);
                    if (logoArt) logoUrl = logoArt.image;
                  }
                }
              }

              if (logoUrl) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return setAnimeLogo(logoUrl);
                    ctx.drawImage(img, 0, 0);
                    const { data: idata, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    let top = height, left = width, right = 0, bottom = 0;
                    for (let y = 0; y < height; y++) {
                      for (let x = 0; x < width; x++) {
                        if (idata[(y * width + x) * 4 + 3] > 10) {
                          if (y < top) top = y; if (y > bottom) bottom = y;
                          if (x < left) left = x; if (x > right) right = x;
                        }
                      }
                    }
                    if (top >= bottom || left >= right) return setAnimeLogo(logoUrl);
                    top = Math.max(0, top - 2); left = Math.max(0, left - 2);
                    right = Math.min(width - 1, right + 2); bottom = Math.min(height - 1, bottom + 2);
                    const trimW = right - left + 1, trimH = bottom - top + 1;
                    const trimCanvas = document.createElement('canvas');
                    trimCanvas.width = trimW; trimCanvas.height = trimH;
                    const trimCtx = trimCanvas.getContext('2d');
                    if (!trimCtx) return setAnimeLogo(logoUrl);
                    trimCtx.drawImage(canvas, left, top, trimW, trimH, 0, 0, trimW, trimH);
                    setAnimeLogo(trimCanvas.toDataURL('image/png'));
                  } catch { setAnimeLogo(logoUrl); }
                };
                img.onerror = () => setAnimeLogo(logoUrl);
                img.src = logoUrl;
              }
            }).catch(() => { });
        }

      } catch (e) {
        console.error('Fetch Error:', e); setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [urlSlug]);

  // Bookmarks Sync Logic
  useEffect(() => {
    const syncBookmarkState = async () => {
      if (isSyncingBookmark.current) return;
      if (!data?.idMal && !data?.id && !urlSlug) { setBookmarked(false); return; }

      let isFound = false; let foundId: string | null = null; let foundBookmark: any = null;
      const targetIdMal = data?.idMal ? String(data.idMal) : null;
      const targetIdAni = data?.id ? String(data.id) : null;
      const targetIdStr = String(urlSlug);
      const currentSlug = resolvedSlug;
      const normTitle = normalizeTitle(data?.title?.english || data?.title?.romaji || data?.title?.native || '');

      const checkMatch = (b: any) => (targetIdMal && String(b.malId || b.mal_id) === targetIdMal) || (targetIdAni && String(b.malId || b.mal_id) === targetIdAni) || String(b.malId || b.mal_id) === targetIdStr || (urlSlug && createSlug(b.title) === urlSlug) || (currentSlug && createSlug(b.title) === currentSlug) || (normTitle && normalizeTitle(b.title) === normTitle);

      if (user) {
        try {
          const { data: dbData } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id);
          if (dbData) {
            const match = dbData.find(checkMatch);
            if (match) { isFound = true; foundId = match.mal_id; foundBookmark = match; }
          }
        } catch { }
      } else {
        const localBookmarks = readBookmarks();
        const match = localBookmarks.find(checkMatch);
        if (match) { isFound = true; foundId = String(match.malId); foundBookmark = match; }
      }

      setBookmarked(isFound); setSavedBookmarkId(foundId);
      const trackingMeta = readTrackingMeta(foundId || targetIdMal || targetIdAni || targetIdStr);
      if (trackingMeta) foundBookmark = { ...(foundBookmark || {}), ...trackingMeta };
      if (foundBookmark) {
        setBookmarkForm({
          status: getNormalizedTrackingStatus(foundBookmark.status),
          score: String(foundBookmark.score ? Math.min(10, Number(foundBookmark.score) > 10 ? Number(foundBookmark.score) / 10 : Number(foundBookmark.score)) : 0),
          episodeProgress: String(foundBookmark.episodeProgress || foundBookmark.episode_progress || 0),
          startDate: foundBookmark.startDate || foundBookmark.start_date || '',
          finishDate: foundBookmark.finishDate || foundBookmark.finish_date || '',
          totalRewatches: String(foundBookmark.totalRewatches || foundBookmark.total_rewatches || 0),
          notes: foundBookmark.notes || '',
        });
      } else if (!isBookmarkModalOpen) {
        setBookmarkForm(emptyBookmarkForm());
      }
      if (data) setIsFollowing(isFollowed(Number(foundId || data.idMal || data.id)));
    };

    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState); window.addEventListener('focus', syncBookmarkState); window.addEventListener('mv_bookmark_updated', syncBookmarkState);
    return () => { window.removeEventListener('storage', syncBookmarkState); window.removeEventListener('focus', syncBookmarkState); window.removeEventListener('mv_bookmark_updated', syncBookmarkState); };
  }, [data, user, urlSlug, resolvedSlug, isBookmarkModalOpen]);

  // Provider Episodes Extraction
  const providerEpisodes = useMemo(() => getProviderEpisodes({ providers: episodesData }, provider, category), [category, episodesData, provider]);

  const sortedEpisodes = [...providerEpisodes].sort((a, b) => episodeSortOrder === 'desc' ? (b.number || 0) - (a.number || 0) : (a.number || 0) - (b.number || 0));
  const visibleEpisodes = sortedEpisodes.filter((ep) => String(ep.number).includes(episodeSearchQuery.trim()) || (ep.title && ep.title.toLowerCase().includes(episodeSearchQuery.trim().toLowerCase())));

  const handleBookmarkToggle = useCallback(() => {
    if (!data || isSyncingBookmark.current) return;
    setIsBookmarkModalOpen(true);
  }, [data]);

  const handleBookmarkSave = useCallback(async () => {
    if (!data || isSavingBookmark) return;
    setIsSavingBookmark(true);
    isSyncingBookmark.current = true;
    const targetId = savedBookmarkId || String(data.idMal || data.id);
    const numericId = Number(targetId) || Number(data.idMal || data.id) || 0;
    const title = data.title?.english || data.title?.romaji || data.title?.native || 'Unknown Title';
    const coverUrl = data.coverImage?.extraLarge || data.coverImage?.large || data.coverImage;
    const scoreValue = Math.max(0, Math.min(10, Number(bookmarkForm.score) || 0));
    const episodeProgress = Math.max(0, Number(bookmarkForm.episodeProgress) || 0);
    const totalRewatches = Math.max(0, Number(bookmarkForm.totalRewatches) || 0);

    const entry: BookmarkEntry = {
      malId: numericId,
      title,
      cover: coverUrl,
      type: data.format || 'Anime',
      status: bookmarkForm.status,
      score: scoreValue,
      author: data.studios?.nodes?.[0]?.name || data.studios?.[0]?.name || undefined,
      year: data.seasonYear,
      episodes: data.episodes,
      episodeProgress,
      startDate: bookmarkForm.startDate,
      finishDate: bookmarkForm.finishDate,
      totalRewatches,
      notes: bookmarkForm.notes,
      updatedAt: Date.now(),
    };

    try {
      if (user) {
        const { error } = await supabase.from('anime_bookmarks').upsert({
          user_id: user.id,
          mal_id: targetId,
          title,
          cover: coverUrl || null,
          type: data.format || 'Anime',
          status: bookmarkForm.status,
          score: scoreValue || null,
          author: entry.author,
          created_at: new Date().toISOString(),
        }, { onConflict: 'user_id, mal_id' });
        if (error) throw error;
      } else {
        const current = readBookmarks();
        writeBookmarks([entry, ...current.filter(b => b.malId !== numericId)].sort((a, b) => b.updatedAt - a.updatedAt));
      }
      writeTrackingMeta(targetId, {
        status: bookmarkForm.status,
        score: scoreValue,
        episodeProgress,
        startDate: bookmarkForm.startDate,
        finishDate: bookmarkForm.finishDate,
        totalRewatches,
        notes: bookmarkForm.notes,
      });
      setBookmarked(true);
      setSavedBookmarkId(targetId);
      setIsBookmarkModalOpen(false);
      window.dispatchEvent(new Event('mv_bookmark_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      setBookmarked(false);
    } finally {
      isSyncingBookmark.current = false;
      setIsSavingBookmark(false);
    }
  }, [bookmarkForm, data, isSavingBookmark, savedBookmarkId, user]);

  const handleBookmarkDelete = useCallback(async () => {
    if (!data || isSavingBookmark) return;
    setIsSavingBookmark(true);
    isSyncingBookmark.current = true;
    const targetId = savedBookmarkId || String(data.idMal || data.id);
    try {
      if (user) {
        const { error } = await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('mal_id', targetId);
        if (error) throw error;
      } else {
        removeBookmark(Number(targetId) || 0);
      }
      removeTrackingMeta(targetId);
      setBookmarked(false);
      setSavedBookmarkId(null);
      setIsBookmarkModalOpen(false);
      setBookmarkForm(emptyBookmarkForm());
      window.dispatchEvent(new Event('mv_bookmark_updated'));
      window.dispatchEvent(new Event('storage'));
    } finally {
      isSyncingBookmark.current = false;
      setIsSavingBookmark(false);
    }
  }, [data, isSavingBookmark, savedBookmarkId, user]);

  const handleFollowToggle = useCallback(() => {
    if (!data) return;
    const targetId = savedBookmarkId || String(data.idMal || data.id);
    const title = data.title?.english || data.title?.romaji || data.title?.native || 'Unknown Title';
    const coverUrl = data.coverImage?.extraLarge || data.coverImage?.large || data.coverImage;
    const result = toggleFollow({ malId: Number(targetId) || 0, title, cover: coverUrl, type: data.format || 'Anime', status: data.status || 'Unknown' });
    setIsFollowing(result.followed);
  }, [data, savedBookmarkId]);

  const handleWatchFirst = () => { if (!providerEpisodes.length || !provider) return; setIsLinking(true); const sortedAsc = [...providerEpisodes].sort((a, b) => (a.number || 0) - (b.number || 0)); navigate(getEpisodeHref(resolvedSlug, provider, category, sortedAsc[0].id)); };

  const displayTitle = data?.title?.english || data?.title?.romaji || data?.title?.native || '?';
  const studioNodes = data?.studios?.nodes || [];
  const animationStudio = studioNodes.find((s: any) => s.isAnimationStudio);
  const studioName = animationStudio?.name || studioNodes[0]?.name || '';
  const trailerVideoId = data?.trailer?.site?.toLowerCase() === 'youtube' && data?.trailer?.id ? String(data.trailer.id) : '';
  const trailerEmbedUrl = trailerVideoId ? `https://www.youtube.com/embed/${trailerVideoId}?autoplay=1&rel=0&modestbranding=1` : '';
  const activeBookmarkTargetCount = Object.values(bookmarkUpdateTargets).filter(Boolean).length;

  useEffect(() => {
    if (!isTrailerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsTrailerOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTrailerOpen]);

  useEffect(() => {
    if (!isBookmarkModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (bookmarkDateMenu) {
          setBookmarkDateMenu(null);
          return;
        }
        if (isBookmarkStatusMenuOpen) {
          setIsBookmarkStatusMenuOpen(false);
          return;
        }
        setIsBookmarkModalOpen(false);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookmarkDateMenu, isBookmarkModalOpen, isBookmarkStatusMenuOpen]);

  // ─────────────────────────────────────────
  // RENDER BLOCKS
  // ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="aw-root aw-noise relative min-h-screen pb-20">
        <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: 'none', background: 'color-mix(in srgb, var(--aw-bg), transparent 15%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} />
        <motion.div initial="hidden" animate="visible" exit="exit" variants={containerVariants} className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-8">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
            <motion.div variants={itemVariants} className="w-full md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 aw-skeleton-card aspect-[2/3] rounded-[16px]" />
            <motion.div variants={itemVariants} className="flex-1 flex flex-col justify-end pb-2">
              <div className="h-14 w-3/4 rounded-xl aw-skeleton-card mb-6" />
              <div className="h-4 w-1/2 rounded-md aw-skeleton-card mb-8" />
              <div className="flex gap-2 mb-6">
                <div className="h-6 w-20 rounded-full aw-skeleton-card" />
                <div className="h-6 w-24 rounded-full aw-skeleton-card" />
              </div>
              <div className="space-y-2 mb-8">
                <div className="h-4 w-full rounded-md aw-skeleton-card" />
                <div className="h-4 w-[90%] rounded-md aw-skeleton-card" />
                <div className="h-4 w-[80%] rounded-md aw-skeleton-card" />
              </div>
              <div className="flex gap-4">
                <div className="h-12 w-32 rounded-[14px] aw-skeleton-card" />
                <div className="h-12 w-32 rounded-[14px] aw-skeleton-card" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!data || loadFailed) {
    return (
      <div className="aw-root aw-noise relative min-h-screen pb-20 selection:bg-[var(--aw-accent)]/20 flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center rounded-[1.7rem] border border-[var(--aw-border)] bg-[var(--aw-s1)] px-6 py-12 text-center backdrop-blur-md max-w-lg mx-auto w-full">
          <p className="aw-label text-red-400 mb-2">{loadFailed ? 'Fetch Failed' : 'Not Found'}</p>
          <h3 className="mt-2 text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {loadFailed ? 'Anime data failed to load' : 'Anime not found'}
          </h3>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 flex h-[48px] items-center justify-center rounded-[14px] border border-[var(--aw-border)] bg-[var(--aw-s2)] px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition-colors duration-150 hover:bg-white/10" style={{ fontFamily: 'var(--aw-font-display)' }}>
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="aw-root aw-noise relative min-h-screen text-white pb-20 md:pb-20 selection:bg-[var(--aw-accent)]/20">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: 'none', background: 'color-mix(in srgb, var(--aw-bg), transparent 15%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} />

      {/* ── MOBILE HERO (Crunchyroll-style) ── */}
      <div className="md:hidden">
        {/* Full-bleed banner */}
        <div className="mobile-hero-banner" style={{ aspectRatio: '16/9', maxHeight: '58vw' }}>
          <img
            src={data.bannerImage || data.coverImage?.extraLarge || data.coverImage?.large}
            alt=""
          />
        </div>

        {/* Cover art overlapping the banner */}
        <div className="mobile-cover-overlap">
          <div className="mobile-cover-poster" onClick={() => setIsCoverOpen(true)}>
            <img src={data.coverImage?.extraLarge || data.coverImage?.large} alt={displayTitle} />
          </div>
          {/* Title beside the poster */}
          <div className="mobile-title-beside">
            {animeLogo ? (
              <img
                src={animeLogo}
                alt={displayTitle}
                style={{ maxWidth: '100%', maxHeight: 72, objectFit: 'contain', objectPosition: 'left bottom', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))' }}
              />
            ) : (
              <h1 className="text-xl font-black uppercase tracking-tight leading-tight line-clamp-3 text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
                {displayTitle}
              </h1>
            )}
            {/* Studio - Format - Status chips */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {studioName && <span className="text-[10px] font-bold uppercase tracking-widest text-white/45" style={{ fontFamily: 'var(--aw-font-display)' }}>{studioName}</span>}
              {studioName && <span className="text-white/20 text-[10px]">-</span>}
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/45" style={{ fontFamily: 'var(--aw-font-display)' }}>{data.format || 'TV'}</span>
              <span className="text-white/20 text-[10px]">-</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/45" style={{ fontFamily: 'var(--aw-font-display)' }}>{data.status ? String(data.status).replace(/_/g, ' ') : 'TBA'}</span>
            </div>
          </div>
        </div>

        {/* Rating */}
        <div className="mobile-rating-row">
          <div className="mobile-stars">
            {[1, 2, 3, 4, 5].map(i => {
              const filled = i <= Math.round((data.averageScore || 0) / 20);
              return (
                <Star key={i} size={15} className={filled ? 'text-yellow-400' : 'text-white/20'} style={{ fill: filled ? 'currentColor' : 'none' }} />
              );
            })}
          </div>
          <span className="text-sm font-bold text-white ml-1">{data.averageScore ? `${data.averageScore}%` : 'No score'}</span>
          {data.popularity && <span className="text-xs text-white/35">({formatNumber(data.popularity)})</span>}
          {data.episodes && <span className="text-[11px] text-white/35 ml-auto">{data.episodes} EP{data.seasonYear ? ` · ${data.seasonYear}` : ''}</span>}
        </div>

        {/* Mobile Action Buttons (Watch / Resume) - Now placed safely inline */}
        <div className="px-4 mt-6">
          {watchProgress ? (
            <button
              onClick={() => { setIsLinking(true); navigate(watchProgress.href); }}
              disabled={isLinking}
              className="w-full h-[52px] rounded-[16px] flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-[var(--aw-accent)]/20 active:scale-[0.98] transition-transform"
              style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {isLinking ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
              Resume Ep. {watchProgress.episodeNumber}
            </button>
          ) : (
            <button
              onClick={handleWatchFirst}
              disabled={!providerEpisodes.length || isLinking}
              className="w-full h-[52px] rounded-[16px] flex items-center justify-center gap-2 text-sm font-bold shadow-lg active:scale-[0.98] transition-transform disabled:opacity-50"
              style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {isLinking ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
              Start Watching
            </button>
          )}
        </div>

        {/* Action buttons: My List, Subscribe, Trailer */}
        <div className="mobile-action-row">
          <button className={`mobile-action-btn ${bookmarked ? 'active' : ''}`} onClick={handleBookmarkToggle}>
            {bookmarked ? <Pencil size={24} /> : <Plus size={26} />}
            <span>{bookmarked ? 'Saved' : 'My List'}</span>
          </button>
          <button
            className={`mobile-action-btn ${isFollowing ? 'active' : ''}`}
            onClick={() => {
              handleFollowToggle();
              if (!isFollowing) {
                const btn = document.getElementById('mobile-sub-btn');
                if (btn) { btn.classList.add('just-subscribed'); setTimeout(() => btn.classList.remove('just-subscribed'), 600); }
              }
            }}
            id="mobile-sub-btn"
          >
            <Bell size={26} style={{ fill: isFollowing ? 'currentColor' : 'none' }} />
            <span>{isFollowing ? 'Subscribed' : 'Subscribe'}</span>
          </button>
          {trailerVideoId && (
            <button className="mobile-action-btn" onClick={() => setIsTrailerOpen(true)}>
              <Youtube size={26} />
              <span>Trailer</span>
            </button>
          )}
          <button
            className="mobile-action-btn"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: displayTitle, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 size={26} />
            <span>Share</span>
          </button>
        </div>

        {/* Synopsis */}
        <div className="mobile-synopsis">
          <p className={!synopsisExpanded ? 'line-clamp-3' : ''}>
            {data.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available.'}
          </p>
          <button className="mobile-more-details" onClick={() => setSynopsisExpanded(!synopsisExpanded)}>
            <ChevronRight size={13} className={`transition-transform duration-200 ${synopsisExpanded ? 'rotate-90' : ''}`} />
            {synopsisExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        {/* Episode / More Like This tabs */}
        <div className="mobile-tabs-bar mx-4 rounded-t-none">
          <button className={`mobile-tab ${mobileTab === 'episodes' ? 'active' : ''}`} onClick={() => setMobileTab('episodes')}>Episodes</button>
          <button className={`mobile-tab ${mobileTab === 'similar' ? 'active' : ''}`} onClick={() => setMobileTab('similar')}>More Like This</button>
        </div>

        {/* Mobile episodes/similar content */}
        <div className="px-4 pt-4 pb-4 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {mobileTab === 'episodes' && (
              <motion.div
                key="episodes"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
              >
                {/* Controls */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {navTabs.length > 1 && (
                    <div className="relative z-50">
                      <button type="button" onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)} className="flex min-w-[180px] h-[38px] items-center justify-between gap-2 rounded-[12px] border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
                        {activeTab?.displayLabel || 'Seasons'}
                        <ChevronDown size={13} className={`transition-transform ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isSeasonDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsSeasonDropdownOpen(false)} />
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute left-0 top-[calc(100%+6px)] w-full z-50 rounded-[14px] border border-[var(--aw-border)] bg-[var(--aw-s1)] p-1.5 shadow-2xl backdrop-blur-xl">
                              <div className="max-h-[220px] overflow-y-auto aw-scrollbar flex flex-col gap-1">
                                {navTabs.map(tab => (
                                  <button key={tab.id} onClick={() => { setIsSeasonDropdownOpen(false); navigate(`/watch/${tab.slug}`); }} className={`w-full flex flex-col items-center text-center px-3 py-2.5 rounded-[10px] transition-colors ${tab.active ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] text-[var(--aw-accent)]' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: 'var(--aw-font-display)' }}>{tab.displayLabel}</span>
                                    <span className="text-[11px] font-medium truncate w-full mt-0.5" style={{ fontFamily: 'var(--aw-font-body)' }}>{tab.title}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <div className="flex items-center gap-1 p-1 rounded-[12px] border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md">
                    {(['sub', 'dub'] as const).map((audioMode) => {
                      const isActive = category === audioMode;
                      const isDisabled = (episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0;
                      return (
                        <button key={audioMode} type="button" onClick={() => setCategory(audioMode)} disabled={isDisabled} className={`relative flex h-[30px] items-center justify-center rounded-[9px] px-4 text-[10px] font-bold uppercase tracking-widest transition-all outline-none disabled:opacity-30 ${isActive ? 'text-[var(--aw-accent)]' : 'text-zinc-400'}`} style={{ fontFamily: 'var(--aw-font-display)' }}>
                          {isActive && <motion.div layoutId="mobileAudioPill" className="absolute inset-0 rounded-[9px] border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)]" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
                          <span className="relative z-10">{audioMode}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Episode List */}
                <div className="flex flex-col">
                  {providerEpisodes.length > 0 ? (
                    visibleEpisodes.map((episode, index) => (
                      <div
                        key={episode.id}
                        onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))}
                        className="episode-card animate-fade-up group flex items-center gap-3.5 p-3 rounded-[16px] cursor-pointer border border-transparent bg-transparent hover:bg-white/[0.02] hover:border-white/[0.04] mb-2.5 transition-all duration-200"
                        style={{ animationDelay: `${(index % 20) * 0.03}s` }}
                      >
                        <div className="ep-number flex h-[56px] w-8 shrink-0 items-center justify-center text-base font-light text-zinc-500 group-hover:text-[var(--aw-accent)] transition-colors duration-200" style={{ fontFamily: 'var(--aw-font-body)' }}>
                          {episode.number ? String(episode.number).padStart(2, '0') : '-'}
                        </div>
                        <div className="relative h-[56px] w-[100px] shrink-0 overflow-hidden rounded-[10px] bg-[var(--aw-s2)] border border-white/[0.04]">
                          <img 
                            src={episode.image || data?.coverImage?.large || 'https://via.placeholder.com/96x56/181818/3f3f46?text=No+Image'} 
                            alt={`Episode ${episode.number}`} 
                            className="ep-thumb h-full w-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300" 
                            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/96x56/181818/3f3f46?text=No+Image'; }} 
                          />
                          {episode.filler && (
                            <div className="absolute top-1 left-1 rounded-[4px] bg-[var(--aw-accent)] text-[#04110d] px-1 py-0.2 text-[6px] font-bold uppercase tracking-wider" style={{ fontFamily: 'var(--aw-font-display)' }}>
                              Filler
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-[var(--aw-accent)] text-[#04110d] flex items-center justify-center shadow-md transform scale-95">
                              <Play size={14} fill="currentColor" className="ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <h4 className="text-[13px] font-bold text-white/90 group-hover:text-white transition-colors line-clamp-1" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {episode.title || `Episode ${episode.number || '?'}`}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors leading-relaxed" style={{ fontFamily: 'var(--aw-font-body)' }}>
                            {episode.description || `Episode ${episode.number} of ${displayTitle}.`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center rounded-[16px] border border-[var(--aw-border)] bg-[var(--aw-s1)] mt-2">
                      <div className="aw-label">No Episodes Found</div>
                      <p className="mt-2 text-sm text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>No available episodes for this anime</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {mobileTab === 'similar' && (
              <motion.div
                key="similar"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.2 }}
                className="pt-2"
              >
                <Carousel>
                  {recommendations.filter((r: any) => r.mediaRecommendation).map((rec: any) => {
                    const recAnime = rec.mediaRecommendation;
                    const recSlug = createSlug(recAnime.title?.english || recAnime.title?.romaji || recAnime.title?.native || String(recAnime.id));
                    return (
                      <MediaCard
                        key={recAnime.id}
                        title={recAnime.title?.english || recAnime.title?.romaji || recAnime.title?.native}
                        image={recAnime.coverImage?.extraLarge || recAnime.coverImage?.large}
                        type={recAnime.format || 'TV'}
                        episodes={recAnime.episodes}
                        score={recAnime.averageScore ? Number((recAnime.averageScore / 10).toFixed(1)) : undefined}
                        onClick={() => navigate(`/watch/${recSlug}`)}
                      />
                    );
                  })}
                </Carousel>
                {recommendations.filter((r: any) => r.mediaRecommendation).length === 0 && (
                  <div className="py-10 text-center w-full">
                    <p className="text-sm text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>No recommendations available</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile comment section */}
        <div className="px-4 pb-4">
          <CommentSection pageType="anime" pageId={urlSlug || ''} />
        </div>
      </div>

      {/* ── DESKTOP LAYOUT ── */}
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-4 md:pt-8 hidden md:block">

        <motion.button variants={itemVariants} onClick={() => navigate(-1)} className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4 md:mb-6 text-sm font-medium w-fit relative z-50">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back
        </motion.button>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full max-w-full">
          {/* LEFT COLUMN */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* --- Top Section: Cover & Info --- */}
            <div className="flex flex-col md:flex-row gap-6 lg:gap-12 mb-10 md:mb-12">
              <motion.div variants={itemVariants} className="w-[140px] sm:w-[180px] md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 mx-auto md:mx-0 -mt-[40px] md:mt-0 relative z-20">
                <div
                  className="group relative aspect-[2/3] rounded-[24px] overflow-hidden border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_30%)] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] cursor-pointer"
                  onClick={() => setIsCoverOpen(true)}
                >
                  <img src={data.coverImage?.extraLarge || data.coverImage?.large} className="w-full h-full object-cover transition-all duration-500" alt={displayTitle} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300" />
                </div>
              </motion.div>

              <div className="flex-1 flex flex-col justify-end pb-2 min-w-0 items-center md:items-start text-center md:text-left">
                {animeLogo ? (
                  <motion.img
                    variants={itemVariants}
                    src={animeLogo}
                    alt={displayTitle}
                    className="max-w-[80%] md:max-w-[400px] lg:max-w-[600px] max-h-[140px] md:max-h-[180px] object-contain mb-6"
                    style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.95)) drop-shadow(0 10px 30px rgba(0,0,0,0.4)) contrast(1.15) brightness(0.95)' }}
                  />
                ) : (
                  <h1 className="text-4xl md:text-6xl lg:text-[4rem] font-black uppercase tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3 anim-fade-in-up" style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em', animationDelay: '0.1s' }}>
                    {displayTitle}
                  </h1>
                )}

                <motion.div variants={itemVariants} className="aw-title-facts">
                  {studioName && (
                    <button type="button" onClick={() => navigate(`/browse?studio=${encodeURIComponent(studioName)}`)} className="aw-fact-chip" title={`Browse anime by ${studioName}`}>
                      <Building2 size={12} /> {studioName}
                    </button>
                  )}
                  <button type="button" onClick={() => navigate(`/browse?format=${encodeURIComponent(data.format || 'TV')}`)} className="aw-fact-chip" title={`Browse ${data.format || 'TV'} anime`}>
                    <Clapperboard size={12} /> {data.format || 'TV'}
                  </button>
                  <button type="button" onClick={() => navigate(`/browse?status=${encodeURIComponent(data.status || '')}`)} className="aw-fact-chip" title={`Browse ${data.status || ''} anime`}>
                    <CheckCircle2 size={12} /> {data.status ? String(data.status).replace(/_/g, ' ') : 'Status TBA'}
                  </button>
                  <span className="aw-fact-chip">
                    <Star size={12} className="fill-[var(--aw-accent)]" /> {data.averageScore ? `${data.averageScore}%` : 'No score'}
                  </span>
                  {(data.seasonYear || data.episodes) && (
                    <button type="button" onClick={() => data.seasonYear && navigate(`/browse?year=${data.seasonYear}`)} className="aw-fact-chip" title={`Browse ${data.seasonYear} anime`}>
                      <CalendarDays size={12} /> {[data.seasonYear, data.episodes ? `${data.episodes} EP` : null].filter(Boolean).join(' / ')}
                    </button>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="mb-6 md:mb-8 overflow-hidden transition-all duration-300">
                  <p className={`text-[14px] md:text-[15px] leading-[1.8] text-white/70 ${!synopsisExpanded ? 'line-clamp-3 md:line-clamp-4' : ''}`} style={{ fontFamily: 'var(--aw-font-body)' }}>
                    {data.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available.'}
                  </p>
                  <button onClick={() => setSynopsisExpanded(!synopsisExpanded)} className="mt-2.5 mx-auto md:mx-0 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--aw-accent)] transition-opacity hover:opacity-80">
                    <ChevronRight size={14} className={`transition-transform duration-300 ${synopsisExpanded ? '-rotate-90' : 'rotate-90'}`} />
                    <span>{synopsisExpanded ? 'Read Less' : 'Read More'}</span>
                  </button>
                </motion.div>

                {/* DESKTOP ACTION BUTTONS */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full md:w-auto">
                  {watchProgress ? (
                    <button
                      onClick={() => { setIsLinking(true); navigate(watchProgress.href); }}
                      disabled={isLinking}
                      className="aw-btn-primary group relative overflow-hidden press-squish flex h-[48px] items-center gap-2 rounded-full px-6 text-sm font-bold disabled:opacity-60"
                      style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                      <span className="relative z-10 flex items-center gap-2">
                        {isLinking ? <Loader2 className="spin-smooth" size={16} /> : <Play size={15} fill="currentColor" />}
                        Resume Ep. {watchProgress.episodeNumber}
                      </span>
                    </button>
                  ) : (
                    <div className={`flex items-center gap-3 transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                      <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="aw-btn-primary group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-full border px-6 text-sm font-bold disabled:opacity-60" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                        <span className="relative z-10 flex items-center gap-2">
                          <Play size={15} fill="currentColor" />
                          {isLinking ? <Loader2 className="spin-smooth" size={15} /> : 'Watch First'}
                        </span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {trailerVideoId && (
                      <button
                        type="button"
                        onClick={() => setIsTrailerOpen(true)}
                        className="aw-btn-ghost press-squish flex h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-6 text-sm font-bold uppercase"
                        style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '0.05em', color: 'white' }}
                      >
                        <Youtube size={16} />
                        Trailer
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleFollowToggle();
                        if (!isFollowing) {
                          const btn = document.getElementById('subscribe-btn');
                          if (btn) {
                            btn.classList.add('just-subscribed');
                            setTimeout(() => btn.classList.remove('just-subscribed'), 600);
                          }
                        }
                      }}
                      className={`subscribe-btn aw-btn-ghost press-squish flex h-[48px] items-center justify-center gap-2 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-6 text-sm font-bold uppercase ${isFollowing ? 'subscribed' : ''}`}
                      style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '0.05em' }}
                      id="subscribe-btn"
                    >
                      <Bell size={18} className={isFollowing ? 'fill-current' : ''} />
                      {isFollowing ? 'Subscribed' : 'Subscribe'}
                    </button>

                    <button
                      type="button"
                      onClick={handleBookmarkToggle}
                      style={{
                        background: 'var(--aw-s1)',
                        borderColor: bookmarked ? 'var(--aw-accent)' : 'var(--aw-border)',
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                      className={`group relative flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-full border hover:scale-[1.05] active:scale-[0.96] active:duration-100 ${bookmarked ? 'text-[var(--aw-accent)]' : 'text-white'}`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--aw-accent), transparent 85%)';
                        e.currentTarget.style.borderColor = 'var(--aw-accent)';
                        e.currentTarget.style.color = 'var(--aw-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--aw-s1)';
                        e.currentTarget.style.borderColor = bookmarked ? 'var(--aw-accent)' : 'var(--aw-border)';
                        e.currentTarget.style.color = bookmarked ? 'var(--aw-accent)' : 'white';
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                        {bookmarked ? <Pencil size={18} /> : <Plus size={20} />}
                      </span>
                    </button>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* --- Bottom Section: Layout Grid --- */}

            {/* LEFT COL: Content */}
            <div className="space-y-8 md:space-y-10 min-w-0">
              <div className="flex flex-col min-w-0">

                {/* EPISODES SECTION */}
                <motion.div variants={itemVariants} className="mb-4 md:mb-6 flex items-end justify-between border-b border-[color-mix(in_srgb,var(--aw-border),transparent_50%)] pb-3">
                  <h3 className="text-lg md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    Episodes{providerEpisodes.length > 0 && <span className="ml-2 text-base md:text-lg font-semibold text-white/40">({providerEpisodes.length})</span>}
                  </h3>
                </motion.div>

                <motion.div variants={itemVariants} className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3 justify-between relative z-50">
                  {/* Left Side: Seasons & Sub/Dub */}
                  <div className="flex items-center gap-2 flex-wrap z-50">
                    {navTabs.length > 1 && (
                      <div className="relative z-50 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
                          className={`aw-control-btn flex min-w-[220px] h-[42px] items-center justify-between gap-3 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white ${isSeasonDropdownOpen ? 'is-active' : ''}`}
                          style={{ fontFamily: 'var(--aw-font-display)' }}
                        >
                          {activeTab?.displayLabel || 'Seasons'}
                          <ChevronDown size={14} className={`transition-transform duration-150 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isSeasonDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsSeasonDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -12, scale: 0.94, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
                                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                className="absolute left-0 top-[calc(100%+8px)] w-full z-50 rounded-[20px] border border-white/[0.08] bg-black/80 px-2 py-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
                              >
                                <div className="max-h-[260px] overflow-y-auto overflow-x-hidden aw-scrollbar flex flex-col gap-1.5">
                                  {navTabs.map(tab => {
                                    const isSelected = tab.active;
                                    return (
                                      <button
                                        key={tab.id}
                                        onClick={() => { setIsSeasonDropdownOpen(false); navigate(`/watch/${tab.slug}`); }}
                                        className={`w-full flex flex-col items-center text-center px-4 py-3 rounded-[12px] transition-all duration-200 ${isSelected ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] text-[var(--aw-accent)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_70%)]' : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white border border-transparent hover:border-white/10'}`}
                                      >
                                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: 'var(--aw-font-display)' }}>{tab.displayLabel}</span>
                                        <span className="text-[12px] font-medium truncate w-full mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{tab.title}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="flex items-center gap-1 p-1 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md flex-shrink-0">
                      {(['sub', 'dub'] as const).map((audioMode) => {
                        const isActive = category === audioMode;
                        const isDisabled = (episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0;

                        return (
                          <button
                            key={audioMode}
                            type="button"
                            onClick={() => setCategory(audioMode)}
                            disabled={isDisabled}
                            className={`aw-control-btn relative flex h-[34px] items-center justify-center rounded-full px-5 text-[10px] font-bold uppercase tracking-[0.18em] outline-none disabled:opacity-30 disabled:cursor-not-allowed ${isActive ? 'is-active' : 'text-zinc-400'}`}
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="audioModePill"
                                className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] shadow-sm"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                              />
                            )}
                            <span className="relative z-10">{audioMode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Side: Provider & Sort */}
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end z-40">
                    {Object.keys(episodesData).length > 1 && (
                      <div className="relative z-50 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                          className={`aw-control-btn flex min-w-[150px] h-[42px] items-center justify-between gap-3 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white ${isProviderDropdownOpen ? 'is-active' : ''}`}
                          style={{ fontFamily: 'var(--aw-font-display)' }}
                        >
                          {provider}
                          <ChevronDown size={14} className={`transition-transform duration-150 ${isProviderDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isProviderDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsProviderDropdownOpen(false)} />
                              <motion.div
                                initial={{ opacity: 0, y: -12, scale: 0.94, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(4px)' }}
                                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                                className="absolute left-0 top-[calc(100%+8px)] w-full z-50 rounded-[20px] border border-white/[0.08] bg-black/80 px-2 py-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
                              >
                                <div className="max-h-[260px] overflow-y-auto overflow-x-hidden aw-scrollbar flex flex-col gap-1.5">
                                  {Object.keys(episodesData).map(p => {
                                    const isSelected = provider === p;
                                    return (
                                      <button
                                        key={p}
                                        onClick={() => { setProvider(p); setIsProviderDropdownOpen(false); }}
                                        className={`w-full text-center px-4 py-3 rounded-[12px] text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-200 ${isSelected ? 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] text-[var(--aw-accent)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_70%)]' : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white border border-transparent hover:border-white/10'}`}
                                        style={{ fontFamily: 'var(--aw-font-display)' }}
                                      >
                                        {p}
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      className="aw-control-btn flex h-[42px] items-center gap-2 rounded-full border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white flex-shrink-0"
                      style={{ fontFamily: 'var(--aw-font-display)' }}
                    >
                      <ArrowDownUp size={12} className="transition-transform duration-150 text-[var(--aw-accent)]" />{episodeSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                  </div>
                </motion.div>

                {/* Episode List */}
                <div className="max-h-[600px] md:max-h-[800px] overflow-y-auto overflow-x-hidden pr-2 aw-scrollbar pb-6 -mx-2 md:mx-0">
                  <div className="flex flex-col px-2 py-1 relative">
                    {providerEpisodes.length > 0 ? (
                      visibleEpisodes.length > 0 ? (
                        <div className="flex flex-col relative">
                          {visibleEpisodes.map((episode, index) => (
                            <div
                              key={episode.id}
                              onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))}
                              className="episode-card animate-fade-up group flex items-center gap-4 md:gap-6 p-3.5 md:p-4 rounded-[20px] cursor-pointer border border-transparent bg-transparent hover:bg-white/[0.03] hover:border-white/[0.06] active:scale-[0.99] transition-all duration-200 mb-2"
                              style={{ animationDelay: `${(index % 20) * 0.03}s` }}
                            >
                              <div className="ep-number flex h-[56px] md:h-[80px] w-8 md:w-12 shrink-0 items-center justify-center text-lg md:text-2xl font-light text-zinc-500 group-hover:text-[var(--aw-accent)] transition-colors duration-300" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                {episode.number ? String(episode.number).padStart(2, '0') : '-'}
                              </div>
                              <div className="relative h-[56px] md:h-[80px] w-[100px] md:w-[142px] shrink-0 overflow-hidden rounded-[14px] bg-[var(--aw-s2)] border border-white/[0.04] shadow-md">
                                <img src={episode.image || data?.coverImage?.large || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${episode.number}`} className="ep-thumb h-full w-full object-cover opacity-85 group-hover:scale-105 group-hover:opacity-100 transition-all duration-500" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />
                                {episode.filler && (
                                  <div className="absolute top-2 left-2 rounded-[6px] bg-[var(--aw-accent)] text-[#04110d] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-md" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                    Filler
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="w-10 h-10 rounded-full bg-[var(--aw-accent)] text-[#04110d] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all duration-300">
                                    <Play size={18} fill="currentColor" className="ml-0.5" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center">
                                <h4 className="text-[14px] md:text-[16px] font-bold text-white/90 group-hover:text-white transition-colors tracking-wide leading-snug line-clamp-1" style={{ fontFamily: 'var(--aw-font-display)' }}>{episode.title || `Episode ${episode.number || '?'}`}</h4>
                                <p className="mt-1.5 line-clamp-2 text-[11px] md:text-[13px] text-zinc-400 leading-relaxed tracking-wide group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-body)' }}>{episode.description || `Episode ${episode.number} of ${displayTitle}.`}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (<div className="p-8 md:p-12 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600" style={{ fontFamily: 'var(--aw-font-display)' }}>No episodes match this search</div>)
                    ) : (
                      <motion.div variants={itemVariants} className="p-8 md:p-12 text-center rounded-[16px] border border-[var(--aw-border)] bg-[var(--aw-s1)] mt-4 backdrop-blur-md">
                        <div className="aw-label">No Episodes found</div>
                        <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>We couldn't find available episodes for this anime</div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* DESKTOP MORE LIKE THIS */}
              {recommendations.filter(r => r.mediaRecommendation).length > 0 && (
                <motion.div variants={itemVariants} className="mt-12 md:mt-16 w-full max-w-full overflow-hidden">
                  <Carousel title="More Like This">
                    {recommendations.filter(r => r.mediaRecommendation).map((rec: any) => {
                      const recAnime = rec.mediaRecommendation;
                      const recSlug = createSlug(recAnime.title?.english || recAnime.title?.romaji || recAnime.title?.native || String(recAnime.id));
                      return (
                        <MediaCard
                          key={recAnime.id}
                          title={recAnime.title?.english || recAnime.title?.romaji || recAnime.title?.native}
                          image={recAnime.coverImage?.extraLarge || recAnime.coverImage?.large}
                          type={recAnime.format || 'TV'}
                          episodes={recAnime.episodes}
                          score={recAnime.averageScore ? Number((recAnime.averageScore / 10).toFixed(1)) : undefined}
                          onClick={() => navigate(`/watch/${recSlug}`)}
                        />
                      );
                    })}
                  </Carousel>
                </motion.div>
              )}

              <motion.div variants={itemVariants} className="mt-8 transition-colors duration-150">
                <CommentSection pageType="anime" pageId={urlSlug || ''} />
              </motion.div>
            </div>
          </div>

          {/* --- RIGHT SIDEBAR --- */}
          <div className="hidden lg:flex flex-col w-[340px] flex-shrink-0 space-y-8 pb-4">
            {/* RIGHT COL: Stats (Desktop Only) */}
            <motion.div variants={itemVariants} className="flex flex-col justify-start pb-2">
              <div className="flex items-center justify-between mb-5 select-none cursor-pointer group" onClick={() => setTopStatsCollapsed(!topStatsCollapsed)}>
                <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors">
                  <Info size={14} className="text-[var(--aw-accent)]" /> <span>Statistics</span>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 group-hover:text-white transition-all duration-300 ${topStatsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {!topStatsCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                      <div className="grid grid-cols-2 gap-3 pb-2">

                        <div className="group/stat flex flex-col gap-1.5 rounded-[16px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md p-4 transition-all duration-300 shadow-sm hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)] min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-400 group-hover/stat:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            <TrendingUp size={12} className="text-[var(--aw-accent)] shrink-0 transition-transform group-hover/stat:scale-110" />
                            Popular
                          </span>
                          <span className="text-xl lg:text-2xl font-bold text-white truncate transition-transform origin-left group-hover/stat:scale-105" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            #{data.popularity ? formatNumber(data.popularity) : '?'}
                          </span>
                        </div>

                        <div className="group/stat flex flex-col gap-1.5 rounded-[16px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md p-4 transition-all duration-300 shadow-sm hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)] min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-400 group-hover/stat:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            <Users size={12} className="text-[var(--aw-accent)] shrink-0 transition-transform group-hover/stat:scale-110" />
                            Format
                          </span>
                          <span className="text-xl lg:text-2xl font-bold text-white truncate transition-transform origin-left group-hover/stat:scale-105" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {data.format || '?'}
                          </span>
                        </div>

                        <div className="col-span-2 group/stat flex flex-col gap-1.5 rounded-[16px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md p-4 transition-all duration-300 shadow-sm hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)] min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-zinc-400 group-hover/stat:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            <Heart size={12} className="text-[var(--aw-accent)] shrink-0 transition-transform group-hover/stat:scale-110" />
                            Favourites
                          </span>
                          <span className="text-xl lg:text-2xl font-bold text-white truncate transition-transform origin-left group-hover/stat:scale-[1.02]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {formatNumber(data.favourites)}
                          </span>
                        </div>

                        <div className="group col-span-2 flex flex-col rounded-[16px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md p-5 shadow-sm transition-all duration-300 hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_95%)]">
                          <div className="space-y-5">
                            <div className="flex items-start gap-4">
                              <Calendar size={14} className="flex-shrink-0 mt-0.5 text-[var(--aw-accent)] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>Season</span>
                                <span className="block text-[13px] font-bold text-white mt-1" style={{ fontFamily: 'var(--aw-font-display)' }}>{[data.season, data.seasonYear].filter(Boolean).join(' ') || '?'}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-4">
                              <Library size={14} className="flex-shrink-0 mt-0.5 text-[var(--aw-accent)] transition-transform group-hover:scale-110 group-hover:-rotate-3" />
                              <div>
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</span>
                                <span className="block text-[13px] font-bold text-white mt-1" style={{ fontFamily: 'var(--aw-font-display)' }}>{data.episodes || 'TBA'} {data.duration ? `(${data.duration}m)` : ''}</span>
                              </div>
                            </div>
                            {data.nextAiringEpisode && (
                              <div className="flex items-start gap-4">
                                <Clock size={14} className="flex-shrink-0 mt-0.5 text-[var(--aw-accent)] transition-transform group-hover:scale-110 group-hover:rotate-12" />
                                <div>
                                  <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>Next Episode</span>
                                  <span className="block text-[13px] font-bold mt-1 text-[var(--aw-accent)]" style={{ fontFamily: 'var(--aw-font-display)' }}><NextAiringTimer airingAt={data.nextAiringEpisode.airingAt} episode={data.nextAiringEpisode.episode} /></span>
                                </div>
                              </div>
                            )}
                            {data.title?.native && (
                              <div className="flex items-start gap-4 pt-5 mt-1 border-t border-[color-mix(in_srgb,var(--aw-border),transparent_50%)] transition-colors">
                                <Languages size={14} className="flex-shrink-0 mt-0.5 text-[var(--aw-accent)] transition-transform group-hover:scale-110" />
                                <div>
                                  <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>Alternative Title</span>
                                  <span className="block text-[14px] font-medium text-white mt-1">{data.title.native}</span>
                                </div>
                              </div>
                            )}
                            <div className="mt-2 flex gap-3 pt-5 border-t border-[color-mix(in_srgb,var(--aw-border),transparent_50%)] transition-colors">
                              {data?.id && <a href={`https://anilist.co/anime/${data.id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[12px] text-[10px] font-bold uppercase tracking-widest border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_50%)] text-zinc-300 hover:text-white hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_80%)] hover:shadow-[0_0_12px_-3px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] active:scale-95 transition-all duration-200" style={{ fontFamily: 'var(--aw-font-display)' }}>AniList <ExternalLink size={10} /></a>}
                              {data?.idMal && <a href={`https://myanimelist.net/anime/${data.idMal}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-[12px] text-[10px] font-bold uppercase tracking-widest border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_50%)] text-zinc-300 hover:text-white hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_60%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_80%)] hover:shadow-[0_0_12px_-3px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] active:scale-95 transition-all duration-200" style={{ fontFamily: 'var(--aw-font-display)' }}>MAL <ExternalLink size={10} /></a>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {(loadingReviews || reviews.length > 0) && (
                  <div className="group mt-8">
                    <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => setReviewsCollapsed(!reviewsCollapsed)}>
                      <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors"><Star size={14} className="text-[var(--aw-accent)]" /> AniList Reviews</div>
                      <ChevronDown size={14} className={`text-zinc-500 group-hover:text-white transition-all duration-300 ${reviewsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </div>
                    <AnimatePresence>
                      {!reviewsCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                          <div className="pb-2">
                            {loadingReviews ? (
                              <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[var(--aw-accent)]" size={20} /></div>
                            ) : (
                              <div className="space-y-3">
                                {reviews.slice(0, 5).map((review) => (
                                  <a key={review.id} href={review.siteUrl} target="_blank" rel="noopener noreferrer" className="group/review block p-5 rounded-[16px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md overflow-hidden transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_92%)]">
                                    <div className="flex items-center gap-3 mb-3">
                                      <img src={review.user.avatar.medium} alt={review.user.name} className="w-7 h-7 rounded-full object-cover" />
                                      <span className="text-[12px] font-bold text-white tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>{review.user.name}</span>
                                      <span className="ml-auto text-[11px] font-bold text-[var(--aw-accent)]">{review.rating}%</span>
                                    </div>
                                    <p className="text-[12px] leading-relaxed line-clamp-3 italic text-zinc-400 group-hover/review:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-body)' }}>"{review.summary}"</p>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {streamingLinks.length > 0 && (
                  <div className="group mt-8">
                    <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => setStreamingCollapsed(!streamingCollapsed)}>
                      <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors"><Play size={14} className="text-[var(--aw-accent)]" /> Available on</div>
                      <ChevronDown size={14} className={`text-zinc-500 group-hover:text-white transition-all duration-300 ${streamingCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                    </div>
                    <AnimatePresence>
                      {!streamingCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0, overflow: 'hidden' }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }}>
                          <div className="space-y-3 pb-2">
                            {streamingLinks.map((link: any, idx: number) => (
                              <a key={`${link.site}-${idx}`} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-[14px] border border-[var(--aw-border)] bg-[color-mix(in_srgb,var(--aw-s1),transparent_70%)] backdrop-blur-md hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_40%)] hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_90%)] active:scale-[0.98] transition-all duration-200 group/link shadow-sm hover:shadow-[0_0_14px_-4px_color-mix(in_srgb,var(--aw-accent)_20%,transparent)]">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5">{link.site.toLowerCase().includes('youtube') ? <Youtube size={16} className="text-white group-hover/link:text-[var(--aw-accent)] transition-colors duration-150" /> : <ExternalLink size={14} className="text-white group-hover/link:text-[var(--aw-accent)] transition-colors duration-150" />}</div>
                                <div className="flex flex-col"><span className="text-[11px] font-bold text-white tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>{link.site}</span> <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 group-hover/link:text-[var(--aw-accent)] transition-colors mt-0.5">Watch Now</span></div>
                              </a>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

      </motion.div>

      <AnimatePresence>
        {isBookmarkModalOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsBookmarkModalOpen(false)}
            />
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              className="aw-material-modal relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[672px] flex-col overflow-hidden rounded-[24px] pointer-events-auto"
              style={{ fontFamily: 'var(--aw-font-body)', background: 'var(--app-bg)' }}
              initial={{ y: 24, scale: 0.93, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="aw-material-modal-header relative h-[218px] flex-shrink-0 overflow-hidden rounded-t-[24px] border-b border-white/[0.08] sm:h-[224px]">
                <motion.img
                  src={data?.bannerImage || data?.coverImage?.extraLarge || data?.coverImage?.large}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  initial={{ scale: 1.06, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.62 }}
                  exit={{ scale: 1.03, opacity: 0 }}
                  transition={{ duration: 0.38, ease: 'easeOut' }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.12), transparent 28%), linear-gradient(90deg, rgba(4,4,7,0.96) 0%, rgba(4,4,7,0.82) 37%, rgba(4,4,7,0.32) 70%, rgba(4,4,7,0.18) 100%), linear-gradient(0deg, rgba(8,8,12,0.98) 0%, rgba(8,8,12,0.42) 45%, rgba(8,8,12,0.12) 100%)'
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <motion.button
                  type="button"
                  onClick={() => setIsBookmarkModalOpen(false)}
                  whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 outline-none transition-colors hover:text-white"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  aria-label="Close list editor"
                >
                  <X size={16} strokeWidth={2.5} />
                </motion.button>
                <div className="absolute inset-x-5 bottom-6 flex items-end gap-5 sm:inset-x-6">
                  <motion.div
                    className="relative hidden h-[142px] w-[98px] flex-shrink-0 overflow-hidden rounded-[18px] border border-white/[0.14] bg-white/[0.08] p-1 shadow-[0_22px_46px_-18px_rgba(0,0,0,0.9)] sm:block"
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 280, delay: 0.04 }}
                  >
                    <img
                      src={data?.coverImage?.large || data?.coverImage?.extraLarge}
                      alt={displayTitle}
                      className="h-full w-full rounded-[14px] object-cover"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" />
                  </motion.div>
                  <motion.div
                    className="flex min-h-[120px] min-w-0 flex-1 flex-col items-start justify-center pb-0.5 text-left sm:pb-1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.24, ease: 'easeOut', delay: 0.06 }}
                  >
                    {animeLogo ? (
                      <motion.img
                        src={animeLogo}
                        alt={displayTitle}
                        className="max-h-[76px] max-w-[430px] object-contain object-left drop-shadow-[0_8px_24px_rgba(0,0,0,0.95)] sm:max-h-[92px]"
                        draggable={false}
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 260, delay: 0.08 }}
                      />
                    ) : (
                      <motion.div
                        className="h-[76px] w-[280px] max-w-full overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.035]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
                          animate={{ x: ['-120%', '260%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </motion.div>
                    )}
                    
                  </motion.div>
                </div>
              </div>

              <motion.div
                className="grid flex-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3 aw-scrollbar"
                style={{ scrollbarGutter: 'stable' }}
                variants={bookmarkModalFormVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.label variants={bookmarkModalFieldVariants} className="relative z-30 flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Activity size={13} /> Status</span>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setBookmarkDateMenu(null);
                      setIsBookmarkStatusMenuOpen(open => !open);
                    }}
                    whileHover={{ y: -1, borderColor: 'rgba(255,255,255,0.18)' }}
                    whileTap={{ scale: 0.985 }}
                    className="aw-material-control relative flex h-11 items-center justify-between rounded-[14px] px-3.5 text-left text-sm font-black text-white outline-none"
                  >
                    <span>{bookmarkStatusOptions.find(option => option.value === bookmarkForm.status)?.label || 'Watching'}</span>
                    <motion.span animate={{ rotate: isBookmarkStatusMenuOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 360, damping: 24 }}>
                      <ChevronDown size={16} className="text-white/65" />
                    </motion.span>
                  </motion.button>
                  <AnimatePresence>
                    {isBookmarkStatusMenuOpen && (
                      <motion.div
                        className="aw-material-menu absolute left-0 right-0 top-[calc(100%+8px)] z-[80] overflow-hidden rounded-[16px] p-1.5"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                      >
                        {bookmarkStatusOptions.map((option) => {
                          const active = bookmarkForm.status === option.value;
                          return (
                            <motion.button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setBookmarkForm(prev => ({ ...prev, status: option.value }));
                                setIsBookmarkStatusMenuOpen(false);
                              }}
                              whileHover={{ x: 3, backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255,255,255,0.065)' }}
                              whileTap={{ scale: 0.98 }}
                              className={`flex h-9 w-full items-center justify-between rounded-[11px] px-3 text-[13px] font-bold transition-colors ${active ? 'text-white' : 'text-zinc-300'}`}
                              style={{ background: active ? 'var(--app-accent-muted)' : 'transparent' }}
                            >
                              <span>{option.label}</span>
                              {active && <Check size={14} className="text-[var(--aw-accent)]" strokeWidth={3} />}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Star size={13} className="text-yellow-300" /> Score</span>
                  <motion.div className="aw-material-control flex h-11 items-center rounded-[14px] px-3.5 focus-within:border-[var(--aw-accent)]" whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={bookmarkForm.score}
                      onChange={(e) => setBookmarkForm(prev => ({ ...prev, score: e.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs font-black text-zinc-500">/ 10</span>
                  </motion.div>
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Play size={13} className="text-[var(--aw-accent)]" /> Episode Progress</span>
                  <motion.div className="aw-material-control flex h-11 items-center rounded-[14px] px-3.5 focus-within:border-[var(--aw-accent)]" whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                    <input
                      type="number"
                      min="0"
                      max={data?.episodes || 999}
                      value={bookmarkForm.episodeProgress}
                      onChange={(e) => setBookmarkForm(prev => ({ ...prev, episodeProgress: e.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs font-black text-zinc-500">/ {data?.episodes || 999}</span>
                  </motion.div>
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className={`relative flex flex-col gap-2 ${bookmarkDateMenu === 'start' ? 'z-40' : 'z-10'}`}>
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Calendar size={13} /> Start Date</span>
                  <BookmarkDateField
                    value={bookmarkForm.startDate}
                    isOpen={bookmarkDateMenu === 'start'}
                    visibleMonth={bookmarkCalendarMonth}
                    setVisibleMonth={setBookmarkCalendarMonth}
                    onChange={(value) => setBookmarkForm(prev => ({ ...prev, startDate: value }))}
                    onToggle={() => {
                      setIsBookmarkStatusMenuOpen(false);
                      setBookmarkDateMenu(current => current === 'start' ? null : 'start');
                    }}
                    onClose={() => setBookmarkDateMenu(null)}
                  />
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className={`relative flex flex-col gap-2 ${bookmarkDateMenu === 'finish' ? 'z-40' : 'z-10'}`}>
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><CalendarDays size={13} /> Finish Date</span>
                  <BookmarkDateField
                    value={bookmarkForm.finishDate}
                    isOpen={bookmarkDateMenu === 'finish'}
                    visibleMonth={bookmarkCalendarMonth}
                    setVisibleMonth={setBookmarkCalendarMonth}
                    onChange={(value) => setBookmarkForm(prev => ({ ...prev, finishDate: value }))}
                    onToggle={() => {
                      setIsBookmarkStatusMenuOpen(false);
                      setBookmarkDateMenu(current => current === 'finish' ? null : 'finish');
                    }}
                    onClose={() => setBookmarkDateMenu(null)}
                  />
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Clock size={13} /> Total Rewatches</span>
                  <motion.div className="aw-material-control flex h-11 items-center rounded-[14px] px-3.5 focus-within:border-[var(--aw-accent)]" whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
                    <input
                      type="number"
                      min="0"
                      value={bookmarkForm.totalRewatches}
                      onChange={(e) => setBookmarkForm(prev => ({ ...prev, totalRewatches: e.target.value }))}
                      className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </motion.div>
                </motion.label>

                <motion.label variants={bookmarkModalFieldVariants} className="flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
                  <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400"><Info size={13} /> Notes</span>
                  <motion.div className="aw-material-control rounded-[14px] focus-within:border-[var(--aw-accent)]" whileHover={{ y: -1 }} whileTap={{ scale: 0.995 }}>
                    <textarea
                      value={bookmarkForm.notes}
                      onChange={(e) => setBookmarkForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Share your thoughts..."
                      className="min-h-[72px] w-full resize-none bg-transparent px-3.5 py-3 text-sm font-semibold text-white outline-none placeholder:text-zinc-600"
                    />
                  </motion.div>
                </motion.label>

                <motion.div
                  variants={bookmarkModalFieldVariants}
                  className="aw-material-control relative overflow-hidden rounded-[16px] p-4 sm:col-span-2 lg:col-span-3"
                  whileHover={{ y: -1 }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-zinc-400">
                      <ExternalLink size={13} /> Update Targets
                    </div>
                    <span
                      className="rounded-full border bg-[var(--aw-accent)]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[var(--aw-accent)]"
                      style={{ borderColor: 'color-mix(in srgb, var(--aw-accent) 32%, transparent)' }}
                    >
                      {activeBookmarkTargetCount} Active
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: 'anikage', label: 'Anikage', active: bookmarkUpdateTargets.anikage, color: 'var(--aw-accent)' },
                      { id: 'anilist', label: 'AniList', active: bookmarkUpdateTargets.anilist, color: '#38bdf8' },
                      { id: 'myanimelist', label: 'MyAnimeList', active: bookmarkUpdateTargets.myanimelist, color: '#9ca3af' },
                    ].map((target) => (
                      <motion.button
                        key={target.label}
                        type="button"
                        onClick={() => setBookmarkUpdateTargets(prev => ({ ...prev, [target.id]: !prev[target.id as keyof typeof prev] }))}
                        className={`aw-material-control flex h-10 items-center justify-between rounded-[12px] px-3 text-xs font-bold outline-none ${target.active ? 'text-white/90' : 'text-zinc-500'}`}
                        whileHover={{ y: -1, scale: 1.01 }}
                        whileTap={{ scale: 0.985 }}
                        animate={{ opacity: target.active ? 1 : 0.7 }}
                      >
                        <span className="flex items-center gap-2">
                          <motion.span
                            className="flex h-5 w-5 items-center justify-center rounded-[7px] border transition-colors duration-200"
                            style={{
                              background: target.active ? `color-mix(in srgb, ${target.color} 18%, transparent)` : 'rgba(255,255,255,0.035)',
                              borderColor: target.active ? `color-mix(in srgb, ${target.color} 42%, transparent)` : 'rgba(255,255,255,0.08)',
                              color: target.active ? target.color : 'rgba(255,255,255,0.26)',
                            }}
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              {target.active ? (
                                <motion.span key="checked" initial={{ scale: 0.55, opacity: 0, rotate: -45 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.55, opacity: 0, rotate: 45 }} transition={{ type: 'spring', stiffness: 420, damping: 24 }}>
                                  <Check size={13} strokeWidth={3} />
                                </motion.span>
                              ) : (
                                <motion.span key="unchecked" initial={{ scale: 0.55, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.55, opacity: 0 }} transition={{ duration: 0.12 }}>
                                  <Minus size={12} strokeWidth={3} />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </motion.span>
                          {target.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </motion.div>

              <motion.div
                className="aw-material-modal-header flex flex-shrink-0 items-center justify-between border-t border-white/[0.08] p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22, ease: 'easeOut', delay: 0.12 }}
              >
                <motion.button
                  type="button"
                  onClick={handleBookmarkDelete}
                  disabled={!bookmarked || isSavingBookmark}
                  whileHover={!bookmarked || isSavingBookmark ? undefined : { scale: 1.02, backgroundColor: 'rgba(239,68,68,0.18)' }}
                  whileTap={!bookmarked || isSavingBookmark ? undefined : { scale: 0.97 }}
                  className="flex h-10 items-center gap-2 rounded-[12px] border border-red-500/25 bg-red-500/10 px-4 text-sm font-black text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={15} /> Delete
                </motion.button>
                <div className="flex items-center gap-3">
                  <motion.button
                    type="button"
                    onClick={() => setIsBookmarkModalOpen(false)}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.97 }}
                    className="h-10 rounded-[12px] border border-white/[0.08] bg-white/[0.06] px-4 text-sm font-black text-zinc-200 transition-colors hover:bg-white/[0.1]"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleBookmarkSave}
                    disabled={isSavingBookmark}
                    whileHover={isSavingBookmark ? undefined : { scale: 1.02 }}
                    whileTap={isSavingBookmark ? undefined : { scale: 0.97 }}
                    className="flex h-10 items-center gap-2 rounded-[12px] bg-[var(--aw-accent)] px-5 text-sm font-black text-black shadow-[0_10px_28px_-18px_var(--aw-accent)] transition-colors disabled:opacity-60"
                  >
                    {isSavingBookmark ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                    Save
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTrailerOpen && trailerEmbedUrl && (
          <motion.div
            className="trailer-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsTrailerOpen(false)}
          >
            <motion.div
              className="aw-material-modal trailer-modal-content"
              style={{ fontFamily: 'var(--aw-font-body)', background: 'var(--app-bg)' }}
              initial={{ y: 24, scale: 0.93, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 16, scale: 0.94, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320, mass: 0.9 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="aw-material-modal-header trailer-header">
                <div className="trailer-header-title">
                  <div className="aw-label trailer-header-kicker">
                    <Youtube size={14} />
                    Trailer
                  </div>
                  <h2 className="truncate text-base font-bold uppercase text-white sm:text-lg md:text-xl" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    {displayTitle}
                  </h2>
                </div>
                <motion.button
                  type="button"
                  onClick={() => setIsTrailerOpen(false)}
                  className="trailer-close-btn"
                  aria-label="Close trailer"
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={20} />
                </motion.button>
              </div>
              <div className="trailer-video-wrapper">
                <iframe
                  src={trailerEmbedUrl}
                  title={`${displayTitle} trailer`}
                  referrerPolicy="strict-origin-when-cross-origin"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover Image Lightbox */}
      <AnimatePresence>
        {isCoverOpen && (
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCoverOpen(false)}
          >
            <motion.div
              className="relative"
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={data?.coverImage?.extraLarge || data?.coverImage?.large}
                alt={displayTitle}
                className="max-h-[88vh] max-w-[90vw] rounded-[20px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.8)] border border-white/10 object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimeDetailV2;
/* --- END OF FILE AnimeDetailV2.tsx --- */
