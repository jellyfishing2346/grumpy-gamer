import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {/* Hero Section */}
      <section style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        color: "#fff",
        padding: "80px 20px",
        textAlign: "center",
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 4rem)",
          fontWeight: 800,
          marginBottom: 16,
          background: "linear-gradient(90deg, #7ecbff, #b3e0ff, #7ecbff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          🎮 Grumpy Gamer
        </h1>
        <p style={{
          fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
          maxWidth: 600,
          margin: "0 auto 32px",
          opacity: 0.9,
          lineHeight: 1.6
        }}>
          Challenge yourself against AI, compete with friends, and master classic games. 
          Are you ready to prove you're smarter than the machine?
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate("/signup")}
            style={{
              padding: "16px 40px",
              fontSize: "1.1rem",
              fontWeight: 700,
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e",
              border: "none",
              borderRadius: 50,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(126, 203, 255, 0.4)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "16px 40px",
              fontSize: "1.1rem",
              fontWeight: 600,
              background: "transparent",
              color: "#fff",
              border: "2px solid #7ecbff",
              borderRadius: 50,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
          >
            Log In
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: 48,
          marginTop: 60,
          flexWrap: "wrap",
          justifyContent: "center"
        }}>
          {[
            { num: "10+", label: "Games" },
            { num: "AI", label: "Opponents" },
            { num: "Free", label: "Forever" }
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "#7ecbff" }}>{stat.num}</div>
              <div style={{ opacity: 0.7, fontSize: "0.95rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        padding: "80px 20px",
        background: "#f8fafc",
        textAlign: "center"
      }}>
        <h2 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: 16
        }}>
          Why Grumpy Gamer?
        </h2>
        <p style={{
          color: "#666",
          maxWidth: 600,
          margin: "0 auto 48px",
          fontSize: "1.1rem"
        }}>
          We've built the ultimate playground for gamers who love a challenge.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 32,
          maxWidth: 1000,
          margin: "0 auto"
        }}>
          {[
            {
              icon: "🎯",
              title: "Play Classic Games",
              desc: "Wordle, Sudoku, and more. Master the classics or discover new favorites."
            },
            {
              icon: "🤖",
              title: "Challenge AI",
              desc: "Test your skills against intelligent AI opponents that adapt and learn."
            },
            {
              icon: "📊",
              title: "Track Progress",
              desc: "Detailed stats and dashboards to monitor your improvement over time."
            },
            {
              icon: "🏆",
              title: "Compete & Compare",
              desc: "See how you stack up against AI and other players on leaderboards."
            },
            {
              icon: "🎨",
              title: "Beautiful UI",
              desc: "Modern, clean design that makes gaming a pleasure."
            },
            {
              icon: "🔓",
              title: "100% Free",
              desc: "No hidden fees, no paywalls. Just pure gaming fun."
            }
          ].map((feature, i) => (
            <div key={i} style={{
              background: "#fff",
              padding: 32,
              borderRadius: 16,
              boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
              textAlign: "left",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{feature.icon}</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
                {feature.title}
              </h3>
              <p style={{ color: "#666", lineHeight: 1.6, margin: 0 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        padding: "80px 20px",
        background: "#fff",
        textAlign: "center"
      }}>
        <h2 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: 48
        }}>
          Getting Started is Easy
        </h2>

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
          flexWrap: "wrap",
          maxWidth: 900,
          margin: "0 auto"
        }}>
          {[
            { step: "1", title: "Sign Up", desc: "Create your free account in seconds" },
            { step: "2", title: "Pick a Game", desc: "Choose from our collection of games" },
            { step: "3", title: "Play & Compete", desc: "Challenge AI or friends and have fun!" }
          ].map((item, i) => (
            <div key={i} style={{ flex: "1 1 200px", maxWidth: 250 }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7ecbff, #4fa3d1)",
                color: "#1a1a2e",
                fontSize: "1.5rem",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}>
                {item.step}
              </div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1a1a2e", marginBottom: 8 }}>
                {item.title}
              </h3>
              <p style={{ color: "#666", margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: "80px 20px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        textAlign: "center",
        color: "#fff"
      }}>
        <h2 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          marginBottom: 16
        }}>
          Ready to Get Grumpy? 😤
        </h2>
        <p style={{
          fontSize: "1.1rem",
          opacity: 0.9,
          maxWidth: 500,
          margin: "0 auto 32px"
        }}>
          Join thousands of gamers who are challenging AI and having a blast.
        </p>
        <button
          onClick={() => navigate("/signup")}
          style={{
            padding: "18px 48px",
            fontSize: "1.2rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
            color: "#1a1a2e",
            border: "none",
            borderRadius: 50,
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(126, 203, 255, 0.4)"
          }}
        >
          Start Playing Now
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "40px 20px",
        background: "#1a1a2e",
        color: "#fff",
        textAlign: "center"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          marginBottom: 24,
          flexWrap: "wrap"
        }}>
          <a href="/faq" style={{ color: "#7ecbff", textDecoration: "none" }}>FAQ</a>
          <a href="/contact" style={{ color: "#7ecbff", textDecoration: "none" }}>Contact</a>
          <a href="/login" style={{ color: "#7ecbff", textDecoration: "none" }}>Log In</a>
          <a href="/signup" style={{ color: "#7ecbff", textDecoration: "none" }}>Sign Up</a>
        </div>
        <p style={{ opacity: 0.6, margin: 0, fontSize: "0.9rem" }}>
          © 2026 Grumpy Gamer. All rights reserved. 🎮
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
