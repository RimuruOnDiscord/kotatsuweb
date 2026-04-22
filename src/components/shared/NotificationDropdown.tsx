import React from 'react';
import { Bell, CheckCheck, PlayCircle, Info, Star } from 'lucide-react';

export const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Episode Available',
    message: 'Solo Leveling Episode 8 is now available to watch!',
    time: '2 mins ago',
    unread: true,
    icon: PlayCircle,
    color: 'var(--aw-accent, #3b82f6)',
  },
  {
    id: 2,
    title: 'Added to Watchlist',
    message: 'Jujutsu Kaisen has been added to your watching list.',
    time: '3 hours ago',
    unread: true,
    icon: Star,
    color: '#eab308',
  },
  {
    id: 3,
    title: 'System Update',
    message: 'We have upgraded our video player for better performance.',
    time: '2 days ago',
    unread: false,
    icon: Info,
    color: '#8b5cf6',
  },
];

const NotificationDropdown = ({ notifications, setNotifications }) => {
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <>
      <style>
        {`
          @keyframes notif-slide-down {
            0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .aw-notif-dropdown {
            animation: notif-slide-down 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
            font-family: var(--aw-font-body, 'Onest', sans-serif);
          }
          .aw-notif-item {
            transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            border: 1px solid transparent;
          }
          .aw-notif-item:hover {
            background: var(--aw-s2);
            border-color: var(--aw-border);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px -10px rgba(0,0,0,0.5);
          }
        `}
      </style>

      <div
        className="aw-notif-dropdown absolute right-0 top-full mt-3 w-[320px] overflow-hidden z-[100] cursor-default"
        style={{
          borderRadius: '16px',
          border: '1px solid var(--aw-border)',
          background: 'rgba(7,7,13,0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--aw-border)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: 'var(--aw-s1)' }}
            >
              <Bell size={14} style={{ color: 'var(--aw-text)' }} />
            </div>
            <div>
              <h2
                className="text-[15px] font-semibold tracking-tight"
                style={{ fontFamily: 'var(--aw-font-display, "Syne", sans-serif)', color: 'var(--aw-text)' }}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--aw-s1)'; e.currentTarget.style.color = 'var(--aw-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aw-muted)'; }}
            >
              <CheckCheck size={14} />
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[340px] overflow-y-auto p-2 nice-scrollbar">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-xs" style={{ color: 'var(--aw-muted)' }}>You're all caught up!</p>
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
                        prev.map((n) => (n.id === notification.id ? { ...n, unread: false } : n))
                      );
                    }}
                    className={`aw-notif-item group relative flex w-full items-start gap-3 rounded-[12px] p-2.5 text-left ${notification.unread ? '' : 'opacity-60 grayscale-[30%]'
                      }`}
                    style={{
                      background: notification.unread ? 'var(--aw-s1)' : 'transparent'
                    }}
                  >
                    {/* Unread Dot Indicator */}
                    {notification.unread && (
                      <div
                        className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full shadow-[0_0_8px_currentColor]"
                        style={{ background: notification.color, color: notification.color }}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
                      style={{ background: `${notification.color}15`, color: notification.color }}
                    >
                      <Icon size={14} strokeWidth={2.5} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className="truncate text-[13px] font-medium"
                          style={{ color: notification.unread ? 'var(--aw-text)' : 'var(--aw-muted)' }}
                        >
                          {notification.title}
                        </h4>
                        <span className="shrink-0 text-[10px]" style={{ color: 'var(--aw-muted)', opacity: 0.7 }}>
                          {notification.time}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 text-xs line-clamp-2 leading-[1.4]"
                        style={{ color: 'var(--aw-muted)', opacity: 0.9 }}
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