import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { useWishlist } from "../wishlist/WishlistContext";
import { fetchProductById } from "../services/productByIdService";
import { isProductsBackendMode, simulateRestock } from "../services/productsService";
import { isSubscribed, subscribe, unsubscribe, notifyIfRestocked, popNextBanner } from "../services/stockAlertsService";
import { useNotifications } from "../notifications/NotificationsContext";

/**
 * PUBLIC_INTERFACE
 * ProductDetail shows a single product with prominent image and price.
 * Assumes backend returns: { id, name, description, category, image_url, price }
 * Enhancements: wishlist heart toggle (localStorage-backed), Quick Buy (adds 1 to cart, navigates to checkout),
 * and Instant Delivery badge with optional ETA when p.isInstant is true.
 */
export default function ProductDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [backendMode, setBackendMode] = useState(true);
  const [banner, setBanner] = useState("");
  const { token } = useAuth();
  const { isFavorite, toggle } = useWishlist();
  const navigate = useNavigate();
  const { notify, NotificationTypes } = useNotifications();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await fetchProductById(id);
        if (active) setP(data);
        // subscription state
        const sub = await isSubscribed(id);
        if (active) setSubscribed(!!sub);
        // detect mode
        const mode = await isProductsBackendMode();
        if (active) setBackendMode(!!mode);
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "Failed to load product");
      } finally {
        if (active) setLoading(false);
      }
    })();
    const t = setInterval(() => {
      const msg = popNextBanner();
      if (msg) setBanner(msg);
    }, 1200);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [id]);

  const addToCart = async () => {
    if (!token) {
      setError("Please login to add to cart");
      return;
    }
    try {
      await api.post("/api/cart", { product_id: p.id, quantity: qty });
      await notify({
        type: NotificationTypes.success,
        message: `Added ${p.name} x${qty} to cart.`,
        meta: { type: "cart_add", productId: p.id, qty },
      });
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

  const onSubscribe = async () => {
    await subscribe(p.id);
    setSubscribed(true);
    setBanner("We'll notify you when it's back in stock.");
    await notify({
      type: NotificationTypes.info,
      message: `We'll notify you when ${p.name} is restocked.`,
      meta: { type: "restock_subscribe", productId: p.id },
    });
  };
  const onUnsubscribe = async () => {
    await unsubscribe(p.id);
    setSubscribed(false);
  };

  // Mock-only helper to simulate restock event and fire a notification
  const simulateRestockNow = async () => {
    if (!p) return;
    const prevQty = Number(p.stockQty || 0);
    if (prevQty > 0) {
      setBanner("Item already in stock.");
      return;
    }
    const updatedList = simulateRestock([p], p.id, 20);
    const updated = updatedList[0];
    // Notify subscribers and update UI
    await notifyIfRestocked(updated);
    setP(updated);
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;
  if (!p) return null;

  const imgSrc = p.image_url || "https://via.placeholder.com/800x600?text=Grocery";

  const inStock = typeof p.stockQty === "number" ? p.stockQty > 0 : (typeof p.isInStock === "boolean" ? p.isInStock : true);

  return (
    <div className="card" style={{ padding: 16 }}>
      {banner ? (
        <div
          className="card"
          style={{
            marginBottom: 12,
            background: "linear-gradient(135deg, rgba(37,99,235,0.12), #ffffff)",
            border: "1px solid #DBEAFE",
          }}
        >
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <span role="img" aria-label="bell">🔔</span>
              <strong>{banner}</strong>
            </div>
            <button className="btn btn-ghost" onClick={() => setBanner("")}>Dismiss</button>
          </div>
        </div>
      ) : null}
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
            position: "relative",
          }}
        >
          {p.isInstant ? (
            <div
              className="badge-instant"
              aria-label="instant delivery"
              title="Instant Delivery"
              style={{ position: "absolute", top: 10, right: 10 }}
            >
              Instant Delivery{p.instantEta ? ` • ${p.instantEta}` : ""}
            </div>
          ) : null}
          {typeof p.stockQty === "number" ? (
            inStock ? (
              <div
                className="badge"
                title={`${p.stockQty} in stock`}
                style={{ position: "absolute", top: 10, left: 10, background: "#DBEAFE", color: "#1E40AF" }}
              >
                In stock • {p.stockQty}
              </div>
            ) : (
              <div
                className="badge"
                title="Out of stock"
                style={{ position: "absolute", top: 10, left: 10, background: "#FEE2E2", color: "#991B1B" }}
              >
                Out of stock
              </div>
            )
          ) : null}
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
              <div className="row" style={{ marginTop: 6, gap: 6, alignItems: "center" }}>
                {p.category ? <div className="badge">{p.category}</div> : null}
                {p.isInstant ? (
                  <span className="badge-instant">
                    Instant Delivery{p.instantEta ? ` • ${p.instantEta}` : ""}
                  </span>
                ) : null}
              </div>
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
                {typeof p.stockQty === "number" ? (
                  inStock ? (
                    <div className="small" style={{ color: "#1E40AF", marginTop: 6 }}>
                      In stock • {p.stockQty}
                    </div>
                  ) : (
                    <div className="small" style={{ color: "#991B1B", marginTop: 6 }}>
                      Out of stock
                    </div>
                  )
                ) : null}
              </div>
            </div>
          </div>

          {p.description ? <p style={{ marginTop: 12 }}>{p.description}</p> : null}

          <div className="row" style={{ marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="input"
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
              style={{ width: 120 }}
              aria-label="quantity"
              disabled={!inStock}
            />
            <button className="btn btn-primary" onClick={addToCart} disabled={!inStock}>
              Add to Cart
            </button>
            <button className="btn btn-secondary" onClick={quickBuy} disabled={!inStock}>
              Quick Buy
            </button>
            {!inStock ? (
              subscribed ? (
                <button className="btn btn-ghost" onClick={onUnsubscribe} title="Cancel reminder">
                  🔕 Cancel
                </button>
              ) : (
                <button className="btn btn-ghost" onClick={onSubscribe} title="Remind me when in stock">
                  🔔 Remind me
                </button>
              )
            ) : null}
            {!backendMode && !inStock ? (
              <button
                className="btn"
                onClick={simulateRestockNow}
                title="Simulate restock (mock mode)"
                style={{ marginLeft: 6 }}
              >
                Simulate restock
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
