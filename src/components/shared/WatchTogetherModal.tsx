import React, { useState, useRef } from 'react';
import { X, Users, Copy, Check, Radio, Wifi, WifiOff, Crown, User } from 'lucide-react';
import type { WatchTogetherParticipant } from '../../hooks/useWatchTogether';

interface WatchTogetherModalProps {
  open: boolean;
  onClose: () => void;
  isInRoom: boolean;
  roomCode: string | null;
  participants: WatchTogetherParticipant[];
  isHost: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
}

const WatchTogetherModal: React.FC<WatchTogetherModalProps> = ({
  open,
  onClose,
  isInRoom,
  roomCode,
  participants,
  isHost,
  connectionStatus,
  error,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const inputRef = useRef<HTMLInputElement>(null);
  const prevTitleRef = useRef(document.title);

  React.useEffect(() => {
    if (open) {
      prevTitleRef.current = document.title;
      document.title = 'Watch Together';
      return () => {
        document.title = prevTitleRef.current;
      };
    }
  }, [open]);

  if (!open) return null;

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = roomCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim().length >= 4) {
      onJoinRoom(joinCode.trim().toUpperCase());
    }
  };

  const statusColor =
    connectionStatus === 'connected'
      ? 'var(--aw-accent)'
      : connectionStatus === 'connecting'
      ? '#f0ad4e'
      : '#e8365d';

  const StatusIcon = connectionStatus === 'connected' ? Radio : connectionStatus === 'connecting' ? Wifi : WifiOff;

  return (
    <div
      className="aw-share-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="aw-share-modal"
        style={{
          background: 'var(--aw-bg)',
          border: '1px solid var(--aw-border)',
          borderRadius: 20,
          maxWidth: 440,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 40px 100px -20px rgba(0,0,0,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} style={{ color: 'var(--aw-accent)' }} />
            <h3
              style={{
                margin: 0,
                fontFamily: 'var(--aw-font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'white',
                letterSpacing: '0.02em',
              }}
            >
              Watch Together
            </h3>
          </div>
          {isInRoom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: statusColor, fontWeight: 600 }}>
              <StatusIcon size={12} />
              <span style={{ textTransform: 'capitalize' }}>{connectionStatus}</span>
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {isInRoom ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Room Code */}
              <div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontFamily: 'var(--aw-font-display)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--aw-muted)',
                  }}
                >
                  Room Code
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--aw-bg)',
                      border: '1px solid var(--aw-border)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 22,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 800,
                      letterSpacing: '0.15em',
                      color: 'var(--aw-accent)',
                      textAlign: 'center',
                      userSelect: 'all',
                    }}
                  >
                    {roomCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '0 18px',
                      borderRadius: 10,
                      border: `1px solid ${copied ? 'var(--aw-accent)' : 'var(--aw-border)'}`,
                      background: copied ? 'var(--aw-accent-dim)' : 'var(--aw-bg)',
                      color: copied ? 'var(--aw-accent)' : 'var(--aw-text)',
                      fontSize: 11,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      flexShrink: 0,
                    }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontFamily: 'var(--aw-font-display)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--aw-muted)',
                  }}
                >
                  Participants ({participants.length})
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}
                >
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: p.isHost ? 'var(--aw-accent-dim)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${p.isHost ? 'var(--aw-accent)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: p.isHost
                            ? 'var(--aw-accent)'
                            : 'rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: 12,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {p.avatar ? (
                          <img
                            src={p.avatar}
                            alt=""
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : p.isHost ? (
                          <Crown size={14} />
                        ) : (
                          <User size={14} />
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: p.isHost ? 'var(--aw-accent)' : 'var(--aw-text)',
                          flex: 1,
                        }}
                      >
                        {p.name}
                        {p.id === (participants.find((me) => me.isHost)?.id || '') && ' (You)'}
                      </span>
                      {p.isHost && (
                        <span
                          style={{
                            fontSize: 9,
                            fontFamily: 'var(--aw-font-display)',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--aw-accent)',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 8px',
                            borderRadius: 100,
                          }}
                        >
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave Button */}
              <button
                onClick={onLeaveRoom}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  background: 'rgba(232,54,93,0.1)',
                  border: '1px solid rgba(232,54,93,0.3)',
                  color: '#e8365d',
                  fontSize: 12,
                  fontFamily: 'var(--aw-font-display)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Leave Room
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Tabs */}
              <div
                style={{
                  display: 'flex',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 100,
                  padding: 4,
                  gap: 2,
                }}
              >
                {(['create', 'join'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 16px',
                      borderRadius: 100,
                      border: 'none',
                      background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                      color: activeTab === tab ? 'var(--aw-accent)' : 'var(--aw-muted)',
                      fontSize: 11,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab === 'create' ? 'Create Room' : 'Join Room'}
                  </button>
                ))}
              </div>

              {activeTab === 'create' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                  <Users size={40} style={{ color: 'var(--aw-accent)', opacity: 0.6 }} />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'var(--aw-muted)',
                      textAlign: 'center',
                      lineHeight: 1.6,
                      maxWidth: 300,
                    }}
                  >
                    Create a private room and invite friends to watch together in perfect sync.
                  </p>
                  <button
                    onClick={onCreateRoom}
                    className="aw-action-btn"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 12,
                      background: 'var(--aw-accent-dim)',
                      border: '1px solid var(--aw-accent-dim)',
                      color: 'var(--aw-accent)',
                      fontSize: 12,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Radio size={16} /> Create Watch Room
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'var(--aw-muted)',
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    Enter a 6-character room code to join a watch session.
                  </p>
                  <input
                    ref={inputRef}
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                    placeholder="ROOM CODE"
                    maxLength={6}
                    style={{
                      width: '100%',
                      background: 'var(--aw-bg)',
                      border: '1px solid var(--aw-border)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      fontSize: 22,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 800,
                      letterSpacing: '0.2em',
                      color: 'var(--aw-text)',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--aw-accent)')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--aw-border)')}
                  />
                  <button
                    type="submit"
                    disabled={joinCode.trim().length < 4}
                    className="aw-action-btn"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: 12,
                      background: 'var(--aw-accent-dim)',
                      border: '1px solid var(--aw-accent-dim)',
                      color: 'var(--aw-accent)',
                      fontSize: 12,
                      fontFamily: 'var(--aw-font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: joinCode.trim().length < 4 ? 'not-allowed' : 'pointer',
                      opacity: joinCode.trim().length < 4 ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Wifi size={16} /> Join Room
                  </button>
                </form>
              )}

              {error && (
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: '#e8365d',
                    textAlign: 'center',
                    fontWeight: 500,
                  }}
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchTogetherModal;
