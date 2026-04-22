/* ─── Dependencies ──────────────────────────────────────────────── */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import CommentSection from '../components/shared/CommentSection';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft, ChevronsRight, Loader2, AlertCircle, FastForward,
  Server, MonitorPlay, Building, ArrowDownUp
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';

import {
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
import { MediaPlayer, MediaProvider, Track, type MediaPlayerInstance } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
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

  .aw-main {
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    position: relative;
    z-index: 50;
  }

  .aw-sidebar {
    width: 100%;
    max-width: none;
    display: flex;
    flex-direction: column;
    background: var(--aw-s1);
    border: 1px solid var(--aw-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 24px 60px -20px rgba(0,0,0,0.6);
  }

  @media (min-width: 1180px) {
    .aw-layout {
      grid-template-columns: minmax(0, 1fr) 400px;
      align-items: start;
    }

    .aw-sidebar {
      position: sticky;
      top: 96px;
      height: calc(100vh - 120px);
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

  /* Episode item hover */
  .ep-item { transition: background 0.18s, border-color 0.18s; }
  .ep-item:hover .ep-thumb { transform: scale(1.05); }
  .ep-thumb { transition: transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94); }

  /* Server button */
  .srv-btn { transition: all 0.2s cubic-bezier(0.25,0.46,0.45,0.94); }
  .srv-btn:hover { transform: translateY(-1px); }
  .srv-btn:active { transform: translateY(0px); }

  .aw-action-btn {
    transition: background 0.2s, border-color 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s;
  }
  .aw-action-btn:hover:not(:disabled) {
    background: var(--aw-s2) !important;
    border-color: var(--aw-accent-dim) !important;
    color: var(--aw-accent) !important;
    transform: translateY(-1px);
    box-shadow: 0 12px 24px -20px var(--aw-accent-glow);
  }
  .aw-action-btn:active:not(:disabled) { transform: translateY(0); }

  .aw-segment-btn {
    transition: background 0.2s, color 0.2s, transform 0.2s, box-shadow 0.2s, filter 0.2s;
  }
  .aw-segment-btn:hover:not(:disabled) { transform: translateY(-1px); }
  .aw-segment-btn[data-active='false']:hover {
    background: rgba(255,255,255,0.08) !important;
    color: var(--aw-text) !important;
  }
  .aw-segment-btn[data-active='true']:hover {
    background: var(--aw-s2) !important;
    color: var(--aw-accent) !important;
    box-shadow: 0 8px 22px -18px var(--aw-accent-glow);
    filter: brightness(1.08);
  }

  .skip-btn {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .skip-btn:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: scale(1.05) translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1) !important;
  }

  .aw-toggle { cursor: pointer; }
  .aw-toggle-track,
  .aw-toggle-label {
    transition: all 0.2s cubic-bezier(0.25,0.46,0.45,0.94);
  }
  .aw-toggle:hover .aw-toggle-track[data-checked='false'] {
    background: rgba(255,255,255,0.06) !important;
    border-color: var(--aw-accent-dim) !important;
  }
  .aw-toggle:hover .aw-toggle-track[data-checked='true'] {
    filter: brightness(1.08);
    box-shadow: 0 0 16px -8px var(--aw-accent-glow);
  }
  .aw-toggle:hover .aw-toggle-label {
    color: var(--aw-text) !important;
  }

  /* Glow pulse for recommended server */
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 0 0 var(--aw-accent-glow); }
    50% { box-shadow: 0 0 16px 2px var(--aw-accent-glow); }
  }

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

const token = localStorage.getItem('anilist_access_token');


const generateTabLabel = (title: string, baseTitle: string, index: number) => {
  if (!title) return `Season ${index + 1}`;
  let label = title.replace(new RegExp(`^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s:\\-]*`, 'i'), '').trim();
  if (!label) return index === 0 ? 'Season 1' : `Entry ${index + 1}`;
  if (/^(\d+(st|nd|rd|th)\s+season)$/i.test(label)) return `Season ${label.match(/^(\d+)/)?.[1]}`;
  if (/^(season\s*\d+)$/i.test(label)) return label;
  if (/^\d+$/.test(label)) return `Season ${label}`;
  if (/^(part|cour)\s*\d+$/i.test(label)) return `Part ${label.match(/\d+/)?.[0]}`;
  return label.length > 30 ? label.substring(0, 27) + '...' : label;
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
      <div
        className="aw-toggle-knob"
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 16 : 2,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: checked ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
      />
    </div>
    <span
      className="aw-toggle-label"
      style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        fontWeight: 600,
        textTransform: 'uppercase',
        color: checked ? 'var(--aw-text)' : 'var(--aw-muted)',
        transition: 'color 0.2s',
      }}
    >
      {label}
    </span>
  </label>
);

