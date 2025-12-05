import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import OrderTrackingStepper from "../components/OrderTrackingStepper";
import { advanceStatus, getOrder, isBackendMode } from "../services/orderService";

/**
 * PUBLIC_INTERFACE
 * OrderDetailPage shows a single order with tracking, items, and totals.
 */
export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [backendMode, setBackendMode] = useState(true);
  const navigate = useNavigate();

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

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!order) return <div className="card">Order not found</div>;

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Order #{order.id}</h2>
          <div className="small">Placed: {new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">Status: {order.status}</span>
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

      <div className="card" style={{ marginTop: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong>Items</strong>
          <div className="small">{order.items?.length || 0} item(s)</div>
        </div>
        <div className="list" style={{ marginTop: 8 }}>
          {(order.items || []).map((it) => (
            <div key={it.id} className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div>{it.product?.name || "Item"}</div>
                <div className="small">Qty: {it.quantity}</div>
              </div>
              <div>${Number(it.price || it.product?.price || 0).toFixed(2)}</div>
            </div>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
          <strong>Total: ${Number(order.total_amount || 0).toFixed(2)}</strong>
        </div>
      </div>

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
