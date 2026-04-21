
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Loader2, Eye, EyeOff, Check, X as XIcon, Shield, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

// --- Design Styles ---
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-input::placeholder {
    color: #6b7280;
    opacity: 1;
  }

  @keyframes authFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes authSlideUp {
    from { opacity: 0; transform: translateY(24px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes authFloatUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
    if (passed === 0) return { label: '', color: '', percent: 0 };
    if (passed === 1) return { label: 'Weak', color: '#ef4444', percent: 33 };
    if (passed === 2) return { label: 'Fair', color: '#f59e0b', percent: 66 };
    return { label: 'Strong', color: '#22c55e', percent: 100 };
  }, [passwordChecks]);

  const { user } = useAuth();

  useEffect(() => {
    if (user && open) {
      onClose();
    }
  }, [user, open, onClose]);

  // Inject Styles
  useEffect(() => {
    const id = 'aw-design-styles-auth-modal';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!open) return null;

  const reset = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setShowPassword(false);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === 'login') {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        onClose();
        reset();
      }
    } else {
      if (!displayName.trim()) {
        setError('Display name is required');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }
      if (confirmPassword !== password) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      const result = await signUp(email, password, displayName.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess('Account created! Check your email to confirm, or you may already be logged in.');
        setTimeout(() => { onClose(); reset(); }, 2500);
      }
    }
    setLoading(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const CheckItem: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <div className="flex items-center gap-2">
      {ok ? (
        <Check size={12} className="text-green-400" />
      ) : (
        <div className="h-3 w-3 rounded-full border border-zinc-600" />
      )}
      <span className="text-[11px] transition-colors" style={{ color: ok ? 'var(--aw-text)' : 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
        {label}
      </span>
    </div>
  );

  // Use createPortal to ensure the modal isn't trapped by the Topbar's overflow or stacking context
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: 'authFadeIn 0.25s ease' }}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        style={{ animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          className="relative flex w-full max-w-[880px] overflow-hidden rounded-[20px] shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--aw-bg)', border: '1px solid var(--aw-border)' }}
        >
          {/* ─── Left: Form Panel ─── */}
          <div className="flex flex-1 flex-col px-8 py-8 sm:px-12 sm:py-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-10">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
                style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={switchMode}
                className="group flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300"
                style={{
                  background: 'var(--aw-bg)',
                  borderColor: 'var(--aw-border)',
                  borderWidth: '1px',
                  color: 'var(--aw-muted)',
                  fontFamily: 'var(--aw-font-display)',
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
              >
                {mode === 'login' ? (
                  <>Create account <ArrowRight size={14} style={{ color: 'var(--aw-accent)' }} className="transition-transform group-hover:translate-x-0.5" /></>
                ) : (
                  <>Log in <ArrowRight size={14} style={{ color: 'var(--aw-accent)' }} className="transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </div>

            {/* Title */}
            <div className="mb-8">
              <h2 className="text-[32px] sm:text-[40px] font-black uppercase tracking-tighter text-white leading-none" style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em' }}>
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <p className="mt-2 text-[14px]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
                {mode === 'login'
                  ? 'Welcome back to kotatsuweb'
                  : 'Join the kotatsuweb community'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Display Name (signup) */}
              {mode === 'signup' && (
                <div className="group relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input
                    type="text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-accent); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-muted); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                  />
                  {displayName.trim() && (
                    <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
                </div>
              )}

              {/* Email */}
              <div className="group relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                  style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-accent); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-muted); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                />
                {email.includes('@') && email.includes('.') && (
                  <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />
                )}
              </div>

              {/* Password */}
              <div className="group relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-[44px] text-[14px] text-white outline-none transition-colors"
                  style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-accent); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-muted); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white"
                  style={{ color: 'var(--aw-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength (signup) */}
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-1 space-y-3" style={{ animation: 'authFadeIn 0.2s ease' }}>
                  {/* Strength bar */}
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--aw-s2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                    {passwordStrength.label && (
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: passwordStrength.color, fontFamily: 'var(--aw-font-display)' }}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <CheckItem ok={passwordChecks.length} label="Least 8 characters" />
                    <CheckItem ok={passwordChecks.numberOrSymbol} label="Least one number (0-9) or a symbol" />
                    <CheckItem ok={passwordChecks.mixedCase} label="Lowercase (a-z) and uppercase (A-Z)" />
                  </div>
                </div>
              )}

              {/* Confirm Password (signup) */}
              {mode === 'signup' && (
                <div className="group relative mt-1">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input
                    type="password"
                    placeholder="Re-Type Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-accent); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; e.currentTarget.previousElementSibling?.setAttribute('style', 'color: var(--aw-muted); position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); transition: color 0.3s;'); }}
                  />
                  {confirmPassword.length > 0 && confirmPassword === password && (
                    <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <XIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400" />
                  )}
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="mt-2 rounded-[12px] px-4 py-3 text-xs font-medium text-red-400" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-2 rounded-[12px] px-4 py-3 text-xs font-medium text-green-400" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-[50px] items-center justify-center gap-3 rounded-[14px] text-sm font-bold transition-all disabled:opacity-50"
                style={{
                  background: 'var(--aw-accent)',
                  color: '#04110d',
                  fontFamily: 'var(--aw-font-display)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  boxShadow: '0 8px 32px var(--aw-accent-muted)',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { if (!loading) e.currentTarget.style.filter = 'none'; }}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Sign In' : 'Sign Up'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ─── Right: Decorative Panel ─── */}
          <div className="hidden md:flex w-[380px] flex-shrink-0 flex-col items-center justify-center p-8 relative overflow-hidden" style={{ background: 'var(--aw-s1)', borderLeft: '1px solid var(--aw-border)' }}>
            {/* Gradient background */}
            <div className="absolute inset-0" style={{
              background: 'radial-gradient(circle at top right, var(--aw-accent-soft), transparent 60%)',
            }} />

            {/* Floating cards */}
            <div className="relative z-10 space-y-4 w-full">
              {/* Card 1 */}
              <div className="rounded-[16px] p-5 shadow-xl transition-transform" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)' }}>
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div className="aw-label">Comments</div>
                    <div className="text-[15px] font-bold text-white mt-0.5" style={{ fontFamily: 'var(--aw-font-display)' }}>Join the discussion</div>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="h-2 w-full rounded-full" style={{ background: 'var(--aw-s2)' }} />
                  <div className="h-2 w-3/4 rounded-full" style={{ background: 'var(--aw-s1)' }} />
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-[16px] p-5 shadow-xl transition-transform" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)' }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Your data, your rules</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed pl-[52px]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
                  Secured by Supabase. Your data stays safe.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-[16px] p-5 shadow-xl transition-transform" style={{ background: 'var(--aw-card)', border: '1px solid var(--aw-border)', animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'var(--aw-accent-dim)', color: 'var(--aw-accent)' }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-[15px] font-bold text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Free forever</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>No premium, no paywalls</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default AuthModal;
