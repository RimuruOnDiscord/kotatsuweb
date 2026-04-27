import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, Send, Trash2, Loader2, LogIn, Paperclip, 
  ThumbsUp, ThumbsDown, CornerDownRight, Bold, Italic, Strikethrough, Pencil 
} from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from './AuthModal';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  parent_id: string | null;
  likes_count: number;
  dislikes_count: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    created_at?: string; 
    role?: string | string[]; // <-- Updated to support arrays or strings
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

// Formats Markdown-like tags (**, *, ~~) securely
const renderFormattedText = (text: string) => {
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');
  escaped = escaped.replace(/\~\~(.*?)\~\~/g, '<del class="line-through text-zinc-500">$1</del>');

  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
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

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState<string | null>(null);

  // Reply State
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const tokenRef = useRef(session?.access_token || supabaseAnonKey);
  useEffect(() => {
    tokenRef.current = session?.access_token || supabaseAnonKey;
  }, [session?.access_token]);

  const fetchCommentsAndVotes = useCallback(async () => {
    if (!pageId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const queryParams = `page_type=eq.${encodeURIComponent(pageType)}&page_id=eq.${encodeURIComponent(pageId)}&order=created_at.desc`;
      
      let selectQuery = `id,user_id,content,created_at,updated_at,parent_id,likes_count,dislikes_count,profiles(display_name,avatar_url,created_at,role)`;
      let response = await fetch(`${supabaseUrl}/rest/v1/comments?${queryParams}&select=${selectQuery}`, {
        method: 'GET',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      });

      if (!response.ok) {
        selectQuery = `id,user_id,content,created_at,updated_at,parent_id,likes_count,dislikes_count,profiles(display_name,avatar_url)`;
        response = await fetch(`${supabaseUrl}/rest/v1/comments?${queryParams}&select=${selectQuery}`, {
          method: 'GET',
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        });
      }

      if (response.ok) {
        const data = await response.json();
        setComments(data as Comment[]);
      } else {
        console.error('Fetch comments bad response:', response.status);
      }

      if (user?.id) {
        const votesResponse = await fetch(`${supabaseUrl}/rest/v1/comment_votes?user_id=eq.${user.id}&select=comment_id,vote_type`, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${tokenRef.current}`
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
  }, [pageType, pageId, user?.id]);

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

      if (!response.ok) throw new Error(await response.text());

      if (parentId) {
        setReplyToId(null);
        setReplyContent('');
        setExpandedReplies(prev => new Set(prev).add(parentId));
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

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim()) return;
    setSubmittingEdit(commentId);
    
    try {
      const token = session?.access_token || supabaseAnonKey;
      const now = new Date().toISOString();

      const response = await fetch(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ 
          content: editContent.trim(),
          updated_at: now
        })
      });

      if (!response.ok) throw new Error(await response.text());

      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, content: editContent.trim(), updated_at: now } : c
      ));
      
      setEditingId(null);
      setEditContent('');
    } catch (err: any) {
      console.error('Edit caught error:', err);
      alert('Failed to edit comment.');
    } finally {
      setSubmittingEdit(null);
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

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        let newLikes = c.likes_count || 0;
        let newDislikes = c.dislikes_count || 0;

        if (isRemoving) {
          if (type === 1) newLikes--;
          else newDislikes--;
        } else {
          if (type === 1) newLikes++;
          else newDislikes++;
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
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
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
      fetchCommentsAndVotes();
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      const token = session?.access_token || supabaseAnonKey;
      const response = await fetch(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, {
        method: 'DELETE',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchCommentsAndVotes();
    } catch {
      // Silently fail
    } finally {
      setDeletingId(null);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const insertFormatting = (
    inputId: string,
    format: 'bold' | 'italic' | 'strike',
    value: string,
    onChange: (v: string) => void
  ) => {
    const el = document.getElementById(inputId) as HTMLTextAreaElement;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.substring(start, end);
      const before = value.substring(0, start);
      const after = value.substring(end);
      let wrapped = '';
      
      if (format === 'bold') wrapped = `**${selected || 'bold'}**`;
      if (format === 'italic') wrapped = `*${selected || 'italic'}*`;
      if (format === 'strike') wrapped = `~~${selected || 'strike'}~~`;
      
      onChange(before + wrapped + after);

      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + wrapped.length, start + wrapped.length);
      }, 0);
    }
  };

  // --------------------------------------------------------
  // SLEEK & PREMIUM BADGES LOGIC
  // --------------------------------------------------------
const renderBadges = (commentProfile: any, likes: number) => {
    const badges = [];
    
    // 1. Normalize roles into an array of lowercase strings
    let roles: string[] = [];
    if (Array.isArray(commentProfile?.role)) {
      roles = commentProfile.role.map((r: string) => r.toLowerCase());
    } else if (typeof commentProfile?.role === 'string') {
      // Splits "founder, dev, premium" into ['founder', 'dev', 'premium']
      roles = commentProfile.role.split(',').map((r: string) => r.trim().toLowerCase());
    }

    // 2. Use independent `if` statements to allow stacking multiple badges
    
    // Staff Roles
    if (roles.some(r => ['founder', 'admin'].includes(r))) {
      badges.push({ text: 'Founder', cssClass: 'badge-founder' });
    }
    if (roles.some(r => ['mod', 'moderator', 'staff'].includes(r))) {
      badges.push({ text: 'Staff', cssClass: 'badge-staff' });
    } 

    // Special Status
    if (roles.some(r => ['vip', 'premium', 'donator'].includes(r))) {
      badges.push({ text: 'Premium', cssClass: 'badge-premium' });
    }
    if (roles.some(r => ['verified', 'trusted'].includes(r))) {
      badges.push({ text: 'Verified', cssClass: 'badge-verified' });
    }
    if (roles.some(r => ['developer', 'dev'].includes(r))) {
      badges.push({ text: 'Dev', cssClass: 'badge-dev' });
    }

    // Engagement (Kept as if/else so you don't get both "On Fire" and "Top")
    if (likes >= 50) {
      badges.push({ text: 'On Fire', cssClass: 'badge-fire' });
    } else if (likes >= 10) {
      badges.push({ text: 'Top', cssClass: 'badge-top' });
    }

    // New User
    if (commentProfile?.created_at) {
      const daysOld = (Date.now() - new Date(commentProfile.created_at).getTime()) / (1000 * 60 * 60 * 24);
      const isStaff = roles.some(r => ['founder', 'admin', 'mod', 'staff'].includes(r));
      
      // Hide "New" badge if they are staff
      if (daysOld <= 14 && !isStaff) {
        badges.push({ text: 'New', cssClass: 'badge-new' });
      }
    }

    return badges.map((b, i) => (
      <div key={i} className={`badge-base ${b.cssClass}`}>
        <span>{b.text}</span>
      </div>
    ));
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const repliesMap = new Map<string, Comment[]>();
  comments.forEach(c => {
    if (c.parent_id) {
      if (!repliesMap.has(c.parent_id)) repliesMap.set(c.parent_id, []);
      repliesMap.get(c.parent_id)!.push(c);
    }
  });

  const renderInputBox = (
    inputId: string,
    value: string, 
    onChange: (v: string) => void, 
    onSubmit: () => void, 
    isSubmitting: boolean, 
    placeholder: string, 
    autoFocus?: boolean,
    onCancel?: () => void,
    submitText: string = "Post",
    hideAvatar: boolean = false
  ) => {
    const userAvatarUrl = profile?.avatar_url;

    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full group/input">
        {!hideAvatar && (
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hidden sm:flex overflow-hidden transition-transform duration-300 group-focus-within/input:scale-105"
            style={{ background: userAvatarUrl ? 'transparent' : getAvatarColor(profile?.display_name || 'U') }}
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Your Avatar" className="h-full w-full object-cover" />
            ) : (
              (profile?.display_name || 'U')[0].toUpperCase()
            )}
          </div>
        )}
        
        <div className="flex-1 border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] rounded-2xl overflow-hidden focus-within:!border-[var(--app-accent)] focus-within:!bg-white/[0.05] transition-all duration-300 ease-out">
          <textarea
            id={inputId}
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
            <div className="flex gap-1 sm:gap-2 items-center">
              <button className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200">
                <Paperclip size={14} />
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block"></div>
              <button onClick={() => insertFormatting(inputId, 'bold', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200"><Bold size={14} /></button>
              <button onClick={() => insertFormatting(inputId, 'italic', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200"><Italic size={14} /></button>
              <button onClick={() => insertFormatting(inputId, 'strike', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200"><Strikethrough size={14} /></button>
              <span className="text-[10px] font-medium text-zinc-600 hidden sm:block ml-2">{value.length}/2000</span>
            </div>
            
            <div className="flex items-center gap-2">
              {onCancel && (
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={onSubmit}
                disabled={!value.trim() || isSubmitting}
                className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-2 text-[11px] font-black uppercase tracking-widest text-black transition-all duration-200 hover:scale-[1.05] active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none"
                style={{ backgroundColor: 'var(--app-accent)' }}
              >
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-200 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                  <div className="relative h-full w-8 bg-white/20" />
                </div>
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="transition-transform duration-200 ease-out" />}
                  <span>{submitText}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCommentNode = (comment: Comment, depth = 0): React.ReactNode => {
    const displayName = comment.profiles?.display_name || 'Anonymous';
    const avatarUrl = comment.profiles?.avatar_url;
    const isOwn = user?.id === comment.user_id;
    const childReplies = repliesMap.get(comment.id) || [];
    const myVote = userVotes[comment.id];
    const isExpanded = expandedReplies.has(comment.id);
    const isEditing = editingId === comment.id;

    const isEdited = comment.updated_at && 
      (new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000);

    return (
      <div className={`mt-3 ${depth > 0 ? 'ml-4 sm:ml-12 border-white/5 pl-4' : ''}`}>
        <div className="group rounded-2xl border border-transparent hover:border-white/10 bg-transparent hover:bg-white/[0.02] p-3 -mx-3 transition-all duration-300 ease-out hover:-translate-y-[1px] relative">

          {depth > 0 && <CornerDownRight size={14} className="absolute -left-[19px] top-4 text-zinc-700 transition-colors duration-300 group-hover:text-zinc-500" />}

          <div className="flex items-start gap-3">
            <a 
              href={`/profile/${comment.user_id}`}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white overflow-hidden transition-transform duration-300 hover:scale-110 mt-1"
              style={{ background: avatarUrl ? 'transparent' : getAvatarColor(displayName) }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                displayName[0].toUpperCase()
              )}
            </a>

            <div className="flex-1 min-w-0">
              
              <div className="flex items-center gap-2 flex-wrap">
                <a 
                  href={`/profile/${comment.user_id}`}
                  className="text-[13px] font-bold text-white truncate transition-colors duration-200 hover:text-[var(--app-accent)]"
                >
                  {displayName}
                </a>

                <div className="flex gap-1.5 flex-wrap">
                  {renderBadges(comment.profiles, comment.likes_count)}
                </div>

                <span className="text-[10px] text-zinc-600 flex-shrink-0 transition-colors duration-200 group-hover:text-zinc-500 ml-0.5">
                  {timeAgo(comment.created_at)}
                </span>

                {isEdited && (
                  <span className="text-[10px] text-zinc-500/70 italic group-hover:text-zinc-400 transition-colors duration-200 ml-0.5">
                    (edited)
                  </span>
                )}

                {isOwn && !isEditing && (
                  <div className="ml-auto flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <button
                      onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400 hover:scale-110 active:scale-95 transition-all"
                      title="Edit Comment"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 hover:scale-110 active:scale-95 transition-all"
                      title="Delete Comment"
                    >
                      {deletingId === comment.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="mt-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  {renderInputBox(
                    `edit-input-${comment.id}`,
                    editContent,
                    setEditContent,
                    () => handleEditSubmit(comment.id),
                    submittingEdit === comment.id,
                    "Edit your comment...",
                    true,
                    () => { setEditingId(null); setEditContent(''); },
                    "Save",
                    true
                  )}
                </div>
              ) : (
                <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                  {renderFormattedText(comment.content)}
                </p>
              )}

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVote(comment.id, 1)}
                    className={`flex items-center gap-1.5 text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 active:scale-95 ${myVote === 1 ? 'text-[var(--app-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ThumbsUp size={13} className={myVote === 1 ? 'fill-[var(--app-accent)]' : ''} />
                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                  </button>
                  <button
                    onClick={() => handleVote(comment.id, -1)}
                    className={`flex items-center gap-1.5 text-[11px] font-medium ml-2 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 active:scale-95 ${myVote === -1 ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ThumbsDown size={13} className={myVote === -1 ? 'fill-red-400' : ''} />
                  </button>
                </div>

                {depth < 3 && !isEditing && (
                  <button
                    onClick={() => {
                      setReplyToId(replyToId === comment.id ? null : comment.id);
                      setReplyContent('');
                    }}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 hover:text-zinc-300"
                  >
                    <MessageSquare size={13} />
                    Reply
                  </button>
                )}
              </div>
            </div>
          </div>

          {replyToId === comment.id && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {user ? (
                renderInputBox(
                  `reply-input-${comment.id}`,
                  replyContent,
                  setReplyContent,
                  () => handleSubmit(comment.id, replyContent),
                  submittingReply === comment.id,
                  `Reply to ${displayName}...`
                )
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-zinc-400 transition-all duration-300 hover:bg-white/[0.07] hover:text-white hover:-translate-y-[1px]"
                >
                  Sign in to reply
                </button>
              )}
            </div>
          )}
        </div>

        {childReplies.length > 0 && (
          <div className="mt-1 flex flex-col">
            {!isExpanded ? (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-2 text-[11px] font-bold text-[var(--app-accent)] transition-all duration-200 hover:brightness-125 w-max pl-2 py-2"
              >
                <CornerDownRight size={13} />
                View {childReplies.length} {childReplies.length === 1 ? 'reply' : 'replies'}
              </button>
            ) : (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                <button
                  onClick={() => toggleReplies(comment.id)}
                  className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 transition-all duration-200 hover:text-zinc-300 w-max pl-2 py-2"
                >
                  Hide replies
                </button>
                {childReplies.map(reply => (
                  <React.Fragment key={reply.id}>
                    {renderCommentNode(reply, depth + 1)}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      <section className="mt-8 mb-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between mb-6 group transition-all duration-300 hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-regular uppercase tracking-[0.24em] text-[var(--app-accent)] transition-colors duration-300 hover:text-white">
              <MessageSquare size={14} className="text-[var(--app-accent)] transition-transform duration-300 group-hover:scale-110" />
              Comments
            </div>
          </div>
        </button>

        {expanded && (
          <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
            <div>
              {user ? (
                renderInputBox(
                  'main-comment-input',
                  newComment,
                  setNewComment,
                  () => handleSubmit(null, newComment),
                  submitting,
                  "Write a comment..."
                )
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-zinc-400 transition-all duration-300 hover:border-[var(--app-accent)]/40 hover:bg-white/[0.07] hover:text-white hover:-translate-y-[1px]"
                >
                  <LogIn size={16} className="text-[var(--app-accent)]" />
                  Sign in to comment
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="animate-spin text-[var(--app-accent)]" size={24} />
              </div>
            ) : comments.length === 0 ? (
              <div className="py-6 text-center transition-all duration-300 opacity-80 hover:opacity-100">
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

      {/* SLEEK & COOL CSS BADGE SYSTEM */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Base styles for a clean, app-like badge */
        .badge-base {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 2px 7px;
          border-radius: 5px;
          overflow: hidden;
          border: 1px solid transparent;
          backdrop-filter: blur(4px);
        }

        /* 1. FOUNDER (Dark Violet / Smooth Sheen) */
        .badge-founder {
          background: linear-gradient(135deg, rgba(88, 28, 135, 0.3), rgba(126, 34, 206, 0.15));
          border-color: rgba(168, 85, 247, 0.3);
          color: #d8b4fe;
        }
        .badge-founder::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
          transform: skewX(-20deg);
          animation: slowShine 5s infinite;
        }
        @keyframes slowShine {
          0%, 20% { left: -100%; }
          80%, 100% { left: 200%; }
        }

        /* 2. STAFF / MOD (Sleek Cyan) */
        .badge-staff {
          background: rgba(14, 165, 233, 0.12);
          border-color: rgba(14, 165, 233, 0.3);
          color: #7dd3fc;
        }

        /* 3. PREMIUM / VIP (Soft Gold) */
        .badge-premium {
          background: rgba(217, 119, 6, 0.12);
          border-color: rgba(245, 158, 11, 0.3);
          color: #fcd34d;
        }

        /* 4. VERIFIED (Clean Emerald) */
        .badge-verified {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        }

/* 5. DEVELOPER (Sleek Terminal) */
        .badge-dev {
          background: rgba(9, 9, 11, 0.8); /* Deep near-black zinc */
          border-color: rgba(56, 189, 248, 0.3); /* Electric Blue border */
          color: #7dd3fc; /* Crisp Light Blue text */
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          letter-spacing: 0.05em;
          box-shadow: inset 0 0 10px rgba(56, 189, 248, 0.1);
        }
        
        /* Blinking Terminal Cursor Effect */
        .badge-dev span::after {
          content: '_';
          margin-left: 2px;
          color: #38bdf8;
          animation: terminalBlink 1s step-start infinite;
        }
        
        @keyframes terminalBlink {
          50% { opacity: 0; }
        }

        /* 6. ON FIRE (Warm Breathing Glow) */
        .badge-fire {
          background: rgba(220, 38, 38, 0.12);
          border-color: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          animation: warmBreath 3s infinite alternate ease-in-out;
        }
        @keyframes warmBreath {
          0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
        }

        /* 7. TOP (Muted Yellow) */
        .badge-top {
          background: rgba(234, 179, 8, 0.1);
          border-color: rgba(234, 179, 8, 0.25);
          color: #fef08a;
        }

        /* 8. NEW (Subtle Teal) */
        .badge-new {
          background: rgba(20, 184, 166, 0.08);
          border-color: rgba(20, 184, 166, 0.25);
          color: #99f6e4;
        }
      `}</style>
    </>
  );
};

export default CommentSection;