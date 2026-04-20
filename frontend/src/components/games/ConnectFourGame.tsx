import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDarkModeContext } from "../DarkModeProvider";
import { getDarkModeStyles } from "../getDarkModeStyles";
import { recordGame } from '../../services/gameStatsService';

// API base URL
import API_URL from "../../config/api";
const API_BASE_URL = API_URL;

// Types
type Player = 'player' | 'ai' | null;
type Board = Player[][];
type Difficulty = 'easy' | 'medium' | 'hard';
type AIMode = 'minimax' | 'reinforcement';

const ROWS = 6;
const COLS = 7;
const WINNING_LENGTH = 4;

// Create empty board
const createEmptyBoard = (): Board => {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
};

// Check for win - returns winning cells if found
const checkWin = (board: Board, player: Player): number[][] | null => {
  if (!player) return null;

  // Check horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const cells: number[][] = [];
      let isWin = true;
      for (let i = 0; i < WINNING_LENGTH; i++) {
        if (board[row][col + i] !== player) {
          isWin = false;
          break;
        }
        cells.push([row, col + i]);
      }
      if (isWin) return cells;
    }
  }

  // Check vertical
  for (let row = 0; row <= ROWS - WINNING_LENGTH; row++) {
    for (let col = 0; col < COLS; col++) {
      const cells: number[][] = [];
      let isWin = true;
      for (let i = 0; i < WINNING_LENGTH; i++) {
        if (board[row + i][col] !== player) {
          isWin = false;
          break;
        }
        cells.push([row + i, col]);
      }
      if (isWin) return cells;
    }
  }

  // Check diagonal (down-right)
  for (let row = 0; row <= ROWS - WINNING_LENGTH; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const cells: number[][] = [];
      let isWin = true;
      for (let i = 0; i < WINNING_LENGTH; i++) {
        if (board[row + i][col + i] !== player) {
          isWin = false;
          break;
        }
        cells.push([row + i, col + i]);
      }
      if (isWin) return cells;
    }
  }

  // Check diagonal (up-right)
  for (let row = WINNING_LENGTH - 1; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const cells: number[][] = [];
      let isWin = true;
      for (let i = 0; i < WINNING_LENGTH; i++) {
        if (board[row - i][col + i] !== player) {
          isWin = false;
          break;
        }
        cells.push([row - i, col + i]);
      }
      if (isWin) return cells;
    }
  }

  return null;
};

// Check if board is full (tie)
const isBoardFull = (board: Board): boolean => {
  return board[0].every(cell => cell !== null);
};

// Get valid columns (not full)
const getValidColumns = (board: Board): number[] => {
  const valid: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) {
      valid.push(col);
    }
  }
  return valid;
};

// Drop piece in column, returns new board and row where piece landed
const dropPiece = (board: Board, col: number, player: Player): { newBoard: Board; row: number } | null => {
  if (board[0][col] !== null) return null;

  const newBoard = board.map(row => [...row]);
  for (let row = ROWS - 1; row >= 0; row--) {
    if (newBoard[row][col] === null) {
      newBoard[row][col] = player;
      return { newBoard, row };
    }
  }
  return null;
};

// Evaluate board position for AI
const evaluateWindow = (window: Player[], player: Player): number => {
  const opponent = player === 'ai' ? 'player' : 'ai';
  let score = 0;

  const playerCount = window.filter(cell => cell === player).length;
  const opponentCount = window.filter(cell => cell === opponent).length;
  const emptyCount = window.filter(cell => cell === null).length;

  if (playerCount === 4) {
    score += 100;
  } else if (playerCount === 3 && emptyCount === 1) {
    score += 5;
  } else if (playerCount === 2 && emptyCount === 2) {
    score += 2;
  }

  if (opponentCount === 3 && emptyCount === 1) {
    score -= 4; // Block opponent's winning move
  }

  return score;
};

