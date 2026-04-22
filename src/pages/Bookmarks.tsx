import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppTopbar from '../components/AppTopbar';
import { handleRippleMouseDown } from '../utils/ripple';
import { BookmarkEntry, readBookmarks, removeBookmark, getBookmarksStorageKey } from '../utils/bookmarks';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

// Constants
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

  .aw-label {
    font-family: var(--aw-font-display);
    font-size: 10px;
    letter-spacing: 0.18em;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--aw-accent);
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

// Helper function to turn titles into clean URLs
const createSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const BookmarkCard: React.FC<{
  entry: BookmarkEntry;
  navigate: (path: string) => void;
  onRemove: (malId: number) => void;
}> = ({ entry, navigate, onRemove }) => (
  <div
    onClick={() => {
      const isManga = !entry.type || entry.type.toLowerCase() === 'manga' || entry.type.toLowerCase() === 'manhwa';
      navigate(isManga ? `/read/${createSlug(entry.title)}` : `/watch/${createSlug(entry.title)}`);
    }}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[16px] border p-3 transition-all duration-300 cursor-pointer"
    style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--aw-accent-dim)';
      e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(0, 0, 0, 0.5);';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--aw-border)';
      e.currentTarget.style.boxShadow = 'none';
      e.currentTarget.style.transform = 'none';
    }}
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[12px] ring-1 ring-white/10" style={{ background: 'var(--aw-card)' }}>
      {entry.cover ? (
        <img src={entry.cover} alt={entry.title} className="h-full w-full object-cover transition-transform duration-700 " />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>No Cover</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)', border: '1px solid var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}
            >
              {entry.type || 'Manga'}
            </span>
          </div>
          <h3 className="truncate pr-2 text-lg font-semibold leading-tight text-white transition-colors group-hover:text-white/90" style={{ fontFamily: 'var(--aw-font-display)' }}>
            {entry.title}
          </h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
            {[entry.originLabel, entry.year].filter(Boolean).join(' / ') || 'Saved locally'}
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevents the main card click from triggering
            onRemove(entry.malId);
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            if (typeof handleRippleMouseDown === 'function') handleRippleMouseDown(e as any);
          }}
          className="ripple-button relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] border transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
          style={{ background: 'var(--aw-card)', borderColor: 'var(--aw-border)', color: 'var(--aw-muted)' }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-auto rounded-[12px] p-2 sm:px-4 sm:py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)' }}>
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-[1.2fr_.8fr_1fr] sm:gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-1 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Status</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-semibold capitalize" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-body)' }}>
              {entry.status?.toLowerCase() || "Unknown"}
            </span>
          </div>

          <div className="min-w-0 border-r border-white/[0.05] px-1 sm:px-0 sm:pr-3">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Saved</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-semibold capitalize" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(entry.updatedAt))}
            </span>
          </div>

          <div className="min-w-0 pl-1 sm:pl-0">
            <span className="block truncate text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-white/75" style={{ fontFamily: 'var(--aw-font-display)' }}>Action</span>
            <span className="mt-1 block truncate text-xs sm:text-sm font-semibold capitalize" style={{ color: 'white', fontFamily: 'var(--aw-font-body)' }}>
              Saved
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);

  useEffect(() => {
    const syncBookmarks = async () => {
      // Determine if we are pulling manga or anime via the existing storage key mapping
      const isAnime = getBookmarksStorageKey() === 'mangavel:anime-bookmarks';

      if (isAnime && user) {
        const { data, error } = await supabase
          .from('anime_bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setBookmarks(data.map((d: any) => ({
            malId: parseInt(d.mal_id, 10),
            title: d.title,
            cover: d.cover,
            type: d.type,
            status: d.status,
            score: d.score,
            author: d.author,
            updatedAt: new Date(d.created_at).getTime()
          })));
          return;
        }
      }

      setBookmarks(readBookmarks());
    };

    syncBookmarks();
    window.addEventListener('storage', syncBookmarks);
    window.addEventListener('focus', syncBookmarks);

    return () => {
      window.removeEventListener('storage', syncBookmarks);
      window.removeEventListener('focus', syncBookmarks);
    };
  }, [user]);

  const handleRemove = useCallback(async (malId: number) => {
    const isAnime = getBookmarksStorageKey() === 'mangavel:anime-bookmarks';

    if (isAnime && user) {
      await supabase
        .from('anime_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('mal_id', String(malId));

      setBookmarks(prev => prev.filter(b => b.malId !== malId));
    } else {
      setBookmarks(removeBookmark(malId));
    }
  }, [user]);

  // Inject Design Styles inside Bookmarks exclusively if needed
  useEffect(() => {
    const id = 'aw-design-styles-bookmarks';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden text-white selection:bg-[var(--aw-accent-muted)]">
      <div style={{
        position: 'sticky', top: 0, zIndex: 60,
        borderBottom: '1px solid var(--aw-border)',
        background: 'rgba(7,7,13,0.85)',
        backdropFilter: 'blur(20px)',
      }}>
        <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      </div>

      <main className="mx-auto w-full max-w-[1460px] space-y-6 px-4 py-8">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="aw-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>Library</p>
            <h1 style={{
              fontFamily: 'var(--aw-font-display)',
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 800,
              textTransform: 'uppercase',
              color: 'var(--aw-text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0
            }}>
              Bookmarks
            </h1>
          </div>
          <div
            className="rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ border: '1px solid var(--aw-border)', background: 'var(--aw-s1)', color: 'var(--aw-accent)' }}
          >
            {bookmarks.length} saved
          </div>
        </section>

        {bookmarks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bookmarks.map((entry) => (
              <BookmarkCard key={entry.malId} entry={entry} navigate={navigate} onRemove={handleRemove} />
            ))}
          </div>
        ) : (
          <section
            className="flex min-h-[320px] items-center justify-center rounded-[16px] border px-6 py-12 text-center"
            style={{ background: 'var(--aw-s1)', borderColor: 'var(--aw-border)' }}
          >
            <div>
              <Bookmark size={32} style={{ color: 'var(--aw-muted)', margin: '0 auto' }} />
              <h3 className="mt-4 text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>No bookmarks yet</h3>
              <p className="mt-3 text-sm" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>Use the bookmark button on a manga page to save series locally.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BookmarksPage;