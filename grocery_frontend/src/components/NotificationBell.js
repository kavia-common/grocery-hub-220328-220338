import React, { useMemo, useRef, useState } from 'react';
import { useNotifications } from '../notifications/NotificationsContext';

/**
 * PUBLIC_INTERFACE
 * NotificationBell shows an icon with unread badge and a dropdown of recent notifications.
 */
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const recent = useMemo(() => notifications.slice(0, 10), [notifications]);

  const handleToggle = () => setOpen((s) => !s);

  const handleClickOutside = (e) => {
    if (panelRef.current && !panelRef.current.contains(e.target)) {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const oceanBlue = '#2563EB';
  const surface = '#ffffff';
  const shadow = '0 10px 25px rgba(0,0,0,0.08)';
  const border = '#e5e7eb';

  return (
    <div style={{ position: 'relative', marginLeft: 16 }}>
      <button
        aria-label="Notifications"
        onClick={handleToggle}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          borderRadius: 10,
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37,99,235,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={oceanBlue}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread notifications`}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: oceanBlue,
              color: surface,
              borderRadius: 999,
              fontSize: 10,
              lineHeight: '14px',
              minWidth: 16,
              height: 16,
              textAlign: 'center',
              boxShadow: shadow,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            top: '110%',
            right: 0,
            width: 360,
            maxWidth: '90vw',
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: shadow,
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(180deg, rgba(37,99,235,0.08), rgba(255,255,255,0))',
            }}
          >
            <div style={{ fontWeight: 600, color: '#111827' }}>Notifications</div>
            <button
              onClick={() => clearAll()}
              style={{
                fontSize: 12,
                color: oceanBlue,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Clear all
            </button>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {recent.length === 0 ? (
              <div style={{ padding: 16, color: '#6b7280', fontSize: 14 }}>No notifications</div>
            ) : (
              recent.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: 12,
                    borderTop: `1px solid ${border}`,
                    display: 'flex',
                    gap: 10,
                    background: n.read ? '#ffffff' : 'rgba(37,99,235,0.04)',
                  }}
                >
                  <TypeDot type={n.type} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: '#111827',
                        fontWeight: 500,
                        marginBottom: 4,
                      }}
                    >
                      {n.message}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      style={{
                        alignSelf: 'center',
                        fontSize: 12,
                        color: oceanBlue,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TypeDot({ type }) {
  const colorMap = {
    info: '#2563EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  };
  const c = colorMap[type] || colorMap.info;
  return (
    <span
      aria-hidden="true"
      style={{
        width: 10,
        height: 10,
        marginTop: 5,
        borderRadius: 999,
        background: c,
        flex: '0 0 auto',
        boxShadow: `0 0 0 3px ${c}20`,
      }}
    />
  );
}
