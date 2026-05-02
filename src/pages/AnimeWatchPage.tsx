/* ─── START OF FILE AnimeWatchPage.tsx ────────────────────────────── */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
  FastForward,
  MonitorPlay,
  ArrowDownUp,
  ExternalLink,
  Clock,
  Share2,
  X,
  Copy,
  Check
} from 'lucide-react';

import {
  fetchAnimeInfo,
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  getProviderEpisodes,
  fetchAnimeStreams
} from '../utils/animeApi';
import type { AnimeWatchProviderPayload } from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, isHLSProvider } from '@vidstack/react';
import type { MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

/* ─── Proxy Configuration ───────────────────────────────────────── */
const WORKER_PROXY_URL = "https://proxypipe-production.up.railway.app/";

/* ─── Font & Design Tokens Injection ─────────────────────────────── */
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      rgba(255, 255, 255, 0.08);
    --aw-border-hi:   rgba(255, 255, 255, 0.15);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); overflow-x: hidden; }

  .aw-layout { 
    max-width: 1460px; 
    margin: 0 auto; 
    width: 100%; 
    padding: 24px 16px 60px; 
    gap: 24px; 
    position: relative; 
    z-index: 10; 
    display: grid; 
    grid-template-columns: 1fr; 
    align-items: start;
  }
  .aw-main { 
    min-width: 0; 
    width: 100%; 
    display: grid; 
    grid-template-columns: 100%;
    gap: 24px; 
    position: relative; 
    z-index: 50; 
  }
  .aw-info-panel {
    width: 100%;
    padding: 24px 28px;
    background: var(--aw-s1);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
  }
  .aw-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 15, 0.2) !important;
    backdrop-filter: blur(16px) saturate(120%) !important;
    border: 1px solid var(--aw-border) !important;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8);
    height: fit-content;
  }

  @media (min-width: 1280px) {
    .aw-layout { grid-template-columns: 1fr 380px; gap: 32px; align-items: start; }
    .aw-sidebar { 
      top: 84px; 
      max-height: calc(100vh - 120px); 
    }
  }

  .aw-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .aw-scroll::-webkit-scrollbar-track { background: transparent; }
  .aw-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
  .aw-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  .aw-action-btn { 
    position: relative;
    will-change: transform;
    transition: border-color 0.1s, color 0.1s !important;
  }

  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .aw-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); background-size: 400px 100%; animation: shimmer 1.4s ease infinite; }

  .aw-label { font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase; color: var(--aw-accent); }
  
  .genre-pill { 
    display: inline-flex; align-items: center; gap: 6px; 
    background: transparent; border: 1px solid rgba(255,255,255,0.1); 
    color: rgba(255,255,255,0.6); font-family: var(--aw-font-display); 
    font-size: 11px; font-weight: 600; padding: 6px 14px; 
    border-radius: 100px; transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.1em;
  }
  .genre-pill:hover { 
    border-color: rgba(255,255,255,0.3); 
    color: white; 
  }

  .aw-noise::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 180px; }

  .aw-segment-btn { transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, filter 0.2s; }
  .aw-segment-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .aw-segment-btn[data-active='false']:hover { background: rgba(255,255,255,0.08) !important; color: var(--aw-text) !important; }
  .aw-segment-btn[data-active='true'] { 
    background: color-mix(in srgb, var(--aw-accent) 18%, transparent) !important; 
    color: var(--aw-accent) !important; 
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aw-accent) 50%, transparent), 0 4px 20px -8px color-mix(in srgb, var(--aw-accent) 30%, transparent); 
  }
  .aw-segment-btn[data-active='true']:hover { 
    background: color-mix(in srgb, var(--aw-accent) 25%, transparent) !important; 
    color: var(--aw-text) !important; 
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--aw-accent) 60%, transparent), 0 8px 22px -8px color-mix(in srgb, var(--aw-accent) 40%, transparent); 
    filter: brightness(1.08); 
  }
  .aw-segment-btn:active { transform: scale(0.95); }

  .ep-item { transition: background 0.18s, border-color 0.18s, transform 0.2s; }
  .ep-item:hover .ep-thumb { transform: scale(1.08); }
  .ep-thumb { transition: transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.3s; }

  .ep-item-hover:hover {
    transform: translateX(4px);
    background: rgba(255,255,255,0.04) !important;
  }
  .ep-item-hover:hover .ep-number {
    color: var(--aw-accent) !important;
    transform: scale(1.1);
  }
  .ep-number { transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); }

  .input-glow:focus {
    border-color: color-mix(in srgb, var(--aw-accent) 40%, transparent) !important;
    box-shadow: 0 0 20px -8px var(--aw-accent-glow);
  }
  
  .aw-action-hover { transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .aw-action-hover:hover:not(:disabled) {
    transform: translateY(-3px);
    filter: brightness(1.2);
    box-shadow: 0 12px 30px -10px rgba(0,0,0,0.6);
    background: rgba(255,255,255,0.08) !important;
  }
  .aw-action-hover:active:not(:disabled) {
    transform: translateY(-1px) scale(0.98);
  }

  @keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes epSlideIn { from { opacity: 0; transform: translateX(16px) scale(0.98); } to { opacity: 1; transform: translateX(0) scale(1); } }
  @keyframes skeletonWave { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .anim-fade-in-down { animation: fadeInDown 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .anim-fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
  .ep-slide-in { animation: epSlideIn 0.4s cubic-bezier(0.25, 1, 0.5, 1) both; }
  
  .hover-lift { transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .hover-lift:hover { box-shadow: 0 20px 40px -15px rgba(0,0,0,0.6); }
  .anim-delay-1 { animation-delay: 0.1s; }

  .skeleton-wave {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%);
    background-size: 200% 100%;
    animation: skeletonWave 1.5s ease infinite;
  }

  media-player[data-view-type="video"] {
    --media-brand: var(--aw-accent);
    --media-focus-ring: 0 0 0 3px var(--aw-accent-dim);
    --video-brand: var(--aw-accent);
    --video-font-family: var(--aw-font-body);
  }

  .vds-video-layout {
    --video-brand: var(--aw-accent);
    --video-font-family: var(--aw-font-body);
    --video-controls-bg: linear-gradient(
      to top,
      rgba(7, 7, 12, 0.9),
      rgba(7, 7, 12, 0.3),
      transparent
    ) !important;
    --video-controls-backdrop-filter: blur(12px) saturate(180%);
  }
`;

// ─── Animation Variants ────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.95, filter: 'blur(8px)' },
  show: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 350, damping: 30 } }
};

// ─── Interfaces ────────────────────────────────────────────────────────
interface ProgressData {
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string | null;
  episodeTitle: string;
  episodeNumber: number;
  href: string;
}

interface StreamSource {
  url: string;
  type: string;
  quality: string;
  referer?: string;
}

interface StreamSubtitle {
  file: string;
  label: string;
}

interface StreamThumbnail {
  url?: string;
  file?: string;
}

interface StreamData {
  streams: StreamSource[];
  subtitles?: StreamSubtitle[];
  thumbnails?: string | StreamThumbnail[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

interface AnimeTitle {
  english?: string | null;
  romaji?: string | null;
  native?: string | null;
  userPreferred?: string | null;
}

interface AnimeInfo {
  id: number;
  title?: AnimeTitle;
  description?: string;
  synopsis?: string;
  image?: string;
  coverImage?: { large?: string; extraLarge?: string };
  bannerImage?: string;
  images?: { jpg?: { large_image_url?: string } };
  genres?: string[];
  studios?: string[] | { edges?: Array<{ isMain?: boolean; node?: { name?: string } }> } | null;
  status?: string;
  format?: string;
  averageScore?: number | null;
  idMal?: number | null;
  nextAiringEpisode?: { airingAt?: number; airingTime?: number; timeUntilAiring?: number; episode?: number };
  relations?: { edges?: Array<{ relationType: string; node: any }> };
}

/* ─── Timeline / Slug Helpers ────────────────────────────────────── */
const NextAiringTimer: React.FC<{ data: any; compact?: boolean }> = ({ data, compact }) => {
  const { airingAt, airingTime, timeUntilAiring, episode } = data;

  const targetTime = timeUntilAiring
    ? Date.now() + timeUntilAiring * 1000
    : airingAt
      ? airingAt * 1000
      : airingTime
        ? airingTime * 1000
        : 0;

  const [timeLeft, setTimeLeft] = useState(targetTime - Date.now());

  useEffect(() => {
    if (!targetTime) return;
    setTimeLeft(targetTime - Date.now());
    const interval = setInterval(() => {
      setTimeLeft(targetTime - Date.now());
    }, 60000);
    return () => clearInterval(interval);
  }, [targetTime]);

  if (!targetTime || timeLeft <= 0) return <span>Airing Now / Aired</span>;

  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const m = Math.floor((timeLeft / 1000 / 60) % 60);

  let timeString = '';
  if (d > 0) timeString = `${d}d ${h}h`;
  else if (h > 0) timeString = `${h}h ${m}m`;
  else timeString = `${m}m`;

  return (
    <span>
      {compact ? `Ep ${episode || '?'}: ` : `Episode ${episode || '?'} in `}
      {timeString}
    </span>
  );
};

export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

const extractSlug = (id: string | undefined): string => {
  if (!id) return '1';
  return id.split('/').pop() || id;
};

const getEpisodeHref = (animeSlug: string, provider: string, category: 'sub' | 'dub', episodeId: string) =>
  `/watch/${animeSlug}/${encodeURIComponent(provider)}/${category}/${encodeURIComponent(extractSlug(episodeId))}`;

const formatEpisodeDate = (isoDate?: string) => {
  if (!isoDate) return '?';
  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) return '?';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsedDate);
};

const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai'];

const rankProviders = (providers: string[]) =>
  [...providers].sort((a, b) => {
    const ra = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
    const rb = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
    return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
  });

/* ─── Toggle Component (Redesigned & Smooth) ──────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label
    className="flex items-center gap-2.5 cursor-pointer select-none group"
    onClick={(e) => { e.preventDefault(); onChange(!checked); }}
    style={{ fontFamily: 'var(--aw-font-display)' }}
  >
    <motion.div
      animate={{
        backgroundColor: checked ? 'var(--aw-accent)' : 'rgba(255,255,255,0.1)',
        borderColor: checked ? 'transparent' : 'rgba(255,255,255,0.05)'
      }}
      transition={{ duration: 0.2 }}
      className="relative flex items-center rounded-full"
      style={{
        width: 34,
        height: 20,
        padding: 2,
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.3)',
        border: '1px solid transparent'
      }}
    >
      <motion.span
        animate={{ x: checked ? 14 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 1 }}
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5), 0 0 1px rgba(0,0,0,0.3)'
        }}
      />
    </motion.div>
    <span
      className="text-[10px] tracking-[0.14em] font-bold uppercase transition-colors duration-300"
      style={{ color: checked ? 'white' : 'rgba(255,255,255,0.4)', marginTop: '1px' }}
    >
      {label}
    </span>
  </label>
);

/* ─── Share Modal Component (Framer Motion) ───────────────── */
const ShareModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  coverImage: string;
  episodeInfo: string;
  studioName: string | null;
}> = ({ open, onClose, title, coverImage, episodeInfo, studioName }) => {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${title} - ${episodeInfo}`, url: shareUrl });
      } catch (e: any) { /* cancelled */ }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0, rotateX: 5 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.95, y: 20, opacity: 0, rotateX: -5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="w-full max-w-[420px] overflow-hidden"
            style={{
              background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', borderRadius: 20,
              boxShadow: '0 40px 100px -20px rgba(0,0,0,0.9)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#000' }}>
              <img
                src={coverImage || 'https://via.placeholder.com/640x360/0d0d1a/3f3f56?text=Anime'}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.6s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.85) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>{studioName || 'Anime'}</p>
                <h3 style={{ margin: 0, fontFamily: 'var(--aw-font-display)', fontSize: 18, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{title}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>{episodeInfo}</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >
                <X size={16} />
              </motion.button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px', fontFamily: 'var(--aw-font-display)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>Share Link</p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <div style={{
                  flex: 1, background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 10,
                  padding: '10px 14px', fontSize: 12, color: 'var(--aw-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'var(--aw-font-body)', transition: 'all 0.2s'
                }}>
                  {shareUrl}
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '0 18px', borderRadius: 10, border: `1px solid ${copied ? 'var(--aw-accent)' : 'var(--aw-border)'}`,
                    background: copied ? 'var(--aw-accent-dim)' : 'var(--aw-bg)', color: copied ? 'var(--aw-accent)' : 'var(--aw-text)',
                    fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                    cursor: 'pointer', flexShrink: 0, minWidth: 100
                  }}
                >
                  {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                </motion.button>
              </div>

              {navigator.share && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNativeShare}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    background: 'var(--aw-accent-dim)', border: '1px solid var(--aw-accent-dim)',
                    color: 'var(--aw-accent)', fontSize: 12, fontFamily: 'var(--aw-font-display)',
                    fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginBottom: 12
                  }}
                >
                  <Share2 size={16} /> Share via Device
                </motion.button>
              )}

              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'var(--aw-border-hi)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open(shareUrl, '_blank')}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: 'transparent', border: '1px solid var(--aw-border)',
                  color: 'var(--aw-muted)', fontSize: 11, fontFamily: 'var(--aw-font-display)',
                  fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ExternalLink size={14} /> Open in New Tab
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).MediaSource) {
      const MS = (window as any).MediaSource;
      const original = MS.prototype.addSourceBuffer;
      MS.prototype.addSourceBuffer = function (this: MediaSource, mimeType: string) {
        const fixed = mimeType.replace('mp4a.40.1', 'mp4a.40.2');
        if (fixed !== mimeType) console.log('[codec-fix] Remapped:', mimeType, '->', fixed);
        return original.call(this, fixed);
      };
      return () => { MS.prototype.addSourceBuffer = original; };
    }
  }, []);

  const { animeId: urlSlug, provider, category, episodeId } = useParams<{
    animeId: string;
    provider?: string;
    category?: 'sub' | 'dub';
    episodeId?: string;
  }>();

  const navigate = useNavigate();
  const activeEpRef = useRef<HTMLDivElement>(null);
  const epListScrollRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const pendingFullscreenRestoreRef = useRef(false);

  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null);

  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('watchEpisodeSortOrder') as 'asc' | 'desc') || 'asc'
  );

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('watchAutoPlay') !== 'false');
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('watchAutoSkip') !== 'false');
  const [lightsOff, setLightsOff] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [playerMode, setPlayerMode] = useState<'internal' | 'external'>('internal');

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [proxifiedStreamUrl, setProxifiedStreamUrl] = useState<string | null>(null);
  const prevProxifiedUrlRef = useRef<string | null>(null);

  const [isSpeeding, setIsSpeeding] = useState(false);
  const isSpeedingRef = useRef(false);
  const normalSpeedRef = useRef(1);
  const wasPausedRef = useRef(false);
  const preventClickRef = useRef(false);

  const speedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const [seekIndicator, setSeekIndicator] = useState<'rewind' | 'forward' | null>(null);
  const pointerStateRef = useRef({
    downTime: 0, downX: 0, downY: 0, lastTapTime: 0, lastTapX: 0, lastTapY: 0, clickTimeout: null as ReturnType<typeof setTimeout> | null
  });

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);
  useEffect(() => { localStorage.setItem('watchEpisodeSortOrder', episodeSortOrder); }, [episodeSortOrder]);

  useEffect(() => {
    if (!user || !urlSlug || !episodeId) return;
    const fetchRemoteProgress = async () => {
      try {
        const { data, error } = await supabase
          .from('anime_watch_history')
          .select('episode_id, progress_time')
          .eq('user_id', user.id)
          .eq('anime_id', urlSlug)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') return;
        if (data && data.episode_id === episodeId && data.progress_time > 3) {
          localStorage.setItem(`progress-${urlSlug}-${episodeId}`, data.progress_time.toString());
        }
      } catch (e: any) {
        console.warn('Sync Remote Progress error:', e);
      }
    };
    fetchRemoteProgress();
  }, [user, urlSlug, episodeId]);

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === ',' || e.key === '.') {
        e.preventDefault();
        if (playerRef.current) {
          const forward = e.key === '.';
          const current = playerRef.current.currentTime;
          playerRef.current.currentTime = Math.max(0, current + (forward ? 0.0416 : -0.0416));
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const availableProviders = Object.keys(episodesData);
  const rankedProviders = useMemo(() =>
    rankProviders(availableProviders).filter(p => /arc|kiwi/i.test(p)),
    [availableProviders]
  );

  useEffect(() => {
    let mounted = true;

    const loadAnimeData = async () => {
      if (!urlSlug) return;
      setLoadingEpisodes(true);

      try {
        let anilistId = Number(urlSlug);
        if (isNaN(anilistId)) {
          const searchRes = await fetchAnimeSearch(urlSlug, 1);
          if (searchRes?.results?.length) {
            anilistId = searchRes.results[0].id;
          } else throw new Error("Anime not found in database.");
        }

        if (!mounted) return;
        setResolvedId(anilistId);

        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(anilistId),
          fetchAnimeEpisodes(anilistId)
        ]);

        if (!mounted) return;

        setAnimeInfo(info);
        const titleText = info.title?.english || info.title?.romaji || info.title?.native || 'Watching';
        const epText = episodeId ? ` Episode ${extractSlug(episodeId)}` : '';
        document.title = `Watching ${titleText}${epText}`;
        setEpisodesData(epsPayload?.providers || {});

      } catch (err: any) {
        console.error("Watch Page Load Error:", err);
        if (mounted) setEpisodesData({});
      } finally {
        if (mounted) setLoadingEpisodes(false);
      }
    };

    loadAnimeData();
    return () => { mounted = false; };
  }, [urlSlug, episodeId]);

  useEffect(() => {
    if (loadingEpisodes || availableProviders.length === 0 || !urlSlug || provider) return;
    const best = rankedProviders[0];
    if (!best) return;
    const defCat = episodesData[best]?.episodes?.['sub']?.length ? 'sub' : 'dub';
    const firstEp = episodesData[best]?.episodes?.[defCat]?.[0];
    if (firstEp) navigate(getEpisodeHref(urlSlug, best, defCat, firstEp.id), { replace: true });
  }, [loadingEpisodes, episodesData, provider, urlSlug, navigate, rankedProviders, availableProviders]);

  const currentCategory = category || 'sub';
  const currentProvider = provider || '';

  const providerEpisodes = useMemo(() => {
    if (!currentProvider) return [];
    return getProviderEpisodes({ providers: episodesData }, currentProvider, currentCategory);
  }, [episodesData, currentProvider, currentCategory]);

  const visibleEpisodes = useMemo(() => {
    let filtered = providerEpisodes.filter(ep =>
      String(ep.number).includes(epSearchQuery.trim()) ||
      (ep.title && ep.title.toLowerCase().includes(epSearchQuery.trim().toLowerCase()))
    );
    if (episodeSortOrder === 'desc') { filtered = [...filtered].reverse(); }
    return filtered;
  }, [providerEpisodes, epSearchQuery, episodeSortOrder]);

  const currentIndex = useMemo(() => {
    if (!episodeId) return -1;
    let idx = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
    if (idx === -1) {
      const epNumMatch = episodeId.match(/\d+$/);
      if (epNumMatch) idx = providerEpisodes.findIndex(ep => String(ep.number) === epNumMatch[0]);
    }
    return idx;
  }, [providerEpisodes, episodeId]);

  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];

  useEffect(() => {
    if (!loadingEpisodes || !activeEpRef.current) return;
    const el = activeEpRef.current;
    const container = epListScrollRef.current;
    if (container) {
      const elTop = el.offsetTop;
      const elHeight = el.offsetHeight;
      const containerHeight = container.clientHeight;
      container.scrollTop = elTop - containerHeight / 2 + elHeight / 2;
    }
  }, [loadingEpisodes, episodeId, currentProvider, currentCategory]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider || !episodeId) return;
    let mounted = true;
    const load = async () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
      setStreamLoading(true);
      setStreamError(null);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        const data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', episodeId);
        if (!data.streams?.length) throw new Error('Server is not responding.');
        if (mounted) setStreamData(data as any);

        if (!data.intro && !data.outro && mounted) {
          const skipProviders = ['arc', 'kiwi', 'animepahe', 'animekai', 'animedunya', 'anikoto'];
          for (const sp of skipProviders) {
            if (sp === currentProvider.toLowerCase()) continue;
            const providerKey = Object.keys(episodesData).find(k => k.toLowerCase() === sp);
            if (!providerKey) continue;
            try {
              const epList = getProviderEpisodes({ providers: episodesData }, providerKey, currentCategory as 'sub' | 'dub');
              const matchEp = epList.find(e => e.number === currentEpData.number);
              if (matchEp) {
                const spPure = extractSlug(matchEp.id);
                const spData = await fetchAnimeStreams(sp, resolvedId, currentCategory as 'sub' | 'dub', spPure);
                if (spData.intro || spData.outro) {
                  if (mounted) {
                    setStreamData((prev: any) => ({ ...prev, intro: spData.intro || prev?.intro, outro: spData.outro || prev?.outro }));
                  }
                  break;
                }
              }
            } catch (e: any) { /* silent fail for fallback search */ }
          }
        }
      } catch (err: any) {
        if (mounted) {
          setStreamError(err.message || 'Failed to load media.');
          setStreamData(null);
        }
      } finally {
        if (mounted) setStreamLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentEpData?.id, resolvedId, currentProvider, currentCategory, episodeId, episodesData]);

  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(-1);

  useEffect(() => {
    if (!streamData?.streams || streamData.streams.length === 0) return;

    const hlsStreams = streamData.streams.filter(s => s.type === 'hls' || s.url.includes('.m3u8'));
    const embedStreams = streamData.streams.filter(s => s.type === 'embed' || (!s.url.includes('.m3u8') && (s.url.includes('iframe') || s.url.includes('/embed/'))));

    const getQualityScore = (q: string) => {
      const lq = (q || '').toLowerCase();
      if (lq.includes('1080')) return 1080;
      if (lq.includes('720')) return 720;
      if (lq.includes('480')) return 480;
      if (lq.includes('360')) return 360;
      if (lq.includes('auto')) return 9999;
      if (lq.includes('default')) return 9000;
      return parseInt(lq) || 0;
    };

    const getBestStream = (list: StreamSource[]) => {
      return [...list].sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality))[0];
    };

    if (playerMode === 'internal' && hlsStreams.length > 0) {
      const best = getBestStream(hlsStreams);
      setSelectedStreamIndex(streamData.streams.indexOf(best));
    } else if (playerMode === 'external' && embedStreams.length > 0) {
      const best = getBestStream(embedStreams);
      setSelectedStreamIndex(streamData.streams.indexOf(best));
    } else {
      if (hlsStreams.length > 0) {
        setSelectedStreamIndex(streamData.streams.indexOf(getBestStream(hlsStreams)));
      } else if (embedStreams.length > 0) {
        setSelectedStreamIndex(streamData.streams.indexOf(getBestStream(embedStreams)));
      }
    }
  }, [streamData, playerMode]);

  const activeStream = useMemo<StreamSource | null>(() => {
    if (!streamData?.streams) return null;
    const stream = streamData.streams[selectedStreamIndex] || streamData.streams[0];
    if (!stream) return null;
    if ((stream.type === 'embed' || stream.url.includes('iframe') || stream.url.includes('/embed/')) && !stream.url.includes('.m3u8')) {
      return { ...stream, type: 'embed' } as StreamSource & { type: 'embed' };
    }
    return { ...stream, type: 'hls' } as StreamSource & { type: 'hls' };
  }, [streamData, selectedStreamIndex]);

  useEffect(() => {
    let mounted = true;

    if (!activeStream?.url?.includes('.m3u8') || !activeStream?.url) {
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
      setProxifiedStreamUrl(null);
      return;
    }

    try {
      const b64 = btoa(activeStream.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url = `${WORKER_PROXY_URL}proxy/${b64}`;
      if (mounted) {
        if (prevProxifiedUrlRef.current) {
          URL.revokeObjectURL(prevProxifiedUrlRef.current);
        }
        prevProxifiedUrlRef.current = url;
        setProxifiedStreamUrl(url);
      }
    } catch (e: any) {
      console.warn('Failed to encode stream URL for proxy:', e);
      if (mounted) {
        setProxifiedStreamUrl(null);
      }
    }
    return () => {
      mounted = false;
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
    };
  }, [activeStream]);

  const derivedTitle = typeof animeInfo?.title === 'string'
    ? animeInfo.title
    : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');
  const displayTitleWithEpisode = currentEpData?.number ? `${displayTitle}` : displayTitle;

  // Track progress specific refs EXACTLY like the working old version
  const progressDataRef = useRef<ProgressData | null>(null);
  const playingEpisodeRef = useRef<string>('');
  const videoStateRef = useRef({ episodeId: '', currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    setIsVideoReady(false);
    setVideoDuration(0);
    videoStateRef.current = { episodeId: '', currentTime: 0, duration: 0 };
    lastSavedTime.current = -1;
    if (streamData && episodeId) { playingEpisodeRef.current = episodeId; }
  }, [episodeId, streamData]);

  progressDataRef.current = {
    animeId: String(resolvedId || urlSlug), episodeId: episodeId || '', animeTitle: displayTitle,
    animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
    episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
    episodeNumber: currentEpData?.number || 0,
    href: (episodeId && urlSlug) ? getEpisodeHref(urlSlug, currentProvider, currentCategory, episodeId) : ''
  };

  const forceSaveProgress = useCallback(async (explicitPayload?: any) => {
    const payload = explicitPayload?.episodeId ? explicitPayload : progressDataRef.current;
    if (!payload?.episodeId || !payload?.animeId) return;

    let currentTime = 0; let duration = 0;
    if (videoStateRef.current.episodeId === payload.episodeId) {
      currentTime = videoStateRef.current.currentTime || 0;
      duration = videoStateRef.current.duration || 0;
    }
    if (currentTime === 0 && playingEpisodeRef.current === payload.episodeId && playerRef.current) {
      const vTime = playerRef.current.state.currentTime;
      const vDur = playerRef.current.state.duration;
      if (Number.isFinite(vTime) && vTime > 0) currentTime = vTime;
      if (Number.isFinite(vDur) && vDur > 0) duration = vDur;
    }

    const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 0;
    const safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;

    // DO NOT SAVE IF TOO CLOSE TO THE END (100% completed videos drop out of continue watching)
    if (safeDuration > 0 && (safeTime > safeDuration - 15 || safeTime > safeDuration * 0.95)) {
      return;
    }

    if (safeTime < 3) return;

    try {
      if (user) {
        const { error } = await supabase.from('anime_watch_history').upsert({
          user_id: user.id, anime_id: String(payload.animeId), episode_id: String(payload.episodeId),
          anime_title: payload.animeTitle, anime_cover: payload.animeCover, episode_title: payload.episodeTitle,
          episode_number: payload.episodeNumber, href: payload.href, duration: safeDuration,
          progress_time: safeTime, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, anime_id' });
        if (error) console.warn('Failed to save progress to Supabase:', error.message);
      }

      const progressKey = `progress-${payload.animeId}-${payload.episodeId}`;
      localStorage.setItem(progressKey, safeTime.toString());

      const raw = localStorage.getItem('anime-continue-watching');
      const entries = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(entries) ? entries : []).filter((e: any) => String(e.animeId) !== String(payload.animeId));

      filtered.unshift({ kind: 'anime', ...payload, duration: safeDuration, currentTime: safeTime, updatedAt: Date.now() });
      localStorage.setItem('anime-continue-watching', JSON.stringify(filtered.slice(0, 40)));
      window.dispatchEvent(new Event('storage'));
    } catch (e: any) { console.warn('Failed to save progress', e); }
  }, [user]);

  useEffect(() => {
    const onSave = () => forceSaveProgress();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') forceSaveProgress(); };
    window.addEventListener('beforeunload', onSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      onSave();
      if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
      if (seekIndicatorTimeout.current) { clearTimeout(seekIndicatorTimeout.current); seekIndicatorTimeout.current = null; }
    };
  }, [forceSaveProgress]);

  useEffect(() => {
    return () => {
      if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
      if (seekIndicatorTimeout.current) { clearTimeout(seekIndicatorTimeout.current); seekIndicatorTimeout.current = null; }
      if (prevProxifiedUrlRef.current) {
        URL.revokeObjectURL(prevProxifiedUrlRef.current);
        prevProxifiedUrlRef.current = null;
      }
    };
  }, []);

  const handleVideoPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!e.isPrimary) return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group')) return;

    pointerStateRef.current.downTime = Date.now();
    pointerStateRef.current.downX = e.clientX;
    pointerStateRef.current.downY = e.clientY;

    if (playerRef.current) wasPausedRef.current = playerRef.current.state.paused;

    speedTimeoutRef.current = setTimeout(() => {
      if (playerRef.current) {
        preventClickRef.current = true;
        normalSpeedRef.current = playerRef.current.state.playbackRate || 1;
        if (wasPausedRef.current) playerRef.current.play();
        playerRef.current.playbackRate = 2;
        isSpeedingRef.current = true;
        setIsSpeeding(true);
      }
    }, 350);
  }, []);

  const stopSpeeding = useCallback((e?: React.PointerEvent | PointerEvent | Event) => {
    if (speedTimeoutRef.current) { clearTimeout(speedTimeoutRef.current); speedTimeoutRef.current = null; }
    if (isSpeedingRef.current && playerRef.current) {
      if (e && 'stopPropagation' in e) { e.stopPropagation(); e.preventDefault(); }
      playerRef.current.playbackRate = normalSpeedRef.current;
      if (wasPausedRef.current) playerRef.current.pause();
      isSpeedingRef.current = false; setIsSpeeding(false);
      preventClickRef.current = true;
      setTimeout(() => { preventClickRef.current = false; }, 100);
      return true;
    }
    return false;
  }, []);

  const handleVideoPointerUp = useCallback((e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    const wasSpeeding = stopSpeeding(e);
    if (wasSpeeding) {
      pointerStateRef.current.lastTapTime = 0;
      return;
    }
    if (e.pointerType !== 'touch') return;

    const target = e.target as HTMLElement;
    if (target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group')) return;

    const upTime = Date.now();
    const upX = e.clientX; const upY = e.clientY;
    const pState = pointerStateRef.current;
    const isTap = (upTime - pState.downTime < 300) && Math.abs(upX - pState.downX) < 15 && Math.abs(upY - pState.downY) < 15;

    if (!isTap) {
      pState.lastTapTime = 0;
      pState.lastTapX = 0;
      pState.lastTapY = 0;
      return;
    }

    const timeSinceLastTap = upTime - pState.lastTapTime;
    const distFromLastTap = Math.sqrt(Math.pow(upX - pState.lastTapX, 2) + Math.pow(upY - pState.lastTapY, 2));

    if (timeSinceLastTap < 350 && distFromLastTap < 40) {
      if (pState.clickTimeout) { clearTimeout(pState.clickTimeout); pState.clickTimeout = null; }

      if (playerRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = upX - rect.left;
        const width = rect.width;

        if (clickX < width * 0.4) {
          e.stopPropagation(); e.preventDefault(); preventClickRef.current = true;
          setTimeout(() => { preventClickRef.current = false; }, 200);
          playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10);
          setSeekIndicator('rewind');
          if (seekIndicatorTimeout.current) clearTimeout(seekIndicatorTimeout.current);
          seekIndicatorTimeout.current = setTimeout(() => setSeekIndicator(null), 550);
        } else if (clickX > width * 0.6) {
          e.stopPropagation(); e.preventDefault(); preventClickRef.current = true;
          setTimeout(() => { preventClickRef.current = false; }, 200);
          playerRef.current.currentTime = Math.min(playerRef.current.state.duration || 0, playerRef.current.currentTime + 10);
          setSeekIndicator('forward');
          if (seekIndicatorTimeout.current) clearTimeout(seekIndicatorTimeout.current);
          seekIndicatorTimeout.current = setTimeout(() => setSeekIndicator(null), 550);
        }
      }
      pState.lastTapTime = upTime; pState.lastTapX = upX; pState.lastTapY = upY;
    } else {
      pState.lastTapTime = upTime; pState.lastTapX = upX; pState.lastTapY = upY;
    }
  }, [stopSpeeding]);

  const handleVideoPointerLeave = useCallback((e: React.PointerEvent | PointerEvent | Event) => {
    stopSpeeding(e as PointerEvent);
  }, [stopSpeeding]);

  const handleVideoClickCapture = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isControl = !!target.closest('button, [role="button"], [role="slider"], [role="menu"], input, .vds-controls-group');
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    const isSide = x < w * 0.4 || x > w * 0.6;

    if ((preventClickRef.current || isSide) && !isControl) {
      e.stopPropagation(); e.preventDefault();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('pointerup', handleVideoPointerLeave);
    window.addEventListener('blur', handleVideoPointerLeave);
    return () => { window.removeEventListener('pointerup', handleVideoPointerLeave); window.removeEventListener('blur', handleVideoPointerLeave); };
  }, [handleVideoPointerLeave]);

  const chapterTrackUrl = useMemo(() => {
    if (!streamData) return null;
    const { intro, outro } = streamData;
    if (!intro && !outro) return null;

    const formatVtt = (sec: number) => {
      const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = Math.floor(sec % 60); const ms = Math.floor((sec % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    let vtt = "WEBVTT\n\n";
    if (intro && intro.start > 0) { vtt += `${formatVtt(0)} --> ${formatVtt(intro.start)}\nEpisode\n\n`; }
    else if (!intro && outro && outro.start > 0) { vtt += `${formatVtt(0)} --> ${formatVtt(outro.start)}\nEpisode\n\n`; }

    if (intro) {
      vtt += `${formatVtt(intro.start)} --> ${formatVtt(intro.end)}\nIntro\n\n`;
      if (outro) vtt += `${formatVtt(intro.end)} --> ${formatVtt(outro.start)}\nEpisode\n\n`;
    }
    if (outro) vtt += `${formatVtt(outro.start)} --> ${formatVtt(outro.end)}\nOutro\n\n`;

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [streamData]);

  useEffect(() => { return () => { if (chapterTrackUrl) URL.revokeObjectURL(chapterTrackUrl); }; }, [chapterTrackUrl]);

  const finalStreamUrl = useMemo(() => {
    if (!activeStream || activeStream.type === 'embed') return null;
    if (proxifiedStreamUrl) return proxifiedStreamUrl;
    return activeStream.url || null;
  }, [activeStream, proxifiedStreamUrl]);

  useEffect(() => {
    const currentPayload = { ...progressDataRef.current };
    return () => { forceSaveProgress(currentPayload); };
  }, [activeStream, forceSaveProgress]);

  const handleTimeUpdate = useCallback(({ currentTime, duration }: { currentTime: number, duration: number }) => {
    videoStateRef.current.currentTime = currentTime;
    if (duration > 0) videoStateRef.current.duration = duration;

    if (streamData?.intro) {
      const { start, end } = streamData.intro;
      const isWithinIntro = currentTime >= start && currentTime < end;
      if (isWithinIntro) { if (autoSkip) skipTo(end); else setShowSkipIntro(true); } else setShowSkipIntro(false);
    }

    if (streamData?.outro) {
      const { start, end } = streamData.outro;
      const isWithinOutro = currentTime >= start && currentTime < end;
      if (isWithinOutro) { if (autoSkip) skipTo(end); else setShowSkipOutro(true); } else setShowSkipOutro(false);
    }
  }, [streamData, autoSkip]);

  const skipTo = (t: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = t;
    }
  };

  const handleEpisodeClick = useCallback((targetId: string) => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider) return;

    if (document.fullscreenElement && videoContainerRef.current) {
      pendingFullscreenRestoreRef.current = true;
    }

    let finalTargetId = extractSlug(targetId);
    const targetEp = providerEpisodes.find(e => e.id === targetId);

    const customPrefixes = ['animepahe', 'animekai', 'animedunya', 'anikoto'];
    const activePrefix = customPrefixes.find(p => episodeId?.toLowerCase().startsWith(p));

    if (activePrefix) {
      const epNum = targetEp?.number || finalTargetId.match(/\d+$/)?.[0] || '1';
      finalTargetId = `${activePrefix}-${epNum}`;
    }

    const href = getEpisodeHref(urlSlug, currentProvider, currentCategory, finalTargetId);
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress, episodeId, providerEpisodes]);

  const handleCategorySwitch = useCallback((newCat: 'sub' | 'dub') => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider || newCat === currentCategory) return;
    const eps = getProviderEpisodes({ providers: episodesData }, currentProvider, newCat);
    if (!eps.length) return showToast(`No ${newCat.toUpperCase()} episodes found.`);

    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    let finalTargetId = extractSlug(match.id);

    const customPrefixes = ['animepahe', 'animekai', 'animedunya', 'anikoto'];
    const activePrefix = customPrefixes.find(p => episodeId?.toLowerCase().startsWith(p));
    if (activePrefix) {
      finalTargetId = `${activePrefix}-${match.number}`;
    }

    const href = getEpisodeHref(urlSlug, currentProvider, newCat, finalTargetId);
    navigate(href);
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress, episodeId]);

  const handleVideoEnd = useCallback(() => {
    if (autoPlay && hasNext && providerEpisodes[currentIndex + 1]) {
      handleEpisodeClick(providerEpisodes[currentIndex + 1].id);
    }
  }, [autoPlay, hasNext, handleEpisodeClick, providerEpisodes, currentIndex]);

  useEffect(() => {
    if (isVideoReady && !streamLoading && pendingFullscreenRestoreRef.current) {
      pendingFullscreenRestoreRef.current = false;
      if (!document.fullscreenElement && videoContainerRef.current) {
        videoContainerRef.current.requestFullscreen().catch(() => { });
      }
    }
  }, [isVideoReady, streamLoading]);

  const studioName = useMemo(() => {
    if (!animeInfo?.studios) return null;
    if (Array.isArray(animeInfo.studios)) {
      const first = animeInfo.studios[0];
      return typeof first === 'string' ? first : first?.name;
    }
    if (animeInfo.studios.edges) {
      const main = animeInfo.studios.edges.find((e: any) => e.isMain) || animeInfo.studios.edges[0];
      return main?.node?.name;
    }
    return null;
  }, [animeInfo]);

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="aw-root aw-noise min-h-screen flex flex-col relative">
      <AnimatePresence>
        {lightsOff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setLightsOff(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(2px)', cursor: 'pointer' }}
          />
        )}
      </AnimatePresence>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        title={displayTitle}
        coverImage={animeInfo?.bannerImage || animeInfo?.coverImage?.extraLarge || animeInfo?.image || animeInfo?.coverImage?.large || ''}
        episodeInfo={`${currentEpData?.title || `Episode ${currentEpData?.number || '?'}`} - ${currentCategory.toUpperCase()}`}
        studioName={studioName}
      />


      <motion.div
        className="aw-layout"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <main className="aw-main">

          {/* Video Container */}
          <motion.div
            ref={videoContainerRef}
            variants={scaleInItem}
            style={{
              position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000',
              borderRadius: 16, overflow: 'hidden', zIndex: lightsOff ? 50 : 'auto', transition: 'box-shadow 0.5s',
              boxShadow: lightsOff
                ? '0 0 0 2px var(--aw-accent), 0 0 80px 8px var(--aw-accent-glow), 0 30px 80px -20px rgba(0,0,0,0.9)'
                : '0 24px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
              userSelect: 'none'
            }}
            onPointerDownCapture={handleVideoPointerDown}
            onPointerUpCapture={handleVideoPointerUp}
            onPointerLeave={handleVideoPointerLeave}
            onClickCapture={handleVideoClickCapture}
            onContextMenu={(e) => { if (isSpeeding) e.preventDefault(); }}
          >
            {streamError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring' }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.95)', padding: 32, textAlign: 'center', gap: 16, zIndex: 50 }}
              >
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,54,93,0.1)', border: '1px solid rgba(232,54,93,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4, animation: 'pulse 2s ease-in-out infinite' }}>
                  <AlertCircle style={{ color: 'var(--aw-accent)', width: 24, height: 24 }} />
                </div>
                <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>Stream Failed</p>
                <p style={{ fontSize: 13, color: 'var(--aw-muted)', maxWidth: 320, lineHeight: 1.6, fontWeight: 300 }}>{streamError}</p>
                <motion.button
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.location.reload()}
                  style={{ marginTop: 8, padding: '10px 28px', background: 'var(--aw-card)', border: '1px solid var(--aw-border-hi)', borderRadius: 100, color: 'var(--aw-text)', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                >
                  Reload Player
                </motion.button>
              </motion.div>
            )}

            {activeStream?.type === 'embed' && activeStream?.url ? (
              <iframe src={activeStream.url} style={{ width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 10 }} allowFullScreen allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
            ) : (
              <MediaPlayer
                ref={playerRef}
                autoplay={autoPlay}
                title={displayTitleWithEpisode}
                poster={currentEpData?.image || animeInfo?.image}
                src={finalStreamUrl ? { src: finalStreamUrl, type: 'application/vnd.apple.mpegurl' } : undefined}
                onProviderChange={(provider) => {
                  if (isHLSProvider(provider)) {
                    provider.config = {
                      enableWorker: true, backBufferLength: 0, maxBufferLength: 30, maxMaxBufferLength: 60,
                      manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 3, fragLoadingMaxRetry: 6,
                      appendErrorMaxRetry: 3, testBandwidth: false
                    };
                  }
                }}
                onTimeUpdate={(e: number | { detail?: { currentTime?: number }; currentTime?: number }) => {
                  const time = typeof e === 'number' ? e : e?.detail?.currentTime || e?.currentTime || 0;
                  const duration = playerRef.current?.state?.duration || videoStateRef.current.duration || 0;
            
                  if (duration > 0 && videoDuration === 0) {
                    setVideoDuration(duration);
                  }
            
                  handleTimeUpdate({ currentTime: time, duration });
                }}
                onEnded={handleVideoEnd}
                onCanPlay={() => {
                  setIsVideoReady(true);
                  if (!playerRef.current) return;
                  const epId = progressDataRef.current?.episodeId || episodeId;
                  const aId = progressDataRef.current?.animeId || urlSlug;
                  if (autoPlay && playerRef.current.state?.paused) playerRef.current.play().catch(() => { });

                  if (!epId || !aId) return;
                  const savedTimeRaw = localStorage.getItem(`progress-${aId}-${epId}`);
                  if (savedTimeRaw) {
                    const parsedTime = parseFloat(savedTimeRaw);
                    const currentTime = playerRef.current.currentTime || 0;
                    const duration = playerRef.current.state?.duration || 0;
                    if (parsedTime > 10 && currentTime < 5 && duration > 0) {
                      const timeDiff = Math.abs(parsedTime - currentTime);
                      if (parsedTime < duration - 20 && parsedTime < duration * 0.92 && timeDiff > 10) {
                        playerRef.current.currentTime = parsedTime;
                        showToast(`Resumed playback at ${Math.floor(parsedTime)}s`);
                      }
                    }
                  }
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none', position: 'relative', zIndex: 10 }}
              >
                <MediaProvider>
                  {/* 1. Chapters (Intro/Outro) */}
                  {chapterTrackUrl && <Track key={chapterTrackUrl} src={chapterTrackUrl} kind="chapters" label="Chapters" type="vtt" srcLang="en-US" default />}

                  {/* 2. Seek Bar Thumbnails */}
                  {/* We look for a subtitle track labeled 'thumbnails' */}
                  {streamData?.subtitles?.find((s: any) => s.label?.toLowerCase() === 'thumbnails' || s.kind === 'thumbnails') && (
                    <Track
                      src={streamData.subtitles.find((s: any) => s.label?.toLowerCase() === 'thumbnails' || s.kind === 'thumbnails')!.file}
                      kind="thumbnails"
                      label="Thumbnails"
                      default
                    />
                  )}

                  {/* 3. Actual Subtitles (Filtering OUT the thumbnail track) */}
                  {streamData?.subtitles
                    ?.filter((sub: any) => sub.label?.toLowerCase() !== 'thumbnails' && sub.kind !== 'thumbnails')
                    .map((sub: any, i: number) => (
                      <Track
                        key={sub.file || String(i)}
                        src={sub.file}
                        kind="subtitles"
                        label={sub.label}
                        srcLang={sub.label.substring(0, 2).toLowerCase()}
                        default={sub.label.toLowerCase().includes('english')}
                      />
                    ))}
                </MediaProvider>

                {/* Vidstack automatically handles showing the thumbnails because you are using this layout: */}
                <DefaultVideoLayout icons={defaultLayoutIcons} />

                <AnimatePresence>
                  {isSpeeding && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      style={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', padding: '8px 20px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 8, color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'var(--aw-font-display)', pointerEvents: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> 2x Speed
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {seekIndicator && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, x: seekIndicator === 'rewind' ? -20 : 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        position: 'absolute', top: '50%', marginTop: -40,
                        left: seekIndicator === 'rewind' ? 20 : 'auto', right: seekIndicator === 'forward' ? 20 : 'auto',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'white',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 14, padding: '14px 18px', zIndex: 100, pointerEvents: 'none'
                      }}
                    >
                      {currentEpData?.image && (
                        <div style={{ width: 80, height: 45, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                          <img src={currentEpData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {seekIndicator === 'rewind' ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>{seekIndicator === 'rewind' ? '-10s' : '+10s'}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {toastMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', padding: '8px 20px', borderRadius: 100, fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', zIndex: 60, whiteSpace: 'nowrap' }}
                    >
                      {toastMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(showSkipIntro && streamData?.intro && !autoSkip) && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => skipTo(streamData.intro!.end)}
                      style={{ position: 'absolute', bottom: 90, right: 32, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 24px', color: 'white', fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)', textTransform: 'uppercase' }}
                    >
                      <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> Skip Intro
                    </motion.button>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {(showSkipOutro && streamData?.outro && !autoSkip) && (
                    <motion.button
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => skipTo(streamData.outro!.end)}
                      style={{ position: 'absolute', bottom: 90, right: 32, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 24px', color: 'white', fontSize: 14, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.05em', cursor: 'pointer', boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)', textTransform: 'uppercase' }}
                    >
                      <FastForward size={16} style={{ color: 'var(--aw-accent)' }} /> Skip Outro
                    </motion.button>
                  )}
                </AnimatePresence>
              </MediaPlayer>
            )}
          </motion.div>

          {/* Sleek Controls Bar */}
          <motion.div
            variants={fadeUpItem}
            style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, padding: '14px 24px', background: 'rgba(255,255,255,0.015)',
              borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '20px' }}>
                <Toggle checked={autoPlay} onChange={setAutoPlay} label="Autoplay" />
                <Toggle checked={autoSkip} onChange={setAutoSkip} label="Auto Skip" />
              </div>

              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

              <div style={{ display: 'flex', gap: 12 }}>
                <motion.button
                  whileHover={hasPrev && !streamLoading ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
                  whileTap={hasPrev && !streamLoading ? { scale: 0.95 } : {}}
                  onClick={() => hasPrev && handleEpisodeClick(providerEpisodes[currentIndex - 1].id)} disabled={!hasPrev || streamLoading}
                  className={hasPrev && !streamLoading ? "aw-action-btn" : ""}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 20px',
                    borderRadius: 100, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: (!hasPrev || streamLoading) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: (!hasPrev || streamLoading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChevronsLeft size={14} /> PREV
                </motion.button>
                <motion.button
                  whileHover={hasNext && !streamLoading ? { scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)' } : {}}
                  whileTap={hasNext && !streamLoading ? { scale: 0.95 } : {}}
                  onClick={() => hasNext && handleEpisodeClick(providerEpisodes[currentIndex + 1].id)} disabled={!hasNext || streamLoading}
                  className={hasNext && !streamLoading ? "aw-action-btn" : ""}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 20px',
                    borderRadius: 100, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: (!hasNext || streamLoading) ? 'rgba(255,255,255,0.2)' : 'white',
                    fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', cursor: (!hasNext || streamLoading) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  NEXT <ChevronsRight size={14} />
                </motion.button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['internal', 'external'] as const).map(mode => (
                  <motion.button
                    key={mode}
                    onClick={() => setPlayerMode(mode)}
                    whileHover={{ scale: 1.05, backgroundColor: playerMode === mode ? 'transparent' : 'rgba(255,255,255,0.04)' }}
                    whileTap={{ scale: 0.95 }}
                    className="relative px-[16px] py-[8px] rounded-full border-none flex items-center gap-2 cursor-pointer outline-none aw-action-btn"
                    style={{
                      background: 'transparent',
                      border: playerMode === mode ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {playerMode === mode && (
                      <motion.div
                        layoutId="playerModeTab"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--aw-accent) 10%, transparent)' }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-[6px] text-[10px] font-bold tracking-[0.1em] uppercase" style={{ color: playerMode === mode ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--aw-font-display)' }}>
                      {mode === 'internal' ? <MonitorPlay size={13} /> : <ExternalLink size={13} />} {mode}
                    </span>
                  </motion.button>
                ))}
              </div>

              <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowShareModal(true)}
                className="aw-action-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 20px',
                  borderRadius: 100, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white', fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Share2 size={13} /> SHARE
              </motion.button>
            </div>
          </motion.div>

          {/* Unified Episode & Anime Info Panel */}
          <motion.div
            variants={fadeUpItem}
            className="aw-info-panel hover-lift"
          >
            {/* Top row: Anime Title and Episode Number */}
            <p className="aw-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '11px' }}>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{displayTitle}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>&bull;</span>
              <span style={{ color: 'var(--aw-accent)' }}>EPISODE {currentEpData?.number || '?'}</span>
            </p>

            {/* Episode Title */}
            <h1 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 600, color: 'white', letterSpacing: '0', margin: 0, lineHeight: 1.1 }}>
              {currentEpData?.title || `Episode ${currentEpData?.number || '?'}`}
            </h1>

            {/* Genres & Next Episode */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              {(animeInfo?.genres || ['Anime']).map((g: string) => (
                <button
                  key={g}
                  onClick={() => navigate(`/browse?genres=${encodeURIComponent(g)}`)}
                  className="genre-pill"
                  style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                >
                  {g}
                </button>
              ))}

              {animeInfo?.nextAiringEpisode ? (
                <span className="genre-pill" style={{ border: '1px solid var(--aw-accent)', color: 'var(--aw-accent)', background: 'color-mix(in srgb, var(--aw-accent) 10%, transparent)' }}>
                  <Clock size={12} style={{ opacity: 0.8 }} /> <NextAiringTimer data={animeInfo.nextAiringEpisode} compact />
                </span>
              ) : (animeInfo?.status?.toUpperCase() === 'RELEASING' || animeInfo?.status?.toUpperCase() === 'ONGOING') ? (
                <span className="genre-pill" style={{ border: '1px solid var(--aw-accent)', color: 'var(--aw-accent)', background: 'color-mix(in srgb, var(--aw-accent) 10%, transparent)' }}>
                  <Clock size={12} style={{ opacity: 0.8 }} /> Ongoing
                </span>
              ) : null}
            </div>

            {/* Description */}
            <p style={{ margin: '8px 0 0', fontSize: '14px', fontWeight: 300, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '900px' }}>
              {currentEpData?.description || animeInfo?.description?.replace(/<[^>]*>?/gm, '') || animeInfo?.synopsis || 'No description available.'}
            </p>
          </motion.div>

          <motion.div variants={fadeUpItem} style={{ padding: '0 20px 20px' }}>
            {currentEpData && <CommentSection pageType="watch" pageId={`anime-${resolvedId || urlSlug}-ep-${currentEpData.number}`} />}
            {!currentEpData && loadingEpisodes && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Loader2 className="animate-spin text-[var(--aw-accent)]" size={24} /></div>}
          </motion.div>
        </main>

        <aside className="aw-sidebar sidebar-enter hover-lift" style={{ zIndex: 40 }}>
          <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--aw-border)', flexShrink: 0 }}>
            <div className="anim-fade-in-down" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>Episodes
                {providerEpisodes.length > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--aw-accent)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 100 }}>{providerEpisodes.length}</span>}
              </h3>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 100, padding: 4, gap: 2 }}>
                {(['sub', 'dub'] as const).map(cat => (
                  <button key={cat} className="aw-segment-btn" data-active={currentCategory === cat} onClick={() => handleCategorySwitch(cat)} style={{ padding: '4px 14px', borderRadius: 100, border: 'none', background: 'transparent', color: 'var(--aw-muted)', fontSize: 10, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="anim-fade-in-up anim-delay-1" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="text" placeholder="Search episodes…" value={epSearchQuery} onChange={e => setEpSearchQuery(e.target.value)} className="input-glow" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: 'var(--aw-text)', fontSize: 12, fontFamily: 'var(--aw-font-body)', fontWeight: 400, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }} />
              </div>
              <button onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')} title="Sort Episodes" className="aw-action-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'var(--aw-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
                {episodeSortOrder === 'desc' ? <ArrowDownUp size={14} /> : <ArrowDownUp size={14} style={{ transform: 'rotate(180deg)' }} />}
              </button>
            </div>
          </div>
          <div ref={epListScrollRef} className="aw-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loadingEpisodes ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...Array(7)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--aw-border)' }}>
                    <div className="skeleton-wave" style={{ width: 28, height: 64, borderRadius: 6, flexShrink: 0 }} />
                    <div className="skeleton-wave" style={{ width: 110, height: 64, borderRadius: 8, flexShrink: 0, animationDelay: '0.1s' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      <div className="skeleton-wave" style={{ width: '60%', height: 12, borderRadius: 4, animationDelay: '0.2s' }} />
                      <div className="skeleton-wave" style={{ width: '80%', height: 10, borderRadius: 4, animationDelay: '0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleEpisodes.length > 0 ? (
              visibleEpisodes.map((ep, idx) => {
                const isActive = (extractSlug(ep.id) === episodeId || String(ep.number) === episodeId?.match(/\d+$/)?.[0]);
                return (
                  <div key={`${episodeSortOrder}-${ep.id}`} ref={isActive ? activeEpRef : null} onClick={() => handleEpisodeClick(ep.id)} className={`ep-item ep-slide-in ep-item-hover`} style={{ animationDelay: `${Math.min(idx * 0.04, 0.5)}s`, position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--aw-border)', cursor: 'pointer', background: isActive ? 'var(--aw-accent-dim)' : 'transparent' }}>
                    {isActive && <div className="ep-active-marker" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, height: '100%', background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))', borderRadius: '0 2px 2px 0' }} />}
                    <div className={`ep-number ${isActive ? '' : ''}`} style={{ width: 28, height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.25)', transition: 'color 0.2s' }}>{ep.number || '–'}</div>
                    <div style={{ width: 110, height: 64, flexShrink: 0, borderRadius: 8, overflow: 'hidden', background: 'var(--aw-card)', boxShadow: isActive ? '0 0 0 1.5px var(--aw-accent)' : '0 0 0 1px rgba(255,255,255,0.06)', position: 'relative' }}>
                      <img src={ep.image || 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'} alt="" className="ep-thumb" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.75 }} onError={(e: any) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'; }} />
                      {ep.filler && <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.8)', fontSize: 9, fontFamily: 'var(--aw-font-display)', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', padding: '2px 5px', borderRadius: 3, textTransform: 'uppercase' }}>Filler</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 64 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
                        <h4 style={{ margin: 0, fontSize: 13, fontFamily: 'var(--aw-font-display)', fontWeight: isActive ? 700 : 600, color: isActive ? 'white' : 'rgba(255,255,255,0.8)', letterSpacing: '0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title || `Episode ${ep.number || '?'}`}</h4>
                        {ep.duration && <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--aw-muted)', fontWeight: 400 }}>{Math.round(ep.duration / 60)}m</span>}
                      </div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 300, color: 'var(--aw-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ep.description || `Episode ${ep.number}. ${ep.airDate ? `Aired ${formatEpisodeDate(ep.airDate)}.` : 'No synopsis available.'}`}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="anim-fade-in-up" style={{ padding: '48px 0', textAlign: 'center' }}>
                <AlertCircle size={22} style={{ color: 'var(--aw-muted)', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>No Matches</p>
              </div>
            )}
          </div>
        </aside>
      </motion.div>
    </div>
  );
};

export default AnimeWatch;

/* ─── END OF FILE AnimeWatchPage.tsx ────────────────────────────── */
