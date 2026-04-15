import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RotateCw, Search, X, Loader2, ArrowRight } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BrandLogo, topbarNavItems, SearchResult } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';

const THEME_COLORS: Record<ThemeKey, string> = {
  emerald: '#10b981',
  ocean: '#38bdf8',
  ember: '#f97316',
  midnight: '#c084fc',
  forest: '#4ade80',
  crimson: '#f87171',
};

interface DesktopTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  clearSearch: () => void;
  submitSearch: (val: string) => void;
  openManga: (id: number) => void;
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (val: boolean) => void;
  searchMounted: boolean;
  searchResults: SearchResult[];
}

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string; }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group relative flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] text-[var(--app-accent)]'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent'
      }`
    }
  >
    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
    <span className="relative">{label}</span>
  </NavLink>
);



const ThemePicker: React.FC<{ theme: ThemeKey; onThemeChange: (theme: ThemeKey) => void; }> = ({ theme, onThemeChange }) => {
  const handleToggle = () => {
    const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.key === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    onThemeChange(THEME_OPTIONS[nextIndex].key);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="ripple-button group flex h-10 items-center gap-3 rounded-full border border-[var(--app-border)] 
                       bg-[var(--app-surface-1)] px-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02]"
    >
      {/* Theme Color Dot */}
      <span
        className="h-3.5 w-3.5 shrink-0 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110"
        style={{
          backgroundColor: THEME_COLORS[theme],
          boxShadow: `0 0 12px ${THEME_COLORS[theme]}40`,
        }}
      />
      
      {/* Side Icon */}
      <RotateCw 
        size={15} 
        className="text-zinc-500 transition-all duration-500 group-hover:rotate-180 group-hover:text-[var(--app-accent)]" 
      />
    </button>
  );
};

const DesktopTopbar: React.FC = () => {
  const navigate = useNavigate();
  
  // Theme State
  const [theme, setThemeState] = useState<ThemeKey>('emerald');

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  // API Call Logic
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.jikan.moe/v4/manga?q=${query}&limit=5`);
      const data = await res.json();
      setSearchResults(data.data || []);
      setSearchMounted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) performSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleThemeSelect = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.length > 0) setShowSearch(true);
    else setShowSearch(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const handleSubmit = (val: string) => {
    if (!val.trim()) return;
    setShowSearch(false);
    navigate(`/search?q=${encodeURIComponent(val)}`);
  };

  const handleOpenManga = (id: number) => {
    setShowSearch(false);
    navigate(`/manga/${id}`);
  };

  return (
    <div className="mx-auto hidden w-full max-w-[1420px] items-center justify-between gap-6 px-6 py-4 lg:flex">
      <div className="flex min-w-0 items-center gap-8">
        <button onClick={() => navigate('/')} className="transition-all duration-300 hover:scale-105 active:scale-95">
          <BrandLogo />
        </button>

        <nav className="flex items-center gap-1.5">
          {topbarNavItems.map((item) => (
            <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap">
        <ThemePicker theme={theme} onThemeChange={handleThemeSelect} />
      </div>
    </div>
  );
};

export default DesktopTopbar;