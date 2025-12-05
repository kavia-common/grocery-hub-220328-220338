import api from "../api";

/**
 * PUBLIC_INTERFACE
 * Order statuses in sequence for tracking.
 */
export const ORDER_STATUSES = ["PLACED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

/**
 * Derive if backend is available for orders endpoint by probing once (cached).
 */
let backendAvailableCache = null;
async function detectBackendAvailable() {
  if (backendAvailableCache !== null) return backendAvailableCache;
  try {
    // Lightweight HEAD/GET probe
    await api.get("/api/orders", { timeout: 3000 });
    backendAvailableCache = true;
  } catch {
    backendAvailableCache = false;
  }
  return backendAvailableCache;
}

const LS_ORDERS_KEY = "local_orders_v1";

/**
 * Local storage helpers
 */
function readLocalOrders() {
  try {
    const raw = localStorage.getItem(LS_ORDERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeLocalOrders(orders) {
  try {
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(orders || []));
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * getOrders fetches all orders; uses backend if available, otherwise local.
 */
export async function getOrders() {
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.get("/api/orders");
      return normalizeList(res.data);
    } catch {
      // fallback local if backend errors at runtime
      return normalizeList(readLocalOrders());
    }
  }
  return normalizeList(readLocalOrders());
}

/**
 * PUBLIC_INTERFACE
 * getOrder fetches single order by id; backend if available, otherwise local.
 */
export async function getOrder(id) {
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.get(`/api/orders/${id}`);
      return normalizeOrder(res.data);
    } catch {
      // fallback to local if stored
      const local = readLocalOrders().find((o) => String(o.id) === String(id));
      return normalizeOrder(local || null);
    }
  }
  const local = readLocalOrders().find((o) => String(o.id) === String(id));
  return normalizeOrder(local || null);
}

/**
 * PUBLIC_INTERFACE
 * createOrder creates a new order with initial status 'PLACED'.
 * Includes minimal payload: items summary, totals, timestamps.
 */
export async function createOrder({ items = [], total = 0, address = "", notes = "" }) {
  const now = new Date().toISOString();
  const payload = {
    status: "PLACED",
    created_at: now,
    updated_at: now,
    items: (items || []).map((it) => ({
      id: it.id ?? it.product?.id ?? Math.random(),
      product: it.product || null,
      quantity: Number(it.quantity || 1),
      price: Number(it.product?.price || it.price || 0),
    })),
    items_summary: summarizeItems(items || []),
    total_amount: Number(total || 0),
    address: address || "",
    notes: notes || "",
    timestamps: {
      PLACED: now,
      PACKED: null,
      OUT_FOR_DELIVERY: null,
      DELIVERED: null,
    },
  };

  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.post("/api/orders", payload);
      return normalizeOrder(res.data);
    } catch {
      // fallback to local
      return createLocalOrder(payload);
    }
  }
  return createLocalOrder(payload);
}

/**
 * PUBLIC_INTERFACE
 * advanceStatus moves order to the next status in sequence (mock/local only).
 * For backend mode, this is a no-op and returns null (UI should hide the button).
 */
export async function advanceStatus(orderId) {
  const useBackend = await detectBackendAvailable();
  if (useBackend) return null; // Not supported in real backend mode

  const orders = readLocalOrders();
  const idx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (idx === -1) return null;

  const order = orders[idx];
  const currentIndex = ORDER_STATUSES.indexOf(order.status);
  if (currentIndex === -1) order.status = "PLACED";

  if (currentIndex < ORDER_STATUSES.length - 1) {
    const next = ORDER_STATUSES[currentIndex + 1];
    order.status = next;
    order.updated_at = new Date().toISOString();
    order.timestamps = order.timestamps || {};
    order.timestamps[next] = order.timestamps[next] || order.updated_at;
    orders[idx] = order;
    writeLocalOrders(orders);
    return normalizeOrder(order);
  }
  return normalizeOrder(order);
}

/**
 * PUBLIC_INTERFACE
 * isBackendMode returns true if the backend orders API was detected.
 */
export async function isBackendMode() {
  return await detectBackendAvailable();
}

/**
 * Helpers
 */
function createLocalOrder(base) {
  const orders = readLocalOrders();
  // Simple ID generation
  const nextId = (orders.reduce((max, o) => Math.max(max, Number(o.id || 0)), 0) || 0) + 1;
  const order = { id: nextId, ...base };
  orders.unshift(order);
  writeLocalOrders(orders);
  return normalizeOrder(order);
}
function summarizeItems(items) {
  try {
    const parts = (items || []).map((it) => {
      const name = it.product?.name || "Item";
      const qty = Number(it.quantity || 1);
      return `${name} x ${qty}`;
    });
    return parts.join(", ");
  } catch {
    return "";
  }
}
function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .map((o) => normalizeOrder(o))
    .filter(Boolean);
}
function normalizeOrder(o) {
  if (!o) return null;
  const created = o.created_at || o.createdAt || new Date().toISOString();
  const updated = o.updated_at || o.updatedAt || created;
  const status = ORDER_STATUSES.includes(o.status) ? o.status : "PLACED";
  const timestamps = {
    PLACED: o.timestamps?.PLACED || (status === "PLACED" ? created : null),
    PACKED: o.timestamps?.PACKED || (status === "PACKED" ? updated : null),
    OUT_FOR_DELIVERY:
      o.timestamps?.OUT_FOR_DELIVERY || (status === "OUT_FOR_DELIVERY" ? updated : null),
    DELIVERED: o.timestamps?.DELIVERED || (status === "DELIVERED" ? updated : null),
  };
  const items = Array.isArray(o.items) ? o.items : [];
  const total = typeof o.total_amount === "number" ? o.total_amount : Number(o.total || 0);
  return {
    id: o.id,
    status,
    created_at: created,
    updated_at: updated,
    items,
    items_summary: o.items_summary || "",
    total_amount: total,
    address: o.address || "",
    notes: o.notes || "",
    timestamps,
  };
}
