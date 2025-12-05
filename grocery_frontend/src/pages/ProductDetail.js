import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { useWishlist } from "../wishlist/WishlistContext";
import { fetchProductById } from "../services/productByIdService";

/**
 * PUBLIC_INTERFACE
 * ProductDetail shows a single product with prominent image and price.
 * Assumes backend returns: { id, name, description, category, image_url, price }
 * Enhancements: wishlist heart toggle (localStorage-backed) and Quick Buy (adds 1 to cart, navigates to checkout).
 */
export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const { token } = useAuth();
  const { isFavorite, toggle } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await fetchProductById(id);
        if (active) setP(data);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "Failed to load product");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const addToCart = async () => {
    if (!token) {
      setError("Please login to add to cart");
      return;
    }
    try {
      await api.post("/api/cart", { product_id: p.id, quantity: qty });
      alert("Added to cart");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add to cart");
    }
  };

  const quickBuy = async () => {
    if (!token) {
      setError("Please login to purchase");
      return;
    }
    try {
      await api.post("/api/cart", { product_id: p.id, quantity: 1 });
      navigate("/checkout");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to quick buy");
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!p) return null;

  const imgSrc = p.image_url || "https://via.placeholder.com/800x600?text=Grocery";

  return (
    <div className="card" style={{ padding: 16 }}>
      <div
        className="row"
        style={{
          alignItems: "stretch",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          className="product-media"
          style={{
            flex: "0 1 420px",
            background: "linear-gradient(135deg, rgba(37,99,235,0.08), rgba(229,231,235,0.3))",
            borderRadius: 12,
            padding: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <img
            alt={p.name}
            src={imgSrc}
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 10,
              background: "#f3f4f6",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          />
        </div>

        <div style={{ flex: "1 1 360px", minWidth: 280 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              {p.category ? <div className="badge" style={{ marginTop: 6 }}>{p.category}</div> : null}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-ghost"
                aria-label={isFavorite(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                title={isFavorite(p.id) ? "Remove from wishlist" : "Add to wishlist"}
                onClick={() => toggle(p.id)}
                style={{
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  padding: "8px 12px",
                }}
              >
                <span style={{ color: isFavorite(p.id) ? "var(--secondary)" : "#6b7280", fontSize: 18 }}>
                  {isFavorite(p.id) ? "♥" : "♡"}
                </span>
              </button>
              <div
                style={{
                  textAlign: "right",
                  background: "#ffffff",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                }}
                aria-label="product price"
              >
                <div className="small" style={{ color: "#6b7280" }}>
                  Price
                </div>
                <div style={{ color: "var(--primary)", fontWeight: 800, fontSize: 24 }}>
                  ${Number(p.price || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {p.description ? <p style={{ marginTop: 12 }}>{p.description}</p> : null}

          <div className="row" style={{ marginTop: 12, alignItems: "center" }}>
            <input
              className="input"
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
              style={{ width: 120 }}
              aria-label="quantity"
            />
            <button className="btn btn-primary" onClick={addToCart}>
              Add to Cart
            </button>
            <button className="btn btn-secondary" onClick={quickBuy}>
              Quick Buy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
