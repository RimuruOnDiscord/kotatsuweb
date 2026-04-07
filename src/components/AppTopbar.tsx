import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Dices,
  FilterX,
  Folder,
  Github,
  Home,
  Layers,
  Search,
  Star,
  X,
  Zap,
} from 'lucide-react';
import { isAllowedSeriesType } from '../utils/contentFilters';
import { handleRippleMouseDown } from '../utils/ripple';

interface SearchResult {
  mal_id: number;
  title: string;
  score?: number;
  type?: string;
  status?: string;
  images: {
    jpg: {
      image_url: string;
    };
  };
}

interface AppTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit?: (query: string) => void;
}

const navItems: Array<{ icon: React.ElementType; label: string; to: string }> = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Folder, label: 'Browse', to: '/browse' },
  { icon: Zap, label: 'Newest', to: '/newest' },
  { icon: Clock, label: 'Updated', to: '/updated' },
  { icon: Layers, label: 'Added', to: '/added' },
  { icon: Dices, label: 'Random', to: '/random' },
];

const BrandLogo: React.FC = () => (
  <div className="flex items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-emerald-300">
      <svg viewBox="0 0 1406.2 1406.2" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current">
        <path d="M391.7,270.7c-51.6,18.6-96.2,88.4-117.9,183.6c-7.8,34.8-15.1,93.5-15.1,121.7v19.7l-23.3,36.6 c-65,101.3-124.6,206.8-180.5,319.2C5.1,1051,0,1063.2,0,1080.9c0,7.8,2,18,4,22.2c6.6,12,22.2,24.4,39.7,31l16,6.2l651.1-0.2 c633.1,0,651.1-0.4,661.2-5.3c32.6-16.9,43-51.7,26.2-88c-63.8-139-150.5-296.8-229.6-418.5l-19.1-29.5l-2.2-33.7 c-8.7-129.4-36.1-208.6-92-266.5c-24.2-24.8-33.5-30.4-50.6-30.6c-23.9,0-39.9,10.9-75.6,52.1c-35.2,40.4-42.4,50.1-66.9,86.4 c-12,17.7-27,38.3-33.2,45.5l-11.3,13.5h-117l-117-0.2L560.2,429C515,359.2,440.7,274.5,419.6,268.7 C406.8,264.9,409,264.5,391.7,270.7z M466.2,666.4c8.9,6.2,11.3,11.8,14.4,37.7c4,30.6,7.7,34.8,27.5,32.4 c18-2.2,32.6,3.6,40.8,16.6c16,25.9-11.5,80.2-50.6,99.3c-14,7.1-19.1,7.8-42.8,7.8c-22.8,0-28.8-1.1-39.4-6.7 c-31.2-16.4-50.3-40.3-58.3-71.8c-4-16.6-4.2-21.7-1.1-36.3c4.2-21.1,11.5-35.2,24.8-50.1C404.8,669.5,449.1,654.4,466.2,666.4z M964,669c8.7,7.3,9.3,9.7,13.5,43.4c2.6,20.6,8.7,26.8,25.3,24.2c16-2.2,29.9,2.2,39.2,12.9c15.1,18.2,6.2,53.4-20.8,82.2 c-21.7,23.1-35.2,28.4-69.2,28.8c-25.9,0-29.1-0.5-42.8-8.2c-20.2-11.3-38.4-29.9-47.7-49c-6.2-12.8-8.2-20.8-8.9-39.2 c-0.9-21.1,0-25,7.7-41c14-30.4,35.5-49.2,65-57C945.2,660.2,954.7,661.1,964,669z" />
      </svg>
    </div>
  </div>
);

const CustomNavLink: React.FC<{ icon: React.ElementType; label: string; to: string }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `relative group flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 ${
        isActive ? 'text-emerald-400' : 'text-gray-400 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`absolute inset-0 bg-emerald-500/10 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
        <div className={`absolute bottom-0 left-0 h-[2px] bg-emerald-500 transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
        <Icon className={`relative z-10 h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="relative z-10">{label}</span>
      </>
    )}
  </NavLink>
);

