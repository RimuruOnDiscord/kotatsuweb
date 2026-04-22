import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Star, Flame, BookOpen, ShieldCheck, Play, Settings, Search
} from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { containsNovelToken, isAllowedSeriesType } from '../utils/contentFilters';
import { handleRippleMouseDown } from '../utils/ripple';
import { useAuth } from '../lib/AuthContext';

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

  .aw-root { font-family: var(--aw-font-body); background: var(--aw-bg); color: var(--aw-text); }

  .aw-layout {
    max-width: 1540px;
    margin: 0 auto;
    width: 100%;
    padding: 28px 24px;
    gap: 24px;
    position: relative;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  /* Info section label */
  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
  }

  /* Media Card Styles */
  .aw-media-card {
    transition: transform 0.2s cubic-bezier(0.25,0.46,0.45,0.94);
  }
  .aw-media-card-img {
    transition: all 0.3s cubic-bezier(0.25,1,0.5,1);
    border: 1px solid var(--aw-border);
  }
  .aw-media-card:hover .aw-media-card-img {
    transform: translateY(-4px);
    border-color: var(--aw-accent-dim);
    box-shadow: 0 12px 30px -10px rgba(0, 0, 0, 0.5);
  }
  .aw-media-card:hover img {
    transform: scale(1.08);
  }
  .aw-media-card-play {
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.5); 
  }

  /* Continue Reading Wide Card */
  .aw-continue-card {
    transition: all 0.3s cubic-bezier(0.25,0.46,0.45,0.94);
    background: var(--aw-s2);
    border: 1px solid var(--aw-border);
  }
  .aw-continue-card:hover {
    border-color: var(--aw-accent-dim);
    box-shadow: 0 12px 40px -20px var(--aw-accent-glow);
    transform: translateY(-2px);
  }

  /* Skeleton shimmer */
  @keyframes shimmer {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .aw-skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease infinite;
  }

  /* Noise overlay */
  .aw-noise::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 180px;
  }
