
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Flame, Play, Star, Tv } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import {
  AnimeResult,
  fetchAnimePopular,
  fetchAnimeSpotlight,
  getAnimeCover,
  getAnimeDisplayTitle,
  getAnimeScore,
  getAnimeStatusLabel,
  getAnimeTypeLabel,
} from '../utils/animeApi';
import { handleRippleMouseDown } from '../utils/ripple';

const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

export interface ContinueWatchingEntry {
  kind: string;
  animeId: string;
  episodeId: string;
  animeTitle: string;
  animeCover?: string;
  episodeTitle: string;
  episodeNumber: number;
  href: string;
  duration?: number;
  currentTime?: number;
  updatedAt: number;
}

const getEpisodeLabel = (anime: AnimeResult) =>
  typeof anime.episodes === 'number' && anime.episodes > 0 ? String(anime.episodes) : 'TBA';

const SectionHeader: React.FC<{ icon: React.ElementType; title: string; subtitle?: string }> = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-end justify-between gap-4">
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-accent-muted)]">
        <Icon className="text-[var(--app-accent)]" size={18} />
      </div>
      <div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white antialiased">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.26em] text-zinc-500 antialiased">{subtitle}</p> : null}
      </div>
    </div>
  </div>
);

const AnimeCard: React.FC<{ anime: AnimeResult; navigate: ReturnType<typeof useNavigate> }> = ({ anime, navigate }) => (
  <div
    onClick={() => navigate(`/watch/${anime.id}`)}
    style={{ fontFamily: APP_FONT }}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
      <img src={getAnimeCover(anime)} alt={getAnimeDisplayTitle(anime.title)} className="h-full w-full object-cover transition-transform duration-700 " />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)] antialiased">
              {getAnimeTypeLabel(anime)}
            </span>
            {getAnimeScore(anime) ? (
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold text-white/75 antialiased">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {getAnimeScore(anime)?.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-bold leading-tight text-white transition-colors group-hover:text-white/90 antialiased">
            {getAnimeDisplayTitle(anime.title)}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            {[anime.studios?.nodes?.find((studio) => studio.isAnimationStudio)?.name, anime.seasonYear].filter(Boolean).join(' / ') || 'Anime series'}
          </p>
        </div>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Status</span>
            <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--app-accent)] antialiased">
              {getAnimeStatusLabel(anime.status)}
            </span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Season</span>
            <span className="mt-2 block text-sm font-bold text-white antialiased">
              {[anime.seasonYear].filter(Boolean).join(' ') || 'TBA'}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Episodes</span>
            <span className="mt-2 block truncate text-sm font-bold uppercase text-white antialiased">
              {getEpisodeLabel(anime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ContinueWatchingCard: React.FC<{
  entry: ContinueWatchingEntry;
  navigate: ReturnType<typeof useNavigate>;
  onClear: (animeId: string) => void;
}> = ({ entry, navigate, onClear }) => {
  const progressPercent = entry.duration && entry.duration > 0
    ? Math.max((Math.max(entry.currentTime || 0, 0) / entry.duration) * 100, 4)
    : 20;

  return (
    <div
      onClick={() => navigate(`/watch/${entry.animeId}`)} // <-- Changed this line to link to the details page instead of the exact episode
      style={{ fontFamily: APP_FONT }}
      className="group relative flex min-h-44 gap-3 overflow-hidden rounded-[1.4rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
    >
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-card)] ring-1 ring-white/[0.08]">
        {entry.animeCover ? (
          <img src={entry.animeCover} alt={entry.animeTitle} className="h-full w-full object-cover transition-transform duration-700 " />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--app-accent)]/50">
            <Tv size={26} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
        <div className="mb-2 min-w-0">
          <span className="mb-2 inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-accent-muted)] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--app-accent)] antialiased">
            Continue Watching
          </span>
          <h3 className="truncate text-[1.08rem] font-bold leading-tight text-white transition-colors group-hover:text-white/90 antialiased">
            {entry.animeTitle}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400 antialiased">
            Episode {entry.episodeNumber || '?'} • {entry.episodeTitle}
          </p>
        </div>

        <div onClick={(event) => event.stopPropagation()} className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500 antialiased">Progress</span>
              <span className="mt-1 block text-sm font-bold text-white antialiased">
                {entry.currentTime && entry.duration
                  ? `${Math.floor(entry.currentTime / 60)}m / ${Math.floor(entry.duration / 60)}m`
                  : 'Episode saved'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 antialiased">
              {Math.round(progressPercent)}%
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[var(--app-accent)]" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation(); // <-- Prevents the card click from overriding this
                navigate(entry.href); // <-- This still launches the exact episode
              }}
              onMouseDown={handleRippleMouseDown}
              className="ripple-button group/button relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
              style={{ backgroundColor: 'var(--app-accent)' }}
            >
              <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-500 skew-x-[-20deg]" />
              <Play size={13} fill="currentColor" className="relative z-10" />
              <span className="relative z-10">Resume</span>
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onClear(entry.animeId);
              }}
              onMouseDown={handleRippleMouseDown}
              className="ripple-button rounded-xl bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white active:scale-[0.98] antialiased"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimeHome: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [spotlight, setSpotlight] = useState<AnimeResult[]>([]);
  const [popularAnime, setPopularAnime] = useState<AnimeResult[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingEntry[]>([]);

  useEffect(() => {
    const syncContinue = () => {
      try {
        const raw = localStorage.getItem('anime-continue-watching');
        if (raw) {
          const parsed = JSON.parse(raw);
          const validEntries = (Array.isArray(parsed) ? parsed : []).filter((e: any) => e.kind === 'anime');
          setContinueWatching(validEntries);
        } else {
          setContinueWatching([]);
        }
      } catch (e) {
        console.error("Failed to parse continue watching state", e);
      }
    };

    syncContinue();
    window.addEventListener('storage', syncContinue);
    window.addEventListener('focus', syncContinue);
    return () => {
      window.removeEventListener('storage', syncContinue);
      window.removeEventListener('focus', syncContinue);
    };
  }, []);

  const clearContinueWatching = useCallback((animeId: string) => {
    try {
      const raw = localStorage.getItem('anime-continue-watching');
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((entry: ContinueWatchingEntry) => String(entry.animeId) !== String(animeId));
        localStorage.setItem('anime-continue-watching', JSON.stringify(filtered));
        setContinueWatching(filtered);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error("Failed to clear continue watching entry", e);
    }
  }, []);

  useEffect(() => {
    const fetchHome = async () => {
      try {
        setLoading(true);
        const [spotlightData, popularData] = await Promise.all([fetchAnimeSpotlight(), fetchAnimePopular(1, 24)]);
        setSpotlight(Array.isArray(spotlightData.results) ? spotlightData.results : []);
        setPopularAnime(Array.isArray(popularData.results) ? popularData.results : []);
      } finally {
        setLoading(false);
      }
    };

    fetchHome();
  }, []);

  const heroAnime = useMemo(() => spotlight[0] || popularAnime[0], [popularAnime, spotlight]);
  const heroTitle = getAnimeDisplayTitle(heroAnime?.title);
  const heroScore = getAnimeScore(heroAnime);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-white font-sans antialiased selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
<section className="overflow-hidden rounded-[2rem] border border-[var(--app-border)] bg-[var(--app-surface-1)] shadow-xl">
          {loading || !heroAnime ? (
            <div className="h-[440px] w-full bg-white/5 animate-pulse" />
          ) : (
            <div className="grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
              {/* Left Column: Info & Actions */}
              <div className="relative z-10 flex flex-col justify-between px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12">
                
                <div className="flex-1">
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <span className="rounded-full bg-[var(--app-accent)]/10 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--app-accent)] antialiased">
                      #1 Spotlight Pick
                    </span>
                    {heroScore ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.05] px-3.5 py-1.5 text-[10px] font-black text-white/90 antialiased">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {heroScore.toFixed(2)}
                      </span>
                    ) : null}
                  </div>

                  {/* Title & Description */}
                  <h1 className="max-w-4xl text-4xl font-black uppercase tracking-tight text-white md:text-5xl lg:text-[3.5rem] lg:leading-[1] antialiased">
                    {heroTitle}
                  </h1>
                  {heroAnime.description ? (
                    <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-[15px] line-clamp-3 antialiased">
                      {heroAnime.description.replace(/<br><br>/g, ' ').replace(/<[^>]*>/g, '')}
                    </p>
                  ) : null}

                  {/* Buttons */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigate(`/watch/${heroAnime.id}`)}
                      onMouseDown={handleRippleMouseDown}
                      className="ripple-button group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-[#04110d] transition-all active:scale-[0.98] antialiased"
                      style={{ backgroundColor: 'var(--app-accent)' }}
                    >
                      <Play size={15} fill="currentColor" />
                      Watch Now
                    </button>
                    <button
                      onClick={() => navigate('/anibrowse')}
                      onMouseDown={handleRippleMouseDown}
                      className="ripple-button inline-flex items-center justify-center rounded-2xl bg-white/[0.03] px-5 py-3.5 text-sm font-black uppercase tracking-[0.18em] text-white/85 transition-colors hover:bg-white/[0.06] active:scale-[0.98] antialiased"
                    >
                      Browse Library
                    </button>
                  </div>
                </div>

                {/* Bottom Stats Grid */}

              </div>

              {/* Right Column: Cover Image */}
              <div className="relative flex items-center justify-center border-t border-[var(--app-border)] bg-black/10 p-8 lg:border-l lg:border-t-0">
                <div className="relative mx-auto flex h-full max-w-[240px] xl:max-w-[260px] items-center justify-center">
                  <img 
                    src={getAnimeCover(heroAnime)} 
                    alt={heroTitle} 
                    className="relative aspect-[2/3] w-full rounded-2xl border border-white/10 object-cover shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] transition-transform duration-700 hover:scale-105" 
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {continueWatching.length > 0 ? (
          <section className="space-y-6">
            <SectionHeader icon={BookOpen} title="Continue Watching" subtitle={`${continueWatching.length} in progress`} />
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {continueWatching.map((entry) => (
                <div key={`${entry.animeId}-${entry.episodeId}`} className="xl:max-w-[760px]">
                  <ContinueWatchingCard entry={entry} navigate={navigate} onClear={clearContinueWatching} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-6">
          <SectionHeader icon={Flame} title="Popular Anime" subtitle={`${popularAnime.length} titles loaded`} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {loading
              ? Array.from({ length: 9 }).map((_, index) => (
                  <div key={index} className="flex h-44 gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-1)] p-4 animate-pulse">
                    <div className="w-32 rounded-lg bg-white/5" />
                    <div className="flex-1 space-y-2 py-2">
                      <div className="h-4 w-3/4 rounded bg-white/5" />
                      <div className="h-3 w-1/4 rounded bg-white/5" />
                      <div className="mt-auto space-y-2 pt-4">
                        <div className="h-6 w-full rounded bg-white/5" />
                        <div className="h-6 w-full rounded bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))
              : popularAnime.map((anime) => <AnimeCard key={anime.id} anime={anime} navigate={navigate} />)}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnimeHome;
