import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";

export default function ProductDetail(){
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const { token } = useAuth();

  useEffect(()=>{
    setLoading(true);
    api.get(`/api/products/${id}`)
    .then(res => setP(res.data))
    .catch(e => setError(e?.response?.data?.message || "Failed to load product"))
    .finally(()=>setLoading(false));
  }, [id]);

  const addToCart = async () => {
    if (!token) { setError("Please login to add to cart"); return; }
    try{
      await api.post("/api/cart", { product_id: p.id, quantity: qty });
      alert("Added to cart");
    }catch(e){
      setError(e?.response?.data?.message || "Failed to add to cart");
    }
  }

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!p) return null;

  return (
    <div className="card">
      <div className="row" style={{alignItems: "flex-start"}}>
        <img alt={p.name} src={p.image_url || "https://via.placeholder.com/500x350?text=Grocery"} style={{width: 360, height: 240, objectFit:"cover", borderRadius: 12}} />
        <div style={{paddingLeft: 16}}>
          <h2>{p.name}</h2>
          <div className="badge">{p.category}</div>
          <p style={{marginTop: 8}}>{p.description}</p>
          <h3>${p.price.toFixed(2)}</h3>
          <div className="row" style={{marginTop: 8}}>
            <input className="input" type="number" value={qty} min={1} onChange={e=>setQty(parseInt(e.target.value || "1"))} style={{width:100}} />
            <button className="btn btn-primary" onClick={addToCart}>Add to Cart</button>
          </div>
        </div>
      </div>
    </div>
  );
}
