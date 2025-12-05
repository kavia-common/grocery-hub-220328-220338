import api from "../api";
import { getOrders } from "./orderService";

/**
 * PUBLIC_INTERFACE
 * getSuggestions returns a list of suggested product items based on a user's past orders.
 * It uses a simple scoring combining frequency and recency boosts, with optional category diversity.
 * If a backend orders API is reachable (via orderService), it uses it; otherwise falls back to local orders.
 *
 * @param {string|number=} userId Optional user id to filter orders (if backend returns user info). Ignored for local mock.
 * @param {number=} limit Max number of suggestions to return (default 5).
 * @returns {Promise<Array<{ product:any, score:number, context:string }>>}
 */
export async function getSuggestions(userId, limit = 5) {
  try {
    // Try to fetch orders using existing service (which already smartly decides backend vs local)
    const orders = await getOrders();

    // Compute scores based on orders
    const { scored } = scoreFromOrders(orders);

    // Optional: filter by user id when orders contain a user field (backend only)
    const filtered = typeof userId !== "undefined"
      ? scored // We don't have user on mock orders; if backend includes it within order or item, you can refine here.
      : scored;

    // Sort by score desc, then recency (tie-breaker)
    filtered.sort((a, b) => (b.score - a.score) || (b.lastPurchasedAt - a.lastPurchasedAt));

    // Decorate with small context text
    const enriched = filtered.slice(0, Math.max(1, Number(limit || 5))).map((row) => ({
      product: row.product,
      score: row.score,
      context: contextText(row.lastPurchasedAt),
    }));
    return enriched;
  } catch {
    return [];
  }
}

/**
 * PUBLIC_INTERFACE
 * scoreFromOrders creates a map of productId => { product, score, count, lastPurchasedAt, categories }
 * Exposed for unit-friendly testing.
 */
export function scoreFromOrders(orders = []) {
  const now = Date.now();
  const recency14 = 14 * 24 * 60 * 60 * 1000;
  const recency30 = 30 * 24 * 60 * 60 * 1000;

  const map = new Map();

  (Array.isArray(orders) ? orders : []).forEach((o) => {
    const createdAt = safeDateMs(o?.created_at || o?.createdAt);
    const items = Array.isArray(o?.items) ? o.items : [];
    items.forEach((it) => {
      const pid = it?.product?.id ?? it?.id;
      if (!pid) return;
      const product = it.product || { id: it.id, name: it.name, price: it.price };
      const prev = map.get(pid) || {
        product,
        count: 0,
        lastPurchasedAt: 0,
        categories: new Set(),
      };
      prev.count += Number(it.quantity || 1);
      prev.lastPurchasedAt = Math.max(prev.lastPurchasedAt || 0, createdAt || 0);
      const cat = product?.category;
      if (cat) prev.categories.add(cat);
      map.set(pid, prev);
    });
  });

  // Build scored array
  const scored = [];
  for (const entry of map.values()) {
    let score = 0;

    // Frequency weight: +1 per count
    score += entry.count;

    // Recency boost: +2 if within 14d, +1 if within 30d
    const age = now - (entry.lastPurchasedAt || 0);
    if (isFinite(age)) {
      if (age <= recency14) score += 2;
      else if (age <= recency30) score += 1;
    }

    // Optional small category diversity encouragement (more categories seen -> mild boost up to +1)
    const catCount = (entry.categories && entry.categories.size) || 0;
    const catBoost = Math.min(1, catCount * 0.1);
    score += catBoost;

    scored.push({
      product: entry.product,
      score,
      count: entry.count,
      lastPurchasedAt: entry.lastPurchasedAt || 0,
    });
  }

  return { scored };
}

/**
 * PUBLIC_INTERFACE
 * contextText returns friendly copy such as "You purchased this last week."
 */
export function contextText(lastPurchasedAtMs) {
  if (!lastPurchasedAtMs) return "You purchased this before.";
  const days = Math.max(0, Math.floor((Date.now() - lastPurchasedAtMs) / (24 * 60 * 60 * 1000)));
  if (days === 0) return "You purchased this today.";
  if (days === 1) return "You purchased this yesterday.";
  if (days < 7) return `You purchased this ${days} days ago.`;
  if (days < 14) return "You purchased this last week.";
  if (days < 30) return "You purchased this a few weeks ago.";
  if (days < 60) return "You purchased this last month.";
  return "You bought this previously.";
}

function safeDateMs(value) {
  try {
    const t = new Date(value).getTime();
    return isNaN(t) ? 0 : t;
  } catch {
    return 0;
  }
}

// Optional helper to add a product to the cart via API.
// PUBLIC_INTERFACE
export async function addOneToCart(productId) {
  try {
    await api.post("/api/cart", { product_id: productId, quantity: 1 });
    return true;
  } catch {
    return false;
  }
}
