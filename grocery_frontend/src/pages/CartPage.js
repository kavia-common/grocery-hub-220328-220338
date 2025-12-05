import React, { useEffect, useState } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";

export default function CartPage(){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get("/api/cart")
      .then(res => setItems(res.data))
      .catch(e => setError(e?.response?.data?.message || "Failed to load cart"))
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{ load(); }, []);

  const update = async (id, quantity) => {
    try{
      const res = await api.put("/api/cart", { id, quantity });
      setItems(res.data);
    }catch(e){
      alert(e?.response?.data?.message || "Update failed");
    }
  };
  const removeItem = async (id) => update(id, 0);

  const total = items.reduce((sum, it)=> sum + (it.product?.price || 0) * it.quantity, 0);

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="card">
      <h2>Your Cart</h2>
      {items.length === 0 ? <p>Cart is empty. <Link to="/">Shop now</Link></p> : null}
      <div className="list">
        {items.map(it => (
          <div key={it.id} className="row" style={{justifyContent:"space-between"}}>
            <div>
              <strong>{it.product?.name}</strong>
              <div className="small">${(it.product?.price || 0).toFixed(2)} each</div>
            </div>
            <div className="row">
              <input className="input" type="number" min={0} value={it.quantity} onChange={e => update(it.id, parseInt(e.target.value || "0"))} style={{width: 90}} />
              <button className="btn" onClick={()=>removeItem(it.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{marginTop: 16}}>
        <div className="spacer" />
        <strong>Total: ${total.toFixed(2)}</strong>
        <button className="btn btn-primary" onClick={()=>navigate("/checkout")}>Checkout</button>
      </div>
    </div>
  );
}
