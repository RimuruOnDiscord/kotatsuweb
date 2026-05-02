/* --- START OF FILE AnimeHome.tsx --- */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Star, MonitorPlay, ChevronRight, ChevronLeft, Bookmark, BookmarkCheck, MoreVertical, Trash2, RotateCcw, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AnimeResult,
  fetchAnimePopular,
  fetchAnimeSpotlight,
  fetchAnimeInfo,
  fetchAnimeEpisodes,
  fetchAnimeStreams,
  getEpisodeSlug,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeScore,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { MediaPlayer, MediaProvider, isHLSProvider, type MediaPlayerInstance } from '@vidstack/react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { handleRippleMouseDown } from '../utils/ripple';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { BookmarkEntry, readBookmarks, removeBookmark } from '../utils/bookmarks';

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

  @media (min-width: 1180px) {
    .aw-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
      align-items: start;
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

  /* Premium Horizontal Card Styles */
  .aw-media-card {
    transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: center;
    will-change: transform;
  }
  
  .aw-media-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
  }

  .aw-media-card:active {
    transform: scale(0.97);
    transition: all 0.12s ease;
  }

  /* Context Menu */
  @keyframes ctx-menu-in {
    0% { opacity: 0; transform: translateY(6px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ctx-menu {
    animation: ctx-menu-in 0.18s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    transform-origin: bottom right;
  }
`;

// Helper for formatting duration/current time
const formatTime = (secs: number) => {
  if (!secs || isNaN(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Time Ago Helper
const timeAgo = (dateStr: string) => {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// Safe helper to extract nested object data without rendering [object Object]
const extractAnimeDetails = (anime: any) => {
  let year = anime.releaseDate || anime.year || '';
  if (typeof year === 'object' && year !== null) {
    year = year.year || year.start?.year || '';
  }

  const eps = anime.totalEpisodes || anime.episodes;
  const epsStr = eps ? `${eps} EPS` : '';

  let studio = '';
  if (Array.isArray(anime.studios) && anime.studios.length > 0) {
    studio = typeof anime.studios[0] === 'object' ? anime.studios[0].name : anime.studios[0];
  } else if (typeof anime.studios === 'string') {
    studio = anime.studios;
  } else if (typeof anime.studios === 'object' && anime.studios !== null) {
    studio = anime.studios.name || '';
  }

  const parts = [year, studio, epsStr].filter(p => p && String(p).trim() !== '' && String(p) !== '[object Object]');
  return parts.join(' • ');
};

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

export interface FriendActivityData {
  id: string;
  display_name: string;
  avatar_url: string;
  isOnline: boolean;
  statusType: string;
  statusText: string;
  lastActivity?: {
    animeTitle: string;
    episodeNumber: number;
    timestamp: string;
    image?: string;
  };
}

// ─────────────────────────────────────────
// FRAMER MOTION VARIANTS
// ─────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 200 },
  },
};

// ─────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onViewMore?: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, onViewMore }) => (
  <div className="flex w-full items-baseline justify-between mb-2 mt-2">
    <div className="flex items-baseline gap-3">
      <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="hidden sm:block text-[11px] font-medium text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>
          {subtitle}
        </p>
      )}
    </div>
    {onViewMore && (
      <button
        onClick={onViewMore}
        className="group flex items-center gap-1 text-[12px] font-medium text-zinc-500 hover:text-white transition-colors"
        style={{ fontFamily: 'var(--aw-font-body)' }}
      >
        <span>See all</span>
        <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────
// VERTICAL CINEMATIC POSTER CARD
// ─────────────────────────────────────────
interface MediaCardProps {
  title: string;
  image: string;
  subtitle?: string;
  badge?: string;
  onClick: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ title, image, subtitle, onClick }) => {
  return (
    <div
      className="aw-media-card group relative flex flex-col w-[160px] sm:w-[175px] md:w-[190px] lg:w-[200px] flex-shrink-0 cursor-pointer select-none snap-start rounded-[16px] p-2 bg-transparent border border-transparent"
      onClick={onClick}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[12px] bg-[var(--aw-s2)] border border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.05] pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--aw-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_var(--aw-accent-glow)]" />
      </div>

      <div className="pt-2.5 px-0.5 h-[48px] flex flex-col justify-start gap-0.5">
        <h3 className="line-clamp-1 text-[13px] font-semibold leading-snug text-white/85 group-hover:text-white transition-colors" style={{ fontFamily: 'var(--aw-font-body)' }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10.5px] font-medium text-zinc-500 line-clamp-1 group-hover:text-zinc-400 transition-colors" style={{ fontFamily: 'var(--aw-font-body)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// TRUE STATUS: FRIENDS ACTIVITY CARD
// ─────────────────────────────────────────
const FriendCard: React.FC<{ friend: FriendActivityData; onClick: () => void }> = ({ friend, onClick }) => {
  const { display_name, avatar_url, isOnline, statusType, statusText, lastActivity } = friend;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={onClick}
      className="group relative flex w-[250px] sm:w-[270px] flex-shrink-0 cursor-pointer items-center gap-3.5 rounded-[16px] border border-transparent bg-white/[0.02] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:bg-[color-mix(in_srgb,var(--app-accent)_5%,transparent)] hover:border-[var(--app-accent)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.4),0_8px_20px_color-mix(in_srgb,var(--app-accent)_15%,transparent)] active:scale-[0.97] snap-start"
    >
      {/* Background image if active (faded heavily) */}
      {lastActivity?.image && (
        <div className="absolute inset-0 z-0 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none rounded-[inherit] overflow-hidden">
          <img src={lastActivity.image} className="w-full h-full object-cover blur-sm" alt="" />
        </div>
      )}

      {/* Avatar Container */}
      <div className="relative z-10 w-[46px] h-[46px] flex-shrink-0">
        <div className="w-full h-full rounded-full border border-white/10 group-hover:border-[var(--app-accent)] transition-colors duration-300 bg-[#1a1a1c] overflow-hidden shadow-sm">
          {(!avatar_url || imgError) ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-[#111]">
              <User size={18} strokeWidth={2} />
            </div>
          ) : (
            <img src={avatar_url} className="w-full h-full object-cover" alt={display_name} onError={() => setImgError(true)} />
          )}
        </div>
        {/* Status Dot positioned just outside the overflow-hidden avatar */}
        <div
          className={`absolute bottom-0 right-0 translate-x-[15%] translate-y-[15%] h-3.5 w-3.5 rounded-full border-[2.5px] border-[#0e0e11] group-hover:border-[#13151a] transition-colors duration-300 z-20 ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`}
        />
      </div>

      {/* True Status Info Container */}
      <div className="relative z-10 flex flex-col min-w-0 flex-1 justify-center leading-tight">
        <span className="text-[14px] font-bold text-white truncate group-hover:text-[var(--app-accent)] transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {display_name}
        </span>

        {isOnline ? (
          <div className="flex flex-col mt-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {statusType === 'watching' ? 'Watching' : 'Online'}
            </span>
            <span className="text-[12px] text-zinc-300 truncate font-medium mt-0.5">
              {statusText || 'Browsing Kotatsu'}
            </span>
          </div>
        ) : lastActivity ? (
          <div className="flex flex-col mt-0.5">
            <span className="text-[11px] text-zinc-400 truncate group-hover:text-zinc-300 transition-colors">Watched {lastActivity.animeTitle}</span>
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wide mt-0.5 group-hover:text-zinc-500 transition-colors">{timeAgo(lastActivity.timestamp)}</span>
          </div>
        ) : (
          <span className="text-[12px] text-zinc-500 mt-0.5 font-medium">Offline</span>
        )}
      </div>
    </div>
  );
};


// ─────────────────────────────────────────
// NETFLIX-STYLE CONTINUE WATCHING CARD
// ─────────────────────────────────────────
const ContinueWatchingCard: React.FC<{ entry: any; onClick: () => void; onClear: () => void }> = ({ entry, onClick, onClear }) => {
  const progressNum = entry.currentTime && entry.duration ? (entry.currentTime / entry.duration) * 100 : Math.floor(Math.random() * 60) + 20;

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isVideoReady, setIsVideoReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!isHovered) setIsVideoReady(false);
  }, [isHovered]);

  useEffect(() => {
    let mounted = true;
    let timer: NodeJS.Timeout;

    if (isHovered && !streamUrl) {
      timer = setTimeout(async () => {
        try {
          const epsRes = await fetchAnimeEpisodes(Number(entry.animeId));
          if (!mounted) return;

          let foundProvider = null;
          let foundCategory = null;
          let slug = '';

          if (epsRes?.providers) {
            const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai'];
            const sortedProviders = Object.keys(epsRes.providers).sort((a, b) => {
              const aIdx = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
              const bIdx = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
              if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
              if (aIdx !== -1) return -1;
              if (bIdx !== -1) return 1;
              return 0;
            });

            for (const pName of sortedProviders) {
              const pData = epsRes.providers[pName];
              for (const cat of ['sub', 'dub'] as const) {
                const eps = (pData as any).episodes?.[cat] || [];
                const match = eps.find((e: any) => e.number === entry.episodeNumber || String(e.id) === String(entry.episodeId));
                if (match) {
                  foundProvider = pName;
                  foundCategory = cat;
                  slug = getEpisodeSlug(match.id);
                  break;
                }
              }
              if (foundProvider) break;
            }
          }

          if (foundProvider && foundCategory && slug) {
            const streamsRes = await fetchAnimeStreams(foundProvider.toLowerCase(), entry.animeId, foundCategory, slug);
            if (mounted && streamsRes?.streams?.length > 0) {
              const hlsStreams = streamsRes.streams.filter((s: any) => s.type === 'hls' || s.url?.includes('.m3u8'));

              if (hlsStreams.length > 0) {
                const getQualityScore = (q: string) => {
                  const lq = (q || '').toLowerCase();
                  if (lq.includes('auto')) return 9999;
                  if (lq.includes('default')) return 9000;
                  if (lq.includes('1080')) return 1080;
                  if (lq.includes('720')) return 720;
                  if (lq.includes('480')) return 480;
                  if (lq.includes('360')) return 360;
                  return parseInt(lq) || 0;
                };

                const bestStream = [...hlsStreams].sort((a, b) => getQualityScore(b.quality) - getQualityScore(a.quality))[0];

                const b64 = btoa(bestStream.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                const proxied = `https://proxypipe-production.up.railway.app/proxy/${b64}`;
                setDirectUrl(bestStream.url);
                setStreamUrl(proxied);
              }
            }
          }
        } catch (e) { console.error("Failed to fetch preview stream", e); }
      }, 600);
    }

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isHovered, entry.animeId, entry.episodeId, entry.episodeNumber, streamUrl]);

  useEffect(() => {
    let mounted = true;
    const fetchThumbnail = async () => {
      try {
        const epsRes = await fetchAnimeEpisodes(Number(entry.animeId));
        if (!mounted) return;

        let foundImage = null;
        if (epsRes?.providers) {
          for (const p of Object.values(epsRes.providers)) {
            const eps = (p as any).episodes?.sub || [];
            const match = eps.find((e: any) => e.number === entry.episodeNumber || String(e.id) === String(entry.episodeId));
            if (match?.image && !match.image.includes('default')) {
              foundImage = match.image;
              break;
            }
          }
        }

        if (foundImage) {
          setThumbnail(foundImage);
          return;
        }

        const info = await fetchAnimeInfo(Number(entry.animeId));
        if (mounted && info?.bannerImage) {
          setThumbnail(info.bannerImage);
        }
      } catch (e) { }
    };
    fetchThumbnail();
    return () => { mounted = false; };
  }, [entry.animeId, entry.episodeNumber, entry.episodeId]);

  const imageSrc = thumbnail || entry.episodeImage || entry.animeBanner || entry.animeCover;
  const timestampStr = entry.currentTime && entry.duration ? `${formatTime(entry.currentTime)} / ${formatTime(entry.duration)}` : '';

  return (
    <div
      className="group relative flex flex-col w-[260px] sm:w-[280px] md:w-[320px] lg:w-[340px] xl:w-[360px] flex-shrink-0 cursor-pointer gap-0 rounded-[20px] p-2.5 bg-transparent border border-transparent transition-all duration-300 hover:bg-white/[0.03] hover:border-white/[0.05] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] snap-start"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-[14px] border border-white/10 bg-[var(--aw-s2)] shadow-md transition-transform duration-300 group-hover:scale-[1.02]">

        <img
          src={imageSrc}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 pointer-events-none"
          alt={entry.animeTitle}
        />

        <AnimatePresence>
          {streamUrl && isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isVideoReady ? 1 : 0 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="absolute inset-0 z-10 w-full h-full pointer-events-none"
            >
              <MediaPlayer
                ref={playerRef}
                src={{ src: streamUrl, type: 'application/vnd.apple.mpegurl' }}
                muted
                autoPlay
                loop
                playsInline
                onProviderChange={(provider) => {
                  if (isHLSProvider(provider)) {
                    provider.config = {
                      enableWorker: true, backBufferLength: 0, maxBufferLength: 30, maxMaxBufferLength: 60,
                      manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 3, fragLoadingMaxRetry: 6,
                      appendErrorMaxRetry: 3, testBandwidth: false
                    };
                  }
                }}
                onCanPlay={() => {
                  if (!playerRef.current || !entry.currentTime) return;
                  const duration = playerRef.current.state?.duration || 0;
                  const parsedTime = entry.currentTime;
                  const currentTime = playerRef.current.currentTime || 0;

                  if (parsedTime > 10 && currentTime < 5 && duration > 0) {
                    const timeDiff = Math.abs(parsedTime - currentTime);
                    if (parsedTime < duration - 10 && timeDiff > 10) {
                      playerRef.current.currentTime = parsedTime;
                    }
                  }
                }}
                onPlaying={() => setIsVideoReady(true)}
                onError={(err) => {
                  if (streamUrl && streamUrl.includes('proxypipe') && directUrl) {
                    setStreamUrl(directUrl);
                  }
                }}
                className="w-full h-full object-cover [&_video]:object-cover transition-transform duration-500 group-hover:scale-105"
              >
                <MediaProvider />
              </MediaPlayer>
            </motion.div>
          )}
        </AnimatePresence>

        {timestampStr && (
          <div className="absolute bottom-2.5 right-2 z-20 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white shadow-lg backdrop-blur-md pointer-events-none border border-white/5">
            {timestampStr}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
          <div className="h-full bg-[var(--aw-accent)] shadow-[0_0_10px_var(--aw-accent-glow)] transition-all duration-500" style={{ width: `${Math.max(2, Math.min(100, progressNum))}%` }} />
        </div>
      </div>

      <div className="flex items-start pt-3 pb-1 px-1 gap-1">
        <div className="flex flex-col flex-1 min-w-0">
          <h3 className="line-clamp-1 text-[15px] font-bold text-white/95 group-hover:text-[var(--aw-accent)] transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {entry.animeTitle}
          </h3>
          <p className="text-[13px] font-medium text-zinc-400 mt-0.5" style={{ fontFamily: 'var(--aw-font-body)' }}>
            <span className="text-white/80 font-bold mr-1">Ep {entry.episodeNumber || '?'}</span>
            {entry.episodeTitle && entry.episodeTitle !== `Episode ${entry.episodeNumber}` ? (
              <><span className="opacity-50">•</span> <span className="line-clamp-1 inline">{entry.episodeTitle}</span></>
            ) : null}
          </p>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 flex-shrink-0 mt-1 ${menuOpen
              ? 'bg-white/10 text-white'
              : 'text-zinc-500 hover:text-white hover:bg-white/[0.06]'
              }`}
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div
              className="ctx-menu absolute right-0 bottom-full mb-2 z-50 w-[160px] rounded-[14px] py-1.5 overflow-hidden"
              style={{
                background: 'var(--app-bg, #0a0a0f)',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClear(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors whitespace-nowrap"
              >
                <Trash2 size={13} className="text-red-400/80 flex-shrink-0" />
                Remove
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onClick(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white transition-colors whitespace-nowrap"
              >
                <RotateCcw size={13} className="text-zinc-400 flex-shrink-0" />
                Restart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────
// HORIZONTAL CAROUSEL
// ─────────────────────────────────────────
const HorizontalCarousel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [children]);

  return (
    <div className="relative group/carousel -mx-4 px-4 sm:mx-0 sm:px-0">
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm text-white/80 border border-white/[0.06] opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 hover:text-white hover:bg-white/15 hover:scale-105 shadow-lg"
        >
          <ChevronLeft size={18} strokeWidth={2.5} />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 backdrop-blur-sm text-white/80 border border-white/[0.06] opacity-0 group-hover/carousel:opacity-100 transition-all duration-200 hover:text-white hover:bg-white/15 hover:scale-105 shadow-lg"
        >
          <ChevronRight size={18} strokeWidth={2.5} />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // py-6 ensures drop shadows and hover transforms aren't clipped top/bottom
        className="flex gap-3 overflow-x-auto overflow-y-visible snap-x snap-mandatory py-6 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .group\\/carousel .flex::-webkit-scrollbar { display: none; }
        `}</style>
        {children}
      </div>
    </div>
  );
};


