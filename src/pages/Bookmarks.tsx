import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, Star, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppTopbar from '../components/AppTopbar';
import { handleRippleMouseDown } from '../utils/ripple';
import { BookmarkEntry, readBookmarks, removeBookmark } from '../utils/bookmarks';

// --- Custom Font Stack ---
const APP_FONT = 'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';

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
    onClick={() => navigate(`/read/${createSlug(entry.title)}`)} // CHANGED HERE to use slug
    style={{ fontFamily: APP_FONT }}
    className="group relative flex h-48 gap-4 overflow-hidden rounded-[1.4rem] border border-white/[0.07] bg-[var(--app-surface-1)] p-3 transition-all duration-300 hover:border-[var(--app-accent-soft)] hover:bg-[var(--app-surface-2)] hover:shadow-[0_20px_55px_-30px_rgba(0,0,0,0.85)] cursor-pointer"
  >
    <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-[1.1rem] bg-[var(--app-surface-2)] ring-1 ring-white/[0.08]">
      {entry.cover ? (
        <img src={entry.cover} alt={entry.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">No Cover</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
    </div>

    <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="rounded-full border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
              {entry.type || 'Manga'}
            </span>
            {entry.score ? (
              <span className="flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold text-white/75">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {entry.score.toFixed(1)}
              </span>
            ) : null}
          </div>
          <h3 className="truncate pr-2 text-[1.08rem] font-bold leading-tight text-white">{entry.title}</h3>
          <p className="mt-1 truncate text-[12px] font-medium text-zinc-400">
            {[entry.author, entry.year].filter(Boolean).join(' / ') || 'Saved locally'}
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
          className="ripple-button relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-400 transition-colors hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-auto rounded-[1.15rem] bg-[var(--app-card)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="grid grid-cols-[1.2fr_.8fr_1fr] gap-3">
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Status</span>
            <span className="mt-2 block text-[11px] font-bold uppercase tracking-[0.1em] text-white">{entry.status || 'Unknown'}</span>
          </div>
          <div className="min-w-0 border-r border-white/[0.05] pr-3">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Saved</span>
            <span className="mt-2 block text-sm font-bold text-white">
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(entry.updatedAt))}
            </span>
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Action</span>
            <span className="mt-2 block truncate text-sm font-bold uppercase text-[var(--app-accent)]">
              Open
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const BookmarksPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);

  useEffect(() => {
    const syncBookmarks = () => setBookmarks(readBookmarks());

    syncBookmarks();
    window.addEventListener('storage', syncBookmarks);
    window.addEventListener('focus', syncBookmarks);

    return () => {
      window.removeEventListener('storage', syncBookmarks);
      window.removeEventListener('focus', syncBookmarks);
    };
  }, []);

  const handleRemove = useCallback((malId: number) => {
    setBookmarks(removeBookmark(malId));
  }, []);

  return (
    <div style={{ fontFamily: APP_FONT }} className="min-h-screen bg-[var(--app-bg)] text-white selection:bg-[var(--app-accent-muted)]">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <main className="mx-auto w-full max-w-[1420px] space-y-6 px-4 py-8">
        <section className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">Library</p>
            <h1 className="mt-2 text-4xl font-bold uppercase tracking-tight text-white">Bookmarks</h1>
          </div>
          <div className="rounded-full border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--app-accent)]">
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
          <section className="flex min-h-[320px] items-center justify-center rounded-[1.7rem] border border-white/[0.06] bg-[var(--app-surface-1)] px-6 py-12 text-center">
            <div>
              <Bookmark size={32} className="mx-auto text-zinc-600" />
              <h3 className="mt-4 text-2xl font-bold uppercase tracking-tight text-white">No bookmarks yet</h3>
              <p className="mt-3 text-sm text-zinc-400">Use the bookmark button on a manga page to save series locally.</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default BookmarksPage;