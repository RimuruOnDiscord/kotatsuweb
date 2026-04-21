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
  { value: 'secret-genre', label: 'Secret' },
];

// Fallback Mapping for Jikan (MyAnimeList) API
const JIKAN_GENRE_MAP: Record<string, number> = {
  'action': 1, 'adventure': 2, 'comedy': 4, 'mystery': 7, 'drama': 8, 'ecchi': 9,
  'fantasy': 10, 'horror': 14, 'magic': 16, 'mecha': 18, 'music': 19, 'romance': 22,
  'sci-fi': 24, 'slice-of-life': 36, 'sports': 30, 'supernatural': 37, 'thriller': 46,
  'suspense': 46, 'avant-garde': 5, 'boys-love': 28, 'demons': 6, 'girls-love': 26,
  'gourmet': 47, 'harem': 35, 'isekai': 62, 'iyashikei': 63, 'josei': 42, 'kids': 15,
  'mahou-shoujo': 66, 'martial-arts': 17, 'military': 38, 'parody': 20, 'psychological': 40,
  'reverse-harem': 73, 'school': 23, 'seinen': 41, 'shoujo': 25, 'shounen': 27,
  'space': 29, 'super-power': 31, 'vampire': 32
};

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

const mapJikanMediaToBrowseManga = (manga: any): BrowseManga | null => {
  if (!manga.mal_id) return null;

  let originLabel = 'Japan';
  const t = manga.type?.toLowerCase();
  if (t === 'manhwa') originLabel = 'South Korea';
  else if (t === 'manhua') originLabel = 'China';
  else if (t === 'oel') originLabel = 'Global';

  const imageUrl = manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url || '';

  return {
    mal_id: manga.mal_id,
    title: manga.title_english || manga.title || 'Untitled',
    score: typeof manga.score === 'number' ? manga.score : undefined,
    chapters: manga.chapters ?? null,
    typeLabel: manga.type || 'Manga',
    statusLabel: manga.status || 'Unknown',
    originLabel,
    year: manga.published?.prop?.from?.year ?? null,
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
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={manga.title}
          className="h-full w-full object-cover transition-transform duration-700"
        />
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
              {manga.typeLabel}
            </span>
          </div>
          <h3
            className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90"
            style={{ fontFamily: 'var(--aw-font-display)' }}
          >
            {manga.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
            {[manga.originLabel, manga.year].filter(Boolean).join(' / ')}
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
              {manga.statusLabel?.toLowerCase() || "Unknown"}
            </span>
          </div>

          <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Started</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {manga.year || 'N/A'}
            </span>
          </div>

          <div className="min-w-0 pl-1 sm:pl-0">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Chapters</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-medium text-white" style={{ fontFamily: 'var(--aw-font-body)' }}>
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
      {manga.images.jpg.image_url ? (
        <img
          src={manga.images.jpg.image_url}
          alt={`${manga.title} banner`}
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
          {manga.title}
        </h3>

        <span className="mt-1 truncate text-[12px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
          {manga.chapters ?? '--'} Chapters Available
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
            style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-body)' }}
          >
            <Globe size={12} style={{ color: 'var(--aw-muted)' }} />
            {manga.originLabel}
          </span>
          <span
            className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors"
            style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-text)', fontFamily: 'var(--aw-font-body)' }}
          >
            <BookOpen size={12} style={{ color: 'var(--aw-muted)' }} />
            {manga.typeLabel}
          </span>
          {manga.statusLabel && (
            <span
              className="flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium"
              style={{ background: 'var(--aw-accent-dim)', borderColor: 'var(--aw-accent)', color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-body)' }}
            >
              <Activity size={12} />
              {manga.statusLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[12px] font-semibold" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)' }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--aw-accent)' }}>
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('browseViewMode') as 'list' | 'grid') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('browseViewMode', viewMode);
  }, [viewMode]);

  const committedQuery = searchParams.get('q') || '';
  const committedType = searchParams.get('format') || '';
  const committedGenres = parseMultiValueParam(searchParams.get('genres'));
  const legacyGenre = searchParams.get('genre') || '';
  const committedGenre = committedGenres.length ? committedGenres : legacyGenre ? [legacyGenre] : [];
  const committedGenreKey = committedGenre.join(',');
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

  const yearOptions = useMemo(
    () => [
      { value: '', label: 'Year' },
      ...Array.from({ length: 40 }, (_, index) => {
        const year = String(new Date().getFullYear() - index);
        return { value: year, label: year };
      }),
    ], []
  );

  // Inject Design Styles
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

  useEffect(() => {
    const id = 'browse-filter-control-style';
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
    setTypeFilter(committedType);
    setGenreFilter(committedGenre);
    setStatusFilter(committedStatus);
    setLanguageFilter(committedLanguage);
    setYearFilter(committedYear);
    setLengthFilter(committedLength);
    setReleaseFilter(committedRelease);
  }, [
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
  }, [currentPage, committedLanguage, committedLength, committedQuery, committedRelease, committedStatus, committedType, committedYear]);

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
    }, [
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
    }, [commitBrowseParams]
  );

  const updateTypeFilter = useCallback((value: string) => {
    setTypeFilter(value);
    commitBrowseParams({ format: value, page: 1 });
  }, [commitBrowseParams]);

  const updateGenreFilter = useCallback((value: string) => {
    const nextValue = value === ''
      ? []
      : genreFilter.includes(value)
        ? genreFilter.filter((entry) => entry !== value)
        : [...genreFilter, value];

    setGenreFilter(nextValue);
    commitBrowseParams({ genres: nextValue, page: 1 });
  }, [commitBrowseParams, genreFilter]);

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
    }, [commitBrowseParams, currentPage, pageInfo.lastPage]
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
    const selectedGenres = GENRE_OPTIONS.filter((option) => committedGenre.includes(option.value));

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

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: ANILIST_BROWSE_QUERY,
            variables,
          }),
          signal: controller.signal,
        });

        // Trigger Fallback if AniList Rate Limits
        if (response.status === 429) {
          throw new Error('AniList rate limit exceeded.');
        }

        const payload = await response.json();
        if (!response.ok || payload.errors?.length) {
          throw new Error(payload.errors?.[0]?.message || 'AniList browse request failed.');
        }

        const pagePayload = payload.data?.Page;
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

      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.warn('AniList request failed, falling back to MyAnimeList (Jikan):', err.message);

        // Fallback Logic -> Jikan API
        try {
          const jUrl = new URL('https://api.jikan.moe/v4/manga');
          jUrl.searchParams.set('page', String(currentPage));
          jUrl.searchParams.set('limit', String(ITEMS_PER_PAGE));

          if (committedQuery.trim()) {
            jUrl.searchParams.set('q', committedQuery.trim());
          }

          if (committedType === 'one-shot') jUrl.searchParams.set('type', 'oneshot');
          else if (committedLanguage === 'manhwa') jUrl.searchParams.set('type', 'manhwa');
          else if (committedLanguage === 'manhua') jUrl.searchParams.set('type', 'manhua');
          else if (committedType === 'manga' || committedLanguage === 'manga') jUrl.searchParams.set('type', 'manga');

          if (committedStatus === 'publishing') jUrl.searchParams.set('status', 'publishing');
          else if (committedStatus === 'finished') jUrl.searchParams.set('status', 'complete');
          else if (committedStatus === 'hiatus') jUrl.searchParams.set('status', 'hiatus');
          else if (committedStatus === 'cancelled') jUrl.searchParams.set('status', 'discontinued');
          else if (committedStatus === 'upcoming') jUrl.searchParams.set('status', 'upcoming');

          if (/^\d{4}$/.test(committedYear)) {
            jUrl.searchParams.set('start_date', `${committedYear}-01-01`);
            jUrl.searchParams.set('end_date', `${committedYear}-12-31`);
          }

          if (initialSort === 'start_date' || committedRelease === 'newest') {
            jUrl.searchParams.set('order_by', 'start_date');
            jUrl.searchParams.set('sort', 'desc');
          } else if (committedRelease === 'oldest') {
            jUrl.searchParams.set('order_by', 'start_date');
            jUrl.searchParams.set('sort', 'asc');
          } else if (initialSort === 'chapters') {
            jUrl.searchParams.set('order_by', 'chapters');
            jUrl.searchParams.set('sort', 'desc');
          } else {
            jUrl.searchParams.set('order_by', 'popularity');
            jUrl.searchParams.set('sort', 'asc');
          }

          const jikanGenresToInclude = committedGenre
            .map(g => JIKAN_GENRE_MAP[g])
            .filter(Boolean);

          if (jikanGenresToInclude.length > 0) {
            jUrl.searchParams.set('genres', jikanGenresToInclude.join(','));
          }
          if (committedGenre.includes('secret-genre')) {
            jUrl.searchParams.set('sfw', 'false');
          } else {
            jUrl.searchParams.set('sfw', 'true');
          }

          const jRes = await fetch(jUrl.toString(), { signal: controller.signal });
          if (!jRes.ok) throw new Error('Jikan API fallback failed.');
          const jData = await jRes.json();

          const mappedResults = Array.isArray(jData.data)
            ? jData.data.map(mapJikanMediaToBrowseManga).filter(Boolean) as BrowseManga[]
            : [];

          setMangaList(mappedResults);
          setPageInfo({
            currentPage: jData.pagination?.current_page || currentPage,
            lastPage: Math.max(1, jData.pagination?.last_visible_page || 1),
            hasNextPage: jData.pagination?.has_next_page || false,
            total: jData.pagination?.items?.total || 0,
          });

        } catch (fallbackErr: any) {
          if (controller.signal.aborted) return;
          setError('Failed to load browse results from both AniList and MyAnimeList (Jikan).');
          setMangaList([]);
          setPageInfo(PAGE_INFO_FALLBACK);
        }

      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [
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
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent-muted)]">
      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar
          searchQuery={topbarQuery}
          onSearchQueryChange={setTopbarQuery}
          onSearchSubmit={submitBrowseSearch}
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
            <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>All sources failed to respond.</h3>
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

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
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
                      onClick={() => goToPage(page)}
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
                onClick={() => goToPage(currentPage + 1)}
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
              <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Try a looser search, another genre, or a different region filter.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Browse;