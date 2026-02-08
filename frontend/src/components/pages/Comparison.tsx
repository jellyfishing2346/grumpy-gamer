import React, { useEffect, useState } from "react";
import AIProgressChart from "./AIProgressChart";
import gameStatsService from "../../services/gameStatsService";
const { getGameDisplayName } = gameStatsService;


const containerStyle: React.CSSProperties = {
  padding: "2.5em 2em",
  maxWidth: 700,
  margin: "3.5em auto",
  background: "#fff",
  borderRadius: 22,
  boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
  color: "#23272f",
  textAlign: "center",
  border: "1.5px solid #e9f1ff",
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.6em",
  marginBottom: "0.4em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textShadow: "0 2px 12px #23272f55"
};

const Comparison: React.FC = () => {
  const [gameBreakdown, setGameBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      const summary = await gameStatsService.getActivitySummary(7);
      setGameBreakdown(summary?.gameBreakdown || []);
      setLoading(false);
    }
    fetchStats();
  }, []);

  // Prepare chart data
  const gameLabels = gameBreakdown.map(g => getGameDisplayName(g.gameType));
  const userWins = gameBreakdown.map(g => g.wins);
  const userLosses = gameBreakdown.map(g => g.losses);
  const userDraws = gameBreakdown.map(g => g.draws);
  // AI stats: AI wins = user losses, AI losses = user wins, AI draws = user draws
  const aiWins = userLosses;
  const aiLosses = userWins;
  const aiDraws = userDraws;

  // Calculate totals for table
  const totalUserWins = userWins.reduce((a, b) => a + b, 0);
  const totalUserLosses = userLosses.reduce((a, b) => a + b, 0);
  const totalUserDraws = userDraws.reduce((a, b) => a + b, 0);
  const totalAIWins = aiWins.reduce((a, b) => a + b, 0);
  const totalAILosses = aiLosses.reduce((a, b) => a + b, 0);
  const totalAIDraws = aiDraws.reduce((a, b) => a + b, 0);

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Comparison</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
        See how you stack up against the Grumpy AI:
      </p>
      <table style={{ margin: "0 auto", background: "#181a20", borderRadius: 8, color: "#fff", minWidth: 320, fontSize: "1.05em" }}>
        <thead>
          <tr style={{ color: "#4f8cff" }}>
            <th style={{ padding: "0.5em 1em" }}>Player</th>
            <th style={{ padding: "0.5em 1em" }}>Wins</th>
            <th style={{ padding: "0.5em 1em" }}>Losses</th>
            <th style={{ padding: "0.5em 1em" }}>Draws</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "0.5em 1em" }}>You</td>
            <td style={{ padding: "0.5em 1em" }}>{totalUserWins}</td>
            <td style={{ padding: "0.5em 1em" }}>{totalUserLosses}</td>
            <td style={{ padding: "0.5em 1em" }}>{totalUserDraws}</td>
          </tr>
          <tr>
            <td style={{ padding: "0.5em 1em" }}>Grumpy AI</td>
            <td style={{ padding: "0.5em 1em" }}>{totalAIWins}</td>
            <td style={{ padding: "0.5em 1em" }}>{totalAILosses}</td>
            <td style={{ padding: "0.5em 1em" }}>{totalAIDraws}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ color: "#aaa", marginTop: "1em" }}>
        <i>Can you turn the tables and beat the AI?</i>
      </div>
      {/* AI learning progress chart */}
      <div style={{ marginTop: "2.5em" }}>
        {loading ? (
          <div>Loading chart...</div>
        ) : (
          <AIProgressChart
            gameLabels={gameLabels}
            userWins={userWins}
            userLosses={userLosses}
            userDraws={userDraws}
            aiWins={aiWins}
            aiLosses={aiLosses}
            aiDraws={aiDraws}
          />
        )}
      </div>
    </div>
  );
};

export default Comparison;
