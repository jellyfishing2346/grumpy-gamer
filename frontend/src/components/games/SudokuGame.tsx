import React, { useState } from "react";

const EMPTY_BOARD = Array(9).fill(null).map(() => Array(9).fill(""));

const SudokuGame: React.FC = () => {
  const [board, setBoard] = useState<string[][]>(EMPTY_BOARD);
  const [status, setStatus] = useState<string>("");

  const handleInput = (row: number, col: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newBoard = board.map((r, i) =>
      r.map((cell, j) => (i === row && j === col ? value : cell))
    );
    setBoard(newBoard);
  };

  const checkComplete = () => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!board[row][col]) return false;
      }
    }
    return true;
  };

  const handleCheck = () => {
    if (checkComplete()) {
      setStatus("✅ Board is filled! (No solution check yet)");
    } else {
      setStatus("❌ Board is not complete.");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "3em auto", background: "#fff", borderRadius: 18, boxShadow: "0 4px 32px 0 rgba(80, 120, 200, 0.10)", padding: "2em 1.5em", border: "1.5px solid #e9f1ff", fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif" }}>
      <h2 style={{ color: "#7ecbff", fontWeight: 800, fontSize: "2em", marginBottom: "1em" }}>Sudoku</h2>
      <div style={{ marginBottom: "1.5em", color: "#888" }}>Fill the board so every row, column, and 3x3 box contains 1-9.</div>
      <div style={{ display: "grid", gridTemplateRows: "repeat(9, 1fr)", gap: 2, marginBottom: "1.5em" }}>
        {board.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", gap: 2 }}>
            {row.map((cell, colIdx) => (
              <input
                key={colIdx}
                type="text"
                value={cell}
                maxLength={1}
                onChange={e => handleInput(rowIdx, colIdx, e.target.value.replace(/[^1-9]/, ""))}
                style={{
                  width: 32, height: 32, textAlign: "center", fontSize: "1.1em", border: "1.5px solid #b3d0ff",
                  borderRadius: 4, background: (colIdx % 3 === 2 && colIdx !== 8) ? "#e9f1ff" : "#f8fbff"
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <button onClick={handleCheck} style={{
        background: "linear-gradient(90deg, #7ecbff 0%, #b3e0ff 100%)",
        color: "#23272f",
        border: "none",
        borderRadius: 8,
        padding: "0.5em 1.2em",
        fontWeight: 700,
        fontSize: "1em",
        cursor: "pointer"
      }}>Check Board</button>
      {status && <div style={{ marginTop: "1.5em", fontWeight: 700, color: status.includes("✅") ? "#a7ffb0" : "#ff7a7a" }}>{status}</div>}
    </div>
  );
};

export default SudokuGame;
