import React, { useEffect, useState, useCallback, useRef } from 'react';
import { RotateCw, Search, X, Loader2, Sparkles } from 'lucide-react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';

const THEME_COLORS: Record<ThemeKey, string> = {
  emerald: '#10b981',
  ocean: '#38bdf8',
  ember: '#f97316',
  midnight: '#c084fc',
  forest: '#4ade80',
  crimson: '#f87171',
};

const ANILIST_QUICK_SEARCH = `
  query ($search: String) {
    Page(page: 1, perPage: 6) {
      media(type: MANGA, search: $search, isAdult: false) {
        idMal
        title { userPreferred }
        coverImage { large }
        format
        status
        averageScore
      }
    }
  }
`;

const SearchBar: React.FC<any> = ({
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
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowSearch]);

  return (
    <div className="relative flex items-center" ref={searchRef}>
      <div className="relative group">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-all duration-300 z-10 ${
            showSearch ? 'text-[var(--app-accent)]' : 'text-zinc-500'
          }`}
        />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onFocus={() => searchQuery.trim() && setShowSearch(true)}
          onKeyDown={(e) => e.key === 'Enter' && submitSearch(searchQuery)}
          placeholder="Search titles, authors..."
          className="h-11 w-64 lg:w-96 rounded-2xl border border-white/5 bg-white/[0.03] pl-11 pr-11 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur-md outline-none transition-all duration-300 focus:bg-white/[0.07] focus:ring-2 focus:ring-[var(--app-accent)]/20 focus:border-[var(--app-accent)]/30"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-[var(--app-accent)]" />
          ) : searchQuery && (
            <button onClick={clearSearch} className="p-1 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* DROPDOWN MENU */}
      {searchMounted && showSearch && (
        <div className="absolute top-[calc(100%+12px)] right-0 w-[420px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2">
            {searchResults.length > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Sparkles size={12} /> Quick Results
                </div>
                
                {searchResults.map((result: any) => (
                  <button
                    key={result.id}
                    onClick={() => openManga(result.id)}
                    className="group flex items-center gap-4 rounded-xl p-2 text-left transition-all hover:bg-white/[0.05] active:scale-[0.98]"
                  >
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg shadow-md bg-zinc-800">
                      <img src={result.image} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate text-[13px] font-bold text-zinc-100 group-hover:text-[var(--app-accent)] transition-colors">
                        {result.title}
                      </span>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-medium text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 capitalize">{result.format?.toLowerCase()}</span>
                        <span>•</span>
                        <span className={result.status === 'RELEASING' ? 'text-emerald-400' : ''}>
                          {result.status?.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {result.score && (
                      <div className="pr-2 text-right">
                        <div className="text-[11px] font-black text-emerald-400">{result.score}%</div>
                      </div>
                    )}
                  </button>
                ))}

                <button
                  onClick={() => submitSearch(searchQuery)}
                  className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--app-accent)] py-3 text-xs font-black uppercase tracking-widest text-black transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  View All Results
                </button>
              </div>
            ) : !isSearching && (
              <div className="py-12 text-center">
                <p className="text-sm font-bold text-zinc-400">No matches found</p>
                <p className="text-xs text-zinc-500 mt-1">Try a different keyword</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
      className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-md transition-all hover:bg-white/[0.08] active:scale-90"
    >
      <div 
        className="h-2 w-2 rounded-full absolute top-2 right-2 shadow-[0_0_10px_currentcolor]"
        style={{ color: THEME_COLORS[theme], backgroundColor: 'currentColor' }}
      />
      <RotateCw size={18} className="text-zinc-400 transition-transform duration-700 group-hover:rotate-180" />
    </button>
  );
};

const DesktopTopbar: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [theme, setThemeState] = useState<ThemeKey>('emerald');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const performQuickSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return;
    setIsSearching(true);
    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: ANILIST_QUICK_SEARCH,
          variables: { search: query },
        }),
      });
      const payload = await response.json();
      const results = payload.data?.Page?.media || [];
      
      setSearchResults(results.map((m: any) => ({
        id: m.idMal,
        title: m.title.userPreferred,
        image: m.coverImage.large,
        format: m.format,
        status: m.status,
        score: m.averageScore
      })));
      setSearchMounted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => performQuickSearch(searchQuery), 260);
    return () => clearTimeout(timer);
  }, [searchQuery, performQuickSearch]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setShowSearch(val.length > 0);
  };

  return (
    <div className="mx-auto hidden w-full max-w-[1440px] items-center justify-between gap-8 px-8 py-5 lg:flex">
      <div className="flex items-center gap-12">
        <button onClick={() => navigate('/')} className="transition-transform active:scale-95">
          <BrandLogo />
        </button>

        <nav className="flex items-center gap-2">
          {topbarNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-xl ${
                  isActive 
                  ? 'bg-[var(--app-accent)] text-black shadow-[0_0_20px_var(--app-accent)]/20' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <SearchBar 
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchChange}
          clearSearch={() => { setSearchQuery(''); setShowSearch(false); }}
          submitSearch={(val: string) => { navigate(`/browse?q=${encodeURIComponent(val)}`); setShowSearch(false); }}
          openManga={(id: number) => { navigate(`/read/${id}`); setShowSearch(false); }}
          isSearching={isSearching}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchMounted={searchMounted}
          searchResults={searchResults}
        />
        <ThemePicker theme={theme} onThemeChange={(t) => { setTheme(t); setThemeState(t); }} />
      </div>
    </div>
  );
};

export default DesktopTopbar;