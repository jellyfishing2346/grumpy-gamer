import React, { useState, useCallback, useEffect } from 'react';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "";

// Types
type PieceColor = 'red' | 'black';
type PieceType = 'regular' | 'king';
type Piece = { color: PieceColor; type: PieceType } | null;
type Board = Piece[][];
type Position = { row: number; col: number };
type Move = {
  from: Position;
  to: Position;
  captures: Position[];
  isKinging?: boolean;
};
type Difficulty = 'easy' | 'medium' | 'hard';
type AIMode = 'minimax' | 'reinforcement';

const BOARD_SIZE = 8;

// Create initial board
const createInitialBoard = (): Board => {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  
  // Place black pieces (AI) at top
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'black', type: 'regular' };
      }
    }
  }
  
  // Place red pieces (player) at bottom
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row][col] = { color: 'red', type: 'regular' };
      }
    }
  }
  
  return board;
};

// Clone board
const cloneBoard = (board: Board): Board => 
  board.map(row => row.map(piece => piece ? { ...piece } : null));

// Get all valid moves for a piece
const getPieceMoves = (board: Board, row: number, col: number, mustCapture: boolean = false): Move[] => {
  const piece = board[row][col];
  if (!piece) return [];
  
  const moves: Move[] = [];
  const directions: number[] = [];
  
  // Regular pieces move in one direction, kings move both ways
  if (piece.type === 'king') {
    directions.push(-1, 1);
  } else {
    directions.push(piece.color === 'red' ? -1 : 1);
  }
  
  // Check for captures first (captures are mandatory)
  const captureMoves = getCaptureMoves(board, row, col, piece, directions);
  
  if (captureMoves.length > 0) {
    return captureMoves;
  }
  
  // If must capture but no captures available, return empty
  if (mustCapture) return [];
  
  // Regular moves (only if no captures available)
  for (const dRow of directions) {
    for (const dCol of [-1, 1]) {
      const newRow = row + dRow;
      const newCol = col + dCol;
      
      if (isValidPosition(newRow, newCol) && !board[newRow][newCol]) {
        const isKinging = shouldKing(piece.color, newRow);
        moves.push({
          from: { row, col },
          to: { row: newRow, col: newCol },
          captures: [],
          isKinging,
        });
      }
    }
  }
  
  return moves;
};

// Get capture moves (including multi-jumps)
const getCaptureMoves = (
  board: Board,
  row: number,
  col: number,
  piece: { color: PieceColor; type: PieceType },
  directions: number[]
): Move[] => {
  const moves: Move[] = [];
  const opponent = piece.color === 'red' ? 'black' : 'red';
  
  for (const dRow of directions) {
    for (const dCol of [-1, 1]) {
      const midRow = row + dRow;
      const midCol = col + dCol;
      const endRow = row + dRow * 2;
      const endCol = col + dCol * 2;
      
      if (isValidPosition(endRow, endCol)) {
        const midPiece = board[midRow][midCol];
        const endPiece = board[endRow][endCol];
        
        if (midPiece && midPiece.color === opponent && !endPiece) {
          // Found a capture
          const isKinging = shouldKing(piece.color, endRow);
          const newType = isKinging ? 'king' : piece.type;
          
          // Check for multi-jumps
          const tempBoard = cloneBoard(board);
          tempBoard[row][col] = null;
          tempBoard[midRow][midCol] = null;
          tempBoard[endRow][endCol] = { color: piece.color, type: newType };
          
          const multiJumpDirections = newType === 'king' ? [-1, 1] : directions;
          const furtherCaptures = getCaptureMoves(
            tempBoard,
            endRow,
            endCol,
            { color: piece.color, type: newType },
            multiJumpDirections
          );
          
          if (furtherCaptures.length > 0) {
            // Add multi-jump moves
            for (const further of furtherCaptures) {
              moves.push({
                from: { row, col },
                to: further.to,
                captures: [{ row: midRow, col: midCol }, ...further.captures],
                isKinging: isKinging || further.isKinging,
              });
            }
          } else {
            // Single capture
            moves.push({
              from: { row, col },
              to: { row: endRow, col: endCol },
              captures: [{ row: midRow, col: midCol }],
              isKinging,
            });
          }
        }
      }
    }
  }
  
  return moves;
};

