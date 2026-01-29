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

const HumanVsAI: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Human vs AI</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Ready to face the Grumpy AI? Choose your game and prove your skills!
    </p>
    <div style={{ background: "#181a20", borderRadius: 8, padding: "1.5em", color: "#aaa", maxWidth: 400, margin: "0 auto" }}>
      <b>Tip:</b> The AI learns from every match. Can you outsmart it?
    </div>
  </div>
);

export default HumanVsAI;
