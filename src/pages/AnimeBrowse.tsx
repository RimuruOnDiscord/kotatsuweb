import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Calendar, ChevronLeft, ChevronRight, Clock, LayoutGrid, Library, List, Monitor, Play, Star } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BrowseTopbar from '../components/BrowseTopbar';
import DesktopBrowseFilters from '../components/desktop/DesktopBrowseFilters';
import MobileBrowseFilters from '../components/mobile/MobileBrowseFilters';
import {
  AnimeResult,
  fetchAnimeFilter,
  fetchAnimeSearch,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeStatusLabel,
  getAnimeTypeLabel,
} from '../utils/animeApi';

type FilterOption = { value: string; label: string; disabled?: boolean };

const ITEMS_PER_PAGE = 24;

const FORMAT_OPTIONS: FilterOption[] = [
  { value: '', label: 'Format' },
  { value: 'TV', label: 'TV' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'MUSIC', label: 'Music' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Status' },
  { value: 'RELEASING', label: 'Releasing' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'HIATUS', label: 'Hiatus' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
];

const SEASON_OPTIONS: FilterOption[] = [
  { value: '', label: 'Season' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
];

const EPISODE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Episodes' },
  { value: 'short', label: '1 - 12 Episodes' },
  { value: 'medium', label: '13 - 24 Episodes' },
  { value: 'long', label: '25+ Episodes' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: '', label: 'Sort' },
  { value: 'POPULARITY_DESC', label: 'Popular' },
  { value: 'START_DATE_DESC', label: 'Newest First' },
  { value: 'START_DATE', label: 'Oldest First' },
];

const GENRE_OPTIONS = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
].map((genre) => ({
  value: genre.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label: genre,
  queryValue: genre,
}));

const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }

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
  }
  /* Info section label */
  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* Pagination Buttons */
  .aw-pagination-btn {
    display: inline-flex;
    height: 44px;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    border: 1px solid var(--aw-border);
    background: color-mix(in_srgb, var(--aw-accent), transparent 97%);
    color: var(--aw-muted);
    font-family: var(--aw-font-display);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .aw-pagination-btn:hover:not(:disabled) {
    background: color-mix(in_srgb, var(--aw-accent), transparent 90%);
    border-color: var(--aw-accent-dim);
    color: white;
    transform: translateY(-1px);
  }
  .aw-pagination-btn.active {
    background: var(--aw-accent);
    border-color: var(--aw-accent);
    color: #04110d;
    box-shadow: 0 8px 20px -6px var(--aw-accent-glow);
  }
  .aw-pagination-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Skeleton Shimmer */
  .aw-skeleton-card {
    background: color-mix(in_srgb, var(--aw-accent), transparent 97%);
    border: 1px solid var(--aw-border);
    border-radius: 20px;
    overflow: hidden;
  }
  .aw-skeleton-shimmer {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0) 0%,
      color-mix(in_srgb, var(--aw-accent), transparent 95%) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    background-size: 200% 100%;
    animation: aw-shimmer 2s infinite linear;
  }
  @keyframes aw-shimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }
