/* --- START OF FILE DesktopTopbar.tsx --- */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Bell, User, Calendar, ArrowRight, Ghost, Users, Compass, ChevronDown, Home, CornerDownLeft, Building2, Film, Radio, Tags, Tv, SlidersHorizontal, History, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import FriendsModal from '../shared/FriendsModal';
import ProfileModal from '../shared/ProfileModal';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';
import NotificationDropdown, { INITIAL_NOTIFICATIONS, AppNotification } from '../shared/NotificationDropdown';
import { checkBookmarksForUpdates } from '../../utils/bookmarkUpdateChecker';
import { fetchAnimeSuggestions, fetchAnimeByStudio } from '../../utils/animeApi';
import { supabase } from '../../lib/supabase';
import { clearRecentSearch, readRecentSearches, saveRecentSearch, type RecentSearchEntry } from '../../utils/recentSearches';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';
const RECENT_SEARCHES_INITIAL_VISIBLE = 4;
const RECENT_SEARCHES_REVEAL_STEP = 6;

type SearchMode = 'anime' | 'users' | 'studio';
type FilterToken = {
  key: string;
  aliases?: string[];
  mode: SearchMode;
  icon: React.ElementType;
  label: string;
  discordTitle: string;
  discordSyntax: string;
  values?: { value: string; label: string; browseParam?: string }[];
  browseParam?: string;
};
type AppliedSearchFilter = {
  key: string;
  label: string;
  value: string;
  displayValue: string;
  browseParam?: string;
  icon: React.ElementType;
};

const STATIC_FILTER_VALUES = {
  status: [
    { value: 'RELEASING', label: 'Airing now' },
    { value: 'FINISHED', label: 'Finished' },
    { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  ],
  format: [
    { value: 'TV', label: 'TV' },
    { value: 'MOVIE', label: 'Movie' },
    { value: 'OVA', label: 'OVA' },
    { value: 'ONA', label: 'ONA' },
    { value: 'SPECIAL', label: 'Special' },
  ],
  genre: [
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'drama', label: 'Drama' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'romance', label: 'Romance' },
    { value: 'sci-fi', label: 'Sci-Fi' },
    { value: 'slice-of-life', label: 'Slice of Life' },
    { value: 'sports', label: 'Sports' },
  ],
  season: [
    { value: 'WINTER', label: 'Winter' },
    { value: 'SPRING', label: 'Spring' },
    { value: 'SUMMER', label: 'Summer' },
    { value: 'FALL', label: 'Fall' },
  ],
  studio: [
    { value: 'MAPPA', label: 'MAPPA' },
    { value: 'Ufotable', label: 'Ufotable' },
    { value: 'Bones', label: 'Bones' },
    { value: 'A-1 Pictures', label: 'A-1 Pictures' },
    { value: 'Kyoto Animation', label: 'Kyoto Animation' },
    { value: 'Wit Studio', label: 'Wit Studio' },
    { value: 'TRIGGER', label: 'TRIGGER' },
    { value: 'CloverWorks', label: 'CloverWorks' },
    { value: 'Production I.G', label: 'Production I.G' },
    { value: 'J.C.Staff', label: 'J.C.Staff' },
    { value: 'Madhouse', label: 'Madhouse' },
    { value: 'Sunrise', label: 'Sunrise' },
    { value: 'OLM', label: 'OLM' },
    { value: 'Toei Animation', label: 'Toei Animation' },
  ],
} satisfies Record<string, { value: string; label: string; }[]>;

const currentYear = new Date().getFullYear();
const YEAR_FILTER_VALUES = Array.from({ length: 12 }, (_, index) => {
  const year = String(currentYear - index);
  return { value: year, label: year };
});

const searchFilterOptions: FilterToken[] = [
  { key: 'user', aliases: ['from'], mode: 'users', icon: User, label: 'User', discordTitle: 'From a specific user', discordSyntax: 'user: name' },
  { key: 'studio', mode: 'studio', icon: Building2, label: 'Studio', discordTitle: 'From a specific studio', discordSyntax: 'studio: name', browseParam: 'studio', values: STATIC_FILTER_VALUES.studio },
  { key: 'genre', mode: 'anime', icon: Tags, label: 'Genre', discordTitle: 'Includes a specific genre', discordSyntax: 'genre: action, etc', values: STATIC_FILTER_VALUES.genre, browseParam: 'genres' },
  { key: 'year', mode: 'anime', icon: Film, label: 'Release year', discordTitle: 'Specific release year', discordSyntax: 'year: 2024', values: YEAR_FILTER_VALUES, browseParam: 'year' },
  { key: 'status', mode: 'anime', icon: Radio, label: 'Airing status', discordTitle: 'Current airing status', discordSyntax: 'status: releasing, finished...', values: STATIC_FILTER_VALUES.status, browseParam: 'status' },
  { key: 'format', mode: 'anime', icon: Tv, label: 'Format', discordTitle: 'Specific format', discordSyntax: 'format: tv, movie...', values: STATIC_FILTER_VALUES.format, browseParam: 'format' },
  { key: 'season', mode: 'anime', icon: Calendar, label: 'Season', discordTitle: 'From a specific season', discordSyntax: 'season: winter, spring...', values: STATIC_FILTER_VALUES.season, browseParam: 'season' },
];

const getStudioName = (anime: any): string => {
  if (!anime.studios) return '';
  if (Array.isArray(anime.studios)) {
    const first = anime.studios[0];
    return typeof first === 'object' ? first?.name || '' : String(first || '');
  }
  if (anime.studios?.nodes?.length) {
    const main = anime.studios.nodes.find((s: any) => s.isAnimationStudio) || anime.studios.nodes[0];
    return main?.name || '';
  }
  if (typeof anime.studios === 'string') return anime.studios;
  return '';
};

const normalizeFilterValue = (value: string) => value.trim().toLowerCase();

const getFilterByKey = (key?: string) => {
  if (!key) return undefined;
  const normalizedKey = key.toLowerCase();
  return searchFilterOptions.find((option) => option.key === normalizedKey || option.aliases?.includes(normalizedKey));
};

const parseSearchSyntax = (rawQuery: string) => {
  const query = rawQuery.trimStart();
  const match = query.match(/^([a-z]+):\s*(.*)$/i);
  if (!match) return { filter: undefined, value: query, hasExplicitFilter: false };

  const filter = getFilterByKey(match[1]);
  return { filter, value: match[2] ?? '', hasExplicitFilter: Boolean(filter) };
};

const buildFilterQuery = (key: string) => `${key}: `;

const getBrowseParamsForSearch = (rawQuery: string) => {
  const parsed = parseSearchSyntax(rawQuery);
  const value = (parsed.hasExplicitFilter ? parsed.value : rawQuery).trim();
  if (!value || parsed.filter?.mode === 'users') return null;

  const params = new URLSearchParams();
  if (parsed.filter?.browseParam === 'studio') {
    params.set('studio', value);
  } else if (parsed.filter?.browseParam === 'genres') {
    const matchedValue = parsed.filter.values?.find((option) => normalizeFilterValue(option.label) === normalizeFilterValue(value) || normalizeFilterValue(option.value) === normalizeFilterValue(value));
    params.set('genres', matchedValue?.value || value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  } else if (parsed.filter?.browseParam) {
    const matchedValue = parsed.filter.values?.find((option) => normalizeFilterValue(option.label) === normalizeFilterValue(value) || normalizeFilterValue(option.value) === normalizeFilterValue(value));
    params.set(parsed.filter.browseParam, matchedValue?.value || value);
  } else {
    params.set('q', value);
  }

  return params;
};

const dropdownVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98, pointerEvents: 'none' },
  visible: {
    opacity: 1, y: 0, scale: 1, pointerEvents: 'auto',
    transition: { type: 'spring', damping: 26, stiffness: 340, staggerChildren: 0.045, delayChildren: 0.02 }
  },
  exit: {
    opacity: 0, y: 6, scale: 0.98, pointerEvents: 'none',
    transition: { duration: 0.12, ease: 'easeIn' }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -7 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 22, stiffness: 360 } }
} as const;

const discoverDropdownVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96, pointerEvents: 'none' },
  visible: {
    opacity: 1, y: 0, scale: 1, pointerEvents: 'auto',
    transition: { type: 'spring', damping: 28, stiffness: 400, staggerChildren: 0.05 }
  },
  exit: {
    opacity: 0, y: 8, scale: 0.96, pointerEvents: 'none',
    transition: { duration: 0.15, ease: 'easeIn' }
  }
} as const;

const discoverItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
} as const;

const ActionTooltip = ({ label, hidden }: { label: string, hidden?: boolean }) => {
  if (hidden) return null;
  const bgColor = 'color-mix(in srgb, var(--app-bg, #09090b) 85%, transparent)';
  const borderColor = 'rgba(255, 255, 255, 0.1)';

  return (
    <div className="absolute top-[calc(100%+12px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-[200] flex flex-col items-center">
      <div
        className="w-2.5 h-2.5 rotate-45 border-l border-t z-[202] backdrop-blur-md shadow-[-2px_-2px_4px_rgba(0,0,0,0.2)]"
        style={{ backgroundColor: bgColor, borderColor: borderColor, marginBottom: '-6px' }}
      />
      <div
        className="relative text-[11.5px] font-bold tracking-wide px-3.5 py-1.5 rounded-[8px] border whitespace-nowrap backdrop-blur-md z-[201] shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
        style={{ fontFamily: TOPBAR_FONT, backgroundColor: bgColor, borderColor: borderColor, color: '#FFFFFF' }}
      >
        <div
          className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-3 h-[1.5px] z-[203]"
          style={{ backgroundColor: bgColor }}
        />
        {label}
      </div>
    </div>
  );
};

