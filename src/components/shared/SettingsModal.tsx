import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Palette, X, User, Loader2, LogOut, Upload, Camera } from 'lucide-react';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme } from '../../utils/theme';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

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
            ? 'border-[var(--app-accent)] bg-[var(--app-accent-muted)] shadow-[0_4px_24px_var(--app-accent-soft)] -translate-y-1'
            : 'border-white/[0.05] bg-white/[0.01] hover:border-white/[0.12] hover:bg-white/[0.03]'
            }`}
          style={{
            animationDelay: `${index * 50}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0a0a0a] flex relative z-10">
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

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadAvatarToSupabase(
  userId: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  // Use a unique name each time to avoid browser/CDN caching issues with upsert
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

// ─── Modal ────────────────────────────────────────────────────────────────────
interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('profile');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(getStoredTheme());

  const [displayName, setDisplayName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setAvatarPreview(profile.avatar_url || null);
    }
    setPendingFile(null);
    setSaveError(null);
    setSaveSuccess(false);
  }, [profile, open]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Image must be under 5 MB.');
      return;
    }
    setPendingFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setSaveError(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      let finalAvatarUrl = profile?.avatar_url ?? null;

      if (pendingFile) {
        const { url, error } = await uploadAvatarToSupabase(user.id, pendingFile);
        if (error) {
          setSaveError('Upload failed: ' + error);
          return;
        }
        finalAvatarUrl = url;
      }

      const { error } = await updateProfile({
        avatar_url: finalAvatarUrl,
        display_name: displayName.trim() || profile?.display_name,
      });

      if (error) {
        setSaveError('Save failed: ' + error);
      } else {
        setPendingFile(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err: any) {
      setSaveError(err?.message ?? 'Something went wrong. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    onClose();
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
              className="relative flex flex-col w-full max-w-[680px] h-[85vh] max-h-[780px] overflow-hidden rounded-[20px] pointer-events-auto"
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
                className="flex flex-col px-7 pt-7 pb-0 flex-shrink-0"
                style={{ background: 'var(--app-bg-2, #0f1014)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex justify-between items-start mb-7">
                  <div>
                    <h2
                      className="text-[22px] text-white"
                      style={{ fontFamily: '"Syne", sans-serif', fontWeight: 600, letterSpacing: '-0.01em' }}
                    >
                      Settings
                    </h2>
                    <p className="text-[12px] text-zinc-500 mt-0.5">{user?.email ?? 'Not signed in'}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-zinc-500 hover:text-white transition-colors mt-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)' }}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>

                <nav className="flex items-center gap-1">
                  {(['profile', 'appearance'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-t-xl transition-colors"
                      style={{
                        color: activeTab === tab ? 'white' : 'rgb(113,113,122)',
                        background: activeTab === tab ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      {tab === 'profile'
                        ? <User size={14} strokeWidth={activeTab === 'profile' ? 2 : 1.5} style={{ color: activeTab === 'profile' ? 'var(--app-accent)' : undefined }} />
                        : <Palette size={14} strokeWidth={activeTab === 'appearance' ? 2 : 1.5} style={{ color: activeTab === 'appearance' ? 'var(--app-accent)' : undefined }} />
                      }
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
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

              {/* Content */}
              <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--app-bg, #0a0b0e)' }}>
                <div className="p-7 w-full max-w-[560px] mx-auto min-h-full flex flex-col gap-6">

                  {/* Profile tab */}
                  {activeTab === 'profile' && (
                    <motion.div
                      key="profile"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col gap-6"
                    >
                      {!user ? (
                        <div
                          className="rounded-[14px] p-5 flex flex-col gap-2"
                          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}
                        >
                          <span className="text-[11px] font-semibold tracking-widest uppercase text-red-400">Authentication Required</span>
                          <p className="text-[13px] text-zinc-400">You must be signed in to edit your profile.</p>
                        </div>
                      ) : (
                        <>
                          {/* Avatar upload */}
                          <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
                              Profile Picture
                            </label>
                            <div
                              className="flex items-center gap-5 p-5 rounded-[16px]"
                              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                            >
                              <div
                                className="relative group flex-shrink-0 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <div
                                  className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                  {avatarPreview
                                    ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                    : <User size={28} className="text-zinc-600" strokeWidth={1} />
                                  }
                                </div>
                                <div
                                  className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ background: 'rgba(0,0,0,0.55)' }}
                                >
                                  <Camera size={16} className="text-white" />
                                </div>
                              </div>

                              <div className="flex flex-col gap-2 flex-1 min-w-0">
                                <p className="text-[13px] text-white font-medium truncate">
                                  {pendingFile ? pendingFile.name : (profile?.display_name || 'Your avatar')}
                                </p>
                                <p className="text-[12px] text-zinc-500">
                                  {pendingFile
                                    ? `${(pendingFile.size / 1024).toFixed(0)} KB — ready to save`
                                    : 'JPG, PNG or GIF · max 5 MB'}
                                </p>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-all hover:brightness-125"
                                  style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: 'rgba(255,255,255,0.7)',
                                  }}
                                >
                                  <Upload size={12} />
                                  Choose file
                                </button>
                              </div>

                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/gif,image/webp"
                                className="hidden"
                                onChange={handleFileSelect}
                              />
                            </div>
                          </div>

                          {/* Display name */}
                          <div className="flex flex-col gap-3">
                            <label className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500">
                              Display Name
                            </label>
                            <input
                              type="text"
                              value={displayName}
                              onChange={e => setDisplayName(e.target.value)}
                              placeholder="Your display name"
                              className="w-full rounded-[12px] px-4 py-3 text-[14px] text-white placeholder:text-zinc-600 outline-none transition-all"
                              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
                              onFocus={e => e.currentTarget.style.borderColor = 'var(--app-accent)'}
                              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                            />
                          </div>

                          <AnimatePresence>
                            {saveError && (
                              <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[12px] text-red-400 px-1 -mt-2"
                              >
                                {saveError}
                              </motion.p>
                            )}
                          </AnimatePresence>

                          {/* Footer actions */}
                          <div
                            className="mt-auto pt-6 flex items-center justify-between"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                          >
                            <button
                              onClick={handleLogout}
                              className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[13px] font-medium text-red-400 hover:text-red-300 transition-all"
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <LogOut size={14} strokeWidth={1.5} />
                              Log out
                            </button>

                            <div className="flex items-center gap-4">
                              <AnimatePresence>
                                {saveSuccess && (
                                  <motion.span
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-[12px] font-medium"
                                    style={{ color: 'var(--app-accent)' }}
                                  >
                                    Saved
                                  </motion.span>
                                )}
                              </AnimatePresence>
                              <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="flex items-center gap-2 rounded-[12px] px-6 py-2.5 text-[13px] font-semibold text-black transition-all disabled:opacity-50 active:scale-[0.98] hover:brightness-110"
                                style={{
                                  background: 'var(--app-accent)',
                                  boxShadow: '0 0 24px var(--app-accent-soft)',
                                  minWidth: 110,
                                  justifyContent: 'center',
                                }}
                              >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* Appearance tab — completely untouched */}
                  {activeTab === 'appearance' && (
                    <motion.div
                      key="appearance"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1"
                    >
                      <div className="flex flex-col gap-6">
                        <div className="mb-2">
                          <label className="text-[12px] font-semibold tracking-wide uppercase text-zinc-400 pl-1 mb-2 block">
                            Global Theme Color
                          </label>
                          <p className="text-[13px] text-zinc-500 pl-1 leading-relaxed">
                            Personalize the application's global accent color. This will reflect instantly across all pages and buttons.
                          </p>
                        </div>

                        <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
                      </div>
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