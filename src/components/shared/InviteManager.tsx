import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, KeyRound, Loader2, Plus, RotateCw, ShieldCheck, UserPlus, Trash2, UserRound, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import ProfileModal from './ProfileModal';

type InviteRow = {
  id: string;
  label: string | null;
  created_at: string;
  used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_by_name: string | null;
  used_by: string | null;
  used_by_name: string | null;
  used_by_avatar_url: string | null;
  code: string | null;
  can_manage: boolean;
};

type InvitePermissions = {
  is_staff: boolean;
  account_is_old_enough: boolean;
  monthly_invites_used: number;
  monthly_invites_limit: number;
  monthly_invites_remaining: number;
  next_invite_at: string | null;
  can_create: boolean;
  reason: string | null;
};

const fallbackPermissions: InvitePermissions = {
  is_staff: false,
  account_is_old_enough: false,
  monthly_invites_used: 0,
  monthly_invites_limit: 1,
  monthly_invites_remaining: 0,
  next_invite_at: null,
  can_create: false,
  reason: null,
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Unused';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const isExpired = (value?: string | null) => Boolean(value && new Date(value).getTime() <= Date.now());

const listItemMotion = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, height: 0, transition: { duration: 0.15 } },
};

const InviteAvatar: React.FC<{ src?: string | null; name?: string | null }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  const canRenderImage = Boolean(src && !failed);

  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.07] text-zinc-400">
      {canRenderImage ? (
        <img
          src={src || ''}
          alt={name ? `${name} avatar` : ''}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <UserRound size={14} strokeWidth={2.2} />
      )}
    </div>
  );
};

// 1. Added props interface to accept an onClose callback
interface InviteManagerProps {
  onClose?: () => void;
  onOpenProfile?: (userId: string) => void;
}