const evaluateBoard = (board: Board, player: Player): number => {
  let score = 0;

  // Score center column (more strategic)
  const centerCol = Math.floor(COLS / 2);
  const centerArray = board.map(row => row[centerCol]);
  const centerCount = centerArray.filter(cell => cell === player).length;
  score += centerCount * 3;

  // Score horizontal
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const window = board[row].slice(col, col + WINNING_LENGTH);
      score += evaluateWindow(window, player);
    }
  }

  // Score vertical
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row <= ROWS - WINNING_LENGTH; row++) {
      const window: Player[] = [];
      for (let i = 0; i < WINNING_LENGTH; i++) {
        window.push(board[row + i][col]);
      }
      score += evaluateWindow(window, player);
    }
  }

  // Score diagonal (down-right)
  for (let row = 0; row <= ROWS - WINNING_LENGTH; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const window: Player[] = [];
      for (let i = 0; i < WINNING_LENGTH; i++) {
        window.push(board[row + i][col + i]);
      }
      score += evaluateWindow(window, player);
    }
  }

  // Score diagonal (up-right)
  for (let row = WINNING_LENGTH - 1; row < ROWS; row++) {
    for (let col = 0; col <= COLS - WINNING_LENGTH; col++) {
      const window: Player[] = [];
      for (let i = 0; i < WINNING_LENGTH; i++) {
        window.push(board[row - i][col + i]);
      }
      score += evaluateWindow(window, player);
    }
  }

  return score;
};

// Minimax algorithm with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; column: number } => {
  const validColumns = getValidColumns(board);

  // Terminal conditions
  if (checkWin(board, 'ai')) {
    return { score: 100000 + depth, column: -1 };
  }
  if (checkWin(board, 'player')) {
    return { score: -100000 - depth, column: -1 };
  }
  if (validColumns.length === 0) {
    return { score: 0, column: -1 };
  }
  if (depth === 0) {
    return { score: evaluateBoard(board, 'ai'), column: -1 };
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    let bestColumn = validColumns[Math.floor(Math.random() * validColumns.length)];

    for (const col of validColumns) {
      const result = dropPiece(board, col, 'ai');
      if (result) {
        const { score } = minimax(result.newBoard, depth - 1, alpha, beta, false);
        if (score > maxScore) {
          maxScore = score;
          bestColumn = col;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
    }
    return { score: maxScore, column: bestColumn };
  } else {
    let minScore = Infinity;
    let bestColumn = validColumns[Math.floor(Math.random() * validColumns.length)];

    for (const col of validColumns) {
      const result = dropPiece(board, col, 'player');
      if (result) {
        const { score } = minimax(result.newBoard, depth - 1, alpha, beta, true);
        if (score < minScore) {
          minScore = score;
          bestColumn = col;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }
    return { score: minScore, column: bestColumn };
  }
};

// AI move based on difficulty
const getAIMove = (board: Board, difficulty: Difficulty): number => {
  const validColumns = getValidColumns(board);
  if (validColumns.length === 0) return -1;

  // Check for immediate winning move
  for (const col of validColumns) {
    const result = dropPiece(board, col, 'ai');
    if (result && checkWin(result.newBoard, 'ai')) {
      return col;
    }
  }

  // Block player's winning move
  for (const col of validColumns) {
    const result = dropPiece(board, col, 'player');
    if (result && checkWin(result.newBoard, 'player')) {
      return col;
    }
  }

  switch (difficulty) {
    case 'easy':
      // Random move
      return validColumns[Math.floor(Math.random() * validColumns.length)];

    case 'medium':
      // 60% chance of optimal move, 40% random
      if (Math.random() < 0.6) {
        const { column } = minimax(board, 3, -Infinity, Infinity, true);
        return column;
      }
      return validColumns[Math.floor(Math.random() * validColumns.length)];

    case 'hard':
      // Full minimax with deeper search
      const { column } = minimax(board, 5, -Infinity, Infinity, true);
      return column;

    default:
      return validColumns[Math.floor(Math.random() * validColumns.length)];
  }
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '2em',
  maxWidth: 800,
  margin: '2em auto',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  borderRadius: 24,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  color: '#fff',
  textAlign: 'center',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: '2.5em',
  marginBottom: '0.3em',
  background: 'linear-gradient(90deg, #f39c12 0%, #e74c3c 50%, #f39c12 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
};

const boardContainerStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)',
  padding: '15px',
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
  gap: '8px',
};

const cellStyle: React.CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.5)',
};