interface DesktopTopbarProps {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  clearSearch?: () => void;
  showSearch?: boolean;
  setShowSearch?: (value: boolean) => void;
}

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string; active?: boolean }> = ({ icon: Icon, label, to, active }) => {
  return (
    <NavLink to={to} style={{ fontFamily: TOPBAR_FONT }} className="relative flex items-center justify-center outline-none">
      {({ isActive: routerIsActive }) => {
        const isActive = active !== undefined ? active : routerIsActive;

        return (
          <motion.div
            layout
            className="group relative flex items-center gap-2.5 px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 z-10 cursor-pointer"
            whileHover={{ scale: 1.01, y: -0.5 }}
            whileTap={{ scale: 0.98, y: 0 }}
          >
            {isActive && (
              <motion.div
                layoutId="desktopActiveNavPill"
                className="absolute inset-0 rounded-full z-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.035),0_12px_28px_-22px_var(--app-accent,#8b5cf6)]"
                style={{
                  background: 'linear-gradient(180deg, var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 15%, transparent)), color-mix(in srgb, var(--app-accent, #8b5cf6) 9%, transparent))',
                  border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 30%, transparent))',
                  backdropFilter: 'blur(16px) saturate(145%)'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            {!isActive && (
              <div className="absolute inset-0 rounded-full bg-white/[0.04] opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 z-0 border border-transparent group-hover:border-white/[0.055] group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" />
            )}

            <Icon className={`relative z-10 h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-[8deg] ${isActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 group-hover:text-white'}`} />
            <span className={`relative z-10 tracking-wide transition-colors duration-200 ${isActive ? 'text-[var(--app-accent,#8b5cf6)] drop-shadow-sm' : 'text-zinc-400 group-hover:text-white'}`}>
              {label}
            </span>
          </motion.div>
        );
      }}
    </NavLink>
  );
};

const DiscoverDropdownLink: React.FC<{ icon: React.ElementType; label: string; description: string; to: string; onClick: () => void }> = ({ icon: Icon, label, description, to, onClick }) => (
  <NavLink to={to} onClick={onClick} className="outline-none block w-full mb-1 last:mb-0">
    {({ isActive }) => (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="group relative flex items-center gap-3.5 px-3 py-2.5 rounded-[12px] transition-all duration-300 hover:bg-white/[0.06] overflow-hidden"
      >
        {isActive && (
          <div className="absolute inset-0 rounded-[12px] bg-[var(--app-accent,#8b5cf6)] opacity-[0.12] z-0" />
        )}
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] transition-all duration-300 z-0 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0'}`} />

        <div
          className={`relative z-10 flex shrink-0 items-center justify-center w-[40px] h-[40px] rounded-[10px] transition-all duration-300 border ${isActive
            ? 'text-[var(--app-accent,#8b5cf6)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
            : 'border-white/[0.05] text-zinc-300 group-hover:text-white group-hover:bg-white/[0.14] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          style={isActive ? { backgroundColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 90%)', borderColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 75%)' } : { backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <Icon className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? '' : 'group-hover:scale-110 group-hover:-rotate-3'}`} />
        </div>

        <div className={`relative z-10 flex flex-col flex-1 min-w-0 pr-2 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
          <span className={`text-[13.5px] font-medium tracking-wide transition-colors truncate ${isActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-white/95 group-hover:text-white'}`} style={{ fontFamily: TOPBAR_FONT }}>
            {label}
          </span>
          <span className={`text-[11.5px] font-medium transition-colors truncate mt-[2px] ${isActive ? 'text-[var(--app-accent,#8b5cf6)]/80' : 'text-zinc-400 group-hover:text-zinc-300'}`} style={{ fontFamily: TOPBAR_FONT }}>
            {description}
          </span>
        </div>

        <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.08] text-zinc-300 transition-all duration-300 group-hover:text-white group-hover:bg-white/[0.15] ${isActive ? 'opacity-100 translate-x-0 text-white bg-white/[0.08]' : 'opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0'}`}>
          <ArrowRight size={13} />
        </div>
      </motion.div>
    )}
  </NavLink>
);

const DesktopTopbar: React.FC<DesktopTopbarProps> = ({
  searchQuery = '',
  onSearchQueryChange = () => { },
  clearSearch = () => { },
  setShowSearch = () => { },
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [showAllFilters, setShowAllFilters] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [pendingFrCount, setPendingFrCount] = useState(0);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<'rate_limit' | 'error' | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [visibleRecentSearchCount, setVisibleRecentSearchCount] = useState(RECENT_SEARCHES_INITIAL_VISIBLE);
  const [appliedFilters, setAppliedFilters] = useState<AppliedSearchFilter[]>([]);
  const [allSelected, setAllSelected] = useState(false);

  const historyRef = useRef<{ query: string; filters: AppliedSearchFilter[] }[]>([{ query: searchQuery, filters: [] }]);
  const historyIndexRef = useRef(0);
  const isUndoRedoRef = useRef(false);

  const { brandName } = useContentMode();
  const { user, profile } = useAuth();

  const totalUnreadCount = notifications.filter(n => n.unread).length + pendingFrCount;
  const hasRecentSearches = recentSearches.length > 0;

  const parsedSearch = useMemo(() => parseSearchSyntax(searchQuery), [searchQuery]);
  const activeFilter = parsedSearch.filter;
  const activeSearchValue = parsedSearch.value;
  const hasSearchInput = activeSearchValue.trim().length > 0;
  const activeFilterValues = activeFilter?.values || [];
  const visibleRecentSearches = recentSearches.slice(0, visibleRecentSearchCount);
  const hiddenRecentSearchCount = Math.max(recentSearches.length - visibleRecentSearchCount, 0);

  const hasStudioPillOnly = appliedFilters.length === 1 && appliedFilters[0].key === 'studio';
  const activeSearchMode = activeFilter?.mode || (hasStudioPillOnly && !hasSearchInput ? 'studio' : 'anime');
  const showDiscordMenu = !hasSearchInput && !activeFilter && !hasStudioPillOnly;
  const visibleDiscordFilters = showAllFilters ? searchFilterOptions : searchFilterOptions.slice(0, 3);

  const filteredActiveFilterValues = activeFilterValues.filter((option) => {
    const value = normalizeFilterValue(activeSearchValue);
    if (!value) return true;
    return normalizeFilterValue(option.label).includes(value) || normalizeFilterValue(option.value).includes(value);
  });

  const filterSuggestions = useMemo(() => {
    if (!activeSearchValue) return [];

    const query = normalizeFilterValue(activeSearchValue);
    const suggestions: AppliedSearchFilter[] = [];

    if (activeFilter) {
      if (activeFilter.key === 'studio' && activeSearchValue.length > 0) {
        suggestions.push({
          key: 'studio',
          label: 'Studio',
          value: activeSearchValue.trim(),
          displayValue: activeSearchValue.trim(),
          browseParam: activeFilter.browseParam,
          icon: activeFilter.icon,
        });
      }
      if (activeFilter.key === 'year' && /^(19|20)\d{2}$/.test(query)) {
        suggestions.push({
          key: 'year',
          label: 'Release year',
          value: activeSearchValue.trim(),
          displayValue: activeSearchValue.trim(),
          browseParam: activeFilter.browseParam,
          icon: activeFilter.icon,
        });
      }
      return suggestions;
    }

    const hasYearPill = appliedFilters.some(f => f.key === 'year');
    if (!hasYearPill && /^(19|20)\d{2}$/.test(query)) {
      const yearFilter = getFilterByKey('year');
      if (yearFilter) {
        suggestions.push({
          key: 'year',
          label: 'Release year',
          value: query,
          displayValue: query,
          browseParam: yearFilter.browseParam,
          icon: yearFilter.icon,
        });
      }
    }

    const hasStudioPill = appliedFilters.some(f => f.key === 'studio');
    const studioFilter = getFilterByKey('studio');
    if (!hasStudioPill && studioFilter && query.length > 2) {
      suggestions.push({
        key: 'studio',
        label: 'Studio',
        value: activeSearchValue.trim(),
        displayValue: activeSearchValue.trim(),
        browseParam: studioFilter.browseParam,
        icon: studioFilter.icon,
      });
    }

    searchFilterOptions.forEach((filter) => {
      if (!filter.values) return;
      const categoryAlreadyHasPill = appliedFilters.some(a => a.key === filter.key);
      if (['format', 'status', 'season'].includes(filter.key) && categoryAlreadyHasPill) return;

      filter.values.forEach((option) => {
        const optionMatches = normalizeFilterValue(option.label).includes(query) || normalizeFilterValue(option.value).includes(query);
        const alreadyApplied = appliedFilters.some((applied) => applied.key === filter.key && normalizeFilterValue(applied.value) === normalizeFilterValue(option.value));

        if (optionMatches && !alreadyApplied) {
          suggestions.push({
            key: filter.key,
            label: filter.label,
            value: option.value,
            displayValue: option.label,
            browseParam: filter.browseParam,
            icon: filter.icon,
          });
        }
      });
    });

    return suggestions.slice(0, 4);
  }, [appliedFilters, activeSearchValue, activeFilter]);

  const normalizeRoute = (p: string) => {
    if (p === '/' || p === '/anihome') return '/home';
    if (p === '/anibrowse') return '/browse';
    if (p === '/anirandom') return '/random';
    return p;
  };

  const isHomeActive = location.pathname === '/' || location.pathname.startsWith('/home') || location.pathname.startsWith('/anihome');
  const isDiscoverActive = ['/browse', '/schedule', '/random'].some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
        setIsSearchFocused(false);
        setShowSearch(false);
        setShowAllFilters(false);
        setAllSelected(false);
      }
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setIsDiscoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = historyRef.current[historyIndexRef.current];
      const sameFilters = current && JSON.stringify(current.filters) === JSON.stringify(appliedFilters);

      if (isUndoRedoRef.current) {
        if (current && current.query === searchQuery && sameFilters) {
          isUndoRedoRef.current = false;
        }
        return;
      }

      if (current && current.query === searchQuery && sameFilters) {
        return;
      }

      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      newHistory.push({ query: searchQuery, filters: appliedFilters });
      if (newHistory.length > 100) newHistory.shift();

      historyRef.current = newHistory;
      historyIndexRef.current = newHistory.length - 1;
    }, 50);
    return () => clearTimeout(timer);
  }, [searchQuery, appliedFilters]);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevState = historyRef.current[historyIndexRef.current];

      if (prevState.query !== searchQuery || JSON.stringify(prevState.filters) !== JSON.stringify(appliedFilters)) {
        isUndoRedoRef.current = true;
        onSearchQueryChange(prevState.query);
        setAppliedFilters(prevState.filters);
        setTimeout(() => { isUndoRedoRef.current = false; }, 200);
      }
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextState = historyRef.current[historyIndexRef.current];

      if (nextState.query !== searchQuery || JSON.stringify(nextState.filters) !== JSON.stringify(appliedFilters)) {
        isUndoRedoRef.current = true;
        onSearchQueryChange(nextState.query);
        setAppliedFilters(nextState.filters);
        setTimeout(() => { isUndoRedoRef.current = false; }, 200);
      }
    }
  };

  useEffect(() => {
    checkBookmarksForUpdates(setNotifications);
    const intervalId = window.setInterval(() => checkBookmarksForUpdates(setNotifications), 1_800_000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const syncRecentSearches = () => setRecentSearches(readRecentSearches());
    syncRecentSearches();
    window.addEventListener('storage', syncRecentSearches);
    window.addEventListener('recent-searches-changed', syncRecentSearches);
    return () => {
      window.removeEventListener('storage', syncRecentSearches);
      window.removeEventListener('recent-searches-changed', syncRecentSearches);
    };
  }, []);

  useEffect(() => {
    setVisibleRecentSearchCount(RECENT_SEARCHES_INITIAL_VISIBLE);
  }, [isSearchDropdownOpen, searchQuery, appliedFilters.length]);

  useEffect(() => {
    if (!user?.id) {
      setPendingFrCount(0);
      return;
    }

    const fetchFrCount = async () => {
      const { count } = await supabase
        .from('friendships')
        .select('*', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      setPendingFrCount(count || 0);
    };

    fetchFrCount();

    const channel = supabase.channel('public:friendships_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${user.id}` }, () => {
        fetchFrCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    const suggestionQuery = activeSearchValue.trim();
    const studioPill = appliedFilters.find(f => f.key === 'studio');
    const isFetchingStudioPill = appliedFilters.length === 1 && studioPill && !suggestionQuery;

    if ((!suggestionQuery || suggestionQuery.length < 2 || activeFilterValues.length > 0) && !isFetchingStudioPill) {
      setSuggestions([]);
      setUserSuggestions([]);
      return;
    }

    const abortController = new AbortController();

    const timer = setTimeout(async () => {
      setSuggestionsError(null);
      setIsLoadingSuggestions(true);
      try {
        if (activeSearchMode === 'anime') {
          const res = await fetchAnimeSuggestions(suggestionQuery, abortController.signal);
          let parsedResults: any[] = [];
          if (Array.isArray(res)) parsedResults = res;
          else if (res && Array.isArray((res as any).results)) parsedResults = (res as any).results;
          else if (res && Array.isArray((res as any).data)) parsedResults = (res as any).data;
          else if (res && Array.isArray((res as any).suggestions)) parsedResults = (res as any).suggestions;

          const showNSFW = localStorage.getItem('nsfwShowContent') === 'true';
          // STRICT LOCAL FILTERING
          parsedResults = parsedResults.filter((anime: any) => {
            if (!showNSFW) {
              if (anime.isAdult === true) return false;
              if (typeof anime.format === 'string' && anime.format.toUpperCase() === 'HENTAI') return false;
              if (Array.isArray(anime.genres) && anime.genres.some((g: string) => g.toLowerCase() === 'hentai' || g.toLowerCase() === 'erotica')) return false;
            }

            for (const filter of appliedFilters) {
              if (filter.key === 'studio') {
                const studioName = getStudioName(anime).toLowerCase();
                // Allow it to pass if the API omits the studio to avoid breaking text queries (false negatives)
                if (studioName && !studioName.includes(filter.value.toLowerCase())) {
                  return false;
                }
              }
              if (filter.key === 'year') {
                const year = anime.year || anime.seasonYear || anime.startDate?.year;
                if (!year || String(year) !== filter.value) return false;
              }
              if (filter.key === 'format') {
                if (!anime.format || anime.format.toLowerCase() !== filter.value.toLowerCase()) return false;
              }
              if (filter.key === 'genre' && anime.genres !== undefined) {
                if (!anime.genres.some((g: string) => g.toLowerCase() === filter.value.toLowerCase())) return false;
              }
            }
            return true;
          });

          setSuggestions(parsedResults);
          setUserSuggestions([]);
        } else if (activeSearchMode === 'studio') {
          const queryToUse = isFetchingStudioPill ? studioPill!.value : suggestionQuery;
          const studioAnime = await fetchAnimeByStudio(queryToUse, 8);
          setSuggestions(studioAnime.results);
          setUserSuggestions([]);
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${suggestionQuery}%`)
            .limit(5);

          if (!error && data) {
            setUserSuggestions(data);
          } else {
            setUserSuggestions([]);
          }
          setSuggestions([]);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          setSuggestions([]);
          setUserSuggestions([]);
          if (error.message?.includes('429')) {
            setSuggestionsError('rate_limit');
          } else {
            setSuggestionsError('error');
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [activeFilterValues.length, activeSearchMode, activeSearchValue, appliedFilters]);

  const getBrowseParamsFromSearchState = () => {
    const params = new URLSearchParams();
    const query = activeSearchValue.trim();
    if (query && activeSearchMode === 'anime') params.set('q', query);

    appliedFilters.forEach((filter) => {
      if (!filter.browseParam) return;
      if (filter.browseParam === 'genres') {
        const existing = params.get('genres');
        const values = existing ? existing.split(',') : [];
        if (!values.includes(filter.value)) values.push(filter.value);
        params.set('genres', values.join(','));
      } else {
        params.set(filter.browseParam, filter.value);
      }
    });

    return params;
  };

  const handleSearchSubmit = () => {
    const params = appliedFilters.length > 0
      ? getBrowseParamsFromSearchState()
      : getBrowseParamsForSearch(searchQuery);

    if (!params || Array.from(params.keys()).length === 0) return;

    const queryToSave = activeSearchValue.trim();
    if (queryToSave) setRecentSearches(saveRecentSearch(queryToSave));

    navigate(`/browse?${params.toString()}`);
    setIsSearchDropdownOpen(false);
    setIsSearchFocused(false);
    inputRef.current?.blur();
  };

  const handleResultClick = (id: string | number, title?: string, cover?: string) => {
    if (title) setRecentSearches(saveRecentSearch(title, { id, title, cover: cover || '' }));
    const slug = title
      ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : String(id);
    // Dismiss UI immediately — blur before state resets to prevent onFocus re-opening dropdown
    inputRef.current?.blur();
    setIsSearchDropdownOpen(false);
    setIsSearchFocused(false);
    clearSearch();
    setAppliedFilters([]);
    setSuggestions([]);
    setUserSuggestions([]);
    navigate(`/watch/${slug}`);
  };

  const handleUserResultClick = (id: string) => {
    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: id } }));
    setIsSearchDropdownOpen(false);
    setIsSearchFocused(false);
    clearSearchInput();
  };

  const handleRecentSearchClick = (query: string) => {
    onSearchQueryChange(query);
    setRecentSearches(saveRecentSearch(query));
    inputRef.current?.focus();
  };

  const removeRecentSearch = (event: React.MouseEvent, query: string) => {
    event.stopPropagation();
    setRecentSearches(clearRecentSearch(query));
  };

  const clearSearchInput = () => {
    clearSearch();
    setAppliedFilters([]);
    setSuggestions([]);
    setUserSuggestions([]);
    setShowAllFilters(false);
    setIsSearchDropdownOpen(false);
    setAllSelected(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addAppliedFilter = (filter: AppliedSearchFilter) => {
    setAppliedFilters((current) => {
      const keepExisting = filter.key === 'genre'
        ? current
        : current.filter((item) => item.key !== filter.key);
      const alreadyExists = keepExisting.some((item) => item.key === filter.key && normalizeFilterValue(item.value) === normalizeFilterValue(filter.value));
      return alreadyExists ? keepExisting : [...keepExisting, filter];
    });
    onSearchQueryChange('');
    setSuggestions([]);
    setUserSuggestions([]);
    setShowAllFilters(false);
    setIsSearchDropdownOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const removeAppliedFilter = (key: string, value: string) => {
    setAppliedFilters((current) => current.filter((filter) => !(filter.key === key && filter.value === value)));
    setIsSearchDropdownOpen(true);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const applyFilterValue = (value: string, displayValue?: string) => {
    if (!activeFilter) return;
    addAppliedFilter({
      key: activeFilter.key,
      label: activeFilter.label,
      value,
      displayValue: displayValue || value,
      browseParam: activeFilter.browseParam,
      icon: activeFilter.icon,
    });
  };
  const MAX_DISPLAY = 5;
  const displayResults = suggestions.slice(0, MAX_DISPLAY);
  const studioResults = activeSearchMode === 'studio' ? suggestions.slice(0, MAX_DISPLAY) : [];

  const showFooter = hasSearchInput || appliedFilters.length > 0;
  const footerText = (displayResults.length > 0 || studioResults.length > 0 || userSuggestions.length > 0)
    ? 'See all results'
    : 'Search full catalog';
  const pillStyle = {
    height: 42,
    borderRadius: '9999px',
    backgroundColor: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)'
  };

  const homeItem = topbarNavItems.find(i => normalizeRoute(i.to) === '/home') || { icon: Home, label: 'Home', to: '/home' };
  const browseItem = topbarNavItems.find(i => normalizeRoute(i.to) === '/browse') || { icon: Compass, label: 'Browse', to: '/browse' };
  const randomItem = topbarNavItems.find(i => i.label === 'Random') || { icon: Ghost, label: 'Random', to: '/random' };
  const scheduleItem = topbarNavItems.find(i => i.label === 'Schedule') || { icon: Calendar, label: 'Schedule', to: '/schedule' };

  const ignoredRoutes = ['/home', '/browse', '/random', '/schedule', '/discover'];
  const otherItems = topbarNavItems.filter(i => {
    const route = normalizeRoute(i.to);
    return !ignoredRoutes.some(ignored => route.startsWith(ignored)) && !['Added', 'Updated', 'Discover'].includes(i.label);
  });

  let activeDiscoverLabel = 'Discover';
  let ActiveDiscoverIcon = Compass;

  if (location.pathname.startsWith('/browse')) {
    activeDiscoverLabel = 'Browse';
    ActiveDiscoverIcon = browseItem.icon;
  } else if (location.pathname.startsWith('/schedule')) {
    activeDiscoverLabel = 'Schedule';
    ActiveDiscoverIcon = scheduleItem.icon;
  } else if (location.pathname.startsWith('/random')) {
    activeDiscoverLabel = 'Random';
    ActiveDiscoverIcon = randomItem.icon;
  } else if (isDiscoverActive) {
    activeDiscoverLabel = 'Discover';
    ActiveDiscoverIcon = Compass;
  }

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1460px] lg:flex items-center justify-between px-6 py-4 relative z-50">

        {/* ────────────── LEFT ────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          <motion.button
            whileHover={{ scale: 1.02, y: -0.5 }}
            whileTap={{ scale: 0.98, y: 0 }}
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 group outline-none"
          >
            <BrandLogo />
            <span className="text-[20px] font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent,#8b5cf6)]" style={{ fontFamily: DISPLAY_FONT }}>
              {brandName}
            </span>
          </motion.button>

          <div className="h-6 w-px shrink-0 bg-white/[0.08]" />

          <nav className="flex items-center gap-1.5 relative">
            <DesktopNavLink
              icon={homeItem.icon}
              label={homeItem.label}
              to={homeItem.to}
              active={isHomeActive}
            />

            {/* DISCOVER (Hover Dropdown) */}
            <motion.div
              layout
              ref={discoverRef}
              className="relative z-50 flex items-center h-full"
              onMouseEnter={() => setIsDiscoverOpen(true)}
              onMouseLeave={() => setIsDiscoverOpen(false)}
            >
              <motion.button
                layout
                onClick={() => setIsDiscoverOpen(!isDiscoverOpen)}
                className={`group relative flex items-center px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 z-10 outline-none'}`}
                whileHover={{ scale: 1.01, y: -0.5 }}
                whileTap={{ scale: 0.98, y: 0 }}
                style={{ fontFamily: TOPBAR_FONT }}
              >
                {isDiscoverActive && (
                  <motion.div
                    layoutId="desktopActiveNavPill"
                    className="absolute inset-0 rounded-full z-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.035),0_12px_28px_-22px_var(--app-accent,#8b5cf6)]"
                    style={{
                      background: 'linear-gradient(180deg, var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 15%, transparent)), color-mix(in srgb, var(--app-accent, #8b5cf6) 9%, transparent))',
                      border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 30%, transparent))',
                      backdropFilter: 'blur(16px) saturate(145%)'
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {!isDiscoverActive && (
                  <div className={`absolute inset-0 rounded-full bg-white/[0.04] transition-all duration-300 z-0 border border-transparent group-hover:border-white/[0.055] group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${isDiscoverOpen ? 'opacity-100 scale-100 border-white/[0.06]' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
                    }`} />
                )}

                <div className="relative z-10 flex items-center gap-2.5">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={activeDiscoverLabel}
                      initial={{ opacity: 0, y: -10, filter: 'blur(2px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: 10, filter: 'blur(2px)' }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="flex items-center gap-2.5"
                    >
                      <ActiveDiscoverIcon className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-12 ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 group-hover:text-white'}`} />
                      <span className={`tracking-wide whitespace-nowrap ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)] drop-shadow-sm' : 'text-zinc-400 group-hover:text-white'}`}>
                        {activeDiscoverLabel}
                      </span>
                    </motion.div>
                  </AnimatePresence>

                  <motion.div layout className="flex items-center justify-center">
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${isDiscoverOpen ? 'rotate-180 text-white' : ''} ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-500 group-hover:text-white'}`} />
                  </motion.div>
                </div>
              </motion.button>

              <AnimatePresence>
                {isDiscoverOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-[100]">
                    <motion.div
                      variants={discoverDropdownVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="w-[280px] rounded-[18px] overflow-hidden flex flex-col p-1.5 shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--app-bg, #09090b) 90%, transparent)',
                        backdropFilter: 'blur(40px) saturate(150%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 24px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
                      }}
                    >
                      <motion.div variants={discoverItemVariants}>
                        <DiscoverDropdownLink
                          icon={browseItem.icon}
                          label="Browse"
                          description="Explore the entire catalog"
                          to={normalizeRoute(browseItem.to)}
                          onClick={() => setIsDiscoverOpen(false)}
                        />
                      </motion.div>
                      <motion.div variants={discoverItemVariants}>
                        <DiscoverDropdownLink
                          icon={scheduleItem.icon}
                          label="Schedule"
                          description="Track airing anime episodes"
                          to={normalizeRoute(scheduleItem.to)}
                          onClick={() => setIsDiscoverOpen(false)}
                        />
                      </motion.div>
                      <motion.div variants={discoverItemVariants}>
                        <DiscoverDropdownLink
                          icon={randomItem.icon}
                          label="Random"
                          description="Find something new to watch"
                          to={normalizeRoute(randomItem.to)}
                          onClick={() => setIsDiscoverOpen(false)}
                        />
                      </motion.div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>

            {otherItems.map(item => (
              <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={normalizeRoute(item.to)} />
            ))}
          </nav>
        </div>

        {/* ────────────── RIGHT ────────────── */}
        <div className="flex shrink-0 items-center gap-3.5">

          {/* Search Container */}
          <div ref={searchRef} className="relative flex items-center">
            <div
              className={`aw-material-control relative flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSearchFocused || searchQuery.length > 0 || appliedFilters.length > 0 ? 'w-[430px]' : 'w-[280px]'
                }`}
              style={{
                ...pillStyle,
                backgroundColor: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02), 0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex shrink-0 items-center justify-center h-full w-[40px] text-zinc-400 transition-colors duration-300">
                <Search size={16} />
              </div>

              <AnimatePresence mode="popLayout">
                {appliedFilters.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <motion.button
                      key={`${filter.key}-${filter.value}`}
                      type="button"
                      layout
                      initial={{ opacity: 0, scale: 0.75, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: { type: 'spring', damping: 18, stiffness: 380 } }}
                      exit={{ opacity: 0, scale: 0.7, filter: 'blur(3px)', transition: { duration: 0.15, ease: 'easeIn' } }}
                      whileHover={{ scale: 1.04, transition: { type: 'spring', damping: 20, stiffness: 400 } }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => removeAppliedFilter(filter.key, filter.value)}
                      className="mr-1.5 flex max-w-[150px] shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 text-[11.5px] font-medium text-white outline-none"
                      style={{
                        fontFamily: TOPBAR_FONT,
                        backgroundColor: allSelected ? 'color-mix(in srgb, var(--app-accent, #8b5cf6) 50%, transparent)' : 'color-mix(in srgb, var(--app-accent, #8b5cf6) 20%, transparent)',
                        borderColor: allSelected ? 'rgba(255, 255, 255, 0.6)' : 'color-mix(in srgb, var(--app-accent, #8b5cf6) 40%, transparent)',
                        boxShadow: allSelected ? '0 0 0 1px rgba(255, 255, 255, 0.2)' : 'none',
                      }}
                    >
                      <Icon size={12} className="shrink-0 text-white/70" />
                      <span className="truncate">{filter.label}: {filter.displayValue}</span>
                      <X size={11} className="shrink-0 text-white/65" />
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setIsSearchDropdownOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    if (!isSearchDropdownOpen) setIsSearchFocused(false);
                  }, 150);
                }}
                onClick={() => setAllSelected(false)}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                    if (e.shiftKey) handleRedo();
                    else handleUndo();
                    e.preventDefault();
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                    handleRedo();
                    e.preventDefault();
                    return;
                  }
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                    setAllSelected(true);
                    return;
                  }

                  if (allSelected) {
                    if (e.key === 'Backspace' || e.key === 'Delete') {
                      setAppliedFilters([]);
                      onSearchQueryChange('');
                      setAllSelected(false);
                      e.preventDefault();
                      return;
                    }
                    if (e.key.length === 1 && !(e.ctrlKey || e.metaKey || e.altKey)) {
                      setAppliedFilters([]);
                      setAllSelected(false);
                    }
                    if (e.key.toLowerCase() === 'x' && (e.ctrlKey || e.metaKey)) {
                      setAppliedFilters([]);
                      setAllSelected(false);
                    }
                  }

                  if (e.key !== 'Control' && e.key !== 'Meta' && e.key !== 'Shift' && e.key !== 'Alt') {
                    if (allSelected && !(e.key.toLowerCase() === 'a' && (e.ctrlKey || e.metaKey))) {
                      setAllSelected(false);
                    }
                  }

                  if (e.key === 'Backspace' && !searchQuery && appliedFilters.length > 0) {
                    const lastFilter = appliedFilters[appliedFilters.length - 1];
                    removeAppliedFilter(lastFilter.key, lastFilter.value);
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();

                    if (activeFilter && activeSearchValue.trim().length > 0) {
                      const value = activeSearchValue.trim();
                      const matchedValue = activeFilter.values?.find(v => normalizeFilterValue(v.label) === normalizeFilterValue(value) || normalizeFilterValue(v.value) === normalizeFilterValue(value));

                      addAppliedFilter({
                        key: activeFilter.key,
                        label: activeFilter.label,
                        value: matchedValue ? matchedValue.value : value,
                        displayValue: matchedValue ? matchedValue.label : value,
                        browseParam: activeFilter.browseParam,
                        icon: activeFilter.icon,
                      });
                      return;
                    }

                    handleSearchSubmit();
                  }
                  if (e.key === 'Escape') {
                    setIsSearchDropdownOpen(false);
                    setIsSearchFocused(false);
                    inputRef.current?.blur();
                  }
                }}
                placeholder="Search..."
                className="flex-1 min-w-0 bg-transparent text-[13.5px] font-medium text-white placeholder:text-zinc-500 border-none outline-none focus:outline-none"
                style={{ fontFamily: TOPBAR_FONT }}
              />

              {(searchQuery || appliedFilters.length > 0) && (
                <button
                  onClick={clearSearchInput}
                  className="flex shrink-0 items-center justify-center h-full w-[40px] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 outline-none"
                >
                  {isLoadingSuggestions ? <Loader2 size={14} className="animate-spin text-[var(--app-accent,#8b5cf6)]" /> : <X size={14} />}
                </button>
              )}
            </div>

            {/* ────────────── SEARCH DROPDOWN ────────────── */}
            <AnimatePresence>
              {isSearchDropdownOpen && isSearchFocused && (
                <div className="absolute top-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-[100] w-[440px]">
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="aw-material-menu relative flex flex-col rounded-[24px] w-full p-2"
                    style={{
                      boxShadow: '0 38px 100px -34px rgba(0,0,0,0.9)',
                    }}
                  >
                    <div className="flex flex-col w-full rounded-[16px] overflow-hidden relative z-10">
                      {showDiscordMenu && (
                        <div className="relative z-10 px-2.5 pt-2.5 pb-3">
                          <div className="flex items-center justify-between px-3 pt-1 pb-2">
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-zinc-500" style={{ fontFamily: TOPBAR_FONT }}>Filters</span>
                            {appliedFilters.length > 0 && (
                              <button
                                onClick={() => { setAppliedFilters([]); onSearchQueryChange(''); window.requestAnimationFrame(() => inputRef.current?.focus()); }}
                                className="text-[10.5px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors outline-none"
                                style={{ fontFamily: TOPBAR_FONT }}
                              >
                                Clear all
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5">
                            {visibleDiscordFilters.map((filter) => {
                              const Icon = filter.icon;
                              const isApplied = appliedFilters.some((a) => a.key === filter.key);

                              if (['format', 'status', 'season'].includes(filter.key) && isApplied) return null;

                              return (
                                <motion.button
                                  key={filter.key}
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.01, x: 2, transition: { type: 'spring', damping: 20, stiffness: 400 } }}
                                  whileTap={{ scale: 0.98, x: 0 }}
                                  onClick={() => {
                                    onSearchQueryChange(buildFilterQuery(filter.key));
                                    inputRef.current?.focus();
                                  }}
                                  className="group/filter relative flex w-full items-center gap-3.5 rounded-[12px] px-3 py-2.5 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden"
                                >
                                  <Icon size={16} strokeWidth={2} className="text-zinc-400 shrink-0 transition-all duration-200 group-hover/filter:scale-110" />
                                  <div className="flex flex-col min-w-0" style={{ fontFamily: TOPBAR_FONT }}>
                                    <span className="text-[13.5px] font-medium text-white/95 leading-tight transition-colors group-hover/filter:text-white">
                                      {filter.discordTitle}
                                    </span>
                                    <span className="text-[11.5px] font-medium text-zinc-500 leading-tight mt-[3px] transition-colors group-hover/filter:text-zinc-400">
                                      {filter.discordSyntax}
                                    </span>
                                  </div>
                                  <ArrowRight size={13} className="ml-auto text-zinc-600 opacity-0 -translate-x-2 transition-all duration-200 group-hover/filter:opacity-100 group-hover/filter:translate-x-0 group-hover/filter:text-zinc-300" />
                                </motion.button>
                              );
                            })}

                            {!showAllFilters && (
                              <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.01, x: 2, transition: { type: 'spring', damping: 20, stiffness: 400 } }}
                                whileTap={{ scale: 0.98, x: 0 }}
                                onClick={(e) => { e.preventDefault(); setShowAllFilters(true); inputRef.current?.focus(); }}
                                className="group/more relative flex w-full items-center gap-3.5 rounded-[12px] px-3 py-2.5 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden"
                              >
                                <SlidersHorizontal size={16} strokeWidth={2} className="text-zinc-400 shrink-0 transition-all duration-200 group-hover/more:scale-110" />
                                <div className="flex flex-col min-w-0" style={{ fontFamily: TOPBAR_FONT }}>
                                  <span className="text-[13.5px] font-medium text-white/95 leading-tight transition-colors group-hover/more:text-white">
                                    More filters
                                  </span>
                                  <span className="text-[11.5px] font-medium text-zinc-500 leading-tight mt-[3px] transition-colors group-hover/more:text-zinc-400">
                                    dates, format, status, and more
                                  </span>
                                </div>
                                <ArrowRight size={13} className="ml-auto text-zinc-600 opacity-0 -translate-x-2 transition-all duration-200 group-hover/more:opacity-100 group-hover/more:translate-x-0 group-hover/more:text-zinc-300" />
                              </motion.button>
                            )}
                          </div>

                          {hasRecentSearches && (
                            <>
                              <div className="mx-3 my-2.5 border-t border-white/[0.06]" />
                              <div className="aw-search-section-title px-3 pt-1 pb-2 text-[10.5px] font-bold uppercase tracking-[0.15em]" style={{ fontFamily: TOPBAR_FONT }}>
                                Recent searches
                              </div>
                              {visibleRecentSearches.map((entry) => (
                                <motion.div
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.01, x: 2, transition: { type: 'spring', damping: 20, stiffness: 400 } }}
                                  whileTap={{ scale: 0.98, x: 0 }}
                                  key={entry.query}
                                  onClick={() => handleRecentSearchClick(entry.query)}
                                  className="group/item relative flex w-full items-center gap-3 rounded-[12px] px-3 py-2 mb-1 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden cursor-pointer"
                                >
                                  <div className="w-[26px] flex items-center justify-center shrink-0">
                                    {entry.result?.cover ? (
                                      <div className="h-[36px] w-[26px] shrink-0 rounded-[4px] overflow-hidden bg-black/40 border border-white/10 relative shadow-sm transition-transform duration-200 group-hover/item:scale-105">
                                        <img src={entry.result.cover} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <History size={16} strokeWidth={2} className="text-zinc-500 transition-all duration-200 group-hover/item:text-zinc-300" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <span className="truncate text-[13.5px] font-medium text-zinc-300 transition-colors group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                      {entry.query}
                                    </span>
                                    {entry.result?.title && entry.result.title.toLowerCase() !== entry.query.toLowerCase() && (
                                      <span className="truncate text-[11px] text-zinc-500 mt-[2px] leading-none" style={{ fontFamily: TOPBAR_FONT }}>
                                        {entry.result.title}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => removeRecentSearch(e, entry.query)}
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] text-zinc-500 opacity-0 group-hover/item:opacity-70 hover:bg-white/[0.08] hover:text-white hover:!opacity-100 transition-all ml-1"
                                  >
                                    <X size={14} />
                                  </button>
                                </motion.div>
                              ))}
                              {hiddenRecentSearchCount > 0 && (
                                <motion.button
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.01, y: -1, transition: { type: 'spring', damping: 22, stiffness: 420 } }}
                                  whileTap={{ scale: 0.98 }}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setVisibleRecentSearchCount((count) => Math.min(count + RECENT_SEARCHES_REVEAL_STEP, recentSearches.length));
                                    window.requestAnimationFrame(() => inputRef.current?.focus());
                                  }}
                                  className="group/recent-more mt-1 relative flex w-full items-center justify-center gap-2 rounded-[12px] px-3 py-2 text-[12px] font-semibold text-zinc-400 outline-none transition-all duration-300 hover:bg-white/[0.06] hover:text-white"
                                  style={{ fontFamily: TOPBAR_FONT }}
                                >
                                  Show more
                                  <span className="rounded-full border border-white/[0.07] bg-black/20 px-2 py-0.5 text-[10px] font-bold text-zinc-500 transition-colors group-hover/recent-more:text-zinc-300">
                                    +{Math.min(RECENT_SEARCHES_REVEAL_STEP, hiddenRecentSearchCount)}
                                  </span>
                                </motion.button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* ══ DYNAMIC SEARCH CONTENT BELOW ══ */}

                      {activeFilter && activeFilterValues.length > 0 ? (
                        <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
                          <div className="px-2 pb-2 pt-1" style={{ fontFamily: TOPBAR_FONT }}>
                            <div className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                              {activeFilter.label} options
                            </div>
                            <div className="mt-1 text-[12.5px] font-medium text-zinc-400">
                              Pick a specific {activeFilter.key} to add.
                            </div>
                          </div>
                          {filteredActiveFilterValues.length > 0 ? (
                            filteredActiveFilterValues.map((option) => {
                              const Icon = activeFilter.icon;
                              const alreadyApplied = appliedFilters.some(
                                (a) => a.key === activeFilter.key && normalizeFilterValue(a.value) === normalizeFilterValue(option.value)
                              );
                              return (
                                <motion.button
                                  key={option.value}
                                  variants={itemVariants}
                                  onClick={() => applyFilterValue(option.value, option.label)}
                                  disabled={alreadyApplied}
                                  className={`group/filter relative flex w-full items-center gap-3.5 rounded-[12px] px-3 py-2.5 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden ${alreadyApplied ? 'opacity-40 cursor-default' : ''}`}
                                  onMouseEnter={e => { if (!alreadyApplied) e.currentTarget.style.backgroundColor = 'var(--app-accent-muted, rgba(139,92,246,0.08))'; }}
                                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                                >
                                  <Icon size={16} strokeWidth={2} className="text-zinc-400 group-hover/filter:text-white transition-colors shrink-0" />
                                  <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="text-[13.5px] font-medium text-white/95 transition-colors group-hover/filter:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                      {option.label}
                                    </span>
                                  </div>
                                  {alreadyApplied ? (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--app-accent,#8b5cf6)] opacity-80 mr-1">Added</span>
                                  ) : (
                                    <ArrowRight size={14} className="text-zinc-600 opacity-0 transition-all group-hover/filter:-translate-x-1 group-hover/filter:text-zinc-300 group-hover/filter:opacity-100" />
                                  )}
                                </motion.button>
                              );
                            })
                          ) : (
                            <motion.div variants={itemVariants} className="rounded-[16px] px-4 py-5 text-[13.5px] font-medium text-zinc-500 bg-white/[0.02] border border-white/[0.05] text-center" style={{ fontFamily: TOPBAR_FONT }}>
                              No {activeFilter.key} matches "{activeSearchValue}"
                            </motion.div>
                          )}
                        </div>

                      ) : activeSearchMode === 'anime' && !showDiscordMenu ? (
                        displayResults.length > 0 ? (
                          <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
                            <div className="flex items-center justify-between px-2 pt-1 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-[10.5px] font-bold tracking-widest uppercase text-zinc-500" style={{ fontFamily: TOPBAR_FONT }}>
                                {displayResults.length} Results
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <SlidersHorizontal size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Filters {appliedFilters.length > 0 && `(${appliedFilters.length})`}
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <ArrowUpDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Sort
                                </button>
                              </div>
                            </div>
                            {displayResults.map((result) => {
                              let displayTitle = 'Unknown';
                              if (typeof result.title === 'string') displayTitle = result.title_romaji || result.title;
                              else if (result.title) displayTitle = result.title.english || result.title.romaji || result.title.native || 'Unknown';
                              else if (result.title_romaji) displayTitle = result.title_romaji;

                              const cover = result.poster || result.coverImage?.extraLarge || result.coverImage?.large || '';
                              const format = result.format || 'TV';
                              const year = result.year || result.seasonYear || result.startDate?.year || '';

                              return (
                                <motion.button
                                  variants={itemVariants}
                                  whileHover={{ scale: 1.01 }}
                                  whileTap={{ scale: 0.98 }}
                                  key={result.id}
                                  onClick={() => handleResultClick(result.id, displayTitle, cover)}
                                  className="group/item relative flex w-full items-center gap-3 rounded-[12px] p-2 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden"
                                >

                                  <div className="relative z-10 h-[48px] w-[34px] shrink-0 overflow-hidden rounded-[6px] bg-black/40 shadow-md ml-1 border border-white/[0.06] group-hover/item:border-white/[0.2] transition-colors duration-300">
                                    <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50 pointer-events-none" />
                                  </div>

                                  <div className="flex flex-col min-w-0 flex-1 justify-center pr-2 relative z-10">
                                    <span className="truncate text-[13px] font-medium text-white/95 transition-colors tracking-normal line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                      {displayTitle}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5" style={{ fontFamily: TOPBAR_FONT }}>
                                      {format && (
                                        <span className="text-[11px] font-medium text-zinc-400">
                                          {format}
                                        </span>
                                      )}
                                      {year && <span className="text-[11px] font-medium text-zinc-500 group-hover/item:text-zinc-400 transition-colors"> • {year}</span>}
                                    </div>
                                  </div>

                                  <div className="relative z-10 flex items-center justify-center h-8 w-8 text-zinc-500 opacity-0 -translate-x-3 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white mr-1">
                                    <ArrowRight size={14} />
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>

                        ) : suggestionsError ? (
                          <motion.div variants={itemVariants} className="mx-2.5 my-2.5 flex flex-col items-center justify-center rounded-[16px] py-10 px-6 text-center bg-white/[0.02] border border-white/[0.05]">
                            <AlertTriangle size={28} strokeWidth={1.5} className="text-red-500/80 mb-3" />
                            <h3 className="text-[16px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              {suggestionsError === 'rate_limit' ? 'Too many requests' : 'Failed to search'}
                            </h3>
                            <p className="text-[13px] text-zinc-400 mt-1 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              {suggestionsError === 'rate_limit' ? 'Please wait a moment before typing again.' : 'An error occurred while fetching suggestions.'}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div variants={itemVariants} className="mx-2.5 my-2.5 flex flex-col items-center justify-center rounded-[16px] py-10 px-6 text-center bg-white/[0.02] border border-white/[0.05]">
                            <Ghost size={28} strokeWidth={1.5} className="text-zinc-500 mb-3" />
                            <h3 className="text-[16px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              No instant matches
                            </h3>
                            <p className="text-[13px] text-zinc-400 mt-1 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              Press Enter to run a deep search on the full catalog.
                            </p>
                          </motion.div>
                        )

                      ) : activeSearchMode === 'studio' && !showDiscordMenu ? (
                        studioResults.length > 0 ? (
                          <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
                            <div className="flex items-center justify-between px-2 pt-1 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-[10.5px] font-bold tracking-widest uppercase text-zinc-500" style={{ fontFamily: TOPBAR_FONT }}>
                                {studioResults.length} Results
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <SlidersHorizontal size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Filters {appliedFilters.length > 0 && `(${appliedFilters.length})`}
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <ArrowUpDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Sort
                                </button>
                              </div>
                            </div>
                            {studioResults.map((result) => {
                              let displayTitle = 'Unknown';
                              if (typeof result.title === 'string') displayTitle = result.title_romaji || result.title;
                              else if (result.title) displayTitle = result.title.english || result.title.romaji || result.title.native || 'Unknown';
                              const cover = result.poster || result.coverImage?.extraLarge || result.coverImage?.large || '';
                              const studioName = getStudioName(result);
                              const year = result.year || result.seasonYear || result.startDate?.year || '';

                              return (
                                <motion.button
                                  variants={itemVariants}
                                  whileHover={{ scale: 0.98 }}
                                  whileTap={{ scale: 0.94 }}
                                  key={result.id}
                                  onClick={() => handleResultClick(result.id, displayTitle, cover)}
                                  className="group/item relative flex w-full items-center gap-3 rounded-[12px] p-2 text-left outline-none transition-all duration-300 hover:bg-white/[0.06] overflow-hidden"
                                >


                                  <div className="relative z-10 h-[48px] w-[34px] shrink-0 overflow-hidden rounded-[6px] bg-black/40 shadow-md ml-1 border border-white/[0.06] group-hover/item:border-white/[0.2] transition-colors duration-300">
                                    <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50 pointer-events-none" />
                                  </div>

                                  <div className="flex flex-col min-w-0 flex-1 justify-center pr-2 relative z-10">
                                    <span className="truncate text-[13px] font-medium text-white/95 transition-colors tracking-normal line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                      {displayTitle}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5" style={{ fontFamily: TOPBAR_FONT }}>
                                      {studioName && (
                                        <span className="text-[11px] font-medium text-[var(--app-accent,#8b5cf6)]">
                                          {studioName}
                                        </span>
                                      )}
                                      {year && <span className="text-[11px] font-medium text-zinc-500 group-hover/item:text-zinc-400 transition-colors"> • {year}</span>}
                                    </div>
                                  </div>

                                  <div className="relative z-10 flex items-center justify-center h-8 w-8 text-zinc-500 opacity-0 -translate-x-3 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white mr-1">
                                    <ArrowRight size={14} />
                                  </div>
                                </motion.button>
                              );
                            })}
                          </div>
                        ) : (
                          <motion.div variants={itemVariants} className="mx-2.5 my-2.5 flex flex-col items-center justify-center rounded-[16px] py-10 px-6 text-center bg-white/[0.02] border border-white/[0.05]">
                            <Building2 size={28} strokeWidth={1.5} className="text-zinc-500 mb-3" />
                            <h3 className="text-[16px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              No instant matches
                            </h3>
                            <p className="text-[13px] text-zinc-400 mt-1 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              Press Enter to run a deep search on the full catalog.
                            </p>
                          </motion.div>
                        )

                      ) : (
                        userSuggestions.length > 0 && !showDiscordMenu ? (
                          <div className="flex flex-col gap-1.5 px-2.5 py-2.5">
                            <div className="flex items-center justify-between px-2 pt-1 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <span className="text-[10.5px] font-bold tracking-widest uppercase text-zinc-500" style={{ fontFamily: TOPBAR_FONT }}>
                                {userSuggestions.length} Users
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <SlidersHorizontal size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Filters {appliedFilters.length > 0 && `(${appliedFilters.length})`}
                                </button>
                                <button
                                  onClick={(e) => { e.preventDefault(); handleSearchSubmit(); }}
                                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.03] hover:bg-white/[0.08] transition-colors text-[10.5px] font-medium text-zinc-400 hover:text-white"
                                >
                                  <ArrowUpDown size={12} className="text-zinc-500 group-hover:text-white transition-colors" /> Sort
                                </button>
                              </div>
                            </div>
                            {userSuggestions.map((resultUser) => (
                              <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                key={resultUser.id}
                                onClick={() => handleUserResultClick(resultUser.id)}
                                className="aw-search-result-row group/item relative flex w-full items-center gap-3 rounded-[14px] p-1.5 text-left outline-none transition-all duration-200"
                              >

                                <div className="relative z-10 h-[36px] w-[36px] shrink-0 overflow-hidden rounded-[6px] bg-black/40 shadow-md ml-1 border border-white/[0.06] group-hover/item:border-white/[0.2] transition-colors duration-300">
                                  {resultUser.avatar_url ? (
                                    <img src={resultUser.avatar_url} alt={resultUser.display_name} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
                                      <User size={16} className="text-zinc-500" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50 pointer-events-none" />
                                </div>

                                <div className="flex flex-col min-w-0 flex-1 justify-center pr-2 relative z-10">
                                  <span className="truncate text-[13px] font-medium text-white/95 transition-colors tracking-normal line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                    {resultUser.display_name}
                                  </span>
                                  <div className="flex items-center gap-2 mt-[2px]" style={{ fontFamily: TOPBAR_FONT }}>
                                    <span className="text-[11px] font-medium text-zinc-500 group-hover/item:text-zinc-400 transition-colors">User Profile</span>
                                  </div>
                                </div>

                                <div className="relative z-10 flex items-center justify-center h-8 w-8 text-zinc-500 opacity-0 -translate-x-3 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white mr-1">
                                  <ArrowRight size={14} />
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        ) : !showDiscordMenu ? (
                          !activeSearchValue.trim() ? (
                            <motion.div variants={itemVariants} className="mx-2.5 my-2.5 flex flex-col items-center justify-center rounded-[16px] py-10 px-6 text-center bg-white/[0.02] border border-white/[0.05]">
                              <Users size={30} strokeWidth={1.2} className="text-zinc-600 mb-3" />
                              <h3 className="text-[15px] font-semibold text-white/80 tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                                Search for a user
                              </h3>
                              <p className="text-[12.5px] text-zinc-500 mt-1.5 max-w-[85%] mx-auto leading-relaxed" style={{ fontFamily: TOPBAR_FONT }}>
                                Type a username to find people on kotatsutv
                              </p>
                            </motion.div>
                          ) : (
                            <motion.div variants={itemVariants} className="mx-2.5 my-2.5 flex flex-col items-center justify-center rounded-[16px] py-10 px-6 text-center bg-white/[0.02] border border-white/[0.05]">
                              <Ghost size={28} strokeWidth={1.5} className="text-zinc-500 mb-3" />
                              <h3 className="text-[16px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                                No users found
                              </h3>
                              <p className="text-[13px] text-zinc-400 mt-1 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                                No results for <span className="text-white/80 font-medium">"{activeSearchValue}"</span>
                              </p>
                            </motion.div>
                          )
                        ) : null
                      )}

                      {showFooter && (
                        <motion.button
                          variants={itemVariants}
                          onClick={handleSearchSubmit}
                          className="relative z-10 mx-2.5 mb-2.5 mt-1 flex items-center justify-between rounded-[14px] px-3.5 py-3 outline-none group cursor-pointer transition-all duration-300 hover:bg-white/[0.06] border border-white/[0.05] bg-white/[0.02]"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span className="text-[13.5px] font-medium text-zinc-300 group-hover:text-white transition-colors duration-200" style={{ fontFamily: TOPBAR_FONT }}>
                            {footerText}
                          </span>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-white/[0.04] border border-white/[0.08] group-hover:bg-white/[0.08] group-hover:border-white/[0.2] group-hover:text-white transition-all duration-200 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                            <CornerDownLeft size={12} strokeWidth={2.5} /> Enter
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* ────────────── ACTION PILL ────────────── */}
          <div
            className="flex items-center gap-1.5 px-1.5"
            style={pillStyle}
          >
            {/* Notification Button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95, y: 0.5 }}
              onClick={() => setIsNotifOpen(true)}
              className={`group relative flex items-center justify-center rounded-full transition-colors duration-200 ease-out hover:bg-white/[0.08] hover:text-white ${isNotifOpen ? 'bg-white/[0.08] text-white' : 'text-zinc-400'}`}
              style={{ width: 32, height: 32 }}
            >
              <Bell size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:rotate-[15deg] group-hover:scale-110" />
              {totalUnreadCount > 0 && (
                <span className="absolute right-[5px] top-[5px] h-[9px] w-[9px] rounded-full border-[1px] border-[var(--app-bg,#09090b)] bg-[var(--app-accent,#8b5cf6)]" />
              )}
              <ActionTooltip label="Notifications" hidden={isNotifOpen} />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Friends Button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95, y: 0.5 }}
              onClick={() => setIsFriendsOpen(true)}
              className={`group relative flex items-center justify-center rounded-full transition-colors duration-200 ease-out hover:bg-white/[0.08] hover:text-white ${isFriendsOpen ? 'bg-white/[0.08] text-white' : 'text-zinc-400'}`}
              style={{ width: 32, height: 32 }}
            >
              <Users size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <ActionTooltip label="Friends" hidden={isFriendsOpen} />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95, y: 0.5 }}
              onClick={() => setIsSettingsOpen(true)}
              className="group relative flex items-center justify-center rounded-full transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              style={{ width: 32, height: 32 }}
            >
              <Settings size={16} strokeWidth={1.5} className="transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
              <ActionTooltip label="Settings" />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Profile / Auth Button */}
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95, y: 0.5 }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: user.id } }));
                }}
                className="group relative flex items-center justify-center rounded-full overflow-visible transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                style={{ width: 32, height: 32 }}
              >
                <div className="w-full h-full rounded-full overflow-hidden border border-transparent group-hover:border-white/[0.2] group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.1)] transition-all duration-300">
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" /> : <User size={16} strokeWidth={1.5} />}
                </div>
                <ActionTooltip label="Profile" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95, y: 0.5 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="group relative flex items-center justify-center rounded-full transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                style={{ width: 32, height: 32 }}
              >
                <User size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />
                <ActionTooltip label="Sign In" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* MODALS */}
      <ProfileModal />
      <NotificationDropdown
        open={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <FriendsModal open={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default DesktopTopbar;
