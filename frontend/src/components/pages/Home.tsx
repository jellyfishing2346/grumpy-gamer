import React from "react";
import { useNavigate } from "react-router-dom";


import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";

const baseContainerStyle: React.CSSProperties = {
  padding: "2.5em 2em",
  maxWidth: 700,
  margin: "3.5em auto",
  background: "#fff",
  borderRadius: 22,
  boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)",
  color: "#23272f",
  textAlign: "center",
  border: "1.5px solid #e9f1ff",
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', 'Arial', 'sans-serif'",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.6em",
  marginBottom: "0.4em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textShadow: "0 2px 12px #23272f55"
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [darkMode] = useDarkModeContext();
  const containerStyle = getDarkModeStyles(
    darkMode,
    baseContainerStyle,
    {
      background: "#23272f",
      color: "#f5f6fa",
      border: "1.5px solid #444",
      boxShadow: "0 4px 32px 0 rgba(31, 38, 135, 0.37)",
    }
  );
  const navBtnStyle: React.CSSProperties = getDarkModeStyles(
    darkMode,
    {
      background: 'linear-gradient(90deg, #7ecbff 0%, #b3e0ff 100%)',
      color: '#23272f',
      border: 'none',
      borderRadius: '1.2em',
      padding: '0.7em 1.5em',
      fontWeight: 700,
      fontSize: '1.08em',
      margin: '0 0.3em',
      cursor: 'pointer',
      boxShadow: '0 2px 8px 0 rgba(80, 120, 200, 0.10)',
      transition: 'background 0.2s',
    },
    {
      background: 'linear-gradient(90deg, #23272f 0%, #181a20 100%)',
      color: '#7ecbff',
      border: '1.5px solid #444',
      boxShadow: '0 2px 8px 0 rgba(31, 38, 135, 0.37)',
    }
  );
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Welcome to Grumpy Gamer!</h1>
      <p style={{ fontSize: "1.15em", lineHeight: 1.7, marginBottom: "1.2em" }}>
        Grumpy Gamer is your interactive playground for competing with AI and other humans in a variety of classic and modern games.<br />
        Whether you’re here to challenge yourself, learn about artificial intelligence, or just have fun, you’ll find something for everyone!
      </p>
      <div style={getDarkModeStyles(
        darkMode,
        { margin: '2rem 0 1.5rem 0', padding: '1.2rem', background: 'rgba(230,245,255,0.5)', borderRadius: '1rem', border: '1px solid #b3d0ff' },
        { background: 'rgba(36,41,54,0.85)', border: '1px solid #444', color: '#7ecbff' }
      )}>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.7rem', color: '#3a7bd5' }}>What can you do here?</h2>
        <ul style={{ fontSize: '1.08rem', lineHeight: 1.7, paddingLeft: '1.2rem', margin: 0, textAlign: 'left', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <li><b>Play Games:</b> Enjoy games like Wordle, Sudoku, and more—solo, with friends, or against AI.</li>
          <li><b>Challenge AI:</b> Test your skills against different AI agents and see how they learn and adapt.</li>
          <li><b>Compare Strategies:</b> Use the dashboard to analyze your performance and compare with AI.</li>
          <li><b>Learn & Experiment:</b> Explore open source code, tweak AI settings, and discover how game-playing AI works.</li>
          <li><b>Friendly Competition:</b> Climb the leaderboard and enjoy playful rivalry between humans and machines.</li>
        </ul>
      </div>
      <div style={getDarkModeStyles(
        darkMode,
        { margin: '1.5rem 0 1rem 0', padding: '1rem', background: 'rgba(255,255,255,0.7)', borderRadius: '1rem', border: '1px solid #e0e0e0' },
        { background: 'rgba(36,41,54,0.85)', border: '1px solid #444', color: '#a7ffb0' }
      )}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.5rem', color: '#3a7bd5' }}>How to Get Started</h2>
        <ol style={{ fontSize: '1.05rem', lineHeight: 1.7, paddingLeft: '1.2rem', margin: 0, textAlign: 'left', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <li>Pick a game from the <b>Game Selection</b> page.</li>
          <li>Choose to play solo, with friends, or against an AI opponent.</li>
          <li>Track your progress and compare results in the <b>Dashboard</b>.</li>
          <li>Visit <b>About</b> for more info, or <b>Settings</b> to customize your experience.</li>
        </ol>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "1em", flexWrap: "wrap", marginTop: '2em' }}>
        <button style={navBtnStyle} onClick={() => navigate('/games')}>Game Selection</button>
        <button style={navBtnStyle} onClick={() => navigate('/dashboard')}>Dashboard</button>
        <button style={navBtnStyle} onClick={() => navigate('/comparison')}>Comparison</button>
      </div>
      <div style={getDarkModeStyles(
        darkMode,
        { textAlign: 'center', marginTop: '2.2rem', color: '#7ecbff', fontWeight: 600, fontSize: '1.13em', letterSpacing: '0.01em' },
        { color: '#b3e0ff' }
      )}>
        Ready to play? Dive in and see if you can outsmart the AI!
      </div>
    </div>
  );
};

export default Home;