const columnHoverStyle: React.CSSProperties = {
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const pieceStyle = (player: Player, isWinning: boolean): React.CSSProperties => ({
  width: '85%',
  height: '85%',
  borderRadius: '50%',
  background: player === 'player'
    ? 'radial-gradient(circle at 30% 30%, #f1c40f, #f39c12, #e67e22)'
    : player === 'ai'
    ? 'radial-gradient(circle at 30% 30%, #e74c3c, #c0392b, #922b21)'
    : 'transparent',
  boxShadow: player
    ? `0 4px 8px rgba(0, 0, 0, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.2), inset 0 2px 4px rgba(255, 255, 255, 0.2)${isWinning ? ', 0 0 20px ' + (player === 'player' ? '#f1c40f' : '#e74c3c') : ''}`
    : 'none',
  animation: isWinning ? 'pulse 0.5s ease-in-out infinite alternate' : 'none',
});

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #3498db 0%, #2980b9 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '0.8em 1.5em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  margin: '0.5em',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
};

const difficultyBtnStyle = (isActive: boolean): React.CSSProperties => ({
  ...buttonStyle,
  background: isActive
    ? 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)'
    : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
  boxShadow: isActive ? '0 4px 12px rgba(46, 204, 113, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
});

const scoreBoxStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.8em 1.5em',
  margin: '0.5em',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: '1.1em',
};

