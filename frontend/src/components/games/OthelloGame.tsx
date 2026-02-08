import React, { useState, useCallback, useEffect, useRef } from 'react';

// Types
type Player = 'black' | 'white';
type CellState = Player | null;
type GameStatus = 'playing' | 'ended';
type Difficulty = 'easy' | 'medium' | 'hard';
type AIMode = 'minimax' | 'reinforcement';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Position {
  row: number;
  col: number;
}

interface GameState {
  board: CellState[][];
  currentPlayer: Player;
  status: GameStatus;
  blackCount: number;
  whiteCount: number;
  validMoves: Position[];
  winner: Player | 'tie' | null;
  lastMove: Position | null;
}

// Constants
const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],          [0, 1],
  [1, -1],  [1, 0], [1, 1]
];

// Styles
const containerStyle: React.CSSProperties = {
  padding: '2em',
  maxWidth: 800,
  margin: '2em auto',
  background: '#fff',
  borderRadius: 22,
  boxShadow: '0 4px 32px 0 rgba(80, 120, 200, 0.10)',
  color: '#23272f',
  textAlign: 'center',
  border: '1.5px solid #e9f1ff',
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
};

const headingStyle: React.CSSProperties = {
  fontSize: '2.4em',
  marginBottom: '0.3em',
  color: '#2e7d32',
  fontWeight: 800,
  letterSpacing: '0.01em',
  textShadow: '0 2px 12px rgba(46, 125, 50, 0.3)',
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: '1.1em',
  color: '#666',
  marginBottom: '1.5em',
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '1em',
  padding: '0.7em 1.5em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  boxShadow: '0 2px 8px 0 rgba(46, 125, 50, 0.25)',
  transition: 'all 0.2s',
  outline: 'none',
  margin: '0.3em',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(90deg, #757575 0%, #9e9e9e 100%)',
  boxShadow: '0 2px 8px 0 rgba(117, 117, 117, 0.25)',
};

const difficultyButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...btnStyle,
  padding: '0.5em 1em',
  fontSize: '0.9em',
  background: isActive 
    ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
    : 'linear-gradient(90deg, #e0e0e0 0%, #bdbdbd 100%)',
  color: isActive ? '#fff' : '#666',
});

const boardContainerStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 8,
  background: '#2e7d32',
  borderRadius: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
  gap: 2,
  background: '#1b5e20',
};

const getCellStyle = (isValidMove: boolean, isLastMove: boolean): React.CSSProperties => ({
  width: 50,
  height: 50,
  background: isLastMove 
    ? '#558b2f' 
    : isValidMove 
      ? '#43a047' 
      : '#388e3c',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: isValidMove ? 'pointer' : 'default',
  transition: 'all 0.2s',
  position: 'relative',
});

const getDiscStyle = (player: Player, isNew: boolean = false): React.CSSProperties => ({
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: player === 'black' 
    ? 'radial-gradient(circle at 30% 30%, #424242, #212121)' 
    : 'radial-gradient(circle at 30% 30%, #ffffff, #e0e0e0)',
  boxShadow: player === 'black'
    ? 'inset 0 -3px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)'
    : 'inset 0 -3px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.2)',
  transition: 'all 0.3s ease-in-out',
  transform: isNew ? 'scale(1.1)' : 'scale(1)',
});

const validMoveIndicatorStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.4)',
  border: '2px solid rgba(255, 255, 255, 0.6)',
};

const scoreBoxStyle = (isActive: boolean, player: Player): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  background: isActive 
    ? player === 'black' ? '#424242' : '#f5f5f5'
    : player === 'black' ? '#616161' : '#eeeeee',
  borderRadius: 12,
  padding: '10px 20px',
  margin: '0 10px',
  border: isActive ? '3px solid #ffc107' : '3px solid transparent',
  transition: 'all 0.3s',
});

