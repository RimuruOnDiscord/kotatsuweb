import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette, X, User, Loader2, LogOut,
  Play, Radio, Subtitles, Eye, ChevronDown, Check, FlaskConical, KeyRound, RotateCw, Pipette
} from 'lucide-react';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme, PATTERN_OPTIONS, PatternKey, getStoredPattern, setPattern } from '../../utils/theme';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import InviteManager from './InviteManager';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Avatar & display name' },
  { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme & accent color' },
  { id: 'player', label: 'Player', icon: Play, desc: 'Playback preferences' },
  { id: 'streaming', label: 'Streaming', icon: Radio, desc: 'Quality & sources' },
  { id: 'subtitles', label: 'Subtitles', icon: Subtitles, desc: 'Subtitle styling' },
  { id: 'nsfw', label: 'NSFW', icon: Eye, desc: 'Adult content & privacy' },
  { id: 'invites', label: 'Invites', icon: KeyRound, desc: 'Generate one-time access codes' },
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

// ─── Color Utilities ────────────────────────────────────────────────────────
const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
};

// ─── Color Wheel Component ──────────────────────────────────────────────────
const ColorWheel: React.FC<{ color: string; onChange: (hex: string) => void }> = ({ color, onChange }) => {
  const [localHsl, setLocalHsl] = useState(() => hexToHsl(color));
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Sync with prop when NOT dragging
  useEffect(() => {
    if (!isDragging) setLocalHsl(hexToHsl(color));
  }, [color, isDragging]);

  const handleInteraction = (clientX: number, clientY: number, isFinal = false) => {
    if (!wheelRef.current) return;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = rect.width / 2;
    const newS = Math.min(100, Math.max(0, (dist / maxDist) * 100));

    if (isFinal) {
      onChange(hslToHex(Math.round(angle), Math.round(newS), localHsl.l));
    } else {
      setLocalHsl({ h: Math.round(angle), s: Math.round(newS), l: localHsl.l });
    }
  };

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => handleInteraction(e.clientX, e.clientY);
    const up = (e: MouseEvent) => {
      setIsDragging(false);
      handleInteraction(e.clientX, e.clientY, true);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [isDragging, localHsl.l]);

  const localHex = hslToHex(localHsl.h, localHsl.s, localHsl.l);

  return (
    <div className="flex flex-col items-center gap-5 p-1">
      <div
        ref={wheelRef}
        onMouseDown={(e) => { setIsDragging(true); handleInteraction(e.clientX, e.clientY); }}
        className="relative w-40 h-40 rounded-full cursor-crosshair shadow-[0_0_20px_rgba(0,0,0,0.4)] overflow-hidden"
        style={{
          background: `conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`,
        }}
      >
        {/* Saturation Overlay - Inset slightly to avoid edge bleeding */}
        <div className="absolute inset-[0.5px] rounded-full" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 100%)', opacity: 0.15 }} />

        {/* Value/Lightness Overlay */}
        <div className="absolute inset-0 rounded-full" style={{ background: 'black', opacity: Math.max(0, (50 - localHsl.l) / 100 * 2) }} />

        {/* Pointer */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] -translate-x-1/2 -translate-y-1/2 transition-[background-color] duration-200 z-20"
          style={{
            backgroundColor: localHex,
            left: `${50 + (localHsl.s / 2) * Math.cos(localHsl.h * (Math.PI / 180))}%`,
            top: `${50 + (localHsl.s / 2) * Math.sin(localHsl.h * (Math.PI / 180))}%`
          }}
        />

        <div className="absolute inset-[34%] rounded-full bg-[#111] shadow-inner flex items-center justify-center z-10">
          <div className="w-[70%] h-[70%] rounded-full shadow-lg transition-[background-color] duration-200" style={{ backgroundColor: localHex }} />
        </div>
      </div>

      <div className="w-full space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-500">
            <span>Lightness</span>
            <span className="text-white/80">{localHsl.l}%</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-zinc-800/50 overflow-hidden border border-white/5">
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, #000, ${hslToHex(localHsl.h, localHsl.s, 50)}, #fff)` }} />
            <input
              type="range" min="10" max="90"
              value={localHsl.l}
              onInput={(e: any) => setLocalHsl({ ...localHsl, l: parseInt(e.target.value) })}
              onChange={(e) => onChange(hslToHex(localHsl.h, localHsl.s, parseInt(e.target.value)))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-black/20 pointer-events-none shadow-md z-20"
              style={{ left: `${localHsl.l}%`, transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ThemePicker ─────────────────────────────────────────────────────────────
const ThemePicker: React.FC<{ theme: ThemeKey; onThemeChange: (theme: ThemeKey) => void }> = ({ theme, onThemeChange }) => {
  const isCustom = theme.startsWith('#');
  const customColor = isCustom ? theme : '#3b82f6';
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="flex flex-wrap gap-2.5">
        {/* Static Theme Blocks */}
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.key;
          return (
            <motion.button
              key={option.key}
              variants={fadeUpItem}
              onClick={() => { onThemeChange(option.key); setShowPicker(false); }}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-all border"
              style={{
                backgroundColor: option.color,
                borderColor: active ? 'white' : 'rgba(255,255,255,0.1)',
                boxShadow: active ? `0 0 15px ${option.color}40` : 'none'
              }}
              title={option.label}
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg"
                  >
                    <Check size={12} strokeWidth={3.5} className="text-black" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}

        {/* Custom Color Block with Popover */}
        <div className="relative">
          <motion.button
            variants={fadeUpItem}
            onClick={() => {
              if (!isCustom) onThemeChange(customColor);
              setShowPicker(!showPicker);
            }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-12 h-12 rounded-xl flex items-center justify-center transition-all border group"
            style={{
              backgroundColor: isCustom ? customColor : 'rgba(255,255,255,0.03)',
              borderColor: isCustom ? 'white' : 'rgba(255,255,255,0.08)',
              boxShadow: isCustom ? `0 0 20px ${customColor}50` : 'none'
            }}
            title="Custom Color"
          >
            {!isCustom && <Pipette size={18} className="text-zinc-500 group-hover:text-white transition-colors" />}
            {isCustom && (
              <AnimatePresence>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-lg"
                >
                  <Check size={12} strokeWidth={3.5} className="text-black" />
                </motion.div>
              </AnimatePresence>
            )}
          </motion.button>
        </div>
      </div>

      {/* Utmost Corner Popover */}
      <AnimatePresence>
        {showPicker && isCustom && (
          <motion.div
            key="custom-picker-popover"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute left-0 top-full mt-4 z-[100] w-[240px]"
            style={{ filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.7))' }}
          >

            <div className="relative p-5 rounded-[24px] border border-white/10 bg-[#1a1a1a] backdrop-blur-3xl shadow-2xl overflow-hidden">
              <ColorWheel color={customColor} onChange={onThemeChange} />

              <div className="mt-6 flex flex-col gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-mono text-[10px]">#</span>
                  <input
                    type="text"
                    value={customColor.replace('#', '')}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9a-fA-F]/g, '').substring(0, 6);
                      onThemeChange(`#${v}`);
                    }}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl pl-7 pr-3 py-2 text-white font-mono text-[12px] outline-none transition-all focus:border-[var(--app-accent)]/30 uppercase"
                    placeholder="HEX"
                  />
                </div>
                <div className="flex justify-between gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <button
                      key={c}
                      onClick={() => onThemeChange(c)}
                      className="flex-1 h-7 rounded-lg border border-white/5 transition-all hover:scale-105 active:scale-95"
                      style={{ backgroundColor: c }}
                    />
                  ))}
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
    className={`rounded-[14px] shadow-lg ${className}`}
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
    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 cursor-default group hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]`}
    style={!last ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
  >
    <div className="flex flex-col pr-2 sm:pr-6">
      <span className="text-[13.5px] text-white/95 font-medium transition-colors group-hover:text-white">{title}</span>
      {description && <span className="text-[11.5px] text-zinc-400 mt-0.5 leading-relaxed">{description}</span>}
    </div>
    <div className="flex-shrink-0 self-start sm:self-center">{children}</div>
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.p variants={fadeUpItem} className="text-[10.5px] font-bold tracking-[0.15em] uppercase text-zinc-500 mb-2.5 px-1">
    {children}
  </motion.p>
);

const Toggle: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => (
  <motion.button
    onClick={onChange}
    whileHover={disabled ? {} : { scale: 1.05 }}
    whileTap={disabled ? {} : { scale: 0.9 }}
    className={`relative flex h-[24px] w-11 items-center rounded-full p-[3px] transition-colors duration-300 focus:outline-none ${disabled ? 'cursor-not-allowed opacity-40' : ''} ${checked ? 'justify-end' : 'justify-start'}`}
    style={{
      backgroundColor: checked ? 'var(--app-accent)' : 'rgba(255,255,255,0.1)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
    }}
    disabled={disabled}
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
    <div className={`relative min-w-[140px] sm:min-w-[160px] w-full sm:w-auto ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
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
            className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-full sm:w-max min-w-full py-1.5 rounded-[12px] shadow-[0_16px_40px_rgba(0,0,0,0.6)] overflow-hidden backdrop-blur-xl border z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
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
                  <span className={sel ? 'font-medium tracking-wide truncate' : 'truncate'}>{opt}</span>
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
const VISIBILITY_OPTIONS = ['Public', 'Friends', 'Private'];
const toVisibilityLabel = (value?: string) => value === 'friends' ? 'Friends' : value === 'private' ? 'Private' : 'Public';
const toVisibilityValue = (label: string) => label.toLowerCase() as 'public' | 'friends' | 'private';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile?: (userId: string) => void; // <-- Add this line
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, onOpenProfile }) => {
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
  const [profileVisibility, setProfileVisibility] = useState('Public');
  const [activityVisibility, setActivityVisibility] = useState('Public');
  const [watchingVisibility, setWatchingVisibility] = useState('Public');
  const [imgError, setImgError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mockSettings, setMockSettings] = useState({
    autoplay: true, autoNext: true, volume: '100%',
    preferredSource: 'kiwi', audioLang: 'sub', hybridAudio: false,
    showSubs: true, subPosition: 'Bottom', subSize: '100%', subBgOpacity: '70%', subBgColor: '#000000',
    skipOp: true, skipEd: true, showSpoilers: true, listFormat: 'Grid',
    posterStyle: 'Standard', fontFamily: 'Inter (Sans)', titleCase: 'Original',
    cinematicGlow: true, blurIntensity: 'Medium (Standard)', reducedMotion: false,
    netflixPlayer: false, allowHanime: false, allowAnix: false, allowHH: false, allowKiwi: true, allowBee: true, allowAlly: true, allowGogo: false,
    showNSFW: false, hideNSFWFromHistory: true, hideNSFWFromBookmarks: true, passwordProtectNSFW: false
  });

  const loadPlayerSettings = () => ({
    autoplay: localStorage.getItem('watchAutoPlay') !== 'false',
    autoNext: localStorage.getItem('watchAutoSkip') !== 'false',
    volume: localStorage.getItem('watchVolume') || '100%',
    preferredSource: localStorage.getItem('watchPreferredSource') || 'kiwi',
    audioLang: localStorage.getItem('watchAudioLang') || 'sub',
    hybridAudio: false,
    netflixPlayer: localStorage.getItem('watchNetflixPlayer') === 'true',
    showNSFW: localStorage.getItem('nsfwShowContent') === 'true',
    hideNSFWFromHistory: localStorage.getItem('nsfwHideHistory') !== 'false',
    hideNSFWFromBookmarks: localStorage.getItem('nsfwHideBookmarks') !== 'false',
    passwordProtectNSFW: localStorage.getItem('nsfwPasswordProtect') === 'true',
    allowHanime: localStorage.getItem('nsfwAllowHanime') === 'true',
    allowHH: localStorage.getItem('nsfwAllowHH') === 'true',
  });

  const updateSetting = (key: keyof typeof mockSettings, val: any) => {
    setMockSettings(prev => {
      const updated = { ...prev, [key]: val };

      if (key === 'autoplay') {
        localStorage.setItem('watchAutoPlay', String(val));
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'autoNext') {
        localStorage.setItem('watchAutoSkip', String(val));
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'volume') {
        localStorage.setItem('watchVolume', val);
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'preferredSource') {
        localStorage.setItem('watchPreferredSource', val);
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'audioLang') {
        localStorage.setItem('watchAudioLang', val);
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'netflixPlayer') {
        localStorage.setItem('watchNetflixPlayer', String(val));
        window.dispatchEvent(new Event('player-settings-changed'));
      } else if (key === 'showNSFW') {
        localStorage.setItem('nsfwShowContent', String(val));
        window.dispatchEvent(new Event('nsfw-settings-changed'));
      } else if (key === 'hideNSFWFromHistory') {
        localStorage.setItem('nsfwHideHistory', String(val));
      } else if (key === 'hideNSFWFromBookmarks') {
        localStorage.setItem('nsfwHideBookmarks', String(val));
      } else if (key === 'passwordProtectNSFW') {
        localStorage.setItem('nsfwPasswordProtect', String(val));
      } else if (key === 'allowHanime') {
        localStorage.setItem('nsfwAllowHanime', String(val));
        window.dispatchEvent(new Event('nsfw-settings-changed'));
      } else if (key === 'allowHH') {
        localStorage.setItem('nsfwAllowHH', String(val));
        window.dispatchEvent(new Event('nsfw-settings-changed'));
      }

      return updated;
    });
  };

  useEffect(() => {
    const loaded = loadPlayerSettings();
    setMockSettings(prev => ({ ...prev, ...loaded }));
  }, []);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarUrlInput(profile.avatar_url || '');
      setProfileVisibility(toVisibilityLabel(profile.profile_visibility));
      setActivityVisibility(toVisibilityLabel(profile.activity_visibility));
      setWatchingVisibility(toVisibilityLabel(profile.watching_status_visibility));
    }
    setSaveError(null); setSaveSuccess(false);
  }, [profile, open]);

  useEffect(() => { setImgError(false); }, [avatarUrlInput]);

  useLayoutEffect(() => {
    const isCustom = currentTheme.startsWith('#');
    const isDynamic = currentTheme === 'dynamic';
    const t = isCustom
      ? { color: currentTheme }
      : isDynamic
        ? { color: '#ffffff' } // Placeholder for settings modal when dynamic is on
        : THEME_OPTIONS.find(t => t.key === currentTheme);

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
        profile_visibility: toVisibilityValue(profileVisibility),
        activity_visibility: toVisibilityValue(activityVisibility),
        watching_status_visibility: toVisibilityValue(watchingVisibility),
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

  const visibleTabs = useMemo(() => TABS, []);

  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) {
      setActiveTab('profile');
    }
  }, [activeTab, visibleTabs]);

  const activeTabMeta = visibleTabs.find(t => t.id === activeTab) || visibleTabs[0];
  const isCustomTheme = currentTheme.startsWith('#');
  const isDynamicTheme = currentTheme === 'dynamic';
  const activeThemeDef = isCustomTheme
    ? { color: currentTheme }
    : isDynamicTheme
      ? { color: '#ffffff' }
      : (THEME_OPTIONS.find(t => t.key === currentTheme) || THEME_OPTIONS[0]);

  // Mobile Styles specifically ensure height constraints are respected to prevent layout blowout
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 md:p-4 lg:p-6 pointer-events-none">

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              // Flex-col on mobile (stack), flex-row on desktop (side-by-side)
              className="aw-material-modal relative flex flex-col md:flex-row w-full max-w-[800px] h-[100dvh] md:h-[80vh] md:max-h-[720px] md:rounded-[20px] pointer-events-auto overflow-hidden"
              style={modalStyles}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Mobile Header & Tabs ── */}
              <div className="md:hidden flex flex-col flex-shrink-0 bg-[rgba(255,255,255,0.015)] border-b border-white/[0.08] pt-[env(safe-area-inset-top)]">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h2 className="text-[20px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      Settings
                    </h2>
                    <p className="text-[11.5px] text-zinc-400 mt-0.5 truncate font-medium max-w-[200px]" title={user?.email ?? ''}>
                      {user?.email ?? 'Not signed in'}
                    </p>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 border border-white/10"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                {/* Horizontal Scroll Tabs for Mobile */}
                <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar px-3 pb-3">
                  {visibleTabs.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors outline-none ${active ? 'bg-[var(--app-accent-muted)] text-white border border-[var(--app-accent-soft)]' : 'bg-white/[0.03] text-zinc-400 border border-transparent'
                          }`}
                      >
                        <tab.icon size={14} className={active ? 'text-[var(--app-accent)]' : ''} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>


              {/* ── Desktop Sidebar ── */}
              <aside
                className="hidden md:flex flex-col w-[220px] flex-shrink-0 py-6"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="px-6 mb-8">
                  <h2 className="text-[20px] text-white" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                    Settings
                  </h2>
                  <p className="text-[11.5px] text-zinc-400 mt-1.5 truncate font-medium" title={user?.email ?? ''}>
                    {user?.email ?? 'Not signed in'}
                  </p>
                </div>

                <nav className="flex-1 flex flex-col gap-1.5 px-3">
                  {visibleTabs.map(tab => {
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
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-left outline-none"
                      >
                        <motion.div animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : undefined }}>
                          <tab.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                        </motion.div>
                        <span className="leading-none">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                {user && (
                  <div className="px-3 pt-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <motion.button
                      onClick={handleLogout}
                      whileHover={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: '#fca5a5' }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.1 }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-zinc-400 outline-none"
                    >
                      <LogOut size={16} strokeWidth={2} />
                      Log out
                    </motion.button>
                  </div>
                )}
              </aside>


              {/* ── Content Area ── */}
              <div className="flex flex-col flex-1 min-w-0 bg-white/[0.01]">

                {/* Notification Toast */}


                {/* Desktop Content Header */}
                <div
                  className="aw-material-modal-header hidden md:flex items-center justify-between px-8 py-6 flex-shrink-0"
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
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                {/* Mobile Content Descriptor */}
                <div className="md:hidden flex px-4 py-3 bg-white/[0.02] border-b border-white/[0.04]">
                  <p className="text-[12px] text-zinc-400 font-medium">
                    {activeTabMeta.desc}
                  </p>
                </div>

                {/* Scrollable Form Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:px-8 md:py-6 pb-24 md:pb-6" style={{ scrollbarGutter: 'stable' }}>

                  {/* Custom CSS for dropdowns to work properly inside overflow main */}
                  <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
                  `}</style>

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
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 p-4 sm:p-5">
                                  <motion.div
                                    className="relative flex-shrink-0 self-center sm:self-auto"
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
                                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: 'var(--app-accent)', boxShadow: '0 0 0 3px var(--app-bg)' }}
                                    >
                                      <Eye size={12} strokeWidth={3} className="text-black" />
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
                                <div className="p-4 sm:p-5">
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

                            <div className="flex flex-col gap-2">
                              <SectionLabel>Profile Privacy</SectionLabel>
                              <SectionCard className="overflow-visible">
                                <div className="flex flex-col gap-3 p-4 sm:p-5">
                                  {[
                                    { label: 'Profile', desc: 'Who can find and open your profile.', value: profileVisibility, onChange: setProfileVisibility },
                                    { label: 'Activity', desc: 'Who can see comments, bookmarks, and watch history.', value: activityVisibility, onChange: setActivityVisibility },
                                    { label: 'Watching Now', desc: 'Who can see live watching status cards.', value: watchingVisibility, onChange: setWatchingVisibility },
                                  ].map(item => (
                                    <div key={item.label} className="flex flex-col gap-3 rounded-[12px] border border-white/[0.06] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="min-w-0">
                                        <p className="text-[13px] font-regular text-white">{item.label}</p>
                                        <p className="mt-0.5 text-[11.5px] font-medium text-zinc-500">{item.desc}</p>
                                      </div>
                                      <Select value={item.value} options={VISIBILITY_OPTIONS} onChange={item.onChange} />
                                    </div>
                                  ))}
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

                            <motion.div variants={fadeUpItem} className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-2 sm:mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-[12px] px-6 py-3 sm:py-2.5 text-[13.5px] font-bold text-black disabled:opacity-50"
                                style={{ backgroundColor: 'var(--app-accent)', minWidth: 120 }}
                              >
                                {isSaving ? <Loader2 size={15} className="animate-spin" /> : 'Save changes'}
                              </motion.button>
                            </motion.div>

                            {/* Mobile Logout Button */}
                            {user && (
                              <motion.div variants={fadeUpItem} className="md:hidden mt-4 pt-4 border-t border-white/[0.06]">
                                <motion.button
                                  onClick={handleLogout}
                                  whileTap={{ scale: 0.97 }}
                                  className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] bg-red-500/10 text-red-400 font-bold border border-red-500/20 outline-none"
                                >
                                  <LogOut size={16} /> Log Out
                                </motion.button>
                              </motion.div>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ── Appearance ── */}
                    {activeTab === 'appearance' && (
                      <motion.div
                        key="appearance"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-8"
                      >
                        <div className="flex flex-col gap-3">
                          <SectionLabel>Theme & Accent Color</SectionLabel>
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
                        className="flex flex-col gap-6"
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
                        className="flex flex-col gap-6"
                      >
                        <div>
                          <SectionLabel>Source & Audio</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Preferred source" description="Which source to try first when loading">
                              <Select value={mockSettings.preferredSource} options={['kiwi', 'bee', 'ally']} onChange={v => updateSetting('preferredSource', v)} />
                            </SettingRow>
                            <SettingRow title="Audio language" description="Preferred audio type">
                              <Select value={mockSettings.audioLang} options={['sub', 'dub']} onChange={v => updateSetting('audioLang', v)} />
                            </SettingRow>
                            <SettingRow title="Hybrid audio" description="Sub video + dub audio" last>
                              <Toggle checked={false} onChange={() => { }} disabled />
                            </SettingRow>
                          </SectionCard>
                        </div>


                        <div>
                          <SectionLabel>Source Access</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Allow Kiwi Source" description="Enable playback from Kiwi servers">
                              <Toggle checked={mockSettings.allowKiwi} onChange={() => updateSetting('allowKiwi', !mockSettings.allowKiwi)} />
                            </SettingRow>
                            <SettingRow title="Allow Bee Source" description="Enable playback from Bee servers">
                              <Toggle checked={mockSettings.allowBee} onChange={() => updateSetting('allowBee', !mockSettings.allowBee)} />
                            </SettingRow>
                            <SettingRow title="Allow Ally Source" description="Enable playback from Ally servers">
                              <Toggle checked={mockSettings.allowAlly} onChange={() => updateSetting('allowAlly', !mockSettings.allowAlly)} />
                            </SettingRow>
                            <SettingRow title="Allow Gogo Source" description="Legacy provider with variable stability" last>
                              <Toggle checked={mockSettings.allowGogo} onChange={() => updateSetting('allowGogo', !mockSettings.allowGogo)} />
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
                              className="text-white font-medium px-4 py-1.5 rounded-[8px] select-none shadow-lg backdrop-blur-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[90%]"
                              style={{
                                backgroundColor: `${mockSettings.subBgColor}${Math.round(parseInt(mockSettings.subBgOpacity) * 2.55).toString(16).padStart(2, '0')}`,
                                fontSize: `${parseInt(mockSettings.subSize) / 100 * 14}px`,
                              }}
                            >
                              ようこそ、新世界へ — Welcome
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
                    {/* ── NSFW ── */}
                    {activeTab === 'nsfw' && (
                      <motion.div
                        key="nsfw"
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        <div>
                          <SectionLabel>General Access</SectionLabel>
                          <SectionCard>
                            <SettingRow title="Show NSFW Content" description="Include adult-oriented titles in search and browse" last>
                              <Toggle checked={mockSettings.showNSFW} onChange={() => updateSetting('showNSFW', !mockSettings.showNSFW)} />
                            </SettingRow>
                          </SectionCard>
                        </div>

                        {mockSettings.showNSFW ? (
                          <div className="flex flex-col gap-6">
                            <div>
                              <SectionLabel>Providers</SectionLabel>
                              <SectionCard>
                                <SettingRow title="Hanime.tv" description="Streaming from hanime.tv">
                                  <Toggle checked={mockSettings.allowHanime} onChange={() => updateSetting('allowHanime', !mockSettings.allowHanime)} />
                                </SettingRow>
                                <SettingRow title="HentaiHaven" description="Legacy community sources" last>
                                  <Toggle checked={mockSettings.allowHH} onChange={() => updateSetting('allowHH', !mockSettings.allowHH)} />
                                </SettingRow>
                              </SectionCard>
                            </div>

                            <div>
                              <SectionLabel>Privacy & Advanced</SectionLabel>
                              <SectionCard>
                                <SettingRow title="Incognito Mode" description="Don't show adult content in Watch History">
                                  <Toggle checked={mockSettings.hideNSFWFromHistory} onChange={() => updateSetting('hideNSFWFromHistory', !mockSettings.hideNSFWFromHistory)} />
                                </SettingRow>
                                <SettingRow title="Hidden Bookmarks" description="Keep adult titles in a separate, hidden collection">
                                  <Toggle checked={mockSettings.hideNSFWFromBookmarks} onChange={() => updateSetting('hideNSFWFromBookmarks', !mockSettings.hideNSFWFromBookmarks)} />
                                </SettingRow>
                                <SettingRow title="Password Protection" description="Require PIN to access NSFW tab or content" last>
                                  <Toggle checked={mockSettings.passwordProtectNSFW} onChange={() => updateSetting('passwordProtectNSFW', !mockSettings.passwordProtectNSFW)} />
                                </SettingRow>
                              </SectionCard>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center border border-dashed border-white/10 rounded-[16px] bg-white/[0.02]">
                            <p className="text-[13px] text-zinc-500 font-medium">Enable adult content to view advanced provider and privacy settings.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {activeTab === 'invites' && (
                      <InviteManager
                        onClose={onClose}
                        onOpenProfile={onOpenProfile} // <-- Pass it down here
                      />
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
