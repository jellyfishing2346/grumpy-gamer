import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AICoach from "../AICoach";
import Skeleton from "../Skeleton";
import { useDarkModeContext } from "../DarkModeProvider";
import API_URL from "../../config/api";
import EmptyState from "../EmptyState";

interface GameStat {
  game: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const HumanVsAI: React.FC = () => {
  const games = [
    "Tic-Tac-Toe", "Connect Four", "Checkers", "Chess", "Minesweeper",
    "Othello", "2048", "Wordle", "Snake", "Memory", "Hangman", "Sudoku", "Rock Paper Scissors",
  ];
  const difficulties = ["Easy", "Medium", "Hard"];
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [challengeMode, setChallengeMode] = useState("Single Game");
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useDarkModeContext();
  const navigate = useNavigate();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/stats/summary`, { headers: getAuthHeaders() });
        if (res.ok && mounted) {
          const data = await res.json();
          setStats(data.stats || []);
        }
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
      if (mounted) setLoading(false);
    }
    fetchStats();
    return () => { mounted = false; };
  }, []);

  const totalWins = stats.reduce((s, g) => s + g.wins, 0);
  const totalLosses = stats.reduce((s, g) => s + g.losses, 0);

  const handleStartChallenge = () => {
    if (!selectedGame) return;
    navigate(`/play/${selectedGame.toLowerCase().replace(/\s+/g, "")}?difficulty=${selectedDifficulty.toLowerCase()}`);
  };

  const cardStyle: React.CSSProperties = {
    background: cardBg, border: cardBorder, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em", backdropFilter: "blur(8px)",
    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
  };

  const sectionTitle = (text: string) => (
    <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>{text}</h2>
  );

  // Skeleton for the record table
  const RecordSkeleton = () => (
    <div style={cardStyle}>
      <Skeleton width="160px" height="1em" borderRadius={6} style={{ marginBottom: "1.5em" }} />
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "1em", marginBottom: "1em", alignItems: "center" }}>
          <Skeleton width="35%" height="1em" borderRadius={4} />
          <Skeleton width="10%" height="1em" borderRadius={4} />
          <Skeleton width="10%" height="1em" borderRadius={4} />
          <Skeleton width="10%" height="1em" borderRadius={4} />
          <Skeleton width="10%" height="1em" borderRadius={4} />
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#fff", marginBottom: "0.4em", letterSpacing: "-0.02em" }}>Human vs AI</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05em" }}>Choose your game and prove your skills against the Grumpy AI</p>
      </div>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 64px" }}>

        {/* Game Selection */}
        <div style={cardStyle}>
          {sectionTitle("🎮 Choose Your Game")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6em" }}>
            {games.map(game => (
              <button
                key={game}
                onClick={() => setSelectedGame(game)}
                style={{
                  padding: "0.55em 1em", borderRadius: 10, fontWeight: 600, fontSize: "0.92em",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: selectedGame === game ? "linear-gradient(90deg, #7ecbff, #4fa3d1)" : darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)",
                  color: selectedGame === game ? "#1a1a2e" : textPrimary,
                  border: selectedGame === game ? "none" : cardBorder,
                }}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty + Mode */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2em", marginBottom: "1.2em" }}>
          <div style={cardStyle}>
            {sectionTitle("⚡ AI Difficulty")}
            <div style={{ display: "flex", gap: "0.6em" }}>
              {difficulties.map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  style={{
                    flex: 1, padding: "0.6em", borderRadius: 10, fontWeight: 600, fontSize: "0.92em",
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                    background: selectedDifficulty === diff ? "linear-gradient(90deg, #7ecbff, #4fa3d1)" : darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)",
                    color: selectedDifficulty === diff ? "#1a1a2e" : textPrimary,
                    border: selectedDifficulty === diff ? "none" : cardBorder,
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            {sectionTitle("🏆 Challenge Mode")}
            <select
              value={challengeMode}
              onChange={e => setChallengeMode(e.target.value)}
              style={{
                width: "100%", padding: "0.65em 1em", borderRadius: 10,
                border: cardBorder, background: darkMode ? "rgba(255,255,255,0.06)" : "#fff",
                color: textPrimary, fontSize: "0.95em", fontFamily: "inherit", outline: "none",
              }}
            >
              <option>Single Game</option>
              <option>Best of 3</option>
              <option>Best of 5</option>
              <option>Streak Mode</option>
            </select>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartChallenge}
          disabled={!selectedGame}
          style={{
            width: "100%", padding: "1em", borderRadius: 14, border: "none",
            background: selectedGame ? "linear-gradient(90deg, #7ecbff, #4fa3d1)" : darkMode ? "rgba(255,255,255,0.08)" : "rgba(126,203,255,0.15)",
            color: selectedGame ? "#1a1a2e" : textMuted,
            fontWeight: 800, fontSize: "1.1em", cursor: selectedGame ? "pointer" : "not-allowed",
            fontFamily: "inherit", marginBottom: "1.2em", transition: "all 0.2s",
            boxShadow: selectedGame ? "0 4px 16px rgba(126,203,255,0.3)" : "none",
          }}
        >
          {selectedGame ? `▶ Start ${selectedGame}` : "Select a game to start"}
        </button>

        {/* Your Record — skeleton while loading */}
        {loading ? (
          <RecordSkeleton />
        ) : (
          <div style={cardStyle}>
            {sectionTitle("📊 Your Record vs AI")}
            {stats.length === 0 ? (
              <EmptyState
                icon="🏆"
                title="No record yet!"
                description="Play some games against the AI and your wins, losses, and draws will appear here."
                actionLabel="Pick a Game Above"
                actionRoute="/human-vs-ai"
              />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
                <thead>
                  <tr>
                    {["Game", "Wins", "Losses", "Draws", "Total"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0.75em", borderBottom: `2px solid ${darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.2)"}`, color: textMuted, fontWeight: 600, fontSize: "0.82em", textTransform: "uppercase" as const }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map(row => (
                    <tr key={row.game} style={{ borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.08)"}` }}>
                      <td style={{ padding: "0.85em 0.75em", color: textPrimary, fontWeight: 600 }}>{row.game}</td>
                      <td style={{ padding: "0.85em 0.75em", color: "#28e07b", fontWeight: 600 }}>{row.wins}</td>
                      <td style={{ padding: "0.85em 0.75em", color: "#ff7e67", fontWeight: 600 }}>{row.losses}</td>
                      <td style={{ padding: "0.85em 0.75em", color: "#ffe066", fontWeight: 600 }}>{row.draws}</td>
                      <td style={{ padding: "0.85em 0.75em", color: textMuted }}>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Leaderboard — skeleton while loading */}
        {loading ? (
          <div style={cardStyle}>
            <Skeleton width="120px" height="1em" borderRadius={6} style={{ marginBottom: "1.5em" }} />
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: "flex", gap: "1em", marginBottom: "1em" }}>
                <Skeleton width="40%" height="1em" borderRadius={4} />
                <Skeleton width="15%" height="1em" borderRadius={4} />
                <Skeleton width="15%" height="1em" borderRadius={4} />
              </div>
            ))}
          </div>
        ) : (
          <div style={cardStyle}>
            {sectionTitle("🏅 Leaderboard")}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
              <thead>
                <tr>
                  {["Player", "Wins", "Losses"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "0.75em", borderBottom: `2px solid ${darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.2)"}`, color: textMuted, fontWeight: 600, fontSize: "0.82em", textTransform: "uppercase" as const }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { player: "🧑 You", wins: totalWins, losses: totalLosses },
                  { player: "🤖 Grumpy AI", wins: totalLosses, losses: totalWins },
                ].map(row => (
                  <tr key={row.player} style={{ borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.08)"}` }}>
                    <td style={{ padding: "0.85em 0.75em", color: textPrimary, fontWeight: 600 }}>{row.player}</td>
                    <td style={{ padding: "0.85em 0.75em", color: "#28e07b", fontWeight: 600 }}>{row.wins}</td>
                    <td style={{ padding: "0.85em 0.75em", color: "#ff7e67", fontWeight: 600 }}>{row.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AICoach />
      </div>
    </div>
  );
};

export default HumanVsAI;
