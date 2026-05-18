import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, ChevronRight, X, Users as UsersIcon, Shield, Crown, Terminal, BadgeCheck, Gem } from 'lucide-react';
import PageLoader from '../components/shared/PageLoader';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

// ─── STYLES & VARIANTS ────────────────────────────────────────────────────────
const DESIGN_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Onest:wght@300;400;500;600;700&display=swap');

  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-border:      rgba(255, 255, 255, 0.08);
    --aw-accent:      var(--app-accent);
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

  .aw-root { font-family: var(--aw-font-body); background: transparent; color: var(--aw-text); }
  
  .aw-noise::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 180px;
  }

  .aw-label {
    font-family: var(--aw-font-display); font-size: 10px; letter-spacing: 0.18em;
    font-weight: 600; text-transform: uppercase; color: var(--aw-accent);
  }
`;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface UserItem {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role?: string | string[];
  created_at?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`;
};

const renderRoleTag = (rawRole: any) => {
  if (!rawRole) return <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">Member</span>;

  let rolesArray: string[] = [];
  if (Array.isArray(rawRole)) rolesArray = rawRole;
  else if (typeof rawRole === 'string') rolesArray = rawRole.split(',');

  const cleanRoles = rolesArray.map(r => r.replace(/['"]/g, '').trim()).filter(r => r);
  if (cleanRoles.length === 0) return <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">Member</span>;

  // We take the highest priority role to display cleanly in the list
  const primaryRole = cleanRoles[0];
  const lowerRole = primaryRole.toLowerCase();

  let Icon = Shield; let color = 'var(--aw-accent)';
  if (lowerRole === 'developer' || lowerRole === 'dev') { Icon = Terminal; color = '#38bdf8'; }
  else if (lowerRole === 'founder') { Icon = Crown; color = '#a855f7'; }
  else if (lowerRole === 'verified') { Icon = BadgeCheck; color = '#10b981'; }
  else if (lowerRole === 'vip' || lowerRole === 'premium') { Icon = Gem; color = '#f59e0b'; }
  else if (lowerRole === 'admin' || lowerRole === 'moderator' || lowerRole === 'mod') { Icon = Shield; color = '#ef4444'; }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <Icon size={12} style={{ color }} strokeWidth={2.5} />
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
        {primaryRole}
      </span>
    </div>
  );
};


// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    document.title = 'Community Users';
    const id = 'aw-design-styles-users';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style'); tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchUsers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      // Added role and created_at to the fetch query!
      let url = `${supabaseUrl}/rest/v1/profiles?select=id,display_name,avatar_url,role,created_at&order=created_at.desc&limit=50`;
      if (query.trim()) {
        url = `${supabaseUrl}/rest/v1/profiles?display_name=ilike.*${encodeURIComponent(query.trim())}*&select=id,display_name,avatar_url,role,created_at&order=created_at.desc&limit=50`;
      }
      const res = await fetch(url, {
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(debouncedSearch);
  }, [debouncedSearch, fetchUsers]);

  return (
    <div className="aw-root aw-noise relative min-h-screen pb-24 selection:bg-[var(--aw-accent)]/20">
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: 'color-mix(in srgb, var(--aw-bg), transparent 15%)', backdropFilter: 'blur(20px)' }} />

      <main className="relative z-10 mx-auto w-full max-w-[1460px] px-4 pt-10 md:px-8">

        {/* Header Section */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="flex flex-col gap-2 mb-8">
          <p className="aw-label flex items-center gap-2"><UsersIcon size={12} /> Network</p>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1
              className="bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/40 drop-shadow-sm"
              style={{ fontFamily: 'var(--aw-font-display)', fontSize: 'clamp(32px, 5vw, 42px)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1, margin: 0 }}
            >
              COMMUNITY
            </h1>

            {/* Search Bar - Sleek Glassmorphic style */}
            <div className="relative w-full md:w-[320px] lg:w-[400px]">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} className={`transition-colors ${search.trim() ? 'text-[var(--aw-accent)]' : 'text-zinc-500'}`} />
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[var(--aw-s1)] border border-[var(--aw-border)] rounded-[14px] py-3.5 pl-11 pr-10 text-[14px] font-medium text-white outline-none transition-all focus:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] focus:shadow-[0_0_20px_color-mix(in_srgb,var(--aw-accent),transparent_90%)] backdrop-blur-md placeholder:text-zinc-500"
                style={{ fontFamily: 'var(--aw-font-body)' }}
              />
              <AnimatePresence>
                {search && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        {/* Users Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <PageLoader size={40} text="Searching network..." />
          </div>
        ) : users.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24 text-center rounded-[24px] border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md mt-4">
            <div className="w-16 h-16 rounded-full bg-[var(--aw-s2)] border border-[var(--aw-border)] flex items-center justify-center mb-4">
              <User size={28} className="text-zinc-500" />
            </div>
            <p className="aw-label mb-2">No Matches</p>
            <h3 className="text-2xl font-bold uppercase tracking-tight text-white" style={{ fontFamily: 'var(--aw-font-display)' }}>Nobody found</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-sm">Try adjusting your search to find the user you're looking for.</p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            // The magic happens here: 1 col on mobile (list view), multi-col on larger screens
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {users.map((u) => {
              const displayName = u.display_name || 'Anonymous User';

              return (
                <motion.div
                  key={u.id}
                  variants={itemVariants}
                  onClick={() => navigate(`/profile/${u.id}`)}
                  className="group flex items-center justify-between p-4 sm:p-5 rounded-[20px] cursor-pointer border border-[var(--aw-border)] bg-[var(--aw-s1)] backdrop-blur-md hover:bg-[color-mix(in_srgb,var(--aw-accent),transparent_96%)] hover:border-[color-mix(in_srgb,var(--aw-accent),transparent_50%)] transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    {/* Avatar */}
                    <div
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden flex-shrink-0 shadow-sm border border-white/10 group-hover:border-[var(--aw-accent)] transition-colors duration-300"
                      style={{ background: u.avatar_url ? '#111' : getAvatarColor(displayName) }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={displayName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        displayName[0].toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col min-w-0 justify-center">
                      <span className="text-[15px] sm:text-[16px] font-bold text-white/95 group-hover:text-white truncate transition-colors" style={{ fontFamily: 'var(--aw-font-display)' }}>
                        {displayName}
                      </span>
                      {renderRoleTag(u.role)}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-zinc-500 group-hover:text-[var(--aw-accent)] group-hover:bg-[var(--aw-accent)]/10 flex-shrink-0 transition-colors">
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default UsersPage;