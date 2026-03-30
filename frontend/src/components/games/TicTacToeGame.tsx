import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";
import { recordGame } from "../../services/gameStatsService";

// API base URL - use environment variable or default to production
// For Create React App, use process.env; for local dev with proxy, use relative URL
import API_URL from "../../config/api";
const API_BASE_URL = API_URL;

// Types
type Player = "X" | "O" | null;
type Board = Player[];
type Difficulty = "easy" | "medium" | "hard";
type AIMode = "minimax" | "reinforcement";

interface GameState {
  board: Board;
  currentPlayer: Player;
  winner: Player | "tie" | null;
  winningLine: number[] | null;
  isGameOver: boolean;
  userSymbol: Player;
  aiSymbol: Player;
  difficulty: Difficulty;
  aiMode: AIMode;
  isAiThinking: boolean;
  gameStarted: boolean;
  scores: { user: number; ai: number; ties: number };
  moveHistory: number[];
  usingRLModel: boolean; // Track if RL model is actually being used
}

// Winning combinations
const WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal
  [2, 4, 6], // Anti-diagonal
];

// Check for winner
const checkWinner = (board: Board): { winner: Player | "tie"; line: number[] | null } => {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  
  // Check for tie
  if (board.every(cell => cell !== null)) {
    return { winner: "tie", line: null };
  }
  
  return { winner: null, line: null };
};

// Get available moves
const getAvailableMoves = (board: Board): number[] => {
  return board.reduce<number[]>((moves, cell, index) => {
    if (cell === null) moves.push(index);
    return moves;
  }, []);
};

// Minimax algorithm with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Player,
  userSymbol: Player,
  alpha: number,
  beta: number
): number => {
  const { winner } = checkWinner(board);
  
  if (winner === aiSymbol) return 10 - depth;
  if (winner === userSymbol) return depth - 10;
  if (winner === "tie") return 0;
  
  const availableMoves = getAvailableMoves(board);
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of availableMoves) {
      board[move] = aiSymbol;
      const evalScore = minimax(board, depth + 1, false, aiSymbol, userSymbol, alpha, beta);
      board[move] = null;
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of availableMoves) {
      board[move] = userSymbol;
      const evalScore = minimax(board, depth + 1, true, aiSymbol, userSymbol, alpha, beta);
      board[move] = null;
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

// Find best move for AI
const findBestMove = (
  board: Board,
  aiSymbol: Player,
  userSymbol: Player,
  difficulty: Difficulty
): number => {
  const availableMoves = getAvailableMoves(board);
  
  if (availableMoves.length === 0) return -1;
  
  // Easy: Random move with 70% chance, smart move 30%
  // Medium: Random move with 30% chance, smart move 70%
  // Hard: Always smart move (Minimax)
  
  const randomChance = {
    easy: 0.7,
    medium: 0.3,
    hard: 0,
  };
  
  if (Math.random() < randomChance[difficulty]) {
    // Random move
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }
  
  // Smart move using Minimax
  let bestScore = -Infinity;
  let bestMove = availableMoves[0];
  
  for (const move of availableMoves) {
    board[move] = aiSymbol;
    const score = minimax(board, 0, false, aiSymbol, userSymbol, -Infinity, Infinity);
    board[move] = null;
    
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
};

// Fetch RL move from backend API
const fetchRLMove = async (
  board: Board,
  userSymbol: Player
): Promise<{ row: number; col: number; isRLModel: boolean }> => {
  // Convert board to API format: 0=empty, 1=player, 2=AI
  const boardMatrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  
  board.forEach((cell, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    if (cell === userSymbol) {
      boardMatrix[row][col] = 1; // Player
    } else if (cell !== null) {
      boardMatrix[row][col] = 2; // AI
    }
  });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/rl/tictactoe/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ board: boardMatrix }),
    });
    
    if (!response.ok) {
      throw new Error("RL API request failed");
    }
    
    const data = await response.json();
    return {
      row: data.row,
      col: data.col,
      isRLModel: data.is_rl_model,
    };
  } catch (error) {
    console.error("Error fetching RL move:", error);
    // Return -1 to signal fallback to local minimax
    throw error;
  }
};

const TicTacToeGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    winningLine: null,
    isGameOver: false,
    userSymbol: "X",
    aiSymbol: "O",
    difficulty: "medium",
    aiMode: "minimax",
    isAiThinking: false,
    gameStarted: false,
    scores: { user: 0, ai: 0, ties: 0 },
    moveHistory: [],
    usingRLModel: false,
  });

  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);

  const startGame = useCallback((
    userSymbol: Player,
    difficulty: Difficulty,
    aiMode: AIMode = gameState.aiMode
  ) => {
    const aiSymbol = userSymbol === "X" ? "O" : "X";
    // Start tracking game time
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    setGameState(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentPlayer: "X", // X always goes first
      winner: null,
      winningLine: null,
      isGameOver: false,
      userSymbol,
      aiSymbol,
      difficulty,
      aiMode,
      isAiThinking: false,
      gameStarted: true,
      moveHistory: [],
      usingRLModel: false,
    }));
  }, [gameState.aiMode]);

  const resetGame = useCallback(() => {
    // Reset tracking for new game
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    setGameState(prev => ({
      ...prev,
      board: Array(9).fill(null),
      currentPlayer: "X",
      winner: null,
      winningLine: null,
      isGameOver: false,
      isAiThinking: false,
      moveHistory: [],
    }));
  }, []);

  const makeMove = useCallback((index: number, player: Player) => {
    setGameState(prev => {
      if (prev.board[index] !== null || prev.isGameOver) return prev;
      
      const newBoard = [...prev.board];
      newBoard[index] = player;
      
      const { winner, line } = checkWinner(newBoard);
      const isGameOver = winner !== null;
      
      let newScores = { ...prev.scores };
      if (winner === prev.userSymbol) {
        newScores.user++;
      } else if (winner === prev.aiSymbol) {
        newScores.ai++;
      } else if (winner === "tie") {
        newScores.ties++;
      }
      
      return {
        ...prev,
        board: newBoard,
        currentPlayer: player === "X" ? "O" : "X",
        winner: isGameOver ? winner : null,
        winningLine: line,
        isGameOver,
        scores: isGameOver ? newScores : prev.scores,
        moveHistory: [...prev.moveHistory, index],
      };
    });
  }, []);

  // Handle user click
  const handleCellClick = (index: number) => {
    if (
      gameState.isGameOver ||
      gameState.isAiThinking ||
      gameState.board[index] !== null ||
      gameState.currentPlayer !== gameState.userSymbol
    ) {
      return;
    }
    addMove({ index, symbol: gameState.userSymbol, move: gameState.moveHistory.length + 1 });
    
    makeMove(index, gameState.userSymbol);
  };

  // AI move effect
  useEffect(() => {
    if (
      !gameState.gameStarted ||
      gameState.isGameOver ||
      gameState.currentPlayer !== gameState.aiSymbol
    ) {
      return;
    }

    setGameState(prev => ({ ...prev, isAiThinking: true }));

    const makeAIMove = async () => {
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      
      let bestMove = -1;
      let usedRLModel = false;
      
      if (gameState.aiMode === "reinforcement") {
        // Try to get move from RL API
        try {
          const result = await fetchRLMove(gameState.board, gameState.userSymbol);
          bestMove = result.row * 3 + result.col;
          usedRLModel = result.isRLModel;
        } catch (error) {
          // Fallback to local minimax
          console.warn("RL API failed, falling back to local minimax");
          const boardCopy = [...gameState.board];
          bestMove = findBestMove(
            boardCopy,
            gameState.aiSymbol,
            gameState.userSymbol,
            gameState.difficulty
          );
        }
      } else {
        // Use local minimax
        const boardCopy = [...gameState.board];
        bestMove = findBestMove(
          boardCopy,
          gameState.aiSymbol,
          gameState.userSymbol,
          gameState.difficulty
        );
      }

      if (bestMove !== -1) {
        makeMove(bestMove, gameState.aiSymbol);
      }
      
      setGameState(prev => ({ 
        ...prev, 
        isAiThinking: false,
        usingRLModel: usedRLModel,
      }));
    };

    makeAIMove();
  }, [
    gameState.currentPlayer,
    gameState.gameStarted,
    gameState.isGameOver,
    gameState.aiSymbol,
    gameState.userSymbol,
    gameState.difficulty,
    gameState.aiMode,
    gameState.board,
    makeMove,
  ]);

  // AI goes first if user chose O
  useEffect(() => {
    if (
      gameState.gameStarted &&
      gameState.userSymbol === "O" &&
      gameState.moveHistory.length === 0 &&
      !gameState.isAiThinking
    ) {
      setGameState(prev => ({ ...prev, isAiThinking: true }));
      
      const timer = setTimeout(() => {
        // AI takes center or corner on first move
        const firstMoves = [4, 0, 2, 6, 8];
        const move = firstMoves[Math.floor(Math.random() * firstMoves.length)];
        makeMove(move, gameState.aiSymbol);
        setGameState(prev => ({ ...prev, isAiThinking: false }));
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.gameStarted, gameState.userSymbol, gameState.moveHistory.length, gameState.isAiThinking, gameState.aiSymbol, makeMove]);

  // Record game stats when game ends
  useEffect(() => {
    if (gameState.isGameOver && gameState.winner !== null && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      // Determine result from user's perspective
      let result: "win" | "loss" | "draw";
      if (gameState.winner === "tie") {
        result = "draw";
      } else if (gameState.winner === gameState.userSymbol) {
        result = "win";
      } else {
        result = "loss";
      }

      // Calculate duration
      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      // Record the game
      recordGame({
        gameType: "tictactoe",
        result,
        movesCount: gameState.moveHistory.length,
        durationSeconds,
        opponentType: "ai",
        aiDifficulty: gameState.aiMode === "reinforcement" ? "rl" : gameState.difficulty,
        metadata: {
          userSymbol: gameState.userSymbol,
          aiMode: gameState.aiMode,
          usedRLModel: gameState.usingRLModel,
        },
      }).catch((err) => console.error("Failed to record game stats:", err));
    }
  }, [gameState.isGameOver, gameState.winner, gameState.userSymbol, gameState.moveHistory.length, gameState.difficulty, gameState.aiMode, gameState.usingRLModel]);

  const getCellStyle = (index: number) => {
    const isWinningCell = gameState.winningLine?.includes(index);
    const cellValue = gameState.board[index];
    
    let background = "#ffffff";
    let borderColor = "rgba(255,255,255,0.3)";
    
    if (isWinningCell) {
      background = cellValue === gameState.userSymbol 
        ? "linear-gradient(135deg, #4CAF50, #8BC34A)" 
        : "linear-gradient(135deg, #f44336, #E91E63)";
    }
    
    return {
      width: 100,
      height: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "3rem",
      fontWeight: 800,
      background,
      border: `3px solid ${borderColor}`,
      borderRadius: 12,
      cursor: gameState.board[index] === null && !gameState.isGameOver && !gameState.isAiThinking
        ? "pointer"
        : "default",
      transition: "all 0.2s ease",
      color: cellValue === "X" ? "#667eea" : "#f093fb",
      textShadow: cellValue ? "2px 2px 4px rgba(0,0,0,0.2)" : "none",
      transform: isWinningCell ? "scale(1.05)" : "scale(1)",
    };
  };

  const getStatusMessage = () => {
    if (gameState.winner === gameState.userSymbol) {
      return "🎉 You Win!";
    } else if (gameState.winner === gameState.aiSymbol) {
      return "🤖 AI Wins!";
    } else if (gameState.winner === "tie") {
      return "🤝 It's a Tie!";
    } else if (gameState.isAiThinking) {
      return "🤖 AI is thinking...";
    } else if (gameState.currentPlayer === gameState.userSymbol) {
      return "Your turn";
    } else {
      return "AI's turn";
    }
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
  // const flushMoves = async (sessionId: number) => {


  return (
    <div
      style={{
        maxWidth: 500,
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
          textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        ⭕ Tic-Tac-Toe ❌
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.8)",
          textAlign: "center",
          marginBottom: "1.5rem",
        }}
      >
        Challenge the AI!
      </p>

      {!gameState.gameStarted ? (
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            borderRadius: 16,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#1a1a2e", marginBottom: "1.5rem" }}>
            Choose Your Settings
          </h2>
          
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ color: "#666", marginBottom: "0.5rem", fontWeight: 600 }}>
              Play as:
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={() => startGame("X", gameState.difficulty)}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
                }}
              >
                ❌ X (First)
              </button>
              <button
                onClick={() => startGame("O", gameState.difficulty)}
                style={{
                  padding: "1rem 2rem",
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #f093fb, #f5576c)",
                  color: "#fff",
                  boxShadow: "0 4px 15px rgba(240, 147, 251, 0.4)",
                }}
              >
                ⭕ O (Second)
              </button>
            </div>
          </div>

          <div>
            <p style={{ color: "#666", marginBottom: "0.5rem", fontWeight: 600 }}>
              AI Type:
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "1rem" }}>
              <button
                onClick={() => setGameState(prev => ({ ...prev, aiMode: "minimax" }))}
                style={{
                  padding: "0.7rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  border: gameState.aiMode === "minimax" ? "none" : "2px solid #ddd",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: gameState.aiMode === "minimax"
                    ? "linear-gradient(135deg, #667eea, #764ba2)"
                    : "#fff",
                  color: gameState.aiMode === "minimax" ? "#fff" : "#666",
                }}
              >
                🧮 Minimax
              </button>
              <button
                onClick={() => setGameState(prev => ({ ...prev, aiMode: "reinforcement" }))}
                style={{
                  padding: "0.7rem 1.5rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  border: gameState.aiMode === "reinforcement" ? "none" : "2px solid #ddd",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: gameState.aiMode === "reinforcement"
                    ? "linear-gradient(135deg, #00b4db, #0083b0)"
                    : "#fff",
                  color: gameState.aiMode === "reinforcement" ? "#fff" : "#666",
                }}
              >
                🤖 RL Agent
              </button>
            </div>
            <p style={{ color: "#999", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {gameState.aiMode === "minimax" 
                ? "Traditional algorithm - always plays optimally" 
                : "🧠 Neural network trained via Reinforcement Learning!"}
            </p>
          </div>

          <div>
            <p style={{ color: "#666", marginBottom: "0.5rem", fontWeight: 600 }}>
              Difficulty:
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              {(["easy", "medium", "hard"] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setGameState(prev => ({ ...prev, difficulty: diff }))}
                  style={{
                    padding: "0.7rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    border: gameState.difficulty === diff ? "none" : "2px solid #ddd",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: gameState.difficulty === diff
                      ? diff === "easy"
                        ? "linear-gradient(135deg, #4CAF50, #8BC34A)"
                        : diff === "medium"
                        ? "linear-gradient(135deg, #FF9800, #FFC107)"
                        : "linear-gradient(135deg, #f44336, #E91E63)"
                      : "#fff",
                    color: gameState.difficulty === diff ? "#fff" : "#666",
                    textTransform: "capitalize",
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p style={{ color: "#999", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {gameState.difficulty === "easy" && "AI makes random moves often"}
              {gameState.difficulty === "medium" && "AI plays smart most of the time"}
              {gameState.difficulty === "hard" && "AI plays perfectly - good luck!"}
            </p>
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
              borderRadius: 12,
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ color: "#a5d6a7", fontSize: "0.9rem" }}>
                YOU ({gameState.userSymbol})
              </div>
              <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}>
                {gameState.scores.user}
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                flex: 1,
                borderLeft: "1px solid rgba(255,255,255,0.3)",
                borderRight: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              <div style={{ color: "#fff", fontSize: "0.9rem" }}>TIES</div>
              <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}>
                {gameState.scores.ties}
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ color: "#ffcc80", fontSize: "0.9rem" }}>
                AI ({gameState.aiSymbol})
              </div>
              <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 800 }}>
                {gameState.scores.ai}
              </div>
            </div>
          </div>

          {/* Status */}
          <div
            style={{
              textAlign: "center",
              color: "#fff",
              fontSize: "1.3rem",
              fontWeight: 700,
              marginBottom: "1rem",
              padding: "0.5rem",
              background: gameState.isGameOver
                ? gameState.winner === gameState.userSymbol
                  ? "rgba(76, 175, 80, 0.3)"
                  : gameState.winner === gameState.aiSymbol
                  ? "rgba(244, 67, 54, 0.3)"
                  : "rgba(255, 152, 0, 0.3)"
                : "rgba(255,255,255,0.1)",
              borderRadius: 8,
            }}
          >
            {getStatusMessage()}
          </div>

          {/* Game Board */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              marginBottom: "1.5rem",
              padding: 8,
              background: "rgba(0,0,0,0.2)",
              borderRadius: 16,
            }}
          >
            {gameState.board.map((cell, index) => (
              <div
                key={index}
                onClick={() => handleCellClick(index)}
                style={getCellStyle(index)}
              >
                {cell}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
            }}
          >
            <button
              onClick={resetGame}
              style={{
                padding: "0.8rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
              }}
            >
              🔄 Play Again
            </button>
            <button
              onClick={() => setGameState(prev => ({ 
                ...prev, 
                gameStarted: false,
                board: Array(9).fill(null),
                winner: null,
                winningLine: null,
                isGameOver: false,
                moveHistory: [],
              }))}
              style={{
                padding: "0.8rem 1.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                background: "rgba(255,255,255,0.2)",
                color: "#fff",
              }}
            >
              ⚙️ Change Settings
            </button>
          </div>

          {/* AI Mode indicator */}
          <div
            style={{
              textAlign: "center",
              marginTop: "1rem",
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.9rem",
            }}
          >
            {gameState.aiMode === "minimax" 
              ? `Difficulty: ${gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)}` 
              : `🧠 RL Agent ${gameState.usingRLModel ? "(trained model)" : "(using fallback)"}`}
          </div>
        </>
      )}
    </div>
  );
};

export default TicTacToeGame;
