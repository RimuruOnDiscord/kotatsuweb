import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Check, Search, Star } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
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
    $formatNotIn: [MediaFormat]
    $genreIn: [String]
    $tagIn: [String]
    $sort: [MediaSort]
    $startDateGreater: FuzzyDateInt
    $startDateLesser: FuzzyDateInt
    $chaptersGreater: Int
    $chaptersLesser: Int
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
        isAdult: false
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

const TYPE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Type' },
  { value: 'manga', label: 'Manga' },
  { value: 'one-shot', label: 'One Shot' },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: '', label: 'Status' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'finished', label: 'Finished' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'upcoming', label: 'Upcoming' },
];

const LANGUAGE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Language' },
  { value: 'english', label: 'English' },
  { value: 'manga', label: 'Japanese' },
  { value: 'manhwa', label: 'Korean' },
  { value: 'manhua', label: 'Chinese' },
];

const LENGTH_OPTIONS: FilterOption[] = [
  { value: '', label: 'Length' },
  { value: 'short', label: '1 - 49 Chapters' },
  { value: 'medium', label: '50 - 199 Chapters' },
  { value: 'long', label: '200+ Chapters' },
];

const RELEASE_OPTIONS: FilterOption[] = [
  { value: '', label: 'Release Date' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

const GENRE_OPTIONS: GenreFilterOption[] = [
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

const formatNumber = (value: number) => value.toLocaleString();

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
    onClick={() => navigate(`/read/${manga.mal_id}`)}
    className="group relative flex h-48 cursor-pointer gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[#111214] p-3 transition-all duration-300 hover:border-emerald-400/15 hover:bg-[#15171a] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)]"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[#121418] ring-1 ring-white/[0.08]">
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#17191d] text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
          No Cover
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.22em] text-emerald-300">
              {manga.typeLabel}
            </span>
            {manga.score ? (
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] font-black text-white/75">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {manga.score.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-black leading-tight text-white transition-colors group-hover:text-white/90">
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-[12px] font-semibold text-zinc-400">
            {[manga.originLabel, manga.year].filter(Boolean).join(' / ')}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[#1a1b1e] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Status</span>
            <span className={`mt-2 block text-[11px] font-black uppercase tracking-[0.1em] ${manga.statusLabel === 'Publishing' ? 'text-emerald-300' : 'text-sky-300'}`}>
              {manga.statusLabel}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Started</span>
            <span className="mt-2 block text-sm font-black text-white">{manga.year || 'N/A'}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Chapters</span>
            <span className="mt-2 block truncate text-sm font-black uppercase text-white">
              {getChapterCountDisplay(manga.chapters)}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px] opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  </div>
);

const FilterSelect: React.FC<{
  dropdownKey: string;
  activeDropdown: string | null;
  setActiveDropdown: (key: string | null) => void;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}> = ({ dropdownKey, activeDropdown, setActiveDropdown, value, options, onChange, className = '' }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isOpen = activeDropdown === dropdownKey;
  const isGenreDropdown = dropdownKey === 'genre';

  const selectedOption =
    options.find((option) => option.value === value) ||
    options.find((option) => option.value === '') ||
    options[0];

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      return;
    }

    if (!isMounted) return;

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsMounted(false);
      closeTimeoutRef.current = null;
    }, 240);

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isMounted, isOpen]);

  useEffect(() => {
    if (!isMounted) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveDropdown(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMounted, setActiveDropdown]);

  const OptionButton: React.FC<{
    option: FilterOption;
    isSelected: boolean;
    onClick: () => void;
    compact?: boolean;
  }> = ({ option, isSelected, onClick, compact = false }) => (
    <button
      type="button"
      disabled={option.disabled}
      onClick={onClick}
      className={`group/item relative flex items-center justify-between gap-3 rounded-xl text-left transition-all duration-200 ${
        compact ? 'min-h-[34px] px-2.5 py-1.5' : 'w-full px-3 py-2'
      } ${
        option.disabled
          ? 'cursor-not-allowed opacity-30'
          : isSelected
            ? 'bg-emerald-500/[0.18] text-emerald-300 ring-1 ring-emerald-500/20'
            : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100'
      }`}
    >
      <span
        className={`text-[12px] font-medium transition-colors duration-200 ${
          option.disabled ? 'text-zinc-600' : isSelected ? 'text-emerald-300' : ''
        }`}
      >
        {option.label}
      </span>
      <Check
        size={12}
        className={`flex-shrink-0 text-emerald-400 transition-all duration-200 ${
          isSelected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      />
    </button>
  );

  const dropdownBase = `absolute left-0 top-full z-30 w-full`;
  const panelClass = `mt-3 origin-top overflow-hidden rounded-xl border border-white/[0.06] bg-[#1a1b1e] shadow-[0_16px_40px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out`;
  const dropdownState = isOpen
    ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
    : 'pointer-events-none -translate-y-2 scale-[0.985] opacity-0';

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setActiveDropdown(isOpen ? null : dropdownKey)}
        style={isOpen ? { borderColor: '#303133' } : undefined}
        className={`group relative flex h-11 w-full items-center justify-between overflow-hidden rounded-2xl border px-4 text-left transition-[background-color,border-color,color,box-shadow,transform] duration-300 ease-out ${
          isOpen
            ? 'bg-[#1a1b1e] text-white shadow-[0_20px_40px_-26px_rgba(0,0,0,0.9)]'
            : 'border-white/[0.06] bg-[#15171a] text-zinc-300 hover:border-white/[0.1] hover:bg-[#181a1d] hover:text-white'
        }`}
      >
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-70" />
        <span className="truncate pr-3 text-[11px] font-black uppercase tracking-[0.14em]">
          {selectedOption?.label || 'Select'}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-[transform,color] duration-300 ease-out ${
            isOpen ? 'rotate-180 text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
          }`}
        />
      </button>

      {/* Dropdown */}
      {isMounted && (
        isGenreDropdown ? (
          <div style={{ width: 'min(520px, calc(100vw - 2rem))' }} className={`${dropdownBase} ${dropdownState}`}>
            <div className={panelClass}>
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Browse Filter</p>
                  <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-200">Select Genre</p>
                </div>
              </div>
              <div className="no-scrollbar max-h-[280px] overflow-y-auto px-3 py-3">
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 md:grid-cols-3">
                  {options.map((option) => (
                    <OptionButton
                      key={option.value ?? option.label}
                      option={option}
                      isSelected={option.value === value}
                      onClick={() => !option.disabled && onChange(option.value)}
                      compact
                    />
                  ))}
                </div>
              </div>
              <div className="border-t border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">Filters apply instantly</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${dropdownBase} ${dropdownState} w-max`}>
            <div className={panelClass}>
              <div className="no-scrollbar max-h-72 overflow-y-auto p-2">
                {options.filter((o) => o.value !== '').map((option) => (
                  <OptionButton
                    key={option.value ?? option.label}
                    option={option}
                    isSelected={option.value === value}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setActiveDropdown(null);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};



const Browse: React.FC<BrowseProps> = ({ initialSort = 'popularity', title = 'Explore Manga' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const committedQuery = searchParams.get('q') || '';
  const committedType = searchParams.get('format') || '';
  const committedGenre = searchParams.get('genre') || '';
  const committedStatus = searchParams.get('status') || '';
  const committedLanguage = searchParams.get('language') || '';
  const committedYear = searchParams.get('year') || '';
  const committedLength = searchParams.get('length') || '';
  const committedRelease = searchParams.get('release') || '';
  const currentPage = resolvePageParam(searchParams.get('page'));

  const [topbarQuery, setTopbarQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState(committedQuery);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState(committedType);
  const [genreFilter, setGenreFilter] = useState(committedGenre);
  const [statusFilter, setStatusFilter] = useState(committedStatus);
  const [languageFilter, setLanguageFilter] = useState(committedLanguage);
  const [yearFilter, setYearFilter] = useState(committedYear);
  const [lengthFilter, setLengthFilter] = useState(committedLength);
  const [releaseFilter, setReleaseFilter] = useState(committedRelease);

  const [mangaList, setMangaList] = useState<BrowseManga[]>([]);
  const [pageInfo, setPageInfo] = useState<BrowsePageInfo>(PAGE_INFO_FALLBACK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visiblePages = useMemo(
    () => getVisiblePages(pageInfo.currentPage, pageInfo.lastPage),
    [pageInfo.currentPage, pageInfo.lastPage]
  );

  useEffect(() => {
    const id = 'browse-filter-control-style';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.innerHTML = `
      .browse-filter-control {
        background-color: #182b46 !important;
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
        -webkit-box-shadow: 0 0 0px 1000px #182b46 inset;
        box-shadow: 0 0 0px 1000px #182b46 inset;
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
    setTypeFilter(committedType);
    setGenreFilter(committedGenre);
    setStatusFilter(committedStatus);
    setLanguageFilter(committedLanguage);
    setYearFilter(committedYear);
    setLengthFilter(committedLength);
    setReleaseFilter(committedRelease);
  }, [
    committedGenre,
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
  }, [currentPage, committedGenre, committedLanguage, committedLength, committedQuery, committedRelease, committedStatus, committedType, committedYear]);

  const commitBrowseParams = useCallback(
    (overrides?: Partial<Record<'q' | 'format' | 'genre' | 'status' | 'language' | 'year' | 'length' | 'release', string>> & { page?: number }) => {
      const nextParams = new URLSearchParams(searchParams);

      const nextQuery = (overrides?.q ?? searchQuery).trim();
      const nextType = overrides?.format ?? typeFilter;
      const nextGenre = overrides?.genre ?? genreFilter;
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

      if (nextGenre) nextParams.set('genre', nextGenre);
      else nextParams.delete('genre');

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
    },
    [
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
    setGenreFilter('');
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
    },
    [commitBrowseParams]
  );

  const updateTypeFilter = useCallback((value: string) => {
    setTypeFilter(value);
    commitBrowseParams({ format: value, page: 1 });
  }, [commitBrowseParams]);

  const updateGenreFilter = useCallback((value: string) => {
    setGenreFilter(value);
    commitBrowseParams({ genre: value, page: 1 });
  }, [commitBrowseParams]);

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
    },
    [commitBrowseParams, currentPage, pageInfo.lastPage]
  );

  useEffect(() => {
    if (searchQuery === committedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      commitBrowseParams({ q: searchQuery, page: 1 });
    }, 260);

    return () => window.clearTimeout(timeoutId);
  }, [commitBrowseParams, committedQuery, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const selectedGenre = GENRE_OPTIONS.find((option) => option.value === committedGenre);

    const variables: Record<string, unknown> = {
      page: currentPage,
      perPage: ITEMS_PER_PAGE,
      formatNotIn: ['NOVEL'],
      sort: [getSortKey(initialSort, committedRelease, Boolean(committedQuery.trim()))],
    };

    if (committedQuery.trim()) {
      variables.search = committedQuery.trim();
    }

    if (committedType === 'manga') {
      variables.formatIn = ['MANGA'];
    } else if (committedType === 'one-shot') {
      variables.formatIn = ['ONE_SHOT'];
    }

    if (selectedGenre?.mode === 'genre' && selectedGenre.queryValue) {
      variables.genreIn = [selectedGenre.queryValue];
    } else if (selectedGenre?.mode === 'tag' && selectedGenre.queryValue) {
      variables.tagIn = [selectedGenre.queryValue];
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
          : [];

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
  }, [
    committedGenre,
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
      committedGenre ||
      committedStatus ||
      committedLanguage ||
      committedYear ||
      committedLength ||
      committedRelease
  );

  return (
    <div className="min-h-screen bg-[#111214] text-white selection:bg-emerald-500/30">
      <AppTopbar
        searchQuery={topbarQuery}
        onSearchQueryChange={setTopbarQuery}
        onSearchSubmit={submitBrowseSearch}
      />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
        <div
          className={`relative z-[80] transition-[padding] duration-200 ${
            activeDropdown === 'genre'
              ? 'pb-[360px]'
              : activeDropdown
                ? 'pb-[200px]'
                : 'pb-2'
          }`}
        >
            <div className="flex w-full flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              
              {/* Perfectly matched Search Bar */}
              <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0f11]/98 shadow-[0_20px_55px_-34px_rgba(0,0,0,0.95)]">
                {/* Notice the 'peer-focus' here - it makes the icon glow blue when typing */}
                <Search
                                className={`absolute left-4 transition-all duration-300 ${
                                  searchQuery.trim() ? 'text-emerald-400' : 'text-zinc-600'
                                }`}
                                size={14}
                              />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitBrowseParams({ q: searchQuery, page: 1 });
                    }
                  }}
                  placeholder="Search..."
                  autoComplete="off"
                  spellCheck={false}
                  // Added 'peer' here to trigger the icon color change
                  className="w-[240px] bg-transparent py-3 pl-11 pr-[7.25rem] text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none transition-all duration-500 placeholder:text-zinc-600 focus:w-[320px] focus:text-white md:w-[280px]"
                />
              </div>

              {/* Your FilterSelects go here... */}
              <FilterSelect
                dropdownKey="type"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={typeFilter}
                options={TYPE_OPTIONS}
                onChange={updateTypeFilter}
                className="w-[120px]"
              />
              <FilterSelect
                dropdownKey="genre"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={genreFilter}
                options={GENRE_OPTIONS}
                onChange={updateGenreFilter}
                className="w-[120px]"
              />
              <FilterSelect
                dropdownKey="status"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={statusFilter}
                options={STATUS_OPTIONS}
                onChange={updateStatusFilter}
                className="w-[120px]"
              />
              <FilterSelect
                dropdownKey="language"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={languageFilter}
                options={LANGUAGE_OPTIONS}
                onChange={updateLanguageFilter}
                className="w-[130px]"
              />
              <FilterSelect
                dropdownKey="year"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={yearFilter}
                options={[
                  { value: '', label: 'Year' },
                  ...Array.from({ length: 40 }, (_, index) => {
                    const year = String(new Date().getFullYear() - index);
                    return { value: year, label: year };
                  }),
                ]}
                onChange={updateYearFilter}
                className="w-[100px]"
              />
              <FilterSelect
                dropdownKey="length"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={lengthFilter}
                options={LENGTH_OPTIONS}
                onChange={updateLengthFilter}
                className="w-[140px]"
              />
              <FilterSelect
                dropdownKey="release"
                activeDropdown={activeDropdown}
                setActiveDropdown={setActiveDropdown}
                value={releaseFilter}
                options={RELEASE_OPTIONS}
                onChange={updateReleaseFilter}
                className="w-[140px]"
              />
            </div>
        </div>

        {error ? (
          <section className="rounded-[1.7rem] border border-red-500/20 bg-red-500/[0.05] px-6 py-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Browse Failed</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">AniList did not return a usable page.</h3>
            <p className="mt-3 text-sm text-zinc-300">{error}</p>
          </section>
        ) : loading ? (
          <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="h-48 animate-pulse rounded-[1.4rem] border border-white/[0.06] bg-white/[0.04]" />
            ))}
          </div>
        ) : mangaList.length ? (
          <>
            <div className="relative z-0 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mangaList.map((manga) => (
                <MangaListCard key={manga.mal_id} manga={manga} navigate={navigate} />
              ))}
            </div>

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
                          ? 'border-emerald-400/30 bg-emerald-400 text-[#04110d]'
                          : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
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
          <section className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border border-white/[0.06] bg-[#101114] px-6 py-12 text-center">
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
