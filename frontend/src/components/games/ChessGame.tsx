import React, { useState, useCallback, useEffect, useMemo } from 'react';

// Types
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];
type Position = { row: number; col: number };
type Move = { from: Position; to: Position; promotion?: PieceType; capture?: Piece; castling?: 'kingside' | 'queenside'; enPassant?: boolean };
type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw';

// Piece values for evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Position bonus tables for better AI play
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const KING_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// Unicode chess pieces
const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
  black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
};

// Create initial board
const createInitialBoard = (): Board => {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Black pieces (top)
  board[0] = [
    { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' },
    { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' },
  ];
  board[1] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'black' as PieceColor }));
  
  // White pieces (bottom)
  board[6] = Array(8).fill(null).map(() => ({ type: 'pawn' as PieceType, color: 'white' as PieceColor }));
  board[7] = [
    { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' },
    { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' },
  ];
  
  return board;
};

// Clone board
const cloneBoard = (board: Board): Board => board.map(row => row.map(piece => piece ? { ...piece } : null));

// Find king position
const findKing = (board: Board, color: PieceColor): Position | null => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
};

// Check if position is on board
const isOnBoard = (row: number, col: number): boolean => row >= 0 && row < 8 && col >= 0 && col < 8;

// Check if square is attacked by opponent
const isSquareAttacked = (board: Board, pos: Position, byColor: PieceColor): boolean => {
  const { row, col } = pos;
  
  // Check pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir;
    const pc = col + dc;
    if (isOnBoard(pr, pc)) {
      const piece = board[pr][pc];
      if (piece?.type === 'pawn' && piece.color === byColor) return true;
    }
  }
  
  // Check knight attacks
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr;
    const nc = col + dc;
    if (isOnBoard(nr, nc)) {
      const piece = board[nr][nc];
      if (piece?.type === 'knight' && piece.color === byColor) return true;
    }
  }
  
  // Check king attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = row + dr;
      const kc = col + dc;
      if (isOnBoard(kr, kc)) {
        const piece = board[kr][kc];
        if (piece?.type === 'king' && piece.color === byColor) return true;
      }
    }
  }
  
  // Check sliding pieces (rook, bishop, queen)
  const directions = [
    { dr: -1, dc: 0, types: ['rook', 'queen'] },
    { dr: 1, dc: 0, types: ['rook', 'queen'] },
    { dr: 0, dc: -1, types: ['rook', 'queen'] },
    { dr: 0, dc: 1, types: ['rook', 'queen'] },
    { dr: -1, dc: -1, types: ['bishop', 'queen'] },
    { dr: -1, dc: 1, types: ['bishop', 'queen'] },
    { dr: 1, dc: -1, types: ['bishop', 'queen'] },
    { dr: 1, dc: 1, types: ['bishop', 'queen'] },
  ];
  
  for (const { dr, dc, types } of directions) {
    let r = row + dr;
    let c = col + dc;
    while (isOnBoard(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === byColor && types.includes(piece.type)) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }
  
  return false;
};

// Check if king is in check
const isInCheck = (board: Board, color: PieceColor): boolean => {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos, color === 'white' ? 'black' : 'white');
};

