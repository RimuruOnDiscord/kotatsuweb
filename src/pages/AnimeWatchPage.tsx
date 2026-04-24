/* ─── START OF FILE AnimeWatchPage.tsx ────────────────────────────── */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft, ChevronsRight, Loader2, AlertCircle, FastForward,
  Server, MonitorPlay, Layers, ArrowDownUp, Link2, Activity, Database, Terminal
} from 'lucide-react';

import {
  fetchAnimeInfo, // Make sure to add this to your animeApi.ts!
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  getProviderEpisodes,
  AnimeWatchProviderPayload,
  fetchAnimeStreams
} from '../utils/animeApi';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance, isHLSProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

/* ─── Proxy Configuration ───────────────────────────────────────── */
const WORKER_PROXY_URL = "https://proxypipe.vercel.app";

/* ─── Font & Design Tokens Injection ─────────────────────────────── */
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

  .aw-layout { 
    max-width: 1460px; 
    margin: 0 auto; 
    width: 100%; 
    padding: 32px 16px; 
    gap: 32px; 
    position: relative; 
    z-index: 10; 
    z-index: 10; 
    display: grid; 
    grid-template-columns: 1fr; 
  }
  .aw-main { 
    min-width: 0; 
    width: 100%; 
    display: flex; 
    flex-direction: column; 
    gap: 32px; 
    position: relative; 
    z-index: 50; 
  }
  .aw-sidebar {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: rgba(10, 10, 15, 0.1) !important;
    backdrop-filter: blur(12px) saturate(120%) !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 40px 100px -30px rgba(0,0,0,0.8);
    height: fit-content;
  }

  @media (min-width: 1280px) {
    .aw-layout { grid-template-columns: 1fr 380px; align-items: start; }
    .aw-sidebar { 
      position: sticky; 
      top: 100px; 
      max-height: calc(100vh - 140px); 
    }
  }

  .aw-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
  .aw-scroll::-webkit-scrollbar-track { background: transparent; }
  .aw-scroll::-webkit-scrollbar-thumb { background: var(--aw-accent-dim); border-radius: 2px; }
  .aw-scroll::-webkit-scrollbar-thumb:hover { background: var(--aw-accent); }

  .ep-item { transition: background 0.18s, border-color 0.18s; }
  .ep-item:hover .ep-thumb { transform: scale(1.05); }
  .ep-thumb { transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94); }

  .aw-action-btn { transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s; }
  .aw-action-btn:hover:not(:disabled) { background: var(--aw-s2) !important; border-color: var(--aw-accent-dim) !important; color: var(--aw-accent) !important; transform: translateY(-1px); box-shadow: 0 12px 24px -20px var(--aw-accent-glow); }
  .aw-action-btn:active:not(:disabled) { transform: translateY(0); }

  .aw-segment-btn { transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, filter 0.2s; }
  .aw-segment-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .aw-segment-btn[data-active='false']:hover { background: rgba(255,255,255,0.08) !important; color: var(--aw-text) !important; }
  .aw-segment-btn[data-active='true']:hover { background: var(--aw-s2) !important; color: var(--aw-accent) !important; box-shadow: 0 8px 22px -18px var(--aw-accent-glow); filter: brightness(1.08); }

  .skip-btn { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  .skip-btn:hover { background: rgba(255, 255, 255, 0.2) !important; transform: scale(1.05) translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1) !important; }

  .aw-toggle { cursor: pointer; }
  .aw-toggle-track, .aw-toggle-label { transition: all 0.2s cubic-bezier(0.25,0.46,0.45,0.94); }
  .aw-toggle:hover .aw-toggle-track[data-checked='false'] { background: rgba(255,255,255,0.06) !important; border-color: var(--aw-accent-dim) !important; }
  .aw-toggle:hover .aw-toggle-track[data-checked='true'] { filter: brightness(1.08); box-shadow: 0 0 16px -8px var(--aw-accent-glow); }
  .aw-toggle:hover .aw-toggle-label { color: var(--aw-text) !important; }

  @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(-8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
  .aw-toast { animation: toastIn 0.25s ease forwards; }

  @keyframes markerSlide { from { height: 0; } to { height: 100%; } }
  .ep-active-marker { animation: markerSlide 0.3s ease forwards; }

  @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
  .aw-skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%); background-size: 400px 100%; animation: shimmer 1.4s ease infinite; }

  .aw-label { font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase; color: var(--aw-accent); }
  
  .genre-pill { background: var(--aw-bg); border: 1px solid var(--aw-border); color: var(--aw-text); font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.1em; font-weight: 600; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; transition: background 0.15s; }
  .genre-pill:hover { background: var(--aw-accent); }

  .aw-noise::before { content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E"); background-repeat: repeat; background-size: 180px; }

  @keyframes epSlideIn {
    from { opacity: 0; transform: translateX(8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .ep-slide-in {
    animation: epSlideIn 0.3s cubic-bezier(0.25, 1, 0.5, 1) both;
  }

  @keyframes btnShimmer {
    0% { transform: translateX(-150%) skewX(-25deg); }
    100% { transform: translateX(150%) skewX(-25deg); }
  }
  .aw-btn-shimmer {
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--aw-accent), transparent 90%), transparent);
    width: 60%;
    height: 100%;
    left: 0;
    top: 0;
    position: absolute;
    animation: btnShimmer 3.5s infinite ease-in-out;
    pointer-events: none;
  }
  .aw-shimmer-wrapper {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }
  .aw-action-hover {
    transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  .aw-action-hover:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.2);
    box-shadow: 0 10px 25px -10px rgba(0,0,0,0.6);
    background: rgba(255,255,255,0.08) !important;
  }
  .aw-action-hover:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const handleRippleMouseDown = (_event: React.MouseEvent<HTMLButtonElement>) => { };

interface StreamSource { url: string; type: string; quality: string; referer?: string; }
interface StreamSubtitle { file: string; label: string; }
interface StreamData {
  streams: StreamSource[];
  subtitles?: StreamSubtitle[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

/* ─── Timeline / Slug Helpers ────────────────────────────────────── */
export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
};

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

/* ─── Toggle Component ────────────────────────────────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  accent?: string;
}> = ({ checked, onChange, label, accent = 'var(--aw-accent)' }) => (
  <label
    className="aw-toggle flex items-center gap-3 select-none"
    onClick={() => onChange(!checked)}
    style={{ fontFamily: 'var(--aw-font-display)' }}
  >
    <div
      className="aw-toggle-track"
      data-checked={checked}
      style={{
        width: 32, height: 18, borderRadius: 100,
        background: checked ? accent : 'var(--aw-bg)',
        border: `1px solid ${checked ? accent : 'var(--aw-border)'}`,
        position: 'relative', transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      <div
        className="aw-toggle-knob"
        style={{
          position: 'absolute', top: 2, left: checked ? 16 : 2,
          width: 12, height: 12, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: checked ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
      />
    </div>
    <span
      className="aw-toggle-label"
      style={{
        fontSize: 10, letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase',
        color: checked ? 'var(--aw-text)' : 'var(--aw-muted)', transition: 'color 0.2s',
      }}
    >
      {label}
    </span>
  </label>
);

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { user } = useAuth();

  // Patch MediaSource to remap unsupported AAC Main (mp4a.40.1) -> AAC-LC (mp4a.40.2).
  // owocdn streams declare mp4a.40.1 which browsers reject in MSE — audio data is
  // identical, only the profile flag differs. This prevents bufferAddCodecError loops.
  useEffect(() => {
    const original = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function (mimeType: string) {
      const fixed = mimeType.replace('mp4a.40.1', 'mp4a.40.2');
      if (fixed !== mimeType) console.log('[codec-fix] Remapped:', mimeType, '->', fixed);
      return original.call(this, fixed);
    };
    return () => {
      MediaSource.prototype.addSourceBuffer = original;
    };
  }, []);
  const { animeId: urlSlug, provider, category, episodeId } = useParams<{
    animeId: string;
    provider?: string;
    category?: 'sub' | 'dub';
    episodeId?: string;
  }>();

  const navigate = useNavigate();
  const activeEpRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);

  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);

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
  const [viewMode, setViewMode] = useState<'user' | 'dev'>('user');

  const [customStreamUrl, setCustomStreamUrl] = useState('');
  const [customReferer, setCustomReferer] = useState('');

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [proxyProvider, setProxyProvider] = useState<string>('lunaranime');
  const [proxifiedSources, setProxifiedSources] = useState<Record<string, string>>({});
  const [proxifiedStreamUrl, setProxifiedStreamUrl] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);
  useEffect(() => { localStorage.setItem('watchEpisodeSortOrder', episodeSortOrder); }, [episodeSortOrder]);

  // Sync Remote Progress from SQL
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
          localStorage.setItem(`progress-${episodeId}`, data.progress_time.toString());
        }
      } catch (e) {
        console.warn('Sync Remote Progress error:', e);
      }
    };
    fetchRemoteProgress();
  }, [user, urlSlug, episodeId]);

  // Inject design styles
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

  const availableProviders = Object.keys(episodesData);
  const rankedProviders = useMemo(() => rankProviders(availableProviders), [availableProviders]);

  /* ─── DATA ORCHESTRATION: INFO -> RELATIONS -> EPISODES ───────── */
  useEffect(() => {
    let isMounted = true;

    const loadAnimeData = async () => {
      if (!urlSlug) return;
      setLoadingEpisodes(true);

      try {
        // 1. Resolve Anilist ID
        let anilistId = Number(urlSlug);
        if (isNaN(anilistId)) {
          // Fallback search if a text slug was passed
          const searchRes = await fetchAnimeSearch(urlSlug, 1);
          if (searchRes?.results?.length) {
            anilistId = searchRes.results[0].id;
          } else {
            throw new Error("Anime not found in database.");
          }
        }

        if (!isMounted) return;
        setResolvedId(anilistId);

        // 2. Fetch /info/{id} and /episodes/{id} concurrently
        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(anilistId),
          fetchAnimeEpisodes(anilistId)
        ]);

        if (!isMounted) return;

        setAnimeInfo(info);
        setEpisodesData(epsPayload?.providers || {});

        // 3. Build Seasons (Recursive-like Iterative Deep Search)
        const allowedRelations = ['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'];
        const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT', 'OVA', 'ONA', 'MOVIE'];
        const currentTitle = info.title?.english || info.title?.romaji || info.title?.native || '?';
        const baseTitle = getBaseTitle(currentTitle);

        const seenIds = new Set<number>([info.id]);
        const tabs: any[] = [{
          id: info.id,
          title: currentTitle,
          format: info.format,
          active: true,
          displayLabel: '',
        }];

        // Queue for deep exploration
        let queue = [info];
        let depth = 0;
        const MAX_DEPTH = 3; // Explore up to 3 levels deep (e.g. S1 -> S2 -> S3 -> S4)
        const MAX_TOTAL = 15; // Safeguard against massive franchises

        while (queue.length > 0 && depth < MAX_DEPTH && tabs.length < MAX_TOTAL) {
          const nextQueue: any[] = [];

          // Collect all valid related IDs from current queue
          const idsToFetch: number[] = [];
          queue.forEach(item => {
            item.relations?.edges?.forEach((edge: any) => {
              const node = edge.node;
              if (
                node?.type === 'ANIME' &&
                allowedRelations.includes(edge.relationType) &&
                !excludedFormats.includes(node.format) &&
                !seenIds.has(node.id)
              ) {
                idsToFetch.push(node.id);
                seenIds.add(node.id);
              }
            });
          });

          if (idsToFetch.length === 0) break;

          // Fetch info for this level's new IDs
          const results = await Promise.allSettled(
            idsToFetch.slice(0, 5).map(id => fetchAnimeInfo(id)) // Cap per-level fetch
          );

          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              tabs.push({
                id: res.value.id,
                title: res.value.title?.english || res.value.title?.romaji || res.value.title?.native || '',
                format: res.value.format,
                active: false,
                displayLabel: '',
              });
              nextQueue.push(res.value);
            }
          });

