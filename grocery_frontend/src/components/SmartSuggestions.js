import React, { useEffect, useState } from "react";
import { addOneToCart, getSuggestions } from "../services/suggestionService";
import { useAuth } from "../auth/AuthContext";

/**
 * PUBLIC_INTERFACE
 * SmartSuggestions shows recommended items based on past orders.
 * Props:
 * - location: "cart" | "grid" (for subtle UI tweaks)
 * - limit?: number (default 5)
 * - onAdded?: function(productId) -> void (notify parent when an item was added)
 */
export default function SmartSuggestions({ location = "cart", limit = 5, onAdded }) {
  const { user, token } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const list = await getSuggestions(user?.id, limit);
        if (active) setSuggestions(list || []);
      } catch (e) {
        if (active) setError("Unable to fetch suggestions.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, limit]);

  const addAgain = async (productId) => {
    if (!token) {
      alert("Please login to add to cart");
      return;
    }
    const ok = await addOneToCart(productId);
    if (ok) {
      onAdded && onAdded(productId);
      // Provide lightweight feedback
      try {
        if (location === "cart") {
          // keep in list; user may add multiple
        }
      } catch {
        // ignore
      }
    } else {
      alert("Failed to add item.");
    }
  };

  const dismiss = (productId) => {
    setDismissed((prev) => {
      const s = new Set(prev);
      s.add(Number(productId));
      return s;
    });
  };

  const visible = suggestions.filter((s) => !dismissed.has(Number(s.product?.id)));

  // Friendly empty state
  if (!loading && !error && visible.length === 0) {
    return (
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08), #ffffff)",
          border: "1px dashed #fbbf24",
        }}
      >
        <div className="row" style={{ alignItems: "center", gap: 10 }}>
          <span className="badge" style={{ background: "#FEF3C7", color: "#92400E" }}>Tips</span>
          <div className="small" style={{ color: "#6b7280" }}>
            No past purchases yet — start shopping to see smart suggestions here.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        background:
          location === "grid"
            ? "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(249,250,251,1))"
            : "linear-gradient(135deg, rgba(37,99,235,0.06), #ffffff)",
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div className="row" style={{ gap: 8, alignItems: "center" }}>
          <strong>Suggested for you</strong>
          <span className="badge" style={{ background: "#DBEAFE", color: "#1E40AF" }}>
            Smart
          </span>
        </div>
        {loading ? <div className="small">Loading…</div> : null}
        {error ? <div className="small" style={{ color: "var(--error)" }}>{error}</div> : null}
      </div>

      <div
        className="grid"
        style={{
          marginTop: 10,
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {visible.map((sug) => {
          const p = sug.product || {};
          return (
            <div
              key={p.id}
              className="card"
              style={{
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontWeight: 700, color: "var(--primary)" }}>
                  ${Number(p.price || 0).toFixed(2)}
                </div>
              </div>
              {p.category ? (
                <div className="small" style={{ color: "#374151" }}>
                  {p.category}
                </div>
              ) : null}
              <div className="small" style={{ color: "#6b7280" }}>{sug.context}</div>
              <div className="row" style={{ marginTop: 4 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => addAgain(p.id)}
                  title="Add again"
                >
                  Add again
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => dismiss(p.id)}
                  title="Dismiss suggestion"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
