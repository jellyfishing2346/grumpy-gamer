import React, { useState, useEffect } from "react";
import API_URL from "../../config/api";

interface Transaction {
  amount: number;
  reason: string;
  created_at: string;
}

interface LeaderboardEntry {
  username: string;
  balance: number;
}

const FinancialDashboard: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${API_URL}/api/coins/balance`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/coins/transactions`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API_URL}/api/coins/leaderboard`).then((r) => r.json()),
    ]).then(([bal, txns, lb]) => {
      setBalance(bal.balance);
      setTransactions(txns.transactions || []);
      setLeaderboard(lb.leaderboard || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const totalEarned = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalSpent = Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  const dark: React.CSSProperties = { minHeight: "100vh", background: "#0f1117", color: "#e8f4f8", fontFamily: "'DM Sans', sans-serif", padding: "2rem" };
  const card: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,203,255,0.12)", borderRadius: 16, padding: "1.5rem" };

  if (!token) return (
    <div style={{ ...dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "rgba(255,255,255,0.4)" }}>Please log in to view your financial dashboard.</p>
    </div>
  );

  return (
    <div style={dark}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#7ecbff", marginBottom: "0.5rem" }}>💰 Financial Dashboard</h1>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>Your Grumpy Coins activity and history</p>

        {loading ? <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading...</p> : (
          <>
            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Current Balance", value: `💰 ${balance ?? 0}`, color: "#7ecbff" },
                { label: "Total Earned", value: `+${totalEarned}`, color: "#4ade80" },
                { label: "Total Spent", value: `-${totalSpent}`, color: "#f87171" },
                { label: "Transactions", value: transactions.length, color: "#fbbf24" },
              ].map((s) => (
                <div key={s.label} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              {/* Transaction History */}
              <div style={card}>
                <h3 style={{ margin: "0 0 1rem", color: "#7ecbff" }}>📋 Transaction History</h3>
                {transactions.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No transactions yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 320, overflowY: "auto" }}>
                    {transactions.map((t, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5em 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div>
                          <div style={{ fontSize: "0.88rem" }}>{t.reason}</div>
                          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>{new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: t.amount > 0 ? "#4ade80" : "#f87171" }}>
                          {t.amount > 0 ? "+" : ""}{t.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leaderboard */}
              <div style={card}>
                <h3 style={{ margin: "0 0 1rem", color: "#7ecbff" }}>🏆 Richest Players</h3>
                {leaderboard.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No data yet</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {leaderboard.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5em 0.75em", borderRadius: 8, background: i === 0 ? "rgba(251,191,36,0.08)" : "transparent", border: i === 0 ? "1px solid rgba(251,191,36,0.2)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "1.1rem" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</span>
                          <span style={{ fontSize: "0.9rem" }}>{p.username || "Anonymous"}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: "#fbbf24" }}>💰 {p.balance}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;
