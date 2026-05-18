import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import {
  Check,
  Loader2,
  Search,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
  ChevronRight,
  Award,
  Terminal,
  Crown,
  BadgeCheck,
  Gem,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  canViewVisibility,
  getVisibility,
  isRecentlyOnline,
  normalizeFriendshipStatus,
  type FriendshipStatus,
  type SocialProfile,
} from '../../utils/social';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

interface FriendsModalProps {
  open: boolean;
  onClose: () => void;
}

type FriendProfile = SocialProfile & {
  friendship_date?: string | null;
  friendship_status?: FriendshipStatus;
  request_direction?: 'incoming' | 'outgoing';
  role?: any;
};

type TabId = 'friends' | 'requests' | 'find';

const tabs: Array<{ id: TabId; label: string; desc: string; icon: React.ElementType }> = [
  { id: 'find', label: 'Add Friend', desc: 'Search users and send requests', icon: UserPlus },
  { id: 'friends', label: 'Friends', desc: 'Connections and watching now', icon: Users },
  { id: 'requests', label: 'Requests', desc: 'Pending requests', icon: Check },
];

// ─── Animation Variants ────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 380, damping: 24 },
  },
  exit: { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.1 } },
};

const tabContentVariants: Variants = {
  hidden: { opacity: 0, x: 18 },
  show: {
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 340, damping: 28, mass: 0.9 },
  },
  exit: {
    opacity: 0, x: -14,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: 10 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: 'spring', stiffness: 360, damping: 26, delay: i * 0.04 },
  }),
  exit: { opacity: 0, x: -8, transition: { duration: 0.1 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isOnline = (friend: FriendProfile) => isRecentlyOnline(friend);

const timeAgo = (dateStr?: string | null) => {
  if (!dateStr) return 'recently';
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

// ─── Reusable UI ──────────────────────────────────────────────────────────────
const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`rounded-[16px] ${className}`}
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
    }}
  >
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.div variants={fadeUpItem} className="flex items-center justify-between mb-2.5 px-1">
    <p className="text-[10.5px] font-bold tracking-[0.15em] uppercase text-zinc-500">{children}</p>
  </motion.div>
);

