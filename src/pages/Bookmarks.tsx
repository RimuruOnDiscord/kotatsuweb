import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Bookmark, Trash2, Search, GripVertical, CheckSquare, ChevronUp, PlayCircle, CheckCircle2, PauseCircle, XCircle, Library } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BookmarkEntry, readBookmarks, removeBookmark } from '../utils/bookmarks';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────
// AGGRESSIVE ANIMATIONS & PREMIUM DESIGN
// ─────────────────────────────────────────
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-accent:      var(--app-accent);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { 
    font-family: var(--aw-font-body); 
    background: transparent; 
    color: var(--aw-text); 
  }

  .aw-layout {
    max-width: 1460px;
    margin: 0 auto;
    width: 100%;
    padding: 40px 24px;
    position: relative;
    z-index: 10;
  }

  /* Status Colors */
  .status-watching { color: #34d399; }
  .status-completed { color: #a78bfa; }
  .status-on_hold { color: #fbbf24; }
  .status-dropped { color: #f87171; }
  .status-uncategorized { color: var(--aw-accent); }

  /* Premium Segmented Tabs (Drop Targets) */
  .aw-tabs-container {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.02);
    padding: 8px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(20px);
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    transition: all 0.3s ease;
  }
  .aw-tabs-container::-webkit-scrollbar { display: none; }
  
  .aw-tab-btn {
    white-space: nowrap;
    padding: 12px 28px;
    border-radius: 14px;
    font-family: var(--aw-font-body);
    font-size: 14px;
    font-weight: 700;
    color: var(--aw-muted);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
    position: relative;
    border: 1px solid transparent;
  }
  .aw-tab-btn:hover { color: white; transform: translateY(-2px); }
  .aw-tab-btn.active {
    background: rgba(255, 255, 255, 0.08);
    color: white;
    border-color: rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 25px -5px rgba(0,0,0,0.4);
  }
  .aw-tab-btn.drag-over {
    background: color-mix(in srgb, var(--aw-accent), transparent 70%);
    color: #000;
    border-color: var(--aw-accent);
    transform: scale(1.1) translateY(-4px);
    box-shadow: 0 10px 30px -5px var(--aw-accent-glow);
  }

  /* Card Physics & Animations */
  @keyframes extremePopIn {
    0% { opacity: 0; transform: scale(0.85) translateY(40px) rotateX(10deg); }
    100% { opacity: 1; transform: scale(1) translateY(0) rotateX(0deg); }
  }

  .aw-card {
    animation: extremePopIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    will-change: transform, box-shadow, border-color;
    -webkit-touch-callout: none; /* Prevents mobile context menu */
  }
  
  /* Hover State */
  .aw-card:not(.selected):not(.pressing):hover {
    transform: translateY(-6px) scale(1.02);
    border-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
    background: color-mix(in srgb, var(--aw-accent), transparent 92%);
  }

  /* Pressing (Squish) State */
  .aw-card.pressing {
    transform: scale(0.94);
    filter: brightness(0.8);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Selected State */
  .aw-card.selected {
    border-color: var(--aw-accent);
    background: color-mix(in srgb, var(--aw-accent), transparent 90%);
    transform: scale(0.97);
    box-shadow: 0 0 0 2px rgba(0,0,0,0.4), 0 15px 35px -10px rgba(0,0,0,0.4);
  }
  
  /* Selection Overlay Checkmark */
  @keyframes checkBounce {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.3); }
    100% { transform: scale(1); opacity: 1; }
  }
  .aw-select-check {
    opacity: 0;
    transform: scale(0);
  }
  .aw-card.selected .aw-select-check {
    animation: checkBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  /* Premium Floating Action Bar */
  .aw-action-bar {
    position: fixed;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%) translateY(200%);
    background: rgba(10, 10, 14, 0.9);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 12px 24px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    gap: 20px;
    z-index: 100;
    box-shadow: 0 30px 60px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05) inset;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .aw-action-bar.visible {
    transform: translateX(-50%) translateY(0);
  }

  /* Custom Dropdown Menu */
  .aw-dropdown-menu {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%) scale(0.9);
    opacity: 0;
    pointer-events: none;
    background: rgba(15, 15, 20, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 180px;
    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.8);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 101;
  }
  .aw-dropdown-menu.open {
    transform: translateX(-50%) scale(1);
    opacity: 1;
    pointer-events: auto;
  }
  .aw-dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    color: white;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    border: none;
    width: 100%;
    text-align: left;
  }
  .aw-dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateX(4px);
  }

  /* Background Glow Orbs */
  .aw-glow-bg {
    position: fixed;
    top: -20%;
    right: -10%;
    width: 60vw;
    height: 60vw;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--aw-accent), transparent 95%) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }
