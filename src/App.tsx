import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import BookmarksPage from './pages/Bookmarks';
import AppFooter from './components/AppFooter';
import DesktopTopbar from './components/desktop/DesktopTopbar';
import MobileTopBar from './components/mobile/MobileTopbar';
import { ContentModeProvider } from './utils/contentMode';
import { AuthProvider } from './lib/AuthContext';

import AnimeBrowse from './pages/AnimeBrowse';
import AnimeDetail from './pages/AnimeDetail';
import AnimeHome from './pages/AnimeHome';
import AnimeWatch from './pages/AnimeWatchPage';
import AnimeRandom from './pages/AnimeRandom';
import AnimeSchedule from './pages/AnimeSchedule';
import ContinueWatchingPage from './pages/AnimeContinueWatching';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';

// ─── IMPORT GLOBAL BACKGROUND ───
import InteractiveBackground from './components/InteractiveBackground';

// ─── MOBILE DETECTION HOOK ───
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') return window.matchMedia(query).matches;
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

// ─── PAGE WRAPPER ───
const PageWrapper = ({ children, showFooter = true }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
    // Responsive padding: pt-[60px] for mobile, pt-[80px] for desktop
    className="relative z-10 flex flex-col min-h-screen pt-[0px] lg:pt-[80px]"
  >
    <div className="flex-1">
      {children}
    </div>
    {showFooter && <AppFooter />}
  </motion.div>
);

// ─── APP CONTENT ───
function AppContent() {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 1024px)'); // Detect mobile screens

  // Lifted search state so the Topbar works globally
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Bundle the props so we can easily pass them to both bars
  const topbarProps = {
    searchQuery,
    onSearchQueryChange: setSearchQuery,
    showSearch,
    setShowSearch,
    isSearching,
    searchResults,
    searchMounted: true,
    clearSearch: () => setSearchQuery('')
  };

  return (
    <div className="relative w-full min-h-screen bg-[var(--app-bg)] text-white">

      {/* ─── GLOBAL INTERACTIVE BACKGROUND ─── */}
      <InteractiveBackground />

      {/* ─── NAVIGATION BARS ─── */}
      {isMobile ? (
        // Render MobileTopBar entirely on its own so it manages its own fixed positioning/styling
        <div className="relative z-[999]">
          <MobileTopBar {...topbarProps} />
        </div>
      ) : (
        // Render DesktopTopbar inside its required styled wrapper
        <div className="fixed top-0 left-0 right-0 z-[999] bg-[var(--app-bg)]/90 backdrop-blur-md border-b border-white/5">
          <DesktopTopbar {...topbarProps} />
        </div>
      )}

      {/* ─── FADING PAGE CONTENT ─── */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageWrapper><AnimeHome /></PageWrapper>} />
          <Route path="/browse" element={<PageWrapper><AnimeBrowse /></PageWrapper>} />
          <Route path="/random" element={<PageWrapper><AnimeRandom /></PageWrapper>} />
          <Route path="/schedule" element={<PageWrapper><AnimeSchedule /></PageWrapper>} />
          <Route path="/bookmarks" element={<PageWrapper><BookmarksPage /></PageWrapper>} />
          <Route path="/continuewatching" element={<PageWrapper><ContinueWatchingPage /></PageWrapper>} />
          <Route path="/watch/:animeId" element={<PageWrapper><AnimeDetail /></PageWrapper>} />
          <Route
            path="/watch/:animeId/:provider/:category/:episodeId"
            element={<PageWrapper showFooter={false}><AnimeWatch /></PageWrapper>}
          />
          <Route path="/profile/:userId" element={<PageWrapper><ProfilePage /></PageWrapper>} />
          <Route path="/users" element={<PageWrapper><UsersPage /></PageWrapper>} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AnimatePresence>

    </div>
  );
}

// ─── MAIN APP ───
function App() {
  return (
    <AuthProvider>
      <ContentModeProvider>
        <Router>
          <AppContent />
        </Router>
      </ContentModeProvider>
    </AuthProvider>
  );
}

export default App;