import api from "../api";

/**
 * Memberships service (mock-first with backend fallback).
 * Provides plans list, current membership, subscribe/cancel, and helpers.
 * Persistence via backend (/api/memberships/*) if available, else localStorage.
 */

const LS_KEY_STATE = "ghub_membership_state_v1";
const LS_KEY_PLANS = "ghub_membership_plans_v1";

// Default mock plans
const MOCK_PLANS = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceYearly: 0,
    billingCycle: "none",
    perks: { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false },
    description: "Basic access to store and offers",
    highlight: false,
  },
  {
    id: "plus-monthly",
    name: "Plus",
    priceMonthly: 7.99,
    priceYearly: 79.99,
    billingCycle: "monthly",
    perks: { freeDelivery: true, extraDiscountPercent: 3, earlyAccess: true },
    description: "Free delivery + extra 3% off eligible items + early access",
    highlight: true,
  },
  {
    id: "plus-yearly",
    name: "Plus Yearly",
    priceMonthly: 7.99,
    priceYearly: 79.99,
    billingCycle: "yearly",
    perks: { freeDelivery: true, extraDiscountPercent: 3, earlyAccess: true },
    description: "Yearly billing for best savings",
    highlight: true,
  },
];

let backendAvailableCache = null;
async function detectBackendAvailable() {
  if (backendAvailableCache !== null) return backendAvailableCache;
  try {
    // Probe for any memberships endpoint existence
    await api.get("/api/memberships/plans", { timeout: 2000 });
    backendAvailableCache = true;
  } catch {
    backendAvailableCache = false;
  }
  return backendAvailableCache;
}

function readLocalState() {
  try {
    const raw = localStorage.getItem(LS_KEY_STATE);
    const obj = raw ? JSON.parse(raw) : null;
    if (!obj) return null;
    return obj;
  } catch {
    return null;
  }
}
function writeLocalState(state) {
  try {
    localStorage.setItem(LS_KEY_STATE, JSON.stringify(state || null));
  } catch {}
}
function readLocalPlans() {
  try {
    const raw = localStorage.getItem(LS_KEY_PLANS);
    const arr = raw ? JSON.parse(raw) : null;
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return MOCK_PLANS;
}
function writeLocalPlans(plans) {
  try {
    localStorage.setItem(LS_KEY_PLANS, JSON.stringify(plans || []));
  } catch {}
}

function normalizeMembershipState(state) {
  if (!state) return null;
  const safePerks = state.perks || { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false };
  return {
    id: state.id || null, // subscription id or plan id
    planId: state.planId || "free",
    planName: state.planName || "Free",
    cycle: state.cycle || "monthly", // monthly|yearly|none
    status: state.status || "canceled", // active|canceled
    renewalDate: state.renewalDate || null,
    perks: {
      freeDelivery: !!safePerks.freeDelivery,
      extraDiscountPercent: Number(safePerks.extraDiscountPercent || 0),
      earlyAccess: !!safePerks.earlyAccess,
    },
  };
}

// PUBLIC_INTERFACE
export async function getPlans() {
  /** Return available plans, backend first, fallback to mock/local. */
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.get("/api/memberships/plans");
      const plans = Array.isArray(res.data) ? res.data : [];
      if (plans.length) {
        writeLocalPlans(plans);
        return plans;
      }
    } catch {
      // fall through
    }
  }
  return readLocalPlans();
}

// PUBLIC_INTERFACE
export async function getCurrentMembership() {
  /** Get current membership state if subscribed, else null (treated as Free). */
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.get("/api/memberships/current");
      return normalizeMembershipState(res.data);
    } catch {
      // fall through to local
    }
  }
  return normalizeMembershipState(readLocalState());
}

// PUBLIC_INTERFACE
export async function subscribe(planId, cycle = "monthly") {
  /** Subscribe to a plan, either via backend or local persistence. */
  const plans = await getPlans();
  const plan = plans.find((p) => p.id === planId || (p.id?.startsWith("plus") && planId === "plus"));
  const chosen = plan || plans.find((p) => p.id === "plus-monthly") || plans[0];

  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.post("/api/memberships/subscribe", { planId: chosen.id, cycle });
      return normalizeMembershipState(res.data);
    } catch {
      // fall through to local
    }
  }
  const now = new Date();
  const renewalDate =
    cycle === "yearly"
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  const state = normalizeMembershipState({
    id: `local-${chosen.id}`,
    planId: chosen.id,
    planName: chosen.name,
    cycle,
    status: "active",
    renewalDate,
    perks: chosen.perks,
  });
  writeLocalState(state);
  return state;
}

// PUBLIC_INTERFACE
export async function cancel() {
  /** Cancel current membership, retain perks until end of billing (mock simplified -> immediate). */
  const useBackend = await detectBackendAvailable();
  if (useBackend) {
    try {
      const res = await api.post("/api/memberships/cancel");
      return normalizeMembershipState(res.data);
    } catch {
      // continue to local
    }
  }
  const current = normalizeMembershipState(readLocalState());
  if (!current) return null;
  const canceled = { ...current, status: "canceled" };
  writeLocalState(canceled);
  return canceled;
}

// PUBLIC_INTERFACE
export async function isMemberActive() {
  /** Return boolean if current membership is active. */
  const cur = await getCurrentMembership();
  return !!cur && cur.status === "active";
}

// PUBLIC_INTERFACE
export async function getPerkFlags() {
  /** Return safe perks object even for free users. */
  const cur = await getCurrentMembership();
  return cur?.perks || { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false };
}

// INTERNAL: compute savings for yearly vs monthly pricing
export function computeYearlySavings(plan) {
  if (!plan) return 0;
  const m = Number(plan.priceMonthly || 0);
  const y = Number(plan.priceYearly || 0);
  if (m <= 0 || y <= 0) return 0;
  const monthlyEquivalent = y / 12;
  const savingsPercent = m > 0 ? Math.max(0, Math.round(((m - monthlyEquivalent) / m) * 100)) : 0;
  return savingsPercent;
}
