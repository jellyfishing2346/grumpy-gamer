import React, { useState, useEffect } from "react";
import { useDarkModeContext } from "../DarkModeProvider";
import API_URL from "../../config/api";

interface GameStat { game: string; wins: number; losses: number; draws: number; total: number; }
interface ActivityDay { date: string; count: number; }
interface HistoryDay { date: string; win_rate: number; }

const gameIconMap: Record<string, string> = {
  tictactoe: "⭕", connectfour: "🔴", checkers: "🏁", chess: "♟️",
  minesweeper: "💣", othello: "⚫", "2048": "🔢", wordle: "📝",
  snake: "🐍", memory: "🧠", hangman: "👔", sudoku: "🔲", rockpaperscissors: "✊",
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useDarkModeContext();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const headers = getAuthHeaders();
      try {
        const [summaryRes, activityRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/api/stats/summary`, { headers }),
          fetch(`${API_URL}/api/stats/activity`, { headers }),
          fetch(`${API_URL}/api/stats/history`, { headers }),
        ]);
        const summaryData = summaryRes.ok ? await summaryRes.json() : { stats: [] };
        const activityData = activityRes.ok ? await activityRes.json() : { activity: [] };
        const historyData = historyRes.ok ? await historyRes.json() : { history: [] };
        setStats(summaryData.stats || []);
        setActivity(activityData.activity || []);
        setHistory(historyData.history || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalGames = stats.reduce((s, g) => s + g.total, 0);
  const totalWins = stats.reduce((s, g) => s + g.wins, 0);
  const totalLosses = stats.reduce((s, g) => s + g.losses, 0);
  const totalDraws = stats.reduce((s, g) => s + g.draws, 0);
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

  const cardStyle: React.CSSProperties = {
    background: cardBg, border: cardBorder, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em", backdropFilter: "blur(8px)",
    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
  };

  const sectionTitle = (text: string) => (
    <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>{text}</h2>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#fff", marginBottom: "0.4em", letterSpacing: "-0.02em" }}>📊 Dashboard</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05em" }}>Track your gaming activity and statistics</p>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 64px" }}>
        {loading ? (
          <div style={cardStyle}><p style={{ textAlign: "center", color: textMuted, fontSize: "1.1em" }}>Loading your stats...</p></div>
        ) : totalGames === 0 ? (
          <div style={cardStyle}>
            <div style={{ textAlign: "center", padding: "2em 0" }}>
              <div style={{ fontSize: "3em", marginBottom: "0.5em" }}>🎮</div>
              <h2 style={{ color: "#7ecbff", marginBottom: "0.5em" }}>No games recorded yet!</h2>
              <p style={{ color: textMuted }}>Start playing some games and your stats will appear here.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Overview */}
            <div style={cardStyle}>
              {sectionTitle("📈 Overview")}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "1em" }}>
                {[
                  { label: "Games Played", value: totalGames, color: "#7ecbff" },
                  { label: "Wins", value: totalWins, color: "#28e07b" },
                  { label: "Losses", value: totalLosses, color: "#ff7e67" },
                  { label: "Draws", value: totalDraws, color: "#ffe066" },
                  { label: "Win Rate", value: `${winRate}%`, color: "#7ecbff" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.06)",
                    border: darkMode ? "1px solid rgba(126,203,255,0.08)" : "1px solid rgba(126,203,255,0.15)",
                    borderRadius: 12, padding: "1em", textAlign: "center",
                  }}>
                    <div style={{ fontSize: "1.9em", fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: "0.82em", color: textMuted, marginTop: "0.3em" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Breakdown */}
            <div style={cardStyle}>
              {sectionTitle("🎮 Game Breakdown")}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
                  <thead>
                    <tr>
                      {["Game", "Played", "Wins", "Losses", "Draws", "Win Rate"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "0.75em", borderBottom: `2px solid ${darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.2)"}`, color: textMuted, fontWeight: 600, fontSize: "0.82em", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map(g => {
                      const wr = g.total > 0 ? ((g.wins / g.total) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={g.game} style={{ borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.08)"}` }}>
                          <td style={{ padding: "0.85em 0.75em", color: textPrimary, fontWeight: 600 }}><span style={{ marginRight: "0.5em" }}>{gameIconMap[g.game.toLowerCase()] || "🎮"}</span>{g.game}</td>
                          <td style={{ padding: "0.85em 0.75em", color: textMuted }}>{g.total}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#28e07b", fontWeight: 600 }}>{g.wins}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#ff7e67", fontWeight: 600 }}>{g.losses}</td>
                          <td style={{ padding: "0.85em 0.75em", color: "#ffe066", fontWeight: 600 }}>{g.draws}</td>
                          <td style={{ padding: "0.85em 0.75em", color: textPrimary }}>{wr}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Activity */}
            {activity.length > 0 && (
              <div style={cardStyle}>
                {sectionTitle("📅 Daily Activity (Last 30 Days)")}
                <div style={{ display: "flex", gap: "0.3em", alignItems: "flex-end", height: 120 }}>
                  {activity.map((day, idx) => {
                    const maxCount = Math.max(...activity.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div title={`${day.date}: ${day.count} games`} style={{ width: "100%", maxWidth: 32, height: `${Math.max(height, 5)}%`, background: "linear-gradient(180deg, #7ecbff 0%, #4fa3d1 100%)", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                        <span style={{ fontSize: "0.6em", color: textMuted, marginTop: "0.3em" }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Win Rate Over Time */}
            {history.length > 0 && (
              <div style={cardStyle}>
                {sectionTitle("📈 Win Rate Over Time")}
                <div style={{ display: "flex", gap: "0.3em", alignItems: "flex-end", height: 120 }}>
                  {history.map((day, idx) => (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div title={`${day.date}: ${day.win_rate}% win rate`} style={{ width: "100%", maxWidth: 32, height: `${Math.max(day.win_rate, 5)}%`, background: "linear-gradient(180deg, #28e07b 0%, #1a9950 100%)", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                      <span style={{ fontSize: "0.6em", color: textMuted, marginTop: "0.3em" }}>{new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                    </div>
                  ))}
                </div>
                <div style={{ textAlign: "right", fontSize: "0.78em", color: textMuted, marginTop: "0.5em" }}>Bar height = win rate %</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;