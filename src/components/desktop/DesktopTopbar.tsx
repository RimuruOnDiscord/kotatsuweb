import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Settings, Bell, User, Calendar } from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { BrandLogo, SearchResult, topbarNavItems } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import ProfileModal from '../shared/ProfileModal';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from '../shared/AuthModal';
import NotificationDropdown, { INITIAL_NOTIFICATIONS, AppNotification } from '../shared/NotificationDropdown';
import { checkBookmarksForUpdates } from '../../utils/bookmarkUpdateChecker';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');
  :root {
    --aw-bg: var(--app-bg); --aw-s1: var(--app-bg-2); --aw-s2: var(--app-bg-3);
    --aw-card: var(--app-card); --aw-border: var(--app-border); --aw-border-hi: var(--app-border-hover);
    --aw-accent: var(--app-accent); --aw-accent-dim: var(--app-accent-muted);
    --aw-muted: #ffffffb7; --aw-text: #ffffff;
    --aw-font-display: 'Syne', sans-serif; --aw-font-body: 'Onest', sans-serif;
  }
  .aw-topbar-input::placeholder { color: #6b7280; opacity: 1; }
`;

interface DesktopTopbarProps {
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  clearSearch?: () => void;
  isSearching?: boolean;
  showSearch?: boolean;
  setShowSearch?: (value: boolean) => void;
  searchResults?: SearchResult[];
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
  searchQuery = '',
  onSearchQueryChange = () => { },
  clearSearch = () => { },
  isSearching = false,
  setShowSearch = () => { },
}) => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => n.unread).length;

  const { brandName } = useContentMode();
  const { user, profile } = useAuth();

  useEffect(() => {
    const id = 'aw-design-styles-desktop-topbar';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  const normalizeRoute = (p: string) => {
    if (p === '/' || p === '/anihome') return '/home';
    if (p === '/anibrowse') return '/browse';
    if (p === '/anirandom') return '/random';
    return p;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setShowSearch]);

  useEffect(() => {
    checkBookmarksForUpdates(setNotifications);
    const intervalId = window.setInterval(() => checkBookmarksForUpdates(setNotifications), 1_800_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const H = 40;

  return (
    <>
      <div className="mx-auto hidden w-full max-w-[1460px] lg:flex items-center justify-between px-6 py-4">
        {/* Left */}
        <div className="flex items-center gap-6 min-w-0">
          <button onClick={() => navigate('/home')} className="flex items-center gap-3 transition-all hover:opacity-80 active:scale-95 group">
            <BrandLogo />
            <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent)]" style={{ fontFamily: DISPLAY_FONT }}>
              {brandName}
            </span>
          </button>

          <div className="h-5 w-px shrink-0" style={{ background: 'var(--aw-border)' }} />

          <nav className="flex items-center gap-0.5">
            {topbarNavItems
              .filter(item => item.label !== 'Added' && item.label !== 'Updated')
              .map((item) => {
                const cleanRoute = normalizeRoute(item.to);
                if (item.label === 'Random') {
                  return (
                    <React.Fragment key={`fragment-${cleanRoute}`}>
                      <DesktopNavLink key="/schedule" icon={Calendar} label="Schedule" to="/schedule" />
                      <DesktopNavLink key={cleanRoute} icon={item.icon} label={item.label} to={cleanRoute} />
                    </React.Fragment>
                  );
                }
                return <DesktopNavLink key={cleanRoute} icon={item.icon} label={item.label} to={cleanRoute} />;
              })}
          </nav>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-3">

          {/* Search - no dropdown, just input */}
          <div ref={searchRef} className="relative flex items-center">
            <div
              className={`relative overflow-hidden flex items-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isExpanded ? 'w-[320px]' : 'w-10'}`}
              style={{ height: H }}
            >
              <button
                onClick={() => { setIsExpanded(true); setTimeout(() => inputRef.current?.focus(), 80); }}
                className="absolute left-0 z-20 flex items-center justify-center transition-all duration-300"
                style={{
                  width: H, height: H, borderRadius: '12px',
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
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
                    setIsExpanded(false);
                  }
                }}
                placeholder="Search anime..."
                className={`aw-topbar-input w-full text-[14px] text-white outline-none transition-all duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{
                  height: H, borderRadius: '12px', paddingLeft: H + 4, paddingRight: 40,
                  background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: TOPBAR_FONT,
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
                  {isSearching ? <Loader2 size={14} className="animate-spin text-[var(--aw-accent)]" /> : <X size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* User Settings Pill */}
          <div className="flex items-center gap-1.5 px-1.5" style={{ height: H, borderRadius: '12px', background: 'var(--aw-s1)', border: '1px solid var(--aw-border)' }}>
            <div className="relative flex items-center h-full" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                title="Notifications"
                className="relative flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95"
                style={{ width: 32, height: 32, color: isNotifOpen ? 'white' : 'var(--aw-muted)', background: isNotifOpen ? 'var(--aw-s2)' : 'transparent' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { if (!isNotifOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; } }}
              >
                <Bell size={16} strokeWidth={1.5} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-[1.5px] border-[#07070d] bg-red-500" />
                )}
              </button>
              {isNotifOpen && <NotificationDropdown notifications={notifications} setNotifications={setNotifications} />}
            </div>

            <div className="h-4 w-px mx-0.5" style={{ background: 'var(--aw-border)' }} />

            <button onClick={() => setIsSettingsOpen(true)} title="Settings" className="flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95" style={{ width: 32, height: 32, color: 'var(--aw-muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
              <Settings size={16} strokeWidth={1.5} />
            </button>

            <div className="h-4 w-px mx-0.5" style={{ background: 'var(--aw-border)' }} />

            {user ? (
              <button onClick={() => setIsProfileModalOpen(true)} title="Profile" className="group flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95 overflow-hidden" style={{ width: 32, height: 32, color: 'var(--aw-muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" alt="Profile" /> : <User size={16} strokeWidth={1.5} />}
              </button>
            ) : (
              <button onClick={() => setIsAuthModalOpen(true)} className="group relative flex items-center justify-center rounded-[10px] transition-all duration-200 active:scale-95 overflow-hidden" style={{ height: 32, color: 'var(--aw-muted)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}>
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
