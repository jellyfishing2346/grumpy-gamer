import React, { useState } from "react";

const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75em 1em",
    borderRadius: 10,
    border: "1px solid rgba(126,203,255,0.2)",
    background: "rgba(255,255,255,0.06)",
    color: "#f0f4ff",
    fontSize: "1em",
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.82em", fontWeight: 600,
    color: "rgba(255,255,255,0.5)", marginBottom: "0.4em",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

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
          Contact Us
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1.05em", maxWidth: 400, margin: "0 auto" }}>
          Have a question or feedback? We'd love to hear from you.
        </p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 64px", display: "grid", gap: "1.5em" }}>

        {/* Form */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(126,203,255,0.12)",
          borderRadius: 16, padding: "2em",
          backdropFilter: "blur(8px)",
        }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "2em 0" }}>
              <div style={{ fontSize: "2.5em", marginBottom: "0.5em" }}>🎮</div>
              <h3 style={{ color: "#28e07b", fontWeight: 700, fontSize: "1.2em", marginBottom: "0.4em" }}>
                Message sent!
              </h3>
              <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: "1.5em" }}>
                We'll get back to you as soon as possible.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                style={{
                  padding: "0.65em 1.5em", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2em" }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" placeholder="Your name" value={name}
                  onChange={e => setName(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" placeholder="you@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  placeholder="What's on your mind?"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required rows={5}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <button
                type="submit"
                style={{
                  padding: "0.85em", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Send Message
              </button>
            </form>
          )}
        </div>

        {/* Other ways */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(126,203,255,0.08)",
          borderRadius: 16, padding: "1.8em",
        }}>
          <h3 style={{ color: "#7ecbff", fontWeight: 700, marginBottom: "1em", fontSize: "1em" }}>
            Other Ways to Reach Us
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.7em" }}>
            {[
              { icon: "📧", label: "Email", value: "support@grumpygamer.com" },
              { icon: "🐦", label: "Twitter", value: "@GrumpyGamer" },
              { icon: "💬", label: "Discord", value: "discord.gg/grumpygamer" },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: "1em",
                padding: "0.8em 1em",
                background: "rgba(126,203,255,0.04)",
                borderRadius: 10,
                border: "1px solid rgba(126,203,255,0.08)",
              }}>
                <span style={{ fontSize: "1.2em" }}>{icon}</span>
                <div>
                  <div style={{ fontSize: "0.8em", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{label}</div>
                  <div style={{ color: "#f0f4ff", fontSize: "0.95em" }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
