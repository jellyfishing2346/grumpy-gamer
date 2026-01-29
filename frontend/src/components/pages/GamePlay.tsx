import React from "react";
import { useParams } from "react-router-dom";


const containerStyle: React.CSSProperties = {
  padding: "2.5em 2em",
  maxWidth: 700,
  margin: "3.5em auto",
  background: "rgba(36, 41, 54, 0.85)",
  borderRadius: 24,
  boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
  color: "#f5f6fa",
  textAlign: "center",
  backdropFilter: "blur(8px)",
  border: "1.5px solid rgba(255,255,255,0.08)",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.6em",
  marginBottom: "0.4em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textShadow: "0 2px 12px #23272f55"
};


const gameInfo: Record<string, { icon: string; name: string; description: string }> = {
  wordle: {
    icon: "🎯",
    name: "Wordle",
    description: "Guess the word in 6 tries."
  },
  sudoku: {
    icon: "🧩",
    name: "Sudoku",
    description: "Fill the grid so every row, column, and box contains 1-9."
  },
  chess: {
    icon: "♟️",
    name: "Chess",
    description: "Classic chess. Coming soon!"
  },
  custom: {
    icon: "🃏",
    name: "Custom Game",
    description: "Suggest your own game!"
  }
};

const GamePlay: React.FC = () => {
  const { game } = useParams<{ game: string }>();
  const info = game && gameInfo[game.toLowerCase()] ? gameInfo[game.toLowerCase()] : {
    icon: "❓",
    name: "Unknown Game",
    description: "Game not found."
  };
  return (
    <div style={containerStyle}>
      <div style={{ fontSize: "3em", marginBottom: "0.2em" }}>{info.icon}</div>
      <h1 style={headingStyle}>{info.name}</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>{info.description}</p>
      <div style={{ background: "#181a20", borderRadius: 8, padding: "2em", minHeight: 120, margin: "0 auto", maxWidth: 400, color: "#aaa" }}>
        <i>Game UI coming soon...</i>
      </div>
    </div>
  );
};

export default GamePlay;
