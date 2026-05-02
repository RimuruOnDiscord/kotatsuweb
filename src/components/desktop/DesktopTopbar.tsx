
import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Bell, User, Calendar, ArrowRight, Ghost, ScrollText, Compass, ChevronDown, Home, CornerDownLeft, Building2 } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import ChangelogModal from '../shared/ChangelogModal';
import ProfileModal from '../shared/ProfileModal';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';
import NotificationDropdown, { INITIAL_NOTIFICATIONS, AppNotification } from '../shared/NotificationDropdown';
import { checkBookmarksForUpdates } from '../../utils/bookmarkUpdateChecker';
import { fetchAnimeSuggestions, fetchAnimeByStudio } from '../../utils/animeApi';
import { supabase } from '../../lib/supabase';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

const dropdownVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 26, stiffness: 350, staggerChildren: 0.04 }
  },
  exit: {
    opacity: 0, y: 10, scale: 0.98,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
};

const discoverDropdownVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', damping: 28, stiffness: 400, staggerChildren: 0.05 }
  },
  exit: {
    opacity: 0, y: 8, scale: 0.96,
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const discoverItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
};

// Sub-component for snappy bottom tooltips
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

// Highly animated NavLink
const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string; active?: boolean }> = ({ icon: Icon, label, to, active }) => {
  return (
    <NavLink to={to} style={{ fontFamily: TOPBAR_FONT }} className="relative flex items-center justify-center outline-none">
      {({ isActive: routerIsActive }) => {
        const isActive = active !== undefined ? active : routerIsActive;

        return (
          <motion.div
            className="group relative flex items-center gap-2.5 px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 z-10 cursor-pointer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.94, y: 1 }}
          >
            {isActive && (
              <motion.div
                layoutId="desktopActiveNavPill"
                className="absolute inset-0 rounded-[10px] z-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.2)]"
                style={{
                  background: 'var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 15%, transparent))',
                  border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 30%, transparent))'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}

            {!isActive && (
              <div className="absolute inset-0 rounded-[10px] bg-white/[0.04] opacity-0 scale-95 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 z-0 shadow-sm border border-transparent group-hover:border-white/[0.04]" />
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
        {/* Active Background Glow */}
        {isActive && (
          <div className="absolute inset-0 rounded-[12px] bg-[var(--app-accent,#8b5cf6)] opacity-[0.12] z-0" />
        )}

        {/* Highlight Sidebar */}
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] transition-all duration-300 z-0 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full group-hover:opacity-100 group-hover:translate-x-0'}`} />

        {/* Icon Container (Increased Contrast) */}
        <div
          className={`relative z-10 flex shrink-0 items-center justify-center w-[40px] h-[40px] rounded-[10px] transition-all duration-300 border ${isActive
            ? 'text-[var(--app-accent,#8b5cf6)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
            : 'border-white/[0.05] text-zinc-300 group-hover:text-white group-hover:bg-white/[0.14] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
            }`}
          style={isActive ? { backgroundColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 75%)', borderColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 50%)' } : { backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <Icon className={`w-[18px] h-[18px] transition-all duration-300 ${isActive ? '' : 'group-hover:scale-110 group-hover:-rotate-3'}`} />
        </div>

        {/* Text Details (Increased Contrast) */}
        <div className={`relative z-10 flex flex-col flex-1 min-w-0 pr-2 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
          <span className={`text-[13.5px] font-semibold tracking-wide transition-colors truncate ${isActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-white/95 group-hover:text-white'}`} style={{ fontFamily: TOPBAR_FONT }}>
            {label}
          </span>
          <span className={`text-[11.5px] font-medium transition-colors truncate mt-[2px] ${isActive ? 'text-[var(--app-accent,#8b5cf6)]/80' : 'text-zinc-400 group-hover:text-zinc-300'}`} style={{ fontFamily: TOPBAR_FONT }}>
            {description}
          </span>
        </div>

        {/* Hover Arrow Indicator */}
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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [pendingFrCount, setPendingFrCount] = useState(0);

  const [searchMode, setSearchMode] = useState<'anime' | 'users' | 'studio'>('anime');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { brandName } = useContentMode();
  const { user, profile } = useAuth();

  const totalUnreadCount = notifications.filter(n => n.unread).length + pendingFrCount;

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
      // Close search dropdown
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
        setIsSearchFocused(false);
        setShowSearch(false);
      }
      // Close discover dropdown
      if (discoverRef.current && !discoverRef.current.contains(e.target as Node)) {
        setIsDiscoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSearch]);

  useEffect(() => {
    checkBookmarksForUpdates(setNotifications);
    const intervalId = window.setInterval(() => checkBookmarksForUpdates(setNotifications), 1_800_000);
    return () => window.clearInterval(intervalId);
  }, []);

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
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      setUserSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        if (searchMode === 'anime') {
          const res = await fetchAnimeSuggestions(searchQuery.trim());
          let parsedResults: any[] = [];
          if (Array.isArray(res)) parsedResults = res;
          else if (res && Array.isArray((res as any).results)) parsedResults = (res as any).results;
          else if (res && Array.isArray((res as any).data)) parsedResults = (res as any).data;
          else if (res && Array.isArray((res as any).suggestions)) parsedResults = (res as any).suggestions;

          parsedResults = parsedResults.filter((anime: any) => {
            if (anime.isAdult === true) return false;
            if (typeof anime.format === 'string' && anime.format.toUpperCase() === 'HENTAI') return false;
            if (Array.isArray(anime.genres) && anime.genres.some((g: string) => g.toLowerCase() === 'hentai' || g.toLowerCase() === 'erotica')) return false;
            return true;
          });

          setSuggestions(parsedResults);
          setUserSuggestions([]);
        } else if (searchMode === 'studio') {
          const studioAnime = await fetchAnimeByStudio(searchQuery.trim(), 8);
          setSuggestions(studioAnime.results);
          setUserSuggestions([]);
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .ilike('display_name', `%${searchQuery.trim()}%`)
            .limit(5);

          if (!error && data) {
            setUserSuggestions(data);
          } else {
            setUserSuggestions([]);
          }
          setSuggestions([]);
        }
      } catch (error) {
        setSuggestions([]);
        setUserSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, searchMode]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim() && (searchMode === 'anime' || searchMode === 'studio')) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchDropdownOpen(false);
      setIsSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleResultClick = (id: string | number) => {
    navigate(`/watch/${id}`);
    setIsSearchDropdownOpen(false);
    setIsSearchFocused(false);
    clearSearch();
    setSuggestions([]);
  };

  const handleUserResultClick = (id: string) => {
    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: id } }));
    setIsSearchDropdownOpen(false);
    setIsSearchFocused(false);
    clearSearch();
    setUserSuggestions([]);
  };

  const MAX_DISPLAY = 5;
  const displayResults = suggestions.slice(0, MAX_DISPLAY);

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

  const studioResults = searchMode === 'studio' ? suggestions.slice(0, MAX_DISPLAY) : [];

  const pillStyle = {
    height: 42,
    borderRadius: '12px',
    backgroundColor: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.02)'
  };

  // Extract navigation items reliably
  const homeItem = topbarNavItems.find(i => normalizeRoute(i.to) === '/home') || { icon: Home, label: 'Home', to: '/home' };
  const browseItem = topbarNavItems.find(i => normalizeRoute(i.to) === '/browse') || { icon: Compass, label: 'Browse', to: '/browse' };
  const randomItem = topbarNavItems.find(i => i.label === 'Random') || { icon: Ghost, label: 'Random', to: '/random' };
  const scheduleItem = topbarNavItems.find(i => i.label === 'Schedule') || { icon: Calendar, label: 'Schedule', to: '/schedule' };

  // Gets other custom items (like 'My List') by filtering out ALL overlapping routes explicitly.
  const ignoredRoutes = ['/home', '/browse', '/random', '/schedule', '/discover'];
  const otherItems = topbarNavItems.filter(i => {
    const route = normalizeRoute(i.to);
    return !ignoredRoutes.some(ignored => route.startsWith(ignored)) && !['Added', 'Updated', 'Discover'].includes(i.label);
  });

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1460px] lg:flex items-center justify-between px-6 py-4 relative z-50">

        {/* ────────────── LEFT ────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          <motion.button
            whileHover={{ scale: 1, y: 0 }}
            whileTap={{ scale: 0.95, y: 0 }}
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
            <div
              ref={discoverRef}
              className="relative z-50 flex items-center h-full"
              onMouseEnter={() => setIsDiscoverOpen(true)}
              onMouseLeave={() => setIsDiscoverOpen(false)}
            >
              <motion.button
                onClick={() => setIsDiscoverOpen(!isDiscoverOpen)}
                className={`group relative flex items-center gap-2.5 px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 z-10 outline-none ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 hover:text-white'
                  }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.94, y: 1 }}
                style={{ fontFamily: TOPBAR_FONT }}
              >
                {/* Active Pill Background */}
                {isDiscoverActive && (
                  <motion.div
                    layoutId="desktopActiveNavPill"
                    className="absolute inset-0 rounded-[10px] z-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.2)]"
                    style={{
                      background: 'var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 15%, transparent))',
                      border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 30%, transparent))'
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Hover/Open Background */}
                {!isDiscoverActive && (
                  <div className={`absolute inset-0 rounded-[10px] bg-white/[0.04] transition-all duration-300 z-0 shadow-sm border border-transparent group-hover:border-white/[0.04] ${isDiscoverOpen ? 'opacity-100 scale-100 border-white/[0.06]' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'
                    }`} />
                )}

                <Compass className={`relative z-10 h-4 w-4 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-[15deg] ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 group-hover:text-white'}`} />
                <span className={`relative z-10 tracking-wide ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)] drop-shadow-sm' : 'text-zinc-400 group-hover:text-white'}`}>
                  Discover
                </span>
                <ChevronDown className={`relative z-10 h-3.5 w-3.5 transition-transform duration-300 ${isDiscoverOpen ? 'rotate-180 text-white' : ''} ${isDiscoverActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-500 group-hover:text-white'}`} />
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
            </div>

            {/* Other Nav Items (e.g., My List) */}
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
              className={`relative flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSearchFocused || searchQuery.length > 0 ? 'w-[360px] bg-white/[0.04]' : 'w-[280px] bg-white/[0.02]'
                }`}
              style={{
                ...pillStyle,
                borderColor: isSearchFocused ? 'var(--app-accent-soft, rgba(139,92,246,0.5))' : 'rgba(255,255,255,0.08)',
                boxShadow: isSearchFocused ? '0 0 0 1px var(--app-accent-muted, rgba(139,92,246,0.3)), inset 0 1px 1px rgba(255,255,255,0.03)' : 'inset 0 1px 1px rgba(255,255,255,0.02), 0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div className={`flex shrink-0 items-center justify-center h-full w-[40px] transition-colors duration-300 ${isSearchFocused ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400'}`}>
                <Search size={16} />
              </div>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchFocused(true);
                  if (searchQuery.trim().length > 1) setIsSearchDropdownOpen(true);
                }}
                onBlur={() => {
                  setTimeout(() => { if (!isSearchDropdownOpen) setIsSearchFocused(false); }, 150);
                }}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value);
                  if (e.target.value.trim().length > 1) setIsSearchDropdownOpen(true);
                  else setIsSearchDropdownOpen(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                placeholder="Search..."
                className="flex-1 min-w-0 bg-transparent text-[13.5px] font-medium text-white placeholder:text-zinc-500 border-none outline-none ring-0 focus:ring-0 focus:outline-none"
                style={{ fontFamily: TOPBAR_FONT }}
              />

              {/* Styled Enter Button Hint */}

              {searchQuery && (
                <button
                  onClick={() => {
                    clearSearch();
                    setSuggestions([]);
                    setUserSuggestions([]);
                    setIsSearchDropdownOpen(false);
                    inputRef.current?.focus();
                  }}
                  className="flex shrink-0 items-center justify-center h-full w-[40px] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 outline-none"
                >
                  {isLoadingSuggestions ? <Loader2 size={14} className="animate-spin text-[var(--app-accent,#8b5cf6)]" /> : <X size={14} />}
                </button>
              )}
            </div>

            {/* SEARCH DROPDOWN UI */}
            <AnimatePresence>
              {isSearchDropdownOpen && searchQuery.trim().length > 1 && (
                <div className="absolute top-[calc(100%+14px)] left-1/2 w-[420px] z-[100]" style={{ transform: 'translateX(-50%)' }}>
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full rounded-[20px] overflow-hidden flex flex-col"
                    style={{
                      backgroundColor: 'color-mix(in srgb, var(--app-bg, #09090b) 90%, transparent)',
                      backdropFilter: 'blur(40px) saturate(150%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 24px 48px -12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="p-3 flex flex-col gap-1.5">

                      {/* Search Mode Toggles */}
                      <div
                        className="flex p-1 rounded-[12px] mb-2 relative z-10"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)'
                        }}
                      >
                        {['anime', 'studio', 'users'].map((mode) => {
                          const isActive = searchMode === mode;
                          return (
                            <motion.button
                              key={mode}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setSearchMode(mode as 'anime' | 'users' | 'studio')}
                              className="relative flex-1 py-1.5 text-[12.5px] font-semibold rounded-[10px] outline-none capitalize group/tab"
                              style={{ fontFamily: TOPBAR_FONT }}
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="searchToggleActive"
                                  className="absolute inset-0 rounded-[10px] z-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
                                  style={{
                                    backgroundColor: 'var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 20%, transparent))',
                                    border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 40%, transparent))'
                                  }}
                                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                              )}

                              {!isActive && (
                                <div className="absolute inset-0 rounded-[10px] bg-white/[0.04] opacity-0 scale-95 transition-all duration-200 group-hover/tab:opacity-100 group-hover/tab:scale-100 z-0 border border-white/[0.04]" />
                              )}

                              <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white drop-shadow-sm' : 'text-zinc-400 group-hover/tab:text-zinc-200'}`}>
                                {mode}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>

                      {isLoadingSuggestions && suggestions.length === 0 && userSuggestions.length === 0 ? (
                        // Skeleton Loaders
                        [1, 2, 3].map((i) => (
                          <div key={i} className="flex w-full items-center gap-4 rounded-[12px] p-2">
                            <div className={`h-[68px] w-[48px] shrink-0 bg-white/[0.03] animate-pulse border border-[rgba(255,255,255,0.06)] ${searchMode === 'users' ? 'rounded-full h-[48px]' : 'rounded-[8px]'}`} />
                            <div className="flex flex-col gap-2.5 flex-1 justify-center">
                              <div className="h-4 w-2/3 rounded-md bg-white/[0.03] animate-pulse" />
                              <div className="flex gap-2">
                                <div className="h-3 w-8 rounded bg-white/[0.03] animate-pulse" />
                                <div className="h-3 w-12 rounded bg-white/[0.03] animate-pulse" />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : searchMode === 'anime' ? (
                        displayResults.length > 0 ? (
                          // Anime Search Results
                          displayResults.map((result) => {
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
                                whileHover={{ scale: 1.015, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                key={result.id}
                                onClick={() => handleResultClick(result.id)}
                                className="group/item relative flex w-full items-center gap-4 rounded-[12px] p-2 text-left outline-none transition-all duration-300 overflow-hidden hover:bg-white/[0.06]"
                              >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] opacity-0 transition-all duration-300 transform -translate-x-full group-hover/item:translate-x-0 group-hover/item:opacity-100" />

                                <div className="relative h-[68px] w-[48px] shrink-0 overflow-hidden rounded-[8px] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ml-1 border border-[rgba(255,255,255,0.06)]">
                                  <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                </div>

                                <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                                  <span className="truncate text-[13.5px] font-semibold text-white/90 transition-colors tracking-tight line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                    {displayTitle}
                                  </span>

                                  <div className="flex items-center gap-2 mt-1.5" style={{ fontFamily: TOPBAR_FONT }}>
                                    {format && (
                                      <span className="px-1.5 py-[2px] rounded-[6px] bg-white/[0.04] border border-[rgba(255,255,255,0.08)] text-[10px] font-bold text-zinc-400 uppercase tracking-wider transition-colors group-hover/item:border-white/[0.15] group-hover/item:text-zinc-300">
                                        {format}
                                      </span>
                                    )}
                                    {year && <span className="text-[11.5px] font-medium text-zinc-500">{year}</span>}
                                  </div>
                                </div>

                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-zinc-400 opacity-0 -translate-x-4 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white group-hover/item:border-[rgba(255,255,255,0.2)] mr-1 shadow-sm">
                                  <ArrowRight size={13} />
                                </div>
                              </motion.button>
                            );
                          })
                        ) : (
                          // Empty State Anime
                          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-14 px-6 text-center">
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] text-zinc-400 mb-5 border border-white/[0.06] shadow-inner">
                              <Ghost size={28} className="relative z-10" />
                            </div>
                            <h3 className="text-[17px] font-bold text-white/95 tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              No anime found
                            </h3>
                            <p className="text-[13.5px] text-zinc-500 mt-2 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              Try adjusting your search for <span className="text-white/80 font-medium">"{searchQuery}"</span>
                            </p>
                          </motion.div>
                        )
                      ) : searchMode === 'studio' ? (
                        studioResults.length > 0 ? (
                          studioResults.map((result) => {
                            let displayTitle = 'Unknown';
                            if (typeof result.title === 'string') displayTitle = result.title_romaji || result.title;
                            else if (result.title) displayTitle = result.title.english || result.title.romaji || result.title.native || 'Unknown';
                            const cover = result.poster || result.coverImage?.extraLarge || result.coverImage?.large || '';
                            const studioName = getStudioName(result);
                            const year = result.year || result.seasonYear || result.startDate?.year || '';

                            return (
                              <motion.button
                                variants={itemVariants}
                                whileHover={{ scale: 1.015, x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                key={result.id}
                                onClick={() => handleResultClick(result.id)}
                                className="group/item relative flex w-full items-center gap-4 rounded-[12px] p-2 text-left outline-none transition-all duration-300 overflow-hidden hover:bg-white/[0.06]"
                              >
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] opacity-0 transition-all duration-300 transform -translate-x-full group-hover/item:translate-x-0 group-hover/item:opacity-100" />

                                <div className="relative h-[68px] w-[48px] shrink-0 overflow-hidden rounded-[8px] bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ml-1 border border-[rgba(255,255,255,0.06)]">
                                  <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                </div>

                                <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                                  <span className="truncate text-[13.5px] font-semibold text-white/90 transition-colors tracking-tight line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                    {displayTitle}
                                  </span>

                                  <div className="flex items-center gap-2 mt-1.5" style={{ fontFamily: TOPBAR_FONT }}>
                                    {studioName && (
                                      <span className="flex items-center gap-1 px-1.5 py-[2px] rounded-[6px] border text-[10px] font-bold uppercase tracking-wider transition-colors" style={{ backgroundColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 88%)', borderColor: 'color-mix(in srgb, var(--app-accent, #8b5cf6), transparent 60%)', color: 'var(--app-accent, #8b5cf6)' }}>
                                        <Building2 size={9} />
                                        {studioName}
                                      </span>
                                    )}
                                    {year && <span className="text-[11.5px] font-medium text-zinc-500">{year}</span>}
                                  </div>
                                </div>

                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-zinc-400 opacity-0 -translate-x-4 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white group-hover/item:border-[rgba(255,255,255,0.2)] mr-1 shadow-sm">
                                  <ArrowRight size={13} />
                                </div>
                              </motion.button>
                            );
                          })
                        ) : (
                          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-14 px-6 text-center">
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] text-zinc-400 mb-5 border border-white/[0.06] shadow-inner">
                              <Building2 size={28} className="relative z-10" />
                            </div>
                            <h3 className="text-[17px] font-bold text-white/95 tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              No studio matches
                            </h3>
                            <p className="text-[13.5px] text-zinc-500 mt-2 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              No anime from studio <span className="text-white/80 font-medium">"{searchQuery}"</span> found
                            </p>
                          </motion.div>
                        )
                      ) : (
                        userSuggestions.length > 0 ? (
                          // User Search Results
                          userSuggestions.map((resultUser) => (
                            <motion.button
                              variants={itemVariants}
                              whileHover={{ scale: 1.015, x: 2 }}
                              whileTap={{ scale: 0.98 }}
                              key={resultUser.id}
                              onClick={() => handleUserResultClick(resultUser.id)}
                              className="group/item relative flex w-full items-center gap-4 rounded-[12px] p-2 text-left outline-none transition-all duration-300 overflow-hidden hover:bg-white/[0.06]"
                            >
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] opacity-0 transition-all duration-300 transform -translate-x-full group-hover/item:translate-x-0 group-hover/item:opacity-100" />

                              <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-full bg-black/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] ml-1 border border-[rgba(255,255,255,0.06)]">
                                {resultUser.avatar_url ? (
                                  <img src={resultUser.avatar_url} alt={resultUser.display_name} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                                    <User size={20} className="text-zinc-500" />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                                <span className="truncate text-[13.5px] font-semibold text-white/90 transition-colors tracking-tight line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                  {resultUser.display_name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5" style={{ fontFamily: TOPBAR_FONT }}>
                                  <span className="text-[11.5px] font-medium text-zinc-500">User Profile</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-zinc-400 opacity-0 -translate-x-4 transition-all duration-300 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white group-hover/item:border-[rgba(255,255,255,0.2)] mr-1 shadow-sm">
                                <ArrowRight size={13} />
                              </div>
                            </motion.button>
                          ))
                        ) : (
                          // Empty State Users
                          <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-14 px-6 text-center">
                            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.03] text-zinc-400 mb-5 border border-white/[0.06] shadow-inner">
                              <Ghost size={28} className="relative z-10" />
                            </div>
                            <h3 className="text-[17px] font-bold text-white/95 tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                              No users found
                            </h3>
                            <p className="text-[13.5px] text-zinc-500 mt-2 max-w-[90%] mx-auto" style={{ fontFamily: TOPBAR_FONT }}>
                              Try adjusting your search for <span className="text-white/80 font-medium">"{searchQuery}"</span>
                            </p>
                          </motion.div>
                        )
                      )}
                    </div>

                    {/* See All Results Footer */}
                    {((displayResults.length > 0 && searchMode === 'anime') || (studioResults.length > 0 && searchMode === 'studio')) && (
                      <motion.div variants={itemVariants} className="w-full mt-1 px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSearchSubmit}
                          className="flex w-full items-center justify-between px-4 py-3 rounded-[12px] text-[13px] font-medium text-zinc-400 transition-colors duration-200 hover:text-white hover:bg-white/[0.06] outline-none group"
                          style={{ fontFamily: TOPBAR_FONT }}
                        >
                          <span>See all results</span>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-[6px] bg-black/40 border border-white/[0.08] group-hover:border-white/[0.2] transition-colors duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                            <CornerDownLeft size={11} strokeWidth={2.5} /> Enter
                          </div>
                        </motion.button>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* ────────────── ACTION PILL ────────────── */}
          <div className="flex items-center gap-1.5 px-1.5" style={pillStyle}>

            {/* Notification Button */}
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.85, y: 1 }}
              onClick={() => setIsNotifOpen(true)}
              className={`group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out hover:bg-white/[0.08] hover:text-white ${isNotifOpen ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
                }`}
              style={{ width: 32, height: 32 }}
            >
              <Bell size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:rotate-[15deg] group-hover:scale-110" />
              {totalUnreadCount > 0 && (
                <span className="absolute right-[5px] top-[5px] h-[9px] w-[9px] rounded-full border-[1px] border-[var(--app-bg,#09090b)] bg-[var(--app-accent,#8b5cf6)]" />
              )}
              <ActionTooltip label="Notifications" hidden={isNotifOpen} />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Changelog Button */}
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.85, y: 1 }}
              onClick={() => setIsChangelogOpen(true)}
              className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              style={{ width: 32, height: 32 }}
            >
              <ScrollText size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
              <ActionTooltip label="What's New" />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.85, y: 1 }}
              onClick={() => setIsSettingsOpen(true)}
              className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              style={{ width: 32, height: 32 }}
            >
              <Settings size={16} strokeWidth={1.5} className="transition-transform duration-500 group-hover:rotate-90 group-hover:scale-110" />
              <ActionTooltip label="Settings" />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-white/[0.08]" />

            {/* Profile / Auth Button */}
            {user ? (
              <motion.button
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9, y: 1 }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: user.id } }));
                }}
                className="group relative flex items-center justify-center rounded-[10px] overflow-visible transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                style={{ width: 32, height: 32 }}
              >
                <div className="w-full h-full rounded-[10px] overflow-hidden border border-transparent group-hover:border-white/[0.2] group-hover:shadow-[0_4px_12px_rgba(255,255,255,0.1)] transition-all duration-300">
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" /> : <User size={16} strokeWidth={1.5} />}
                </div>
                <ActionTooltip label="Profile" />
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.85, y: 1 }}
                onClick={() => setIsAuthModalOpen(true)}
                className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                style={{ width: 32, height: 32 }}
              >
                <User size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />
                <ActionTooltip label="Sign In" />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* MODALS OUTSIDE OF EVENT LISTENERS/REFS */}
      <ProfileModal />
      <NotificationDropdown
        open={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        notifications={notifications}
        setNotifications={setNotifications}
      />
      <ChangelogModal open={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default DesktopTopbar;