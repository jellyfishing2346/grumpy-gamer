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

const Comparison: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Comparison</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      See how you stack up against the Grumpy AI:
    </p>
    <table style={{ margin: "0 auto", background: "#181a20", borderRadius: 8, color: "#fff", minWidth: 320, fontSize: "1.05em" }}>
      <thead>
        <tr style={{ color: "#4f8cff" }}>
          <th style={{ padding: "0.5em 1em" }}>Player</th>
          <th style={{ padding: "0.5em 1em" }}>Wins</th>
          <th style={{ padding: "0.5em 1em" }}>Losses</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ padding: "0.5em 1em" }}>You</td>
          <td style={{ padding: "0.5em 1em" }}>5</td>
          <td style={{ padding: "0.5em 1em" }}>7</td>
        </tr>
        <tr>
          <td style={{ padding: "0.5em 1em" }}>Grumpy AI</td>
          <td style={{ padding: "0.5em 1em" }}>7</td>
          <td style={{ padding: "0.5em 1em" }}>5</td>
        </tr>
      </tbody>
    </table>
    <div style={{ color: "#aaa", marginTop: "1em" }}>
      <i>Can you turn the tables and beat the AI?</i>
    </div>
  </div>
);

export default Comparison;
