const LS_KEY = "gh_notifications_v1";

export const NotificationTypes = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeAll(items) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items || []));
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function listNotifications() {
  /** Return notifications stored locally (mock). */
  return readAll();
}

// PUBLIC_INTERFACE
export async function pushNotification({ type = "info", message = "", meta = null }) {
  /** Push a new notification and return the created object. */
  const n = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    meta,
    read: false,
    ts: Date.now(),
  };
  const arr = readAll();
  arr.unshift(n);
  writeAll(arr.slice(0, 100));
  return n;
}

// PUBLIC_INTERFACE
export async function markAsRead(id) {
  /** Mark a notification as read. */
  const arr = readAll();
  const idx = arr.findIndex((x) => x.id === id);
  if (idx !== -1) {
    arr[idx] = { ...arr[idx], read: true };
    writeAll(arr);
  }
}

// PUBLIC_INTERFACE
export async function clearNotifications() {
  /** Clear all notifications. */
  writeAll([]);
}
