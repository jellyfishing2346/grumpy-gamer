import React from "react";
import { useParams } from "react-router-dom";
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
      <div style={getDarkModeStyles(
        darkMode,
        { background: "#181a20", borderRadius: 8, padding: "2em", minHeight: 120, margin: "0 auto", maxWidth: 400, color: "#aaa" },
        { background: "#181a20", color: "#7ecbff", border: "1px solid #444" }
      )}>
        <i>Game UI coming soon...</i>
      </div>
    </div>
  );
};

export default GamePlay;
