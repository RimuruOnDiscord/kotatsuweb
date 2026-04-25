
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Bookmark, MessageSquare, CornerUpLeft, Calendar, Activity, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const APP_FONT = '"Onest", ui-sans-serif, system-ui, -apple-system, sans-serif';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type TabKey = 'overview' | 'bookmarks' | 'comments' | 'replies';

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Reset tab when opened
  useEffect(() => {
    if (open) setActiveTab('overview');
  }, [open]);

  // Handle Escape key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Tab Icon Helper
  const getTabIcon = (tab: TabKey, isActive: boolean) => {
    const props = {
      size: 14,
      strokeWidth: isActive ? 2 : 1.5,
      style: { color: isActive ? 'var(--app-accent)' : undefined }
    };
    switch (tab) {
      case 'overview': return <User {...props} />;
      case 'bookmarks': return <Bookmark {...props} />;
      case 'comments': return <MessageSquare {...props} />;
      case 'replies': return <CornerUpLeft {...props} />;
    }
  };

  const displayName = profile?.display_name || 'Guest User';
  const avatarUrl = profile?.avatar_url;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
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
              {/* Header Profile Section */}
              <div
                className="flex flex-col px-7 pt-7 pb-0 flex-shrink-0"
                style={{
                  background: 'linear-gradient(160deg, var(--app-accent-muted) 0%, var(--app-bg-2, #0f1014) 100%)',
                  borderBottom: '1px solid var(--app-accent-soft)',
                }}
              >
                <div className="flex justify-between items-start mb-7 relative">
                  <div className="flex items-center gap-5">
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shadow-lg"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '2px solid var(--app-accent)' }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-zinc-500" strokeWidth={1.5} />
                      )}
                    </div>

                    {/* User Info */}
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

                  {/* Close Button */}
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

                {/* Navigation Tabs */}
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

              {/* Content Area */}
              <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--app-bg, #0a0b0e)' }}>
                <div className="p-7 w-full max-w-[600px] mx-auto min-h-full flex flex-col gap-6">

                  {/* ── OVERVIEW TAB ── */}
                  {activeTab === 'overview' && (
                    <motion.div
                      key="overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-8"
                    >
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <Calendar size={12} style={{ color: 'var(--app-accent)' }} /> Joined
                          </span>
                          <span className="text-lg font-bold text-white mt-1">MM/YY</span>
                        </div>
                        <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <Bookmark size={12} style={{ color: 'var(--app-accent)' }} /> Bookmarks
                          </span>
                          <span className="text-lg font-bold text-white mt-1">N/A</span>
                        </div>
                        <div className="p-4 rounded-[16px] flex flex-col gap-1 transition-colors border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                            <MessageSquare size={12} style={{ color: 'var(--app-accent)' }} /> Comments
                          </span>
                          <span className="text-lg font-bold text-white mt-1">N/A</span>
                        </div>
                      </div>

                      {/* Recent Activity Section */}
                      <div>
                        <h3 className="text-[14px] font-bold uppercase tracking-wider text-white mb-4" style={{ fontFamily: '"Syne", sans-serif' }}>
                          Recent Activity
                        </h3>
                        <div className="flex flex-col items-center justify-center p-10 rounded-[16px] border border-white/[0.04] bg-white/[0.01]">
                          <Activity size={24} className="text-zinc-600 mb-3" />
                          <p className="text-[13px] text-zinc-400 font-medium">No recent activity to show.</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── BOOKMARKS TAB ── */}
                  {activeTab === 'bookmarks' && (
                    <motion.div
                      key="bookmarks"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                        <Bookmark size={24} className="text-zinc-500" />
                      </div>
                      <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Bookmarks</h3>
                      <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                        Manga and anime you bookmark will appear here for quick access.
                      </p>
                    </motion.div>
                  )}

                  {/* ── COMMENTS TAB ── */}
                  {activeTab === 'comments' && (
                    <motion.div
                      key="comments"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                        <MessageSquare size={24} className="text-zinc-500" />
                      </div>
                      <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Comments</h3>
                      <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                        You haven't left any comments on chapters or episodes yet.
                      </p>
                    </motion.div>
                  )}

                  {/* ── REPLIES TAB ── */}
                  {activeTab === 'replies' && (
                    <motion.div
                      key="replies"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-5">
                        <CornerUpLeft size={24} className="text-zinc-500" />
                      </div>
                      <h3 className="text-[18px] font-bold text-white" style={{ fontFamily: '"Syne", sans-serif' }}>No Replies</h3>
                      <p className="text-[13px] text-zinc-500 mt-2 max-w-[250px]">
                        When others reply to your comments, they'll show up here.
                      </p>
                    </motion.div>
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