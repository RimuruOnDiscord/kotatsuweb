import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette, X, User, Loader2, LogOut,
  Play, Radio, Subtitles, Eye, ChevronDown, Check
} from 'lucide-react';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme } from '../../utils/theme';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',    label: 'Profile',    icon: User,      desc: 'Avatar & display name' },
  { id: 'appearance', label: 'Appearance', icon: Palette,   desc: 'Theme & accent color' },
  { id: 'player',     label: 'Player',     icon: Play,      desc: 'Playback behaviour' },
  { id: 'streaming',  label: 'Streaming',  icon: Radio,     desc: 'Source & quality' },
  { id: 'subtitles',  label: 'Subtitles',  icon: Subtitles, desc: 'Display & language' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── ThemePicker ─────────────────────────────────────────────────────────────
const ThemePicker: React.FC<{
  theme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
}> = ({ theme, onThemeChange }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {THEME_OPTIONS.map((option) => {
      const active = theme === option.key;
      return (
        <motion.button
          key={option.key}
          onClick={() => onThemeChange(option.key)}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="relative rounded-[14px] p-2"
          style={{
            background: active ? `${option.color}14` : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? `${option.color}55` : 'rgba(255,255,255,0.05)'}`,
            boxShadow: active ? `0 0 18px ${option.color}22` : 'none',
          }}
        >
          <div
            className="aspect-[16/10] w-full rounded-[10px] overflow-hidden flex relative"
            style={{ background: 'var(--app-bg)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ backgroundColor: option.color, width: '30%' }} className="h-full opacity-80" />
            <div className="flex-1 p-2.5 flex flex-col justify-end gap-1.5">
              <div className="h-[3px] w-full rounded-full bg-white/20" />
              <div className="h-[3px] w-2/3 rounded-full bg-white/10" />
            </div>
            {active && (
              <div
                className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: option.color }}
              >
                <Check size={9} strokeWidth={3} className="text-black" />
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-[12px] font-medium" style={{ color: active ? option.color : 'rgb(113,113,122)' }}>
            {option.label}
          </p>
        </motion.button>
      );
    })}
  </div>
);

// ─── UI Primitives ────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-[14px] overflow-hidden ${className}`}
    style={{ background: 'var(--app-card)', border: '1px solid var(--app-border)' }}
  >
    {children}
  </div>
);

const SettingRow: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
  last?: boolean;
}> = ({ title, description, children, last }) => (
  <motion.div
    whileHover={{ backgroundColor: 'rgba(255,255,255,0.025)' }}
    transition={{ duration: 0.15 }}
    className="flex items-center justify-between px-4 py-3.5 cursor-default"
    style={!last ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
  >
    <div className="flex flex-col pr-6">
      <span className="text-[13.5px] text-white/90 font-medium">{title}</span>
      {description && <span className="text-[11.5px] text-zinc-500 mt-0.5 leading-relaxed">{description}</span>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </motion.div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-zinc-500 mb-2.5 px-0.5">
    {children}
  </p>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <motion.button
    onClick={onChange}
    whileHover={{ scale: 1.07 }}
    whileTap={{ scale: 0.93 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    className="relative inline-flex h-[22px] w-10 items-center rounded-full focus:outline-none"
    style={{ background: checked ? 'var(--app-accent)' : 'rgba(255,255,255,0.1)' }}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className="inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm"
      style={{ marginLeft: checked ? 20 : 3 }}
    />
  </motion.button>
);

const Select: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({
  value, options, onChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative min-w-[155px]" ref={containerRef}>
      <motion.button
        onClick={() => setIsOpen(o => !o)}
        whileHover={!isOpen ? { backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.18)' } : {}}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-between gap-2 text-[12.5px] font-medium px-3 py-2 rounded-[9px] outline-none"
        style={{
          background: isOpen ? 'var(--app-accent-muted)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isOpen ? 'var(--app-accent-soft)' : 'rgba(255,255,255,0.08)'}`,
          color: isOpen ? 'var(--app-accent)' : 'rgba(255,255,255,0.8)',
          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
        }}
      >
        <span className="truncate pr-1">{value}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
          <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.13, ease: 'easeOut' }}
            className="absolute right-0 z-50 w-max min-w-full mt-1.5 py-1 rounded-[11px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            style={{ background: 'var(--app-surface-2)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {options.map((opt, i) => {
              const sel = value === opt;
              return (
                <motion.button
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.12 }}
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', x: 2 }}
                  className="w-full text-left px-3.5 py-2 text-[12.5px] flex items-center gap-2.5"
                  style={{ color: sel ? 'white' : 'rgba(255,255,255,0.55)' }}
                >
                  <motion.span
                    className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                    animate={{ background: sel ? 'var(--app-accent)' : 'rgba(255,255,255,0.15)', scale: sel ? 1 : 0.6 }}
                  />
                  <span>{opt}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(getStoredTheme());

  const [displayName, setDisplayName] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [mockSettings, setMockSettings] = useState({
    autoplay: true,
    autoNext: true,
    volume: '100%',
    preferredSource: 'kiwi (External)',
    audioLang: 'Subbed (Japanese audio)',
    quality: 'Auto (FHD)',
    showSubs: true,
    subPosition: 'Bottom',
    subSize: '100%',
    subBgOpacity: '70%',
    subBgColor: '#000000',
    skipOp: true,
    skipEd: true,
    showSpoilers: true,
    listFormat: 'Grid',
  });

  const updateSetting = (key: keyof typeof mockSettings, val: any) =>
    setMockSettings(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (profile) { setDisplayName(profile.display_name || ''); setAvatarUrlInput(profile.avatar_url || ''); }
    setSaveError(null); setSaveSuccess(false);
  }, [profile, open]);

  useEffect(() => { setImgError(false); }, [avatarUrlInput]);

  useEffect(() => {
    const t = THEME_OPTIONS.find(t => t.key === currentTheme);
    if (t) {
      const r = document.documentElement;
      r.style.setProperty('--app-accent', t.color);
      r.style.setProperty('--app-accent-muted', `${t.color}15`);
      r.style.setProperty('--app-accent-soft', `${t.color}30`);
      r.style.setProperty('--app-bg-tint', `${t.color}03`);
    }
  }, [currentTheme]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const handleThemeChange = (t: ThemeKey) => { setCurrentTheme(t); setTheme(t); };

  const handleSaveProfile = async () => {
    if (!user || isSaving) return;
    setIsSaving(true); setSaveSuccess(false); setSaveError(null);
    try {
      const { error } = await updateProfile({
        avatar_url: avatarUrlInput.trim() || null,
        display_name: displayName.trim() || profile?.display_name || user?.email?.split('@')[0] || 'User',
      });
      if (error) { setSaveError(error); }
      else { setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); onClose(); }, 1200); }
    } catch (err: any) {
      setSaveError(err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => { await signOut(); onClose(); window.location.reload(); };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className="relative flex w-full max-w-[700px] h-[80vh] max-h-[740px] overflow-hidden rounded-[18px] pointer-events-auto"
              style={{
                fontFamily: APP_FONT,
                background: 'var(--app-bg)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.65)',
              }}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Sidebar ── */}
              <aside
                className="flex flex-col w-[190px] flex-shrink-0 py-5"
                style={{ background: 'var(--app-surface-1)', borderRight: '1px solid var(--app-border)' }}
              >
                <div className="px-5 mb-6">
                  <h2 className="text-[17px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Settings
                  </h2>
                  <p className="text-[11px] text-zinc-500 mt-0.5 truncate" title={user?.email ?? ''}>
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>

                <nav className="flex-1 flex flex-col gap-0.5 px-2.5">
                  {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        whileHover={!active ? { backgroundColor: 'rgba(255,255,255,0.04)', x: 2 } : {}}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.12 }}
                        className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-left"
                        style={{
                          background: active ? 'var(--app-accent-muted)' : 'transparent',
                          color: active ? 'white' : 'rgb(113,113,122)',
                        }}
                      >
                        {/* Indicator: top-2/bottom-2 avoids transform conflict with layoutId */}
                        {active && (
                          <motion.div
                            layoutId="sidebarActive"
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                            style={{ background: 'var(--app-accent)' }}
                            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          />
                        )}
                        <tab.icon
                          size={14}
                          strokeWidth={active ? 2 : 1.5}
                          style={{ color: active ? 'var(--app-accent)' : undefined, flexShrink: 0 }}
                        />
                        <span className="leading-none">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="px-2.5 pt-4" style={{ borderTop: '1px solid var(--app-border)' }}>
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ x: 3, color: '#fca5a5' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-red-400"
                  >
                    <LogOut size={14} strokeWidth={1.5} />
                    Log out
                  </motion.button>
                </div>
              </aside>

              {/* ── Content ── */}
              <div className="flex flex-col flex-1 min-w-0">
                <div
                  className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                  style={{ borderBottom: '1px solid var(--app-border)' }}
                >
                  <div>
                    <h3 className="text-[15px] font-semibold text-white" style={{ fontFamily: DISPLAY_FONT }}>
                      {activeTabMeta.label}
                    </h3>
                    <p className="text-[11.5px] text-zinc-500 mt-0.5">{activeTabMeta.desc}</p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.12, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <X size={14} strokeWidth={2} />
                  </motion.button>
                </div>

                <main className="flex-1 overflow-y-auto overflow-x-hidden py-5 px-6" style={{ scrollbarGutter: 'stable' }}>
                  <AnimatePresence mode="wait">

                    {/* ── Profile ── */}
                    {activeTab === 'profile' && (
                      <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        {!user ? (
                          <SectionCard>
                            <div className="p-4">
                              <p className="text-[11px] font-semibold tracking-widest uppercase text-red-400 mb-1.5">Authentication Required</p>
                              <p className="text-[13px] text-zinc-400">You must be signed in to edit your profile.</p>
                            </div>
                          </SectionCard>
                        ) : (
                          <>
                            <div>
                              <SectionLabel>Profile Picture</SectionLabel>
                              <SectionCard>
                                <div className="flex items-center gap-4 p-4">
                                  <motion.div
                                    className="relative flex-shrink-0"
                                    whileHover={{ scale: 1.06 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                  >
                                    <div
                                      className="w-[60px] h-[60px] rounded-full overflow-hidden flex items-center justify-center"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.08)' }}
                                    >
                                      {avatarUrlInput.trim() && !imgError ? (
                                        <img src={avatarUrlInput.trim()} alt="Avatar" className="w-full h-full object-cover" onError={() => setImgError(true)} />
                                      ) : (
                                        <User size={24} className="text-zinc-600" strokeWidth={1} />
                                      )}
                                    </div>
                                    <div
                                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                                      style={{ background: 'var(--app-accent)', boxShadow: '0 0 0 2px var(--app-surface-1)' }}
                                    >
                                      <Eye size={8} strokeWidth={2.5} className="text-black" />
                                    </div>
                                  </motion.div>
                                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={avatarUrlInput}
                                      onChange={e => setAvatarUrlInput(e.target.value)}
                                      placeholder="https://example.com/avatar.png"
                                      className="w-full rounded-[9px] px-3 py-2 text-[12.5px] text-white placeholder:text-zinc-600 outline-none transition-all"
                                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
                                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--app-accent)')}
                                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                                    />
                                    <p className="text-[11px] text-zinc-600">Paste a direct image URL (JPG, PNG, GIF)</p>
                                  </div>
                                </div>
                              </SectionCard>
                            </div>

                            <div>
                              <SectionLabel>Display Name</SectionLabel>
                              <SectionCard>
                                <div className="p-4">
                                  <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your display name"
                                    className="w-full rounded-[9px] px-3 py-2.5 text-[13px] text-white placeholder:text-zinc-600 outline-none transition-all"
                                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
                                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--app-accent)')}
                                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                                  />
                                </div>
                              </SectionCard>
                            </div>

                            <AnimatePresence>
                              {saveError && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  className="text-[12px] text-red-400 px-1 -mt-1"
                                >
                                  {saveError}
                                </motion.p>
                              )}
                            </AnimatePresence>

                            <div className="flex items-center justify-end gap-4 mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              <AnimatePresence>
                                {saveSuccess && (
                                  <motion.span
                                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                    className="text-[12px] font-medium flex items-center gap-1.5"
                                    style={{ color: 'var(--app-accent)' }}
                                  >
                                    <Check size={12} strokeWidth={2.5} /> Saved
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <motion.button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                whileHover={!isSaving ? { scale: 1.03, filter: 'brightness(1.12)' } : {}}
                                whileTap={!isSaving ? { scale: 0.97 } : {}}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="flex items-center gap-2 rounded-[10px] px-5 py-2 text-[13px] font-semibold text-black disabled:opacity-50"
                                style={{ background: 'var(--app-accent)', boxShadow: '0 0 20px var(--app-accent-soft)', minWidth: 100, justifyContent: 'center' }}
                              >
                                {isSaving ? <Loader2 size={13} className="animate-spin" /> : 'Save changes'}
                              </motion.button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ── Appearance ── */}
                    {activeTab === 'appearance' && (
                      <motion.div
                        key="appearance"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        <SectionLabel>Accent Color</SectionLabel>
                        <p className="text-[12.5px] text-zinc-500 leading-relaxed -mt-2 mb-1">
                          Changes the accent color across all pages and interactive elements.
                        </p>
                        <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
                      </motion.div>
                    )}

                    {/* ── Player ── */}
                    {activeTab === 'player' && (
                      <motion.div
                        key="player"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        <SectionLabel>Playback</SectionLabel>
                        <SectionCard>
                          <SettingRow title="Autoplay" description="Start playing immediately when an episode loads">
                            <Toggle checked={mockSettings.autoplay} onChange={() => updateSetting('autoplay', !mockSettings.autoplay)} />
                          </SettingRow>
                          <SettingRow title="Auto-next episode" description="Advance automatically when an episode ends">
                            <Toggle checked={mockSettings.autoNext} onChange={() => updateSetting('autoNext', !mockSettings.autoNext)} />
                          </SettingRow>
                          <SettingRow title="Default volume" last>
                            <Select value={mockSettings.volume} options={['0% (Muted)', '25%', '50%', '75%', '100%']} onChange={v => updateSetting('volume', v)} />
                          </SettingRow>
                        </SectionCard>
                      </motion.div>
                    )}

                    {/* ── Streaming ── */}
                    {activeTab === 'streaming' && (
                      <motion.div
                        key="streaming"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        <SectionLabel>Source & Audio</SectionLabel>
                        <SectionCard>
                          <SettingRow title="Preferred source" description="Which source to try first when loading">
                            <Select value={mockSettings.preferredSource} options={['kiwi (External)']} onChange={v => updateSetting('preferredSource', v)} />
                          </SettingRow>
                          <SettingRow title="Audio language" description="Preferred audio type">
                            <Select value={mockSettings.audioLang} options={['Subbed (Japanese audio)', 'Dubbed (English audio)']} onChange={v => updateSetting('audioLang', v)} />
                          </SettingRow>
                          <SettingRow title="Default quality" description="Quality level on first load" last>
                            <Select value={mockSettings.quality} options={['Auto (recommended)', '1080p', '720p', '480p', '360p']} onChange={v => updateSetting('quality', v)} />
                          </SettingRow>
                        </SectionCard>
                      </motion.div>
                    )}

                    {/* ── Subtitles ── */}
                    {activeTab === 'subtitles' && (
                      <motion.div
                        key="subtitles"
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-4"
                      >
                        <SectionCard>
                          <div
                            className="relative h-[80px] flex items-end justify-center pb-3 overflow-hidden rounded-t-[13px]"
                            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.7))' }}
                          >
                            <motion.div
                              layout
                              className="text-white font-medium px-3 py-1 rounded-[6px] select-none"
                              style={{
                                background: `${mockSettings.subBgColor}${Math.round(parseInt(mockSettings.subBgOpacity) * 2.55).toString(16).padStart(2, '0')}`,
                                fontSize: `${parseInt(mockSettings.subSize) / 100 * 13}px`,
                              }}
                            >
                              ようこそ、新世界へ — Welcome to the new world
                            </motion.div>
                          </div>
                          <div className="px-4 py-2 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <Eye size={11} className="text-zinc-600" />
                            <span className="text-[11px] text-zinc-600">Preview</span>
                          </div>
                        </SectionCard>

                        <SectionLabel>Display</SectionLabel>
                        <SectionCard>
                          <SettingRow title="Show subtitles by default">
                            <Toggle checked={mockSettings.showSubs} onChange={() => updateSetting('showSubs', !mockSettings.showSubs)} />
                          </SettingRow>
                          <SettingRow title="Position">
                            <Select value={mockSettings.subPosition} options={['Bottom', 'Top']} onChange={v => updateSetting('subPosition', v)} />
                          </SettingRow>
                          <SettingRow title="Font size" description="Relative to base size">
                            <Select value={mockSettings.subSize} options={['50%', '75%', '100%', '125%', '150%']} onChange={v => updateSetting('subSize', v)} />
                          </SettingRow>
                          <SettingRow title="Background opacity">
                            <Select value={mockSettings.subBgOpacity} options={['0%', '25%', '50%', '70%', '100%']} onChange={v => updateSetting('subBgOpacity', v)} />
                          </SettingRow>
                          <SettingRow title="Background color" last>
                            <div className="flex items-center gap-2.5">
                              <motion.div
                                whileHover={{ scale: 1.14 }}
                                whileTap={{ scale: 0.94 }}
                                className="w-[26px] h-[26px] rounded-[7px] border border-white/15 cursor-pointer overflow-hidden relative flex-shrink-0"
                                style={{ background: mockSettings.subBgColor, boxShadow: `0 2px 8px ${mockSettings.subBgColor}60` }}
                              >
                                <input
                                  type="color"
                                  value={mockSettings.subBgColor}
                                  onChange={e => updateSetting('subBgColor', e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </motion.div>
                              <span className="text-[11.5px] text-zinc-500 font-mono tracking-wide">
                                {mockSettings.subBgColor.toUpperCase()}
                              </span>
                            </div>
                          </SettingRow>
                        </SectionCard>
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

export default SettingsModal;