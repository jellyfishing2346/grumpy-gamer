import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  const features = [
    { icon: "🎯", title: "12 Classic Games", desc: "Wordle, Chess, Sudoku, and more. Something for every kind of gamer." },
    { icon: "🤖", title: "Challenge AI", desc: "Intelligent AI opponents that push your skills to the limit." },
    { icon: "📊", title: "Track Progress", desc: "Real-time stats, daily activity charts, and win rate trends." },
    { icon: "🏆", title: "Compete & Compare", desc: "See exactly how you stack up against the Grumpy AI." },
    { icon: "✨", title: "AI Coach", desc: "Get personalized glows and grows powered by Claude." },
    { icon: "🔓", title: "100% Free", desc: "No hidden fees, no paywalls. Just pure gaming fun." },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Inter', sans-serif", background: "#0f1117" }}>

      {/* Hero */}
      <section style={{
        background: "linear-gradient(135deg, #0f1117 0%, #161b27 50%, #0f1117 100%)",
        color: "#fff", padding: "100px 24px 120px",
        textAlign: "center", minHeight: "80vh",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        position: "relative", overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 800, height: 400, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", top: "10%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "rgba(126,203,255,0.03)", border: "1px solid rgba(126,203,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: "15%", left: "8%", width: 120, height: 120, borderRadius: "50%", background: "rgba(79,163,209,0.04)", border: "1px solid rgba(79,163,209,0.08)" }} />

        <div style={{ display: "inline-block", background: "rgba(126,203,255,0.08)", border: "1px solid rgba(126,203,255,0.2)", borderRadius: 50, padding: "0.4em 1.2em", fontSize: "0.85em", color: "#7ecbff", fontWeight: 600, marginBottom: "1.5em", letterSpacing: "0.05em" }}>
          🎮 FREE TO PLAY · NO SIGN-UP REQUIRED TO BROWSE
        </div>

        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", fontWeight: 800, marginBottom: "0.5em", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
          Can you outsmart<br />
          <span style={{ background: "linear-gradient(90deg, #7ecbff, #b3e0ff, #7ecbff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            the Grumpy AI?
          </span>
        </h1>

        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", maxWidth: 560, margin: "0 auto 2.5em", opacity: 0.65, lineHeight: 1.7 }}>
          Challenge AI opponents across 12 classic games. Track your progress, get personalized coaching, and climb the leaderboard.
        </p>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: "4em" }}>
          <button
            onClick={() => navigate("/signup")}
            onMouseEnter={() => setHoveredBtn("signup")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: "1em 2.5em", fontSize: "1.05em", fontWeight: 700,
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", border: "none", borderRadius: 50, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.2s",
              boxShadow: hoveredBtn === "signup" ? "0 8px 32px rgba(126,203,255,0.45)" : "0 4px 20px rgba(126,203,255,0.25)",
              transform: hoveredBtn === "signup" ? "translateY(-2px)" : "none",
            }}
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate("/login")}
            onMouseEnter={() => setHoveredBtn("login")}
            onMouseLeave={() => setHoveredBtn(null)}
            style={{
              padding: "1em 2.5em", fontSize: "1.05em", fontWeight: 600,
              background: hoveredBtn === "login" ? "rgba(126,203,255,0.08)" : "transparent",
              color: "#fff", border: "1.5px solid rgba(126,203,255,0.4)",
              borderRadius: 50, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}
          >
            Log In
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 56, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { num: "12", label: "Games" },
            { num: "AI", label: "Opponents" },
            { num: "Free", label: "Forever" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "#7ecbff", letterSpacing: "-0.02em" }}>{stat.num}</div>
              <div style={{ opacity: 0.5, fontSize: "0.88rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "100px 24px", background: "#0d1018", textAlign: "center" }}>
        <div style={{ display: "inline-block", background: "rgba(126,203,255,0.08)", border: "1px solid rgba(126,203,255,0.15)", borderRadius: 50, padding: "0.35em 1.1em", fontSize: "0.82em", color: "#7ecbff", fontWeight: 600, marginBottom: "1em", letterSpacing: "0.05em" }}>
          WHY GRUMPY GAMER?
        </div>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#fff", marginBottom: "0.5em", letterSpacing: "-0.02em" }}>
          Everything you need to level up
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 500, margin: "0 auto 4em", fontSize: "1.05em", lineHeight: 1.6 }}>
          One platform, endless games, real intelligence.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.2em", maxWidth: 1000, margin: "0 auto" }}>
          {features.map((f, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                background: hoveredFeature === i ? "rgba(126,203,255,0.06)" : "rgba(255,255,255,0.03)",
                border: hoveredFeature === i ? "1px solid rgba(126,203,255,0.2)" : "1px solid rgba(126,203,255,0.07)",
                borderRadius: 16, padding: "2em", textAlign: "left",
                transition: "all 0.2s", cursor: "default",
                transform: hoveredFeature === i ? "translateY(-4px)" : "none",
              }}
            >
              <div style={{ fontSize: "2em", marginBottom: "0.8em" }}>{f.icon}</div>
              <h3 style={{ fontSize: "1.1em", fontWeight: 700, color: "#fff", marginBottom: "0.5em" }}>{f.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0, fontSize: "0.95em" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "100px 24px", background: "#0f1117", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#fff", marginBottom: "0.5em", letterSpacing: "-0.02em" }}>
          Up and running in seconds
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", marginBottom: "4em", fontSize: "1.05em" }}>No credit card. No setup. Just play.</p>

        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap", maxWidth: 900, margin: "0 auto" }}>
          {[
            { step: "1", title: "Sign Up", desc: "Create your free account in seconds" },
            { step: "2", title: "Pick a Game", desc: "Choose from 12 classic games" },
            { step: "3", title: "Play & Improve", desc: "Challenge AI and get coaching" },
          ].map((item, i) => (
            <div key={i} style={{ flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #7ecbff, #4fa3d1)", color: "#1a1a2e", fontSize: "1.3rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.2em" }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: "1.1em", fontWeight: 700, color: "#fff", marginBottom: "0.4em" }}>{item.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.5)", margin: 0, fontSize: "0.92em", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "100px 24px", background: "linear-gradient(135deg, #0f1117 0%, #161b27 100%)", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.06) 0%, transparent 70%)" }} />
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#fff", marginBottom: "0.5em", letterSpacing: "-0.02em" }}>
          Ready to get grumpy? 😤
        </h2>
        <p style={{ fontSize: "1.05em", opacity: 0.55, maxWidth: 480, margin: "0 auto 2.5em", lineHeight: 1.6 }}>
          Join gamers who are challenging AI and having a blast doing it.
        </p>
        <button
          onClick={() => navigate("/signup")}
          onMouseEnter={() => setHoveredBtn("cta")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            padding: "1.1em 3em", fontSize: "1.1em", fontWeight: 700,
            background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
            color: "#1a1a2e", border: "none", borderRadius: 50, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.2s",
            boxShadow: hoveredBtn === "cta" ? "0 8px 32px rgba(126,203,255,0.4)" : "0 4px 20px rgba(126,203,255,0.2)",
            transform: hoveredBtn === "cta" ? "translateY(-2px)" : "none",
          }}
        >
          Start Playing Now — It's Free
        </button>
      </section>

      {/* Footer */}
      <footer style={{ padding: "40px 24px", background: "#090b0f", borderTop: "1px solid rgba(126,203,255,0.06)", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: "1.5em", flexWrap: "wrap" }}>
          {["/faq", "/contact", "/login", "/signup"].map((href, i) => (
            <a key={href} href={href} style={{ color: "#7ecbff", textDecoration: "none", fontSize: "0.92em", opacity: 0.8 }}>
              {["FAQ", "Contact", "Log In", "Sign Up"][i]}
            </a>
          ))}
        </div>
        <p style={{ opacity: 0.3, margin: 0, fontSize: "0.85rem", color: "#fff" }}>
          © 2026 Grumpy Gamer. All rights reserved. 🎮
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
