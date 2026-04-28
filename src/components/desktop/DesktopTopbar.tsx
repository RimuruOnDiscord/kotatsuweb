/* --- START OF FILE DesktopTopbar.tsx --- */

import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Bell, User, Calendar, ArrowRight, Ghost, Play } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import ProfileModal from '../shared/ProfileModal';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';
import NotificationDropdown, { INITIAL_NOTIFICATIONS, AppNotification } from '../shared/NotificationDropdown';
import { checkBookmarksForUpdates } from '../../utils/bookmarkUpdateChecker';
import { fetchAnimeSuggestions } from '../../utils/animeApi';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

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
    --aw-accent-dim:  var(--app-accent-muted);
    
    --aw-text:        var(--app-text, #ffffff);
    --aw-muted:       color-mix(in srgb, var(--aw-text) 60%, transparent);
    
    --aw-font-display: 'Syne', sans-serif; 
    --aw-font-body:    'Onest', sans-serif;
  }
  
  .aw-topbar-input::placeholder { color: var(--aw-muted); opacity: 0.6; }

  /* OVERLAY GLASS: 96% Opaque to completely block images behind it, but theme-aware */
  .aw-ultra-frosted {
    background: color-mix(in srgb, var(--aw-bg) 96%, transparent);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--aw-border);
    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.9);
  }
