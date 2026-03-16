import React from "react";
import { useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";

const GameSelection: React.FC = () => {
  const navigate = useNavigate();
  const [darkMode] = useDarkModeContext();
  const [hoveredGame, setHoveredGame] = React.useState<string | null>(null);

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  const games = [
    { icon: "📝", name: "Wordle", desc: "Guess the 5-letter word in 6 tries", route: "/play/wordle", color: "#7ecbff" },
    { icon: "🔢", name: "Sudoku", desc: "Fill the grid with numbers 1–9", route: "/play/sudoku", color: "#a8e6cf" },
    { icon: "⭕", name: "Tic-Tac-Toe", desc: "Get three in a row to win", route: "/play/tictactoe", color: "#ffd3b6" },
    { icon: "🔴", name: "Connect Four", desc: "Connect four discs in a row", route: "/play/connectfour", color: "#ff8b94" },
    { icon: "♟️", name: "Chess", desc: "Classic strategy battle", route: "/play/chess", color: "#d4a5ff" },
    { icon: "⛀", name: "Checkers", desc: "Jump and capture to win", route: "/play/checkers", color: "#ffcc99" },
    { icon: "✊", name: "Rock Paper Scissors", desc: "Best of luck!", route: "/play/rps", color: "#99ddff" },
    { icon: "💣", name: "Minesweeper", desc: "Clear the board, avoid mines", route: "/play/minesweeper", color: "#ffb3b3" },
    { icon: "🔢", name: "2048", desc: "Slide tiles to reach 2048", route: "/play/2048", color: "#ffe0a3" },
    { icon: "🔤", name: "Hangman", desc: "Guess the word letter by letter", route: "/play/hangman", color: "#b3f0ff" },
    { icon: "⚫", name: "Othello", desc: "Flip discs and control the board", route: "/play/othello", color: "#c8f7c5" },
    { icon: "🃏", name: "Memory", desc: "Match pairs to win", route: "/play/memory", color: "#f7c5f0" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      transition: "background 0.3s",
    }}>
      {/* Header */}
      <div style={{
        background: darkMode
          ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 500, height: 200,
          background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-block",
          background: "rgba(126,203,255,0.1)",
          border: "1px solid rgba(126,203,255,0.2)",
          borderRadius: 50,
          padding: "0.35em 1.1em",
          fontSize: "0.85em",
          color: "#7ecbff",
          fontWeight: 600,
          marginBottom: "1em",
          letterSpacing: "0.04em",
        }}>
          🎮 CHOOSE YOUR GAME
        </div>
        <h1 style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: "0.5em",
          letterSpacing: "-0.02em",
        }}>
          Game Selection
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "1.05em",
          maxWidth: 480,
          margin: "0 auto",
          lineHeight: 1.6,
        }}>
          Pick a game and challenge the Grumpy AI. All 12 games are free to play.
        </p>
      </div>

      {/* Game Grid */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "48px 24px 64px",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1.2em",
        }}>
          {games.map((game) => (
            <div
              key={game.name}
              onMouseEnter={() => setHoveredGame(game.name)}
              onMouseLeave={() => setHoveredGame(null)}
              onClick={() => navigate(game.route)}
              style={{
                background: cardBg,
                border: hoveredGame === game.name
                  ? `1px solid ${game.color}44`
                  : cardBorder,
                borderRadius: 16,
                padding: "1.6em",
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: hoveredGame === game.name ? "translateY(-4px)" : "none",
                boxShadow: hoveredGame === game.name
                  ? darkMode
                    ? `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${game.color}22`
                    : `0 12px 32px ${game.color}33`
                  : darkMode
                    ? "0 2px 8px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(80,120,200,0.06)",
                backdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                gap: "0.8em",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 52, height: 52,
                borderRadius: 14,
                background: hoveredGame === game.name
                  ? `${game.color}22`
                  : darkMode ? "rgba(255,255,255,0.06)" : "rgba(26,26,46,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6em",
                transition: "background 0.2s",
              }}>
                {game.icon}
              </div>

              {/* Text */}
              <div>
                <div style={{
                  fontWeight: 700,
                  fontSize: "1.05em",
                  color: textPrimary,
                  marginBottom: "0.25em",
                }}>
                  {game.name}
                </div>
                <div style={{
                  fontSize: "0.88em",
                  color: textMuted,
                  lineHeight: 1.5,
                }}>
                  {game.desc}
                </div>
              </div>

              {/* Play button */}
              <button
                style={{
                  marginTop: "auto",
                  padding: "0.55em 0",
                  borderRadius: 10,
                  border: "none",
                  background: hoveredGame === game.name
                    ? `linear-gradient(90deg, ${game.color}, ${game.color}cc)`
                    : darkMode ? "rgba(255,255,255,0.08)" : "rgba(26,26,46,0.07)",
                  color: hoveredGame === game.name ? "#1a1a2e" : textMuted,
                  fontWeight: 700,
                  fontSize: "0.9em",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                  width: "100%",
                }}
                onClick={(e) => { e.stopPropagation(); navigate(game.route); }}
              >
                {hoveredGame === game.name ? `▶ Play ${game.name}` : `Play ${game.name}`}
              </button>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: "center",
          color: textMuted,
          marginTop: "3em",
          fontSize: "0.95em",
        }}>
          More games coming soon! 🚀
        </p>
      </div>
    </div>
  );
};

export default GameSelection;