// ─── Role Badge with Tooltip (ProfileModal-style) ─────────────────────────────
const renderRoleTag = (rawRole: any) => {
  if (!rawRole) return null;
  let rolesArray: string[] = [];
  if (Array.isArray(rawRole)) rolesArray = rawRole;
  else if (typeof rawRole === 'string') rolesArray = rawRole.split(',');
  const cleanRoles = rolesArray
    .map((r) => r.replace(/['"]/g, '').trim())
    .filter((r) => r && r.toLowerCase() !== 'member');
  if (cleanRoles.length === 0) return null;

  const bgColor = 'color-mix(in srgb, var(--app-bg, #09090b) 80%, transparent)';
  const borderColor = 'rgba(255,255,255,0.12)';

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {cleanRoles.map((role, idx) => {
        const lowerRole = role.toLowerCase();
        let Icon = Award;
        let color = 'var(--app-accent)';
        if (lowerRole === 'developer' || lowerRole === 'dev') { Icon = Terminal; color = '#38bdf8'; }
        else if (lowerRole === 'founder') { Icon = Crown; color = '#a855f7'; }
        else if (lowerRole === 'verified') { Icon = BadgeCheck; color = '#10b981'; }
        else if (lowerRole === 'vip' || lowerRole === 'premium') { Icon = Gem; color = '#f59e0b'; }
        else if (lowerRole === 'trusted') { Icon = Shield; color = '#10b981'; }
        else if (lowerRole === 'admin' || lowerRole === 'moderator' || lowerRole === 'mod') { Icon = Shield; color = '#ef4444'; }

        const titleCasedRole = role.charAt(0).toUpperCase() + role.slice(1);

        return (
          <div key={idx} className="relative group/role flex items-center justify-center cursor-default z-10">
            <motion.div
              whileHover={{ scale: 1.18, y: -2 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="flex items-center justify-center w-[24px] h-[24px] rounded-[6px]"
              style={{ color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              <Icon size={12} strokeWidth={2.5} />
            </motion.div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover/role:opacity-100 transition-all duration-150 pointer-events-none flex flex-col items-center translate-y-1 group-hover/role:translate-y-0 z-[9999]">
              <div
                className="relative px-3 py-1.5 rounded-[8px] border text-[11.5px] font-bold text-white whitespace-nowrap backdrop-blur-md"
                style={{ fontFamily: APP_FONT, backgroundColor: bgColor, borderColor }}
              >
                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-[1.5px] z-20" style={{ backgroundColor: bgColor }} />
                {titleCasedRole}
              </div>
              <div className="w-2.5 h-2.5 rotate-45 border-r border-b -mt-[6px] backdrop-blur-md" style={{ backgroundColor: bgColor, borderColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar: React.FC<{ friend: FriendProfile }> = ({ friend }) => {
  const [failed, setFailed] = useState(false);
  const online = isOnline(friend);

  return (
    <div className="relative h-10 w-10 flex-shrink-0">
      <div className="h-full w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
        {friend.avatar_url && !failed ? (
          <img
            src={friend.avatar_url}
            alt={friend.display_name || 'User'}
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            <User size={18} strokeWidth={1.8} />
          </div>
        )}
      </div>
      <motion.span
        initial={false}
        animate={online ? { scale: [1, 1.3, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-[2px] border-[#09090b] ${
          online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'
        }`}
      />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const FriendsModal: React.FC<FriendsModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('friends');
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [suggestions, setSuggestions] = useState<FriendProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: friendRows } = await supabase
        .from('friendships')
        .select('user_id, friend_id, created_at')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = friendRows?.map((r: any) => (r.user_id === user.id ? r.friend_id : r.user_id)) || [];

      const { data: requestRows } = await supabase
        .from('friendships')
        .select('user_id, friend_id, created_at')
        .eq('status', 'pending')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const requestIds = requestRows?.map((r: any) => (r.user_id === user.id ? r.friend_id : r.user_id)) || [];
      const allTargetIds = [...new Set([...friendIds, ...requestIds])];

      if (allTargetIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', allTargetIds);

        const nextFriends = (profiles || [])
          .filter((p) => friendIds.includes(p.id))
          .map((p) => ({
            ...p,
            friendship_date: friendRows?.find((r: any) => r.user_id === p.id || r.friend_id === p.id)?.created_at,
          }))
          .sort((a, b) => Number(isOnline(b)) - Number(isOnline(a)));

        const nextRequests = (profiles || [])
          .filter((p) => requestIds.includes(p.id))
          .map((p) => {
            const row = requestRows?.find((r: any) => r.user_id === p.id || r.friend_id === p.id);
            return {
              ...p,
              friendship_date: row?.created_at,
              request_direction: row?.friend_id === user.id ? 'incoming' : 'outgoing',
            } as FriendProfile;
          })
          .sort((a, b) => new Date(b.friendship_date || 0).getTime() - new Date(a.friendship_date || 0).getTime());

        setFriends(nextFriends);
        setRequests(nextRequests);
      } else {
        setFriends([]);
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { if (open) loadFriends(); }, [loadFriends, open]);

  const loadSearchResults = useCallback(async (query: string) => {
    if (!user?.id || query.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('display_name', `%${query.trim()}%`)
        .neq('id', user.id)
        .limit(10);

      const { data: relationships } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const visibleProfiles = (profiles || [])
        .map((profile: any) => {
          const row = (relationships || []).find(
            (rel: any) => rel.user_id === profile.id || rel.friend_id === profile.id
          );
          const friendship_status = normalizeFriendshipStatus(row, user.id);
          return { ...profile, friendship_status } as FriendProfile;
        })
        .filter((p: FriendProfile) =>
          canViewVisibility(p.id, user.id, p.friendship_status || 'none', getVisibility(p, 'profile_visibility'))
        );

      setSearchResults(visibleProfiles);
    } finally {
      setSearchLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!open || activeTab !== 'find') return;
    const handle = window.setTimeout(() => loadSearchResults(searchQuery), 250);
    return () => window.clearTimeout(handle);
  }, [activeTab, loadSearchResults, open, searchQuery]);

  const loadSuggestions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: relationships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      const knownIds = new Set((relationships || []).flatMap((r: any) => [r.user_id, r.friend_id]));
      knownIds.add(user.id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('last_active_at', { ascending: false })
        .limit(20);

      const filtered = (profiles || [])
        .filter((p: any) => !knownIds.has(p.id))
        .filter((p: any) => canViewVisibility(p.id, user.id, 'none', getVisibility(p, 'profile_visibility')))
        .map((p: any) => ({ ...p, friendship_status: 'none' as FriendshipStatus }))
        .slice(0, 6);

      setSuggestions(filtered);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    if (open && activeTab === 'find') loadSuggestions();
  }, [open, activeTab, loadSuggestions]);

  const handleOpenProfile = (id: string) => {
    onClose();
    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: id } }));
  };

  const handleRequestAction = async (friendId: string, action: 'accept' | 'decline' | 'cancel') => {
    if (!user?.id || processingId) return;
    setProcessingId(friendId);
    try {
      if (action === 'accept') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: friendId, friend_id: user.id });
      } else {
        await supabase.from('friendships').delete().eq('status', 'pending').or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        );
      }
      await loadFriends();
    } finally {
      setProcessingId(null);
    }
  };

  const handleConnectionAction = async (target: FriendProfile) => {
    if (!user?.id || processingId) return;
    const status = target.friendship_status || 'none';
    setProcessingId(target.id);
    try {
      if (status === 'none') {
        await supabase.from('friendships').insert({ user_id: user.id, friend_id: target.id, status: 'pending' });
      } else if (status === 'pending_sent' || status === 'accepted') {
        await supabase.from('friendships').delete().or(
          `and(user_id.eq.${user.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${user.id})`
        );
      } else if (status === 'pending_received') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: target.id, friend_id: user.id });
      }
      await Promise.all([loadFriends(), loadSearchResults(searchQuery)]);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusLine = (friend: FriendProfile) => {
    if (friend.status_state === 'watching' && isOnline(friend)) return friend.status_text || 'Watching now';
    if (isOnline(friend)) return friend.status_text || 'Online';
    return friend.last_active_at ? `Offline ${timeAgo(friend.last_active_at)}` : 'Offline';
  };

  const activeItems = activeTab === 'friends' ? friends : activeTab === 'requests' ? requests : searchResults;
  const counts = { friends: friends.length, requests: requests.length, find: searchResults.length };

  const renderFriendRow = (
    friend: FriendProfile,
    i: number,
    arr: any[],
    type: 'friend' | 'incoming' | 'outgoing' | 'find'
  ) => (
    <motion.div
      key={friend.id}
      custom={i}
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      onClick={() => handleOpenProfile(friend.id)}
      className={`flex items-center justify-between px-4 py-3.5 cursor-pointer group hover:bg-white/[0.03] transition-colors duration-150 ${
        i === 0 && arr.length === 1 ? 'rounded-[15px]' :
        i === 0 ? 'rounded-t-[15px]' :
        i === arr.length - 1 ? 'rounded-b-[15px]' : ''
      }`}
      style={i < arr.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <Avatar friend={friend} />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[14px] font-bold text-white truncate group-hover:text-[var(--app-accent)] transition-colors"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              {friend.display_name || 'Anonymous User'}
            </span>
            {renderRoleTag(friend.role)}
          </div>
          <span className="text-[11.5px] text-zinc-500 truncate mt-0.5 font-medium">
            {type === 'incoming'
              ? 'Wants to be your friend'
              : type === 'outgoing'
              ? `Requested ${timeAgo(friend.friendship_date)}`
              : getStatusLine(friend)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-4" onClick={(e) => e.stopPropagation()}>
        {type === 'incoming' ? (
          <>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
              onClick={() => handleRequestAction(friend.id, 'decline')}
              className="p-2 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
              onClick={() => handleRequestAction(friend.id, 'accept')}
              className="p-2 rounded-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <Check size={16} strokeWidth={2.5} />
            </motion.button>
          </>
        ) : type === 'outgoing' ? (
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            onClick={() => handleRequestAction(friend.id, 'cancel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={14} strokeWidth={2.5} /> Cancel
          </motion.button>
        ) : type === 'friend' ? (
          <ChevronRight size={16} className="text-zinc-600 group-hover:text-[var(--app-accent)] transition-colors" />
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={() => handleConnectionAction(friend)}
            disabled={processingId === friend.id}
            className={`h-8 px-3 rounded-[10px] text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              friend.friendship_status === 'accepted'
                ? 'bg-white/5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400'
                : friend.friendship_status === 'pending_sent'
                ? 'bg-yellow-500/10 text-yellow-500 hover:bg-red-500/10 hover:text-red-400'
                : 'bg-[var(--app-accent)] text-black hover:brightness-110'
            }`}
          >
            {processingId === friend.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : friend.friendship_status === 'accepted' ? (
              <UserMinus size={13} />
            ) : (
              <UserPlus size={13} />
            )}
            {friend.friendship_status === 'accepted'
              ? 'Friends'
              : friend.friendship_status === 'pending_sent'
              ? 'Cancel'
              : friend.friendship_status === 'pending_received'
              ? 'Accept'
              : 'Add Friend'}
          </motion.button>
        )}
      </div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.9 }}
              className="aw-material-modal relative flex h-[80vh] max-h-[720px] w-full max-w-[800px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={modalStyles}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Sidebar (Settings-style) ── */}
              <aside
                className="hidden w-[220px] flex-shrink-0 flex-col sm:flex py-6"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Title block */}
                <div className="px-6 mb-8">
                  <h2
                    className="text-[20px] text-white"
                    style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}
                  >
                    Friends
                  </h2>
                  <p className="text-[11.5px] text-zinc-400 mt-1.5 font-medium">
                    {counts.friends} connected • {counts.requests} pending
                  </p>
                </div>

                {/* Nav */}
                <nav className="flex-1 flex flex-col gap-1.5 px-3">
                  {tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        initial={false}
                        animate={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255,255,255,0)',
                          color: active ? '#ffffff' : 'rgb(161,161,170)',
                        }}
                        whileHover={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255,255,255,0.06)',
                          color: '#ffffff',
                        }}
                        whileTap={{ scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="relative flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-left outline-none"
                      >
                        <span className="flex items-center gap-3">
                          <motion.div
                            animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : undefined }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                          >
                            <tab.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                          </motion.div>
                          <span className="leading-none">{tab.label}</span>
                        </span>
                        <AnimatePresence>
                          {counts[tab.id] > 0 && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                active ? 'bg-[var(--app-accent)] text-black' : 'bg-white/10 text-white'
                              }`}
                            >
                              {counts[tab.id]}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );
                  })}
                </nav>

                {/* Bottom action */}
                <div className="px-3 pt-5 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <motion.button
                    onClick={() => setActiveTab('find')}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#ffffff' }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-zinc-400 outline-none"
                  >
                    <UserPlus size={16} strokeWidth={2} />
                    Add Friend
                  </motion.button>
                </div>
              </aside>

              {/* ── Main Content ── */}
              <section className="flex-1 flex flex-col bg-white/[0.01] min-w-0">
                <header
                  className="flex items-center justify-between px-8 py-6 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab + '-header'}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      <h3
                        className="text-[17px] font-bold text-white tracking-wide"
                        style={{ fontFamily: DISPLAY_FONT }}
                      >
                        {tabs.find((t) => t.id === activeTab)?.label}
                      </h3>
                      <p className="text-[12.5px] text-zinc-400 mt-1">
                        {tabs.find((t) => t.id === activeTab)?.desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                  <motion.button
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </header>

                <main className="flex-1 overflow-y-auto p-5 sm:p-8">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-48 flex flex-col items-center justify-center gap-3"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={22} className="text-zinc-500" />
                        </motion.div>
                        <p className="text-[13px] text-zinc-500">Syncing network...</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeTab}
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                        className="flex flex-col gap-6"
                      >
                        {/* ── Find Tab ── */}
                        {activeTab === 'find' && (
                          <>
                            {/* Search bar */}
                            <motion.div
                              variants={fadeUpItem}
                              className="flex items-center gap-3 px-4 h-11 rounded-[14px] bg-white/[0.035] border border-white/10 focus-within:border-[var(--app-accent)] transition-colors"
                            >
                              <Search size={16} className="text-zinc-500 flex-shrink-0" />
                              <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by username..."
                                className="flex-1 bg-transparent text-[13.5px] text-white outline-none"
                              />
                              <AnimatePresence mode="wait">
                                {searchLoading ? (
                                  <motion.div key="spinner" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }}>
                                    <Loader2 size={14} className="animate-spin text-zinc-500" />
                                  </motion.div>
                                ) : searchQuery.length > 0 ? (
                                  <motion.button key="clear" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.15 }} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }} onClick={() => setSearchQuery('')} className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 text-zinc-400 hover:text-white hover:bg-white/15 transition-colors flex-shrink-0">
                                    <X size={11} strokeWidth={2.5} />
                                  </motion.button>
                                ) : null}
                              </AnimatePresence>
                            </motion.div>

                            <AnimatePresence mode="wait">
                              {searchQuery.trim().length >= 2 ? (
                                /* Search results */
                                <motion.div key="results" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                                  {searchResults.length > 0 ? (
                                    <>
                                      <SectionLabel>Results for "{searchQuery}"</SectionLabel>
                                      <SectionCard>
                                        {searchResults.map((f, i, a) => renderFriendRow(f, i, a, 'find'))}
                                      </SectionCard>
                                    </>
                                  ) : !searchLoading ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="flex flex-col items-center justify-center py-12 text-center bg-transparent">
                                      <Search size={28} className="mb-3 text-zinc-600" />
                                      <p className="text-[13px] font-medium text-zinc-500">No users found for "{searchQuery}"</p>
                                      <p className="text-[11.5px] text-zinc-600 mt-1">Try a different name</p>
                                    </motion.div>
                                  ) : null}
                                </motion.div>
                              ) : (
                                /* Discover page */
                                <motion.div key="discover" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">

                                  {/* How to connect tips */}
                                  <motion.div variants={fadeUpItem} className="grid grid-cols-3 gap-2.5">
                                    {[
                                      { icon: Search, label: 'Search', desc: 'Find by username' },
                                      { icon: UserPlus, label: 'Request', desc: 'Send a friend request' },
                                      { icon: Users, label: 'Connect', desc: 'Watch together' },
                                    ].map(({ icon: Icon, label, desc }, i) => (
                                      <motion.div
                                        key={label}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 340, damping: 26 }}
                                        whileHover={{
                                          y: -4,
                                          backgroundColor: 'rgba(255,255,255,0.045)',
                                          borderColor: 'color-mix(in srgb, var(--app-accent) 35%, transparent)',
                                          transition: { duration: 0.16 },
                                        }}
                                        whileTap={{ scale: 0.97 }}
                                        className="flex flex-col items-center gap-2 px-3 py-4 rounded-[14px] text-center cursor-default"
                                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                                      >
                                        <motion.div
                                          whileHover={{ scale: 1.18, rotate: 6 }}
                                          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
                                          className="w-9 h-9 rounded-full flex items-center justify-center"
                                          style={{ background: 'color-mix(in srgb, var(--app-accent) 15%, transparent)', color: 'var(--app-accent)' }}
                                        >
                                          <Icon size={16} strokeWidth={2} />
                                        </motion.div>
                                        <div>
                                          <p className="text-[12px] font-bold text-white">{label}</p>
                                          <p className="text-[10.5px] text-zinc-500 mt-0.5">{desc}</p>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </motion.div>

                                  {/* Suggested users */}
                                  {suggestions.length > 0 && (
                                    <div>
                                      <SectionLabel>Suggested for you</SectionLabel>
                                      <SectionCard>
                                        {suggestions.map((f, i, a) => renderFriendRow(f, i, a, 'find'))}
                                      </SectionCard>
                                    </div>
                                  )}

                                  {suggestions.length === 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} className="flex flex-col items-center justify-center py-8 text-center bg-transparent">
                                      <UserPlus size={26} className="mb-2.5 text-zinc-600" />
                                      <p className="text-[12.5px] font-medium text-zinc-500">Search above to find people</p>
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}

                        {/* Requests tab */}
                        {activeTab === 'requests' && requests.length > 0 && (
                          <motion.div variants={staggerContainer} initial="hidden" animate="show" exit="exit">
                            {requests.some((r) => r.request_direction === 'incoming') && (
                              <div>
                                <SectionLabel>Incoming Requests</SectionLabel>
                                <SectionCard>
                                  {requests.filter((r) => r.request_direction === 'incoming').map((r, i, a) => renderFriendRow(r, i, a, 'incoming'))}
                                </SectionCard>
                              </div>
                            )}
                            {requests.some((r) => r.request_direction === 'outgoing') && (
                              <div className="mt-4">
                                <SectionLabel>Outgoing Requests</SectionLabel>
                                <SectionCard>
                                  {requests.filter((r) => r.request_direction === 'outgoing').map((r, i, a) => renderFriendRow(r, i, a, 'outgoing'))}
                                </SectionCard>
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Friends tab */}
                        {activeTab === 'friends' && friends.length > 0 && (
                          <motion.div variants={staggerContainer} initial="hidden" animate="show" exit="exit">
                            <SectionLabel>Connected Friends</SectionLabel>
                            <SectionCard>
                              {friends.map((f, i, a) => renderFriendRow(f, i, a, 'friend'))}
                            </SectionCard>
                          </motion.div>
                        )}

                        {/* Empty state — only for non-find tabs */}
                        {activeTab !== 'find' && activeItems.length === 0 && !loading && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 0.45, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                            className="h-64 flex flex-col items-center justify-center text-center"
                            style={{ background: 'transparent' }}
                          >
                            <motion.div
                              animate={{ y: [0, -5, 0] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <Users size={32} className="mb-3" />
                            </motion.div>
                            <p className="text-[13px] font-medium max-w-[200px]">
                              {activeTab === 'requests' ? 'No pending requests.' : 'No friends yet. Add some!'}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </main>
              </section>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

const modalStyles = {
  fontFamily: APP_FONT,
  background: 'var(--app-bg, #09090b)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
} as React.CSSProperties;

export default FriendsModal;
