import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface FAQItemData {
  question: string;
  answer: string;
}

const faqData: FAQItemData[] = [
  { question: "What is Grumpy Gamer?", answer: "Grumpy Gamer is a full-stack gaming platform where you challenge AI opponents across 12 classic games. Track your stats, get personalized coaching from Claude, and see how you stack up against the AI." },
  { question: "Is Grumpy Gamer free to use?", answer: "Yes! Grumpy Gamer is completely free. All 12 games, the dashboard, AI coaching, and stats tracking are available at no cost." },
  { question: "How do I create an account?", answer: "Click 'Sign Up' in the navigation bar, enter your email, username, and password. You'll be ready to play in seconds." },
  { question: "How does the AI Coach work?", answer: "After playing games, visit the Human vs AI page and click 'Get My Feedback'. Claude analyzes your game history and gives you personalized glows (strengths) and grows (areas to improve)." },
  { question: "How do I reset my password?", answer: "Currently you can update your password from the Settings page once logged in. A forgot password flow is coming soon." },
  { question: "Is my data secure?", answer: "Yes. Passwords are hashed with bcrypt, authentication uses JWT tokens, and your data is stored in a private PostgreSQL database. We never share your data." },
  { question: "Can I delete my account?", answer: "Yes, go to Settings → Danger Zone → Delete Account. This is permanent and removes all your data." },
  { question: "Why 'Grumpy' Gamer?", answer: "Because we've all had those gaming moments that make us a little grumpy! Tough boss fights, losing streaks, lag spikes — embrace the grump. 😤🎮" },
];

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f1117",
      fontFamily: "'DM Sans', 'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1117 0%, #161b27 100%)",
        padding: "56px 24px 64px",
        textAlign: "center",
        borderBottom: "1px solid rgba(126,203,255,0.08)",
      }}>
        <h1 style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 800, color: "#fff",
          marginBottom: "0.5em", letterSpacing: "-0.02em",
        }}>
          Frequently Asked Questions
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05em", maxWidth: 480, margin: "0 auto" }}>
          Can't find what you're looking for?{" "}
          <span
            onClick={() => navigate("/contact")}
            style={{ color: "#7ecbff", cursor: "pointer", fontWeight: 600 }}
          >
            Contact us
          </span>
        </p>
      </div>

      {/* FAQ Items */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "48px 24px 64px" }}>
        {faqData.map((item, index) => (
          <div
            key={index}
            style={{
              background: openIndex === index ? "rgba(126,203,255,0.05)" : "rgba(255,255,255,0.03)",
              border: openIndex === index ? "1px solid rgba(126,203,255,0.2)" : "1px solid rgba(126,203,255,0.08)",
              borderRadius: 12,
              marginBottom: "0.8em",
              overflow: "hidden",
              transition: "all 0.2s",
            }}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              style={{
                width: "100%", padding: "1.2em 1.5em",
                background: "transparent", border: "none",
                textAlign: "left", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                color: "#f0f4ff", fontWeight: 600, fontSize: "1em",
                fontFamily: "inherit",
              }}
            >
              <span>{item.question}</span>
              <span style={{
                fontSize: "1.2em", color: "#7ecbff", flexShrink: 0, marginLeft: "1em",
                transform: openIndex === index ? "rotate(45deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}>+</span>
            </button>
            {openIndex === index && (
              <div style={{
                padding: "0 1.5em 1.2em",
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.7, fontSize: "0.95em",
              }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}

        {/* CTA */}
        <div style={{
          marginTop: "3em", padding: "2em",
          background: "linear-gradient(135deg, rgba(126,203,255,0.08), rgba(79,163,209,0.08))",
          border: "1px solid rgba(126,203,255,0.15)",
          borderRadius: 16, textAlign: "center",
        }}>
          <h3 style={{ color: "#fff", marginBottom: "0.5em", fontSize: "1.2em" }}>
            Still have questions?
          </h3>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "1.5em", fontSize: "0.95em" }}>
            We're here to help — reach out and we'll get back to you.
          </p>
          <button
            onClick={() => navigate("/contact")}
            style={{
              padding: "0.75em 2em", borderRadius: 50,
              background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", border: "none",
              fontWeight: 700, fontSize: "1em",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
