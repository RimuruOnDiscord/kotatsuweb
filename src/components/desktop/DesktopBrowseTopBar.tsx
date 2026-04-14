import React, { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { handleRippleMouseDown } from '../../utils/ripple';
import { BrandLogo, topbarNavItems } from '../shared/topbarShared';
import { getStoredTheme, setTheme, THEME_OPTIONS, ThemeKey } from '../../utils/theme';

const THEME_COLORS: Record<ThemeKey, string> = {
  emerald: '#10b981',
  ocean:   '#38bdf8',
  ember:   '#f97316',
  midnight: '#c084fc',
  forest: '#4ade80',
  crimson: '#f87171',
};

const DesktopNavLink: React.FC<{ icon: React.ElementType; label: string; to: string }> = ({ icon: Icon, label, to }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `relative group flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-bold transition-all duration-300 ${
        isActive ? 'text-[var(--app-accent)]' : 'text-gray-400 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <div className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} style={{ backgroundColor: 'var(--app-accent-muted)' }} />
        <div className={`absolute bottom-0 left-0 h-[2px] transition-all duration-300 ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} style={{ backgroundColor: 'var(--app-accent)' }} />
        <Icon className={`relative z-10 h-4 w-4 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="relative z-10">{label}</span>
      </>
    )}
  </NavLink>
);

const DesktopTopbar: React.FC = () => {
  const navigate = useNavigate();
  const [theme, setThemeState] = useState<ThemeKey>('emerald');

  useEffect(() => {
    setThemeState(getStoredTheme());
  }, []);

  const handleThemeSelect = (nextTheme: ThemeKey) => {
    setTheme(nextTheme);
    setThemeState(nextTheme);
  };

  const toggleTheme = () => {
    const currentIndex = THEME_OPTIONS.findIndex((opt) => opt.key === theme);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    handleThemeSelect(THEME_OPTIONS[nextIndex].key);
  };

  return (
    <div className="mx-auto hidden w-full max-w-[1420px] items-center justify-between gap-6 px-4 py-3 lg:flex">
      <div className="flex min-w-0 items-center gap-2">
        <button onClick={() => navigate('/')} className="ripple-button px-1 py-1 transition-opacity hover:opacity-90">
          <BrandLogo />
        </button>

        <nav className="flex items-center gap-1 rounded-2xl p-1.5">
          {topbarNavItems.map((item) => (
            <DesktopNavLink key={item.to} icon={item.icon} label={item.label} to={item.to} />
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Theme picker */}
        <div className="relative">
          <button
            type="button"
            onClick={toggleTheme}
            onMouseDown={handleRippleMouseDown}
            title={`Current Theme: ${theme}`}
            className="ripple-button group flex h-10 items-center gap-3 rounded-full border border-[var(--app-border)] 
                       bg-[var(--app-surface-1)] px-4 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.02]"
          >
            {/* The Indicator Pip */}
            <span
              className="h-4 w-4 shrink-0 rounded-lg"
              style={{ backgroundColor: THEME_COLORS[theme] }}
            />
            
            {/* Cycle icon */}
            <RotateCw 
              size={10} 
              className="text-zinc-600 transition-transform duration-500 group-hover:rotate-180 group-hover:text-zinc-400" 
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopTopbar;