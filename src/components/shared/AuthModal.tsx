import React, { useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Mail, Lock, User, Loader2, Eye, EyeOff, Check, X as XIcon, Shield, MessageSquare, Sparkles } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

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
  
  React.useEffect(() => {
    if (user && open) {
      onClose();
    }
  }, [user, open, onClose]);

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
      <span className={`text-[11px] transition-colors ${ok ? 'text-green-400' : 'text-zinc-500'}`}>
        {label}
      </span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md"
        onClick={onClose}
        style={{ animation: 'authFadeIn 0.25s ease' }}
      />

      {/* Modal Container */}
      <div
        className="fixed inset-0 z-[201] flex items-center justify-center p-3 sm:p-6"
        style={{ animation: 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          className="relative flex w-full max-w-[880px] overflow-hidden rounded-3xl border border-white/[0.08] shadow-[0_50px_150px_rgba(0,0,0,0.7)]"
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--app-bg)' }}
        >
          {/* ─── Left: Form Panel ─── */}
          <div className="flex flex-1 flex-col px-8 py-8 sm:px-12 sm:py-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-10">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition-all hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={switchMode}
                className="group flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-semibold tracking-wide text-zinc-400 transition-all hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
              >
                {mode === 'login' ? (
                  <>Create an account <ArrowRight size={14} className="text-[var(--app-accent)] transition-transform group-hover:translate-x-0.5" /></>
                ) : (
                  <>Log in to account <ArrowRight size={14} className="text-[var(--app-accent)] transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </div>

            {/* Title */}
            <div className="mb-8">
              <h2 className="text-[32px] font-extrabold tracking-tight text-white leading-none">
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {mode === 'login'
                  ? 'Welcome back to kotatsuweb'
                  : 'Join the kotatsuweb community'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-1">
              {/* Display Name (signup) */}
              {mode === 'signup' && (
                <div className="group relative border-b border-white/[0.08] transition-colors focus-within:border-[var(--app-accent)]/50">
                  <User size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent)] transition-colors" />
                  <input
                    type="text"
                    placeholder="Display name"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full bg-transparent py-4 pl-8 pr-4 text-[15px] text-white outline-none placeholder:text-zinc-600"
                  />
                  {displayName.trim() && (
                    <Check size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
                </div>
              )}

              {/* Email */}
              <div className="group relative border-b border-white/[0.08] transition-colors focus-within:border-[var(--app-accent)]/50">
                <Mail size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent)] transition-colors" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent py-4 pl-8 pr-4 text-[15px] text-white outline-none placeholder:text-zinc-600"
                />
                {email.includes('@') && email.includes('.') && (
                  <Check size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400" />
                )}
              </div>

              {/* Password */}
              <div className="group relative border-b border-white/[0.08] transition-colors focus-within:border-[var(--app-accent)]/50">
                <Lock size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent)] transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-transparent py-4 pl-8 pr-12 text-[15px] text-white outline-none placeholder:text-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength (signup) */}
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-3 space-y-2.5" style={{ animation: 'authFadeIn 0.2s ease' }}>
                  {/* Strength bar */}
                  <div className="flex items-center gap-3">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                    {passwordStrength.label && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: passwordStrength.color }}>
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
                <div className="group relative border-b border-white/[0.08] transition-colors focus-within:border-[var(--app-accent)]/50 mt-1">
                  <Lock size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--app-accent)] transition-colors" />
                  <input
                    type="password"
                    placeholder="Re-Type Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent py-4 pl-8 pr-4 text-[15px] text-white outline-none placeholder:text-zinc-600"
                  />
                  {confirmPassword.length > 0 && confirmPassword === password && (
                    <Check size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <XIcon size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400" />
                  )}
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-xs font-medium text-green-400">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex items-center justify-center gap-3 rounded-full py-3.5 text-sm font-bold tracking-wide transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, var(--app-accent), color-mix(in srgb, var(--app-accent) 70%, #6366f1))',
                  color: '#000',
                  boxShadow: '0 8px 32px var(--app-accent-muted)',
                }}
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
          <div className="hidden md:flex w-[340px] flex-shrink-0 flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Gradient background */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 30%, var(--app-bg)), color-mix(in srgb, var(--app-accent) 55%, var(--app-bg)) 50%, color-mix(in srgb, var(--app-accent) 15%, var(--app-bg)))',
            }} />
            {/* Geometric shapes */}
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg, white 0%, transparent 60%)' }} />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-3xl rotate-12 opacity-10" style={{ background: 'white' }} />
            <div className="absolute top-1/3 right-8 h-20 w-20 rounded-2xl rotate-45 opacity-10" style={{ background: 'white' }} />

            {/* Floating cards */}
            <div className="relative z-10 space-y-5 w-full">
              {/* Card 1 */}
              <div className="rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] p-5 shadow-xl" style={{ animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s both' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    <MessageSquare size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">Comments</div>
                    <div className="text-lg font-bold text-white">Join the discussion</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-white/15" />
                  <div className="h-2 w-3/4 rounded-full bg-white/10" />
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] p-5 shadow-xl" style={{ animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    <Shield size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Your data, your rules</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-white/50 pl-12">
                  Secured by Supabase. Your data stays safe.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] p-5 shadow-xl" style={{ animation: 'authFloatUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.45s both' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">Free forever</div>
                    <div className="text-[11px] text-white/50">No premium, no paywalls</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </>
  );
};

export default AuthModal;
