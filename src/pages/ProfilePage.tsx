import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Bookmark, Activity as ActivityIcon, Users,
  Award, ExternalLink, Calendar, MessageSquare, MessageSquareReply,
  Plus, Check, Loader2, ChevronRight, Crown, Terminal, BadgeCheck,
  Gem, Flame, UserPlus, UserMinus, X, Settings, Shield, Play, Lock, BarChart3
} from 'lucide-react';
import PageLoader from '../components/shared/PageLoader';
import { useAuth } from '../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey, supabase } from '../lib/supabase';
import { canViewVisibility, fetchFriendshipStatus, fetchWatchActivity, getVisibility, type SocialProfile } from '../utils/social';
import { fetchAnimeInfo } from '../utils/animeApi';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── STYLES & VARIANTS ────────────────────────────────────────────────────────
const DESIGN_STYLES = `
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
  .aw-root { font-family: var(--aw-font-body); background: var(--aw-bg); color: var(--aw-text); }
  .aw-noise::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat; background-size: 180px;
  }
`;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
};

// ─── CONSTANTS & MOCK DATA ────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'activity', label: 'Activity', icon: ActivityIcon },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'friends', label: 'Friends', icon: Users },
  { id: 'badges', label: 'Badges', icon: Award },
] as const;

type TabId = typeof TABS[number]['id'];

const MOCK_BADGES = [
  { id: 'founder', name: 'Founder', desc: 'Original creator of the platform.', icon: Crown, cssClass: 'badge-founder', color: '#a855f7' },
  { id: 'dev', name: 'Developer', desc: 'Core system architect and maintainer.', icon: Terminal, cssClass: 'badge-dev', color: '#38bdf8' },
  { id: 'verified', name: 'Verified', desc: 'Trusted community member.', icon: BadgeCheck, cssClass: 'badge-verified', color: '#10b981' },
  { id: 'premium', name: 'Premium', desc: 'Active platform supporter.', icon: Gem, cssClass: 'badge-premium', color: '#f59e0b' },
  { id: 'fire', name: 'On Fire', desc: 'Received over 50 likes on a comment.', icon: Flame, cssClass: 'badge-fire', color: '#ef4444' },
];

// ─── INTERFACES ───────────────────────────────────────────────────────────────
interface ProfileData extends SocialProfile { display_name: string; created_at: string; badges?: string[]; }
interface ActivityItem { id: string; content: string; created_at: string; page_type: string; page_id: string; likes_count: number; type: 'comment' | 'reply' | 'watch'; href?: string; episode_image?: string; anime_cover?: string; episode_number?: number; anime_title?: string; progress_time?: number | null; duration?: number | null; }
interface BookmarkItem { mal_id: string; title: string; cover: string; type: string; status: string; }
interface FriendItem { id: string; display_name: string; avatar_url: string; role?: string | string[]; friendship_date?: string; }
type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
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

const handleContentNavigation = (navigate: any, pageType: string, pageId: string, href?: string) => {
  if (href) return navigate(href);
  if (pageId.includes('/')) return navigate(pageId.startsWith('/') ? pageId : `/${pageId}`);
  const genericMatch = pageId.match(/(?:anime|manga)-(\d+)/);
  if (genericMatch) return navigate(`/${pageType === 'anime' || pageId.includes('anime') ? 'watch' : 'read'}/${genericMatch[1]}`);
  navigate(`/${pageType === 'anime' ? 'watch' : 'read'}/${pageId}`);
};

