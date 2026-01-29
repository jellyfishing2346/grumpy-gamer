import React from "react";

const ComingSoonGame: React.FC<{ name: string }> = ({ name }) => (
  <div style={{
    padding: "3em 2em",
    maxWidth: 600,
    margin: "4em auto",
    background: "#fff",
    borderRadius: 22,
    boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
    color: "#23272f",
    textAlign: "center",
    border: "1.5px solid #e9f1ff",
    fontFamily: "'Inter', 'Nunito', 'Segoe UI', 'Arial', 'sans-serif'"
  }}>
    <h1 style={{ color: "#7ecbff", fontWeight: 800, fontSize: "2.2em", marginBottom: "0.7em" }}>{name}</h1>
    <div style={{ fontSize: "1.25em", marginBottom: "1.5em" }}>
      This game is coming soon! Stay tuned for updates and new features.
    </div>
    <div style={{ color: "#b3d0ff", fontWeight: 600, fontSize: "1.1em" }}>
      Grumpy Gamer is always growing. Check back soon!
    </div>
  </div>
);

export default ComingSoonGame;
