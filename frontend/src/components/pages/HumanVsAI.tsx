import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AICoach from "../AICoach";
import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";
import API_URL from "../../config/api";

const baseContainerStyle: React.CSSProperties = {
  padding: "2.5em 2em",
  maxWidth: 700,
  margin: "3.5em auto",
  background: "#fff",
  borderRadius: 22,
  boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
  color: "#23272f",
  textAlign: "center",
  border: "1.5px solid #e9f1ff",
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', 'Arial', 'sans-serif'",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.6em",
  marginBottom: "0.4em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textShadow: "0 2px 12px #23272f55",
};

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
    "Othello", "2048", "Wordle", "Snake", "Memory", "Hangman", "Sudoku",
    "Rock Paper Scissors",
  ];
  const difficulties = ["Easy", "Medium", "Hard"];
  const [selectedGame, setSelectedGame] = React.useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>(difficulties[1]);
  const [challengeMode, setChallengeMode] = React.useState<string>("Single Game");
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/stats/summary`, {
          headers: getAuthHeaders(),
        });
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

  // Derive leaderboard from summary stats
  const totalWins = stats.reduce((s, g) => s + g.wins, 0);
  const totalLosses = stats.reduce((s, g) => s + g.losses, 0);
  const leaderboard = [
    { player: "You", wins: totalWins, losses: totalLosses },
    { player: "Grumpy AI", wins: totalLosses, losses: totalWins },
  ];

  const navigate = useNavigate();
  const handleStartChallenge = () => {
    if (!selectedGame) return;
    navigate(
      `/play/${selectedGame.toLowerCase().replace(/\s+/g, "")}?difficulty=${selectedDifficulty.toLowerCase()}`
    );
  };

  const [darkMode] = useDarkModeContext();
  const containerStyle = getDarkModeStyles(darkMode, baseContainerStyle, {
    background: "#23272f",
    color: "#f5f6fa",
    border: "1.5px solid #444",
    boxShadow: "0 4px 32px 0 rgba(31, 38, 135, 0.37)",
  });

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Human vs AI</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
        Ready to face the Grumpy AI? Choose your game and prove your skills!
      </p>

      {/* Game Selection Grid */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, margin: "2em 0 1em 0" }}>
        {games.map((game) => (
          <button
            key={game}
            onClick={() => setSelectedGame(game)}
            style={getDarkModeStyles(
              darkMode,
              {
                padding: "0.8em 1.2em", borderRadius: 10, fontWeight: 600,
                fontSize: "1em", cursor: "pointer", marginBottom: 8, minWidth: 120,
                border: selectedGame === game ? "2px solid #7ecbff" : "1.5px solid #e9f1ff",
                background: selectedGame === game ? "#e9f7ff" : "#f7fbff",
                color: "#23272f",
              },
              {
                background: selectedGame === game ? "#23272f" : "#181a20",
                color: selectedGame === game ? "#7ecbff" : "#f5f6fa",
                border: selectedGame === game ? "2px solid #7ecbff" : "1.5px solid #444",
              }
            )}
          >
            {game}
          </button>
        ))}
      </div>

      {/* Difficulty Selector */}
      <div style={{ margin: "1.5em 0" }}>
        <span style={{ fontWeight: 600, marginRight: 12 }}>AI Difficulty:</span>
        {difficulties.map((diff) => (
          <button
            key={diff}
            onClick={() => setSelectedDifficulty(diff)}
            style={getDarkModeStyles(
              darkMode,
              {
                marginRight: 8, padding: "0.5em 1em", borderRadius: 8, fontWeight: 600, cursor: "pointer",
                border: selectedDifficulty === diff ? "2px solid #7ecbff" : "1.5px solid #e9f1ff",
                background: selectedDifficulty === diff ? "#e9f7ff" : "#f7fbff",
                color: "#23272f",
              },
              {
                background: selectedDifficulty === diff ? "#23272f" : "#181a20",
                color: selectedDifficulty === diff ? "#7ecbff" : "#f5f6fa",
                border: selectedDifficulty === diff ? "2px solid #7ecbff" : "1.5px solid #444",
              }
            )}
          >
            {diff}
          </button>
        ))}
      </div>

      {/* Start Challenge Button */}
      <div style={{ margin: "1.5em 0" }}>
        <button
          onClick={handleStartChallenge}
          disabled={!selectedGame}
          style={getDarkModeStyles(
            darkMode,
            {
              padding: "0.9em 2em", borderRadius: 12, color: "#fff", fontWeight: 700,
              fontSize: "1.1em", border: "none", transition: "background 0.2s",
              background: selectedGame ? "#4f8cff" : "#b0cfff",
              cursor: selectedGame ? "pointer" : "not-allowed",
              boxShadow: selectedGame ? "0 2px 8px #4f8cff33" : undefined,
            },
            {
              background: selectedGame ? "#23272f" : "#181a20",
              color: selectedGame ? "#7ecbff" : "#b3e0ff",
              border: selectedGame ? "2px solid #7ecbff" : "1.5px solid #444",
            }
          )}
        >
          Start Challenge
        </button>
      </div>

      {/* Challenge Mode */}
      <div style={{ margin: "1.5em 0" }}>
        <span style={{ fontWeight: 600, marginRight: 12 }}>Challenge Mode:</span>
        <select
          value={challengeMode}
          onChange={(e) => setChallengeMode(e.target.value)}
          style={getDarkModeStyles(
            darkMode,
            { padding: "0.5em 1em", borderRadius: 8, fontWeight: 600 },
            { background: "#181a20", color: "#7ecbff", border: "1.5px solid #444" }
          )}
        >
          <option>Single Game</option>
          <option>Best of 3</option>
          <option>Best of 5</option>
          <option>Streak Mode</option>
        </select>
      </div>

      {/* Your Record vs AI */}
      <div style={{ margin: "2em 0" }}>
        <h3 style={{ color: "#7ecbff", marginBottom: 8 }}>Your Record vs AI</h3>
        {loading ? (
          <div style={{ color: "#7ecbff", textAlign: "center", padding: "1em" }}>Loading stats...</div>
        ) : stats.length === 0 ? (
          <div style={{ color: darkMode ? "#aaa" : "#666" }}>Play some games to see your record!</div>
        ) : (
          <table style={getDarkModeStyles(
            darkMode,
            { margin: "0 auto", background: "#181a20", borderRadius: 8, color: "#fff", minWidth: 320, fontSize: "1.05em" },
            { background: "#181a20", color: "#7ecbff", border: "1px solid #444" }
          )}>
            <thead>
              <tr style={{ color: "#4f8cff" }}>
                <th style={{ padding: "0.5em 1em" }}>Game</th>
                <th style={{ padding: "0.5em 1em" }}>Wins</th>
                <th style={{ padding: "0.5em 1em" }}>Losses</th>
                <th style={{ padding: "0.5em 1em" }}>Draws</th>
                <th style={{ padding: "0.5em 1em" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.game}>
                  <td style={{ padding: "0.5em 1em" }}>{row.game}</td>
                  <td style={{ padding: "0.5em 1em", color: "#28e07b" }}>{row.wins}</td>
                  <td style={{ padding: "0.5em 1em", color: "#ff7e67" }}>{row.losses}</td>
                  <td style={{ padding: "0.5em 1em", color: "#ffe066" }}>{row.draws}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leaderboard */}
      <div style={{ margin: "2em 0" }}>
        <h3 style={{ color: "#7ecbff", marginBottom: 8 }}>Leaderboard</h3>
        <table style={getDarkModeStyles(
          darkMode,
          { margin: "0 auto", background: "#23272f", borderRadius: 8, color: "#fff", minWidth: 320, fontSize: "1.05em" },
          { background: "#23272f", color: "#7ecbff", border: "1px solid #444" }
        )}>
          <thead>
            <tr style={{ color: "#ffd700" }}>
              <th style={{ padding: "0.5em 1em" }}>Player</th>
              <th style={{ padding: "0.5em 1em" }}>Wins</th>
              <th style={{ padding: "0.5em 1em" }}>Losses</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.player}>
                <td style={{ padding: "0.5em 1em" }}>{row.player}</td>
                <td style={{ padding: "0.5em 1em", color: "#28e07b" }}>{row.wins}</td>
                <td style={{ padding: "0.5em 1em", color: "#ff7e67" }}>{row.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AICoach />
    </div>
  );
};

export default HumanVsAI;
