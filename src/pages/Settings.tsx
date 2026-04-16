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
    { label: 'Reading', icon: BookOpen, description: 'Fonts & layout' },
    { label: 'Notifications', icon: Bell, description: 'Alerts & sounds' },
    { label: 'Account', icon: User, description: 'Profile settings' },
    { label: 'Privacy', icon: Shield, description: 'Data & security' },
  ];

  return (
    <div 
      style={{ fontFamily: APP_FONT }} 
      className="min-h-screen relative overflow-hidden transition-all duration-500 ease-in-out dark:bg-[#0b0b0b] bg-white text-gray-900 dark:text-white"
    >
      {/* Dynamic background glow based on current theme */}
      <div 
        style={{ backgroundColor: 'var(--app-accent)' }}
        className="fixed inset-0 opacity-[0.03] pointer-events-none transition-colors duration-1000" 
      />

      <AppTopbar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

      <div className="mx-auto flex w-full max-w-[1420px] min-h-[calc(100vh-64px)] relative z-10">
        <aside 
          className="hidden w-[280px] shrink-0 flex-col gap-2 border-r border-gray-200 dark:border-white/[0.05] px-6 py-8 lg:flex transition-colors duration-300"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--app-accent)' }}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-600">Settings</p>
            </div>
            <h2 className="text-lg font-bold">Preferences</h2>
          </div>

          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleTabChange(item.label)}
                className={`group w-full flex items-center gap-3.5 rounded-xl px-4 py-3.5 text-left transition-all duration-300 border ${
                  activeTab === item.label
                    ? 'bg-[var(--app-accent-muted)] text-[var(--app-accent)] border-[var(--app-accent-soft)]'
                    : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-zinc-200 border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${
                  activeTab === item.label 
                    ? 'bg-[var(--app-accent)]/20' 
                    : 'bg-gray-100 dark:bg-white/[0.02] group-hover:bg-gray-200 dark:group-hover:bg-white/[0.05]'
                }`}>
                  <item.icon size={16} strokeWidth={activeTab === item.label ? 2.5 : 2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold">{item.label}</p>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-600 group-hover:text-gray-500 dark:group-hover:text-zinc-500">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main 
          className={`flex-1 px-8 lg:px-16 py-12 transition-all duration-300 ease-in-out ${
            isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="max-w-3xl">
            <header className="mb-12">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: 'var(--app-accent)' }} />
                <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: 'var(--app-accent)' }}>Configure</p>
              </div>
              <h1 className="text-[42px] font-black uppercase tracking-tighter leading-none">{activeTab}</h1>
            </header>

            {activeTab === 'Appearance' ? (
                  <div className="space-y-12 animate-in fade-in duration-700 outline-none focus:outline-none">
                  <section className="">
                    <div className="flex items-center gap-2 mb-4">
                      <Sun size={14} style={{ color: 'var(--app-accent)' }} />
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-600">Interface Mode</p>
                    </div>
                    
                    {/* Ensure the card itself doesn't trap focus outline */}
                    <div className="rounded-3xl border border-gray-200 dark:border-white/[0.06] backdrop-blur-md p-8 bg-white dark:bg-[#0d0d0d]/25">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <h3 className="text-[18px] font-bold">Color Palette</h3>
                        <p className="text-[14px] font-medium text-gray-500 dark:text-zinc-500 max-w-sm">
                          Day and night customization for optimal viewing.
                        </p>
                      </div>
                      <div className="flex gap-1.5 rounded-xl bg-gray-100 dark:bg-black/30 p-1.5 ring-1 ring-gray-200 dark:ring-white/[0.05]">
                        <button 
                          onClick={() => toggleDarkMode(false)}
                          className={`px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 rounded-lg transition-all duration-300 ${
                            !isDarkMode 
                              ? 'bg-[var(--app-accent-muted)] text-[var(--app-accent)] border border-[var(--app-accent-soft)] shadow-md' 
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Sun size={14} /> Light
                        </button>
                        <button 
                          onClick={() => toggleDarkMode(true)}
                          className={`px-5 py-2.5 text-[12px] font-bold flex items-center gap-2 rounded-lg transition-all duration-300 ${
                            isDarkMode 
                              ? 'bg-[var(--app-accent-muted)] text-[var(--app-accent)] border border-[var(--app-accent-soft)] shadow-md' 
                              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          <Moon size={14} /> Dark
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 mb-6">
                    <Palette size={14} style={{ color: 'var(--app-accent)' }} />
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-600">Accent Theme</p>
                  </div>
                  <ThemePicker theme={currentTheme} onThemeChange={handleThemeChange} />
                </section>
              </div>
            ) : (
              <div className="py-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-white/[0.05] rounded-3xl">
                <Sparkles size={20} style={{ color: 'var(--app-accent)' }} className="mb-4" />
                <h3 className="text-lg font-bold">Coming Soon</h3>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;