import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette, X, User, Loader2, LogOut,
  Play, Radio, Subtitles, FastForward, Eye, Database, Info, Trash2, ChevronDown
} from 'lucide-react';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme } from '../../utils/theme';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'player', label: 'Player', icon: Play },
  { id: 'streaming', label: 'Streaming', icon: Radio },
  { id: 'subtitles', label: 'Subtitles', icon: Subtitles },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── ThemePicker (untouched) ────────────────────────────────────────────────
const ThemePicker: React.FC<{
  theme: ThemeKey;
  onThemeChange: (theme: ThemeKey) => void;
}> = ({ theme, onThemeChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {THEME_OPTIONS.map((option, index) => (
        <button
          key={option.key}
          onClick={() => onThemeChange(option.key)}
          className={`group relative p-2 rounded-2xl border transition-all duration-300 hover:scale-[1.03] ${theme === option.key
            ? 'border-[var(--app-accent)] bg-[var(--app-accent-muted)] -translate-y-1'
            : 'border-white/[0.05] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]'
            }`}
          style={{
            animationDelay: `${index * 50}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[var(--app-background)] border border-[var(--app-border)] flex relative z-10">
            <div
              style={{ backgroundColor: option.color }}
              className="w-1/3 h-full opacity-90 transition-transform duration-500 group-hover:scale-105"
            />
            <div className="flex-1 p-3 flex flex-col gap-2 justify-end">
              <div className="space-y-1.5 opacity-40">
                <div className="h-1 w-full rounded-full bg-white" />
                <div className="h-1 w-3/4 rounded-full bg-white" />
              </div>
            </div>
          </div>
          <div className="pt-3 pb-1 px-1">
            <p className={`text-center text-[13px] font-medium transition-colors ${theme === option.key
              ? 'text-[var(--app-accent)]'
              : 'text-zinc-500 group-hover:text-zinc-300'
              }`}>
              {option.label}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Reusable Settings UI Components ──────────────────────────────────────────
const SettingRow: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
    <div className="flex flex-col pr-6">
      <span className="text-[14px] text-white font-medium">{title}</span>
      {description && <span className="text-[12px] text-zinc-500 mt-1 leading-relaxed">{description}</span>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-[var(--app-accent)]' : 'bg-white/10'}`}
  >
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

// ─── Animated Custom Select Component ──────────────────────────────────────────
const Select: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative min-w-[160px]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[var(--app-surface-2)] border border-white/10 hover:border-white/20 text-white text-[13px] rounded-lg px-3 py-2 outline-none transition-colors"
        style={{ borderColor: isOpen ? 'var(--app-accent)' : undefined }}
      >
        <span className="truncate pr-3">{value}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 w-[max-content] min-w-full mt-2 py-1.5 bg-[var(--app-surface-2)] border border-white/10 rounded-[10px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
          >
            {options.map((opt) => {
              const isSelected = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] transition-colors relative flex items-center"
                  style={{
                    color: isSelected ? 'white' : 'rgb(161, 161, 170)',
                    background: isSelected ? 'var(--app-accent-muted)' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <motion.div
                      layoutId={`select-indicator-${value}`}
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ background: 'var(--app-accent)' }}
                    />
                  )}
                  <span className="truncate">{opt}</span>
                </button>
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

  // Profile States
  const [displayName, setDisplayName] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mock Settings States (For Visual Interactivity)
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
    listFormat: 'Grid'
  });

  const updateSetting = (key: keyof typeof mockSettings, val: any) => {
    setMockSettings(prev => ({ ...prev, [key]: val }));
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrlInput(profile.avatar_url || '');
    }
    setSaveError(null);
    setSaveSuccess(false);
  }, [profile, open]);

  // Reset image error state when url changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrlInput]);

  useEffect(() => {
    const activeTheme = THEME_OPTIONS.find(t => t.key === currentTheme);
    if (activeTheme) {
      const root = document.documentElement;
      root.style.setProperty('--app-accent', activeTheme.color);
      root.style.setProperty('--app-accent-muted', `${activeTheme.color}15`);
      root.style.setProperty('--app-accent-soft', `${activeTheme.color}30`);
      root.style.setProperty('--app-bg-tint', `${activeTheme.color}03`);
    }
  }, [currentTheme]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleThemeChange = (newTheme: ThemeKey) => {
    setCurrentTheme(newTheme);
    setTheme(newTheme);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Prevent multiple concurrent saves
    if (isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const finalAvatarUrl = avatarUrlInput.trim() || null;
      const finalDisplayName = displayName.trim() || profile?.display_name || user?.email?.split('@')[0] || 'User';

      const { error } = await updateProfile({
        avatar_url: finalAvatarUrl,
        display_name: finalDisplayName,
      });

      if (error) {
        setSaveError(error);
      } else {
        setSaveSuccess(true);
        // Close modal after a short delay so they see the success state
        setTimeout(() => {
          setSaveSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setSaveError(err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
    window.location.reload();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative flex flex-col w-full max-w-[720px] h-[85vh] max-h-[780px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={{
                fontFamily: APP_FONT,
                background: 'var(--app-bg-2, #0f1014)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex flex-col pt-7 flex-shrink-0"
                style={{
                  background: 'linear-gradient(160deg, var(--app-accent-muted) 0%, var(--app-bg-2, #0f1014) 100%)',
                  borderBottom: '1px solid var(--app-accent-soft)',
                }}
              >
                <div className="flex justify-between items-start mb-6 px-7">
                  <div>
                    <h2
                      className="text-[22px] text-white"
                      style={{ fontFamily: '"Syne", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' }}
                    >
                      Settings
                    </h2>
                    <p className="text-[12px] text-zinc-500 mt-0.5">{user?.email ?? 'Configure your experience'}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-white transition-all active:scale-90 mt-0.5"
                    style={{
                      background: 'var(--app-accent-muted)',
                      border: '1px solid var(--app-accent-soft)',
                      borderRadius: '50%',
                    }}
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>

                {/* Horizontally Scrollable Tab Nav */}
                <div className="w-full overflow-x-auto no-scrollbar px-7 pb-0">
                  <nav className="flex items-center gap-1 w-max pb-0">
                    {TABS.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium rounded-t-xl transition-colors whitespace-nowrap"
                        style={{
                          color: activeTab === tab.id ? 'white' : 'rgb(113,113,122)',
                          background: activeTab === tab.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                        }}
                      >
                        <tab.icon size={14} strokeWidth={activeTab === tab.id ? 2 : 1.5} style={{ color: activeTab === tab.id ? 'var(--app-accent)' : undefined }} />
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                            style={{ background: 'var(--app-accent)', boxShadow: '0 -2px 8px var(--app-accent-soft)' }}
                          />
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Content Area */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-16" style={{ background: 'var(--app-bg, #0a0b0e)' }}>
                <div className="p-7 w-full max-w-[600px] mx-auto min-h-full flex flex-col gap-6">

                  {/* 1. Profile tab */}
                  {activeTab === 'profile' && (
                    <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6">
                      {!user ? (
                        <div className="rounded-[14px] p-5 flex flex-col gap-2" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}>
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-red-400">Authentication Required</span>
                          <p className="text-[13px] text-zinc-400">You must be signed in to edit your profile.</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">Profile Picture</label>
                            <div className="flex items-center gap-5 p-5 rounded-[16px]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="relative flex-shrink-0">
                                <div className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                  {avatarUrlInput.trim() && !imgError ? (
                                    <img
                                      src={avatarUrlInput.trim()}
                                      alt="Avatar"
                                      className="w-full h-full object-cover"
                                      onError={() => setImgError(true)}
                                    />
                                  ) : (
                                    <User size={28} className="text-zinc-600" strokeWidth={1} />
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={avatarUrlInput}
                                  onChange={e => setAvatarUrlInput(e.target.value)}
                                  placeholder="https://example.com/avatar.png"
                                  className="w-full rounded-[10px] px-3 py-2 text-[13px] text-white placeholder:text-zinc-600 outline-none transition-all"
                                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
                                  onFocus={e => e.currentTarget.style.borderColor = 'var(--app-accent)'}
                                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                                />
                                <p className="text-[11px] text-zinc-500">Paste a direct image URL (JPG, PNG, GIF)</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">Display Name</label>
                            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" className="w-full rounded-[12px] px-4 py-3 text-[14px] text-white placeholder:text-zinc-600 outline-none transition-all" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }} onFocus={e => e.currentTarget.style.borderColor = 'var(--app-accent)'} onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'} />
                          </div>

                          <AnimatePresence>
                            {saveError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[12px] text-red-400 px-1 -mt-2">{saveError}</motion.p>}
                          </AnimatePresence>

                          <div className="mt-auto pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium text-red-400 hover:text-red-300 transition-all" onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <LogOut size={14} strokeWidth={1.5} /> Log out
                            </button>
                            <div className="flex items-center gap-4">
                              <AnimatePresence>
                                {saveSuccess && <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-[12px] font-medium" style={{ color: 'var(--app-accent)' }}>Saved</motion.span>}
                              </AnimatePresence>
                              <button onClick={handleSaveProfile} disabled={isSaving} className="flex items-center gap-2 rounded-[12px] px-6 py-2.5 text-[13px] font-semibold text-black transition-all disabled:opacity-50 active:scale-[0.98] hover:brightness-110" style={{ background: 'var(--app-accent)', boxShadow: '0 0 24px var(--app-accent-soft)', minWidth: 110, justifyContent: 'center' }}>
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* 2. Appearance tab */}
                  {activeTab === 'appearance' && (
                    <motion.div key="appearance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1">
                      <div className="flex flex-col gap-6">
                        <div className="mb-2">
                          <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 block mb-3">Global Theme Color</label>
                          <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
                            Personalize the application's global accent color. This will reflect instantly across all pages and buttons.
                          </p>
                          <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 3. Player Tab */}
                  {activeTab === 'player' && (
                    <motion.div key="player" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
                      <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 mb-2">Playback behaviour and defaults</label>
                      <SettingRow title="Autoplay" description="Start playing immediately when an episode loads">
                        <Toggle checked={mockSettings.autoplay} onChange={() => updateSetting('autoplay', !mockSettings.autoplay)} />
                      </SettingRow>
                      <SettingRow title="Auto-next episode" description="Automatically advance to the next episode when the current one ends">
                        <Toggle checked={mockSettings.autoNext} onChange={() => updateSetting('autoNext', !mockSettings.autoNext)} />
                      </SettingRow>
                      <SettingRow title="Default volume">
                        <Select value={mockSettings.volume} options={['0% (Muted)', '25%', '50%', '75%', '100%']} onChange={(v) => updateSetting('volume', v)} />
                      </SettingRow>
                    </motion.div>
                  )}

                  {/* 4. Streaming Tab */}
                  {activeTab === 'streaming' && (
                    <motion.div key="streaming" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
                      <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 mb-2">Source and audio preferences</label>
                      <SettingRow title="Preferred source" description="Which source to try first when loading an episode">
                        <Select value={mockSettings.preferredSource} options={['kiwi (External)']} onChange={(v) => updateSetting('preferredSource', v)} />
                      </SettingRow>
                      <SettingRow title="Audio language" description="Preferred audio type">
                        <Select value={mockSettings.audioLang} options={['Subbed (Japanese audio)', 'Dubbed (English audio)']} onChange={(v) => updateSetting('audioLang', v)} />
                      </SettingRow>
                      <SettingRow title="Default quality" description="Quality level when a stream first loads">
                        <Select value={mockSettings.quality} options={['Auto (recommended)', '1080p', '720p', '480p', '360p']} onChange={(v) => updateSetting('quality', v)} />
                      </SettingRow>
                    </motion.div>
                  )}

                  {/* 5. Subtitles Tab */}
                  {activeTab === 'subtitles' && (
                    <motion.div key="subtitles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col">
                      <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 mb-2">Appearance and language settings</label>
                      <SettingRow title="Show subtitles by default">
                        <Toggle checked={mockSettings.showSubs} onChange={() => updateSetting('showSubs', !mockSettings.showSubs)} />
                      </SettingRow>
                      <SettingRow title="Position">
                        <Select value={mockSettings.subPosition} options={['Bottom', 'Top']} onChange={(v) => updateSetting('subPosition', v)} />
                      </SettingRow>
                      <SettingRow title="Font size" description="Relative to base size">
                        <Select value={mockSettings.subSize} options={['50%', '75%', '100%', '125%', '150%']} onChange={(v) => updateSetting('subSize', v)} />
                      </SettingRow>
                      <SettingRow title="Background opacity">
                        <Select value={mockSettings.subBgOpacity} options={['0%', '25%', '50%', '70%', '100%']} onChange={(v) => updateSetting('subBgOpacity', v)} />
                      </SettingRow>
                      <SettingRow title="Background colour">
                        <div className="flex items-center gap-3">
                          <input type="color" value={mockSettings.subBgColor} onChange={(e) => updateSetting('subBgColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
                        </div>
                      </SettingRow>
                    </motion.div>
                  )}

                </div>
              </main>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default SettingsModal;