const scoreDiscStyle = (player: Player): React.CSSProperties => ({
  width: 30,
  height: 30,
  borderRadius: '50%',
  background: player === 'black' 
    ? 'radial-gradient(circle at 30% 30%, #424242, #212121)' 
    : 'radial-gradient(circle at 30% 30%, #ffffff, #bdbdbd)',
  boxShadow: player === 'black'
    ? 'inset 0 -2px 4px rgba(0,0,0,0.4)'
    : 'inset 0 -2px 4px rgba(0,0,0,0.1)',
});

const scoreTextStyle = (player: Player): React.CSSProperties => ({
  fontSize: '1.5em',
  fontWeight: 700,
  color: player === 'black' ? '#fff' : '#333',
});

// Game Logic Functions
const createInitialBoard = (): CellState[][] => {
  const board: CellState[][] = Array(BOARD_SIZE).fill(null).map(() => 
    Array(BOARD_SIZE).fill(null)
  );
  
  // Initial 4 pieces in the center
  const mid = BOARD_SIZE / 2;
  board[mid - 1][mid - 1] = 'white';
  board[mid - 1][mid] = 'black';
  board[mid][mid - 1] = 'black';
  board[mid][mid] = 'white';
  
  return board;
};

const cloneBoard = (board: CellState[][]): CellState[][] => {
  return board.map(row => [...row]);
};

const getOpponent = (player: Player): Player => {
  return player === 'black' ? 'white' : 'black';
};

const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Check if a move is valid and return pieces to flip
const getFlippablePieces = (
  board: CellState[][],
  row: number,
  col: number,
  player: Player
): Position[] => {
  if (board[row][col] !== null) return [];
  
  const opponent = getOpponent(player);
  const allFlippable: Position[] = [];
  
  for (const [dr, dc] of DIRECTIONS) {
    const flippable: Position[] = [];
    let r = row + dr;
    let c = col + dc;
    
    // Move in direction while finding opponent pieces
    while (isValidPosition(r, c) && board[r][c] === opponent) {
      flippable.push({ row: r, col: c });
      r += dr;
      c += dc;
    }
    
    // Check if we ended on our own piece (valid flip)
    if (flippable.length > 0 && isValidPosition(r, c) && board[r][c] === player) {
      allFlippable.push(...flippable);
    }
  }
  
  return allFlippable;
};

const isValidMove = (board: CellState[][], row: number, col: number, player: Player): boolean => {
  return getFlippablePieces(board, row, col, player).length > 0;
};

const getValidMoves = (board: CellState[][], player: Player): Position[] => {
  const moves: Position[] = [];
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isValidMove(board, row, col, player)) {
        moves.push({ row, col });
      }
    }
  }
  
  return moves;
};

const makeMove = (
  board: CellState[][],
  row: number,
  col: number,
  player: Player
): CellState[][] | null => {
  const flippable = getFlippablePieces(board, row, col, player);
  
  if (flippable.length === 0) return null;
  
  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  
  for (const pos of flippable) {
    newBoard[pos.row][pos.col] = player;
  }
  
  return newBoard;
};

const countPieces = (board: CellState[][]): { black: number; white: number } => {
  let black = 0;
  let white = 0;
  
  for (const row of board) {
    for (const cell of row) {
      if (cell === 'black') black++;
      else if (cell === 'white') white++;
    }
  }
  
  return { black, white };
};

const isBoardFull = (board: CellState[][]): boolean => {
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) return false;
    }
  }
  return true;
};

