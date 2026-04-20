import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Tv, Book } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';

interface DesktopTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  clearSearch: () => void;
  submitSearch: (query: string) => void;
  openResult: (slug: string) => void;
  isAnimeMode: boolean;
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  searchResults: SearchResult[];
}

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group relative flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)] text-[var(--app-accent)]'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`
    }
  >
    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
    <span className="relative">{label}</span>
  </NavLink>
);

const DesktopTopbar: React.FC<DesktopTopbarProps> = ({
  searchQuery,
  onSearchQueryChange,
  clearSearch,
  submitSearch,
  openResult,
  isSearching,
  showSearch,
  setShowSearch,
  searchResults,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAnimeMode, toggleMode, brandName } = useContentMode();

  // Mode-based redirection for core homepages
  useEffect(() => {
    if (isAnimeMode && location.pathname === '/') {
      navigate('/anihome', { replace: true });
    } else if (!isAnimeMode && location.pathname === '/anihome') {
      navigate('/', { replace: true });
    }
  }, [isAnimeMode, location.pathname, navigate]);

  // Maps generic routes to mode-specific routes
  const getNavRoute = (originalPath: string) => {
    if (isAnimeMode) {
      switch (originalPath) {
        case '/': return '/anihome';
        case '/browse': return '/anibrowse';
        case '/random': return '/anirandom'; // Added for Anime Mode
        default: return originalPath;
      }
    }
    return originalPath;
  };

  const handleToggleMode = () => {
    const current = location.pathname;
    let nextPath = isAnimeMode ? '/' : '/anihome';
    
    // Smart path switching when toggling modes
    if (current.includes('/browse') || current.includes('/anibrowse')) {
      nextPath = isAnimeMode ? '/browse' : '/anibrowse';
    } else if (current.includes('/random') || current.includes('/anirandom')) {
      nextPath = isAnimeMode ? '/random' : '/anirandom';
    }

    toggleMode();
    window.location.assign(nextPath);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSearch]);

  return (
    <div className="mx-auto hidden w-full max-w-[1420px] items-center justify-between gap-6 px-6 py-4 lg:flex">
      <div className="flex min-w-0 items-center gap-8">
        <button
          onClick={() => navigate(getNavRoute('/'))}
          className="flex items-center gap-3 transition-all duration-300 hover:opacity-80 active:scale-95 group"
        >
          <BrandLogo />
          <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent)]">
            {brandName}
          </span>
        </button>

        <nav className="flex items-center gap-1">
          {topbarNavItems.map((item) => (
            <DesktopNavLink 
              key={item.to} 
              icon={item.icon} 
              label={item.label} 
              to={getNavRoute(item.to)} 
            />
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div ref={searchRef} className="relative flex items-center">
          <div
            className={`group relative flex items-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              isExpanded ? 'w-[320px]' : 'w-10'
            }`}
          >
            <div className={`absolute -inset-[1px] rounded-[1.25rem] bg-[var(--app-accent)] blur-[2px] transition-opacity duration-500 ${
              isExpanded ? 'opacity-20' : 'opacity-0'
            }`} />
            
            <button
              onClick={() => {
                setIsExpanded(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`absolute left-0 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
                isExpanded ? 'translate-x-0 text-[var(--app-accent)]' : 'text-zinc-400 hover:bg-white/5'
              }`}
            >
              <Search size={16} className={isExpanded ? 'scale-110' : ''} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                if (!showSearch && e.target.value.trim()) setShowSearch(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch(searchQuery)}
              placeholder={isAnimeMode ? 'Search Anime...' : 'Search Manga...'}
              className={`peer relative h-11 w-full rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] pl-11 text-[13px] font-medium text-white shadow-inner outline-none transition-all duration-500 placeholder:text-zinc-500 hover:bg-[var(--app-surface-2)] focus:border-[var(--app-accent)] ${
                isExpanded ? 'opacity-100 pr-10' : 'w-0 border-transparent bg-transparent opacity-0'
              }`}
            />

            {isExpanded && searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-all"
              >
                {isSearching ? <Loader2 size={14} className="animate-spin text-[var(--app-accent)]" /> : <X size={14} className="hover:text-[var(--app-accent)]" />}
              </button>
            )}

            {isExpanded && !searchQuery && (
              <div className="pointer-events-none absolute right-4 flex items-center gap-1 rounded border border-[var(--app-accent)] bg-[var(--app-accent-muted)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--app-accent)] opacity-0 transition-opacity duration-300 group-focus-within:opacity-100">
                <span>ENTER</span>
              </div>
            )}
          </div>

          {isExpanded && showSearch && searchQuery.length >= 2 && (
            <div className="absolute top-full right-0 z-50 mt-3 w-[400px] overflow-hidden rounded-[1.6rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-2xl backdrop-blur-xl">
<TopbarSearchResultsContent
  isSearching={isSearching}
  searchQuery={searchQuery}
  searchResults={searchResults}
  isAnimeMode={isAnimeMode}
  onOpenResult={(slug: string) => {
    // 1. We ignore the 'openResult' prop if it's misbehaving/broken
    // 2. We use the 'isAnimeMode' to pick the right path
    const path = isAnimeMode ? `/watch/${slug}` : `/read/${slug}`;
    
    // 3. Navigate directly
    navigate(path);
    
    // 4. Close the search UI
    setIsExpanded(false);
    setShowSearch(false);
  }}
  onSubmitSearch={() => {
    submitSearch(searchQuery);
    setIsExpanded(false);
    setShowSearch(false);
  }}
/>
            </div>
          )}
        </div>

        <div className="ml-1 flex items-center gap-2 border-l border-white/10 pl-3">
          <button
            type="button"
            onClick={handleToggleMode}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 text-[#a1a1aa] hover:bg-white/5 hover:text-zinc-400"
            title={isAnimeMode ? 'Switch to Manga Mode' : 'Switch to Anime Mode'}
          >
            {isAnimeMode ? <Tv size={18} /> : <Book size={18} />}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopTopbar;