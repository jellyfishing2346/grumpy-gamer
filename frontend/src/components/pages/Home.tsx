import React from "react";
import { useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [darkMode] = useDarkModeContext();
  const [hoveredCard, setHoveredCard] = React.useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = React.useState<string | null>(null);

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.12)" : "1px solid rgba(126,203,255,0.25)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  const features = [
    { icon: "🎯", title: "12 Games", desc: "Wordle, Chess, Sudoku and more — something for every kind of gamer.", route: "/games" },
    { icon: "🤖", title: "Challenge AI", desc: "Face off against intelligent AI opponents that push your skills.", route: "/human-vs-ai" },
    { icon: "📊", title: "Your Stats", desc: "Track wins, losses, and streaks across all games in real time.", route: "/dashboard" },
    { icon: "🆚", title: "Head-to-Head", desc: "Compare your record against the Grumpy AI game by game.", route: "/comparison" },
    { icon: "✨", title: "AI Coach", desc: "Get personalized glows and grows from Claude after each session.", route: "/human-vs-ai" },
    { icon: "⚙️", title: "Customize", desc: "Dark mode, preferences, and more — make it yours.", route: "/settings" },
  ];

  const quickLinks = [
    { label: "🎮 Play a Game", route: "/games", primary: true },
    { label: "📊 Dashboard", route: "/dashboard", primary: false },
    { label: "🆚 Comparison", route: "/comparison", primary: false },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      transition: "background 0.3s",
    }}>
      {/* Hero */}
      <div style={{
        background: darkMode
          ? "linear-gradient(135deg, #0f1117 0%, #161b27 50%, #0f1117 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        padding: "72px 24px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          width: 600, height: 300,
          background: "radial-gradient(ellipse, rgba(126,203,255,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-block",
          background: "rgba(126,203,255,0.1)",
          border: "1px solid rgba(126,203,255,0.2)",
          borderRadius: 50,
          padding: "0.35em 1.1em",
          fontSize: "0.85em",
          color: "#7ecbff",
          fontWeight: 600,
          marginBottom: "1.2em",
          letterSpacing: "0.04em",
        }}>
          🎮 WELCOME BACK
        </div>

        <h1 style={{
          fontSize: "clamp(2.2rem, 5vw, 3.6rem)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: "0.5em",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
        }}>
          Ready to outsmart<br />
          <span style={{
            background: "linear-gradient(90deg, #7ecbff, #b3e0ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            the Grumpy AI?
          </span>
        </h1>

        <p style={{
          fontSize: "1.1em",
          color: "rgba(255,255,255,0.65)",
          maxWidth: 480,
          margin: "0 auto 2.5em",
          lineHeight: 1.7,
        }}>
          Play classic games, track your progress, and get personalized coaching — all in one place.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {quickLinks.map(({ label, route, primary }) => (
            <button
              key={route}
              onClick={() => navigate(route)}
              onMouseEnter={() => setHoveredBtn(route)}
              onMouseLeave={() => setHoveredBtn(null)}
              style={{
                padding: "0.75em 1.8em",
                borderRadius: 50,
                fontSize: "1em",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s ease",
                transform: hoveredBtn === route ? "translateY(-2px)" : "none",
                ...(primary ? {
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e",
                  border: "none",
                  boxShadow: hoveredBtn === route
                    ? "0 8px 24px rgba(126,203,255,0.4)"
                    : "0 4px 16px rgba(126,203,255,0.25)",
                } : {
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  boxShadow: "none",
                })
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "64px 24px",
      }}>
        <h2 style={{
          textAlign: "center",
          fontSize: "1.8em",
          fontWeight: 700,
          color: textPrimary,
          marginBottom: "0.5em",
          letterSpacing: "-0.01em",
        }}>
          Everything you need
        </h2>
        <p style={{
          textAlign: "center",
          color: textMuted,
          marginBottom: "3em",
          fontSize: "1.05em",
        }}>
          One platform, endless games, real intelligence.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "1.2em",
        }}>
          {features.map((f, i) => (
            <div
              key={i}
              onClick={() => navigate(f.route)}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: 16,
                padding: "1.8em",
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: hoveredCard === i ? "translateY(-4px)" : "none",
                boxShadow: hoveredCard === i
                  ? darkMode
                    ? "0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(126,203,255,0.15)"
                    : "0 12px 32px rgba(80,120,200,0.15)"
                  : darkMode
                    ? "0 2px 8px rgba(0,0,0,0.2)"
                    : "0 2px 8px rgba(80,120,200,0.06)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{
                width: 48, height: 48,
                background: darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.15)",
                borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5em", marginBottom: "1em",
              }}>
                {f.icon}
              </div>
              <h3 style={{
                fontSize: "1.1em", fontWeight: 700,
                color: textPrimary, marginBottom: "0.4em",
              }}>
                {f.title}
              </h3>
              <p style={{ color: textMuted, fontSize: "0.95em", lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
              <div style={{
                marginTop: "1em",
                fontSize: "0.85em",
                color: "#7ecbff",
                fontWeight: 600,
                opacity: hoveredCard === i ? 1 : 0.6,
                transition: "opacity 0.2s",
              }}>
                {hoveredCard === i ? "→ Go there" : "→ Explore"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
