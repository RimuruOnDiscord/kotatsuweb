/* --- START OF UPDATED FILE --- */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, User, Bookmark, Activity as ActivityIcon, Users,
  Award, ExternalLink, Calendar, MessageSquare, MessageSquareReply, Check, Loader2, ChevronRight,
  Crown, Terminal, BadgeCheck, Gem, Flame, UserPlus, UserMinus, Shield, Play,
  Search, Filter, ChevronDown, LayoutGrid, ListVideo, PlayCircle, CheckCircle2, PauseCircle, XCircle, Info, Lock,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey, supabase } from '../../lib/supabase';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { fetchAnimeEpisodes, fetchAnimeInfo } from '../../utils/animeApi';
import { canViewVisibility, fetchFriendshipStatus, fetchWatchActivity, getVisibility } from '../../utils/social';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

// ─── Animation Variants ────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }
};

// ─── Constants & Mock Data ────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: Info, desc: 'At a glance' },
  { id: 'friends', label: 'Friends', icon: Users, desc: 'Connections and requests' },
  { id: 'activity', label: 'Activity', icon: ActivityIcon, desc: 'Recent interactions' },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark, desc: 'Saved content' },
  { id: 'badges', label: 'Badges', icon: Award, desc: 'Earned achievements' },
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
interface ProfileModalProps { open?: boolean; onClose?: () => void; userId?: string; }
interface CommentItem { id: string; content: string; created_at: string; page_type: string; page_id: string; likes_count: number; type: 'comment' | 'reply' | 'watch'; href?: string; anime_cover?: string; episode_image?: string; episode_title?: string; anime_title?: string; episode_number?: number; progress_time?: number | null; duration?: number | null; }
interface BookmarkItem { id: string; title: string; cover: string; type: string; status: string; episodes?: number; }
interface FriendItem { id: string; display_name: string; avatar_url: string; role?: string | string[]; friendship_date?: string; }
type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

// ─── Helpers & UI Primitives ──────────────────────────────────────────────────
const timeAgo = (dateStr: string) => {
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now'; if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`; return `${Math.floor(days / 30)}mo ago`;
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

const SectionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    variants={fadeUpItem}
    className={`rounded-[16px] shadow-lg ${className}`}
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
    }}
  >
    {children}
  </motion.div>
);

const SectionLabel: React.FC<{ children: React.ReactNode; rightAction?: React.ReactNode }> = ({ children, rightAction }) => (
  <motion.div variants={fadeUpItem} className="flex items-center justify-between mb-2.5 px-1">
    <p className="text-[10.5px] font-bold tracking-[0.15em] uppercase text-zinc-500">{children}</p>
    {rightAction && <div>{rightAction}</div>}
  </motion.div>
);

const AvatarImg = ({ src, alt, className }: { src?: string; alt?: string; className?: string }) => {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-[#1a1a1c] ${className}`}>
        <User className="text-zinc-500 w-1/2 h-1/2" strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} onError={() => setError(true)} />;
};

