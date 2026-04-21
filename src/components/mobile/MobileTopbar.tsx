import React, { useEffect, useState } from 'react';
import { Menu, Palette, Search, X } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';
import { useContentMode } from '../../utils/contentMode';
import { useAuth } from '../../lib/AuthContext';
import SettingsModal from '../shared/SettingsModal';
import AuthModal from '../shared/AuthModal';
import { Settings as SettingsIcon, User } from 'lucide-react';

interface MobileTopbarProps {
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  clearSearch: () => void;
  isSearching: boolean;
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  searchMounted: boolean;
  searchResults: SearchResult[];
}

const MobileTopbar: React.FC<MobileTopbarProps> = ({
  searchQuery, onSearchQueryChange, clearSearch, isSearching, showSearch, setShowSearch, searchMounted, searchResults
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAnimeMode, toggleMode, brandName } = useContentMode();
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeKey>('emerald');

  useEffect(() => { setThemeState(getStoredTheme()); }, []);

  const handleNavigate = (slug?: string) => {
    setSearchOpen(false);
    setShowSearch(false);

    if (slug && typeof slug === 'string') {
      const path = isAnimeMode ? `/watch/${slug}` : `/read/${slug}`;
      navigate(path);
    } else {
      const browsePath = isAnimeMode ? '/anibrowse' : '/browse';
      navigate(`${browsePath}?q=${encodeURIComponent(searchQuery)}`);
    }
    clearSearch();
  };

  const handleToggleMode = () => {
    const current = location.pathname;
    let next = isAnimeMode ? '/' : '/anihome';

    if (current.includes('/browse') || current.includes('/anibrowse')) next = isAnimeMode ? '/browse' : '/anibrowse';
    if (current.includes('/watch') || current.includes('/read')) {
      next = isAnimeMode ? current.replace('/watch', '/read') : current.replace('/read', '/watch');
    }

    toggleMode();
    window.location.assign(next);
  };

  const handleThemeChange = (newTheme: ThemeKey) => {
    setTheme(newTheme);
    setThemeState(newTheme);
  };

  return (
    <div className="relative lg:hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => navigate(isAnimeMode ? '/anihome' : '/')}>
          <BrandLogo />
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-300 transition-all hover:text-white"
          >
            <SettingsIcon size={16} />
          </button>
          
          {profile ? (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="group relative h-10 w-10 flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] transition-all hover:bg-[var(--app-surface-2)] active:scale-95 overflow-hidden"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="h-full w-full object-cover"
                  alt="Profile"
                />
              ) : (
                <User size={16} className="text-zinc-400 group-hover:text-white" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="group relative h-10 w-10 flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] transition-all hover:bg-[var(--app-surface-2)] active:scale-95"
            >
              <User size={16} className="text-zinc-400 group-hover:text-white" />
            </button>
          )}
          <button onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }} className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-300 transition-all hover:text-white">
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          <button onClick={() => { setMenuOpen(!menuOpen); setSearchOpen(false); }} className="h-10 w-10 flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-1)] text-zinc-300 transition-all hover:text-white">
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Search Drawer */}
      <div className={`px-4 transition-all duration-300 ease-in-out ${searchOpen ? 'max-h-[85vh] opacity-100 pb-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="rounded-[1.6rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 shadow-2xl">
          <div className="relative flex items-center rounded-[1.2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] overflow-hidden">
            <Search className={`absolute left-4 transition-colors ${searchQuery.trim() ? 'text-[var(--app-accent)]' : 'text-zinc-600'}`} size={14} />
            <input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              className="w-full bg-transparent py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-widest text-white outline-none"
              placeholder="Search..."
            />
          </div>
          {searchMounted && showSearch && (
            <div className="mt-3 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)]">
              <TopbarSearchResultsContent
                isSearching={isSearching}
                searchQuery={searchQuery}
                searchResults={searchResults}
                isAnimeMode={isAnimeMode}
                onOpenResult={handleNavigate}
                onSubmitSearch={() => handleNavigate()}
              />
            </div>
          )}
        </div>
      </div>

      {/* Menu Drawer */}
      <div className={`px-4 transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-[90vh] opacity-100 pb-4' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="rounded-[1.6rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 shadow-2xl">
          <nav className="grid grid-cols-2 gap-2 mb-3">
            {topbarNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={isAnimeMode ? (item.to === '/' ? '/anihome' : item.to === '/browse' ? '/anibrowse' : item.to) : item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 rounded-[1.1rem] border border-[var(--app-border)] p-3 text-[10px] font-black uppercase transition-all ${isActive ? 'bg-[var(--app-accent-muted)] text-[var(--app-accent)]' : 'bg-[var(--app-surface-2)] text-zinc-300'}`}
              >
                <item.icon size={14} /> {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="space-y-3 border-t border-white/5 pt-3">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-[1.1rem] bg-[var(--app-surface-2)] border border-[var(--app-border)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Mode</span>
                <div className="text-[11px] font-black uppercase text-white">{brandName}</div>
              </div>
              <button onClick={handleToggleMode} className={`relative flex h-10 w-[88px] items-center rounded-full border transition-all ${isAnimeMode ? 'border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)]' : 'border-[var(--app-border)] bg-black/40'}`}>
                <span className={`absolute h-8 w-[40px] rounded-full transition-all duration-300 ${isAnimeMode ? 'translate-x-[44px] bg-[var(--app-accent)]' : 'translate-x-1 bg-[var(--app-accent)]'}`} />
                <div className="relative z-10 flex w-full text-[10px] font-black uppercase">
                  <span className={`flex-1 text-center ${!isAnimeMode ? 'text-black' : 'text-white-500'}`}>Web</span>
                  <span className={`flex-1 text-center ${isAnimeMode ? 'text-black' : 'text-white-500'}`}>TV</span>
                </div>
              </button>
            </div>

          </div>
        </div>
      </div>
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default MobileTopbar;