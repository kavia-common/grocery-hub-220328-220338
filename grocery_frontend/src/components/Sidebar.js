import React from "react";
import { Link, useLocation } from "react-router-dom";

const cats = ["Fruits", "Vegetables", "Dairy", "Bakery"];

export default function Sidebar(){
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const search = params.get("search") || "";
  return (
    <aside className="sidebar card">
      <div className="row" style={{justifyContent:"space-between"}}>
        <strong>Categories</strong>
        {search ? <span className="badge">Search: {search}</span> : null}
      </div>
      <div className="list" style={{marginTop: 8}}>
        <Link to="/">All</Link>
        {cats.map(c => (
          <Link key={c} to={`/?category=${encodeURIComponent(c)}`}>{c}</Link>
        ))}
        <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 8 }}>
          <Link to="/combos" className="row" style={{ gap: 6 }}>
            <span className="badge" style={{ background: "#FEF3C7", color: "#B45309" }}>Combos</span> Save more
          </Link>
          <Link to="/instant" className="row" style={{ gap: 6 }}>
            <span className="badge-instant">Instant</span> Fast Delivery
          </Link>
          <Link to="/coupons" className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="badge">Offers</span> Browse coupons
          </Link>
          <Link to="/addresses" className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="badge">Addresses</span> Manage
          </Link>
          <Link to="/orders" className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="badge">Orders</span> Your orders
          </Link>
        </div>
      </div>
    </aside>
  );
}
