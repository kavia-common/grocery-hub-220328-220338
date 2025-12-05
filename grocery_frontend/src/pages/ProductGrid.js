import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext";
import { fetchProducts, fetchInstantProducts } from "../services/productsService";
import { isSubscribed, subscribe, unsubscribe, popNextBanner } from "../services/stockAlertsService";
import { useWishlist } from "../wishlist/WishlistContext";
import SmartSuggestions from "../components/SmartSuggestions";
import BuyAgain from "../components/BuyAgain";
import { listCombos } from "../services/combosService";
import { getPerkFlags } from "../services/membershipsService";
import priceAlertService from "../services/priceAlertService";
import { useNotifications } from "../notifications/NotificationsContext";

export default function ProductGrid() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [quick, setQuick] = useState([]);
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const { token } = useAuth();
  const [banner, setBanner] = useState("");
  const [subs, setSubs] = useState(new Set());
  const { isFavorite, toggle } = useWishlist();
  const navigate = useNavigate();
  const [topCombos, setTopCombos] = useState([]);
  const [priceAlertSubs, setPriceAlertSubs] = useState(new Set());
  const pricePollRef = useRef(null);
  const { notify, NotificationTypes } = useNotifications();
  const [memberPerks, setMemberPerks] = useState({ freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const perks = await getPerkFlags();
        if (active) setMemberPerks(perks || { freeDelivery: false, extraDiscountPercent: 0, earlyAccess: false });
        const data = await fetchProducts({ search: search || undefined, category: category || undefined });
        if (active) setItems(data);
        if (active && !search && !category) {
          fetchInstantProducts()
            .then((list) => {
              if (active) setQuick(list.slice(0, 6));
            })
            .catch(() => {
              if (active) setQuick([]);
            });
        } else if (active) {
          setQuick([]);
        }
      } catch (e) {
        if (active) setError(e?.response?.data?.message || "Failed to load products");
      } finally {
        if (active) setLoading(false);
      }
    })();
    (async () => {
      try {
        const data = await listCombos();
        if (active) {
          const top = (data || []).sort((a,b)=> (b.savingsPercent||0) - (a.savingsPercent||0)).slice(0,2);
          setTopCombos(top);
        }
      } catch {
        if (active) setTopCombos([]);
      }
    })();
    (async () => {
      try {
        const ids = await Promise.all(
          (items || []).map((p) => isSubscribed(p.id).then((v) => [p.id, v]))
        );
        if (active) {
          const s = new Set();
          ids.forEach(([id, v]) => v && s.add(Number(id)));
          setSubs(s);
        }
      } catch {
        // ignore
      }
    })();

    // Initialize price alert subscriptions set from localStorage for quick UI reflection
    (async () => {
      try {
        const all = JSON.parse(localStorage.getItem('ghub_price_alert_subscriptions') || '[]');
        if (active && Array.isArray(all)) {
          setPriceAlertSubs(new Set(all.map(Number)));
        }
      } catch {
        // ignore
      }
    })();

    // Initial check for price drops using the loaded list
    (async () => {
      try {
        if (items && items.length > 0) {
          await priceAlertService.checkForPriceDrops(items, ({ title, message, cta, ctaHref }) => {
            notify?.({ type: NotificationTypes.info, message: `${title}: ${message}`, meta: { cta, ctaHref, type: 'price_drop' } });
          });
        }
      } catch {
        // ignore
      }
    })();

    const bannerTimer = setInterval(() => {
      const msg = popNextBanner();
      if (msg) setBanner(msg);
    }, 1200);

    // Poll every 3 minutes for price changes on the current products
    pricePollRef.current = setInterval(() => {
      if (!items || items.length === 0) return;
      priceAlertService.checkForPriceDrops(items, ({ title, message, cta, ctaHref }) => {
        notify?.({ type: NotificationTypes.info, message: `${title}: ${message}`, meta: { cta, ctaHref, type: 'price_drop' } });
      }).catch(() => {});
    }, 180000);

    return () => {
      active = false;
      clearInterval(bannerTimer);
      if (pricePollRef.current) clearInterval(pricePollRef.current);
    };
  }, [search, category]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const onSubscribe = async (productId) => {
    await subscribe(productId);
    setSubs((prev) => {
      const s = new Set(prev);
      s.add(Number(productId));
      return s;
    });
    setBanner("We'll notify you when it's back in stock.");
  };
  const onUnsubscribe = async (productId) => {
    await unsubscribe(productId);
    setSubs((prev) => {
      const s = new Set(prev);
      s.delete(Number(productId));
      return s;
    });
  };

  if (loading) return <div className="card">Loading...</div>;
  if (error) return <div className="card error">{error}</div>;

  return (
    <>
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

      {topCombos.length > 0 ? (
        <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg, rgba(245,158,11,0.10), #ffffff)", border: "1px solid #FDE68A" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <strong>Featured Combos</strong>
              <span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>Save more</span>
            </div>
            <Link to="/combos" className="btn btn-ghost">View all</Link>
          </div>
          <div className="grid" style={{ marginTop: 10 }}>
            {topCombos.map((c) => (
              <Link key={c.id} to={`/combos/${c.id}`} className="card" style={{ overflow: "hidden", textDecoration: "none" }}>
                <div style={{ height: 120, background: "#F3F4F6" }}>
                  <img alt={c.title} src={c.image_url || "https://via.placeholder.com/400x300?text=Combo"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{c.title}</div>
                    <div className="small" style={{ color: "#6B7280" }}>
                      {c.items.map(i => `${i.qty} x ${i.name}`).join(" · ")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#2563EB", fontWeight: 700 }}>${Number(c.comboPrice || 0).toFixed(2)}</div>
                    <div className="small" style={{ textDecoration: "line-through", color: "#9CA3AF" }}>${Number(c.originalPrice || 0).toFixed(2)}</div>
                    {c.savingsPercent > 0 ? (
                      <div className="badge" style={{ background: "#FEF3C7", color: "#B45309", marginTop: 4 }}>Save {c.savingsPercent}%</div>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {token ? (
        <div style={{ marginBottom: 12 }}>
          {/* Buy Again section */}
          <BuyAgain limit={6} />
          {/* Smart Suggestions */}
          <SmartSuggestions
            location="grid"
            limit={4}
            onAdded={() => {
              // cart update happens server-side; no reload needed
            }}
          />
        </div>
      ) : null}

      {/* Quick Delivery section */}
      {quick.length > 0 ? (
        <div className="card" style={{ marginBottom: 12, background: "linear-gradient(135deg, rgba(37,99,235,0.06), #ffffff)" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <strong>Quick Delivery</strong>
              <span className="badge-instant">Instant Delivery</span>
            </div>
            <Link to="/instant" className="btn btn-ghost">View all</Link>
          </div>
          <div className="grid" style={{ marginTop: 10 }}>
            {quick.map((p) => (
              <div key={p.id} className="card product-card instant-card" style={{ position: "relative" }}>
                {p.isInstant ? (
                  <div className="badge-instant" style={{ position: "absolute", top: 10, right: 10 }}>
                    Instant{p.instantEta ? ` • ${p.instantEta}` : ""}
                  </div>
                ) : null}
                <Link to={`/product/${p.id}`}>
                  <img alt={p.name} src={p.image_url || "https://via.placeholder.com/400x300?text=Grocery"} />
                </Link>
                <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
                  <div>
                    <Link to={`/product/${p.id}`}><strong>{p.name}</strong></Link>
                    <div className="small">{p.category}</div>
                  </div>
                  <div><strong>${Number(p.price || 0).toFixed(2)}</strong></div>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => addToCart(p.id)}>Add</button>
                  <button className="btn btn-secondary" onClick={() => quickBuy(p.id)}>Quick Buy</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid">
        {items
          .filter((p) => {
            // If earlyAccessOnly, show only to members with earlyAccess perk
            if (p.earlyAccessOnly && !memberPerks.earlyAccess) {
              // still render with lock? We'll allow showing locked with badge, not filter out from grid.
              return true;
            }
            return true;
          })
          .map((p) => {
          const hasDiscount = p.isDiscounted || (typeof p.discountPercent === "number" && p.discountPercent > 0);
          const weightOrQuality = p.weight || p.quality || "";
          const inStock = typeof p.stockQty === "number" ? p.stockQty > 0 : (typeof p.isInStock === "boolean" ? p.isInStock : true);
          const subscribed = subs.has(Number(p.id));
          return (
            <div key={p.id} className={`card product-card ${p.isInstant ? "instant-card" : ""}`} style={{ position: "relative" }}>
              {p.earlyAccessOnly && !memberPerks.earlyAccess ? (
                <div
                  className="badge"
                  aria-label="Locked Early Access"
                  title="Members get early access"
                  style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    background: "#FEE2E2",
                    color: "#991B1B",
                  }}
                >
                  🔒 Early Access
                </div>
              ) : null}
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
              {typeof p.stockQty === "number" ? (
                inStock ? (
                  <div
                    className="badge"
                    title={`${p.stockQty} in stock`}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 90,
                      background: "#DBEAFE",
                      color: "#1E40AF",
                    }}
                  >
                    In stock • {p.stockQty}
                  </div>
                ) : (
                  <div
                    className="badge"
                    title="Out of stock"
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 90,
                      background: "#FEE2E2",
                      color: "#991B1B",
                    }}
                  >
                    Out of stock
                  </div>
                )
              ) : null}
              {p.isInstant ? (
                <div
                  className="badge-instant"
                  aria-label="instant delivery"
                  title="Instant Delivery"
                  style={{ position: "absolute", top: 10, right: 50 }}
                >
                  Instant Delivery{p.instantEta ? ` • ${p.instantEta}` : ""}
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
                <button className="btn btn-primary" onClick={() => addToCart(p.id)} disabled={!inStock || (p.earlyAccessOnly && !memberPerks.earlyAccess)}>
                  Add to Cart
                </button>
                <button className="btn btn-secondary" onClick={() => quickBuy(p.id)} disabled={!inStock || (p.earlyAccessOnly && !memberPerks.earlyAccess)}>
                  Quick Buy
                </button>
                {!inStock ? (
                  subscribed ? (
                    <button className="btn btn-ghost" onClick={() => onUnsubscribe(p.id)} title="Cancel reminder">
                      🔕 Cancel
                    </button>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => onSubscribe(p.id)} title="Remind me when in stock">
                      🔔 Remind me
                    </button>
                  )
                ) : null}
                {/* Price drop alert toggle */}
                <button
                  className="btn btn-ghost"
                  aria-label="Price drop alert"
                  title="Notify me on price drop"
                  onClick={() => {
                    const active = priceAlertService.isSubscribed(p.id);
                    if (active) {
                      priceAlertService.unsubscribe(p.id);
                      setPriceAlertSubs((prev)=>{ const s=new Set(prev); s.delete(Number(p.id)); return s; });
                      notify?.({ type: NotificationTypes.success, message: 'Price alerts disabled for this item.', meta: { type: 'price_alert_unsub', productId: p.id } });
                    } else {
                      priceAlertService.subscribe(p.id);
                      setPriceAlertSubs((prev)=>{ const s=new Set(prev); s.add(Number(p.id)); return s; });
                      notify?.({ type: NotificationTypes.success, message: 'Price alerts enabled. We\'ll notify you on drops or higher discounts.', meta: { type: 'price_alert_sub', productId: p.id } });
                      // Light check now
                      priceAlertService.checkForPriceDrops([p], ({ title, message, cta, ctaHref }) => {
                        notify?.({ type: NotificationTypes.info, message: `${title}: ${message}`, meta: { cta, ctaHref, type: 'price_drop' } });
                      }).catch(()=>{});
                    }
                  }}
                  style={{
                    border: `1px solid ${priceAlertSubs.has(Number(p.id)) ? '#2563EB' : '#e5e7eb'}`,
                    background: priceAlertSubs.has(Number(p.id)) ? 'rgba(37,99,235,0.08)' : '#ffffff',
                    color: priceAlertSubs.has(Number(p.id)) ? '#2563EB' : '#6b7280',
                  }}
                >
                  <span aria-hidden="true">🔔</span> {priceAlertSubs.has(Number(p.id)) ? 'Alert on' : 'Alert me'}
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
    </>
  );
}
