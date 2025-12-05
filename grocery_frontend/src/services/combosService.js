import { combos as mockCombos } from '../mock/combos';
import api from '../api';

/**
 * Utility to safely fetch with timeout and detect backend availability.
 */
async function tryFetch(url, options = {}) {
  try {
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Compute totals and derived fields for a combo object.
 * Adds: originalPrice, savingsPercent, availability {allInStock, partiallyAvailable, outOfStockItems}
 */
// PUBLIC_INTERFACE
export function computeTotals(combo) {
  /** Derives pricing and availability information for a combo. */
  const items = combo.items || [];
  const originalPrice =
    combo.originalPrice ??
    items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);

  const savings = Math.max(0, originalPrice - (combo.comboPrice || 0));
  const savingsPercent = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

  const outOfStockItems = items.filter((it) => (it.stockQty ?? 0) < (it.qty ?? 1));
  const allInStock = outOfStockItems.length === 0;
  const partiallyAvailable = !allInStock && outOfStockItems.length < items.length;

  const allInstant = items.length > 0 && items.every((i) => !!i.isInstant);

  return {
    ...combo,
    originalPrice: Number(originalPrice.toFixed(2)),
    savingsPercent,
    availability: { allInStock, partiallyAvailable, outOfStockItems },
    allInstant,
  };
}

/**
 * Attempt to fetch combos from backend, else fallback to mock.
 */
// PUBLIC_INTERFACE
export async function listCombos() {
  /** Returns list of combos, using backend if available, else mock data. */
  const base = api?.defaults?.baseURL || '';
  const backendUrl = `${base}/api/combos`;
  const data = await tryFetch(backendUrl);
  const source = Array.isArray(data) && data.length ? data : mockCombos;

  return source.map((c) => computeTotals(c));
}

/**
 * Get a single combo by id with backend fallback.
 */
// PUBLIC_INTERFACE
export async function getComboById(id) {
  /** Returns combo detail with derived fields. */
  const base = api?.defaults?.baseURL || '';
  const backendUrl = `${base}/api/combos/${id}`;
  const data = await tryFetch(backendUrl);
  let combo = data;
  if (!combo) {
    combo = mockCombos.find((c) => String(c.id) === String(id));
  }
  if (!combo) return null;
  return computeTotals(combo);
}

export default {
  listCombos,
  getComboById,
  computeTotals,
};
