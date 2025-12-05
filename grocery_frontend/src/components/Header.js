import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

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
    <header className="header">
      <div className="brand"><Link to="/">Grocery Hub</Link></div>
      <form className="search" onSubmit={onSubmit}>
        <input className="input" placeholder="Search for apples, milk, bread..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </form>
      <nav className="nav">
        <Link to="/">Home</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/orders">Orders</Link>
        {user ? (
          <button className="btn btn-ghost" onClick={logout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}