const AppTopbar: React.FC<AppTopbarProps> = ({ searchQuery, onSearchQueryChange, onSearchSubmit }) => {
  const navigate = useNavigate();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMounted, setSearchMounted] = useState(false);

  useEffect(() => {
    let active = true;
    const trimmedQuery = searchQuery.trim();
    const timeoutId = window.setTimeout(async () => {
      if (!trimmedQuery) {
        if (!active) return;
        setSearchResults([]);
        setShowSearch(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(trimmedQuery)}&limit=6`);
        const data = await response.json();
        if (!active) return;
        setSearchResults(
          Array.isArray(data.data)
            ? data.data.filter((entry: SearchResult) => isAllowedSeriesType(entry.type))
            : []
        );
        setShowSearch(true);
      } catch {
        if (!active) return;
        setSearchResults([]);
        setShowSearch(false);
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (showSearch) {
      setSearchMounted(true);
      return;
    }

    if (!searchMounted) return;

    const timeoutId = window.setTimeout(() => setSearchMounted(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [showSearch, searchMounted]);

  const clearSearch = () => {
    onSearchQueryChange('');
    setSearchResults([]);
    setShowSearch(false);
    setIsSearching(false);
  };

  const submitSearch = (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();
    setShowSearch(false);

    if (onSearchSubmit) {
      onSearchSubmit(trimmedQuery);
      return;
    }

    if (!trimmedQuery) return;
    navigate(`/browse?q=${encodeURIComponent(trimmedQuery)}`);
  };

  const openManga = (mangaId: number) => {
    setShowSearch(false);
    navigate(`/read/${mangaId}`);
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-[#111214] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)]">
      <div className="mx-auto flex w-full max-w-[1420px] items-center justify-between gap-6 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => navigate('/')} onMouseDown={handleRippleMouseDown} className="ripple-button hidden px-1 py-1 transition-opacity hover:opacity-90 md:flex">
            <BrandLogo />
          </button>

          <nav className="hidden items-center gap-1 rounded-2xl p-1.5 lg:flex">
            {navItems.map((item) => (
              <CustomNavLink key={item.to} icon={item.icon} label={item.label} to={item.to} />
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="group relative hidden sm:block">
            <div className="absolute -inset-1 rounded-full bg-[radial-gradient( opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-100" />

            <div className="relative flex items-center overflow-hidden rounded-full border border-white/[0.06] bg-[#0d0f11]/98 shadow-[0_20px_55px_-34px_rgba(0,0,0,0.95)]">
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <Search
                className={`absolute left-4 transition-all duration-300 ${
                  searchQuery.trim() ? 'text-emerald-400' : 'text-zinc-600'
                }`}
                size={14}
              />
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
                <span className="hidden rounded-full border border-white/[0.06] bg-[#16181b] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500 lg:inline-flex">
                  Enter
                </span>
                {isSearching ? (
                  <div className="flex gap-0.5">
                    <div className="h-3 w-1 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_0ms]" />
                    <div className="h-3 w-1 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_200ms]" />
                    <div className="h-3 w-1 rounded-full bg-emerald-500 animate-[bounce_1s_infinite_400ms]" />
                  </div>
                ) : searchQuery ? (
                  <button type="button" onClick={clearSearch} onMouseDown={handleRippleMouseDown} className="ripple-button rounded-full p-1 transition-transform duration-300 hover:rotate-90">
                    <X size={14} className="text-zinc-500 hover:text-emerald-400" />
                  </button>
                ) : null}
              </div>
            </div>

            {searchMounted && (
              <div
                className={`absolute right-0 top-full mt-4 w-[460px] overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[#0d0f11] shadow-[0_40px_80px_rgba(0,0,0,0.9)] transition-all duration-300 ${
                  showSearch ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-2 scale-95 opacity-0'
                }`}
              >
                <div className="relative border-b border-white/[0.05] bg-[#141618] px-6 py-5">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Search Library</span>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300">
                        {isSearching ? 'Scanning' : searchQuery.trim() ? 'Results Ready' : 'Idle'}
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      {searchResults.length} hits
                    </span>
                  </div>
                </div>

                <div className="max-h-[62vh] space-y-2 overflow-y-auto px-3 py-3">
                  {searchResults.length > 0 ? (
                    searchResults.map((manga) => (
                      <button
                        key={manga.mal_id}
                        type="button"
                        onClick={() => openManga(manga.mal_id)}
                        onMouseDown={handleRippleMouseDown}
                        className="ripple-button group/item relative flex w-full items-center gap-4 rounded-[1.4rem] border border-white/[0.04] bg-[#111214]/90 p-3 text-left transition-all duration-300 hover:border-emerald-400/10 hover:bg-[#15171a]"
                      >
                        <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-[1rem] bg-[#16181b]">
                          <img src={manga.images.jpg.image_url} className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-105" alt={manga.title} />
                          <div className="absolute inset-0 rounded-[1rem] ring-1 ring-inset ring-white/[0.08] transition-all group-hover/item:ring-emerald-500/20" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="truncate pr-3 text-[11px] font-black uppercase tracking-tight text-white/90 transition-colors group-hover/item:text-white">
                            {manga.title}
                          </h4>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-300">
                              <Star size={10} className="fill-emerald-400 text-emerald-400" />
                              {manga.score ? manga.score.toFixed(1) : 'N/A'}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-[0.24em] text-zinc-500">
                              {[manga.type || 'Manga', manga.status || 'Unknown'].join(' / ')}
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={14} className="text-zinc-700 transition-all group-hover/item:translate-x-1 group-hover/item:text-emerald-400" />
                      </button>
                    ))
                  ) : !isSearching ? (
                    <div className="flex flex-col items-center py-12 opacity-25">
                      <FilterX size={32} className="mb-2" />
                      <span className="text-[9px] font-black uppercase tracking-[0.32em]">No Matches</span>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => submitSearch(searchQuery)}
                  onMouseDown={handleRippleMouseDown}
                  className="ripple-button group w-full border-t border-white/[0.05] bg-[#0f1512] py-4 transition-colors hover:bg-[#132019]"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.32em] text-emerald-400 transition-all group-hover:tracking-[0.38em]">
                    Open Browse Results
                  </span>
                </button>
              </div>
            )}
          </div>

          <a
            href="https://github.com/RimuruOnDiscord/kotatsuweb"
            target="_blank"
            rel="noreferrer"
            onMouseDown={handleRippleMouseDown}
            className="ripple-button hidden h-12 items-center gap-2 rounded-full border border-white/[0.06] bg-[#0d0f11]/98 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white md:inline-flex"
          >
            <Github size={15} />
          </a>
        </div>
      </div>
    </header>
  );
};

export default AppTopbar;