// Generate all legal moves for a piece
const generatePieceMoves = (
  board: Board,
  pos: Position,
  castlingRights: { white: { kingside: boolean; queenside: boolean }; black: { kingside: boolean; queenside: boolean } },
  enPassantTarget: Position | null,
  checkLegality = true
): Move[] => {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];
  
  const moves: Move[] = [];
  const { row, col } = pos;
  const color = piece.color;
  const enemy = color === 'white' ? 'black' : 'white';
  
  const addMove = (toRow: number, toCol: number, extra: Partial<Move> = {}) => {
    if (!isOnBoard(toRow, toCol)) return;
    const target = board[toRow][toCol];
    if (target && target.color === color) return;
    
    const move: Move = {
      from: pos,
      to: { row: toRow, col: toCol },
      capture: target || undefined,
      ...extra,
    };
    
    // Check for pawn promotion
    if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
      for (const promotion of ['queen', 'rook', 'bishop', 'knight'] as PieceType[]) {
        moves.push({ ...move, promotion });
      }
    } else {
      moves.push(move);
    }
  };
  
  switch (piece.type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      
      // Forward move
      if (!board[row + dir]?.[col]) {
        addMove(row + dir, col);
        // Double move from start
        if (row === startRow && !board[row + 2 * dir]?.[col]) {
          addMove(row + 2 * dir, col);
        }
      }
      
      // Captures
      for (const dc of [-1, 1]) {
        const nc = col + dc;
        if (isOnBoard(row + dir, nc)) {
          const target = board[row + dir][nc];
          if (target && target.color === enemy) {
            addMove(row + dir, nc);
          }
          // En passant
          if (enPassantTarget && enPassantTarget.row === row + dir && enPassantTarget.col === nc) {
            addMove(row + dir, nc, { enPassant: true, capture: board[row][nc] || undefined });
          }
        }
      }
      break;
    }
    
    case 'knight': {
      const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (const [dr, dc] of knightMoves) {
        addMove(row + dr, col + dc);
      }
      break;
    }
    
    case 'bishop': {
      for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
        let r = row + dr;
        let c = col + dc;
        while (isOnBoard(r, c)) {
          const target = board[r][c];
          addMove(r, c);
          if (target) break;
          r += dr;
          c += dc;
        }
      }
      break;
    }
    
    case 'rook': {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        let r = row + dr;
        let c = col + dc;
        while (isOnBoard(r, c)) {
          const target = board[r][c];
          addMove(r, c);
          if (target) break;
          r += dr;
          c += dc;
        }
      }
      break;
    }
    
    case 'queen': {
      for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
        let r = row + dr;
        let c = col + dc;
        while (isOnBoard(r, c)) {
          const target = board[r][c];
          addMove(r, c);
          if (target) break;
          r += dr;
          c += dc;
        }
      }
      break;
    }
    
    case 'king': {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          addMove(row + dr, col + dc);
        }
      }
      
      // Castling
      const rights = castlingRights[color];
      const kingRow = color === 'white' ? 7 : 0;
      
      if (row === kingRow && col === 4 && !isInCheck(board, color)) {
        // Kingside castling
        if (rights.kingside && !board[kingRow][5] && !board[kingRow][6]) {
          if (!isSquareAttacked(board, { row: kingRow, col: 5 }, enemy) &&
              !isSquareAttacked(board, { row: kingRow, col: 6 }, enemy)) {
            moves.push({
              from: pos,
              to: { row: kingRow, col: 6 },
              castling: 'kingside',
            });
          }
        }
        // Queenside castling
        if (rights.queenside && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3]) {
          if (!isSquareAttacked(board, { row: kingRow, col: 2 }, enemy) &&
              !isSquareAttacked(board, { row: kingRow, col: 3 }, enemy)) {
            moves.push({
              from: pos,
              to: { row: kingRow, col: 2 },
              castling: 'queenside',
            });
          }
        }
      }
      break;
    }
  }
  
  // Filter out moves that leave king in check
  if (checkLegality) {
    return moves.filter(move => {
      const newBoard = makeMove(board, move);
      return !isInCheck(newBoard, color);
    });
  }
  
  return moves;
};

// Generate all legal moves for a color
const generateAllMoves = (
  board: Board,
  color: PieceColor,
  castlingRights: { white: { kingside: boolean; queenside: boolean }; black: { kingside: boolean; queenside: boolean } },
  enPassantTarget: Position | null
): Move[] => {
  const moves: Move[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece?.color === color) {
        moves.push(...generatePieceMoves(board, { row, col }, castlingRights, enPassantTarget));
      }
    }
  }
  return moves;
};

// Make a move on the board
const makeMove = (board: Board, move: Move): Board => {
  const newBoard = cloneBoard(board);
  const piece = newBoard[move.from.row][move.from.col];
  
  if (!piece) return newBoard;
  
  // Handle en passant capture
  if (move.enPassant) {
    newBoard[move.from.row][move.to.col] = null;
  }
  
  // Handle castling
  if (move.castling) {
    const row = move.from.row;
    if (move.castling === 'kingside') {
      newBoard[row][5] = newBoard[row][7];
      newBoard[row][7] = null;
    } else {
      newBoard[row][3] = newBoard[row][0];
      newBoard[row][0] = null;
    }
  }
  
  // Move piece
  newBoard[move.to.row][move.to.col] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  newBoard[move.from.row][move.from.col] = null;
  
  return newBoard;
};