// 2. Pass the prop into the component
const InviteManager: React.FC<InviteManagerProps> = ({ onClose, onOpenProfile }) => {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [permissions, setPermissions] = useState<InvitePermissions>(fallbackPermissions);
  const [label, setLabel] = useState('');
  const [newCode, setNewCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionInviteId, setActionInviteId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canManage = permissions.is_staff || invites.some((invite) => invite.can_manage);

  const allowanceText = useMemo(() => {
    if (permissions.is_staff) return 'Staff accounts can generate invites without the monthly member cap.';
    if (permissions.can_create) return 'You have 1 invite available this month.';
    if (permissions.next_invite_at) return `Next invite available ${formatDate(permissions.next_invite_at)}.`;
    return permissions.reason || 'Members receive 1 invite per month once their account is older than one month.';
  }, [permissions]);

  const allowanceBadge = permissions.is_staff
    ? 'Unlimited staff invites'
    : `${permissions.monthly_invites_remaining} of ${permissions.monthly_invites_limit} left`;

  const loadInviteData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [inviteResult, permissionResult] = await Promise.all([
      supabase.rpc('list_invite_codes'),
      supabase.rpc('get_invite_permissions'),
    ]);

    if (inviteResult.error) {
      setError(inviteResult.error.message);
    } else {
      setInvites((inviteResult.data || []) as InviteRow[]);
    }

    if (permissionResult.error) {
      setError((current) => current || permissionResult.error.message);
    } else {
      const nextPermissions = Array.isArray(permissionResult.data) ? permissionResult.data[0] : permissionResult.data;
      setPermissions({ ...fallbackPermissions, ...(nextPermissions || {}) });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadInviteData();
  }, [loadInviteData]);

  const createInvite = async () => {
    if (creating || !permissions.can_create) return;

    setCreating(true);
    setError(null);
    setCopied(false);

    const { data, error } = await supabase.rpc('create_invite_code', {
      p_label: label.trim() || null,
    });

    if (error) {
      setError(error.message);
    } else {
      const invite = Array.isArray(data) ? data[0] : data;
      setNewCode(invite?.code ?? null);
      setLabel('');
      await loadInviteData();
    }

    setCreating(false);
  };

  const removeInvite = async (inviteId: string) => {
    if (!window.confirm('Remove this unused invite code? This cannot be undone.')) return;

    setActionInviteId(inviteId);
    setError(null);
    const { error } = await supabase.rpc('delete_invite_code', { p_invite_id: inviteId });
    if (error) setError(error.message);
    await loadInviteData();
    setActionInviteId(null);
  };

  const copyCode = async () => {
    if (!newCode) return;
    await navigator.clipboard.writeText(newCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const copyInviteFromCard = async (invite: InviteRow) => {
    if (!invite.code) {
      setError('This invite was created before encrypted code storage was enabled. Generate a new invite to copy it.');
      return;
    }

    await navigator.clipboard.writeText(invite.code);
    setCopiedInviteId(invite.id);
    window.setTimeout(() => setCopiedInviteId(null), 1800);
  };

  return (
    <motion.div
      key="invites"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex flex-col gap-6"
    >
      {/* Top Generator Section */}
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--app-accent-muted)] text-[var(--app-accent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[14px] font-bold text-white tracking-wide">Generate a one-time invite</p>
              <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--app-accent-soft)] bg-[var(--app-accent-muted)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-accent)]">
                <UserPlus size={13} />
                {allowanceBadge}
              </div>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-zinc-400">
              Codes use 256 bits of randomness and only a SHA-256 hash is stored. {allowanceText}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 group">
            <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-[var(--app-accent)]" />
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Label, e.g. Alice"
              className="h-11 w-full rounded-[12px] border border-white/[0.08] bg-black/30 pl-10 pr-3 text-[13px] text-white outline-none transition-all focus:border-[var(--app-accent)] focus:ring-4 focus:ring-[var(--app-accent)]/10 disabled:opacity-50"
              disabled={!permissions.can_create || creating}
            />
          </div>
          <button
            onClick={createInvite}
            disabled={creating || !permissions.can_create}
            className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-[var(--app-accent)] px-6 text-[13px] font-bold text-black transition-all duration-150 hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="absolute inset-0 translate-y-full bg-white/25 transition-transform duration-300 group-hover:translate-y-0" />
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span className="relative z-10">Generate</span>
          </button>
        </div>

        {!permissions.can_create && permissions.reason && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="mt-4 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[12.5px] text-zinc-300"
          >
            {permissions.reason}
          </motion.div>
        )}

        <AnimatePresence>
          {newCode && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <code className="min-w-0 break-all text-[13px] font-semibold tracking-wide text-emerald-300">{newCode}</code>
                  <button
                    onClick={copyCode}
                    className="flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-emerald-500/30 bg-emerald-500/20 px-4 text-[12px] font-bold text-emerald-100 transition-all duration-150 hover:bg-emerald-500/30 active:scale-[0.96]"
                  >
                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] font-medium text-red-300">
                <X size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Section */}
      <div className="rounded-[16px] border border-white/[0.06] bg-white/[0.02] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.01] px-5 py-4">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-zinc-400">{canManage ? 'Invite history' : 'Your invites'}</p>
            <p className="mt-1 text-[12px] text-zinc-500">
              {canManage ? 'Staff can remove unused invites.' : `${permissions.monthly_invites_remaining} invite available this month.`}
            </p>
          </div>
          <button
            onClick={loadInviteData}
            className="flex h-8 items-center gap-2 rounded-[8px] border border-white/[0.08] bg-white/[0.04] px-3.5 text-[12px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-95"
          >
            <RotateCw size={14} className={loading ? 'animate-spin text-zinc-500' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center text-zinc-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : invites.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 py-10 text-center text-[13px] text-zinc-500">
            No invite codes generated yet.
          </motion.div>
        ) : (
          <div className="flex flex-col">
            <AnimatePresence mode="popLayout">
              {invites.map((invite) => {
                const used = Boolean(invite.used_at);
                const expired = isExpired(invite.expires_at);
                const revoked = Boolean(invite.revoked_at);
                const status = revoked ? 'Revoked' : used ? 'Used' : expired ? 'Expired' : 'Unused';
                const actionLoading = actionInviteId === invite.id;

                const statusClass = used
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : expired || revoked
                  ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                  : 'border-white/[0.08] bg-white/[0.04] text-zinc-300';

                return (
                  <motion.div
                    layout
                    key={invite.id}
                    variants={listItemMotion}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="group flex flex-col gap-4 border-b border-white/[0.05] px-5 py-4 last:border-0 hover:bg-white/[0.015] transition-colors duration-150"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-white tracking-wide">{invite.label || 'Unlabeled invite'}</p>
                        <p className="mt-1 text-[12px] text-zinc-500">
                          Created {formatDate(invite.created_at)}
                          {invite.created_by_name ? <span className="text-zinc-400"> by {invite.created_by_name}</span> : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <span className={`inline-flex h-6 items-center justify-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[0.05em] ${statusClass}`}>
                          {status}
                        </span>
                        <span className="text-[12px] font-medium text-zinc-500">
                          {used ? formatDate(invite.used_at) : expired ? `Expired ${formatDate(invite.expires_at)}` : 'Not redeemed'}
                        </span>
                      </div>
                    </div>

                    {used && invite.used_by ? (
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
<button
  type="button"
  onClick={() => {
    // 1. Trigger the global event that ProfileModal is ALREADY listening for!
    window.dispatchEvent(new CustomEvent('openProfile', { detail: invite.used_by }));
    
    // 2. Close the settings modal
    if (onClose) onClose();
  }}
  className="flex min-w-0 items-center gap-2.5 rounded-[10px] border border-white/[0.08] bg-white/[0.03] p-1.5 pr-4 text-[13px] font-semibold text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-150 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
>
  <InviteAvatar src={invite.used_by_avatar_url} name={invite.used_by_name} />
  <span className="truncate">Used by {invite.used_by_name || 'Unknown user'}</span>
</button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="max-w-[280px] text-[12px] leading-5 text-zinc-500">Unused invites can be copied or removed by staff.</span>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <button
                            onClick={() => copyInviteFromCard(invite)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-all duration-150 hover:bg-emerald-500/20 active:scale-90"
                            title={invite.code ? 'Copy invite code' : 'This older invite cannot be copied.'}
                          >
                            {copiedInviteId === invite.id ? <Check size={14} className="text-emerald-300" /> : <Clipboard size={14} />}
                          </button>

                          {canManage && (
                            <button
                              onClick={() => removeInvite(invite.id)}
                              disabled={actionLoading}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all duration-150 hover:bg-rose-500/20 active:scale-90 disabled:opacity-50"
                              title="Remove unused invite"
                            >
                              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InviteManager;