import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getOrders, paymentSummaryShort } from "../services/orderService";
import ReturnRequestModal from "../components/ReturnRequestModal";
import { useNavigate } from "react-router-dom";
import api from "../api";
import BuyAgain from "../components/BuyAgain";
import { useNotifications } from "../notifications/NotificationsContext";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { notify, NotificationTypes } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getOrders();
        if (active) setOrders(list);
      } catch (e) {
        if (active) setError("Failed to load orders");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const reorderOrder = useCallback(async (order) => {
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
    // Navigate to cart
    window.location.href = "/cart";
  }, [notify, NotificationTypes]);

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <>
      <div className="card">
        <h2 style={{ color: "#2563EB" }}>Your Orders</h2>
        <BuyAgain limit={8} />
        {orders.length === 0 ? <p>No orders yet.</p> : null}
        <div className="list">
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ borderLeft: "4px solid #2563EB" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>Order #{o.id}</strong>
                  <div className="small">Placed: {new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge">Status: {o.status}</span>
                  {o.payment ? <span className="badge" title="Payment Method">{paymentSummaryShort(o.payment)}</span> : null}
                  <button
                    onClick={() => reorderOrder(o)}
                    className="btn btn-primary"
                    aria-label={`Reorder order ${o.id}`}
                  >
                    Reorder this order
                  </button>
                  <Link className="btn btn-ghost" to={`/orders/${o.id}`}>Details</Link>
                </div>
              </div>
              <div className="list" style={{ marginTop: 8 }}>
                {(o.items || []).slice(0, 4).map((oi) => (
                  <div key={oi.id} className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div>{oi.product?.name} x {oi.quantity}</div>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <div>${Number(oi.price || oi.product?.price || 0).toFixed(2)}</div>
                      <button
                        className="btn btn-secondary"
                        aria-label={`Request return for ${oi.product?.name}`}
                        onClick={() => { setSelectedOrderId(o.id); setSelectedItem(oi); setModalOpen(true); }}
                      >
                        Return/Refund
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
                <strong>Total: ${Number(o.total_amount || 0).toFixed(2)}</strong>
                <Link className="btn btn-ghost" to={`/orders/${o.id}`}>View Details</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modalOpen && (
        <ReturnRequestModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          orderId={selectedOrderId}
          item={selectedItem}
          onCreated={() => {
            navigate("/returns");
          }}
        />
      )}
    </>
  );
}
