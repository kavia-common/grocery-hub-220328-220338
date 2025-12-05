//
// Price Alert Service - mock-first with backend fallback
// - Persists subscriptions and last seen prices/discounts in localStorage
// - Detects price drops or discount increases
// - Fallbacks to simple in-app detection if backend endpoints are missing
//

/* eslint-disable no-console */

// Keys for localStorage
const LS_KEYS = {
  subscriptions: 'ghub_price_alert_subscriptions',
  lastSeen: 'ghub_price_alert_last_seen',
  prefs: 'ghub_price_alert_prefs',
};

// Ocean Professional theme palette hints (not used directly here, but kept for reference)
export const THEME = {
  primary: '#2563EB', // blue-600
  accent: '#F59E0B', // amber-500
};

// PUBLIC_INTERFACE
export function subscribe(productId) {
  /** Subscribe to price/discount alerts for a product. */
  const subs = _getSubscriptions();
  if (!subs.includes(productId)) {
    subs.push(productId);
    _setSubscriptions(subs);
  }
  // Try backend if exists (best-effort, non-blocking)
  _backendSubscribe(productId).catch(() => {});
  return true;
}

// PUBLIC_INTERFACE
export function unsubscribe(productId) {
  /** Unsubscribe from alerts for a product. */
  const subs = _getSubscriptions().filter((id) => id !== productId);
  _setSubscriptions(subs);
  _backendUnsubscribe(productId).catch(() => {});
  return true;
}

// PUBLIC_INTERFACE
export function isSubscribed(productId) {
  /** Check if current user is subscribed to price alerts for the given product. */
  const subs = _getSubscriptions();
  return subs.includes(productId);
}

// PUBLIC_INTERFACE
export async function checkForPriceDrops(currentProducts = [], notifyCb = null) {
  /**
   * Check current products against last seen price/discount and detect:
   *  - price decreased (current price < lastSeenPrice)
   *  - discountPercent increased (from 0 to >0, or higher than before)
   *
   * If a drop is detected, update last seen values and notify via notifyPriceDrop.
   * If backend check endpoint is available, defer to it; otherwise local logic runs.
   */
  try {
    const backendResult = await _backendCheck(currentProducts);
    if (backendResult && Array.isArray(backendResult.drops) && backendResult.drops.length > 0) {
      // Normalize: backend should return items with product, oldPrice, oldDiscountPercent
      backendResult.drops.forEach((drop) => {
        const { product, oldPrice, oldDiscountPercent } = drop;
        _updateLastSeen(product);
        notifyPriceDrop(product, oldPrice, oldDiscountPercent, notifyCb);
      });
      return backendResult.drops;
    }
  } catch (e) {
    // Ignore and fallback to local
  }

  // Local detection if backend not available or returned nothing
  const subs = _getSubscriptions();
  const lastSeenMap = _getLastSeen();
  const detected = [];

  currentProducts.forEach((p) => {
    if (!p || !p.id) return;
    const productId = p.id;
    // Only notify for subscribed items
    if (!subs.includes(productId)) {
      // But still update last seen for future comparisons
      _updateLastSeen(p);
      return;
    }

    const last = lastSeenMap[productId] || {};
    const currentPrice = _toNumber(p.price);
    const currentDiscount = _toNumber(p.discountPercent);

    const oldPrice = _toNumber(last.lastSeenPrice, currentPrice);
    const oldDiscount = _toNumber(last.lastSeenDiscountPercent, 0);

    let isDrop = false;

    // Condition A: price decreased
    if (currentPrice < oldPrice) {
      isDrop = true;
    }

    // Condition B: discount increased (e.g., 0 -> x or 5 -> 10)
    if (!isDrop && currentDiscount > oldDiscount) {
      isDrop = true;
    }

    if (isDrop) {
      detected.push({
        product: p,
        oldPrice,
        oldDiscountPercent: oldDiscount,
      });
      notifyPriceDrop(p, oldPrice, oldDiscount, notifyCb);
    }

    // Always update last seen after check
    _updateLastSeen(p);
  });

  return detected;
}

