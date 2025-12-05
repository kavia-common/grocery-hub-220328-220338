import React, { useEffect, useState } from "react";
import api from "../api";

export default function OrdersPage(){
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(()=>{
    setLoading(true);
    api.get("/api/orders")
      .then(res => setOrders(res.data))
      .catch(e => setError(e?.response?.data?.message || "Failed to load orders"))
      .finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <h2>Your Orders</h2>
      {orders.length === 0 ? <p>No orders yet.</p> : null}
      <div className="list">
        {orders.map(o => (
          <div key={o.id} className="card">
            <div className="row" style={{justifyContent:"space-between"}}>
              <div><strong>Order #{o.id}</strong></div>
              <div>Status: <span className="badge">{o.status}</span></div>
            </div>
            <div className="small">Placed: {new Date(o.created_at).toLocaleString()}</div>
            <div className="list" style={{marginTop: 8}}>
              {o.items?.map(oi => (
                <div key={oi.id} className="row" style={{justifyContent:"space-between"}}>
                  <div>{oi.product?.name} x {oi.quantity}</div>
                  <div>${oi.price.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <div className="row" style={{marginTop: 8, justifyContent:"flex-end"}}>
              <strong>Total: ${o.total_amount.toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
