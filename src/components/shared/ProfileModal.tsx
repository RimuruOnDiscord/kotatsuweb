
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, User, Bookmark, Activity as ActivityIcon, Users, 
  Award, ExternalLink, Calendar, MessageSquare, MessageSquareReply, Plus, Check, Loader2, ChevronRight,
  Crown, Terminal, BadgeCheck, Gem, Flame, UserPlus, UserMinus
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey, supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Constants & Mock Data ────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',  icon: User },
  { id: 'activity',  label: 'Activity',  icon: ActivityIcon },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'friends',   label: 'Friends',   icon: Users },
  { id: 'badges',    label: 'Badges',    icon: Award },
] as const;

type TabId = typeof TABS[number]['id'];

const MOCK_BADGES = [
  { id: 'founder', name: 'Founder', desc: 'Original creator of the platform.', icon: Crown, cssClass: 'badge-founder', color: '#a855f7' },
  { id: 'dev', name: 'Developer', desc: 'Core system architect and maintainer.', icon: Terminal, cssClass: 'badge-dev', color: '#38bdf8' },
  { id: 'verified', name: 'Verified', desc: 'Trusted community member.', icon: BadgeCheck, cssClass: 'badge-verified', color: '#10b981' },
  { id: 'premium', name: 'Premium', desc: 'Active platform supporter.', icon: Gem, cssClass: 'badge-premium', color: '#f59e0b' },
  { id: 'fire', name: 'On Fire', desc: 'Received over 50 likes on a comment.', icon: Flame, cssClass: 'badge-fire', color: '#ef4444' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ProfileModalProps { 
  open?: boolean; 
  onClose?: () => void;
  userId?: string; 
}

interface CommentItem {
  id: string; content: string; created_at: string;
  page_type: string; page_id: string; likes_count: number; type: 'comment' | 'reply';
}

interface BookmarkItem { mal_id: string; title: string; cover: string; type: string; status: string; }

interface FriendItem { id: string; display_name: string; avatar_url: string; role?: string | string[]; }

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
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

const handleContentNavigation = (navigate: any, pageType: string, pageId: string, onClose: () => void) => {
  onClose();
  if (pageId.includes('/')) return navigate(pageId.startsWith('/') ? pageId : `/${pageId}`);
  const animeMatch = pageId.match(/anime-(\d+)-ep-(\d+)/);
  if (animeMatch) return navigate(`/watch/${animeMatch[1]}/kiwi/sub/animepahe-${animeMatch[2]}`);
  const genericMatch = pageId.match(/(?:anime|manga)-(\d+)/);
  if (genericMatch) return navigate(`/${pageType === 'anime' || pageId.includes('anime') ? 'watch' : 'read'}/${genericMatch[1]}`);
  navigate(`/${pageType === 'anime' ? 'watch' : 'read'}/${pageId}`);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, userId }) => {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  
  const [internalOpen, setInternalOpen] = useState(open || false);
  const [activeUserId, setActiveUserId] = useState<string | null>(userId || null);
  const [activeProfile, setActiveProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  
  // Real Friends State
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isProcessingFriend, setIsProcessingFriend] = useState(false);

  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => { if (open !== undefined) setInternalOpen(open); }, [open]);
  useEffect(() => { if (userId !== undefined) setActiveUserId(userId); }, [userId]);

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const targetId = e.detail?.userId || e.detail;
      if (typeof targetId === 'string') {
        setActiveUserId(targetId);
        setInternalOpen(true);
      }
    };

    window.addEventListener('open-profile-modal', handleOpenEvent);
    window.addEventListener('openProfile', handleOpenEvent);

    return () => {
      window.removeEventListener('open-profile-modal', handleOpenEvent);
      window.removeEventListener('openProfile', handleOpenEvent);
    };
  }, []);

  const handleClose = () => {
    setInternalOpen(false);
    if (onClose) onClose();
  };

  const activeUserBadges = useMemo(() => {
    if (!activeProfile && comments.length === 0) return [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
    
    const roles = Array.isArray(activeProfile?.role) 
      ? activeProfile.role.map((r: string) => r.toLowerCase()) 
      : (activeProfile?.role ? [activeProfile.role.toLowerCase()] : []);
      
    const dbBadges = Array.isArray(activeProfile?.badges) 
      ? activeProfile.badges.map((b: string) => b.toLowerCase()) 
      : [];
    
    const validIds = new Set([...roles, ...dbBadges]);
    
    if (comments.some(c => c.likes_count >= 50)) validIds.add('fire');
    if (activeProfile) validIds.add('verified');

    const filtered = MOCK_BADGES.filter(b => validIds.has(b.id) || validIds.has(b.name.toLowerCase()));
    
    return filtered.length > 0 ? filtered : [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
  }, [activeProfile, comments]);

  const stats = useMemo(() => ({
    joined: activeProfile?.created_at ? new Date(activeProfile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown',
    bookmarks: bookmarks.length,
    activity: comments.length,
    friends: friends.length,
    badges: activeUserBadges.length, 
  }), [activeProfile, bookmarks, comments, activeUserBadges, friends]);

  const fetchData = useCallback(async () => {
    const uid = activeUserId || user?.id;
    if (!uid) { setLoading(false); return; }
    
    setLoading(true);
    try {
      const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };

      // 1. Fetch Profile
      if (uid === user?.id && authProfile) {
        setActiveProfile({ ...authProfile, created_at: user?.created_at });
      } else {
        const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers });
        const pList = pRes.ok ? await pRes.json() : [];
        setActiveProfile(pList[0] || null);
      }

      // 2. Fetch Activity & Bookmarks
      const [cRes, rRes, bRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${uid}&select=mal_id,title,cover,type,status&order=created_at.desc`, { headers }),
      ]);

      const cList = cRes.ok ? await cRes.json() : [];
      const rList = rRes.ok ? await rRes.json() : [];
      const bList = bRes.ok ? await bRes.json() : [];

      const combinedActivity = [
        ...cList.map((c: any) => ({ ...c, type: 'comment' as const })),
        ...rList.map((r: any) => ({ ...r, type: 'reply' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setComments(combinedActivity);
      setBookmarks(bList);

      // 3. Fetch Real Friends Data via Supabase Client
      let fetchedFriends: FriendItem[] = [];
      let fetchedPending: FriendItem[] = [];
      let relStatus: FriendshipStatus = 'none';

      // target user's accepted friends
      const { data: fData } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`);

      if (fData && fData.length > 0) {
        const friendIds = fData.map(f => f.user_id === uid ? f.friend_id : f.user_id);
        const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', friendIds);
        if (pData) fetchedFriends = pData;
      }

      // If viewing own profile, fetch incoming pending requests
      if (user?.id && uid === user.id) {
        const { data: reqData } = await supabase
          .from('friendships')
          .select('user_id')
          .eq('friend_id', uid)
          .eq('status', 'pending');
        
        if (reqData && reqData.length > 0) {
          const reqIds = reqData.map(r => r.user_id);
          const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', reqIds);
          if (pData) fetchedPending = pData;
        }
      }

      // Check relationship with logged-in user (if looking at someone else)
      if (user?.id && uid !== user.id) {
        // Safe check both directions
        const { data: d1 } = await supabase.from('friendships').select('*').eq('user_id', user.id).eq('friend_id', uid);
        const { data: d2 } = await supabase.from('friendships').select('*').eq('user_id', uid).eq('friend_id', user.id);
        const relData = [...(d1 || []), ...(d2 || [])];

        if (relData.length > 0) {
          const rel = relData[0];
          if (rel.status === 'accepted') {
            relStatus = 'accepted';
          } else {
            relStatus = rel.user_id === user.id ? 'pending_sent' : 'pending_received';
          }
        }
      }

      setFriends(fetchedFriends);
      setPendingRequests(fetchedPending);
      setFriendshipStatus(relStatus);

    } catch (err) {
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeUserId, user?.id, authProfile]);

  useEffect(() => { 
    if (internalOpen && !hasFetched.current) { 
      setActiveTab('overview'); 
      fetchData(); 
      hasFetched.current = true;
    } else if (!internalOpen) {
      hasFetched.current = false;
    }
  }, [internalOpen, activeUserId, fetchData]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && internalOpen) handleClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [internalOpen]);

  // Friend Request Handlers
  const handleToggleFriend = async () => {
    if (!user?.id || !activeProfile?.id || isProcessingFriend) return;
    if (user.id === activeProfile.id) return;

    setIsProcessingFriend(true);
    try {
      if (friendshipStatus === 'none') {
        await supabase.from('friendships').insert({ user_id: user.id, friend_id: activeProfile.id, status: 'pending' });
        setFriendshipStatus('pending_sent');
      } 
      else if (friendshipStatus === 'pending_sent') {
        await supabase.from('friendships').delete().match({ user_id: user.id, friend_id: activeProfile.id });
        setFriendshipStatus('none');
      } 
      else if (friendshipStatus === 'pending_received') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: activeProfile.id, friend_id: user.id });
        setFriendshipStatus('accepted');
        fetchData(); // refresh lists
      } 
      else if (friendshipStatus === 'accepted') {
        // Delete relationship regardless of who sent it originally
        const { data: d1 } = await supabase.from('friendships').delete().match({ user_id: user.id, friend_id: activeProfile.id }).select();
        if (!d1 || d1.length === 0) {
          await supabase.from('friendships').delete().match({ user_id: activeProfile.id, friend_id: user.id });
        }
        setFriendshipStatus('none');
        fetchData();
      }
    } catch (err) {
      console.error('Error toggling friend:', err);
    } finally {
      setIsProcessingFriend(false);
    }
  };

  const handlePendingAction = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!user?.id) return;
    try {
      if (action === 'accept') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: requesterId, friend_id: user.id });
      } else {
        await supabase.from('friendships').delete().match({ user_id: requesterId, friend_id: user.id });
      }
      fetchData(); // Refresh UI
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
    }
  };

  const displayName = activeProfile?.display_name || 'Anonymous User';
  const avatarUrl = activeProfile?.avatar_url;

  return createPortal(
    <AnimatePresence>
      {internalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="relative flex flex-col w-full max-w-[640px] h-[85vh] max-h-[780px] overflow-hidden rounded-[18px] pointer-events-auto shadow-2xl"
              style={{
                fontFamily: APP_FONT,
                background: 'var(--app-bg)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 32px 80px rgba(0,0,0,0.65)',
              }}
              onClick={e => e.stopPropagation()}
            >
              
              <motion.button
                onClick={handleClose}
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.9 }}
                className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white backdrop-blur-md cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <X size={15} strokeWidth={2} />
              </motion.button>

              <div className="relative flex-shrink-0">
                <div className="h-[120px] w-full relative overflow-hidden" style={{ background: 'var(--app-surface-1)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at top left, var(--app-accent, #8b5cf6), transparent 60%)' }} />
                  <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at bottom right, rgba(255,255,255,0.5), transparent 60%)' }} />
                </div>

                <div className="px-6 pb-4 relative flex flex-col gap-2">
                  
                  {/* Avatar alone, pulled up */}
                  <div className="relative -mt-10 w-max mb-1">
                    <div className="w-[84px] h-[84px] rounded-[22px] overflow-hidden bg-zinc-900 border-[4px] flex items-center justify-center shadow-xl" style={{ borderColor: 'var(--app-bg)' }}>
                      {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : <User size={32} className="text-zinc-600" />}
                    </div>
                  </div>
                  
                  {/* Row: Username/Role + Action Buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <h2 className="text-[24px] text-white leading-tight" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                        {displayName}
                      </h2>
                      {activeProfile?.role && (
                        <p className="text-[12.5px] text-[var(--app-accent)] font-semibold uppercase tracking-wider mt-0.5">
                          {Array.isArray(activeProfile.role) ? activeProfile.role.join(' • ') : activeProfile.role}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      {/* Friend Action Button */}
                      {user && activeProfile?.id && user.id !== activeProfile.id && (
                        <motion.button 
                          whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} 
                          whileTap={{ scale: 0.96 }}
                          onClick={handleToggleFriend}
                          disabled={isProcessingFriend}
                          className={`h-9 px-3.5 rounded-[10px] text-[12.5px] font-medium flex items-center gap-1.5 transition-colors duration-150 ${
                            friendshipStatus === 'accepted' 
                              ? 'bg-white/[0.04] text-zinc-300 border border-white/10 hover:text-red-400 hover:border-red-500/30' 
                              : friendshipStatus === 'pending_sent'
                              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                              : friendshipStatus === 'pending_received'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-white/[0.04] text-white border border-white/10 hover:text-emerald-400 hover:border-emerald-500/30'
                          }`}
                        >
                          {isProcessingFriend ? (
                            <Loader2 size={14} className="animate-spin opacity-70" />
                          ) : friendshipStatus === 'accepted' ? (
                            <><UserMinus size={14} className="opacity-70" /> Remove Friend</>
                          ) : friendshipStatus === 'pending_sent' ? (
                            <><UserMinus size={14} className="opacity-70" /> Cancel Request</>
                          ) : friendshipStatus === 'pending_received' ? (
                            <><Check size={14} className="opacity-70" /> Accept Request</>
                          ) : (
                            <><UserPlus size={14} className="opacity-70" /> Add Friend</>
                          )}
                        </motion.button>
                      )}

                      {/* Message / My Profile Button */}
                      {user?.id !== activeProfile?.id ? (
                        <motion.button 
                          whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.96 }}
                          onClick={() => { handleClose(); navigate(`/messages/${activeProfile?.id}`); }}
                          className="h-9 px-4 rounded-[10px] text-[12.5px] font-semibold text-black flex items-center gap-1.5"
                          style={{ background: 'var(--app-accent, #ffffff)', boxShadow: '0 2px 10px rgba(255,255,255,0.1)' }}
                        >
                          <MessageSquare size={14} className="opacity-80" /> Message
                        </motion.button>
                      ) : (
                        <motion.button 
                          whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.96 }}
                          onClick={() => { handleClose(); navigate(`/profile/${user?.id}`); }}
                          className="h-9 px-4 rounded-[10px] text-[12.5px] font-semibold text-black flex items-center gap-1.5"
                          style={{ background: 'var(--app-accent, #ffffff)', boxShadow: '0 2px 10px rgba(255,255,255,0.1)' }}
                        >
                          <User size={14} className="opacity-80" /> My Profile
                        </motion.button>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex items-center gap-1 px-4 border-b border-white/[0.06] overflow-x-auto no-scrollbar flex-shrink-0">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="relative px-3 py-3.5 text-[12.5px] font-medium whitespace-nowrap flex items-center gap-2 outline-none group"
                      style={{ color: active ? 'white' : 'rgb(113,113,122)' }}
                    >
                      <tab.icon size={14} className={`${active ? 'text-[var(--app-accent,#a855f7)]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                      {tab.label}
                      {active && (
                        <motion.div
                          layoutId="profileTabBottom"
                          className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-t-full"
                          style={{ background: 'var(--app-accent, #ffffff)', boxShadow: '0 -2px 10px rgba(255,255,255,0.1)' }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <main className="flex-1 overflow-y-auto py-5 px-6" style={{ scrollbarGutter: 'stable' }}>
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex h-[200px] items-center justify-center">
                      <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
                    </motion.div>
                  ) : (

                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                      transition={{ duration: 0.15 }}
                      className="flex flex-col gap-8 pb-4"
                    >
                      
                      {/* OVERVIEW */}
                      {activeTab === 'overview' && (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { icon: Calendar, label: "Joined", val: stats.joined },
                              { icon: ActivityIcon, label: "Activity", val: stats.activity },
                              { icon: Users, label: "Friends", val: stats.friends },
                              { icon: Award, label: "Badges", val: stats.badges }
                            ].map((stat, i) => (
                              <motion.div 
                                key={i}
                                whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="flex flex-col gap-1 p-3.5 rounded-[14px] cursor-default group"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                              >
                                <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-500 flex items-center gap-1.5">
                                  <stat.icon size={12} className="text-[var(--app-accent,#a855f7)] opacity-80 group-hover:opacity-100" /> 
                                  {stat.label}
                                </span>
                                <span className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: DISPLAY_FONT }}>{stat.val}</span>
                              </motion.div>
                            ))}
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                              <p className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-zinc-500">Recent Activity</p>
                              <button onClick={() => setActiveTab('activity')} className="text-[10px] uppercase font-bold tracking-widest text-[var(--app-accent,#a855f7)] hover:underline flex items-center gap-0.5">
                                View All <ChevronRight size={10} />
                              </button>
                            </div>
                            <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--app-border)' }}>
                              {comments.length === 0 ? (
                                <div className="p-8 flex flex-col items-center justify-center text-center bg-white/[0.01]">
                                  <ActivityIcon size={18} className="text-zinc-600 mb-2" />
                                  <p className="text-[12px] text-zinc-500">No recent activity.</p>
                                </div>
                              ) : (
                                <div className="flex flex-col bg-white/[0.01]">
                                  {comments.slice(0, 3).map((c, i) => (
                                    <div 
                                      key={c.id} 
                                      onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id, handleClose)} 
                                      className="p-4 cursor-pointer flex gap-3 hover:bg-white/[0.035] group"
                                      style={i !== Math.min(comments.length, 3) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    >
                                      <div className="mt-0.5 opacity-60 text-zinc-400 group-hover:opacity-100 group-hover:text-white transition-all duration-75">
                                        {c.type === 'reply' ? <MessageSquareReply size={14} /> : <MessageSquare size={14} />}
                                      </div>
                                      <div>
                                        <p className="text-[13px] text-white/90 line-clamp-2 leading-relaxed">{c.content}</p>
                                        <div className="flex items-center gap-2 mt-2 text-[10.5px] text-zinc-500">
                                          <span className="capitalize">{c.type}</span> • {timeAgo(c.created_at)}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ACTIVITY */}
                      {activeTab === 'activity' && (
                        <div className="flex flex-col gap-3">
                          {comments.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center rounded-[16px] border border-white/[0.05] bg-white/[0.01]">
                              <MessageSquare size={24} className="text-zinc-600 mb-3" strokeWidth={1.5} />
                              <p className="text-[13px] text-zinc-400">No activity to display.</p>
                            </div>
                          ) : (
                            comments.map((c) => (
                              <motion.div 
                                key={c.id}
                                whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                                whileTap={{ scale: 0.99 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id, handleClose)} 
                                className="p-4 rounded-[14px] cursor-pointer flex gap-3.5"
                                style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
                              >
                                <div className="mt-0.5">
                                  {c.type === 'reply' ? (
                                    <MessageSquareReply size={14} className="text-zinc-400" />
                                  ) : (
                                    <MessageSquare size={14} className="text-white" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-[13px] text-white/90 leading-relaxed">{c.content}</p>
                                  <div className="flex items-center gap-2.5 mt-2.5 text-[11px] text-zinc-500">
                                    <span className="capitalize text-zinc-400 font-medium">{c.type}</span>
                                    <span>{timeAgo(c.created_at)}</span>
                                    {c.likes_count > 0 && <span>• {c.likes_count} likes</span>}
                                  </div>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </div>
                      )}

                      {/* BOOKMARKS */}
                      {activeTab === 'bookmarks' && (
                        <div>
                          {bookmarks.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-center rounded-[16px] border border-white/[0.05] bg-white/[0.01]">
                              <Bookmark size={24} className="text-zinc-600 mb-3" strokeWidth={1.5} />
                              <p className="text-[13px] text-zinc-400">Nothing bookmarked yet.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                              {bookmarks.map(b => (
                                <motion.div 
                                  key={b.mal_id} 
                                  whileHover={{ y: -4, scale: 1.02 }} 
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                  onClick={() => { handleClose(); navigate(`/watch/${b.mal_id}`); }} 
                                  className="group cursor-pointer"
                                >
                                  <div className="aspect-[2/3] rounded-[12px] overflow-hidden bg-zinc-900 border border-white/5 relative shadow-lg">
                                    {b.cover ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-700" /></div>}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center backdrop-blur-[2px]">
                                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><ExternalLink size={16} className="text-white" /></div>
                                    </div>
                                  </div>
                                  <p className="mt-2.5 text-[11.5px] font-medium text-zinc-400 truncate group-hover:text-white px-0.5">{b.title}</p>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* FRIENDS */}
                      {activeTab === 'friends' && (
                        <div className="flex flex-col gap-5">
                          
                          {/* Pending Requests (Only visible to profile owner) */}
                          {pendingRequests.length > 0 && (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center justify-between mb-1 px-1">
                                <p className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-zinc-500">Pending Requests</p>
                              </div>
                              {pendingRequests.map((req) => (
                                <motion.div 
                                  key={`req-${req.id}`}
                                  className="flex items-center justify-between p-3.5 rounded-[14px] bg-white/[0.02] border border-emerald-500/10"
                                >
                                  <div 
                                    className="flex items-center gap-3.5 cursor-pointer group"
                                    onClick={() => window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: req.id } }))}
                                  >
                                    <div className="relative">
                                      {req.avatar_url ? (
                                        <img src={req.avatar_url} alt={req.display_name} className="w-11 h-11 rounded-full bg-zinc-800 object-cover shadow-sm" />
                                      ) : (
                                        <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm">
                                          <User size={20} className="text-zinc-500" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[13.5px] font-medium text-white/95 group-hover:text-[var(--app-accent)] transition-colors">
                                        {req.display_name || 'Anonymous User'}
                                      </span>
                                      <span className="text-[11px] text-zinc-500">Wants to connect</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handlePendingAction(req.id, 'decline')}
                                      className="p-2 rounded-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                    >
                                      <X size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handlePendingAction(req.id, 'accept')}
                                      className="p-2 rounded-[10px] text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors"
                                    >
                                      <Check size={16} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {/* Accepted Friends List */}
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between mb-1 px-1">
                              <p className="text-[10.5px] font-semibold tracking-[0.1em] uppercase text-zinc-500">Network</p>
                              {/* Brought Back: The Add button inside the friends tab */}
                              <motion.button 
                                whileHover={{ scale: 1.05 }} 
                                whileTap={{ scale: 0.95 }} 
                                onClick={() => { handleClose(); navigate('/users'); }}
                                className="text-[11px] font-medium flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.05] text-white border border-white/10 hover:bg-white/10 transition-colors duration-100"
                              >
                                <Plus size={12} /> Add
                              </motion.button>
                            </div>
                            
                            {friends.length === 0 ? (
                              <div className="p-12 flex flex-col items-center justify-center text-center rounded-[16px] border border-white/[0.05] bg-white/[0.01]">
                                <Users size={24} className="text-zinc-600 mb-3" strokeWidth={1.5} />
                                <p className="text-[13px] text-zinc-400">No friends to display.</p>
                              </div>
                            ) : (
                              friends.map((f) => (
                                <motion.div 
                                  key={f.id} 
                                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.035)', borderColor: 'rgba(255,255,255,0.1)' }}
                                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                  onClick={() => {
                                    window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: f.id } }));
                                  }}
                                  className="flex items-center justify-between p-3.5 rounded-[14px] cursor-pointer group"
                                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)' }}
                                >
                                  <div className="flex items-center gap-3.5">
                                    <div className="relative">
                                      {f.avatar_url ? (
                                        <img src={f.avatar_url} alt={f.display_name} className="w-11 h-11 rounded-full bg-zinc-800 object-cover shadow-sm" />
                                      ) : (
                                        <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm">
                                          <User size={20} className="text-zinc-500" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-[13.5px] font-medium text-white/95 group-hover:text-[var(--app-accent)] transition-colors">
                                        {f.display_name || 'Anonymous User'}
                                      </span>
                                      <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                                        {Array.isArray(f.role) ? f.role.join(' • ') : f.role || 'Member'}
                                      </span>
                                    </div>
                                  </div>
                                  <motion.button 
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }} 
                                    whileTap={{ scale: 0.9 }} 
                                    className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-zinc-300 hover:text-white"
                                  >
                                    <ChevronRight size={14} />
                                  </motion.button>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* BADGES */}
                      {activeTab === 'badges' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative">
                          <style>{`
                            @keyframes profileTerminalBlink { 50% { opacity: 0; } }
                            .profile-badge-dev::after {
                              content: '_';
                              color: #38bdf8;
                              animation: profileTerminalBlink 1s step-start infinite;
                            }
                            @keyframes profileWarmBreath {
                              0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); }
                              100% { box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); border-color: rgba(239, 68, 68, 0.5); }
                            }
                          `}</style>

                          {activeUserBadges.map((b) => {
                            const isFounder = b.cssClass === 'badge-founder';
                            const isDev = b.cssClass === 'badge-dev';
                            const isFire = b.cssClass === 'badge-fire';
                            
                            return (
                              <motion.div 
                                key={b.id} 
                                whileHover={{ scale: 1.02, y: -2, borderColor: `${b.color}60` }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`relative overflow-hidden p-4 rounded-[14px] flex flex-col gap-3 cursor-default ${isFire ? 'hover:animate-[profileWarmBreath_2s_infinite_alternate]' : ''}`}
                                style={{ 
                                  background: `linear-gradient(145deg, ${b.color}20 0%, ${b.color}05 100%)`, 
                                  border: `1px solid ${b.color}25`,
                                  fontFamily: isDev ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit'
                                }}
                              >
                                <div className="flex items-center justify-between relative z-10">
                                  <div 
                                    className="w-10 h-10 rounded-[10px] flex items-center justify-center shadow-sm backdrop-blur-md" 
                                    style={{ 
                                      background: `${b.color}20`, 
                                      borderColor: `${b.color}40`,
                                      borderWidth: '1px',
                                      color: b.color,
                                      backgroundBlendMode: isFounder ? 'color-dodge' : 'normal'
                                    }}
                                  >
                                    <b.icon size={20} strokeWidth={2} />
                                  </div>
                                </div>
                                
                                <div className="relative z-10 mt-1">
                                  <h4 
                                    className={`text-[13.5px] font-bold mb-1 ${isDev ? 'profile-badge-dev text-[#7dd3fc]' : 'text-white'}`} 
                                    style={{ fontFamily: isDev ? 'inherit' : DISPLAY_FONT, color: isFounder ? '#d8b4fe' : undefined }}
                                  >
                                    {b.name}
                                  </h4>
                                  <p className="text-[11.5px] text-zinc-400 leading-relaxed">{b.desc}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}

                    </motion.div>
                  )}
                </AnimatePresence>
              </main>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProfileModal;