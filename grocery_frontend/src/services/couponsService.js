import api from "../api";
import { getMockCoupons } from "../mock/coupons";

const LS_COUPON_KEY = "applied_coupon_code";

/**
 * Normalize and basic shape check for coupons coming from backend.
 */
function normalizeCoupons(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((c) => ({
      code: String(c.code || "").trim().toUpperCase(),
      description: c.description || "",
      discountType: c.discountType === "flat" ? "flat" : "percent",
      value: Number(c.value || 0),
      eligibility: { ...(c.eligibility || {}) },
      expiry: c.expiry || null,
      tags: Array.isArray(c.tags) ? c.tags : [],
    }))
    .filter((c) => c.code && c.value > 0);
}

/**
 * PUBLIC_INTERFACE
 * fetchCoupons attempts backend fetch then falls back to local mock coupons.
 */
export async function fetchCoupons() {
  try {
    const res = await api.get("/api/coupons");
    const normalized = normalizeCoupons(res.data);
    return normalized.length ? normalized : normalizeCoupons(getMockCoupons());
  } catch {
    return normalizeCoupons(getMockCoupons());
  }
}

/**
 * PUBLIC_INTERFACE
 * findCouponByCode returns a coupon object or null by case-insensitive code.
 */
export async function findCouponByCode(code) {
  const coupons = await fetchCoupons();
  const target = String(code || "").trim().toUpperCase();
  return coupons.find((c) => c.code === target) || null;
}

/**
 * Check if coupon is expired relative to now.
 */
function isExpired(coupon) {
  if (!coupon?.expiry) return false;
  try {
    const now = new Date();
    const exp = new Date(coupon.expiry);
    return exp.getTime() < now.getTime();
  } catch {
    return false;
  }
}

/**
 * PUBLIC_INTERFACE
 * validateCoupon ensures the coupon exists, is not expired, and meets eligibility rules.
 * Returns { valid: boolean, reason?: string, coupon?: object }
 */
export async function validateCoupon(code, subtotal) {
  const coupon = await findCouponByCode(code);
  if (!coupon) {
    return { valid: false, reason: "Invalid code." };
  }
  if (isExpired(coupon)) {
    return { valid: false, reason: "This offer has expired." };
  }
  const min = Number(coupon.eligibility?.minSubtotal || 0);
  if (Number(subtotal || 0) < min) {
    return {
      valid: false,
      reason: `Minimum subtotal of $${min.toFixed(2)} required.`,
      coupon,
    };
  }
  return { valid: true, coupon };
}

/**
 * PUBLIC_INTERFACE
 * computeDiscount returns the discount number for given subtotal and coupon.
 * Ensures discount never exceeds subtotal and returns { discount, totalAfterDiscount }.
 */
export function computeDiscount(subtotal, coupon) {
  const sub = Math.max(0, Number(subtotal || 0));
  if (!coupon) return { discount: 0, totalAfterDiscount: sub };
  let discount = 0;
  if (coupon.discountType === "flat") {
    discount = Math.max(0, Math.min(sub, Number(coupon.value || 0)));
  } else {
    const pct = Math.max(0, Math.min(100, Number(coupon.value || 0)));
    discount = (sub * pct) / 100;
  }
  const totalAfterDiscount = Math.max(0, sub - discount);
  return { discount, totalAfterDiscount };
}

/**
 * PUBLIC_INTERFACE
 * getAppliedCode reads persisted coupon code from localStorage.
 */
export function getAppliedCode() {
  try {
    return localStorage.getItem(LS_COUPON_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * PUBLIC_INTERFACE
 * setAppliedCode persists coupon code in localStorage (empty string clears).
 */
export function setAppliedCode(code) {
  try {
    if (code) {
      localStorage.setItem(LS_COUPON_KEY, String(code).toUpperCase());
    } else {
      localStorage.removeItem(LS_COUPON_KEY);
    }
  } catch {
    // ignore persistence failure
  }
}
