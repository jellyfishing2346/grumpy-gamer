import React, { useEffect, useState } from "react";
import AIProgressChart from "./AIProgressChart";
import { useDarkModeContext } from "../DarkModeProvider";
import API_URL from "../../config/api";

interface GameStat {
  game: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

const Comparison: React.FC = () => {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useDarkModeContext();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/api/stats/summary`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || []);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  const gameLabels = stats.map(g => g.game);
  const userWins = stats.map(g => g.wins);
  const userLosses = stats.map(g => g.losses);
  const userDraws = stats.map(g => g.draws);
  const aiWins = userLosses;
  const aiLosses = userWins;
  const aiDraws = userDraws;

  const totalUserWins = userWins.reduce((a, b) => a + b, 0);
  const totalUserLosses = userLosses.reduce((a, b) => a + b, 0);
  const totalUserDraws = userDraws.reduce((a, b) => a + b, 0);
  const totalAIWins = aiWins.reduce((a, b) => a + b, 0);
  const totalAILosses = aiLosses.reduce((a, b) => a + b, 0);
  const totalAIDraws = aiDraws.reduce((a, b) => a + b, 0);

  const cardStyle: React.CSSProperties = {
    background: cardBg, border: cardBorder, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em", backdropFilter: "blur(8px)",
    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
  };

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      {/* Header */}
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#fff", marginBottom: "0.4em", letterSpacing: "-0.02em" }}>Comparison</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05em" }}>See how you stack up against the Grumpy AI</p>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 64px" }}>
        {loading ? (
          <div style={cardStyle}><p style={{ textAlign: "center", color: textMuted }}>Loading stats...</p></div>
        ) : (
          <>
            {/* Score Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2em", marginBottom: "1.2em" }}>
              {[
                { player: "You", wins: totalUserWins, losses: totalUserLosses, draws: totalUserDraws, color: "#7ecbff", emoji: "🧑" },
                { player: "Grumpy AI", wins: totalAIWins, losses: totalAILosses, draws: totalAIDraws, color: "#ff7e67", emoji: "🤖" },
              ].map(({ player, wins, losses, draws, color, emoji }) => (
                <div key={player} style={{ ...cardStyle, textAlign: "center", marginBottom: 0 }}>
                  <div style={{ fontSize: "2em", marginBottom: "0.3em" }}>{emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: "1.1em", color, marginBottom: "1em" }}>{player}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5em" }}>
                    {[
                      { label: "Wins", value: wins, color: "#28e07b" },
                      { label: "Losses", value: losses, color: "#ff7e67" },
                      { label: "Draws", value: draws, color: "#ffe066" },
                    ].map(({ label, value, color: c }) => (
                      <div key={label}>
                        <div style={{ fontSize: "1.6em", fontWeight: 800, color: c }}>{value}</div>
                        <div style={{ fontSize: "0.75em", color: textMuted }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tagline */}
            <div style={{ textAlign: "center", color: textMuted, fontStyle: "italic", marginBottom: "1.5em", fontSize: "0.95em" }}>
              Can you turn the tables and beat the AI? 🎮
            </div>

            {/* Per-game table */}
            {stats.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>📊 Per-Game Breakdown</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
                    <thead>
                      <tr>
                        {["Game", "Your Wins", "Your Losses", "Your Draws"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "0.75em", borderBottom: `2px solid ${darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.2)"}`, color: textMuted, fontWeight: 600, fontSize: "0.82em", textTransform: "uppercase" as const }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map(g => (
                        <tr key={g.game} style={{ borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.08)"}` }}>
                          <td style={{ padding: "0.85em 0.75em", color: textPrimary, fontWeight: 600 }}>{g.game}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#28e07b", fontWeight: 600 }}>{g.wins}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#ff7e67", fontWeight: 600 }}>{g.losses}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#ffe066", fontWeight: 600 }}>{g.draws}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Chart */}
            {stats.length > 0 && (
              <div style={cardStyle}>
                <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>📈 Visual Comparison</h2>
                <AIProgressChart
                  gameLabels={gameLabels}
                  userWins={userWins}
                  userLosses={userLosses}
                  userDraws={userDraws}
                  aiWins={aiWins}
                  aiLosses={aiLosses}
                  aiDraws={aiDraws}
                />
              </div>
            )}

            {stats.length === 0 && (
              <div style={{ ...cardStyle, textAlign: "center", padding: "3em" }}>
                <div style={{ fontSize: "2.5em", marginBottom: "0.5em" }}>🎮</div>
                <p style={{ color: textMuted }}>Play some games to see your comparison!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Comparison;
