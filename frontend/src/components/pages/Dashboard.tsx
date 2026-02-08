import React, { useState, useEffect } from "react";
import {
  getActivitySummary,
  getRecentGames,
  formatDuration,
  getGameDisplayName,
  ActivitySummary,
  GameSession,
  GameType,
} from "../../services/gameStatsService";

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
  textShadow: "0 2px 12px #23272f55",
  textAlign: "center",
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: "1.4em",
  fontWeight: 700,
  color: "#23272f",
  marginBottom: "0.8em",
  display: "flex",
  alignItems: "center",
  gap: "0.5em",
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

const resultBadgeStyle = (result: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; text: string }> = {
    win: { bg: "#d4edda", text: "#155724" },
    loss: { bg: "#f8d7da", text: "#721c24" },
    draw: { bg: "#fff3cd", text: "#856404" },
    abandoned: { bg: "#e2e3e5", text: "#383d41" },
  };
  const color = colors[result] || colors.abandoned;
  return {
    display: "inline-block",
    padding: "0.25em 0.75em",
    borderRadius: "12px",
    fontSize: "0.85em",
    fontWeight: 600,
    backgroundColor: color.bg,
    color: color.text,
    textTransform: "capitalize",
  };
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

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [summaryData, recentData] = await Promise.all([
        getActivitySummary(days),
        getRecentGames(15),
      ]);
      setSummary(summaryData);
      setRecentGames(recentData);
      setLoading(false);
    };
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <h1 style={headingStyle}>📊 Dashboard</h1>
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ fontSize: "1.2em", color: "#666" }}>Loading your stats...</p>
        </div>
      </div>
    );
  }

  const hasData = summary && summary.totalGames > 0;

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>📊 Dashboard</h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "1.5em" }}>
        Track your gaming activity and statistics
      </p>

      {/* Period Selector */}
      <div style={{ textAlign: "center", marginBottom: "1.5em" }}>
        <span style={{ marginRight: "1em", fontWeight: 500 }}>Show stats for:</span>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: "0.5em 1em",
              margin: "0 0.3em",
              borderRadius: "8px",
              border: days === d ? "2px solid #3a7bd5" : "1px solid #ddd",
              background: days === d ? "#e3f0ff" : "#fff",
              color: days === d ? "#3a7bd5" : "#666",
              fontWeight: days === d ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {d} days
          </button>
        ))}
      </div>

      {!hasData ? (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <h2 style={{ color: "#3a7bd5", marginBottom: "0.5em" }}>🎮 No games recorded yet!</h2>
          <p style={{ color: "#666" }}>
            Start playing some games and your statistics will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div style={cardStyle}>
            <h2 style={sectionHeadingStyle}>📈 Overview (Last {days} Days)</h2>
            <div style={statGridStyle}>
              <div style={statBoxStyle}>
                <div style={statValueStyle}>{summary!.totalGames}</div>
                <div style={statLabelStyle}>Games Played</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ ...statValueStyle, color: "#28a745" }}>{summary!.totalWins}</div>
                <div style={statLabelStyle}>Wins</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ ...statValueStyle, color: "#dc3545" }}>{summary!.totalLosses}</div>
                <div style={statLabelStyle}>Losses</div>
              </div>
              <div style={statBoxStyle}>
                <div style={{ ...statValueStyle, color: "#ffc107" }}>{summary!.totalDraws}</div>
                <div style={statLabelStyle}>Draws</div>
              </div>
              <div style={statBoxStyle}>
                <div style={statValueStyle}>{summary!.winRate.toFixed(1)}%</div>
                <div style={statLabelStyle}>Win Rate</div>
              </div>
              <div style={statBoxStyle}>
                <div style={statValueStyle}>{formatDuration(summary!.totalTimeSeconds)}</div>
                <div style={statLabelStyle}>Time Played</div>
              </div>
            </div>
          </div>

          {/* Per-Game Breakdown */}
          {summary!.gameBreakdown.length > 0 && (
            <div style={cardStyle}>
              <h2 style={sectionHeadingStyle}>🎮 Game Breakdown</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Game</th>
                      <th style={thStyle}>Played</th>
                      <th style={thStyle}>Wins</th>
                      <th style={thStyle}>Losses</th>
                      <th style={thStyle}>Draws</th>
                      <th style={thStyle}>Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary!.gameBreakdown.map((game) => {
                      const winRate = game.totalGames > 0
                        ? ((game.wins / game.totalGames) * 100).toFixed(1)
                        : "0.0";
                      return (
                        <tr key={game.gameType}>
                          <td style={tdStyle}>
                            <span style={{ marginRight: "0.5em" }}>
                              {gameIconMap[game.gameType] || "🎮"}
                            </span>
                            {getGameDisplayName(game.gameType as GameType)}
                          </td>
                          <td style={tdStyle}>{game.totalGames}</td>
                          <td style={{ ...tdStyle, color: "#28a745", fontWeight: 600 }}>
                            {game.wins}
                          </td>
                          <td style={{ ...tdStyle, color: "#dc3545", fontWeight: 600 }}>
                            {game.losses}
                          </td>
                          <td style={{ ...tdStyle, color: "#ffc107", fontWeight: 600 }}>
                            {game.draws}
                          </td>
                          <td style={tdStyle}>{winRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily Activity Chart */}
          {summary!.dailyBreakdown.length > 0 && (
            <div style={cardStyle}>
              <h2 style={sectionHeadingStyle}>📅 Daily Activity</h2>
              <div style={{ display: "flex", gap: "0.5em", alignItems: "flex-end", height: "120px" }}>
                {[...summary!.dailyBreakdown].reverse().map((day, idx) => {
                  const maxGames = Math.max(...summary!.dailyBreakdown.map((d) => d.totalGames), 1);
                  const height = (day.totalGames / maxGames) * 100;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          maxWidth: "40px",
                          height: `${Math.max(height, 5)}%`,
                          background: "linear-gradient(180deg, #3a7bd5 0%, #7ecbff 100%)",
                          borderRadius: "4px 4px 0 0",
                          minHeight: "4px",
                        }}
                        title={`${day.totalGames} games`}
                      />
                      <span style={{ fontSize: "0.7em", color: "#999", marginTop: "0.3em" }}>
                        {new Date(day.activityDate).toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent Games */}
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>🕐 Recent Games</h2>
        {recentGames.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center" }}>No games played yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Game</th>
                  <th style={thStyle}>Result</th>
                  <th style={thStyle}>Moves</th>
                  <th style={thStyle}>Duration</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentGames.map((game) => (
                  <tr key={game.id}>
                    <td style={tdStyle}>
                      <span style={{ marginRight: "0.5em" }}>
                        {gameIconMap[game.gameType] || "🎮"}
                      </span>
                      {getGameDisplayName(game.gameType as GameType)}
                    </td>
                    <td style={tdStyle}>
                      <span style={resultBadgeStyle(game.result)}>{game.result}</span>
                    </td>
                    <td style={tdStyle}>{game.movesCount}</td>
                    <td style={tdStyle}>{formatDuration(game.durationSeconds)}</td>
                    <td style={tdStyle}>
                      {new Date(game.endedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
