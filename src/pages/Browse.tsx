
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, LayoutGrid, List, Heart, Download, Clock, BookOpen, Globe, Activity } from 'lucide-react';
import AppTopbar from '../components/BrowseTopbar';
import DesktopBrowseFilters from '../components/desktop/DesktopBrowseFilters';
import MobileBrowseFilters from '../components/mobile/MobileBrowseFilters';
import { handleRippleMouseDown } from '../utils/ripple';

interface BrowseManga {
  mal_id: number;
  title: string;
  score?: number;
  chapters?: number | null;
  typeLabel: string;
  statusLabel: string;
  originLabel: string;
  year?: number | null;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
}

interface BrowsePageInfo {
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  total: number;
}

interface BrowseProps {
  initialSort?: string;
  title?: string;
}

interface AniListMedia {
  idMal: number | null;
  title?: {
    userPreferred?: string | null;
    english?: string | null;
    romaji?: string | null;
  };
  coverImage?: {
    large?: string | null;
    extraLarge?: string | null;
  };
  averageScore?: number | null;
  chapters?: number | null;
  format?: string | null;
  status?: string | null;
  countryOfOrigin?: string | null;
  startDate?: {
    year?: number | null;
  };
}

type FilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type GenreFilterOption = FilterOption & {
  mode?: 'genre' | 'tag';
  queryValue?: string;
  hidden?: boolean;
};

// Helper function to turn titles into clean URLs
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const ITEMS_PER_PAGE = 24;

const ANILIST_BROWSE_QUERY = `
  query BrowsePage(
    $page: Int!
    $perPage: Int!
    $search: String
    $country: CountryCode
    $status: MediaStatus
    $formatIn: [MediaFormat]
    $formatNotIn:[MediaFormat]
    $genreIn: [String]
    $tagIn: [String]
    $sort: [MediaSort]
    $startDateGreater: FuzzyDateInt
    $startDateLesser: FuzzyDateInt
    $chaptersGreater: Int
    $chaptersLesser: Int
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        lastPage
        hasNextPage
        total
      }
      media(
        type: MANGA
        isAdult: $isAdult
        search: $search
        countryOfOrigin: $country
        status: $status
        format_in: $formatIn
        format_not_in: $formatNotIn
        genre_in: $genreIn
        tag_in: $tagIn
        sort: $sort
        startDate_greater: $startDateGreater
        startDate_lesser: $startDateLesser
        chapters_greater: $chaptersGreater
        chapters_lesser: $chaptersLesser
      ) {
        idMal
        title {
          userPreferred
          english
          romaji
        }
        coverImage {
          large
          extraLarge
        }
        averageScore
        chapters
        format
        status
        countryOfOrigin
        startDate {
          year
        }
      }
    }
  }
`;

const TYPE_OPTIONS: FilterOption[] =[
  { value: '', label: 'Type' },
  { value: 'manga', label: 'Manga' },
  { value: 'one-shot', label: 'One Shot' },
];

const STATUS_OPTIONS: FilterOption[] =[
  { value: '', label: 'Status' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'finished', label: 'Finished' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'upcoming', label: 'Upcoming' },
];

const LANGUAGE_OPTIONS: FilterOption[] =[
  { value: '', label: 'Language' },
  { value: 'english', label: 'English' },
  { value: 'manga', label: 'Japanese' },
  { value: 'manhwa', label: 'Korean' },
  { value: 'manhua', label: 'Chinese' },
];

const LENGTH_OPTIONS: FilterOption[] =[
  { value: '', label: 'Length' },
  { value: 'short', label: '1 - 49 Chapters' },
  { value: 'medium', label: '50 - 199 Chapters' },
  { value: 'long', label: '200+ Chapters' },
];

