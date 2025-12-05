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
      </div>
    </aside>
  );
}