`;

// Helper function to turn "Shingeki no Kyojin" into "shingeki-no-kyojin"
const generateSlug = (titleObj: any) => {
  const displayTitle = getAnimeDisplayTitle(titleObj) || '';
  return displayTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// ==== FRANCHISE GROUPING LOGIC ====
const getBaseFranchiseTitle = (title: string) => {
  if (!title) return '';
  let t = title.toLowerCase();

  // Remove specific sequel keywords
  t = t.replace(/\s+(season|part|cour|chapter|act)\s*\d+.*$/i, '');
  t = t.replace(/\s+\d+(st|nd|rd|th)\s+(season|part).*$/i, '');

  // Remove roman numerals at the end
  t = t.replace(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/i, '');

  // Remove trailing digits
  t = t.replace(/\s+\d+$/, '');

  // Normalize by stripping non-alphanumeric
  return t.replace(/[^a-z0-9]+/g, ' ').trim();
};

const isSameFranchise = (title1: string, title2: string) => {
  const t1 = title1.toLowerCase();
  const t2 = title2.toLowerCase();

  const b1 = getBaseFranchiseTitle(t1);
  const b2 = getBaseFranchiseTitle(t2);

  // Check 1: Identical base title after stripping season formats
  if (b1 === b2 && b1.length > 0) return true;

  // Check 2: Extensions/Spin-offs where one completely starts with the other
  if (b1.length > 4 && b2.length > 4) {
    if (t1.startsWith(t2 + ':') || t1.startsWith(t2 + ' -') || t1.startsWith(t2 + ' ')) return true;
    if (t2.startsWith(t1 + ':') || t2.startsWith(t1 + ' -') || t2.startsWith(t1 + ' ')) return true;
  }

  // Check 3: Siblings sharing the exact same primary title prefix before a colon
  if (t1.includes(':') && t2.includes(':')) {
    const prefix1 = t1.split(':')[0].trim();
    const prefix2 = t2.split(':')[0].trim();
    if (prefix1 === prefix2 && prefix1.length > 3) return true;
  }

  return false;
};
// ==================================

const resolvePageParam = (value: string | null) => {
  const parsed = Number(value || '1');
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
};

const parseMultiValueParam = (value: string | null) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const getVisiblePages = (currentPage: number, lastPage: number) => {
  if (lastPage <= 3) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  // Sliding window of 3
  if (currentPage <= 1) return [1, 2, 3];
  if (currentPage >= lastPage) return [lastPage - 2, lastPage - 1, lastPage];

  return [currentPage - 1, currentPage, currentPage + 1];
};

const matchesEpisodeFilter = (anime: AnimeResult, filter: string) => {
  if (!filter) return true;
  const episodes = anime.episodes || 0;
  if (filter === 'short') return episodes > 0 && episodes <= 12;
  if (filter === 'medium') return episodes >= 13 && episodes <= 24;
  if (filter === 'long') return episodes >= 25 || anime.episodes == null;
  return true;
};

const AnimeListCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => {
  const coverUrl = getAnimeCover(anime);

  return (
    <div
      onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
      className="group relative flex h-[180px] gap-5 overflow-hidden rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] p-3 transition-all duration-500 cursor-pointer hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] hover:border-white/10 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
    >
      {/* Poster Container */}
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.02]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={getAnimeDisplayTitle(anime.title)}
            className="h-full w-full object-cover transition-transform duration-700"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            No Cover
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300">

        </div>
      </div>

      {/* Content */}
      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--aw-accent)] border border-white/5 backdrop-blur-sm shadow-sm"
                style={{ fontFamily: 'var(--aw-font-display)' }}
              >
                {getAnimeTypeLabel(anime)}
              </span>
              {anime.score && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400/90">
                  <Star size={10} fill="currentColor" />
                  {(anime.score / 10).toFixed(1)}
                </span>
              )}
            </div>
            <h3
              className="truncate text-xl font-bold leading-tight text-white/95 group-hover:text-white transition-colors"
              style={{ fontFamily: 'var(--aw-font-display)' }}
            >
              {getAnimeDisplayTitle(anime.title)}
            </h3>
            <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
              <span>{anime.seasonYear || anime.startDate?.year || 'TBA'}</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="truncate">{anime.studios?.nodes?.find((s) => s.isAnimationStudio)?.name || 'Studio Unknown'}</span>
            </p>
          </div>
        </div>

        {/* Info Block Refreshed */}
        <div className="mt-auto flex items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 border border-white/5 backdrop-blur-md">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>Status</span>
            <span className="truncate text-[13px] font-bold text-[var(--aw-accent)] capitalize" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}
            </span>
          </div>

          <div className="h-6 w-[1px] shrink-0 bg-white/10" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>Season</span>
            <span className="truncate text-[13px] font-bold text-white/90 capitalize" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {anime.season ? anime.season.toLowerCase() : 'TBA'}
            </span>
          </div>

          <div className="h-6 w-[1px] shrink-0 bg-white/10" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</span>
            <span className="truncate text-[13px] font-bold text-white/90" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {anime.episodes || '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimeGridCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => {
  const coverUrl = getAnimeCover(anime);

  return (
    <div
      onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] transition-all duration-500 hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] hover:border-white/10 hover:-translate-y-2 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]"
    >
      {/* Visual Header */}
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={getAnimeDisplayTitle(anime.title)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-white/[0.02] text-zinc-600 text-xs font-bold uppercase">No Cover</div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--aw-accent)] text-[#04110d] shadow-lg scale-75 transition-transform duration-300 group-hover:scale-100">
            <Play size={22} fill="currentColor" strokeWidth={0} />
          </div>
        </div>

        {/* Rating Badge */}
        {anime.score && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-md border border-white/10">
            <Star size={12} className="text-amber-400 fill-amber-400" />
            <span className="text-[11px] font-bold text-white">{(anime.score / 10).toFixed(1)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col p-4">
        <div className="flex flex-col gap-1.5">
          <h3
            className="truncate text-[15px] font-bold leading-tight text-white/95 transition-colors group-hover:text-white"
            style={{ fontFamily: 'var(--aw-font-display)' }}
          >
            {getAnimeDisplayTitle(anime.title)}
          </h3>

          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className="whitespace-nowrap rounded-md bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--aw-accent)] border border-white/5 backdrop-blur-sm"
              style={{ fontFamily: 'var(--aw-font-display)' }}
            >
              {getAnimeTypeLabel(anime)}
            </span>
            <span className="truncate text-[11px] font-medium text-zinc-500" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {anime.episodes ?? '--'} EP Available
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400" style={{ fontFamily: 'var(--aw-font-display)' }}>
            <Calendar size={12} />
            <span>{anime.startDate?.year || anime.seasonYear || 'TBA'}</span>
          </div>
          <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${anime.status === 'RELEASING'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
            : 'bg-[color-mix(in_srgb,var(--aw-accent),transparent_94%)] text-zinc-400 border-white/5'
            }`} style={{ fontFamily: 'var(--aw-font-display)' }}>
            {getAnimeStatusLabel(anime.status)}
          </div>
        </div>
      </div>
    </div>
  );
};


