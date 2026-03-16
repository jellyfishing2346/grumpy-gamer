import React from "react";
import { useDarkModeContext } from "../DarkModeProvider";

function About() {
  const [darkMode] = useDarkModeContext();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  const sections = [
    {
      icon: "❓",
      title: "What is Grumpy Gamer?",
      content: "Grumpy Gamer is an interactive web platform where humans and artificial intelligence compete in classic and modern games. Built with React, FastAPI, and Claude — it's a full-stack gaming experience with real AI opponents.",
    },
    {
      icon: "🕹️",
      title: "What can you do here?",
      items: [
        { icon: "🎲", label: "Challenge AI", desc: "Test your skills against AI in Wordle, Chess, Sudoku, and 9 more games." },
        { icon: "📊", label: "Track Progress", desc: "Win/loss/draw stats, daily activity charts, and performance trends." },
        { icon: "🤖", label: "AI Coach", desc: "Get personalized glows and grows from Claude after every session." },
        { icon: "🆚", label: "Compare Records", desc: "See exactly how you stack up against the Grumpy AI game by game." },
      ],
    },
    {
      icon: "🛠️",
      title: "Built with",
      tags: ["React + TypeScript", "FastAPI", "PostgreSQL", "Claude AI", "Vercel", "Render"],
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      transition: "background 0.3s",
    }}>
      {/* Header */}
      <div style={{
        background: darkMode
          ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 400, height: 200,
          background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ fontSize: "2.5em", marginBottom: "0.3em" }}>🎮🤖</div>
        <h1 style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: "0.5em",
          letterSpacing: "-0.02em",
        }}>
          About Grumpy Gamer
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "1.05em",
          maxWidth: 480,
          margin: "0 auto",
          lineHeight: 1.6,
        }}>
          Where humans and AI compete, learn, and play.
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 64px" }}>
        {sections.map((section, i) => (
          <div key={i} style={{
            background: cardBg,
            border: cardBorder,
            borderRadius: 16,
            padding: "2em",
            marginBottom: "1.2em",
            backdropFilter: "blur(8px)",
            boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
          }}>
            <h2 style={{
              fontSize: "1.2em",
              fontWeight: 700,
              color: "#7ecbff",
              marginBottom: "1em",
              display: "flex",
              alignItems: "center",
              gap: "0.5em",
            }}>
              <span>{section.icon}</span> {section.title}
            </h2>

            {section.content && (
              <p style={{ color: textPrimary, lineHeight: 1.8, margin: 0, fontSize: "1.02em" }}>
                {section.content}
              </p>
            )}

            {section.items && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1em",
              }}>
                {section.items.map((item, j) => (
                  <div key={j} style={{
                    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.06)",
                    borderRadius: 12,
                    padding: "1em 1.2em",
                    border: darkMode ? "1px solid rgba(126,203,255,0.08)" : "1px solid rgba(126,203,255,0.15)",
                  }}>
                    <div style={{ fontWeight: 700, color: textPrimary, marginBottom: "0.3em" }}>
                      {item.icon} {item.label}
                    </div>
                    <div style={{ color: textMuted, fontSize: "0.92em", lineHeight: 1.6 }}>
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {section.tags && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6em" }}>
                {section.tags.map((tag, j) => (
                  <span key={j} style={{
                    background: darkMode ? "rgba(126,203,255,0.1)" : "rgba(126,203,255,0.12)",
                    border: "1px solid rgba(126,203,255,0.2)",
                    borderRadius: 50,
                    padding: "0.3em 1em",
                    fontSize: "0.9em",
                    fontWeight: 600,
                    color: "#7ecbff",
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        <div style={{
          textAlign: "center",
          color: textMuted,
          fontSize: "0.95em",
          marginTop: "2em",
        }}>
          Built with 🧠 and lots of ☕ — Grumpy Gamer © 2026
        </div>
      </div>
    </div>
  );
}

export default About;