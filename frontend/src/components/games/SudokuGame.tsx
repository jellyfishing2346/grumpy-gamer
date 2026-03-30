import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";
import { recordGame } from '../../services/gameStatsService';
import PlayAgainButton from "../PlayAgainButton";

// Types
type Board = (number | null)[][];
type CellOwner = ("user" | "ai" | "given" | null)[][];

interface GameState {
  board: Board;
  solution: Board;
  cellOwners: CellOwner;
  userScore: number;
  aiScore: number;
  isGameOver: boolean;
  winner: "user" | "ai" | "tie" | null;
  difficulty: "easy" | "medium" | "hard";
  isAiThinking: boolean;
  selectedCell: { row: number; col: number } | null;
  errors: { row: number; col: number }[];
  gameStarted: boolean;
  remainingCells: number;
}

// Sudoku Generator and Solver
const generateSolution = (): Board => {
  const board: Board = Array(9).fill(null).map(() => Array(9).fill(null));

  const isValid = (board: Board, row: number, col: number, num: number): boolean => {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }
    // Check column
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[boxRow + i][boxCol + j] === num) return false;
      }
    }
    return true;
  };

  const solve = (board: Board): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === null) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) return true;
              board[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  solve(board);
  return board;
};

const createPuzzle = (
  solution: Board,
  difficulty: "easy" | "medium" | "hard"
): Board => {
  const cellsToRemove = {
    easy: 35,
    medium: 45,
    hard: 55
  };

  const puzzle = solution.map(row => [...row]);
  let removed = 0;
  const target = cellsToRemove[difficulty];

  while (removed < target) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      removed++;
    }
  }

  return puzzle;
};

// Check if a move is valid
const isValidMove = (
  board: Board,
  row: number,
  col: number,
  num: number
): boolean => {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (x !== col && board[row][x] === num) return false;
  }
  // Check column
  for (let x = 0; x < 9; x++) {
    if (x !== row && board[x][col] === num) return false;
  }
  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = boxRow + i;
      const c = boxCol + j;
      if (r !== row && c !== col && board[r][c] === num) return false;
    }
  }
  return true;
};

// Get all empty cells
const getEmptyCells = (board: Board): { row: number; col: number }[] => {
  const empty: { row: number; col: number }[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === null) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
};

// AI Strategy: Find the best move
const findAiMove = (
  board: Board,
  solution: Board,
  difficulty: "easy" | "medium" | "hard"
): { row: number; col: number; value: number } | null => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) return null;

  // AI accuracy based on difficulty
  const accuracy = {
    easy: 0.7,
    medium: 0.85,
    hard: 0.95
  };

  // Find cells with fewer possibilities (constraint propagation)
  const cellsWithPossibilities = emptyCells.map(cell => {
    const possibilities: number[] = [];
    for (let num = 1; num <= 9; num++) {
      if (isValidMove(board, cell.row, cell.col, num)) {
        possibilities.push(num);
      }
    }
    return { ...cell, possibilities };
  });

  // Sort by fewest possibilities (most constrained first)
  cellsWithPossibilities.sort(
    (a, b) => a.possibilities.length - b.possibilities.length
  );

  // Pick a cell (prefer more constrained cells)
  const selectedCell = cellsWithPossibilities[0];

  if (selectedCell.possibilities.length === 0) return null;

  // Decide if AI makes correct move based on accuracy
  if (Math.random() < accuracy[difficulty]) {
    // Make the correct move
    const correctValue = solution[selectedCell.row][selectedCell.col];
    if (correctValue !== null) {
      return {
        row: selectedCell.row,
        col: selectedCell.col,
        value: correctValue
      };
    }
  }

  // Make a valid but possibly incorrect move
  const randomPossibility =
    selectedCell.possibilities[
      Math.floor(Math.random() * selectedCell.possibilities.length)
    ];

  return {
    row: selectedCell.row,
    col: selectedCell.col,
    value: randomPossibility
  };
};

const SudokuGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    solution: Array(9).fill(null).map(() => Array(9).fill(null)),
    cellOwners: Array(9).fill(null).map(() => Array(9).fill(null)),
    userScore: 0,
    aiScore: 0,
    isGameOver: false,
    winner: null,
    difficulty: "medium",
    isAiThinking: false,
    selectedCell: null,
    errors: [],
    gameStarted: false,
    remainingCells: 0
  });
  
  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);
  const moveCountRef = useRef<number>(0);

  // Record game stats when game ends
  useEffect(() => {
    if (gameState.isGameOver && gameState.winner !== null && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      let result: 'win' | 'loss' | 'draw';
      if (gameState.winner === 'tie') {
        result = 'draw';
      } else if (gameState.winner === 'user') {
        result = 'win';
      } else {
        result = 'loss';
      }

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      recordGame({
        gameType: 'sudoku',
        result,
        movesCount: moveCountRef.current,
        durationSeconds,
        score: gameState.userScore,
        opponentType: 'ai',
        aiDifficulty: gameState.difficulty,
        metadata: {
          userScore: gameState.userScore,
          aiScore: gameState.aiScore,
        },
      }).then((res: { success: boolean; sessionId?: number }) => { if (res.sessionId) flushMoves(res.sessionId); }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameState.isGameOver, gameState.winner, gameState.userScore, gameState.aiScore, gameState.difficulty]);

  const startNewGame = useCallback((difficulty: "easy" | "medium" | "hard") => {
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    moveCountRef.current = 0;
    
    const solution = generateSolution();
    const puzzle = createPuzzle(solution, difficulty);
    const cellOwners: CellOwner = puzzle.map(row =>
      row.map(cell => (cell !== null ? "given" : null))
    );

    const remaining = getEmptyCells(puzzle).length;

    setGameState({
      board: puzzle,
      solution,
      cellOwners,
      userScore: 0,
      aiScore: 0,
      isGameOver: false,
      winner: null,
      difficulty,
      isAiThinking: false,
      selectedCell: null,
      errors: [],
      gameStarted: true,
      remainingCells: remaining
    });
  }, []);

  // AI makes a move
  const aiMove = useCallback(() => {
    if (gameState.isGameOver || !gameState.gameStarted) return;

    setGameState(prev => ({ ...prev, isAiThinking: true }));

    setTimeout(() => {
      setGameState(prev => {
        const move = findAiMove(prev.board, prev.solution, prev.difficulty);

        if (!move) {
          return { ...prev, isAiThinking: false };
        }

        const newBoard = prev.board.map(row => [...row]);
        const newOwners = prev.cellOwners.map(row => [...row]);
        const isCorrect = move.value === prev.solution[move.row][move.col];

        newBoard[move.row][move.col] = move.value;
        newOwners[move.row][move.col] = "ai";

        const newAiScore = isCorrect ? prev.aiScore + 10 : prev.aiScore - 5;
        const remaining = getEmptyCells(newBoard).length;

        // Check if game is over
        let isGameOver = false;
        let winner: "user" | "ai" | "tie" | null = null;

        if (remaining === 0) {
          isGameOver = true;
          if (prev.userScore > newAiScore) {
            winner = "user";
          } else if (newAiScore > prev.userScore) {
            winner = "ai";
          } else {
            winner = "tie";
          }
        }

        return {
          ...prev,
          board: newBoard,
          cellOwners: newOwners,
          aiScore: newAiScore,
          isAiThinking: false,
          remainingCells: remaining,
          isGameOver,
          winner,
          errors: isCorrect
            ? prev.errors
            : [...prev.errors, { row: move.row, col: move.col }]
        };
      });
    }, 800 + Math.random() * 700);
  }, [gameState.isGameOver, gameState.gameStarted]);

  // User makes a move
  const handleCellClick = (row: number, col: number) => {
    if (
      gameState.isGameOver ||
      gameState.isAiThinking ||
      gameState.cellOwners[row][col] !== null
    ) {
      return;
    }
    addMove({ row, col, action: "select", move: moveCountRef.current + 1 });
    setGameState(prev => ({ ...prev, selectedCell: { row, col } }));
  };

  const handleNumberInput = (num: number) => {
    if (!gameState.selectedCell || gameState.isGameOver || gameState.isAiThinking) {
      return;
    }

    const { row, col } = gameState.selectedCell;

    if (gameState.cellOwners[row][col] !== null) return;

    const isCorrect = num === gameState.solution[row][col];
    const isValid = isValidMove(gameState.board, row, col, num);

    setGameState(prev => {
      const newBoard = prev.board.map(r => [...r]);
      const newOwners = prev.cellOwners.map(r => [...r]);

      newBoard[row][col] = num;
      newOwners[row][col] = "user";

      let newScore = prev.userScore;
      if (isCorrect) {
        newScore += 10;
      } else if (!isValid) {
        newScore -= 5;
      }

      const remaining = getEmptyCells(newBoard).length;

      // Check if game is over
      let isGameOver = false;
      let winner: "user" | "ai" | "tie" | null = null;

      if (remaining === 0) {
        isGameOver = true;
        if (newScore > prev.aiScore) {
          winner = "user";
        } else if (prev.aiScore > newScore) {
          winner = "ai";
        } else {
          winner = "tie";
        }
      }

      return {
        ...prev,
        board: newBoard,
        cellOwners: newOwners,
        userScore: newScore,
        selectedCell: null,
        remainingCells: remaining,
        isGameOver,
        winner,
        errors: isCorrect
          ? prev.errors
          : [...prev.errors, { row, col }]
      };
    });
  };

  // AI takes turn after user
  useEffect(() => {
    if (
      gameState.gameStarted &&
      !gameState.isGameOver &&
      !gameState.isAiThinking &&
      gameState.remainingCells > 0
    ) {
      const timer = setTimeout(aiMove, 1500);
      return () => clearTimeout(timer);
    }
  }, [
    gameState.board,
    gameState.gameStarted,
    gameState.isGameOver,
    gameState.isAiThinking,
    gameState.remainingCells,
    aiMove
  ]);

  const getCellStyle = (row: number, col: number) => {
    const owner = gameState.cellOwners[row][col];
    const isSelected =
      gameState.selectedCell?.row === row &&
      gameState.selectedCell?.col === col;
    const hasError = gameState.errors.some(e => e.row === row && e.col === col);
    const isInSameBox =
      gameState.selectedCell &&
      Math.floor(row / 3) === Math.floor(gameState.selectedCell.row / 3) &&
      Math.floor(col / 3) === Math.floor(gameState.selectedCell.col / 3);
    const isInSameRowOrCol =
      gameState.selectedCell &&
      (row === gameState.selectedCell.row ||
        col === gameState.selectedCell.col);

    let background = "#ffffff";
    let borderColor = "#d0d0d0";
    let color = "#1a1a2e";

    if (owner === "given") {
      background = "#f0f4f8";
      color = "#1a1a2e";
    } else if (owner === "user") {
      background = "#e8f5e9";
      color = "#2e7d32";
    } else if (owner === "ai") {
      background = "#fff3e0";
      color = "#e65100";
    }

    if (isSelected) {
      background = "#bbdefb";
      borderColor = "#1976d2";
    } else if (isInSameBox || isInSameRowOrCol) {
      background = owner ? background : "#f5f5f5";
    }

    if (hasError) {
      borderColor = "#f44336";
    }

    // 3x3 box borders
    const borderRight =
      col % 3 === 2 && col !== 8 ? "3px solid #1a1a2e" : `1px solid ${borderColor}`;
    const borderBottom =
      row % 3 === 2 && row !== 8 ? "3px solid #1a1a2e" : `1px solid ${borderColor}`;

    return {
      width: 44,
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.3rem",
      fontWeight: owner === "given" ? 700 : 500,
      background,
      color,
      borderTop: row === 0 ? "3px solid #1a1a2e" : `1px solid ${borderColor}`,
      borderLeft: col === 0 ? "3px solid #1a1a2e" : `1px solid ${borderColor}`,
      borderRight,
      borderBottom,
      cursor: owner === null && !gameState.isGameOver ? "pointer" : "default",
      transition: "all 0.15s ease",
      userSelect: "none" as const
    };
  };

  const [darkMode] = useDarkModeContext();
  const darkStyles = getDarkModeStyles(
    darkMode,
    {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "#1a1a2e"
    },
    {
      background: "#181a20",
      color: "#f5f6fa"
    }
  );
  // Replay recording
  const addMove = (moveData: Record<string, unknown>) => {
    pendingMovesRef.current.push({ moveNumber: pendingMovesRef.current.length + 1, moveData });
  };
  const flushMoves = async (sessionId: number) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    for (const move of pendingMovesRef.current) {
      try {
        await fetch('/api/replays/moves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, move_number: move.moveNumber, move_data: move.moveData }),
        });
      } catch (err) { console.error('Failed to flush move:', err); }
    }
    pendingMovesRef.current = [];
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: "2rem",
        borderRadius: 24,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        ...darkStyles
      }}
    >
      <h1
        style={{
          color: "#fff",
          fontSize: "2.5rem",
          fontWeight: 800,
          textAlign: "center",
          marginBottom: "0.5rem",
          textShadow: "2px 2px 4px rgba(0,0,0,0.2)"
        }}
      >
        🧩 Sudoku vs AI
      </h1>

      {!gameState.gameStarted ? (
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 16,
            padding: "2rem",
            textAlign: "center"
          }}
        >
          <h2 style={{ color: "#1a1a2e", marginBottom: "1rem" }}>
            Choose Difficulty
          </h2>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            Race against the AI to fill the board. Correct answers: +10 pts,
            Wrong answers: -5 pts
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            {(["easy", "medium", "hard"] as const).map(diff => (
              <button
                key={diff}
                onClick={() => startNewGame(diff)}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  background:
                    diff === "easy"
                      ? "linear-gradient(135deg, #4CAF50, #8BC34A)"
                      : diff === "medium"
                      ? "linear-gradient(135deg, #FF9800, #FFC107)"
                      : "linear-gradient(135deg, #f44336, #E91E63)",
                  color: "#fff",
                  textTransform: "capitalize",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  transition: "transform 0.2s"
                }}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Scoreboard */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
              padding: "1rem",
              background: "rgba(255,255,255,0.15)",
              borderRadius: 12
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ color: "#a5d6a7", fontSize: "0.9rem" }}>YOU</div>
              <div
                style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}
              >
                {gameState.userScore}
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                flex: 1,
                borderLeft: "1px solid rgba(255,255,255,0.3)",
                borderRight: "1px solid rgba(255,255,255,0.3)"
              }}
            >
              <div style={{ color: "#fff", fontSize: "0.9rem" }}>
                CELLS LEFT
              </div>
              <div
                style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}
              >
                {gameState.remainingCells}
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ color: "#ffcc80", fontSize: "0.9rem" }}>AI</div>
              <div
                style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}
              >
                {gameState.aiScore}
              </div>
            </div>
          </div>

          {/* AI Thinking Indicator */}
          {gameState.isAiThinking && (
            <div
              style={{
                textAlign: "center",
                color: "#ffcc80",
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600
              }}
            >
              🤖 AI is thinking...
            </div>
          )}

          {/* Game Board */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 8,
              marginBottom: "1rem"
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(9, 1fr)",
                gap: 0
              }}
            >
              {gameState.board.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleCellClick(rowIdx, colIdx)}
                    style={getCellStyle(rowIdx, colIdx)}
                  >
                    {cell}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Number Pad */}
          {!gameState.isGameOver && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(9, 1fr)",
                gap: 8,
                marginBottom: "1rem"
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  disabled={gameState.isAiThinking || !gameState.selectedCell}
                  style={{
                    padding: "0.8rem",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 8,
                    cursor:
                      gameState.isAiThinking || !gameState.selectedCell
                        ? "not-allowed"
                        : "pointer",
                    background:
                      gameState.isAiThinking || !gameState.selectedCell
                        ? "#ccc"
                        : "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",
                    color: "#1a1a2e",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    transition: "transform 0.1s"
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          )}

          {/* Game Over */}
          {gameState.isGameOver && (
            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: 16,
                padding: "2rem",
                textAlign: "center",
                marginBottom: "1rem"
              }}
            >
              <h2
                style={{
                  color:
                    gameState.winner === "user"
                      ? "#4CAF50"
                      : gameState.winner === "ai"
                      ? "#f44336"
                      : "#FF9800",
                  fontSize: "2rem",
                  marginBottom: "0.5rem"
                }}
              >
                {gameState.winner === "user"
                  ? "🎉 You Win!"
                  : gameState.winner === "ai"
                  ? "🤖 AI Wins!"
                  : "🤝 It's a Tie!"}
              </h2>
              <p style={{ color: "#666", marginBottom: "1rem" }}>
                Final Score: You {gameState.userScore} - {gameState.aiScore} AI
              </p>
              <div style={{ marginTop: "1em" }}>
                <PlayAgainButton />
              </div>
            </div>
          )}

          {/* Legend & Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem"
            }}
          >
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: "#f0f4f8",
                    borderRadius: 4
                  }}
                />
                <span style={{ color: "#fff", fontSize: "0.85rem" }}>Given</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: "#e8f5e9",
                    borderRadius: 4
                  }}
                />
                <span style={{ color: "#fff", fontSize: "0.85rem" }}>You</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: "#fff3e0",
                    borderRadius: 4
                  }}
                />
                <span style={{ color: "#fff", fontSize: "0.85rem" }}>AI</span>
              </div>
            </div>
            <button
              onClick={() =>
                setGameState(prev => ({ ...prev, gameStarted: false }))
              }
              style={{
                padding: "0.6rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
                transition: "background 0.2s"
              }}
            >
              New Game
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SudokuGame;

