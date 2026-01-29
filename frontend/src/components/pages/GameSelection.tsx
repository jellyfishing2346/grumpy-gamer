import React from "react";
import { Link } from "react-router-dom";


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

const GameSelection: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Game Selection</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Choose your challenge! Each game pits you against our grumpy AI.
    </p>
    <ul style={{ listStyle: "none", padding: 0, fontSize: "1.1em", margin: 0 }}>
      <li>
        <span role="img" aria-label="Wordle">🎯</span> <b>Wordle</b> (Guess the word in 6 tries)
        <br />
        <Link to="/play/wordle" style={{ color: "#4f8cff", textDecoration: "underline" }}>Play Wordle</Link>
      </li>
      <li style={{ marginTop: "1em" }}>
        <span role="img" aria-label="Sudoku">🧩</span> <b>Sudoku</b> (Classic number puzzle)
        <br />
        <Link to="/play/sudoku" style={{ color: "#4f8cff", textDecoration: "underline" }}>Play Sudoku</Link>
      </li>
      <li style={{ marginTop: "1em", color: "#888" }}>
        <span role="img" aria-label="Chess">♟️</span> <b>Chess</b> (Coming soon!)
      </li>
      <li style={{ marginTop: "1em", color: "#888" }}>
        <span role="img" aria-label="Custom Game">🃏</span> <b>Custom Game</b> (Suggest your own!)
      </li>
    </ul>
  </div>
);

export default GameSelection;
