import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import NotificationBell from "./NotificationBell";
import MembershipBadge from "./MembershipBadge";

export default function Header() {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("search") || "");
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const onSubmit = (e) => {
    e.preventDefault();
    navigate("/?search=" + encodeURIComponent(q));
  };

  return (
    <header className="header" style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
      <div className="brand">
        <Link to="/" style={{ color: "#111827", fontWeight: 700, textDecoration: "none" }}>
          Grocery Hub
        </Link>
      </div>
      <form className="search" onSubmit={onSubmit}>
        <input
          className="input"
          placeholder="Search for apples, milk, bread..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>
      <nav className="nav" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/combos" title="Combo Packs">Combos</Link>
        <Link to="/instant" title="Fast Delivery">Instant</Link>
        <Link to="/wishlist">Wishlist</Link>
        <Link to="/coupons">Offers</Link>
        <Link to="/addresses">Addresses</Link>
        <Link to="/buy-again" style={{ color: "#F59E0B" }}>Buy Again</Link>
        <Link to="/image-search" style={{ color: "#2563EB", fontWeight: 600 }}>Image Search</Link>
        <Link to="/memberships" title="Membership Plans" style={{ color: "#2563EB" }}>Membership</Link>
        <MembershipBadge />
        <Link to="/cart">Cart</Link>
        <Link to="/orders">Orders</Link>
        <Link to="/returns" aria-label="Go to Returns">Returns</Link>
        <NotificationBell />
        {user ? (
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