// PUBLIC_INTERFACE
export function notifyPriceDrop(product, oldPrice, oldDiscountPercent, notifyCb = null) {
  /**
   * Notify using external NotificationsService-compatible callback or a simple fallback.
   * notifyCb signature: ({ type, title, message, cta, ctaHref })
   */
  const currentPrice = _toNumber(product?.price);
  const currentDiscount = _toNumber(product?.discountPercent, 0);

  const title = 'Price drop detected';
  const priceChange =
    typeof oldPrice === 'number' && currentPrice < oldPrice
      ? `Price: ${_formatCurrency(oldPrice)} → ${_formatCurrency(currentPrice)}`
      : null;

  const discountChange =
    typeof oldDiscountPercent === 'number' && currentDiscount > oldDiscountPercent
      ? `Discount: ${oldDiscountPercent}% → ${currentDiscount}%`
      : null;

  const changes = [priceChange, discountChange].filter(Boolean).join(' | ');
  const message = changes || 'This item is now a better deal.';

  const payload = {
    type: 'info',
    title,
    message,
    cta: 'View item',
    ctaHref: `/product/${product?.id}`,
  };

  if (typeof notifyCb === 'function') {
    notifyCb(payload);
  } else {
    // Fallback: console message if NotificationsService is not wired here
    // UI components will typically pass NotificationsContext.show
    console.info(`[Price Alert] ${title}: ${message}`, payload);
  }
}

// PUBLIC_INTERFACE
export function setAlertPreferences(productId, prefs) {
  /**
   * Set per-product preferences for alerts.
   * prefs shape: { priceDrop: boolean, discountIncrease: boolean }
   */
  const allPrefs = _getPrefs();
  allPrefs[productId] = {
    priceDrop: Boolean(prefs?.priceDrop),
    discountIncrease: Boolean(prefs?.discountIncrease),
  };
  _setPrefs(allPrefs);
  return allPrefs[productId];
}

// PUBLIC_INTERFACE
export function getAlertPreferences(productId) {
  /** Get per-product preferences; defaults to { priceDrop: true, discountIncrease: true } */
  const allPrefs = _getPrefs();
  const defaultPrefs = { priceDrop: true, discountIncrease: true };
  return { ...defaultPrefs, ...(allPrefs[productId] || {}) };
}

// Helpers

function _toNumber(n, fallback = 0) {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return Number.isFinite(num) ? num : fallback;
}

function _formatCurrency(n) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(n || 0);
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}

function _getSubscriptions() {
  try {
    const raw = localStorage.getItem(LS_KEYS.subscriptions);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function _setSubscriptions(list) {
  try {
    localStorage.setItem(LS_KEYS.subscriptions, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function _getLastSeen() {
  try {
    const raw = localStorage.getItem(LS_KEYS.lastSeen);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function _setLastSeen(map) {
  try {
    localStorage.setItem(LS_KEYS.lastSeen, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function _updateLastSeen(product) {
  const map = _getLastSeen();
  const id = product?.id;
  if (!id) return;
  map[id] = {
    lastSeenPrice: _toNumber(product.price),
    lastSeenDiscountPercent: _toNumber(product.discountPercent, 0),
    updatedAt: Date.now(),
  };
  _setLastSeen(map);
}

function _getPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEYS.prefs);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function _setPrefs(map) {
  try {
    localStorage.setItem(LS_KEYS.prefs, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Backend fallback helpers

function _apiBase() {
  const base =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    '';
  return base?.replace(/\/+$/, '');
}

async function _backendSubscribe(productId) {
  const base = _apiBase();
  if (!base) return Promise.reject(new Error('no backend'));
  const url = `${base}/api/price-alerts/subscribe`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok) throw new Error(`subscribe failed ${res.status}`);
  return res.json().catch(() => ({}));
}

async function _backendUnsubscribe(productId) {
  const base = _apiBase();
  if (!base) return Promise.reject(new Error('no backend'));
  const url = `${base}/api/price-alerts/unsubscribe`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok) throw new Error(`unsubscribe failed ${res.status}`);
  return res.json().catch(() => ({}));
}

async function _backendCheck(currentProducts) {
  const base = _apiBase();
  if (!base) return null;
  const url = `${base}/api/price-alerts/check`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      products: (currentProducts || []).map((p) => ({
        id: p.id,
        price: _toNumber(p.price),
        discountPercent: _toNumber(p.discountPercent, 0),
      })),
    }),
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export default {
  subscribe,
  unsubscribe,
  isSubscribed,
  checkForPriceDrops,
  notifyPriceDrop,
  setAlertPreferences,
  getAlertPreferences,
};
