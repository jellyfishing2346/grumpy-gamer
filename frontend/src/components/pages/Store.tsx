import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../../config/api";

interface Product {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  coins_bonus: number;
  features: string[];
}

const Store: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetch(`${API_URL}/api/payments/products`)
      .then((r) => r.json())
      .then((data) => { setProducts(data.products || []); setLoading(false); })
      .catch(() => setLoading(false));
    if (token) {
      fetch(`${API_URL}/api/coins/balance`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setBalance(data.balance))
        .catch(() => {});
    }
  }, [token]);

  const handlePurchase = async (productId: string) => {
    if (!token) { navigate("/login"); return; }
    setPurchasing(productId);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError(data.detail || "Failed to create checkout session");
      }
    } catch {
      setError("Payment system unavailable. Please try again later.");
    }
    setPurchasing(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e8f4f8", fontFamily: "'DM Sans', sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#7ecbff", marginBottom: "0.5rem" }}>🛒 Grumpy Store</h1>
          <p style={{ color: "rgba(255,255,255,0.5)" }}>Support the project and unlock premium features</p>
          {balance !== null && <div style={{ marginTop: "0.75rem", color: "#fbbf24", fontWeight: 700 }}>💰 Your balance: {balance} Grumpy Coins</div>}
          <div style={{ marginTop: "0.5rem", padding: "0.5em 1em", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, display: "inline-block", fontSize: "0.85rem", color: "#fbbf24" }}>
            🧪 Test mode — use card 4242 4242 4242 4242, any future expiry and CVC
          </div>
        </div>
        {error && <div style={{ textAlign: "center", color: "#f87171", marginBottom: "1rem" }}>{error}</div>}
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading products...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {products.map((product) => (
              <div key={product.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,203,255,0.12)", borderRadius: 16, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#7ecbff" }}>{product.name}</h3>
                <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>${(product.price_usd / 100).toFixed(2)}</div>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.88rem" }}>{product.description}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {product.features.map((f, i) => <div key={i} style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>✅ {f}</div>)}
                </div>
                <div style={{ color: "#fbbf24", fontSize: "0.9rem", fontWeight: 600 }}>💰 +{product.coins_bonus} Grumpy Coins</div>
                <button
                  onClick={() => handlePurchase(product.id)}
                  disabled={purchasing === product.id}
                  style={{ padding: "0.75em 1.5em", borderRadius: 50, border: "none", background: purchasing === product.id ? "rgba(255,255,255,0.1)" : "linear-gradient(90deg,#7ecbff,#4fa3d1)", color: purchasing === product.id ? "rgba(255,255,255,0.4)" : "#1a1a2e", fontWeight: 700, cursor: purchasing === product.id ? "not-allowed" : "pointer", fontFamily: "inherit", marginTop: "auto" }}
                >
                  {purchasing === product.id ? "Redirecting..." : "Buy Now"}
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ textAlign: "center", marginTop: "2rem", color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
          Payments powered by Stripe · Secure · No real charges in test mode
        </div>
      </div>
    </div>
  );
};

export default Store;
