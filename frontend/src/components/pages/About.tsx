import React from "react";

const containerStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.95)',
  borderRadius: '2rem',
  border: '2px solid #b3d0ff',
  boxShadow: '0 4px 32px 0 rgba(80, 120, 200, 0.10)',
  padding: '2.5rem 2.5rem 2rem 2.5rem',
  maxWidth: 700,
  margin: '3rem auto',
  fontFamily: 'Inter, Nunito, sans-serif',
          color: '#000', // pure black for maximum readability
};

const About: React.FC = () => (
  <div style={containerStyle}>
    <div style={{ textAlign: 'center', marginBottom: '0.5em' }}>
      <span style={{ fontSize: '2.5em', filter: 'drop-shadow(0 2px 8px #23272f55)' }}>🎮🤖</span>
      <div style={{ fontSize: '1.15em', color: '#7ecbff', fontWeight: 700, marginTop: '0.3em', marginBottom: '1.2em', letterSpacing: '0.01em' }}>
        Where Humans & AI Compete, Learn, and Play!
      </div>
    </div>
    <div style={{
      fontSize: "1.18em",
      margin: "0 auto 2.2em auto",
      lineHeight: 1.8,
      maxWidth: 700,
      background: "#fff",
      borderRadius: 22,
      padding: "2.2em 2.5em 2.5em 2.5em",
      boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
      border: "2.5px solid #e9f1ff",
      fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
    }}>
      <div style={{ marginBottom: "1.7em" }}>
        <span style={{ fontWeight: 700, fontSize: "1.25em", color: "#7ecbff", display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <span>❓</span> What is <span style={{ color: '#a7ffb0' }}>Grumpy Gamer</span>?
        </span>
        <div style={{ marginTop: "0.7em" }}>
          <b style={{ color: '#a7ffb0' }}>Grumpy Gamer</b> is an interactive web platform where humans and artificial intelligence (AI) compete in classic and modern games.
        </div>
      </div>
      <div style={{
        fontSize: "1.18em",
        margin: "0 auto 2.2em auto",
        lineHeight: 1.8,
        maxWidth: 700,
        background: "#fff",
        borderRadius: 22,
        padding: "2.2em 2.5em 2.5em 2.5em",
        boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
        border: "2.5px solid #e9f1ff",
        fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
        color: '#000', // pure black for maximum readability
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.15em", color: "#7ecbff", display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: '0.7em' }}>
          <span>🕹️</span> What can you do here?
        </span>
        <ul style={{
          textAlign: 'left',
          maxWidth: 600,
          margin: '1em auto',
          paddingLeft: 24,
          lineHeight: 1.7
        }}>
          <li>🎲 <b>Challenge AI:</b> Test your skills against AI in games like Wordle, Sudoku, and more.</li>
          <li>🧠 <b>See AI Learn:</b> Watch how AI agents are built, learn, and adapt in real game scenarios.</li>
          <li>💡 <b>Experiment & Learn:</b> Dive into open source code and modular game environments.</li>
          <li>🤝 <b>Friendly Rivalry:</b> Enjoy a playful competition between humans and machines.</li>
        </ul>
      </div>
      <div style={{ textAlign: "center", marginTop: "2.2em", fontWeight: 600, color: "#b3e0ff", fontSize: '1.13em', letterSpacing: '0.01em' }}>
        Whether you’re here to play or learn <span style={{ color: '#7ecbff' }}>Grumpy Gamer</span> is your portal to the world of game-playing AI.
      </div>
    </div>
    <div style={{ color: "#aaa", fontSize: "1.05em", marginTop: "1.5em" }}>
    </div>
  </div>
);

export default About;
