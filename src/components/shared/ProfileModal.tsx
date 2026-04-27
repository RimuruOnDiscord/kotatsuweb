import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, User, Bookmark, MessageSquare, CornerUpLeft, Calendar,
  Activity, Loader2, Users, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  page_type: string;
  page_id: string;
  likes_count: number;
}

interface BookmarkItem {
  mal_id: string;
  title: string;
  cover: string;
  type: string;
  status: string;
}

type TabKey = 'overview' | 'bookmarks' | 'comments' | 'replies';

const timeAgo = (dateStr: string) => {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
};

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 60%, 50%)`;
};

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ joined: '', bookmarks: 0, comments: 0, replies: 0 });


  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = supabaseAnonKey;
      const uid = user.id;

      const [commentsRes, repliesRes, bookmarksRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, {
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/comments?user_id=eq.${uid}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count&order=created_at.desc`, {
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
        }),
        fetch(`${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${uid}&select=mal_id,title,cover,type,status&order=created_at.desc`, {
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` },
        }),
      ]);

      let cList: CommentItem[] = [];
      let rList: CommentItem[] = [];
      let bList: BookmarkItem[] = [];

      if (commentsRes.ok) { cList = await commentsRes.json(); setComments(cList); }
      if (repliesRes.ok) { rList = await repliesRes.json(); setReplies(rList); }
      if (bookmarksRes.ok) { bList = await bookmarksRes.json(); setBookmarks(bList); }

      setStats({
        joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown',
        bookmarks: bList.length,
        comments: cList.length,
        replies: rList.length,
      });
    } catch (err) {
      console.error('Profile modal fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      setActiveTab('overview');
      fetchData();
    }
  }, [open, fetchData]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);


  const getTabIcon = (tab: TabKey, isActive: boolean) => {
    const props = { size: 14, strokeWidth: isActive ? 2 : 1.5, style: { color: isActive ? 'var(--app-accent)' : undefined } };
    switch (tab) {
      case 'overview': return <User {...props} />;
      case 'bookmarks': return <Bookmark {...props} />;
      case 'comments': return <MessageSquare {...props} />;
      case 'replies': return <CornerUpLeft {...props} />;
    }
  };

  const displayName = profile?.display_name || 'Guest User';
  const avatarUrl = profile?.avatar_url;

  const goToProfile = (uid: string) => {
    onClose();
    navigate(`/profile/${uid}`);
  };

  const goToUsers = () => {
    onClose();
    navigate('/users');
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative flex flex-col w-full max-w-[680px] h-[85vh] max-h-[780px] overflow-hidden rounded-[20px] pointer-events-auto"
              style={{
                fontFamily: APP_FONT,
                background: 'var(--app-bg-2, #0f1014)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.03), 0 40px 80px rgba(0,0,0,0.7)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex flex-col px-7 pt-7 pb-0 flex-shrink-0"
                style={{
                  background: 'linear-gradient(160deg, var(--app-accent-muted) 0%, var(--app-bg-2, #0f1014) 100%)',
                  borderBottom: '1px solid var(--app-accent-soft)',
                }}
              >
                <div className="flex justify-between items-start mb-7 relative">
                  <div className="flex items-center gap-5">
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shadow-lg"
                      style={{ background: avatarUrl ? 'transparent' : getAvatarColor(displayName), border: '2px solid var(--app-accent)' }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-white/80" strokeWidth={1.5} />
                      )}
                    </div>

                    <div>
                      <h2
                        className="text-[24px] text-white"
                        style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
                      >
                        {displayName}
                      </h2>
                      <p className="text-[13px] text-zinc-400 mt-0.5 font-medium">
                        {user?.email ?? 'Not signed in'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-white transition-all active:scale-90 absolute right-0 top-0"
                    style={{
                      background: 'var(--app-accent-muted)',
                      border: '1px solid var(--app-accent-soft)',
                      borderRadius: '50%',
                    }}
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>

                {/* Tabs */}
                <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {(['overview', 'bookmarks', 'comments', 'replies'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-t-xl transition-colors whitespace-nowrap"
                      style={{
                        color: activeTab === tab ? 'white' : 'rgb(113,113,122)',
                        background: activeTab === tab ? 'rgba(255,255,255,0.04)' : 'transparent',
                      }}
                    >
                      {getTabIcon(tab, activeTab === tab)}
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="profileTab"
                          className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                          style={{ background: 'var(--app-accent)', boxShadow: '0 -2px 8px var(--app-accent-soft)' }}
                        />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--app-bg, #0a0b0e)' }}>
                <div className="p-7 w-full max-w-[600px] mx-auto min-h-full flex flex-col gap-6">

                  {/* ACTION BUTTONS */}
                  {user && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => goToProfile(user.id)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:brightness-110"
                        style={{ background: 'var(--app-accent)', color: '#000' }}
                      >
                        View Public Profile
                        <ExternalLink size={12} />
                      </button>
                      <button
                        onClick={goToUsers}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:bg-white/[0.03] border border-white/[0.08] text-zinc-300 hover:text-white"
                      >
                        <Users size={12} />
                        Discover People
                      </button>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
                    </div>
                  ) : (
                    <>
                      {/* OVERVIEW */}
                      {activeTab === 'overview' && (
                        <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                <Calendar size={12} style={{ color: 'var(--app-accent)' }} /> Joined
                              </span>
                              <span className="text-lg font-bold text-white mt-1">{stats.joined}</span>
                            </div>
                            <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                <Bookmark size={12} style={{ color: 'var(--app-accent)' }} /> Bookmarks
                              </span>
                              <span className="text-lg font-bold text-white mt-1">{stats.bookmarks}</span>
                            </div>
                            <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                <MessageSquare size={12} style={{ color: 'var(--app-accent)' }} /> Comments
                              </span>
                              <span className="text-lg font-bold text-white mt-1">{stats.comments}</span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-[14px] font-bold uppercase tracking-wider text-white mb-4" style={{ fontFamily: '"Syne", sans-serif' }}>
                              Recent Activity
                            </h3>
                            {(comments.length === 0 && bookmarks.length === 0) ? (
                              <div className="flex flex-col items-center justify-center p-10 rounded-[16px] border border-white/[0.04] bg-white/[0.01]">
                                <Activity size={24} className="text-zinc-600 mb-3" />
                                <p className="text-[13px] text-zinc-400 font-medium">No recent activity to show.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {comments.slice(0, 3).map(c => (
                                  <div
                                    key={c.id}
                                    onClick={() => { onClose(); navigate(`/${c.page_type === 'anime' ? 'watch' : 'read'}/${c.page_id}`); }}
                                    className="p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all"
                                  >
                                    <p className="text-[13px] text-zinc-300 line-clamp-2">{c.content}</p>
                                    <span className="text-[10px] text-zinc-600 mt-1 block">{timeAgo(c.created_at)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* BOOKMARKS */}
                      {activeTab === 'bookmarks' && (
                        <motion.div key="bookmarks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          {bookmarks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                                <Bookmark size={24} className="text-zinc-500" />
                              </div>
                              <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Bookmarks</h3>
                              <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">Anime you bookmark will appear here.</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                              {bookmarks.slice(0, 8).map(b => (
                                <div
                                  key={b.mal_id}
                                  onClick={() => { onClose(); navigate(`/watch/${b.mal_id}`); }}
                                  className="group cursor-pointer"
                                >
                                  <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.04] group-hover:border-[var(--app-accent)]/30 transition-all">
                                    {b.cover ? (
                                      <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-zinc-600"><Bookmark size={20} /></div>
                                    )}
                                  </div>
                                  <p className="mt-1.5 text-[11px] text-zinc-400 truncate group-hover:text-white transition-colors">{b.title}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* COMMENTS */}
                      {activeTab === 'comments' && (
                        <motion.div key="comments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                                <MessageSquare size={24} className="text-zinc-500" />
                              </div>
                              <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Comments</h3>
                            </div>
                          ) : (
                            comments.map(c => (
                              <div
                                key={c.id}
                                onClick={() => { onClose(); navigate(`/${c.page_type === 'anime' ? 'watch' : 'read'}/${c.page_id}`); }}
                                className="p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all"
                              >
                                <p className="text-[13px] text-zinc-300 line-clamp-2">{c.content}</p>
                                <span className="text-[10px] text-zinc-600 mt-1 block">{timeAgo(c.created_at)} • {c.likes_count} likes</span>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}

                      {/* REPLIES */}
                      {activeTab === 'replies' && (
                        <motion.div key="replies" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {replies.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                              <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                                <CornerUpLeft size={24} className="text-zinc-500" />
                              </div>
                              <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Replies</h3>
                            </div>
                          ) : (
                            replies.map(r => (
                              <div
                                key={r.id}
                                onClick={() => { onClose(); navigate(`/${r.page_type === 'anime' ? 'watch' : 'read'}/${r.page_id}`); }}
                                className="p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] cursor-pointer transition-all"
                              >
                                <p className="text-[13px] text-zinc-300 line-clamp-2">{r.content}</p>
                                <span className="text-[10px] text-zinc-600 mt-1 block">{timeAgo(r.created_at)} • {r.likes_count} likes</span>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}

                    </>
                  )}
                </div>
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
