

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, UserPlus, Check, X, User, Loader2, Sparkles, Megaphone, Inbox, Users, PlayCircle, Tv, BellRing
} from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { readFollows, toggleFollow, BookmarkEntry } from '../../utils/bookmarks';

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

// ─── Constants & Types ────────────────────────────────────────────────────────
export interface AppNotification {
  id: number | string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: React.ElementType;
  color: string;
  coverImage?: string;
  type?: 'default' | 'friend_request' | 'news' | 'release';
  actionId?: string;
  slug?: string;
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'news_v2_launch',
    title: 'Welcome to the new Library!',
    message: 'We just rolled out a massive UI upgrade for your bookmarks with premium drag-and-drop. Try it out!',
    time: '2h ago',
    unread: true,
    icon: Sparkles,
    color: 'var(--app-accent, #8b5cf6)',
    type: 'news'
  },
  {
    id: 'sys_maintenance',
    title: 'Scheduled Maintenance',
    message: 'Brief server maintenance planned for Sunday at 2 AM EST. Expect ~15 mins of downtime.',
    time: '1d ago',
    unread: false,
    icon: Megaphone,
    color: '#f59e0b',
    type: 'news'
  },
  {
    id: 'rel_demon_slayer',
    title: 'Demon Slayer: Hashira Training Arc',
    message: 'Episode 4 is now available in 1080p!',
    time: '30m ago',
    unread: true,
    icon: PlayCircle,
    color: '#3b82f6',
    type: 'release',
    slug: 'demon-slayer-hashira-training-arc'
  },
  {
    id: 'rel_solo_leveling',
    title: 'Solo Leveling',
    message: 'Season 2 has been officially announced! Check out the details.',
    time: '2h ago',
    unread: true,
    icon: Tv,
    color: '#eab308',
    type: 'release',
    slug: 'solo-leveling'
  }
];

const TABS = [
  { id: 'all', label: 'All Notifications', icon: Inbox, desc: 'Everything in one place' },
  { id: 'unread', label: 'Unread', icon: Bell, desc: 'Needs your attention' },
  { id: 'releases', label: 'New Releases', icon: PlayCircle, desc: 'Latest episodes & anime' },
  { id: 'subscriptions', label: 'Subscriptions', icon: BellRing, desc: 'Anime you\'re tracking' },
  { id: 'requests', label: 'Friend Requests', icon: Users, desc: 'Pending connections' },
] as const;

type TabId = typeof TABS[number]['id'];

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

