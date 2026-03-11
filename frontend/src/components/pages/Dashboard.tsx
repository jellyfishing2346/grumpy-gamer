import React, { useState, useEffect } from "react";
import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";
import API_URL from "../../config/api";

// Types
interface GameStat {
  game: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

interface ActivityDay {
  date: string;
  count: number;
}

interface HistoryDay {
  date: string;
  win_rate: number;
}

// Styles
const containerStyle: React.CSSProperties = {
  padding: "2em",
  maxWidth: "1000px",
  margin: "2em auto",
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: "16px",
  boxShadow: "0 4px 24px 0 rgba(80, 120, 200, 0.10)",
  padding: "1.5em",
  marginBottom: "1.5em",
  border: "1.5px solid #e9f1ff",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.4em",
  marginBottom: "0.3em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textAlign: "center",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "1.4em",
  fontWeight: 700,
  color: "#23272f",
  marginBottom: "0.8em",
};

const statGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "1em",
};

const statBoxStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #f0f7ff 0%, #e3f0ff 100%)",
  borderRadius: "12px",
  padding: "1em",
  textAlign: "center",
};

const statValueStyle: React.CSSProperties = {
  fontSize: "2em",
  fontWeight: 800,
  color: "#3a7bd5",
};

const statLabelStyle: React.CSSProperties = {
  fontSize: "0.85em",
  color: "#666",
  marginTop: "0.3em",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.95em",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.75em",
  borderBottom: "2px solid #e9f1ff",
  color: "#666",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "0.75em",
  borderBottom: "1px solid #f0f4f8",
};

