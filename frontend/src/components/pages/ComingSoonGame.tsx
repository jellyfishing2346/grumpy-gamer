import React from "react";
import { useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";

const ComingSoonGame: React.FC<{ name: string }> = ({ name }) => {
  const [darkMode] = useDarkModeContext();
  const navigate = useNavigate();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{
        background: cardBg, border: cardBorder, borderRadius: 20,
        padding: "3.5em 2.5em", textAlign: "center", maxWidth: 480, width: "100%",
        backdropFilter: "blur(12px)",
        boxShadow: darkMode ? "0 24px 64px rgba(0,0,0,0.4)" : "0 12px 48px rgba(80,120,200,0.12)",
      }}>
        <div style={{ fontSize: "3.5em", marginBottom: "0.5em" }}>🚀</div>

        <div style={{ display: "inline-block", background: "rgba(126,203,255,0.1)", border: "1px solid rgba(126,203,255,0.2)", borderRadius: 50, padding: "0.3em 1em", fontSize: "0.8em", color: "#7ecbff", fontWeight: 600, marginBottom: "1em", letterSpacing: "0.05em" }}>
          COMING SOON
        </div>

        <h1 style={{ fontSize: "1.8em", fontWeight: 800, color: darkMode ? "#f0f4ff" : "#1a1a2e", marginBottom: "0.5em", letterSpacing: "-0.02em" }}>
          {name}
        </h1>

        <p style={{ color: textMuted, lineHeight: 1.7, marginBottom: "0.8em", fontSize: "1em" }}>
          This game is currently in development. We're working hard to bring it to you soon!
        </p>

        <p style={{ color: "#7ecbff", fontWeight: 600, marginBottom: "2em", fontSize: "0.95em" }}>
          Grumpy Gamer is always growing 🎮
        </p>

        <div style={{ display: "flex", gap: "0.8em", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/games")}
            style={{
              padding: "0.75em 1.8em", borderRadius: 50, border: "none",
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", fontWeight: 700, fontSize: "0.95em",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Browse Games
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "0.75em 1.8em", borderRadius: 50,
              border: darkMode ? "1px solid rgba(126,203,255,0.2)" : "1px solid rgba(126,203,255,0.3)",
              background: "transparent", color: darkMode ? "#7ecbff" : "#4fa3d1",
              fontWeight: 600, fontSize: "0.95em", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonGame;
