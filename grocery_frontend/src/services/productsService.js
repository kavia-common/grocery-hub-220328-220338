import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * PUBLIC_INTERFACE
 * fetchProducts attempts to load products from the backend `/api/products`.
 * If the backend is unavailable or errors, it falls back to local mock data.
 * Supports optional filtering by search and category to match current UI query params.
 */
export async function fetchProducts(params = {}) {
  try {
    const res = await api.get("/api/products", { params });
    // Expect backend to return fields: id, name, price, weight or quality, discountPercent or isDiscounted
    return res.data;
  } catch (e) {
    // Fallback to mock data with client-side filtering
    const items = getMockProducts();
    const { search, category } = params || {};
    let filtered = items;
    if (category) {
      filtered = filtered.filter(p => (p.category || "").toLowerCase() === String(category).toLowerCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      );
    }
    return filtered;
  }
}
