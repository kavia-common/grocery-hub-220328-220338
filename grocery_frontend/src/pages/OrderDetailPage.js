import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import OrderTrackingStepper from "../components/OrderTrackingStepper";
import { advanceStatus, getOrder, isBackendMode, paymentSummaryShort } from "../services/orderService";
import BuyAgain from "../components/BuyAgain";
import { useNotifications } from "../notifications/NotificationsContext";
import api from "../api";
import ReturnRequestModal from "../components/ReturnRequestModal";

/**
 * PUBLIC_INTERFACE
 * OrderDetailPage shows a single order with tracking, items, totals and reorder.
 */
export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backendMode, setBackendMode] = useState(true);
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { notify, NotificationTypes } = useNotifications();

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [o, mode] = await Promise.all([getOrder(orderId), isBackendMode()]);
      setOrder(o);
      setBackendMode(mode);
    } catch (e) {
      setError("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const onAdvance = async () => {
    try {
      const updated = await advanceStatus(orderId);
      if (updated) setOrder(updated);
    } catch {
      // ignore
    }
  };

  const reorder = useCallback(async () => {
    if (!order) return;
    const items = (order.items || []);
    const inStockItems = items.filter((it) => {
      const p = it?.product;
      if (!p) return false;
      const stockQty = typeof p.stockQty === "number" ? p.stockQty : (typeof p.stock === "number" ? p.stock : 0);
      const isInStock = p.isInStock ?? stockQty > 0;
      return isInStock;
    });
    const skipped = items.filter((it) => !inStockItems.includes(it));

    await Promise.all(inStockItems.map(it =>
      api.post("/api/cart", { product_id: it.product.id, quantity: it.quantity || 1 }).catch(() => null)
    ));

    const addedCount = inStockItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
    if (addedCount > 0) {
      notify({ type: NotificationTypes.success, message: `Re-added ${addedCount} item(s) to your cart` });
    }
    if (skipped.length > 0) {
      const names = skipped.map(s => s.product?.name).filter(Boolean).slice(0, 3).join(", ");
      notify({ type: NotificationTypes.warning, message: `Skipped out-of-stock: ${names}${skipped.length > 3 ? "…" : ""}` });
    }
    navigate("/cart");
  }, [order, notify, NotificationTypes, navigate]);

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!order) return <div className="card">Order not found</div>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0, color: "#2563EB" }}>Order #{order.id}</h2>
          <div className="small">Placed: {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">Status: {order.status}</span>
          <button className="btn btn-primary" onClick={reorder}>Reorder this order</button>
          <button className="btn" onClick={() => navigate("/orders")}>Back to Orders</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12, background: "linear-gradient(135deg, rgba(37,99,235,0.06), #ffffff)" }}>
        <OrderTrackingStepper status={order.status} timestamps={order.timestamps} />
        {!backendMode ? (
          <div className="row" style={{ marginTop: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={onAdvance}
              disabled={order.status === "DELIVERED"}
              title="Advance order status (mock mode only)"
            >
              Advance Status
            </button>
            <div className="small" style={{ color: "#6b7280" }}>
              Mock mode detected. Use this to simulate progress.
            </div>
          </div>
        ) : null}
      </div>

      {order.membershipSnapshot ? (
        <div className="card" style={{ marginTop: 12, background: "linear-gradient(135deg, rgba(245,158,11,0.10), #ffffff)", border: "1px solid #FDE68A" }}>
          <strong>Membership perks applied</strong>
          <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: order.membershipSnapshot.perks?.freeDelivery ? "#DBEAFE" : "#F3F4F6", color: order.membershipSnapshot.perks?.freeDelivery ? "#1E3A8A" : "#6b7280" }}>
              {order.membershipSnapshot.perks?.freeDelivery ? "Free Delivery" : "Delivery Charged"}
            </span>
            <span className="badge" style={{ background: (order.membershipSnapshot.perks?.extraDiscountPercent || 0) > 0 ? "#DBEAFE" : "#F3F4F6", color: (order.membershipSnapshot.perks?.extraDiscountPercent || 0) > 0 ? "#1E3A8A" : "#6b7280" }}>
              Extra {order.membershipSnapshot.perks?.extraDiscountPercent || 0}% off
            </span>
            <span className="badge" style={{ background: order.membershipSnapshot.perks?.earlyAccess ? "#DBEAFE" : "#F3F4F6", color: order.membershipSnapshot.perks?.earlyAccess ? "#1E3A8A" : "#6b7280" }}>
              {order.membershipSnapshot.perks?.earlyAccess ? "Early Access" : "No Early Access"}
            </span>
          </div>
          {order.membershipSnapshot.breakdown ? (
            <div className="small" style={{ marginTop: 6, color: "#6b7280" }}>
              Coupon: -${Number(order.membershipSnapshot.breakdown.couponDiscount || 0).toFixed(2)} · Membership: -${Number(order.membershipSnapshot.breakdown.membershipDiscount || 0).toFixed(2)} · Shipping: ${Number(order.membershipSnapshot.breakdown.shipping || 0).toFixed(2)}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Items</strong>
          <div className="small">{order.items?.length || 0} item(s)</div>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {(order.items || []).map((it) => {
            const p = it.product;
            const inStock = p?.isInStock ?? (typeof p?.stockQty === "number" ? p.stockQty > 0 : true);
            return (
              <div key={it.id} className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div>{p?.name || "Item"}</div>
                  <div className="small">Qty: {it.quantity}</div>
                </div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <div>${Number(it.price || p?.price || 0).toFixed(2)}</div>
                  <button
                    className="btn btn-secondary"
                    disabled={!inStock}
                    onClick={() =>
                      api.post("/api/cart", { product_id: p.id, quantity: it.quantity || 1 })
                        .then(() => notify({ type: NotificationTypes.success, message: `Added ${p.name} again` }))
                        .catch(() => notify({ type: NotificationTypes.error, message: "Failed to add" }))
                    }
                  >
                    Add again
                  </button>
                  <button
                    className="btn btn-primary"
                    aria-label={`Request return for ${p?.name || "item"}`}
                    onClick={() => { setSelectedItem(it); setModalOpen(true); }}
                  >
                    Return/Refund
                  </button>
                  {!inStock && <span className="small" style={{ color: "#6b7280" }}>Out of stock — Remind me</span>}
                </div>
              </div>
            );
          })}
          {modalOpen && (
            <ReturnRequestModal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              orderId={order?.id}
              item={selectedItem}
              onCreated={() => {
                navigate("/returns");
              }}
            />
          )}
        </div>
        <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
          <strong>Total: ${Number(order.total_amount || 0).toFixed(2)}</strong>
        </div>
      </div>

      <BuyAgain limit={6} />

      {order.payment ? (
        <div className="card" style={{ marginTop: 12 }}>
          <strong>Payment</strong>
          <div className="small" style={{ marginTop: 6 }}>{paymentSummaryShort(order.payment)}</div>
        </div>
      ) : null}

      {(order.shippingAddress || order.address) ? (
        <div className="card" style={{ marginTop: 12 }}>
          <strong>Shipping Address</strong>
          {order.shippingAddress ? (
            <div style={{ marginTop: 6 }}>
              <div><strong>{order.shippingAddress.label}</strong> • {order.shippingAddress.name} • {order.shippingAddress.phone}</div>
              <div>{order.shippingAddress.line1}{order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ""}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</div>
            </div>
          ) : (
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{order.address}</div>
          )}
        </div>
      ) : null}

      <div className="row" style={{ marginTop: 12 }}>
        <Link to="/" className="btn btn-ghost">Continue Shopping</Link>
      </div>
    </div>
  );
}
