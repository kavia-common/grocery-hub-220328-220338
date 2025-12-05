import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";

export default function ProductGrid() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const { token } = useAuth();

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/api/products", { params: { search: search || undefined, category: category || undefined } })
      .then((res) => setItems(res.data))
      .catch((e) => setError(e?.response?.data?.message || "Failed to load products"))
      .finally(() => setLoading(false));
  }, [search, category]);

  const addToCart = async (productId) => {
    if (!token) {
      setError("Please login to add to cart");
      return;
    }
    try {
      await api.post("/api/cart", { product_id: productId, quantity: 1 });
      alert("Added to cart");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to add to cart");
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="grid">
      {items.map((p) => (
        <div key={p.id} className="card product-card">
          <Link to={`/product/${p.id}`}>
            <img alt={p.name} src={p.image_url || "https://via.placeholder.com/400x300?text=Grocery"} />
          </Link>
          <div className="row" style={{justifyContent:"space-between", marginTop: 8}}>
            <div>
              <Link to={`/product/${p.id}`}><strong>{p.name}</strong></Link>
              <div className="small">{p.category}</div>
            </div>
            <div><strong>${p.price.toFixed(2)}</strong></div>
          </div>
          <div className="row" style={{marginTop: 8}}>
            <button className="btn btn-primary" onClick={()=>addToCart(p.id)}>Add to Cart</button>
            <div className="spacer" />
            <Link className="btn btn-ghost" to={`/product/${p.id}`}>View</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
