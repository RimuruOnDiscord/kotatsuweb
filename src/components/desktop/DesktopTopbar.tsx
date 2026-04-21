import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Tv, Book } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

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
      `group relative flex items-center gap-2.5 rounded-[10px] px-4 py-2 text-sm font-medium transition-all duration-300 ${isActive
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isAnimeMode, toggleMode, brandName } = useContentMode();

  useEffect(() => {
    if (isAnimeMode && location.pathname === '/') navigate('/anihome', { replace: true });
    else if (!isAnimeMode && location.pathname === '/anihome') navigate('/', { replace: true });
  }, [isAnimeMode, location.pathname, navigate]);

  const getNavRoute = (p: string) => {
    if (!isAnimeMode) return p;
    if (p === '/') return '/anihome';
    if (p === '/browse') return '/anibrowse';
    if (p === '/random') return '/anirandom';
    return p;
  };

  const handleToggleMode = () => {
    const cur = location.pathname;
    let next = isAnimeMode ? '/' : '/anihome';
    if (cur.includes('browse')) next = isAnimeMode ? '/browse' : '/anibrowse';
    else if (cur.includes('random')) next = isAnimeMode ? '/random' : '/anirandom';
    toggleMode();
    window.location.assign(next);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSearch]);

  // shared height for all right-side interactive elements
  const H = 40;

  return (
    <>
      <div
        className="mx-auto hidden w-full max-w-[1420px] lg:flex items-center justify-between px-6 py-4"
        style={{ fontFamily: TOPBAR_FONT }}
      >
        {/* ── Left ── */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Brand */}
          <button
            onClick={() => navigate(getNavRoute('/'))}
            className="flex items-center gap-3 transition-all duration-300 hover:opacity-80 active:scale-95 group"
          >
            <BrandLogo />
            <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent)]">
              {brandName}
            </span>
          </button>

          <div className="h-5 w-px shrink-0" style={{ background: 'var(--app-border)' }} />

          <nav className="flex items-center gap-0.5">
            {topbarNavItems.map((item) => (
              <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={getNavRoute(item.to)} />
            ))}
          </nav>
        </div>

        {/* ── Right ── */}
        <div className="flex shrink-0 items-center gap-2.5">

          {/* Search */}
          <div ref={searchRef} className="relative flex items-center">
            <div
              className={`relative overflow-hidden flex items-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                isExpanded ? 'w-[300px]' : 'w-10'
              }`}
              style={{ height: H }}
            >

              {/* Search icon / button */}
              <button
                onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                className={`absolute left-0 z-20 flex items-center justify-center transition-all duration-200 ${
                  isExpanded ? 'text-[var(--app-accent)]' : 'text-zinc-400 hover:text-zinc-200 active:scale-90'
                }`}
                style={{
                  width: H,
                  height: H,
                  borderRadius: 12,
                  background: isExpanded ? 'transparent' : 'var(--app-surface-1)',
                  border: isExpanded ? '1px solid transparent' : '1px solid var(--app-border)',
                  transition: 'background 0.3s, border-color 0.3s',
                }}
              >
                <Search size={16} />
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
                placeholder={isAnimeMode ? 'Search anime...' : 'Search manga...'}
                className={`w-full text-[14px] text-white outline-none placeholder:text-zinc-600 transition-all duration-500 ${
                  isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                style={{
                  height: H,
                  borderRadius: 12,
                  paddingLeft: H + 2,
                  paddingRight: 40,
                  background: 'var(--app-surface-1)',
                  border: '1px solid var(--app-border)',
                }}
              />

              {isExpanded && searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {isSearching
                    ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--app-accent)' }} />
                    : <X size={14} />
                  }
                </button>
              )}
            </div>

            {/* Dropdown */}
            {isExpanded && showSearch && searchQuery.length >= 2 && (
              <div
                className="absolute top-full right-0 z-50 mt-2.5 w-[400px] overflow-hidden"
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--app-border)',
                  background: 'var(--app-surface-1)',
                  boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
                }}
              >
                <TopbarSearchResultsContent
                  isSearching={isSearching}
                  searchQuery={searchQuery}
                  searchResults={searchResults}
                  isAnimeMode={isAnimeMode}
                  onOpenResult={(slug) => {
                    navigate(`/watch/${slug}`);
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

          {/* Mode + Settings pill — same height as search */}
          <div
            className="flex items-center gap-1 px-1.5"
            style={{
              height: H,
              borderRadius: 13,
              background: 'var(--app-surface-1)',
              border: '1px solid var(--app-border)',
            }}
          >
            <button
              onClick={handleToggleMode}
              title={isAnimeMode ? 'Switch to Manga' : 'Switch to Anime'}
              className="flex items-center justify-center rounded-[10px] text-zinc-400 transition-all hover:text-zinc-100 active:scale-90"
              style={{ width: 32, height: 32 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--app-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {isAnimeMode ? <Tv size={16} strokeWidth={1.5} /> : <Book size={16} strokeWidth={1.5} />}
            </button>

            <div className="h-4 w-px" style={{ background: 'var(--app-border)' }} />

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              className="flex items-center justify-center rounded-[10px] text-zinc-400 transition-all hover:text-zinc-100 active:scale-90"
              style={{ width: 32, height: 32 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--app-surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>
          </div>

        </div>
      </div>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};

export default DesktopTopbar;
