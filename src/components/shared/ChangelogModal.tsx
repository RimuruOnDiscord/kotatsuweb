import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Tag, Loader2, AlertCircle, ExternalLink, 
  Rocket, Box, Plus, RefreshCw, Wrench, Trash2, Shield, AlertTriangle,
  Check, Minus, ArrowRight,
  // ─── Semantic Icons for specific changelog actions ───
  LayoutList, Sparkles, ShieldCheck, Image as ImageIcon, 
  Zap, Database, Settings, Globe, Bug, Terminal, FileText
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ─── Config ───────────────────────────────────────────────────────────────────
const CHANGELOG_URL = 'https://raw.githubusercontent.com/RimuruOnDiscord/kotatsuweb/refs/heads/main/CHANGELOG.md';

const APP_FONT    = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryKey = 'Added' | 'Changed' | 'Fixed' | 'Removed' | 'Security' | 'Deprecated';

interface ChangeEntry {
  category: CategoryKey;
  items: string[];
}

interface Version {
  version: string;
  date: string;
  isLatest: boolean;
  entries: ChangeEntry[];
}

// ─── Category styling & Icons ─────────────────────────────────────────────────
const CATEGORY_META: Record<CategoryKey, { color: string; bg: string; border: string; icon: React.ElementType; fallbackItemIcon: React.ElementType }> = {
  Added:      { color: '#4ade80', bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)',  icon: Plus,           fallbackItemIcon: Plus },
  Changed:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  icon: RefreshCw,      fallbackItemIcon: ArrowRight },
  Fixed:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  icon: Wrench,         fallbackItemIcon: Check },
  Removed:    { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', icon: Trash2,         fallbackItemIcon: Minus },
  Security:   { color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)', icon: Shield,         fallbackItemIcon: ShieldCheck },
  Deprecated: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  border: 'rgba(251,146,60,0.2)',  icon: AlertTriangle,  fallbackItemIcon: AlertTriangle },
};

// ─── Semantic Content Icon Mapper ─────────────────────────────────────────────
// Scans the individual bullet points to assign a relevant contextual icon
function getIconForItem(text: string, fallbackIcon: React.ElementType): React.ElementType {
  const t = text.toLowerCase();

  if (t.includes('security') || t.includes('auth') || t.includes('password')) return ShieldCheck;
  if (t.includes('animat') || t.includes('transition') || t.includes('spring')) return Sparkles;
  if (t.includes('image') || t.includes('preview') || t.includes('media') || t.includes('avatar')) return ImageIcon;
  if (t.includes('ui') || t.includes('design') || t.includes('layout') || t.includes('theme') || t.includes('sidebar') || t.includes('color')) return LayoutList;
  if (t.includes('performance') || t.includes('speed') || t.includes('optimiz') || t.includes('snap')) return Zap;
  if (t.includes('api') || t.includes('database') || t.includes('server')) return Database;
  if (t.includes('setting') || t.includes('config')) return Settings;
  if (t.includes('language') || t.includes('translat')) return Globe;
  if (t.includes('bug') || t.includes('crash') || t.includes('error') || t.includes('flicker') || t.includes('fix')) return Bug;
  if (t.includes('refactor') || t.includes('script') || t.includes('code') || t.includes('modal')) return Terminal;
  if (t.includes('changelog') || t.includes('document') || t.includes('readme')) return FileText;

  return fallbackIcon;
}

