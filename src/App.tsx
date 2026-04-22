import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import BookmarksPage from './pages/Bookmarks';
import AppFooter from './components/AppFooter';
import DesktopTopbar from './components/desktop/DesktopTopbar';
import { ContentModeProvider } from './utils/contentMode';
import { AuthProvider } from './lib/AuthContext';

import AnimeBrowse from './pages/AnimeBrowse';
import AnimeDetail from './pages/AnimeDetail';
import AnimeHome from './pages/AnimeHome';
import AnimeWatch from './pages/AnimeWatchPage';
import AnimeRandom from './pages/AnimeRandom';
import AnimeSchedule from './pages/AnimeSchedule';

// ─── PAGE WRAPPER ───
const PageWrapper = ({ children, showFooter = true }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
    // Added pt-[80px] to push content down so it doesn't hide behind the fixed topbar
    className="flex flex-col min-h-screen pt-[80px]" 
  >
    <div className="flex-1">
      {children}
    </div>
    {showFooter && <AppFooter />}
  </motion.div>
);

// ─── APP CONTENT ───
// This must remain outside of the App() function!
function AppContent() {
  const location = useLocation();
  
  // Lifted search state so the Topbar works globally
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  return (
    <div className="relative w-full min-h-screen bg-[var(--app-bg)] text-white">
      
      {/* ─── FIXED TOPBAR ─── */}
      {/* z-[999] and fixed positioning guarantees it NEVER fades or moves */}
      <div className="fixed top-0 left-0 right-0 z-[999] bg-[var(--app-bg)]/90 backdrop-blur-md border-b border-white/5">
        <DesktopTopbar 
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          isSearching={isSearching}
          searchResults={searchResults}
          clearSearch={() => setSearchQuery('')}
        />
      </div>

      {/* ─── FADING PAGE CONTENT ─── */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageWrapper><AnimeHome /></PageWrapper>} />
          <Route path="/browse" element={<PageWrapper><AnimeBrowse /></PageWrapper>} />
          <Route path="/random" element={<PageWrapper><AnimeRandom /></PageWrapper>} />
          <Route path="/schedule" element={<PageWrapper><AnimeSchedule /></PageWrapper>} />
          <Route path="/bookmarks" element={<PageWrapper><BookmarksPage /></PageWrapper>} />
          <Route path="/watch/:animeId" element={<PageWrapper><AnimeDetail /></PageWrapper>} />
          <Route 
            path="/watch/:animeId/:provider/:category/:episodeId" 
            element={<PageWrapper showFooter={false}><AnimeWatch /></PageWrapper>} 
          />
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