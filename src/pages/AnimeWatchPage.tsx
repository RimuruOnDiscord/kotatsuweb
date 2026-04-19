/* ─── Dependencies ──────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft, ChevronsRight, Loader2, AlertCircle, FastForward,
  Lightbulb, Server, CheckCircle2, MonitorPlay, Building, Star
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';

import {
  fetchAnimeEpisodes,
  fetchAnimeSearch,
  getProviderEpisodes,
  AnimeWatchProviderPayload,
  fetchAnimeStreams
} from '../utils/animeApi';

import * as api from '../utils/animeApi';
import Hls from 'hls.js';

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

  .aw-root { font-family: var(--aw-font-body); background: var(--aw-bg); color: var(--aw-text); }

  /* Scrollbar */
  .aw-scroll::-webkit-scrollbar { width: 4px; }
  .aw-scroll::-webkit-scrollbar-track { background: transparent; }
  .aw-scroll::-webkit-scrollbar-thumb { background: var(--aw-accent-dim); border-radius: 2px; }
  .aw-scroll::-webkit-scrollbar-thumb:hover { background: var(--aw-accent); }

  /* Episode item hover */
  .ep-item { transition: background 0.18s, border-color 0.18s; }
  .ep-item:hover .ep-thumb { transform: scale(1.05); }
  .ep-thumb { transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94); }

  /* Server button */
  .srv-btn { transition: all 0.2s cubic-bezier(0.25,0.46,0.45,0.94); }
  .srv-btn:hover { transform: translateY(-1px); }
  .srv-btn:active { transform: translateY(0px); }

  /* Glow pulse for recommended server */
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--aw-accent-glow); }
    50% { box-shadow: 0 0 16px 2px var(--aw-accent-glow); }
  }
  .srv-recommended { animation: glowPulse 2.5s ease-in-out infinite; }

  /* Toast slide in */
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
  .aw-toast { animation: toastIn 0.25s ease forwards; }

  /* Active episode marker */
  @keyframes markerSlide {
    from { height: 0; }
    to   { height: 100%; }
  }
  .ep-active-marker { animation: markerSlide 0.3s ease forwards; }

  /* Skeleton shimmer */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .aw-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
  }

  /* Video container glow on lights-off */
  .lights-off-glow {
    box-shadow: 0 0 80px 8px var(--aw-accent-glow), 0 0 140px 20px var(--aw-accent-dim);
  }

  /* Skip button pop-in */
  @keyframes skipIn {
    from { opacity: 0; transform: scale(0.9); }
    to   { opacity: 1; transform: scale(1); }
  }
  .skip-btn { animation: skipIn 0.2s ease forwards; }

  /* Info section label */
  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* Genre pill */
  .genre-pill {
    background: var(--aw-bg);
    border: 1px solid var(--aw-border);
    color: var(--aw-text);
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.1em;
    font-weight: 600;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 100px;
    transition: background 0.15s;
  }
  .genre-pill:hover { background: var(--aw-accent); }

  /* Noise overlay */
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
`;

const handleRippleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {};

interface StreamSource { url: string; type: string; quality: string; }
interface StreamSubtitle { file: string; label: string; }
interface StreamData {
  streams: StreamSource[];
  subtitles?: StreamSubtitle[];
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

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
    className="flex items-center gap-3 cursor-pointer select-none"
    style={{ fontFamily: 'var(--aw-font-display)' }}
  >
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 32,
        height: 18,
        borderRadius: 100,
        background: checked ? accent : 'var(--aw-bg)',
        border: `1px solid ${checked ? accent : 'var(--aw-border)'}`,
        position: 'relative',
        transition: 'all 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: checked ? 16 : 2,
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: 'white',
        transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: checked ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
      }} />
    </div>
    <span style={{
      fontSize: 10,
      letterSpacing: '0.12em',
      fontWeight: 600,
      textTransform: 'uppercase',
      color: checked ? 'var(--aw-text)' : 'var(--aw-muted)',
      transition: 'color 0.2s',
    }}>
      {label}
    </span>
  </label>
);

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { animeId: urlSlug, provider, category, episodeId } = useParams<{
    animeId: string;
    provider?: string;
    category?: 'sub' | 'dub';
    episodeId?: string;
  }>();

  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeEpRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [searchQueryTop, setSearchQueryTop] = useState('');
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<any>(null);

  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [epSearchQuery, setEpSearchQuery] = useState('');

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('watchAutoPlay') !== 'false');
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('watchAutoSkip') !== 'false');
  const [lightsOff, setLightsOff] = useState(false);

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);

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

  // Fetch Episodes
  useEffect(() => {
    const fetchEpisodes = async () => {
      if (!urlSlug) return;
      try {
        setLoadingEpisodes(true);
        setResolvedId(null);
        let episodesPayload: any = null;
        let actualAnimeId: number | string = urlSlug;
        const isSlugText = /[a-zA-Z]/.test(urlSlug);

        if (isSlugText) {
          const searchQuery = decodeURIComponent(urlSlug).replace(/-/g, ' ');
          const searchPayload = await fetchAnimeSearch(searchQuery, 1);
          const searchResults = searchPayload?.results || searchPayload?.data || searchPayload || [];
          if (searchResults?.length > 0) {
            actualAnimeId = searchResults[0].id;
            setAnimeInfo(searchResults[0]);
            try { episodesPayload = await fetchAnimeEpisodes(actualAnimeId); } catch {}
          }
        } else {
          try {
            episodesPayload = await fetchAnimeEpisodes(urlSlug);
            if (episodesPayload?.info) {
              setAnimeInfo(episodesPayload.info);
            } else {
              const anyApi = api as any;
              const fetchInfoById = anyApi.fetchAnimeInfo || anyApi.getAnimeInfo || anyApi.fetchAnimeDetails || anyApi.getAnimeDetails;
              if (fetchInfoById) {
                try { const info = await fetchInfoById(urlSlug); setAnimeInfo(info); } catch {}
              }
            }
          } catch {}
        }

        if (!episodesPayload?.providers) throw new Error('No providers found for this anime.');
        setResolvedId(actualAnimeId);
        setEpisodesData(episodesPayload.providers);
      } catch (error: any) {
        setStreamError(error.message || 'Failed to load episodes.');
      } finally {
        setLoadingEpisodes(false);
      }
    };
    fetchEpisodes();
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

  const visibleEpisodes = useMemo(() =>
    providerEpisodes.filter(ep =>
      String(ep.number).includes(epSearchQuery.trim()) ||
      (ep.title && ep.title.toLowerCase().includes(epSearchQuery.trim().toLowerCase()))
    ), [providerEpisodes, epSearchQuery]);

  const currentIndex = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  useEffect(() => {
    if (activeEpRef.current) activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [episodeId, visibleEpisodes]);

  // Fetch streaming data
  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider) return;
    let mounted = true;
    const load = async () => {
      setStreamLoading(true); setStreamData(null); setStreamError(null);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        const pure = extractSlug(currentEpData.id);
        const data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', pure);
        if (!data.streams?.length) throw new Error('Server is not responding.');
        if (mounted) setStreamData(data as any);
      } catch (err: any) {
        if (mounted) setStreamError(err.message || 'Failed to load media.');
      } finally {
        if (mounted) setStreamLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentEpData?.id, resolvedId, currentProvider, currentCategory]);

  const activeStream = useMemo(() => {
    if (!streamData?.streams) return null;
    const embed = streamData.streams.find(s =>
      (s.type === 'embed' || s.url.includes('iframe') || s.url.includes('/embed/')) && !s.url.includes('.m3u8')
    );
    if (embed) return { ...embed, type: 'embed' };
    return streamData.streams.find(s => s.quality === 'auto' || s.quality === 'default') || streamData.streams[0];
  }, [streamData]);


  // ─── BULLETPROOF CONTINUE WATCHING ENGINE ──────────────────────────────────────
  const derivedTitle = typeof animeInfo?.title === 'string'
    ? animeInfo.title
    : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');

  const progressDataRef = useRef<any>(null);
  const videoStateRef = useRef({ currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);

  // Synchronously keep the payload ref updated with the exact active episode layout
  progressDataRef.current = {
    animeId: String(resolvedId || urlSlug),
    episodeId: currentEpData ? extractSlug(currentEpData.id) : '',
    animeTitle: displayTitle,
    animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
    episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
    episodeNumber: currentEpData?.number || 0,
    href: (currentEpData && urlSlug) ? getEpisodeHref(urlSlug, currentProvider, currentCategory, currentEpData.id) : ''
  };

  const forceSaveProgress = useCallback((explicitPayload?: any) => {
    const payload = explicitPayload?.episodeId ? explicitPayload : progressDataRef.current;
    if (!payload?.episodeId) return;

    let currentTime = videoStateRef.current.currentTime || 0;
    let duration = videoStateRef.current.duration || 0;

    // Pull directly from the DOM node if it exists to get the absolute latest unmount time
    if (videoRef.current) {
      const vTime = videoRef.current.currentTime;
      const vDur = videoRef.current.duration;
      if (Number.isFinite(vTime) && vTime > 0) currentTime = vTime;
      if (Number.isFinite(vDur) && vDur > 0) duration = vDur;
    }

    const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 0;
    const safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;

    // PREVENTS THE 0m / ? BUG: If the user opens and leaves before watching 3 seconds, do not overwrite!
    if (safeTime < 3) return;

    try {
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
  }, []);

  // Window/Visibility listeners so we never miss a save
  useEffect(() => {
    const onSave = () => forceSaveProgress();
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') forceSaveProgress(); };
    window.addEventListener('beforeunload', onSave);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', onSave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      onSave(); // Strictly saves on unmount
    };
  }, [forceSaveProgress]);

  // HLS / Video setup
  useEffect(() => {
    const video = videoRef.current;
    if (!activeStream || activeStream.type === 'embed' || !video) return;

    const isHls = activeStream.type === 'hls' || activeStream.url.includes('.m3u8');
    const currentPayload = { ...progressDataRef.current };

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true, lowLatencyMode: true });
      hls.loadSource(activeStream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { hls.destroy(); setStreamError('Fatal stream error.'); }
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      video.src = activeStream.url;
    }

    return () => {
      // Save exact progress of THIS episode before swapping to a new stream
      forceSaveProgress(currentPayload);
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [activeStream, forceSaveProgress]);

  // Interval saving
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    const duration = e.currentTarget.duration;
    
    // Ignore invalid timestamps the browser might send while unmounting
    if (time > 0 && duration > 0) {
      videoStateRef.current = { currentTime: time, duration };
      const sec = Math.floor(time);
      if (sec % 5 === 0 && sec !== lastSavedTime.current) { 
        lastSavedTime.current = sec; 
        forceSaveProgress(); 
      }
    }
    
    // Auto Skip Logic
    if (streamData?.intro && time >= streamData.intro.start && time <= streamData.intro.end) {
      if (autoSkip) { e.currentTarget.currentTime = streamData.intro.end; showToast('Intro Skipped'); }
      else if (!showSkipIntro) setShowSkipIntro(true);
    } else if (showSkipIntro) setShowSkipIntro(false);
    
    if (streamData?.outro && time >= streamData.outro.start && time <= streamData.outro.end) {
      if (autoSkip) { e.currentTarget.currentTime = streamData.outro.end; showToast('Outro Skipped'); }
      else if (!showSkipOutro) setShowSkipOutro(true);
    } else if (showSkipOutro) setShowSkipOutro(false);
  }, [streamData, autoSkip, showSkipIntro, showSkipOutro, showToast, forceSaveProgress]);

  // Handlers
  const handleEpisodeClick = useCallback((targetId: string) => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider) return;
    navigate(getEpisodeHref(urlSlug, currentProvider, currentCategory, targetId));
  }, [urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress]);

  const handleCategorySwitch = useCallback((newCat: 'sub' | 'dub') => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider || newCat === currentCategory) return;
    const eps = getProviderEpisodes({ providers: episodesData }, currentProvider, newCat);
    if (!eps.length) return showToast(`No ${newCat.toUpperCase()} episodes found.`);
    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    navigate(getEpisodeHref(urlSlug, currentProvider, newCat, match.id));
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleProviderSwitch = useCallback((newProv: string) => {
    forceSaveProgress();
    if (!urlSlug || newProv === currentProvider) return;
    const eps = getProviderEpisodes({ providers: episodesData }, newProv, currentCategory);
    if (!eps.length) return showToast(`Server [${newProv}] has no episodes.`);
    const match = eps.find(ep => ep.number === currentEpData?.number) || eps[0];
    navigate(getEpisodeHref(urlSlug, newProv, currentCategory, match.id));
  }, [urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleVideoEnd = useCallback(() => {
    if (autoPlay && hasNext) handleEpisodeClick(providerEpisodes[currentIndex + 1].id);
  }, [autoPlay, hasNext, handleEpisodeClick, providerEpisodes, currentIndex]);

  const skipTo = (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; };

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      className="aw-root aw-noise min-h-screen flex flex-col relative"
      style={{ background: 'var(--aw-bg)' }}
    >
      {/* Ambient top glow */}
      <div style={{
        position: 'fixed',
        top: -120,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 700,
        height: 300,
        background: 'radial-gradient(ellipse, rgba(232,54,93,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Lights-off overlay */}
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

      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar searchQuery={searchQueryTop} onSearchQueryChange={setSearchQueryTop} />
      </div>

      {/* Main layout */}
      <div
        className="flex flex-col lg:flex-row flex-1"
        style={{
          maxWidth: 1540,
          margin: '0 auto',
          width: '100%',
          padding: '28px 24px',
          gap: 24,
          alignItems: 'flex-start',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* ── Left: Main Content ── */}
        <main style={{ flex: 1, width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', zIndex: 50 }}>

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

            {/* Toast */}
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

            {/* Skip Intro */}
            {showSkipIntro && streamData?.intro && !autoSkip && (
              <button
                className="skip-btn"
                onClick={() => skipTo(streamData.intro!.end)}
                style={{
                  position: 'absolute', bottom: 72, right: 24, zIndex: 50,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 100,
                  padding: '10px 20px',
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'var(--aw-font-display)',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <FastForward size={13} style={{ color: 'var(--aw-accent)' }} /> Skip Intro
              </button>
            )}

            {/* Skip Outro */}
            {showSkipOutro && streamData?.outro && !autoSkip && (
              <button
                className="skip-btn"
                onClick={() => skipTo(streamData.outro!.end)}
                style={{
                  position: 'absolute', bottom: 72, right: 24, zIndex: 50,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 100,
                  padding: '10px 20px',
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'var(--aw-font-display)',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                }}
              >
                <FastForward size={13} style={{ color: 'var(--aw-accent)' }} /> Skip Outro
              </button>
            )}

            {/* Loading / Error / Player */}
            {streamLoading || loadingEpisodes ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(7,7,13,0.9)', backdropFilter: 'blur(4px)', zIndex: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <Loader2 style={{ width: 36, height: 36, color: 'var(--aw-accent)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--aw-muted)' }}>
                    Loading Stream
                  </span>
                </div>
              </div>
            ) : streamError ? (
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
            ) : activeStream ? (
              <>
                {activeStream.type === 'embed' ? (
                  <iframe src={activeStream.url} allowFullScreen style={{ width: '100%', height: '100%', border: 'none' }} />
                ) : (
                  <video
                    ref={videoRef}
                    controls
                    autoPlay={autoPlay}
                    crossOrigin="anonymous"
                    playsInline
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnd}
                    // NATVIELY SYNCS TIME DIRECTLY ON METADATA LOAD (BULLETPROOF)
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const epId = progressDataRef.current?.episodeId || episodeId;
                      if (!epId) return;
                      const savedTimeRaw = localStorage.getItem(`progress-${epId}`);
                      if (savedTimeRaw) {
                        const parsedTime = parseFloat(savedTimeRaw);
                        if (parsedTime > 3 && video.currentTime < 3) {
                          video.currentTime = parsedTime;
                          showToast(`Resumed from ${Math.floor(parsedTime / 60)}m`);
                        }
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none' }}
                  >
                    {streamData?.subtitles?.map((sub, i) => (
                      <track key={i} src={sub.file} kind="subtitles" label={sub.label}
                        srcLang={sub.label.substring(0, 2).toLowerCase()}
                        default={sub.label.toLowerCase().includes('english')}
                      />
                    ))}
                  </video>
                )}
              </>
            ) : null}
          </div>

          {/* Controls Bar */}
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
              <Toggle checked={autoSkip} onChange={setAutoSkip} label="Auto Skip" accent="#f59e0b" />
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.07)', margin: '0 4px' }} />

            {/* Prev / Next */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Prev', icon: <ChevronsLeft size={14} />, disabled: !hasPrev || streamLoading, onClick: () => hasPrev && handleEpisodeClick(providerEpisodes[currentIndex - 1].id) },
                { label: 'Next', icon: <ChevronsRight size={14} />, disabled: !hasNext || streamLoading, onClick: () => hasNext && handleEpisodeClick(providerEpisodes[currentIndex + 1].id) },
              ].map(btn => (
                <button
                  key={btn.label}
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

          {/* Episode Info + Sub/Dub + Servers */}
          <div style={{
            padding: '28px 28px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}>
            {/* Header: Now Playing + Sub/Dub */}
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

              {/* Sub / Dub Toggle */}
              <div style={{
                display: 'flex',
                background: 'var(--aw-bg)',
                border: '1px solid var(--aw-border)',
                borderRadius: 100,
                padding: 4,
                gap: 2,
              }}>
                {(['sub', 'dub'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategorySwitch(cat)}
                    style={{
                      padding: '6px 22px',
                      borderRadius: 100,
                      border: 'none',
                      background: currentCategory === cat ? 'var(--aw-s2)' : 'transparent',
                      color: currentCategory === cat ? 'var(--aw-accent)' : 'var(--aw-muted)',
                      fontSize: 11,
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

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />

            {/* Servers */}
            <div>
              <p style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--aw-font-display)',
                fontSize: 10, fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--aw-muted)',
                marginBottom: 14,
              }}>
                <Server size={11} style={{ opacity: 0.7 }} /> Video Servers
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {rankedProviders.map((p, index) => {
                  const isActive = currentProvider === p;
                  const isRec = index === 0 && !isActive;
                  return (
                    <button
                      key={p}
                      className={`srv-btn${isRec ? ' srv-recommended' : ''}`}
                      onClick={() => handleProviderSwitch(p)}
                      onMouseDown={handleRippleMouseDown}
                      style={{
                        position: 'relative',
                        padding: '9px 20px',
                        borderRadius: 10,
                        border: isActive
                          ? '1px solid var(--aw-accent)'
                          : '1px solid var(--aw-border)',
                        background: isActive
                          ? 'var(--aw-accent-dim)'
                          : 'var(--aw-card)',
                        color: isActive ? 'var(--aw-accent)' : 'var(--aw-muted)',
                        fontSize: 11,
                        fontFamily: 'var(--aw-font-display)',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        boxShadow: isActive ? '0 4px 20px -8px var(--aw-accent-glow)' : 'none',
                      }}
                    >
                      {p}
                      {isRec && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          width: 10, height: 10,
                          borderRadius: '50%',
                          background: '#22c55e',
                          boxShadow: '0 0 6px rgba(34,197,94,0.8)',
                        }}>
                          <span style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            background: 'rgba(34,197,94,0.5)',
                            animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
                          }} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Anime Info Card */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 28,
            padding: '28px 28px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            marginBottom: 32,
          }}>
            {/* Cover */}
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
                {/* Accent overlay strip */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, var(--aw-accent), var(--aw-accent-2))',
                }} />
              </div>
            </div>

            {/* Info */}
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

              {/* Meta row */}

              {/* Genres */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {(animeInfo?.genres || ['Anime']).map((g: string) => (
                  <span key={g} className="genre-pill">{g}</span>
                ))}
              </div>

              {/* Description */}
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
        </main>

        {/* ── Right: Episode Sidebar ── */}
        <aside style={{
          width: '100%',
          maxWidth: 400,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--aw-s1)',
          border: '1px solid var(--aw-border)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.6)',
          // Sticky on desktop
          position: 'sticky' as any,
          top: 88,
          height: 'calc(100vh - 110px)',
          zIndex: 40,
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--aw-border)',
            background: 'var(--aw-s2)',
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
              }}>
                Episodes
                {providerEpisodes.length > 0 && (
                  <span style={{
                    marginLeft: 10,
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--aw-accent)',
                    background: 'var(--aw-accent-dim)',
                    border: '1px solid var(--aw-accent)',
                    padding: '2px 8px',
                    borderRadius: 100,
                  }}>
                    {providerEpisodes.length}
                  </span>
                )}
              </h3>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search episodes…"
                value={epSearchQuery}
                onChange={e => setEpSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--aw-bg)',
                  border: '1px solid var(--aw-border)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  color: 'var(--aw-text)',
                  fontSize: 12,
                  fontFamily: 'var(--aw-font-body)',
                  fontWeight: 400,
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--aw-accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--aw-border)'}
              />
            </div>
          </div>

          {/* Episode list */}
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
              visibleEpisodes.map((ep) => {
                const isActive = extractSlug(ep.id) === episodeId;
                return (
                  <div
                    key={ep.id}
                    ref={isActive ? activeEpRef : null}
                    onClick={() => handleEpisodeClick(ep.id)}
                    className="ep-item"
                    style={{
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
                    {/* Active left bar */}
                    {isActive && (
                      <div className="ep-active-marker" style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: 3,
                        background: 'linear-gradient(180deg, var(--aw-accent), var(--aw-accent-2))',
                        borderRadius: '0 2px 2px 0',
                      }} />
                    )}

                    {/* Episode number */}
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

                    {/* Thumbnail */}
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

                    {/* Text info */}
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