`;

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
        className="group relative flex items-center gap-2.5 px-4 py-2 text-sm font-medium transition-colors duration-150 z-10"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        {isActive && (
          <motion.div
            layoutId="desktopActiveNavPill"
            className="absolute inset-0 rounded-[10px] bg-[color-mix(in_srgb,var(--aw-accent),transparent_85%)] border border-[color-mix(in_srgb,var(--aw-accent),transparent_80%)] z-0"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        
        {!isActive && (
          <div className="absolute inset-0 rounded-[10px] bg-[rgba(255,255,255,0.04)] opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-0" />
        )}

        <Icon className={`relative z-10 h-4 w-4 transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-[var(--aw-accent)]' : 'text-[var(--aw-muted)] group-hover:text-[var(--aw-text)]'}`} />
        <span className={`relative z-10 tracking-wide ${isActive ? 'text-[var(--aw-accent)]' : 'text-[var(--aw-muted)] group-hover:text-[var(--aw-text)]'}`}>
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => n.unread).length;

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const { brandName } = useContentMode();
  const { user, profile } = useAuth();

  useEffect(() => {
    const id = 'aw-design-styles-desktop-topbar';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  const normalizeRoute = (p: string) => {
    if (p === '/' || p === '/anihome') return '/home';
    if (p === '/anibrowse') return '/browse';
    if (p === '/anirandom') return '/random';
    return p;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
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
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingSuggestions(true);
      try {
        const res = await fetchAnimeSuggestions(searchQuery.trim());
        let parsedResults: any[] = [];
        if (Array.isArray(res)) parsedResults = res;
        else if (res && Array.isArray((res as any).results)) parsedResults = (res as any).results;
        else if (res && Array.isArray((res as any).data)) parsedResults = (res as any).data;
        else if (res && Array.isArray((res as any).suggestions)) parsedResults = (res as any).suggestions;
        
        setSuggestions(parsedResults);
      } catch (error) {
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
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

  const H = 40;
  const MAX_DISPLAY = 5; 
  const displayResults = suggestions.slice(0, MAX_DISPLAY);

  const pillStyle = {
    height: H, 
    borderRadius: '12px', 
    background: 'rgba(10, 10, 15, 0.25)', 
    border: '1px solid rgba(255, 255, 255, 0.08)'
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
            <span className="text-xl font-bold tracking-tight text-[var(--aw-text)] transition-colors group-hover:text-[var(--aw-accent)]" style={{ fontFamily: DISPLAY_FONT }}>
              {brandName}
            </span>
          </motion.button>

          <div className="h-5 w-px shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />

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
          <div ref={searchRef} className="relative flex items-center">
            <motion.div
              layout
              className={`relative flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'w-[420px]' : 'w-[40px]'}`}
              style={pillStyle}
            >
              <button
                onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                className="flex shrink-0 items-center justify-center h-full w-[40px] border-none outline-none ring-0 bg-transparent transition-colors duration-150"
                style={{ color: isExpanded ? 'var(--aw-accent)' : 'var(--aw-muted)' }}
              >
                <Search size={16} />
              </button>

              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                placeholder="Search anime..."
                className={`flex-1 bg-transparent text-[14px] font-medium text-[var(--aw-text)] border-none outline-none ring-0 focus:ring-0 focus:outline-none transition-opacity duration-300 ${isExpanded ? 'opacity-100 mr-2' : 'opacity-0 pointer-events-none'}`}
                style={{ fontFamily: TOPBAR_FONT }}
              />

              {isExpanded && searchQuery && (
                <button
                  onClick={() => { clearSearch(); setSuggestions([]); }}
                  className="flex shrink-0 items-center justify-center h-full w-[40px] text-[var(--aw-muted)] hover:text-[var(--aw-text)] hover:bg-[rgba(255,255,255,0.06)] transition-all duration-150"
                >
                  {isLoadingSuggestions ? <Loader2 size={14} className="animate-spin text-[var(--aw-accent)]" /> : <X size={14} />}
                </button>
              )}
            </motion.div>

            {/* DROPDOWN UI */}
            <AnimatePresence>
              {isExpanded && searchQuery.trim().length > 1 && (
                <motion.div
                  variants={dropdownVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="aw-ultra-frosted absolute right-0 top-[calc(100%+14px)] w-[420px] rounded-[24px] overflow-hidden flex flex-col z-[100]"
                >
                  <div className="p-3 flex flex-col gap-1.5">
                    
                    {isLoadingSuggestions && suggestions.length === 0 ? (
                      // Skeleton Loaders
                      [1, 2, 3].map((i) => (
                        <div key={i} className="flex w-full items-center gap-4 rounded-[16px] p-2">
                          <div className="h-[68px] w-[48px] shrink-0 rounded-[10px] bg-[rgba(255,255,255,0.04)] animate-pulse border border-[rgba(255,255,255,0.04)]" />
                          <div className="flex flex-col gap-2.5 flex-1 justify-center">
                            <div className="h-4 w-2/3 rounded-md bg-[rgba(255,255,255,0.04)] animate-pulse" />
                            <div className="flex gap-2">
                              <div className="h-3 w-8 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
                              <div className="h-3 w-12 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : displayResults.length > 0 ? (
                      // Search Results
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
                            whileHover={{ scale: 1.015 }} // Removed background from Framer Motion
                            whileTap={{ scale: 0.98 }}
                            key={result.id}
                            onClick={() => handleResultClick(result.id)}
                            // Changed to duration-150 and used CSS hover for bg
                            className="group relative flex w-full items-center gap-4 rounded-[16px] p-2 text-left outline-none transition-all duration-150 overflow-hidden border border-transparent hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.08)]"
                          >
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[50%] w-1 rounded-r-full bg-[var(--aw-accent)] opacity-0 transition-all duration-150 transform -translate-x-full group-hover:translate-x-0 group-hover:opacity-100" />

                            <div className="relative h-[68px] w-[48px] shrink-0 overflow-hidden rounded-[10px] bg-[rgba(0,0,0,0.4)] shadow-md ml-1 border border-[rgba(255,255,255,0.08)]">
                              <img src={cover} alt={displayTitle} className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" loading="lazy" />
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 justify-center pr-2">
                              <span className="truncate text-[15px] font-bold text-[var(--aw-text)] transition-colors tracking-tight line-clamp-1" style={{ fontFamily: 'var(--aw-font-display)' }}>
                                {displayTitle}
                              </span>
                              
                              <div className="flex items-center gap-2 mt-1.5" style={{ fontFamily: 'var(--aw-font-body)' }}>
                                {format && (
                                  <span className="px-1.5 py-[2px] rounded-[4px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[10px] font-bold text-[var(--aw-muted)] uppercase tracking-wider">
                                    {format}
                                  </span>
                                )}
                                {year && <span className="text-[12px] font-medium text-[var(--aw-muted)]">{year}</span>}
                              </div>
                            </div>

                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[var(--aw-muted)] opacity-0 -translate-x-4 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[var(--aw-text)] group-hover:border-[rgba(255,255,255,0.15)] mr-1">
                              <ArrowRight size={14} />
                            </div>
                          </motion.button>
                        );
                      })
                    ) : (
                      // Empty State
                      <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-14 px-6 text-center">
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(255,255,255,0.04)] text-[var(--aw-muted)] mb-5 border border-[rgba(255,255,255,0.08)] shadow-inner">
                          <Ghost size={28} className="relative z-10" />
                        </div>
                        <h3 className="text-[18px] font-bold text-[var(--aw-text)] tracking-tight" style={{ fontFamily: 'var(--aw-font-display)' }}>
                          No results found
                        </h3>
                        <p className="text-[14px] text-[var(--aw-muted)] mt-2 max-w-[90%] mx-auto" style={{ fontFamily: 'var(--aw-font-body)' }}>
                          Try adjusting your search for <span className="text-[var(--aw-text)] font-semibold">"{searchQuery}"</span>
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Redesigned Footer */}
                  {displayResults.length > 0 && (
                    <motion.div variants={itemVariants} className="w-full border-t border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.2)] mt-1 p-2">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSearchSubmit}
                        // Snappy duration-150
                        className="flex w-full items-center justify-between px-4 py-2.5 rounded-[12px] text-[13px] font-bold text-[var(--aw-muted)] transition-all duration-150 hover:text-[var(--aw-text)] hover:bg-[rgba(255,255,255,0.06)] outline-none group border border-transparent hover:border-[rgba(255,255,255,0.08)]"
                        style={{ fontFamily: 'var(--aw-font-body)' }}
                      >
                        <span>See all results</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(255,255,255,0.15)] transition-colors duration-150">
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
            
            <div className="relative flex items-center h-full" ref={notifRef}>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--aw-text)' }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative flex items-center justify-center rounded-[10px] transition-colors duration-150"
                style={{ 
                  width: 32, height: 32, 
                  color: isNotifOpen ? 'var(--aw-text)' : 'var(--aw-muted)', 
                  background: isNotifOpen ? 'rgba(255,255,255,0.08)' : 'transparent' 
                }}
              >
                <Bell size={16} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-[1.5px] border-[rgba(20,20,25,1)] bg-[var(--aw-accent)]" />
                )}
              </motion.button>
              {isNotifOpen && <NotificationDropdown notifications={notifications} setNotifications={setNotifications} />}
            </div>

            <div className="h-4 w-px mx-0.5 bg-[rgba(255,255,255,0.08)]" />

            <motion.button 
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--aw-text)' }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsSettingsOpen(true)} 
              className="flex items-center justify-center rounded-[10px] transition-colors duration-150" 
              style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
            >
              <Settings size={16} strokeWidth={1.5} />
            </motion.button>

            <div className="h-4 w-px mx-0.5 bg-[rgba(255,255,255,0.08)]" />

            {user ? (
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsProfileModalOpen(true)} 
                className="group flex items-center justify-center rounded-[10px] overflow-hidden transition-colors duration-150 border border-transparent hover:border-[rgba(255,255,255,0.08)]" 
                style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
              >
                {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" /> : <User size={16} strokeWidth={1.5} />}
              </motion.button>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--aw-text)' }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setIsAuthModalOpen(true)} 
                className="group flex items-center justify-center rounded-[10px] transition-colors duration-150" 
                style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
              >
                <User size={16} strokeWidth={1.5} />
              </motion.button>
            )}
          </div>
        </div>
      </div>

      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default DesktopTopbar;

/* --- END OF FILE DesktopTopbar.tsx --- */