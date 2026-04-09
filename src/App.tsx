import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import Homer from './pages/Home';
import Browse from './pages/Browse'; 
import Page from './pages/Page';   
import Manga from './pages/Manga';   
import Random from './pages/Random';

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
    className="min-h-screen bg-[#111214]"
  >
    {children}
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
        
        {/* NEWEST - Sorted by Release Date */}
        <Route path="/newest" element={<PageWrapper><Browse initialSort="start_date" title="Newest Releases" /></PageWrapper>} />
        
        {/* UPDATED - Sorted by Chapters/Status */}
        <Route path="/updated" element={<PageWrapper><Browse initialSort="chapters" title="Recently Updated" /></PageWrapper>} />
        
        {/* ADDED - Sorted by MAL_ID (Database entry order) */}
        <Route path="/added" element={<PageWrapper><Browse initialSort="mal_id" title="Recently Added" /></PageWrapper>} />
        
        {/* RANDOM */}
        <Route path="/random" element={<PageWrapper><Random /></PageWrapper>} />

        {/* INFO & READER */}
        <Route path="/read/:mangaId" element={<PageWrapper><Manga /></PageWrapper>} />
        <Route path="/read/:mangaId/chapter/:chapterId" element={<PageWrapper><Page /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
