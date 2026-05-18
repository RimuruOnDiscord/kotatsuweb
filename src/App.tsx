import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import BookmarksPage from './pages/Bookmarks';
import AppFooter from './components/AppFooter';
import DesktopTopbar from './components/desktop/DesktopTopbar';
import MobileTopbar from './components/mobile/MobileTopbar';
import MobileBottomNav from './components/mobile/MobileBottomNav'; // <-- Added Bottom Nav
import { ContentModeProvider } from './utils/contentMode';
import { AuthProvider, useAuth } from './lib/AuthContext';
import InviteRequiredPage from './components/shared/InviteRequiredPage';

import AnimeBrowse from './pages/AnimeBrowse';
import AnimeDetail from './pages/AnimeDetail';
import AnimeDetailV2 from './pages/AnimeDetailV2';
import AnimeHome from './pages/AnimeHome';
import AnimeWatch from './pages/AnimeWatchPage';
import AnimeRandom from './pages/AnimeRandom';
import AnimeSchedule from './pages/AnimeSchedule';
import ContinueWatchingPage from './pages/AnimeContinueWatching';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/UsersPage';
import ProfileModal from './components/shared/ProfileModal';
import PageLoader from './components/shared/PageLoader';
import LegalModal from './components/shared/LegalModal';
import AnnouncementBanner from './components/shared/AnnouncementBanner';

import InteractiveBackground from './components/InteractiveBackground';
import { fetchAnimeSearch, getAnimeCover, getAnimeDisplayTitle, getAnimeScore, getAnimeTypeLabel } from './utils/animeApi';
import type { SearchResult } from './components/shared/topbarShared';

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
// Notice the pt-[60px] and pb-[70px] for mobile to clear the fixed top/bottom bars!
const PageWrapper = ({
  children,
  showFooter = true,
  onOpenLegal,
}: {
  children: ReactNode;
  showFooter?: boolean;
  onOpenLegal?: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25, ease: "easeInOut" }}
    className="relative z-10 flex flex-col min-h-screen pt-[60px] pb-[80px] lg:pt-[80px] lg:pb-0"
  >
    <div className="flex-1">
      <AnnouncementBanner />
      {children}
    </div>
    {showFooter && <AppFooter onOpenLegal={onOpenLegal} />}
  </motion.div>
);
// ─── APP CONTENT ───
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 1024px)');

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLegalOpen, setIsLegalOpen] = useState(false);

  const openLegalModal = () => setIsLegalOpen(true);
  const closeLegalModal = () => setIsLegalOpen(false);

  useEffect(() => {
    if (location.pathname === '/legal') {
      setIsLegalOpen(true);
      navigate('/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const query = searchQuery.trim();
    const showNSFW = localStorage.getItem('nsfwShowContent') === 'true';
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await fetchAnimeSearch(query, 6);
        if (cancelled) return;
        const allResults = data.results || [];
        const filtered = showNSFW
          ? allResults
          : allResults.filter((entry: any) => !entry.isAdult && !(entry.genres || []).includes('Hentai'));
        setSearchResults(filtered.map((entry: any) => ({
          id: entry.id,
          title: getAnimeDisplayTitle(entry.title),
          score: getAnimeScore(entry),
          type: getAnimeTypeLabel(entry),
          images: { jpg: { image_url: getAnimeCover(entry) } },
        })));
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

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
    <div className="relative w-full min-h-screen bg-[var(--app-bg)] text-white overflow-x-hidden">

      <InteractiveBackground />

      {/* ─── NAVIGATION BARS ─── */}
      {isMobile ? (
        <>
          <div className="fixed top-0 left-0 right-0 z-[999]">
            <MobileTopbar {...topbarProps} />
          </div>
          <MobileBottomNav />
        </>
      ) : (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-[var(--app-bg)]/90 backdrop-blur-md border-b border-white/5">
          <DesktopTopbar {...topbarProps} />
        </div>
      )}

      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo(0, 0)}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeHome /></PageWrapper>} />
          <Route path="/browse" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeBrowse /></PageWrapper>} />
          <Route path="/random" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeRandom /></PageWrapper>} />
          <Route path="/schedule" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeSchedule /></PageWrapper>} />
          <Route path="/bookmarks" element={<PageWrapper onOpenLegal={openLegalModal}><BookmarksPage /></PageWrapper>} />
          <Route path="/continuewatching" element={<PageWrapper onOpenLegal={openLegalModal}><ContinueWatchingPage /></PageWrapper>} />
          <Route path="/watch/:animeId" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeDetail /></PageWrapper>} />
          <Route path="/detail/:animeId" element={<PageWrapper onOpenLegal={openLegalModal}><AnimeDetailV2 /></PageWrapper>} />
          <Route path="/watch/:animeId/:provider/:category/:episodeId" element={<PageWrapper showFooter={false}><AnimeWatch /></PageWrapper>} />
          <Route path="/profile/:userId" element={<PageWrapper onOpenLegal={openLegalModal}><ProfilePage /></PageWrapper>} />
          <Route path="/users" element={<PageWrapper onOpenLegal={openLegalModal}><UsersPage /></PageWrapper>} />
          <Route path="/legal" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </AnimatePresence>

      <LegalModal open={isLegalOpen} onClose={closeLegalModal} />

      {/* ─── GLOBAL MODALS ─── */}

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ContentModeProvider>
        <InviteGate>
          <Router>
            <AppContent />
          </Router>
        </InviteGate>
      </ContentModeProvider>
    </AuthProvider>
  );
}

const InviteGate = ({ children }: { children: ReactNode }) => {
  const { user, loading, hasInviteAccess } = useAuth();

  // If we're still checking authentication, show a neutral loader
  // This prevents the InviteRequiredPage from flashing for already logged-in users
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg,#09090b)]">
        <PageLoader fullPage text="Establishing secure session..." />
      </div>
    );
  }

  // Only once loading is complete do we decide whether to show the invite wall
  if (!user || !hasInviteAccess) {
    return <InviteRequiredPage />;
  }

  return <>{children}</>;
};

export default App;
