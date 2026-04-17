import React, { useEffect, useState } from 'react';
import { Menu, Palette, Search, X } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { handleRippleMouseDown } from '../../utils/ripple';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';
import { useContentMode } from '../../utils/contentMode';

interface MobileTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  clearSearch: () => void;
  submitSearch: (query: string) => void;
  openResult: (result: SearchResult) => void;
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  searchMounted: boolean;
  searchResults: SearchResult[];
}

const MobileTopbar: React.FC<MobileTopbarProps> = ({
  searchQuery,
  onSearchQueryChange,
  clearSearch,
  submitSearch,
  openResult,
  isSearching,
  showSearch,
  setShowSearch,
  searchMounted,
  searchResults,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeKey>('emerald');
  const { isAnimeMode, toggleMode, brandName } = useContentMode();

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  // FIX 1: Map static paths to the correct mode-specific paths for NavLinks
  const getMappedPath = (path: string) => {
    if (isAnimeMode) {
      if (path === '/') return '/anihome';
      if (path === '/browse') return '/anibrowse';
      return path;
    } else {
      if (path === '/anihome') return '/';
      if (path === '/anibrowse') return '/browse';
      return path;
    }
  };

  // FIX 2: Path redirection logic for the TOGGLE switch
  const getRedirectPathOnToggle = (path: string, currentIsAnime: boolean) => {
    const currentPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;

    if (currentIsAnime) {
      // Switching TO Manga Mode
      if (currentPath === '/anihome') return '/';
      if (currentPath === '/anibrowse') return '/browse';
      if (currentPath.startsWith('/watch')) return currentPath.replace(/^\/watch/, '/read'); 
      return '/'; 
    } else {
      // Switching TO Anime Mode
      if (currentPath === '/') return '/anihome';
      if (currentPath === '/browse') return '/anibrowse';
      if (currentPath === '/updated' || currentPath === '/added') return '/anibrowse'; 
      if (currentPath.startsWith('/read')) return currentPath.replace(/^\/read/, '/watch'); 
      return '/anihome'; 
    }
  };

  const handleToggleMode = () => {
    const nextPath = getRedirectPathOnToggle(location.pathname, isAnimeMode);
    toggleMode();
    window.location.assign(nextPath); // Hard refresh to ensure mode sync
  };

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      return;
    }
    if (!menuMounted) return;
    const timeoutId = window.setTimeout(() => setMenuMounted(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [menuMounted, menuOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchOpen(true);
    }
  }, [searchQuery]);

  const closeSearch = () => {
    setSearchOpen(false);
    setShowSearch(false);
    clearSearch();
  };

  const handleThemeSelect = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  return (
    <div className="relative lg:hidden">
      <div className="mx-auto flex w-full max-w-[1420px] items-center justify-between gap-3 px-4 py-3">
        {/* FIX 3: Dynamic Logo Home Path */}
        <button 
          onClick={() => navigate(isAnimeMode ? '/anihome' : '/')} 
          onMouseDown={handleRippleMouseDown} 
          className="ripple-button px-1 py-1 transition-opacity hover:opacity-90"
        >
          <BrandLogo />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((current) => !current);
              setMenuOpen(false);
            }}
            onMouseDown={handleRippleMouseDown}
            className="ripple-button flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-300 transition-colors hover:text-white"
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((current) => !current);
              setSearchOpen(false);
              setShowSearch(false);
            }}
            onMouseDown={handleRippleMouseDown}
            className="ripple-button flex h-11 w-11 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-300 transition-colors hover:text-white"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Search drawer code omitted for brevity - no changes needed there */}
      
      {menuMounted ? (
        <div
          className={`mx-auto max-w-[1420px] px-4 pb-3 transition-all duration-300 ${
            menuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-[1.6rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_22px_48px_-28px_rgba(0,0,0,0.92)]">
            <nav className="grid grid-cols-2 gap-2 p-3">
              {topbarNavItems.map((item) => {
                const Icon = item.icon;
                // FIX 4: Wrap the 'to' path with getMappedPath
                const mappedTo = getMappedPath(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={mappedTo}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-[1.1rem] border px-3 py-3 text-sm font-black transition-all ${
                        isActive
                          ? 'border-[var(--app-border)] bg-[var(--app-accent-muted)] text-[var(--app-accent)]'
                          : 'border-[var(--app-border)] bg-[var(--app-surface-2)] text-zinc-300'
                      }`
                    }
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="border-t border-white/[0.06] p-3">
              <div className="mb-3 rounded-[1.1rem] border border-[var(--app-border)] bg-[var(--app-surface-2)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Mode</div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white">{brandName}</div>
                  </div>
<button
  type="button"
  onClick={handleToggleMode}
  onPointerDown={handleRippleMouseDown}
  className={`ripple-button relative flex h-10 w-[88px] items-center rounded-full border transition-all duration-300 ${
    isAnimeMode 
      ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] shadow-[0_0_15px_rgba(0,0,0,0.2)]' 
      : 'border-[var(--app-border)] bg-black/40'
  }`}
>
  {/* The Knob */}
  <span
    className={`absolute h-8 w-[40px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
      isAnimeMode 
        ? 'translate-x-[44px] bg-[var(--app-accent)] shadow-[0_2px_8px_rgba(0,0,0,0.3)]' 
        : 'translate-x-1 bg-[var(--app-accent)]'
    }`}
  />

  {/* The Text Labels */}
  <div className="relative z-10 flex w-full items-center justify-between text-[10px] font-black uppercase tracking-[0.12em]">
    <span className={`flex-1 text-center transition-colors duration-300 ${
      !isAnimeMode ? 'text-[#04110d]' : 'text-white-500'
    }`}>
      Web
    </span>
    <span className={`flex-1 text-center transition-colors duration-300 ${
      isAnimeMode ? 'text-[#04110d]' : 'text-white-500'
    }`}>
      TV
    </span>
  </div>
</button>
                </div>
              </div>
              
              {/* Theme selector omitted for brevity - no changes needed */}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MobileTopbar;