/* ─── Main Component ──────────────────────────────────────────────── */
const AnimeWatch: React.FC = () => {
  const { user } = useAuth();
  const { animeId: urlSlug, provider, category, episodeId } = useParams<{
    animeId: string;
    provider?: string;
    category?: 'sub' | 'dub';
    episodeId?: string;
  }>();

  const navigate = useNavigate();
  const activeEpRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<MediaPlayerInstance>(null);

  const [searchQueryTop, setSearchQueryTop] = useState('');
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [episodesData, setEpisodesData] = useState<Record<string, AnimeWatchProviderPayload>>({});
  const [resolvedId, setResolvedId] = useState<number | string | null>(null);
  const [animeInfo, setAnimeInfo] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);

  const [streamLoading, setStreamLoading] = useState(false);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [epSearchQuery, setEpSearchQuery] = useState('');
  const [episodeSortOrder, setEpisodeSortOrder] = useState<'asc' | 'desc'>('asc');

  const [autoPlay, setAutoPlay] = useState(() => localStorage.getItem('watchAutoPlay') !== 'false');
  const [autoSkip, setAutoSkip] = useState(() => localStorage.getItem('watchAutoSkip') !== 'false');
  const [lightsOff, setLightsOff] = useState(false);

  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => { localStorage.setItem('watchAutoPlay', String(autoPlay)); }, [autoPlay]);
  useEffect(() => { localStorage.setItem('watchAutoSkip', String(autoSkip)); }, [autoSkip]);

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

        if (error) {
          if (error.code !== 'PGRST116') console.warn('Failed to fetch remote progress:', error);
          return;
        }

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

  const titleScore = (title: string, query: string) => {
    const t = title.toLowerCase();
    const q = query.toLowerCase();

    if (t === q) return 100;
    if (t.startsWith(q)) return 90;
    if (t.includes(q)) return 70;

    const tWords = t.split(' ');
    const qWords = q.split(' ');

    let matches = 0;
    qWords.forEach(w => {
      if (tWords.includes(w)) matches++;
    });

    return (matches / qWords.length) * 50;
  };

  // Fetch Timeline (Seasons)
  // Fetch Timeline (Seasons)
  useEffect(() => {
    // Wait for fetchEpisodes to find the exact ID instead of using the dirty urlSlug
    if (!resolvedId) return;

    const fetchTimeline = async () => {
      try {
        const isNumeric = /^\d+$/.test(String(resolvedId));
        // Fallback to a heavily cleaned slug if for some reason we don't have an ID
        const cleanSearch = String(resolvedId).replace(/-/g, ' ').replace(/season\s?\d+/gi, '').trim();

        const variables = isNumeric ? { id: parseInt(String(resolvedId), 10) } : { search: cleanSearch };

        // Added 'startDate' to query for chronological sorting, and fallback meta fields
        const query = `
          query SearchAnime($search: String, $id: Int) {
            Media(search: $search, id: $id, type: ANIME) {
              id format description genres
              startDate { year month day }
              coverImage { large }
              title { romaji english userPreferred }
              relations { edges { relationType node { id type format startDate { year month day } title { userPreferred english romaji } relations { edges { relationType node { id type format startDate { year month day } title { userPreferred english romaji } relations { edges { relationType node { id type format startDate { year month day } title { userPreferred english romaji } relations { edges { relationType node { id type format startDate { year month day } title { userPreferred english romaji } } } } } } } } } } } }
            }
          }
        `;

        const isValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 10;
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(isValidToken ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ query, variables })
        });

        const payload = await res.json();
        const media = payload?.data?.Media;
        if (!media) return;

        // Failsafe: if navigated directly via ID, animeInfo might be null. 
        // This populates the Hero info card natively.
        setAnimeInfo((prev: any) => prev || media);

        // Expanded allowed relations to capture Alternative arcs & Parent series
        const allowedRelations = ['SEQUEL', 'PREQUEL', 'ALTERNATIVE', 'PARENT', 'SIDE_STORY'];
        const excludedFormats = ['SPECIAL', 'MUSIC', 'TV_SHORT'];

        const extractedRelations = new Map();

        // Helper to convert date to an integer for perfect chronological sorting
        const getSortDate = (dateObj: any) => {
          if (!dateObj || !dateObj.year) return 99999999;
          return (dateObj.year * 10000) + ((dateObj.month || 1) * 100) + (dateObj.day || 1);
        };

        const extractRelations = (edges: any[]) => {
          if (!Array.isArray(edges)) return;
          for (const edge of edges) {
            const node = edge?.node;
            if (!node || node.type !== 'ANIME') continue;
            if (!allowedRelations.includes(edge.relationType)) continue;

            if (!extractedRelations.has(node.id)) {
              const t = node.title;
              const displayTitle = t.english || t.romaji || t.userPreferred || '?';

              extractedRelations.set(node.id, {
                id: node.id,
                title: displayTitle,
                slug: createSlug(displayTitle),
                format: node.format,
                relationType: edge.relationType,
                sortDate: getSortDate(node.startDate), // Sort date reference
                _isHidden: excludedFormats.includes(node.format)
              });

              extractRelations(node.relations?.edges);
            }
          }
        };

        extractRelations(media.relations?.edges);

        const mappedRelations = Array.from(extractedRelations.values())
          .filter((r: any) => !r._isHidden)
          .map(({ _isHidden, ...rest }) => rest);

        const currentTitle = media.title?.english || media.title?.romaji || media.title?.userPreferred || '?';
        const base = getBaseTitle(currentTitle);

        const allTabs = [
          {
            id: media.id,
            title: currentTitle,
            slug: createSlug(currentTitle),
            format: media.format,
            active: true,
            sortDate: getSortDate(media.startDate)
          },
          ...mappedRelations.map((r: any) => ({ ...r, active: false }))
        ].sort((a, b) => a.sortDate - b.sortDate); // Chronological sorting instead of ID sorting

        // Remove any edge-case duplicates mapping to the same ID
        const uniqueTabs = allTabs.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

        const finalizedTabs = uniqueTabs.map((tab, index) => ({
          ...tab,
          displayLabel: generateTabLabel(tab.title, base, index)
        }));

        setSeasons(finalizedTabs);
      } catch (err) {
        console.error("Timeline fetch error:", err);
      }
    };

    fetchTimeline();
  }, [resolvedId]); // Cleanly trigger ONLY when the accurate ID is resolved

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
            const normalizedQuery = searchQuery
              .toLowerCase()
              .replace(/season\s?\d+/g, '')
              .replace(/[^a-z0-9 ]/g, '')
              .trim();

            const baseTitle = normalizedQuery
              .replace(/season\s?\d+/g, "")
              .trim();

            const queryWords = baseTitle.split(" ").filter(Boolean);

            const candidates = searchResults
              .map((r: any) => {
                const rawTitle = r.title?.english || r.title?.romaji || r.title || "";
                const title = rawTitle.toLowerCase().replace(/[^a-z0-9 ]/g, "");
                const titleWords = title.split(" ").filter(Boolean);
                const matches = queryWords.filter(w => titleWords.includes(w)).length;

                return {
                  ...r,
                  normalizedTitle: title,
                  matches,
                  score: titleScore(title, baseTitle)
                };
              })
              .filter((r: any) => {
                const format = (r.format || r.type || "").toLowerCase();
                const status = (r.status || "").toLowerCase();

                if (status === "not_yet_released") return false;
                if (format.includes("movie")) return false;

                // CRITICAL: require ALL query words
                return r.matches === queryWords.length;
              })
              .sort((a: any, b: any) => b.score - a.score);

            const bestMatch = candidates.length ? candidates[0] : null;

            if (!bestMatch) {
              console.warn("No valid anime match found for:", baseTitle);
              return; // STOP instead of using random anime
            }

            actualAnimeId = bestMatch.id;
            setAnimeInfo(bestMatch);
            episodesPayload = await fetchAnimeEpisodes(actualAnimeId);

            if (!episodesPayload) {
              console.warn("No valid episode match found for:", baseTitle);
              return; // STOP instead of using random episode
            }
          }
        } else {
          episodesPayload = await fetchAnimeEpisodes(actualAnimeId);
        }

        if (episodesPayload) {
          setEpisodesData(episodesPayload.providers || {});
          setResolvedId(actualAnimeId);
        } else {
          setEpisodesData({});
          setResolvedId(null);
        }

        setLoadingEpisodes(false);

      } catch (err) {
        console.error(err);
        setLoadingEpisodes(false);
      }
    };

    if (urlSlug) {
      fetchEpisodes();
    }
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

  const [selectedStreamIndex, setSelectedStreamIndex] = useState<number>(0);

  useEffect(() => {
    if (streamData?.streams) {
      const bestIndex = streamData.streams.findIndex(s => s.type === 'hls' && s.url && (s.quality === 'auto' || s.quality === '1080p'));
      if (bestIndex !== -1) {
        setSelectedStreamIndex(bestIndex);
      } else {
        const firstHls = streamData.streams.findIndex(s => s.type === 'hls' && s.url);
        if (firstHls !== -1) {
          setSelectedStreamIndex(firstHls);
        } else {
          const firstEmbed = streamData.streams.findIndex(s => s.type === 'embed' && s.url);
          setSelectedStreamIndex(firstEmbed !== -1 ? firstEmbed : 0);
        }
      }
    }
  }, [streamData]);

  const activeStream = useMemo<any>(() => {
    if (!streamData?.streams) return null;
    const stream = streamData.streams[selectedStreamIndex] || streamData.streams[0];
    if (!stream) return null;
    return { ...stream, type: 'hls' };
  }, [streamData, selectedStreamIndex]);

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

  const forceSaveProgress = useCallback(async (explicitPayload?: any) => {
    const payload = explicitPayload?.episodeId ? explicitPayload : progressDataRef.current;
    if (!payload?.episodeId) return;

    let currentTime = videoStateRef.current.currentTime || 0;
    let duration = videoStateRef.current.duration || 0;

    // Pull directly from the DOM node if it exists to get the absolute latest unmount time
    if (playerRef.current) {
      const vTime = playerRef.current.state.currentTime;
      const vDur = playerRef.current.state.duration;
      if (Number.isFinite(vTime) && vTime > 0) currentTime = vTime;
      if (Number.isFinite(vDur) && vDur > 0) duration = vDur;
    }

    const safeDuration = (Number.isFinite(duration) && duration > 0) ? duration : 0;
    const safeTime = (Number.isFinite(currentTime) && currentTime > 0) ? currentTime : 0;

    // PREVENTS THE 0m / ? BUG: If the user opens and leaves before watching 3 seconds, do not overwrite!
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

    // Build timeline blocks (Vidstack connects them)
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

  // Clean up WebVTT chapter blob to prevent memory leaks
  useEffect(() => {
    return () => {
      if (chapterTrackUrl) URL.revokeObjectURL(chapterTrackUrl);
    };
  }, [chapterTrackUrl]);

  // Generate HLS Url for Vidstack using external CORS proxy
  const finalStreamUrl = useMemo(() => {
    if (!activeStream) return null;

    const isM3U8 = activeStream.url.includes('.m3u8');

    if (activeStream.referer && isM3U8) {
      const b64e = (str: string) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      // In dev, falls back to local Vite proxy. In production, use your Render.com proxy URL.
      const PROXY_BASE = import.meta.env.VITE_HLS_PROXY_URL || '/api/hls-proxy';

      let proxied = `${PROXY_BASE}/proxy?q=${b64e(activeStream.url)}`;
      if (activeStream.referer) {
        proxied += '&r=' + b64e(activeStream.referer);
      }
      return proxied;
    }

    return activeStream.url;
  }, [activeStream]);

  // Interval saving payload update tracking on stream swap
  useEffect(() => {
    const currentPayload = { ...progressDataRef.current };
    return () => {
      forceSaveProgress(currentPayload);
    };
  }, [activeStream, forceSaveProgress]);

  // Interval saving
  const handleTimeUpdate = useCallback((e: any) => {
    const time = e?.currentTime ?? e?.currentTarget?.currentTime ?? 0;
    const duration = e?.duration ?? e?.currentTarget?.duration ?? 0;

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
      if (autoSkip) { if (playerRef.current) playerRef.current.currentTime = streamData.intro.end; showToast('Intro Skipped'); }
      else if (!showSkipIntro) setShowSkipIntro(true);
    } else if (showSkipIntro) setShowSkipIntro(false);

    if (streamData?.outro && time >= streamData.outro.start && time <= streamData.outro.end) {
      if (autoSkip) { if (playerRef.current) playerRef.current.currentTime = streamData.outro.end; showToast('Outro Skipped'); }
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

  const skipTo = (t: number) => { if (playerRef.current) playerRef.current.currentTime = t; };

  /* ─── Render ──────────────────────────────────────────────────────── */
  return (
    <div
      className="aw-root aw-noise min-h-screen flex flex-col relative"
      style={{ background: 'var(--aw-bg)' }}
    >

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
      <div className="aw-layout">
        {/* ── Left: Main Content ── */}
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

            {/* Skip Outro */}
            {showSkipOutro && streamData?.outro && !autoSkip && (
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
                  <MediaPlayer
                    ref={playerRef}
                    title={displayTitle}
                    src={{ src: finalStreamUrl || activeStream.url, type: 'application/vnd.apple.mpegurl' }}
                    crossOrigin
                    autoPlay={autoPlay}
                    onTimeUpdate={(e: any) => {
                      const time = typeof e === 'number' ? e : e?.currentTime || e?.detail || 0;
                      const duration = playerRef.current?.state?.duration || videoStateRef.current.duration || 0;
                      handleTimeUpdate({ currentTime: time, duration });
                    }}
                    onEnded={handleVideoEnd}
                    onCanPlay={() => {
                      const epId = progressDataRef.current?.episodeId || episodeId;
                      if (!epId) return;
                      const savedTimeRaw = localStorage.getItem(`progress-${epId}`);
                      if (savedTimeRaw && playerRef.current) {
                        const parsedTime = parseFloat(savedTimeRaw);
                        if (parsedTime > 3 && playerRef.current.currentTime < 3) {
                          playerRef.current.currentTime = parsedTime;
                          showToast(`Resumed from ${Math.floor(parsedTime / 60)}m`);
                        }
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', outline: 'none' }}
                  >
                    <MediaProvider>
                      {chapterTrackUrl && (
                        <Track
                          src={chapterTrackUrl}
                          kind="chapters"
                          label="Chapters"
                          language="en"
                          default
                        />
                      )}
                      {streamData?.subtitles?.map((sub, i) => (
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
              <Toggle checked={autoSkip} onChange={setAutoSkip} label="Auto Skip" />
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
                    className="aw-segment-btn"
                    data-active={currentCategory === cat}
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
                        padding: '7px 16px',
                        borderRadius: 8,
                        border: isActive
                          ? '1px solid rgba(255,255,255,0.9)'
                          : '1px solid rgba(255,255,255,0.07)',
                        background: isActive
                          ? 'rgba(255,255,255,0.92)'
                          : 'rgba(255,255,255,0.03)',
                        color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
                        fontSize: 11,
                        fontFamily: 'var(--aw-font-display)',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        boxShadow: isActive
                          ? '0 0 0 1px rgba(255,255,255,0.15), 0 4px 20px rgba(255,255,255,0.08)'
                          : 'none',
                        display: 'flex', alignItems: 'center', gap: 7,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Active dot */}
                      {isActive && (
                        <span style={{
                          width: 5, height: 5,
                          borderRadius: '50%',
                          background: '#000',
                          flexShrink: 0,
                          opacity: 0.5,
                        }} />
                      )}

                      {p}

                      {/* Recommended tag */}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Players Selection */}
            {streamData && streamData.streams && streamData.streams.length > 0 && (
              <>
                <div style={{
                  height: 1,
                  background: 'rgba(255,255,255,0.04)',
                  margin: '22px 0',
                }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>

                  {/* INTERNAL PLAYERS */}
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {streamData.streams.map((s, idx) => {
                          if (s.type !== 'hls' || !s.url) return null;
                          const isActive = selectedStreamIndex === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedStreamIndex(idx)}
                              className="srv-btn"
                              style={{
                                padding: '7px 14px',
                                borderRadius: 8,
                                border: isActive
                                  ? '1px solid var(--aw-accent)'
                                  : '1px solid rgba(255,255,255,0.07)',
                                background: isActive
                                  ? 'var(--aw-accent-dim)'
                                  : 'rgba(255,255,255,0.03)',
                                color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.4)',
                                fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                                boxShadow: isActive ? '0 4px 20px -8px var(--aw-accent-glow)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 7,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {s.quality || 'Auto'}
                              <span style={{
                                fontSize: 8,
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                color: isActive ? 'var(--aw-accent)' : '#10b981',
                                opacity: isActive ? 1 : 0.7,
                              }}>
                                HLS
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* EXTERNAL PLAYERS */}
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
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {streamData.streams.map((s, idx) => {
                          if (s.type !== 'embed' || !s.url) return null;
                          const isActive = selectedStreamIndex === idx;
                          return (
                            <button
                              key={idx}
                              onClick={() => setSelectedStreamIndex(idx)}
                              className="srv-btn"
                              style={{
                                padding: '7px 14px',
                                borderRadius: 8,
                                border: isActive
                                  ? '1px solid var(--aw-accent)'
                                  : '1px solid rgba(255,255,255,0.07)',
                                background: isActive
                                  ? 'var(--aw-accent-dim)'
                                  : 'rgba(255,255,255,0.03)',
                                color: isActive ? 'var(--aw-accent)' : 'rgba(255,255,255,0.4)',
                                fontSize: 11, fontFamily: 'var(--aw-font-display)', fontWeight: 700,
                                letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                                boxShadow: isActive ? '0 4px 20px -8px var(--aw-accent-glow)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 7,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {s.quality || 'Auto'}
                              <span style={{
                                fontSize: 8,
                                fontWeight: 800,
                                letterSpacing: '0.1em',
                                color: isActive ? 'var(--aw-accent)' : '#3b82f6',
                                opacity: isActive ? 1 : 0.7,
                              }}>
                                EMBED
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>

          {/* Seasons (Timeline) */}
          {seasons.length > 1 && (
            <div style={{
              padding: '24px 28px',
              background: 'var(--aw-s1)',
              borderRadius: 16,
              border: '1px solid var(--aw-border)',
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
                <Building size={11} style={{ opacity: 0.7 }} /> Timeline
              </p>
              <div className="aw-scroll" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                {seasons.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!s.active) {
                        setLoadingEpisodes(true);
                        // CHANGED: Navigate directly via the AniList ID for pinpoint accuracy
                        navigate(`/watch/${s.id}`);
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: s.active ? '1px solid var(--aw-accent)' : '1px solid var(--aw-border)',
                      background: s.active ? 'var(--aw-accent-dim)' : 'var(--aw-card)',
                      color: s.active ? 'var(--aw-accent)' : 'var(--aw-text)',
                      fontFamily: 'var(--aw-font-display)',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      cursor: s.active ? 'default' : 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {s.displayLabel}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div style={{ padding: '0 20px 20px' }}>
            <CommentSection pageType="watch" pageId={`${urlSlug}-${episodeId}`} />
          </div>
        </main>

        {/* ── Right: Episode Sidebar ── */}
        <aside className="aw-sidebar" style={{ zIndex: 40 }}>
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
            {/* Search and Sort */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
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
                  background: 'var(--aw-bg)',
                  border: '1px solid var(--aw-border)',
                  borderRadius: 8,
                  color: 'var(--aw-muted)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--aw-s2)';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = 'var(--aw-accent-dim)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--aw-bg)';
                  e.currentTarget.style.color = 'var(--aw-muted)';
                  e.currentTarget.style.borderColor = 'var(--aw-border)';
                }}
              >
                {episodeSortOrder === 'desc' ? <ArrowDownUp size={14} /> : <ArrowDownUp size={14} style={{ transform: 'rotate(180deg)' }} />}
              </button>
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
