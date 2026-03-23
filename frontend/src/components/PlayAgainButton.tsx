import React, { useState } from "react";

interface PlayAgainButtonProps {
  onPlayAgain?: () => void; // optional custom reset handler
  label?: string;
}

const PlayAgainButton: React.FC<PlayAgainButtonProps> = ({
  onPlayAgain,
  label = "🔄 Play Again",
}) => {

  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (onPlayAgain) {
      onPlayAgain();
    } else {
      // Default: reload the page to reset all game state
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "0.65em 1.6em",
        borderRadius: 50,
        border: "none",
        background: hovered
          ? "linear-gradient(90deg, #b3e0ff, #7ecbff)"
          : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
        color: "#1a1a2e",
        fontWeight: 700,
        fontSize: "1em",
        cursor: "pointer",
        fontFamily: "'DM Sans', 'Inter', sans-serif",
        marginTop: "1em",
        transition: "all 0.2s ease",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered
          ? "0 6px 20px rgba(126,203,255,0.4)"
          : "0 2px 8px rgba(126,203,255,0.2)",
      }}
    >
      {label}
    </button>
  );
};

export default PlayAgainButton;