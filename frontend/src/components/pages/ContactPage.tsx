import React, { useState } from "react";

const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, just show success message
    // In production, you'd send this to a backend or email service
    setSubmitted(true);
    setName("");
    setEmail("");
    setMessage("");
  };

  return (
    <div style={{
      maxWidth: 600,
      margin: "40px auto",
      padding: "0 20px"
    }}>
      <h1 style={{ 
        fontSize: 32, 
        fontWeight: 700, 
        marginBottom: 16,
        color: "#1a1a2e"
      }}>
        Contact Us
      </h1>
      <p style={{ 
        color: "#666", 
        marginBottom: 32,
        fontSize: 16,
        lineHeight: 1.6
      }}>
        Have a question, feedback, or just want to say hi? We'd love to hear from you!
      </p>

      {submitted ? (
        <div style={{
          background: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: 8,
          padding: 24,
          textAlign: "center",
          color: "#155724"
        }}>
          <h3 style={{ marginBottom: 8 }}>Thanks for reaching out! 🎮</h3>
          <p>We'll get back to you as soon as possible.</p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              background: "#2d72d9",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Send Another Message
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          background: "#fff",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)"
        }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: "block", 
              marginBottom: 8, 
              fontWeight: 600,
              color: "#333"
            }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ 
              display: "block", 
              marginBottom: 8, 
              fontWeight: 600,
              color: "#333"
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 16,
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ 
              display: "block", 
              marginBottom: 8, 
              fontWeight: 600,
              color: "#333"
            }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="What's on your mind?"
              rows={5}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 16,
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 14,
              background: "#2d72d9",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Send Message
          </button>
        </form>
      )}

      <div style={{
        marginTop: 40,
        padding: 24,
        background: "#f8f9fa",
        borderRadius: 8,
        textAlign: "center"
      }}>
        <h3 style={{ marginBottom: 12, color: "#333" }}>Other Ways to Reach Us</h3>
        <p style={{ color: "#666", margin: "8px 0" }}>
          📧 Email: support@grumpygamer.com
        </p>
        <p style={{ color: "#666", margin: "8px 0" }}>
          🐦 Twitter: @GrumpyGamer
        </p>
        <p style={{ color: "#666", margin: "8px 0" }}>
          💬 Discord: discord.gg/grumpygamer
        </p>
      </div>
    </div>
  );
};

export default ContactPage;
