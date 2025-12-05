//
// PUBLIC_INTERFACE
// StockAlertsService provides local (mock-first) subscription and notification
// handling for "Remind me when back in stock" using localStorage.
// If backend endpoints exist, the service attempts to use them, falling back
// to localStorage seamlessly.
//
import api from "../api";
import { pushNotification, NotificationTypes } from "./notificationsService";

const LS_KEY = "stock_alerts_subscriptions_v1";
const BANNER_QUEUE_KEY = "stock_alerts_banner_queue_v1";

/**
 * Read subscription set from localStorage.
 */
function readSubs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}
/**
 * Persist subscription set to localStorage.
 */
function writeSubs(subsSet) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(subsSet || [])));
  } catch {
    // ignore
  }
}

/**
 * Detect if backend has stock endpoints (cached).
 */
let backendAvailableCache = null;
async function detectBackendAvailable() {
  if (backendAvailableCache !== null) return backendAvailableCache;
  try {
    // Probe a likely endpoint; even if 404, treat as unavailable.
    // If it returns 200, consider backend available.
    await api.get("/api/stock/health", { timeout: 3000 });
    backendAvailableCache = true;
  } catch {
    backendAvailableCache = false;
  }
  return backendAvailableCache;
}

/**
 * PUBLIC_INTERFACE
 * subscribe registers interest in a product's restock.
 */
export async function subscribe(productId, userId) {
  const id = String(productId);
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      await api.post("/api/stock/subscribe", { product_id: id, user_id: userId || null });
      return true;
    } catch {
      // fallback to local
    }
  }
  const subs = readSubs();
  subs.add(id);
  writeSubs(subs);
  return true;
}

/**
 * PUBLIC_INTERFACE
 * unsubscribe removes interest in a product's restock.
 */
export async function unsubscribe(productId, userId) {
  const id = String(productId);
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      await api.post("/api/stock/unsubscribe", { product_id: id, user_id: userId || null });
      return true;
    } catch {
      // fallback to local
    }
  }
  const subs = readSubs();
  subs.delete(id);
  writeSubs(subs);
  return true;
}

/**
 * PUBLIC_INTERFACE
 * isSubscribed checks if the product is currently subscribed locally.
 */
export async function isSubscribed(productId) {
  const id = String(productId);
  const subs = readSubs();
  return subs.has(id);
}

/**
 * Internal: banner queue allows any page to render alerts by polling storage.
 * We keep a simple queue array of strings.
 */
function pushBanner(message) {
  try {
    const raw = localStorage.getItem(BANNER_QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(String(message));
    localStorage.setItem(BANNER_QUEUE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}
export function popNextBanner() {
  try {
    const raw = localStorage.getItem(BANNER_QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const msg = arr.shift();
    localStorage.setItem(BANNER_QUEUE_KEY, JSON.stringify(arr));
    return msg || null;
  } catch {
    return null;
  }
}

/**
 * PUBLIC_INTERFACE
 * notifyIfRestocked fires a local banner/toast and clears subscription if the product is subscribed.
 * It is intended to be called when stock goes from 0 to >0 in mock mode or after polling.
 */
export async function notifyIfRestocked(product) {
  if (!product?.id) return;
  const id = String(product.id);
  const subs = readSubs();
  if (!subs.has(id)) return; // no-op if not subscribed
  const name = product.name || "Item";
  // Push via new NotificationsService
  await pushNotification({
    type: NotificationTypes.info,
    message: `Good news! "${name}" is back in stock.`,
    meta: { type: "restock", productId: id },
  });
  // Keep existing banner queue for backward compatibility
  pushBanner(`Good news! "${name}" is back in stock.`);
  // Clear subscription
  subs.delete(id);
  writeSubs(subs);
}

/**
 * PUBLIC_INTERFACE
 * getAllLocalSubscriptions returns a list of productId strings (local mode only).
 */
export function getAllLocalSubscriptions() {
  return Array.from(readSubs());
}
