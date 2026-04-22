import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Star, Loader2, Bookmark, Languages,
  Info, ArrowDownUp, Youtube,
  Users, ExternalLink, Trophy, TrendingUp, Heart,
  Calendar, Library, Play, Film, Tv
} from 'lucide-react';

import { isBookmarked, readBookmarks, toggleBookmark } from '../utils/bookmarks';
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
    
  /* Custom Scrollbar for inner containers */
  .aw-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
  .aw-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .aw-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  .aw-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
`;

const genreToParam = (genre: string) => genre.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export const createSlug = (title: string) => {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
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

// Advanced label generator to make movies/ovas look distinct from seasons
const generateTabLabel = (title: string, baseTitle: string, index: number, format?: string) => {
  if (!title) return `Season ${index + 1}`;

  // 1. Explicit Season/Part Matches (Prioritize these)
  const sMatch = title.match(/Season\s*(\d+)/i) || title.match(/(\d+)(?:st|nd|rd|th)\s*Season/i);
  if (sMatch) return `Season ${sMatch[1]}`;

  const pMatch = title.match(/Part\s*(\d+)/i);
  if (pMatch && format !== 'MOVIE') return `Part ${pMatch[1]}`;

  // 2. Strip Base Title to isolate the unique subtitle
  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const baseRegex = new RegExp(`^${escapeRegExp(baseTitle)}[\\s:\\-]*`, 'i');
  let label = title.replace(baseRegex, '').replace(/^[\s:\-]+/, '').trim();

  // 3. Format specific styling (Movies, OVAs, etc.)
  if (format === 'MOVIE') {
    const mLabel = label.replace(/^((The )?Movie)[\s:\-]*/i, '').trim();
    return mLabel ? `Movie: ${mLabel.substring(0, 16)}${mLabel.length > 16 ? '...' : ''}` : 'Movie';
  }
  if (format === 'OVA') return label ? `OVA: ${label.substring(0, 14)}${label.length > 14 ? '...' : ''}` : 'OVA';
  if (format === 'SPECIAL') return label ? `SP: ${label.substring(0, 14)}${label.length > 14 ? '...' : ''}` : 'Special';

  // 4. Standard TV Subtitle Handling (e.g. "Shippuden")
  if (!label) return index === 0 ? 'Season 1' : `Season ${index + 1}`;
  if (/^(II|III|IV|V|VI)$/i.test(label)) return `Season ${label}`;

  return label.length > 20 ? label.substring(0, 17) + '...' : label;
};

// Sort algorithm to group Prequels/Sequels FIRST, then Movies, then OVAs.
const getSortWeight = (relationType: string, format: string) => {
  if (relationType === 'PREQUEL') return 1;
  if (relationType === 'SEQUEL') return 3;
  if (relationType === 'PARENT') return 0;
  if (format === 'MOVIE') return 4;
  if (format === 'OVA') return 5;
  if (format === 'SPECIAL') return 6;
  return 7;
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
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState<'sub' | 'dub'>('sub');

  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [watchProgress, setWatchProgress] = useState<ContinueWatchingData | null>(null);

  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<SortOrder>('desc');

  const resolvedSlug = useMemo(() => {
    if (urlSlug && Number.isNaN(Number(urlSlug))) return urlSlug;
    if (data) return createSlug(data.title?.english || data.title?.romaji || data.title?.native || '');
    return '';
  }, [urlSlug, data]);

  // Safely normalize relations whether API sends an array or { edges: [...] }
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

  // Include ALL Anime formats (Seasons, Movies, OVAs, Specials)
  const relatedSeasons = useMemo(() => {
    return normalizedRelations.filter((r: any) => {
      if (r.type && r.type !== 'ANIME') return false;
      const fmt = r.format?.toUpperCase();
      if (fmt === 'MUSIC' || fmt === 'MANGA' || fmt === 'NOVEL') return false;
      return true;
    });
  }, [normalizedRelations]);

  // Generate Navigation Pill Tabs
  const navTabs = useMemo(() => {
    if (!data) return [];
    
    const tabs: Array<{ id: number; title: string; slug: string; format: string; relationType?: string; active: boolean; displayLabel?: string }> = [];
    const seenIds = new Set<number>();
    const baseTitle = getBaseTitle(data.title?.english || data.title?.romaji || data.title?.native || '');

    // Add Current Context (Weight 2)
    tabs.push({ 
      id: data.id, 
      title: data.title?.english || data.title?.romaji || data.title?.native, 
      format: data.format,
      active: true, 
      slug: resolvedSlug 
    });
    seenIds.add(data.id);

    // Add Related Entries
    relatedSeasons.forEach((r: any) => {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        tabs.push({
          id: r.id,
          title: r.title?.english || r.title?.romaji || r.title?.native,
          format: r.format,
          relationType: r.relationType,
          active: false,
          slug: String(r.id)
        });
      }
    });

    // Smart Sort: Group by Prequel -> Main -> Sequel -> Movies -> OVAs/Specials
    tabs.sort((a, b) => {
      const weightA = a.active ? 2 : getSortWeight(a.relationType || '', a.format || '');
      const weightB = b.active ? 2 : getSortWeight(b.relationType || '', b.format || '');
      if (weightA !== weightB) return weightA - weightB;
      return a.id - b.id; // Fallback to ID within same weight class
    });

    return tabs.map((tab, index) => ({ 
      ...tab, 
      displayLabel: generateTabLabel(tab.title, baseTitle, index, tab.format) 
    }));
  }, [data, resolvedSlug, relatedSeasons]);

  useEffect(() => {
    const id = 'aw-design-styles-anime-detail';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  // Sync Progress State
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
        
        // Fallback to local storage
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

  // Main Fetch Logic mapped directly to animeApi
  useEffect(() => {
    const fetchAll = async () => {
      if (!urlSlug) return;
      try {
        setLoading(true); setLoadFailed(false); setData(null); setEpisodesData({});

        let fetchId = Number(urlSlug);
        
        // Resolve Text Slugs via Search
        if (isNaN(fetchId)) {
          const searchRes = await fetchAnimeSearch(urlSlug, 1);
          if (searchRes?.results?.length) fetchId = searchRes.results[0].id;
          else throw new Error("Anime not found in database.");
        }

        // Fetch Info and Episodes concurrently
        const [info, epsPayload] = await Promise.all([
          fetchAnimeInfo(fetchId),
          fetchAnimeEpisodes(fetchId).catch(() => null)
        ]);

        if (!info) throw new Error('API returned no info data');

        setData(info);

        const providersMap = epsPayload?.providers || {};
        setEpisodesData(providersMap);

        const availableKeys = Object.keys(providersMap);
        const defaultProvider = availableKeys.find(k => k.toLowerCase() === 'kiwi') || getPreferredAnimeProvider(providersMap) || availableKeys[0];

        if (defaultProvider) {
          setProvider(defaultProvider);
          const hasDub = (providersMap[defaultProvider]?.episodes?.dub?.length || 0) > 0;
          setCategory(hasDub ? 'sub' : 'sub');
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
    if (!data?.idMal && !data?.id) { setBookmarked(false); return; }
    const syncBookmarkState = async () => {
      const targetId = data.idMal || data.id;
      if (user) {
        const { data: dbData } = await supabase.from('anime_bookmarks').select('mal_id').eq('user_id', user.id).eq('mal_id', String(targetId));
        setBookmarked(dbData && dbData.length > 0 ? true : false);
      } else {
        setBookmarked(isBookmarked(targetId, readBookmarks()));
      }
    };
    syncBookmarkState();
    window.addEventListener('storage', syncBookmarkState); window.addEventListener('focus', syncBookmarkState);
    return () => { window.removeEventListener('storage', syncBookmarkState); window.removeEventListener('focus', syncBookmarkState); };
  }, [data, user]);

  useEffect(() => {
    if (!provider || !episodesData[provider]) return;
    const hasCategoryEpisodes = (episodesData[provider].episodes?.[category]?.length || 0) > 0;
    if (!hasCategoryEpisodes) setCategory((episodesData[provider].episodes?.sub?.length || 0) > 0 ? 'sub' : 'dub');
  }, [category, episodesData, provider]);

  const providerNames = useMemo(() => {
    const PREFERRED_SERVERS = ['kiwi', 'animepahe', 'hd-1', 'vidstreaming', 'megacloud', 'hd-2', 'zoro', 'gogoanime', 'kai'];
    return Object.keys(episodesData).sort((a, b) => {
      const rankA = PREFERRED_SERVERS.findIndex(p => a.toLowerCase().includes(p));
      const rankB = PREFERRED_SERVERS.findIndex(p => b.toLowerCase().includes(p));
      return (rankA === -1 ? 99 : rankA) - (rankB === -1 ? 99 : rankB);
    });
  }, [episodesData]);

  const providerEpisodes = useMemo(() => getProviderEpisodes({ providers: episodesData }, provider, category), [category, episodesData, provider]);

  const handleBookmarkToggle = useCallback(async () => {
    if (!data) return;
    const targetId = data.idMal || data.id;
    const title = data.title?.english || data.title?.romaji || data.title?.native || 'Unknown Title';
    const coverUrl = data.coverImage?.extraLarge || data.coverImage?.large || data.coverImage;
    
    if (user) {
      if (bookmarked) {
        const { error } = await supabase.from('anime_bookmarks').delete().eq('user_id', user.id).eq('mal_id', String(targetId));
        if (!error) setBookmarked(false);
      } else {
        const { error } = await supabase.from('anime_bookmarks').insert({
            user_id: user.id, mal_id: String(targetId), title: title, cover: coverUrl, type: data.format || 'Anime',
            status: data.status || 'Unknown', score: data.averageScore || null, author: data.studios?.[0]?.name || null
        });
        if (!error) setBookmarked(true);
      }
    } else {
      const result = toggleBookmark({ malId: targetId, title, cover: coverUrl, type: data.format || 'Anime', status: data.status, score: data.averageScore, author: data.studios?.[0]?.name });
      setBookmarked(result.bookmarked);
    }
  }, [data, user, bookmarked]);

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
      <div className="aw-root min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--aw-accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!data || loadFailed) {
    return (
      <div className="aw-root aw-noise min-h-screen flex flex-col items-center justify-center gap-5 px-4 text-center">
        <div className="text-xl font-bold uppercase tracking-[0.16em]" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {loadFailed ? 'Anime data failed to load' : 'Anime not found'}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full px-6 py-3 transition-colors border"
          style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-display)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.style.background = 'var(--aw-s2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.background = 'var(--aw-s1)'; }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="aw-root aw-noise relative min-h-screen text-white pb-20 selection:bg-[var(--aw-accent-muted)]">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, borderBottom: '1px solid var(--aw-border)', background: 'rgba(7,7,13,0.85)', backdropFilter: 'blur(20px)' }} />

      <div className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-8">
        <button
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 rounded-full border px-4 py-2 transition-all duration-300 mb-8 w-fit"
          style={{ background: 'var(--aw-bg)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>BACK</span>
        </button>

        {/* --- Top Section: Cover & Info --- */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 mb-12">
          <div className="w-full md:w-[17.5rem] lg:w-[20.125rem] flex-shrink-0 group perspective-1000">
            <div className="relative aspect-[2/3] rounded-[16px] overflow-hidden shadow-2xl transition-transform duration-500 ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }}>
              <img src={data.coverImage?.extraLarge || data.coverImage?.large} className="w-full h-full object-cover" alt={displayTitle} />
              {data.bannerImage && <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />}
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-2">
            <h1 className="text-4xl md:text-6xl lg:text-[4rem] font-black uppercase tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 mb-4 line-clamp-3" style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em' }}>
              {displayTitle}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wider mb-6" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
              <span className="text-white flex items-center gap-1.5"><Film size={12} style={{ color: 'var(--aw-accent)' }} /> {data.studios?.[0]?.name || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <span style={{ color: 'var(--aw-accent)' }}>{data.status || '?'}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: 'var(--aw-border)' }} />
              <div className="flex items-center gap-1 text-white">
                <Star size={12} fill="currentColor" style={{ color: 'var(--aw-accent)' }} />
                {data.averageScore ?? '?'}%
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.genres?.map((g: string) => (
                <span
                  key={g}
                  onClick={() => navigate(`/browse?genres=${genreToParam(g)}`)}
                  className="px-3 py-1.5 rounded-full border text-[10px] font-semibold uppercase tracking-widest transition-all cursor-pointer"
                  style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
                >
                  {g}
                </span>
              ))}
            </div>

            <p className="mt-5 mb-6 text-sm font-medium leading-relaxed line-clamp-3 md:line-clamp-4 md:max-w-[55ch]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
              {data.description?.replace(/<[^>]*>?/gm, '') || 'No synopsis available.'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {watchProgress ? (
                <>
                  <button
                    onClick={() => { setIsLinking(true); navigate(watchProgress.href); }}
                    disabled={isLinking}
                    className="flex h-[48px] items-center gap-2 rounded-[14px] px-6 text-sm font-bold transition-all disabled:opacity-60"
                    style={{ backgroundColor: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    onMouseEnter={(e) => { if (!isLinking) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { if (!isLinking) e.currentTarget.style.filter = 'none'; }}
                  >
                    {isLinking ? <Loader2 className="animate-spin" size={16} /> : <Play size={15} fill="currentColor" />}
                    Resume {watchProgress.episodeNumber ? `Ep. ${watchProgress.episodeNumber}` : 'Watching'}
                  </button>
                  <div className={`flex items-center rounded-[14px] overflow-hidden border transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`} style={{ borderColor: 'var(--aw-border)' }}>
                    <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all" style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }} onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}>
                      First
                    </button>
                    <div className="w-px self-stretch" style={{ background: 'var(--aw-border)' }} />
                    <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="flex h-[48px] items-center justify-center px-5 text-sm font-bold transition-all" style={{ background: 'var(--aw-s1)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }} onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }} onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}>
                      Latest
                    </button>
                  </div>
                </>
              ) : (
                <div className={`flex items-center rounded-[14px] overflow-hidden transition-all ${!providerEpisodes.length ? 'opacity-40 pointer-events-none' : ''}`}>
                  <button onClick={handleWatchFirst} disabled={!providerEpisodes.length || isLinking} className="flex h-[48px] items-center gap-2 border px-6 text-sm font-bold transition-all hover:opacity-80 disabled:opacity-60" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: '14px', borderBottomLeftRadius: '14px' }} onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.filter = 'brightness(1.1)'; }} onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.filter = 'none'; }}>
                    <Play size={15} fill="currentColor" />
                    {isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch First'}
                  </button>
                  <button onClick={handleWatchLatest} disabled={!providerEpisodes.length || isLinking} className="flex h-[48px] items-center gap-2 border-t border-b border-r px-6 text-sm font-bold hover:opacity-80 transition-all disabled:opacity-60" style={{ background: 'var(--aw-s1)', color: 'white', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopRightRadius: '14px', borderBottomRightRadius: '14px' }} onMouseEnter={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s2)'; }} onMouseLeave={(e) => { if (providerEpisodes.length && !isLinking) e.currentTarget.style.background = 'var(--aw-s1)'; }}>
                    <Tv size={15} />
                    {isLinking ? <Loader2 className="animate-spin" size={15} /> : 'Watch Latest'}
                  </button>
                </div>
              )}

              {/* Watch Trailer Button */}
              {data.trailer?.site === 'youtube' && data.trailer?.id && (
                <a
                  href={`https://www.youtube.com/watch?v=${data.trailer.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[48px] items-center gap-2 rounded-[14px] border px-6 text-sm font-bold transition-all duration-150 hover:opacity-80"
                  style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'white', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  <Youtube size={18} style={{ color: 'var(--aw-accent)' }} />
                  Trailer
                </a>
              )}

                            <button
                type="button" onClick={handleBookmarkToggle}
                className={`flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border transition-all duration-150 ${bookmarked ? '' : 'hover:opacity-80'}`}
                style={bookmarked ? { background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)', color: 'var(--aw-accent)' } : { background: 'var(--aw-s1)', borderColor: 'var(--aw-border)', color: 'white' }}
              >
                <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
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
                <div className="flex overflow-x-auto gap-3 mb-10 pb-2 aw-scrollbar">
                  {navTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.active && navigate(`/watch/${tab.slug}`)}
                      title={tab.title}
                      className="px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] whitespace-nowrap transition-all duration-300 border"
                      style={tab.active
                        ? { background: 'var(--aw-accent)', color: '#04110d', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                        : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                      }
                      onMouseEnter={(e) => { if (!tab.active) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                      onMouseLeave={(e) => { if (!tab.active) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                    >
                      {tab.displayLabel}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-6 flex items-end justify-between border-b pb-3" style={{ borderColor: 'var(--aw-border)' }}>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</h3>
              </div>

              <div className="mb-6 flex flex-col gap-4 px-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {providerNames.map((providerName) => (
                      <button
                        key={providerName}
                        type="button"
                        onClick={() => setProvider(providerName)}
                        className="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300"
                        style={provider === providerName
                          ? { background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                        onMouseEnter={(e) => { if (provider !== providerName) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                        onMouseLeave={(e) => { if (provider !== providerName) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                      >
                        {providerName}
                      </button>
                    ))}
                    {providerNames.length > 0 && <div className="mx-2 h-6 w-px" style={{ background: 'var(--aw-border)' }} />}
                    {(['sub', 'dub'] as const).map((audioMode) => (
                      <button
                        key={audioMode}
                        type="button"
                        onClick={() => setCategory(audioMode)}
                        disabled={(episodesData[provider]?.episodes?.[audioMode]?.length || 0) === 0}
                        className="rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35"
                        style={category === audioMode
                          ? { background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }
                          : { background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }
                        }
                        onMouseEnter={(e) => { if (category !== audioMode && (episodesData[provider]?.episodes?.[audioMode]?.length || 0) !== 0) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                        onMouseLeave={(e) => { if (category !== audioMode && (episodesData[provider]?.episodes?.[audioMode]?.length || 0) !== 0) { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                      >
                        {audioMode}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEpisodeSortOrder((current) => current === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-300"
                      style={{ background: 'var(--aw-bg)', color: 'var(--aw-muted)', borderColor: 'var(--aw-border)', fontFamily: 'var(--aw-font-display)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                    >
                      <ArrowDownUp size={12} />{episodeSortOrder === 'desc' ? 'Newest' : 'Oldest'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="max-h-[800px] overflow-y-auto overflow-x-hidden pr-2 aw-scrollbar">
                <div className="flex flex-col">
                  {providerEpisodes.length > 0 ? (
                    visibleEpisodes.length > 0 ? (
                      visibleEpisodes.map((episode) => (
                        <div
                          key={episode.id}
                          onClick={() => provider && navigate(getEpisodeHref(resolvedSlug, provider, category, episode.id))}
                          className="group flex items-start gap-4 p-4 rounded-[14px] transition-all duration-300 cursor-pointer border mb-2"
                          style={{ borderColor: 'transparent', background: 'transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'none'; }}
                        >
                          <div className="flex h-[72px] w-6 md:w-8 shrink-0 items-center justify-center text-xl md:text-2xl font-light text-zinc-500 transition-colors group-hover:text-[var(--aw-accent)]" style={{ fontFamily: 'var(--aw-font-display)' }}>
                            {episode.number || '-'}
                          </div>
                          <div className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-md ring-white/5" style={{ background: 'var(--aw-card)' }}>
                            <img src={episode.image || data?.coverImage?.large || 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'} alt={`Episode ${episode.number}`} className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:opacity-1" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/128x72/181818/3f3f46?text=No+Image'; }} />
                            {episode.filler && (
                              <div className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Filler</div>
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
                      <div className="aw-label">No Provider</div>
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
            <div className="flex items-center justify-between mb-5">
              <div className="aw-label flex items-center gap-1.5"><Info size={14} style={{ color: 'var(--aw-accent)' }} /> Statistics</div>
              {statsUrl && <a href={statsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 group" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--aw-accent)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}>Full stats<ExternalLink size={9} className="opacity-60 group-hover:opacity-100 transition-opacity" /></a>}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><TrendingUp size={12} style={{ color: 'var(--aw-accent)' }} /> Popular</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>#{data.popularity ?? '?'}</span>
              </div>
              <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Users size={12} style={{ color: 'var(--aw-accent)' }} /> Format</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.format || '?'}</span>
              </div>
              <div className="col-span-2 p-4 rounded-[16px] shadow-lg flex flex-col gap-1 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
                <span className="text-[10px] font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}><Heart size={12} style={{ color: 'var(--aw-accent)' }} /> Favourites</span>
                <span className="text-xl font-bold text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>{formatNumber(data.favourites)}</span>
              </div>
            </div>

            <div className="p-4 rounded-[16px] shadow-lg flex flex-col gap-4 transition-colors duration-300" style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}>
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

              {data.title?.native && (
                <div className="flex items-start gap-3">
                  <Languages size={14} style={{ color: 'var(--aw-accent)' }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>Alternative Title</span>
                    <span className="block text-xs font-bold text-gray-200 mt-1" style={{ fontFamily: 'var(--aw-font-body)' }}>{data.title.native}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex gap-2 pt-3" style={{ borderTop: '1px solid var(--aw-border)' }}>
                {data?.id && (
                  <a href={`https://anilist.co/anime/${data.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    AniList<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
                {data?.idMal && (
                  <a href={`https://myanimelist.net/anime/${data.idMal}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-colors group" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--aw-card)'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                    MAL<ExternalLink size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;