const gameIconMap: Record<string, string> = {
  tictactoe: "⭕",
  connectfour: "🔴",
  checkers: "🏁",
  chess: "♟️",
  minesweeper: "💣",
  othello: "⚫",
  "2048": "🔢",
  wordle: "📝",
  snake: "🐍",
  memory: "🧠",
  hangman: "👔",
  sudoku: "🔲",
  rockpaperscissors: "✊",
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [history, setHistory] = useState<HistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useDarkModeContext();

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

  const dk = (light: React.CSSProperties, dark: React.CSSProperties) =>
    getDarkModeStyles(darkMode, light, dark);

  if (loading) {
    return (
      <div style={dk(containerStyle, { ...containerStyle, background: "#181a20", color: "#f5f6fa" })}>
        <h1 style={dk(headingStyle, { ...headingStyle, color: "#7ecbff" })}>📊 Dashboard</h1>
        <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
          <p style={{ textAlign: "center", color: darkMode ? "#aaa" : "#666", fontSize: "1.2em" }}>
            Loading your stats...
          </p>
        </div>
      </div>
    );
  }

  const hasData = totalGames > 0;

  return (
    <div style={dk(containerStyle, { ...containerStyle, background: "#181a20", color: "#f5f6fa" })}>
      <h1 style={dk(headingStyle, { ...headingStyle, color: "#7ecbff" })}>📊 Dashboard</h1>
      <p style={{ textAlign: "center", color: darkMode ? "#aaa" : "#666", marginBottom: "1.5em" }}>
        Track your gaming activity and statistics
      </p>

      {!hasData ? (
        <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
          <h2 style={{ color: darkMode ? "#7ecbff" : "#3a7bd5", textAlign: "center" }}>
            🎮 No games recorded yet!
          </h2>
          <p style={{ color: darkMode ? "#aaa" : "#666", textAlign: "center" }}>
            Start playing some games and your statistics will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Overview */}
          <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
            <h2 style={dk(sectionHeadingStyle, { ...sectionHeadingStyle, color: "#7ecbff" })}>
              📈 Overview
            </h2>
            <div style={statGridStyle}>
              {[
                { label: "Games Played", value: totalGames, color: darkMode ? "#7ecbff" : "#3a7bd5" },
                { label: "Wins", value: totalWins, color: darkMode ? "#28e07b" : "#28a745" },
                { label: "Losses", value: totalLosses, color: darkMode ? "#ff7e67" : "#dc3545" },
                { label: "Draws", value: totalDraws, color: darkMode ? "#ffe066" : "#ffc107" },
                { label: "Win Rate", value: `${winRate}%`, color: darkMode ? "#7ecbff" : "#3a7bd5" },
              ].map(({ label, value, color }) => (
                <div key={label} style={dk(statBoxStyle, { ...statBoxStyle, background: "#181a20" })}>
                  <div style={{ ...statValueStyle, color }}>{value}</div>
                  <div style={dk(statLabelStyle, { ...statLabelStyle, color: "#aaa" })}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-Game Breakdown */}
          <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
            <h2 style={dk(sectionHeadingStyle, { ...sectionHeadingStyle, color: "#7ecbff" })}>
              🎮 Game Breakdown
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    {["Game", "Played", "Wins", "Losses", "Draws", "Win Rate"].map((h) => (
                      <th key={h} style={dk(thStyle, { ...thStyle, color: "#aaa", borderBottom: "2px solid #444" })}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((g) => {
                    const wr = g.total > 0 ? ((g.wins / g.total) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={g.game}>
                        <td style={dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" })}>
                          <span style={{ marginRight: "0.5em" }}>
                            {gameIconMap[g.game.toLowerCase()] || "🎮"}
                          </span>
                          {g.game}
                        </td>
                        <td style={dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" })}>{g.total}</td>
                        <td style={{ ...dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" }), color: darkMode ? "#28e07b" : "#28a745", fontWeight: 600 }}>
                          {g.wins}
                        </td>
                        <td style={{ ...dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" }), color: darkMode ? "#ff7e67" : "#dc3545", fontWeight: 600 }}>
                          {g.losses}
                        </td>
                        <td style={{ ...dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" }), color: darkMode ? "#ffe066" : "#ffc107", fontWeight: 600 }}>
                          {g.draws}
                        </td>
                        <td style={dk(tdStyle, { ...tdStyle, borderBottom: "1px solid #444" })}>{wr}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Activity */}
          {activity.length > 0 && (
            <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
              <h2 style={dk(sectionHeadingStyle, { ...sectionHeadingStyle, color: "#7ecbff" })}>
                📅 Daily Activity (Last 30 Days)
              </h2>
              <div style={{ display: "flex", gap: "0.4em", alignItems: "flex-end", height: "120px" }}>
                {activity.map((day, idx) => {
                  const maxCount = Math.max(...activity.map((d) => d.count), 1);
                  const height = (day.count / maxCount) * 100;
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        title={`${day.date}: ${day.count} games`}
                        style={{
                          width: "100%",
                          maxWidth: "40px",
                          height: `${Math.max(height, 5)}%`,
                          background: darkMode
                            ? "linear-gradient(180deg, #7ecbff 0%, #3a7bd5 100%)"
                            : "linear-gradient(180deg, #3a7bd5 0%, #7ecbff 100%)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.65em", color: darkMode ? "#aaa" : "#999", marginTop: "0.3em" }}>
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Win Rate Over Time */}
          {history.length > 0 && (
            <div style={dk(cardStyle, { ...cardStyle, background: "#23272f", color: "#f5f6fa" })}>
              <h2 style={dk(sectionHeadingStyle, { ...sectionHeadingStyle, color: "#7ecbff" })}>
                📈 Win Rate Over Time
              </h2>
              <div style={{ display: "flex", gap: "0.4em", alignItems: "flex-end", height: "120px" }}>
                {history.map((day, idx) => {
                  const height = day.win_rate;
                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        title={`${day.date}: ${day.win_rate}% win rate`}
                        style={{
                          width: "100%",
                          maxWidth: "40px",
                          height: `${Math.max(height, 5)}%`,
                          background: darkMode
                            ? "linear-gradient(180deg, #28e07b 0%, #1a9950 100%)"
                            : "linear-gradient(180deg, #28a745 0%, #28e07b 100%)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: "4px",
                        }}
                      />
                      <span style={{ fontSize: "0.65em", color: darkMode ? "#aaa" : "#999", marginTop: "0.3em" }}>
                        {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ textAlign: "right", fontSize: "0.8em", color: darkMode ? "#aaa" : "#999", marginTop: "0.5em" }}>
                Bar height = win rate %
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;