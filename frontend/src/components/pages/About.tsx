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

const About: React.FC = () => (
  <div style={containerStyle}>
    <h1 style={headingStyle}>About</h1>
    <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
      Grumpy Gamer is a fun project where humans and AI compete in classic games. Our goal: make AI challenging, but never unbeatable!
    </p>
    <div style={{ color: "#aaa", fontSize: "1.05em" }}>
      <b>Created by:</b> The Grumpy Gamer Team<br />
      <b>Tech:</b> React, FastAPI, Python, and a dash of grumpiness.<br />
      <b>Open Source:</b> Contributions welcome!
    </div>
  </div>
);

export default About;
