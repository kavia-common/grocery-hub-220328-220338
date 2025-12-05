import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage(){
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try{
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate("/");
    } catch (e) {
      setError(e?.response?.data?.message || "Authentication failed");
    }
  }

  return (
    <div className="card" style={{maxWidth: 420, margin: "24px auto"}}>
      <div className="row" style={{gap: 8}}>
        <button className={`btn ${tab==="login" ? "btn-primary" : ""}`} onClick={()=>setTab("login")}>Login</button>
        <button className={`btn ${tab==="register" ? "btn-primary" : ""}`} onClick={()=>setTab("register")}>Register</button>
      </div>
      <form className="list" style={{marginTop: 12}} onSubmit={submit}>
        {tab === "register" && (
          <>
            <label>Name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
          </>
        )}
        <label>Email</label>
        <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
        <label>Password</label>
        <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
        {error ? <div className="error">{error}</div> : null}
        <button className="btn btn-primary" type="submit">{tab==="login" ? "Login" : "Create account"}</button>
      </form>
    </div>
  );
}
