import React, { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function CheckoutPage(){
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const placeOrder = async () => {
    setLoading(true);
    setError("");
    try{
      const res = await api.post("/api/orders", { address });
      navigate("/orders");
    } catch(e){
      setError(e?.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Checkout</h2>
      <div className="list">
        <label>Shipping address</label>
        <textarea className="input" rows={4} placeholder="Enter your address (optional)" value={address} onChange={e=>setAddress(e.target.value)} />
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="row" style={{marginTop: 12}}>
        <button className="btn" onClick={()=>navigate("/cart")}>Back to Cart</button>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={placeOrder} disabled={loading}>{loading ? "Placing..." : "Place Order"}</button>
      </div>
    </div>
  );
}
