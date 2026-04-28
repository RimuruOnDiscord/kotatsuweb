import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  icon: React.ElementType;
  color: string;
  coverImage?: string;
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

const NotificationDropdown = ({
  notifications,
  setNotifications,
}: {
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}) => {
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      <style>
        {`
  :root {
    --aw-bg:          var(--app-bg);
    --aw-s1:          var(--app-bg-2);
    --aw-s2:          var(--app-bg-3);
    --aw-card:        var(--app-card);
    --aw-border:      var(--app-border);
    --aw-border-hi:   var(--app-border-hover);
    --aw-accent:      var(--app-accent);
    --aw-accent-2:    var(--app-accent);
    --aw-accent-dim:  var(--app-accent-muted);
    --aw-accent-glow: var(--app-accent);
    --aw-muted:       #ffffffb7;
    --aw-text:        #ffffff;
    --aw-font-display: 'Syne', sans-serif;
    --aw-font-body:    'Onest', sans-serif;
  }

          @keyframes notif-slide-down {
            0%  { opacity: 0; transform: translate(-50%, -10px) scale(0.97); }
            100%{ opacity: 1; transform: translate(-50%,   0px) scale(1);    }
          }

          .aw-notif-dropdown {
            animation: notif-slide-down 0.28s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            font-family: var(--aw-font-body);
          }

          /* Scrollbar */
          .aw-notif-scroll::-webkit-scrollbar { width: 4px; }
          .aw-notif-scroll::-webkit-scrollbar-track { background: transparent; }
          .aw-notif-scroll::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.08);
            border-radius: 99px;
          }

          .aw-notif-item {
            transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
          }
          .aw-notif-item:hover {
            background: rgba(255,255,255,0.06) !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
          }
        `}
      </style>

      {/* ── Outer shell: glass panel ── */}
      <div
        className="aw-notif-dropdown absolute left-1/2 top-full mt-3 w-[320px] overflow-hidden z-[100] cursor-default"
        style={{
          transform: 'translateX(-50%)',
          borderRadius: 18,
          /* Glass background — semi-transparent dark */
          background: 'rgba(10, 10, 18, 0.93)',
          backdropFilter: 'blur(12px) saturate(140%)',
          WebkitBackdropFilter: 'blur(12px) saturate(140%)',
          /* Frosted-glass border: bright top edge, subtle rest */
          border: '1px solid rgba(255,255,255,0.10)',
          borderTop: '1px solid rgba(255,255,255,0.18)',
          boxShadow: `
            0 32px 72px rgba(0,0,0,0.55),
            0 0 0 0.5px rgba(255,255,255,0.04) inset,
            0 1px 0 rgba(255,255,255,0.12) inset
          `,
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.03)',
          }}
        >
          <div className="flex items-center gap-2.5">
            {/* Bell badge */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              }}
            >
              <Bell size={14} style={{ color: 'var(--aw-accent)' }} />
            </div>

            <div>
              <h2
                className="text-[15px] font-semibold tracking-tight"
                style={{
                  fontFamily: 'var(--aw-font-display, "Syne", sans-serif)',
                  color: '#fff',
                }}
              >
                Notifications
              </h2>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--aw-muted)' }}>
                {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              title="Mark all as read"
              className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-all duration-200"
              style={{ color: 'var(--aw-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--aw-muted)';
              }}
            >
              <CheckCheck size={14} />
            </button>
          )}
        </div>

        {/* ── List ── */}
        <div className="aw-notif-scroll max-h-[340px] overflow-y-auto p-2">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Bell size={20} style={{ color: 'rgba(255,255,255,0.25)' }} />
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--aw-muted)' }}>
                You're all caught up!
              </p>
              <p className="mt-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                No new notifications
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notifications.map((notification) => {
                const Icon = notification.icon;
                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((n) =>
                          n.id === notification.id ? { ...n, unread: false } : n
                        )
                      );
                    }}
                    className={`aw-notif-item group relative flex w-full items-start gap-3 rounded-[12px] p-2.5 text-left ${notification.unread ? '' : 'opacity-40 grayscale'
                      }`}
                    style={{
                      background: notification.unread
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                    }}
                  >
                    {/* Unread dot */}
                    {notification.unread && (
                      <div
                        className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full"
                        style={{
                          background: notification.color,
                          boxShadow: `0 0 6px ${notification.color}`,
                        }}
                      />
                    )}

                    {/* Thumbnail or icon */}
                    {notification.coverImage ? (
                      <div
                        className="mt-0.5 h-10 w-8 shrink-0 overflow-hidden rounded-[6px] transition-transform duration-300 group-hover:scale-110"
                        style={{
                          border: `1px solid ${notification.color}40`,
                          boxShadow: `0 0 10px ${notification.color}25`,
                        }}
                      >
                        <img
                          src={notification.coverImage}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      </div>
                    ) : (
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                        style={{
                          background: `${notification.color}18`,
                          border: `1px solid ${notification.color}30`,
                          color: notification.color,
                        }}
                      >
                        <Icon size={14} strokeWidth={2.5} />
                      </div>
                    )}

                    {/* Text */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className="truncate text-[13px] font-medium"
                          style={{
                            color: notification.unread ? '#fff' : 'var(--aw-muted)',
                          }}
                        >
                          {notification.title}
                        </h4>
                        <span
                          className="shrink-0 text-[10px]"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {notification.time}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 text-xs line-clamp-2 leading-[1.4]"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {notification.message}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationDropdown;