import React, { useState, useEffect } from 'react';
import { Palette, BookOpen, Bell, User, Shield, Sun, Moon, Sparkles } from 'lucide-react';
import AppTopbar from '../components/AppTopbar';
import { THEME_OPTIONS, ThemeKey, getStoredTheme, setTheme } from '../utils/theme';

const APP_FONT = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const ThemePicker: React.FC<{ 
  theme: ThemeKey; 
  onThemeChange: (theme: ThemeKey) => void; 
}> = ({ theme, onThemeChange }) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {THEME_OPTIONS.map((option, index) => (
        <button
          key={option.key}
          onClick={() => onThemeChange(option.key)}
          className={`group p-2 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
            theme === option.key
              ? 'border-[var(--app-accent)] bg-[var(--app-accent-muted)] -translate-y-1 shadow-xl'
              : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }`}
          style={{ 
            animationDelay: `${index * 80}ms`,
            animation: 'fadeInUp 0.6s ease-out forwards'
          }}
        >
          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-[#0d0d0d] flex">
            <div 
              style={{ backgroundColor: option.color }} 
              className="w-[35%] h-full opacity-80"
            />
            <div className="flex-1 p-3 flex flex-col gap-1.5 justify-between">
              <div className="space-y-1.5">
                <div className="h-1 w-full rounded-full bg-white/10" />
                <div className="h-0.5 w-3/4 rounded-full bg-white/8" />
                <div className="h-0.5 w-1/2 rounded-full bg-white/5" />
              </div>
              <div 
                style={{ color: option.color }} 
                className="text-[14px] font-black italic opacity-90"
              >
                Aa
              </div>
            </div>
          </div>
          <div className="pt-3 pb-1 px-1">
            <p className={`text-center text-[12px] font-bold transition-colors ${
              theme === option.key 
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

const SettingsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Appearance');
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>(getStoredTheme());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Apply accent theme to the entire document root
  useEffect(() => {
    const activeTheme = THEME_OPTIONS.find(t => t.key === currentTheme);
    if (activeTheme) {
      const root = document.documentElement;
      // Core CSS variables for the system
      root.style.setProperty('--app-accent', activeTheme.color);
      root.style.setProperty('--app-accent-muted', `${activeTheme.color}15`);
      root.style.setProperty('--app-accent-soft', `${activeTheme.color}30`);
      root.style.setProperty('--app-bg-tint', `${activeTheme.color}03`);
    }
  }, [currentTheme]);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsTransitioning(false);
    }, 150);
  };

  // FIXED: Ensure theme updates both state and the utility/storage
  const handleThemeChange = (newTheme: ThemeKey) => {
    setCurrentTheme(newTheme);
    setTheme(newTheme); // This updates the storage and applies the class if needed
  };

  const toggleDarkMode = (dark: boolean) => {
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const sidebarItems = [
    { label: 'Appearance', icon: Palette, description: 'Colors & themes' },
  ];

  return (
    <div style={{ fontFamily: APP_FONT }} className="min-h-screen dark:bg-[#0b0b0b] bg-gray-50 text-gray-900 dark:text-white transition-colors duration-500">
      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="mx-auto flex w-full max-w-[1200px] min-h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="hidden w-[260px] border-r border-gray-200 dark:border-white/[0.05] px-6 py-10 lg:flex flex-col gap-1">
           <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--app-accent-muted)] text-[var(--app-accent)] border border-[var(--app-accent-soft)]">
            <Palette size={18} />
            <span className="font-bold text-sm">Appearance</span>
          </button>
        </aside>

        {/* Content */}
        <main className="flex-1 px-8 lg:px-16 py-12">
          <div className="max-w-2xl">
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-2 text-[var(--app-accent)] font-bold text-[10px] uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-current" /> Customization
              </div>
              <h1 className="text-4xl font-black tracking-tight">APPEARANCE</h1>
            </header>

            <div className="space-y-10">

              {/* Theme Grid */}
              <section>
                <div className="mb-6">
                  <h3 className="font-bold">Accent Color</h3>
                  <p className="text-xs text-zinc-500">Global highlight color for your dashboard.</p>
                </div>
                <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
