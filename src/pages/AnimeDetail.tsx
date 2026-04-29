import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ChevronRight, Star, Loader2, Bookmark, BookmarkCheck, Languages,
  Info, ArrowDownUp, Youtube, Clock,
  Users, ExternalLink, TrendingUp, Heart,
  Calendar, Library, Play, Film, Tv
} from 'lucide-react';

import { readBookmarks, toggleBookmark } from '../utils/bookmarks';
import {
  AnimeWatchProviderPayload,
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  fetchAnimeInfo,
  getEpisodeSlug,
  getProviderEpisodes,
  getPreferredAnimeProvider,
} from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

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

  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* ═══════════════════════════════════════
     ENTRANCE ANIMATIONS
     ═══════════════════════════════════════ */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.92); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes popIn {
    0%   { opacity: 0; transform: scale(0.8) translateY(20px); }
    70%  { transform: scale(1.03) translateY(-2px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes staggerFadeIn {
    from { opacity: 0; transform: translateY(16px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .anim-fade-in-up {
    animation: fadeInUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-scale-in {
    animation: scaleIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-slide-left {
    animation: slideInLeft 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-slide-right {
    animation: slideInRight 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .anim-pop-in {
    animation: popIn 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }

  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.10s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.20s; }
  .stagger-5 { animation-delay: 0.25s; }
  .stagger-6 { animation-delay: 0.30s; }
  .stagger-7 { animation-delay: 0.35s; }
  .stagger-8 { animation-delay: 0.40s; }

  /* ═══════════════════════════════════════
     HOVER & INTERACTION PHYSICS
     ═══════════════════════════════════════ */
  .hover-lift {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.4s ease,
                border-color 0.3s ease,
                background 0.3s ease;
  }
  .hover-lift:hover {
    transform: translateY(-6px) scale(1.01);
    box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5);
  }
  .hover-lift:active {
    transform: translateY(-2px) scale(0.98);
    transition-duration: 0.1s;
  }

  .hover-glow {
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .hover-glow:hover {
    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.6);
    border-color: var(--aw-accent-dim);
  }

  .hover-scale {
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .hover-scale:hover {
    transform: scale(1.08);
  }

  .press-squish {
    transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .press-squish:active {
    transform: scale(0.93);
  }

  /* ═══════════════════════════════════════
     EPISODE CARD PHYSICS
     ═══════════════════════════════════════ */
  .episode-card {
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    transform-origin: left center;
  }
  .episode-card:hover {
    transform: translateX(8px) translateY(-2px);
    background: color-mix(in srgb, var(--aw-accent), transparent 90%) !important;
    border-color: var(--aw-accent) !important;
    box-shadow: 0 12px 30px -8px rgba(0,0,0,0.4);
  }
  .episode-card:active {
    transform: translateX(4px) scale(0.99);
    transition-duration: 0.1s;
  }
  .episode-card .ep-number {
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .episode-card:hover .ep-number {
    transform: scale(1.2);
    color: var(--aw-accent);
  }
  .episode-card .ep-thumb {
    transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
  }
  .episode-card:hover .ep-thumb {
    transform: scale(1.08);
    opacity: 1;
  }

  /* ═══════════════════════════════════════
     TAB & PILL PHYSICS
     ═══════════════════════════════════════ */
  .pill-tab {
    transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }
  .pill-tab::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--aw-accent);
    opacity: 0;
    transform: scale(0.8);
    border-radius: inherit;
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 0;
  }
  .pill-tab:hover::before {
    opacity: 0.08;
    transform: scale(1);
  }
  .pill-tab:active {
    transform: scale(0.94);
    transition-duration: 0.1s;
  }

  /* ═══════════════════════════════════════
     STAT CARD PHYSICS
     ═══════════════════════════════════════ */
  .stat-card {
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    transform-style: preserve-3d;
    position: relative;
    z-index: 1;
  }
  .stat-card:hover {
    transform: translateY(-4px) scale(1.02);
    border-color: var(--aw-accent) !important;
    background: color-mix(in srgb, var(--aw-accent), transparent 92%) !important;
    box-shadow: 0 15px 35px -10px rgba(0,0,0,0.6);
    z-index: 10;
  }
  .stat-card:hover .stat-icon {
    transform: scale(1.2) rotate(-5deg);
  }
  .stat-icon {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ═══════════════════════════════════════
     GENRE CHIP PHYSICS
     ═══════════════════════════════════════ */
  .genre-chip {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }
  .genre-chip::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--aw-accent);
    opacity: 0;
    transform: translateX(-100%);
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 0;
  }
  .genre-chip:hover::after {
    opacity: 0.1;
    transform: translateX(0);
  }
  .genre-chip:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 8px 20px -8px rgba(0,0,0,0.5);
  }
  .genre-chip:active {
    transform: translateY(-1px) scale(0.97);
  }

  /* ═══════════════════════════════════════
     LIVELY BUTTON PHYSICS (NO-RISE)
     ═══════════════════════════════════════ */
  .aw-btn-primary {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    z-index: 1;
    transform-origin: center;
  }
  .aw-btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    z-index: -1;
    opacity: 0;
    filter: blur(12px);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-btn-primary:hover {
    transform: scale(1.04);
    filter: brightness(1.1);
    letter-spacing: 0.08em;
    z-index: 10;
  }
  .aw-btn-primary:hover::before {
    opacity: 0.6;
    transform: scale(1.1) translateY(4px);
  }
  .aw-btn-primary svg {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-btn-primary:hover svg {
    transform: scale(1.2) translateX(2px) rotate(10deg);
  }
  .aw-btn-primary:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .aw-btn-ghost {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    position: relative;
    z-index: 1;
  }
  .aw-btn-ghost:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 85%) !important;
    border-color: var(--aw-accent) !important;
    color: var(--aw-accent) !important;
    transform: scale(1.04);
    letter-spacing: 0.08em;
    box-shadow: 0 10px 25px -10px rgba(0,0,0,0.5);
    z-index: 10;
  }
  .aw-btn-ghost svg {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-btn-ghost:hover svg {
    transform: scale(1.2) rotate(-10deg);
  }
  .aw-btn-ghost:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .bookmark-btn {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    background: var(--aw-s1);
    border-color: var(--aw-border);
    color: white;
    transform-origin: center;
  }
  .bookmark-btn.is-active {
    background: color-mix(in srgb, var(--aw-accent), transparent 90%);
    border-color: var(--aw-accent);
    color: var(--aw-accent);
  }
  .bookmark-btn:hover {
    background: color-mix(in srgb, var(--aw-accent), transparent 85%) !important;
    border-color: var(--aw-accent) !important;
    color: var(--aw-accent) !important;
    transform: scale(1.1) rotate(5deg);
    border-radius: 18px !important;
    box-shadow: 0 10px 25px -10px rgba(0,0,0,0.5);
  }
  .bookmark-btn svg {
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .bookmark-btn:hover svg {
    transform: scale(1.25) rotate(-15deg);
  }
  .bookmark-btn:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
  }

  /* ═══════════════════════════════════════
     REVIEW CARD PHYSICS
     ═══════════════════════════════════════ */
  .review-card {
    transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    z-index: 1;
  }
  .review-card:hover {
    transform: translateY(-4px) scale(1.01);
    border-color: var(--aw-accent) !important;
    background: color-mix(in srgb, var(--aw-accent), transparent 94%) !important;
    box-shadow: 0 15px 35px -10px rgba(0,0,0,0.4);
    z-index: 10;
  }
  .review-card:hover .review-avatar {
    transform: scale(1.15) rotate(5deg);
    box-shadow: 0 0 0 2px var(--aw-accent);
  }
  .review-avatar {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ═══════════════════════════════════════
     STREAMING LINK PHYSICS
     ═══════════════════════════════════════ */
  .stream-link {
    transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    position: relative;
    z-index: 1;
  }
  .stream-link:hover {
    transform: translateX(10px) scale(1.02);
    border-color: var(--aw-accent) !important;
    background: color-mix(in srgb, var(--aw-accent), transparent 94%) !important;
    box-shadow: 0 10px 25px -8px rgba(0,0,0,0.4);
    z-index: 10;
  }
  .stream-link:hover .stream-icon-box {
    background: var(--aw-accent-dim) !important;
  }
  .stream-link:hover .stream-icon {
    color: var(--aw-accent) !important;
  }
  .stream-link:active {
    transform: translateX(6px) scale(0.98);
  }

  /* ═══════════════════════════════════════
     LOADING STATES
     ═══════════════════════════════════════ */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .aw-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
  }

  @keyframes spinSmooth {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .spin-smooth {
    animation: spinSmooth 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes pulse-ring {
    0%   { transform: scale(0.8); opacity: 0.5; }
    100% { transform: scale(2); opacity: 0; }
  }
  .pulse-ring::before {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--aw-accent);
    animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  /* ═══════════════════════════════════════
     NOISE & BACKGROUND
     ═══════════════════════════════════════ */
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

  /* ═══════════════════════════════════════
     SCROLLBAR
     ═══════════════════════════════════════ */
  .aw-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .aw-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .aw-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  .aw-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }

  /* ═══════════════════════════════════════
     COLLAPSE
     ═══════════════════════════════════════ */
  .aw-collapse-container {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height 0.5s cubic-bezier(0, 1, 0, 1), opacity 0.3s ease;
    margin: 0 -20px;
    padding: 0 20px;
  }
  .aw-collapse-container.expanded {
    max-height: 2000px;
    opacity: 1;
    transition: max-height 0.8s ease-in-out, opacity 0.5s ease;
  }
  .aw-collapse-content {
    padding: 8px 8px 36px 8px;
  }

  /* ═══════════════════════════════════════
     SYNOPSIS
     ═══════════════════════════════════════ */
  .aw-synopsis-container {
    position: relative;
    z-index: 20;
    margin-top: 1.25rem;
    margin-bottom: 2rem;
  }
  .aw-synopsis-text {
    font-family: var(--aw-font-body);
    font-size: 15px;
    font-weight: 400;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.7);
    transition: color 0.3s ease;
  }
  .aw-synopsis-wrapper {
    position: relative;
    overflow: hidden;
    transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .aw-synopsis-toggle {
    margin-top: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--aw-accent);
    cursor: pointer;
    transition: all 0.3s ease;
  }
  .aw-synopsis-toggle:hover {
    opacity: 0.8;
    transform: translateX(4px);
  }

  /* ═══════════════════════════════════════
     ERROR STATE
     ═══════════════════════════════════════ */
  @keyframes errorShake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .error-shake {
    animation: errorShake 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

const NextAiringTimer: React.FC<{ airingAt: number; episode: number; compact?: boolean }> = ({ airingAt, episode, compact }) => {
  const [timeLeft, setTimeLeft] = useState(airingAt * 1000 - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(airingAt * 1000 - Date.now());
    }, 60000); 
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

  return (
    <span>
      {compact ? `Ep ${episode}: ` : `Episode ${episode} in `}
      {timeString}
    </span>
  );
};

const genreToParam = (genre: string) => genre.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const normalizeTitle = (t: string) => {
  if (!t) return '';
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '');
};

const getEpisodeHref = (animeSlugOrId: string | number, provider: string, category: 'sub' | 'dub', episodeId: string) =>
  `/watch/${animeSlugOrId}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(getEpisodeSlug(episodeId))}`;

interface ContinueWatchingData {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string;
  episodeTitle: string;
  episodeNumber: number;
  href: string;
  updatedAt: number;
}

type SortOrder = 'desc' | 'asc';

const getBaseTitle = (title: string) => {
  if (!title) return '';
  let t = title;
  const seasonMatch = t.match(/\b(?:Season|Part|Arc|Chapter|Cour|Act)\s*\d+\b/i);
  if (seasonMatch && seasonMatch.index !== undefined) t = t.substring(0, seasonMatch.index);
  const nthSeasonMatch = t.match(/\b\d+(?:st|nd|rd|th)\s+Season\b/i);
  if (nthSeasonMatch && nthSeasonMatch.index !== undefined) t = t.substring(0, nthSeasonMatch.index);
  const separatorMatch = t.match(/:|\s+-\s+/);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const candidate = t.substring(0, separatorMatch.index).trim();
    if (candidate.length > 2 || !t.includes(' - ')) t = candidate;
    else t = t.split(' - ')[0];
  }
  return t.replace(/\s+(I{1,3}|IV|V|VI{0,3}|IX|X|\d+)$/i, '').trim();
};

const generateTabLabel = (title: string, baseTitle: string, index: number) => {
  return `Season ${index + 1}`;
};

const extractSlug = (episodeId: string) => episodeId.split('/').pop() || episodeId;

const formatNumber = (num?: number) => {
  if (num === undefined || num === null) return '?';
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

const formatEpisodeDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsedDate);
};

const AnimeDetail: React.FC = () => {
  const { user } = useAuth();
  const { animeId: urlSlug } = useParams<{ animeId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any | null>(null);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [provider, setProvider] = useState('kiwi');
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');

  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [savedBookmarkId, setSavedBookmarkId] = useState<string | null>(null);
  const isSyncingBookmark = React.useRef(false);
  const [watchProgress, setWatchProgress] = useState<ContinueWatchingData | null>(null);

  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<SortOrder>('desc');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [topStatsCollapsed, setTopStatsCollapsed] = useState(false);
  const [reviewsCollapsed, setReviewsCollapsed] = useState(false);
  const [streamingCollapsed, setStreamingCollapsed] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const resolvedSlug = useMemo(() => {
    if (urlSlug && Number.isNaN(Number(urlSlug))) return urlSlug;
    if (data) return createSlug(data.title?.english || data.title?.romaji || data.title?.native || '');
    return '';
  }, [urlSlug, data]);

  const normalizedRelations = useMemo(() => {
    if (!data?.relations) return [];
    if (Array.isArray(data.relations)) return data.relations;
    if (Array.isArray(data.relations.edges)) {
      return data.relations.edges.map((edge: any) => ({
        ...edge.node,
        relationType: edge.relationType
      }));
    }
    return [];
  }, [data]);

  const streamingLinks = useMemo(() => {
    return data?.externalLinks?.filter((link: any) => link.type === 'STREAMING') || [];
  }, [data]);

  const relatedSeasons = useMemo(() => {
    return normalizedRelations.filter((r: any) => {
      if (r.type && r.type !== 'ANIME') return false;
      const fmt = r.format?.toUpperCase();
      if (fmt === 'MUSIC' || fmt === 'MANGA' || fmt === 'NOVEL') return false;
      return true;
    });
  }, [normalizedRelations]);

  const [navTabs, setNavTabs] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const buildSeasons = async () => {
      if (!data) return;

      const allowedRelations = ['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'];
      const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
      const currentTitle = data.title?.english || data.title?.romaji || data.title?.native || '?';
      const baseTitle = getBaseTitle(currentTitle);

      const seenIds = new Set<number>([data.id]);
      const tabs: any[] = [{
        id: data.id,
        title: currentTitle,
        format: data.format,
        active: true,
        slug: resolvedSlug,
        displayLabel: '',
      }];

      let queue = [data];
      let depth = 0;
      const MAX_DEPTH = 3;
      const MAX_TOTAL = 15;

      while (queue.length > 0 && depth < MAX_DEPTH && tabs.length < MAX_TOTAL) {
        const nextQueue: any[] = [];
        const idsToFetch: number[] = [];

        queue.forEach(item => {
          const relations = Array.isArray(item.relations) ? item.relations : item.relations?.edges?.map((e: any) => ({ ...e.node, relationType: e.relationType })) || [];
          relations.forEach((rel: any) => {
            if (
              rel?.type === 'ANIME' &&
              allowedRelations.includes(rel.relationType) &&
              !excludedFormats.includes(rel.format) &&
              !seenIds.has(rel.id)
            ) {
              idsToFetch.push(rel.id);
              seenIds.add(rel.id);
            }
          });
        });

        if (idsToFetch.length === 0) break;

        const results = await Promise.allSettled(
          idsToFetch.slice(0, 5).map(id => fetchAnimeInfo(id))
        );

        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            tabs.push({
              id: res.value.id,
              title: res.value.title?.english || res.value.title?.romaji || res.value.title?.native || '',
              format: res.value.format,
              active: false,
              slug: String(res.value.id),
              displayLabel: '',
            });
            nextQueue.push(res.value);
          }
        });

        queue = nextQueue;
        depth++;
      }

      if (!isMounted) return;

      tabs.sort((a, b) => a.id - b.id);
      tabs.forEach((tab, idx) => {
        tab.displayLabel = generateTabLabel(tab.title, baseTitle, idx);
      });

      setNavTabs(tabs);
    };

    buildSeasons();
    return () => { isMounted = false; };
  }, [data, resolvedSlug]);

  useEffect(() => {
    const id = 'aw-design-styles-anime-detail';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (!data && !urlSlug) return;
    const syncProgress = async () => {
      try {
        if (user) {
          const { data: dbData, error } = await supabase
            .from('anime_watch_history')
            .select('*')
            .eq('user_id', user.id)
            .or(`anime_id.eq.${data?.idMal || 0},anime_id.eq.${data?.id || 0},anime_id.eq.${urlSlug}`);

          if (!error && dbData && dbData.length > 0) {
            const match = dbData[0];
            setWatchProgress({
              animeId: match.anime_id, episodeId: match.episode_id, animeTitle: match.anime_title,
              animeCover: match.anime_cover, episodeTitle: match.episode_title, episodeNumber: match.episode_number,
              href: match.href, updatedAt: new Date(match.updated_at).getTime()
            });
            return;
          }
        }

        const raw = window.localStorage.getItem('anime-continue-watching');
        if (raw) {
          const entries = JSON.parse(raw);
          const match = (Array.isArray(entries) ? entries : []).find((e: any) =>
            String(e.animeId) === String(data?.idMal) || String(e.animeId) === String(data?.id) || String(e.animeId) === String(urlSlug) || (data?.title?.romaji && e.animeTitle === data.title?.romaji)
          );
          setWatchProgress(match || null);
        }
      } catch (e) { console.warn('Failed to parse watching history', e); }
    };
    syncProgress();
    window.addEventListener('storage', syncProgress); window.addEventListener('focus', syncProgress);
    return () => { window.removeEventListener('storage', syncProgress); window.removeEventListener('focus', syncProgress); };
  }, [data, urlSlug, user]);

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

        const providersMap = epsPayload?.providers || {};
        setEpisodesData(providersMap);

        const availableKeys = Object.keys(providersMap);
        const kiwiKey = availableKeys.find(k => k.toLowerCase().includes('kiwi'));
        const defaultProvider = kiwiKey || getPreferredAnimeProvider(providersMap) || availableKeys[0];

        if (defaultProvider) {
          setProvider(defaultProvider);
          setCategory('sub');
        }

        if (info.id) {
          setLoadingReviews(true);
          try {
            const query = `
              query ($id: Int) {
                Media (id: $id) {
                  reviews (limit: 5, sort: [ID_DESC]) {
                    nodes {
                      id
                      summary
                      rating
                      siteUrl
                      user {
                        name
                        avatar { medium }
                      }
                    }
                  }
                }
              }
            `;
            const reviewRes = await fetch('https://graphql.anilist.co', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, variables: { id: info.id } })
            });
            const reviewJson = await reviewRes.json();
            setReviews(reviewJson.data?.Media?.reviews?.nodes || []);
          } catch (err) {
            console.error('Failed to fetch reviews:', err);
          } finally {
            setLoadingReviews(false);
          }
        }

      } catch (e) {
        console.error('Fetch Error:', e);
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    window.scrollTo(0, 0);
  }, [urlSlug]);

  useEffect(() => {
    const syncBookmarkState = async () => {
      if (isSyncingBookmark.current) return;
      if (!data?.idMal && !data?.id && !urlSlug) { setBookmarked(false); return; }

      let isFound = false;
      let foundId: string | null = null;
      
      const targetIdMal = data?.idMal ? String(data.idMal) : null;
      const targetIdAni = data?.id ? String(data.id) : null;
      const targetIdStr = String(urlSlug);
      const currentSlug = resolvedSlug;
      const normTitle = normalizeTitle(data?.title?.english || data?.title?.romaji || data?.title?.native || '');

      if (user) {
        try {
          const { data: dbData } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id);
          if (dbData) {
            const match = dbData.find(b => 
              (targetIdMal && b.mal_id === targetIdMal) ||
              (targetIdAni && b.mal_id === targetIdAni) ||
              b.mal_id === targetIdStr ||
              (urlSlug && createSlug(b.title) === urlSlug) ||
              (currentSlug && createSlug(b.title) === currentSlug) ||
              (normTitle && normalizeTitle(b.title) === normTitle)
            );
            if (match) {
              isFound = true;
              foundId = match.mal_id;
            }
          }
        } catch { }
      } else {
        const localBookmarks = readBookmarks();
        const match = localBookmarks.find(b => 
          (targetIdMal && String(b.malId) === targetIdMal) ||
          (targetIdAni && String(b.malId) === targetIdAni) ||
          String(b.malId) === targetIdStr ||
          (urlSlug && createSlug(b.title) === urlSlug) ||
          (currentSlug && createSlug(b.title) === currentSlug) ||
          (normTitle && normalizeTitle(b.title) === normTitle)
        );
        if (match) {
          isFound = true;
          foundId = String(match.malId);
        }
      }

      setBookmarked(isFound);
      setSavedBookmarkId(foundId);
    };

    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState); 
    window.addEventListener('focus', syncBookmarkState);
    window.addEventListener('mv_bookmark_updated', syncBookmarkState);
    return () => { 
      window.removeEventListener('storage', syncBookmarkState); 
      window.removeEventListener('focus', syncBookmarkState); 
      window.removeEventListener('mv_bookmark_updated', syncBookmarkState);
    };
  }, [data, user, urlSlug, resolvedSlug]);

  useEffect(() => {
    if (!provider || !episodesData[provider]) return;
    const hasCategoryEpisodes = (episodesData[provider].episodes?.[category]?.length || 0) > 0;
    if (!hasCategoryEpisodes) setCategory((episodesData[provider].episodes?.sub?.length || 0) > 0 ? 'sub' : 'dub');
  }, [category, episodesData, provider]);

  const providerEpisodes = useMemo(() => getProviderEpisodes({ providers: episodesData }, provider, category), [category, episodesData, provider]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!data || isSyncingBookmark.current) return;

    const previousState = bookmarked;
    setBookmarked(!previousState);

    isSyncingBookmark.current = true;

    try {
      const targetId = savedBookmarkId || String(data.idMal || data.id);
      const title = data.title?.english || data.title?.romaji || data.title?.native || 'Unknown Title';
      const coverUrl = data.coverImage?.extraLarge || data.coverImage?.large || data.coverImage;

      if (user) {
        if (previousState) {
          const { error } = await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('mal_id', targetId);
          if (error) {
            console.error('Failed to remove bookmark:', error);
            setBookmarked(previousState);
          } else {
            setSavedBookmarkId(null);
          }
        } else {
          const { error } = await supabase.from('anime_bookmarks').insert({
            user_id: user.id, mal_id: targetId, title: title, cover: coverUrl, type: data.format || 'Anime',
            status: data.status || 'Unknown', score: data.averageScore || null, author: data.studios?.[0]?.name || null
          });
          if (error) {
            console.error('Failed to add bookmark:', error);
            setBookmarked(previousState); 
          } else {
            setSavedBookmarkId(targetId);
          }
        }
      } else {
        const numericId = Number(targetId) || 0;
        const result = toggleBookmark({ malId: numericId, title, cover: coverUrl, type: data.format || 'Anime', status: data.status, score: data.averageScore, author: data.studios?.[0]?.name });
        setBookmarked(result.bookmarked);
        setSavedBookmarkId(result.bookmarked ? String(numericId) : null);
      }
    } catch (err) {
      console.error('Bookmark toggle exploded:', err);
      setBookmarked(previousState); 
    } finally {
      isSyncingBookmark.current = false;
      window.dispatchEvent(new Event('mv_bookmark_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  }, [data, user, bookmarked, savedBookmarkId]);


  const sortedEpisodes = [...providerEpisodes].sort((a, b) => {
    const aVal = a.number || 0;
    const bVal = b.number || 0;
    return episodeSortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const visibleEpisodes = sortedEpisodes.filter((ep) => String(ep.number).includes(episodeSearchQuery.trim()) || (ep.title && ep.title.toLowerCase().includes(episodeSearchQuery.trim().toLowerCase())));

  const handleWatchFirst = () => {
    if (!providerEpisodes.length || !provider) return;
    setIsLinking(true);
    const sortedAsc = [...providerEpisodes].sort((a, b) => (a.number || 0) - (b.number || 0));
    navigate(getEpisodeHref(resolvedSlug, provider, category, sortedAsc[0].id));
  };

  const handleWatchLatest = () => {
    if (!providerEpisodes.length || !provider) return;
    setIsLinking(true);
    const sortedDesc = [...providerEpisodes].sort((a, b) => (b.number || 0) - (a.number || 0));
    navigate(getEpisodeHref(resolvedSlug, provider, category, sortedDesc[0].id));
  };

  const statsUrl = data?.id ? `https://anilist.co/anime/${data.id}/stats` : undefined;
  const displayTitle = data?.title?.english || data?.title?.romaji || data?.title?.native || '?';

  if (loading) {
    return (
      <div className="aw-root min-h-screen flex flex-col p-8 anim-fade-in-up">
        {/* Loading Screen Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-sm font-medium w-fit relative z-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="w-12 h-12 border-[3px] border-t-transparent rounded-full spin-smooth" style={{ borderColor: 'var(--aw-accent)', borderTopColor: 'transparent' }} />
            <div className="absolute inset-0 rounded-full pulse-ring" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || loadFailed) {
    return (
      <div className="aw-root aw-noise min-h-screen flex flex-col p-8 anim-fade-in-up">
        {/* Error Screen Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-sm font-medium w-fit relative z-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
          <div className="text-xl font-bold uppercase tracking-[0.16em]" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {loadFailed ? 'Anime data failed to load' : 'Anime not found'}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full px-6 py-3 transition-colors border aw-btn-ghost press-squish"
            style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-display)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="aw-root aw-noise relative min-h-screen text-white pb-20 selection:bg-[var(--aw-accent-muted)]">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: '1px solid var(--aw-border)', background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(20px)' }} />

      <div className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-8 anim-fade-in-up">
        
        {/* Main Content Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-sm font-medium w-fit relative z-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* --- Top Section: Cover & Info --- */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
          <div className="w-full md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 cover-wrap anim-slide-left">
            <div className="relative aspect-[2/3] rounded-[16px] overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }}>
              <img src={data.coverImage?.extraLarge || data.coverImage?.large} className="w-full h-full object-cover" alt={displayTitle} />
              {data.bannerImage && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-2">
            <h1 className="text-4xl md:text-6xl lg:text-[4rem] font-black uppercase tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3 anim-fade-in-up" style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em', animationDelay: '0.1s' }}>
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider mb-6 anim-fade-in-up" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)', animationDelay: '0.15s' }}>
              <span className="text-white flex items-center gap-1.5 hover-scale cursor-default"><Film size={12} style={{ color: 'var(--aw-accent)' }} /> {data.studios?.[0]?.name || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <span style={{ color: 'var(--aw-accent)' }} className="hover-scale cursor-default">{data.status || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <div className="flex items-center gap-1 text-white hover-scale cursor-default">
                <Star size={12} fill="currentColor" style={{ color: 'var(--aw-accent)' }} />
                {data.averageScore ?? '?'}%
              </div>
            </div>

            <div className="flex flex-wrap gap-2 anim-fade-in-up" style={{ animationDelay: '0.2s' }}>
              {data.genres?.map((g: string, i: number) => (
                <span
                  key={g}
                  onClick={() => navigate(`/browse?genres=${genreToParam(g)}`)}
                  className={`genre-chip px-3 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-widest cursor-pointer stagger-${Math.min(i + 1, 8)}`}
                  style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                >
                  {g}
                </span>
              ))}
            </div>

            <div className="aw-synopsis-container anim-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <div
                className="aw-synopsis-wrapper"
                style={{ maxHeight: synopsisExpanded ? '600px' : '78px' }}
              >
                <p className={`aw-synopsis-text ${synopsisExpanded ? '' : 'clamped'}`} style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: synopsisExpanded ? 'unset' : 3 }}>
                  {data.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available.'}
                </p>
              </div>

              <button
                className="aw-synopsis-toggle"
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
              >
                <ChevronRight
                  size={14}
                  className={synopsisExpanded ? 'rotate-[-90deg]' : 'rotate-90'}
                />
                <span>{synopsisExpanded ? 'Hide Details' : 'Read More'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {watchProgress ? (
                <>
                  <button
                    onClick={() => { setIsLinking(true); navigate(watchProgress.href); }}
                    disabled={isLinking}
                    className="aw-btn-primary group relative overflow-hidden press-squish flex h-[48px] items-center gap-2 rounded-[14px] px-6 text-sm font-bold disabled:opacity-60"
                    style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                    <span className="relative z-10 flex items-center gap-2">
                      {isLinking ? <Loader2 className="spin-smooth" size={16} /> : <Play size={15} fill="currentColor" />}
                      Resume {watchProgress.episodeNumber ? `Ep. ${watchProgress.episodeNumber}` : 'Watching'}
                    </span>
                  </button>
                  <div className={`flex items-center gap-3 transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                    <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="aw-btn-ghost group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-[14px] border px-5 text-sm font-bold" style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span className="relative z-10">First</span>
                    </button>
                    <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="aw-btn-ghost group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-[14px] border px-5 text-sm font-bold" style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <span className="relative z-10">Latest</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className={`flex items-center gap-3 transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="aw-btn-primary group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-[14px] border px-6 text-sm font-bold disabled:opacity-60" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Play size={15} fill="currentColor" />
                      {isLinking ? <Loader2 className="spin-smooth" size={15} /> : 'Watch First'}
                    </span>
                  </button>
                  <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="aw-btn-ghost group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-[14px] border px-6 text-sm font-bold disabled:opacity-60" style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Tv size={15} />
                      {isLinking ? <Loader2 className="spin-smooth" size={15} /> : 'Watch Latest'}
                    </span>
                  </button>
                </div>
              )}

              {/* Watch Trailer Button */}
              {data.trailer?.site === 'youtube' && data.trailer?.id && (
                <a
                  href={`https://www.youtube.com/watch?v=${data.trailer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aw-btn-ghost group relative overflow-hidden press-squish flex h-[48px] items-center justify-center rounded-[14px] border px-6 text-sm font-bold"
                  style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Youtube size={18} style={{ color: 'var(--aw-accent)' }} />
                    Trailer
                  </span>
                </a>
              )}

              <button
                type="button"
                onClick={handleBookmarkToggle}
                style={{ 
                  background: 'var(--aw-s1)', 
                  borderColor: bookmarked ? 'var(--aw-accent)' : 'var(--aw-border)',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                className={`group relative flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-[14px] border 
                  hover:scale-[1.05] active:scale-[0.96] active:duration-100
                  ${bookmarked ? 'text-[var(--aw-accent)]' : 'text-white'}
                `}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--aw-accent), transparent 85%)';
                  e.currentTarget.style.borderColor = 'var(--aw-accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--aw-s1)';
                  e.currentTarget.style.borderColor = bookmarked ? 'var(--aw-accent)' : 'var(--aw-border)';
                }}
              >
                <span className="relative z-10 flex items-center justify-center transition-all duration-300 group-hover:scale-110">
                  {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </span>
              </button>

            </div>
          </div>
        </div>

        {/* --- Bottom Section: Layout Grid --- */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-12">

          {/* LEFT COL: Content (Tabs, Episodes, Comments) */}
          <div className="space-y-10 min-w-0">
            <div className="flex flex-col min-w-0">

              {/* Seasons Navigation Pill Tabs */}
              {navTabs.length > 1 && (
                <div className="mb-10">
                  <div className="mb-4 flex items-end justify-between border-b pb-3" style={{ borderColor: 'var(--aw-border)' }}>
                    <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Related Seasons</h3>
                  </div>
                  <div className="flex overflow-x-auto gap-3 pb-2 pt-2 aw-scrollbar">
                    {navTabs.map((tab, i) => (
                      <button
                        key={tab.id}
                        onClick={() => !tab.active && navigate(`/watch/${tab.slug}`)}
                        title={tab.title}
                        className={`pill-tab px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap border anim-pop-in stagger-${Math.min(i + 1, 8)}`}
                        style={tab.active
                          ? { background: 'color-mix(in srgb, var(--aw-accent), transparent 85%)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'transparent', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                      >
                        {tab.displayLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* EPISODES SECTION */}
              <div className="mb-6 flex items-end justify-between border-b pb-3" style={{ borderColor: 'var(--aw-border)' }}>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</h3>
              </div>

              <div className="mb-6 flex flex-col gap-4 px-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ONLY SUB/DUB TOGGLES REMAIN - PROVIDERS REMOVED */}
                    {(['sub', 'dub'] as const).map((audioMode) => (
                      <button
                        key={audioMode}
                        type="button"
                        onClick={() => setCategory(audioMode)}
                        disabled={(episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0}
                        className="pill-tab rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-35"
                        style={category === audioMode
                          ? { background: 'color-mix(in srgb, var(--aw-accent), transparent 85%)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'transparent', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                      >
                        {audioMode}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      className="aw-btn-ghost press-squish inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
                      style={{ background: 'transparent', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }}
                    >
                      <ArrowDownUp size={12} className="transition-transform duration-300" />{episodeSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[800px] overflow-y-auto overflow-x-hidden pr-2 aw-scrollbar">
                <div className="flex flex-col px-2 py-1">
                  {providerEpisodes.length > 0 ? (
                    visibleEpisodes.length > 0 ? (
                      visibleEpisodes.map((episode, index) => (
                        <div
                          key={episode.id}
                          onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))}
                          className={`episode-card group flex items-start gap-4 p-4 rounded-[14px] cursor-pointer border mb-2 mx-1 stagger-${Math.min((index % 8) + 1, 8)} anim-fade-in-up`}
                          style={{ borderColor: 'transparent', background: 'transparent', animationDelay: `${(index % 8) * 0.04}s` }}
                        >
                          <div className="ep-number flex h-[72px] w-6 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-light text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {episode.number || '-'}
                          </div>
                          <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-md ring-white/5" style={{ background: 'var(--aw-card)' }}>
                            <img src={episode.image || data?.coverImage?.large || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${episode.number}`} className="ep-thumb h-full w-full object-cover opacity-80" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />
                            {episode.filler && (
                              <div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white z-10" style={{ fontFamily: 'var(--aw-font-display)' }}>Filler</div>
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <div className="flex items-start justify-between gap-4">
                              <h4 className="text-sm font-bold text-white md:text-base line-clamp-1" style={{ fontFamily: 'var(--aw-font-display)' }}>{episode.title || `Episode ${episode.number || '?'}`}</h4>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs md:text-sm transition-colors" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
                              {episode.description || `Episode ${episode.number} of ${displayTitle}.`}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (<div className="p-12 text-center text-xs font-semibold uppercase tracking-[0.22em] text-zinc-600" style={{ fontFamily: 'var(--aw-font-display)' }}>No episodes match this search</div>)
                  ) : (
                    <div className="p-12 text-center rounded-[16px] border mt-4" style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}>
                      <div className="aw-label">No Episodes found</div>
                      <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>We couldn't find available episodes for this anime</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 transition-colors duration-300">
              <CommentSection pageType="anime" pageId={urlSlug || ''} />
            </div>
          </div>

          {/* RIGHT COL: Stats */}
          <div className="hidden lg:flex flex-col justify-start pb-2 w-[320px] flex-shrink-0">
            <div className="flex items-center justify-between mb-5 select-none cursor-pointer group" onClick={() => setTopStatsCollapsed(!topStatsCollapsed)}>
              <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors">
                <Info size={14} style={{ color: 'var(--aw-accent)' }} />
                <span>Statistics</span>
              </div>
              {statsUrl && !topStatsCollapsed && (
                <a
                  href={statsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group/link"
                  style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                >
                  Full stats<ExternalLink size={9} className="opacity-60 group-hover/link:opacity-100 transition-opacity" />
                </a>
              )}
            </div>

            <div className="space-y-4">
              <div className={`aw-collapse-container ${!topStatsCollapsed ? 'expanded' : ''}`}>
                <div className="aw-collapse-content grid grid-cols-2 gap-3">
                  <div className="stat-card hover-lift p-4 rounded-[16px] shadow-lg flex flex-col gap-1" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><TrendingUp size={12} style={{ color: 'var(--aw-accent)' }} className="stat-icon" /> Popular</span>
                    <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>#{data.popularity ?? '?'}</span>
                  </div>
                  <div className="stat-card hover-lift p-4 rounded-[16px] shadow-lg flex flex-col gap-1" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Users size={12} style={{ color: 'var(--aw-accent)' }} className="stat-icon" /> Format</span>
                    <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.format || '?'}</span>
                  </div>
                  <div className="stat-card hover-lift col-span-2 p-4 rounded-[16px] shadow-lg flex flex-col gap-1" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }}>
                    <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Heart size={12} style={{ color: 'var(--aw-accent)' }} className="stat-icon" /> Favourites</span>
                    <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{formatNumber(data.favourites)}</span>
                  </div>

                  {/* General Info integrated here */}
                  <div className="stat-card hover-lift col-span-2 p-4 rounded-[16px] shadow-lg flex flex-col" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }}>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Season</span>
                          <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{[data.season, data.seasonYear].filter(Boolean).join(' ') || '?'}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Library size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Episodes</span>
                          <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.episodes || 'TBA'} {data.duration ? `(${data.duration}m)` : ''}</span>
                        </div>
                      </div>

                      {data.nextAiringEpisode && (
                        <div className="flex items-start gap-3 pt-4 mt-2" style={{ borderTop: '1px solid var(--aw-border)' }}>
                          <Clock size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Next Episode</span>
                            <span className="block text-xs font-bold mt-1" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-body)' }}>
                              <NextAiringTimer airingAt={data.nextAiringEpisode.airingAt} episode={data.nextAiringEpisode.episode} />
                            </span>
                          </div>
                        </div>
                      )}

                      {data.title?.native && (
                        <div className="flex items-start gap-3 pt-4 mt-2" style={{ borderTop: '1px solid var(--aw-border)' }}>
                          <Languages size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Alternative Title</span>
                            <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.title.native}</span>
                          </div>
                        </div>
                      )}

                      <div className="mt-2 flex gap-2 pt-3" style={{ borderTop: '1px solid var(--aw-border)' }}>
                        {data?.id && (
                          <a href={`https://anilist.co/anime/${data.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest group/abtn hover-lift press-squish" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
                            AniList<ExternalLink size={10} className="opacity-60 group-hover/abtn:opacity-100 transition-opacity" />
                          </a>
                        )}
                        {data?.idMal && (
                          <a href={`https://myanimelist.net/anime/${data.idMal}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest group/mbtn hover-lift press-squish" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
                            MAL<ExternalLink size={10} className="opacity-60 group-hover/mbtn:opacity-100 transition-opacity" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reviews Section */}
              {(loadingReviews || reviews.length > 0) && (
                <div className="group mt-6">
                  <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setReviewsCollapsed(!reviewsCollapsed)}>
                    <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors">
                      <Star size={14} style={{ color: 'var(--aw-accent)' }} /> AniList Reviews
                    </div>
                    {data?.id && !reviewsCollapsed && (
                      <a
                        href={`https://anilist.co/anime/${data.id}/reviews`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group/link"
                        style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                      >
                        View More<ExternalLink size={9} className="opacity-60 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    )}
                  </div>

                  <div className={`aw-collapse-container ${!reviewsCollapsed ? 'expanded' : ''}`}>
                    <div className="aw-collapse-content">
                      {loadingReviews ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="animate-spin" size={20} style={{ color: 'var(--aw-accent)' }} />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviews.slice(0, 5).map((review) => (
                            <a
                              key={review.id}
                              href={review.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="review-card block p-4 rounded-[16px] border group/rev"
                              style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <img src={review.user.avatar.medium} alt={review.user.name} className="review-avatar w-6 h-6 rounded-full" />
                                <span className="text-[11px] font-bold text-white tracking-wide group-hover/rev:text-[var(--aw-accent)] transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>{review.user.name}</span>
                                <span className="ml-auto text-[10px] font-bold text-[var(--aw-accent)]">{review.rating}%</span>
                              </div>
                              <p className="text-[11px] leading-relaxed line-clamp-4 italic text-zinc-400 group-hover/rev:text-zinc-300 transition-colors" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                "{review.summary}"
                              </p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Streaming Services Section */}
              {streamingLinks.length > 0 && (
                <div className="group mt-6">
                  <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setStreamingCollapsed(!streamingCollapsed)}>
                    <div className="aw-label flex items-center gap-2 group-hover:text-white transition-colors">
                      <Play size={14} style={{ color: 'var(--aw-accent)' }} /> Available on
                    </div>
                  </div>

                  <div className={`aw-collapse-container ${!streamingCollapsed ? 'expanded' : ''}`}>
                    <div className="aw-collapse-content space-y-2">
                      {streamingLinks.map((link: any, idx: number) => (
                        <a
                          key={`${link.site}-${idx}`}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="stream-link flex items-center gap-3 p-3 rounded-[12px] border group/link"
                          style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
                        >
                          <div className="stream-icon-box w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 transition-colors duration-300">
                            {link.site.toLowerCase().includes('youtube') ? (
                              <Youtube size={16} className="stream-icon text-white transition-colors duration-300" />
                            ) : (
                              <ExternalLink size={14} className="stream-icon text-white transition-colors duration-300" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-white tracking-wide" style={{ fontFamily: 'var(--aw-font-display)' }}>{link.site}</span>
                            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 group-hover/link:text-[var(--aw-accent)] transition-colors">Watch Now</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;