import React from 'react';
import { useNotifications } from '../notifications/NotificationsContext';

/**
 * PUBLIC_INTERFACE
 * NotificationBanner renders the most recent unread notification inline.
 * Useful for page-level alerts. It is subtle and follows Ocean Professional theme.
 */
export default function NotificationBanner() {
  const { notifications, markRead } = useNotifications();

  const latestUnread = React.useMemo(
    () => notifications.find((n) => !n.read),
    [notifications]
  );

  if (!latestUnread) return null;

  const colorMap = {
    info: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  };
  const c = colorMap[latestUnread.type] || colorMap.info;

  return (
    <div
      role="status"
      style={{
        margin: '8px 0',
        borderRadius: 12,
        background: `${c}0D`,
        color: '#111827',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
        border: `1px solid ${c}2A`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: c,
          boxShadow: `0 0 0 3px ${c}20`,
        }}
      />
      <div style={{ flex: 1, fontSize: 14 }}>{latestUnread.message}</div>
      <button
        onClick={() => markRead(latestUnread.id)}
        style={{
          fontSize: 12,
          color: '#2563EB',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