const AnimeBrowse: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => (localStorage.getItem('browseViewMode') as 'list' | 'grid') || 'list');
  const [topbarQuery, setTopbarQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('browseViewMode', viewMode);
  }, [viewMode]);

  const currentPage = resolvePageParam(searchParams.get('page'));
  const committedQuery = searchParams.get('q') || '';
  const committedFormat = searchParams.get('format') || '';
  const committedStatus = searchParams.get('status') || '';
  const committedSeason = searchParams.get('language') || '';
  const committedYear = searchParams.get('year') || '';
  const committedEpisodeLength = searchParams.get('length') || '';
  const committedSort = searchParams.get('release') || '';

  const rawGenres = searchParams.get('genres');
  const committedGenres = useMemo(() => parseMultiValueParam(rawGenres), [rawGenres]);

  const [searchQuery, setSearchQuery] = useState(committedQuery);
  const [formatFilter, setFormatFilter] = useState(committedFormat);
  const [genreFilter, setGenreFilter] = useState(committedGenres);
  const [statusFilter, setStatusFilter] = useState(committedStatus);
  const [seasonFilter, setSeasonFilter] = useState(committedSeason);
  const [yearFilter, setYearFilter] = useState(committedYear);
  const [episodeFilter, setEpisodeFilter] = useState(committedEpisodeLength);
  const [sortFilter, setSortFilter] = useState(committedSort);

  const [animeList, setAnimeList] = useState<AnimeResult[]>([]);
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, lastPage: 1, hasNextPage: false, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination Jump States
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [jumpToPageValue, setJumpToPageValue] = useState('');

  const yearOptions = useMemo<FilterOption[]>(
    () => [
      { value: '', label: 'Year' },
      ...Array.from({ length: 40 }, (_, index) => {
        const year = new Date().getFullYear() - index;
        return { value: String(year), label: String(year) };
      }),
    ], []
  );

  const visiblePages = useMemo(() => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage), [pageInfo.currentPage, pageInfo.lastPage]);

  // Inject Design Styles
  useEffect(() => {
    const id = 'aw-design-styles-anime';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  useEffect(() => {
    const id = 'browse-filter-control-style-anime';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      .browse-filter-control {
        background-color: var(--aw-s2) !important;
        color: #f4f4f5 !important;
        -webkit-text-fill-color: #f4f4f5 !important;
        appearance: none;
      }
      .browse-filter-control::placeholder {
        color: #6b7280 !important;
        opacity: 1;
      }
      .browse-filter-control:-webkit-autofill,
      .browse-filter-control:-webkit-autofill:hover,
      .browse-filter-control:-webkit-autofill:focus {
        -webkit-text-fill-color: #f4f4f5;
        -webkit-box-shadow: 0 0 0px 1000px var(--aw-s2) inset;
        box-shadow: 0 0 0px 1000px var(--aw-s2) inset;
        transition: background-color 9999s ease-in-out 0s;
        caret-color: #f4f4f5;
      }
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    setSearchQuery(committedQuery);
  }, [committedQuery]);

  const commitBrowseParams = useCallback(
    (overrides?: Partial<Record<'q' | 'format' | 'status' | 'language' | 'year' | 'length' | 'release', string> & { genres: string[] }> & { page?: number }) => {
      const nextParams = new URLSearchParams(searchParams);

      const nextValues = {
        q: (overrides?.q ?? searchQuery).trim(),
        format: overrides?.format ?? formatFilter,
        genres: overrides?.genres ?? genreFilter,
        status: overrides?.status ?? statusFilter,
        language: overrides?.language ?? seasonFilter,
        year: (overrides?.year ?? yearFilter).trim(),
        length: overrides?.length ?? episodeFilter,
        release: overrides?.release ?? sortFilter,
        page: overrides?.page ?? 1,
      };

      Object.entries(nextValues).forEach(([key, value]) => {
        if (key === 'genres') return;
        if (key === 'page') return;
        if (value) nextParams.set(key, String(value));
        else nextParams.delete(key);
      });

      if (nextValues.genres.length) nextParams.set('genres', nextValues.genres.join(','));
      else nextParams.delete('genres');

      if (nextValues.page > 1) nextParams.set('page', String(nextValues.page));
      else nextParams.delete('page');

      setSearchParams(nextParams);
    }, [episodeFilter, formatFilter, genreFilter, searchParams, searchQuery, seasonFilter, setSearchParams, sortFilter, statusFilter, yearFilter]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFormatFilter('');
    setGenreFilter([]);
    setStatusFilter('');
    setSeasonFilter('');
    setYearFilter('');
    setEpisodeFilter('');
    setSortFilter('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  useEffect(() => {
    if (searchQuery === committedQuery) return;
    const timeoutId = window.setTimeout(() => {
      commitBrowseParams({ q: searchQuery, page: 1 });
    }, 500);
    return () => window.clearTimeout(timeoutId);
  }, [commitBrowseParams, committedQuery, searchQuery]);

  // Robust Fetch Logic explicitly using AnimeApi
  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        let payload: any;
        const isSearch = committedQuery.trim().length > 0;

        if (isSearch) {
          payload = await fetchAnimeSearch(committedQuery.trim(), currentPage);
        } else {
          const params = new URLSearchParams({
            page: String(currentPage),
            per_page: String(ITEMS_PER_PAGE),
            sort: committedSort || 'POPULARITY_DESC',
          });

          // Always add isAdult=false filter to ensure SFW results if the API supports it
          params.set('isAdult', 'false');

          if (committedFormat) params.set('format', committedFormat);
          if (committedStatus) params.set('status', committedStatus);
          if (committedSeason) params.set('season', committedSeason);
          if (committedYear) params.set('year', committedYear);

          if (committedGenres.length > 0) {
            const firstGenreObj = GENRE_OPTIONS.find((option) => option.value === committedGenres[0]);
            if (firstGenreObj) {
              params.set('genre', firstGenreObj.queryValue);
            }
          }

          payload = await fetchAnimeFilter(params);
        }

        if (controller.signal.aborted) return;

        // Safely extract the results array no matter how the API wraps it
        const rawResults = payload?.results || payload?.data?.results || payload?.data || [];
        const hasNext = payload?.hasNextPage ?? payload?.data?.hasNextPage ?? false;
        const total = payload?.total ?? payload?.data?.total ?? rawResults.length;

        // Filter client-side for additional constraints
        const filteredResults = rawResults.filter((entry: AnimeResult) => {
          // Extra safety check if API returns adult field
          if ((entry as any).isAdult) return false;

          // Filter out unwanted genres explicitly just in case
          const nsfwGenres = ['Hentai', 'Ecchi'];
          if (entry.genres && entry.genres.some(g => nsfwGenres.includes(g))) return false;

          // If searching, the API ignores other filters, so we must enforce them here
          if (isSearch) {
            if (committedFormat && entry.format !== committedFormat) return false;
            if (committedStatus && entry.status !== committedStatus) return false;
            if (committedSeason && entry.season !== committedSeason) return false;
            if (committedYear && String(entry.seasonYear || entry.startDate?.year || '') !== committedYear) return false;
          }

          // Always enforce multi-genre matching since API only handles 1 genre
          if (committedGenres.length > (isSearch ? 0 : 1)) {
            const hasAllGenres = committedGenres.every((val) => {
              const queryVal = GENRE_OPTIONS.find((o) => o.value === val)?.queryValue;
              return queryVal && entry.genres?.includes(queryVal);
            });
            if (!hasAllGenres) return false;
          }

          // Enforce custom episode lengths
          if (!matchesEpisodeFilter(entry, committedEpisodeLength)) return false;

          return true;
        });

        // Deduplicate and heavily group franchises (Seasons/Parts)
        const uniqueResults = filteredResults.filter((v: AnimeResult, i: number, a: AnimeResult[]) => {
          // 1. Exact ID match (standard deduplication)
          const isFirstId = a.findIndex((t) => t.id === v.id) === i;
          if (!isFirstId) return false;

          // 2. Franchise grouping logic
          const titleV = getAnimeDisplayTitle(v.title) || '';

          const firstFranchiseIndex = a.findIndex((t) => {
            const titleT = getAnimeDisplayTitle(t.title) || '';
            return isSameFranchise(titleV, titleT);
          });

          return firstFranchiseIndex === i;
        });

        setAnimeList(uniqueResults.slice(0, ITEMS_PER_PAGE));
        setPageInfo({
          currentPage,
          lastPage: Math.max(1, hasNext ? currentPage + 1 : currentPage),
          hasNextPage: hasNext,
          total: total,
        });

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') return;
        console.error("Browse Fetch Error:", fetchError);
        setError(fetchError.message || 'Failed to load anime browse results.');
        setAnimeList([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, [
    committedEpisodeLength,
    committedFormat,
    committedGenres,
    committedQuery,
    committedSeason,
    committedSort,
    committedStatus,
    committedYear,
    currentPage
  ]);

  const hasActiveFilters = Boolean(committedQuery || committedFormat || committedGenres.length || committedStatus || committedSeason || committedYear || committedEpisodeLength || committedSort);

  const updateGenreFilter = useCallback((value: string) => {
    const nextValue = value === ''
      ? []
      : genreFilter.includes(value)
        ? genreFilter.filter((entry) => entry !== value)
        : [...genreFilter, value];
    setGenreFilter(nextValue);
    commitBrowseParams({ genres: nextValue, page: 1 });
  }, [commitBrowseParams, genreFilter]);

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent-muted)]">
      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
      </div>

      <main className="mx-auto w-full max-w-[1460px] space-y-8 px-4 py-10 md:px-8">
        <section className="flex flex-col gap-2">
          <p className="aw-label flex items-center gap-2">
            <Library size={12} />
            Digital Library
          </p>
          <div className="flex items-center justify-between">
            <h1 style={{
              fontFamily: 'var(--aw-font-display)',
              fontSize: 'clamp(32px, 5vw, 42px)',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--aw-text)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              margin: 0
            }}>
              DISCOVER
            </h1>
          </div>
        </section>

        <div className="flex w-full flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <DesktopBrowseFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..."
              fieldLabels={{ genre: 'Genre', status: 'Status', language: 'Season', year: 'Year', length: 'Episodes', release: 'Sort' }}
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              typeFilter={formatFilter}
              genreFilter={genreFilter}
              statusFilter={statusFilter}
              languageFilter={seasonFilter}
              yearFilter={yearFilter}
              lengthFilter={episodeFilter}
              releaseFilter={sortFilter}
              typeOptions={FORMAT_OPTIONS}
              genreOptions={GENRE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              languageOptions={SEASON_OPTIONS}
              yearOptions={yearOptions}
              lengthOptions={EPISODE_OPTIONS}
              releaseOptions={SORT_OPTIONS}
              updateTypeFilter={(value) => {
                setFormatFilter(value);
                commitBrowseParams({ format: value, page: 1 });
              }}
              updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(value) => {
                setStatusFilter(value);
                commitBrowseParams({ status: value, page: 1 });
              }}
              updateLanguageFilter={(value) => {
                setSeasonFilter(value);
                commitBrowseParams({ language: value, page: 1 });
              }}
              updateYearFilter={(value) => {
                setYearFilter(value);
                commitBrowseParams({ year: value, page: 1 });
              }}
              updateLengthFilter={(value) => {
                setEpisodeFilter(value);
                commitBrowseParams({ length: value, page: 1 });
              }}
              updateReleaseFilter={(value) => {
                setSortFilter(value);
                commitBrowseParams({ release: value, page: 1 });
              }}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />

            <MobileBrowseFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              searchPlaceholder="Search Anime..."
              fieldLabels={{ type: 'Format', genre: 'Genre', status: 'Status', language: 'Season', year: 'Year', length: 'Episodes', release: 'Sort' }}
              typeFilter={formatFilter}
              genreFilter={genreFilter}
              statusFilter={statusFilter}
              languageFilter={seasonFilter}
              yearFilter={yearFilter}
              lengthFilter={episodeFilter}
              releaseFilter={sortFilter}
              typeOptions={FORMAT_OPTIONS}
              genreOptions={GENRE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              languageOptions={SEASON_OPTIONS}
              yearOptions={yearOptions}
              lengthOptions={EPISODE_OPTIONS}
              releaseOptions={SORT_OPTIONS}
              updateTypeFilter={(value) => {
                setFormatFilter(value);
                commitBrowseParams({ format: value, page: 1 });
              }}
              updateGenreFilter={updateGenreFilter}
              updateStatusFilter={(value) => {
                setStatusFilter(value);
                commitBrowseParams({ status: value, page: 1 });
              }}
              updateLanguageFilter={(value) => {
                setSeasonFilter(value);
                commitBrowseParams({ language: value, page: 1 });
              }}
              updateYearFilter={(value) => {
                setYearFilter(value);
                commitBrowseParams({ year: value, page: 1 });
              }}
              updateLengthFilter={(value) => {
                setEpisodeFilter(value);
                commitBrowseParams({ length: value, page: 1 });
              }}
              updateReleaseFilter={(value) => {
                setSortFilter(value);
                commitBrowseParams({ release: value, page: 1 });
              }}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <div className="flex h-[42px] items-center gap-1 rounded-[12px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex aspect-square h-full items-center justify-center rounded-[8px] transition-all duration-500 ${viewMode === 'list'
                  ? 'bg-[var(--aw-accent)] text-[#04110d] shadow-[0_8px_20px_-6px_rgba(var(--app-accent-rgb),0.5)] scale-[1.03]'
                  : 'text-zinc-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
                title="List View"
              >
                <List size={18} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex aspect-square h-full items-center justify-center rounded-[8px] transition-all duration-500 ${viewMode === 'grid'
                  ? 'bg-[var(--aw-accent)] text-[#04110d] shadow-[0_8px_20px_-6px_rgba(var(--app-accent-rgb),0.5)] scale-[1.03]'
                  : 'text-zinc-500 hover:bg-white/[0.05] hover:text-white'
                  }`}
                title="Grid View"
              >
                <LayoutGrid size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <section className="rounded-[1.7rem] border px-6 py-10 text-center" style={{ borderColor: 'var(--aw-border)', background: 'var(--aw-s1)' }}>
            <p className="aw-label">Browse Failed</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Miruo did not return a usable page.</h3>
            <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>{error}</p>
          </section>
        ) : loading ? (
          viewMode === 'list' ? (
            <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aw-skeleton-card h-[180px]"><div className="aw-skeleton-shimmer" /></div>
              ))}
            </div>
          ) : (
            <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aw-skeleton-card aspect-[3/4]"><div className="aw-skeleton-shimmer" /></div>
              ))}
            </div>
          )
        ) : animeList.length ? (
          <>
            {viewMode === 'list' ? (
              <div className="relative z-0 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {animeList.map((anime) => <AnimeListCard key={anime.id} anime={anime} navigate={navigate} />)}
              </div>
            ) : (
              <div className="relative z-0 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {animeList.map((anime) => <AnimeGridCard key={anime.id} anime={anime} navigate={navigate} />)}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-10 pb-6">
              <button
                type="button"
                onClick={() => currentPage > 1 && commitBrowseParams({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="aw-pagination-btn gap-2 pl-3 pr-5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-2">
                {visiblePages.map((page, index) => {
                  const previousPage = visiblePages[index - 1];
                  const shouldShowGap = index > 0 && previousPage && page - previousPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {shouldShowGap && (
                        <span className="flex h-11 w-6 items-center justify-center text-xs font-black text-zinc-600">...</span>
                      )}

                      {currentPage === page ? (
                        <div className={`relative flex h-11 items-center justify-center transition-all duration-500 ${isEditingPage ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
                          {/* Animated Accent Line */}
                          <div className={`absolute bottom-1 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-[var(--aw-accent)] shadow-[0_0_15px_rgba(var(--app-accent-rgb),0.5)] transition-all duration-500 ${isEditingPage ? 'w-full' : 'w-8'}`} />

                          {isEditingPage ? (
                            <input
                              autoFocus
                              type="text"
                              value={jumpToPageValue}
                              onChange={(e) => setJumpToPageValue(e.target.value.replace(/\D/g, ''))}
                              onBlur={() => setIsEditingPage(false)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const target = parseInt(jumpToPageValue);
                                  if (!isNaN(target) && target > 0 && target <= Math.max(pageInfo.lastPage, 9999)) {
                                    commitBrowseParams({ page: target });
                                  }
                                  setIsEditingPage(false);
                                }
                                if (e.key === 'Escape') setIsEditingPage(false);
                              }}
                              className="w-full bg-transparent text-center text-[10px] font-black tracking-[0.15em] text-[var(--aw-accent)] outline-none border-none selection:bg-[var(--aw-accent)]/20"
                              placeholder="..."
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingPage(true);
                                setJumpToPageValue(String(page));
                              }}
                              className="group relative flex h-full items-center justify-center px-2 text-[10px] font-black tracking-[0.15em] text-white transition-all"
                            >
                              <span className="relative z-10">{page}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => commitBrowseParams({ page })}
                          className="aw-pagination-btn min-w-[44px]"
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => pageInfo.hasNextPage && commitBrowseParams({ page: currentPage + 1 })}
                disabled={!pageInfo.hasNextPage}
                className="aw-pagination-btn gap-2 pl-5 pr-3"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <section className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border px-6 py-12 text-center" style={{ borderColor: 'var(--aw-border)', background: 'var(--aw-s1)' }}>
            <div>
              <p className="aw-label">No Matches</p>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>This browse page came back empty.</h3>
              <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Try a looser search, another genre, or a different format filter.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AnimeBrowse;