// Check if position is on board
const isValidPosition = (row: number, col: number): boolean => {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
};

// Check if piece should be kinged
const shouldKing = (color: PieceColor, row: number): boolean => {
  return (color === 'red' && row === 0) || (color === 'black' && row === BOARD_SIZE - 1);
};

// Get all valid moves for a player
const getAllMoves = (board: Board, color: PieceColor): Move[] => {
  const allMoves: Move[] = [];
  let hasCaptures = false;
  
  // First pass: check if any captures exist
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getPieceMoves(board, row, col);
        for (const move of moves) {
          if (move.captures.length > 0) {
            hasCaptures = true;
            allMoves.push(move);
          }
        }
      }
    }
  }
  
  // If captures exist, only return capture moves (mandatory capture rule)
  if (hasCaptures) return allMoves;
  
  // Second pass: get regular moves
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getPieceMoves(board, row, col);
        allMoves.push(...moves);
      }
    }
  }
  
  return allMoves;
};

// Apply move to board
const applyMove = (board: Board, move: Move): Board => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.row][move.from.col];
  
  if (!piece) return newBoard;
  
  // Move piece
  newBoard[move.from.row][move.from.col] = null;
  newBoard[move.to.row][move.to.col] = {
    color: piece.color,
    type: move.isKinging ? 'king' : piece.type,
  };
  
  // Remove captured pieces
  for (const capture of move.captures) {
    newBoard[capture.row][capture.col] = null;
  }
  
  return newBoard;
};

// Count pieces
const countPieces = (board: Board, color: PieceColor): { regular: number; kings: number } => {
  let regular = 0;
  let kings = 0;
  
  for (const row of board) {
    for (const piece of row) {
      if (piece && piece.color === color) {
        if (piece.type === 'king') kings++;
        else regular++;
      }
    }
  }
  
  return { regular, kings };
};

// Evaluate board position for AI
const evaluateBoard = (board: Board): number => {
  const blackPieces = countPieces(board, 'black');
  const redPieces = countPieces(board, 'red');
  
  // Piece values: kings are worth more
  const blackScore = blackPieces.regular * 100 + blackPieces.kings * 300;
  const redScore = redPieces.regular * 100 + redPieces.kings * 300;
  
  // Position bonuses
  let positionBonus = 0;
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (piece) {
        // Center control bonus
        const centerBonus = (3.5 - Math.abs(col - 3.5)) * 5;
        // Advancement bonus (for regular pieces)
        let advanceBonus = 0;
        if (piece.type === 'regular') {
          advanceBonus = piece.color === 'black' ? row * 5 : (7 - row) * 5;
        }
        // Back row protection (keeping pieces in back row early game)
        let backRowBonus = 0;
        if (piece.type === 'regular') {
          if (piece.color === 'black' && row === 0) backRowBonus = 10;
          if (piece.color === 'red' && row === 7) backRowBonus = 10;
        }
        
        const bonus = centerBonus + advanceBonus + backRowBonus;
        positionBonus += piece.color === 'black' ? bonus : -bonus;
      }
    }
  }
  
  return (blackScore - redScore) + positionBonus;
};

// Minimax with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; move: Move | null } => {
  const color = isMaximizing ? 'black' : 'red';
  const moves = getAllMoves(board, color);
  
  // Terminal conditions
  if (moves.length === 0) {
    // Current player has no moves - they lose
    return { score: isMaximizing ? -100000 : 100000, move: null };
  }
  
  if (depth === 0) {
    return { score: evaluateBoard(board), move: null };
  }
  
  let bestMove: Move | null = null;
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const { score } = minimax(newBoard, depth - 1, alpha, beta, false);
      
      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    
    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const { score } = minimax(newBoard, depth - 1, alpha, beta, true);
      
      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    
    return { score: minScore, move: bestMove };
  }
};

