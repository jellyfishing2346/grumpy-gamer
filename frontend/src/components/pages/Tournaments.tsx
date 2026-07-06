import React, { useState, useEffect, useCallback } from "react";
import API_URL from "../../config/api";

interface Tournament {
  id: string;
  name: string;
  game: string;
  entry_fee: number;
  max_players: number;
  prize_pool: number;
  status: string;
  player_count: number;
}

const Tournaments: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newT, setNewT] = useState({ name: "", game: "tictactoe", entry_fee: 50, max_players: 4 });
  const token = localStorage.getItem("access_token");

  const fetchData = useCallback(() => {
    fetch(`${API_URL}/api/tournaments`)
      .then((r) => r.json())
      .then((d) => { setTournaments(d.tournaments || []); setLoading(false); })
      .catch(() => setLoading(false));
    if (token) {
      fetch(`${API_URL}/api/coins/balance`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json()).then((d) => setBalance(d.balance)).catch(() => {});
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const join = async (id: string) => {
    if (!token) return;
    setJoining(id);
    const res = await fetch(`${API_URL}/api/tournaments/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tournament_id: id }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.detail);
    if (res.ok) fetchData();
    setJoining(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const create = async () => {
    if (!token) return;
    setCreating(true);
    const res = await fetch(`${API_URL}/api/tournaments/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newT),
    });
    const data = await res.json();
    setMessage(res.ok ? `Created! Code: ${data.tournament_id}` : data.detail);
    if (res.ok) { setShowCreate(false); fetchData(); }
    setCreating(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const dark: React.CSSProperties = { minHeight: "100vh", background: "#0f1117", color: "#e8f4f8", fontFamily: "'DM Sans', sans-serif", padding: "2rem" };
  const btnStyle: React.CSSProperties = { padding: "0.7em 1.5em", borderRadius: 50, border: "none", background: "linear-gradient(90deg,#7ecbff,#4fa3d1)", color: "#1a1a2e", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
  const inputStyle: React.CSSProperties = { display: "block", width: "100%", padding: "0.6em 1em", borderRadius: 8, border: "1px solid rgba(126,203,255,0.2)", background: "rgba(255,255,255,0.05)", color: "#e8f4f8", fontFamily: "inherit", fontSize: "0.95rem", boxSizing: "border-box" };

  return (
    <div style={dark}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#7ecbff", margin: 0 }}>🏆 Tournaments</h1>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0" }}>Compete for Grumpy Coins prizes</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {balance !== null && <div style={{ color: "#fbbf24", fontWeight: 700, marginBottom: "0.5rem" }}>💰 {balance} coins</div>}
            {token && <button style={btnStyle} onClick={() => setShowCreate(!showCreate)}>+ Create</button>}
          </div>
        </div>

        {message && <div style={{ textAlign: "center", padding: "0.75em", borderRadius: 10, background: "rgba(126,203,255,0.08)", border: "1px solid rgba(126,203,255,0.2)", marginBottom: "1rem", color: "#7ecbff" }}>{message}</div>}

        {showCreate && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,203,255,0.12)", borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem", color: "#7ecbff" }}>Create Tournament</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div><label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Name</label><input style={inputStyle} placeholder="My Tournament" value={newT.name} onChange={(e) => setNewT((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Entry Fee</label><input style={inputStyle} type="number" value={newT.entry_fee} onChange={(e) => setNewT((p) => ({ ...p, entry_fee: Number(e.target.value) }))} /></div>
              <div><label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Max Players</label><input style={inputStyle} type="number" value={newT.max_players} onChange={(e) => setNewT((p) => ({ ...p, max_players: Number(e.target.value) }))} /></div>
              <div><label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>Game</label>
                <select style={{ ...inputStyle, background: "#1a1a2e" }} value={newT.game} onChange={(e) => setNewT((p) => ({ ...p, game: e.target.value }))}>
                  <option value="tictactoe">TicTacToe</option>
                  <option value="connectfour">Connect Four</option>
                  <option value="wordle">Wordle</option>
                </select>
              </div>
            </div>
            <button style={btnStyle} onClick={create} disabled={creating}>{creating ? "Creating..." : `Create (${newT.entry_fee} coins)`}</button>
          </div>
        )}

        {loading ? <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading...</p> :
          tournaments.length === 0 ? <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.3)" }}><div style={{ fontSize: "3rem" }}>🏆</div><p>No tournaments yet. Create one!</p></div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {tournaments.map((t) => (
              <div key={t.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,203,255,0.12)", borderRadius: 16, padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.name}</h3>
                  <span style={{ fontSize: "0.75rem", padding: "0.2em 0.75em", borderRadius: 50, background: "rgba(126,203,255,0.1)", color: "#7ecbff" }}>{t.status}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>Game</div><div>{t.game}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>Entry</div><div style={{ color: "#fbbf24" }}>💰 {t.entry_fee}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>Prize Pool</div><div style={{ color: "#4ade80", fontWeight: 700 }}>💰 {t.prize_pool}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>Players</div><div>{t.player_count}/{t.max_players}</div>
                </div>
                {t.status === "open" && token && (
                  <button style={{ ...btnStyle, width: "100%", fontSize: "0.9rem" }} onClick={() => join(t.id)} disabled={joining === t.id}>
                    {joining === t.id ? "Joining..." : `Join (${t.entry_fee} coins)`}
                  </button>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
};

export default Tournaments;
