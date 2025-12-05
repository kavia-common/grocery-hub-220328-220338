import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWishlist } from "../wishlist/WishlistContext";
import { fetchProducts } from "../services/productsService";
import api from "../api";
import { useAuth } from "../auth/AuthContext";

export default function WishlistPage() {
  const { favorites, toggle, isFavorite } = useWishlist();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const navigate = useNavigate();

  const favIds = useMemo(() => Array.from(favorites), [favorites]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Use existing service and filter on client by favorites
        const all = await fetchProducts({});
        const favItems = all.filter((p) => favIds.includes(Number(p.id)));
        if (active) setItems(favItems);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "Failed to load wishlist");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [favIds]);

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
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Wishlist</h2>
        <div className="small">{favIds.length} saved</div>
      </div>
      {items.length === 0 ? (
        <p>
          No favorites yet. Browse the <Link to="/">catalog</Link> and tap the heart icon to save items.
        </p>
      ) : null}
      <div className="grid" style={{ marginTop: 12 }}>
        {items.map((p) => {
          const selected = isFavorite(p.id);
          return (
            <div key={p.id} className="card product-card" style={{ position: "relative" }}>
              <button
                aria-label={selected ? "Remove from wishlist" : "Add to wishlist"}
                title={selected ? "Remove from wishlist" : "Add to wishlist"}
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
                <span style={{ color: selected ? "var(--secondary)" : "#6b7280" }}>
                  {selected ? "♥" : "♡"}
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
                </div>
                <div>
                  <strong>${Number(p.price || 0).toFixed(2)}</strong>
                </div>
              </div>

              <div className="row" style={{ marginTop: 8 }}>
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
    </div>
  );
}
