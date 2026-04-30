

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Mail, Lock, User, Loader2, Eye, EyeOff,
  Check, X as XIcon, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from './topbarShared';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { signIn, signUp, user } = useAuth();
  
  const [internalOpen, setInternalOpen] = useState(open);
  const [mode, setMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    numberOrSymbol: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
  }), [password]);

  const passwordStrength = useMemo(() => {
    const passed = Object.values(passwordChecks).filter(Boolean).length;
    if (passed === 0) return { label: '', color: 'rgba(255,255,255,0.1)', score: 0 };
    if (passed === 1) return { label: 'Weak', color: '#ef4444', score: 1 };
    if (passed === 2) return { label: 'Fair', color: '#f59e0b', score: 2 };
    return { label: 'Strong', color: '#10b981', score: 3 };
  }, [passwordChecks]);

  // Sync prop with internal state
  useEffect(() => {
    setInternalOpen(open);
    if (open) {
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  // Auto-close if logged in
  useEffect(() => {
    if (user && internalOpen) handleClose();
  }, [user, internalOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && internalOpen) handleClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [internalOpen]);

  const handleClose = () => {
    setInternalOpen(false);
    setTimeout(onClose, 200); // Give time for exit animation
  };

  const reset = () => {
    setEmail(''); setPassword(''); setConfirmPassword(''); setDisplayName('');
    setShowPassword(false); setError(null); setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    else { handleClose(); reset(); }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) { setError('Display name is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    const result = await signUp(email, password, displayName.trim());

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Account created successfully!');
      setTimeout(() => {
        handleClose();
        reset();
      }, 1500);
    }
    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null); 
    setSuccess(null);
    setPassword(''); 
    setConfirmPassword('');
  };

  // ADDED HOVER EFFECTS HERE
  const inputClasses = "w-full rounded-[14px] py-3.5 pl-12 pr-11 text-[14px] text-white outline-none transition-all duration-200 border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.15] focus:bg-white/[0.05] placeholder:text-zinc-500 focus:border-[var(--app-accent)] shadow-sm hover:shadow-md";
  const iconClasses = "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors duration-200 peer-focus:text-[var(--app-accent)] group-hover:text-zinc-300";

  return createPortal(
    <AnimatePresence>
      {internalOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.96, y: 12 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-[420px] overflow-hidden rounded-[24px] pointer-events-auto shadow-2xl flex flex-col"
              style={{
                fontFamily: APP_FONT,
                background: 'var(--app-bg)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.65)',
              }}
              onClick={e => e.stopPropagation()}
            >


              {/* Close Button */}
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white backdrop-blur-md cursor-pointer transition-colors"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <XIcon size={15} strokeWidth={2} />
              </motion.button>

              <div className="px-8 pt-10 pb-8 relative z-10">
                {/* Header Text */}
                <motion.div layout="position" className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-[16px] mb-4 shadow-lg" style={{ background: 'transparent' }}>
                    <div className="drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-[1.1] flex items-center justify-center">
                      <BrandLogo />
                    </div>
                  </div>
                  <h2 className="text-[28px] font-bold text-white leading-tight mb-2 tracking-tight" style={{ fontFamily: DISPLAY_FONT }}>
                    {mode === 'login' ? 'Welcome back' : 'Create an account'}
                  </h2>
                  <p className="text-[14px] text-zinc-400">
                    {mode === 'login' ? 'Enter your details to sign in.' : 'Join the community today.'}
                  </p>
                </motion.div>

                {/* Alerts */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden mb-4">
                      <div className="rounded-[12px] px-4 py-3 text-[13px] font-medium text-red-400 flex items-start gap-2 border border-red-500/20 bg-red-500/10">
                        <XIcon size={16} className="mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{error}</span>
                      </div>
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden mb-4">
                      <div className="rounded-[12px] px-4 py-3 text-[13px] font-medium text-emerald-400 flex items-start gap-2 border border-emerald-500/20 bg-emerald-500/10">
                        <Check size={16} className="mt-0.5 shrink-0" />
                        <span className="leading-relaxed">{success}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Form */}
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-3.5">
                  
                  {/* Dynamic Fields (Signup Only) */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        key="displayNameField"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="relative group">
                          <input type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} required={mode === 'signup'} className={`peer ${inputClasses}`} />
                          <User size={18} className={iconClasses} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email Field */}
                  <motion.div layout="position" className="relative group">
                    <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required className={`peer ${inputClasses}`} />
                    <Mail size={18} className={iconClasses} />
                  </motion.div>

                  {/* Password Field */}
                  <motion.div layout="position" className="relative group">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className={`peer ${inputClasses}`} />
                    <Lock size={18} className={iconClasses} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </motion.div>

                  {/* Password Strength Meter (Signup Only) */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden px-1 pb-1"
                      >
                        <div className="flex gap-1.5 mt-1 mb-3">
                          {[1, 2, 3].map((level) => (
                            <div key={level} className="h-1.5 flex-1 rounded-full bg-white/[0.05] overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full"
                                initial={false}
                                animate={{ 
                                  backgroundColor: passwordStrength.score >= level ? passwordStrength.color : 'transparent',
                                  width: passwordStrength.score >= level ? '100%' : '0%' 
                                }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-1.5 text-[11px] text-zinc-400">
                          <div className={`flex items-center gap-2 transition-colors ${passwordChecks.length ? 'text-emerald-400' : ''}`}>
                            <Check size={12} className={passwordChecks.length ? 'opacity-100' : 'opacity-30'} /> At least 8 characters
                          </div>
                          <div className={`flex items-center gap-2 transition-colors ${passwordChecks.numberOrSymbol ? 'text-emerald-400' : ''}`}>
                            <Check size={12} className={passwordChecks.numberOrSymbol ? 'opacity-100' : 'opacity-30'} /> Contains number or symbol
                          </div>
                          <div className={`flex items-center gap-2 transition-colors ${passwordChecks.mixedCase ? 'text-emerald-400' : ''}`}>
                            <Check size={12} className={passwordChecks.mixedCase ? 'opacity-100' : 'opacity-30'} /> Uppercase & lowercase
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Confirm Password (Signup Only) */}
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        key="confirmPasswordField"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden pt-1"
                      >
                        <div className="relative group">
                          <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={mode === 'signup'} className={`peer ${inputClasses}`} />
                          <Lock size={18} className={iconClasses} />
                          {confirmPassword.length > 0 && confirmPassword === password && (
                            <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button 
                    layout="position"
                    type="submit" 
                    disabled={loading}
                    whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-4 flex h-[48px] items-center justify-center gap-2 rounded-[14px] text-[14px] font-bold text-black transition-all disabled:opacity-50 shadow-lg relative overflow-hidden group"
                    style={{ background: 'var(--app-accent, #ffffff)' }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {loading ? (
                      <Loader2 size={18} className="animate-spin relative z-10" />
                    ) : (
                      <span className="relative z-10 flex items-center gap-2">
                        {mode === 'login' ? 'Sign In' : 'Create Account'} 
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </motion.button>
                </form>
              </div>

              {/* Footer Toggle */}
              <motion.div layout="position" className="p-6 text-center border-t border-white/[0.04] bg-white/[0.01]">
                <p className="text-[13px] text-zinc-400">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    onClick={toggleMode} 
                    className="font-bold hover:underline transition-colors focus:outline-none"
                    style={{ color: 'var(--app-accent, #ffffff)' }}
                  >
                    {mode === 'login' ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </motion.div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AuthModal;