// Evaluate board position
const evaluateBoard = (board: Board): number => {
  let score = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      
      const sign = piece.color === 'white' ? 1 : -1;
      let value = PIECE_VALUES[piece.type];
      
      // Add position bonus
      const tableRow = piece.color === 'white' ? row : 7 - row;
      switch (piece.type) {
        case 'pawn':
          value += PAWN_TABLE[tableRow][col];
          break;
        case 'knight':
          value += KNIGHT_TABLE[tableRow][col];
          break;
        case 'bishop':
          value += BISHOP_TABLE[tableRow][col];
          break;
        case 'king':
          value += KING_TABLE[tableRow][col];
          break;
      }
      
      score += sign * value;
    }
  }
  
  return score;
};

// Minimax with alpha-beta pruning
const minimax = (
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  castlingRights: { white: { kingside: boolean; queenside: boolean }; black: { kingside: boolean; queenside: boolean } },
  enPassantTarget: Position | null
): { score: number; move: Move | null } => {
  const color = isMaximizing ? 'white' : 'black';
  const moves = generateAllMoves(board, color, castlingRights, enPassantTarget);
  
  // Check for game end
  if (moves.length === 0) {
    if (isInCheck(board, color)) {
      return { score: isMaximizing ? -100000 - depth : 100000 + depth, move: null };
    }
    return { score: 0, move: null }; // Stalemate
  }
  
  if (depth === 0) {
    return { score: evaluateBoard(board), move: null };
  }
  
  // Sort moves for better pruning (captures first)
  moves.sort((a, b) => {
    const aCapture = a.capture ? PIECE_VALUES[a.capture.type] : 0;
    const bCapture = b.capture ? PIECE_VALUES[b.capture.type] : 0;
    return bCapture - aCapture;
  });
  
  let bestMove: Move | null = moves[0];
  
  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move);
      const { score } = minimax(newBoard, depth - 1, alpha, beta, false, castlingRights, null);
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
      const newBoard = makeMove(board, move);
      const { score } = minimax(newBoard, depth - 1, alpha, beta, true, castlingRights, null);
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

// Get AI move
const getAIMove = (
  board: Board,
  difficulty: Difficulty,
  castlingRights: { white: { kingside: boolean; queenside: boolean }; black: { kingside: boolean; queenside: boolean } },
  enPassantTarget: Position | null
): Move | null => {
  const moves = generateAllMoves(board, 'black', castlingRights, enPassantTarget);
  if (moves.length === 0) return null;
  
  switch (difficulty) {
    case 'easy': {
      // Random move with slight preference for captures
      const captures = moves.filter(m => m.capture);
      if (captures.length > 0 && Math.random() < 0.3) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }
    case 'medium': {
      // Mix of random and calculated
      if (Math.random() < 0.4) {
        return moves[Math.floor(Math.random() * moves.length)];
      }
      const { move } = minimax(board, 2, -Infinity, Infinity, false, castlingRights, enPassantTarget);
      return move;
    }
    case 'hard': {
      const { move } = minimax(board, 3, -Infinity, Infinity, false, castlingRights, enPassantTarget);
      return move;
    }
  }
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '1.5em',
  maxWidth: 900,
  margin: '1.5em auto',
  background: 'linear-gradient(135deg, #2c1810 0%, #1a0f0a 100%)',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  color: '#fff',
  textAlign: 'center',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: '2.2em',
  marginBottom: '0.3em',
  background: 'linear-gradient(90deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
};

const boardContainerStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: 12,
  background: 'linear-gradient(135deg, #8b4513 0%, #654321 100%)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: 0,
  border: '3px solid #4a3728',
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #d4af37 0%, #b8960c 100%)',
  color: '#1a0f0a',
  border: 'none',
  borderRadius: 10,
  padding: '0.7em 1.3em',
  fontWeight: 700,
  fontSize: '0.95em',
  cursor: 'pointer',
  margin: '0.3em',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
};

const difficultyBtnStyle = (isActive: boolean): React.CSSProperties => ({
  ...buttonStyle,
  background: isActive
    ? 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)'
    : 'linear-gradient(90deg, #5d4e37 0%, #4a3f2f 100%)',
  color: isActive ? '#fff' : '#ccc',
  boxShadow: isActive ? '0 4px 12px rgba(46, 204, 113, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
});

