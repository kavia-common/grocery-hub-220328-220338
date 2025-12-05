//
// NotificationsService - mock-first with backend fallback, persistent via localStorage
//
// Provides list, push (info/success/warning/error), markAsRead, clear, and persistence.
// Attempts to use backend endpoints if available (/api/notifications...), else falls back to local.
//
const STORAGE_KEY = 'gh_notifications_v1';
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  process.env.REACT_APP_BACKEND_URL ||
  ''; // if empty, we will treat as fallback

// Ocean Professional palette
export const NotificationTypes = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

// Utility: load from localStorage
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Utility: save to localStorage
function saveLocal(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // ignore
  }
}

// Utility: ping backend availability for notifications
async function backendAvailable() {
  if (!API_BASE) return false;
  try {
    const res = await fetch(`${API_BASE}/api/notifications/health`, { method: 'GET' });
    // If a specific endpoint doesn't exist, try a HEAD on /api/notifications
    if (res.ok) return true;
  } catch {
    // ignore error
  }
  // try generic route detection
  try {
    const res2 = await fetch(`${API_BASE}/api/notifications`, { method: 'HEAD' });
    return res2.ok;
  } catch {
    return false;
  }
}

function normalizeNotification(n) {
  // Ensure shape: { id, type, message, createdAt, read, meta? }
  const now = new Date().toISOString();
  return {
    id: n.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: n.type || NotificationTypes.info,
    message: n.message || '',
    createdAt: n.createdAt || now,
    read: Boolean(n.read),
    meta: n.meta || undefined,
  };
}

// PUBLIC_INTERFACE
export async function listNotifications() {
  /** List notifications (backend preferred, fallback to localStorage). */
  const useBackend = await backendAvailable();
  if (useBackend) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        // Assume backend returns array in same shape or close
        return Array.isArray(data) ? data.map(normalizeNotification) : [];
      }
    } catch {
      // fall back
    }
  }
  return loadLocal();
}

// PUBLIC_INTERFACE
export async function pushNotification({ type = NotificationTypes.info, message, meta }) {
  /** Push a new notification (backend preferred, fallback to localStorage). */
  const payload = normalizeNotification({ type, message, meta });
  const useBackend = await backendAvailable();
  if (useBackend) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        return normalizeNotification(created);
      }
    } catch {
      // fall back
    }
  }
  const current = loadLocal();
  const next = [payload, ...current].slice(0, 100); // limit recent
  saveLocal(next);
  return payload;
}

// PUBLIC_INTERFACE
export async function markAsRead(id) {
  /** Mark a notification as read by id. */
  const useBackend = await backendAvailable();
  if (useBackend) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {
        method: 'POST',
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // fall back
    }
  }
  const current = loadLocal();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveLocal(next);
  return true;
}

// PUBLIC_INTERFACE
export async function clearNotifications() {
  /** Clear all notifications. */
  const useBackend = await backendAvailable();
  if (useBackend) {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/clear`, {
        method: 'POST',
      });
      if (res.ok) {
        return true;
      }
    } catch {
      // fall back
    }
  }
  saveLocal([]);
  return true;
}

// PUBLIC_INTERFACE
export function oceanTypeToColor(type) {
  /** Map notification type to Ocean Professional color token. */
  switch (type) {
    case NotificationTypes.success:
      return '#10B981'; // emerald-500 for success accent
    case NotificationTypes.warning:
      return '#F59E0B'; // amber-500
    case NotificationTypes.error:
      return '#EF4444'; // red-500
    case NotificationTypes.info:
    default:
      return '#2563EB'; // blue-600
  }
}
