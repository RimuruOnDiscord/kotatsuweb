import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Layout,
  Columns,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  X,
  Search,
  BookOpen,
  Eye,
  EyeOff,
} from 'lucide-react';

const Logo: React.FC = () => (
  <div className="flex items-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/[0.08] text-emerald-300">
      <svg viewBox="0 0 1406.2 1406.2" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 fill-current">
        <path d="M391.7,270.7c-51.6,18.6-96.2,88.4-117.9,183.6c-7.8,34.8-15.1,93.5-15.1,121.7v19.7l-23.3,36.6 c-65,101.3-124.6,206.8-180.5,319.2C5.1,1051,0,1063.2,0,1080.9c0,7.8,2,18,4,22.2c6.6,12,22.2,24.4,39.7,31l16,6.2l651.1-0.2 c633.1,0,651.1-0.4,661.2-5.3c32.6-16.9,43-51.7,26.2-88c-63.8-139-150.5-296.8-229.6-418.5l-19.1-29.5l-2.2-33.7 c-8.7-129.4-36.1-208.6-92-266.5c-24.2-24.8-33.5-30.4-50.6-30.6c-23.9,0-39.9,10.9-75.6,52.1c-35.2,40.4-42.4,50.1-66.9,86.4 c-12,17.7-27,38.3-33.2,45.5l-11.3,13.5h-117l-117-0.2L560.2,429C515,359.2,440.7,274.5,419.6,268.7 C406.8,264.9,409,264.5,391.7,270.7z M466.2,666.4c8.9,6.2,11.3,11.8,14.4,37.7c4,30.6,7.7,34.8,27.5,32.4 c18-2.2,32.6,3.6,40.8,16.6c16,25.9-11.5,80.2-50.6,99.3c-14,7.1-19.1,7.8-42.8,7.8c-22.8,0-28.8-1.1-39.4-6.7 c-31.2-16.4-50.3-40.3-58.3-71.8c-4-16.6-4.2-21.7-1.1-36.3c4.2-21.1,11.5-35.2,24.8-50.1C404.8,669.5,449.1,654.4,466.2,666.4z M964,669c8.7,7.3,9.3,9.7,13.5,43.4c2.6,20.6,8.7,26.8,25.3,24.2c16-2.2,29.9,2.2,39.2,12.9c15.1,18.2,6.2,53.4-20.8,82.2 c-21.7,23.1-35.2,28.4-69.2,28.8c-25.9,0-29.1-0.5-42.8-8.2c-20.2-11.3-38.4-29.9-47.7-49c-6.2-12.8-8.2-20.8-8.9-39.2 c-0.9-21.1,0-25,7.7-41c14-30.4,35.5-49.2,65-57C945.2,660.2,954.7,661.1,964,669z" />
      </svg>
    </div>
  </div>
);

interface ReaderChapter {
  id: string;
  title: string;
}

interface ContinueReadingData {
  mangaId: string;
  chapterId: string;
  mangaTitle: string;
  mangaCover?: string;
  chapterTitle: string;
  pageIndex: number;
  totalPages: number;
  href: string;
  updatedAt: number;
}

const CONTINUE_READING_KEY = 'mangavel:continue-reading';
const CONTINUE_READING_LIMIT = 8;

const normalizeContinueReading = (raw: string | null): ContinueReadingData[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is ContinueReadingData => Boolean(item?.mangaId && item?.href));
    }
    if (parsed?.mangaId && parsed?.href) {
      return [parsed as ContinueReadingData];
    }
  } catch {
    return [];
  }

  return [];
};

interface ReaderOptionProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}

const MetricCard: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent = false }) => (
  <div className={`rounded-2xl border p-4 ${accent ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-white/5 bg-white/[0.03]'}`}>
    <div className="text-[9px] font-black uppercase tracking-[0.24em] text-gray-500">{label}</div>
    <div className="mt-2 text-sm font-black uppercase tracking-wide text-white">{value}</div>
  </div>
);

const KeyHint: React.FC<{ keys: string; action: string }> = ({ keys, action }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
    <span className="text-[10px] font-black uppercase tracking-wider text-gray-300">{action}</span>
    <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400">{keys}</span>
  </div>
);

