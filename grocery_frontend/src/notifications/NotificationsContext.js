import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  listNotifications,
  pushNotification,
  markAsRead as svcMarkAsRead,
  clearNotifications as svcClearNotifications,
  NotificationTypes,
} from '../services/notificationsService';

// PUBLIC_INTERFACE
export const NotificationsContext = createContext({
  notifications: [],
  unreadCount: 0,
  // Use no-arg placeholders to avoid unused param lint warnings
  notify: async () => {},
  markRead: async () => {},
  clearAll: async () => {},
  NotificationTypes,
});

/**
 * PUBLIC_INTERFACE
 * NotificationsProvider wraps the app and provides notification state and helpers.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    const list = await listNotifications();
    setNotifications(list);
  }, []);

  useEffect(() => {
    refresh();
    // Optionally, set up a polling or WebSocket later; for now, manual/triggered refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = useCallback(async ({ type, message, meta }) => {
    const created = await pushNotification({ type, message, meta });
    setNotifications((prev) => [created, ...prev].slice(0, 100));
    return created;
  }, []);

  // Convenience wrappers for common types
  const notifySuccess = useCallback((message, meta) => notify({ type: NotificationTypes.success, message, meta }), [notify]);
  const notifyWarning = useCallback((message, meta) => notify({ type: NotificationTypes.warning, message, meta }), [notify]);
  const notifyError = useCallback((message, meta) => notify({ type: NotificationTypes.error, message, meta }), [notify]);

  const markRead = useCallback(async (id) => {
    await svcMarkAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(async () => {
    await svcClearNotifications();
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      notify,
      markRead,
      clearAll,
      NotificationTypes,
      notifySuccess,
      notifyWarning,
      notifyError,
    }),
    [notifications, unreadCount, notify, markRead, clearAll]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// PUBLIC_INTERFACE
export function useNotifications() {
  /** Hook to consume notifications context. */
  return useContext(NotificationsContext);
}
