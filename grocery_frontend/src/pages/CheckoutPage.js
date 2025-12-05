import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import {
  computeDiscount,
  getAppliedCode,
  setAppliedCode,
  validateCoupon,
} from "../services/couponsService";
import { createOrder } from "../services/orderService";
import AddressSelector from "../components/AddressSelector";
import { useAddress } from "../addresses/AddressContext";
import PaymentMethodSelector from "../components/PaymentMethodSelector";
import { useNotifications } from "../notifications/NotificationsContext";
import { getPerkFlags, isMemberActive } from "../services/membershipsService";

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const navigate = useNavigate();
  const { selectedAddress } = useAddress();
  const { notify, NotificationTypes } = useNotifications();
  const [paymentValid, setPaymentValid] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [initialPaymentMethod, setInitialPaymentMethod] = useState(null);
  const [memberPerks, setMemberPerks] = useState({ freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });
  const [memberActive, setMemberActive] = useState(false);

  useEffect(() => {
    // load cart for totals preview
    api
      .get("/api/cart")
      .then((res) => setCartItems(res.data || []))
      .catch(() => setCartItems([]));
  }, []);

  useEffect(() => {
    try {
      const last = localStorage.getItem("lastSelectedPaymentMethod");
      if (last) setInitialPaymentMethod(last);
    } catch {}
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const [perks, active] = await Promise.all([getPerkFlags(), isMemberActive()]);
        setMemberPerks(perks || { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });
        setMemberActive(!!active);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const existing = getAppliedCode();
    if (existing) {
      setPromoInput(existing);
      // Validate silently using subtotal
      onApply(existing, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, it) => sum + (it.product?.price || 0) * it.quantity, 0),
    [cartItems]
  );

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
  // Membership extra discount applies AFTER coupons, BEFORE tax
  const extraPercent = Number(memberPerks.extraDiscountPercent || 0);
  const memberExtraDiscount = Math.max(0, (totalAfterDiscount * extraPercent) / 100);
  const afterAllDiscounts = totalAfterDiscount - memberExtraDiscount;

  // Shipping free if member perk enabled
  const shipping = memberPerks.freeDelivery ? 0 : 4.99; // default mock shipping when not free
  const taxRate = 0; // tax disabled in mock
  const tax = (afterAllDiscounts + shipping) * taxRate;
  const finalTotal = afterAllDiscounts + shipping + tax;

  const placeOrder = async () => {
    if (!paymentValid || !paymentData) {
      notify({ type: NotificationTypes.warning, message: "Please validate a payment method first" });
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Attempt backend order create
      await api
        .post("/api/orders", {
          address: selectedAddress ? `${selectedAddress.line1}, ${selectedAddress.city}` : "",
          promo_code: appliedCoupon?.code || null,
          payment: paymentData,
        })
        .catch(() => { /* ignore backend errors for mock-first */ });

      // Create an order in frontend service with snapshot of shippingAddress
      if (memberActive && (memberPerks.freeDelivery || extraPercent > 0)) {
        notify({ type: NotificationTypes.info, message: "Membership perks applied at checkout." });
      }

      const order = await createOrder({
        items: cartItems,
        total: finalTotal,
        address: selectedAddress ? `${selectedAddress.line1}, ${selectedAddress.city}` : "",
        notes: appliedCoupon?.code ? `Applied ${appliedCoupon.code}` : "",
        shippingAddress: selectedAddress ? {
          label: selectedAddress.label,
          name: selectedAddress.name,
          phone: selectedAddress.phone,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2,
          city: selectedAddress.city,
          state: selectedAddress.state,
          zip: selectedAddress.zip,
        } : null,
        payment: paymentData,
        membershipSnapshot: {
          active: memberActive,
          perks: memberPerks,
          couponCode: appliedCoupon?.code || null,
          breakdown: {
            couponDiscount: discount,
            membershipDiscount: memberExtraDiscount,
            shipping,
            subtotal,
            subtotalAfterCoupon: totalAfterDiscount,
            total: finalTotal,
          }
        }
      });

      // Optional: clear cart on frontend if backend didn't
      try {
        await api.delete("/api/cart");
      } catch {
        // ignore cart clear failures
      }

      notify({ type: NotificationTypes.success, message: "Order placed successfully" });
      navigate(`/orders/${order.id}`);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Checkout</h2>

      <div className="card" style={{ marginTop: 12 }}>
        <AddressSelector />
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
        </div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <button className="btn btn-secondary" onClick={() => onApply()}>
            Apply
          </button>
          {appliedCoupon ? (
            <button className="btn btn-ghost" onClick={onRemoveCoupon} title="Remove coupon">
              Remove
            </button>
          ) : null}
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

      {/* Payments */}
      <PaymentMethodSelector
        onValidityChange={setPaymentValid}
        onChange={setPaymentData}
        initialMethod={initialPaymentMethod}
      />

      {/* Membership perks info */}
      <div className="card" style={{ marginTop: 12, background: "linear-gradient(135deg, rgba(245,158,11,0.10), #ffffff)", border: "1px solid #FDE68A" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>Membership Perks</span>
            <div className="small" style={{ color: "#6b7280" }}>
              Discounts stack: coupon first, then membership extra discount. Applied before tax.
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="badge" style={{ background: memberPerks.freeDelivery ? "#DBEAFE" : "#F3F4F6", color: memberPerks.freeDelivery ? "#1E3A8A" : "#6b7280" }}>
              {memberPerks.freeDelivery ? "Free Delivery" : "Delivery Charged"}
            </span>
            <span className="badge" style={{ background: extraPercent > 0 ? "#DBEAFE" : "#F3F4F6", color: extraPercent > 0 ? "#1E3A8A" : "#6b7280" }}>
              Extra {extraPercent}% off
            </span>
            <span className="badge" style={{ background: memberPerks.earlyAccess ? "#DBEAFE" : "#F3F4F6", color: memberPerks.earlyAccess ? "#1E3A8A" : "#6b7280" }}>
              {memberPerks.earlyAccess ? "Early Access" : "No Early Access"}
            </span>
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>Subtotal</div>
          <div>${subtotal.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between", color: discount ? "#059669" : undefined }}>
          <div>
            Discount{" "}
            {appliedCoupon ? <span className="badge" style={{ marginLeft: 6 }}>{appliedCoupon.code}</span> : null}
          </div>
          <div>- ${discount.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between", color: memberExtraDiscount > 0 ? "#059669" : undefined }}>
          <div>Membership discount {extraPercent > 0 ? <span className="small">(after coupons)</span> : null}</div>
          <div>- ${memberExtraDiscount.toFixed(2)}</div>
        </div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>Shipping {memberPerks.freeDelivery ? <span className="badge" style={{ marginLeft: 6 }}>Free</span> : null}</div>
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

      {error ? <div className="error" style={{ marginTop: 8 }}>{error}</div> : null}
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => navigate("/cart")}>
          Back to Cart
        </button>
        <div className="spacer" />
        <button
          className="btn btn-primary"
          onClick={placeOrder}
          disabled={loading || !paymentValid}
          title={!paymentValid ? "Validate a payment method to continue" : "Place Order"}
        >
          {loading ? "Placing..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
