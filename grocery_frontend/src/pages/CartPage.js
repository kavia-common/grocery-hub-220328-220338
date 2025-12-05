import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  computeDiscount,
  getAppliedCode,
  setAppliedCode,
  validateCoupon,
} from "../services/couponsService";

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const navigate = useNavigate();
  const loc = useLocation();

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + (it.product?.price || 0) * it.quantity, 0),
    [items]
  );

  const load = () => {
    setLoading(true);
    api
      .get("/api/cart")
      .then((res) => setItems(res.data))
      .catch((e) => setError(e?.response?.data?.message || "Failed to load cart"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  // Initialize promo code from localStorage or query param
  useEffect(() => {
    const q = new URLSearchParams(loc.search);
    const codeFromQuery = q.get("code");
    const persisted = getAppliedCode();
    const initial = codeFromQuery || persisted || "";
    if (initial) {
      setPromoInput(initial.toUpperCase());
      onApply(initial.toUpperCase(), true);
    }
  }, [loc.key]);

  const update = async (id, quantity) => {
    try {
      const res = await api.put("/api/cart", { id, quantity });
      setItems(res.data);
    } catch (e) {
      alert(e?.response?.data?.message || "Update failed");
    }
  };
  const removeItem = async (id) => update(id, 0);

  const onApply = async (code, silent = false) => {
    const c = (code ?? promoInput).trim().toUpperCase();
    if (!c) {
      setPromoError("Enter a code");
      setAppliedCoupon(null);
      setAppliedCode("");
      return;
    }
    setPromoError("");
    const res = await validateCoupon(c, subtotal);
    if (!res.valid) {
      setAppliedCoupon(res.coupon || null);
      setPromoError(res.reason || "Invalid code");
      setAppliedCode("");
      if (!silent) alert(res.reason || "Invalid code");
      return;
    }
    setAppliedCoupon(res.coupon);
    setAppliedCode(c);
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setAppliedCode("");
    setPromoInput("");
    setPromoError("");
  };

  const { discount, totalAfterDiscount } = computeDiscount(subtotal, appliedCoupon);
  const shipping = 0; // For simplicity; integrate real shipping if present
  const taxRate = 0; // For simplicity; integrate real tax if present
  const tax = (totalAfterDiscount + shipping) * taxRate;
  const finalTotal = totalAfterDiscount + shipping + tax;

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <p>
          Cart is empty. <Link to="/">Shop now</Link>
        </p>
      ) : null}
      <div className="list">
        {items.map((it) => (
          <div key={it.id} className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <strong>{it.product?.name}</strong>
              <div className="small">${(it.product?.price || 0).toFixed(2)} each</div>
            </div>
            <div className="row">
              <input
                className="input"
                type="number"
                min={0}
                value={it.quantity}
                onChange={(e) => update(it.id, parseInt(e.target.value || "0"))}
                style={{ width: 90 }}
              />
              <button className="btn" onClick={() => removeItem(it.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Promo code box */}
      <div
        className="card"
        style={{
          marginTop: 12,
          background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(255,255,255,1))",
        }}
      >
        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Enter promo code"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
            style={{ maxWidth: 220 }}
          />
          <button className="btn btn-secondary" onClick={() => onApply()}>
            Apply
          </button>
          {appliedCoupon ? (
            <button className="btn btn-ghost" onClick={onRemoveCoupon} title="Remove coupon">
              Remove
            </button>
          ) : null}
          <div className="spacer" />
          <button className="btn btn-ghost" onClick={() => navigate("/coupons")}>
            Browse Offers
          </button>
        </div>
        {promoError ? <div className="small" style={{ color: "var(--error)", marginTop: 6 }}>{promoError}</div> : null}
        {appliedCoupon ? (
          <div className="small" style={{ marginTop: 6, color: "#065F46" }}>
            Applied {appliedCoupon.code} •{" "}
            {appliedCoupon.discountType === "percent"
              ? `${appliedCoupon.value}%`
              : `$${Number(appliedCoupon.value).toFixed(2)}`}{" "}
            off
          </div>
        ) : null}
      </div>

      {/* Totals */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>Subtotal</div>
          <div>${subtotal.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between", color: discount ? "#059669" : undefined }}>
          <div>Discount {appliedCoupon ? <span className="badge" style={{ marginLeft: 6 }}>{appliedCoupon.code}</span> : null}</div>
          <div>- ${discount.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>Shipping</div>
          <div>${shipping.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>Tax</div>
          <div>${tax.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between", fontWeight: 700, marginTop: 6 }}>
          <div>Total</div>
          <div>${finalTotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 16 }}>
        <div className="spacer" />
        <button
          className="btn btn-primary"
          onClick={() => navigate("/checkout")}
          title="Proceed to checkout"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
