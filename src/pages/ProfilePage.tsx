import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, User, Bookmark, MessageSquare, CornerUpLeft,
  Calendar, Activity, Heart, ThumbsUp, ThumbsDown
} from 'lucide-react';
import PageLoader from '../components/shared/PageLoader';
import { useAuth } from '../lib/AuthContext';
import { supabaseUrl, supabaseAnonKey } from '../lib/supabase';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

interface ProfileData {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface CommentItem {
  id: string;
  content: string;
  created_at: string;
  page_type: string;
  page_id: string;
  likes_count: number;
  dislikes_count: number;
}

interface BookmarkItem {
  id?: string;
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

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ joined: '', bookmarks: 0, comments: 0, replies: 0 });

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Fetch profile
      const profileRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=id,display_name,avatar_url`,
        {
          method: 'GET',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        }
      );
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData?.[0] || null);
      }

      // Fetch comments
      const commentsRes = await fetch(
        `${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=is.null&select=id,content,created_at,page_type,page_id,likes_count,dislikes_count&order=created_at.desc`,
        {
          method: 'GET',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        }
      );
      let commentList: CommentItem[] = [];
      if (commentsRes.ok) {
        commentList = await commentsRes.json();
        setComments(commentList);
      }

      // Fetch replies
      const repliesRes = await fetch(
        `${supabaseUrl}/rest/v1/comments?user_id=eq.${userId}&parent_id=not.is.null&select=id,content,created_at,page_type,page_id,likes_count,dislikes_count&order=created_at.desc`,
        {
          method: 'GET',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        }
      );
      let replyList: CommentItem[] = [];
      if (repliesRes.ok) {
        replyList = await repliesRes.json();
        setReplies(replyList);
      }

      // Fetch bookmarks
      const bookmarksRes = await fetch(
        `${supabaseUrl}/rest/v1/anime_bookmarks?user_id=eq.${userId}&select=mal_id,title,cover,type,status&order=created_at.desc`,
        {
          method: 'GET',
          headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
        }
      );
      let bookmarkList: BookmarkItem[] = [];
      if (bookmarksRes.ok) {
        bookmarkList = await bookmarksRes.json();
        setBookmarks(bookmarkList);
      }

      setStats({
        joined: commentList.length > 0 ? commentList[commentList.length - 1].created_at : new Date().toISOString(),
        bookmarks: bookmarkList.length,
        comments: commentList.length,
        replies: replyList.length,
      });
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfileData();
    window.scrollTo(0, 0);
  }, [fetchProfileData]);

  const getTabIcon = (tab: TabKey, isActive: boolean) => {
    const props = { size: 14, strokeWidth: isActive ? 2 : 1.5, style: { color: isActive ? 'var(--app-accent)' : undefined } };
    switch (tab) {
      case 'overview': return <User {...props} />;
      case 'bookmarks': return <Bookmark {...props} />;
      case 'comments': return <MessageSquare {...props} />;
      case 'replies': return <CornerUpLeft {...props} />;
    }
  };

  const displayName = profile?.display_name || 'User';
  const avatarUrl = profile?.avatar_url;

  const handleAnimeClick = (malId: string) => {
    navigate(`/watch/${malId}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-[var(--app-bg)]">
        <PageLoader size={40} text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col min-h-screen pt-[80px] lg:pt-[80px]" style={{ fontFamily: APP_FONT }}>
      <div className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-20">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Profile Header */}
        <div
          className="rounded-[24px] p-8 mb-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, var(--app-accent-muted) 0%, var(--app-bg-2, #0f1014) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div
              className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-lg"
              style={{ background: avatarUrl ? 'transparent' : getAvatarColor(displayName), border: '3px solid var(--app-accent)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-white/80" strokeWidth={1.5} />
              )}
            </div>

            {/* Info */}
            <div className="text-center sm:text-left flex-1">
              <h1
                className="text-3xl sm:text-4xl text-white"
                style={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                {displayName}
              </h1>
              {isOwnProfile && (
                <p className="text-sm text-zinc-400 mt-1 font-medium">This is your profile</p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar size={12} style={{ color: 'var(--app-accent)' }} />
                  <span>Joined {timeAgo(stats.joined)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Bookmark size={12} style={{ color: 'var(--app-accent)' }} />
                  <span>{stats.bookmarks} Bookmarks</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MessageSquare size={12} style={{ color: 'var(--app-accent)' }} />
                  <span>{stats.comments} Comments</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CornerUpLeft size={12} style={{ color: 'var(--app-accent)' }} />
                  <span>{stats.replies} Replies</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-4 border-b border-white/5">
          {(['overview', 'bookmarks', 'comments', 'replies'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative flex items-center justify-center gap-2 px-5 py-3 text-[13px] font-medium rounded-t-xl transition-colors whitespace-nowrap"
              style={{
                color: activeTab === tab ? 'white' : 'rgb(113,113,122)',
                background: activeTab === tab ? 'rgba(255,255,255,0.04)' : 'transparent',
              }}
            >
              {getTabIcon(tab, activeTab === tab)}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && (
                <motion.div
                  layoutId="profilePageTab"
                  className="absolute -bottom-[1px] left-0 right-0 w-full h-[2px] rounded-t-full"
                  style={{ background: 'var(--app-accent)', boxShadow: '0 -2px 8px var(--app-accent-soft)' }}
                />
              )}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Bookmarks', value: stats.bookmarks, icon: Bookmark },
                  { label: 'Comments', value: stats.comments, icon: MessageSquare },
                  { label: 'Replies', value: stats.replies, icon: CornerUpLeft },
                  { label: 'Likes Given', value: 0, icon: Heart },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-5 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                      <stat.icon size={12} style={{ color: 'var(--app-accent)' }} /> {stat.label}
                    </span>
                    <span className="text-2xl font-bold text-white mt-1">{stat.value}</span>
                  </div>
                ))}
              </div>

              {/* Recent Comments Preview */}
              {comments.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-white mb-4" style={{ fontFamily: '"Syne", sans-serif' }}>
                    Recent Comments
                  </h3>
                  <div className="space-y-3">
                    {comments.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/${c.page_type === 'anime' ? 'watch' : 'read'}/${c.page_id}`)}
                        className="p-4 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 cursor-pointer transition-all"
                      >
                        <p className="text-[13px] text-zinc-300 line-clamp-2">{c.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
                          <span>{timeAgo(c.created_at)}</span>
                          <span className="flex items-center gap-1"><ThumbsUp size={10} /> {c.likes_count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Bookmarks Preview */}
              {bookmarks.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-white mb-4" style={{ fontFamily: '"Syne", sans-serif' }}>
                    Recent Bookmarks
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {bookmarks.slice(0, 6).map((b) => (
                      <div
                        key={b.mal_id}
                        onClick={() => handleAnimeClick(b.mal_id)}
                        className="group cursor-pointer"
                      >
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.04] group-hover:border-[var(--app-accent)]/30 transition-all">
                          {b.cover ? (
                            <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Bookmark size={20} />
                            </div>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] text-zinc-400 truncate group-hover:text-white transition-colors">{b.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comments.length === 0 && bookmarks.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 rounded-[16px] border border-white/[0.04] bg-white/[0.01]">
                  <Activity size={24} className="text-zinc-600 mb-3" />
                  <p className="text-[13px] text-zinc-400 font-medium">No recent activity to show.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* BOOKMARKS */}
          {activeTab === 'bookmarks' && (
            <motion.div key="bookmarks" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              {bookmarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                    <Bookmark size={24} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Bookmarks</h3>
                  <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                    {isOwnProfile ? 'Anime you bookmark will appear here for quick access.' : 'This user has no bookmarks yet.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {bookmarks.map((b) => (
                    <div
                      key={b.mal_id}
                      onClick={() => handleAnimeClick(b.mal_id)}
                      className="group cursor-pointer"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.04] group-hover:border-[var(--app-accent)]/30 transition-all">
                        {b.cover ? (
                          <img src={b.cover} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600">
                            <Bookmark size={24} />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 text-[12px] text-zinc-300 font-medium truncate group-hover:text-white transition-colors">{b.title}</p>
                      <p className="text-[10px] text-zinc-600">{b.type} • {b.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* COMMENTS */}
          {activeTab === 'comments' && (
            <motion.div key="comments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                    <MessageSquare size={24} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Comments</h3>
                  <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                    {isOwnProfile ? "You haven't left any comments yet." : 'This user has no comments yet.'}
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/${c.page_type === 'anime' ? 'watch' : 'read'}/${c.page_id}`)}
                    className="p-5 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 cursor-pointer transition-all"
                  >
                    <p className="text-[13px] text-zinc-300 leading-relaxed">{c.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-600">
                      <span>{timeAgo(c.created_at)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={12} /> {c.likes_count}</span>
                      <span className="flex items-center gap-1"><ThumbsDown size={12} /> {c.dislikes_count}</span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* REPLIES */}
          {activeTab === 'replies' && (
            <motion.div key="replies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                    <CornerUpLeft size={24} className="text-zinc-500" />
                  </div>
                  <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Replies</h3>
                  <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                    {isOwnProfile ? "You haven't replied to any comments yet." : 'This user has no replies yet.'}
                  </p>
                </div>
              ) : (
                replies.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => navigate(`/${r.page_type === 'anime' ? 'watch' : 'read'}/${r.page_id}`)}
                    className="p-5 rounded-[16px] border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/10 cursor-pointer transition-all"
                  >
                    <p className="text-[13px] text-zinc-300 leading-relaxed">{r.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-600">
                      <span>{timeAgo(r.created_at)}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={12} /> {r.likes_count}</span>
                      <span className="flex items-center gap-1"><ThumbsDown size={12} /> {r.dislikes_count}</span>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