`;

// Helper Functions
const getNormalizedStatus = (status?: string) => {
  const s = (status || '').toLowerCase();
  if (['watching', 'completed', 'on_hold', 'dropped'].includes(s)) return s;
  return 'uncategorized'; // Default state
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'watching': return 'Watching';
    case 'completed': return 'Completed';
    case 'on_hold': return 'On Hold';
    case 'dropped': return 'Dropped';
    default: return 'To Watch';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'watching': return 'status-watching';
    case 'completed': return 'status-completed';
    case 'on_hold': return 'status-on_hold';
    case 'dropped': return 'status-dropped';
    default: return 'status-uncategorized';
  }
};

const createSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const TABS = [
  { id: 'uncategorized', label: 'To Watch' },
  { id: 'watching', label: 'Watching' },
  { id: 'completed', label: 'Completed' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'dropped', label: 'Dropped' },
];

// ─────────────────────────────────────────
// FULLY ANIMATED OLD CARD COMPONENT
// ─────────────────────────────────────────
const BookmarkListCard: React.FC<{
  entry: BookmarkEntry;
  navigate: (path: string) => void;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: number) => void;
  onLongPress: (id: number) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  index: number;
}> = ({ entry, navigate, isSelected, selectionMode, onToggleSelect, onLongPress, onDragStart, index }) => {
  const isManga = !entry.type || entry.type.toLowerCase() === 'manga' || entry.type.toLowerCase() === 'manhwa';
  const currentStatus = getNormalizedStatus(entry.status);

  const [isPressing, setIsPressing] = useState(false);
  const holdTimeout = useRef<NodeJS.Timeout | null>(null);
  const wasLongPressed = useRef(false);

  // 150ms Hyper-fast Long Press
  const startHold = (e: React.PointerEvent) => {
    if (e.button === 2) return; // Ignore right clicks
    if (selectionMode) return;

    wasLongPressed.current = false;
    setIsPressing(true);

    holdTimeout.current = setTimeout(() => {
      wasLongPressed.current = true; // Mark as successfully long pressed
      onLongPress(entry.malId);
      setIsPressing(false);

      // Haptic feedback if on mobile
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 150);
  };

  const cancelHold = () => {
    setIsPressing(false);
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If we just entered selection mode via long press, ignore the mouseup/click entirely
    if (wasLongPressed.current) {
      wasLongPressed.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (selectionMode) {
      e.preventDefault();
      onToggleSelect(entry.malId);
    } else {
      navigate(isManga ? `/read/${createSlug(entry.title)}` : `/watch/${createSlug(entry.title)}`);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => { setIsPressing(false); onDragStart(e, entry.malId); }}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold} // Fixes scrolling canceling the hold state improperly
      onClick={handleClick}
      onContextMenu={(e) => { if (selectionMode || isPressing) e.preventDefault(); }}
      style={{ animationDelay: `${index * 0.04}s` }}
      className={`aw-card group relative flex h-[180px] gap-5 overflow-hidden rounded-[20px] border border-white/5 bg-[color-mix(in_srgb,var(--aw-accent),transparent_97%)] p-3 cursor-pointer select-none ${isSelected ? 'selected' : ''} ${isPressing ? 'pressing' : ''}`}
    >
      {/* Checkmark */}
      <div className="aw-select-check absolute top-4 left-4 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--aw-accent)] text-[#04110d] shadow-lg">
        <CheckSquare size={16} strokeWidth={3} />
      </div>

      {/* Drag Handle */}
      {!selectionMode && (
        <div className="absolute top-1/2 left-2 z-20 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hidden md:flex text-white/40 hover:text-white cursor-grab active:cursor-grabbing">
          <GripVertical size={24} />
        </div>
      )}

      {/* Poster */}
      <div className="relative w-32 flex-shrink-0 overflow-hidden rounded-xl bg-white/[0.02]">
        {entry.cover ? (
          <img src={entry.cover} alt={entry.title} className="h-full w-full object-cover transition-transform duration-700 pointer-events-none" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-zinc-600 pointer-events-none">No Cover</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative flex min-w-0 flex-1 flex-col py-1 pr-2 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[var(--aw-accent)] border border-white/5 shadow-sm" style={{ fontFamily: 'var(--aw-font-display)' }}>
                {entry.type || 'Anime'}
              </span>
            </div>
            <h3 className="truncate text-xl font-bold leading-tight text-white/95 group-hover:text-white transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
              {entry.title}
            </h3>
            <p className="mt-1 flex items-center gap-2 text-[13px] font-medium text-zinc-400" style={{ fontFamily: 'var(--aw-font-body)' }}>
              <span>{entry.year || 'Saved Locally'}</span>
              {entry.author && <><span className="h-1 w-1 rounded-full bg-zinc-700" /><span className="truncate">{entry.author}</span></>}
            </p>
          </div>
        </div>

        {/* Info Block */}
        <div className="mt-auto flex items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-4 py-3 border border-white/5 backdrop-blur-md">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>Status</span>
            <span className={`truncate text-[13px] font-bold capitalize ${getStatusColor(currentStatus)}`} style={{ fontFamily: 'var(--aw-font-body)' }}>
              {getStatusLabel(currentStatus)}
            </span>
          </div>

          <div className="h-6 w-[1px] shrink-0 bg-white/10" />

          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-zinc-500" style={{ fontFamily: 'var(--aw-font-display)' }}>Saved</span>
            <span className="truncate text-[13px] font-bold text-white/90 capitalize" style={{ fontFamily: 'var(--aw-font-body)' }}>
              {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(entry.updatedAt))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────
const BookmarksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [activeTab, setActiveTab] = useState('uncategorized');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dragOverTab, setDragOverTab] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectionMode = selectedIds.length > 0;

  useEffect(() => {
    const reloadKey = 'mv_reload_bookmarks';
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true');
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const syncBookmarks = async () => {
      if (user) {
        try {
          const localBookmarks = readBookmarks();
          const localAnimeBookmarks = localBookmarks.filter(b => !b.type || b.type.toLowerCase().includes('anime') || b.type.toLowerCase() === 'tv' || b.type.toLowerCase() === 'movie');

          if (localAnimeBookmarks.length > 0) {
            const migrationPayload = localAnimeBookmarks.map(b => ({
              user_id: user.id, mal_id: String(b.malId), title: b.title, cover: b.cover, type: b.type || 'Anime', status: getNormalizedStatus(b.status), score: b.score, author: b.author, created_at: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString()
            }));
            const { error: upsertError } = await supabase.from('anime_bookmarks').upsert(migrationPayload, { onConflict: 'user_id, mal_id' });
            if (!upsertError) localAnimeBookmarks.forEach(b => removeBookmark(b.malId));
          }
        } catch (e) { console.warn("Migration error:", e); }

        const { data, error } = await supabase.from('anime_bookmarks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (!error && data) {
          setBookmarks(data.map((d: any) => ({
            malId: parseInt(d.mal_id, 10), title: d.title, cover: d.cover, type: d.type, status: d.status, score: d.score, author: d.author, updatedAt: new Date(d.created_at).getTime()
          })));
          return;
        }
      }

      setBookmarks(readBookmarks().filter(b => !b.type || b.type.toLowerCase().includes('anime') || b.type.toLowerCase() === 'tv' || b.type.toLowerCase() === 'movie'));
    };
    syncBookmarks();
  }, [user]);

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setBookmarks(prev => prev.map(b => selectedIds.includes(b.malId) ? { ...b, status: newStatus } : b));

    if (user) {
      await supabase.from('anime_bookmarks').update({ status: newStatus }).in('mal_id', selectedIds.map(String)).eq('user_id', user.id);
    } else {
      const updatedLocal = readBookmarks().map(b => selectedIds.includes(b.malId) ? { ...b, status: newStatus } : b);
      localStorage.setItem('mv_bookmarks', JSON.stringify(updatedLocal));
    }
    setSelectedIds([]);
    setDropdownOpen(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBookmarks(prev => prev.filter(b => !selectedIds.includes(b.malId)));

    if (user) {
      await supabase.from('anime_bookmarks').delete().in('mal_id', selectedIds.map(String)).eq('user_id', user.id);
    } else {
      selectedIds.forEach(id => removeBookmark(id));
    }
    setSelectedIds([]);
  };

  // Safe Functional Updates for Selection
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handleLongPress = useCallback((id: number) => {
    // Bulletproof functional state update: never wipe the array, only add to it if missing
    setSelectedIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, id: number) => {
    let idsToMove = selectedIds;

    // THE FIX: If the user accidentally drags an unselected card while in selection mode, 
    // ADD it to the array instead of replacing the entire array!
    if (!selectedIds.includes(id)) {
      idsToMove = selectedIds.length > 0 ? [...selectedIds, id] : [id];
      setSelectedIds(idsToMove);
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToMove));

    const ghost = document.createElement('div');
    ghost.style.width = '1px'; ghost.style.height = '1px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDrop = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    setDragOverTab(null);
    try {
      const ids = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (Array.isArray(ids) && ids.length > 0) {
        setSelectedIds(ids);
        handleBulkStatusChange(tabId);
      }
    } catch (err) { }
  };

  // Filtering
  const displayedBookmarks = useMemo(() => {
    let result = [...bookmarks].filter(b => getNormalizedStatus(b.status) === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.title.toLowerCase().includes(q));
    }
    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }, [bookmarks, activeTab, searchQuery]);

  useEffect(() => {
    const id = 'aw-design-styles-bookmarks';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <div className="aw-root aw-noise relative min-h-screen overflow-x-hidden selection:bg-[var(--aw-accent-muted)]">
      <div className="aw-glow-bg" />

      {/* CUSTOM FLOATING ACTION BAR */}
      <div className={`aw-action-bar ${selectionMode ? 'visible' : ''}`}>
        <span className="text-[14px] font-bold tracking-widest text-[var(--aw-accent)] uppercase" style={{ fontFamily: 'var(--aw-font-display)' }}>
          {selectedIds.length} Selected
        </span>

        <div className="h-8 w-[1px] bg-white/10" />

        {/* Custom Premium Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-white/10 hover:border-white/20"
          >
            Move To <ChevronUp size={16} className={`transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className={`aw-dropdown-menu ${dropdownOpen ? 'open' : ''}`}>
            <button onClick={() => handleBulkStatusChange('watching')} className="aw-dropdown-item"><PlayCircle size={16} className="text-emerald-400" /> Watching</button>
            <button onClick={() => handleBulkStatusChange('completed')} className="aw-dropdown-item"><CheckCircle2 size={16} className="text-purple-400" /> Completed</button>
            <button onClick={() => handleBulkStatusChange('on_hold')} className="aw-dropdown-item"><PauseCircle size={16} className="text-amber-400" /> On Hold</button>
            <button onClick={() => handleBulkStatusChange('dropped')} className="aw-dropdown-item"><XCircle size={16} className="text-red-400" /> Dropped</button>
            <div className="my-1 h-[1px] w-full bg-white/10" />
            <button onClick={() => handleBulkStatusChange('uncategorized')} className="aw-dropdown-item"><Library size={16} className="text-[var(--aw-accent)]" /> To Watch</button>
          </div>
        </div>

        <button onClick={handleBulkDelete} className="flex items-center justify-center h-10 w-10 rounded-full bg-red-500/20 text-red-400 transition-all hover:bg-red-500 hover:text-white" title="Delete Selected">
          <Trash2 size={18} />
        </button>
        <button onClick={() => { setSelectedIds([]); setDropdownOpen(false); }} className="rounded-full bg-white/10 px-5 py-2.5 text-[14px] font-bold text-white transition-all hover:bg-white/20">
          Cancel
        </button>
      </div>

      <div className="aw-layout">
        <main className="w-full flex flex-col gap-8">
          <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(42px, 5vw, 56px)', fontWeight: 700, color: 'var(--aw-text)', letterSpacing: '-0.04em', lineHeight: 1, margin: 0 }}>
                Bookmarks
              </h1>
              <p className="mt-4 text-[16px] text-zinc-400 font-medium">
                <span className="text-[var(--aw-accent)] font-bold">Hold a card</span> to fast-select. Drag cards to tabs to organize.
              </p>
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input type="text" placeholder="Search series..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-4 pl-12 pr-4 text-[15px] font-medium text-white placeholder-zinc-500 outline-none transition-all focus:border-[var(--aw-accent)] focus:bg-white/[0.08] focus:shadow-[0_0_20px_rgba(var(--app-accent-rgb),0.2)]" />
            </div>
          </section>

          <div className="aw-tabs-container">
            {TABS.map(tab => {
              const count = bookmarks.filter(b => getNormalizedStatus(b.status) === tab.id).length;
              const isDragOver = dragOverTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onDragOver={(e) => { e.preventDefault(); if (tab.id !== activeTab) setDragOverTab(tab.id); }}
                  onDragLeave={() => setDragOverTab(null)}
                  onDrop={(e) => handleDrop(e, tab.id)}
                  className={`aw-tab-btn flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
                >
                  {tab.label}
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-extrabold">{count}</span>
                </button>
              );
            })}
          </div>

          {displayedBookmarks.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 pb-40">
              {displayedBookmarks.map((entry, index) => (
                <BookmarkListCard
                  key={entry.malId}
                  entry={entry}
                  navigate={navigate}
                  index={index}
                  isSelected={selectedIds.includes(entry.malId)}
                  selectionMode={selectionMode}
                  onToggleSelect={toggleSelect}
                  onLongPress={handleLongPress}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          ) : (
            <section className="flex min-h-[400px] flex-col items-center justify-center rounded-[32px] border border-white/5 bg-white/[0.02] px-6 text-center backdrop-blur-xl">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/[0.05] mb-6">
                <Bookmark size={32} className="text-zinc-500" />
              </div>
              <h3 className="text-2xl font-bold text-white/90" style={{ fontFamily: 'var(--aw-font-display)' }}>
                {bookmarks.length > 0 ? 'No series found in this tab' : 'Your library is empty'}
              </h3>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default BookmarksPage;