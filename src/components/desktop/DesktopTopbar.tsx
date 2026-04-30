import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Bell, User, Calendar, ArrowRight, Ghost, ScrollText } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
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
import { fetchAnimeSuggestions } from '../../utils/animeApi';
import { supabase } from '../../lib/supabase';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

const dropdownVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96, filter: 'blur(12px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { type: 'spring', damping: 24, stiffness: 300, staggerChildren: 0.05 }
  },
  exit: { 
    opacity: 0, y: 12, scale: 0.96, filter: 'blur(8px)',
    transition: { duration: 0.15, ease: 'easeIn' }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', damping: 25, stiffness: 400 } }
};

// Sub-component for snappy bottom tooltips
const ActionTooltip = ({ label, hidden }: { label: string, hidden?: boolean }) => {
  if (hidden) return null;

  // Apply theme with 80% opacity
  const bgColor = 'color-mix(in srgb, var(--app-bg, #09090b) 80%, transparent)';
  const borderColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] z-[200] flex flex-col items-center">
      
      {/* 1. The Arrow (Themed) */}
      <div 
        className="w-2.5 h-2.5 rotate-45 border-l border-t z-[202] backdrop-blur-md"
        style={{ 
          backgroundColor: bgColor,
          borderColor: borderColor,
          marginBottom: '-6px' 
        }}
      />

      {/* 2. The Body (Themed) */}
      <div 
        className="relative text-[11.5px] font-bold tracking-wide px-3.5 py-1.5 rounded-[8px] border whitespace-nowrap backdrop-blur-md z-[201]"
        style={{ 
          fontFamily: TOPBAR_FONT, 
          backgroundColor: bgColor,
          borderColor: borderColor,
          color: '#FFFFFF', // Forces text white as requested
        }}
      >
        {/* 3. The Eraser - Matches theme bg to hide the overlap line */}
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

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string }> = ({ icon: Icon, label, to }) => (
  <NavLink to={to} style={{ fontFamily: TOPBAR_FONT }} className="relative flex items-center justify-center outline-none">
    {({ isActive }) => (
      <motion.div 
        className="group relative flex items-center gap-2.5 px-4 py-2 text-[13.5px] font-medium transition-colors duration-200 z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {isActive && (
          <motion.div
            layoutId="desktopActiveNavPill"
            className="absolute inset-0 rounded-[10px] z-0"
            style={{
              background: 'var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 15%, transparent))',
              border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 30%, transparent))'
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        
        {!isActive && (
          <div className="absolute inset-0 rounded-[10px] bg-white/[0.04] opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-0" />
        )}

        <Icon className={`relative z-10 h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 group-hover:text-white'}`} />
        <span className={`relative z-10 tracking-wide ${isActive ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400 group-hover:text-white'}`}>
          {label}
        </span>
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
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [pendingFrCount, setPendingFrCount] = useState(0);

  const [searchMode, setSearchMode] = useState<'anime' | 'users'>('anime');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { brandName } = useContentMode();
  const { user, profile } = useAuth();

  // Combine local standard unread + real-time friend requests
  const totalUnreadCount = notifications.filter(n => n.unread).length + pendingFrCount;

  const normalizeRoute = (p: string) => {
    if (p === '/' || p === '/anihome') return '/home';
    if (p === '/anibrowse') return '/browse';
    if (p === '/anirandom') return '/random';
    return p;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Handle closing search dropdown
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSearch]);

  // Fetch standard bookmarks updates
  useEffect(() => {
    checkBookmarksForUpdates(setNotifications);
    const intervalId = window.setInterval(() => checkBookmarksForUpdates(setNotifications), 1_800_000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Fetch pending friend requests count for the badge
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

    // Subscribe to realtime changes so the red dot updates instantly
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
          
          // Ensure theme safety & block adult content from results natively
          parsedResults = parsedResults.filter((anime: any) => {
            if (anime.isAdult === true) return false;
            if (typeof anime.format === 'string' && anime.format.toUpperCase() === 'HENTAI') return false;
            if (Array.isArray(anime.genres) && anime.genres.some((g: string) => g.toLowerCase() === 'hentai' || g.toLowerCase() === 'erotica')) return false;
            return true;
          });

          setSuggestions(parsedResults);
          setUserSuggestions([]);
        } else {
          // Search Users via Supabase
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
    if (searchQuery.trim() && searchMode === 'anime') {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsExpanded(false);
    }
  };

  const handleResultClick = (id: string | number) => {
    navigate(`/watch/${id}`);
    setIsExpanded(false);
    clearSearch();
    setSuggestions([]);
  };

  const handleUserResultClick = (id: string) => {
    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: id } }));
    setIsExpanded(false);
    clearSearch();
    setUserSuggestions([]);
  };

  const MAX_DISPLAY = 5; 
  const displayResults = suggestions.slice(0, MAX_DISPLAY);

  const pillStyle = {
    height: 40, 
    borderRadius: '12px', 
    backgroundColor: 'rgba(255,255,255,0.02)', 
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)'
  };

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1460px] lg:flex items-center justify-between px-6 py-4 relative z-50">
        
        {/* ────────────── LEFT ────────────── */}
        <div className="flex items-center gap-6 min-w-0">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate('/home')} 
            className="flex items-center gap-3 transition-opacity group"
          >
            <BrandLogo />
            <span className="text-[19px] font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent,#8b5cf6)]" style={{ fontFamily: DISPLAY_FONT }}>
              {brandName}
            </span>
          </motion.button>

          <div className="h-5 w-px shrink-0 bg-[rgba(255,255,255,0.06)]" />

          <nav className="flex items-center gap-1 relative">
            {topbarNavItems
              .filter(item => item.label !== 'Added' && item.label !== 'Updated')
              .map((item) => {
                const cleanRoute = normalizeRoute(item.to);
                if (item.label === 'Random') {
                  return (
                    <React.Fragment key={`fragment-${cleanRoute}`}>
                      <DesktopNavLink key="/schedule" icon={Calendar} label="Schedule" to="/schedule" />
                      <DesktopNavLink key={cleanRoute} icon={item.icon} label={item.label} to={cleanRoute} />
                    </React.Fragment>
                  );
                }
                return <DesktopNavLink key={cleanRoute} icon={item.icon} label={item.label} to={cleanRoute} />;
              })}
          </nav>
        </div>

        {/* ────────────── RIGHT ────────────── */}
        <div className="flex shrink-0 items-center gap-3">

          {/* Search Container */}
          <div ref={searchRef} className="relative flex items-center group">
            <motion.div
              layout
              className={`relative flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'w-[420px]' : 'w-[40px]'}`}
              style={pillStyle}
            >
              <button
                onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                className={`flex shrink-0 items-center justify-center h-full w-[38px] border-none outline-none ring-0 bg-transparent transition-colors duration-200 ${
                  isExpanded ? 'text-[var(--app-accent,#8b5cf6)]' : 'text-zinc-400'
                }`}
              >
                <Search size={16} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                placeholder="Search..."
                className={`flex-1 bg-transparent text-[13.5px] font-medium text-white placeholder:text-zinc-500 border-none outline-none ring-0 focus:ring-0 focus:outline-none transition-opacity duration-300 ${isExpanded ? 'opacity-100 mr-2' : 'opacity-0 pointer-events-none'}`}
                style={{ fontFamily: TOPBAR_FONT }}
              />

              {isExpanded && searchQuery && (
                <button
                  onClick={() => { clearSearch(); setSuggestions([]); setUserSuggestions([]); }}
                  className="flex shrink-0 items-center justify-center h-full w-[38px] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                >
                  {isLoadingSuggestions ? <Loader2 size={14} className="animate-spin text-[var(--app-accent,#8b5cf6)]" /> : <X size={14} />}
                </button>
              )}
            </motion.div>

            {/* Placed outside the overflow-hidden mask so it can bleed down */}
            <ActionTooltip label="Search" hidden={isExpanded} />

            {/* DROPDOWN UI */}
            <AnimatePresence>
              {isExpanded && searchQuery.trim().length > 1 && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="absolute right-0 top-[calc(100%+14px)] w-[420px] rounded-[20px] overflow-hidden flex flex-col z-[100]"
                  style={{
                    backgroundColor: 'var(--app-bg, #09090b)',
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03), rgba(255,255,255,0.03))',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="p-3 flex flex-col gap-1.5">
                    
                    {/* Search Mode Toggles */}
                    <div 
                      className="flex p-1 rounded-[12px] mb-2 relative z-10"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                      }}
                    >
                      {['anime', 'users'].map((mode) => {
                        const isActive = searchMode === mode;
                        return (
                          <button
                            key={mode}
                            onClick={() => setSearchMode(mode as 'anime' | 'users')}
                            className="relative flex-1 py-1.5 text-[12.5px] font-medium rounded-[10px] outline-none capitalize group"
                            style={{ fontFamily: TOPBAR_FONT }}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="searchToggleActive"
                                className="absolute inset-0 rounded-[10px] z-0"
                                style={{
                                  backgroundColor: 'var(--app-accent-muted, color-mix(in srgb, var(--app-accent, #8b5cf6) 20%, transparent))',
                                  border: '1px solid var(--app-accent-soft, color-mix(in srgb, var(--app-accent, #8b5cf6) 40%, transparent))'
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                            
                            {!isActive && (
                              <div className="absolute inset-0 rounded-[10px] bg-white/[0.04] opacity-0 scale-95 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 z-0" />
                            )}

                            <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                              {mode}
                            </span>
                          </button>
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
                              whileHover={{ scale: 1.015 }}
                              whileTap={{ scale: 0.98 }}
                              key={result.id}
                              onClick={() => handleResultClick(result.id)}
                              className="group/item relative flex w-full items-center gap-4 rounded-[12px] p-2 text-left outline-none transition-colors duration-200 overflow-hidden hover:bg-white/[0.06]"
                            >
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] opacity-0 transition-all duration-200 transform -translate-x-full group-hover/item:translate-x-0 group-hover/item:opacity-100" />

                              <div className="relative h-[68px] w-[48px] shrink-0 overflow-hidden rounded-[8px] bg-black/40 shadow-md ml-1 border border-[rgba(255,255,255,0.06)]">
                                <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                              </div>

                              <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                                <span className="truncate text-[13.5px] font-medium text-white/95 transition-colors tracking-tight line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                  {displayTitle}
                                </span>
                                
                                <div className="flex items-center gap-2 mt-1.5" style={{ fontFamily: TOPBAR_FONT }}>
                                  {format && (
                                    <span className="px-1.5 py-[2px] rounded-[6px] bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">
                                      {format}
                                    </span>
                                  )}
                                  {year && <span className="text-[11.5px] font-medium text-zinc-500">{year}</span>}
                                </div>
                              </div>

                              <div className="flex items-center justify-center h-8 w-8 rounded-[10px] bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-zinc-400 opacity-0 -translate-x-4 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white group-hover/item:border-[rgba(255,255,255,0.15)] mr-1">
                                <ArrowRight size={14} />
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
                    ) : (
                      userSuggestions.length > 0 ? (
                        // User Search Results
                        userSuggestions.map((resultUser) => (
                          <motion.button
                            variants={itemVariants}
                            whileHover={{ scale: 1.015 }}
                            whileTap={{ scale: 0.98 }}
                            key={resultUser.id}
                            onClick={() => handleUserResultClick(resultUser.id)}
                            className="group/item relative flex w-full items-center gap-4 rounded-[12px] p-2 text-left outline-none transition-colors duration-200 overflow-hidden hover:bg-white/[0.06]"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-[3px] rounded-r-full bg-[var(--app-accent,#8b5cf6)] opacity-0 transition-all duration-200 transform -translate-x-full group-hover/item:translate-x-0 group-hover/item:opacity-100" />

                            <div className="relative h-[48px] w-[48px] shrink-0 overflow-hidden rounded-full bg-black/40 shadow-md ml-1 border border-[rgba(255,255,255,0.06)]">
                              {resultUser.avatar_url ? (
                                <img src={resultUser.avatar_url} alt={resultUser.display_name} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/item:scale-110" loading="lazy" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-white/[0.03]">
                                  <User size={20} className="text-zinc-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                              <span className="truncate text-[13.5px] font-medium text-white/95 transition-colors tracking-tight line-clamp-1 group-hover/item:text-white" style={{ fontFamily: TOPBAR_FONT }}>
                                {resultUser.display_name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5" style={{ fontFamily: TOPBAR_FONT }}>
                                <span className="text-[11.5px] font-medium text-zinc-500">User Profile</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-center h-8 w-8 rounded-[10px] bg-white/[0.03] border border-[rgba(255,255,255,0.06)] text-zinc-400 opacity-0 -translate-x-4 transition-all duration-200 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:text-white group-hover/item:border-[rgba(255,255,255,0.15)] mr-1">
                              <ArrowRight size={14} />
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

                  {/* See All Results Footer (Only show for anime browse) */}
                  {displayResults.length > 0 && searchMode === 'anime' && (
                    <motion.div variants={itemVariants} className="w-full mt-1 px-3 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSearchSubmit}
                        className="flex w-full items-center justify-between px-4 py-2.5 rounded-[12px] text-[13px] font-medium text-zinc-400 transition-colors duration-200 hover:text-white hover:bg-white/[0.06] outline-none group"
                        style={{ fontFamily: TOPBAR_FONT }}
                      >
                        <span>See all results</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-[8px] bg-white/[0.03] border border-white/[0.06] group-hover:border-white/[0.15] transition-colors duration-200">
                          <span className="text-[14px] leading-none">↵</span> Enter
                        </div>
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ────────────── ACTION PILL ────────────── */}
          <div className="flex items-center gap-1.5 px-1.5" style={pillStyle}>
            
            {/* Notification Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsNotifOpen(true)}
              className={`group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out hover:bg-white/[0.08] hover:text-white ${
                isNotifOpen ? 'bg-white/[0.08] text-white' : 'text-zinc-400'
              }`}
              style={{ width: 32, height: 32 }}
            >
              <Bell size={16} strokeWidth={1.5} />
              {totalUnreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-[1.5px] border-[var(--app-bg,#09090b)] bg-[var(--app-accent,#8b5cf6)]" />
              )}
              <ActionTooltip label="Notifications" hidden={isNotifOpen} />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-[rgba(255,255,255,0.06)]" />

            {/* Changelog Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsChangelogOpen(true)}
              className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              style={{ width: 32, height: 32 }}
            >
              <ScrollText size={16} strokeWidth={1.5} />
              <ActionTooltip label="What's New" />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-[rgba(255,255,255,0.06)]" />

            {/* Settings Button */}
            <motion.button 
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsSettingsOpen(true)} 
              className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white" 
              style={{ width: 32, height: 32 }}
            >
              <Settings size={16} strokeWidth={1.5} />
              <ActionTooltip label="Settings" />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-[rgba(255,255,255,0.06)]" />

            {/* Profile / Auth Button */}
            {user ? (
              <motion.button 
                whileTap={{ scale: 0.92 }}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: user.id } }));
                }} 
                className="group relative flex items-center justify-center rounded-[10px] overflow-visible transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white" 
                style={{ width: 32, height: 32 }}
              >
                <div className="w-full h-full rounded-[10px] overflow-hidden border border-transparent group-hover:border-[rgba(255,255,255,0.1)] transition-colors">
                  {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" /> : <User size={16} strokeWidth={1.5} />}
                </div>
                <ActionTooltip label="Profile" />
              </motion.button>
            ) : (
              <motion.button 
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsAuthModalOpen(true)} 
                className="group relative flex items-center justify-center rounded-[10px] transition-colors duration-200 ease-out text-zinc-400 hover:bg-white/[0.08] hover:text-white" 
                style={{ width: 32, height: 32 }}
              >
                <User size={16} strokeWidth={1.5} />
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