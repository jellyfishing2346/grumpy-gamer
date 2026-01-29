import React from "react";
import { useNavigate } from "react-router-dom";


const containerStyle: React.CSSProperties = {
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


const GameSelection: React.FC = () => {
  const navigate = useNavigate();
  const games = [
    {
      icon: '🎯', name: 'Wordle', desc: 'Guess the word in 6 tries', route: '/play/wordle', playable: true
    },
    {
      icon: '🧩', name: 'Sudoku', desc: 'Classic number puzzle', route: '/play/sudoku', playable: true
    },
    { icon: '⭕', name: 'Tic-Tac-Toe', desc: 'Get three in a row to win!', route: '/play/tictactoe', playable: false },
    { icon: '🔴', name: 'Connect Four', desc: 'Connect four discs in a row.', route: '/play/connectfour', playable: false },
    { icon: '♟️', name: 'Chess', desc: 'Classic strategy game.', route: '/play/chess', playable: false },
    { icon: '⛀', name: 'Checkers', desc: 'Jump and capture to win.', route: '/play/checkers', playable: false },
    { icon: '✊', name: 'Rock Paper Scissors', desc: 'Best of luck!', route: '/play/rps', playable: false },
    { icon: '💣', name: 'Minesweeper', desc: 'Clear the board, avoid mines.', route: '/play/minesweeper', playable: false },
    { icon: '2️⃣0️⃣4️⃣8️⃣', name: '2048', desc: 'Slide tiles to reach 2048.', route: '/play/2048', playable: false },
    { icon: '🔤', name: 'Hangman', desc: 'Guess the word, letter by letter.', route: '/play/hangman', playable: false },
    { icon: '⚫️⚪️', name: 'Othello/Reversi', desc: 'Flip discs, control the board.', route: '/play/othello', playable: false },
    { icon: '🃏', name: 'Memory', desc: 'Match pairs to win.', route: '/play/memory', playable: false },
  ];
  const btnStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #7ecbff 0%, #b3e0ff 100%)',
    color: '#23272f',
    border: 'none',
    borderRadius: '1.2em',
    padding: '0.6em 1.3em',
    fontWeight: 700,
    fontSize: '1em',
    marginTop: '0.7em',
    cursor: 'pointer',
    boxShadow: '0 2px 8px 0 rgba(80, 120, 200, 0.10)',
    transition: 'background 0.2s',
    outline: 'none',
    opacity: 1
  };
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Game Selection</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
        Choose your challenge! Each game pits you against our grumpy AI.<br />
        <span style={{ color: '#7ecbff', fontWeight: 600 }}>More games coming soon!</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5em' }}>
        {games.map((game) => (
          <div key={game.name} style={{ background: '#f8fbff', borderRadius: 18, boxShadow: '0 2px 12px #b3d0ff22', padding: '1.3em 1.5em', minWidth: 220, maxWidth: 260, textAlign: 'center', border: '1.5px solid #e9f1ff', position: 'relative', opacity: game.playable ? 1 : 0.7 }}>
            <span role="img" aria-label={game.name} style={{ fontSize: '2em' }}>{game.icon}</span>
            <div style={{ fontWeight: 700, margin: '0.5em 0 0.2em 0' }}>{game.name}</div>
            <div style={{ fontSize: '0.98em', marginBottom: '0.7em' }}>{game.desc}</div>
            <button
              style={{ ...btnStyle, opacity: game.playable ? 1 : 0.7, cursor: game.playable ? 'pointer' : 'not-allowed', width: '100%' }}
              onClick={() => game.playable ? navigate(game.route) : navigate('/coming-soon', { state: { name: game.name } })}
              disabled={false}
            >
              {game.playable ? `Play ${game.name}` : 'Coming Soon'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2em', color: '#aaa', fontSize: '1.05em' }}>
        Want a different game? <span style={{ color: '#7ecbff', fontWeight: 600 }}>Suggest your own!</span>
      </div>
    </div>
  );
};

export default GameSelection;
