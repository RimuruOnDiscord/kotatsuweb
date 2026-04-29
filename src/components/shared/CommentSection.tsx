
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  MessageSquare, Send, Trash2, Loader2, LogIn, Paperclip, 
  ThumbsUp, ThumbsDown, CornerDownRight, Bold, Italic, Strikethrough, Pencil, ChevronUp, ChevronDown, MessageSquareReply 
} from 'lucide-react';
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import AuthModal from './AuthModal';
import { motion, AnimatePresence } from 'framer-motion';

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
    role?: string | string[];
  };
}

interface CommentSectionProps {
  pageType: 'manga' | 'anime' | 'watch';
  pageId: string;
  onProfileClick?: (userId: string) => void; 
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
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 50%)`;
};

const renderFormattedText = (text: string) => {
  let escaped = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  escaped = escaped.replace(/\*(.*?)\*/g, '<em class="italic text-zinc-300">$1</em>');
  escaped = escaped.replace(/\~\~(.*?)\~\~/g, '<del class="line-through text-zinc-500">$1</del>');
  return <span dangerouslySetInnerHTML={{ __html: escaped }} />;
};

// ─── Discord-style Floating Mini Profile Popover ───────────────────────────
const MiniProfilePopover = ({ 
  userProfile, 
  userId, 
  likesCount, 
  rect, 
  onClose,
  onOpenFullProfile 
}: { 
  userProfile: any, 
  userId: string, 
  likesCount: number, 
  rect: DOMRect, 
  onClose: () => void,
  onOpenFullProfile: (userId: string) => void
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: rect.top, left: rect.right, opacity: 0 });

  useEffect(() => {
    if (popoverRef.current) {
      const popoverWidth = popoverRef.current.offsetWidth;
      const popoverHeight = popoverRef.current.offsetHeight;
      const margin = 12;
      
      let calculatedLeft = rect.right + margin;
      let calculatedTop = rect.top;

      if (calculatedLeft + popoverWidth > window.innerWidth - margin) {
        calculatedLeft = rect.left - popoverWidth - margin;
      }

      if (window.innerWidth < 640 || calculatedLeft < margin) {
        calculatedLeft = Math.max(margin, (window.innerWidth - popoverWidth) / 2);
        calculatedTop = rect.bottom + margin;
      }
      
      if (calculatedTop + popoverHeight > window.innerHeight - margin) {
        calculatedTop = window.innerHeight - popoverHeight - margin;
      }
      
      if (calculatedTop < margin) calculatedTop = margin;

      setPosition({ top: calculatedTop, left: calculatedLeft, opacity: 1 });
    }
  }, [rect]);

  const name = userProfile?.display_name || 'Anonymous';
  const avatar = userProfile?.avatar_url;
  const avatarColor = getAvatarColor(name);

  let roles: string[] = [];
  if (Array.isArray(userProfile?.role)) roles = userProfile.role.map((r: string) => r.toLowerCase());
  else if (typeof userProfile?.role === 'string') roles = userProfile.role.split(',').map((r: string) => r.trim().toLowerCase());

  let bannerGradient = `linear-gradient(135deg, ${avatarColor}, #111214)`;
  if (roles.includes('founder') || roles.includes('admin')) bannerGradient = 'linear-gradient(135deg, #a855f7, #581c87)';
  else if (roles.includes('developer') || roles.includes('dev')) bannerGradient = 'linear-gradient(135deg, #38bdf8, #0369a1)';
  else if (roles.includes('premium')) bannerGradient = 'linear-gradient(135deg, #f59e0b, #b45309)';

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenFullProfile(userId);
    onClose();
  };

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[9998]" 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
      />
      
      <motion.div 
        ref={popoverRef}
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: position.opacity }} 
        exit={{ scale: 0.95, opacity: 0 }} 
        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
        style={{ position: 'fixed', top: position.top, left: position.left, transformOrigin: 'top left' }}
        className="z-[9999] w-[320px] rounded-2xl bg-[var(--app-surface-1,#111214)] shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
      >
        <div className="h-20 w-full" style={{ background: bannerGradient }} />
        
        <div className="px-5 pb-5">
          <div className="relative -mt-8 flex justify-between items-end mb-3">
            
            {/* Animated Profile Picture Container */}
            <div 
              onClick={handleProfileClick}
              className="group relative h-[76px] w-[76px] rounded-full border-[5px] border-[var(--app-surface-1,#111214)] bg-zinc-800 flex items-center justify-center shadow-lg cursor-pointer"
            >
              {/* Outer Theme Accent Ring on Hover */}
              <div className="absolute -inset-[3px] rounded-full border-[2px] border-[var(--app-accent)] opacity-0 scale-90 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
              
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <span className="text-xl font-bold" style={{ color: avatarColor }}>{name[0].toUpperCase()}</span>
                )}
                
                {/* Clean Dark Overlay on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            </div>
            
            <button 
              onClick={handleProfileClick}
              className="mb-1 px-4 py-[7px] rounded-[10px] text-[12px] font-bold text-white bg-white/[0.05] border border-white/[0.05] shadow-sm hover:bg-white/[0.1] hover:border-[var(--app-accent)] hover:shadow-md transition-all duration-200 hover:-translate-y-[1px] active:translate-y-[1px]"
            >
              View Profile
            </button>
            
          </div>

          <div className="mb-4 px-1">
            <h3 className="text-[18px] font-bold text-white leading-none tracking-tight">{name}</h3>
            {roles.length > 0 && <p className="text-[12px] text-zinc-400 mt-1 capitalize font-medium">{roles.join(', ')}</p>}
          </div>

          <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.05]">
            <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2.5 ml-0.5">User Badges</h4>
            <div className="flex flex-wrap gap-2">
              {roles.some(r => ['founder', 'admin'].includes(r)) && <div className="badge-base badge-founder">Founder</div>}
              {roles.some(r => ['developer', 'dev'].includes(r)) && <div className="badge-base badge-dev"><span>Dev</span></div>}
              {roles.some(r => ['mod', 'staff'].includes(r)) && <div className="badge-base badge-staff">Staff</div>}
              {roles.some(r => ['verified'].includes(r)) && <div className="badge-base badge-verified">Verified</div>}
              {roles.some(r => ['premium', 'vip'].includes(r)) && <div className="badge-base badge-premium">Premium</div>}
              {likesCount >= 50 && <div className="badge-base badge-fire">On Fire</div>}
              {likesCount >= 10 && likesCount < 50 && <div className="badge-base badge-top">Top</div>}
            </div>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};


// ─── Main Component ────────────────────────────────────────────────────────
const CommentSection: React.FC<CommentSectionProps> = ({ pageType, pageId, onProfileClick }) => {
  const { user, profile, session } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState<string | null>(null);

  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const [activePopover, setActivePopover] = useState<{ profile: any, id: string, likes: number, rect: DOMRect } | null>(null);

  const tokenRef = useRef(session?.access_token || supabaseAnonKey);
  useEffect(() => { tokenRef.current = session?.access_token || supabaseAnonKey; }, [session?.access_token]);

  const fetchCommentsAndVotes = useCallback(async () => {
    if (!pageId) { setLoading(false); return; }
    setLoading(true);
    try {
      const queryParams = `page_type=eq.${encodeURIComponent(pageType)}&page_id=eq.${encodeURIComponent(pageId)}&order=created_at.desc`;
      let selectQuery = `id,user_id,content,created_at,updated_at,parent_id,likes_count,dislikes_count,profiles(display_name,avatar_url,created_at,role)`;
      let response = await fetch(`${supabaseUrl}/rest/v1/comments?${queryParams}&select=${selectQuery}`, {
        method: 'GET', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
      });

      if (!response.ok) {
        selectQuery = `id,user_id,content,created_at,updated_at,parent_id,likes_count,dislikes_count,profiles(display_name,avatar_url)`;
        response = await fetch(`${supabaseUrl}/rest/v1/comments?${queryParams}&select=${selectQuery}`, {
          method: 'GET', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
        });
      }

      if (response.ok) setComments(await response.json());

      if (user?.id) {
        const votesResponse = await fetch(`${supabaseUrl}/rest/v1/comment_votes?user_id=eq.${user.id}&select=comment_id,vote_type`, {
          method: 'GET', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${tokenRef.current}` }
        });
        if (votesResponse.ok) {
          const votesMap: Record<string, number> = {};
          (await votesResponse.json()).forEach((v: any) => votesMap[v.comment_id] = v.vote_type);
          setUserVotes(votesMap);
        }
      } else setUserVotes({});
    } catch (err) { console.error('Fetch comments native error:', err); } finally { setLoading(false); }
  }, [pageType, pageId, user?.id]);

  useEffect(() => { fetchCommentsAndVotes(); }, [fetchCommentsAndVotes]);

  const handleSubmit = async (parentId: string | null = null, content: string) => {
    if (!user) return setShowAuth(true);
    if (!content.trim()) return;
    parentId ? setSubmittingReply(parentId) : setSubmitting(true);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/comments`, {
        method: 'POST',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ user_id: user.id, page_type: pageType, page_id: pageId, content: content.trim(), parent_id: parentId })
      });
      if (!response.ok) throw new Error(await response.text());
      if (parentId) { setReplyToId(null); setReplyContent(''); setExpandedReplies(prev => new Set(prev).add(parentId)); } 
      else setNewComment('');
      await fetchCommentsAndVotes();
    } catch (err: any) { alert('Failed to post comment.'); } finally { setSubmitting(false); setSubmittingReply(null); }
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim()) return;
    setSubmittingEdit(commentId);
    try {
      const now = new Date().toISOString();
      const response = await fetch(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, {
        method: 'PATCH',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ content: editContent.trim(), updated_at: now })
      });
      if (!response.ok) throw new Error();
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editContent.trim(), updated_at: now } : c));
      setEditingId(null); setEditContent('');
    } catch { alert('Failed to edit comment.'); } finally { setSubmittingEdit(null); }
  };

  const handleVote = async (commentId: string, type: 1 | -1) => {
    if (!user) return setShowAuth(true);
    const currentVote = userVotes[commentId];
    const isRemoving = currentVote === type;
    const token = session?.access_token || supabaseAnonKey;

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        let newLikes = c.likes_count || 0;
        let newDislikes = c.dislikes_count || 0;
        if (isRemoving) { type === 1 ? newLikes-- : newDislikes--; } 
        else { type === 1 ? newLikes++ : newDislikes++; if (currentVote === 1) newLikes--; else if (currentVote === -1) newDislikes--; }
        return { ...c, likes_count: Math.max(0, newLikes), dislikes_count: Math.max(0, newDislikes) };
      }
      return c;
    }));

    setUserVotes(prev => { const next = { ...prev }; isRemoving ? delete next[commentId] : next[commentId] = type; return next; });

    try {
      if (isRemoving) {
        await fetch(`${supabaseUrl}/rest/v1/comment_votes?user_id=eq.${user.id}&comment_id=eq.${commentId}`, { method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/comment_votes?on_conflict=user_id,comment_id`, {
          method: 'POST', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_id: user.id, comment_id: commentId, vote_type: type })
        });
      }
    } catch { fetchCommentsAndVotes(); }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await fetch(`${supabaseUrl}/rest/v1/comments?id=eq.${commentId}`, { method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}` } });
      fetchCommentsAndVotes();
    } catch {} finally { setDeletingId(null); }
  };

  const toggleReplies = (commentId: string) => setExpandedReplies(prev => { const n = new Set(prev); n.has(commentId) ? n.delete(commentId) : n.add(commentId); return n; });

  const insertFormatting = (inputId: string, format: 'bold' | 'italic' | 'strike', value: string, onChange: (v: string) => void) => {
    const el = document.getElementById(inputId) as HTMLTextAreaElement;
    if (el) {
      const start = el.selectionStart, end = el.selectionEnd, selected = value.substring(start, end);
      let wrapped = format === 'bold' ? `**${selected || 'bold'}**` : format === 'italic' ? `*${selected || 'italic'}*` : `~~${selected || 'strike'}~~`;
      onChange(value.substring(0, start) + wrapped + value.substring(end));
      setTimeout(() => { el.focus(); el.setSelectionRange(start + wrapped.length, start + wrapped.length); }, 0);
    }
  };

  const renderBadges = (commentProfile: any, likes: number) => {
    const badges = [];
    let roles: string[] = [];
    if (Array.isArray(commentProfile?.role)) roles = commentProfile.role.map((r: string) => r.toLowerCase());
    else if (typeof commentProfile?.role === 'string') roles = commentProfile.role.split(',').map((r: string) => r.trim().toLowerCase());

    if (roles.some(r => ['founder', 'admin'].includes(r))) badges.push({ text: 'Founder', cssClass: 'badge-founder' });
    if (roles.some(r => ['mod', 'moderator', 'staff'].includes(r))) badges.push({ text: 'Staff', cssClass: 'badge-staff' });
    if (roles.some(r => ['vip', 'premium', 'donator'].includes(r))) badges.push({ text: 'Premium', cssClass: 'badge-premium' });
    if (roles.some(r => ['verified', 'trusted'].includes(r))) badges.push({ text: 'Verified', cssClass: 'badge-verified' });
    if (roles.some(r => ['developer', 'dev'].includes(r))) badges.push({ text: 'Dev', cssClass: 'badge-dev' });
    if (likes >= 50) badges.push({ text: 'On Fire', cssClass: 'badge-fire' });
    else if (likes >= 10) badges.push({ text: 'Top', cssClass: 'badge-top' });

    if (commentProfile?.created_at && ((Date.now() - new Date(commentProfile.created_at).getTime()) / 86400000) <= 14 && !roles.some(r => ['founder', 'admin', 'mod', 'staff'].includes(r))) {
      badges.push({ text: 'New', cssClass: 'badge-new' });
    }

    return badges.map((b, i) => (
      <div key={i} className={`badge-base ${b.cssClass}`}>
        {b.cssClass === 'badge-dev' ? <span>Dev</span> : b.text}
      </div>
    ));
  };

  const handleOpenFullProfile = (uid: string) => {
    if (typeof onProfileClick === 'function') {
      onProfileClick(uid);
    } else {
      window.dispatchEvent(new CustomEvent('open-profile-modal', { detail: uid }));
      window.dispatchEvent(new CustomEvent('openProfile', { detail: { userId: uid } }));
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const repliesMap = new Map<string, Comment[]>();
  comments.forEach(c => { if (c.parent_id) { if (!repliesMap.has(c.parent_id)) repliesMap.set(c.parent_id, []); repliesMap.get(c.parent_id)!.push(c); } });

  const renderInputBox = (inputId: string, value: string, onChange: (v: string) => void, onSubmit: () => void, isSubmitting: boolean, placeholder: string, autoFocus?: boolean, onCancel?: () => void, submitText: string = "Post", hideAvatar: boolean = false) => {
    return (
      <div className="flex flex-col sm:flex-row gap-3 w-full group/input">
        {!hideAvatar && (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white hidden sm:flex overflow-hidden transition-transform duration-150 group-focus-within/input:scale-105" style={{ background: profile?.avatar_url ? 'transparent' : getAvatarColor(profile?.display_name || 'U') }}>
            {profile?.avatar_url ? <img src={profile.avatar_url} className="h-full w-full object-cover" /> : (profile?.display_name || 'U')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] rounded-2xl overflow-hidden focus-within:!border-[var(--app-accent)] focus-within:!bg-white/[0.05] transition-all duration-150 ease-out">
          <textarea id={inputId} autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }} placeholder={placeholder} maxLength={2000} rows={2} className="w-full resize-none bg-transparent px-4 py-3 text-[14px] text-white outline-none placeholder:text-zinc-600" />
          <div className="flex items-center justify-between px-4 py-2 mt-1 border-t border-white/[0.05]">
            <div className="flex gap-1 sm:gap-2 items-center">
              <button className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-150"><Paperclip size={14} /></button>
              <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block"></div>
              <button onClick={() => insertFormatting(inputId, 'bold', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-150"><Bold size={14} /></button>
              <button onClick={() => insertFormatting(inputId, 'italic', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-150"><Italic size={14} /></button>
              <button onClick={() => insertFormatting(inputId, 'strike', value, onChange)} className="flex items-center justify-center h-8 w-8 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-150"><Strikethrough size={14} /></button>
              <span className="text-[10px] font-medium text-zinc-600 hidden sm:block ml-2">{value.length}/2000</span>
            </div>
            <div className="flex items-center gap-2">
              {onCancel && <button onClick={onCancel} disabled={isSubmitting} className="rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-150 disabled:opacity-50">Cancel</button>}
              <button onClick={onSubmit} disabled={!value.trim() || isSubmitting} className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-6 py-2 text-[11px] font-black uppercase tracking-widest text-black transition-all duration-150 hover:scale-[1.05] active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none" style={{ backgroundColor: 'var(--app-accent)' }}>
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} className="transition-transform duration-150 ease-out" />}
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
    const isEdited = comment.updated_at && (new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000);

    return (
      <div className={`mt-3 ${depth > 0 ? 'ml-4 sm:ml-12 border-white/5 pl-4' : ''}`}>
        <div className="group rounded-2xl border border-transparent hover:border-white/10 bg-transparent hover:bg-white/[0.02] p-3 -mx-3 transition-all duration-150 ease-out hover:-translate-y-[1px] relative">
          {depth > 0 && <CornerDownRight size={14} className="absolute -left-[19px] top-4 text-zinc-700 transition-colors duration-150 group-hover:text-zinc-500" />}
          
          <div className="flex items-start gap-3">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setActivePopover({ profile: comment.profiles, id: comment.user_id, likes: comment.likes_count, rect });
              }}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white overflow-hidden transition-transform duration-150 hover:scale-110 mt-1 cursor-pointer ring-2 ring-transparent hover:ring-[var(--app-accent)]"
              style={{ background: avatarUrl ? 'transparent' : getAvatarColor(displayName) }}
            >
              {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : displayName[0].toUpperCase()}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActivePopover({ profile: comment.profiles, id: comment.user_id, likes: comment.likes_count, rect });
                  }}
                  className="text-[13px] font-bold text-white truncate transition-colors duration-150 hover:text-[var(--app-accent)] cursor-pointer"
                >
                  {displayName}
                </button>

                <div className="flex gap-1.5 flex-wrap">
                  {renderBadges(comment.profiles, comment.likes_count)}
                </div>

                <span className="text-[10px] text-zinc-600 flex-shrink-0 transition-colors duration-150 group-hover:text-zinc-500 ml-0.5">{timeAgo(comment.created_at)}</span>
                {isEdited && <span className="text-[10px] text-zinc-500/70 italic group-hover:text-zinc-400 transition-colors duration-150 ml-0.5">(edited)</span>}

                {isOwn && !isEditing && (
                  <div className="ml-auto flex items-center gap-1 opacity-0 transition-all duration-150 group-hover:opacity-100">
                    <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-blue-500/10 hover:text-blue-400 hover:scale-110 active:scale-95 transition-all"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(comment.id)} disabled={deletingId === comment.id} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 hover:scale-110 active:scale-95 transition-all">
                      {deletingId === comment.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="mt-3 mb-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  {renderInputBox(`edit-input-${comment.id}`, editContent, setEditContent, () => handleEditSubmit(comment.id), submittingEdit === comment.id, "Edit your comment...", true, () => { setEditingId(null); setEditContent(''); }, "Save", true)}
                </div>
              ) : <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">{renderFormattedText(comment.content)}</p>}

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => handleVote(comment.id, 1)} className={`flex items-center gap-1.5 text-[11px] font-medium transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 active:scale-95 ${myVote === 1 ? 'text-[var(--app-accent)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <ThumbsUp size={13} className={myVote === 1 ? 'fill-[var(--app-accent)]' : ''} />
                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                  </button>
                  <button onClick={() => handleVote(comment.id, -1)} className={`flex items-center gap-1.5 text-[11px] font-medium ml-2 transition-all duration-150 hover:-translate-y-0.5 hover:scale-110 active:scale-95 ${myVote === -1 ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    <ThumbsDown size={13} className={myVote === -1 ? 'fill-red-400' : ''} />
                  </button>
                </div>
                {depth < 3 && !isEditing && (
                  <button onClick={() => { setReplyToId(replyToId === comment.id ? null : comment.id); setReplyContent(''); }} className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-all duration-150 hover:-translate-y-0.5 hover:scale-105 active:scale-95 hover:text-zinc-300">
                    <MessageSquare size={13} /> Reply
                  </button>
                )}
              </div>
            </div>
          </div>

          {replyToId === comment.id && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-150">
              {user ? renderInputBox(`reply-input-${comment.id}`, replyContent, setReplyContent, () => handleSubmit(comment.id, replyContent), submittingReply === comment.id, `Reply to ${displayName}...`) : (
                <button onClick={() => setShowAuth(true)} className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold text-zinc-400 transition-all duration-150 hover:bg-white/[0.07] hover:text-white hover:-translate-y-[1px]">Sign in to reply</button>
              )}
            </div>
          )}
        </div>

        {childReplies.length > 0 && (
          <div className="mt-1 flex flex-col">
            {!isExpanded ? (
              <button onClick={() => toggleReplies(comment.id)} className="group flex items-center gap-1.5 text-[11px] font-bold text-[var(--app-accent)] transition-all duration-150 hover:brightness-125 w-max ml-[44px] py-1.5">
                <ChevronDown size={14} className="transition-transform duration-150 ease-out group-hover:translate-y-[2px]" />
                <span className="relative">View {childReplies.length} {childReplies.length === 1 ? 'reply' : 'replies'}<span className="absolute -bottom-0.5 left-0 h-[1px] w-0 bg-[var(--app-accent)] transition-all duration-150 ease-out group-hover:w-full opacity-70"></span></span>
              </button>
            ) : (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                <button onClick={() => toggleReplies(comment.id)} className="group flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 transition-all duration-150 hover:text-zinc-300 w-max ml-[44px] py-1.5 mb-1">
                  <ChevronUp size={14} className="transition-transform duration-150 ease-out group-hover:-translate-y-[2px]" />
                  <span className="relative">Hide replies<span className="absolute -bottom-0.5 left-0 h-[1px] w-0 bg-zinc-400 transition-all duration-150 ease-out group-hover:w-full opacity-70"></span></span>
                </button>
                {childReplies.map(reply => <React.Fragment key={reply.id}>{renderCommentNode(reply, depth + 1)}</React.Fragment>)}
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
      
      <AnimatePresence>
        {activePopover && (
          <MiniProfilePopover 
            userProfile={activePopover.profile} 
            userId={activePopover.id} 
            likesCount={activePopover.likes}
            rect={activePopover.rect}
            onClose={() => setActivePopover(null)} 
            onOpenFullProfile={handleOpenFullProfile}
          />
        )}
      </AnimatePresence>

      <section className="mt-8 mb-6">
        <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between mb-6 group transition-all duration-150 hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[10px] font-regular uppercase tracking-[0.24em] text-[var(--app-accent)] transition-colors duration-150 hover:text-white">
              <MessageSquare size={14} className="text-[var(--app-accent)] transition-transform duration-150 group-hover:scale-110" />
              Comments
            </div>
          </div>
        </button>

        {expanded && (
          <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
            <div>
              {user ? renderInputBox('main-comment-input', newComment, setNewComment, () => handleSubmit(null, newComment), submitting, "Write a comment...") : (
                <button onClick={() => setShowAuth(true)} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-zinc-400 transition-all duration-150 hover:border-[var(--app-accent)]/40 hover:bg-white/[0.07] hover:text-white hover:-translate-y-[1px]">
                  <LogIn size={16} className="text-[var(--app-accent)]" /> Sign in to comment
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-[var(--app-accent)]" size={24} /></div>
            ) : comments.length === 0 ? (
              <div className="py-6 text-center transition-all duration-150 opacity-80 hover:opacity-100">
                <MessageSquare size={24} className="mx-auto mb-3 text-zinc-700/50" />
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">No comments yet</div>
              </div>
            ) : (
              <div className="pt-2">{rootComments.map((comment) => <React.Fragment key={comment.id}>{renderCommentNode(comment)}</React.Fragment>)}</div>
            )}
          </div>
        )}
      </section>

      {/* SLEEK & COOL CSS BADGE SYSTEM */}
      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .badge-base {
          position: relative; display: inline-flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
          padding: 2px 7px; border-radius: 5px; overflow: hidden; border: 1px solid transparent;
        }

        .badge-founder { background: linear-gradient(135deg, rgba(88, 28, 135, 0.3), rgba(126, 34, 206, 0.15)); border-color: rgba(168, 85, 247, 0.3); color: #d8b4fe; }
        .badge-founder::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent); transform: skewX(-20deg); animation: slowShine 5s infinite; }
        @keyframes slowShine { 0%, 20% { left: -100%; } 80%, 100% { left: 200%; } }

        .badge-staff { background: rgba(14, 165, 233, 0.12); border-color: rgba(14, 165, 233, 0.3); color: #7dd3fc; }
        .badge-premium { background: rgba(217, 119, 6, 0.12); border-color: rgba(245, 158, 11, 0.3); color: #fcd34d; }
        .badge-verified { background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3); color: #6ee7b7; }

        .badge-dev { background: rgba(9, 9, 11, 0.8); border-color: rgba(56, 189, 248, 0.3); color: #7dd3fc; font-family: ui-monospace, monospace; letter-spacing: 0.05em; }
        .badge-dev span::after { content: '_'; margin-left: 2px; color: #38bdf8; animation: terminalBlink 1s step-start infinite; }
        @keyframes terminalBlink { 50% { opacity: 0; } }

        .badge-fire { background: rgba(220, 38, 38, 0.12); border-color: rgba(239, 68, 68, 0.25); color: #fca5a5; animation: warmBreath 3s infinite alternate ease-in-out; }
        @keyframes warmBreath { 0% { box-shadow: 0 0 0px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); } }

        .badge-top { background: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.25); color: #fef08a; }
        .badge-new { background: rgba(20, 184, 166, 0.08); border-color: rgba(20, 184, 166, 0.25); color: #99f6e4; }
      `}</style>
    </>
  );
};

export default CommentSection;