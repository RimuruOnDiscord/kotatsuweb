
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

const handleRippleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {};

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

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

const rankProviders = (providers: string[]) => {
  return [...providers].sort((a, b) => {
    const rankA = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
    const rankB = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
    return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
  });
};

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

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); },[autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); },[autoSkip]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  },[]);

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
          if (searchResults && searchResults.length > 0) {
            actualAnimeId = searchResults[0].id;
            setAnimeInfo(searchResults[0]); 
            try { episodesPayload = await fetchAnimeEpisodes(actualAnimeId); } catch (err) {}
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
                try { const info = await fetchInfoById(urlSlug); setAnimeInfo(info); } catch (e) {}
              }
            }
          } catch (err) {}
        }

        if (!episodesPayload?.providers) throw new Error("No providers found for this anime.");

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

  // Auto-Redirect best server
  useEffect(() => {
    if (loadingEpisodes || availableProviders.length === 0 || !urlSlug || provider) return;
    const bestProvider = rankedProviders[0];
    if (!bestProvider) return;
    const defaultCategory = episodesData[bestProvider]?.episodes?.['sub']?.length ? 'sub' : 'dub';
    const firstEp = episodesData[bestProvider]?.episodes?.[defaultCategory]?.[0];
    if (firstEp) navigate(getEpisodeHref(urlSlug, bestProvider, defaultCategory, firstEp.id), { replace: true });
  },[loadingEpisodes, episodesData, provider, category, episodeId, urlSlug, navigate, rankedProviders, availableProviders]);

  const currentCategory = category || 'sub';
  const currentProvider = provider || '';
  
  const providerEpisodes = useMemo(() => {
    if (!currentProvider) return [];
    return getProviderEpisodes({ providers: episodesData }, currentProvider, currentCategory);
  },[episodesData, currentProvider, currentCategory]);

  const visibleEpisodes = useMemo(() => {
    return providerEpisodes.filter(ep => 
      String(ep.number).includes(epSearchQuery.trim()) || 
      (ep.title && ep.title.toLowerCase().includes(epSearchQuery.trim().toLowerCase()))
    );
  }, [providerEpisodes, epSearchQuery]);

  const currentIndex = providerEpisodes.findIndex(ep => extractSlug(ep.id) === episodeId);
  const currentEpData = currentIndex !== -1 ? providerEpisodes[currentIndex] : providerEpisodes[0];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < providerEpisodes.length - 1 && currentIndex !== -1;

  useEffect(() => {
    if (activeEpRef.current) activeEpRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [episodeId, visibleEpisodes]);

  // Fetch Streaming Data
  useEffect(() => {
    if (!currentEpData?.id || !resolvedId || !currentProvider) return;
    let isMounted = true;
    const loadStream = async () => {
      setStreamLoading(true); setStreamData(null); setStreamError(null);
      setShowSkipIntro(false); setShowSkipOutro(false);
      try {
        const pureEpisodeId = extractSlug(currentEpData.id);
        const data = await fetchAnimeStreams(currentProvider.toLowerCase(), resolvedId, currentCategory as 'sub' | 'dub', pureEpisodeId);
        if (!data.streams || data.streams.length === 0) throw new Error(`Server is not responding.`);
        if (isMounted) setStreamData(data as any); 
      } catch (error: any) {
        if (isMounted) setStreamError(error.message || 'Failed to load media.');
      } finally {
        if (isMounted) setStreamLoading(false);
      }
    };
    loadStream();
    return () => { isMounted = false; };
  }, [currentEpData?.id, resolvedId, currentProvider, currentCategory]);

  const activeStream = useMemo(() => {
    if (!streamData?.streams) return null;
    const embedStream = streamData.streams.find(s => (s.type === 'embed' || s.url.includes('iframe') || s.url.includes('/embed/')) && !s.url.includes('.m3u8'));
    if (embedStream) return { ...embedStream, type: 'embed' }; 
    return streamData.streams.find(s => s.quality === 'auto' || s.quality === 'default') || streamData.streams[0];
  }, [streamData]);

  // --- CONTINUE WATCHING SAVING LOGIC ---
  const derivedTitle = typeof animeInfo?.title === 'string' ? animeInfo.title : animeInfo?.title?.english || animeInfo?.title?.romaji || animeInfo?.title?.userPreferred;
  const displayTitle = derivedTitle || (!/^\d+$/.test(String(urlSlug)) ? String(urlSlug).replace(/-/g, ' ') : 'Anime Details');

  const progressDataRef = useRef<any>(null);
  const videoStateRef = useRef({ currentTime: 0, duration: 0 });
  const lastSavedTime = useRef<number>(-1);

  // 1. Keep payload fresh
  useEffect(() => {
    progressDataRef.current = {
      animeId: String(resolvedId || urlSlug),
      episodeId: currentEpData ? extractSlug(currentEpData.id) : '',
      animeTitle: displayTitle,
      animeCover: animeInfo?.image || animeInfo?.coverImage?.large || animeInfo?.images?.jpg?.large_image_url || undefined,
      episodeTitle: currentEpData?.title || `Episode ${currentEpData?.number || '?'}`,
      episodeNumber: currentEpData?.number || 0,
      href: (currentEpData && urlSlug) ? getEpisodeHref(urlSlug, currentProvider, currentCategory, currentEpData.id) : ''
    };
  }, [resolvedId, urlSlug, currentEpData, displayTitle, animeInfo, currentProvider, currentCategory]);

  // 2. The forceful save function (Works for iframes and native video)
  const forceSaveProgress = useCallback(() => {
    const payload = progressDataRef.current;
    const { currentTime, duration } = videoStateRef.current;

    // As long as we know what episode we are on, SAVE IT. 
    if (payload && payload.episodeId) {
      try {
        if (currentTime > 0) localStorage.setItem(`progress-${payload.episodeId}`, currentTime.toString());

        const raw = localStorage.getItem('anime-continue-watching');
        const existing = raw ? JSON.parse(raw) : [];
        const entries = Array.isArray(existing) ? existing : [];
        
        // Remove duplicate entry for this anime
        const filtered = entries.filter((entry: any) => String(entry.animeId) !== String(payload.animeId));
        
        filtered.unshift({
          kind: 'anime',
          ...payload,
          duration: duration || 0,
          currentTime: currentTime || 0,
          updatedAt: Date.now()
        });

        localStorage.setItem('anime-continue-watching', JSON.stringify(filtered.slice(0, 40)));
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        console.warn('Failed to save continue watching state', err);
      }
    }
  }, []);

  // 3. Save immediately when episode successfully loads (crucial for iframes)
  useEffect(() => {
    if (streamData && progressDataRef.current?.episodeId) {
      forceSaveProgress();
    }
  }, [streamData, forceSaveProgress]);

  // 4. Save on Tab Close / Unmount
  useEffect(() => {
    const handleBeforeUnload = () => forceSaveProgress();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      forceSaveProgress(); // Triggers when hitting Back button
    };
  }, [forceSaveProgress]);


  // Mount Video Player & HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!activeStream || activeStream.type === 'embed' || !video) return;
    
    const isHls = activeStream.type === 'hls' || activeStream.url.includes('.m3u8');
    const savedEpId = progressDataRef.current?.episodeId || episodeId;
    const savedTime = localStorage.getItem(`progress-${savedEpId}`);
    
    if (savedTime && parseFloat(savedTime) > 0) {
      video.currentTime = parseFloat(savedTime);
      showToast("Resumed from your last session");
    }

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true, lowLatencyMode: true });
      hls.loadSource(activeStream.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
            default: hls.destroy(); setStreamError('Fatal stream error.'); break;
          }
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
      video.src = activeStream.url;
    }

    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  },[activeStream, episodeId, showToast]);

  // Handlers
  const handleEpisodeClick = useCallback((targetEpisodeId: string) => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider) return;
    navigate(getEpisodeHref(urlSlug, currentProvider, currentCategory, targetEpisodeId));
  },[urlSlug, currentProvider, currentCategory, navigate, forceSaveProgress]);

  const handleCategorySwitch = useCallback((newCategory: 'sub' | 'dub') => {
    forceSaveProgress();
    if (!urlSlug || !currentProvider || newCategory === currentCategory) return;
    const categoryEpisodes = getProviderEpisodes({ providers: episodesData }, currentProvider, newCategory);
    if (categoryEpisodes.length === 0) return showToast(`No ${newCategory.toUpperCase()} episodes found.`);
    const matchingEp = categoryEpisodes.find(ep => ep.number === currentEpData?.number) || categoryEpisodes[0];
    navigate(getEpisodeHref(urlSlug, currentProvider, newCategory, matchingEp.id));
  },[urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleProviderSwitch = useCallback((newProvider: string) => {
    forceSaveProgress();
    if (!urlSlug || newProvider === currentProvider) return;
    const providerEps = getProviderEpisodes({ providers: episodesData }, newProvider, currentCategory);
    if (providerEps.length === 0) return showToast(`Server [${newProvider}] has no episodes.`);
    const matchingEp = providerEps.find(ep => ep.number === currentEpData?.number) || providerEps[0];
    navigate(getEpisodeHref(urlSlug, newProvider, currentCategory, matchingEp.id));
  },[urlSlug, currentProvider, currentCategory, episodesData, currentEpData, navigate, showToast, forceSaveProgress]);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    const duration = e.currentTarget.duration;
    
    videoStateRef.current = { currentTime: time, duration };

    if (!time || !streamData) return;

    // Periodic Background Save
    const currentSecond = Math.floor(time);
    if (currentSecond % 5 === 0 && currentSecond !== lastSavedTime.current) {
      lastSavedTime.current = currentSecond;
      forceSaveProgress();
    }

    if (streamData.intro && time >= streamData.intro.start && time <= streamData.intro.end) {
      if (autoSkip) { e.currentTarget.currentTime = streamData.intro.end; showToast("Intro Skipped"); } 
      else if (!showSkipIntro) setShowSkipIntro(true);
    } else if (showSkipIntro) setShowSkipIntro(false);

    if (streamData.outro && time >= streamData.outro.start && time <= streamData.outro.end) {
      if (autoSkip) { e.currentTarget.currentTime = streamData.outro.end; showToast("Outro Skipped"); } 
      else if (!showSkipOutro) setShowSkipOutro(true);
    } else if (showSkipOutro) setShowSkipOutro(false);
  }, [streamData, autoSkip, showSkipIntro, showSkipOutro, showToast, forceSaveProgress]);

  const handleVideoEnd = useCallback(() => {
    if (autoPlay && hasNext) handleEpisodeClick(providerEpisodes[currentIndex + 1].id);
  },[autoPlay, hasNext, handleEpisodeClick, providerEpisodes, currentIndex]);

  const skipTo = (time: number) => { if (videoRef.current) videoRef.current.currentTime = time; };

  return (
    <div style={{ fontFamily: APP_FONT }} className="min-h-screen w-full flex flex-col bg-[var(--app-bg)] text-white selection:bg-[var(--app-accent-muted)] relative font-light">
      {lightsOff && <div className="fixed inset-0 z-40 bg-black/95 transition-opacity duration-500 cursor-pointer" onClick={() => setLightsOff(false)} />}
      <div className="z-50 sticky top-0 border-b border-[var(--app-border)] bg-[var(--app-surface-1)]">
        <AppTopbar searchQuery={searchQueryTop} onSearchQueryChange={setSearchQueryTop} />
      </div>

      <div className="flex flex-col lg:flex-row flex-1 p-4 lg:p-8 gap-6 max-w-[1500px] mx-auto w-full z-40 justify-center items-start">
        
        <main className="flex-1 w-full max-w-[1000px] flex flex-col gap-4 lg:gap-6 relative z-50">
          <div className={`relative w-full aspect-video group overflow-hidden bg-[var(--app-card)] shadow-2xl ring-1 ring-white/5 ${lightsOff ? 'ring-4 ring-[var(--app-accent)] shadow-[0_0_50px_rgba(var(--app-accent-rgb),0.3)] z-50' : ''}`}>
            
            {toastMessage && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 text-white px-6 py-2 rounded-full text-xs font-normal tracking-wide uppercase border border-white/10 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-4">
                {toastMessage}
              </div>
            )}

            {showSkipIntro && streamData?.intro && !autoSkip && (
              <button onClick={() => skipTo(streamData.intro!.end)} className="ripple-button absolute bottom-20 right-8 z-50 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 text-xs font-normal text-white shadow-xl transition-all hover:bg-white/20 hover:scale-105">
                <FastForward size={14} /> Skip Intro
              </button>
            )}

            {showSkipOutro && streamData?.outro && !autoSkip && (
              <button onClick={() => skipTo(streamData.outro!.end)} className="ripple-button absolute bottom-20 right-8 z-50 flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 text-xs font-normal text-white shadow-xl transition-all hover:bg-white/20 hover:scale-105">
                <FastForward size={14} /> Skip Outro
              </button>
            )}

            {streamLoading || loadingEpisodes ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-[var(--app-accent)]" />
              </div>
            ) : streamError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-8 text-center gap-4 z-10 border border-red-500/20">
                <p className="text-xs font-normal uppercase tracking-wider text-red-400">Stream Failed</p>
                <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
                <span className="text-sm font-light text-zinc-300 max-w-md">{streamError}</span>
                <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2.5 bg-[var(--app-surface-2)] border border-[var(--app-border)] rounded-full text-xs font-normal uppercase tracking-wide hover:bg-white/5 transition-colors">
                  Reload Player
                </button>
              </div>
            ) : activeStream ? (
              <>
                {activeStream.type === 'embed' ? (
                  <iframe src={activeStream.url} allowFullScreen className="w-full h-full border-none" />
                ) : (
                  <video
                    ref={videoRef} controls autoPlay={autoPlay} crossOrigin="anonymous" playsInline
                    onTimeUpdate={handleTimeUpdate} onEnded={handleVideoEnd}
                    className="w-full h-full object-contain outline-none bg-black"
                  >
                    {streamData?.subtitles?.map((sub, i) => (
                      <track key={i} src={sub.file} kind="subtitles" label={sub.label} srcLang={sub.label.substring(0, 2).toLowerCase()} default={sub.label.toLowerCase().includes('english')} />
                    ))}
                  </video>
                )}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 px-6 py-4 bg-[var(--app-surface-1)] rounded-xl border border-white/[0.05]">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${autoPlay ? 'bg-[var(--app-accent)] border-[var(--app-accent)]' : 'bg-[var(--app-card)] border-zinc-600 group-hover:border-zinc-400'}`}>
                  {autoPlay && <CheckCircle2 size={12} className="text-[#04110d]" />}
                </div>
                <span className="text-xs font-normal tracking-wide text-zinc-300 group-hover:text-white transition-colors">Autoplay</span>
                <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} className="hidden" />
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${autoSkip ? 'bg-amber-500 border-amber-500' : 'bg-[var(--app-card)] border-zinc-600 group-hover:border-zinc-400'}`}>
                  {autoSkip && <CheckCircle2 size={12} className="text-black" />}
                </div>
                <span className={`text-xs font-normal tracking-wide transition-colors ${autoSkip ? 'text-amber-400' : 'text-zinc-300 group-hover:text-white'}`}>Auto Skip</span>
                <input type="checkbox" checked={autoSkip} onChange={e => setAutoSkip(e.target.checked)} className="hidden" />
              </label>
            </div>

            <div className="flex items-center gap-2 ml-4 border-l border-white/[0.08] pl-6">
              <button onClick={() => hasPrev && handleEpisodeClick(providerEpisodes[currentIndex - 1].id)} disabled={!hasPrev || streamLoading} className="ripple-button inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-normal tracking-wide text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronsLeft size={14} /> Prev
              </button>
              <button onClick={() => hasNext && handleEpisodeClick(providerEpisodes[currentIndex + 1].id)} disabled={!hasNext || streamLoading} className="ripple-button inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-xs font-normal tracking-wide text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                Next <ChevronsRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <button onClick={() => setLightsOff(!lightsOff)} className="flex items-center gap-2 text-xs font-normal tracking-wide text-zinc-400 hover:text-white transition-colors">
                <Lightbulb size={14} className={lightsOff ? 'text-yellow-400' : ''} /> Lights Off
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 p-6 lg:p-8 bg-[var(--app-surface-1)] rounded-xl border border-white/[0.05]">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-normal uppercase tracking-wider text-[var(--app-accent)] mb-2 flex items-center gap-2">
                  <MonitorPlay size={12} /> Now Playing
                </p>
                <h1 className="text-2xl lg:text-3xl font-normal tracking-tight text-white leading-tight">
                  {currentEpData?.title || `Episode ${currentEpData?.number || '?'}`}
                </h1>
              </div>

              <div className="flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-card)] p-1 shrink-0">
                <button onClick={() => handleCategorySwitch('sub')} className={`px-6 py-1.5 rounded-full text-xs font-normal tracking-wide transition-all ${currentCategory === 'sub' ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)] shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Sub</button>
                <button onClick={() => handleCategorySwitch('dub')} className={`px-6 py-1.5 rounded-full text-xs font-normal tracking-wide transition-all ${currentCategory === 'dub' ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)] shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Dub</button>
              </div>
            </div>

            <div className="mt-4 pt-6 border-t border-white/[0.05]">
              <div className="flex items-center gap-2 text-xs font-normal text-zinc-500 uppercase tracking-wider mb-4">
                <Server size={14} /> Video Servers
              </div>
              <div className="flex flex-wrap gap-3">
                {rankedProviders.map((p, index) => {
                  const isActive = currentProvider === p;
                  return (
                    <button key={p} onClick={() => handleProviderSwitch(p)} onMouseDown={handleRippleMouseDown} className={`ripple-button relative px-6 py-3 rounded-[1rem] text-sm font-light uppercase tracking-wide transition-all duration-300 flex items-center gap-2 ${isActive ? 'bg-[var(--app-surface-2)] border border-[var(--app-accent)] text-[var(--app-accent)] shadow-[0_5px_20px_-10px_var(--app-accent)]' : 'bg-[var(--app-card)] border border-[var(--app-border)] text-zinc-400 hover:border-zinc-600 hover:text-white'}`}>
                      {p}
                      {index === 0 && !isActive && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 p-6 lg:p-8 bg-[var(--app-surface-1)] rounded-xl border border-white/[0.05] mt-2 mb-12">
            <div className="w-48 lg:w-56 shrink-0 mx-auto md:mx-0">
              <img src={animeInfo?.image || animeInfo?.coverImage?.large || 'https://via.placeholder.com/300x450/181818/3f3f46?text=No+Cover'} alt="Anime Cover" className="w-full aspect-[2/3] object-cover rounded-xl shadow-2xl ring-1 ring-white/10" />
            </div>

            <div className="flex flex-col flex-1 justify-start">
              <h1 className="text-3xl lg:text-[2.5rem] font-black italic uppercase tracking-wide text-white drop-shadow-sm leading-none">
                {displayTitle}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 mt-5 text-sm font-normal tracking-wide text-zinc-400">
                <span className="flex items-center gap-1.5 text-[var(--app-accent)]"><Building size={14} /> {animeInfo?.studios?.[0] || 'Studio'}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-[var(--app-accent)]">{animeInfo?.status || 'Unknown Status'}</span>
                <span className="text-zinc-600">•</span>
                <span className="flex items-center gap-1.5 text-white"><Star size={14} className="fill-current text-yellow-500" /> {(animeInfo?.rating && animeInfo.rating <= 100 ? animeInfo.rating / 10 : animeInfo?.score) || 'N/A'}</span>
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                {(animeInfo?.genres || ['Anime']).map((genre: string) => (
                  <span key={genre} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-light tracking-wide text-zinc-300">{genre}</span>
                ))}
              </div>

              <p className="mt-6 text-sm font-light text-zinc-400 leading-relaxed line-clamp-4 lg:line-clamp-5 max-w-3xl">
                {animeInfo?.description?.replace(/<[^>]*>?/gm, '') || animeInfo?.synopsis || "No description available for this anime."}
              </p>
            </div>
          </div>
          
        </main>

        <aside className="w-full lg:w-[420px] flex flex-col flex-shrink-0 z-40 lg:sticky lg:top-[100px] h-auto lg:h-[calc(100vh-120px)] rounded-xl bg-[var(--app-surface-1)] border border-white/[0.05] overflow-hidden shadow-2xl">
          <div className="p-5 border-b border-white/[0.05] shrink-0 bg-[var(--app-surface-1)]">
            <h3 className="text-xl font-normal tracking-wide text-white">Episodes</h3>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-col">
              {loadingEpisodes ? (
                 [1,2,3,4,5,6,7].map(i => (
                     <div key={i} className="flex gap-4 p-4 border-b border-white/[0.04] last:border-0">
                         <div className="h-[72px] w-6 md:w-8 shrink-0 bg-white/5 animate-pulse rounded" />
                         <div className="h-[72px] w-[128px] shrink-0 bg-white/5 animate-pulse rounded-md" />
                         <div className="flex-1 space-y-2 py-1">
                             <div className="flex justify-between">
                                 <div className="h-4 w-1/3 bg-white/5 animate-pulse rounded" />
                                 <div className="h-4 w-8 bg-white/5 animate-pulse rounded" />
                             </div>
                             <div className="h-3 w-2/3 bg-white/5 animate-pulse rounded mt-3" />
                             <div className="h-3 w-1/2 bg-white/5 animate-pulse rounded" />
                         </div>
                     </div>
                 ))
              ) : visibleEpisodes.length > 0 ? (
                visibleEpisodes.map((ep) => {
                  const isActive = extractSlug(ep.id) === episodeId;
                  return (
                    <div
                      key={ep.id}
                      ref={isActive ? activeEpRef : null}
                      onClick={() => handleEpisodeClick(ep.id)}
                      className={`group relative flex items-start gap-4 p-4 transition-colors cursor-pointer border-b border-white/[0.04] last:border-0 hover:border-transparent ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--app-accent)]" />}
                      <div className={`flex h-[72px] w-6 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-light transition-colors ${isActive ? 'text-[var(--app-accent)] font-normal' : 'text-[#a3a3a3] group-hover:text-white'}`}>
                          {ep.number || '-'}
                      </div>
                      <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-md bg-[#181818] ring-1 ring-white/10">
                          <img src={ep.image || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${ep.number}`} className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:opacity-100" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />
                          {ep.filler && <div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1 py-0.5 text-[10px] font-normal tracking-wide text-white">Filler</div>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                          <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm md:text-base line-clamp-1 ${isActive ? 'font-medium text-white' : 'font-normal text-white'}`}>{ep.title || `Episode ${ep.number || '?'}`}</h4>
                              {ep.duration && <span className="shrink-0 text-xs font-light text-[#d2d2d2]">{Math.round(ep.duration / 60)}m</span>}
                          </div>
                          <p className={`mt-1 line-clamp-2 text-xs font-light transition-colors ${isActive ? 'text-zinc-300' : 'text-[#a3a3a3] group-hover:text-zinc-300'}`}>
                              {ep.description || `Episode ${ep.number}. ${ep.airDate ? `Originally aired on ${formatEpisodeDate(ep.airDate)}.` : 'No synopsis available for this episode.'}`}
                          </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <AlertCircle size={24} className="mx-auto text-zinc-600 mb-3" />
                  <p className="text-xs font-light uppercase tracking-wider text-zinc-500">No Matches</p>
                </div>
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default AnimeWatch;
