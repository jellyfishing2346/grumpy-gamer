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

const Dashboard: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Dashboard</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Your stats and achievements at a glance:
    </p>
    <div style={{ display: "flex", justifyContent: "center", gap: "2em", flexWrap: "wrap", marginBottom: "1.5em" }}>
      <div>
        <b>Games Played:</b> 12<br />
        <b>Wins:</b> 5<br />
        <b>Losses:</b> 7
      </div>
      <div>
        <b>Best Streak:</b> 3<br />
        <b>AI Defeated:</b> 2x<br />
        <b>Achievements:</b> <span title="Win 3 games in a row">🔥 Streaker</span>
      </div>
    </div>
    <div style={{ color: "#aaa", fontSize: "0.95em" }}>
      <i>More detailed stats and charts coming soon!</i>
    </div>
  </div>
);

export default Dashboard;
