import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowRight, Mail, Lock, User, Loader2, Eye, EyeOff,
  Check, X as XIcon, Play, BookOpen, Star, Gamepad2
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

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

  .aw-input::placeholder { color: #6b7280; opacity: 1; }

  @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes authSlideUp { from { opacity: 0; transform: translateY(24px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes authFadeOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes authSlideDown { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(24px) scale(0.97); } }
  @keyframes authFloatUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'signup';

const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { signIn, signUp } = useAuth();
  const [openState, setOpenState] = useState(open);
  const [isClosing, setIsClosing] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

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

  useEffect(() => {
    if (user && open) onClose();
  }, [user, open, onClose]);

  useEffect(() => {
    const id = 'aw-design-styles-auth-modal';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = DESIGN_STYLES;
      document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setOpenState(true);
      setIsClosing(false);
    } else if (openState) {
      setIsClosing(true);
      const timer = setTimeout(() => { setOpenState(false); setIsClosing(false); }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, openState]);

  if (!openState) return null;

  const reset = () => {
    setEmail(''); setPassword(''); setConfirmPassword(''); setDisplayName('');
    setShowPassword(false); setError(null); setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    else { onClose(); reset(); }
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
      setLoading(false);
    } else {
      onClose(); reset();
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError(null); setSuccess(null);
    setPassword(''); setConfirmPassword('');
  };

  const CheckItem: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <div className="flex items-center gap-2">
      {ok ? <Check size={12} className="text-green-400" /> : <div className="h-3 w-3 rounded-full border border-zinc-600" />}
      <span className="text-[11px] transition-colors" style={{ color: ok ? 'var(--aw-text)' : 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
        {label}
      </span>
    </div>
  );

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md" onClick={onClose}
        style={{ animation: isClosing ? 'authFadeOut 0.3s ease forwards' : 'authFadeIn 0.25s ease' }} />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
        style={{ animation: isClosing ? 'authSlideDown 0.3s cubic-bezier(0.16,1,0.3,1) forwards' : 'authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
        <div className="relative flex w-full max-w-[880px] overflow-hidden rounded-[20px] shadow-[0_40px_80px_rgba(0,0,0,0.7)]"
          onClick={e => e.stopPropagation()} style={{ background: 'var(--aw-bg)', border: '1px solid var(--aw-border)' }}>

          {/* Left: Form Panel */}
          <div className="flex flex-1 flex-col px-8 py-8 sm:px-12 sm:py-10">
            <div className="flex items-center justify-between mb-10">
              <button onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300"
                style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', color: 'var(--aw-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}>
                <ArrowLeft size={18} />
              </button>

              <button onClick={switchMode}
                  className="group flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-300"
                  style={{ background: 'var(--aw-bg)', borderColor: 'var(--aw-border)', borderWidth: '1px', color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-display)', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'var(--aw-s2)'; e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--aw-muted)'; e.currentTarget.style.background = 'var(--aw-bg)'; e.currentTarget.style.borderColor = 'var(--aw-border)'; }}>
                  {mode === 'login' ? (
                    <>Create account <ArrowRight size={14} style={{ color: 'var(--aw-accent)' }} className="transition-transform group-hover:translate-x-0.5" /></>
                  ) : (
                    <>Log in <ArrowRight size={14} style={{ color: 'var(--aw-accent)' }} className="transition-transform group-hover:translate-x-0.5" /></>
                  )}
                </button>
            </div>

            <div className="mb-8">
              <h2 className="text-[32px] sm:text-[40px] font-black uppercase tracking-tighter text-white leading-none" style={{ fontFamily: 'var(--aw-font-display)', letterSpacing: '-0.02em' }}>
                {mode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <p className="mt-2 text-[14px]" style={{ color: 'var(--aw-muted)', fontFamily: 'var(--aw-font-body)' }}>
                {mode === 'login' ? 'Welcome back to kotatsuweb' : 'Join the kotatsuweb community'}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-[12px] px-4 py-3 text-xs font-medium text-red-400" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-[12px] px-4 py-3 text-xs font-medium text-green-400" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                {success}
              </div>
            )}

              {mode === 'login' ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="group relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                </div>

                <div className="group relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-[44px] text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white" style={{ color: 'var(--aw-muted)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={loading}
                  className="mt-6 flex h-[50px] items-center justify-center gap-3 rounded-[14px] text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 8px 32px var(--aw-accent-muted)' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="group relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type="text" placeholder="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                </div>

                <div className="group relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                </div>

                <div className="group relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-[44px] text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white" style={{ color: 'var(--aw-muted)' }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {password.length > 0 && (
                  <div className="mt-1 space-y-3" style={{ animation: 'authFadeIn 0.2s ease' }}>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--aw-s2)' }}>
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${passwordStrength.percent}%`, backgroundColor: passwordStrength.color }} />
                      </div>
                      {passwordStrength.label && (
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: passwordStrength.color, fontFamily: 'var(--aw-font-display)' }}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <CheckItem ok={passwordChecks.length} label="At least 8 characters" />
                      <CheckItem ok={passwordChecks.numberOrSymbol} label="At least one number or symbol" />
                      <CheckItem ok={passwordChecks.mixedCase} label="Lowercase and uppercase letters" />
                    </div>
                  </div>
                )}

                <div className="group relative mt-1">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--aw-muted)' }} />
                  <input type="password" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className="aw-input w-full rounded-[14px] py-3.5 pl-[44px] pr-4 text-[14px] text-white outline-none transition-colors"
                    style={{ background: 'var(--aw-s1)', border: '1px solid var(--aw-border)', fontFamily: 'var(--aw-font-body)' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--aw-accent-dim)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--aw-border)'; }}
                  />
                  {confirmPassword.length > 0 && confirmPassword === password && (
                    <Check size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400" />
                  )}
                  {confirmPassword.length > 0 && confirmPassword !== password && (
                    <XIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400" />
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="mt-6 flex h-[50px] items-center justify-center gap-3 rounded-[14px] text-sm font-bold transition-all disabled:opacity-50"
                  style={{ background: 'var(--aw-accent)', color: '#04110d', fontFamily: 'var(--aw-font-display)', textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 8px 32px var(--aw-accent-muted)' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                </button>
              </form>
            )}
          </div>

          {/* Right: Decorative Panel */}
          <div className="hidden md:flex w-[440px] flex-shrink-0 relative overflow-hidden" style={{ background: 'var(--app-bg-2)', borderLeft: '1px solid var(--aw-border)' }}>
            <div className="absolute inset-0 overflow-hidden bg-[var(--aw-s1)]">
              <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--aw-accent) 25%, var(--aw-s1))' }} />
              <div className="absolute top-[-25%] right-[-10%] w-[120%] h-[80%] rounded-[140px] rotate-[12deg]"
                style={{ background: 'color-mix(in srgb, var(--aw-accent) 60%, var(--aw-s1))' }} />
              <div className="absolute top-[25%] left-[-20%] w-[140%] h-[110%] rounded-[140px] -rotate-6 shadow-[0_-20px_60px_rgba(0,0,0,0.2)]"
                style={{ background: 'var(--aw-accent)' }} />
            </div>

            <div className="relative z-10 w-full h-full flex flex-col justify-center items-center perspective-1000">
              <div className="relative w-full h-[520px]">
                <div className="absolute top-[40px] left-[40px] lg:left-[50px] w-[180px] lg:w-[200px] bg-white rounded-[24px] p-5 lg:p-6 shadow-2xl transition-transform hover:-translate-y-2 hover:shadow-[0_24px_40px_rgba(0,0,0,0.4)]"
                  style={{ animation: 'authFloatUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
                  <div className="text-[12px] font-bold mb-1" style={{ color: 'var(--aw-accent)', fontFamily: 'var(--aw-font-display)' }}>Episodes Watched</div>
                  <div className="text-[26px] lg:text-[28px] font-black text-black leading-none mb-6" style={{ fontFamily: 'var(--aw-font-display)' }}>1,204</div>
                  <div className="relative h-[44px] flex items-end justify-between px-1">
                    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
                      <path d="M0,35 Q15,40 30,25 T60,15 T100,25" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                      <path d="M0,25 Q20,10 40,20 T70,35 T100,20" fill="none" stroke="var(--aw-accent)" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <div className="absolute left-[70%] top-[4px] w-8 h-8 bg-black rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-lg -translate-x-1/2 -translate-y-full">
                      +12
                    </div>
                  </div>
                </div>

                <div className="absolute top-[70px] right-[40px] lg:right-[60px] flex items-center justify-center w-[50px] h-[50px] lg:w-[54px] lg:h-[54px] bg-white rounded-full shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                  style={{ animation: 'authFloatUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
                  <Gamepad2 size={24} style={{ color: '#ec4899' }} strokeWidth={2} />
                </div>

                <div className="absolute top-[170px] right-[50px] lg:right-[80px] flex items-center justify-center w-[44px] h-[44px] lg:w-[48px] lg:h-[48px] bg-white rounded-full shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                  style={{ animation: 'authFloatUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.4s both' }}>
                  <BookOpen size={20} className="text-black" strokeWidth={2.5} />
                </div>

                <div className="absolute top-[210px] left-[30px] flex items-center justify-center w-[40px] h-[40px] bg-white rounded-full shadow-2xl transition-transform hover:scale-110 cursor-pointer"
                  style={{ animation: 'authFloatUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s both' }}>
                  <Play size={18} style={{ color: 'var(--aw-accent)' }} fill="var(--aw-accent)" />
                </div>

                <div className="absolute bottom-[50px] lg:bottom-[40px] left-[50%] -translate-x-[50%] w-[330px] max-w-[90%] bg-white rounded-[24px] p-6 lg:p-7 shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-2"
                  style={{ animation: 'authFloatUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s both' }}>
                  <div className="flex gap-5">
                    <div className="w-[50px] pt-1 space-y-3">
                      <div className="h-1.5 w-8 rounded-full" style={{ background: 'var(--aw-accent)' }} />
                      <div className="h-1.5 w-12 rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-10 rounded-full bg-zinc-200" />
                      <div className="h-1.5 w-full rounded-full bg-zinc-200" />
                    </div>
                    <div className="flex-1 flex flex-col items-start pt-1">
                      <Star size={24} fill="#f59e0b" color="#f59e0b" className="mb-3" />
                      <div className="text-[16px] lg:text-[17px] font-black text-black leading-tight mb-2" style={{ fontFamily: 'var(--aw-font-display)' }}>Never lose your spot</div>
                      <p className="text-[12px] text-zinc-500 leading-relaxed font-medium" style={{ fontFamily: 'var(--aw-font-body)' }}>
                        Sync your reading and watching progress seamlessly across all your devices.
                      </p>
                    </div>
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
