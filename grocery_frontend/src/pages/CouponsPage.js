import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCoupons, setAppliedCode } from "../services/couponsService";

/**
 * PUBLIC_INTERFACE
 * CouponsPage lists available coupons with an Apply action redirecting to Cart with the code prefilled.
 */
export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await fetchCoupons();
        if (active) setCoupons(list);
      } catch (e) {
        if (active) setError("Failed to load coupons");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const apply = (code) => {
    setAppliedCode(code);
    navigate(`/cart?code=${encodeURIComponent(code)}`);
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Available Offers & Coupons</h2>
      </div>
      <div className="list" style={{ marginTop: 8 }}>
        {coupons.map((c) => {
          const expired = c.expiry ? new Date(c.expiry).getTime() < Date.now() : false;
          return (
            <div
              key={c.code}
              className="row"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px dashed #d1d5db",
                padding: 12,
                borderRadius: 12,
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(249,250,251,1))",
              }}
            >
              <div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <strong style={{ color: "var(--primary)", letterSpacing: 0.5 }}>
                    {c.code}
                  </strong>
                  {Array.isArray(c.tags) && c.tags.includes("special") ? (
                    <span className="badge" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
                      Special
                    </span>
                  ) : null}
                  {expired ? (
                    <span className="badge" style={{ background: "#FEE2E2", color: "#991B1B" }}>
                      Expired
                    </span>
                  ) : null}
                </div>
                <div className="small" style={{ marginTop: 4 }}>{c.description}</div>
                <div className="small" style={{ marginTop: 2, color: "#374151" }}>
                  {c.discountType === "percent" ? `${c.value}% off` : `$${Number(c.value).toFixed(2)} off`}
                  {c.eligibility?.minSubtotal
                    ? ` • Min. subtotal $${Number(c.eligibility.minSubtotal).toFixed(2)}`
                    : ""}
                  {c.expiry ? ` • Expires ${new Date(c.expiry).toLocaleDateString()}` : ""}
                </div>
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={() => apply(c.code)}
                  disabled={expired}
                  title={expired ? "Offer expired" : "Apply coupon"}
                >
                  Apply
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
