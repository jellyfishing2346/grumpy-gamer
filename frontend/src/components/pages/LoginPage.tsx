import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import API_URL from "../../config/api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.access_token);
        setSuccess("Login successful!");
        navigate("/home");
      } else {
        const data = await res.json();
        setError(data.detail || "Login failed");
      }
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="auth-container" style={{
      maxWidth: 400,
      margin: "40px auto",
      padding: 32,
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <h2 style={{marginBottom: 24}}>Log In</h2>
      <form onSubmit={handleSubmit} style={{width: "100%", display: "flex", flexDirection: "column", gap: 16}}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{padding: 12, borderRadius: 6, border: "1px solid #ccc", fontSize: 16}}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{padding: 12, borderRadius: 6, border: "1px solid #ccc", fontSize: 16}}
        />
        <button type="submit" style={{
          padding: "12px 0",
          borderRadius: 6,
          border: "none",
          background: "#2d72d9",
          color: "#fff",
          fontWeight: 600,
          fontSize: 16,
          cursor: "pointer",
          marginTop: 8
        }}>Log In</button>
      </form>
      {error && <div className="auth-error" style={{color: "#d32f2f", marginTop: 12}}>{error}</div>}
      {success && <div className="auth-success" style={{color: "#388e3c", marginTop: 12}}>{success}</div>}
      <div style={{marginTop: 24, width: "100%", textAlign: "center"}}>
        <span>Don't have an account?</span>
        <button
          onClick={() => navigate("/signup")}
          style={{
            marginLeft: 8,
            padding: "8px 20px",
            borderRadius: 6,
            border: "none",
            background: "#e0e0e0",
            color: "#222",
            fontWeight: 500,
            fontSize: 15,
            cursor: "pointer"
          }}
        >Sign up</button>
      </div>
    </div>
  );
};

export default LoginPage;
