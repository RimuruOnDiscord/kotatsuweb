import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Homer from './pages/Home';
import Browse from './pages/Browse'; 
import Page from './pages/Page';   
import Manga from './pages/Manga';   
import Random from './pages/Random';
import BookmarksPage from './pages/Bookmarks';
import AppFooter from './components/AppFooter';
import SettingsPage from './pages/Settings';
import { ContentModeProvider } from './utils/contentMode';
import AnimeBrowse from './pages/AnimeBrowse';
import AnimeDetail from './pages/AnimeDetail';
import AnimeHome from './pages/AnimeHome';
import AnimeWatch from './pages/AnimeWatchPage';
import AnimeRandom from './pages/AnimeRandom';

const PageWrapper = ({ children, showFooter = true }: { children: React.ReactNode; showFooter?: boolean }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="min-h-screen bg-[var(--app-bg)]"
  >
    {children}
    {showFooter ? <AppFooter /> : null}
  </motion.div>
);

function AppContent() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* HOME */}
        <Route path="/" element={<PageWrapper><Homer /></PageWrapper>} />
        
        {/* BROWSE */}
        <Route path="/browse" element={<PageWrapper><Browse /></PageWrapper>} />
        
        {/* UPDATED - Sorted by Chapters/Status */}
        <Route path="/updated" element={<PageWrapper><Browse initialSort="chapters" title="Recently Updated" /></PageWrapper>} />
        
        {/* ADDED - Sorted by MAL_ID (Database entry order) */}
        <Route path="/added" element={<PageWrapper><Browse initialSort="mal_id" title="Recently Added" /></PageWrapper>} />
        
        {/* RANDOM */}
        <Route path="/random" element={<PageWrapper><Random /></PageWrapper>} />

                {/* RANDOM */}
        <Route path="/anirandom" element={<PageWrapper><AnimeRandom /></PageWrapper>} />

        {/* BOOKMARKS */}
        <Route path="/bookmarks" element={<PageWrapper><BookmarksPage /></PageWrapper>} />

        {/* SETTINGS */}
        <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />

        {/* ANIME BROWSE */}
        <Route path="/anibrowse" element={<PageWrapper><AnimeBrowse /></PageWrapper>} />

                {/* ANIME BROWSE */}
        <Route path="/anihome" element={<PageWrapper><AnimeHome /></PageWrapper>} />

                {/* ANIME BROWSE */}
        <Route path="/watch/:animeId" element={<PageWrapper><AnimeDetail /></PageWrapper>} />

        {/* ANIME WATCH */}
        <Route path="/watch/:animeId/:provider/:category/:episodeId" element={<PageWrapper><AnimeWatch /></PageWrapper>} />

        {/* INFO & READER */}
        <Route path="/read/:mangaId" element={<PageWrapper><Manga /></PageWrapper>} />
        <Route path="/read/:mangaId/chapter/:chapterId" element={<PageWrapper showFooter={false}><Page /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ContentModeProvider>
      <Router>
        <AppContent />
      </Router>
    </ContentModeProvider>
  );
}

export default App;