`;

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

// --- Interfaces ---
interface Manga {
  mal_id: number;
  title: string;
  title_english?: string;
  synopsis?: string;
  chapters?: number;
  score?: number;
  status?: string;
  type?: string;
  rank?: number;
  published?: { from: string };
  authors?: { name: string }[];
  originLabel?: string;
  year?: number;
  images: {
    jpg: {
      image_url: string;
      large_image_url: string;
    };
  };
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
const FORMAT_FILTERS = ['all', 'manga', 'manhwa', 'manhua'] as const;
type FormatFilter = typeof FORMAT_FILTERS[number];

const matchesFormatFilter = (mangaType: string | undefined, filter: FormatFilter) => {
  if (filter === 'all') return true;
  return (mangaType || '').toLowerCase() === filter;
};

const getChapterCountDisplay = (manga: Manga) =>
  typeof manga.chapters === 'number' && manga.chapters > 0 ? String(manga.chapters) : '--';

const normalizeContinueReading = (raw: string | null): ContinueReadingData[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is ContinueReadingData =>
        Boolean(item?.mangaId && item?.href) &&
        !containsNovelToken(item.mangaId) &&
        !containsNovelToken(item.chapterId) &&
        !containsNovelToken(item.mangaTitle) &&
        !containsNovelToken(item.chapterTitle) &&
        !containsNovelToken(item.href)
      );
    }
    if (
      parsed?.mangaId &&
      parsed?.href &&
      !containsNovelToken(parsed.mangaId) &&
      !containsNovelToken(parsed.chapterId) &&
      !containsNovelToken(parsed.mangaTitle) &&
      !containsNovelToken(parsed.chapterTitle) &&
      !containsNovelToken(parsed.href)
    ) {
      return [parsed as ContinueReadingData];
    }
  } catch {
    return [];
  }

  return [];
};

// Helper function to turn strings into clean URLs
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

// --- Components ---

const SectionHeader: React.FC<{ title: string; subtitle?: string; onViewMore?: () => void }> = ({ title, subtitle, onViewMore }) => (
  <div className="flex items-end justify-between" style={{ marginBottom: 4 }}>
    <div>
      {subtitle && (
        <p className="aw-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {subtitle}
        </p>
      )}
      <h2 style={{
        fontFamily: 'var(--aw-font-display)',
        fontSize: 'clamp(20px, 3vw, 24px)',
        fontWeight: 700,
        color: 'var(--aw-text)',
        letterSpacing: '-0.01em',
        lineHeight: 1.2,
        margin: 0,
      }}>
        {title}
      </h2>
    </div>
    {onViewMore && (
      <button
        onClick={onViewMore}
        style={{
          fontFamily: 'var(--aw-font-display)',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--aw-muted)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          paddingBottom: 4
        }}
        className="hover:text-white transition-colors"
      >
        View More
      </button>
    )}
  </div>
);

const MangaPosterCard: React.FC<{ manga: Manga; navigate: any }> = ({ manga, navigate }) => {
  const title = manga.title;
  const cover = manga.images.jpg.large_image_url || manga.images.jpg.image_url;
  const type = manga.type || 'Manga';

  return (
    <div
      onClick={() => navigate(`/read/${createSlug(title)}`)}
      className="aw-media-card group relative flex w-full cursor-pointer flex-col gap-3"
    >
      {/* Image Container */}
      <div className="aw-media-card-img relative aspect-[2/3] w-full overflow-hidden rounded-[14px] bg-[var(--aw-card)]">
        <img
          src={cover}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-90 group-hover:opacity-100"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Play Button Overlay */}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 opacity-0 transition-all duration-300 pointer-events-none group-hover:opacity-100">
          <div
            className="aw-media-card-play flex h-12 w-12 items-center justify-center rounded-full translate-y-4 transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] group-hover:translate-y-0"
            style={{ background: 'var(--aw-accent)', color: '#04110d' }}
          >
            <BookOpen size={20} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Text Info */}
      <div className="flex flex-col gap-1 px-0.5">
        <h3 style={{
          fontFamily: 'var(--aw-font-display)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--aw-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2
        }}>
          {title}
        </h3>
      </div>
    </div>
  );
};

const ContinueReadingCard: React.FC<{
  data: ContinueReadingData;
  navigate: any;
  onClear: (mangaId: string) => void;
}> = ({ data, navigate, onClear }) => {
  const coverSrc = data.mangaCover
    ? `/api/image?url=${encodeURIComponent(data.mangaCover)}`
    : '';
  const progressPercent = Math.max(((data.pageIndex + 1) / Math.max(data.totalPages, 1)) * 100, 6);

  return (
    <div
      onClick={() => navigate(`/read/${createSlug(data.mangaTitle)}`)}
      className="aw-continue-card group relative flex min-h-44 gap-4 overflow-hidden rounded-[16px] p-3 cursor-pointer"
    >
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[12px] bg-[var(--aw-card)] ring-1 ring-white/10">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={data.mangaTitle}
            className="h-full w-full object-cover transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--aw-accent)]/50">
            <BookOpen size={26} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-2">
          <div className="min-w-0">
            <span
              className="mb-2 inline-flex items-center rounded-full px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.2em]"
              style={{
                fontFamily: 'var(--aw-font-display)',
                background: 'var(--aw-accent-dim)',
                color: 'var(--aw-accent)',
                border: '1px solid var(--aw-accent)'
              }}
            >
              Continue Reading
            </span>
            <h3
              className="truncate leading-tight text-white transition-colors group-hover:text-white/90"
              style={{ fontFamily: 'var(--aw-font-display)', fontSize: '1.15rem', fontWeight: 700 }}
            >
              {data.mangaTitle}
            </h3>
            <p
              className="mt-1 truncate text-sm font-medium"
              style={{ fontFamily: 'var(--aw-font-body)', color: 'var(--aw-muted)' }}
            >
              {data.chapterTitle}
            </p>
          </div>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-auto rounded-[12px] px-4 py-3"
          style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)' }}
        >
          <div className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <span
                  className="block text-[9px] font-semibold uppercase tracking-[0.2em]"
                  style={{ fontFamily: 'var(--aw-font-display)', color: 'var(--aw-muted)' }}
                >
                  Progress
                </span>
                <span
                  className="mt-1 block text-sm font-bold text-white"
                  style={{ fontFamily: 'var(--aw-font-body)' }}
                >
                  Page {data.pageIndex + 1}
                  <span className="ml-1 text-white/40">/ {data.totalPages}</span>
                </span>
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ fontFamily: 'var(--aw-font-display)', color: 'var(--aw-muted)' }}
              >
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%`, background: 'var(--aw-accent)', boxShadow: '0 0 10px var(--aw-accent-glow)' }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(data.href);
                }}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button group/button relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#04110d] transition-all active:scale-[0.98]"
                style={{ backgroundColor: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}
              >
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
                <BookOpen size={13} fill="currentColor" className="relative z-10" />
                <span className="relative z-10">Resume</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear(data.mangaId);
                }}
                onMouseDown={handleRippleMouseDown}
                className="ripple-button rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.98]"
                style={{ fontFamily: 'var(--aw-font-display)', background: 'var(--aw-bg)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Homer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trendingManga, setTrendingManga] = useState<Manga[]>([]);
  const [recommendedManga, setRecommendedManga] = useState<Manga[]>([]);

  const [loading, setLoading] = useState(true);
  const [continueReading, setContinueReading] = useState<ContinueReadingData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter] = useState<FormatFilter>('all');

  // Hero Carousel State
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [anilistDescriptions, setAnilistDescriptions] = useState<Record<number, string>>({});
  const [anilistBanners, setAnilistBanners] = useState<Record<number, string>>({});

  // Physics Drag State
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [safeSearch, setSafeSearch] = useState(true);

  // Inject Design Styles
  useEffect(() => {
    const id = 'aw-design-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  // Animations
  useEffect(() => {
    const id = 'vf-ui-animations';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      .animate-in { will-change: transform, opacity; }
      .fade-in { animation: vf-fade-in .3s both; }
      .zoom-in { animation: vf-zoom-in .3s cubic-bezier(.2,.9,.3,1) both; }
      @keyframes vf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vf-zoom-in { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncContinueReading = () => {
      try {
        const raw = window.localStorage.getItem(CONTINUE_READING_KEY);
        const nextEntries = normalizeContinueReading(raw);
        setContinueReading(nextEntries);
        if (nextEntries.length > 0) {
          window.localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(nextEntries));
        } else {
          window.localStorage.removeItem(CONTINUE_READING_KEY);
        }
      } catch {
        setContinueReading([]);
      }
    };

    syncContinueReading();
    window.addEventListener('storage', syncContinueReading);
    window.addEventListener('focus', syncContinueReading);

    return () => {
      window.removeEventListener('storage', syncContinueReading);
      window.removeEventListener('focus', syncContinueReading);
    };
  }, []);

  const clearContinueReading = useCallback((mangaId: string) => {
    if (typeof window === 'undefined') return;

    const next = continueReading.filter((entry) => entry.mangaId !== mangaId);
    setContinueReading(next);

    if (next.length > 0) {
      window.localStorage.setItem(CONTINUE_READING_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(CONTINUE_READING_KEY);
    }
  }, [continueReading]);

  // Fetch Logic (Trending and Recommended)
  useEffect(() => {
    const fetchData = async () => {
      // Helper to create a pause
      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      try {
        setLoading(true);

        // 1. Fetch first request
        const trendingRes = await fetch('https://api.jikan.moe/v4/top/manga?filter=publishing&limit=6');
        const trendingData = await trendingRes.json();

        // 2. Wait for 1 second (or adjust as needed)
        await delay(1000);

        // 3. Fetch second request
        const recommendedRes = await fetch('https://api.jikan.moe/v4/top/manga?filter=bypopularity&limit=6');
        const recommendedData = await recommendedRes.json();

        const mapManga = (mangaList: any[]) => (mangaList || []).map((manga: any) => {
          let originLabel = 'Japan';
          const t = manga.type?.toLowerCase();

          if (t === 'manhwa') originLabel = 'South Korea';
          else if (t === 'manhua') originLabel = 'China';
          else if (t === 'oel') originLabel = 'Global';

          let year: number | undefined = undefined;
          if (manga.published && manga.published.from) {
            year = new Date(manga.published.from).getFullYear();
          }

          return { ...manga, originLabel, year };
        });

        setTrendingManga(mapManga(trendingData.data));
        setRecommendedManga(mapManga(recommendedData.data));
      } catch (error) {
        console.error("Fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredTrending = trendingManga.filter((manga) => isAllowedSeriesType(manga.type) && matchesFormatFilter(manga.type, formatFilter));
  const filteredRecommended = recommendedManga.filter((manga) => isAllowedSeriesType(manga.type) && matchesFormatFilter(manga.type, formatFilter));

  // Compute EXACTLY top 6 for the Hero Carousel using the Trending Data
  const heroItems = useMemo(() => filteredTrending.slice(0, 6), [filteredTrending]);

  // Fetch High-Quality Anilist Descriptions & Banners for the carousel
  useEffect(() => {
    if (heroItems.length === 0) return;

    const fetchDesc = async (item: Manga) => {
      if (anilistDescriptions[item.mal_id]) return null;
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query ($search: String) { Media (search: $search, type: MANGA) { description(asHtml: false), bannerImage } }`,
            variables: { search: item.title_english || item.title }
          })
        });
        const data = await response.json();
        const cleanDesc = data?.data?.Media?.description?.replace(/<br><br>/g, ' ').replace(/<[^>]*>/g, '');
        const bannerImage = data?.data?.Media?.bannerImage;
        return { id: item.mal_id, desc: cleanDesc || 'No synopsis available for this series.', bannerImage };
      } catch (e) {
        return { id: item.mal_id, desc: 'No synopsis available for this series.', bannerImage: null };
      }
    };

    Promise.all(heroItems.map(fetchDesc)).then(results => {
      const newDescs: Record<number, string> = {};
      const newBanners: Record<number, string> = {};
      let updated = false;
      results.forEach(res => {
        if (res) {
          newDescs[res.id] = res.desc;
          if (res.bannerImage) newBanners[res.id] = res.bannerImage;
          updated = true;
        }
      });
      if (updated) {
        setAnilistDescriptions(prev => ({ ...prev, ...newDescs }));
        setAnilistBanners(prev => ({ ...prev, ...newBanners }));
      }
    });
  }, [heroItems, anilistDescriptions]);

  // Auto-slide effect for the hero banner
  useEffect(() => {
    if (heroItems.length <= 1 || isDragging) return;
    const intervalId = setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroItems.length);
    }, 7000);
    return () => clearInterval(intervalId);
  }, [heroItems.length, activeHeroIndex, isDragging]);

  // Physics Drag Handlers
  const handleDragStart = (clientX: number) => {
    setTouchStart(clientX);
    setIsDragging(true);
    setDragOffset(0);
    setDragDistance(0);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging || touchStart === null) return;
    const offset = clientX - touchStart;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragDistance(Math.abs(dragOffset));

    if (dragOffset > 75) {
      setActiveHeroIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length);
    } else if (dragOffset < -75) {
      setActiveHeroIndex((prev) => (prev + 1) % heroItems.length);
    }

    setDragOffset(0);
    setTouchStart(null);
  };

  const handleNavigation = (e: React.MouseEvent, path: string) => {
    if (dragDistance > 10) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(path);
  };

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--app-accent-muted)]">

      {/* Ambient Cinematic Background Glows */}
      <div className="pointer-events-none fixed -top-[10%] left-1/2 -translate-x-1/2 h-[600px] w-[1000px] rounded-[100%] bg-[var(--aw-accent)]/10 blur-[140px]" />
      <div className="pointer-events-none fixed -bottom-[20%] right-[-10%] h-[500px] w-[800px] rounded-[100%] bg-[var(--aw-accent)]/5 blur-[160px]" />

      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-[1460px] space-y-10 px-4 md:px-8 py-8">

        {/* === HERO SECTION === */}
        <section className="w-full relative mb-8">
          {loading || heroItems.length === 0 ? (
            <div className="h-[400px] lg:h-[480px] w-full rounded-[24px] bg-[var(--app-surface-1)] animate-pulse border border-white/5 shadow-2xl" />
          ) : (
            <div
              className="relative w-full rounded-[24px] bg-[var(--app-surface-1)] border border-white/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] overflow-hidden min-h-[400px] lg:min-h-[480px] cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => handleDragStart(e.clientX)}
              onMouseMove={(e) => handleDragMove(e.clientX)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
              onTouchEnd={handleDragEnd}
            >

              {/* Sliding Track */}
              <div
                className={`flex w-full h-full ${isDragging ? '' : 'transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]'}`}
                style={{ transform: `translateX(calc(-${activeHeroIndex * 100}% + ${dragOffset}px))` }}
              >
                {heroItems.map((manga, index) => {
                  const author = manga.authors?.[0]?.name;
                  const year = manga.year;
                  const cover = manga.images.jpg.large_image_url || manga.images.jpg.image_url;
                  const banner = anilistBanners[manga.mal_id] || cover;
                  const desc = anilistDescriptions[manga.mal_id] || manga.synopsis || 'Loading synopsis...';

                  return (
                    <div key={manga.mal_id} className="w-full h-full flex-shrink-0 relative flex flex-col md:flex-row items-center justify-between gap-10 lg:gap-14 p-8 md:p-12 lg:p-16 min-h-[400px] lg:min-h-[480px]">

                      {/* Immersive Cinematic Background */}
                      <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                        <img
                          src={banner}
                          draggable="false"
                          className="w-full h-full object-cover opacity-[0.25] scale-125 pointer-events-none"
                          alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[var(--app-surface-1)] via-[var(--app-surface-1)]/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-surface-1)] via-transparent to-[var(--app-surface-1)]/20" />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>

                      {/* LEFT COLUMN: Text Content */}
                      <div className="w-full md:w-[55%] lg:w-[60%] flex flex-col gap-5 z-10">

                        {/* Title */}
                        <h1
                          className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black uppercase leading-[1.1] tracking-tight text-white drop-shadow-lg pr-4"
                          style={{ fontFamily: 'var(--aw-font-display)' }}
                        >
                          {manga.title}
                        </h1>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span
                            className="bg-[var(--app-accent)] text-[#04110d] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md shadow-[0_0_15px_var(--app-accent-muted)] tracking-[0.2em]"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            #{manga.rank || index + 1} Top Publishing
                          </span>
                          <span
                            className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            {manga.type || 'Manga'}
                          </span>
                          {manga.score ? (
                            <span
                              className="flex items-center gap-1 border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] backdrop-blur-md"
                              style={{ fontFamily: 'var(--aw-font-display)' }}
                            >
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              {manga.score.toFixed(2)}
                            </span>
                          ) : null}
                          <span
                            className="border border-white/10 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm bg-white/[0.05] uppercase tracking-wider backdrop-blur-md"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            {[author, year].filter(Boolean).join(' / ')}
                          </span>
                        </div>

                        {/* Description Text */}
                        <p
                          className={`text-sm md:text-base leading-relaxed line-clamp-3 lg:line-clamp-4 drop-shadow-md ${desc.includes('No synopsis') ? 'text-white/40 italic tracking-wide' : 'text-zinc-300'}`}
                          style={{ fontFamily: 'var(--aw-font-body)' }}
                        >
                          {desc}
                        </p>

                        {/* Action Buttons */}
                        <div className="mt-2 flex flex-wrap gap-3">
                          <button
                            onClick={(e) => handleNavigation(e, `/read/${createSlug(manga.title)}`)}
                            onMouseDown={(e) => { e.stopPropagation(); handleRippleMouseDown(e); }}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-[#04110d] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: 'var(--app-accent)', fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <BookOpen size={16} fill="currentColor" className="relative z-10" />
                            <span className="relative z-10">Open Series</span>
                          </button>
                          <button
                            onClick={(e) => handleNavigation(e, '/browse')}
                            onMouseDown={handleRippleMouseDown}
                            className="ripple-button group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-3.5 text-[12px] font-black uppercase tracking-[0.18em] text-white border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all hover:bg-white/[0.08] hover:border-white/20 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ fontFamily: 'var(--aw-font-display)' }}
                          >
                            <div className="absolute inset-0 bg-white/25 translate-x-[-100%] skew-x-[-20deg] transition-transform duration-500 group-hover:translate-x-[100%]" />
                            <Search size={16} className="relative z-10 text-zinc-400" />
                            <span className="relative z-10">Browse Catalog</span>
                          </button>
                        </div>
                      </div>

                      {/* RIGHT COLUMN: Crisp Uncropped Poster */}
                      <div className="hidden md:block w-48 lg:w-[260px] xl:w-[280px] flex-shrink-0 z-10 pb-4">
                        <div
                          onClick={(e) => handleNavigation(e, `/read/${createSlug(manga.title)}`)}
                          className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] border border-white/10 cursor-pointer transform transition-transform duration-500 hover:-translate-y-2"
                        >
                          <img
                            src={cover}
                            alt={manga.title}
                            draggable="false"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 pointer-events-none"
                          />

                          {/* Play Button Overlay on hover */}
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <div className="bg-[var(--app-accent)] text-[#04110d] p-5 rounded-full transform scale-75 group-hover:scale-100 transition-transform duration-300 ease-out ">
                              <BookOpen size={26} fill="currentColor" className="" />
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

              {/* Functional Carousel Dots */}
              <div
                className="absolute bottom-6 md:bottom-8 left-8 md:left-12 lg:left-16 flex gap-2.5 items-center z-20 pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                {heroItems.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    onClick={() => setActiveHeroIndex(index)}
                    aria-label={`View slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-500 ease-out ${index === activeHeroIndex
                      ? 'w-8 bg-[var(--app-accent)] shadow-[0_0_12px_var(--app-accent-muted)]'
                      : 'w-2 bg-white/20 hover:bg-white/50 cursor-pointer'
                      }`}
                  />
                ))}
              </div>

            </div>
          )}
        </section>
        {/* === END HERO SECTION === */}

        {user && continueReading.length > 0 && (
          <section style={{
            padding: '24px 28px 36px',
            background: 'var(--aw-s1)',
            borderRadius: 16,
            border: '1px solid var(--aw-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            <SectionHeader title="Continue Reading" subtitle={`${continueReading.length} titles in progress`} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {continueReading.map((entry) => (
                <div key={entry.mangaId} className="xl:max-w-[760px]">
                  <ContinueReadingCard
                    data={entry}
                    navigate={navigate}
                    onClear={clearContinueReading}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* === TRENDING NOW === */}
        <section style={{
          padding: '24px 28px 36px',
          background: 'var(--aw-s1)',
          borderRadius: 16,
          border: '1px solid var(--aw-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <SectionHeader
            title="Trending Now"
            subtitle={formatFilter === 'all' ? 'The Most Popular Series This Week' : `${filteredTrending.length} ${formatFilter} titles loaded`}
            onViewMore={() => navigate('/browse')}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] w-full bg-[var(--aw-card)] rounded-[14px] aw-skeleton border border-[var(--aw-border)]" />
              ))
            ) : (
              filteredTrending.slice(0, 12).map((manga, idx) => (
                <MangaPosterCard key={`trend-${manga.mal_id}-${idx}`} manga={manga} navigate={navigate} />
              ))
            )}
          </div>
        </section>

        {/* === RECOMMENDED FOR YOU === */}
        <section style={{
          padding: '24px 28px 36px',
          background: 'var(--aw-s1)',
          borderRadius: 16,
          border: '1px solid var(--aw-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          <SectionHeader
            title="Recommended For You"
            subtitle="Our personal choice for you"
            onViewMore={() => navigate('/browse')}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] w-full bg-[var(--aw-card)] rounded-[14px] aw-skeleton border border-[var(--aw-border)]" />
              ))
            ) : (
              filteredRecommended.slice(0, 12).map((manga, idx) => (
                <MangaPosterCard key={`rec-${manga.mal_id}-${idx}`} manga={manga} navigate={navigate} />
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default Homer;