const ConnectFourGame: React.FC = () => {
  const [board, setBoard] = useState<Board>(createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<'player' | 'ai'>('player');
  const [winner, setWinner] = useState<Player>(null);
  const [winningCells, setWinningCells] = useState<number[][]>([]);
  const [isTie, setIsTie] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [aiMode, setAiMode] = useState<AIMode>('minimax');
  const [rlModelInfo, setRlModelInfo] = useState<{ loaded: boolean; fallback: boolean } | null>(null);
  const [score, setScore] = useState({ player: 0, ai: 0, ties: 0 });
  const [isThinking, setIsThinking] = useState(false);
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [dropAnimation, setDropAnimation] = useState<{ col: number; row: number; player: Player } | null>(null);
  const [moveCount, setMoveCount] = useState(0);

  // Stats tracking refs
  const gameStartTimeRef = useRef<number>(Date.now());
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);

  // Fetch RL status on mount and when switching to RL mode
  useEffect(() => {
    if (aiMode === 'reinforcement') {
      fetch(`${API_BASE_URL}/api/rl/connectfour/status`)
        .then(res => res.json())
        .then(data => setRlModelInfo({ loaded: data.model_trained, fallback: false }))
        .catch(() => setRlModelInfo({ loaded: false, fallback: true }));
    }
  }, [aiMode]);

  // Get RL move from API
  const getRLMove = async (currentBoard: Board): Promise<{ column: number; usedModel: boolean }> => {
    // Convert board to 2D array for API (0=empty, 1=player, 2=ai)
    const boardArray = currentBoard.map(row => 
      row.map(cell => cell === null ? 0 : cell === 'player' ? 1 : 2)
    );
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/rl/connectfour/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardArray }),
      });
      
      if (!response.ok) throw new Error('RL API error');
      
      const data = await response.json();
      return { column: data.column, usedModel: data.is_rl_model };
    } catch (error) {
      console.error('RL API failed, falling back to minimax:', error);
      // Fallback to minimax on error
      return { column: getAIMove(currentBoard, difficulty), usedModel: false };
    }
  };

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(createEmptyBoard());
    setCurrentPlayer('player');
    setWinner(null);
    setWinningCells([]);
    setIsTie(false);
    setIsThinking(false);
    setLastMove(null);
    setDropAnimation(null);
    setMoveCount(0);
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
  }, []);

  // Handle column click
  const handleColumnClick = useCallback((col: number) => {
    if (winner || isTie || currentPlayer !== 'player' || isThinking) return;

    const result = dropPiece(board, col, 'player');
    if (!result) return;

    setDropAnimation({ col, row: result.row, player: 'player' });
    setLastMove({ row: result.row, col });
    setMoveCount(prev => prev + 1);
    addMove({ column: col, row: result.row, move: moveCount + 1 });

    setTimeout(() => {
      setBoard(result.newBoard);
      setDropAnimation(null);

      const winCells = checkWin(result.newBoard, 'player');
      if (winCells) {
        setWinner('player');
        setWinningCells(winCells);
        setScore(prev => ({ ...prev, player: prev.player + 1 }));
        return;
      }

      if (isBoardFull(result.newBoard)) {
        setIsTie(true);
        setScore(prev => ({ ...prev, ties: prev.ties + 1 }));
        return;
      }

      setCurrentPlayer('ai');
    }, 300);
  }, [board, winner, isTie, currentPlayer, isThinking, moveCount]);

  // AI move
  useEffect(() => {
    if (currentPlayer !== 'ai' || winner || isTie) return;

    setIsThinking(true);

    const makeMove = async () => {
      let aiCol: number;
      
      if (aiMode === 'reinforcement') {
        // Use RL API
        const rlResult = await getRLMove(board);
        aiCol = rlResult.column;
        setRlModelInfo(prev => prev ? { ...prev, fallback: !rlResult.usedModel } : { loaded: true, fallback: !rlResult.usedModel });
      } else {
        // Use local minimax
        aiCol = getAIMove(board, difficulty);
      }
      
      if (aiCol === -1) return;

      const result = dropPiece(board, aiCol, 'ai');
      if (!result) return;

      setDropAnimation({ col: aiCol, row: result.row, player: 'ai' });
      setLastMove({ row: result.row, col: aiCol });
      setMoveCount(prev => prev + 1);

      setTimeout(() => {
        setBoard(result.newBoard);
        setDropAnimation(null);
        setIsThinking(false);

        const winCells = checkWin(result.newBoard, 'ai');
        if (winCells) {
          setWinner('ai');
          setWinningCells(winCells);
          setScore(prev => ({ ...prev, ai: prev.ai + 1 }));
          return;
        }

        if (isBoardFull(result.newBoard)) {
          setIsTie(true);
          setScore(prev => ({ ...prev, ties: prev.ties + 1 }));
          return;
        }

        setCurrentPlayer('player');
      }, 300);
    };

    const timer = setTimeout(makeMove, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, board, winner, isTie, difficulty, aiMode]);

  // Check if cell is in winning cells
  const isWinningCell = (row: number, col: number): boolean => {
    return winningCells.some(([r, c]) => r === row && c === col);
  };

  // Record game stats when game ends
  useEffect(() => {
    if ((winner || isTie) && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      // Determine result from user's perspective
      let result: "win" | "loss" | "draw";
      if (isTie) {
        result = "draw";
      } else if (winner === "player") {
        result = "win";
      } else {
        result = "loss";
      }

      // Calculate duration
      const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);

      // Record the game
      recordGame({
        gameType: "connectfour",
        result,
        movesCount: moveCount,
        durationSeconds,
        opponentType: "ai",
        aiDifficulty: aiMode === "reinforcement" ? "rl" : difficulty,
        metadata: {
          aiMode,
          usedRLModel: rlModelInfo?.loaded || false,
        },
      }).catch((err) => console.error("Failed to record game stats:", err));
    }
  }, [winner, isTie, moveCount, difficulty, aiMode, rlModelInfo]);

  // Get status message
  const getStatusMessage = (): string => {
    if (winner === 'player') return '🎉 You Win!';
    if (winner === 'ai') return '🤖 AI Wins!';
    if (isTie) return "🤝 It's a Tie!";
    if (isThinking) return '🤔 AI is thinking...';
    return '🟡 Your turn - Drop a disc!';
  };

  // Preview piece for hover
  const getPreviewRow = (col: number): number => {
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        return row;
      }
    }
    return -1;
  };

  const [darkMode] = useDarkModeContext();
  const darkStyles = getDarkModeStyles(
    darkMode,
    containerStyle,
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
        await fetch(`${API_URL}/api/replays/moves`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ session_id: sessionId, move_number: move.moveNumber, move_data: move.moveData }),
        });
      } catch (err) { console.error('Failed to flush move:', err); }
    }
    pendingMovesRef.current = [];
  };

  return (
    <div style={{ ...containerStyle, ...darkStyles }}>
      <style>
        {`
          @keyframes pulse {
            from { transform: scale(1); }
            to { transform: scale(1.1); }
          }
          @keyframes drop {
            from { transform: translateY(-400px); }
            to { transform: translateY(0); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          .column-hover:hover {
            background: rgba(255, 255, 255, 0.1) !important;
          }
        `}
      </style>

      <h1 style={headerStyle}>🔴 Connect Four 🟡</h1>

      {/* AI Type Selection */}
      <div style={{ marginBottom: '1em' }}>
        <span style={{ marginRight: '1em', opacity: 0.8 }}>AI Type:</span>
        <button
          style={{
            ...buttonStyle,
            background: aiMode === 'minimax'
              ? 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)'
              : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
            boxShadow: aiMode === 'minimax' ? '0 4px 12px rgba(155, 89, 182, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => { setAiMode('minimax'); resetGame(); }}
        >
          🧮 Minimax
        </button>
        <button
          style={{
            ...buttonStyle,
            background: aiMode === 'reinforcement'
              ? 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)'
              : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
            boxShadow: aiMode === 'reinforcement' ? '0 4px 12px rgba(231, 76, 60, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => { setAiMode('reinforcement'); resetGame(); }}
        >
          🤖 RL Agent
        </button>
        {aiMode === 'reinforcement' && rlModelInfo && (
          <span style={{
            marginLeft: '1em',
            fontSize: '0.85em',
            opacity: 0.7,
            color: rlModelInfo.fallback ? '#e74c3c' : '#2ecc71'
          }}>
            {rlModelInfo.loaded
              ? (rlModelInfo.fallback ? '⚠️ Using fallback' : '✅ Model loaded')
              : '⏳ Loading...'}
          </span>
        )}
      </div>

      {/* Difficulty Selection (only show for Minimax) */}
      {aiMode === 'minimax' && (
        <div style={{ marginBottom: '1em' }}>
          <span style={{ marginRight: '1em', opacity: 0.8 }}>Difficulty:</span>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              style={difficultyBtnStyle(difficulty === d)}
              onClick={() => {
                setDifficulty(d);
                resetGame();
              }}
            >
              {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
            </button>
          ))}
        </div>
      )}

      {/* Score Display */}
      <div style={{ marginBottom: '1em' }}>
        <div style={{ ...scoreBoxStyle, background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' }}>
          🟡 You: {score.player}
        </div>
        <div style={{ ...scoreBoxStyle, background: 'linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)' }}>
          🤝 Ties: {score.ties}
        </div>
        <div style={{ ...scoreBoxStyle, background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' }}>
          🔴 AI: {score.ai}
        </div>
      </div>

      {/* Status Message */}
      <div style={{
        fontSize: '1.3em',
        marginBottom: '1em',
        padding: '0.5em 1em',
        borderRadius: 12,
        background: winner === 'player' ? 'rgba(46, 204, 113, 0.2)' :
                    winner === 'ai' ? 'rgba(231, 76, 60, 0.2)' :
                    isTie ? 'rgba(149, 165, 166, 0.2)' : 'rgba(52, 152, 219, 0.2)',
        display: 'inline-block',
        animation: winner || isTie ? 'bounce 0.5s ease-in-out infinite' : 'none',
      }}>
        {getStatusMessage()}
      </div>

      {/* Game Board */}
      <div style={boardContainerStyle}>
        {/* Column indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', gap: '8px' }}>
          {Array(COLS).fill(null).map((_, col) => (
            <div
              key={col}
              style={{
                width: 60,
                height: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hoverColumn === col && !winner && !isTie && currentPlayer === 'player' ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #f1c40f, #f39c12)',
                boxShadow: '0 2px 8px rgba(241, 196, 15, 0.5)',
                animation: 'bounce 0.5s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>

        <div style={boardStyle}>
          {Array(COLS).fill(null).map((_, col) => (
            <div
              key={col}
              style={columnHoverStyle}
              className="column-hover"
              onMouseEnter={() => setHoverColumn(col)}
              onMouseLeave={() => setHoverColumn(null)}
              onClick={() => handleColumnClick(col)}
            >
              {Array(ROWS).fill(null).map((_, row) => {
                const cell = board[row][col];
                const isWinning = isWinningCell(row, col);
                const isLastMove = lastMove?.row === row && lastMove?.col === col;
                const isDropping = dropAnimation?.col === col && dropAnimation?.row === row;

                return (
                  <div
                    key={`${row}-${col}`}
                    style={{
                      ...cellStyle,
                      transform: isLastMove && !isDropping ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isLastMove
                        ? `inset 0 4px 8px rgba(0, 0, 0, 0.5), 0 0 10px ${cell === 'player' ? '#f1c40f' : '#e74c3c'}`
                        : cellStyle.boxShadow,
                    }}
                  >
                    {cell && (
                      <div
                        style={{
                          ...pieceStyle(cell, isWinning),
                          animation: isDropping ? 'drop 0.3s ease-in forwards' : isWinning ? 'pulse 0.5s ease-in-out infinite alternate' : 'none',
                        }}
                      />
                    )}
                    {/* Preview piece on hover */}
                    {!cell && hoverColumn === col && getPreviewRow(col) === row && !winner && !isTie && currentPlayer === 'player' && (
                      <div
                        style={{
                          ...pieceStyle('player', false),
                          opacity: 0.4,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Game Controls */}
      <div style={{ marginTop: '1.5em' }}>
        <button
          style={buttonStyle}
          onClick={resetGame}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🔄 New Game
        </button>
        <button
          style={{ ...buttonStyle, background: 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)' }}
          onClick={() => setScore({ player: 0, ai: 0, ties: 0 })}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🗑️ Reset Score
        </button>
      </div>

      {/* Game Rules */}
      <div style={{
        marginTop: '2em',
        padding: '1.5em',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        textAlign: 'left',
        maxWidth: 500,
        margin: '2em auto 0',
      }}>
        <h3 style={{ margin: '0 0 0.5em 0', color: '#3498db' }}>📖 How to Play</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5em', lineHeight: 1.8, opacity: 0.9 }}>
          <li>Click a column to drop your <span style={{ color: '#f1c40f' }}>yellow disc</span></li>
          <li>Connect <strong>4 discs</strong> in a row to win (horizontal, vertical, or diagonal)</li>
          <li>Block the AI's <span style={{ color: '#e74c3c' }}>red discs</span> to prevent them from winning</li>
          <li>On <strong>Hard</strong> mode, the AI uses advanced strategy!</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectFourGame;