const AnimeHome: React.FC = () => {

  // Dynamically Set Document Title for SPA
  useEffect(() => {
    document.title = 'Home';
  }, []);

  // ─────────────────────────────────────────
  // CRUCIAL HLS.JS CODEC FIX 
  // ─────────────────────────────────────────
  useEffect(() => {
    const original = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function (mimeType: string) {
      const fixed = mimeType.replace('mp4a.40.1', 'mp4a.40.2');
      if (fixed !== mimeType) console.log('[codec-fix] Remapped:', mimeType, '->', fixed);
      return original.call(this, fixed);
    };
    return () => { MediaSource.prototype.addSourceBuffer = original; };
  }, []);

  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState<AnimeResult[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeResult[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);
  const [friendsActivity, setFriendsActivity] = useState<FriendActivityData[]>([]);

  const [internalIndex, setInternalIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [anilistDescriptions, setAnilistDescriptions] = useState<Record<string, string>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<number>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  useEffect(() => {
    const id = 'aw-design-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Sync Watch History
  useEffect(() => {
    const syncContinue = async () => {
      try {
        if (user) {
          const { data, error } = await supabase.from('anime_watch_history').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(10);
          if (!error && data) {
            setContinueWatching(data.map((d: any) => ({
              kind: 'anime', animeId: d.anime_id, episodeId: d.episode_id, animeTitle: d.anime_title, animeCover: d.anime_cover, episodeTitle: d.episode_title,
              episodeNumber: d.episode_number, href: d.href, duration: d.duration, currentTime: d.progress_time, updatedAt: new Date(d.updated_at).getTime()
            })));
            return;
          }
        }
        const raw = localStorage.getItem('anime-continue-watching');
        if (raw) {
          const parsed = JSON.parse(raw);
          const validEntries = (Array.isArray(parsed) ? parsed : []).filter((e: any) => e.kind === 'anime');
          setContinueWatching(validEntries);
        } else {
          setContinueWatching([]);
        }
      } catch (e) { console.error("Failed to parse continue watching state", e); }
    };
    syncContinue();
    window.addEventListener('storage', syncContinue);
    window.addEventListener('focus', syncContinue);
    return () => { window.removeEventListener('storage', syncContinue); window.removeEventListener('focus', syncContinue); };
  }, [user]);

  // Sync Friends True Activity Status (using explicit DB columns)
  useEffect(() => {
    if (!user) {
      setFriendsActivity([]);
      return;
    }

    const fetchFriends = async () => {
      try {
        const { data: fData } = await supabase.from('friendships').select('user_id, friend_id').eq('status', 'accepted').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        if (!fData || fData.length === 0) return;

        const friendIds = fData.map(f => f.user_id === user.id ? f.friend_id : f.user_id);

        // Include explicit DB columns: status_state, status_text, last_active_at
        const { data: pData } = await supabase.from('profiles').select('id, display_name, avatar_url, role, status_state, status_text, last_active_at').in('id', friendIds);
        if (!pData) return;

        // Still fetch watch history just for the background image fallback
        const { data: wData } = await supabase.from('anime_watch_history')
          .select('user_id, anime_title, episode_number, updated_at, episode_image, anime_cover')
          .in('user_id', friendIds)
          .order('updated_at', { ascending: false });

        const friendsMap = pData.map(p => {
          const latestWatch = wData?.find(w => w.user_id === p.id);

          const lastActiveTime = p.last_active_at ? new Date(p.last_active_at).getTime() : 0;
          const isOnline = (Date.now() - lastActiveTime < 15 * 60 * 1000) && p.status_state && p.status_state !== 'offline';

          return {
            id: p.id,
            display_name: p.display_name || 'Anonymous User',
            avatar_url: p.avatar_url,
            isOnline,
            statusType: isOnline ? p.status_state : 'offline',
            statusText: p.status_text || '',
            lastActivity: latestWatch ? {
              animeTitle: latestWatch.anime_title,
              episodeNumber: latestWatch.episode_number,
              timestamp: latestWatch.updated_at,
              image: latestWatch.episode_image || latestWatch.anime_cover
            } : undefined
          };
        });

        friendsMap.sort((a, b) => {
          if (a.isOnline && !b.isOnline) return -1;
          if (!a.isOnline && b.isOnline) return 1;
          const aTime = a.lastActivity ? new Date(a.lastActivity.timestamp).getTime() : 0;
          const bTime = b.lastActivity ? new Date(b.lastActivity.timestamp).getTime() : 0;
          return bTime - aTime;
        });

        setFriendsActivity(friendsMap);
      } catch (err) {
        console.error("Error fetching friends activity", err);
      }
    };

    fetchFriends();
    const intervalId = setInterval(fetchFriends, 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  // Sync Bookmarks
  useEffect(() => {
    const syncBookmarks = async () => {
      try {
        if (user) {
          const { data, error } = await supabase.from('anime_bookmarks').select('mal_id').eq('user_id', user.id);
          if (!error && data) {
            setBookmarkedIds(new Set(data.map((d: any) => parseInt(d.mal_id, 10)).filter((n: number) => !isNaN(n))));
            return;
          }
        }
        const local = readBookmarks();
        setBookmarkedIds(new Set(local.map((b: BookmarkEntry) => b.malId)));
      } catch (e) { }
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
            user_id: user.id, mal_id: String(malId), title, cover, type: typeLabel, status: 'uncategorized', score: getAnimeScore(anime), created_at: new Date().toISOString(),
          }, { onConflict: 'user_id, mal_id' });
        }
        const { data } = await supabase.from('anime_bookmarks').select('mal_id').eq('user_id', user.id);
        setBookmarkedIds(new Set((data || []).map((d: any) => parseInt(d.mal_id, 10)).filter((n: number) => !isNaN(n))));
      } else {
        if (isBookmarked) { removeBookmark(malId); }
        else {
          const current = readBookmarks();
          const entry: BookmarkEntry = { malId, title, cover, type: typeLabel, status: 'uncategorized', score: getAnimeScore(anime), updatedAt: Date.now() };
          localStorage.setItem('mv_bookmarks', JSON.stringify([entry, ...current.filter(b => b.malId !== malId)]));
        }
        setBookmarkedIds(new Set(readBookmarks().map((b: BookmarkEntry) => b.malId)));
      }
    } catch (e) { } finally { setBookmarkLoading(false); }
  }, [bookmarkedIds, bookmarkLoading, user]);

  const clearContinueWatching = useCallback(async (animeId: string) => {
    try {
      if (user) {
        await supabase.from('anime_watch_history').delete().eq('user_id', user.id).eq('anime_id', animeId);
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
    } catch (e) { }
  }, [user]);

  const handleOpenProfile = (userId: string) => {
    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId } }));
  };

  useEffect(() => {
    const fetchHome = async () => {
      try {
        setLoading(true);
        const [spotlightData, popularData] = await Promise.all([fetchAnimeSpotlight(), fetchAnimePopular(1, 24)]);
        setSpotlight(Array.isArray(spotlightData.results) ? spotlightData.results : []);
        setPopularAnime(Array.isArray(popularData.results) ? popularData.results : []);
      } finally { setLoading(false); }
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
        cleanDesc = cleanDesc.replace(/<[^>]*>?/gm, '');
        return { id: item.id, desc: cleanDesc };
      } catch (e) { return { id: item.id, desc: 'No description available for this series.' }; }
    };
    Promise.all(heroItems.map(fetchDesc)).then(results => {
      const newDescs: Record<string, string> = {}; let updated = false;
      results.forEach(res => { if (res) { newDescs[res.id] = res.desc; updated = true; } });
      if (updated) setAnilistDescriptions(prev => ({ ...prev, ...newDescs }));
    });
  }, [heroItems, anilistDescriptions]);

  useEffect(() => {
    if (heroItems.length <= 1 || isDragging || !isTransitioning) return;
    const intervalId = setInterval(() => {
      if (document.hidden) return;
      setInternalIndex((current) => {
        if (current >= heroItems.length + 1) return current;
        return current + 1;
      });
    }, 7000);
    return () => clearInterval(intervalId);
  }, [heroItems.length, isDragging, isTransitioning, internalIndex]);

  useEffect(() => {
    if (!isTransitioning) return;
    let fallback: ReturnType<typeof setTimeout>;
    if (internalIndex <= 0) {
      fallback = setTimeout(() => { setIsTransitioning(false); setInternalIndex(heroItems.length); }, 1000);
    } else if (internalIndex >= heroItems.length + 1) {
      fallback = setTimeout(() => { setIsTransitioning(false); setInternalIndex(1); }, 1000);
    }
    return () => { if (fallback) clearTimeout(fallback); };
  }, [internalIndex, heroItems.length, isTransitioning]);

  useEffect(() => {
    if (!isTransitioning) {
      if (sliderRef.current) void sliderRef.current.offsetHeight;
      const timer = setTimeout(() => { setIsTransitioning(true); }, 40);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const handleDragStart = (clientX: number) => { setTouchStart(clientX); setIsDragging(true); setDragOffset(0); setDragDistance(0); };
  const handleDragMove = (clientX: number) => { if (!isDragging || touchStart === null) return; const offset = clientX - touchStart; setDragOffset(offset); };
  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false); setDragDistance(Math.abs(dragOffset));
    if (dragOffset > 75) {
      setInternalIndex((prev) => Math.max(0, prev - 1));
    } else if (dragOffset < -75) {
      setInternalIndex((prev) => Math.min(heroItems.length + 1, prev + 1));
    }
    setDragOffset(0); setTouchStart(null);
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    if (dragDistance > 10) { e.preventDefault(); e.stopPropagation(); return; }
    navigate(path);
  };

  return (
    <div className="aw-root relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--app-accent-muted)]">

      <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: '1px solid var(--aw-border)', background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(20px)' }}></div>

      <motion.main variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 mx-auto w-full max-w-[1540px] space-y-10 px-4 md:px-6 lg:px-8 py-8">

        {/* ── HERO SECTION ── */}
        <motion.section variants={itemVariants} className="w-full relative">
          {loading || heroItems.length === 0 ? (
            <div className="h-[400px] lg:h-[480px] w-full rounded-[24px] bg-[var(--app-surface-1)] animate-pulse border border-white/5 shadow-2xl" />
          ) : (
            <div
              className="relative w-full rounded-[24px] bg-[var(--app-surface-1)] border border-white/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] overflow-hidden min-h-[400px] lg:min-h-[480px] cursor-grab active:cursor-grabbing select-none group/hero"
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
                  if (e.target !== sliderRef.current) return;
                  if (heroItems.length <= 1) return;
                  if (internalIndex <= 0) { setIsTransitioning(false); setInternalIndex(heroItems.length); }
                  else if (internalIndex >= carouselItems.length - 1) { setIsTransitioning(false); setInternalIndex(1); }
                }}
              >
                {carouselItems.map((anime, index) => {
                  const key = heroItems.length > 1 ? (index === 0 ? `${anime.id}-clone-start` : index === carouselItems.length - 1 ? `${anime.id}-clone-end` : anime.id) : anime.id;
                  const title = getAnimeDisplayTitle(anime.title);
                  const score = getAnimeScore(anime);
                  const desc = anilistDescriptions[anime.id] || anime.description || (anime as any).synopsis || 'Loading synopsis...';

                  let realIndex = index - 1;
                  if (heroItems.length > 1) {
                    if (index === 0) realIndex = heroItems.length - 1;
                    else if (index === carouselItems.length - 1) realIndex = 0;
                  } else {
                    realIndex = 0;
                  }

                  return (
                    <div key={key} className="w-full h-full flex-shrink-0 relative flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 p-8 md:p-12 lg:p-16 min-h-[400px] lg:min-h-[480px]">

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

                      <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col gap-5 z-10">
                        <h1 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg pr-4" style={{ fontFamily: 'var(--aw-font-display)' }}>
                          {title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-wider" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            #{realIndex + 1} Spotlight
                          </span>
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {getAnimeTypeLabel(anime) || 'TV'}
                          </span>
                          {score ? (
                            <span className="flex items-center gap-1 border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] backdrop-blur-md" style={{ fontFamily: 'var(--aw-font-display)' }}>
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {score.toFixed(1)}
                            </span>
                          ) : null}
                          <span className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md" style={{ fontFamily: 'var(--aw-font-display)' }}>HD</span>
                        </div>

                        <p className={`text-sm md:text-base leading-relaxed line-clamp-3 lg:line-clamp-4 drop-shadow-md ${desc.includes('No description') ? 'text-white/40 italic tracking-wide' : 'text-zinc-300'}`} style={{ fontFamily: 'var(--aw-font-body)' }}>
                          {desc}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-3">
                          <button onClick={(e) => handleNavigation(e, `/watch/${anime.id}`)} onMouseDown={handleRippleMouseDown} className="aw-btn-primary group relative overflow-hidden press-squish flex h-[48px] items-center justify-center gap-2 rounded-[14px] px-6 text-sm font-bold shadow-[0_4px_14px_rgba(0,0,0,0.5)] hover:scale-[1.05] active:scale-[0.96] transition-all duration-300" style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15) drop-shadow(0 0 12px var(--aw-accent-muted))'; }} onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}>
                            <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                            <MonitorPlay size={16} fill="currentColor" className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
                            <span className="relative z-10">Open Series</span>
                          </button>

                          <button onClick={(e) => handleNavigation(e, '/browse')} onMouseDown={handleRippleMouseDown} className="aw-btn-ghost group relative overflow-hidden press-squish flex h-[48px] items-center justify-center gap-2 rounded-[14px] border px-6 text-sm font-bold shadow-md hover:scale-[1.05] active:scale-[0.96] transition-all duration-400" style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--aw-accent), transparent 85%)'; e.currentTarget.style.borderColor = 'var(--aw-accent)'; e.currentTarget.style.color = 'var(--aw-accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.color = 'white'; }}>
                            <div className="absolute inset-0 bg-white/25 translate-x-[-120%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[120%]" />
                            <span className="relative z-10 transition-transform duration-300 group-hover:scale-105">Browse Catalog</span>
                          </button>

                          {heroItems[activeHeroIndex] && (() => {
                            const currentAnime = heroItems[activeHeroIndex];
                            const isBookmarked = bookmarkedIds.has(Number(currentAnime.id));
                            return (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(currentAnime); }}
                                disabled={bookmarkLoading}
                                className={`group relative flex h-[48px] w-[48px] items-center justify-center overflow-hidden rounded-[14px] border hover:scale-[1.05] active:scale-[0.96] active:duration-100 ${isBookmarked ? 'text-[var(--aw-accent)]' : 'text-white'} ${bookmarkLoading ? 'opacity-50 cursor-wait' : ''}`}
                                style={{
                                  background: 'var(--aw-s1)',
                                  borderColor: isBookmarked ? 'var(--aw-accent)' : 'var(--aw-border)',
                                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--aw-accent), transparent 85%)'; e.currentTarget.style.borderColor = 'var(--aw-accent)'; e.currentTarget.style.color = 'var(--aw-accent)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--aw-s1)'; e.currentTarget.style.borderColor = isBookmarked ? 'var(--aw-accent)' : 'var(--aw-border)'; e.currentTarget.style.color = isBookmarked ? 'var(--aw-accent)' : 'white'; }}
                                title={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
                              >
                                {isBookmarked ? <BookmarkCheck size={20} className="transition-transform duration-300 group-hover:scale-110" /> : <Bookmark size={20} className="transition-transform duration-300 group-hover:scale-110" />}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="hidden md:block w-48 lg:w-[260px] xl:w-[280px] flex-shrink-0 z-10 pb-4">
                        <div onClick={(e) => handleNavigation(e, `/watch/${anime.id}`)} className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 cursor-pointer transform transition-transform duration-500 hover:-translate-y-2 hover:scale-[1.02]">
                          <img src={getAnimeCover(anime)} alt={title} draggable="false" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-[var(--app-accent)] text-[#04110d] p-5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out shadow-[0_0_30px_rgba(var(--app-accent-glow),0.6)]">
                              <Play size={26} fill="currentColor" className="ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2.5 items-center z-20 pointer-events-auto" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                {heroItems.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    onClick={() => { if (heroItems.length <= 1) return; setIsTransitioning(true); setInternalIndex(index + 1); }}
                    aria-label={`View slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${index === activeHeroIndex ? 'w-8 bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-muted)]' : 'w-2 bg-white/20 hover:bg-white/50 cursor-pointer'}`}
                  />
                ))}
              </div>

            </div>
          )}
        </motion.section>

        {/* ── FRIENDS ACTIVITY SECTION ── */}
        {user && (
          <motion.section variants={itemVariants} className="flex flex-col w-full mt-4">
            <SectionHeader title="Friends Activity" subtitle="See what your network is watching" />
            {friendsActivity.length > 0 ? (
              <HorizontalCarousel>
                {friendsActivity.map(friend => (
                  <FriendCard key={friend.id} friend={friend} onClick={() => handleOpenProfile(friend.id)} />
                ))}
              </HorizontalCarousel>
            ) : (
              <div className="w-full rounded-[16px] border border-white/5 bg-[var(--aw-s1)] p-8 text-center flex flex-col items-center justify-center gap-3">
                <Users size={24} className="text-zinc-600" />
                <p className="text-[13px] text-zinc-400 font-medium max-w-sm">
                  No friends activity yet. Connect with other users to build your network and see what they are watching!
                </p>
              </div>
            )}
          </motion.section>
        )}

        {/* ── CONTINUE WATCHING SECTION ── */}
        {continueWatching.length > 0 && (
          <motion.section variants={itemVariants} className="flex flex-col w-full mt-4">
            <SectionHeader title="Continue Watching" subtitle={`${continueWatching.length} in progress`} onViewMore={() => navigate('/continuewatching')} />
            <HorizontalCarousel>
              {continueWatching.slice(0, 12).map((entry) => (
                <ContinueWatchingCard
                  key={`${entry.animeId}-${entry.episodeId}`}
                  entry={entry}
                  onClick={() => navigate(entry.href || `/watch/${entry.animeId}`)}
                  onClear={() => clearContinueWatching(entry.animeId)}
                />
              ))}
            </HorizontalCarousel>
          </motion.section>
        )}

        {/* ── TRENDING NOW ── */}
        <motion.section variants={itemVariants} className="flex flex-col w-full mt-4">
          <SectionHeader title="Trending Now" subtitle="The Most Popular Series This Week" onViewMore={() => navigate('/browse')} />
          <HorizontalCarousel>
            {loading
              ? Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[2/3] w-[160px] sm:w-[175px] md:w-[190px] lg:w-[200px] flex-shrink-0 rounded-[12px] bg-white/[0.02] border border-white/5 animate-pulse" />)
              : popularAnime.slice(0, 10).map((anime) => {
                return (
                  <MediaCard
                    key={anime.id}
                    title={getAnimeDisplayTitle(anime.title)}
                    image={getAnimeCover(anime)}
                    badge={getAnimeTypeLabel(anime) || 'TV'}
                    subtitle={extractAnimeDetails(anime)}
                    onClick={() => navigate(`/watch/${anime.id}`)}
                  />
                );
              })}
          </HorizontalCarousel>
        </motion.section>

        {/* ── RECOMMENDED ── */}
        <motion.section variants={itemVariants} className="flex flex-col w-full mt-4">
          <SectionHeader title="Recommended For You" subtitle="Our personal choice for you" onViewMore={() => navigate('/browse')} />
          <HorizontalCarousel>
            {loading
              ? Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[2/3] w-[160px] sm:w-[175px] md:w-[190px] lg:w-[200px] flex-shrink-0 rounded-[12px] bg-white/[0.02] border border-white/5 animate-pulse" />)
              : spotlight.slice(0, 10).map((anime) => {
                return (
                  <MediaCard
                    key={anime.id}
                    title={getAnimeDisplayTitle(anime.title)}
                    image={getAnimeCover(anime)}
                    badge={getAnimeTypeLabel(anime) || 'TV'}
                    subtitle={extractAnimeDetails(anime)}
                    onClick={() => navigate(`/watch/${anime.id}`)}
                  />
                );
              })}
          </HorizontalCarousel>
        </motion.section>

      </motion.main>
    </div>
  );
};

export default AnimeHome;
/* --- END OF FILE AnimeHome.tsx --- */