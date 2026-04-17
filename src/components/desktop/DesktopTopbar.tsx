import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Tv, Book } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';

interface DesktopTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  clearSearch: () => void;
  submitSearch: (query: string) => void;
  openResult: (result: SearchResult) => void;
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

  /**
   * REDIRECT LOGIC
   * Automatically handles path correction when the component mounts or the route changes.
   */
  useEffect(() => {
    if (isAnimeMode && location.pathname === '/') {
      // If TV/Anime mode is ON and user hits '/', go to /anihome
      navigate('/anihome', { replace: true });
    } else if (!isAnimeMode && location.pathname === '/anihome') {
      // If TV/Anime mode is OFF and user is on /anihome, go back to '/'
      navigate('/', { replace: true });
    }
  }, [isAnimeMode, location.pathname, navigate]);

  // Helper to determine the correct path for NavLinks based on TV/Anime Mode
  const getNavRoute = (originalPath: string) => {
    if (isAnimeMode) {
      switch (originalPath) {
        case '/': 
          return '/anihome';
        case '/browse': 
          return '/anibrowse';
        default: 
          return originalPath;
      }
    }
    return originalPath;
  };

  // Helper to figure out where to redirect the user upon toggling modes
  const getRedirectPathOnToggle = (currentPath: string, currentIsAnime: boolean) => {
    if (currentIsAnime) {
      // Switching TO Manga Mode
      if (currentPath === '/anihome') return '/';
      if (currentPath === '/anibrowse') return '/browse';
      if (currentPath.startsWith('/watch')) return currentPath.replace(/^\/watch/, '/read'); 
      return currentPath;
    } else {
      // Switching TO Anime Mode
      if (currentPath === '/') return '/anihome';
      if (currentPath === '/browse') return '/anibrowse';
      if (currentPath === '/updated' || currentPath === '/added') return '/anibrowse'; 
      if (currentPath.startsWith('/read')) return currentPath.replace(/^\/read/, '/watch'); 
      return currentPath;
    }
  };

  const handleToggleMode = () => {
    const targetPath = getRedirectPathOnToggle(location.pathname, isAnimeMode);
    toggleMode();
    
    setTimeout(() => {
      if (location.pathname !== targetPath) {
        window.location.href = targetPath;
      } else {
        window.location.reload();
      }
    }, 100);
  };

  // Close search on click outside
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
            className={`flex items-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              isExpanded
                ? 'w-[320px] border border-[var(--app-border)] bg-[var(--app-surface-1)] hover:bg-[var(--app-surface-2)]'
                : 'w-10 bg-transparent border border-transparent'
            }`}
          >
            <button
              onClick={() => {
                setIsExpanded(true);
                window.setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                isExpanded ? 'text-[var(--app-accent)]' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <Search size={18} />
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder={isAnimeMode ? 'Search anime... (Ctrl+K)' : 'Search manga... (Ctrl+K)'}
              value={searchQuery}
              onChange={(e) => {
                onSearchQueryChange(e.target.value);
                if (!showSearch && e.target.value.trim()) setShowSearch(true);
              }}
              className={`h-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none transition-all duration-300 ${
                isExpanded ? 'w-full opacity-100 pr-4' : 'w-0 opacity-0'
              }`}
            />

            {isExpanded && searchQuery && (
              <button onClick={clearSearch} className="mr-3 p-1 text-zinc-500 hover:text-zinc-200">
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {isExpanded && showSearch && searchQuery.length >= 2 && (
            <div className="absolute top-full right-0 z-50 mt-3 w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B111A]/95 p-2 shadow-2xl backdrop-blur-xl">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.id}-${result.mal_id}`}
                    onClick={() => {
                      openResult(result);
                      setIsExpanded(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5"
                  >
                    <img src={result.images.jpg.image_url} alt="" className="h-12 w-9 rounded-md object-cover bg-white/5" />
                    <div className="min-w-0 text-left">
                      <p className="line-clamp-1 text-sm font-medium text-zinc-200">{result.title}</p>
                      <p className="text-xs text-zinc-500">
                        {result.type || (isAnimeMode ? 'ANIME' : 'MANGA')} • {(result.status || 'UNKNOWN').replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                ))
              ) : !isSearching ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic">No results found for "{searchQuery}"</div>
              ) : null}

              <button
                type="button"
                onClick={() => submitSearch(searchQuery)}
                className="mt-2 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                Open Browse Results
              </button>
            </div>
          )}
        </div>

        <div className="ml-1 flex items-center gap-2 border-l border-white/10 pl-3">
          <button
            type="button"
            onClick={handleToggleMode}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 text-[#a1a1aa] hover:bg-white/5 hover:text-zinc-400`}
            title={isAnimeMode ? 'Switch to Manga Mode' : 'Switch to Anime Mode'}
          >
            {isAnimeMode ? (
              <Tv size={18} className="animate-in fade-in zoom-in duration-300" />
            ) : (
              <Book size={18} className="animate-in fade-in zoom-in duration-300" />
            )}
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