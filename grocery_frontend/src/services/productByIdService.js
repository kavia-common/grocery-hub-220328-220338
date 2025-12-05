import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * PUBLIC_INTERFACE
 * fetchProductById attempts to load a single product by ID from backend with mock fallback.
 */
export async function fetchProductById(id) {
  try {
    const res = await api.get(`/api/products/${id}`);
    return res.data;
  } catch (e) {
    const items = getMockProducts();
    return items.find((x) => String(x.id) === String(id)) || null;
  }
}