const renderRoleTag = (rawRole: any) => {
  if (!rawRole) return null;
  let rolesArray: string[] = [];
  if (Array.isArray(rawRole)) rolesArray = rawRole;
  else if (typeof rawRole === 'string') rolesArray = rawRole.split(',');
  const cleanRoles = rolesArray.map(r => r.replace(/['"]/g, '').trim()).filter(r => r && r.toLowerCase() !== 'member');
  if (cleanRoles.length === 0) return null;

  const bgColor = 'color-mix(in srgb, var(--app-bg, #09090b) 80%, transparent)';
  const borderColor = 'rgba(255, 255, 255, 0.12)';

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {cleanRoles.map((role, idx) => {
        const lowerRole = role.toLowerCase();
        let Icon = Award; let color = 'var(--app-accent)';
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
              whileHover={{ scale: 1.15, y: -2 }}
              className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px]"
              style={{ color: color, backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
            >
              <Icon size={13} strokeWidth={2.5} />
            </motion.div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 opacity-0 group-hover/role:opacity-100 transition-all duration-300 pointer-events-none flex flex-col items-center translate-y-1 group-hover/role:translate-y-0 z-50">
              <div
                className="relative px-3 py-1.5 rounded-[8px] border text-[11.5px] font-bold text-white whitespace-nowrap backdrop-blur-md"
                style={{ fontFamily: APP_FONT, backgroundColor: bgColor, borderColor: borderColor }}
              >
                <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-[1.5px] z-20" style={{ backgroundColor: bgColor }} />
                {titleCasedRole}
              </div>
              <div className="w-2.5 h-2.5 rotate-45 border-r border-b -mt-[6px] backdrop-blur-md" style={{ backgroundColor: bgColor, borderColor: borderColor }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ─── Main Component ───────────────────────────────────────────────────────────
const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose, userId }) => {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();

  const [internalOpen, setInternalOpen] = useState(open || false);
  const [activeUserId, setActiveUserId] = useState<string | null>(userId || null);
  const [activeProfile, setActiveProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [activityFilter, setActivityFilter] = useState<'all' | 'watch' | 'comments'>('all');

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [bookmarkFilter, setBookmarkFilter] = useState('all');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendItem[]>([]);
  const [monthlyGenres, setMonthlyGenres] = useState<string[]>([]);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [isProcessingFriend, setIsProcessingFriend] = useState(false);

  const [loading, setLoading] = useState(true);
  const hasFetchedFor = useRef<string | null>(null);

  const originalTitleRef = useRef<string>(document.title);

  useEffect(() => { if (open !== undefined) setInternalOpen(open); }, [open]);
  useEffect(() => { if (userId !== undefined) setActiveUserId(userId); }, [userId]);

  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const targetId = e.detail?.userId || e.detail;
      if (typeof targetId === 'string') { setActiveUserId(targetId); setInternalOpen(true); }
    };
    window.addEventListener('open-profile-modal', handleOpenEvent);
    window.addEventListener('openProfile', handleOpenEvent);
    return () => { window.removeEventListener('open-profile-modal', handleOpenEvent); window.removeEventListener('openProfile', handleOpenEvent); };
  }, []);

  const handleClose = () => {
    setInternalOpen(false);
    document.title = originalTitleRef.current;
    if (onClose) onClose();
  };

  const activeUserBadges = useMemo(() => {
    if (!activeProfile && comments.length === 0) return [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
    let rolesArray: string[] = [];
    if (Array.isArray(activeProfile?.role)) rolesArray = activeProfile.role;
    else if (typeof activeProfile?.role === 'string') rolesArray = activeProfile.role.split(',');
    const roles = rolesArray.map(r => r.toLowerCase().replace(/['"]/g, '').trim());
    const dbBadges = Array.isArray(activeProfile?.badges) ? activeProfile.badges.map((b: string) => b.toLowerCase()) : [];
    const validIds = new Set([...roles, ...dbBadges]);
    if (comments.some(c => c.likes_count >= 50)) validIds.add('fire');
    if (activeProfile) validIds.add('verified');
    const filtered = MOCK_BADGES.filter(b => validIds.has(b.id) || validIds.has(b.name.toLowerCase()));
    return filtered.length > 0 ? filtered : [MOCK_BADGES.find(b => b.id === 'verified')!].filter(Boolean);
  }, [activeProfile, comments]);

  const stats = useMemo(() => {
    let joined = 'Unknown';
    if (activeProfile?.created_at) {
      const d = new Date(activeProfile.created_at);
      joined = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
    }
    return { joined, bookmarks: bookmarks.length, activity: comments.length, friends: friends.length, badges: activeUserBadges.length };
  }, [activeProfile, bookmarks, comments, activeUserBadges, friends]);

  const fetchData = useCallback(async () => {
    const uid = activeUserId || user?.id;
    if (!uid) { setLoading(false); return; }
    setLoading(true);

    try {
      const headers = { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` };

      const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers });
      const pList = pRes.ok ? await pRes.json() : [];
      const profileData = pList[0] || null;

      if (profileData?.display_name) {
        document.title = `${profileData.display_name}'s Profile`;
      }

      const viewerStatus = await fetchFriendshipStatus(user?.id, uid);
      setActiveProfile(profileData);
      setFriendshipStatus(viewerStatus);
      const canViewActivity = canViewVisibility(uid, user?.id, viewerStatus, getVisibility(profileData, 'activity_visibility'));

      const [cRes, rRes, bRes, watchRows] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${uid}&select=*&order=created_at.desc`, { headers }),
        fetchWatchActivity(uid, 30, { dedupeEpisodes: true }),
      ]);

      const cList = canViewActivity && cRes.ok ? await cRes.json() : [];
      const rList = canViewActivity && rRes.ok ? await rRes.json() : [];
      const bList = canViewActivity && bRes.ok ? await bRes.json() : [];
      const wList = canViewActivity ? watchRows : [];

      const thumbMap: Record<string, Record<number, string>> = {};
      if (wList.length > 0) {
        const uniqueAnimeIds = [...new Set(wList.map((w: any) => String(w.anime_id)))] as string[];
        const epResults = await Promise.allSettled(uniqueAnimeIds.map(id => fetchAnimeEpisodes(id)));
        epResults.forEach((result, idx) => {
          if (result.status === 'fulfilled' && result.value?.providers) {
            const providerKey = Object.keys(result.value.providers)[0];
            if (providerKey) {
              const eps = result.value.providers[providerKey]?.episodes?.sub || result.value.providers[providerKey]?.episodes?.dub || [];
              const map: Record<number, string> = {};
              eps.forEach((ep: any) => { if (ep.number && ep.image) map[ep.number] = ep.image; });
              thumbMap[uniqueAnimeIds[idx]] = map;
            }
          }
        });
      }

      const combinedActivity = [
        ...cList.map((c: any) => ({ ...c, type: 'comment' as const })),
        ...rList.map((r: any) => ({ ...r, type: 'reply' as const })),
        ...wList.map((w: any) => {
          const epThumb = thumbMap[String(w.anime_id)]?.[w.episode_number];
          return {
            id: w.id || `watch-${w.anime_id}-${w.episode_id}`,
            content: `Watched Episode ${w.episode_number} of ${w.anime_title}`,
            created_at: w.created_at,
            page_type: 'anime',
            page_id: w.anime_id,
            likes_count: 0,
            type: 'watch' as const,
            anime_cover: w.anime_cover,
            episode_image: epThumb || w.episode_image || null,
            href: w.href,
            episode_title: w.episode_title,
            anime_title: w.anime_title,
            episode_number: w.episode_number,
            progress_time: w.progress_time,
            duration: w.duration,
          };
        })
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setComments(combinedActivity);

      const mappedBookmarks = bList.map((b: any) => ({
        id: String(b.mal_id || b.anime_id || b.id || ''),
        title: b.title || b.anime_title || 'Unknown',
        cover: b.cover || b.anime_cover || b.image_url || '',
        type: b.type || 'TV',
        status: b.status || 'uncategorized',
        episodes: b.episodes || null
      })).filter((b: any) => b.id !== '');
      setBookmarks(mappedBookmarks);

      let fetchedFriends: FriendItem[] = []; let fetchedPending: FriendItem[] = []; let relStatus: FriendshipStatus = viewerStatus;
      const { data: fData } = await supabase.from('friendships').select('user_id, friend_id, created_at').eq('status', 'accepted').or(`user_id.eq.${uid},friend_id.eq.${uid}`);
      if (fData && fData.length > 0) {
        const friendIds = fData.map(f => f.user_id === uid ? f.friend_id : f.user_id);
        const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', friendIds);
        if (pData) fetchedFriends = pData.map(p => ({ ...p, friendship_date: fData.find(f => f.user_id === p.id || f.friend_id === p.id)?.created_at }));
      }

      if (user?.id && uid === user.id) {
        const { data: reqData } = await supabase.from('friendships').select('user_id').eq('friend_id', uid).eq('status', 'pending');
        if (reqData && reqData.length > 0) {
          const { data: pData } = await supabase.from('profiles').select('id,display_name,avatar_url,role').in('id', reqData.map(r => r.user_id));
          if (pData) fetchedPending = pData;
        }
      }

      if (user?.id && uid !== user.id) {
        const { data: d1 } = await supabase.from('friendships').select('*').eq('user_id', user.id).eq('friend_id', uid);
        const { data: d2 } = await supabase.from('friendships').select('*').eq('user_id', uid).eq('friend_id', user.id);
        const relData = [...(d1 || []), ...(d2 || [])];
        if (relData.length > 0) {
          const rel = relData[0];
          relStatus = rel.status === 'accepted' ? 'accepted' : (rel.user_id === user.id ? 'pending_sent' : 'pending_received');
        }
      }

      setFriends(fetchedFriends); setPendingRequests(fetchedPending); setFriendshipStatus(relStatus);
    } catch (err) { console.error('Profile fetch error:', err); } finally { setLoading(false); }
  }, [activeUserId, user?.id]);

  useEffect(() => {
    if (internalOpen && hasFetchedFor.current !== activeUserId) {
      setActiveTab('overview');
      setBookmarkSearch('');
      setBookmarkFilter('all');
      originalTitleRef.current = document.title;
      fetchData();
      hasFetchedFor.current = activeUserId;
    }
    else if (!internalOpen) {
      hasFetchedFor.current = null;
    }
  }, [internalOpen, activeUserId, fetchData]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && internalOpen) handleClose(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [internalOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleFriend = async () => {
    if (!user || !activeProfile?.id || isProcessingFriend) return;
    setIsProcessingFriend(true);
    try {
      if (friendshipStatus === 'none') {
        await supabase.from('friendships').insert({ user_id: user.id, friend_id: activeProfile.id, status: 'pending' });
        setFriendshipStatus('pending_sent');
      } else if (friendshipStatus === 'accepted' || friendshipStatus === 'pending_sent') {
        await supabase.from('friendships').delete().match({ user_id: user.id, friend_id: activeProfile.id });
        await supabase.from('friendships').delete().match({ user_id: activeProfile.id, friend_id: user.id });
        setFriendshipStatus('none');
      } else if (friendshipStatus === 'pending_received') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: activeProfile.id, friend_id: user.id });
        setFriendshipStatus('accepted');
      }
      fetchData();
    } catch (error) {
      console.error('Error toggling friend:', error);
    } finally {
      setIsProcessingFriend(false);
    }
  };

  const handlePendingAction = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!user) return;
    try {
      if (action === 'accept') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: requesterId, friend_id: user.id });
      } else {
        await supabase.from('friendships').delete().match({ user_id: requesterId, friend_id: user.id });
      }
      fetchData();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
    }
  };

  const filterOptions = useMemo(() => {
    const counts: Record<string, number> = { all: bookmarks.length };
    bookmarks.forEach(b => {
      const s = b.status?.toLowerCase() || 'uncategorized';
      counts[s] = (counts[s] || 0) + 1;
    });

    const formatName = (status: string) => {
      if (status === 'all') return 'All';
      if (status === 'uncategorized' || status === 'plan_to_watch') return 'To Watch';
      return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    return Object.entries(counts).map(([key, count]) => ({
      id: key,
      label: formatName(key),
      count
    })).sort((a, b) => {
      const order = ['all', 'uncategorized', 'plan_to_watch', 'watching', 'releasing', 'completed', 'finished', 'on_hold', 'dropped'];
      const getIdx = (id: string) => order.indexOf(id) !== -1 ? order.indexOf(id) : 99;
      return getIdx(a.id) - getIdx(b.id);
    });
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter(b => {
      const matchesSearch = b.title.toLowerCase().includes(bookmarkSearch.toLowerCase());
      const status = b.status?.toLowerCase() || 'uncategorized';
      const matchesFilter = bookmarkFilter === 'all' || status === bookmarkFilter;
      return matchesSearch && matchesFilter;
    });
  }, [bookmarks, bookmarkSearch, bookmarkFilter]);

  const monthlyWatchActivity = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return comments.filter((item) =>
      item.type === 'watch' && new Date(item.created_at).getTime() >= startOfMonth.getTime()
    );
  }, [comments]);

  useEffect(() => {
    if (!internalOpen || monthlyWatchActivity.length === 0) {
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
  }, [internalOpen, monthlyWatchActivity]);

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

    const favoriteShow = [...showCounts.values()].sort((a, b) => b.count - a.count)[0]?.title || 'None yet';
    const mostWatchedDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';
    const hoursWatched = watchedSeconds > 0 ? Math.round((watchedSeconds / 3600) * 10) / 10 : 0;

    return {
      episodesWatched: monthlyWatchActivity.length,
      hoursWatched,
      topGenres: monthlyGenres.length > 0 ? monthlyGenres.join(', ') : 'Still learning',
      mostWatchedDay,
      favoriteShow,
    };
  }, [monthlyGenres, monthlyWatchActivity]);

  // NEW: Calculate data for the background chart
  const monthlyActivityChartData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data = new Array(daysInMonth).fill(0);
    
    monthlyWatchActivity.forEach(item => {
      const day = new Date(item.created_at).getDate();
      data[day - 1] += 1;
    });
    
    return data;
  }, [monthlyWatchActivity]);


  const activeTabMeta = TABS.find(t => t.id === activeTab)!;
  const displayName = activeProfile?.display_name || 'Anonymous User';
  const avatarUrl = activeProfile?.avatar_url;

  const lastActiveTime = activeProfile?.last_active_at ? new Date(activeProfile.last_active_at).getTime() : 0;
  const canViewWatchingStatus = canViewVisibility(activeProfile?.id, user?.id, friendshipStatus, getVisibility(activeProfile, 'watching_status_visibility'));
  const isOnline = canViewWatchingStatus && (Date.now() - lastActiveTime < 15 * 60 * 1000) && activeProfile?.status_state && activeProfile.status_state !== 'offline';
  const statusState = activeProfile?.status_state;
  const statusText = activeProfile?.status_text;

  const latestWatch = canViewVisibility(activeProfile?.id, user?.id, friendshipStatus, getVisibility(activeProfile, 'activity_visibility')) ? comments.find(c => c.type === 'watch') : undefined;
  const canViewProfile = canViewVisibility(activeProfile?.id, user?.id, friendshipStatus, getVisibility(activeProfile, 'profile_visibility'));

  const modalStyles = {
    fontFamily: APP_FONT,
    background: 'var(--app-bg, #09090b)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
  } as React.CSSProperties;

  return createPortal(
    <AnimatePresence>
      {internalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="aw-material-modal relative flex w-full max-w-[800px] h-[80vh] max-h-[720px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={modalStyles}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Sidebar ── */}
              <aside
                className="relative flex flex-col w-[240px] flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[100px] pointer-events-none rounded-tl-[20px] overflow-hidden z-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div
                    className="absolute inset-0 opacity-[0.85]"
                    style={{
                      background: `linear-gradient(135deg, var(--app-accent) 0%, color-mix(in srgb, var(--app-accent) 30%, black) 100%)`
                    }}
                  />
                </div>

                <div className="relative z-10 px-6 pt-[58px] pb-5 flex flex-col">
                  <div className="relative z-20 mb-3.5 w-[84px] h-[84px] flex-shrink-0">
                    <div
                      className="w-full h-full rounded-full shadow-2xl flex items-center justify-center relative z-10"
                      style={{ background: 'var(--app-bg)', border: '4px solid var(--app-bg)' }}
                    >
                      <AvatarImg src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-[22px] h-[22px] rounded-full border-[4px] z-30 transition-colors duration-500 ${isOnline ? 'bg-emerald-500' : 'bg-zinc-600'}`}
                      style={{ borderColor: 'var(--app-bg)' }}
                    />
                  </div>

                  <div className="relative z-30 flex items-center gap-2 max-w-full">
                    <h2 className="text-[19px] text-white leading-tight truncate font-bold" style={{ fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}>
                      {displayName}
                    </h2>
                    {renderRoleTag(activeProfile?.role)}
                  </div>

                </div>

                <nav className="relative z-10 flex-1 flex flex-col gap-1.5 px-3">
                  {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        initial={false}
                        animate={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0)',
                          color: active ? '#ffffff' : 'rgb(161, 161, 170)'
                        }}
                        whileHover={{
                          backgroundColor: active ? 'var(--app-accent-muted)' : 'rgba(255, 255, 255, 0.06)',
                          color: '#ffffff'
                        }}
                        transition={{ duration: 0.2 }}
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-left"
                      >
                        <motion.div animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : undefined }}>
                          <tab.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                        </motion.div>
                        <span className="leading-none">{tab.label}</span>
                      </motion.button>
                    );
                  })}
                </nav>

                <div className="relative z-10 px-3 pt-5 mt-2 pb-6 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {user && activeProfile?.id && user.id !== activeProfile.id && (
                    <motion.button
                      onClick={handleToggleFriend}
                      disabled={isProcessingFriend}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] text-[13px] font-medium transition-colors ${friendshipStatus === 'accepted' ? 'bg-white/5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10'
                        : friendshipStatus === 'pending_sent' ? 'bg-yellow-500/10 text-yellow-500 hover:text-red-400 hover:bg-red-500/10'
                          : friendshipStatus === 'pending_received' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 text-white hover:text-[var(--app-accent)] hover:bg-[var(--app-accent-muted)]'
                        }`}
                    >
                      {isProcessingFriend ? <Loader2 size={15} className="animate-spin opacity-70" />
                        : friendshipStatus === 'accepted' ? <><UserMinus size={15} /> Remove Friend</>
                          : friendshipStatus === 'pending_sent' ? <><UserMinus size={15} /> Cancel Request</>
                            : friendshipStatus === 'pending_received' ? <><Check size={15} /> Accept Request</>
                              : <><UserPlus size={15} /> Add Friend</>}
                    </motion.button>
                  )}

                  {user?.id !== activeProfile?.id ? (
                    <motion.button
                      onClick={() => { handleClose(); navigate(`/messages/${activeProfile?.id}`); }}
                      whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] text-[13px] font-bold text-black"
                      style={{ background: 'var(--app-accent)' }}
                    >
                      <MessageSquare size={15} strokeWidth={2.5} /> Message
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={() => { handleClose(); navigate(`/profile/${user?.id}`); }}
                      whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] text-[13px] font-bold text-black"
                      style={{ background: 'var(--app-accent)' }}
                    >
                      <User size={15} strokeWidth={2.5} /> My Profile
                    </motion.button>
                  )}
                </div>
              </aside>

              <div className="flex flex-col flex-1 min-w-0 bg-white/[0.01]">
                <div
                  className="flex items-center justify-between px-8 py-6 flex-shrink-0"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <motion.div
                    key={activeTabMeta.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-[17px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>
                      {activeTabMeta.label}
                    </h3>
                    <p className="text-[12.5px] text-zinc-400 mt-1">{activeTabMeta.desc}</p>
                  </motion.div>
                  <motion.button
                    onClick={handleClose}
                    whileHover={{ scale: 1.1, rotate: 90, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>

                <main className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-8" style={{ scrollbarGutter: 'stable' }}>
                  <AnimatePresence mode="wait">

                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-48 gap-3"
                      >
                        <Loader2 size={22} className="animate-spin text-zinc-500" />
                        <p className="text-[13px] text-zinc-500 font-medium">Loading profile...</p>
                      </motion.div>
                    ) : !canViewProfile ? (
                      <motion.div
                        key="private-profile"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="flex min-h-[420px] flex-col items-center justify-center text-center"
                      >
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]">
                          <Lock size={26} strokeWidth={2.5} />
                        </div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--app-accent)]">Profile Private</p>
                        <h3 className="mt-2 text-[20px] font-bold text-white" style={{ fontFamily: DISPLAY_FONT }}>
                          {displayName} has a private profile
                        </h3>
                        <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-zinc-400">
                          Become friends to view their activity, bookmarks, badges, and network.
                        </p>
                        {user && activeProfile?.id && user.id !== activeProfile.id && (
                          <motion.button
                            onClick={handleToggleFriend}
                            disabled={isProcessingFriend}
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
                            className="mt-6 flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.05] px-5 text-[13px] font-bold text-white transition-colors hover:border-[var(--app-accent)]/40 hover:bg-[var(--app-accent-muted)] hover:text-[var(--app-accent)] disabled:opacity-60"
                          >
                            {isProcessingFriend ? <Loader2 size={15} className="animate-spin" />
                              : friendshipStatus === 'pending_sent' ? <><UserMinus size={15} /> Cancel Request</>
                                : friendshipStatus === 'pending_received' ? <><Check size={15} /> Accept Request</>
                                  : <><UserPlus size={15} /> Add Friend</>}
                          </motion.button>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeTab}
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        {/* ── OVERVIEW ── */}
                        {activeTab === 'overview' && (
                          <>
                            {latestWatch && (() => {
                              const epNum = latestWatch.episode_number || latestWatch.content.match(/Episode (\d+)/)?.[1] || '?';
                              const thumbSrc = latestWatch.episode_image || latestWatch.anime_cover;
                              const isCurrentlyWatching = isOnline && statusState === 'watching';

                              return (
                                <div className="mb-2">
                                  <SectionLabel>{isCurrentlyWatching ? 'Currently Watching' : 'Last Watched'}</SectionLabel>
                                  <SectionCard
                                    className={`overflow-hidden cursor-pointer group ${!isCurrentlyWatching ? 'opacity-50 grayscale-[30%]' : ''}`}
                                    onClick={() => latestWatch.href && navigate(latestWatch.href)}
                                  >
                                    <div className="flex items-center gap-4 p-3.5 transition-colors duration-300 group-hover:bg-white/[0.04]">
                                      <div className="relative w-[80px] h-[46px] rounded-lg overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                                        <img src={thumbSrc} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                      </div>
                                      <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[13.5px] font-bold text-white truncate group-hover:text-white/90 transition-colors">{latestWatch.anime_title || latestWatch.content.split(' of ')[1]}</span>
                                        <span className="text-[12px] text-zinc-400 truncate mt-0.5">
                                          <span className="font-bold text-[var(--app-accent)]">Episode {epNum}</span>
                                          {latestWatch.episode_title && latestWatch.episode_title !== `Episode ${epNum}` && <span className="text-zinc-500"> — {latestWatch.episode_title}</span>}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
                                          <div className={`w-1.5 h-1.5 rounded-full ${isCurrentlyWatching ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                          {timeAgo(latestWatch.created_at)}
                                        </span>
                                      </div>
                                    </div>
                                  </SectionCard>
                                </div>
                              );
                            })()}


                            <div>
                              <SectionLabel>Stats</SectionLabel>
                              <SectionCard className="overflow-hidden">
                                <div className="grid gap-0 sm:grid-cols-[1.05fr_1.35fr]">
                                  {/* Stats Card: Left Column (This Month) */}
                                  <div className="relative flex min-h-[142px] flex-col justify-between overflow-hidden p-5 border-b border-white/[0.04] sm:border-b-0 sm:border-r">

                                    {/* Content Layer */}
                                    <div className="relative z-10 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-[var(--app-accent)]">
                                      <BarChart3 size={14} />
                                      This Month
                                    </div>
                                    <div className="relative z-10 mt-5 flex items-end gap-4">
                                      <div>
                                        <div className="text-[34px] font-bold leading-none text-white" style={{ fontFamily: DISPLAY_FONT }}>
                                          {monthlyRecap.episodesWatched}
                                        </div>
                                        <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Episodes</div>
                                      </div>
                                      <div className="mb-1 h-8 w-px bg-white/[0.08]" />
                                      <div>
                                        <div className="text-[24px] font-bold leading-none text-white" style={{ fontFamily: DISPLAY_FONT }}>
                                          {monthlyRecap.hoursWatched}
                                        </div>
                                        <div className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500">Hours</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 divide-y divide-white/[0.04] bg-white/[0.01]">
                                    {[
                                      ['Favorite Show', monthlyRecap.favoriteShow],
                                      ['Top Genres', monthlyRecap.topGenres],
                                      ['Most Watched', monthlyRecap.mostWatchedDay],
                                    ].map(([label, value]) => (
                                      <div key={label} className="min-h-[47px] px-4 py-3 transition-colors duration-200 hover:bg-white/[0.03]">
                                        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
                                        <div className="mt-1 line-clamp-1 text-[13px] font-semibold text-zinc-100">{value}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </SectionCard>
                            </div>

                            <div>
                              <SectionLabel>Details</SectionLabel>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {[
                                  { icon: Calendar, label: "Joined", val: stats.joined },
                                  { icon: ActivityIcon, label: "Activity", val: stats.activity },
                                  { icon: Users, label: "Friends", val: stats.friends },
                                  { icon: Award, label: "Badges", val: stats.badges }
                                ].map((stat, i) => (
                                  <motion.div key={i} variants={fadeUpItem} className="h-full">
                                    <SectionCard className="overflow-hidden group cursor-default h-full">
                                      <div className="flex flex-col items-center justify-center text-center p-4 transition-colors duration-300 group-hover:bg-white/[0.04] aspect-square w-full relative h-full">
                                        <div
                                          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                                          style={{ background: 'radial-gradient(circle at center, color-mix(in srgb, var(--app-accent) 8%, transparent) 0%, transparent 70%)' }}
                                        />
                                        <div className="w-[34px] h-[34px] rounded-full mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-0.5 shadow-sm relative z-10">
                                          <stat.icon size={16} className="text-zinc-400 group-hover:text-[var(--app-accent)] transition-colors duration-300 flex-shrink-0" strokeWidth={2} />
                                        </div>
                                        {stat.label === 'Joined' ? (
                                          <div className="flex flex-col flex-1 items-center justify-center min-h-[40px] w-full gap-0.5 relative z-10">
                                            <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors leading-tight">{stat.val.split(' ')[0]}</span>
                                            <span className="text-[18px] font-bold text-white group-hover:text-white/90 transition-colors leading-none" style={{ fontFamily: DISPLAY_FONT }}>{stat.val.split(' ')[1]}</span>
                                          </div>
                                        ) : (
                                          <div className="flex flex-col flex-1 items-center justify-center min-h-[40px] w-full relative z-10">
                                            <span className="text-[24px] font-bold text-white group-hover:text-white/90 transition-colors leading-none" style={{ fontFamily: DISPLAY_FONT }}>{stat.val}</span>
                                          </div>
                                        )}
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1 flex-shrink-0 relative z-10">{stat.label}</span>
                                      </div>
                                    </SectionCard>
                                  </motion.div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <SectionLabel rightAction={
                                <button onClick={() => setActiveTab('activity')} className="text-[10.5px] text-[var(--app-accent)] hover:text-white uppercase font-bold tracking-wide transition-colors">
                                  View All
                                </button>
                              }>Recent Activity</SectionLabel>
                              <SectionCard>
                                {comments.length === 0 ? (
                                  <div className="p-6 text-center text-[13px] text-zinc-500 italic">No recent activity.</div>
                                ) : (
                                  comments.slice(0, 3).map((c, i) => (
                                    <div
                                      key={c.id}
                                      onClick={() => c.type === 'watch' && c.href ? navigate(c.href) : handleContentNavigation(navigate, c.page_type, c.page_id, handleClose)}
                                      className="flex items-center gap-3.5 px-4 py-3 cursor-pointer group hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]"
                                      style={i < Math.min(comments.length, 3) - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    >
                                      {c.type === 'watch' ? (
                                        <div className="flex-shrink-0 w-[64px] h-[36px] rounded-[8px] overflow-hidden bg-[#111] border border-white/10 relative">
                                          <img src={c.episode_image || c.anime_cover} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                      ) : (
                                        <div className="flex-shrink-0 text-zinc-500 group-hover:text-[var(--app-accent)] transition-colors">
                                          {c.type === 'reply' ? <MessageSquareReply size={15} /> : <MessageSquare size={15} />}
                                        </div>
                                      )}
                                      <div className="flex flex-col min-w-0 flex-1">
                                        {c.type === 'watch' ? (
                                          <>
                                            <span className="text-[13px] font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">{c.anime_title || c.content.split(' of ')[1]}</span>
                                            <span className="text-[11.5px] text-zinc-500 mt-0.5 truncate">
                                              <span className="font-bold text-[var(--app-accent)]">EP {c.episode_number || c.content.match(/Episode (\d+)/)?.[1]}</span>
                                              {c.episode_title && c.episode_title !== `Episode ${c.episode_number}` && <span> — {c.episode_title}</span>}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <span className="text-[13px] text-zinc-200 leading-relaxed line-clamp-2 group-hover:text-white transition-colors">{c.content}</span>
                                            <span className="text-[11.5px] text-zinc-500 mt-0.5 capitalize">{c.type} • {timeAgo(c.created_at)}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </SectionCard>
                            </div>
                          </>
                        )}

                        {activeTab === 'activity' && (
                          <div className="flex flex-col gap-4">
                            <div className="relative flex items-center gap-0 bg-black/30 p-1 rounded-xl w-fit border border-white/[0.06]">
                              {['all', 'watch', 'comments'].map(f => (
                                <button
                                  key={f}
                                  onClick={() => setActivityFilter(f as any)}
                                  className={`relative z-10 px-5 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors duration-200 ${activityFilter === f ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                  {activityFilter === f && (
                                    <motion.div
                                      layoutId="activity-filter-indicator"
                                      className="absolute inset-0 rounded-lg shadow-sm border"
                                      style={{
                                        background: 'color-mix(in srgb, var(--app-accent) 12%, transparent)',
                                        borderColor: 'color-mix(in srgb, var(--app-accent) 50%, transparent)'
                                      }}
                                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                    />
                                  )}
                                  <span className="relative z-10">{f === 'watch' ? 'History' : f}</span>
                                </button>
                              ))}
                            </div>
                            <SectionCard>
                              {(() => {
                                const filtered = comments.filter(c => activityFilter === 'all' || (activityFilter === 'watch' ? c.type === 'watch' : c.type !== 'watch'));
                                if (filtered.length === 0) return (
                                  <div className="p-8 text-center flex flex-col items-center gap-2">
                                    <ActivityIcon size={24} className="text-zinc-600" />
                                    <span className="text-[13px] text-zinc-500">No activity to display.</span>
                                  </div>
                                );
                                return filtered.map((c, i) => (
                                  <div
                                    key={c.id}
                                    onClick={() => c.type === 'watch' && c.href ? navigate(c.href) : handleContentNavigation(navigate, c.page_type, c.page_id, handleClose)}
                                    className="flex items-start gap-4 px-4 py-4 cursor-pointer group hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]"
                                    style={i < filtered.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                  >
                                    {c.type === 'watch' ? (
                                      <div className="mt-0.5 flex-shrink-0 w-[100px] h-[56px] rounded-[10px] overflow-hidden bg-[#111] border border-white/10 shadow-md relative">
                                        <img src={c.episode_image || c.anime_cover} alt="Thumbnail" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                                      </div>
                                    ) : (
                                      <div className="mt-1 flex-shrink-0 text-zinc-500 group-hover:text-[var(--app-accent)] transition-colors">
                                        {c.type === 'reply' ? <MessageSquareReply size={16} /> : <MessageSquare size={16} />}
                                      </div>
                                    )}
                                    <div className="flex flex-col flex-1 justify-center min-w-0">
                                      <span className="text-[13.5px] text-zinc-200 leading-relaxed group-hover:text-white transition-colors truncate w-full">
                                        {c.type === 'watch' ? (
                                          <span className="flex flex-col gap-0.5">
                                            <span className="font-semibold text-white/90 truncate">{c.anime_title || c.content.split(' of ')[1]}</span>
                                            <span className="text-[12px] text-zinc-400 truncate">
                                              <span className="font-bold text-[var(--app-accent)]">Episode {c.episode_number || c.content.match(/Episode (\d+)/)?.[1]}</span>
                                              {c.episode_title && c.episode_title !== `Episode ${c.episode_number}` && <span className="text-zinc-500"> — {c.episode_title}</span>}
                                            </span>
                                          </span>
                                        ) : c.content}
                                      </span>
                                      <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                                        <span className="capitalize font-medium text-white/40">{c.type}</span>
                                        <span className="text-white/20">•</span>
                                        <span>{timeAgo(c.created_at)}</span>
                                        {c.likes_count > 0 && <><span className="text-white/20">•</span><span>{c.likes_count} likes</span></>}
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </SectionCard>
                          </div>
                        )}

                        {activeTab === 'bookmarks' && (
                          <div className="flex flex-col gap-4">

                            {(bookmarks.length > 0 || bookmarkSearch !== '') && (
                              <div className="flex items-center gap-3 w-full mb-3">

                                <div className="relative flex-1 group/search">
                                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors" />
                                  <input
                                    type="text"
                                    placeholder="Search bookmarks..."
                                    value={bookmarkSearch}
                                    onChange={(e) => setBookmarkSearch(e.target.value)}
                                    className="w-full bg-[#141415] hover:bg-[#18181b] focus:bg-[#18181b] border border-white/[0.05] focus:border-white/[0.1] rounded-full py-2.5 pl-11 pr-4 text-[13.5px] text-white placeholder-zinc-500 outline-none transition-all duration-300 shadow-inner"
                                  />
                                </div>

                                <div className="relative" ref={filterDropdownRef}>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-colors border ${isFilterDropdownOpen
                                      ? 'bg-[#18181b] border-white/[0.1] text-white'
                                      : 'bg-[#141415] border-white/[0.05] text-zinc-200 hover:bg-[#18181b]'
                                      }`}
                                  >
                                    <Filter size={15} className="text-zinc-400" />
                                    <span className="capitalize hidden sm:inline-block">
                                      {filterOptions.find(o => o.id === bookmarkFilter)?.label || 'All'}
                                    </span>
                                    <span className="px-2 py-[2px] rounded-[6px] text-[11px] font-bold bg-white/[0.08] text-zinc-400">
                                      {filterOptions.find(o => o.id === bookmarkFilter)?.count || 0}
                                    </span>
                                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 ${isFilterDropdownOpen ? 'rotate-180 text-zinc-300' : ''}`} />
                                  </motion.button>

                                  <AnimatePresence>
                                    {isFilterDropdownOpen && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                                        className="absolute right-0 top-[calc(100%+8px)] w-[240px] z-[100] rounded-[16px] overflow-hidden shadow-2xl bg-[#0f0f11] border border-white/[0.08] py-1.5 flex flex-col"
                                      >
                                        <div className="px-5 py-3 mb-1.5 border-b border-white/[0.04]">
                                          <p className="text-[10.5px] font-bold tracking-[0.1em] uppercase text-zinc-500">Filter By Status</p>
                                        </div>
                                        <div className="flex flex-col px-1.5 gap-0.5 pb-1 max-h-[320px] overflow-y-auto">
                                          {filterOptions.map((option) => {
                                            const isActive = bookmarkFilter === option.id;
                                            return (
                                              <button
                                                key={option.id}
                                                onClick={() => { setBookmarkFilter(option.id); setIsFilterDropdownOpen(false); }}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-[13.5px] rounded-[10px] transition-colors hover:bg-white/[0.06]`}
                                              >
                                                <span className={`font-semibold transition-colors ${isActive ? 'text-[var(--app-accent)]' : 'text-zinc-200'}`}>
                                                  {option.label}
                                                </span>
                                                <span className={`text-[11.5px] font-bold px-2 py-[2px] rounded-[6px] transition-colors ${isActive ? 'text-[var(--app-accent)] bg-transparent' : 'bg-white/[0.08] text-zinc-400'}`}>
                                                  {option.count}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}

                            {filteredBookmarks.length === 0 ? (
                              <SectionCard className="p-10 text-center flex flex-col items-center gap-3">
                                <Bookmark size={28} strokeWidth={1.5} className="text-zinc-600" />
                                {bookmarkSearch ? (
                                  <span className="text-[13px] text-zinc-400">
                                    No bookmarks found matching "<span className="text-white font-medium">{bookmarkSearch}</span>"
                                    {bookmarkFilter !== 'all' && ` in ${filterOptions.find(o => o.id === bookmarkFilter)?.label}`}.
                                  </span>
                                ) : (
                                  <span className="text-[13px] text-zinc-400">
                                    {bookmarkFilter !== 'all' ? `No bookmarks in ${filterOptions.find(o => o.id === bookmarkFilter)?.label}.` : 'Nothing bookmarked yet.'}
                                  </span>
                                )}
                              </SectionCard>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {filteredBookmarks.map((b) => (
                                  <motion.div
                                    key={b.id}
                                    variants={fadeUpItem}
                                    onClick={() => { handleClose(); navigate(`/watch/${b.id}`); }}
                                    className="group relative flex flex-col cursor-pointer select-none rounded-[16px] p-2 bg-transparent border border-transparent transition-all duration-[350ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:-translate-y-1 hover:border-white/[0.06] hover:bg-white/[0.02] active:scale-[0.97]"
                                  >
                                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[12px] bg-white/[0.02] border border-white/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
                                      {b.cover ? (
                                        <img src={b.cover} alt={b.title} className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.05] pointer-events-none" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Bookmark className="text-zinc-600" /></div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--app-accent)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_8px_var(--app-accent)]" />
                                    </div>

                                    <div className="pt-2.5 px-0.5 h-[48px] flex flex-col justify-start gap-0.5">
                                      <h3 className="line-clamp-1 text-[13px] font-semibold leading-snug text-white/85 group-hover:text-white transition-colors" style={{ fontFamily: APP_FONT }}>
                                        {b.title}
                                      </h3>
                                      <p className="text-[10.5px] font-medium text-zinc-500 line-clamp-1 group-hover:text-zinc-400 transition-colors tracking-wide" style={{ fontFamily: APP_FONT }}>
                                        {b.type || 'TV'}{b.episodes ? ` • ${b.episodes} EPS` : ''}
                                      </p>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'friends' && (
                          <>
                            {pendingRequests.length > 0 && (
                              <div>
                                <SectionLabel>Pending Requests</SectionLabel>
                                <SectionCard>
                                  {pendingRequests.map((req, i) => (
                                    <div
                                      key={req.id}
                                      onClick={() => setActiveUserId(req.id)}
                                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]"
                                      style={i < pendingRequests.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    >
                                      <div className="flex items-center gap-3 w-full min-w-0 pr-4">
                                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm border border-white/10">
                                          <AvatarImg src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13.5px] font-semibold text-white truncate max-w-[120px]">{req.display_name}</span>
                                            {renderRoleTag(req.role)}
                                          </div>
                                          <span className="text-[11.5px] text-zinc-500 truncate mt-0.5">Wants to be your friend</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); handlePendingAction(req.id, 'decline'); }} className="p-1.5 rounded-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                          <X size={16} strokeWidth={2.5} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handlePendingAction(req.id, 'accept'); }} className="p-1.5 rounded-full text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                          <Check size={16} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </SectionCard>
                              </div>
                            )}

                            <div>
                              <SectionLabel>Friends</SectionLabel>
                              <SectionCard>
                                {friends.length === 0 ? (
                                  <div className="p-8 text-center flex flex-col items-center gap-2">
                                    <Users size={24} className="text-zinc-600" />
                                    <span className="text-[13px] text-zinc-500">No friends yet.</span>
                                  </div>
                                ) : (
                                  friends.map((f, i) => (
                                    <div
                                      key={f.id}
                                      onClick={() => setActiveUserId(f.id)}
                                      className="flex items-center justify-between px-4 py-3 cursor-pointer group hover:bg-white/[0.03] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]"
                                      style={i < friends.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    >
                                      <div className="flex items-center gap-3 w-full min-w-0 pr-4">
                                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm border border-white/10">
                                          <AvatarImg src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                                            <span className="text-[13.5px] font-semibold text-white truncate max-w-full">{f.display_name}</span>
                                            {renderRoleTag(f.role)}
                                          </div>
                                          <span className="text-[11.5px] text-zinc-500 truncate mt-0.5">
                                            {f.friendship_date ? `Added ${new Date(f.friendship_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Joined Network'}
                                          </span>
                                        </div>
                                      </div>
                                      <ChevronRight size={16} className="text-zinc-600 group-hover:text-[var(--app-accent)] transition-colors flex-shrink-0" />
                                    </div>
                                  ))
                                )}
                              </SectionCard>
                            </div>
                          </>
                        )}

                        {activeTab === 'badges' && (
                          <SectionCard>
                            {activeUserBadges.map((b, i) => (
                              <div
                                key={b.id}
                                className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/[0.02] transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px]"
                                style={i < activeUserBadges.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                              >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: `${b.color}15`, border: `1px solid ${b.color}30` }}>
                                  <b.icon size={18} style={{ color: b.color }} strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[14px] font-bold text-white tracking-wide" style={{ fontFamily: DISPLAY_FONT }}>{b.name}</span>
                                  <span className="text-[12px] text-zinc-400 mt-0.5 leading-snug">{b.desc}</span>
                                </div>
                              </div>
                            ))}
                          </SectionCard>
                        )}

                      </motion.div>
                    )}
                  </AnimatePresence>
                </main>
              </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProfileModal;