// ─── Markdown parser ──────────────────────────────────────────────────────────
function parseChangelog(md: string): Version[] {
  const versions: Version[] = [];
  const lines = md.split('\n');

  let current: Version | null = null;
  let currentEntries: ChangeEntry[] = [];
  let currentCategory: CategoryKey | null = null;
  let currentItems: string[] = [];

  const pushCategory = () => {
    if (currentCategory && currentItems.length > 0) {
      currentEntries.push({ category: currentCategory, items: [...currentItems] });
    }
    currentItems = [];
    currentCategory = null;
  };

  const pushVersion = () => {
    if (current) {
      pushCategory();
      versions.push({ ...current, entries: [...currentEntries] });
    }
    currentEntries = [];
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim();

    const vMatch = line.match(/^##\s+\[([^\]]+)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/);
    if (vMatch) {
      pushVersion();
      const ver = vMatch[1];
      const date = vMatch[2] || '';
      if (ver.toLowerCase() === 'unreleased') continue;
      current = { version: ver, date, isLatest: false, entries: [] };
      continue;
    }

    if (!current) continue;

    const catMatch = line.match(/^###\s+(.+)/);
    if (catMatch) {
      pushCategory();
      const cat = catMatch[1].trim() as CategoryKey;
      if (CATEGORY_META[cat]) currentCategory = cat;
      continue;
    }

    if (line.startsWith('- ') && currentCategory) {
      currentItems.push(line.slice(2).trim());
    }
  }
  pushVersion();

  if (versions.length > 0) versions[0].isLatest = true;
  return versions;
}

// ─── Animation variants ───────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.04 } },
  exit:   { opacity: 0, transition: { duration: 0.15 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    variants={fadeUpItem}
    className={`rounded-[16px] ${className}`}
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}
  >
    {children}
  </motion.div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
interface ChangelogModalProps {
  open: boolean;
  onClose: () => void;
  changelogUrl?: string;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({
  open,
  onClose,
  changelogUrl = CHANGELOG_URL,
}) => {
  const [versions, setVersions]       = useState<Version[]>([]);
  const [activeVersion, setActive]    = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const contentRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    fetch(changelogUrl)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: Could not fetch changelog.`);
        return r.text();
      })
      .then(text => {
        const parsed = parseChangelog(text);
        setVersions(parsed);
        setActive(parsed[0]?.version ?? null);
      })
      .catch(err => setError(err.message ?? 'Failed to load changelog.'))
      .finally(() => setLoading(false));
  }, [open, changelogUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeVersion]);

  const selected = versions.find(v => v.version === activeVersion) ?? null;

  const modalStyles = {
    fontFamily: APP_FONT,
    background: 'var(--app-bg, #09090b)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
    // NOTE: Removed the forced --app-accent overrides here so it inherits global theme!
  } as React.CSSProperties;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative flex w-full max-w-[750px] h-[80vh] max-h-[720px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={modalStyles}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Sidebar ── */}
              <aside
                className="flex flex-col w-[210px] flex-shrink-0 py-6"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="px-6 mb-6">
                  <div className="flex items-center gap-2.5 mb-1">
                    <Tag size={15} strokeWidth={2.5} style={{ color: 'var(--app-accent)', flexShrink: 0 }} />
                    <h2 className="text-[19px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      Changelog
                    </h2>
                  </div>
                  <p className="text-[11.5px] text-zinc-400 font-medium">Release history</p>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 px-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                  {loading && (
                    <div className="flex items-center gap-2.5 px-3 py-3 text-zinc-500">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[12.5px]">Loading…</span>
                    </div>
                  )}
                  {!loading && versions.map(v => {
                    const active = activeVersion === v.version;
                    return (
                      <motion.button
                        key={v.version}
                        onClick={() => setActive(v.version)}
                        initial={false}
                        animate={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0)',
                          color: active ? '#ffffff' : 'rgb(161, 161, 170)'
                        }}
                        whileHover={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0.06)',
                          color: '#ffffff'
                        }}
                        transition={{ duration: 0.2 }}
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-left w-full transition-all border-none outline-none"
                      >
                        <motion.div 
                          animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : '' }}
                          className="flex-shrink-0"
                        >
                          {v.isLatest ? <Rocket size={16} strokeWidth={active ? 2.5 : 2} /> : <Box size={16} strokeWidth={active ? 2.5 : 2} />}
                        </motion.div>

                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold leading-none truncate">v{v.version}</span>
                            {v.isLatest && (
                              <span
                                className="text-[9px] font-black tracking-[0.1em] uppercase px-1.5 py-0.5 rounded-[5px] leading-none flex-shrink-0"
                                style={{ backgroundColor: 'var(--app-accent-muted)', color: 'var(--app-accent)' }}
                              >
                                NEW
                              </span>
                            )}
                          </div>
                          {v.date && (
                            <span className="text-[11px] opacity-70 mt-1.5 font-medium leading-none">{v.date}</span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="px-3 pt-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <a
                    href={changelogUrl.replace('raw.githubusercontent.com', 'github.com').replace('/raw/', '/blob/')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-white hover:bg-white/[0.06]"
                  >
                    <ExternalLink size={14} strokeWidth={2} />
                    View on GitHub
                  </a>
                </div>
              </aside>

              {/* ── Content ── */}
              <div className="flex flex-col flex-1 min-w-0 bg-white/[0.01]">
                <div
                  className="flex items-center justify-between px-8 py-6 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <AnimatePresence mode="wait">
                    {selected ? (
                      <motion.div
                        key={selected.version}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <h3 className="text-[17px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                          Version {selected.version}
                        </h3>
                        <p className="text-[12.5px] text-zinc-400 mt-1">
                          {selected.date ? `Released ${selected.date}` : 'Release date unknown'}
                          {selected.isLatest && (
                            <span className="ml-2 font-bold" style={{ color: 'var(--app-accent)' }}>· Latest release</span>
                          )}
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h3 className="text-[17px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                          Changelog
                        </h3>
                        <p className="text-[12.5px] text-zinc-400 mt-1">What's new in each release</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                <main
                  ref={contentRef}
                  className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-8"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  <AnimatePresence mode="wait">

                    {loading && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-48 gap-3"
                      >
                        <Loader2 size={22} className="animate-spin text-zinc-500" />
                        <p className="text-[13px] text-zinc-500 font-medium">Fetching changelog…</p>
                      </motion.div>
                    )}

                    {!loading && error && (
                      <motion.div
                        key="error"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-4"
                      >
                        <SectionCard>
                          <div className="flex items-start gap-4 p-5">
                            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[13px] font-bold text-red-400 mb-1">Failed to load changelog</p>
                              <p className="text-[12.5px] text-zinc-400 leading-relaxed">{error}</p>
                            </div>
                          </div>
                        </SectionCard>
                      </motion.div>
                    )}

                    {!loading && !error && selected && (
                      <motion.div
                        key={selected.version}
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        {selected.entries.length === 0 && (
                          <motion.p variants={fadeUpItem} className="text-[13px] text-zinc-500 italic">
                            No changes documented for this release.
                          </motion.p>
                        )}

                        {selected.entries.map(entry => {
                          const meta = CATEGORY_META[entry.category] ?? CATEGORY_META.Added;
                          const CatIcon = meta.icon;

                          return (
                            <motion.div key={entry.category} variants={fadeUpItem} className="flex flex-col gap-3">
                              
                              <div className="flex items-center gap-3">
                                <span
                                  className="flex items-center gap-1.5 text-[10.5px] font-black tracking-[0.12em] uppercase px-2.5 py-1.5 rounded-[8px]"
                                  style={{ color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}
                                >
                                  <CatIcon size={12} strokeWidth={3} />
                                  {entry.category}
                                </span>
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                              </div>

                              <SectionCard>
                                {entry.items.map((item, i) => {
                                  // --- Dynamically fetches the semantic icon based on item content ---
                                  const DynamicIcon = getIconForItem(item, meta.fallbackItemIcon); 
                                  
                                  return (
                                    <div
                                      key={i}
                                      className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.025] transition-colors duration-150 first:rounded-t-[16px] last:rounded-b-[16px]"
                                      style={i < entry.items.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    >
                                      {/* Specific icon injection happens right here */}
                                      <DynamicIcon
                                        size={14}
                                        strokeWidth={2.5}
                                        className="flex-shrink-0 mt-[2px]"
                                        style={{ color: meta.color, filter: `drop-shadow(0 0 6px ${meta.color}60)` }}
                                      />
                                      <span className="text-[13px] text-zinc-200 leading-relaxed">{item}</span>
                                    </div>
                                  );
                                })}
                              </SectionCard>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    )}

                    {!loading && !error && versions.length === 0 && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center h-48 gap-2 text-center"
                      >
                        <Tag size={24} className="text-zinc-600 mb-1" strokeWidth={1.5} />
                        <p className="text-[13.5px] text-zinc-400 font-medium">No releases found</p>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </main>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ChangelogModal;