const ChessGame: React.FC = () => {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [score, setScore] = useState({ player: 0, ai: 0, draws: 0 });
  const [isThinking, setIsThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotionPending, setPromotionPending] = useState<{ move: Move; options: PieceType[] } | null>(null);
  const [castlingRights, setCastlingRights] = useState({
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true },
  });
  const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null);
  const [capturedPieces, setCapturedPieces] = useState<{ white: Piece[]; black: Piece[] }>({ white: [], black: [] });

  // Check game status
  const checkGameStatus = useCallback((board: Board, color: PieceColor): GameStatus => {
    const moves = generateAllMoves(board, color, castlingRights, enPassantTarget);
    const inCheck = isInCheck(board, color);
    
    if (moves.length === 0) {
      return inCheck ? 'checkmate' : 'stalemate';
    }
    return inCheck ? 'check' : 'playing';
  }, [castlingRights, enPassantTarget]);

  // Get algebraic notation for move
  const getMoveNotation = (move: Move, piece: Piece): string => {
    if (!piece) return '';
    
    if (move.castling === 'kingside') return 'O-O';
    if (move.castling === 'queenside') return 'O-O-O';
    
    const files = 'abcdefgh';
    const ranks = '87654321';
    let notation = '';
    
    if (piece.type !== 'pawn') {
      notation += piece.type === 'knight' ? 'N' : piece.type.charAt(0).toUpperCase();
    }
    
    if (move.capture || move.enPassant) {
      if (piece.type === 'pawn') {
        notation += files[move.from.col];
      }
      notation += 'x';
    }
    
    notation += files[move.to.col] + ranks[move.to.row];
    
    if (move.promotion) {
      notation += '=' + (move.promotion === 'knight' ? 'N' : move.promotion.charAt(0).toUpperCase());
    }
    
    return notation;
  };

  // Execute move
  const executeMove = useCallback((move: Move) => {
    const piece = board[move.from.row][move.from.col];
    if (!piece) return;
    
    // Update captured pieces
    if (move.capture) {
      setCapturedPieces(prev => ({
        ...prev,
        [piece.color]: [...prev[piece.color], move.capture!],
      }));
    }
    
    // Update castling rights
    const newCastlingRights = { ...castlingRights };
    if (piece.type === 'king') {
      newCastlingRights[piece.color] = { kingside: false, queenside: false };
    }
    if (piece.type === 'rook') {
      if (move.from.col === 0) newCastlingRights[piece.color].queenside = false;
      if (move.from.col === 7) newCastlingRights[piece.color].kingside = false;
    }
    // If a rook is captured
    if (move.capture?.type === 'rook') {
      const capturedColor = move.capture.color;
      if (move.to.col === 0) newCastlingRights[capturedColor].queenside = false;
      if (move.to.col === 7) newCastlingRights[capturedColor].kingside = false;
    }
    setCastlingRights(newCastlingRights);
    
    // Update en passant target
    if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      setEnPassantTarget({ row: (move.from.row + move.to.row) / 2, col: move.from.col });
    } else {
      setEnPassantTarget(null);
    }
    
    const newBoard = makeMove(board, move);
    setBoard(newBoard);
    setLastMove(move);
    setMoveHistory(prev => [...prev, getMoveNotation(move, piece)]);
    
    const nextColor = piece.color === 'white' ? 'black' : 'white';
    setCurrentTurn(nextColor);
    
    const status = checkGameStatus(newBoard, nextColor);
    setGameStatus(status);
    
    if (status === 'checkmate') {
      if (nextColor === 'black') {
        setScore(prev => ({ ...prev, player: prev.player + 1 }));
      } else {
        setScore(prev => ({ ...prev, ai: prev.ai + 1 }));
      }
    } else if (status === 'stalemate') {
      setScore(prev => ({ ...prev, draws: prev.draws + 1 }));
    }
    
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [board, castlingRights, checkGameStatus]);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (currentTurn !== 'white' || gameStatus === 'checkmate' || gameStatus === 'stalemate' || isThinking || promotionPending) {
      return;
    }
    
    const clickedPiece = board[row][col];
    
    // Check if clicking on a legal move destination
    const moveToExecute = legalMoves.find(m => m.to.row === row && m.to.col === col);
    if (moveToExecute) {
      // Check if this is a pawn promotion
      if (moveToExecute.promotion) {
        const promotionMoves = legalMoves.filter(m => m.to.row === row && m.to.col === col);
        setPromotionPending({
          move: moveToExecute,
          options: promotionMoves.map(m => m.promotion!),
        });
        return;
      }
      executeMove(moveToExecute);
      return;
    }
    
    // Select a piece
    if (clickedPiece?.color === 'white') {
      setSelectedSquare({ row, col });
      const moves = generatePieceMoves(board, { row, col }, castlingRights, enPassantTarget);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [board, currentTurn, gameStatus, isThinking, legalMoves, castlingRights, enPassantTarget, executeMove, promotionPending]);

  // Handle promotion selection
  const handlePromotion = (pieceType: PieceType) => {
    if (!promotionPending) return;
    const move = { ...promotionPending.move, promotion: pieceType };
    setPromotionPending(null);
    executeMove(move);
  };

  // AI move
  useEffect(() => {
    if (currentTurn !== 'black' || gameStatus === 'checkmate' || gameStatus === 'stalemate') return;
    
    setIsThinking(true);
    
    const timer = setTimeout(() => {
      const aiMove = getAIMove(board, difficulty, castlingRights, enPassantTarget);
      if (aiMove) {
        executeMove(aiMove);
      }
      setIsThinking(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [currentTurn, board, gameStatus, difficulty, castlingRights, enPassantTarget, executeMove]);

  // Reset game
  const resetGame = useCallback(() => {
    setBoard(createInitialBoard());
    setSelectedSquare(null);
    setLegalMoves([]);
    setCurrentTurn('white');
    setGameStatus('playing');
    setIsThinking(false);
    setMoveHistory([]);
    setLastMove(null);
    setPromotionPending(null);
    setCastlingRights({
      white: { kingside: true, queenside: true },
      black: { kingside: true, queenside: true },
    });
    setEnPassantTarget(null);
    setCapturedPieces({ white: [], black: [] });
  }, []);

  // Get status message
  const getStatusMessage = (): string => {
    if (gameStatus === 'checkmate') {
      return currentTurn === 'black' ? '🎉 Checkmate! You Win!' : '🤖 Checkmate! AI Wins!';
    }
    if (gameStatus === 'stalemate') return '🤝 Stalemate - Draw!';
    if (isThinking) return '🤔 AI is thinking...';
    if (gameStatus === 'check') return '⚠️ Check! Protect your King!';
    return currentTurn === 'white' ? '♔ Your turn (White)' : '♚ AI\'s turn (Black)';
  };

  // Calculate cell colors
  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const isLight = (row + col) % 2 === 0;
    const isSelected = selectedSquare?.row === row && selectedSquare?.col === col;
    const isLastMoveFrom = lastMove?.from.row === row && lastMove?.from.col === col;
    const isLastMoveTo = lastMove?.to.row === row && lastMove?.to.col === col;
    
    let background = isLight ? '#f0d9b5' : '#b58863';
    
    if (isSelected) {
      background = '#7fc97f';
    } else if (isLastMoveFrom || isLastMoveTo) {
      background = isLight ? '#cdd26a' : '#aaa23a';
    }
    
    return {
      width: 55,
      height: 55,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background,
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.15s',
    };
  };

  // Memoize captured pieces display
  const capturedDisplay = useMemo(() => ({
    white: capturedPieces.white.map(p => p ? PIECE_SYMBOLS.black[p.type] : '').join(' '),
    black: capturedPieces.black.map(p => p ? PIECE_SYMBOLS.white[p.type] : '').join(' '),
  }), [capturedPieces]);

  return (
    <div style={containerStyle}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          .chess-square:hover {
            filter: brightness(1.1);
          }
        `}
      </style>

      <h1 style={headerStyle}>♚ Chess ♔</h1>

      {/* Difficulty Selection */}
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

      {/* Score Display */}
      <div style={{ marginBottom: '0.8em', fontSize: '0.95em' }}>
        <span style={{ margin: '0 1em', padding: '0.4em 0.8em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 }}>
          ♔ You: {score.player}
        </span>
        <span style={{ margin: '0 1em', padding: '0.4em 0.8em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 }}>
          🤝 Draws: {score.draws}
        </span>
        <span style={{ margin: '0 1em', padding: '0.4em 0.8em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8 }}>
          ♚ AI: {score.ai}
        </span>
      </div>

      {/* Status Message */}
      <div style={{
        fontSize: '1.2em',
        marginBottom: '0.8em',
        padding: '0.4em 1em',
        borderRadius: 10,
        background: gameStatus === 'checkmate'
          ? (currentTurn === 'black' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)')
          : gameStatus === 'check' ? 'rgba(241, 196, 15, 0.2)'
          : 'rgba(52, 152, 219, 0.2)',
        display: 'inline-block',
      }}>
        {getStatusMessage()}
      </div>

      {/* Captured Pieces */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2em', marginBottom: '0.5em', fontSize: '1.2em' }}>
        <div style={{ opacity: 0.9 }}>
          <span style={{ fontSize: '0.7em', opacity: 0.7 }}>AI captured: </span>
          {capturedDisplay.black || '-'}
        </div>
        <div style={{ opacity: 0.9 }}>
          <span style={{ fontSize: '0.7em', opacity: 0.7 }}>You captured: </span>
          {capturedDisplay.white || '-'}
        </div>
      </div>

      {/* Chess Board */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1em' }}>
        <div style={boardContainerStyle}>
          {/* Column labels */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 4 }}>
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => (
              <span key={f} style={{ width: 55, textAlign: 'center', fontSize: '0.8em', opacity: 0.7 }}>{f}</span>
            ))}
          </div>
          
          <div style={{ display: 'flex' }}>
            {/* Row labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginRight: 4 }}>
              {[8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                <span key={r} style={{ height: 55, display: 'flex', alignItems: 'center', fontSize: '0.8em', opacity: 0.7 }}>{r}</span>
              ))}
            </div>
            
            <div style={boardStyle}>
              {board.map((row, rowIndex) => (
                row.map((piece, colIndex) => {
                  const isLegalMove = legalMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex);
                  const isCapture = legalMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex && (m.capture || m.enPassant));
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="chess-square"
                      style={getCellStyle(rowIndex, colIndex)}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                    >
                      {/* Legal move indicator */}
                      {isLegalMove && !piece && (
                        <div style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.2)',
                          position: 'absolute',
                        }} />
                      )}
                      {/* Capture indicator */}
                      {isCapture && (
                        <div style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          border: '4px solid rgba(231, 76, 60, 0.6)',
                          borderRadius: '50%',
                          boxSizing: 'border-box',
                        }} />
                      )}
                      {/* Piece */}
                      {piece && (
                        <span style={{
                          fontSize: '2.5em',
                          cursor: piece.color === 'white' && currentTurn === 'white' ? 'grab' : 'default',
                          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
                          userSelect: 'none',
                        }}>
                          {PIECE_SYMBOLS[piece.color][piece.type]}
                        </span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>

        {/* Move History */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: '0.8em',
          width: 140,
          maxHeight: 480,
          overflow: 'auto',
        }}>
          <h4 style={{ margin: '0 0 0.5em 0', fontSize: '0.9em', opacity: 0.8 }}>Move History</h4>
          <div style={{ fontSize: '0.85em', textAlign: 'left' }}>
            {moveHistory.length === 0 ? (
              <span style={{ opacity: 0.5 }}>No moves yet</span>
            ) : (
              moveHistory.map((move, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  {Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '..'} {move}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Promotion Dialog */}
      {promotionPending && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c1810 0%, #1a0f0a 100%)',
            padding: '1.5em',
            borderRadius: 16,
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 1em 0' }}>Choose Promotion</h3>
            <div style={{ display: 'flex', gap: '0.5em' }}>
              {(['queen', 'rook', 'bishop', 'knight'] as PieceType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  style={{
                    ...buttonStyle,
                    fontSize: '2em',
                    padding: '0.3em 0.5em',
                  }}
                >
                  {PIECE_SYMBOLS.white[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div style={{ marginTop: '1em' }}>
        <button style={buttonStyle} onClick={resetGame}>
          🔄 New Game
        </button>
        <button
          style={{ ...buttonStyle, background: 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)', color: '#fff' }}
          onClick={() => setScore({ player: 0, ai: 0, draws: 0 })}
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
        maxWidth: 550,
        margin: '1.5em auto 0',
        fontSize: '0.9em',
      }}>
        <h4 style={{ margin: '0 0 0.5em 0', color: '#d4af37' }}>📖 How to Play</h4>
        <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.6, opacity: 0.85 }}>
          <li>You play as <strong>White</strong> (bottom). Click a piece, then click where to move.</li>
          <li>Green dots show legal moves. Red circles indicate captures.</li>
          <li>Includes all rules: castling, en passant, and pawn promotion.</li>
          <li>Put the AI King in <strong>checkmate</strong> to win!</li>
        </ul>
      </div>
    </div>
  );
};

export default ChessGame;
