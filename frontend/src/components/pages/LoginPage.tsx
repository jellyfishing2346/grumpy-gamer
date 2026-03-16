import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";
import API_URL from "../../config/api";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        login(data.access_token);
        navigate("/home");
      } else {
        const data = await res.json();
        setError(data.detail || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75em 1em",
    borderRadius: 10,
    border: "1px solid rgba(126,203,255,0.2)",
    background: "rgba(255,255,255,0.06)",
    color: "#f0f4ff",
    fontSize: "1em",
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      padding: "24px",
    }}>
      {/* Glow */}
      <div style={{
        position: "fixed", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
        width: 600, height: 300, pointerEvents: "none",
        background: "radial-gradient(ellipse, rgba(126,203,255,0.06) 0%, transparent 70%)",
      }} />

      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(126,203,255,0.12)",
        borderRadius: 20,
        padding: "2.5em",
        backdropFilter: "blur(12px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2em" }}>
          <div style={{ fontSize: "2em", marginBottom: "0.3em" }}>🎮</div>
          <h1 style={{
            fontSize: "1.8em", fontWeight: 800, color: "#fff",
            marginBottom: "0.2em", letterSpacing: "-0.02em",
          }}>
            Welcome back
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95em" }}>
            Log in to your Grumpy Gamer account
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
          <div>
            <label style={{
              display: "block", fontSize: "0.82em", fontWeight: 600,
              color: "rgba(255,255,255,0.5)", marginBottom: "0.4em",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{
              display: "block", fontSize: "0.82em", fontWeight: 600,
              color: "rgba(255,255,255,0.5)", marginBottom: "0.4em",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: "0.75em 1em", borderRadius: 8,
              background: "rgba(255,126,103,0.1)",
              border: "1px solid rgba(255,126,103,0.3)",
              color: "#ff7e67", fontSize: "0.9em",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.5em",
              padding: "0.85em",
              borderRadius: 10,
              border: "none",
              background: loading ? "rgba(126,203,255,0.3)" : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e",
              fontWeight: 700,
              fontSize: "1em",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div style={{
          marginTop: "1.8em", textAlign: "center",
          color: "rgba(255,255,255,0.4)", fontSize: "0.92em",
        }}>
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/signup")}
            style={{
              background: "none", border: "none",
              color: "#7ecbff", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              fontSize: "inherit", padding: 0,
            }}
          >
            Sign up free
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