// ─── RICH ROLE BADGES ───
const renderRoleTag = (rawRole: any) => {
  if (!rawRole) return null;
  let rolesArray: string[] = [];
  if (Array.isArray(rawRole)) rolesArray = rawRole;
  else if (typeof rawRole === 'string') rolesArray = rawRole.split(',');
  const cleanRoles = rolesArray.map(r => r.replace(/['"]/g, '').trim()).filter(r => r && r.toLowerCase() !== 'member');
  if (cleanRoles.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
      {cleanRoles.map((role, idx) => {
        const lowerRole = role.toLowerCase();
        let Icon = Award; let color = 'var(--app-accent)';
        if (lowerRole === 'developer' || lowerRole === 'dev') { Icon = Terminal; color = '#38bdf8'; }
        else if (lowerRole === 'founder') { Icon = Crown; color = '#a855f7'; }
        else if (lowerRole === 'verified') { Icon = BadgeCheck; color = '#10b981'; }
        else if (lowerRole === 'vip' || lowerRole === 'premium') { Icon = Gem; color = '#f59e0b'; }
        else if (lowerRole === 'admin' || lowerRole === 'moderator' || lowerRole === 'mod') { Icon = Shield; color = '#ef4444'; }

        return (
          <div key={idx} className="flex items-center gap-1 px-2.5 py-1 rounded-md border" style={{ color, backgroundColor: `${color}15`, borderColor: `${color}30` }}>
            <Icon size={12} strokeWidth={2.5} />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none mt-[1px]">{role}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [monthlyGenres, setMonthlyGenres] = useState<string[]>([]);

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

      const [pRes, cRes, rRes, bRes, watchRows] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${userId}&select=mal_id,title,cover,type,status&order=created_at.desc`, { headers }),
        fetchWatchActivity(userId, 30, { dedupeEpisodes: true })
      ]);

      const pList = pRes.ok ? await pRes.json() : [];
      const profileData = pList[0] || null;
      if (profileData?.display_name) document.title = `${profileData.display_name}'s Profile`;

      const viewerStatus = await fetchFriendshipStatus(currentUser?.id, userId);
      setProfile(profileData);
      setFriendshipStatus(viewerStatus);
      const canViewActivity = canViewVisibility(userId, currentUser?.id, viewerStatus, getVisibility(profileData, 'activity_visibility'));

      const cList = canViewActivity && cRes.ok ? await cRes.json() : [];
      const rList = canViewActivity && rRes.ok ? await rRes.json() : [];
      const bList = canViewActivity && bRes.ok ? await bRes.json() : [];
      const wList = canViewActivity ? watchRows : [];

      const combinedActivity = [
        ...cList.map((c: any) => ({ ...c, type: 'comment' as const })),
        ...rList.map((r: any) => ({ ...r, type: 'reply' as const })),
        ...wList.map((w: any) => ({
          id: w.id || `watch-${w.anime_id}-${w.episode_id}`,
          content: `Watched Episode ${w.episode_number} of ${w.anime_title}`,
          created_at: w.created_at, page_type: 'anime', page_id: w.anime_id, likes_count: 0,
          type: 'watch' as const, href: w.href, episode_image: w.episode_image, anime_cover: w.anime_cover,
          episode_number: w.episode_number, anime_title: w.anime_title, progress_time: w.progress_time, duration: w.duration
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivity(combinedActivity);
      setBookmarks(bList);

      let fetchedFriends: FriendItem[] = [];
      let fetchedPending: FriendItem[] = [];
      let relStatus: FriendshipStatus = viewerStatus;

      const { data: fData } = await supabase.from('friendships').select('user_id, friend_id, created_at').eq('status', 'accepted').or(`user_id.eq.${userId},friend_id.eq.${userId}`);
      if (fData && fData.length > 0) {
        const friendIds = fData.map(f => f.user_id === userId ? f.friend_id : f.user_id);
        const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', friendIds);
        if (pData) fetchedFriends = pData.map(p => ({ ...p, friendship_date: fData.find(f => f.user_id === p.id || f.friend_id === p.id)?.created_at }));
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

  useEffect(() => {
    const id = 'aw-design-styles-profile';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style'); tag.id = id; tag.textContent = DESIGN_STYLES; document.head.appendChild(tag);
    }
  }, []);

  const activeUserBadges = useMemo(() => {
    if (!profile && activity.length === 0) return [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
    const roles = Array.isArray(profile?.role) ? profile.role.map((r: string) => r.toLowerCase()) : (profile?.role ? [profile.role.toLowerCase()] : []);
    const dbBadges = Array.isArray(profile?.badges) ? profile.badges.map((b: string) => b.toLowerCase()) : [];
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

  const monthlyWatchActivity = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return activity.filter((item) =>
      item.type === 'watch' && new Date(item.created_at).getTime() >= startOfMonth.getTime()
    );
  }, [activity]);

  useEffect(() => {
    if (monthlyWatchActivity.length === 0) {
      setMonthlyGenres([]);
      return;
    }

    let cancelled = false;
    const loadGenres = async () => {
      const uniqueIds = Array.from(new Set(monthlyWatchActivity.map(item => String(item.page_id)))).slice(0, 8);
      const genreCounts = new Map<string, number>();

      await Promise.all(uniqueIds.map(async (id) => {
        try {
          const info = await fetchAnimeInfo(id);
          (info.genres || []).forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1));
        } catch {
          // Best-effort enrichment only.
        }
      }));

      if (!cancelled) {
        setMonthlyGenres(
          [...genreCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genre]) => genre)
        );
      }
    };

    loadGenres();
    return () => { cancelled = true; };
  }, [monthlyWatchActivity]);

  const monthlyRecap = useMemo(() => {
    const showCounts = new Map<string, { title: string; count: number }>();
    const dayCounts = new Map<string, number>();
    let watchedSeconds = 0;

    monthlyWatchActivity.forEach((event) => {
      const showId = String(event.page_id || event.anime_title || event.id);
      const show = showCounts.get(showId) || { title: event.anime_title || 'Unknown anime', count: 0 };
      show.count += 1;
      showCounts.set(showId, show);

      const day = new Date(event.created_at).toLocaleDateString(undefined, { weekday: 'long' });
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      watchedSeconds += event.duration || event.progress_time || 0;
    });

    return {
      episodesWatched: monthlyWatchActivity.length,
      hoursWatched: watchedSeconds > 0 ? Math.round((watchedSeconds / 3600) * 10) / 10 : 0,
      topGenres: monthlyGenres.length > 0 ? monthlyGenres.join(', ') : 'Still learning',
      mostWatchedDay: [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet',
      favoriteShow: [...showCounts.values()].sort((a, b) => b.count - a.count)[0]?.title || 'None yet',
    };
  }, [monthlyGenres, monthlyWatchActivity]);

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
    } catch (err) { } finally { setIsProcessingFriend(false); }
  };

  const handlePendingAction = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!currentUser?.id) return;
    try {
      if (action === 'accept') await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: requesterId, friend_id: currentUser.id });
      else await supabase.from('friendships').delete().match({ user_id: requesterId, friend_id: currentUser.id });
      fetchProfileData();
    } catch (err) { }
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

  // True Status Logic
  const lastActiveTime = profile?.last_active_at ? new Date(profile.last_active_at).getTime() : 0;
  const canViewWatchingStatus = canViewVisibility(userId, currentUser?.id, friendshipStatus, getVisibility(profile, 'watching_status_visibility'));
  const isOnline = canViewWatchingStatus && (Date.now() - lastActiveTime < 15 * 60 * 1000) && profile?.status_state && profile.status_state !== 'offline';
  const latestWatch = canViewVisibility(userId, currentUser?.id, friendshipStatus, getVisibility(profile, 'activity_visibility')) ? activity.find(a => a.type === 'watch') : undefined;
  const canViewProfile = canViewVisibility(userId, currentUser?.id, friendshipStatus, getVisibility(profile, 'profile_visibility'));

  if (profile && !canViewProfile) {
    return (
      <div className="aw-root aw-noise relative min-h-screen flex flex-col pb-24">
        <div className="absolute top-0 left-0 right-0 h-[220px] md:h-[320px] w-full overflow-hidden pointer-events-none z-0" style={{ background: 'var(--app-surface-1)' }}>
          <div className="absolute inset-0 opacity-[0.35]" style={{ background: 'radial-gradient(circle at 50% 0%, var(--app-accent, #8b5cf6) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[var(--app-bg)] to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-[880px] mx-auto px-4 sm:px-6 lg:px-8 pt-[80px] md:pt-[160px]">
          <button onClick={() => navigate(-1)} className="absolute top-[80px] md:top-[120px] left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors text-[12px] font-bold tracking-wide w-fit bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg z-50 uppercase">
            <ArrowLeft size={14} /> Back
          </button>

          <div className="mt-16 md:mt-0 rounded-[24px] border border-white/[0.06] bg-[var(--app-bg-2,rgba(255,255,255,0.015))] p-8 md:p-10 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.9)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="w-[112px] h-[112px] rounded-full overflow-hidden bg-[var(--app-bg)] border-[6px] border-[var(--app-bg)] flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover grayscale opacity-70" /> : <User size={42} className="text-zinc-600" />}
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[4px] border-[var(--app-bg)] bg-[var(--app-accent)] text-black">
                  <Lock size={16} strokeWidth={3} />
                </div>
              </div>
              <h1 className="text-[28px] md:text-[36px] text-white font-bold leading-tight" style={{ fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}>
                {displayName}
              </h1>
              <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Profile Private</p>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-zinc-400">
                This user has set their profile to private. Become friends to view their activity, bookmarks, and network.
              </p>

              {!isOwnProfile && (
                <div className="mt-7 flex w-full max-w-sm flex-col gap-3 sm:flex-row">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleToggleFriend}
                    disabled={isProcessingFriend}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 text-[13px] font-bold text-white transition-colors hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-accent)]/10 hover:text-[var(--app-accent)] disabled:opacity-60"
                  >
                    {isProcessingFriend ? <Loader2 size={16} className="animate-spin" /> : friendshipStatus === 'pending_sent' ? <><UserMinus size={16} /> Cancel Request</> : friendshipStatus === 'pending_received' ? <><Check size={16} /> Accept Request</> : <><UserPlus size={16} /> Add Friend</>}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aw-root aw-noise relative min-h-screen flex flex-col pb-24">

      {/* ─── IMMERSIVE BANNER ─── */}
      <div className="absolute top-0 left-0 right-0 h-[220px] md:h-[320px] w-full overflow-hidden pointer-events-none z-0" style={{ background: 'var(--app-surface-1)' }}>
        <div className="absolute inset-0 opacity-[0.35]" style={{ background: 'radial-gradient(circle at 50% 0%, var(--app-accent, #8b5cf6) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[var(--app-bg)] to-transparent" />
      </div>

      {/* ─── CONTENT CONTAINER ─── */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-[80px] md:pt-[160px]">

        {/* Back Button */}
        <button onClick={() => navigate(-1)} className="absolute top-[80px] md:top-[120px] left-4 sm:left-6 lg:left-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors text-[12px] font-bold tracking-wide w-fit bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg z-50 uppercase">
          <ArrowLeft size={14} /> Back
        </button>

        {/* ─── PROFILE HEADER ─── */}
        <div className="mb-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 relative mt-16 md:mt-0">

          {/* Avatar + Info Group */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 w-full md:w-auto text-center md:text-left">
            <div className="relative flex-shrink-0">
              <div className="w-[110px] h-[110px] md:w-[150px] md:h-[150px] rounded-full overflow-hidden bg-[var(--app-bg)] border-[6px] border-[var(--app-bg)] flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-10 relative">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : <User size={48} className="text-zinc-600" />}
              </div>
              <div className={`absolute bottom-1 right-1 md:bottom-2 md:right-2 w-6 h-6 md:w-7 md:h-7 rounded-full border-[4px] border-[var(--app-bg)] z-20 transition-colors duration-500 ${isOnline ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-zinc-600'}`} />
            </div>

            <div className="flex flex-col pb-1 md:pb-3 w-full">
              <h1 className="text-[28px] md:text-[42px] text-white font-bold leading-tight truncate px-2 md:px-0" style={{ fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}>
                {displayName}
              </h1>

              <div className="mt-2 flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-3">
                {renderRoleTag(profile?.role)}
                <span className={`text-[12px] font-bold tracking-wide px-2 md:px-0 mt-1 md:mt-0 ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {isOnline ? (profile?.status_state === 'watching' ? `Watching: ${profile?.status_text}` : profile?.status_text || 'Online') : (latestWatch ? `Seen ${timeAgo(latestWatch.created_at)}` : 'Offline')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pb-1 md:pb-3 w-full md:w-auto mt-4 md:mt-0 px-2 md:px-0">
            {!isOwnProfile ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleToggleFriend} disabled={isProcessingFriend}
                  className={`flex-1 md:flex-none h-11 px-5 rounded-[14px] text-[13px] font-bold flex items-center justify-center gap-2 transition-colors duration-200 shadow-sm ${friendshipStatus === 'accepted' ? 'bg-white/[0.04] text-zinc-300 border border-white/10 hover:text-red-400 hover:border-red-500/30'
                      : friendshipStatus === 'pending_sent' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                        : friendshipStatus === 'pending_received' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-white/[0.04] text-white border border-white/10 hover:text-[var(--app-accent)] hover:border-[var(--app-accent)]/30 hover:bg-[var(--app-accent)]/5'
                    }`}
                >
                  {isProcessingFriend ? <Loader2 size={16} className="animate-spin opacity-70" /> : friendshipStatus === 'accepted' ? <><UserMinus size={16} /> Unfriend</> : friendshipStatus === 'pending_sent' ? <><UserMinus size={16} /> Cancel</> : friendshipStatus === 'pending_received' ? <><Check size={16} /> Accept</> : <><UserPlus size={16} /> Add Friend</>}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }} whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/messages/${userId}`)}
                  className="flex-1 md:flex-none h-11 px-6 rounded-[14px] text-[13px] font-extrabold text-black flex items-center justify-center gap-2 shadow-lg"
                  style={{ background: 'var(--app-accent, #ffffff)' }}
                >
                  <MessageSquare size={16} /> Message
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/settings`)}
                className="w-full md:w-auto h-11 px-6 rounded-[14px] text-[13px] font-bold text-white flex items-center justify-center gap-2 bg-white/[0.04] border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Settings size={16} /> Edit Profile
              </motion.button>
            )}
          </div>
        </div>

        {/* ─── TABS ROW ─── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-white/[0.06] mb-8 pb-1 -mx-4 px-4 md:mx-0 md:px-0">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 md:px-5 py-3 md:py-4 text-[13px] md:text-[14px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-2 outline-none transition-colors ${active ? 'text-[var(--app-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                style={{ fontFamily: DISPLAY_FONT }}
              >
                <tab.icon size={16} className="mb-[2px]" />
                {tab.label}
                {active && (
                  <motion.div
                    layoutId="profileTabIndicator"
                    className="absolute -bottom-[1px] left-0 right-0 h-[3px] rounded-t-full bg-[var(--app-accent)] shadow-[0_-2px_10px_var(--app-accent-muted)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB CONTENT ─── */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={containerVariants} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8 md:gap-10"
            >

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
                    {[
                      { icon: Calendar, label: "Joined", val: stats.joined },
                      { icon: ActivityIcon, label: "Activity", val: stats.activity },
                      { icon: Users, label: "Friends", val: stats.friends },
                      { icon: Award, label: "Badges", val: stats.badges }
                    ].map((stat, i) => (
                      <motion.div variants={itemVariants} key={i} className="flex flex-col gap-1.5 md:gap-2 p-4 md:p-6 rounded-[16px] md:rounded-[24px] border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.015))] shadow-sm">
                        <span className="text-[10px] md:text-[12px] font-bold tracking-widest uppercase text-zinc-500 flex items-center gap-1.5 md:gap-2">
                          <stat.icon size={14} className="text-[var(--app-accent)]" /> {stat.label}
                        </span>
                        <span className="text-[20px] md:text-[26px] font-bold text-white mt-0.5 md:mt-1 truncate" style={{ fontFamily: DISPLAY_FONT }}>{stat.val}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div variants={itemVariants} className="overflow-hidden rounded-[16px] md:rounded-[24px] border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.015))] shadow-sm">
                    <div className="grid gap-0 md:grid-cols-[0.85fr_1.5fr]">
                      <div className="relative flex min-h-[150px] flex-col justify-between overflow-hidden p-5 md:p-6 border-b border-white/[0.04] md:border-b-0 md:border-r">
                        <div
                          className="absolute inset-0 pointer-events-none opacity-80"
                          style={{ background: 'radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--app-accent) 18%, transparent) 0%, transparent 55%)' }}
                        />
                        <div className="relative z-10 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--app-accent)]">
                          <BarChart3 size={15} />
                          Month In Anime
                        </div>
                        <div className="relative z-10 mt-6 flex items-end gap-5">
                          <div>
                            <div className="text-[36px] md:text-[42px] font-bold leading-none text-white" style={{ fontFamily: DISPLAY_FONT }}>
                              {monthlyRecap.episodesWatched}
                            </div>
                            <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Episodes</div>
                          </div>
                          <div className="mb-1 h-9 w-px bg-white/[0.08]" />
                          <div>
                            <div className="text-[26px] md:text-[30px] font-bold leading-none text-white" style={{ fontFamily: DISPLAY_FONT }}>
                              {monthlyRecap.hoursWatched}
                            </div>
                            <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Hours</div>
                          </div>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
                        {[
                          ['Favorite Show', monthlyRecap.favoriteShow],
                          ['Top Genres', monthlyRecap.topGenres],
                          ['Most Watched', monthlyRecap.mostWatchedDay],
                        ].map(([label, value]) => (
                          <div key={label} className="min-h-[92px] p-4 md:p-5 transition-colors hover:bg-white/[0.03]">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
                            <div className="mt-2 line-clamp-2 text-[14px] font-bold text-white" style={{ fontFamily: DISPLAY_FONT }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  <div className="grid lg:grid-cols-2 gap-6 md:gap-10">
                    {/* Activity Preview */}
                    <motion.div variants={itemVariants}>
                      <div className="flex items-center justify-between mb-4 md:mb-5">
                        <h3 className="text-[14px] md:text-[16px] font-bold tracking-[0.05em] uppercase text-white" style={{ fontFamily: DISPLAY_FONT }}>Recent Activity</h3>
                        <button onClick={() => setActiveTab('activity')} className="text-[11px] md:text-[12px] uppercase font-bold tracking-widest text-[var(--app-accent)] hover:underline flex items-center gap-1">
                          View All <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="rounded-[16px] md:rounded-[24px] border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.01))] overflow-hidden shadow-sm">
                        {activity.length === 0 ? (
                          <div className="p-10 md:p-12 flex flex-col items-center justify-center text-center">
                            <ActivityIcon size={28} className="text-zinc-600 mb-3" />
                            <p className="text-[13px] text-zinc-500">No recent activity.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            {activity.slice(0, 4).map((c) => (
                              <div key={c.id} onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id, c.href)} className="p-4 md:p-5 cursor-pointer flex gap-4 hover:bg-white/[0.03] transition-colors border-b border-white/[0.02] last:border-0 group">
                                {c.type === 'watch' ? (
                                  <div className="w-[80px] h-[45px] shrink-0 rounded-[8px] bg-zinc-900 border border-white/10 overflow-hidden mt-1">
                                    <img src={c.episode_image || c.anime_cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                  </div>
                                ) : (
                                  <div className="mt-1 opacity-60 text-zinc-400 group-hover:opacity-100 group-hover:text-white transition-colors shrink-0">
                                    {c.type === 'reply' ? <MessageSquareReply size={16} /> : <MessageSquare size={16} />}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  {c.type === 'watch' ? (
                                    <p className="text-[13px] md:text-[14px] font-bold text-white/95 truncate">{c.anime_title || c.content.split(' of ')[1]}</p>
                                  ) : (
                                    <p className="text-[13px] md:text-[14px] text-white/90 line-clamp-2 leading-relaxed">{c.content}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                                    <span className="capitalize text-[var(--app-accent)] font-bold tracking-wide">{c.type === 'watch' ? `Ep ${c.episode_number || '?'}` : c.type}</span>
                                    <span className="opacity-50">•</span>
                                    <span>{timeAgo(c.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Bookmarks Preview */}
                    <motion.div variants={itemVariants}>
                      <div className="flex items-center justify-between mb-4 md:mb-5">
                        <h3 className="text-[14px] md:text-[16px] font-bold tracking-[0.05em] uppercase text-white" style={{ fontFamily: DISPLAY_FONT }}>Recent Bookmarks</h3>
                        <button onClick={() => setActiveTab('bookmarks')} className="text-[11px] md:text-[12px] uppercase font-bold tracking-widest text-[var(--app-accent)] hover:underline flex items-center gap-1">
                          View All <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="rounded-[16px] md:rounded-[24px] border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.01))] p-4 md:p-6 shadow-sm">
                        {bookmarks.length === 0 ? (
                          <div className="p-8 md:p-10 flex flex-col items-center justify-center text-center">
                            <Bookmark size={28} className="text-zinc-600 mb-3" />
                            <p className="text-[13px] text-zinc-500">No recent bookmarks.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3 md:gap-4">
                            {bookmarks.slice(0, 6).map(b => (
                              <div key={b.mal_id} onClick={() => navigate(`/watch/${b.mal_id}`)} className="group cursor-pointer">
                                <div className="aspect-[2/3] rounded-[10px] md:rounded-[14px] overflow-hidden bg-zinc-900 border border-white/5 relative">
                                  {b.cover ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-700" /></div>}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Play size={16} fill="currentColor" className="text-white ml-0.5" /></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </>
              )}

              {/* ACTIVITY FULL LIST */}
              {activeTab === 'activity' && (
                <div className="flex flex-col gap-4 md:gap-5 max-w-4xl">
                  {activity.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                      <ActivityIcon size={32} className="text-zinc-600 mb-4" />
                      <p className="text-[14px] text-zinc-500">No activity to display.</p>
                    </div>
                  ) : (
                    activity.map((c) => (
                      <motion.div variants={itemVariants} key={c.id} onClick={() => handleContentNavigation(navigate, c.page_type, c.page_id, c.href)} className="p-4 md:p-6 rounded-[16px] md:rounded-[20px] cursor-pointer flex gap-4 md:gap-5 border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.015))] hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] hover:border-[var(--app-accent)] transition-all shadow-sm active:scale-[0.98]">
                        {c.type === 'watch' ? (
                          <div className="w-[90px] h-[50px] shrink-0 rounded-[8px] bg-zinc-900 border border-white/10 overflow-hidden mt-1 shadow-md">
                            <img src={c.episode_image || c.anime_cover} className="w-full h-full object-cover" alt="" />
                          </div>
                        ) : (
                          <div className="mt-1 text-zinc-400 shrink-0">
                            {c.type === 'reply' ? <MessageSquareReply size={18} /> : <MessageSquare size={18} />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {c.type === 'watch' ? (
                            <>
                              <p className="text-[14px] md:text-[15px] font-bold text-white/95 truncate mb-1">{c.anime_title || c.content.split(' of ')[1]}</p>
                              <p className="text-[12px] md:text-[13px] text-zinc-400 truncate"><span className="text-[var(--app-accent)] font-bold">Ep {c.episode_number || '?'}</span> {c.content.includes(' — ') ? `— ${c.content.split(' — ')[1]}` : ''}</p>
                            </>
                          ) : (
                            <p className="text-[14px] md:text-[15px] text-white/90 leading-relaxed">{c.content}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3 text-[11px] md:text-[12px] text-zinc-500">
                            <span className="capitalize text-zinc-400 font-bold">{c.type}</span> • <span>{timeAgo(c.created_at)}</span>
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
                    <div className="p-16 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                      <Bookmark size={32} className="text-zinc-600 mb-4" />
                      <p className="text-[14px] text-zinc-500">Nothing bookmarked yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                      {bookmarks.map(b => (
                        <motion.div variants={itemVariants} key={b.mal_id} onClick={() => navigate(`/watch/${b.mal_id}`)} className="group cursor-pointer flex flex-col">
                          <div className="aspect-[2/3] rounded-[14px] overflow-hidden bg-zinc-900 border border-white/10 relative shadow-md group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.5)] group-hover:-translate-y-1 transition-all duration-300">
                            {b.cover ? <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-700" /></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                              <div className="w-12 h-12 rounded-full bg-[var(--app-accent)] flex items-center justify-center shadow-[0_0_20px_var(--app-accent-muted)] transform scale-75 group-hover:scale-100 transition-transform duration-300"><Play size={20} fill="#000" className="text-black ml-1" /></div>
                            </div>
                          </div>
                          <div className="pt-2 px-1">
                            <p className="text-[13px] font-bold text-white/90 line-clamp-1 group-hover:text-[var(--app-accent)] transition-colors" style={{ fontFamily: DISPLAY_FONT }}>{b.title}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{b.type} • {b.status}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* FRIENDS FULL LIST */}
              {activeTab === 'friends' && (
                <div className="flex flex-col gap-8 md:gap-10 max-w-4xl">
                  {isOwnProfile && pendingRequests.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <p className="text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase text-[var(--app-accent)] ml-1">Pending Requests</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {pendingRequests.map((req) => (
                          <motion.div variants={itemVariants} key={`req-${req.id}`} className="flex items-center justify-between p-4 rounded-[16px] bg-white/[0.02] border border-[var(--app-accent)]/30 shadow-md">
                            <div className="flex items-center gap-3 cursor-pointer group min-w-0" onClick={() => navigate(`/profile/${req.id}`)}>
                              {req.avatar_url ? <img src={req.avatar_url} alt={req.display_name} className="w-12 h-12 rounded-full bg-zinc-800 object-cover shrink-0" /> : <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0"><User size={20} className="text-zinc-500" /></div>}
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-[14px] font-bold text-white group-hover:text-[var(--app-accent)] transition-colors truncate">{req.display_name || 'Anonymous User'}</span>
                                <span className="text-[11px] text-zinc-400 truncate">Wants to connect</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handlePendingAction(req.id, 'decline')} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-zinc-400 bg-white/[0.04] hover:text-red-400 hover:bg-red-400/10 transition-colors"><X size={16} /></button>
                              <button onClick={() => handlePendingAction(req.id, 'accept')} className="w-9 h-9 rounded-[10px] flex items-center justify-center text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors"><Check size={18} strokeWidth={3} /></button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase text-zinc-500">Network</p>
                      {isOwnProfile && (
                        <button onClick={() => navigate('/users')} className="text-[11px] md:text-[12px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] text-white border border-white/10 hover:bg-[var(--app-accent)] hover:text-black hover:border-[var(--app-accent)] transition-colors uppercase tracking-wider">
                          <Plus size={14} /> Add Friends
                        </button>
                      )}
                    </div>

                    {friends.length === 0 ? (
                      <div className="p-16 flex flex-col items-center justify-center text-center rounded-[24px] border border-white/[0.04] bg-white/[0.01]">
                        <Users size={32} className="text-zinc-600 mb-4" />
                        <p className="text-[14px] text-zinc-500">No friends in network.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {friends.map((f) => (
                          <motion.div variants={itemVariants} key={f.id} onClick={() => navigate(`/profile/${f.id}`)} className="group flex items-center justify-between p-4 rounded-[16px] cursor-pointer border border-white/[0.04] bg-[var(--app-bg-2,rgba(255,255,255,0.015))] hover:border-[var(--app-accent)] hover:bg-[color-mix(in_srgb,var(--app-accent),transparent_95%)] transition-all duration-300 shadow-sm hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] active:scale-[0.98]">
                            <div className="flex items-center gap-4 min-w-0">
                              {f.avatar_url ? <img src={f.avatar_url} alt={f.display_name} className="w-12 h-12 rounded-full bg-zinc-800 object-cover shadow-sm shrink-0" /> : <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shadow-sm shrink-0"><User size={20} className="text-zinc-500" /></div>}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[15px] font-bold text-white/95 truncate group-hover:text-white" style={{ fontFamily: DISPLAY_FONT }}>{f.display_name || 'Anonymous User'}</span>
                                {renderRoleTag(f.role)}
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-zinc-500 group-hover:text-[var(--app-accent)] group-hover:bg-[var(--app-accent)]/20 transition-colors shrink-0">
                              <ChevronRight size={16} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative max-w-5xl">
                  <style>{`
                    @keyframes profileTerminalBlink { 50% { opacity: 0; } }
                    .profile-badge-dev::after { content: '_'; color: #38bdf8; animation: profileTerminalBlink 1s step-start infinite; }
                    @keyframes profileWarmBreath { 0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); } }
                  `}</style>

                  {activeUserBadges.map((b) => {
                    const isFounder = b.cssClass === 'badge-founder';
                    const isDev = b.cssClass === 'badge-dev';
                    const isFire = b.cssClass === 'badge-fire';

                    return (
                      <motion.div
                        variants={itemVariants} key={b.id}
                        className={`relative overflow-hidden p-6 rounded-[20px] md:rounded-[24px] flex flex-col gap-4 cursor-default shadow-sm hover:shadow-lg transition-all duration-300 ${isFire ? 'hover:animate-[profileWarmBreath_2s_infinite_alternate]' : ''}`}
                        style={{ background: `linear-gradient(145deg, ${b.color}15 0%, ${b.color}05 100%)`, border: `1px solid ${b.color}25` }}
                      >
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-[12px] flex items-center justify-center shadow-md" style={{ background: `${b.color}20`, borderColor: `${b.color}40`, borderWidth: '1px', color: b.color }}>
                          <b.icon size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h4 className={`text-[16px] md:text-[18px] font-bold mb-1.5 tracking-tight ${isDev ? 'profile-badge-dev text-[#7dd3fc]' : 'text-white'}`} style={{ fontFamily: isDev ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : DISPLAY_FONT, color: isFounder ? '#d8b4fe' : undefined }}>{b.name}</h4>
                          <p className="text-[12px] md:text-[13px] text-zinc-400 leading-relaxed font-medium">{b.desc}</p>
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