// ─── Main Modal Component ─────────────────────────────────────────────────────
export default function NotificationDropdown({
  open = false, // Added to convert to modal pattern
  onClose = () => { }, // Added to convert to modal pattern
  notifications: propNotifications,
  setNotifications: setPropNotifications,
}: {
  open?: boolean;
  onClose?: () => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [friendRequests, setFriendRequests] = useState<AppNotification[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [subscribedAnime, setSubscribedAnime] = useState<BookmarkEntry[]>([]);

  // Esc key to close
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  // Fetch Friend Requests
  useEffect(() => {
    if (!user?.id || !open) return;

    const fetchFriendRequests = async () => {
      setIsLoadingRequests(true);
      try {
        const { data: reqs } = await supabase
          .from('friendships')
          .select('user_id, created_at')
          .eq('friend_id', user.id)
          .eq('status', 'pending');

        if (reqs && reqs.length > 0) {
          const userIds = reqs.map(r => r.user_id);
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .in('id', userIds);

          if (profs) {
            const mappedReqs: AppNotification[] = reqs.map(req => {
              const profile = profs.find(p => p.id === req.user_id);
              return {
                id: `fr_${req.user_id}`,
                type: 'friend_request',
                title: 'Friend Request',
                message: `${profile?.display_name || 'Someone'} wants to connect.`,
                time: timeAgo(req.created_at),
                unread: true,
                icon: UserPlus,
                color: 'var(--app-accent, #8b5cf6)',
                coverImage: profile?.avatar_url,
                actionId: req.user_id,
              };
            });
            setFriendRequests(mappedReqs);
          }
        } else {
          setFriendRequests([]);
        }
      } catch (err) {
        console.error('Failed to fetch friend requests:', err);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchFriendRequests();
  }, [user?.id, open]);

  // Load subscriptions
  useEffect(() => {
    if (!open) return;
    setSubscribedAnime(readFollows());
  }, [open]);

  // Derived State
  const allNotifications = useMemo(() => {
    return [...friendRequests, ...propNotifications].sort((a, b) => {
      // Basic sorting: unread first
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      return 0;
    });
  }, [friendRequests, propNotifications]);

  const unreadCount = allNotifications.filter((n) => n.unread).length;

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') return allNotifications.filter(n => n.unread);
    if (activeTab === 'requests') return friendRequests;
    if (activeTab === 'releases') return allNotifications.filter(n => n.type === 'release');
    if (activeTab === 'subscriptions') return []; // handled separately
    return allNotifications;
  }, [activeTab, allNotifications, friendRequests]);

  // Actions
  const markAllAsRead = () => {
    setPropNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setFriendRequests((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleFriendAction = async (requesterId: string, action: 'accept' | 'decline', notifId: string | number) => {
    if (!user?.id || processingId) return;
    setProcessingId(requesterId);

    try {
      if (action === 'accept') {
        await supabase.from('friendships').update({ status: 'accepted' }).match({ user_id: requesterId, friend_id: user.id });
      } else {
        await supabase.from('friendships').delete().match({ user_id: requesterId, friend_id: user.id });
      }
      setFriendRequests(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(`Error ${action}ing friend request:`, err);
    } finally {
      setProcessingId(null);
    }
  };

  const activeTabMeta = TABS.find(t => t.id === activeTab)!;

  const modalStyles = {
    fontFamily: APP_FONT,
    background: 'var(--app-bg, #09090b)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8)',
  } as React.CSSProperties;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative flex w-full max-w-[800px] h-[80vh] max-h-[720px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={modalStyles}
              onClick={e => e.stopPropagation()}
            >

              {/* ── Sidebar ── */}
              <aside
                className="relative flex flex-col w-[240px] flex-shrink-0 py-6"
                style={{ background: 'rgba(255,255,255,0.015)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
              >
                {/* Header Block */}
                <div className="px-6 mb-8 flex flex-col gap-3">
                  <div className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center shadow-lg" style={{ background: 'var(--app-accent-muted)', border: '1px solid var(--app-accent-soft)' }}>
                    <Bell size={22} style={{ color: 'var(--app-accent)' }} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-[19px] text-white leading-tight font-bold" style={{ fontFamily: DISPLAY_FONT, letterSpacing: '-0.02em' }}>
                      Notifications
                    </h2>
                    <p className="text-[12.5px] text-zinc-400 font-medium mt-0.5">
                      {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 flex-1 flex flex-col gap-1.5 px-3">
                  {TABS.map(tab => {
                    const active = activeTab === tab.id;
                    let count = 0;
                    if (tab.id === 'all') count = allNotifications.length;
                    if (tab.id === 'unread') count = unreadCount;
                    if (tab.id === 'requests') count = friendRequests.length;
                    if (tab.id === 'releases') count = allNotifications.filter(n => n.type === 'release').length;
                    if (tab.id === 'subscriptions') count = subscribedAnime.length;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex items-center justify-between gap-3 px-3 py-2.5 rounded-[12px] text-[13.5px] font-medium text-left transition-all duration-200 active:scale-[0.98] ${active
                            ? 'bg-[var(--app-accent-muted)] text-white'
                            : 'bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <motion.div animate={{ scale: active ? 1.1 : 1, color: active ? 'var(--app-accent)' : '' }}>
                            <tab.icon size={16} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                          </motion.div>
                          <span className="leading-none">{tab.label}</span>
                        </div>
                        {count > 0 && (
                          <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-[var(--app-accent)] text-black' : 'bg-white/10 text-white'}`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Footer Actions */}
                {unreadCount > 0 && (
                  <div className="relative z-10 px-3 pt-5 mt-2 flex flex-col gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      onClick={markAllAsRead}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[12px] text-[13px] font-medium transition-all duration-200 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 hover:scale-[1.02] active:scale-[0.95]"
                    >
                      <CheckCheck size={15} /> Mark all as read
                    </button>
                  </div>
                )}
              </aside>

              {/* ── Content ── */}
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
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 bg-white/[0.03] border border-white/[0.05] transition-all duration-300 hover:scale-110 hover:rotate-90 hover:bg-white/10 hover:text-white active:scale-90"
                  >
                    <X size={15} strokeWidth={2.5} />
                  </button>
                </div>

                <main className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-8" style={{ scrollbarGutter: 'stable' }}>
                  <AnimatePresence mode="wait">

                    {isLoadingRequests ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-48 gap-3"
                      >
                        <Loader2 size={22} className="animate-spin text-zinc-500" />
                        <p className="text-[13px] text-zinc-500 font-medium">Loading notifications...</p>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={activeTab}
                        variants={staggerContainer} initial="hidden" animate="show" exit="exit"
                        className="flex flex-col gap-6"
                      >
                        {activeTab === 'subscriptions' ? (
                          subscribedAnime.length === 0 ? (
                            <motion.div variants={fadeUpItem} className="flex flex-col items-center justify-center py-16 text-center">
                              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.08] mb-5 shadow-inner">
                                <BellRing size={28} className="text-zinc-600" />
                              </div>
                              <p className="text-[16px] font-bold text-white tracking-tight" style={{ fontFamily: DISPLAY_FONT }}>
                                No subscriptions yet
                              </p>
                              <p className="mt-1.5 text-[13px] text-zinc-500">
                                Subscribe to anime to get notified about new episodes.
                              </p>
                            </motion.div>
                          ) : (
                            <div>
                              <SectionLabel>Tracking {subscribedAnime.length} anime</SectionLabel>
                              <SectionCard>
                                {subscribedAnime.map((anime, i) => (
                                  <div
                                    key={anime.malId}
                                    className="relative flex items-center gap-4 px-4 py-3.5 transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px] cursor-pointer hover:bg-white/[0.04]"
                                    style={i < subscribedAnime.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                    onClick={() => {
                                      const slug = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                                      onClose();
                                      navigate(`/watch/${slug}`);
                                    }}
                                  >
                                    <div
                                      className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] shadow-sm shrink-0"
                                      style={{ background: 'color-mix(in srgb, var(--app-accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--app-accent) 30%, transparent)', color: 'var(--app-accent)' }}
                                    >
                                      <BellRing size={18} strokeWidth={2} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="truncate text-[13.5px] font-semibold text-white">{anime.title}</h4>
                                      <p className="text-[12px] text-zinc-500 mt-0.5">
                                        {anime.status === 'NOT_YET_RELEASED' ? 'Awaiting release' : anime.status === 'RELEASING' ? 'Currently airing' : anime.status || 'Tracking'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFollow({ malId: anime.malId, title: anime.title, cover: anime.cover, type: anime.type, status: anime.status });
                                        setSubscribedAnime(prev => prev.filter(a => a.malId !== anime.malId));
                                      }}
                                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wider transition-all duration-200 bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-[0.96]"
                                    >
                                      <X size={12} strokeWidth={2.5} />
                                      Unsub
                                    </button>
                                  </div>
                                ))}
                              </SectionCard>
                            </div>
                          )
                        ) : filteredNotifications.length === 0 ? (
                          <motion.div variants={fadeUpItem} className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.08] mb-5 shadow-inner">
                              <activeTabMeta.icon size={28} className="text-zinc-600" />
                            </div>
                            <p className="text-[16px] font-bold text-white tracking-tight" style={{ fontFamily: DISPLAY_FONT }}>
                              You're all caught up!
                            </p>
                            <p className="mt-1.5 text-[13px] text-zinc-500">
                              No {activeTab === 'all' ? 'new' : activeTab} notifications at this time.
                            </p>
                          </motion.div>
                        ) : (
                          <div>
                            <SectionLabel>Inbox</SectionLabel>
                            <SectionCard>
                              {filteredNotifications.map((notification, i) => {
                                const Icon = notification.icon;
                                const isFriendRequest = notification.type === 'friend_request';

                                return (
                                  <div
                                    key={notification.id}
                                    onClick={() => {
                                      if (isFriendRequest) return;
                                      setPropNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, unread: false } : n));
                                      if (notification.slug) {
                                        onClose();
                                        navigate(`/watch/${notification.slug}`);
                                      }
                                    }}
                                    className={`relative flex items-start gap-4 px-4 py-4 transition-colors duration-200 first:rounded-t-[16px] last:rounded-b-[16px] ${notification.unread
                                        ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                                        : 'hover:bg-white/[0.02]'
                                      } ${!isFriendRequest ? 'cursor-pointer' : ''}`}
                                    style={i < filteredNotifications.length - 1 ? { borderBottom: '1px solid rgba(255,255,255,0.04)' } : {}}
                                  >

                                    {/* Thumbnail or Icon */}
                                    <div
                                      className={`relative shrink-0 ml-1 mt-0.5 ${isFriendRequest ? 'cursor-pointer' : ''}`}
                                      onClick={(e) => {
                                        if (isFriendRequest && notification.actionId) {
                                          e.stopPropagation();
                                          onClose();
                                          window.dispatchEvent(new CustomEvent('open-profile-modal', { detail: { userId: notification.actionId } }));
                                        }
                                      }}
                                    >
                                      {notification.coverImage ? (
                                        <div className="h-[42px] w-[42px] overflow-hidden rounded-[10px] border border-white/[0.1] bg-[#1a1a1c] shadow-sm">
                                          <img src={notification.coverImage} alt="" className="h-full w-full object-cover" draggable={false} />
                                        </div>
                                      ) : (
                                        <div
                                          className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] shadow-sm"
                                          style={{ background: `color-mix(in srgb, ${notification.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${notification.color} 30%, transparent)`, color: notification.color }}
                                        >
                                          {isFriendRequest && !notification.coverImage ? <User size={18} strokeWidth={2} /> : <Icon size={18} strokeWidth={2} />}
                                        </div>
                                      )}

                                      {isFriendRequest && notification.coverImage && (
                                        <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-black shadow-sm"
                                          style={{ background: 'var(--app-accent)', border: '2px solid var(--app-bg)' }}>
                                          <UserPlus size={10} strokeWidth={3} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-0.5">
                                        <h4
                                          className={`truncate text-[13.5px] font-semibold ${notification.unread ? 'text-white' : 'text-zinc-300'} ${isFriendRequest ? 'cursor-pointer hover:text-[var(--app-accent)] transition-colors' : ''}`}
                                          onClick={(e) => {
                                            if (isFriendRequest && notification.actionId) {
                                              e.stopPropagation();
                                              onClose();
                                              window.dispatchEvent(new CustomEvent('open-profile-modal', { detail: { userId: notification.actionId } }));
                                            }
                                          }}
                                        >
                                          {notification.title}
                                        </h4>
                                        <span className="shrink-0 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                          {notification.time}
                                        </span>
                                      </div>
                                      <p className="text-[13px] text-zinc-400 line-clamp-2 leading-relaxed">
                                        {notification.message}
                                      </p>

                                      {/* Friend Request Action Buttons */}
                                      {isFriendRequest && notification.actionId && (
                                        <div className="flex items-center gap-2 mt-3.5">
                                          <button
                                            disabled={processingId === notification.actionId}
                                            onClick={(e) => { e.stopPropagation(); handleFriendAction(notification.actionId!, 'decline', notification.id); }}
                                            className="flex-1 h-[34px] rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[12.5px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 disabled:opacity-50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 active:scale-[0.96]"
                                          >
                                            <X size={14} strokeWidth={2.5} /> Decline
                                          </button>

                                          <button
                                            disabled={processingId === notification.actionId}
                                            onClick={(e) => { e.stopPropagation(); handleFriendAction(notification.actionId!, 'accept', notification.id); }}
                                            className="flex-1 h-[34px] rounded-[10px] text-[12.5px] font-bold flex items-center justify-center gap-1.5 text-black disabled:opacity-50 transition-all duration-200 hover:brightness-110 active:scale-[0.96]"
                                            style={{ background: 'var(--app-accent)' }}
                                          >
                                            {processingId === notification.actionId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />} Accept
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </SectionCard>
                          </div>
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
}