// Get AI move based on difficulty
const getAIMove = (board: Board, difficulty: Difficulty): Move | null => {
  const moves = getAllMoves(board, 'black');
  if (moves.length === 0) return null;
  
  // Prioritize captures (already done by getAllMoves)
  const captureMoves = moves.filter(m => m.captures.length > 0);
  
  switch (difficulty) {
    case 'easy':
      // Random move, but prefer captures
      if (captureMoves.length > 0) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
      
    case 'medium':
      // 50% optimal, 50% random
      if (Math.random() < 0.5) {
        const { move } = minimax(board, 3, -Infinity, Infinity, true);
        return move;
      }
      return moves[Math.floor(Math.random() * moves.length)];
      
    case 'hard':
      // Full minimax
      const { move } = minimax(board, 5, -Infinity, Infinity, true);
      return move;
      
    default:
      return moves[0];
  }
};

// Check for game over
const checkGameOver = (board: Board, currentTurn: PieceColor): {
  isOver: boolean;
  winner: PieceColor | 'draw' | null;
} => {
  const redPieces = countPieces(board, 'red');
  const blackPieces = countPieces(board, 'black');
  
  // No pieces left
  if (redPieces.regular + redPieces.kings === 0) {
    return { isOver: true, winner: 'black' };
  }
  if (blackPieces.regular + blackPieces.kings === 0) {
    return { isOver: true, winner: 'red' };
  }
  
  // No valid moves
  const moves = getAllMoves(board, currentTurn);
  if (moves.length === 0) {
    return { isOver: true, winner: currentTurn === 'red' ? 'black' : 'red' };
  }
  
  return { isOver: false, winner: null };
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '2em',
  maxWidth: 700,
  margin: '2em auto',
  background: 'linear-gradient(135deg, #2c1810 0%, #4a2c2a 100%)',
  borderRadius: 24,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  color: '#fff',
  textAlign: 'center',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: '2.4em',
  marginBottom: '0.3em',
  background: 'linear-gradient(90deg, #e74c3c 0%, #f39c12 50%, #e74c3c 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
};

const boardContainerStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#5d4037',
  padding: 12,
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
  gap: 0,
  border: '3px solid #3e2723',
  borderRadius: 4,
  overflow: 'hidden',
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '0.7em 1.4em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  margin: '0.4em',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
};

const difficultyBtnStyle = (isActive: boolean): React.CSSProperties => ({
  ...buttonStyle,
  padding: '0.5em 1em',
  fontSize: '0.9em',
  background: isActive
    ? 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)'
    : 'linear-gradient(90deg, #5d4037 0%, #4e342e 100%)',
  boxShadow: isActive ? '0 4px 12px rgba(46, 204, 113, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
});

