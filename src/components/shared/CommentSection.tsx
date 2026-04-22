import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Trash2, Loader2, LogIn, Paperclip, ThumbsUp, ThumbsDown, CornerDownRight } from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from './AuthModal';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  dislikes_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface CommentSectionProps {
  pageType: 'manga' | 'anime' | 'watch';
  pageId: string;
}

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

const CommentSection: React.FC<CommentSectionProps> = ({ pageType, pageId }) => {
  const { user, profile, session } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reply State
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  const fetchCommentsAndVotes = useCallback(async () => {
    if (!pageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/comments?page_type=eq.${encodeURIComponent(pageType)}&page_id=eq.${encodeURIComponent(pageId)}&select=id,user_id,content,created_at,parent_id,likes_count,dislikes_count,profiles(display_name,avatar_url)&order=created_at.desc`, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data as Comment[]);
      } else {
        console.error('Fetch comments bad response:', response.status);
      }

      // Fetch user votes if logged in
      if (user) {
        const votesResponse = await fetch(`${supabaseUrl}/rest/v1/comment_votes?user_id=eq.${user.id}&select=comment_id,vote_type`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`
          }
        });
        if (votesResponse.ok) {
          const votesData = await votesResponse.json();
          const votesMap: Record<string, number> = {};
          votesData.forEach((v: any) => {
            votesMap[v.comment_id] = v.vote_type;
          });
          setUserVotes(votesMap);
        }
      } else {
        setUserVotes({});
      }
    } catch (err) {
      console.error('Fetch comments native error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageType, pageId, user, session]);

  useEffect(() => {
    fetchCommentsAndVotes();
  }, [fetchCommentsAndVotes]);

  const handleSubmit = async (parentId: string | null = null, content: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!content.trim()) return;

    if (parentId) {
      setSubmittingReply(parentId);
    } else {
      setSubmitting(true);
    }

    try {
      const token = session?.access_token || supabaseAnonKey;

      const response = await fetch(`${supabaseUrl}/rest/v1/comments`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: user.id,
          page_type: pageType,
          page_id: pageId,
          content: content.trim(),
          parent_id: parentId
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (parentId) {
        setReplyToId(null);
        setReplyContent('');
      } else {
        setNewComment('');
      }
      await fetchCommentsAndVotes();
    } catch (err: any) {
      console.error('Submit caught error:', err);
      alert('Failed to post comment: ' + (err.message || 'Network error'));
    } finally {
      setSubmitting(false);
      setSubmittingReply(null);
    }
  };

  const handleVote = async (commentId: string, type: 1 | -1) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const currentVote = userVotes[commentId];
    const isRemoving = currentVote === type;
    const token = session?.access_token || supabaseAnonKey;

    // Optimistic UI update
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        let newLikes = c.likes_count || 0;
        let newDislikes = c.dislikes_count || 0;

        if (isRemoving) {
          if (type === 1) newLikes--;
          else newDislikes--;
        } else {
          // Add new vote
          if (type === 1) newLikes++;
          else newDislikes++;
          // Remove old vote if switching
          if (currentVote === 1) newLikes--;
          else if (currentVote === -1) newDislikes--;
        }

        return { ...c, likes_count: Math.max(0, newLikes), dislikes_count: Math.max(0, newDislikes) };
      }
      return c;
    }));

    setUserVotes(prev => {
      const next = { ...prev };
      if (isRemoving) delete next[commentId];
      else next[commentId] = type;
      return next;
    });

    try {
      if (isRemoving) {
        await fetch(`${supabaseUrl}/rest/v1/comment_votes?user_id=eq.${user.id}&comment_id=eq.${commentId}`, {
          method: 'DELETE',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/comment_votes?on_conflict=user_id,comment_id`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ user_id: user.id, comment_id: commentId, vote_type: type })
        });
      }
    } catch {
      // Revert on failure (could improve by re-fetching)
      fetchCommentsAndVotes();
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const token = session?.access_token || supabaseAnonKey;
      const response = await fetch(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchCommentsAndVotes();
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  // Group comments by parent_id
  const rootComments = comments.filter(c => !c.parent_id);
  const repliesMap = new Map<string, Comment[]>();
  comments.forEach(c => {
    if (c.parent_id) {
      if (!repliesMap.has(c.parent_id)) repliesMap.set(c.parent_id, []);
      repliesMap.get(c.parent_id)!.push(c);
    }
  });

  const renderInputBox = (value: string, onChange: (v: string) => void, onSubmit: () => void, isSubmitting: boolean, placeholder: string, autoFocus?: boolean) => (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hidden sm:flex"
        style={{ background: getAvatarColor(profile?.display_name || 'U') }}
      >
        {(profile?.display_name || 'U')[0].toUpperCase()}
      </div>
      <div className="flex-1 border border-white/10 bg-white/[0.03] rounded-2xl overflow-hidden focus-within:border-[var(--app-accent)]/40 focus-within:bg-white/[0.06] transition-all">
        <textarea
          autoFocus={autoFocus}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
          placeholder={placeholder}
          maxLength={2000}
          rows={2}
          className="w-full resize-none bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600"
        />
        <div className="flex items-center justify-between px-4 py-2 mt-1 border-t border-white/[0.05]">
          <div className="flex gap-4 items-center">
            <button className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors">
              <Paperclip size={16} />
            </button>
            <span className="text-[10px] font-medium text-zinc-600 hidden sm:block">
              {value.length}/2000
            </span>
          </div>
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isSubmitting}
            className="flex items-center gap-2 rounded-xl px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-30"
            style={{ backgroundColor: 'var(--app-accent)', color: '#000' }}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Post
          </button>
        </div>
      </div>
    </div>
  );

  const renderCommentNode = (comment: Comment, depth = 0): React.ReactNode => {
    const displayName = comment.profiles?.display_name || 'Anonymous';
    const isOwn = user?.id === comment.user_id;
    const childReplies = repliesMap.get(comment.id) || [];
    const myVote = userVotes[comment.id];

    return (
      <div className={`mt-3 ${depth > 0 ? 'ml-4 sm:ml-12 border-white/5 pl-4' : ''}`}>
        <div className="group rounded-2xl border border-transparent hover:border-white/5 bg-transparent hover:bg-white/[0.01] p-3 -mx-3 transition-all relative">

          {depth > 0 && <CornerDownRight size={14} className="absolute -left-[19px] top-4 text-zinc-700" />}

          <div className="flex items-start gap-3">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: getAvatarColor(displayName) }}
            >
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">
                  {displayName}
                </span>
                <span className="text-[10px] text-zinc-600 flex-shrink-0">
                  {timeAgo(comment.created_at)}
                </span>
                {isOwn && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="ml-auto flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    {deletingId === comment.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                {comment.content}
              </p>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(comment.id, 1)}
                    className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${myVote === 1 ? 'text-[var(--app-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ThumbsUp size={13} className={myVote === 1 ? 'fill-[var(--app-accent)]' : ''} />
                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                  </button>
                  <button
                    onClick={() => handleVote(comment.id, -1)}
                    className={`flex items-center gap-1.5 text-[11px] font-medium ml-2 transition-colors ${myVote === -1 ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ThumbsDown size={13} className={myVote === -1 ? 'fill-red-400' : ''} />
                  </button>
                </div>

                {depth < 3 && (
                  <button
                    onClick={() => {
                      setReplyToId(replyToId === comment.id ? null : comment.id);
                      setReplyContent('');
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <MessageSquare size={13} />
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>

          {replyToId === comment.id && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {user ? (
                renderInputBox(
                  replyContent,
                  setReplyContent,
                  () => handleSubmit(comment.id, replyContent),
                  submittingReply === comment.id,
                  `Reply to ${displayName}...`,
                  true
                )
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-zinc-400 transition-all hover:bg-white/[0.07] hover:text-white"
                >
                  Sign in to reply
                </button>
              )}
            </div>
          )}
        </div>

        {childReplies.length > 0 && (
          <div className="flex flex-col">
            {childReplies.map(reply => (
              <React.Fragment key={reply.id}>
                {renderCommentNode(reply, depth + 1)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <section className="mt-8 mb-6">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between mb-6 group"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-regular uppercase tracking-[0.24em] text-[var(--app-accent)]">
              <MessageSquare size={14} className="text-[var(--app-accent)]" />
              Comments
            </div>
          </div>
        </button>

        {expanded && (
          <div className="space-y-6" style={{ animation: 'fadeSlideIn 0.25s ease' }}>
            {/* Main Input Box */}
            <div>
              {user ? (
                renderInputBox(
                  newComment,
                  setNewComment,
                  () => handleSubmit(null, newComment),
                  submitting,
                  "Write a comment..."
                )
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-zinc-400 transition-all hover:border-[var(--app-accent)]/30 hover:bg-white/[0.07] hover:text-white"
                >
                  <LogIn size={16} className="text-[var(--app-accent)]" />
                  Sign in to comment
                </button>
              )}
            </div>

            {/* Comments List */}
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
              </div>
            ) : comments.length === 0 ? (
              <div className="py-6 text-center">
                <MessageSquare size={24} className="mx-auto mb-3 text-zinc-700/50" />
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">
                  No comments yet
                </div>
              </div>
            ) : (
              <div className="pt-2">
                {rootComments.map((comment) => (
                  <React.Fragment key={comment.id}>
                    {renderCommentNode(comment)}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default CommentSection;
