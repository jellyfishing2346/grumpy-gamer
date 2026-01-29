import React from "react";


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

const Home: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Welcome to Grumpy Gamer!</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Ready to challenge your mind and the AI? Select a game, view your stats, or see how you stack up against the machine!
    </p>
    <div style={{ display: "flex", justifyContent: "center", gap: "1em", flexWrap: "wrap" }}>
      <a href="/games" style={{ color: "#4f8cff", textDecoration: "underline" }}>Game Selection</a>
      <a href="/dashboard" style={{ color: "#4f8cff", textDecoration: "underline" }}>Dashboard</a>
      <a href="/comparison" style={{ color: "#4f8cff", textDecoration: "underline" }}>Comparison</a>
    </div>
  </div>
);

export default Home;