// AI Logic with Minimax and Alpha-Beta Pruning
const POSITION_WEIGHTS = [
  [100, -20, 10,  5,  5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [ 10,  -2,  1,  1,  1,  1,  -2,  10],
  [  5,  -2,  1,  0,  0,  1,  -2,   5],
  [  5,  -2,  1,  0,  0,  1,  -2,   5],
  [ 10,  -2,  1,  1,  1,  1,  -2,  10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10,  5,  5, 10, -20, 100],
];

const evaluateBoard = (board: CellState[][], player: Player): number => {
  const opponent = getOpponent(player);
  let score = 0;
  
  // Piece count difference
  const { black, white } = countPieces(board);
  const pieceScore = player === 'black' ? black - white : white - black;
  
  // Position-based scoring
  let positionScore = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === player) {
        positionScore += POSITION_WEIGHTS[row][col];
      } else if (board[row][col] === opponent) {
        positionScore -= POSITION_WEIGHTS[row][col];
      }
    }
  }
  
  // Mobility (number of valid moves)
  const playerMoves = getValidMoves(board, player).length;
  const opponentMoves = getValidMoves(board, opponent).length;
  const mobilityScore = playerMoves - opponentMoves;
  
  // Corner control bonus
  const corners = [
    [0, 0], [0, 7], [7, 0], [7, 7]
  ];
  let cornerScore = 0;
  for (const [r, c] of corners) {
    if (board[r][c] === player) cornerScore += 25;
    else if (board[r][c] === opponent) cornerScore -= 25;
  }
  
  // Combine scores with weights
  score = pieceScore * 1 + positionScore * 2 + mobilityScore * 5 + cornerScore * 10;
  
  return score;
};

const minimax = (
  board: CellState[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number => {
  const currentPlayer = isMaximizing ? aiPlayer : getOpponent(aiPlayer);
  const validMoves = getValidMoves(board, currentPlayer);
  
  // Terminal conditions
  if (depth === 0) {
    return evaluateBoard(board, aiPlayer);
  }
  
  if (validMoves.length === 0) {
    // Check if opponent can move
    const opponentMoves = getValidMoves(board, getOpponent(currentPlayer));
    if (opponentMoves.length === 0) {
      // Game over
      const { black, white } = countPieces(board);
      const aiCount = aiPlayer === 'black' ? black : white;
      const oppCount = aiPlayer === 'black' ? white : black;
      if (aiCount > oppCount) return 10000;
      if (aiCount < oppCount) return -10000;
      return 0;
    }
    // Pass turn
    return minimax(board, depth - 1, alpha, beta, !isMaximizing, aiPlayer);
  }
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      const newBoard = makeMove(board, move.row, move.col, currentPlayer);
      if (newBoard) {
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      const newBoard = makeMove(board, move.row, move.col, currentPlayer);
      if (newBoard) {
        const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
    }
    return minEval;
  }
};

const getAIMove = (
  board: CellState[][],
  aiPlayer: Player,
  difficulty: Difficulty
): Position | null => {
  const validMoves = getValidMoves(board, aiPlayer);
  
  if (validMoves.length === 0) return null;
  
  // Determine search depth based on difficulty
  const depths: Record<Difficulty, number> = {
    easy: 1,
    medium: 3,
    hard: 5,
  };
  const depth = depths[difficulty];
  
  // For easy mode, add some randomness
  if (difficulty === 'easy' && Math.random() < 0.3) {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }
  
  let bestMove = validMoves[0];
  let bestScore = -Infinity;
  
  for (const move of validMoves) {
    const newBoard = makeMove(board, move.row, move.col, aiPlayer);
    if (newBoard) {
      const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer);
      
      // Add slight randomness for medium difficulty
      const adjustedScore = difficulty === 'medium' 
        ? score + (Math.random() - 0.5) * 10 
        : score;
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMove = move;
      }
    }
  }
  
  return bestMove;
};

