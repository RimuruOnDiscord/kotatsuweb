
import React, { useEffect, useState, useMemo } from 'react';
import { Bell, CheckCheck, UserPlus, Check, X, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';
const DISPLAY_FONT = '"Syne", sans-serif';

export interface AppNotification {
  id: number | string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: React.ElementType;
  color: string;
  coverImage?: string;
  type?: 'default' | 'friend_request';
  actionId?: string; // Stores user_id for friend requests
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Helper to format time
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

const NotificationDropdown = ({
  notifications: propNotifications,
  setNotifications: setPropNotifications,
}: {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) => {
  const { user } = useAuth();
  const [friendRequests, setFriendRequests] = useState<AppNotification[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Loading state for a smooth transition
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  // 1. Fetch Friend Requests
  useEffect(() => {
    if (!user?.id) {
      setIsLoadingRequests(false);
      return;
    }

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
  }, [user?.id]);

  const allNotifications = useMemo(() => {
    return [...friendRequests, ...propNotifications];
  }, [friendRequests, propNotifications]);

  const unreadCount = allNotifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setPropNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setFriendRequests((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // 2. Handle Friend Request Actions
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: '-50%', scale: 0.96 }}
      animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
      exit={{ opacity: 0, y: 8, x: '-50%', scale: 0.96, filter: 'blur(4px)' }}
      transition={{ 
        type: 'spring', 
        damping: 25, 
        stiffness: 350,
        opacity: { duration: 0.15 } // Slightly faster fade on exit
      }}
      className="absolute left-1/2 top-[calc(100%+14px)] w-[360px] flex flex-col overflow-hidden z-[100] cursor-default rounded-[24px] shadow-2xl"
      style={{
        background: 'var(--app-surface-1, rgba(9, 9, 11, 0.95))',
        backdropFilter: 'blur(16px)',
        fontFamily: APP_FONT,
        border: '1px solid var(--app-border, rgba(255,255,255,0.08))',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-white tracking-tight leading-none mb-1" style={{ fontFamily: DISPLAY_FONT }}>
              Notifications
            </h2>
            <p className="text-[12px] text-zinc-400 leading-none">
              {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            title="Mark all as read"
            className="flex items-center justify-center w-8 h-8 rounded-[10px] text-zinc-400 bg-white/[0.02] border border-transparent hover:border-white/[0.1] hover:bg-white/[0.06] hover:text-white transition-all duration-200"
          >
            <CheckCheck size={15} />
          </button>
        )}
      </div>

      {/* ── List ── */}
      <div className="relative z-10 max-h-[380px] overflow-y-auto p-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        <div className="flex flex-col gap-1">
          {/* Removed mode="popLayout" as it causes items to jump unexpectedly during variable-height exits */}
          <AnimatePresence initial={false}>
            
            {/* SKELETON LOADER */}
            {isLoadingRequests && (
              <motion.div
                key="skeleton-loader"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                className="flex w-full items-start gap-3.5 rounded-[16px] p-3 border border-transparent opacity-60"
              >
                <div className="h-[40px] w-[40px] rounded-[12px] bg-white/[0.05] animate-pulse shrink-0" />
                <div className="flex-1 pt-1.5 flex flex-col gap-2.5">
                  <div className="h-3 w-1/3 bg-white/[0.05] rounded-full animate-pulse" />
                  <div className="h-2.5 w-2/3 bg-white/[0.05] rounded-full animate-pulse" />
                </div>
              </motion.div>
            )}

            {/* EMPTY STATE */}
            {!isLoadingRequests && allNotifications.length === 0 && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-10 text-center px-4"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/[0.02] border border-white/[0.05] mb-4 shadow-inner">
                  <Bell size={24} className="text-zinc-600" />
                </div>
                <p className="text-[15px] font-bold text-white tracking-tight" style={{ fontFamily: DISPLAY_FONT }}>
                  You're all caught up!
                </p>
                <p className="mt-1 text-[13px] text-zinc-500">
                  No new notifications at this time.
                </p>
              </motion.div>
            )}

            {/* NOTIFICATIONS MAP */}
            {!isLoadingRequests && allNotifications.map((notification) => {
              const Icon = notification.icon;
              const isFriendRequest = notification.type === 'friend_request';

              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  // Crucial: Clear padding and margin on exit to fully collapse height smoothly
                  exit={{ 
                    opacity: 0, 
                    scale: 0.95, 
                    height: 0, 
                    paddingTop: 0, 
                    paddingBottom: 0, 
                    marginTop: 0, 
                    marginBottom: 0, 
                    overflow: 'hidden' 
                  }}
                  transition={{ 
                    type: 'spring', 
                    damping: 25, 
                    stiffness: 350,
                  }}
                  onClick={() => {
                    if (isFriendRequest) return;
                    setPropNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, unread: false } : n));
                  }}
                  className={`group relative flex w-full items-start gap-3.5 rounded-[16px] p-3 text-left border transition-colors duration-150 ease-out ${
                    notification.unread 
                      ? 'bg-white/[0.03] border-transparent hover:bg-white/[0.06] hover:border-white/[0.08]' 
                      : 'opacity-60 bg-transparent border-transparent hover:opacity-100 hover:bg-white/[0.02] hover:border-white/[0.04]'
                  } ${!isFriendRequest ? 'cursor-pointer' : ''}`}
                >

                  {/* Thumbnail or icon */}
                  <div className="relative shrink-0 mt-0.5">
                    {notification.coverImage ? (
                      <div className="h-[46px] w-[46px] overflow-hidden rounded-[12px] border border-white/[0.1] bg-zinc-900 shadow-lg">
                        <img src={notification.coverImage} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" draggable={false} />
                      </div>
                    ) : (
                      <div 
                        className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] shadow-sm transition-transform duration-300 group-hover:scale-110"
                        style={{ background: `color-mix(in srgb, ${notification.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${notification.color} 30%, transparent)`, color: notification.color }}
                      >
                        {isFriendRequest && !notification.coverImage ? <User size={18} strokeWidth={2} /> : <Icon size={18} strokeWidth={2} />}
                      </div>
                    )}
                    
                    {/* Sub-icon for friend requests with avatars */}
                    {isFriendRequest && notification.coverImage && (
                       <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-white shadow-md"
                            style={{ background: 'var(--app-accent, #8b5cf6)', borderColor: 'var(--app-surface-1, #09090b)' }}>
                         <UserPlus size={10} strokeWidth={3} />
                       </div>
                    )}
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className={`truncate text-[13.5px] font-medium transition-colors duration-150 ${notification.unread ? 'text-white' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
                        {notification.title}
                      </h4>
                      <span className="shrink-0 text-[10px] font-regular text-zinc-500 uppercase tracking-wider">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-[13px] text-zinc-400 line-clamp-2 leading-relaxed transition-colors duration-150 group-hover:text-zinc-300">
                      {notification.message}
                    </p>

                    {/* Friend Request Actions */}
                    {isFriendRequest && notification.actionId && (
                      <div className="flex items-center gap-2 mt-3">
                        <motion.button 
                          disabled={processingId === notification.actionId}
                          onClick={(e) => { e.stopPropagation(); handleFriendAction(notification.actionId!, 'accept', notification.id); }}
                          whileTap={{ scale: 0.96 }}
                          className="group/btn relative overflow-hidden flex-1 h-8 rounded-[8px] text-[12px] font-bold flex items-center justify-center disabled:opacity-50 border border-solid"
                          style={{ 
                            backgroundColor: 'color-mix(in srgb, var(--app-accent) 12%, transparent)',
                            borderColor: 'color-mix(in srgb, var(--app-accent) 25%, transparent)',
                            color: 'var(--app-accent)'
                          }}
                        >
                          <div className="absolute inset-0 bg-white/[0.08] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150 ease-out z-0" />
                          <span className="relative z-10 flex items-center gap-1.5 transition-colors duration-150 group-hover/btn:text-white">
                            {processingId === notification.actionId ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.5} />} Accept
                          </span>
                        </motion.button>
                        
                        <motion.button 
                          disabled={processingId === notification.actionId}
                          onClick={(e) => { e.stopPropagation(); handleFriendAction(notification.actionId!, 'decline', notification.id); }}
                          whileTap={{ scale: 0.96 }}
                          className="group/decline relative overflow-hidden flex-1 h-8 rounded-[8px] bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-[12px] font-bold flex items-center justify-center disabled:opacity-50"
                        >
                          <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover/decline:opacity-100 transition-opacity duration-150 ease-out z-0" />
                          <span className="relative z-10 flex items-center gap-1.5 transition-colors duration-150 group-hover/decline:text-white">
                            <X size={14} strokeWidth={2.5} /> Decline
                          </span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationDropdown;