const CheckersGame: React.FC = () => {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('red');
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [aiMode, setAiMode] = useState<AIMode>('minimax');
  const [rlModelInfo, setRlModelInfo] = useState<{ loaded: boolean; fallback: boolean } | null>(null);
  const [score, setScore] = useState({ player: 0, ai: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceColor | 'draw' | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Fetch RL status when switching to RL mode
  useEffect(() => {
    if (aiMode === 'reinforcement') {
      fetch(`${API_BASE_URL}/api/rl/checkers/status`)
        .then(res => res.json())
        .then(data => setRlModelInfo({ loaded: data.model_trained, fallback: false }))
        .catch(() => setRlModelInfo({ loaded: false, fallback: true }));
    }
  }, [aiMode]);

  // Convert board to API format (0=empty, 1=red regular, 2=red king, 3=black regular, 4=black king)
  const boardToApiFormat = (b: Board): number[][] => {
    return b.map(row => row.map(piece => {
      if (!piece) return 0;
      if (piece.color === 'red' && piece.type === 'regular') return 1;
      if (piece.color === 'red' && piece.type === 'king') return 2;
      if (piece.color === 'black' && piece.type === 'regular') return 3;
      if (piece.color === 'black' && piece.type === 'king') return 4;
      return 0;
    }));
  };

  // Get RL move from API
  const getRLMove = async (currentBoard: Board): Promise<{ move: Move | null; usedModel: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rl/checkers/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardToApiFormat(currentBoard) }),
      });
      
      if (!response.ok) throw new Error('RL API error');
      
      const data = await response.json();
      
      // Check if valid move was returned
      if (data.from_row === 0 && data.from_col === 0 && data.to_row === 0 && data.to_col === 0 && data.captures.length === 0) {
        return { move: null, usedModel: false };
      }
      
      const move: Move = {
        from: { row: data.from_row, col: data.from_col },
        to: { row: data.to_row, col: data.to_col },
        captures: data.captures.map((c: number[]) => ({ row: c[0], col: c[1] })),
        isKinging: data.is_kinging
      };
      
      return { move, usedModel: data.is_rl_model };
    } catch (error) {
      console.error('RL API failed, falling back to minimax:', error);
      // Fallback to minimax on error
      const move = getAIMove(currentBoard, difficulty);
      return { move, usedModel: false };
    }
  };

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setCurrentTurn('red');
    setSelectedPiece(null);
    setValidMoves([]);
    setGameOver(false);
    setWinner(null);
    setIsThinking(false);
    setLastMove(null);
    setMoveHistory([]);
  }, []);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameOver || currentTurn !== 'red' || isThinking) return;
    
    const piece = board[row][col];
    
    // If clicking on own piece, select it
    if (piece && piece.color === 'red') {
      const moves = getPieceMoves(board, row, col);
      const allMoves = getAllMoves(board, 'red');
      const hasCaptures = allMoves.some(m => m.captures.length > 0);
      
      // If there are captures available, only allow selecting pieces that can capture
      if (hasCaptures && !moves.some(m => m.captures.length > 0)) {
        return;
      }
      
      setSelectedPiece({ row, col });
      setValidMoves(moves);
      return;
    }
    
    // If a piece is selected and clicking on valid destination
    if (selectedPiece) {
      const move = validMoves.find(m => m.to.row === row && m.to.col === col);
      
      if (move) {
        // Execute move
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setLastMove(move);
        
        // Add to history
        const notation = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row} → ${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}${move.captures.length > 0 ? ' ×' + move.captures.length : ''}`;
        setMoveHistory(prev => [...prev, notation]);
        
        // Check for game over
        const result = checkGameOver(newBoard, 'black');
        if (result.isOver) {
          setGameOver(true);
          setWinner(result.winner);
          if (result.winner === 'red') {
            setScore(prev => ({ ...prev, player: prev.player + 1 }));
          } else if (result.winner === 'black') {
            setScore(prev => ({ ...prev, ai: prev.ai + 1 }));
          }
        } else {
          setCurrentTurn('black');
        }
        
        setSelectedPiece(null);
        setValidMoves([]);
      }
    }
  }, [board, currentTurn, gameOver, isThinking, selectedPiece, validMoves]);

  // AI move
  useEffect(() => {
    if (currentTurn !== 'black' || gameOver) return;
    
    setIsThinking(true);
    
    const makeMove = async () => {
      let move: Move | null = null;
      
      if (aiMode === 'reinforcement') {
        // Use RL API
        const rlResult = await getRLMove(board);
        move = rlResult.move;
        setRlModelInfo(prev => prev ? { ...prev, fallback: !rlResult.usedModel } : { loaded: true, fallback: !rlResult.usedModel });
      } else {
        // Use local minimax
        move = getAIMove(board, difficulty);
      }
      
      if (move) {
        const newBoard = applyMove(board, move);
        setBoard(newBoard);
        setLastMove(move);
        
        // Add to history
        const notation = `${String.fromCharCode(97 + move.from.col)}${8 - move.from.row} → ${String.fromCharCode(97 + move.to.col)}${8 - move.to.row}${move.captures.length > 0 ? ' ×' + move.captures.length : ''}`;
        setMoveHistory(prev => [...prev, notation]);
        
        // Check for game over
        const result = checkGameOver(newBoard, 'red');
        if (result.isOver) {
          setGameOver(true);
          setWinner(result.winner);
          if (result.winner === 'red') {
            setScore(prev => ({ ...prev, player: prev.player + 1 }));
          } else if (result.winner === 'black') {
            setScore(prev => ({ ...prev, ai: prev.ai + 1 }));
          }
        } else {
          setCurrentTurn('red');
        }
      }
      
      setIsThinking(false);
    };
    
    const timer = setTimeout(makeMove, 600);
    
    return () => clearTimeout(timer);
  }, [currentTurn, board, gameOver, difficulty, aiMode]);

  // Get cell style
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const isPlayableSquare = (row + col) % 2 === 1;
    const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
    const isValidMove = validMoves.some(m => m.to.row === row && m.to.col === col);
    const isCapture = validMoves.some(m => m.to.row === row && m.to.col === col && m.captures.length > 0);
    const isLastMoveFrom = lastMove?.from.row === row && lastMove?.from.col === col;
    const isLastMoveTo = lastMove?.to.row === row && lastMove?.to.col === col;
    
    let background = isPlayableSquare ? '#5d4037' : '#d7ccc8';
    
    if (isSelected) {
      background = '#4caf50';
    } else if (isLastMoveFrom || isLastMoveTo) {
      background = isPlayableSquare ? '#7b5e57' : '#e8d5ce';
    }
    
    return {
      width: 55,
      height: 55,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background,
      cursor: isPlayableSquare ? 'pointer' : 'default',
      position: 'relative',
      transition: 'background 0.15s',
      boxShadow: isValidMove 
        ? `inset 0 0 0 3px ${isCapture ? '#e74c3c' : '#4caf50'}`
        : 'none',
    };
  };

  // Get piece style
  const getPieceStyle = (piece: Piece): React.CSSProperties => {
    if (!piece) return {};
    
    const isRed = piece.color === 'red';
    const isKing = piece.type === 'king';
    
    return {
      width: 42,
      height: 42,
      borderRadius: '50%',
      background: isRed
        ? 'radial-gradient(circle at 30% 30%, #ff6b6b, #c0392b, #922b21)'
        : 'radial-gradient(circle at 30% 30%, #4a4a4a, #2c2c2c, #1a1a1a)',
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: isKing ? '1.3em' : '0',
      color: isRed ? '#fff' : '#ffd700',
      fontWeight: 'bold',
      cursor: piece.color === 'red' && currentTurn === 'red' && !gameOver ? 'grab' : 'default',
      transition: 'transform 0.15s',
      border: isKing ? `2px solid ${isRed ? '#ffd700' : '#ffd700'}` : 'none',
    };
  };

  // Get status message
  const getStatusMessage = (): string => {
    if (gameOver) {
      if (winner === 'red') return '🎉 You Win!';
      if (winner === 'black') return '🤖 AI Wins!';
      return '🤝 Draw!';
    }
    if (isThinking) return '🤔 AI is thinking...';
    return currentTurn === 'red' ? '🔴 Your turn' : '⚫ AI\'s turn';
  };

  // Count current pieces
  const redCount = countPieces(board, 'red');
  const blackCount = countPieces(board, 'black');

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .checker-cell:hover {
            filter: brightness(1.1);
          }
          .checker-piece:hover {
            transform: scale(1.08);
          }
        `}
      </style>

      <h1 style={headerStyle}>⛀ Checkers ⛂</h1>

      {/* AI Type Selection */}
      <div style={{ marginBottom: '0.8em' }}>
        <span style={{ marginRight: '0.8em', opacity: 0.8, fontSize: '0.95em' }}>AI Type:</span>
        <button
          style={{
            ...buttonStyle,
            padding: '0.5em 1em',
            fontSize: '0.9em',
            background: aiMode === 'minimax'
              ? 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)'
              : 'linear-gradient(90deg, #5d4037 0%, #4e342e 100%)',
            boxShadow: aiMode === 'minimax' ? '0 4px 12px rgba(155, 89, 182, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => { setAiMode('minimax'); resetGame(); }}
        >
          🧮 Minimax
        </button>
        <button
          style={{
            ...buttonStyle,
            padding: '0.5em 1em',
            fontSize: '0.9em',
            background: aiMode === 'reinforcement'
              ? 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)'
              : 'linear-gradient(90deg, #5d4037 0%, #4e342e 100%)',
            boxShadow: aiMode === 'reinforcement' ? '0 4px 12px rgba(231, 76, 60, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => { setAiMode('reinforcement'); resetGame(); }}
        >
          🤖 RL Agent
        </button>
        {aiMode === 'reinforcement' && rlModelInfo && (
          <span style={{
            marginLeft: '0.8em',
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
        <div style={{ marginBottom: '0.8em' }}>
          <span style={{ marginRight: '0.8em', opacity: 0.8, fontSize: '0.95em' }}>Difficulty:</span>
          {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              style={difficultyBtnStyle(difficulty === d)}
              onClick={() => { setDifficulty(d); resetGame(); }}
            >
              {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
            </button>
          ))}
        </div>
      )}

      {/* Score Display */}
      <div style={{ marginBottom: '0.8em', fontSize: '0.95em' }}>
        <span style={{ margin: '0 0.8em', padding: '0.4em 0.8em', background: 'rgba(231, 76, 60, 0.3)', borderRadius: 8 }}>
          🔴 You: {score.player}
        </span>
        <span style={{ margin: '0 0.8em', padding: '0.4em 0.8em', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8 }}>
          ⚫ AI: {score.ai}
        </span>
      </div>

      {/* Piece Count */}
      <div style={{ marginBottom: '1em', fontSize: '0.9em', opacity: 0.9 }}>
        <span style={{ marginRight: '1.5em' }}>
          🔴 {redCount.regular} + {redCount.kings}👑
        </span>
        <span>
          ⚫ {blackCount.regular} + {blackCount.kings}👑
        </span>
      </div>

      {/* Status Message */}
      <div style={{
        fontSize: '1.2em',
        marginBottom: '1em',
        padding: '0.5em 1em',
        borderRadius: 12,
        background: gameOver
          ? winner === 'red' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'
          : 'rgba(255, 255, 255, 0.1)',
        display: 'inline-block',
        animation: gameOver ? 'pulse 0.5s ease-in-out infinite' : 'none',
      }}>
        {getStatusMessage()}
      </div>

      {/* Game Board */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5em', flexWrap: 'wrap' }}>
        <div style={boardContainerStyle}>
          <div style={boardStyle}>
            {board.map((row, rowIndex) => (
              row.map((piece, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="checker-cell"
                  style={getCellStyle(rowIndex, colIndex)}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                >
                  {piece && (
                    <div 
                      className="checker-piece"
                      style={getPieceStyle(piece)}
                    >
                      {piece.type === 'king' ? '♔' : ''}
                    </div>
                  )}
                  {/* Valid move indicator */}
                  {validMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex) && !piece && (
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: validMoves.some(m => 
                        m.to.row === rowIndex && m.to.col === colIndex && m.captures.length > 0
                      ) ? 'rgba(231, 76, 60, 0.6)' : 'rgba(76, 175, 80, 0.6)',
                    }} />
                  )}
                </div>
              ))
            ))}
          </div>
        </div>

        {/* Move History */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
          padding: '1em',
          minWidth: 150,
          maxHeight: 400,
          overflowY: 'auto',
          textAlign: 'left',
        }}>
          <h3 style={{ margin: '0 0 0.5em 0', fontSize: '1em', opacity: 0.8 }}>📜 Move History</h3>
          {moveHistory.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: '0.9em' }}>No moves yet</p>
          ) : (
            <div style={{ fontSize: '0.85em' }}>
              {moveHistory.map((move, i) => (
                <div key={i} style={{ 
                  padding: '0.2em 0',
                  color: i % 2 === 0 ? '#ff6b6b' : '#888',
                }}>
                  {i + 1}. {move}
                </div>
              ))}
            </div>
          )}
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
          onClick={() => setScore({ player: 0, ai: 0 })}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🗑️ Reset Score
        </button>
      </div>

      {/* Rules */}
      <div style={{
        marginTop: '1.5em',
        padding: '1em',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        textAlign: 'left',
        maxWidth: 500,
        margin: '1.5em auto 0',
        fontSize: '0.9em',
      }}>
        <h3 style={{ margin: '0 0 0.5em 0', color: '#e74c3c' }}>📖 Rules</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.6, opacity: 0.9 }}>
          <li>Move diagonally forward on dark squares</li>
          <li><strong>Captures are mandatory</strong> - jump over opponent pieces</li>
          <li>Multi-jumps: keep capturing if possible</li>
          <li>Reach the opposite end to become a <strong>King 👑</strong></li>
          <li>Kings can move and capture backwards</li>
          <li>Win by capturing all opponent pieces or blocking their moves</li>
        </ul>
      </div>
    </div>
  );
};

export default CheckersGame;
