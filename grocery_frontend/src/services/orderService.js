import api from "../api";
import { getMockProducts } from "../mock/products";

/**
 * PUBLIC_INTERFACE
 * Order statuses in sequence for tracking.
 */
export const ORDER_STATUSES = ["PLACED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED"];

/**
 * Detect backend availability (cached during session).
 */
let backendAvailableCache = null;
async function detectBackendAvailable() {
  if (backendAvailableCache !== null) return backendAvailableCache;
  try {
    await api.get("/api/orders", { timeout: 3000 });
    backendAvailableCache = true;
  } catch {
    backendAvailableCache = false;
  }
  return backendAvailableCache;
}

/**
 * Normalize product to include stock flags for inventory compatibility.
 */
function normalizeProduct(p) {
  if (!p) return p;
  const stockQty =
    typeof p.stockQty === "number"
      ? p.stockQty
      : typeof p.stock === "number"
      ? p.stock
      : typeof p.inventory === "number"
      ? p.inventory
      : 0;
  return {
    ...p,
    stockQty,
    isInStock: stockQty > 0,
  };
}

function normalizeOrderItems(items) {
  return (Array.isArray(items) ? items : []).map((it, idx) => ({
    id: it.id ?? idx + 1,
    product: normalizeProduct(it.product),
    quantity: Number(it.quantity || 1),
    price: Number(it.price ?? it.product?.price ?? 0),
  }));
}

