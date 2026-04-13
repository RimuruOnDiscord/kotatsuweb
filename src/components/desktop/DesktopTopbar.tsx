import React, { useEffect, useState } from 'react';
import { ChevronDown, Github, Search, X, RotateCw } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { handleRippleMouseDown } from '../../utils/ripple';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';

const THEME_COLORS: Record<ThemeKey, string> = {
  emerald: '#10b981',
  ocean:   '#38bdf8',
  ember:   '#f97316',
};

interface DesktopTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  clearSearch: () => void;
  submitSearch: (query: string) => void;
  openManga: (mangaId: number) => void;
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  searchMounted: boolean;
  searchResults: SearchResult[];
}

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `relative group flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 ${
        isActive ? 'text-[var(--app-accent)]' : 'text-gray-400 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} style={{ backgroundColor: 'var(--app-accent-muted)' }} />
        <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} style={{ backgroundColor: 'var(--app-accent)' }} />
        <Icon className={`relative z-10 h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="relative z-10">{label}</span>
      </>
    )}
  </NavLink>
);

const DesktopTopbar: React.FC<DesktopTopbarProps> = ({
  searchQuery,
  onSearchQueryChange,
  clearSearch,
  submitSearch,
  openManga,
  isSearching,
  showSearch,
  setShowSearch,
  searchMounted,
  searchResults,
}) => {
  const navigate = useNavigate();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeKey>('emerald');

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const handleThemeSelect = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    setThemeState(nextTheme);
    setThemeMenuOpen(false);
  };

  const toggleTheme = () => {
  const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.key === theme);
  const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
  handleThemeSelect(THEME_OPTIONS[nextIndex].key);
};

  return (
    <div className="mx-auto hidden w-full max-w-[1420px] items-center justify-between gap-6 px-4 py-3 lg:flex">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={() => navigate('/')} onMouseDown={handleRippleMouseDown} className="ripple-button px-1 py-1 transition-opacity hover:opacity-90">
          <BrandLogo />
        </button>

        <nav className="flex items-center gap-1 rounded-2xl p-1.5">
          {topbarNavItems.map((item) => (
            <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Search */}
        <div className="group relative">
          <div className="relative flex items-center hover:border-white/20 overflow-hidden rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_20px_55px_-34px_rgba(0,0,0,0.95)]">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <Search className={`absolute left-4 transition-all duration-300 ${searchQuery.trim() ? 'text-[var(--app-accent)]' : 'text-zinc-600'}`} size={14} />
            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              onFocus={() => searchQuery.trim() && setShowSearch(true)}
              onBlur={() => window.setTimeout(() => setShowSearch(false), 160)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitSearch(searchQuery);
                }
                if (event.key === 'Escape') {
                  setShowSearch(false);
                }
              }}
              className="w-[240px] bg-transparent py-3 pl-11 pr-[7.25rem] text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none transition-all duration-500 placeholder:text-zinc-600 focus:w-[320px] focus:text-white md:w-[280px]"
              placeholder="Search"
              autoComplete="off"
            />
            <div className="absolute right-3 flex items-center gap-2">
              <span className="hidden rounded-full border border-white/[0.06] bg-[var(--app-surface-2)] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 lg:inline-flex">
                Enter
              </span>
              {isSearching ? (
                <div className="flex gap-0.5">
                  <div className="h-3 w-1 animate-[bounce_1s_infinite_0ms] rounded-full" style={{ backgroundColor: 'var(--app-accent)' }} />
                  <div className="h-3 w-1 animate-[bounce_1s_infinite_200ms] rounded-full" style={{ backgroundColor: 'var(--app-accent)' }} />
                  <div className="h-3 w-1 animate-[bounce_1s_infinite_400ms] rounded-full" style={{ backgroundColor: 'var(--app-accent)' }} />
                </div>
              ) : searchQuery ? (
                <button type="button" onClick={clearSearch} onMouseDown={handleRippleMouseDown} className="ripple-button rounded-full p-1 transition-transform duration-300 hover:rotate-90">
                  <X size={14} className="text-zinc-500 hover:text-[var(--app-accent)]" />
                </button>
              ) : null}
            </div>
          </div>

          {searchMounted ? (
            <div
              className={`absolute right-0 top-full mt-4 w-[460px] overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-300 ${
                showSearch ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
              }`}
            >
              <TopbarSearchResultsContent
                isSearching={isSearching}
                searchQuery={searchQuery}
                searchResults={searchResults}
                onOpenManga={openManga}
                onSubmitSearch={() => submitSearch(searchQuery)}
              />
            </div>
          ) : null}
        </div>

        {/* Theme picker */}
        <div className="relative">
<button
    type="button"
    onClick={toggleTheme}
    onMouseDown={handleRippleMouseDown}
    title={`Current Theme: ${theme}`}
    className="ripple-button group flex h-10 items-center gap-3 rounded-full border border-[var(--app-border)] 
               bg-[var(--app-surface-1)] px-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02]"
  >
    {/* The Indicator Pip */}
            <span
              className="h-4 w-4 shrink-0 rounded-lg"
              style={{ backgroundColor: THEME_COLORS[theme] }}
            />
    
    {/* Optional: A subtle "cycle" icon instead of a chevron */}
    <RotateCw 
      size={10} 
      className="text-zinc-600 transition-transform duration-500 group-hover:rotate-180 group-hover:text-zinc-400" 
    />
  </button>
        </div>

        {/* GitHub */}
        <a
          href="https://github.com/RimuruOnDiscord/kotatsuweb"
          target="_blank"
          rel="noreferrer"
          onMouseDown={handleRippleMouseDown}
          className="ripple-button hidden h-10 items-center gap-2 hover:border-white/20 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white md:inline-flex"
        >
          <Github size={15} />
        </a>
      </div>
    </div>
  );
};

export default DesktopTopbar;