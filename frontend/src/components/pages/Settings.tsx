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

const Settings: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>Settings</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Adjust your preferences and game options below:
    </p>
    <div style={{ textAlign: "left", maxWidth: 400, margin: "0 auto", color: "#aaa" }}>
      <label style={{ display: "block", marginBottom: "1em" }}>
        <b>Theme:</b>
        <select style={{ marginLeft: 8 }} disabled>
          <option>Dark</option>
          <option>Light</option>
        </select>
        <span style={{ marginLeft: 8, fontSize: "0.95em" }}>(coming soon)</span>
      </label>
      <label style={{ display: "block", marginBottom: "1em" }}>
        <b>Sound:</b>
        <input type="checkbox" style={{ marginLeft: 8 }} disabled />
        <span style={{ marginLeft: 8, fontSize: "0.95em" }}>(coming soon)</span>
      </label>
    </div>
  </div>
);

export default Settings;
