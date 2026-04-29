
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Bookmark, Activity as ActivityIcon, Users,
  Award, ExternalLink, Calendar, MessageSquare, MessageSquareReply,
  Plus, Check, Loader2, ChevronRight, Crown, Terminal, BadgeCheck,
  Gem, Flame, UserPlus, UserMinus, X, Settings
} from 'lucide-react';
import PageLoader from '../components/shared/PageLoader';
import { useAuth } from '../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey, supabase } from '../lib/supabase';

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
interface ProfileData { id: string; display_name: string; avatar_url: string | null; role?: string | string[]; created_at: string; badges?: string[]; }
interface ActivityItem { id: string; content: string; created_at: string; page_type: string; page_id: string; likes_count: number; type: 'comment' | 'reply'; }
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

const handleContentNavigation = (navigate: any, pageType: string, pageId: string) => {
  if (pageId.includes('/')) return navigate(pageId.startsWith('/') ? pageId : `/${pageId}`);
  const animeMatch = pageId.match(/anime-(\d+)-ep-(\d+)/);
  if (animeMatch) return navigate(`/watch/${animeMatch[1]}/kiwi/sub/animepahe-${animeMatch[2]}`);
  const genericMatch = pageId.match(/(?:anime|manga)-(\d+)/);
  if (genericMatch) return navigate(`/${pageType === 'anime' || pageId.includes('anime') ? 'watch' : 'read'}/${genericMatch[1]}`);
  navigate(`/${pageType === 'anime' ? 'watch' : 'read'}/${pageId}`);
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isProcessingFriend, setIsProcessingFriend] = useState(false);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };

      // 1. Fetch Profile
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers });
      const pList = profileRes.ok ? await profileRes.json() : [];
      setProfile(pList[0] || null);

      // 2. Fetch Activity & Bookmarks
      const [cRes, rRes, bRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${userId}&select=mal_id,title,cover,type,status&order=created_at.desc`, { headers }),
      ]);

      const cList = cRes.ok ? await cRes.json() : [];
      const rList = rRes.ok ? await rRes.json() : [];
      const bList = bRes.ok ? await bRes.json() : [];

      const combinedActivity = [
        ...cList.map((c: any) => ({ ...c, type: 'comment' as const })),
        ...rList.map((r: any) => ({ ...r, type: 'reply' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivity(combinedActivity);
      setBookmarks(bList);

      // 3. Fetch Friends Data via Supabase Client
      let fetchedFriends: FriendItem[] = [];
      let fetchedPending: FriendItem[] = [];
      let relStatus: FriendshipStatus = 'none';

      const { data: fData } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

      if (fData && fData.length > 0) {
        const friendIds = fData.map(f => f.user_id === userId ? f.friend_id : f.user_id);
        const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', friendIds);
        if (pData) fetchedFriends = pData;
      }

      if (isOwnProfile) {
        const { data: reqData } = await supabase.from('friendships').select('user_id').eq('friend_id', userId).eq('status', 'pending');
        if (reqData && reqData.length > 0) {
          const reqIds = reqData.map(r => r.user_id);
          const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', reqIds);
          if (pData) fetchedPending = pData;
        }
      }

      if (currentUser?.id && !isOwnProfile) {
        const { data: d1 } = await supabase.from('friendships').select('*').eq('user_id', currentUser.id).eq('friend_id', userId);
        const { data: d2 } = await supabase.from('friendships').select('*').eq('user_id', userId).eq('friend_id', currentUser.id);
        const relData = [...(d1 || []), ...(d2 || [])];

        if (relData.length > 0) {
          const rel = relData[0];
          if (rel.status === 'accepted') relStatus = 'accepted';
          else relStatus = rel.user_id === currentUser.id ? 'pending_sent' : 'pending_received';
        }
      }

      setFriends(fetchedFriends);
      setPendingRequests(fetchedPending);
      setFriendshipStatus(relStatus);

    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.id, isOwnProfile]);

  useEffect(() => {
    fetchProfileData();
    window.scrollTo(0, 0);
  }, [fetchProfileData]);

  const activeUserBadges = useMemo(() => {
    if (!profile && activity.length === 0) return [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
    
    const roles = Array.isArray(profile?.role) 
      ? profile.role.map((r: string) => r.toLowerCase()) 
      : (profile?.role ? [profile.role.toLowerCase()] : []);
    const dbBadges = Array.isArray(profile?.badges) 
      ? profile.badges.map((b: string) => b.toLowerCase()) 
      : [];
    
    const validIds = new Set([...roles, ...dbBadges]);
    if (activity.some(c => c.likes_count >= 50)) validIds.add('fire');
    if (profile) validIds.add('verified');

    const filtered = MOCK_BADGES.filter(b => validIds.has(b.id) || validIds.has(b.name.toLowerCase()));
    return filtered.length > 0 ? filtered : [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
  }, [profile, activity]);

  const stats = useMemo(() => ({
    joined: profile?.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Unknown',
    bookmarks: bookmarks.length,
    activity: activity.length,
    friends: friends.length,
    badges: activeUserBadges.length, 
  }), [profile, bookmarks, activity, activeUserBadges, friends]);

  const handleToggleFriend = async () => {
    if (!currentUser?.id || !userId || isProcessingFriend || isOwnProfile) return;
    setIsProcessingFriend(true);
    try {
      if (friendshipStatus === 'none') {
        await supabase.from('friendships').insert({ user_id: currentUser.id, friend_id: userId, status: 'pending' });
        setFriendshipStatus('pending_sent');
      } else if (friendshipStatus === 'pending_sent') {
        await supabase.from('friendships').delete().match({ user_id: currentUser.id, friend_id: userId });
        setFriendshipStatus('none');
      } else if (friendshipStatus === 'pending_received') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: userId, friend_id: currentUser.id });
        setFriendshipStatus('accepted');
        fetchProfileData();
      } else if (friendshipStatus === 'accepted') {
        const { data: d1 } = await supabase.from('friendships').delete().match({ user_id: currentUser.id, friend_id: userId }).select();
        if (!d1 || d1.length === 0) await supabase.from('friendships').delete().match({ user_id: userId, friend_id: currentUser.id });
        setFriendshipStatus('none');
        fetchProfileData();
      }
    } catch (err) {
      console.error('Error toggling friend:', err);
    } finally {
      setIsProcessingFriend(false);
    }
  };

  const handlePendingAction = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!currentUser?.id) return;
    try {
      if (action === 'accept') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: requesterId, friend_id: currentUser.id });
      } else {
        await supabase.from('friendships').delete().match({ user_id: requesterId, friend_id: currentUser.id });
      }
      fetchProfileData();
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <PageLoader size={40} text="Loading profile..." />
      </div>
    );
  }

  const displayName = profile?.display_name || 'Anonymous User';
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: APP_FONT, background: 'var(--app-bg)' }}>
      
      {/* FULL BLEED IMMERSIVE BANNER */}
      <div className="absolute top-0 left-0 right-0 h-[380px] lg:h-[450px] w-full overflow-hidden pointer-events-none" style={{ background: 'var(--app-surface-1)' }}>
        <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ background: 'radial-gradient(circle at 70% 20%, var(--app-accent, #8b5cf6) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ background: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.6) 0%, transparent 50%)' }} />
        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-[var(--app-bg)] to-transparent" />
      </div>

      {/* CONTENT CONTAINER (Pushed down over the banner) */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-[100px] pb-24">
        
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-16 lg:mb-24 text-[13px] font-medium w-fit bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Header Block */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          {/* Avatar + Info Group */}
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="w-28 h-28 md:w-40 md:h-40 shrink-0 rounded-[32px] overflow-hidden bg-zinc-900 border-[6px] md:border-[8px] border-[var(--app-bg)] flex items-center justify-center shadow-2xl relative z-10">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : <User size={56} className="text-zinc-600" />}
            </div>
            
            <div className="flex flex-col pb-2 md:pb-4">
              <h1 className="text-4xl md:text-[48px] text-white leading-tight" style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {displayName}
              </h1>
              {profile?.role && (
                <p className="text-[13px] md:text-[14px] text-[var(--app-accent)] font-bold uppercase tracking-[0.2em] mt-1.5">
                  {Array.isArray(profile.role) ? profile.role.join(' • ') : profile.role}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pb-2 md:pb-4">
            {!isOwnProfile ? (
              <>
                <motion.button 
                  whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} 
                  whileTap={{ scale: 0.96 }}
                  onClick={handleToggleFriend}
                  disabled={isProcessingFriend}
                  className={`h-11 px-5 rounded-[14px] text-[14px] font-bold flex items-center gap-2 transition-colors duration-150 shadow-lg ${
                    friendshipStatus === 'accepted' 
                      ? 'bg-white/[0.04] text-zinc-300 border border-white/10 hover:text-red-400 hover:border-red-500/30' 
                      : friendshipStatus === 'pending_sent'
                      ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                      : friendshipStatus === 'pending_received'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-white/[0.04] text-white border border-white/10 hover:text-[var(--app-accent)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-accent)]/5'
                  }`}
                >
                  {isProcessingFriend ? (
                    <Loader2 size={16} className="animate-spin opacity-70" />
                  ) : friendshipStatus === 'accepted' ? (
                    <><UserMinus size={16} className="opacity-70" /> Unfriend</>
                  ) : friendshipStatus === 'pending_sent' ? (
                    <><UserMinus size={16} className="opacity-70" /> Cancel Request</>
                  ) : friendshipStatus === 'pending_received' ? (
                    <><Check size={16} className="opacity-70" /> Accept Request</>
                  ) : (
                    <><UserPlus size={16} className="opacity-70" /> Add Friend</>
                  )}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/messages/${userId}`)}
                  className="h-11 px-6 rounded-[14px] text-[14px] font-extrabold text-black flex items-center gap-2 shadow-xl"
                  style={{ background: 'var(--app-accent, #ffffff)', boxShadow: '0 8px 24px -8px var(--app-accent)' }}
                >
                  <MessageSquare size={16} className="opacity-80" /> Message
                </motion.button>
              </>
            ) : (
              <motion.button 
                whileHover={{ scale: 1.04, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.96 }}
                onClick={() => navigate(`/settings`)}
                className="h-11 px-6 rounded-[14px] text-[14px] font-bold text-white flex items-center gap-2 shadow-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Settings size={16} className="opacity-80" /> Edit Profile
              </motion.button>
            )}
          </div>
        </div>

        {/* Tabs Row */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-white/[0.06] mb-10 pb-1">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative px-5 py-4 text-[15px] font-semibold whitespace-nowrap flex items-center gap-2.5 outline-none group transition-colors"
                style={{ color: active ? 'white' : 'rgb(113,113,122)' }}
              >
                <tab.icon size={18} className={`${active ? 'text-[var(--app-accent,#a855f7)]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="pageTabBottom"
                    className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-t-full"
                    style={{ background: 'var(--app-accent, #ffffff)', boxShadow: '0 -2px 12px rgba(255,255,255,0.2)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-12"
            >
              
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {[
                      { icon: Calendar, label: "Joined", val: stats.joined },
                      { icon: ActivityIcon, label: "Activity", val: stats.activity },
                      { icon: Users, label: "Friends", val: stats.friends },
                      { icon: Award, label: "Badges", val: stats.badges }
                    ].map((stat, i) => (
                      <div 
                        key={i}
                        className="flex flex-col gap-2 p-6 rounded-[24px] border border-white/[0.04] bg-white/[0.015]"
                      >
                        <span className="text-[12px] font-bold tracking-widest uppercase text-zinc-500 flex items-center gap-2">
                          <stat.icon size={16} className="text-[var(--app-accent,#a855f7)]" /> 
                          {stat.label}
                        </span>
                        <span className="text-[28px] font-bold text-white mt-1" style={{ fontFamily: DISPLAY_FONT }}>{stat.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-10">
                    {/* Activity Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[16px] font-bold tracking-[0.05em] uppercase text-white" style={{ fontFamily: DISPLAY_FONT }}>Recent Activity</h3>
                        <button onClick={() => setActiveTab('activity')} className="text-[12px] uppercase font-bold tracking-widest text-[var(--app-accent,#a855f7)] hover:underline flex items-center gap-1">
                          View All <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="rounded-[24px] border border-white/[0.04] bg-white/[0.01] overflow-hidden">
                        {activity.length === 0 ? (
                          <div className="p-12 flex flex-col items-center justify-center text-center">
                            <ActivityIcon size={32} className="text-zinc-600 mb-4" strokeWidth={1.5} />
                            <p className="text-[14px] text-zinc-500">No recent activity.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {activity.slice(0, 4).map((c) => (
                              <div 
                                key={c.id} 
                                onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id)} 
                                className="p-6 cursor-pointer flex gap-5 hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] last:border-0 group"
                              >
                                <div className="mt-1 opacity-60 text-zinc-400 group-hover:opacity-100 group-hover:text-white transition-colors">
                                  {c.type === 'reply' ? <MessageSquareReply size={18} /> : <MessageSquare size={18} />}
                                </div>
                                <div>
                                  <p className="text-[15px] text-white/90 line-clamp-2 leading-relaxed">{c.content}</p>
                                  <div className="flex items-center gap-2.5 mt-3 text-[12px] text-zinc-500">
                                    <span className="capitalize text-zinc-400 font-bold">{c.type}</span> • {timeAgo(c.created_at)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bookmarks Preview */}
                    <div>
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[16px] font-bold tracking-[0.05em] uppercase text-white" style={{ fontFamily: DISPLAY_FONT }}>Recent Bookmarks</h3>
                        <button onClick={() => setActiveTab('bookmarks')} className="text-[12px] uppercase font-bold tracking-widest text-[var(--app-accent,#a855f7)] hover:underline flex items-center gap-1">
                          View All <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="rounded-[24px] border border-white/[0.04] bg-white/[0.01] p-6">
                        {bookmarks.length === 0 ? (
                          <div className="p-10 flex flex-col items-center justify-center text-center">
                            <Bookmark size={32} className="text-zinc-600 mb-4" strokeWidth={1.5} />
                            <p className="text-[14px] text-zinc-500">No recent bookmarks.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-4">
                            {bookmarks.slice(0, 6).map(b => (
                              <div key={b.mal_id} onClick={() => navigate(`/watch/${b.mal_id}`)} className="group cursor-pointer">
                                <div className="aspect-[2/3] rounded-[14px] overflow-hidden bg-zinc-900 border border-white/5 relative">
                                  {b.cover ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-700" /></div>}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center"><ExternalLink size={20} className="text-white" /></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ACTIVITY FULL LIST */}
              {activeTab === 'activity' && (
                <div className="flex flex-col gap-5 max-w-5xl">
                  {activity.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                      <MessageSquare size={40} className="text-zinc-600 mb-5" strokeWidth={1.5} />
                      <p className="text-[15px] text-zinc-400">No activity to display.</p>
                    </div>
                  ) : (
                    activity.map((c) => (
                      <motion.div 
                        key={c.id}
                        whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id)} 
                        className="p-6 md:p-8 rounded-[24px] cursor-pointer flex gap-6 border border-white/[0.04] bg-white/[0.015]"
                      >
                        <div className="mt-1">
                          {c.type === 'reply' ? <MessageSquareReply size={20} className="text-zinc-400" /> : <MessageSquare size={20} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-[16px] text-white/95 leading-relaxed">{c.content}</p>
                          <div className="flex items-center gap-3 mt-4 text-[13px] text-zinc-500">
                            <span className="capitalize text-zinc-400 font-bold tracking-wide">{c.type}</span>
                            <span>{timeAgo(c.created_at)}</span>
                            {c.likes_count > 0 && <span>• {c.likes_count} likes</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}

              {/* BOOKMARKS FULL LIST */}
              {activeTab === 'bookmarks' && (
                <div>
                  {bookmarks.length === 0 ? (
                    <div className="p-20 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                      <Bookmark size={40} className="text-zinc-600 mb-5" strokeWidth={1.5} />
                      <p className="text-[15px] text-zinc-400">Nothing bookmarked yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                      {bookmarks.map(b => (
                        <motion.div 
                          key={b.mal_id} 
                          whileHover={{ y: -6, scale: 1.02 }} 
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          onClick={() => navigate(`/watch/${b.mal_id}`)} 
                          className="group cursor-pointer"
                        >
                          <div className="aspect-[2/3] rounded-[18px] overflow-hidden bg-zinc-900 border border-white/5 relative shadow-xl">
                            {b.cover ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-700" /></div>}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"><ExternalLink size={24} className="text-white" /></div>
                            </div>
                          </div>
                          <p className="mt-3.5 text-[14px] font-bold text-zinc-300 truncate group-hover:text-white px-1">{b.title}</p>
                          <p className="mt-1 text-[12px] text-zinc-500 px-1">{b.type} • {b.status}</p>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FRIENDS FULL LIST */}
              {activeTab === 'friends' && (
                <div className="flex flex-col gap-10 max-w-5xl">
                  
                  {isOwnProfile && pendingRequests.length > 0 && (
                    <div className="flex flex-col gap-5">
                      <p className="text-[13px] font-bold tracking-[0.15em] uppercase text-[var(--app-accent)] ml-1">Pending Requests</p>
                      <div className="grid md:grid-cols-2 gap-5">
                        {pendingRequests.map((req) => (
                          <div key={`req-${req.id}`} className="flex items-center justify-between p-5 rounded-[24px] bg-white/[0.02] border border-[var(--app-accent)]/20 shadow-lg">
                            <div className="flex items-center gap-5 cursor-pointer group" onClick={() => navigate(`/profile/${req.id}`)}>
                              {req.avatar_url ? (
                                <img src={req.avatar_url} alt={req.display_name} className="w-14 h-14 rounded-full bg-zinc-800 object-cover" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center"><User size={24} className="text-zinc-500" /></div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-[16px] font-bold text-white group-hover:text-[var(--app-accent)] transition-colors">{req.display_name || 'Anonymous User'}</span>
                                <span className="text-[13px] text-zinc-400">Wants to connect</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handlePendingAction(req.id, 'decline')} className="w-11 h-11 rounded-[14px] flex items-center justify-center text-zinc-400 bg-white/[0.04] hover:text-red-400 hover:bg-red-400/10 transition-colors">
                                <X size={18} />
                              </button>
                              <button onClick={() => handlePendingAction(req.id, 'accept')} className="w-11 h-11 rounded-[14px] flex items-center justify-center text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors">
                                <Check size={20} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[13px] font-bold tracking-[0.15em] uppercase text-zinc-500">Network</p>
                      {isOwnProfile && (
                        <button onClick={() => navigate('/users')} className="text-[13px] font-bold flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] text-white border border-white/10 hover:bg-white/10 transition-colors">
                          <Plus size={16} /> Add Friends
                        </button>
                      )}
                    </div>
                    
                    {friends.length === 0 ? (
                      <div className="p-20 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                        <Users size={40} className="text-zinc-600 mb-5" strokeWidth={1.5} />
                        <p className="text-[15px] text-zinc-400">No friends in network.</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 gap-5">
                        {friends.map((f) => (
                          <motion.div 
                            key={f.id} 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.1)' }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => navigate(`/profile/${f.id}`)}
                            className="flex items-center justify-between p-5 rounded-[24px] cursor-pointer border border-white/[0.04] bg-white/[0.015]"
                          >
                            <div className="flex items-center gap-5">
                              {f.avatar_url ? (
                                <img src={f.avatar_url} alt={f.display_name} className="w-14 h-14 rounded-full bg-zinc-800 object-cover shadow-sm" />
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm"><User size={24} className="text-zinc-500" /></div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[16px] font-bold text-white/95">{f.display_name || 'Anonymous User'}</span>
                                <span className="text-[12px] font-semibold text-[var(--app-accent)] uppercase tracking-widest mt-0.5">
                                  {Array.isArray(f.role) ? f.role.join(' • ') : f.role || 'Member'}
                                </span>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-zinc-400">
                              <ChevronRight size={18} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* BADGES FULL LIST */}
              {activeTab === 'badges' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative max-w-6xl">
                  <style>{`
                    @keyframes profileTerminalBlink { 50% { opacity: 0; } }
                    .profile-badge-dev::after { content: '_'; color: #38bdf8; animation: profileTerminalBlink 1s step-start infinite; }
                    @keyframes profileWarmBreath { 0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); border-color: rgba(239, 68, 68, 0.5); } }
                  `}</style>

                  {activeUserBadges.map((b) => {
                    const isFounder = b.cssClass === 'badge-founder';
                    const isDev = b.cssClass === 'badge-dev';
                    const isFire = b.cssClass === 'badge-fire';
                    
                    return (
                      <motion.div 
                        key={b.id} 
                        whileHover={{ scale: 1.03, y: -4, borderColor: `${b.color}60` }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`relative overflow-hidden p-6 md:p-8 rounded-[28px] flex flex-col gap-5 cursor-default ${isFire ? 'hover:animate-[profileWarmBreath_2s_infinite_alternate]' : ''}`}
                        style={{ 
                          background: `linear-gradient(145deg, ${b.color}20 0%, ${b.color}05 100%)`, 
                          border: `1px solid ${b.color}25`,
                          fontFamily: isDev ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit'
                        }}
                      >
                        <div className="flex items-center justify-between relative z-10">
                          <div 
                            className="w-16 h-16 rounded-[16px] flex items-center justify-center shadow-lg backdrop-blur-xl" 
                            style={{ background: `${b.color}25`, borderColor: `${b.color}50`, borderWidth: '1px', color: b.color, backgroundBlendMode: isFounder ? 'color-dodge' : 'normal' }}
                          >
                            <b.icon size={32} strokeWidth={2} />
                          </div>
                        </div>
                        
                        <div className="relative z-10 mt-3">
                          <h4 
                            className={`text-[20px] font-bold mb-2 tracking-tight ${isDev ? 'profile-badge-dev text-[#7dd3fc]' : 'text-white'}`} 
                            style={{ fontFamily: isDev ? 'inherit' : DISPLAY_FONT, color: isFounder ? '#d8b4fe' : undefined }}
                          >
                            {b.name}
                          </h4>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">{b.desc}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;