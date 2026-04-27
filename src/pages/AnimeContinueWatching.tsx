/* --- START OF FILE AnimeContinueWatching.tsx --- */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, Trash2, MonitorPlay, ChevronLeft } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

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

  /* Media Card Styles */
  .aw-media-card { transition: transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94); }
  .aw-media-card-img { transition: all 0.3s cubic-bezier(0.25,1,0.5,1); border: 1px solid var(--aw-border); }
  .aw-media-card:hover .aw-media-card-img {
    transform: translateY(-4px);
    border-color: var(--aw-accent-dim);
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.5);
  }
  .aw-media-card:hover img { transform: scale(1.08); }
  .aw-media-card-play { box-shadow: 0 0 30px rgba(0, 0, 0, 0.5); }

  /* Skeleton Animation to prevent grid flickering */
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
// MEDIA CARD COMPONENT
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

const MediaCard: React.FC<MediaCardProps> = ({ title, image, subtitle, badge, progress, onClick, onClear }) => {
    const clampedProgress = progress !== undefined ? Math.max(2, Math.min(100, progress)) : undefined;

    return (
        <div className="aw-media-card group relative flex w-full cursor-pointer flex-col gap-3" onClick={onClick}>
            <div className="bg-black/40 aw-media-card-img relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[var(--aw-card)]">
                <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-90 group-hover:opacity-100" />

                {badge && (
                    <div className="absolute top-2 left-2 z-20 rounded-md border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-md">
                        <span className="block text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}>
                            {badge}
                        </span>
                    </div>
                )}

                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100">
                    <div className="aw-media-card-play flex h-12 w-12 items-center justify-center rounded-full translate-y-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-y-0" style={{ background: 'var(--aw-accent)', color: '#04110d' }}>
                        <Play size={20} className="ml-1" fill="currentColor" />
                    </div>
                </div>

                {onClear && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 z-20 rounded-full border border-white/10 bg-black/60 p-1.5 text-white/70 backdrop-blur-md shadow-lg opacity-0 transition-all duration-300 hover:bg-white hover:text-black group-hover:opacity-100 pointer-events-auto"
                    >
                        <X size={14} strokeWidth={3} />
                    </button>
                )}

                {clampedProgress !== undefined && (
                    <div className="absolute bottom-0 left-0 right-0 z-20 h-1.5 bg-black/50 backdrop-blur-sm">
                        <div className="h-full rounded-r-full shadow-[0_0_10px_var(--aw-accent-glow)] transition-all duration-500 ease-out" style={{ width: `${clampedProgress}%`, background: 'var(--aw-accent)' }} />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-1 px-0.5">
                <h3 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 13, fontWeight: 700, color: 'var(--aw-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
                    {title}
                </h3>
                {subtitle && (
                    <span style={{ fontFamily: 'var(--aw-font-body)', fontSize: 11, fontWeight: 400, color: 'var(--aw-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subtitle}
                    </span>
                )}
            </div>
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
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {Array.from({ length: 12 }).map((_, index) => (
                            <div key={index} className="aspect-[2/3] w-full rounded-[14px] bg-[var(--aw-card)] border border-[var(--aw-border)] aw-skeleton" />
                        ))}
                    </div>
                ) : continueWatching.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                        {continueWatching.map((entry) => {
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