// React Component
const OthelloGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameStarted, setGameStarted] = useState(false);
  const [playerColor, setPlayerColor] = useState<Player>('black');
  const [aiMode, setAiMode] = useState<AIMode>('minimax');
  const [rlModelInfo, setRlModelInfo] = useState<{ trained: boolean }>({ trained: false });
  const [usedRLModel, setUsedRLModel] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const board = createInitialBoard();
    return {
      board,
      currentPlayer: 'black', // Black always starts
      status: 'playing',
      blackCount: 2,
      whiteCount: 2,
      validMoves: getValidMoves(board, 'black'),
      winner: null,
      lastMove: null,
    };
  });
  
  const [aiThinking, setAiThinking] = useState(false);
  const [passMessage, setPassMessage] = useState<string | null>(null);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const aiPlayer = getOpponent(playerColor);

  // Check RL model status on mount
  useEffect(() => {
    const checkRLStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/rl/othello/status`);
        if (response.ok) {
          const data = await response.json();
          setRlModelInfo({ trained: data.model_trained });
        }
      } catch (error) {
        console.log('Could not fetch Othello RL status:', error);
      }
    };
    checkRLStatus();
  }, []);

  // Initialize game
  const startGame = useCallback(() => {
    const board = createInitialBoard();
    setGameState({
      board,
      currentPlayer: 'black',
      status: 'playing',
      blackCount: 2,
      whiteCount: 2,
      validMoves: getValidMoves(board, 'black'),
      winner: null,
      lastMove: null,
    });
    setUsedRLModel(false);
    setPassMessage(null);
    setGameStarted(true);
  }, []);

  // Handle player move
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.status !== 'playing') return;
    if (gameState.currentPlayer !== playerColor) return;
    if (aiThinking) return;
    
    const isValid = gameState.validMoves.some(m => m.row === row && m.col === col);
    if (!isValid) return;
    
    const newBoard = makeMove(gameState.board, row, col, playerColor);
    if (!newBoard) return;
    
    const { black, white } = countPieces(newBoard);
    const nextPlayer = getOpponent(playerColor);
    const nextValidMoves = getValidMoves(newBoard, nextPlayer);
    
    // Check for game end or pass
    let status: GameStatus = 'playing';
    let winner: Player | 'tie' | null = null;
    let currentPlayer: Player = nextPlayer;
    let validMoves = nextValidMoves;
    
    if (nextValidMoves.length === 0) {
      // Opponent can't move, check if current player can
      const currentPlayerMoves = getValidMoves(newBoard, playerColor);
      if (currentPlayerMoves.length === 0 || isBoardFull(newBoard)) {
        // Game over
        status = 'ended';
        if (black > white) winner = 'black';
        else if (white > black) winner = 'white';
        else winner = 'tie';
      } else {
        // Opponent passes, player continues
        currentPlayer = playerColor;
        validMoves = currentPlayerMoves;
        setPassMessage(`${nextPlayer === 'black' ? 'Black' : 'White'} has no valid moves. Turn skipped!`);
        setTimeout(() => setPassMessage(null), 2000);
      }
    }
    
    setGameState({
      board: newBoard,
      currentPlayer,
      status,
      blackCount: black,
      whiteCount: white,
      validMoves,
      winner,
      lastMove: { row, col },
    });
  }, [gameState, playerColor, aiThinking]);

  // AI Turn with RL support
  useEffect(() => {
    if (!gameStarted) return;
    if (gameState.status !== 'playing') return;
    if (gameState.currentPlayer !== aiPlayer) return;
    
    setAiThinking(true);
    
    const makeAIMove = async () => {
      let aiMove: Position | null = null;
      let usedRL = false;
      
      // Try RL API if in reinforcement mode
      if (aiMode === 'reinforcement') {
        try {
          // Convert board to API format (0=empty, 1=black, -1=white)
          const boardData = gameState.board.map(row => 
            row.map(cell => cell === 'black' ? 1 : cell === 'white' ? -1 : 0)
          );
          
          const aiPlayerValue = aiPlayer === 'black' ? 1 : -1;
          
          const response = await fetch(`${API_BASE_URL}/api/rl/othello/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board: boardData, player: aiPlayerValue })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.position !== -1) {
              aiMove = { row: data.row, col: data.col };
              usedRL = data.is_rl_model;
              setUsedRLModel(usedRL);
            }
          }
        } catch (error) {
          console.error('RL API error, falling back to minimax:', error);
        }
      }
      
      // Fall back to local minimax if RL didn't provide a move
      if (!aiMove) {
        aiMove = getAIMove(gameState.board, aiPlayer, difficulty);
        setUsedRLModel(false);
      }
      
      if (!aiMove) {
        // AI can't move, check if player can
        const playerMoves = getValidMoves(gameState.board, playerColor);
        if (playerMoves.length === 0 || isBoardFull(gameState.board)) {
          // Game over
          const { black, white } = countPieces(gameState.board);
          let winner: Player | 'tie' | null = null;
          if (black > white) winner = 'black';
          else if (white > black) winner = 'white';
          else winner = 'tie';
          
          setGameState(prev => ({
            ...prev,
            status: 'ended',
            winner,
            validMoves: [],
          }));
        } else {
          // AI passes
          setPassMessage(`${aiPlayer === 'black' ? 'Black' : 'White'} (AI) has no valid moves. Turn skipped!`);
          setTimeout(() => setPassMessage(null), 2000);
          
          setGameState(prev => ({
            ...prev,
            currentPlayer: playerColor,
            validMoves: playerMoves,
          }));
        }
        setAiThinking(false);
        return;
      }
      
      const newBoard = makeMove(gameState.board, aiMove.row, aiMove.col, aiPlayer);
      if (!newBoard) {
        setAiThinking(false);
        return;
      }
      
      const { black, white } = countPieces(newBoard);
      const nextValidMoves = getValidMoves(newBoard, playerColor);
      
      let status: GameStatus = 'playing';
      let winner: Player | 'tie' | null = null;
      let currentPlayer: Player = playerColor;
      let validMoves = nextValidMoves;
      
      if (nextValidMoves.length === 0) {
        const aiNextMoves = getValidMoves(newBoard, aiPlayer);
        if (aiNextMoves.length === 0 || isBoardFull(newBoard)) {
          status = 'ended';
          if (black > white) winner = 'black';
          else if (white > black) winner = 'white';
          else winner = 'tie';
          validMoves = [];
        } else {
          // Player passes
          currentPlayer = aiPlayer;
          validMoves = aiNextMoves;
          setPassMessage(`${playerColor === 'black' ? 'Black' : 'White'} (You) has no valid moves. Turn skipped!`);
          setTimeout(() => setPassMessage(null), 2000);
        }
      }
      
      setGameState({
        board: newBoard,
        currentPlayer,
        status,
        blackCount: black,
        whiteCount: white,
        validMoves,
        winner,
        lastMove: aiMove,
      });
      
      setAiThinking(false);
    };
    
    // Add a small delay for UX
    aiTimeoutRef.current = setTimeout(makeAIMove, 600);
    
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameStarted, gameState, aiPlayer, playerColor, difficulty, aiMode]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  // Render game setup
  if (!gameStarted) {
    return (
      <div style={containerStyle}>
        <h1 style={headingStyle}>⚫⚪ Othello / Reversi</h1>
        <p style={subHeadingStyle}>
          Flip your opponent's discs and control the board!
        </p>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>Select Difficulty</h3>
          <button
            style={difficultyButtonStyle(difficulty === 'easy')}
            onClick={() => setDifficulty('easy')}
          >
            😊 Easy
          </button>
          <button
            style={difficultyButtonStyle(difficulty === 'medium')}
            onClick={() => setDifficulty('medium')}
          >
            🤔 Medium
          </button>
          <button
            style={difficultyButtonStyle(difficulty === 'hard')}
            onClick={() => setDifficulty('hard')}
          >
            😤 Hard
          </button>
        </div>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>AI Type</h3>
          <button
            style={difficultyButtonStyle(aiMode === 'minimax')}
            onClick={() => setAiMode('minimax')}
          >
            🧠 Minimax AI
          </button>
          <button
            style={difficultyButtonStyle(aiMode === 'reinforcement')}
            onClick={() => setAiMode('reinforcement')}
          >
            🤖 RL AI {rlModelInfo.trained ? '✓' : '(training...)'}
          </button>
        </div>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>Choose Your Color</h3>
          <button
            style={{
              ...btnStyle,
              background: playerColor === 'black' 
                ? 'linear-gradient(90deg, #424242 0%, #616161 100%)'
                : 'linear-gradient(90deg, #e0e0e0 0%, #bdbdbd 100%)',
              color: playerColor === 'black' ? '#fff' : '#666',
              border: playerColor === 'black' ? '3px solid #ffc107' : '3px solid transparent',
            }}
            onClick={() => setPlayerColor('black')}
          >
            ⚫ Black (First)
          </button>
          <button
            style={{
              ...btnStyle,
              background: playerColor === 'white' 
                ? 'linear-gradient(90deg, #f5f5f5 0%, #e0e0e0 100%)'
                : 'linear-gradient(90deg, #e0e0e0 0%, #bdbdbd 100%)',
              color: '#333',
              border: playerColor === 'white' ? '3px solid #ffc107' : '3px solid transparent',
            }}
            onClick={() => setPlayerColor('white')}
          >
            ⚪ White (Second)
          </button>
        </div>
        
        <div style={{ 
          background: '#f5f5f5', 
          borderRadius: 12, 
          padding: '1.5em', 
          marginBottom: '1.5em',
          textAlign: 'left',
          maxWidth: 500,
          margin: '0 auto 1.5em',
        }}>
          <h4 style={{ color: '#2e7d32', marginBottom: '0.5em' }}>📜 How to Play</h4>
          <ul style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.8, paddingLeft: '1.2em' }}>
            <li>Place your disc to outflank opponent's discs</li>
            <li>Outflanked discs are flipped to your color</li>
            <li>You must flip at least one disc per move</li>
            <li>If you can't move, your turn is skipped</li>
            <li>Game ends when neither player can move</li>
            <li><strong>Most discs wins!</strong></li>
          </ul>
        </div>
        
        <button style={btnStyle} onClick={startGame}>
          Start Game
        </button>
        
        {/* Preview board */}
        <div style={{ marginTop: '2em', opacity: 0.7 }}>
          <div style={{ ...boardContainerStyle, transform: 'scale(0.6)', transformOrigin: 'center' }}>
            <div style={boardStyle}>
              {createInitialBoard().map((row, r) => 
                row.map((cell, c) => (
                  <div key={`${r}-${c}`} style={getCellStyle(false, false)}>
                    {cell && <div style={getDiscStyle(cell)} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine winner message
  const getWinnerMessage = () => {
    if (!gameState.winner) return '';
    
    if (gameState.winner === 'tie') {
      return "🤝 It's a Tie!";
    }
    
    const playerWon = gameState.winner === playerColor;
    if (playerWon) {
      return '🎉 You Win! The AI is grumpy...';
    } else {
      return '😤 AI Wins! Better luck next time!';
    }
  };

  // Main game view
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>⚫⚪ Othello</h1>
      
      {/* Score display */}
      <div style={{ marginBottom: '1em' }}>
        <div style={scoreBoxStyle(gameState.currentPlayer === 'black', 'black')}>
          <div style={scoreDiscStyle('black')} />
          <span style={scoreTextStyle('black')}>{gameState.blackCount}</span>
          {playerColor === 'black' && <span style={{ color: '#fff', fontSize: '0.8em' }}>You</span>}
          {playerColor === 'white' && <span style={{ color: '#fff', fontSize: '0.8em' }}>AI</span>}
        </div>
        <div style={scoreBoxStyle(gameState.currentPlayer === 'white', 'white')}>
          <div style={scoreDiscStyle('white')} />
          <span style={scoreTextStyle('white')}>{gameState.whiteCount}</span>
          {playerColor === 'white' && <span style={{ color: '#333', fontSize: '0.8em' }}>You</span>}
          {playerColor === 'black' && <span style={{ color: '#333', fontSize: '0.8em' }}>AI</span>}
        </div>
      </div>
      
      {/* Game status */}
      {gameState.status === 'ended' && (
        <div style={{ 
          background: gameState.winner === playerColor 
            ? 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)' 
            : gameState.winner === 'tie'
              ? 'linear-gradient(90deg, #90a4ae 0%, #b0bec5 100%)'
              : 'linear-gradient(90deg, #ef5350 0%, #e57373 100%)',
          color: '#fff', 
          padding: '1em', 
          borderRadius: 12, 
          marginBottom: '1em',
          fontWeight: 700,
          fontSize: '1.1em',
        }}>
          {getWinnerMessage()}
          <div style={{ fontSize: '0.9em', marginTop: '0.3em' }}>
            Final Score: ⚫ {gameState.blackCount} - {gameState.whiteCount} ⚪
          </div>
        </div>
      )}
      
      {/* Turn indicator */}
      {gameState.status === 'playing' && (
        <div style={{ marginBottom: '1em' }}>
          {aiThinking ? (
            <div style={{ 
              background: '#fff3e0', 
              color: '#e65100', 
              padding: '0.5em 1em', 
              borderRadius: 8,
              fontWeight: 600,
            }}>
              🤔 AI is thinking... {aiMode === 'reinforcement' && '(RL)'}
            </div>
          ) : (
            <div style={{ 
              background: '#e8f5e9', 
              color: '#2e7d32', 
              padding: '0.5em 1em', 
              borderRadius: 8,
              fontWeight: 600,
            }}>
              Your turn! ({gameState.validMoves.length} valid moves)
              {aiMode === 'reinforcement' && usedRLModel && (
                <span style={{ fontSize: '0.8em', marginLeft: '1em', color: '#1565c0' }}>
                  🤖 RL AI Active
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Pass message */}
      {passMessage && (
        <div style={{ 
          background: '#ffecb3', 
          color: '#ff6f00', 
          padding: '0.5em 1em', 
          borderRadius: 8,
          marginBottom: '1em',
          fontWeight: 600,
        }}>
          {passMessage}
        </div>
      )}
      
      {/* Game board */}
      <div style={boardContainerStyle}>
        <div style={boardStyle}>
          {gameState.board.map((row, r) => 
            row.map((cell, c) => {
              const isValidMove = gameState.currentPlayer === playerColor && 
                gameState.validMoves.some(m => m.row === r && m.col === c);
              const isLastMove = gameState.lastMove?.row === r && gameState.lastMove?.col === c;
              
              return (
                <div 
                  key={`${r}-${c}`} 
                  style={getCellStyle(isValidMove && !aiThinking, isLastMove)}
                  onClick={() => handleCellClick(r, c)}
                >
                  {cell ? (
                    <div style={getDiscStyle(cell, isLastMove)} />
                  ) : isValidMove && !aiThinking ? (
                    <div style={validMoveIndicatorStyle} />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* Coordinate labels */}
      <div style={{ marginTop: '0.5em', color: '#666', fontSize: '0.85em' }}>
        Click on highlighted cells to place your disc
      </div>
      
      {/* Controls */}
      <div style={{ marginTop: '1.5em' }}>
        <button style={btnStyle} onClick={startGame}>New Game</button>
        <button style={btnSecondaryStyle} onClick={() => setGameStarted(false)}>Change Settings</button>
      </div>
      
      {/* Game info */}
      <div style={{ 
        marginTop: '1.5em', 
        padding: '1em', 
        background: '#f5f5f5', 
        borderRadius: 12,
        fontSize: '0.9em',
        color: '#666',
      }}>
        <strong>Difficulty:</strong> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} | 
        <strong> You:</strong> {playerColor === 'black' ? '⚫ Black' : '⚪ White'} | 
        <strong> AI:</strong> {aiPlayer === 'black' ? '⚫ Black' : '⚪ White'}
      </div>
    </div>
  );
};

export default OthelloGame;