export function maskUpi(upiId) {
  if (!upiId) return "";
  const parts = String(upiId).split("@");
  if (parts.length !== 2) return upiId;
  const local = parts[0];
  const domain = parts[1];
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(0, local.length - visible.length))}@${domain}`;
}

export function paymentSummaryShort(payment) {
  if (!payment) return "";
  const method = payment.method || "COD";
  const m = payment.meta || {};
  if (method === "UPI") {
    return `UPI • ${m.masked || maskUpi(m.upiId || "")}`;
  }
  if (method === "CARD") {
    const last4 = m.cardLast4 || "";
    return `Card • •••• ${last4}`;
  }
  if (method === "WALLET") {
    return `Wallet • ${m.walletProvider || "—"}`;
  }
  return "Cash on Delivery";
}

function normalizeOrder(o) {
  if (!o) return null;
  const created = o.created_at || o.createdAt || new Date().toISOString();
  const updated = o.updated_at || o.updatedAt || created;
  const status = ORDER_STATUSES.includes(o.status) ? o.status : "PLACED";
  return {
    id: o.id,
    status,
    created_at: created,
    updated_at: updated,
    items: normalizeOrderItems(o.items),
    items_summary: o.items_summary || "",
    total_amount: typeof o.total_amount === "number" ? o.total_amount : Number(o.total || 0),
    address: o.address || "",
    shippingAddress: o.shippingAddress || null,
    notes: o.notes || "",
    payment: o.payment || null,
    timestamps: o.timestamps || {},
    membershipSnapshot: o.membershipSnapshot || null,
  };
}

function normalizeOrders(list) {
  return (Array.isArray(list) ? list : [])
    .map(normalizeOrder)
    .filter(Boolean);
}

/**
 * Local storage helpers for mock orders persistence.
 */
const LS_ORDERS_KEY = "local_orders_v1";
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
 * Build mock orders from mock products dataset for offline/dev use.
 */
function buildMockOrders() {
  const products = getMockProducts();
  const choose = (i) => normalizeProduct(products[i % products.length]);
  const now = Date.now();

  const o1Items = [
    { id: 11, product: choose(0), quantity: 1, price: choose(0).price },
    { id: 12, product: choose(3), quantity: 2, price: choose(3).price },
  ];
  const o2Items = [
    { id: 21, product: choose(2), quantity: 1, price: choose(2).price },
    { id: 22, product: choose(5), quantity: 3, price: choose(5).price },
  ];
  const sum = (items) => items.reduce((acc, it) => acc + (it.price ?? 0) * it.quantity, 0);
  return normalizeOrders([
    {
      id: 1,
      total_amount: sum(o1Items),
      status: "DELIVERED",
      created_at: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
      items: o1Items,
    },
    {
      id: 2,
      total_amount: sum(o2Items),
      status: "DELIVERED",
      created_at: new Date(now - 1000 * 60 * 60 * 24 * 14).toISOString(),
      items: o2Items,
    },
  ]);
}

/**
 * PUBLIC_INTERFACE
 * fetchOrders (legacy name) - kept for backward compatibility.
 */
export async function fetchOrders() {
  return getPastOrders();
}

/**
 * PUBLIC_INTERFACE
 * getPastOrders fetches orders (backend if available, otherwise mock).
 */
export async function getPastOrders() {
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.get("/api/orders");
      return normalizeOrders(res.data);
    } catch {
      // fall back to mock orders
    }
  }
  return buildMockOrders();
}

/**
 * PUBLIC_INTERFACE
 * getOrderById fetches one order by id (backend fallback to mock).
 */
export async function getOrderById(orderId) {
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      // If backend lacks GET /api/orders/:id, fetch all and find
      const res = await api.get("/api/orders");
      const found = (res.data || []).find((o) => String(o.id) === String(orderId));
      return normalizeOrder(found || null);
    } catch {
      // fall back to mock
    }
  }
  const mock = buildMockOrders();
  return mock.find((o) => String(o.id) === String(orderId)) || null;
}

/**
 * PUBLIC_INTERFACE
 * getFrequentItems returns products sorted by frequency across past orders.
 */
export async function getFrequentItems(limit = 20) {
  const orders = await getPastOrders();
  const freq = new Map();
  const productMap = new Map();
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const pid = it?.product?.id;
      if (pid == null) return;
      freq.set(pid, (freq.get(pid) || 0) + (it.quantity || 1));
      productMap.set(pid, normalizeProduct(it.product));
    });
  });
  const items = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pid, count]) => ({
      product: productMap.get(pid),
      totalQuantity: count,
    }));
  return items;
}

/**
 * PUBLIC_INTERFACE
 * isBackendMode returns true if backend orders API was detected.
 */
export async function isBackendMode() {
  return await detectBackendAvailable();
}

/**
 * PUBLIC_INTERFACE
 * createOrder creates a new order snapshot (mock-first). If backend is available, it attempts
 * to create via backend and returns the normalized order. Otherwise stores to mock with new id.
 */
export async function createOrder({ items = [], total = 0, address = "", notes = "", shippingAddress = null, payment = null, membershipSnapshot = null }) {
  const now = new Date().toISOString();

  // Only keep safe payment meta for mock mode (avoid sensitive fields)
  const safePayment = (() => {
    if (!payment || typeof payment !== "object") return null;
    const method = payment.method || "COD";
    const meta = payment.meta || {};
    if (method === "CARD") {
      // store only last4 and non-sensitive meta
      const last4 = meta.cardLast4 || String(meta.last4 || "").slice(-4);
      return { method, meta: { cardLast4: last4 || "", nameOnCard: meta.nameOnCard || "", expiry: meta.expiry || "" } };
    }
    if (method === "UPI") {
      const upiId = meta.upiId || "";
      const masked = maskUpi(upiId);
      return { method, meta: { upiId, masked, upiName: meta.upiName || "" } };
    }
    if (method === "WALLET") {
      return { method, meta: { walletProvider: meta.walletProvider || "" } };
    }
    return { method: "COD", meta: {} };
  })();

  const payload = {
    status: "PLACED",
    created_at: now,
    updated_at: now,
    items: normalizeOrderItems(items),
    items_summary: (items || []).map((it) => `${it.product?.name || "Item"} x ${it.quantity || 1}`).join(", "),
    total_amount: Number(total || 0),
    address: address || "",
    shippingAddress: shippingAddress || null,
    notes: notes || "",
    payment: safePayment, // include on mock and pass to backend (if supported)
    membershipSnapshot: membershipSnapshot || null,
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
      return normalizeOrder({ ...res.data, payment: payload.payment });
    } catch {
      // fall back to mock
    }
  }
  // mock storage: reuse buildMockOrders format with localStorage persistence
  const orders = readLocalOrders();
  const nextId = (orders.reduce((max, o) => Math.max(max, Number(o.id || 0)), 0) || 0) + 1;
  const order = normalizeOrder({ id: nextId, ...payload });
  orders.unshift(order);
  writeLocalOrders(orders);
  return order;
}

/**
 * PUBLIC_INTERFACE
 * getOrders (new name) returns orders; wrapper over getPastOrders
 */
export async function getOrders() {
  return getPastOrders();
}

/**
 * PUBLIC_INTERFACE
 * getOrder (new name) returns one order; wrapper over getOrderById
 */
export async function getOrder(id) {
  return getOrderById(id);
}

/**
 * PUBLIC_INTERFACE
 * advanceStatus (mock-only): progress order to the next status; returns updated order.
 * If backend mode is on, returns null (UI should hide/disable).
 */
export async function advanceStatus(orderId) {
  const useBackend = await detectBackendAvailable();
  if (useBackend) return null;

  const orders = readLocalOrders();
  const idx = orders.findIndex((o) => String(o.id) === String(orderId));
  if (idx === -1) return null;

  const order = { ...orders[idx] };
  const currentIndex = ORDER_STATUSES.indexOf(order.status);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  if (nextIndex < ORDER_STATUSES.length) {
    const next = ORDER_STATUSES[nextIndex];
    order.status = next;
    order.updated_at = new Date().toISOString();
    order.timestamps = order.timestamps || {};
    order.timestamps[next] = order.timestamps[next] || order.updated_at;
    orders[idx] = order;
    writeLocalOrders(orders);
  }
  return normalizeOrder(orders[idx]);
}

// ---- Mock-only credit notes helpers for instant refunds ----
const CREDIT_NOTES_KEY = "ghub_order_credit_notes_v1";
function readCreditNotes() {
  try { return JSON.parse(localStorage.getItem(CREDIT_NOTES_KEY)) || {}; } catch { return {}; }
}
function writeCreditNotes(map) {
  try { localStorage.setItem(CREDIT_NOTES_KEY, JSON.stringify(map || {})); } catch {}
}

// PUBLIC_INTERFACE
export function addCreditNote(orderId, amount, note = "Instant refund credit") {
  /** Mock-only: attach a credit note to an order id for display. Does not affect payment flows. */
  const map = readCreditNotes();
  const entry = {
    id: `cred_${Date.now()}`,
    orderId,
    amount: Number(amount || 0),
    note,
    createdAt: new Date().toISOString(),
  };
  if (!map[orderId]) map[orderId] = [];
  map[orderId].push(entry);
  writeCreditNotes(map);
  return entry;
}

// PUBLIC_INTERFACE
export function getCreditNotes(orderId) {
  /** Mock-only: get credit notes for an order id. */
  const map = readCreditNotes();
  return map[orderId] || [];
}
