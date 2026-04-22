
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Clock, LayoutGrid, List, Monitor } from 'lucide-react';
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
  'Ecchi',
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
`;

// Helper function to turn "Shingeki no Kyojin" into "shingeki-no-kyojin"
const generateSlug = (titleObj: any) => {
  const displayTitle = getAnimeDisplayTitle(titleObj) || '';
  return displayTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

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
  const pages = new Set<number>([1, lastPage, currentPage - 1, currentPage, currentPage + 1]);
  if (lastPage <= 7) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= lastPage - 2) {
    pages.add(lastPage - 1);
    pages.add(lastPage - 2);
    pages.add(lastPage - 3);
  }

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= lastPage)
    .sort((left, right) => left - right);
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
      className="group relative flex h-48 gap-4 overflow-hidden rounded-[16px] border p-3 transition-all duration-300 cursor-pointer"
      style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--aw-accent-dim)';
        e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(0, 0, 0, 0.5);';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--aw-border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[12px] ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }}>
        {coverUrl ? (
          <img src={coverUrl} alt={getAnimeDisplayTitle(anime.title)} className="h-full w-full object-cover transition-transform duration-700" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>
            No Cover
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', border: '1px solid var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}
              >
                {getAnimeTypeLabel(anime)}
              </span>
            </div>
            <h3
              className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90"
              style={{ fontFamily: 'var(--aw-font-display)' }}
            >
              {getAnimeDisplayTitle(anime.title)}
            </h3>
            <p className="mt-1 truncate text-sm font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {[anime.studios?.nodes?.find((studio) => studio.isAnimationStudio)?.name, anime.seasonYear].filter(Boolean).join(' / ') || 'Anime series'}
            </p>
          </div>
        </div>

        <div
          className="mt-auto rounded-[12px] p-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)' }}
        >
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-[1.2fr_.8fr_1fr] sm:gap-3">

            <div className="min-w-0 border-r border-white/[0.05] pr-1 sm:pr-3">
              <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Status</span>
              <span className="mt-1 block truncate text-xs sm:text-sm font-semibold capitalize" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-body)' }}>
                {getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}
              </span>
            </div>

            <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
              <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Started</span>
              <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {anime.startDate?.year || anime.seasonYear || 'N/A'}
              </span>
            </div>

            <div className="min-w-0 pl-1 sm:pl-0">
              <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Episodes</span>
              <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
                {typeof anime.episodes === 'number' && anime.episodes > 0 ? anime.episodes : 'TBA'}
              </span>
            </div>

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
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[14px] border transition-all duration-300"
      style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--aw-accent-dim)';
        e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(0, 0, 0, 0.5);';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--aw-border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div className="relative h-[220px] w-full overflow-hidden border-b" style={{ borderColor: 'var(--aw-border)' }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={getAnimeDisplayTitle(anime.title)}
            className="h-full w-full object-cover object-top opacity-100 transition-transform duration-700"
          />
        ) : (
          <div className="h-full w-full opacity-50" style={{ background: 'var(--aw-card)' }}></div>
        )}
      </div>

      <div className="flex flex-col p-3.5">
        <div className="flex flex-col">
          <h3
            className="truncate pr-2 text-[16px] font-semibold leading-tight text-white transition-colors group-hover:text-white/90"
            style={{ fontFamily: 'var(--aw-font-display)' }}
          >
            {getAnimeDisplayTitle(anime.title)}
          </h3>

          <span className="mt-1 truncate text-[12px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
            {anime.episodes ?? '--'} Episodes Available
          </span>
        </div>

        <div className="mt-2.5 flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <span
              className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
              style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-body)' }}
            >
              <Monitor size={12} style={{ color: 'var(--aw-muted)' }} />
              {getAnimeTypeLabel(anime)}
            </span>
            {anime.status && (
              <span
                className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium"
                style={{ background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)', color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-body)' }}
              >
                <Activity size={12} />
                {getAnimeStatusLabel(anime.status)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[12px] font-semibold" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--aw-accent)' }}>
              <Clock size={13} />
              <span>Aired {anime.startDate?.year || anime.seasonYear || 'TBA'}</span>
            </div>
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

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        if (committedQuery.trim()) {
          const payload = await fetchAnimeSearch(committedQuery.trim(), currentPage);

          if (controller.signal.aborted) return;

          const filteredResults = (payload.results || []).filter((entry: AnimeResult) => {
            if (committedFormat && entry.format !== committedFormat) return false;
            if (committedStatus && entry.status !== committedStatus) return false;
            if (committedSeason && entry.season !== committedSeason) return false;
            if (committedYear && String(entry.seasonYear || entry.startDate?.year || '') !== committedYear) return false;
            if (committedGenres.length && !committedGenres.every((value) =>
              entry.genres?.includes(GENRE_OPTIONS.find((option) => option.value === value)?.queryValue || '')
            )) return false;
            return matchesEpisodeFilter(entry, committedEpisodeLength);
          });

          // Deduplicate by ID
          const uniqueResults = filteredResults.filter((v: AnimeResult, i: number, a: AnimeResult[]) => 
            a.findIndex((t) => t.id === v.id) === i
          );

          setAnimeList(uniqueResults.slice(0, ITEMS_PER_PAGE));
          setPageInfo({
            currentPage,
            lastPage: Math.max(1, payload.hasNextPage ? currentPage + 1 : currentPage),
            hasNextPage: Boolean(payload.hasNextPage),
            total: payload.total || uniqueResults.length,
          });
          return;
        }

        const params = new URLSearchParams({
          page: String(currentPage),
          per_page: String(ITEMS_PER_PAGE),
          sort: committedSort || 'POPULARITY_DESC',
        });

        if (committedFormat) params.set('format', committedFormat);
        if (committedStatus) params.set('status', committedStatus);
        if (committedSeason) params.set('season', committedSeason);
        if (committedYear) params.set('year', committedYear);
        const firstGenre = committedGenres[0] ? GENRE_OPTIONS.find((option) => option.value === committedGenres[0])?.queryValue : '';
        if (firstGenre) params.set('genre', firstGenre);

        const payload = await fetchAnimeFilter(params);

        if (controller.signal.aborted) return;

        const filteredResults = (payload.results || []).filter((entry: AnimeResult) => {
          if (committedGenres.length > 1 && !committedGenres.every((value) =>
            entry.genres?.includes(GENRE_OPTIONS.find((option) => option.value === value)?.queryValue || '')
          )) return false;
          return matchesEpisodeFilter(entry, committedEpisodeLength);
        });

        // Deduplicate by ID
        const uniqueResults = filteredResults.filter((v: AnimeResult, i: number, a: AnimeResult[]) => 
          a.findIndex((t) => t.id === v.id) === i
        );

        setAnimeList(uniqueResults);
        setPageInfo({
          currentPage,
          lastPage: Math.max(1, payload.hasNextPage ? currentPage + 1 : currentPage),
          hasNextPage: Boolean(payload.hasNextPage),
          total: payload.total || uniqueResults.length,
        });
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') return;

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
        <BrowseTopbar
          searchQuery={topbarQuery}
          onSearchQueryChange={setTopbarQuery}
          onSearchSubmit={(query) => commitBrowseParams({ q: query, page: 1 })}
        />
      </div>

      <main className="mx-auto w-full max-w-[1460px] space-y-6 px-4 py-8">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="aw-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>Library</p>
            <h1 style={{
              fontFamily: 'var(--aw-font-display)',
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--aw-text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0
            }}>
              BROWSE
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
            <div
              className="flex h-[42px] items-center gap-1 rounded-[1.2rem] border p-1 shadow-sm xl:h-11"
              style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${viewMode === 'list'
                  ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                  : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                  }`}
                style={viewMode === 'list' ? { background: 'var(--aw-s2)', color: 'var(--aw-accent)' } : {}}
                title="List View"
              >
                <List size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${viewMode === 'grid'
                  ? 'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                  : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                  }`}
                style={viewMode === 'grid' ? { background: 'var(--aw-s2)', color: 'var(--aw-accent)' } : {}}
                title="Grid View"
              >
                <LayoutGrid size={16} strokeWidth={2.5} />
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
            <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-48 rounded-[16px] border aw-skeleton" style={{ borderColor: 'var(--aw-border)' }} />
              ))}
            </div>
          ) : (
            <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 24 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] rounded-[14px] border aw-skeleton" style={{ borderColor: 'var(--aw-border)' }} />
              ))}
            </div>
          )
        ) : animeList.length ? (
          <>
            {viewMode === 'list' ? (
              <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {animeList.map((anime) => <AnimeListCard key={anime.id} anime={anime} navigate={navigate} />)}
              </div>
            ) : (
              <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {animeList.map((anime) => <AnimeGridCard key={anime.id} anime={anime} navigate={navigate} />)}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2">
              <button
                type="button"
                onClick={() => currentPage > 1 && commitBrowseParams({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: 'var(--aw-bg)',
                  borderColor: 'var(--aw-border)',
                  color: 'var(--aw-muted)',
                  fontFamily: 'var(--aw-font-display)',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em'
                }}
                onMouseEnter={(e) => { if (currentPage > 1) { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                onMouseLeave={(e) => { if (currentPage > 1) { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Prev
              </button>

              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1];
                const shouldShowGap = index > 0 && previousPage && page - previousPage > 1;

                return (
                  <React.Fragment key={page}>
                    {shouldShowGap ? (
                      <span className="px-1 sm:px-2 text-xs sm:text-sm font-black text-zinc-600">...</span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => commitBrowseParams({ page })}
                      className="inline-flex h-9 sm:h-11 min-w-[36px] sm:min-w-[44px] items-center justify-center rounded-full border px-3 sm:px-4 transition-all duration-300"
                      style={{
                        fontFamily: 'var(--aw-font-display)',
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        ...(currentPage === page
                          ? { background: 'var(--aw-accent)', borderColor: 'var(--aw-accent)', color: '#04110d' }
                          : { background: 'var(--aw-bg)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)' }
                        )
                      }}
                      onMouseEnter={(e) => { if (currentPage !== page) { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                      onMouseLeave={(e) => { if (currentPage !== page) { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

              <button
                type="button"
                onClick={() => pageInfo.hasNextPage && commitBrowseParams({ page: currentPage + 1 })}
                disabled={!pageInfo.hasNextPage}
                className="inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border px-3 sm:px-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: 'var(--aw-bg)',
                  borderColor: 'var(--aw-border)',
                  color: 'var(--aw-muted)',
                  fontFamily: 'var(--aw-font-display)',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em'
                }}
                onMouseEnter={(e) => { if (pageInfo.hasNextPage) { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; } }}
                onMouseLeave={(e) => { if (pageInfo.hasNextPage) { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; } }}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
