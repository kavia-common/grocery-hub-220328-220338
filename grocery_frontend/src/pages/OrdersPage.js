import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../services/orderService";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <h2>Your Orders</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : null}
      <div className="list">
        {orders.map((o) => (
          <div key={o.id} className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>Order #{o.id}</strong>
                <div className="small">Placed: {new Date(o.created_at).toLocaleString()}</div>
              </div>
              <div>
                Status: <span className="badge">{o.status}</span>
              </div>
            </div>
            <div className="list" style={{ marginTop: 8 }}>
              {o.items?.map((oi) => (
                <div key={oi.id} className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    {oi.product?.name} x {oi.quantity}
                  </div>
                  <div>${Number(oi.price || oi.product?.price || 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
              <strong>Total: ${Number(o.total_amount || 0).toFixed(2)}</strong>
              <Link className="btn btn-ghost" to={`/orders/${o.id}`}>
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