          queue = nextQueue;
          depth++;
        }

        if (!isMounted) return;

        // Sort by AniList ID (Release Order)
        tabs.sort((a: any, b: any) => a.id - b.id);

        // Assign labels
        tabs.forEach((tab, idx) => {
          tab.displayLabel = generateTabLabel(tab.title, baseTitle, idx);
        });

        setSeasons(tabs);

      } catch (err) {
        console.error("Watch Page Load Error:", err);
        if (isMounted) setEpisodesData({});
      } finally {
        if (isMounted) setLoadingEpisodes(false);
      }
    };

    loadAnimeData();
    return () => { isMounted = false; };
  }, [urlSlug]);

  // Auto-redirect to best server
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
    if (episodeSortOrder === 'desc') {
      filtered = [...filtered].reverse();
    }
    return filtered;
  }, [providerEpisodes, epSearchQuery, episodeSortOrder]);

  const currentIndex = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];

  useEffect(() => {
    if (!loadingEpisodes && activeEpRef.current) {
      activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loadingEpisodes, episodeId, currentProvider, currentCategory]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  // Fetch streaming data
  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider) return;
    let mounted = true;
    const load = async () => {
      setStreamLoading(true); setStreamData(null); setStreamError(null);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        const pure = extractSlug(currentEpData.id);
        // This maps to /watch/${provider}/${anilistId}/${category}/${slug}
        const data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', pure);
        if (!data.streams?.length) throw new Error('Server is not responding.');
        console.log('[STREAM FULL]', JSON.stringify(data, null, 2));
        if (mounted) setStreamData(data as any);

        // Locate the specific intro and outro fields for anime titles by checking designated providers
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
                  console.log(`[Skip Times] Found via ${sp}`, { intro: spData.intro, outro: spData.outro });
                  if (mounted) {
                    setStreamData((prev: any) => ({
                      ...prev,
                      intro: spData.intro || prev?.intro,
                      outro: spData.outro || prev?.outro,
                    }));
                  }
                  break; // Stop searching once fields are identified
                }
              }
            } catch (e) {
              console.warn(`[Skip Times] Failed checking ${sp}`, e);
            }
          }
        }
      } catch (err: any) {
        if (mounted) setStreamError(err.message || 'Failed to load media.');
      } finally {
        if (mounted) setStreamLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentEpData?.id, resolvedId, currentProvider, currentCategory]);

  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(-1);

  // Auto-default to Internal Provider
  useEffect(() => {
    if (streamData?.streams && streamData.streams.length > 0 && selectedStreamIndex === -1) {
      // Look for an internal HLS stream first
      const internalIndex = streamData.streams.findIndex((s: any) =>
        s.type === 'hls' || (!s.url.includes('iframe') && !s.url.includes('/embed/') && s.url.includes('.m3u8'))
      );

      if (internalIndex !== -1) {
        console.log('[Source Selection] Defaulting to Internal Provider:', streamData.streams[internalIndex].quality);
        setSelectedStreamIndex(internalIndex);
      } else {
        // Fallback to the first available stream if no internal stream is found
        setSelectedStreamIndex(0);
      }
    }
  }, [streamData, selectedStreamIndex]);

  const activeStream = useMemo<any>(() => {
    if (!streamData?.streams) return null;
    const stream = streamData.streams[selectedStreamIndex] || streamData.streams[0];
    if (!stream) return null;
    if ((stream.type === 'embed' || stream.url.includes('iframe') || stream.url.includes('/embed/')) && !stream.url.includes('.m3u8')) {
      return { ...stream, type: 'embed' };
    }
    return { ...stream, type: 'hls' };
  }, [streamData, selectedStreamIndex]);

  const [isProxifying, setIsProxifying] = useState(false);

  useEffect(() => {
    let mounted = true;
    setProxifiedStreamUrl(null);
    setProxifiedSources({});

    if (!activeStream?.url?.includes('.m3u8') || !activeStream?.url) {
      setIsProxifying(false);
      return;
    }

    setIsProxifying(true);
    try {
      const b64 = btoa(activeStream.url)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      const url = `https://proxypipe.vercel.app/proxy/${b64}`;
      if (mounted) {
        setProxifiedSources({ proxypipe: url });
        setProxifiedStreamUrl(url);
      }
    } finally {
      if (mounted) setIsProxifying(false);
    }

    return () => { mounted = false; };
  }, [activeStream]);

  // ─── BULLETPROOF CONTINUE WATCHING ENGINE ──────────────────────────────────────
  const derivedTitle = typeof animeInfo?.title === 'string'
    ? animeInfo.title
    : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');

  const progressDataRef = useRef<any>(null);
  const playingEpisodeRef = useRef<string>(''); // Tracks strictly what stream is loaded
  const videoStateRef = useRef({ episodeId: '', currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);

  // Safely lock the tracker to the currently playing video
  useEffect(() => {
    if (streamData && currentEpData?.id) {
      playingEpisodeRef.current = extractSlug(currentEpData.id);
    }
  }, [streamData, currentEpData]);

  progressDataRef.current = {
    animeId: String(resolvedId || urlSlug),
    episodeId: currentEpData ? extractSlug(currentEpData.id) : '',
    animeTitle: displayTitle,
    animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
    episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
    episodeNumber: currentEpData?.number || 0,
    href: (currentEpData && urlSlug) ? getEpisodeHref(urlSlug, currentProvider, currentCategory, currentEpData.id) : ''
  };

  const forceSaveProgress = useCallback(async (explicitPayload?: any) => {
    const payload = explicitPayload?.episodeId ? explicitPayload : progressDataRef.current;
    if (!payload?.episodeId) return;

    let currentTime = 0;
    let duration = 0;

    // 1. STRICT CHECK: Only use the saved time if it belongs to the episode we are saving!
    if (videoStateRef.current.episodeId === payload.episodeId) {
      currentTime = videoStateRef.current.currentTime || 0;
      duration = videoStateRef.current.duration || 0;
    }

    // 2. Fallback to playerRef ONLY if we know it's currently playing this exact episode
    if (currentTime === 0 && playingEpisodeRef.current === payload.episodeId && playerRef.current) {
      const vTime = playerRef.current.state.currentTime;
      const vDur = playerRef.current.state.duration;
      if (Number.isFinite(vTime) && vTime > 0) currentTime = vTime;
      if (Number.isFinite(vDur) && vDur > 0) duration = vDur;
    }

    const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 0;
    const safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;

    if (safeTime < 3) return;

    try {
      if (user) {
        await supabase.from('anime_watch_history').upsert({
          user_id: user.id,
          anime_id: String(payload.animeId),
          episode_id: String(payload.episodeId),
          anime_title: payload.animeTitle,
          anime_cover: payload.animeCover,
          episode_title: payload.episodeTitle,
          episode_number: payload.episodeNumber,
          href: payload.href,
          duration: safeDuration,
          progress_time: safeTime,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, anime_id' });
      }

      localStorage.setItem(`progress-${payload.episodeId}`, safeTime.toString());

      const raw = localStorage.getItem('anime-continue-watching');
      const entries = raw ? JSON.parse(raw) : [];
      const filtered = (Array.isArray(entries) ? entries : []).filter(
        (e: any) => String(e.animeId) !== String(payload.animeId)
      );

      filtered.unshift({
        kind: 'anime',
        ...payload,
        duration: safeDuration,
        currentTime: safeTime,
        updatedAt: Date.now()
      });

      localStorage.setItem('anime-continue-watching', JSON.stringify(filtered.slice(0, 40)));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Failed to save progress', e);
    }
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
    };
  }, [forceSaveProgress]);

  // Generate WebVTT Chapters for Intro/Outro markers on Vidstack Timeline
  const chapterTrackUrl = useMemo(() => {
    if (!streamData) return null;
    const { intro, outro } = streamData;
    if (!intro && !outro) return null;

    const formatVtt = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    };

    let vtt = "WEBVTT\n\n";

    if (intro && intro.start > 0) {
      vtt += `${formatVtt(0)} --> ${formatVtt(intro.start)}\nEpisode\n\n`;
    } else if (!intro && outro && outro.start > 0) {
      vtt += `${formatVtt(0)} --> ${formatVtt(outro.start)}\nEpisode\n\n`;
    }

    if (intro) {
      vtt += `${formatVtt(intro.start)} --> ${formatVtt(intro.end)}\nIntro\n\n`;
      if (outro) {
        vtt += `${formatVtt(intro.end)} --> ${formatVtt(outro.start)}\nEpisode\n\n`;
      }
    }

    if (outro) {
      vtt += `${formatVtt(outro.start)} --> ${formatVtt(outro.end)}\nOutro\n\n`;
    }

    const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [streamData]);

  useEffect(() => {
    return () => {
      if (chapterTrackUrl) URL.revokeObjectURL(chapterTrackUrl);
    };
  }, [chapterTrackUrl]);

  // Generate Proxy-Intercepted HLS Url for Vidstack
  const finalStreamUrl = useMemo(() => {
    if (customStreamUrl) {
      const b64 = btoa(customStreamUrl)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      return `https://proxypipe.vercel.app/proxy/${b64}`;
    }

    if (!activeStream || activeStream.type === 'embed') return null;

    if (isProxifying) return null;

    if (proxifiedStreamUrl) return proxifiedStreamUrl;

    return activeStream.url || null;
  }, [activeStream, customStreamUrl, customReferer, proxifiedStreamUrl, isProxifying]);

  useEffect(() => {
    const currentPayload = { ...progressDataRef.current };
    return () => {
      forceSaveProgress(currentPayload);
    };
  }, [activeStream, forceSaveProgress]);

  const handleTimeUpdate = useCallback((e: any) => {
    const time = e?.currentTime ?? e?.currentTarget?.currentTime ?? 0;
    const duration = e?.duration ?? e?.currentTarget?.duration ?? 0;
    const activeEpId = playingEpisodeRef.current;

    // Only track time if we know exactly what episode is actively loaded
    if (time > 0 && duration > 0 && activeEpId) {
      videoStateRef.current = { episodeId: activeEpId, currentTime: time, duration };

      const sec = Math.floor(time);
      if (sec % 5 === 0 && sec !== lastSavedTime.current) {
        lastSavedTime.current = sec;
        forceSaveProgress();
      }
    }

    if (streamData?.intro && time >= streamData.intro.start && time <= streamData.intro.end) {
      if (autoSkip) { if (playerRef.current) playerRef.current.currentTime = streamData.intro.end; showToast('Intro Skipped'); }
      else if (!showSkipIntro) setShowSkipIntro(true);
    } else if (showSkipIntro) setShowSkipIntro(false);

    if (streamData?.outro && time >= streamData.outro.start && time <= streamData.outro.end) {
      if (autoSkip) { if (playerRef.current) playerRef.current.currentTime = streamData.outro.end; showToast('Outro Skipped'); }
      else if (!showSkipOutro) setShowSkipOutro(true);
    } else if (showSkipOutro) setShowSkipOutro(false);
  }, [streamData, autoSkip, showSkipIntro, showSkipOutro, showToast, forceSaveProgress]);

  const handleEpisodeClick = useCallback((targetId: string) => {
    forceSaveProgress();
    setCustomStreamUrl('');
    if (!urlSlug || !currentProvider) return;
    navigate(getEpisodeHref(urlSlug, currentProvider, currentCategory, targetId));
  }, [urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress]);

  const handleCategorySwitch = useCallback((newCat: 'sub' | 'dub') => {
    forceSaveProgress();
    setCustomStreamUrl('');
    if (!urlSlug || !currentProvider || newCat === currentCategory) return;
    const eps = getProviderEpisodes({ providers: episodesData }, currentProvider, newCat);
    if (!eps.length) return showToast(`No ${newCat.toUpperCase()} episodes found.`);
    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    navigate(getEpisodeHref(urlSlug, currentProvider, newCat, match.id));
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleProviderSwitch = useCallback((newProv: string) => {
    forceSaveProgress();
    setCustomStreamUrl('');
    if (!urlSlug || newProv === currentProvider) return;
    const eps = getProviderEpisodes({ providers: episodesData }, newProv, currentCategory);
    if (!eps.length) return showToast(`Server [${newProv}] has no episodes.`);
    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    navigate(getEpisodeHref(urlSlug, newProv, currentCategory, match.id));
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleVideoEnd = useCallback(() => {
    if (autoPlay && hasNext && !customStreamUrl) handleEpisodeClick(providerEpisodes[currentIndex + 1].id);
  }, [autoPlay, hasNext, handleEpisodeClick, providerEpisodes, currentIndex, customStreamUrl]);

  const skipTo = (t: number) => { if (playerRef.current) playerRef.current.currentTime = t; };

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      className="aw-root aw-noise min-h-screen flex flex-col relative"
    >

      {lightsOff && (
        <div
          onClick={() => setLightsOff(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.92)',
            backdropFilter: 'blur(2px)',
            cursor: 'pointer',
            transition: 'opacity 0.5s',
          }}
        />
      )}

      <div style={{ height: 24 }} />

      <div className="aw-layout">
        <main className="aw-main">
          {/* Video Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: lightsOff
              ? '0 0 0 2px var(--aw-accent), 0 0 80px 8px var(--aw-accent-glow), 0 30px 80px -20px rgba(0,0,0,0.9)'
              : '0 24px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
            zIndex: lightsOff ? 50 : 'auto',
            transition: 'box-shadow 0.5s',
          }}>

            {toastMessage && (
              <div className="aw-toast" style={{
                position: 'absolute', top: 20, left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'white',
                padding: '8px 20px',
                borderRadius: 100,
                fontSize: 11,
                fontFamily: 'var(--aw-font-display)',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                zIndex: 60,
                whiteSpace: 'nowrap',
              }}>
                {toastMessage}
              </div>
            )}

            {showSkipIntro && streamData?.intro && !autoSkip && !customStreamUrl && (
              <button
                className="skip-btn"
                onClick={() => skipTo(streamData.intro!.end)}
                style={{
                  position: 'absolute', bottom: 90, right: 32, zIndex: 100,
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: 14,
                  fontFamily: 'var(--aw-font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
                  textTransform: 'uppercase',
                }}
              >
                <FastForward size={16} style={{ color: 'var(--aw-accent)' }} />
                <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Skip Intro</span>
              </button>
            )}

            {showSkipOutro && streamData?.outro && !autoSkip && !customStreamUrl && (
              <button
                className="skip-btn"
                onClick={() => skipTo(streamData.outro!.end)}
                style={{
                  position: 'absolute', bottom: 90, right: 32, zIndex: 100,
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 8,
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: 14,
                  fontFamily: 'var(--aw-font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.05)',
                  textTransform: 'uppercase',
                }}
              >
                <FastForward size={16} style={{ color: 'var(--aw-accent)' }} />
                <span style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>Skip Outro</span>
              </button>
            )}

            {(!customStreamUrl && (streamLoading || loadingEpisodes || isProxifying)) ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.9)', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Loader2 style={{ width: 36, height: 36, color: 'var(--aw-accent)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>
                    {isProxifying ? 'Redirecting Stream' : 'Loading Stream'}
                  </span>
                </div>
              </div>
            ) : (!customStreamUrl && streamError) ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.95)', padding: 32, textAlign: 'center', gap: 16, zIndex: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(232,54,93,0.1)', border: '1px solid rgba(232,54,93,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <AlertCircle style={{ color: 'var(--aw-accent)', width: 24, height: 24 }} />
                </div>
                <p style={{ fontFamily: 'var(--aw-font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)' }}>
                  Stream Failed
                </p>
                <p style={{ fontSize: 13, color: 'var(--aw-muted)', maxWidth: 320, lineHeight: 1.6, fontWeight: 300 }}>
                  {streamError}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: 8,
                    padding: '10px 28px',
                    background: 'var(--aw-card)',
                    border: '1px solid var(--aw-border-hi)',
                    borderRadius: 100,
                    color: 'var(--aw-text)',
                    fontSize: 11,
                    fontFamily: 'var(--aw-font-display)',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  Reload Player
                </button>
              </div>
            ) : (activeStream || customStreamUrl) ? (
              <>
                {(!customStreamUrl && activeStream?.type === 'embed' && activeStream?.url) ? (
                  <iframe
                    src={activeStream.url}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allowFullScreen
                    allow="autoplay; fullscreen"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                ) : (
                  <MediaPlayer
                    ref={playerRef}
                    title={customStreamUrl ? "Developer Stream Test" : displayTitle}
                    src={finalStreamUrl ? { src: finalStreamUrl, type: 'application/vnd.apple.mpegurl' } : undefined}
                    onProviderChange={(provider) => {
                      if (isHLSProvider(provider)) {
                        provider.config = {
                          enableWorker: true,
                          backBufferLength: 0,
                          maxBufferLength: 30,
                          maxMaxBufferLength: 60,
                          manifestLoadingMaxRetry: 3,
                          levelLoadingMaxRetry: 3,
                          fragLoadingMaxRetry: 6,
                          appendErrorMaxRetry: 3,
                          testBandwidth: false
                        };
                      }
                    }}
                    onTimeUpdate={(e: any) => {
                      const time = typeof e === 'number' ? e : e?.currentTime || e?.detail || 0;
                      const duration = playerRef.current?.state?.duration || videoStateRef.current.duration || 0;
                      handleTimeUpdate({ currentTime: time, duration });
                    }}
                    onEnded={handleVideoEnd}
                    onError={(e) => console.error('[MediaPlayer Error]:', e)}
                    onHlsError={(event: any) => {
                      if (!event.fatal) return;
                      console.warn('[HLS] Fatal error:', event.type, event.details);
                    }}
                    onCanPlay={() => {
                      if (customStreamUrl || !playerRef.current) return;
                      const epId = progressDataRef.current?.episodeId || episodeId;
                      if (!epId) return;

                      const savedTimeRaw = localStorage.getItem(`progress-${epId}`);
                      if (savedTimeRaw) {
                        const parsedTime = parseFloat(savedTimeRaw);
                        // Only resume if we are at the very beginning and have significant progress
                        if (parsedTime > 10 && playerRef.current.currentTime < 5) {
                          playerRef.current.currentTime = parsedTime;
                          showToast(`Resumed playback`);
                        }
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none' }}
                  >
                    <MediaProvider>
                      {chapterTrackUrl && !customStreamUrl && (
                        <Track
                          src={chapterTrackUrl}
                          kind="chapters"
                          label="Chapters"
                          language="en"
                          default
                        />
                      )}
                      {!customStreamUrl && streamData?.subtitles?.map((sub, i) => (
                        <Track
                          key={String(i)}
                          src={sub.file}
                          kind="subtitles"
                          label={sub.label}
                          language={sub.label.substring(0, 2).toLowerCase()}
                          default={sub.label.toLowerCase().includes('english')}
                        />
                      ))}
                    </MediaProvider>
                    <DefaultVideoLayout icons={defaultLayoutIcons} />
                  </MediaPlayer>
                )}
              </>
            ) : null}
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            padding: '14px 20px',
            background: 'var(--aw-s1)',
            borderRadius: 12,
            border: '1px solid var(--aw-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <Toggle checked={autoPlay} onChange={setAutoPlay} label="Autoplay" />
              <Toggle checked={autoSkip} onChange={setAutoSkip} label="Auto Skip" />
            </div>

            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Prev', icon: <ChevronsLeft size={14} />, disabled: !hasPrev || streamLoading, onClick: () => hasPrev && handleEpisodeClick(providerEpisodes[currentIndex - 1].id) },
                { label: 'Next', icon: <ChevronsRight size={14} />, disabled: !hasNext || streamLoading, onClick: () => hasNext && handleEpisodeClick(providerEpisodes[currentIndex + 1].id) },
              ].map(btn => (
                <button
                  key={btn.label}
                  className="aw-action-btn"
                  onClick={btn.onClick}
                  disabled={btn.disabled}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    height: 34,
                    padding: '0 16px',
                    borderRadius: 100,
                    background: btn.disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--aw-border)',
                    color: btn.disabled ? 'rgba(255,255,255,0.25)' : 'var(--aw-text)',
                    fontSize: 11,
                    fontFamily: 'var(--aw-font-display)',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: btn.disabled ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s, border-color 0.2s',
                  }}
                >
                  {btn.label === 'Prev' && btn.icon}
                  {btn.label}
                  {btn.label === 'Next' && btn.icon}
                </button>
              ))}
            </div>

          </div>

          <div style={{
            padding: '28px 28px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
              <div>
                <p className="aw-label" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MonitorPlay size={11} /> Now Playing
                </p>
                <h1 style={{
                  fontFamily: 'var(--aw-font-display)',
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: 700,
                  color: 'var(--aw-text)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  margin: 0,
                }}>
                  {currentEpData?.title || `Episode ${currentEpData?.number || '?'}`}
                </h1>
              </div>

              {/* USER / DEV Toggles (Replaces SUB/DUB) */}
              <div style={{
                display: 'flex',
                background: 'var(--aw-bg)',
                border: '1px solid var(--aw-border)',
                borderRadius: 100,
                padding: 4,
                gap: 2,
              }}>
                {(['user', 'dev'] as const).map(mode => (
                  <button
                    key={mode}
                    className="aw-segment-btn"
                    data-active={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: '6px 22px',
                      borderRadius: 100,
                      border: 'none',
                      background: viewMode === mode ? 'var(--aw-s2)' : 'transparent',
                      color: viewMode === mode ? 'var(--aw-accent)' : 'var(--aw-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: viewMode === mode ? '0 2px 12px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />

            {/* Render conditional UI based on view mode */}
            {viewMode === 'user' ? (
              <>
                {/* Servers List */}
                <div>
                  <p style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontFamily: 'var(--aw-font-display)',
                    fontSize: 9, fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'var(--aw-muted)',
                    opacity: 0.6,
                    marginBottom: 12,
                  }}>
                    <Server size={10} />
                    Video Servers
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {rankedProviders.map((p) => {
                      const isActive = currentProvider === p && !customStreamUrl;
                      return (
                        <button
                          key={p}
                          onClick={() => { setCustomStreamUrl(''); handleProviderSwitch(p); }}
                          onMouseDown={handleRippleMouseDown}
                          className="aw-action-hover"
                          style={{
                            position: 'relative',
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                            background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                            color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)',
                            fontSize: 12,
                            fontFamily: 'var(--aw-font-display)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textTransform: 'lowercase',
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                          {isActive && (
                            <span style={{
                              width: 5, height: 5,
                              borderRadius: '50%',
                              background: 'var(--aw-accent)',
                              flexShrink: 0,
                            }} />
                          )}
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {streamData && streamData.streams && streamData.streams.length > 0 && (
                  <>
                    <div style={{
                      height: 1,
                      background: 'rgba(255,255,255,0.04)',
                      margin: '22px 0',
                    }} />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>

                      {streamData.streams.some(s => s.type === 'hls' && s.url) && (
                        <div>
                          <p style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            fontFamily: 'var(--aw-font-display)',
                            fontSize: 9, fontWeight: 700,
                            letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: 'var(--aw-muted)', opacity: 0.6,
                            marginBottom: 12,
                          }}>
                            <MonitorPlay size={10} />
                            Internal
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {streamData.streams.map((s, idx) => {
                              if (s.type !== 'hls' || !s.url) return null;
                              const isActive = selectedStreamIndex === idx && !customStreamUrl;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => { setCustomStreamUrl(''); setSelectedStreamIndex(idx); }}
                                  className="aw-action-hover"
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                                    background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                                    color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)',
                                    fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                                    textTransform: 'lowercase', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    position: 'relative',
                                  }}
                                >
                                  {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                                  {isActive && (
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--aw-accent)', flexShrink: 0 }} />
                                  )}
                                  {s.quality || 'auto'}
                                  <span style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.6, textTransform: 'uppercase' }}>HLS</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {streamData.streams.some(s => s.type === 'embed' && s.url) && (
                        <div>
                          <p style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            fontFamily: 'var(--aw-font-display)',
                            fontSize: 9, fontWeight: 700,
                            letterSpacing: '0.22em', textTransform: 'uppercase',
                            color: 'var(--aw-muted)', opacity: 0.6,
                            marginBottom: 12,
                          }}>
                            <MonitorPlay size={10} />
                            External
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {streamData.streams.map((s, idx) => {
                              if (s.type !== 'embed' || !s.url) return null;
                              const isActive = selectedStreamIndex === idx && !customStreamUrl;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => { setCustomStreamUrl(''); setSelectedStreamIndex(idx); }}
                                  className="aw-action-hover"
                                  style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                                    background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                                    color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.6)',
                                    fontSize: 12, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                                    textTransform: 'lowercase', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    position: 'relative',
                                  }}
                                >
                                  {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                                  {isActive && (
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--aw-accent)', flexShrink: 0 }} />
                                  )}
                                  {s.quality || 'auto'}
                                  <span style={{ fontSize: 8, letterSpacing: '0.1em', opacity: 0.6, textTransform: 'uppercase' }}>EMBED</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ padding: '16px 20px', background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 12 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)', marginBottom: 12, fontFamily: 'var(--aw-font-display)' }}>
                    <Link2 size={12} /> Test Proxy Worker / Inject HLS
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      placeholder="Paste raw .m3u8 URL here to test player..."
                      value={customStreamUrl}
                      onChange={e => setCustomStreamUrl(e.target.value)}
                      style={{ flex: '1 1 200px', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--aw-bg)', color: 'white', fontSize: 12, outline: 'none', fontFamily: 'var(--aw-font-body)' }}
                    />
                    <input
                      placeholder="Referer (e.g. https://kwik.cx/)"
                      value={customReferer}
                      onChange={e => setCustomReferer(e.target.value)}
                      style={{ flex: '1 1 150px', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'var(--aw-bg)', color: 'white', fontSize: 12, outline: 'none', fontFamily: 'var(--aw-font-body)' }}
                    />
                  </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 12 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)', marginBottom: 12, fontFamily: 'var(--aw-font-display)' }}>
                    <Activity size={12} /> Quick Actions
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="aw-action-btn" onClick={() => { forceSaveProgress(); showToast("Progress Force Saved"); }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-text)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer' }}>
                      Force Sync Progress
                    </button>
                    <button className="aw-action-btn" onClick={() => { if (episodeId) { localStorage.removeItem(`progress-${episodeId}`); showToast("Progress Wiped"); } }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-text)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer' }}>
                      Clear Episode Progress
                    </button>
                    <button className="aw-action-btn" onClick={() => console.log('STREAM DATA:', streamData)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-text)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer' }}>
                      Log Stream Data
                    </button>
                    <button className="aw-action-btn" onClick={() => console.log('EPISODE CONTEXT:', currentEpData)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-text)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer' }}>
                      Log Context Data
                    </button>
                    <button className="aw-action-btn" onClick={() => {
                      if (!activeStream?.url) return;
                      const b64 = btoa(activeStream.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                      const url = `https://proxypipe.vercel.app/proxy/${b64}`;
                      console.log('PROXYPIPE URL:', url);
                      fetch(url).then(r => console.log('PROXYPIPE STATUS:', r.status)).catch(e => console.error('PROXYPIPE ERROR:', e));
                    }} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', cursor: 'pointer' }}>
                      Test Proxypipe Endpoint
                    </button>
                  </div>
                </div>

                <div style={{ padding: '16px 20px', background: 'var(--aw-s2)', border: '1px solid var(--aw-border)', borderRadius: 12 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-accent)', marginBottom: 12, fontFamily: 'var(--aw-font-display)' }}>
                    <Server size={12} /> HLS Proxy Provider
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(['lunaranime', 'animanga', 'miruro', 'anikuro'] as const).map(p => {
                      const isActive = proxyProvider === p;
                      const hasSource = !!proxifiedSources[p];
                      return (
                        <button
                          key={p}
                          onClick={() => setProxyProvider(p)}
                          disabled={!hasSource}
                          className="aw-action-hover"
                          style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: isActive ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                            background: isActive ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                            color: isActive ? 'var(--aw-accent)' : hasSource ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)',
                            fontSize: 12,
                            fontFamily: 'var(--aw-font-display)',
                            fontWeight: 700,
                            textTransform: 'lowercase',
                            cursor: hasSource ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', gap: 6,
                            position: 'relative',
                          }}
                        >
                          {isActive && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                          {isActive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--aw-accent)', flexShrink: 0 }} />}
                          {p}
                          {!hasSource && <span style={{ fontSize: 8, opacity: 0.4 }}>—</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  <div style={{ padding: '16px', background: '#09090b', border: '1px solid var(--aw-border)', borderRadius: 12 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)', marginBottom: 12, fontFamily: 'var(--aw-font-display)' }}>
                      <Terminal size={12} /> Player State Dump
                    </p>
                    <pre className="aw-scroll" style={{ margin: 0, fontSize: 11, color: '#a1a1aa', maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify({
                        currentTime: playerRef.current?.state?.currentTime || videoStateRef.current.currentTime || 0,
                        duration: playerRef.current?.state?.duration || videoStateRef.current.duration || 0,
                        paused: playerRef.current?.state?.paused ?? true,
                        autoPlay: autoPlay,
                        autoSkip: autoSkip,
                        hasIntroData: !!streamData?.intro,
                        hasOutroData: !!streamData?.outro,
                        activeStreamType: activeStream?.type || 'none'
                      }, null, 2)}
                    </pre>
                  </div>

                  <div style={{ padding: '16px', background: '#09090b', border: '1px solid var(--aw-border)', borderRadius: 12 }}>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)', marginBottom: 12, fontFamily: 'var(--aw-font-display)' }}>
                      <Database size={12} /> Raw Stream API Data
                    </p>
                    <pre className="aw-scroll" style={{ margin: 0, fontSize: 11, color: '#a1a1aa', maxHeight: 180, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {JSON.stringify(streamData, null, 2) || 'No stream data loaded...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {seasons.length > 1 && (
            <div style={{
              padding: '24px 28px',
              background: 'var(--aw-s1)',
              backdropFilter: 'blur(8px)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <p style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--aw-font-display)',
                fontSize: 10, fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--aw-muted)',
              }}>
                <Layers size={11} style={{ opacity: 0.7 }} /> Seasons
              </p>
              <div className="aw-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '10px 4px 18px', margin: '-10px -4px 0' }}>
                {seasons.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!s.active) {
                        navigate(`/watch/${s.id}/kiwi/sub/animepahe-1`);
                      }
                    }}
                    className="aw-action-hover"
                    style={{
                      flexShrink: 0,
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: s.active ? '1px solid var(--aw-accent)' : '1px solid rgba(255,255,255,0.1)',
                      background: s.active ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                      color: s.active ? 'var(--aw-accent)' : 'var(--aw-text)',
                      fontFamily: 'var(--aw-font-display)',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      cursor: s.active ? 'default' : 'pointer',
                      position: 'relative',
                    }}
                  >
                    {s.active && <div className="aw-shimmer-wrapper"><div className="aw-btn-shimmer" /></div>}
                    {s.displayLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 28,
            padding: '28px 28px',
            background: 'transparent',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            marginBottom: 32,
          }}>
            <div style={{ flexShrink: 0, width: 150 }}>
              <div style={{
                borderRadius: 12,
                overflow: 'hidden',
                aspectRatio: '2/3',
                boxShadow: '0 16px 48px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)',
                position: 'relative',
              }}>
                <img
                  src={animeInfo?.image || animeInfo?.coverImage?.large || 'https://via.placeholder.com/300x450/0d0d1a/3f3f56?text=N/A'}
                  alt="Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: 'transparent',
                }} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              <h1 style={{
                fontFamily: 'var(--aw-font-display)',
                fontSize: 'clamp(22px, 3.5vw, 38px)',
                fontWeight: 800,
                fontStyle: 'italic',
                letterSpacing: '-0.02em',
                color: 'white',
                margin: '0 0 16px',
                lineHeight: 1.05,
                textTransform: 'uppercase',
              }}>
                {displayTitle}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {(animeInfo?.genres || ['Anime']).map((g: string) => (
                  <button
                    key={g}
                    onClick={() => navigate(`/browse?genres=${encodeURIComponent(g)}`)}
                    className="genre-pill"
                  >
                    {g}
                  </button>
                ))}
              </div>

              <p style={{
                fontSize: 13,
                fontWeight: 300,
                lineHeight: 1.7,
                color: 'var(--aw-muted)',
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 5,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {animeInfo?.description?.replace(/<[^>]*>?/gm, '') || animeInfo?.synopsis || 'No description available for this anime.'}
              </p>
            </div>
          </div>

          <div style={{ padding: '0 20px 20px' }}>
            {currentEpData && (
              <CommentSection
                pageType="watch"
                pageId={`anime-${resolvedId || urlSlug}-ep-${currentEpData.number}`}
              />
            )}
            {!currentEpData && loadingEpisodes && (
              <div style={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <Loader2 className="animate-spin text-[var(--aw-accent)]" size={24} />
              </div>
            )}
          </div>
        </main>

        <aside className="aw-sidebar" style={{ zIndex: 40 }}>
          <div style={{
            padding: '18px 20px',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{
                fontFamily: 'var(--aw-font-display)',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: '0.04em',
                color: 'white',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                Episodes
                {providerEpisodes.length > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--aw-accent)',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '2px 8px',
                    borderRadius: 100,
                  }}>
                    {providerEpisodes.length}
                  </span>
                )}
              </h3>

              <div style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 100,
                padding: 4,
                gap: 2,
              }}>
                {(['sub', 'dub'] as const).map(cat => (
                  <button
                    key={cat}
                    className="aw-segment-btn"
                    data-active={currentCategory === cat}
                    onClick={() => handleCategorySwitch(cat)}
                    style={{
                      padding: '4px 14px',
                      borderRadius: 100,
                      border: 'none',
                      background: currentCategory === cat ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: currentCategory === cat ? 'var(--aw-accent)' : 'var(--aw-muted)',
                      fontSize: 10,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: currentCategory === cat ? '0 2px 12px rgba(0,0,0,0.3)' : 'none',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search episodes…"
                  value={epSearchQuery}
                  onChange={e => setEpSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: 'var(--aw-text)',
                    fontSize: 12,
                    fontFamily: 'var(--aw-font-body)',
                    fontWeight: 400,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'all 0.2s',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <button
                onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                title="Sort Episodes"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 34,
                  height: 34,
                  flexShrink: 0,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  color: 'var(--aw-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = 'var(--aw-muted)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {episodeSortOrder === 'desc' ? <ArrowDownUp size={14} /> : <ArrowDownUp size={14} style={{ transform: 'rotate(180deg)' }} />}
              </button>
            </div>
          </div>

          <div className="aw-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {loadingEpisodes ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[...Array(7)].map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--aw-border)' }}>
                    <div className="aw-skeleton" style={{ width: 28, height: 64, borderRadius: 6, flexShrink: 0 }} />
                    <div className="aw-skeleton" style={{ width: 110, height: 64, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                      <div className="aw-skeleton" style={{ width: '60%', height: 12, borderRadius: 4 }} />
                      <div className="aw-skeleton" style={{ width: '80%', height: 10, borderRadius: 4 }} />
                      <div className="aw-skeleton" style={{ width: '50%', height: 10, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleEpisodes.length > 0 ? (
              visibleEpisodes.map((ep, idx) => {
                const isActive = extractSlug(ep.id) === episodeId && !customStreamUrl;
                return (
                  <div
                    key={`${episodeSortOrder}-${ep.id}`}
                    ref={isActive ? activeEpRef : null}
                    onClick={() => handleEpisodeClick(ep.id)}
                    className={`ep-item ep-slide-in`}
                    style={{
                      animationDelay: `${Math.min(idx * 0.03, 0.4)}s`,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--aw-border)',
                      cursor: 'pointer',
                      background: isActive ? 'var(--aw-accent-dim)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {isActive && (
                      <div className="ep-active-marker" style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: 3,
                        background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))',
                        borderRadius: '0 2px 2px 0',
                      }} />
                    )}

                    <div style={{
                      width: 28,
                      height: 64,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.25)',
                      transition: 'color 0.2s',
                    }}>
                      {ep.number || '–'}
                    </div>

                    <div style={{
                      width: 110,
                      height: 64,
                      flexShrink: 0,
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: 'var(--aw-card)',
                      boxShadow: isActive ? '0 0 0 1.5px var(--aw-accent)' : '0 0 0 1px rgba(255,255,255,0.06)',
                      position: 'relative',
                    }}>
                      <img
                        src={ep.image || 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'}
                        alt=""
                        className="ep-thumb"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.75 }}
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/0d0d1a/3f3f56?text=–'; }}
                      />
                      {ep.filler && (
                        <div style={{
                          position: 'absolute', bottom: 4, right: 4,
                          background: 'rgba(0,0,0,0.8)',
                          fontSize: 9,
                          fontFamily: 'var(--aw-font-display)',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          color: 'rgba(255,255,255,0.7)',
                          padding: '2px 5px',
                          borderRadius: 3,
                          textTransform: 'uppercase',
                        }}>
                          Filler
                        </div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: 64 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: 13,
                          fontFamily: 'var(--aw-font-display)',
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? 'white' : 'rgba(255,255,255,0.8)',
                          letterSpacing: '0.01em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {ep.title || `Episode ${ep.number || '?'}`}
                        </h4>
                        {ep.duration && (
                          <span style={{ flexShrink: 0, fontSize: 10, color: 'var(--aw-muted)', fontWeight: 400 }}>
                            {Math.round(ep.duration / 60)}m
                          </span>
                        )}
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 300,
                        color: 'var(--aw-muted)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {ep.description ||
                          `Episode ${ep.number}. ${ep.airDate ? `Aired ${formatEpisodeDate(ep.airDate)}.` : 'No synopsis available.'}`
                        }
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <AlertCircle size={22} style={{ color: 'var(--aw-muted)', margin: '0 auto 12px', display: 'block', opacity: 0.5 }} />
                <p style={{
                  fontFamily: 'var(--aw-font-display)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--aw-muted)',
                }}>
                  No Matches
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AnimeWatch;