const SidebarOption: React.FC<ReaderOptionProps> = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-5 py-4 bg-white/[0.02] rounded-2xl border transition-all duration-300 ${active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/5 text-gray-500 hover:text-white hover:bg-white/5'}`}>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    <Icon size={16} className={active ? 'text-emerald-500' : 'text-gray-600'} />
  </button>
);

const Page: React.FC = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const scraperBase = '/manga-scrapers/mangapill';

  const decodeRouteParam = (value?: string) => {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const proxifyImageUrl = (url: string) => `/api/image?url=${encodeURIComponent(url)}`;
  const decodedMangaId = decodeRouteParam(mangaId);
  const decodedChapterId = decodeRouteParam(chapterId);
  const buildReaderPath = (mangaKey: string, chapterKey: string) => `/read/${encodeURIComponent(mangaKey)}/chapter/${encodeURIComponent(chapterKey)}`;

  const scrollRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);

  const [apiChapters, setApiChapters] = useState<ReaderChapter[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mangaTitle, setMangaTitle] = useState('Loading...');
  const [mangaCover, setMangaCover] = useState('');
  const [readingMode, setReadingMode] = useState<'long-strip' | 'single-page'>('long-strip');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chapterBrowserOpen, setChapterBrowserOpen] = useState(true);
  const [fitWidth, setFitWidth] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [chapterQuery, setChapterQuery] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const id = 'reader-core-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      .animate-in { animation: zoomIn 0.25s cubic-bezier(.2,.9,.3,1) both; }
      @keyframes zoomIn {
        from { opacity: 0; transform: translateY(10px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .thin-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
      .thin-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,.75); border-radius: 999px; }
      img { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
      input[type="range"] { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 16px; margin: 0; padding: 0; border-radius: 999px; background-color: transparent; outline: none; }
      input[type="range"]::-webkit-slider-runnable-track { height: 8px; border-radius: 999px; background: transparent; }
      input[type="range"]::-moz-range-track { height: 8px; border-radius: 999px; background: transparent; }
      input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -4px; width: 16px; height: 16px; border-radius: 999px; border: 2px solid rgba(4,8,6,1); background: #34D399; box-shadow: 0 0 0 6px rgba(16,185,129,.15); cursor: pointer; }
      input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; border-radius: 999px; border: 2px solid rgba(4,8,6,1); background: #34D399; box-shadow: 0 0 0 6px rgba(16,185,129,.15); cursor: pointer; }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const fetchReaderData = async () => {
      if (!decodedMangaId || !decodedChapterId) return;
      setLoading(true);
      try {
        const res = await fetch(`${scraperBase}/pages/${encodeURIComponent(decodedChapterId)}`);
        const data = await res.json();
        const pageUrls = Array.isArray(data.results) ? data.results.map((pageUrl: string) => proxifyImageUrl(pageUrl)) : [];
        setPages(pageUrls);
        setCurrentPageIndex(0);
        imageRefs.current = [];

        const infoRes = await fetch(`${scraperBase}/info/${encodeURIComponent(decodedMangaId)}`);
        const infoData = await infoRes.json();
        const chapterList = Array.isArray(infoData.results?.chapters) ? infoData.results.chapters : [];

        setApiChapters(chapterList);
        setMangaTitle(infoData.results?.title || 'Manga Online');
        setMangaCover(infoData.results?.image || '');
        setChapterQuery('');
        setChapterBrowserOpen(true);

        if (scrollRef.current) scrollRef.current.scrollTop = 0;
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchReaderData();
  }, [decodedMangaId, decodedChapterId]);

  const totalChapters = apiChapters.length;
  const fullChapterList = [...apiChapters].reverse();
  const filteredChapters = fullChapterList.filter((chapter) => chapter.title.toLowerCase().includes(chapterQuery.trim().toLowerCase()));
  const currentChapterIndex = apiChapters.findIndex((chapter) => chapter.id === decodedChapterId);
  const currentChapter = currentChapterIndex >= 0 ? apiChapters[currentChapterIndex] : null;
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < apiChapters.length - 1 ? apiChapters[currentChapterIndex + 1] : null;
  const prevChapter = currentChapterIndex > 0 ? apiChapters[currentChapterIndex - 1] : null;
  const safePageIndex = pages.length > 0 ? Math.min(currentPageIndex, pages.length - 1) : 0;
  const activePageUrl = pages[safePageIndex];
  const progressPercent = pages.length > 0 ? ((safePageIndex + 1) / pages.length) * 100 : 0;
  const chapterPosition = currentChapterIndex >= 0 ? `${currentChapterIndex + 1}/${totalChapters}` : '--';
  const pagePosition = pages.length > 0 ? `${safePageIndex + 1}/${pages.length}` : '0/0';

  const goToChapter = (chapter?: ReaderChapter | null) => {
    if (!chapter) return;
    navigate(buildReaderPath(decodedMangaId, chapter.id));
    setSidebarOpen(false);
  };

  const seekToPage = (index: number, smooth = true) => {
    if (pages.length === 0) return;
    const clampedIndex = Math.max(0, Math.min(index, pages.length - 1));
    setCurrentPageIndex(clampedIndex);

    if (readingMode === 'long-strip') {
      imageRefs.current[clampedIndex]?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  };

  const handlePrevAction = () => {
    if (safePageIndex > 0) {
      seekToPage(safePageIndex - 1);
      return;
    }
    goToChapter(prevChapter);
  };

  const handleNextAction = () => {
    if (safePageIndex < pages.length - 1) {
      seekToPage(safePageIndex + 1);
      return;
    }
    goToChapter(nextChapter);
  };

  useEffect(() => {
    setCurrentPageIndex((current) => {
      if (pages.length === 0) return 0;
      return Math.min(current, pages.length - 1);
    });
  }, [pages.length]);

  useEffect(() => {
    if (readingMode !== 'long-strip') return;
    const container = scrollRef.current;
    if (!container || pages.length === 0) return;

    let ticking = false;

    const updateVisiblePage = () => {
      ticking = false;
      const anchor = container.getBoundingClientRect().top + container.clientHeight * 0.25;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      imageRefs.current.forEach((image, index) => {
        if (!image) return;
        const distance = Math.abs(image.getBoundingClientRect().top - anchor);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setCurrentPageIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisiblePage);
    };

    updateVisiblePage();
    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pages.length, readingMode]);

  useEffect(() => {
    if (readingMode !== 'long-strip') return;
    imageRefs.current[safePageIndex]?.scrollIntoView({ block: 'start' });
  }, [readingMode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !decodedMangaId || !decodedChapterId || pages.length === 0) return;

    const payload: ContinueReadingData = {
      mangaId: decodedMangaId,
      chapterId: decodedChapterId,
      mangaTitle,
      mangaCover,
      chapterTitle: currentChapter?.title || decodedChapterId,
      pageIndex: safePageIndex,
      totalPages: pages.length,
      href: buildReaderPath(decodedMangaId, decodedChapterId),
      updatedAt: Date.now(),
    };

    const existing = normalizeContinueReading(window.localStorage.getItem(CONTINUE_READING_KEY));
    const next = [
      payload,
      ...existing.filter((entry) => entry.mangaId !== payload.mangaId),
    ].slice(0, CONTINUE_READING_LIMIT);

    window.localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(next));
  }, [
    decodedChapterId,
    decodedMangaId,
    mangaCover,
    mangaTitle,
    currentChapter?.title,
    pages.length,
    safePageIndex,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.getAttribute('contenteditable') === 'true';

      if (isTyping) return;

      if (event.key === 'Escape') {
        if (sidebarOpen) {
          setSidebarOpen(false);
          return;
        }
        if (focusMode) {
          setFocusMode(false);
        }
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        setFitWidth((current) => !current);
        return;
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        setReadingMode((current) => (current === 'long-strip' ? 'single-page' : 'long-strip'));
        return;
      }

      if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        setSidebarOpen((current) => !current);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'j' || event.key === 'J') {
        event.preventDefault();
        handlePrevAction();
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'k' || event.key === 'K' || event.key === ' ') {
        event.preventDefault();
        handleNextAction();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusMode, pages.length, readingMode, safePageIndex, sidebarOpen, prevChapter, nextChapter]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-[#111214] text-white font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_24%)]" />
      </div>

      {sidebarOpen && (
        <button onClick={() => setSidebarOpen(false)} className="absolute inset-0 z-[70] bg-black/55 backdrop-blur-sm" aria-label="Close sidebar" />
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden bg-[#090a0c]/85">
        <header className={`border-b border-white/5 bg-[#050505]/88 shadow-2xl backdrop-blur-xl transition-all duration-300 ${focusMode ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-5">
              <button onClick={() => navigate(-1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-400 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400">
                <ChevronLeft size={22} />
              </button>
          <button onClick={() => navigate('/')} className="hidden px-1 py-1 transition-opacity hover:opacity-90 md:flex">
            <Logo />
          </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setFocusMode((current) => !current)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-300 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-400">
                {focusMode ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button onClick={() => setSidebarOpen((current) => !current)} className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${sidebarOpen ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:scale-105'}`}>
                <Layout size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="relative flex-1 overflow-hidden">
          <div ref={scrollRef} className={`h-full bg-black/80 ${readingMode === 'long-strip' ? 'overflow-y-auto thin-scroll scroll-smooth' : 'overflow-hidden'}`}>
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="mb-4 animate-spin text-emerald-500" size={40} />
                <span className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Loading Reader</span>
              </div>
            ) : pages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <BookOpen size={32} className="mb-4 text-gray-700" />
                <div className="text-sm font-black uppercase tracking-[0.25em] text-gray-300">No Pages Found</div>
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-600">Try another chapter</div>
              </div>
            ) : readingMode === 'long-strip' ? (
              <div className={`mx-auto w-full px-3 py-4 sm:px-6 sm:py-8 ${fitWidth ? 'max-w-5xl' : 'max-w-[min(96vw,1500px)]'}`}>
                <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                  {pages.map((url, i) => (
                    <div key={url} className="relative bg-black">
                      <div className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 backdrop-blur">{i + 1}</div>
                      <img
                        ref={(node) => {
                          imageRefs.current[i] = node;
                        }}
                        src={url}
                        className="block w-full h-auto"
                        alt={`Page ${i + 1}`}
                        loading={i < 2 ? 'eager' : 'lazy'}
                        style={{ marginTop: i === 0 ? '0' : '-1px' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col px-3 py-3 sm:px-6 sm:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-3 shadow-[0_30px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  <div>
                    <div className="text-[9px] font-black uppercase tracking-[0.28em] text-emerald-500/70">Precision View</div>
                    <div className="mt-1 text-sm font-black uppercase tracking-wider text-white">{currentChapter?.title || 'Current Chapter'}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                    <span className="rounded-full border border-white/10 bg-black/40 px-3 py-2">Page {pagePosition}</span>
                    <span className="rounded-full border border-white/10 bg-black/40 px-3 py-2">{fitWidth ? 'Fit Width' : 'Fit Height'}</span>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 items-center gap-3">
                  <button onClick={handlePrevAction} disabled={!prevChapter && safePageIndex === 0} className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 md:flex">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[32px] border border-white/10 bg-[#020303] shadow-[0_60px_120px_rgba(0,0,0,0.55)]">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_38%)]" />
                    <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 backdrop-blur">Page {safePageIndex + 1}</div>
                    <button onClick={handlePrevAction} disabled={!prevChapter && safePageIndex === 0} className="absolute inset-y-0 left-0 z-20 w-1/5 min-w-[64px] bg-gradient-to-r from-black/35 to-transparent transition-opacity hover:opacity-100 disabled:opacity-0" aria-label="Previous page" />
                    {activePageUrl ? <img src={activePageUrl} className={`relative z-10 max-h-full max-w-full object-contain ${fitWidth ? 'h-auto w-full' : 'h-full w-auto'}`} alt={`Page ${safePageIndex + 1}`} /> : null}
                    <button onClick={handleNextAction} disabled={!nextChapter && safePageIndex >= pages.length - 1} className="absolute inset-y-0 right-0 z-20 w-1/5 min-w-[64px] bg-gradient-to-l from-black/35 to-transparent transition-opacity hover:opacity-100 disabled:opacity-0" aria-label="Next page" />
                  </div>
                  <button onClick={handleNextAction} disabled={!nextChapter && safePageIndex >= pages.length - 1} className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20 md:flex">
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {!focusMode && !loading && pages.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-40 flex justify-center px-3">

            </div>
          )}
        </div>

        <footer className={`h-1.5 bg-white/5 transition-opacity duration-300 ${focusMode ? 'opacity-0' : 'opacity-100'}`}>
          <div className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_18px_rgba(16,185,129,0.9)]" style={{ width: `${progressPercent}%` }} />
        </footer>
      </main>

      <aside className={`absolute right-0 top-0 z-[80] h-full w-full max-w-[390px] border-l border-white/5 bg-[#0b0c0f]/96 shadow-[0_40px_120px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-full flex-col p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-gray-500">Reader Console</div>
              <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">Control Surface</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-400 transition-colors hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-5 overflow-y-auto thin-scroll pr-1">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
              <div className="text-[9px] font-black uppercase tracking-[0.26em] text-emerald-500">Reading Now</div>
              <h1 className="mt-2 text-lg font-black uppercase italic tracking-tight text-white line-clamp-2">{mangaTitle}</h1>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400 line-clamp-2">{currentChapter?.title || decodedChapterId}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCard label="Chapter" value={chapterPosition} accent />
                <MetricCard label="Page" value={pagePosition} />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-500">Progress</div>
                  <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">Current Session</div>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MetricCard label="Mode" value={readingMode === 'long-strip' ? 'Strip' : 'Single'} />
                <MetricCard label="Layout" value={fitWidth ? 'Wide' : 'Tall'} />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-500">Chapter Browser</div>
                  <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">Fast Navigation</div>
                </div>
                <button onClick={() => setChapterBrowserOpen((current) => !current)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-gray-400 transition-transform hover:text-white">
                  <ChevronDown size={18} className={`transition-transform duration-300 ${chapterBrowserOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {chapterBrowserOpen && (
                <div className="animate-in">
                  <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input value={chapterQuery} onChange={(event) => setChapterQuery(event.target.value)} placeholder="Filter chapters" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-[11px] font-black uppercase tracking-[0.18em] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-emerald-500/30" />
                  </div>
                  <div className="mt-3 max-h-72 overflow-y-auto thin-scroll pr-1">
                    {filteredChapters.map((ch) => (
                      <button key={ch.id} onClick={() => goToChapter(ch)} className={`mb-1.5 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.16em] transition-all ${decodedChapterId === ch.id ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border border-transparent bg-white/[0.02] text-gray-400 hover:border-white/5 hover:bg-white/[0.05] hover:text-white'}`}>
                        <span className="truncate pr-3">{ch.title}</span>
                        {decodedChapterId === ch.id && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />}
                      </button>
                    ))}
                    {filteredChapters.length === 0 && <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-6 text-center text-[10px] font-black uppercase tracking-[0.22em] text-gray-600">No chapters match</div>}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.26em] text-gray-500">Reader Mode</div>
              <div className="space-y-3">
                <SidebarOption icon={Layout} label="Long Strip" active={readingMode === 'long-strip'} onClick={() => setReadingMode('long-strip')} />
                <SidebarOption icon={Columns} label="Single Page" active={readingMode === 'single-page'} onClick={() => setReadingMode('single-page')} />
                <SidebarOption icon={ArrowLeftRight} label={fitWidth ? 'Fit Width' : 'Fit Height'} active={fitWidth} onClick={() => setFitWidth((current) => !current)} />
                <SidebarOption icon={focusMode ? Eye : EyeOff} label={focusMode ? 'Show Chrome' : 'Focus Mode'} active={focusMode} onClick={() => setFocusMode((current) => !current)} />
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 text-[9px] font-black uppercase tracking-[0.26em] text-gray-500">Shortcuts</div>
              <div className="space-y-2.5">
                <KeyHint keys="J / Left" action="Prev page" />
                <KeyHint keys="K / Right" action="Next page" />
                <KeyHint keys="M" action="Switch mode" />
                <KeyHint keys="F" action="Toggle fit" />
                <KeyHint keys="I" action="Open panel" />
                <KeyHint keys="Esc" action="Close panel" />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <button disabled={!prevChapter} onClick={() => goToChapter(prevChapter)} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20">
                <ChevronLeft size={16} />
                Prev Ch
              </button>
              <button disabled={!nextChapter} onClick={() => goToChapter(nextChapter)} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-gray-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-20">
                Next Ch
                <ChevronRight size={16} />
              </button>
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Page;
