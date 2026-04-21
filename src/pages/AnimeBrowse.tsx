import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Clock, LayoutGrid, List, Monitor, Star } from 'lucide-react';
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
  getAnimeScore,
  getAnimeStatusLabel,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { handleRippleMouseDown } from '../utils/ripple';

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

const AnimeListCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => (
  <div
    onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
      <img src={getAnimeCover(anime)} alt={getAnimeDisplayTitle(anime.title)} className="h-full w-full object-cover transition-transform duration-700" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
              {getAnimeTypeLabel(anime)}
            </span>
          </div>
          <h3 className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90">
            {getAnimeDisplayTitle(anime.title)}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            {[anime.studios?.nodes?.find((studio) => studio.isAnimationStudio)?.name, anime.seasonYear].filter(Boolean).join(' / ') || 'Anime series'}
          </p>
        </div>
      </div>

      {/* STATS SECTION - Updated with mobile fixes & sentence case */}
      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] p-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-[1.2fr_.8fr_1fr] sm:gap-3">

          {/* Status Section */}
          <div className="min-w-0 border-r border-white/[0.05] pr-1 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Status</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-semibold capitalize text-[var(--app-accent)]">
              {getAnimeStatusLabel(anime.status)?.toLowerCase() || "Unknown"}
            </span>
          </div>

          {/* Started Section */}
          <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Started</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-zinc-200">
              {anime.startDate?.year || anime.seasonYear || 'N/A'}
            </span>
          </div>

          {/* Episodes Section */}
          <div className="min-w-0 pl-1 sm:pl-0">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75">Episodes</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-zinc-200">
              {typeof anime.episodes === 'number' && anime.episodes > 0 ? anime.episodes : 'TBA'}
            </span>
          </div>

        </div>
      </div>
      {/* END STATS SECTION */}

    </div>
  </div>
);

const AnimeGridCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => (
  <div
    onClick={() => navigate(`/watch/${generateSlug(anime.title)}`)}
    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.85)]"
  >
    {/* Banner - Art First (Reduced from aspect-2/3 to match Manga style) */}
    <div className="relative h-[220px] w-full overflow-hidden border-b border-white/[0.05]">
      <img
        src={getAnimeCover(anime)}
        alt={getAnimeDisplayTitle(anime.title)}
        className="h-full w-full object-cover object-top transition-transform duration-700"
      />

      {/* Floating Rating Badge */}

    </div>

    {/* Compact Content Section */}
    <div className="flex flex-col p-3.5">
      {/* Title & Episode Info */}
      <div className="flex flex-col">
        <h3 className="truncate pr-2 text-[16px] font-semibold leading-tight text-white transition-colors group-hover:text-[var(--app-accent)]">
          {getAnimeDisplayTitle(anime.title)}
        </h3>
        <span className="mt-1.5 text-[12px] font-medium text-zinc-500">
          {anime.episodes || '--'} Episodes Available
        </span>
      </div>

      {/* Tags & Footer - Tightly grouped */}
      <div className="mt-3 flex flex-col gap-3">
        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5">
          <span className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]">
            <Monitor size={11} className="text-zinc-500" />
            {getAnimeTypeLabel(anime)}
          </span>
          {anime.status && (
            <span className="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--app-accent)]">
              <Activity size={11} />
              {getAnimeStatusLabel(anime.status)}
            </span>
          )}
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between text-[12px] font-semibold text-zinc-400">
          <div className="flex items-center gap-1.5 text-[var(--app-accent)]">
            <Clock size={12} />
            <span>Aired {(anime.startDate?.year || anime.seasonYear || 'TBA')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);


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
      ...Array.from({ length: 30 }, (_, index) => {
        const year = new Date().getFullYear() - index;
        return { value: String(year), label: String(year) };
      }),
    ], []
  );

  const visiblePages = useMemo(() => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage), [pageInfo.currentPage, pageInfo.lastPage]);

  // FIX: Force local SearchQuery to sync with URL committedQuery. 
  // This prevents the debounce effect from wiping out Topbar searches!
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

          // FIX: Removed the buggy local slicing (e.g. slice(start, start + ITEMS_PER_PAGE)) 
          // because the API *already* paginated the data via `currentPage`.
          setAnimeList(filteredResults.slice(0, ITEMS_PER_PAGE));
          setPageInfo({
            currentPage,
            lastPage: Math.max(1, payload.hasNextPage ? currentPage + 1 : currentPage),
            hasNextPage: Boolean(payload.hasNextPage),
            total: payload.total || filteredResults.length,
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

        setAnimeList(filteredResults);
        setPageInfo({
          currentPage,
          lastPage: Math.max(1, payload.hasNextPage ? currentPage + 1 : currentPage),
          hasNextPage: Boolean(payload.hasNextPage),
          total: payload.total || filteredResults.length,
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
    <div className="min-h-screen bg-[var(--app-bg)] text-white selection:bg-[var(--app-accent-muted)]">
      <BrowseTopbar searchQuery={topbarQuery} onSearchQueryChange={setTopbarQuery} onSearchSubmit={(query) => commitBrowseParams({ q: query, page: 1 })} />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Library</p>
            <h1 className="mt-2 text-4xl font-bold uppercase tracking-tight text-white">BROWSE</h1>
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
            <div className="flex h-[42px] items-center gap-1 rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-1 shadow-sm xl:h-11">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${viewMode === 'list' ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)]' : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'}`}
                title="List View"
              >
                <List size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${viewMode === 'grid' ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)]' : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <section className="rounded-[1.7rem] border border-red-500/20 bg-red-500/[0.05] px-6 py-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Browse Failed</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">Miruo did not return a usable page.</h3>
            <p className="mt-3 text-sm text-zinc-300">{error}</p>
          </section>
        ) : loading ? (
          viewMode === 'list' ? (
            <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-48 animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]" />)}
            </div>
          ) : (
            <div className="relative z-0 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 24 }).map((_, index) => <div key={index} className="aspect-[2/3] animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]" />)}
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
                className="inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 sm:px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition-all duration-300 hover:border-white/[0.15] hover:bg-[var(--app-surface-2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
                      <span className="px-1 sm:px-2 text-xs sm:text-sm font-bold tracking-widest text-zinc-600">
                        ...
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => commitBrowseParams({ page })}
                      className={`inline-flex h-9 sm:h-11 min-w-[36px] sm:min-w-[44px] items-center justify-center rounded-full border px-3 sm:px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-300 ${currentPage === page
                          ? 'border-[var(--app-border)] text-[#04110d] hover:opacity-90'
                          : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-white/[0.15] hover:bg-[var(--app-surface-2)] hover:text-white'
                        }`}
                      style={currentPage === page ? { backgroundColor: 'var(--app-accent)' } : undefined}
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
                className="inline-flex h-9 sm:h-11 items-center gap-1.5 sm:gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 sm:px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-300 transition-all duration-300 hover:border-white/[0.15] hover:bg-[var(--app-surface-2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </>
        ) : (
          <section className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] px-6 py-12 text-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">No Matches</p>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">This browse page came back empty.</h3>
              <p className="mt-3 text-sm text-zinc-400">Try a looser search, another genre, or a different format filter.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AnimeBrowse;