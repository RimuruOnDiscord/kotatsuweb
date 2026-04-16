import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, X, Loader2, Settings, User, Bell } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';

// Helper to generate the URL-friendly slug
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const ANILIST_SEARCH_QUERY = `
  query SearchManga($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: MANGA) {
        id
        title {
          userPreferred
          romaji
          english
        }
        coverImage {
          medium
        }
        format
        status(version: 2)
      }
    }
  }
`;

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string; }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `group relative flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-[color-mix(in_srgb,var(--app-accent),transparent_92%)] text-[var(--app-accent)]'
          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
      }`
    }
  >
    <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
    <span className="relative">{label}</span>
  </NavLink>
);

const DesktopTopbar: React.FC = () => {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 3) return;
    setIsSearching(true);
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: ANILIST_SEARCH_QUERY,
          variables: { search: query }
        })
      });
      const { data } = await res.json();
      setSearchResults(data?.Page?.media || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) performSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Click outside & Keyboard Shortcut
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsExpanded(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsExpanded(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="mx-auto hidden w-full max-w-[1420px] items-center justify-between gap-6 px-6 py-4 lg:flex">
      
      {/* LEFT: Logo & Main Nav */}
      <div className="flex min-w-0 items-center gap-8">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 transition-all duration-300 hover:opacity-80 active:scale-95 group"
        >
          <BrandLogo />
          <span className="text-xl font-bold tracking-tight text-white transition-colors group-hover:text-[var(--app-accent)]">
            kotatsuweb
          </span>
        </button>

        <nav className="flex items-center gap-1">
          {topbarNavItems.map((item) => (
            <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>
      </div>

      {/* RIGHT: Expandable Search & Utilities */}
      <div className="flex shrink-0 items-center gap-2">
        
        <div ref={searchRef} className="relative flex items-center">
          <div 
            className={`flex items-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              isExpanded 
                ? 'w-[320px] border border-[var(--app-border)] bg-[var(--app-surface-1)] hover:bg-[var(--app-surface-2)] focus:bg-[var(--app-surface-2)] focus:border-[var(--app-accent)]' 
                : 'w-10 bg-transparent border border-transparent'
            }`}
          >
            <button 
              onClick={() => {
                setIsExpanded(true);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                isExpanded ? 'text-[var(--app-accent)]' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
              }`}
            >
              <Search size={18} />
            </button>

            <input
              ref={inputRef}
              type="text"
              placeholder="Search manga... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none transition-all duration-300 ${
                isExpanded ? 'w-full opacity-100 pr-4' : 'w-0 opacity-0'
              }`}
            />

            {isExpanded && searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mr-3 p-1 text-zinc-500 hover:text-zinc-200"
              >
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          {/* Results Dropdown */}
          {isExpanded && searchQuery.length >= 3 && (
            <div className="absolute top-full right-0 mt-3 w-[360px] overflow-hidden rounded-2xl border border-white/10 bg-[#0B111A]/95 p-2 shadow-2xl backdrop-blur-xl z-50">
              {searchResults.length > 0 ? (
                searchResults.map((manga: any) => {
                  // Fallback through available title formats
                  const title = manga.title?.userPreferred || manga.title?.romaji || manga.title?.english || 'Unknown Title';
                  const slug = createSlug(title);

                  return (
                    <button
                      key={manga.id}
                      onClick={() => {
                        navigate(`/read/${slug}`);
                        setIsExpanded(false);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5"
                    >
                      <img 
                        src={manga.coverImage?.medium || ''} 
                        alt="" 
                        className="h-12 w-9 rounded-md object-cover bg-white/5" 
                      />
                      <div className="text-left min-w-0">
                        <p className="line-clamp-1 text-sm font-medium text-zinc-200">{title}</p>
                        <p className="text-xs text-zinc-500">
                          {manga.format || 'MANGA'} • {manga.status ? manga.status.replace(/_/g, ' ') : 'UNKNOWN'}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : !isSearching ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic">No results found for "{searchQuery}"</div>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-1 border-l border-white/10 pl-3 ml-1">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100">
            <Bell size={18} />
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopTopbar;