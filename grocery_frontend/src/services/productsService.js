import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * Normalize backend or mock records to ensure isInstant and instantEta fields are present when available.
 */
function normalizeProducts(list = []) {
  return (Array.isArray(list) ? list : []).map((p) => {
    const stockQty = typeof p.stockQty === "number" ? p.stockQty
                    : typeof p.stock === "number" ? p.stock
                    : typeof p.inventory === "number" ? p.inventory
                    : typeof p.quantity === "number" ? p.quantity
                    : (typeof p.stockQty === "string" ? Number(p.stockQty) : undefined);
    const qty = isFinite(Number(stockQty)) ? Number(stockQty) : undefined;
    return {
      ...p,
      // Preserve existing schema; only add fields if present or default to false/undefined
      isInstant: typeof p.isInstant === "boolean" ? p.isInstant : !!p.instant || false,
      instantEta: p.instantEta || p.eta || undefined,
      stockQty: typeof qty === "number" ? qty : (typeof p.stockQty === "number" ? p.stockQty : undefined),
      isInStock: typeof qty === "number" ? qty > 0 : (typeof p.isInStock === "boolean" ? p.isInStock : undefined),
    };
  });
}

/**
 * PUBLIC_INTERFACE
 * fetchProducts attempts to load products from the backend `/api/products`.
 * If the backend is unavailable or errors, it falls back to local mock data.
 * Supports optional filtering by search and category to match current UI query params.
 * Expected product fields from backend responses:
 *  - id, name, description, category, image_url, price, weight or quality, discountPercent or isDiscounted
 */
export async function fetchProducts(params = {}) {
  try {
    const res = await api.get("/api/products", { params });
    return normalizeProducts(res.data);
  } catch (e) {
    // Fallback to mock data with client-side filtering
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
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }
}

/**
 * PUBLIC_INTERFACE
 * fetchInstantProducts returns only instant-delivery items with sorting:
 * - discount desc, then by popularity if available (p.popularity), else by name asc.
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
    // discount desc
    const d = (b._discount || 0) - (a._discount || 0);
    if (d !== 0) return d;
    // popularity desc if both available
    if (a._pop != null && b._pop != null) {
      const p = b._pop - a._pop;
      if (p !== 0) return p;
    }
    // name asc
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  return withDerived;
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
 * simulateRestock (mock mode only): returns a new array with the targeted product
 * stockQty adjusted from 0 to a positive number to simulate a restock event.
 * Caller should then trigger a UI refresh and any stock alert notifications.
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
 * addToCart: adds an item to the cart using backend when available.
 * The optional note is ignored by backend but preserved in returned object for mock flows.
 */
export async function addToCart(productId, quantity = 1, note) {
  try {
    const res = await api.post("/api/cart", { product_id: productId, quantity });
    return res.data;
  } catch {
    return { product_id: productId, quantity, note };
  }
}

// Compatibility aliases for other modules
export const getProducts = fetchProducts;
