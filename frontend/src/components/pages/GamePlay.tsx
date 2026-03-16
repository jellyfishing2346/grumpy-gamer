import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";

const gameInfo: Record<string, { icon: string; name: string; description: string }> = {
  wordle: { icon: "📝", name: "Wordle", description: "Guess the hidden 5-letter word in 6 tries." },
  sudoku: { icon: "🔢", name: "Sudoku", description: "Fill the grid so every row, column, and box contains 1–9." },
  chess: { icon: "♟️", name: "Chess", description: "Classic strategy battle. Outsmart the AI." },
  custom: { icon: "🃏", name: "Custom Game", description: "Suggest your own game!" },
};

const GamePlay: React.FC = () => {
  const { game } = useParams<{ game: string }>();
  const [darkMode] = useDarkModeContext();
  const navigate = useNavigate();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  const info = game && gameInfo[game.toLowerCase()]
    ? gameInfo[game.toLowerCase()]
    : { icon: "❓", name: "Unknown Game", description: "Game not found." };

  React.useEffect(() => {
    if (!game || !gameInfo[game.toLowerCase()]) {
      navigate("/games");
    }
  }, [game, navigate]);

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      {/* Header */}
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>{info.icon}</div>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#fff", marginBottom: "0.4em", letterSpacing: "-0.02em" }}>
          {info.name}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05em" }}>{info.description}</p>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 64px" }}>
        <div style={{
          background: cardBg, border: cardBorder, borderRadius: 16,
          padding: "3em", textAlign: "center", backdropFilter: "blur(8px)",
          boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
        }}>
          <div style={{ fontSize: "3em", marginBottom: "0.8em" }}>🚧</div>
          <h2 style={{ color: "#7ecbff", fontWeight: 700, marginBottom: "0.5em", fontSize: "1.3em" }}>
            Game UI Loading...
          </h2>
          <p style={{ color: textMuted, marginBottom: "2em", lineHeight: 1.6 }}>
            This game view is under construction. Use the Game Selection page to play directly.
          </p>
          <button
            onClick={() => navigate("/games")}
            style={{
              padding: "0.75em 2em", borderRadius: 50, border: "none",
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ← Back to Games
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePlay;
