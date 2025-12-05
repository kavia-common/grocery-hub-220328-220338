import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * Normalize product from backend or mock and surface organic fields, stock, and instant flags.
 */
function normalizeProduct(p) {
  const stockQty = typeof p.stockQty === "number" ? p.stockQty
                  : typeof p.stock === "number" ? p.stock
                  : typeof p.inventory === "number" ? p.inventory
                  : typeof p.quantity === "number" ? p.quantity
                  : (typeof p.stockQty === "string" ? Number(p.stockQty) : undefined);

  const qty = isFinite(Number(stockQty)) ? Number(stockQty) : undefined;

  const isOrganic =
    p.isOrganic === true ||
    p.organic === true ||
    p.quality === "Organic" ||
    p.weightOrQuality?.toString()?.toLowerCase()?.includes("organic") ||
    p.tags?.includes?.("organic") ||
    p.labels?.includes?.("organic") ||
    false;

  const organicCategory = p.organicCategory ||
    p.organic_category ||
    (isOrganic ? (p.tags?.find?.(t => ["fruits_veg", "grains_pulses", "chemical_free"].includes(t)) || null) : null);

  const organicCert = p.organicCert || p.organic_cert || p.certification || null;

  return {
    ...p,
    isInstant: typeof p.isInstant === "boolean" ? p.isInstant : !!p.instant || false,
    instantEta: p.instantEta || p.eta || undefined,
    stockQty: typeof qty === "number" ? qty : (typeof p.stockQty === "number" ? p.stockQty : undefined),
    isInStock: typeof qty === "number" ? qty > 0 : (typeof p.isInStock === "boolean" ? p.isInStock : undefined),
    // Organic fields
    isOrganic,
    organicCategory,
    organicCert,
  };
}

function normalizeProducts(list = []) {
  return (Array.isArray(list) ? list : []).map(normalizeProduct);
}

/**
 * PUBLIC_INTERFACE
 * fetchProducts attempts backend then falls back to mock; supports search and category.
 */
export async function fetchProducts(params = {}) {
  try {
    const res = await api.get("/api/products", { params });
    return normalizeProducts(res.data);
  } catch (e) {
    const items = normalizeProducts(getMockProducts());
    const { search, category } = params || {};
    let filtered = items;
    if (category) {
      filtered = filtered.filter(
        (p) => (p.category || "").toLowerCase() === String(category).toLowerCase()
      );
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }
}

/**
 * PUBLIC_INTERFACE
 * fetchInstantProducts returns only instant-delivery items with heuristics.
 */
export async function fetchInstantProducts() {
  const all = await fetchProducts({});
  const instant = (all || []).filter((p) => !!p.isInstant);
  const withDerived = instant.map((p) => ({
    ...p,
    _discount: typeof p.discountPercent === "number" ? p.discountPercent : (p.isDiscounted ? 1 : 0),
    _pop: typeof p.popularity === "number" ? p.popularity : null,
  }));
  withDerived.sort((a, b) => {
    const d = (b._discount || 0) - (a._discount || 0);
    if (d !== 0) return d;
    if (a._pop != null && b._pop != null) {
      const p = b._pop - a._pop;
      if (p !== 0) return p;
    }
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  return withDerived;
}

/**
 * PUBLIC_INTERFACE
 * getOrganicProducts: backend-first products filtered to isOrganic; supports {organicCategory}
 */
export async function getOrganicProducts(filter = {}) {
  const { organicCategory } = filter;
  try {
    const res = await api.get("/api/products", { params: {} });
    let list = normalizeProducts(res.data).filter(p => p.isOrganic);
    if (organicCategory) list = list.filter(p => (p.organicCategory || "") === organicCategory);
    return list;
  } catch (e) {
    let list = normalizeProducts(getMockProducts()).filter(p => p.isOrganic);
    if (organicCategory) list = list.filter(p => (p.organicCategory || "") === organicCategory);
    return list;
  }
}

/**
 * PUBLIC_INTERFACE
 * getFeaturedOrganic: return a small featured list for teasers.
 */
export async function getFeaturedOrganic(limit = 4) {
  try {
    const res = await api.get("/api/products", { params: {} });
    const list = normalizeProducts(res.data).filter(p => p.isOrganic);
    return list.slice(0, limit);
  } catch (e) {
    const list = normalizeProducts(getMockProducts()).filter(p => p.isOrganic);
    return list.slice(0, limit);
  }
}

/**
 * PUBLIC_INTERFACE
 * isProductsBackendMode: probe if /api/products is reachable (cached per session).
 */
let productsBackendAvailable = null;
export async function isProductsBackendMode() {
  if (productsBackendAvailable !== null) return productsBackendAvailable;
  try {
    await api.get("/api/products", { timeout: 3000, params: { limit: 1 } });
    productsBackendAvailable = true;
  } catch {
    productsBackendAvailable = false;
  }
  return productsBackendAvailable;
}

/**
 * PUBLIC_INTERFACE
 * simulateRestock (mock mode only): adjust stockQty to simulate restock.
 */
export function simulateRestock(list, productId, restockQty = 20) {
  const arr = Array.isArray(list) ? [...list] : [];
  const idx = arr.findIndex((p) => String(p.id) === String(productId));
  if (idx === -1) return arr;
  const p = arr[idx] || {};
  const prevQty = Number(p.stockQty || 0);
  const nextQty = prevQty > 0 ? prevQty : Number(restockQty || 1);
  arr[idx] = { ...p, stockQty: nextQty, isInStock: nextQty > 0 };
  return arr;
}

/**
 * PUBLIC_INTERFACE
 * addToCart using backend; fallback returns simple object for mock flows.
 */
export async function addToCart(productId, quantity = 1, note) {
  try {
    const res = await api.post("/api/cart", { product_id: productId, quantity });
    return res.data;
  } catch {
    return { product_id: productId, quantity, note };
  }
}

// Compatibility alias used across the app
export const getProducts = fetchProducts;
