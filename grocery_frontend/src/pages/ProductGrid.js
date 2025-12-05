import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { fetchProducts } from "../services/productsService";
import { useWishlist } from "../wishlist/WishlistContext";

export default function ProductGrid() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const { token } = useAuth();
  const { isFavorite, toggle } = useWishlist();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchProducts({ search: search || undefined, category: category || undefined });
        if (active) setItems(data);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "Failed to load products");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
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

  const quickBuy = async (productId) => {
    if (!token) {
      setError("Please login to purchase");
      return;
    }
    try {
      await api.post("/api/cart", { product_id: productId, quantity: 1 });
      navigate("/checkout");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to quick buy");
    }
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <div className="grid">
      {items.map((p) => {
        const hasDiscount = p.isDiscounted || (typeof p.discountPercent === "number" && p.discountPercent > 0);
        const weightOrQuality = p.weight || p.quality || "";
        return (
          <div key={p.id} className="card product-card" style={{ position: "relative" }}>
            {hasDiscount ? (
              <div
                className="discount-badge"
                aria-label="discount"
                title="Discount available"
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  background: "linear-gradient(135deg, var(--secondary), #fcd34d)",
                  color: "#111827",
                  fontWeight: 700,
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                }}
              >
                {typeof p.discountPercent === "number" && p.discountPercent > 0
                  ? `-${p.discountPercent}%`
                  : "Deal"}
              </div>
            ) : null}

            <button
              aria-label={isFavorite(p.id) ? "Remove from wishlist" : "Add to wishlist"}
              title={isFavorite(p.id) ? "Remove from wishlist" : "Add to wishlist"}
              onClick={() => toggle(p.id)}
              className="btn btn-ghost"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                padding: "6px 10px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
              }}
            >
              <span style={{ color: isFavorite(p.id) ? "var(--secondary)" : "#6b7280" }}>
                {isFavorite(p.id) ? "♥" : "♡"}
              </span>
            </button>

            <Link to={`/product/${p.id}`}>
              <img
                alt={p.name}
                src={p.image_url || "https://via.placeholder.com/400x300?text=Grocery"}
              />
            </Link>

            <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <div>
                <Link to={`/product/${p.id}`}>
                  <strong>{p.name}</strong>
                </Link>
                <div className="small">{p.category}</div>
                {weightOrQuality ? (
                  <div className="small" style={{ color: "#1f2937" }}>
                    {weightOrQuality}
                  </div>
                ) : null}
              </div>
              <div>
                <strong>${Number(p.price || 0).toFixed(2)}</strong>
                {hasDiscount && typeof p.discountPercent === "number" && p.discountPercent > 0 ? (
                  <div className="small" style={{ color: "#059669" }}>
                    Save {p.discountPercent}%
                  </div>
                ) : null}
              </div>
            </div>

            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => addToCart(p.id)}>
                Add to Cart
              </button>
              <button className="btn btn-secondary" onClick={() => quickBuy(p.id)}>
                Quick Buy
              </button>
              <div className="spacer" />
              <Link className="btn btn-ghost" to={`/product/${p.id}`}>
                View
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
