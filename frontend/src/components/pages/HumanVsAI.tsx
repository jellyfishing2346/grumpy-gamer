
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import gameStatsService, { getGameDisplayName, ActivitySummary, GameType } from "../../services/gameStatsService";


import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";

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
  textShadow: "0 2px 12px #23272f55"
};

const HumanVsAI: React.FC = () => {
  // Placeholder state for selected game, difficulty, challenge mode, etc.
  // Replace with real state/hooks as you implement logic
  const games = [
    "Tic-Tac-Toe", "Connect Four", "Checkers", "Chess", "Minesweeper", "Othello", "2048", "Wordle", "Snake", "Memory", "Hangman", "Sudoku", "Rock Paper Scissors"
  ];
  const difficulties = ["Easy", "Medium", "Hard"];
  const [selectedGame, setSelectedGame] = React.useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>(difficulties[1]);
  const [challengeMode, setChallengeMode] = React.useState<string>("Single Game");
  // Stats state (synced with dashboard)
  const [stats, setStats] = useState<{ game: string; wins: number; losses: number; draws: number; streak: number; bestStreak: number }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      setLoading(true);
      const summary: ActivitySummary | null = await gameStatsService.getActivitySummary(7);
      if (!mounted) return;
      if (summary && summary.gameBreakdown) {
        setStats(summary.gameBreakdown.map(b => ({
          game: getGameDisplayName(b.gameType as GameType),
          wins: b.wins,
          losses: b.losses,
          draws: b.draws,
          streak: 0, // Optionally, fetch from lifetime stats if needed
          bestStreak: 0
        })));
      } else {
        setStats([]);
      }
      setLoading(false);
    }
    fetchStats();
    return () => { mounted = false; };
  }, []);
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<{ player: string; streak: number; fastestWin: string }[]>([]);
  useEffect(() => {
    let mounted = true;
    async function fetchLeaderboard() {
      // Fetch all-time best streak from backend
      const lifetimeStats = await gameStatsService.getLifetimeStats();
      if (!mounted) return;
      // Sum up all games vs AI for all games
      let bestStreak = 0;
      if (lifetimeStats && lifetimeStats.length > 0) {
        bestStreak = lifetimeStats.reduce((max, stat) => Math.max(max, stat.longestWinStreak || 0), 0);
      }
      // Still use recent games for fastest win
      const recentGames = await gameStatsService.getRecentGames(50);
      const aiGames = recentGames.filter(g => g.opponentType === 'ai' && g.result === 'win');
      let fastestWin: number | null = null;
      aiGames.forEach(g => {
        if (!fastestWin || (g.durationSeconds && g.durationSeconds < fastestWin)) {
          fastestWin = g.durationSeconds;
        }
      });
      setLeaderboard([
        { player: "You", streak: bestStreak, fastestWin: fastestWin ? gameStatsService.formatDuration(fastestWin) : "-" },
        { player: "Grumpy AI", streak: 5, fastestWin: "8s" },
      ]);
    }
    fetchLeaderboard();
    return () => { mounted = false; };
  }, []);
  // Dynamic AI learning feedback
  const [aiFeedback, setAiFeedback] = useState<string>("The AI is analyzing your play style...");
  useEffect(() => {
    // Use stats and leaderboard to generate feedback
    if (!stats.length) return;
    const userStats = stats.reduce((acc, g) => {
      acc.wins += g.wins;
      acc.losses += g.losses;
      acc.draws += g.draws;
      acc.streak = Math.max(acc.streak, g.streak);
      return acc;
    }, { wins: 0, losses: 0, draws: 0, streak: 0 });
    let feedback = "The AI is analyzing your play style...";
    if (userStats.streak >= 3) {
      feedback = `Impressive! You're on a ${userStats.streak}-game win streak. The AI is adapting.`;
    } else if (userStats.wins > userStats.losses) {
      feedback = `You're ahead with ${userStats.wins} wins! The AI is learning from its mistakes.`;
    } else if (userStats.losses > userStats.wins) {
      feedback = `The AI has the upper hand (${userStats.losses} wins). Can you turn the tide?`;
    } else if (userStats.draws > 0) {
      feedback = `It's a close match! Draws: ${userStats.draws}. The AI is getting smarter.`;
    }
    setAiFeedback(feedback);
  }, [stats]);



  const navigate = useNavigate();
  const handleStartChallenge = () => {
    if (!selectedGame) return;
    navigate(`/play/${selectedGame.toLowerCase().replace(/\s+/g, "")}?difficulty=${selectedDifficulty.toLowerCase()}`);
  };

  const [darkMode] = useDarkModeContext();
  const containerStyle = getDarkModeStyles(
    darkMode,
    baseContainerStyle,
    {
      background: "#23272f",
      color: "#f5f6fa",
      border: "1.5px solid #444",
      boxShadow: "0 4px 32px 0 rgba(31, 38, 135, 0.37)",
    }
  );
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Human vs AI</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
        Ready to face the Grumpy AI? Choose your game and prove your skills!
      </p>

      {/* Game Selection Grid */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, margin: "2em 0 1em 0" }}>
        {games.map(game => (
          <button
            key={game}
            style={getDarkModeStyles(
              darkMode,
              {
                padding: "0.8em 1.2em",
                borderRadius: 10,
                border: selectedGame === game ? "2px solid #7ecbff" : "1.5px solid #e9f1ff",
                background: selectedGame === game ? "#e9f7ff" : "#f7fbff",
                color: "#23272f",
                fontWeight: 600,
                fontSize: "1em",
                cursor: "pointer",
                marginBottom: 8,
                minWidth: 120,
              },
              {
                background: selectedGame === game ? "#23272f" : "#181a20",
                color: selectedGame === game ? "#7ecbff" : "#f5f6fa",
                border: selectedGame === game ? "2px solid #7ecbff" : "1.5px solid #444",
              }
            )}
            onClick={() => setSelectedGame(game)}
          >
            {game}
          </button>
        ))}
      </div>

      {/* Difficulty Selector */}
      <div style={{ margin: "1.5em 0" }}>
        <span style={{ fontWeight: 600, marginRight: 12 }}>AI Difficulty:</span>
        {difficulties.map(diff => (
          <button
            key={diff}
            style={getDarkModeStyles(
              darkMode,
              {
                marginRight: 8,
                padding: "0.5em 1em",
                borderRadius: 8,
                border: selectedDifficulty === diff ? "2px solid #7ecbff" : "1.5px solid #e9f1ff",
                background: selectedDifficulty === diff ? "#e9f7ff" : "#f7fbff",
                color: "#23272f",
                fontWeight: 600,
                cursor: "pointer"
              },
              {
                background: selectedDifficulty === diff ? "#23272f" : "#181a20",
                color: selectedDifficulty === diff ? "#7ecbff" : "#f5f6fa",
                border: selectedDifficulty === diff ? "2px solid #7ecbff" : "1.5px solid #444",
              }
            )}
            onClick={() => setSelectedDifficulty(diff)}
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
              padding: "0.9em 2em",
              borderRadius: 12,
              background: selectedGame ? "#4f8cff" : "#b0cfff",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1.1em",
              border: "none",
              cursor: selectedGame ? "pointer" : "not-allowed",
              boxShadow: selectedGame ? "0 2px 8px #4f8cff33" : undefined,
              transition: "background 0.2s"
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

      {/* Challenge/Tournament Mode */}
      <div style={{ margin: "1.5em 0" }}>
        <span style={{ fontWeight: 600, marginRight: 12 }}>Challenge Mode:</span>
        <select value={challengeMode} onChange={e => setChallengeMode(e.target.value)} style={getDarkModeStyles(
          darkMode,
          { padding: "0.5em 1em", borderRadius: 8, fontWeight: 600 },
          { background: "#181a20", color: "#7ecbff", border: "1.5px solid #444" }
        )}>
          <option>Single Game</option>
          <option>Best of 3</option>
          <option>Best of 5</option>
          <option>Streak Mode</option>
        </select>
      </div>

      {/* Stats & Streaks Table */}
      <div style={{ margin: "2em 0" }}>
        <h3 style={{ color: "#7ecbff", marginBottom: 8 }}>Your Record vs AI</h3>
        {loading ? (
          <div style={{ color: "#7ecbff", textAlign: "center", padding: "1em" }}>Loading stats...</div>
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
                <th style={{ padding: "0.5em 1em" }}>Streak</th>
                <th style={{ padding: "0.5em 1em" }}>Best Streak</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(row => (
                <tr key={row.game}>
                  <td style={{ padding: "0.5em 1em" }}>{row.game}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.wins}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.losses}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.draws}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.streak}</td>
                  <td style={{ padding: "0.5em 1em" }}>{row.bestStreak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Leaderboard/Achievements */}
      <div style={{ margin: "2em 0" }}>
        <h3 style={{ color: "#7ecbff", marginBottom: 8 }}>Leaderboard & Achievements</h3>
        <table style={getDarkModeStyles(
          darkMode,
          { margin: "0 auto", background: "#23272f", borderRadius: 8, color: "#fff", minWidth: 320, fontSize: "1.05em" },
          { background: "#23272f", color: "#7ecbff", border: "1px solid #444" }
        )}>
          <thead>
            <tr style={{ color: "#ffd700" }}>
              <th style={{ padding: "0.5em 1em" }}>Player</th>
              <th style={{ padding: "0.5em 1em" }}>Best Streak</th>
              <th style={{ padding: "0.5em 1em" }}>Fastest Win</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map(row => (
              <tr key={row.player}>
                <td style={{ padding: "0.5em 1em" }}>{row.player}</td>
                <td style={{ padding: "0.5em 1em" }}>{row.streak}</td>
                <td style={{ padding: "0.5em 1em" }}>{row.fastestWin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI Learning Feedback */}
      <div style={getDarkModeStyles(
        darkMode,
        { background: "#181a20", borderRadius: 8, padding: "1.5em", color: "#aaa", maxWidth: 500, margin: "0 auto" },
        { background: "#181a20", color: "#7ecbff", border: "1px solid #444" }
      )}>
        <b>AI Feedback:</b> {aiFeedback}
      </div>
    </div>
  );
};

export default HumanVsAI;
