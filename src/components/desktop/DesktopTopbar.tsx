
import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Tv, Book, User } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems, TopbarSearchResultsContent } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import ProfileModal from '../shared/ProfileModal';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// --- Design Styles ---
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-topbar-input::placeholder {
    color: #6b7280;
    opacity: 1;
  }
`;

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
    style={{ fontFamily: TOPBAR_FONT }}
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { isAnimeMode, toggleMode, brandName } = useContentMode();
  const { user, profile } = useAuth();

  // Inject Google Fonts & Variables
  useEffect(() => {
    const id = 'aw-design-styles-desktop-topbar';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

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

  // Shared height for all right-side interactive elements
  const H = 40;

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1460px] lg:flex items-center justify-between px-6 py-4">
        {/* ── Left ── */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Brand */}
          <button
            onClick={() => navigate(getNavRoute('/'))}
            className="flex items-center gap-3 transition-all duration-300 hover:opacity-80 active:scale-95 group"
          >
            <BrandLogo />
            <span
              className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent)]"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {brandName}
            </span>
          </button>

          <div className="h-5 w-px shrink-0" style={{ background: 'var(--aw-border)' }} />

          <nav className="flex items-center gap-0.5">
            {topbarNavItems.map((item) => (
              <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={getNavRoute(item.to)} />
            ))}
          </nav>
        </div>

        {/* ── Right ── */}
        <div className="flex shrink-0 items-center gap-3">

          {/* Search */}
          <div ref={searchRef} className="relative flex items-center">
            <div
              className={`relative overflow-hidden flex items-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'w-[320px]' : 'w-10'}`}
              style={{ height: H }}
            >

              {/* Search icon / button */}
              <button
                onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                className="absolute left-0 z-20 flex items-center justify-center transition-all duration-300"
                style={{
                  width: H,
                  height: H,
                  borderRadius: '12px',
                  background: isExpanded ? 'transparent' : 'var(--aw-s1)',
                  border: isExpanded ? '1px solid transparent' : '1px solid var(--aw-border)',
                  color: isExpanded ? 'var(--aw-accent)' : 'var(--aw-muted)',
                }}
                onMouseEnter={(e) => { if (!isExpanded) { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.style.color = 'white'; } }}
                onMouseLeave={(e) => { if (!isExpanded) { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.style.color = 'var(--aw-muted)'; } }}
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
                className={`aw-topbar-input w-full text-[14px] text-white outline-none transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{
                  height: H,
                  borderRadius: '12px',
                  paddingLeft: H + 4,
                  paddingRight: 40,
                  background: 'var(--aw-s1)',
                  border: '1px solid var(--aw-border)',
                  fontFamily: TOPBAR_FONT,
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--aw-border)'}
              />

              {isExpanded && searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 z-10 flex h-6 w-6 items-center justify-center rounded-lg transition-colors duration-200"
                  style={{ color: 'var(--aw-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--aw-muted)'}
                >
                  {isSearching
                    ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--aw-accent)' }} />
                    : <X size={14} />
                  }
                </button>
              )}
            </div>

            {/* Dropdown */}
            {isExpanded && showSearch && searchQuery.length >= 2 && (
              <div
                className="absolute top-full right-0 z-50 mt-3 w-[420px] overflow-hidden"
                style={{
                  borderRadius: '16px',
                  border: '1px solid var(--aw-border)',
                  background: 'rgba(7,7,13,0.95)',
                  backdropFilter: 'blur(24px)',
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
            className="flex items-center gap-1.5 px-1.5"
            style={{
              height: H,
              borderRadius: '12px',
              background: 'var(--aw-s1)',
              border: '1px solid var(--aw-border)',
            }}
          >
            <button
              onClick={handleToggleMode}
              title={isAnimeMode ? 'Switch to Manga' : 'Switch to Anime'}
              className="flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95"
              style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
            >
              {isAnimeMode ? <Tv size={16} strokeWidth={1.5} /> : <Book size={16} strokeWidth={1.5} />}
            </button>

            <div className="h-4 w-px mx-0.5" style={{ background: 'var(--aw-border)' }} />

            <button
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
              className="flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95"
              style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
            >
              <Settings size={16} strokeWidth={1.5} />
            </button>

            <div className="h-4 w-px mx-0.5" style={{ background: 'var(--aw-border)' }} />

            {user ? (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                title="Profile"
                className="group flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95 overflow-hidden"
                style={{ width: 32, height: 32, color: 'var(--aw-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    className="h-full w-full object-cover"
                    alt="Profile"
                  />
                ) : (
                  <User size={16} strokeWidth={1.5} />
                )}
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="group relative flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95 overflow-hidden"
                style={{ height: 32, color: 'var(--aw-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
              >
                <div className="flex items-center px-1.5 h-full">
                  <User size={16} strokeWidth={1.5} />
                </div>
              </button>
            )}
          </div>

        </div>
      </div>

      <ProfileModal open={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};

export default DesktopTopbar;
