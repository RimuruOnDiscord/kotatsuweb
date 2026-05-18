/* --- START OF FILE InviteRequiredPage.tsx --- */

import React, { useState } from 'react';
import {
  ArrowRight, KeyRound, Loader2, LogOut, ShieldCheck, Sparkles,
  User as UserIcon, ShieldAlert, Sparkle, Mail, Lock, User, Eye, EyeOff, Check,
  LogIn, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { BrandLogo } from './topbarShared';

const TOPBAR_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

const InviteRequiredPage: React.FC = () => {
  const { user, profile, loading, redeemInviteCode, signOut, signIn, signUp } = useAuth();

  // Redeem Code States
  const [inviteCode, setInviteCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline Authentication States
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [signupInviteCode, setSignupInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleRedeem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (redeeming || !inviteCode.trim()) return;

    setRedeeming(true);
    setError(null);
    const result = await redeemInviteCode(inviteCode.trim());
    if (result.error) setError(result.error);
    setRedeeming(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setAuthLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setAuthError(result.error);
    } else {
      setEmail('');
      setPassword('');
    }
    setAuthLoading(false);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!displayName.trim()) { setAuthError('Display name is required'); return; }
    if (!signupInviteCode.trim()) { setAuthError('Invite code is required'); return; }
    if (password.length < 8) { setAuthError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setAuthError('Passwords do not match'); return; }

    setAuthLoading(true);
    const result = await signUp(email, password, displayName.trim(), signupInviteCode.trim());

    if (result.error) {
      setAuthError(result.error);
    } else {
      setAuthSuccess('Account created successfully!');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setDisplayName('');
      setSignupInviteCode('');
    }
    setAuthLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.97, y: 15 },
    visible: {
      opacity: 1, scale: 1, y: 0,
      transition: { type: 'spring', damping: 30, stiffness: 280, staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } }
  };

  // Custom Physics transition for forms
  const viewTransition = { type: 'spring', damping: 24, stiffness: 220 };

  return (
    <div className="relative min-h-screen bg-[#070709] text-white flex items-center justify-center p-4 md:p-8 overflow-hidden" style={{ fontFamily: TOPBAR_FONT }}>
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-text-fill-color: #ffffff !important;
          transition: background-color 999999s ease-in-out 0s;
          caret-color: #ffffff;
        }
      `}</style>

      {/* ══ AMBIENT BACKGROUND GLOWS (Material Dynamic Color Style) ══ */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40 mix-blend-screen">
        <div className="absolute top-[20%] left-[25%] w-[500px] h-[500px] rounded-full bg-[var(--app-accent,#6366f1)] blur-[130px] opacity-[0.14]" />
        <div className="absolute bottom-[20%] right-[25%] w-[450px] h-[450px] rounded-full bg-[var(--app-accent,#6366f1)] blur-[120px] opacity-[0.09]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[880px] z-10"
      >
        <motion.div
          layout
          className="rounded-[32px] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
          style={{
            border: '1px solid color-mix(in srgb, var(--app-accent, #6366f1) 12%, transparent)',
            background: 'linear-gradient(135deg, rgba(15, 15, 20, 0.45) 0%, rgba(10, 10, 15, 0.3) 100%)',
            backdropFilter: 'blur(30px) saturate(160%)',
            WebkitBackdropFilter: 'blur(30px) saturate(160%)',
            boxShadow: '0 40px 100px -30px rgba(0, 0, 0, 0.8), inset 0 0 0 1px rgba(255, 255, 255, 0.03)',
            isolation: 'isolate',
          }}
        >
          {/* Floating Vertical Divider to prevent awkward edge/T-junction overlap at top/bottom rounded corners */}
          <div className="absolute top-8 bottom-8 left-[42%] w-[1px] bg-white/[0.04] hidden md:block pointer-events-none z-20" />

          {/* LEFT SIDE: BRAND / HERO / INFORMATION (42%) */}
          <div
            className="w-full md:w-[42%] p-8 md:p-10 flex flex-col justify-between relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.005) 100%)',
            }}
          >
            {/* Ambient inner glow */}
            <div className="absolute top-0 left-0 w-full h-[150px] bg-gradient-to-b from-[var(--app-accent,#6366f1)]/10 to-transparent pointer-events-none opacity-40" />

            <div className="relative z-10 flex flex-col gap-8">
              {/* Brand Logo & Tagline */}
              <motion.div variants={itemVariants} className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-[16px] transition-all duration-300"
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid color-mix(in srgb, var(--app-accent, #6366f1) 18%, transparent)',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--app-accent, #6366f1) 18%, transparent)',
                  }}
                >
                  <BrandLogo />
                </div>
                <div className="flex flex-col">
                  <span className="text-[14px] font-bold tracking-[0.05em] text-white">KotatsuTV</span>
                  <span className="text-[9px] text-[var(--app-accent,#6366f1)] font-bold tracking-[0.08em] uppercase leading-none mt-0.5">Early Access</span>
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div variants={itemVariants} className="flex flex-col gap-3.5 mt-2">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--app-accent, #6366f1) 20%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--app-accent, #6366f1) 5%, transparent)',
                  }}
                >
                  <ShieldCheck size={13} className="text-[var(--app-accent,#6366f1)]" />
                  <span className="text-[10.5px] font-black uppercase tracking-[0.12em] text-[var(--app-accent,#6366f1)]">Invite Required</span>
                </div>
                <h1 className="text-[25px] md:text-[29px] font-semibold leading-[1.25] tracking-normal text-white/95" style={{ fontFamily: DISPLAY_FONT }}>
                  Unlock Access
                </h1>
                <p className="text-[13.5px] leading-relaxed text-zinc-400 font-medium mt-1">
                  We're currently running a closed test. A valid invite code is required to access the platform's features.
                </p>
              </motion.div>

              {/* Bullet Points */}
              <motion.div variants={itemVariants} className="flex flex-col gap-4 mt-2">
                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent,#6366f1)]/10 text-[var(--app-accent,#6366f1)] mt-0.5">
                    <Sparkle size={10} className="fill-[var(--app-accent,#6366f1)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-white/90">Premium Experience</span>
                    <span className="text-[11.5px] text-zinc-500 mt-0.5">Stunning fluid animations, high-fidelity streams</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent,#6366f1)]/10 text-[var(--app-accent,#6366f1)] mt-0.5">
                    <Sparkle size={10} className="fill-[var(--app-accent,#6366f1)]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-white/90">Exclusive Community</span>
                    <span className="text-[11.5px] text-zinc-500 mt-0.5">Be part of the early stage feedback loop</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom Support text */}
            <motion.div variants={itemVariants} className="relative z-10 text-[11px] font-medium text-zinc-500 mt-8">
              Experiencing issues? <br />
              <a href="#" className="text-zinc-400 hover:text-white transition-colors underline decoration-zinc-600 hover:decoration-white">
                Contact our support team
              </a>
            </motion.div>
          </div>

          {/* RIGHT SIDE: INTERACTION / FORM SIDE (58%) */}
          <div className="w-full md:w-[58%] p-8 md:p-10 flex flex-col justify-center min-h-[440px] relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex h-[240px] w-full items-center justify-center rounded-[24px] border border-white/[0.04] bg-white/[0.01] text-[var(--app-accent,#6366f1)]"
                >
                  <Loader2 size={32} className="animate-spin" />
                </motion.div>
              ) : user ? (
                <motion.div
                  key="redeem"
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  className="flex flex-col gap-6 w-full"
                >
                  {/* Heading */}
                  <div className="flex flex-col gap-1">
                    <h2 className="text-[18px] font-semibold text-white/95" style={{ fontFamily: DISPLAY_FONT }}>Redeem Code</h2>
                    <p className="text-[13px] text-zinc-400">Enter your invitation code to activate your account.</p>
                  </div>

                  {/* Active User Banner */}
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="aw-material-control flex items-center gap-3.5 rounded-[16px] p-4 transition-all duration-300 border border-white/[0.06]"
                    style={{
                      background: 'rgba(255, 255, 255, 0.015)',
                    }}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] bg-black/40 border border-white/[0.08] shadow-md">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-500">
                          <UserIcon size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-semibold text-white/95">
                        {profile?.display_name || 'Logged in user'}
                      </span>
                      <span className="truncate text-[12px] text-zinc-500 mt-1">
                        {user.email}
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={signOut}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-zinc-400 transition-colors outline-none cursor-pointer border border-white/[0.04] bg-white/[0.02]"
                      title="Sign out"
                    >
                      <LogOut size={16} />
                    </motion.button>
                  </motion.div>

                  <form onSubmit={handleRedeem} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 group">
                      <label className="text-[10px] font-extrabold tracking-widest text-zinc-500 uppercase transition-colors group-focus-within:text-[var(--app-accent,#6366f1)]" style={{ fontFamily: DISPLAY_FONT }}>
                        Invitation Key
                      </label>
                      <motion.div
                        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
                        className="aw-material-control group relative flex h-[54px] items-center overflow-hidden rounded-[16px] border border-white/[0.05] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_25%,transparent)]"
                        style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                        }}
                      >
                        <div className="flex h-full w-[52px] shrink-0 items-center justify-center text-zinc-500 transition-colors duration-300 group-focus-within:text-[var(--app-accent,#6366f1)] border-r border-white/[0.03]">
                          <KeyRound size={18} />
                        </div>
                        <input
                          value={inviteCode}
                          onChange={(event) => setInviteCode(event.target.value)}
                          placeholder="Paste your invite code here..."
                          spellCheck={false}
                          autoCapitalize="none"
                          className="h-full flex-1 bg-transparent px-4 font-mono text-[14px] tracking-wide text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-zinc-600 outline-none"
                        />
                      </motion.div>
                    </div>

                    <AnimatePresence mode="popLayout">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -8 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-start gap-2.5 rounded-[16px] border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5 text-[13px] font-medium text-red-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                            <ShieldAlert size={16} className="mt-[2px] shrink-0 text-red-400" />
                            <span className="leading-snug">{error}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      whileHover={{
                        scale: 1.015,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 12px 24px -8px rgba(0,0,0,0.7)'
                      }}
                      whileTap={{ scale: 0.985 }}
                      type="submit"
                      disabled={redeeming || !inviteCode.trim()}
                      className="relative overflow-hidden flex h-[54px] w-full items-center justify-center gap-2 rounded-[16px] text-[14.5px] font-semibold text-[var(--app-accent,#6366f1)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer border"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                        boxShadow: '0 4px 12px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* Premium Shimmer Sweep Animation */}
                      <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--app-accent,#6366f1)]/12 to-transparent pointer-events-none"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                        style={{ transform: 'skewX(-20deg)' }}
                      />

                      {redeeming ? (
                        <Loader2 size={18} className="animate-spin text-[var(--app-accent,#6366f1)]/80 relative z-10" />
                      ) : (
                        <ShieldCheck size={18} className="text-[var(--app-accent,#6366f1)]/90 relative z-10" />
                      )}
                      <span className="relative z-10">Activate Account</span>
                    </motion.button>
                  </form>
                </motion.div>
              ) : authMode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="flex flex-col gap-5 w-full justify-center"
                >
                  {/* Heading */}
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <h2 className="text-[19px] font-semibold text-white/95" style={{ fontFamily: DISPLAY_FONT }}>Welcome Back</h2>
                    <p className="text-[13px] text-zinc-400">Log in to your account to activate access.</p>
                  </div>

                  {/* Alerts */}
                  <AnimatePresence mode="wait">
                    {authError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-[14px] px-4 py-3 text-[13px] font-medium text-red-400 flex items-start gap-2.5 border border-red-500/20 bg-red-500/[0.06] shadow-sm">
                          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-400" />
                          <span className="leading-relaxed">{authError}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form */}
                  <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                    {/* Email */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                    </motion.div>

                    {/* Password */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-11 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                      whileHover={{
                        scale: 1.015,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 12px 24px -8px rgba(0,0,0,0.7)'
                      }}
                      whileTap={{ scale: 0.985 }}
                      type="submit"
                      disabled={authLoading}
                      className="relative overflow-hidden flex h-[50px] w-full items-center justify-center gap-2 rounded-[18px] text-[14.5px] font-semibold text-[var(--app-accent,#6366f1)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer mt-2 border"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                        boxShadow: '0 4px 12px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* Premium Shimmer Sweep Animation */}
                      <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--app-accent,#6366f1)]/12 to-transparent pointer-events-none"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                        style={{ transform: 'skewX(-20deg)' }}
                      />

                      {authLoading ? (
                        <Loader2 size={17} className="animate-spin text-[var(--app-accent,#6366f1)]/80 relative z-10" />
                      ) : (
                        <LogIn size={17} className="text-[var(--app-accent,#6366f1)]/90 relative z-10" />
                      )}
                      <span className="relative z-10">Sign In</span>
                    </motion.button>
                  </form>

                  {/* Footer Switcher */}
                  <div className="text-center text-[13px] text-zinc-500 mt-2 border-t border-white/[0.04] pt-4">
                    Don't have an account?
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="font-bold text-[var(--app-accent,#6366f1)] hover:underline cursor-pointer transition-all ml-1"
                    >
                      Sign up
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="flex flex-col gap-5 w-full justify-center"
                >
                  {/* Heading */}
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <h2 className="text-[19px] font-semibold text-white/95" style={{ fontFamily: DISPLAY_FONT }}>Create Account</h2>
                    <p className="text-[13px] text-zinc-400">Sign up using your invitation key below.</p>
                  </div>

                  {/* Alerts */}
                  <AnimatePresence mode="wait">
                    {authError && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-[14px] px-4 py-3 text-[13px] font-medium text-red-400 flex items-start gap-2.5 border border-red-500/20 bg-red-500/[0.06] shadow-sm">
                          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-400" />
                          <span className="leading-relaxed">{authError}</span>
                        </div>
                      </motion.div>
                    )}
                    {authSuccess && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="rounded-[14px] px-4 py-3 text-[13px] font-medium text-emerald-400 flex items-start gap-2.5 border border-emerald-500/20 bg-emerald-500/[0.06] shadow-sm">
                          <Check size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                          <span className="leading-relaxed">{authSuccess}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Form */}
                  <form onSubmit={handleSignupSubmit} className="flex flex-col gap-3.5">
                    {/* Display Name */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type="text"
                        placeholder="Your display name"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <UserIcon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                    </motion.div>

                    {/* Signup Invite Code */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type="text"
                        placeholder="Invitation key"
                        value={signupInviteCode}
                        onChange={e => setSignupInviteCode(e.target.value)}
                        required
                        spellCheck={false}
                        autoCapitalize="none"
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 font-mono text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <KeyRound size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                    </motion.div>

                    {/* Email */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                    </motion.div>

                    {/* Password */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-11 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </motion.div>

                    {/* Confirm Password */}
                    <motion.div
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.025)' }}
                      className="relative group rounded-[16px] border border-white/[0.06] bg-white/[0.015] transition-all duration-300 focus-within:border-[var(--app-accent,#6366f1)]/60 focus-within:shadow-[0_0_0_1px_color-mix(in_srgb,var(--app-accent,#6366f1)_15%,transparent)]"
                    >
                      <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        className="w-full bg-transparent py-3.5 pl-12 pr-4 text-[14px] text-white outline-none placeholder:text-zinc-600"
                      />
                      <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent,#6366f1)] group-hover:text-zinc-400 transition-colors" />
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                      whileHover={{
                        scale: 1.015,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 12px 24px -8px rgba(0,0,0,0.7)'
                      }}
                      whileTap={{ scale: 0.985 }}
                      type="submit"
                      disabled={authLoading}
                      className="relative overflow-hidden flex h-[50px] w-full items-center justify-center gap-2 rounded-[18px] text-[14.5px] font-semibold text-[var(--app-accent,#6366f1)] disabled:opacity-40 disabled:pointer-events-none cursor-pointer mt-2 border"
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                        boxShadow: '0 4px 12px -5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
                      }}
                    >
                      {/* Premium Shimmer Sweep Animation */}
                      <motion.div
                        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[var(--app-accent,#6366f1)]/12 to-transparent pointer-events-none"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                        style={{ transform: 'skewX(-20deg)' }}
                      />

                      {authLoading ? (
                        <Loader2 size={17} className="animate-spin text-[var(--app-accent,#6366f1)]/80 relative z-10" />
                      ) : (
                        <UserPlus size={17} className="text-[var(--app-accent,#6366f1)]/90 relative z-10" />
                      )}
                      <span className="relative z-10">Create Account</span>
                    </motion.button>
                  </form>

                  {/* Footer Switcher */}
                  <div className="text-center text-[13px] text-zinc-500 mt-2 border-t border-white/[0.04] pt-4">
                    Already have an account?
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="font-bold text-[var(--app-accent,#6366f1)] hover:underline cursor-pointer transition-all ml-1"
                    >
                      Sign in
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Footer text */}
        <motion.div variants={itemVariants} className="mt-6 text-center text-[12px] font-medium text-zinc-600">
          Experiencing issues? Reach out on our Discord server.
        </motion.div>
      </motion.div>
    </div>
  );
};

export default InviteRequiredPage;

/* --- END OF FILE InviteRequiredPage.tsx --- */