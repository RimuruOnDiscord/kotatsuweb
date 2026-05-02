
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette, X, User, Loader2, LogOut,
  Play, Radio, Subtitles, Eye, ChevronDown, Check
} from 'lucide-react';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme, PATTERN_OPTIONS, PatternKey, getStoredPattern, setPattern } from '../../utils/theme';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';


const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',    label: 'Profile',    icon: User,      desc: 'Avatar & display name' },
  { id: 'appearance', label: 'Appearance', icon: Palette,   desc: 'Theme & accent color' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Animation Variants ────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }
};

// ─── ThemePicker ─────────────────────────────────────────────────────────────
const ThemePicker: React.FC<{ theme: ThemeKey; onThemeChange: (theme: ThemeKey) => void }> = ({ theme, onThemeChange }) => {
  const isCustom = theme.startsWith('#');
  const customColor = isCustom ? theme : '#3b82f6';
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.key;
          return (
            <motion.button
              key={option.key}
              variants={fadeUpItem}
              onClick={() => { onThemeChange(option.key); setShowPicker(false); }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="relative rounded-[16px] p-2 transition-all duration-300 ease-out border"
              style={{
                backgroundColor: active ? `${option.color}15` : 'rgba(255,255,255,0.03)',
                borderColor: active ? `${option.color}60` : 'rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="aspect-[16/10] w-full rounded-[10px] overflow-hidden flex flex-col relative"
                style={{ background: 'var(--app-bg)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Topbar Wireframe */}
                <div className="h-[14%] w-full border-b flex items-center px-2 gap-1.5 shrink-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <motion.div initial={false} animate={{ backgroundColor: option.color }} className="w-2 h-2 rounded-full" />
                  <div className="w-6 h-[3px] rounded-full bg-white/30" />
                  <div className="w-3 h-[3px] rounded-full bg-white/10 ml-1.5" />
                  <div className="w-3 h-[3px] rounded-full bg-white/10" />
                  <div className="w-2 h-2 rounded-full bg-white/20 ml-auto" />
                </div>

                {/* Content Wireframe */}
                <div className="flex-1 flex flex-col gap-1.5 p-1.5">
                  {/* Hero Banner */}
                  <div className="relative w-full h-[45%] rounded-[4px] overflow-hidden flex flex-col justify-end p-1.5 border border-white/5" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    <motion.div
                      initial={false}
                      animate={{ 
                        background: `linear-gradient(135deg, ${option.color}50 0%, ${option.color}00 80%)`,
                        opacity: active ? 1 : 0.5
                      }}
                      className="absolute inset-0"
                    />
                    <div className="w-1/2 h-[4px] rounded-full bg-white/90 relative z-10 mb-1" />
                    <div className="w-1/3 h-[3px] rounded-full bg-white/50 relative z-10 mb-1.5" />
                    <motion.div 
                      initial={false}
                      animate={{ backgroundColor: option.color }}
                      className="w-6 h-[5px] rounded-[2px] relative z-10"
                    />
                  </div>

                  {/* Grid / Continue Watching */}
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex-1 rounded-[3px] bg-white/5 relative overflow-hidden border border-white/5">
                        {i === 1 && (
                          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
                            <motion.div 
                              initial={false}
                              animate={{ backgroundColor: option.color }}
                              className="h-full w-[60%]"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <AnimatePresence>
                  {active && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: option.color }}
                    >
                      <Check size={12} strokeWidth={3} className="text-black" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-2.5 mb-1 text-center text-[12px] font-semibold tracking-wide" style={{ color: active ? 'white' : 'rgb(161, 161, 170)' }}>
                {option.label}
              </p>
            </motion.button>
          );
        })}

        {/* Custom Color Option */}
        <motion.button
          variants={fadeUpItem}
          onClick={() => {
            if (!isCustom) onThemeChange(customColor);
            setShowPicker(!showPicker);
          }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="relative rounded-[16px] p-2 transition-all duration-300 ease-out border cursor-pointer"
          style={{
            backgroundColor: isCustom ? `${customColor}15` : 'rgba(255,255,255,0.03)',
            borderColor: isCustom ? `${customColor}60` : 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="aspect-[16/10] w-full rounded-[10px] overflow-hidden flex flex-col relative"
            style={{ background: 'var(--app-bg)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Topbar Wireframe */}
            <div className="h-[14%] w-full border-b flex items-center px-2 gap-1.5 shrink-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <motion.div initial={false} animate={{ backgroundColor: isCustom ? customColor : '#ffffff' }} className="w-2 h-2 rounded-full" />
              <div className="w-6 h-[3px] rounded-full bg-white/30" />
              <div className="w-3 h-[3px] rounded-full bg-white/10 ml-1.5" />
              <div className="w-3 h-[3px] rounded-full bg-white/10" />
              <div className="w-2 h-2 rounded-full bg-white/20 ml-auto" />
            </div>

            {/* Content Wireframe */}
            <div className="flex-1 flex flex-col gap-1.5 p-1.5">
              {/* Hero Banner */}
              <div className="relative w-full h-[45%] rounded-[4px] overflow-hidden flex flex-col justify-end p-1.5 border border-white/5" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                <motion.div
                  initial={false}
                  animate={{ 
                    background: isCustom ? `linear-gradient(135deg, ${customColor}50 0%, ${customColor}00 80%)` : `linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 80%)`,
                    opacity: isCustom ? 1 : 0.5
                  }}
                  className="absolute inset-0"
                />
                <div className="w-1/2 h-[4px] rounded-full bg-white/90 relative z-10 mb-1" />
                <div className="w-1/3 h-[3px] rounded-full bg-white/50 relative z-10 mb-1.5" />
                <motion.div 
                  initial={false}
                  animate={{ backgroundColor: isCustom ? customColor : '#ffffff' }}
                  className="w-6 h-[5px] rounded-[2px] relative z-10"
                />
              </div>

              {/* Grid / Continue Watching */}
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex-1 rounded-[3px] bg-white/5 relative overflow-hidden border border-white/5">
                    {i === 1 && (
                      <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/10">
                        <motion.div 
                          initial={false}
                          animate={{ backgroundColor: isCustom ? customColor : '#ffffff' }}
                          className="h-full w-[60%]"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {isCustom && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                  style={{ background: customColor, zIndex: 30, pointerEvents: 'none' }}
                >
                  <Check size={12} strokeWidth={3} className="text-black" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-2.5 mb-1 text-center text-[12px] font-semibold tracking-wide" style={{ color: isCustom ? 'white' : 'rgb(161, 161, 170)' }}>
            Custom
          </p>
        </motion.button>
      </div>

      <AnimatePresence>
        {showPicker && isCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div 
              className="p-5 rounded-[16px] border flex flex-col gap-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div 
                  className="w-full sm:w-[120px] aspect-square rounded-[12px] border border-white/10 shadow-lg shrink-0 flex items-center justify-center relative overflow-hidden"
                  style={{ backgroundColor: customColor }}
                >
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => onThemeChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-[150%] h-[150%] -top-1 -left-1"
                    title="Open OS color picker"
                  />
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[11px] font-semibold tracking-wide pointer-events-none border border-white/10">
                    {customColor.toUpperCase()}
                  </div>
                </div>

                <div className="flex flex-col flex-1 w-full gap-5">
                  <div>
                    <p className="text-[14px] font-semibold text-white tracking-wide mb-1">Custom Accent Color</p>
                    <p className="text-[13px] text-zinc-400 leading-relaxed">
                      Enter a hex code or use the system picker by clicking the preview box.
                    </p>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-mono text-[14px]">#</div>
                    <input 
                      type="text" 
                      value={customColor.replace('#', '')}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').substring(0, 6);
                        onThemeChange(`#${v}`);
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-[10px] pl-7 pr-3 py-2.5 text-white font-mono text-[14px] outline-none transition-all focus:border-white/30 focus:bg-white/10 uppercase uppercase"
                      placeholder="FFFFFF"
                    />
                  </div>
                  
                  {/* Preset Quick Colors */}
                  <div className="flex gap-2 pt-1">
                    {['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#64748b'].map(c => (
                      <button 
                        key={c}
                        onClick={() => onThemeChange(c)}
                        className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── UI Primitives ────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    variants={fadeUpItem}
    className={`rounded-[16px] shadow-lg ${className}`}
    style={{ 
      background: 'rgba(255,255,255,0.02)', 
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
    }}
  >
    {children}
  </motion.div>
);

const SettingRow: React.FC<{ title: string; description?: string; children: React.ReactNode; last?: boolean }> = ({ title, description, children, last }) => (
  <div
    className={`flex items-center justify-between px-4 py-3.5 cursor-default group hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]`}
    style={!last ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
  >
    <div className="flex flex-col pr-6">
      <span className="text-[13.5px] text-white/95 font-medium transition-colors group-hover:text-white">{title}</span>
      {description && <span className="text-[11.5px] text-zinc-400 mt-0.5 leading-relaxed">{description}</span>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.p variants={fadeUpItem} className="text-[10.5px] font-bold tracking-[0.15em] uppercase text-zinc-500 mb-2.5 px-1">
    {children}
  </motion.p>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <motion.button
    onClick={onChange}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.9 }}
    className={`relative flex h-[24px] w-11 items-center rounded-full p-[3px] transition-colors duration-300 focus:outline-none ${checked ? 'justify-end' : 'justify-start'}`}
    style={{ 
      backgroundColor: checked ? 'var(--app-accent)' : 'rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
    }}
  >
    <motion.span
      layout
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="h-[18px] w-[18px] rounded-full bg-white shadow-sm"
    />
  </motion.button>
);

const Select: React.FC<{ value: string; options: string[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => {
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
    <div className={`relative min-w-[160px] ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          backgroundColor: isOpen ? 'var(--app-accent-muted)' : 'rgba(255,255,255,0.04)',
          borderColor: isOpen ? 'var(--app-accent-soft)' : 'rgba(255,255,255,0.1)',
          color: isOpen ? 'white' : 'rgba(255,255,255,0.85)'
        }}
        className="w-full flex items-center justify-between gap-2 text-[12.5px] font-medium px-3.5 py-2 rounded-[10px] outline-none border shadow-sm transition-all duration-200 hover:bg-white/[0.08]"
      >
        <span className="truncate pr-1">{value}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
          <ChevronDown size={14} className={isOpen ? 'text-white' : 'text-zinc-400'} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-max min-w-full py-1.5 rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-xl border"
            style={{ 
              backgroundColor: 'var(--app-bg)', 
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
              borderColor: 'rgba(255,255,255,0.1)' 
            }}
          >
            {options.map((opt) => {
              const sel = value === opt;
              return (
                <button
                  key={opt}
                  onClick={() => { onChange(opt); setIsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-[12.5px] flex items-center gap-3 transition-colors hover:bg-white/[0.06]"
                  style={{ color: sel ? 'white' : 'rgba(255,255,255,0.6)' }}
                >
                  <span
                    className="w-[6px] h-[6px] rounded-full flex-shrink-0 shadow-sm transition-all duration-200"
                    style={{ 
                      backgroundColor: sel ? 'var(--app-accent)' : 'rgba(255,255,255,0.1)', 
                      transform: `scale(${sel ? 1.2 : 0.8})` 
                    }}
                  />
                  <span className={sel ? 'font-medium tracking-wide' : ''}>{opt}</span>
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
  const [currentPattern, setCurrentPattern] = useState<PatternKey>(getStoredPattern());

  const handleThemeChange = (theme: ThemeKey) => {
    setCurrentTheme(theme);
    setTheme(theme);
  };

  const handlePatternChange = (patternLabel: string) => {
    const opt = PATTERN_OPTIONS.find(p => p.label === patternLabel);
    if (opt) {
      setCurrentPattern(opt.key);
      setPattern(opt.key);
    }
  };

  const [displayName, setDisplayName] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [mockSettings, setMockSettings] = useState({
    autoplay: true, autoNext: true, volume: '100%',
    preferredSource: 'kiwi (External)', audioLang: 'Subbed (Japanese audio)', quality: 'Auto (FHD)',
    showSubs: true, subPosition: 'Bottom', subSize: '100%', subBgOpacity: '70%', subBgColor: '#000000',
    skipOp: true, skipEd: true, showSpoilers: true, listFormat: 'Grid',
    posterStyle: 'Standard', fontFamily: 'Inter (Sans)', titleCase: 'Original',
    cinematicGlow: true, blurIntensity: 'Medium (Standard)', reducedMotion: false
  });

  const updateSetting = (key: keyof typeof mockSettings, val: any) => setMockSettings(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (profile) { setDisplayName(profile.display_name || ''); setAvatarUrlInput(profile.avatar_url || ''); }
    setSaveError(null); setSaveSuccess(false);
  }, [profile, open]);

  useEffect(() => { setImgError(false); }, [avatarUrlInput]);

  useLayoutEffect(() => {
    const isCustom = currentTheme.startsWith('#');
    const t = isCustom ? { color: currentTheme } : THEME_OPTIONS.find(t => t.key === currentTheme);
    if (t) {
      const r = document.documentElement;
      r.style.setProperty('--app-accent', t.color);
      r.style.setProperty('--app-accent-muted', `${t.color}20`);
      r.style.setProperty('--app-accent-soft', `${t.color}40`);
      r.style.setProperty('--app-bg-tint', `${t.color}05`);
    }
  }, [currentTheme]);

  useEffect(() => {
    if (open) {
      const prevTitle = document.title;
      document.title = 'Settings';
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', esc);
      return () => {
        window.removeEventListener('keydown', esc);
        document.title = prevTitle;
      };
    }
  }, [onClose, open]);



  const handleSaveProfile = async () => {
    if (!user || isSaving) return;
    setIsSaving(true); setSaveSuccess(false); setSaveError(null);
    try {
      const { error } = await updateProfile({
        avatar_url: avatarUrlInput.trim() || null,
        display_name: displayName.trim() || profile?.display_name || user?.email?.split('@')[0] || 'User',
      });
      if (error) setSaveError(error);
      else { setSaveSuccess(true); setTimeout(() => { setSaveSuccess(false); onClose(); }, 1200); }
    } catch (err: any) {
      setSaveError(err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => { await signOut(); onClose(); window.location.reload(); };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;
  const isCustomTheme = currentTheme.startsWith('#');
  const activeThemeDef = isCustomTheme ? { color: currentTheme } : (THEME_OPTIONS.find(t => t.key === currentTheme) || THEME_OPTIONS[0]);

  // Pass variables directly to the container to ensure 0ms latency render (prevents flicker FOUC)
  const modalStyles = {
    fontFamily: APP_FONT,
    background: 'var(--app-bg)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
    '--app-accent': activeThemeDef.color,
    '--app-accent-muted': `${activeThemeDef.color}20`,
    '--app-accent-soft': `${activeThemeDef.color}40`,
    '--app-bg-tint': `${activeThemeDef.color}05`,
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
                <div className="px-6 mb-8">
                  <h2 className="text-[19px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Settings
                  </h2>
                  <p className="text-[11.5px] text-zinc-400 mt-1.5 truncate font-medium" title={user?.email ?? ''}>
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 px-3">
                  {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
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
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-left"
                      >

                        <motion.div animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : '' }}>
                          <tab.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                        </motion.div>
                        <span className="leading-none">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="px-3 pt-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <motion.button
                    onClick={handleLogout}
                    whileHover={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: '#fca5a5' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.1 }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-zinc-400"
                  >
                    <LogOut size={16} strokeWidth={2} />
                    Log out
                  </motion.button>
                </div>
              </aside>

              {/* ── Content ── */}
              <div className="flex flex-col flex-1 min-w-0 bg-white/[0.01]">
                <div
                  className="flex items-center justify-between px-8 py-6 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    key={activeTabMeta.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-[17px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                      {activeTabMeta.label}
                    </h3>
                    <p className="text-[12.5px] text-zinc-400 mt-1">{activeTabMeta.desc}</p>
                  </motion.div>
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

                <main className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-8" style={{ scrollbarGutter: 'stable' }}>
                  <AnimatePresence mode="wait">

                    {/* ── Profile ── */}
                    {activeTab === 'profile' && (
                      <motion.div
                        key="profile"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        {!user ? (
                          <SectionCard>
                            <div className="p-5 text-center overflow-hidden rounded-[16px]">
                              <p className="text-[12px] font-bold tracking-widest uppercase text-red-400 mb-2">Authentication Required</p>
                              <p className="text-[13.5px] text-zinc-300">You must be signed in to edit your profile.</p>
                            </div>
                          </SectionCard>
                        ) : (
                          <>
                            <div className="flex flex-col gap-2">
                              <SectionLabel>Profile Picture</SectionLabel>
                              <SectionCard className="overflow-hidden">
                                <div className="flex items-center gap-5 p-5">
                                  <motion.div
                                    className="relative flex-shrink-0"
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <div
                                      className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center shadow-lg"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(255,255,255,0.1)' }}
                                    >
                                      {avatarUrlInput.trim() && !imgError ? (
                                        <motion.img 
                                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                          src={avatarUrlInput.trim()} alt="Avatar" 
                                          className="w-full h-full object-cover" 
                                          onError={() => setImgError(true)} 
                                        />
                                      ) : (
                                        <User size={28} className="text-zinc-500" strokeWidth={1.5} />
                                      )}
                                    </div>
                                    <div
                                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: 'var(--app-accent)', boxShadow: '0 0 0 3px var(--app-bg)' }}
                                    >
                                      <Eye size={10} strokeWidth={3} className="text-black" />
                                    </div>
                                  </motion.div>
                                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                                    <motion.input
                                      whileFocus={{ boxShadow: '0 0 0 2px var(--app-accent-soft)', borderColor: 'var(--app-accent)' }}
                                      type="text"
                                      value={avatarUrlInput}
                                      onChange={e => setAvatarUrlInput(e.target.value)}
                                      placeholder="https://example.com/avatar.png"
                                      className="w-full rounded-[10px] px-3.5 py-2.5 text-[13px] text-white placeholder:text-zinc-500 outline-none transition-all"
                                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    />
                                    <p className="text-[11.5px] text-zinc-400 font-medium">Paste a direct image URL (JPG, PNG, GIF)</p>
                                  </div>
                                </div>
                              </SectionCard>
                            </div>

                            <div className="flex flex-col gap-2">
                              <SectionLabel>Display Name</SectionLabel>
                              <SectionCard className="overflow-hidden">
                                <div className="p-5">
                                  <motion.input
                                    whileFocus={{ boxShadow: '0 0 0 2px var(--app-accent-soft)', borderColor: 'var(--app-accent)' }}
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    placeholder="Your display name"
                                    className="w-full rounded-[10px] px-3.5 py-2.5 text-[13.5px] text-white placeholder:text-zinc-500 outline-none transition-all"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                                  />
                                </div>
                              </SectionCard>
                            </div>

                            <AnimatePresence>
                              {saveError && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                  className="text-[12.5px] text-red-400 font-medium px-1"
                                >
                                  {saveError}
                                </motion.p>
                              )}
                            </AnimatePresence>

                            <motion.div variants={fadeUpItem} className="flex items-center justify-end gap-4 mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <AnimatePresence>
                                {saveSuccess && (
                                  <motion.span
                                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                    className="text-[13px] font-bold flex items-center gap-2"
                                    style={{ color: 'var(--app-accent)' }}
                                  >
                                    <Check size={14} strokeWidth={3} /> Saved
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <motion.button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                whileHover={!isSaving ? { scale: 1.04, filter: 'brightness(1.15)' } : {}}
                                whileTap={!isSaving ? { scale: 0.95 } : {}}
                                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                className="flex items-center gap-2 rounded-[12px] px-6 py-2.5 text-[13.5px] font-bold text-black disabled:opacity-50"
                                style={{ backgroundColor: 'var(--app-accent)', minWidth: 120, justifyContent: 'center' }}
                              >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : 'Save changes'}
                              </motion.button>
                            </motion.div>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ── Appearance ── */}
                    {activeTab === 'appearance' && (
                      <motion.div
                        key="appearance"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-8 pb-4"
                      >
                        <div>
                          <SectionLabel>Accent Color</SectionLabel>
                          <motion.p variants={fadeUpItem} className="text-[13px] text-zinc-400 leading-relaxed mb-4">
                            Personalize your experience. Changes apply across all pages instantly.
                          </motion.p>
                          <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
                        </div>

                        <motion.div variants={fadeUpItem}>
                          <SectionLabel>Background Pattern</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Global Pattern" description="Subtle texture applied behind the content" last>
                              <Select 
                                value={PATTERN_OPTIONS.find(p => p.key === currentPattern)?.label || 'Noise'} 
                                options={PATTERN_OPTIONS.map(p => p.label)} 
                                onChange={handlePatternChange} 
                              />
                            </SettingRow>
                          </SectionCard>
                        </motion.div>

                        <motion.div variants={fadeUpItem}>
                          <SectionLabel>Layout & Structure</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Default Browse Layout" description="How anime titles are displayed by default">
                              <Select value={mockSettings.listFormat} options={['Grid', 'List', 'Compact Grid']} onChange={v => updateSetting('listFormat', v)} />
                            </SettingRow>
                            <SettingRow title="Poster Style" description="Amount of information density on anime cards" last>
                              <Select value={mockSettings.posterStyle} options={['Standard', 'Minimal', 'Text Only']} onChange={v => updateSetting('posterStyle', v)} />
                            </SettingRow>
                          </SectionCard>
                        </motion.div>

                        <motion.div variants={fadeUpItem}>
                          <SectionLabel>Typography</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Font Family" description="Primary font used for titles and interface">
                              <Select value={mockSettings.fontFamily} options={['Inter (Sans)', 'Onest (Modern)', 'Syne (Display)']} onChange={v => updateSetting('fontFamily', v)} />
                            </SettingRow>
                            <SettingRow title="Title Case" description="Capitalization style for anime titles" last>
                              <Select value={mockSettings.titleCase} options={['Original', 'UPPERCASE', 'lowercase']} onChange={v => updateSetting('titleCase', v)} />
                            </SettingRow>
                          </SectionCard>
                        </motion.div>

                        <motion.div variants={fadeUpItem}>
                          <SectionLabel>Effects & Animations</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Cinematic Glow" description="Dynamic background shimmer based on poster colors">
                              <Toggle checked={mockSettings.cinematicGlow} onChange={() => updateSetting('cinematicGlow', !mockSettings.cinematicGlow)} />
                            </SettingRow>
                            <SettingRow title="Glassmorphism Intensity" description="Adjust the blur level on modals and sidebars">
                              <Select value={mockSettings.blurIntensity} options={['Low (Performance)', 'Medium (Standard)', 'High (Cinematic)']} onChange={v => updateSetting('blurIntensity', v)} />
                            </SettingRow>
                            <SettingRow title="Reduced Motion" description="Minimize animations and layout transitions" last>
                              <Toggle checked={mockSettings.reducedMotion} onChange={() => updateSetting('reducedMotion', !mockSettings.reducedMotion)} />
                            </SettingRow>
                          </SectionCard>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* ── Player ── */}
                    {activeTab === 'player' && (
                      <motion.div
                        key="player"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-5"
                      >
                        <div>
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
                        </div>
                      </motion.div>
                    )}

                    {/* ── Streaming ── */}
                    {activeTab === 'streaming' && (
                      <motion.div
                        key="streaming"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-5"
                      >
                        <div>
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
                        </div>
                      </motion.div>
                    )}

                    {/* ── Subtitles ── */}
                    {activeTab === 'subtitles' && (
                      <motion.div
                        key="subtitles"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        <SectionCard className="overflow-hidden">
                          <div
                            className="relative h-[90px] flex items-end justify-center pb-4 overflow-hidden rounded-t-[16px]"
                            style={{ background: 'linear-gradient(to bottom, rgba(20,20,25,0.4), rgba(10,10,12,0.9))' }}
                          >
                            <motion.div
                              layout
                              className="text-white font-medium px-4 py-1.5 rounded-[8px] select-none shadow-lg backdrop-blur-sm"
                              style={{
                                backgroundColor: `${mockSettings.subBgColor}${Math.round(parseInt(mockSettings.subBgOpacity) * 2.55).toString(16).padStart(2, '0')}`,
                                fontSize: `${parseInt(mockSettings.subSize) / 100 * 14}px`,
                              }}
                            >
                              ようこそ、新世界へ — Welcome to the new world
                            </motion.div>
                          </div>
                          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <Eye size={12} className="text-zinc-500" />
                            <span className="text-[11.5px] font-medium text-zinc-400">Live Preview</span>
                          </div>
                        </SectionCard>

                        <div>
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
                              <div className="flex items-center gap-3">
                                <motion.div
                                  whileHover={{ scale: 1.1, rotate: 2 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-[28px] h-[28px] rounded-[8px] border border-white/20 cursor-pointer overflow-hidden relative flex-shrink-0"
                                  style={{ backgroundColor: mockSettings.subBgColor, boxShadow: `0 4px 12px ${mockSettings.subBgColor}60` }}
                                >
                                  <input
                                    type="color"
                                    value={mockSettings.subBgColor}
                                    onChange={e => updateSetting('subBgColor', e.target.value)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-[150%] h-[150%] -top-1 -left-1"
                                  />
                                </motion.div>
                                <span className="text-[12px] text-zinc-300 font-mono font-medium tracking-wider">
                                  {mockSettings.subBgColor.toUpperCase()}
                               </span>
                              </div>
                            </SettingRow>
                          </SectionCard>
                        </div>
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