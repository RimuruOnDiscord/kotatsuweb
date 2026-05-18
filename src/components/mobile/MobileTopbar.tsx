import React, { useEffect, useState } from 'react';
import { Search, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, SearchResult, TopbarSearchResultsContent } from '../shared/topbarShared';
import { useContentMode } from '../../utils/contentMode';
import SettingsModal from '../shared/SettingsModal';
import { clearRecentSearch, readRecentSearches, saveRecentSearch, type RecentSearchEntry } from '../../utils/recentSearches';

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
  searchQuery, onSearchQueryChange, clearSearch, isSearching,
  showSearch, setShowSearch, searchMounted, searchResults,
}) => {
  const navigate = useNavigate();
  const { isAnimeMode } = useContentMode();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    const sync = () => setRecentSearches(readRecentSearches());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('recent-searches-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('recent-searches-changed', sync);
    };
  }, []);

  const handleNavigate = (slug?: string) => {
    setShowSearch(false);
    if (slug) {
      navigate(`/watch/${slug}`);
    } else {
      setRecentSearches(saveRecentSearch(searchQuery));
      navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
    }
    clearSearch();
  };

  const handleRecentSearch = (query: string) => {
    setRecentSearches(saveRecentSearch(query));
    setShowSearch(false);
    navigate(`/browse?q=${encodeURIComponent(query)}`);
    clearSearch();
  };

  const removeRecentSearch = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    setRecentSearches(clearRecentSearch(query));
  };

  return (
    <div className="relative w-full z-[990]">

      {/* Full-width anchored topbar */}
      <div
        className="relative z-[995] flex items-center justify-between px-5 py-4"
        style={{
          background: 'color-mix(in srgb, var(--app-surface-1) 70%, transparent)',
          backdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Logo */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 outline-none"
        >
          <BrandLogo />
          <span
            className="text-[17px] font-bold tracking-tight text-white"
            style={{ fontFamily: '"Syne", sans-serif' }}
          >
            kotatsutv
          </span>
        </motion.button>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <NavIconButton onClick={() => setIsSettingsOpen(true)}>
            <Settings size={17} strokeWidth={2} />
          </NavIconButton>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowSearch(!showSearch)}
            className="relative flex h-11 w-11 items-center justify-center rounded-[20px] outline-none"
            style={{ color: showSearch ? 'var(--app-accent)' : 'rgba(255,255,255,0.35)' }}
          >
            <AnimatePresence>
              {showSearch && (
                <motion.span
                  layoutId="topNavPill"
                  className="absolute inset-0 rounded-[20px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  style={{ background: 'color-mix(in srgb, var(--app-accent) 15%, transparent)' }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={showSearch ? 'x' : 'search'}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.13 }}
                className="relative z-10"
              >
                {showSearch
                  ? <X size={18} strokeWidth={2.2} />
                  : <Search size={18} strokeWidth={1.8} />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Search Drawer */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute top-full left-0 w-full px-4 pt-2 z-[990]"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'color-mix(in srgb, var(--app-surface-1) 92%, transparent)',
                backdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 20px 40px -8px rgba(0,0,0,0.6)',
              }}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-4">
                <Search
                  size={16}
                  className="shrink-0 transition-colors duration-200"
                  style={{ color: searchQuery ? 'var(--app-accent)' : 'rgba(255,255,255,0.25)' }}
                />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleNavigate(); }}
                  className="flex-1 bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-white/25"
                  style={{ fontFamily: '"Onest", sans-serif' }}
                  placeholder="Search anime, studios…"
                />
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.12 }}
                      onClick={clearSearch}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/50 hover:text-white transition-colors"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Recent Searches */}
              <AnimatePresence>
                {!searchQuery.trim() && recentSearches.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden border-t border-white/[0.05]"
                  >
                    <div className="p-3 space-y-0.5">
                      <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
                        Recent
                      </p>
                      {recentSearches.map((entry) => (
                        <button
                          key={entry.query}
                          type="button"
                          onClick={() => handleRecentSearch(entry.query)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.04] transition-colors"
                        >
                          <Search size={13} className="text-white/25 shrink-0" />
                          <span className="flex-1 truncate text-[13px] text-white/70">
                            {entry.query}
                          </span>
                          <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => removeRecentSearch(e, entry.query)}
                            className="text-white/20 hover:text-white/60 transition-colors p-1"
                            aria-label={`Remove ${entry.query}`}
                          >
                            <X size={12} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Results */}
              <AnimatePresence>
                {searchMounted && searchQuery.length > 1 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                    className="overflow-hidden border-t border-white/[0.05] max-h-[58vh] overflow-y-auto"
                  >
                    <TopbarSearchResultsContent
                      isSearching={isSearching}
                      searchQuery={searchQuery}
                      searchResults={searchResults}
                      isAnimeMode={isAnimeMode}
                      onOpenResult={handleNavigate}
                      onSubmitSearch={() => handleNavigate()}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[980] backdrop-blur-sm"
            onClick={() => setShowSearch(false)}
          />
        )}
      </AnimatePresence>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

const NavIconButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    onClick={onClick}
    className="flex h-11 w-11 items-center justify-center rounded-[20px] text-white/35 hover:text-white/70 transition-colors outline-none"
  >
    {children}
  </motion.button>
);

export default MobileTopbar;