const RELEASE_OPTIONS: FilterOption[] =[
  { value: '', label: 'Release Date' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const GENRE_OPTIONS: GenreFilterOption[] =[
  { value: '', label: 'Genre' },
  { value: 'action', label: 'Action', mode: 'genre', queryValue: 'Action' },
  { value: 'adventure', label: 'Adventure', mode: 'genre', queryValue: 'Adventure' },
  { value: 'avant-garde', label: 'Avant Garde', disabled: true },
  { value: 'boys-love', label: 'Boys Love', mode: 'tag', queryValue: "Boys' Love" },
  { value: 'comedy', label: 'Comedy', mode: 'genre', queryValue: 'Comedy' },
  { value: 'demons', label: 'Demons', mode: 'tag', queryValue: 'Demons' },
  { value: 'drama', label: 'Drama', mode: 'genre', queryValue: 'Drama' },
  { value: 'ecchi', label: 'Ecchi', mode: 'genre', queryValue: 'Ecchi' },
  { value: 'fantasy', label: 'Fantasy', mode: 'genre', queryValue: 'Fantasy' },
  { value: 'girls-love', label: 'Girls Love', mode: 'tag', queryValue: 'Yuri' },
  { value: 'gourmet', label: 'Gourmet', mode: 'tag', queryValue: 'Food' },
  { value: 'harem', label: 'Harem', mode: 'tag', queryValue: 'Female Harem' },
  { value: 'horror', label: 'Horror', mode: 'genre', queryValue: 'Horror' },
  { value: 'isekai', label: 'Isekai', mode: 'tag', queryValue: 'Isekai' },
  { value: 'iyashikei', label: 'Iyashikei', mode: 'tag', queryValue: 'Iyashikei' },
  { value: 'josei', label: 'Josei', mode: 'tag', queryValue: 'Josei' },
  { value: 'kids', label: 'Kids', mode: 'tag', queryValue: 'Kids' },
  { value: 'magic', label: 'Magic', mode: 'tag', queryValue: 'Magic' },
  { value: 'mahou-shoujo', label: 'Mahou Shoujo', mode: 'genre', queryValue: 'Mahou Shoujo' },
  { value: 'martial-arts', label: 'Martial Arts', mode: 'tag', queryValue: 'Martial Arts' },
  { value: 'mecha', label: 'Mecha', mode: 'genre', queryValue: 'Mecha' },
  { value: 'military', label: 'Military', mode: 'tag', queryValue: 'Military' },
  { value: 'music', label: 'Music', mode: 'genre', queryValue: 'Music' },
  { value: 'mystery', label: 'Mystery', mode: 'genre', queryValue: 'Mystery' },
  { value: 'parody', label: 'Parody', mode: 'tag', queryValue: 'Parody' },
  { value: 'psychological', label: 'Psychological', mode: 'genre', queryValue: 'Psychological' },
  { value: 'reverse-harem', label: 'Reverse Harem', mode: 'tag', queryValue: 'Male Harem' },
  { value: 'romance', label: 'Romance', mode: 'genre', queryValue: 'Romance' },
  { value: 'school', label: 'School', mode: 'tag', queryValue: 'School' },
  { value: 'sci-fi', label: 'Sci-Fi', mode: 'genre', queryValue: 'Sci-Fi' },
  { value: 'seinen', label: 'Seinen', mode: 'tag', queryValue: 'Seinen' },
  { value: 'shoujo', label: 'Shoujo', mode: 'tag', queryValue: 'Shoujo' },
  { value: 'shounen', label: 'Shounen', mode: 'tag', queryValue: 'Shounen' },
  { value: 'slice-of-life', label: 'Slice of Life', mode: 'genre', queryValue: 'Slice of Life' },
  { value: 'space', label: 'Space', mode: 'tag', queryValue: 'Space' },
  { value: 'sports', label: 'Sports', mode: 'genre', queryValue: 'Sports' },
  { value: 'super-power', label: 'Super Power', mode: 'tag', queryValue: 'Super Power' },
  { value: 'supernatural', label: 'Supernatural', mode: 'genre', queryValue: 'Supernatural' },
  { value: 'suspense', label: 'Suspense', mode: 'genre', queryValue: 'Thriller' },
  { value: 'thriller', label: 'Thriller', mode: 'genre', queryValue: 'Thriller' },
  { value: 'vampire', label: 'Vampire', mode: 'tag', queryValue: 'Vampire' },
  { value: 'secret-genre', label: 'Secret' },
];

const PAGE_INFO_FALLBACK: BrowsePageInfo = {
  currentPage: 1,
  lastPage: 1,
  hasNextPage: false,
  total: 0,
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

const getDisplayTitle = (title?: AniListMedia['title']) =>
  title?.userPreferred || title?.english || title?.romaji || 'Untitled';

const getDisplayStatus = (status?: string | null) => {
  switch (status) {
    case 'RELEASING':
      return 'Publishing';
    case 'FINISHED':
      return 'Finished';
    case 'HIATUS':
      return 'Hiatus';
    case 'CANCELLED':
      return 'Cancelled';
    case 'NOT_YET_RELEASED':
      return 'Upcoming';
    default:
      return 'Unknown';
  }
};

const getOriginLabel = (country?: string | null) => {
  switch (country) {
    case 'JP':
      return 'Japan';
    case 'KR':
      return 'South Korea';
    case 'CN':
      return 'China';
    default:
      return 'Global';
  }
};

const getTypeLabel = (format?: string | null, country?: string | null) => {
  if (format === 'ONE_SHOT') {
    return 'One Shot';
  }

  switch (country) {
    case 'KR':
      return 'Manhwa';
    case 'CN':
      return 'Manhua';
    case 'JP':
      return 'Manga';
    default:
      return format ? format.replace(/_/g, ' ') : 'Manga';
  }
};

const getChapterCountDisplay = (chapters?: number | null) =>
  typeof chapters === 'number' && chapters > 0 ? String(chapters) : '--';

const getSortKey = (initialSort: string, releaseValue: string, hasSearch: boolean) => {
  if (releaseValue === 'newest') {
    return 'START_DATE_DESC';
  }

  if (releaseValue === 'oldest') {
    return 'START_DATE';
  }

  if (hasSearch) {
    return 'SEARCH_MATCH';
  }

  switch (initialSort) {
    case 'start_date':
      return 'START_DATE_DESC';
    case 'chapters':
      return 'UPDATED_AT_DESC';
    case 'mal_id':
      return 'ID_DESC';
    default:
      return 'POPULARITY_DESC';
  }
};

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

const mapAniListMediaToBrowseManga = (entry: AniListMedia): BrowseManga | null => {
  if (!entry.idMal) {
    return null;
  }

  const imageUrl = entry.coverImage?.extraLarge || entry.coverImage?.large || '';

  return {
    mal_id: entry.idMal,
    title: getDisplayTitle(entry.title),
    score: typeof entry.averageScore === 'number' ? entry.averageScore / 10 : undefined,
    chapters: entry.chapters ?? null,
    typeLabel: getTypeLabel(entry.format, entry.countryOfOrigin),
    statusLabel: getDisplayStatus(entry.status),
    originLabel: getOriginLabel(entry.countryOfOrigin),
    year: entry.startDate?.year ?? null,
    images: {
      jpg: {
        image_url: imageUrl,
        large_image_url: imageUrl,
      },
    },
  };
};

const MangaListCard: React.FC<{ manga: BrowseManga; navigate: (path: string) => void }> = ({ manga, navigate }) => (
  <div
    onClick={() => navigate(`/read/${createSlug(manga.title)}`)}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-700"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--app-card)] text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          No Cover
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
              {manga.typeLabel}
            </span>

          </div>
          <h3 className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90">
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-zinc-400">
            {[manga.originLabel, manga.year].filter(Boolean).join(' / ')}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Status</span>
            <span className={`mt-1 block text-sm font-semibold capitalize ${manga.statusLabel === 'Publishing' ? 'text-[var(--app-accent)]' : 'text-[var(--app-accent)]'}`}>
              {manga.statusLabel}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Started</span>
            <span className="mt-1 block text-sm font-medium text-zinc-200">{manga.year || 'N/A'}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Chapters</span>
            <span className="mt-1 block truncate text-sm font-medium text-zinc-200">
              {getChapterCountDisplay(manga.chapters)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MangaGridCard: React.FC<{ manga: BrowseManga; navigate: (path: string) => void }> = ({ manga, navigate }) => (
  <div
    onClick={() => navigate(`/read/${createSlug(manga.title)}`)}
    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_15px_40px_-15px_rgba(0,0,0,0.85)]"
  >
    {/* Balanced Banner - Reduced to 220px to show more art without being "too much" */}
    <div className="relative h-[220px] w-full overflow-hidden border-b border-white/[0.05]">
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={`${manga.title} banner`}
          className="h-full w-full object-cover object-top opacity-100 transition-transform duration-700"
        />
      ) : (
        <div className="h-full w-full bg-[var(--app-card)] opacity-50"></div>
      )}
    </div>

    {/* Compact Content Section */}
    <div className="flex flex-col p-3.5">
      {/* Title Block */}
      <div className="flex flex-col">
        <h3 className="truncate pr-2 text-[16px] font-semibold leading-tight text-white transition-colors group-hover:text-white/90">
          {manga.title}
        </h3>

        <span className="mt-1 truncate text-[12px] font-medium text-zinc-400">{manga.chapters ?? '--'} Chapters Available</span>
      </div>

      {/* Tags & Footer - Tightly grouped with mt-2.5 */}
      <div className="mt-2.5 flex flex-col gap-2.5">
        {/* Tags Row */}
        <div className="flex flex-wrap gap-1.5">
        <span className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]">
          <Globe size={12} className="text-zinc-400" />
          {manga.originLabel}
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]">
          <BookOpen size={12} className="text-zinc-400" />
          {manga.typeLabel}
        </span>
        {manga.statusLabel && (
          <span className="flex items-center gap-1.5 rounded-md border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-accent)]">
            <Activity size={12} />
            {manga.statusLabel}
          </span>
          )}
        </div>

        {/* Stats Row - Directly under tags, no spacer */}
        <div className="flex items-center justify-between text-[12px] font-semibold text-zinc-400">

          <div className="flex items-center gap-1.5 text-[var(--app-accent)]">
            <Clock size={13} />
            <span>Published {manga.year || 'TBA'}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);


const Browse: React.FC<BrowseProps> = ({ initialSort = 'popularity' }) => {
  const navigate = useNavigate();
  const[searchParams, setSearchParams] = useSearchParams();

  // Layout View State (persisted)
  const[viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('browseViewMode') as 'list' | 'grid') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('browseViewMode', viewMode);
  }, [viewMode]);

  const committedQuery = searchParams.get('q') || '';
  const committedType = searchParams.get('format') || '';
  const committedGenres = parseMultiValueParam(searchParams.get('genres'));
  const legacyGenre = searchParams.get('genre') || '';
  const committedGenre = committedGenres.length ? committedGenres : legacyGenre ? [legacyGenre] :[];
  const committedGenreKey = committedGenre.join(',');
  const committedStatus = searchParams.get('status') || '';
  const committedLanguage = searchParams.get('language') || '';
  const committedYear = searchParams.get('year') || '';
  const committedLength = searchParams.get('length') || '';
  const committedRelease = searchParams.get('release') || '';
  const currentPage = resolvePageParam(searchParams.get('page'));

  const[topbarQuery, setTopbarQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState(committedQuery);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const[typeFilter, setTypeFilter] = useState(committedType);
  const [genreFilter, setGenreFilter] = useState(committedGenre);
  const [statusFilter, setStatusFilter] = useState(committedStatus);
  const [languageFilter, setLanguageFilter] = useState(committedLanguage);
  const[yearFilter, setYearFilter] = useState(committedYear);
  const [lengthFilter, setLengthFilter] = useState(committedLength);
  const [releaseFilter, setReleaseFilter] = useState(committedRelease);

  const[mangaList, setMangaList] = useState<BrowseManga[]>([]);
  const[pageInfo, setPageInfo] = useState<BrowsePageInfo>(PAGE_INFO_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePages = useMemo(
    () => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage),
    [pageInfo.currentPage, pageInfo.lastPage]
  );

  const yearOptions = useMemo(
    () =>[
      { value: '', label: 'Year' },
      ...Array.from({ length: 40 }, (_, index) => {
        const year = String(new Date().getFullYear() - index);
        return { value: year, label: year };
      }),
    ],[]
  );

  useEffect(() => {
    const id = 'browse-filter-control-style';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      .browse-filter-control {
        background-color: var(--app-surface-2) !important;
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
        -webkit-box-shadow: 0 0 0px 1000px var(--app-surface-2) inset;
        box-shadow: 0 0 0px 1000px var(--app-surface-2) inset;
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
  },[]);

  useEffect(() => {
    setSearchQuery(committedQuery);
    setTypeFilter(committedType);
    setGenreFilter(committedGenre);
    setStatusFilter(committedStatus);
    setLanguageFilter(committedLanguage);
    setYearFilter(committedYear);
    setLengthFilter(committedLength);
    setReleaseFilter(committedRelease);
  },[
    committedGenreKey,
    committedLanguage,
    committedLength,
    committedQuery,
    committedRelease,
    committedStatus,
    committedType,
    committedYear,
  ]);

  useEffect(() => {
    setActiveDropdown(null);
  },[currentPage, committedLanguage, committedLength, committedQuery, committedRelease, committedStatus, committedType, committedYear]);

  const commitBrowseParams = useCallback(
    (overrides?: Partial<Record<'q' | 'format' | 'status' | 'language' | 'year' | 'length' | 'release', string> & { genres: string[] }> & { page?: number }) => {
      const nextParams = new URLSearchParams(searchParams);

      const nextQuery = (overrides?.q ?? searchQuery).trim();
      const nextType = overrides?.format ?? typeFilter;
      const nextGenre = overrides?.genres ?? genreFilter;
      const nextStatus = overrides?.status ?? statusFilter;
      const nextLanguage = overrides?.language ?? languageFilter;
      const nextYear = (overrides?.year ?? yearFilter).trim();
      const nextLength = overrides?.length ?? lengthFilter;
      const nextRelease = overrides?.release ?? releaseFilter;
      const nextPage = overrides?.page ?? 1;

      if (nextQuery) nextParams.set('q', nextQuery);
      else nextParams.delete('q');

      if (nextType) nextParams.set('format', nextType);
      else nextParams.delete('format');

      if (nextGenre.length) {
        nextParams.set('genres', nextGenre.join(','));
      } else {
        nextParams.delete('genres');
      }
      nextParams.delete('genre');

      if (nextStatus) nextParams.set('status', nextStatus);
      else nextParams.delete('status');

      if (nextLanguage) nextParams.set('language', nextLanguage);
      else nextParams.delete('language');

      if (nextYear) nextParams.set('year', nextYear);
      else nextParams.delete('year');

      if (nextLength) nextParams.set('length', nextLength);
      else nextParams.delete('length');

      if (nextRelease) nextParams.set('release', nextRelease);
      else nextParams.delete('release');

      if (nextPage > 1) nextParams.set('page', String(nextPage));
      else nextParams.delete('page');

      setSearchParams(nextParams);
    },[
      genreFilter,
      languageFilter,
      lengthFilter,
      releaseFilter,
      searchParams,
      searchQuery,
      setSearchParams,
      statusFilter,
      typeFilter,
      yearFilter,
    ]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('');
    setGenreFilter([]);
    setStatusFilter('');
    setLanguageFilter('');
    setYearFilter('');
    setLengthFilter('');
    setReleaseFilter('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const submitBrowseSearch = useCallback(
    (rawQuery: string) => {
      setSearchQuery(rawQuery);
      commitBrowseParams({ q: rawQuery, page: 1 });
    },[commitBrowseParams]
  );

  const updateTypeFilter = useCallback((value: string) => {
    setTypeFilter(value);
    commitBrowseParams({ format: value, page: 1 });
  },[commitBrowseParams]);

  const updateGenreFilter = useCallback((value: string) => {
    const nextValue = value === ''
      ?[]
      : genreFilter.includes(value)
        ? genreFilter.filter((entry) => entry !== value)
        : [...genreFilter, value];

    setGenreFilter(nextValue);
    commitBrowseParams({ genres: nextValue, page: 1 });
  },[commitBrowseParams, genreFilter]);

  const updateStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    commitBrowseParams({ status: value, page: 1 });
  }, [commitBrowseParams]);

  const updateLanguageFilter = useCallback((value: string) => {
    setLanguageFilter(value);
    commitBrowseParams({ language: value, page: 1 });
  }, [commitBrowseParams]);

  const updateYearFilter = useCallback((value: string) => {
    setYearFilter(value);
    commitBrowseParams({ year: value, page: 1 });
  }, [commitBrowseParams]);

  const updateLengthFilter = useCallback((value: string) => {
    setLengthFilter(value);
    commitBrowseParams({ length: value, page: 1 });
  }, [commitBrowseParams]);

  const updateReleaseFilter = useCallback((value: string) => {
    setReleaseFilter(value);
    commitBrowseParams({ release: value, page: 1 });
  }, [commitBrowseParams]);

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > pageInfo.lastPage || page === currentPage) {
        return;
      }

      commitBrowseParams({ page });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },[commitBrowseParams, currentPage, pageInfo.lastPage]
  );

  useEffect(() => {
    if (searchQuery === committedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      commitBrowseParams({ q: searchQuery, page: 1 });
    }, 260);

    return () => window.clearTimeout(timeoutId);
  },[commitBrowseParams, committedQuery, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const selectedGenres = GENRE_OPTIONS.filter((option) => committedGenre.includes(option.value));

    const variables: Record<string, unknown> = {
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
      formatNotIn: ['NOVEL'],
      sort:[getSortKey(initialSort, committedRelease, Boolean(committedQuery.trim()))],
    };

    if (committedQuery.trim()) {
      variables.search = committedQuery.trim();
    }

    if (committedType === 'manga') {
      variables.formatIn = ['MANGA'];
    } else if (committedType === 'one-shot') {
      variables.formatIn = ['ONE_SHOT'];
    }

    const genreValues = selectedGenres
      .filter((option) => option.mode === 'genre' && option.queryValue)
      .map((option) => option.queryValue as string);
    const tagValues = selectedGenres
      .filter((option) => option.mode === 'tag' && option.queryValue)
      .map((option) => option.queryValue as string);

    if (genreValues.length) {
      variables.genreIn = genreValues;
    }

    if (tagValues.length) {
      variables.tagIn = tagValues;
    }

    // Pass the isAdult parameter strictly when the "Secret" genre toggle is active
    if (committedGenre.includes('secret-genre')) {
      variables.isAdult = true;
    }

    if (committedStatus === 'publishing') {
      variables.status = 'RELEASING';
    } else if (committedStatus === 'finished') {
      variables.status = 'FINISHED';
    } else if (committedStatus === 'hiatus') {
      variables.status = 'HIATUS';
    } else if (committedStatus === 'cancelled') {
      variables.status = 'CANCELLED';
    } else if (committedStatus === 'upcoming') {
      variables.status = 'NOT_YET_RELEASED';
    }

    if (committedLanguage === 'manga') {
      variables.country = 'JP';
    } else if (committedLanguage === 'manhwa') {
      variables.country = 'KR';
    } else if (committedLanguage === 'manhua') {
      variables.country = 'CN';
    }

    if (/^\d{4}$/.test(committedYear)) {
      const yearValue = Number(committedYear);
      variables.startDateGreater = yearValue * 10000;
      variables.startDateLesser = (yearValue + 1) * 10000;
    }

    if (committedLength === 'short') {
      variables.chaptersLesser = 50;
    } else if (committedLength === 'medium') {
      variables.chaptersGreater = 49;
      variables.chaptersLesser = 200;
    } else if (committedLength === 'long') {
      variables.chaptersGreater = 199;
    }

    setLoading(true);
    setError(null);

    fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_BROWSE_QUERY,
        variables,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || payload.errors?.length) {
          throw new Error(payload.errors?.[0]?.message || 'AniList browse request failed.');
        }

        return payload.data?.Page;
      })
      .then((pagePayload) => {
        const info = pagePayload?.pageInfo;
        const mappedResults = Array.isArray(pagePayload?.media)
          ? pagePayload.media
              .map((entry: AniListMedia) => mapAniListMediaToBrowseManga(entry))
              .filter(Boolean) as BrowseManga[]
          :[];

        setMangaList(mappedResults);
        setPageInfo({
          currentPage: info?.currentPage || currentPage,
          lastPage: Math.max(1, info?.lastPage || 1),
          hasNextPage: Boolean(info?.hasNextPage),
          total: info?.total || 0,
        });
      })
      .catch((fetchError: Error) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(fetchError.message || 'Failed to load browse results.');
        setMangaList([]);
        setPageInfo(PAGE_INFO_FALLBACK);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  },[
    committedGenreKey,
    committedLanguage,
    committedLength,
    committedQuery,
    committedRelease,
    committedStatus,
    committedType,
    committedYear,
    currentPage,
    initialSort,
  ]);

  useEffect(() => {
    if (!loading && pageInfo.lastPage > 0 && currentPage > pageInfo.lastPage) {
      commitBrowseParams({ page: pageInfo.lastPage });
    }
  }, [commitBrowseParams, currentPage, loading, pageInfo.lastPage]);

  const hasActiveFilters = Boolean(
    committedQuery ||
      committedType ||
      committedGenre.length ||
      committedStatus ||
      committedLanguage ||
      committedYear ||
      committedLength ||
      committedRelease
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-white selection:bg-[var(--app-accent-muted)]">
      <AppTopbar
        searchQuery={topbarQuery}
        onSearchQueryChange={setTopbarQuery}
        onSearchSubmit={submitBrowseSearch}
      />

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
              activeDropdown={activeDropdown}
              setActiveDropdown={setActiveDropdown}
              typeFilter={typeFilter}
              genreFilter={genreFilter}
              statusFilter={statusFilter}
              languageFilter={languageFilter}
              yearFilter={yearFilter}
              lengthFilter={lengthFilter}
              releaseFilter={releaseFilter}
              typeOptions={TYPE_OPTIONS}
              genreOptions={GENRE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              languageOptions={LANGUAGE_OPTIONS}
              yearOptions={yearOptions}
              lengthOptions={LENGTH_OPTIONS}
              releaseOptions={RELEASE_OPTIONS}
              updateTypeFilter={updateTypeFilter}
              updateGenreFilter={updateGenreFilter}
              updateStatusFilter={updateStatusFilter}
              updateLanguageFilter={updateLanguageFilter}
              updateYearFilter={updateYearFilter}
              updateLengthFilter={updateLengthFilter}
              updateReleaseFilter={updateReleaseFilter}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />

            <MobileBrowseFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              submitSearch={() => commitBrowseParams({ q: searchQuery, page: 1 })}
              typeFilter={typeFilter}
              genreFilter={genreFilter}
              statusFilter={statusFilter}
              languageFilter={languageFilter}
              yearFilter={yearFilter}
              lengthFilter={lengthFilter}
              releaseFilter={releaseFilter}
              typeOptions={TYPE_OPTIONS}
              genreOptions={GENRE_OPTIONS}
              statusOptions={STATUS_OPTIONS}
              languageOptions={LANGUAGE_OPTIONS}
              yearOptions={yearOptions}
              lengthOptions={LENGTH_OPTIONS}
              releaseOptions={RELEASE_OPTIONS}
              updateTypeFilter={updateTypeFilter}
              updateGenreFilter={updateGenreFilter}
              updateStatusFilter={updateStatusFilter}
              updateLanguageFilter={updateLanguageFilter}
              updateYearFilter={updateYearFilter}
              updateLengthFilter={updateLengthFilter}
              updateReleaseFilter={updateReleaseFilter}
              hasActiveFilters={hasActiveFilters}
              clearFilters={clearFilters}
            />
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <div className="flex h-[42px] items-center gap-1 rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-1 shadow-sm xl:h-11">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${
                  viewMode === 'list'
                    ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                    : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                }`}
                title="List View"
              >
                <List size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-full w-10 items-center justify-center rounded-[1rem] transition-all duration-300 ${
                  viewMode === 'grid'
                    ? 'bg-[var(--app-surface-2)] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
                    : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
                }`}
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
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">AniList did not return a usable page.</h3>
            <p className="mt-3 text-sm text-zinc-300">{error}</p>
          </section>
        ) : loading ? (
          viewMode === 'list' ? (
            <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]" />
              ))}
            </div>
          ) : (
            <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 24 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]" />
              ))}
            </div>
          )
        ) : mangaList.length ? (
          <>
            {viewMode === 'list' ? (
              <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mangaList.map((manga) => (
                  <MangaListCard key={manga.mal_id} manga={manga} navigate={navigate} />
                ))}
              </div>
            ) : (
              <div className="relative z-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {mangaList.map((manga) => (
                  <MangaGridCard key={manga.mal_id} manga={manga} navigate={navigate} />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                onMouseDown={handleRippleMouseDown}
                disabled={currentPage <= 1}
                className="ripple-button inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} />
                Prev
              </button>

              {visiblePages.map((page, index) => {
                const previousPage = visiblePages[index - 1];
                const shouldShowGap = index > 0 && previousPage && page - previousPage > 1;

                return (
                  <React.Fragment key={page}>
                    {shouldShowGap ? (
                      <span className="px-2 text-sm font-black text-zinc-600">...</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => goToPage(page)}
                      onMouseDown={handleRippleMouseDown}
                      className={`ripple-button inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border px-4 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                        currentPage === page
                          ? 'border-[var(--app-border)] text-[#04110d]'
                          : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
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
                onClick={() => goToPage(currentPage + 1)}
                onMouseDown={handleRippleMouseDown}
                disabled={!pageInfo.hasNextPage}
                className="ripple-button inline-flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </>
        ) : (
          <section className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] px-6 py-12 text-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">No Matches</p>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">This browse page came back empty.</h3>
              <p className="mt-3 text-sm text-zinc-400">Try a looser search, another genre, or a different region filter.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Browse;