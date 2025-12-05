import React, { useEffect, useMemo, useState } from "react";
import { useNotifications } from "../notifications/NotificationsContext";
import { cancel, computeYearlySavings, getCurrentMembership, getPerkFlags, getPlans, isMemberActive, subscribe } from "../services/membershipsService";

/**
 * PUBLIC_INTERFACE
 * MembershipsPage lists plans, allows subscription management, and displays perk details.
 */
export default function MembershipsPage() {
  const [plans, setPlans] = useState([]);
  const [cycle, setCycle] = useState("monthly"); // monthly|yearly
  const [current, setCurrent] = useState(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [perks, setPerks] = useState({ freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });

  const { notify, NotificationTypes } = useNotifications();

  const load = async () => {
    setLoading(true);
    try {
      const [p, cur, act, pf] = await Promise.all([getPlans(), getCurrentMembership(), isMemberActive(), getPerkFlags()]);
      setPlans(p || []);
      setCurrent(cur || null);
      setActive(!!act);
      setPerks(pf || { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubscribe = async (planId) => {
    const state = await subscribe(planId, cycle);
    setCurrent(state);
    setActive(state?.status === "active");
    notify({ type: NotificationTypes.success, message: `Subscribed to ${state?.planName || "membership"}` });
  };

  const onCancel = async () => {
    const state = await cancel();
    setCurrent(state);
    setActive(state?.status === "active");
    notify({ type: NotificationTypes.success, message: `Membership canceled` });
  };

  const displayPlans = useMemo(() => {
    // Ensure unique plans with names, treat plus-monthly/yearly cohesively for display
    return (plans || []).map((p) => {
      const savings = computeYearlySavings(p);
      return { ...p, savings };
    });
  }, [plans]);

  return (
    <div className="card" style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.06), #ffffff)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, color: "#2563EB" }}>Memberships</h2>
          <div className="small">Enjoy free delivery, extra discounts, and early access to exclusive deals.</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="small">Billing</span>
          <div className="row" style={{ gap: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 999, padding: 4 }}>
            <button
              className="btn btn-ghost"
              onClick={() => setCycle("monthly")}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: cycle === "monthly" ? "rgba(37,99,235,0.1)" : "transparent",
                color: cycle === "monthly" ? "#2563EB" : "#111827",
              }}
            >
              Monthly
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setCycle("yearly")}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: cycle === "yearly" ? "rgba(245,158,11,0.15)" : "transparent",
                color: cycle === "yearly" ? "#92400E" : "#111827",
              }}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ marginTop: 12 }}>Loading plans...</div>
      ) : (
        <div className="grid" style={{ marginTop: 12 }}>
          {displayPlans.map((p) => {
            const price =
              cycle === "yearly"
                ? Number(p.priceYearly || 0)
                : Number(p.priceMonthly || 0);
            const isCurrent = current && (current.planId === p.id || current.planName === p.name);
            const showSavings =
              cycle === "yearly" && p.priceMonthly > 0 && p.priceYearly > 0;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  border: isCurrent ? "2px solid #2563EB" : "1px solid #e5e7eb",
                  boxShadow: isCurrent ? "0 6px 18px rgba(37,99,235,0.18)" : "0 1px 2px rgba(0,0,0,0.04)",
                  background: p.highlight
                    ? "linear-gradient(180deg, rgba(37,99,235,0.06), #ffffff)"
                    : "#ffffff",
                }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{p.name}</div>
                    <div className="small" style={{ marginTop: 2 }}>{p.description}</div>
                  </div>
                  {showSavings ? (
                    <span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>
                      Save up to {computeYearlySavings(p)}%
                    </span>
                  ) : null}
                </div>

                <div className="row" style={{ alignItems: "baseline", marginTop: 10 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#2563EB" }}>${price.toFixed(2)}</div>
                  <div className="small" style={{ color: "#6b7280" }}>/ {cycle}</div>
                </div>

                <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                  <li>{p.perks?.freeDelivery ? "Free Delivery on all orders" : "Standard delivery rates"}</li>
                  <li>{p.perks?.extraDiscountPercent ? `Extra ${p.perks.extraDiscountPercent}% off eligible items` : "No extra discounts"}</li>
                  <li>{p.perks?.earlyAccess ? "Early access to deals and sales" : "No early access"}</li>
                </ul>

                <div className="row" style={{ marginTop: 10 }}>
                  {isCurrent && active ? (
                    <>
                      <span className="badge ok">Active</span>
                      {current?.renewalDate ? (
                        <span className="small">Renews: {new Date(current.renewalDate).toLocaleDateString()}</span>
                      ) : null}
                      <div className="spacer" />
                      <button className="btn" onClick={onCancel} style={{ border: "1px solid #e5e7eb" }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="spacer" />
                      <button
                        className="btn btn-primary"
                        onClick={() => onSubscribe(p.id)}
                        title={`Subscribe to ${p.name} (${cycle})`}
                      >
                        {price > 0 ? "Subscribe" : "Choose"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <strong>Current perks</strong>
        <div className="row" style={{ marginTop: 6, flexWrap: "wrap", gap: 8 }}>
          <span className={`badge ${perks.freeDelivery ? "ok" : ""}`} style={{ background: perks.freeDelivery ? "#DBEAFE" : "#F3F4F6", color: perks.freeDelivery ? "#1E3A8A" : "#6b7280" }}>
            {perks.freeDelivery ? "Free Delivery: ON" : "Free Delivery: OFF"}
          </span>
          <span className={`badge ${perks.extraDiscountPercent > 0 ? "ok" : ""}`} style={{ background: perks.extraDiscountPercent > 0 ? "#DBEAFE" : "#F3F4F6", color: perks.extraDiscountPercent > 0 ? "#1E3A8A" : "#6b7280" }}>
            Extra Discount: {perks.extraDiscountPercent || 0}%
          </span>
          <span className={`badge ${perks.earlyAccess ? "ok" : ""}`} style={{ background: perks.earlyAccess ? "#DBEAFE" : "#F3F4F6", color: perks.earlyAccess ? "#1E3A8A" : "#6b7280" }}>
            {perks.earlyAccess ? "Early Access: ON" : "Early Access: OFF"}
          </span>
        </div>
        <div className="small" style={{ marginTop: 6, color: "#6b7280" }}>
          Discounts stack: coupons apply first, then membership extra discount. Membership discount applies on subtotal after coupons and before tax.
        </div>
      </div>
    </div>
  );
}
