import React, { useEffect, useState } from 'react';
import { Github, Menu, Search, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { handleRippleMouseDown } from '../../utils/ripple';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';

interface MobileTopbarProps {
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

const MobileTopbar: React.FC<MobileTopbarProps> = ({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  return (
    <div className="relative lg:hidden">
      <div className="mx-auto flex w-full max-w-[1420px] items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => navigate('/')} onMouseDown={handleRippleMouseDown} className="ripple-button px-1 py-1 transition-opacity hover:opacity-90">
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
            className="ripple-button flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-[#0d0f11]/98 text-zinc-300 transition-colors hover:text-white"
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
            className="ripple-button flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.06] bg-[#0d0f11]/98 text-zinc-300 transition-colors hover:text-white"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <div
        className={`mx-auto max-w-[1420px] overflow-hidden px-4 transition-[max-height,opacity,transform] duration-300 ${
          searchOpen ? 'max-h-[28rem] translate-y-0 opacity-100 pb-3' : 'max-h-0 -translate-y-2 opacity-0'
        }`}
      >
        <div className="rounded-[1.6rem] border border-white/[0.06] bg-[#111214] p-3 shadow-[0_22px_48px_-28px_rgba(0,0,0,0.92)]">
          <div className="relative flex items-center overflow-hidden rounded-[1.2rem] border border-white/[0.06] bg-[#0d0f11]/98">
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
                  closeSearch();
                }
              }}
              className="w-full bg-transparent py-3 pl-11 pr-12 text-[11px] font-black uppercase tracking-[0.18em] text-gray-200 outline-none placeholder:text-zinc-600"
              placeholder="Search"
              autoComplete="off"
            />
            {searchQuery ? (
              <button type="button" onClick={clearSearch} onMouseDown={handleRippleMouseDown} className="ripple-button absolute right-2 rounded-full p-2 text-zinc-500 transition-colors hover:text-emerald-400">
                <X size={14} />
              </button>
            ) : null}
          </div>

          {searchMounted ? (
            <div
              className={`mt-3 overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-[#0d0f11] transition-all duration-300 ${
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
      </div>

      {menuMounted ? (
        <div
          className={`mx-auto max-w-[1420px] px-4 pb-3 transition-all duration-300 ${
            menuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          <div className="overflow-hidden rounded-[1.6rem] border border-white/[0.06] bg-[#111214] shadow-[0_22px_48px_-28px_rgba(0,0,0,0.92)]">
            <nav className="grid grid-cols-2 gap-2 p-3">
              {topbarNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-[1.1rem] border px-3 py-3 text-sm font-black transition-all ${
                        isActive
                          ? 'border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300'
                          : 'border-white/[0.06] bg-[#15171a] text-zinc-300'
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
              <a
                href="https://github.com/RimuruOnDiscord/kotatsuweb"
                target="_blank"
                rel="noreferrer"
                onMouseDown={handleRippleMouseDown}
                className="ripple-button flex h-12 w-full items-center justify-center gap-2 rounded-[1.1rem] border border-white/[0.06] bg-[#15171a] text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:text-white"
              >
                <Github size={15} />
                GitHub
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MobileTopbar;
