/* --- START OF FILE AnimeContinueWatching.tsx --- */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, Trash2, MonitorPlay, ChevronLeft, Star } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

// Define types
interface WatchHistoryData {
    anime_id: string;
    episode_id: string;
    anime_title: string;
    anime_cover: string | null;
    episode_title: string;
    episode_number: number;
    href: string;
    duration: number | null;
    progress_time: number | null;
    updated_at: string;
}

interface WatchHistoryResponse {
    anime_id: string;
    episode_id: string;
    anime_title: string;
    anime_cover: string | null;
    episode_title: string;
    episode_number: number;
    href: string;
    duration: number | null;
    progress_time: number | null;
    updated_at: string;
}

// ─────────────────────────────────────────
// DESIGN STYLES
// ─────────────────────────────────────────
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

  /* Premium Horizontal Card Styles */
  .aw-media-card {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    will-change: transform, box-shadow, border-color;
  }
  
  .aw-media-card:hover {
    transform: translateY(-6px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
    background: color-mix(in srgb, var(--aw-accent), transparent 92%);
  }

  .aw-media-card:active {
    transform: scale(0.96);
    filter: brightness(0.8);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Skeleton Animation */
  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .aw-skeleton { 
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); 
    background-size: 400px 100%; 
    animation: shimmer 1.4s ease infinite; 
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

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
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
// PREMIUM HORIZONTAL MEDIA CARD
// ─────────────────────────────────────────
interface MediaCardProps {
    title: string;
    image: string;
    subtitle?: string;
    badge?: string;
    score?: number | null;
    progress?: number;
    timestamp?: string;
    onClick: () => void;
    onClear?: () => void;
}

const MediaCard: React.FC<MediaCardProps> = ({
    title,
    image,
    subtitle,
    badge,
    score,
    progress,
    timestamp,
    onClick,
    onClear,
}) => {
    const clampedProgress = progress !== undefined ? Math.max(2, Math.min(100, progress)) : undefined;

    return (
        <div
            className="aw-media-card group relative flex h-[135px] w-full cursor-pointer gap-4 overflow-hidden rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] p-3 select-none"
            onClick={onClick}
        >
            {/* Image Container (Left) */}
            <div className="relative aspect-[3/4] w-[80px] sm:w-[90px] flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.02]">
                <img
                    src={image}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-95 group-hover:opacity-100 group-hover:scale-110 pointer-events-none"
                />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--aw-accent)] text-[#04110d] shadow-[0_0_20px_rgba(var(--aw-accent-glow),0.5)] transform scale-75 group-hover:scale-100 transition-transform duration-500 ease-out">
                        <Play size={20} className="ml-1" fill="currentColor" />
                    </div>
                </div>
            </div>

            {/* Content Container (Right) */}
            <div className="relative flex min-w-0 flex-1 flex-col justify-center py-1.5 pr-5">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                    {badge && (
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-[var(--aw-accent)] border border-white/5 shadow-sm" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {badge}
                        </span>
                    )}
                    {score ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            <Star size={11} className="fill-amber-400" />
                            {score.toFixed(1)}
                        </span>
                    ) : null}
                </div>

                <h3 className="line-clamp-2 text-[14px] sm:text-[15px] font-bold leading-tight text-white/95 group-hover:text-white transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
                    {title}
                </h3>

                {(subtitle || timestamp) && (
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        {subtitle && (
                            <p className="flex items-center gap-2 text-[12px] font-medium text-zinc-400 line-clamp-1" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                {subtitle}
                            </p>
                        )}
                        {timestamp && (
                            <span className="text-[10px] font-bold text-zinc-500 whitespace-nowrap ml-auto" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                {timestamp}
                            </span>
                        )}
                    </div>
                )}

                {/* Progress Rail tightly packed below */}
                {clampedProgress !== undefined && (
                    <div className="mt-2 w-full">
                        <div className="h-1.5 w-full rounded-full bg-black/50 overflow-hidden border border-white/5">
                            <div
                                className="h-full rounded-full bg-[var(--aw-accent)] shadow-[0_0_10px_var(--aw-accent-glow)] transition-all duration-500"
                                style={{ width: `${clampedProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Clear Button */}
            {onClear && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute top-3 right-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white/50 opacity-0 transition-all duration-300 hover:bg-red-500 hover:text-white group-hover:opacity-100 border border-white/10 backdrop-blur-sm pointer-events-auto"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
const AnimeContinueWatching: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Inject Design Styles
    useEffect(() => {
        document.title = 'Continue Watching';
        const id = 'aw-design-styles';
        if (!document.getElementById(id)) {
            const tag = document.createElement('style');
            tag.id = id;
            tag.textContent = DESIGN_STYLES;
            document.head.appendChild(tag);
        }
        return () => { document.getElementById(id)?.remove(); };
    }, []);

    // Fetch Data
    const syncContinue = useCallback(async () => {
        try {
            setLoading(true);
            if (user) {
                const { data, error } = await supabase
                    .from('anime_watch_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false });

interface WatchHistoryData {
    anime_id: string;
    episode_id: string;
    anime_title: string;
    anime_cover: string | null;
    episode_title: string;
    episode_number: number;
    href: string;
    duration: number | null;
    progress_time: number | null;
    updated_at: string;
}

// In syncContinue function:
if (!error && data) {
    const validData = data.filter((d: WatchHistoryData) => 
        d.anime_id && d.episode_id && d.anime_title && d.href
    );
    setContinueWatching(validData.map((d: WatchHistoryData) => ({
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

            // Fallback to local storage
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
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        syncContinue();
        window.addEventListener('storage', syncContinue);
        window.addEventListener('focus', syncContinue);
        return () => {
            window.removeEventListener('storage', syncContinue);
            window.removeEventListener('focus', syncContinue);
        };
    }, [syncContinue]);

    // Clear Single Item
    const clearContinueWatching = useCallback(async (animeId: string) => {
        try {
            if (user) {
                await supabase
                    .from('anime_watch_history')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('anime_id', animeId);
            }

            const raw = localStorage.getItem('anime-continue-watching');
            if (raw) {
                const parsed = JSON.parse(raw);
                const filtered = parsed.filter((entry: ContinueWatchingEntry) => String(entry.animeId) !== String(animeId));
                localStorage.setItem('anime-continue-watching', JSON.stringify(filtered));
                window.dispatchEvent(new Event('storage'));
            }

            setContinueWatching(prev => prev.filter(e => String(e.animeId) !== String(animeId)));
        } catch (e) {
            console.error("Failed to clear continue watching entry", e);
        }
    }, [user]);

    // Clear All Items
    const clearAllHistory = useCallback(async () => {
        if (!window.confirm("Are you sure you want to clear your entire watch history?")) return;

        try {
            if (user) {
                await supabase
                    .from('anime_watch_history')
                    .delete()
                    .eq('user_id', user.id);
            }

            const raw = localStorage.getItem('anime-continue-watching');
            if (raw) {
                const parsed = JSON.parse(raw);
                const remaining = parsed.filter((entry: ContinueWatchingEntry) => entry.kind !== 'anime');
                localStorage.setItem('anime-continue-watching', JSON.stringify(remaining));
                window.dispatchEvent(new Event('storage'));
            }

            setContinueWatching([]);
        } catch (e) {
            console.error("Failed to clear all history", e);
        }
    }, [user]);

    return (
        <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white pt-6">

            <main className="relative z-10 mx-auto w-full max-w-[1460px] px-4 md:px-8 py-8 pb-20">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10" style={{ padding: '0 4px' }}>

                    <div className="flex flex-col gap-5">
                        {/* Clean Back Button */}
                        <button
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors w-fit"
                            style={{ fontFamily: 'var(--aw-font-display)', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Go Back
                        </button>

                        <div>
                            <p className="aw-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <MonitorPlay size={12} /> Watch History
                            </p>
                            <h1 style={{
                                fontFamily: 'var(--aw-font-display)',
                                fontSize: 'clamp(28px, 4vw, 42px)',
                                fontWeight: 800,
                                color: 'var(--aw-text)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.1,
                                margin: 0,
                            }}>
                                Continue Watching
                            </h1>
                            <p className="mt-2 text-sm text-white/50" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                {continueWatching.length} {continueWatching.length === 1 ? 'series' : 'series'} in progress
                            </p>
                        </div>
                    </div>

                    {continueWatching.length > 0 && (
                        <button
                            onClick={clearAllHistory}
                            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            style={{ fontFamily: 'var(--aw-font-display)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                            Clear History
                        </button>
                    )}
                </div>

                {/* Content Section */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 12 }).map((_, index) => (
                            <div key={index} className="h-[135px] w-full rounded-[20px] bg-[var(--aw-card)] border border-[var(--aw-border)] aw-skeleton" />
                        ))}
                    </div>
                ) : continueWatching.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {continueWatching.map((entry) => {
                            const progressNum = entry.currentTime && entry.duration ? (entry.currentTime / entry.duration) * 100 : Math.floor(Math.random() * 60) + 20;
                            let timestampStr;
                            if (entry.currentTime && entry.duration) {
                                timestampStr = `${formatTime(entry.currentTime)} / ${formatTime(entry.duration)}`;
                            }

                            return (
                                <MediaCard
                                    key={`${entry.animeId}-${entry.episodeId}`}
                                    title={entry.animeTitle}
                                    image={entry.animeCover || '/placeholder-anime-cover.png'}
                                    subtitle={`Episode ${entry.episodeNumber || '?'}`}
                                    badge="Watching"
                                    progress={progressNum}
                                    timestamp={timestampStr}
                                    onClick={() => {
                                        if (entry.href) {
                                            navigate(entry.href);
                                        } else {
                                            navigate(`/watch/${entry.animeId}`);
                                        }
                                    }}
                                    onClear={() => clearContinueWatching(entry.animeId)}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 px-4 text-center bg-[var(--aw-s1)] rounded-2xl border border-[var(--aw-border)] mt-4 shadow-2xl">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                            <MonitorPlay size={32} className="text-white/30" />
                        </div>
                        <h2 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                            No active shows
                        </h2>
                        <p style={{ color: 'var(--aw-muted)', maxWidth: 400, marginBottom: 24, fontSize: 14 }}>
                            You haven't started watching anything yet, or you've cleared your history. Start a new adventure today!
                        </p>
                        <button
                            onClick={() => navigate('/browse')}
                            className="px-8 py-3.5 rounded-xl text-[#04110d] font-black uppercase tracking-[0.15em] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', fontSize: 12 }}
                        >
                            Find Anime to Watch
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AnimeContinueWatching;