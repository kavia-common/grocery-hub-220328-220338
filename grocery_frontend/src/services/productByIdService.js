import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * PUBLIC_INTERFACE
 * fetchProductById attempts to load a single product by ID from backend with mock fallback.
 */
export async function fetchProductById(id) {
  try {
    const res = await api.get(`/api/products/${id}`);
    const p = res.data;
    const stockQty = typeof p?.stockQty === "number" ? p.stockQty
                    : typeof p?.stock === "number" ? p.stock
                    : typeof p?.inventory === "number" ? p.inventory
                    : typeof p?.quantity === "number" ? p.quantity
                    : (typeof p?.stockQty === "string" ? Number(p.stockQty) : undefined);
    const qty = isFinite(Number(stockQty)) ? Number(stockQty) : undefined;
    return {
      ...p,
      isInstant: typeof p?.isInstant === "boolean" ? p.isInstant : !!p?.instant || false,
      instantEta: p?.instantEta || p?.eta || undefined,
      stockQty: typeof qty === "number" ? qty : (typeof p?.stockQty === "number" ? p.stockQty : undefined),
      isInStock: typeof qty === "number" ? qty > 0 : (typeof p?.isInStock === "boolean" ? p.isInStock : undefined),
    };
  } catch (e) {
    const items = getMockProducts();
    const found = items.find((x) => String(x.id) === String(id)) || null;
    if (!found) return null;
    const qty = typeof found.stockQty === "number" ? found.stockQty : undefined;
    return { ...found, isInStock: typeof qty === "number" ? qty > 0 : undefined };
  }
}
