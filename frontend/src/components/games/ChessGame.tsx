import React, { useState, useCallback, useEffect, useRef } from 'react';
import { recordGame } from '../../services/gameStatsService';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || "";

// Types
type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];
type Position = { row: number; col: number };
type Move = {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  promotion?: PieceType;
  castling?: 'kingside' | 'queenside';
  enPassant?: boolean;
};
type Difficulty = 'easy' | 'medium' | 'hard';
type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';
type AIMode = 'minimax' | 'reinforcement';

// Piece values for AI evaluation
const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Position tables for better AI play
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

const KING_TABLE_MIDDLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

// Chess piece symbols
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
const cloneBoard = (board: Board): Board =>
  board.map(row => row.map(piece => piece ? { ...piece } : null));

// Find king position
const findKing = (board: Board, color: PieceColor): Position | null => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
};

// Check if position is on board
const isValidPos = (row: number, col: number): boolean =>
  row >= 0 && row < 8 && col >= 0 && col < 8;

// Check if square is attacked by opponent
const isSquareAttacked = (board: Board, row: number, col: number, byColor: PieceColor): boolean => {
  // Check pawn attacks
  const pawnDir = byColor === 'white' ? 1 : -1;
  for (const dc of [-1, 1]) {
    const pr = row + pawnDir;
    const pc = col + dc;
    if (isValidPos(pr, pc)) {
      const p = board[pr][pc];
      if (p && p.type === 'pawn' && p.color === byColor) return true;
    }
  }

  // Check knight attacks
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  for (const [dr, dc] of knightMoves) {
    const nr = row + dr;
    const nc = col + dc;
    if (isValidPos(nr, nc)) {
      const p = board[nr][nc];
      if (p && p.type === 'knight' && p.color === byColor) return true;
    }
  }

  // Check king attacks
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const kr = row + dr;
      const kc = col + dc;
      if (isValidPos(kr, kc)) {
        const p = board[kr][kc];
        if (p && p.type === 'king' && p.color === byColor) return true;
      }
    }
  }

  // Check sliding pieces (rook, bishop, queen)
  const directions = [
    { dr: 0, dc: 1, pieces: ['rook', 'queen'] },
    { dr: 0, dc: -1, pieces: ['rook', 'queen'] },
    { dr: 1, dc: 0, pieces: ['rook', 'queen'] },
    { dr: -1, dc: 0, pieces: ['rook', 'queen'] },
    { dr: 1, dc: 1, pieces: ['bishop', 'queen'] },
    { dr: 1, dc: -1, pieces: ['bishop', 'queen'] },
    { dr: -1, dc: 1, pieces: ['bishop', 'queen'] },
    { dr: -1, dc: -1, pieces: ['bishop', 'queen'] },
  ];

  for (const { dr, dc, pieces } of directions) {
    let r = row + dr;
    let c = col + dc;
    while (isValidPos(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && pieces.includes(p.type)) return true;
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
  const opponent = color === 'white' ? 'black' : 'white';
  return isSquareAttacked(board, kingPos.row, kingPos.col, opponent);
};

// Generate all pseudo-legal moves for a piece
const getPieceMoves = (
  board: Board,
  row: number,
  col: number,
  castlingRights: { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } },
  enPassantTarget: Position | null
): Move[] => {
  const piece = board[row][col];
  if (!piece) return [];

  const moves: Move[] = [];
  const color = piece.color;
  const opponent = color === 'white' ? 'black' : 'white';

  const addMove = (toRow: number, toCol: number, promotion?: PieceType) => {
    if (!isValidPos(toRow, toCol)) return;
    const target = board[toRow][toCol];
    if (target && target.color === color) return;

    moves.push({
      from: { row, col },
      to: { row: toRow, col: toCol },
      piece,
      captured: target || undefined,
      promotion,
    });
  };

  switch (piece.type) {
    case 'pawn': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      const promoRow = color === 'white' ? 0 : 7;

      // Forward move
      if (!board[row + dir]?.[col]) {
        if (row + dir === promoRow) {
          for (const promo of ['queen', 'rook', 'bishop', 'knight'] as PieceType[]) {
            addMove(row + dir, col, promo);
          }
        } else {
          addMove(row + dir, col);
        }

        // Double move from start
        if (row === startRow && !board[row + 2 * dir]?.[col]) {
          addMove(row + 2 * dir, col);
        }
      }

      // Captures
      for (const dc of [-1, 1]) {
        const newCol = col + dc;
        if (isValidPos(row + dir, newCol)) {
          const target = board[row + dir][newCol];
          if (target && target.color === opponent) {
            if (row + dir === promoRow) {
              for (const promo of ['queen', 'rook', 'bishop', 'knight'] as PieceType[]) {
                moves.push({
                  from: { row, col },
                  to: { row: row + dir, col: newCol },
                  piece,
                  captured: target,
                  promotion: promo,
                });
              }
            } else {
              moves.push({
                from: { row, col },
                to: { row: row + dir, col: newCol },
                piece,
                captured: target,
              });
            }
          }

          // En passant
          if (enPassantTarget && enPassantTarget.row === row + dir && enPassantTarget.col === newCol) {
            moves.push({
              from: { row, col },
              to: { row: row + dir, col: newCol },
              piece,
              captured: board[row][newCol] || undefined,
              enPassant: true,
            });
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
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let r = row + dr;
        let c = col + dc;
        while (isValidPos(r, c)) {
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
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        let r = row + dr;
        let c = col + dc;
        while (isValidPos(r, c)) {
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
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        let r = row + dr;
        let c = col + dc;
        while (isValidPos(r, c)) {
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
        // Kingside
        if (rights.king && !board[kingRow][5] && !board[kingRow][6]) {
          const rook = board[kingRow][7];
          if (rook && rook.type === 'rook' && rook.color === color) {
            if (!isSquareAttacked(board, kingRow, 5, opponent) &&
                !isSquareAttacked(board, kingRow, 6, opponent)) {
              moves.push({
                from: { row, col },
                to: { row: kingRow, col: 6 },
                piece,
                castling: 'kingside',
              });
            }
          }
        }

        // Queenside
        if (rights.queen && !board[kingRow][1] && !board[kingRow][2] && !board[kingRow][3]) {
          const rook = board[kingRow][0];
          if (rook && rook.type === 'rook' && rook.color === color) {
            if (!isSquareAttacked(board, kingRow, 2, opponent) &&
                !isSquareAttacked(board, kingRow, 3, opponent)) {
              moves.push({
                from: { row, col },
                to: { row: kingRow, col: 2 },
                piece,
                castling: 'queenside',
              });
            }
          }
        }
      }
      break;
    }
  }

  return moves;
};

// Get all legal moves for a color
const getAllLegalMoves = (
  board: Board,
  color: PieceColor,
  castlingRights: { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } },
  enPassantTarget: Position | null
): Move[] => {
  const allMoves: Move[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getPieceMoves(board, row, col, castlingRights, enPassantTarget);
        for (const move of moves) {
          // Check if move is legal (doesn't leave king in check)
          const newBoard = applyMove(board, move);
          if (!isInCheck(newBoard, color)) {
            allMoves.push(move);
          }
        }
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

  // Clear source
  newBoard[move.from.row][move.from.col] = null;

  // Handle promotion
  if (move.promotion) {
    newBoard[move.to.row][move.to.col] = { type: move.promotion, color: piece.color };
  } else {
    newBoard[move.to.row][move.to.col] = piece;
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

  // Handle en passant capture
  if (move.enPassant) {
    newBoard[move.from.row][move.to.col] = null;
  }

  return newBoard;
};

// Evaluate board for AI
const evaluateBoard = (board: Board): number => {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      let value = PIECE_VALUES[piece.type];

      // Position bonus
      const r = piece.color === 'white' ? row : 7 - row;
      const c = col;

      switch (piece.type) {
        case 'pawn':
          value += PAWN_TABLE[r][c];
          break;
        case 'knight':
          value += KNIGHT_TABLE[r][c];
          break;
        case 'bishop':
          value += BISHOP_TABLE[r][c];
          break;
        case 'king':
          value += KING_TABLE_MIDDLE[r][c];
          break;
      }

      score += piece.color === 'black' ? value : -value;
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
  castlingRights: { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } },
  enPassantTarget: Position | null
): { score: number; move: Move | null } => {
  const color = isMaximizing ? 'black' : 'white';
  const moves = getAllLegalMoves(board, color, castlingRights, enPassantTarget);

  if (moves.length === 0) {
    if (isInCheck(board, color)) {
      return { score: isMaximizing ? -100000 : 100000, move: null };
    }
    return { score: 0, move: null }; // Stalemate
  }

  if (depth === 0) {
    return { score: evaluateBoard(board), move: null };
  }

  let bestMove: Move | null = null;

  if (isMaximizing) {
    let maxScore = -Infinity;

    for (const move of moves) {
      const newBoard = applyMove(board, move);
      const newCastling = updateCastlingRights(castlingRights, move);
      const newEnPassant = getEnPassantTarget(move);

      const { score } = minimax(newBoard, depth - 1, alpha, beta, false, newCastling, newEnPassant);

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
      const newCastling = updateCastlingRights(castlingRights, move);
      const newEnPassant = getEnPassantTarget(move);

      const { score } = minimax(newBoard, depth - 1, alpha, beta, true, newCastling, newEnPassant);

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

// Update castling rights after a move
const updateCastlingRights = (
  rights: { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } },
  move: Move
): { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } } => {
  const newRights = {
    white: { ...rights.white },
    black: { ...rights.black },
  };

  if (move.piece?.type === 'king') {
    if (move.piece.color === 'white') {
      newRights.white = { king: false, queen: false };
    } else {
      newRights.black = { king: false, queen: false };
    }
  }

  if (move.piece?.type === 'rook') {
    if (move.from.row === 7 && move.from.col === 0) newRights.white.queen = false;
    if (move.from.row === 7 && move.from.col === 7) newRights.white.king = false;
    if (move.from.row === 0 && move.from.col === 0) newRights.black.queen = false;
    if (move.from.row === 0 && move.from.col === 7) newRights.black.king = false;
  }

  return newRights;
};

// Get en passant target after a move
const getEnPassantTarget = (move: Move): Position | null => {
  if (move.piece?.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
    return { row: (move.from.row + move.to.row) / 2, col: move.from.col };
  }
  return null;
};

// Get AI move
const getAIMove = (
  board: Board,
  difficulty: Difficulty,
  castlingRights: { white: { king: boolean; queen: boolean }; black: { king: boolean; queen: boolean } },
  enPassantTarget: Position | null
): Move | null => {
  const moves = getAllLegalMoves(board, 'black', castlingRights, enPassantTarget);
  if (moves.length === 0) return null;

  switch (difficulty) {
    case 'easy':
      return moves[Math.floor(Math.random() * moves.length)];

    case 'medium':
      if (Math.random() < 0.5) {
        const { move } = minimax(board, 2, -Infinity, Infinity, true, castlingRights, enPassantTarget);
        return move;
      }
      return moves[Math.floor(Math.random() * moves.length)];

    case 'hard':
      const { move } = minimax(board, 3, -Infinity, Infinity, true, castlingRights, enPassantTarget);
      return move;

    default:
      return moves[0];
  }
};

// Styles
const containerStyle: React.CSSProperties = {
  padding: '1.5em',
  maxWidth: 900,
  margin: '1.5em auto',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  color: '#fff',
  textAlign: 'center',
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

const headerStyle: React.CSSProperties = {
  fontSize: '2.2em',
  marginBottom: '0.2em',
  background: 'linear-gradient(90deg, #f0d9b5 0%, #b58863 50%, #f0d9b5 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  fontWeight: 800,
};

const boardContainerStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#5d4037',
  padding: 10,
  borderRadius: 8,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
};

const boardStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 1fr)',
  gap: 0,
  border: '2px solid #3e2723',
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #b58863 0%, #8b5a2b 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '0.6em 1.2em',
  fontWeight: 700,
  fontSize: '0.95em',
  cursor: 'pointer',
  margin: '0.3em',
  transition: 'all 0.2s ease',
  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.3)',
};

const difficultyBtnStyle = (isActive: boolean): React.CSSProperties => ({
  ...buttonStyle,
  padding: '0.4em 0.9em',
  fontSize: '0.85em',
  background: isActive
    ? 'linear-gradient(90deg, #27ae60 0%, #2ecc71 100%)'
    : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
  boxShadow: isActive ? '0 3px 10px rgba(46, 204, 113, 0.4)' : '0 2px 6px rgba(0, 0, 0, 0.2)',
});

const ChessGame: React.FC = () => {
  const [board, setBoard] = useState<Board>(createInitialBoard());
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('white');
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [aiMode, setAiMode] = useState<AIMode>('minimax');
  const [rlModelInfo, setRlModelInfo] = useState<{ loaded: boolean; fallback: boolean } | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [score, setScore] = useState({ player: 0, ai: 0, draws: 0 });
  const [isThinking, setIsThinking] = useState(false);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [castlingRights, setCastlingRights] = useState({
    white: { king: true, queen: true },
    black: { king: true, queen: true },
  });
  const [enPassantTarget, setEnPassantTarget] = useState<Position | null>(null);
  const [showPromotion, setShowPromotion] = useState<{ move: Move; options: PieceType[] } | null>(null);

  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);

  // Fetch RL status when switching to RL mode
  useEffect(() => {
    if (aiMode === 'reinforcement') {
      fetch(`${API_BASE_URL}/api/rl/chess/status`)
        .then(res => res.json())
        .then(data => setRlModelInfo({ loaded: data.model_trained, fallback: false }))
        .catch(() => setRlModelInfo({ loaded: false, fallback: true }));
    }
  }, [aiMode]);

  // Convert board to API format
  const boardToApiFormat = (b: Board): number[][] => {
    const pieceToNum = (p: Piece): number => {
      if (!p) return 0;
      const typeMap: Record<PieceType, number> = {
        pawn: 1, knight: 2, bishop: 3, rook: 4, queen: 5, king: 6
      };
      return p.color === 'white' ? typeMap[p.type] : typeMap[p.type] + 6;
    };
    return b.map(row => row.map(pieceToNum));
  };

  // Get RL move from API
  const getRLMove = async (currentBoard: Board): Promise<{ move: Move | null; usedModel: boolean }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rl/chess/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: boardToApiFormat(currentBoard) }),
      });
      
      if (!response.ok) throw new Error('RL API error');
      
      const data = await response.json();
      
      // Check if valid move was returned
      if (data.from_row === 0 && data.from_col === 0 && data.to_row === 0 && data.to_col === 0) {
        return { move: null, usedModel: false };
      }
      
      const piece = currentBoard[data.from_row][data.from_col];
      const captured = currentBoard[data.to_row][data.to_col];
      
      const move: Move = {
        from: { row: data.from_row, col: data.from_col },
        to: { row: data.to_row, col: data.to_col },
        piece: piece,
        captured: captured || undefined
      };
      
      return { move, usedModel: data.is_rl_model };
    } catch (error) {
      console.error('RL API failed, falling back to minimax:', error);
      const move = getAIMove(currentBoard, difficulty, castlingRights, enPassantTarget);
      return { move, usedModel: false };
    }
  };

  // Record game stats when game ends
  useEffect(() => {
    if ((gameStatus === 'checkmate' || gameStatus === 'stalemate') && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      let result: 'win' | 'loss' | 'draw';
      if (gameStatus === 'stalemate') {
        result = 'draw';
      } else if (currentTurn === 'black') {
        // If it's black's turn and checkmate, white (player) won
        result = 'win';
      } else {
        result = 'loss';
      }

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      recordGame({
        gameType: 'chess',
        result,
        movesCount: moveHistory.length,
        durationSeconds,
        opponentType: 'ai',
        aiDifficulty: aiMode === 'reinforcement' ? 'rl' : difficulty,
        metadata: {
          aiMode,
          gameStatus,
        },
      }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameStatus, currentTurn, moveHistory.length, difficulty, aiMode]);

  // Reset game
  const resetGame = useCallback(() => {
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    setBoard(createInitialBoard());
    setCurrentTurn('white');
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameStatus('playing');
    setIsThinking(false);
    setLastMove(null);
    setMoveHistory([]);
    setCastlingRights({ white: { king: true, queen: true }, black: { king: true, queen: true } });
    setEnPassantTarget(null);
    setShowPromotion(null);
  }, []);

  // Get move notation
  const getMoveNotation = (move: Move): string => {
    const files = 'abcdefgh';
    const ranks = '87654321';

    if (move.castling === 'kingside') return 'O-O';
    if (move.castling === 'queenside') return 'O-O-O';

    let notation = '';
    if (move.piece?.type !== 'pawn') {
      notation += PIECE_SYMBOLS.white[move.piece!.type];
    }
    notation += files[move.from.col] + ranks[move.from.row];
    notation += move.captured ? 'x' : '-';
    notation += files[move.to.col] + ranks[move.to.row];
    if (move.promotion) notation += '=' + PIECE_SYMBOLS.white[move.promotion];

    return notation;
  };

  // Execute a move
  const executeMove = useCallback((move: Move) => {
    const newBoard = applyMove(board, move);
    setBoard(newBoard);
    setLastMove(move);
    setMoveHistory(prev => [...prev, getMoveNotation(move)]);

    // Update castling rights
    setCastlingRights(prev => updateCastlingRights(prev, move));

    // Update en passant target
    setEnPassantTarget(getEnPassantTarget(move));

    // Check game status
    const opponent = currentTurn === 'white' ? 'black' : 'white';
    const opponentMoves = getAllLegalMoves(newBoard, opponent, updateCastlingRights(castlingRights, move), getEnPassantTarget(move));

    if (opponentMoves.length === 0) {
      if (isInCheck(newBoard, opponent)) {
        setGameStatus('checkmate');
        if (currentTurn === 'white') {
          setScore(prev => ({ ...prev, player: prev.player + 1 }));
        } else {
          setScore(prev => ({ ...prev, ai: prev.ai + 1 }));
        }
      } else {
        setGameStatus('stalemate');
        setScore(prev => ({ ...prev, draws: prev.draws + 1 }));
      }
    } else if (isInCheck(newBoard, opponent)) {
      setGameStatus('check');
      setCurrentTurn(opponent);
    } else {
      setGameStatus('playing');
      setCurrentTurn(opponent);
    }

    setSelectedSquare(null);
    setLegalMoves([]);
    setShowPromotion(null);
  }, [board, currentTurn, castlingRights]);

  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (gameStatus === 'checkmate' || gameStatus === 'stalemate' || currentTurn !== 'white' || isThinking) return;

    const piece = board[row][col];

    // If clicking on own piece, select it
    if (piece && piece.color === 'white') {
      setSelectedSquare({ row, col });
      const moves = getPieceMoves(board, row, col, castlingRights, enPassantTarget)
        .filter(m => !isInCheck(applyMove(board, m), 'white'));
      setLegalMoves(moves);
      return;
    }

    // If piece selected and clicking on valid move
    if (selectedSquare) {
      const move = legalMoves.find(m => m.to.row === row && m.to.col === col);

      if (move) {
        // Check for pawn promotion
        if (move.piece?.type === 'pawn' && (move.to.row === 0 || move.to.row === 7) && !move.promotion) {
          setShowPromotion({ move, options: ['queen', 'rook', 'bishop', 'knight'] });
          return;
        }

        executeMove(move);
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    }
  }, [board, currentTurn, gameStatus, isThinking, selectedSquare, legalMoves, castlingRights, enPassantTarget, executeMove]);

  // Handle promotion selection
  const handlePromotion = useCallback((pieceType: PieceType) => {
    if (!showPromotion) return;
    const move = { ...showPromotion.move, promotion: pieceType };
    executeMove(move);
  }, [showPromotion, executeMove]);

  // AI move
  useEffect(() => {
    if (currentTurn !== 'black' || gameStatus === 'checkmate' || gameStatus === 'stalemate') return;

    setIsThinking(true);

    const makeMove = async () => {
      let move: Move | null = null;
      
      if (aiMode === 'reinforcement') {
        const rlResult = await getRLMove(board);
        move = rlResult.move;
        setRlModelInfo(prev => prev ? { ...prev, fallback: !rlResult.usedModel } : { loaded: true, fallback: !rlResult.usedModel });
      } else {
        move = getAIMove(board, difficulty, castlingRights, enPassantTarget);
      }

      if (move) {
        executeMove(move);
      }

      setIsThinking(false);
    };

    const timer = setTimeout(makeMove, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, board, gameStatus, difficulty, castlingRights, enPassantTarget, executeMove, aiMode]);

  // Get cell style
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
      width: 52,
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background,
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.15s',
    };
  };

  // Get status message
  const getStatusMessage = (): string => {
    if (gameStatus === 'checkmate') {
      // currentTurn is who MADE the checkmate move (not switched on checkmate)
      // You are WHITE, AI is BLACK
      // white made checkmate -> You win; black made checkmate -> AI wins
      return currentTurn === 'white' ? '🎉 Checkmate! You Win!' : '🤖 Checkmate! AI Wins!';
    }
    if (gameStatus === 'stalemate') return '🤝 Stalemate - Draw!';
    if (isThinking) return '🤔 AI is thinking...';
    if (gameStatus === 'check') return '⚠️ Check!';
    return currentTurn === 'white' ? '♔ Your turn' : '♚ AI\'s turn';
  };

  return (
    <div style={containerStyle}>
      <style>
        {`
          .chess-cell:hover { filter: brightness(1.1); }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        `}
      </style>

      <h1 style={headerStyle}>♚ Chess ♔</h1>

      {/* AI Type */}
      <div style={{ marginBottom: '0.6em' }}>
        <span style={{ marginRight: '0.6em', opacity: 0.8, fontSize: '0.9em' }}>AI Type:</span>
        <button
          style={{
            ...difficultyBtnStyle(aiMode === 'minimax'),
            background: aiMode === 'minimax'
              ? 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)'
              : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
          }}
          onClick={() => { setAiMode('minimax'); resetGame(); }}
        >
          🧮 Minimax
        </button>
        <button
          style={{
            ...difficultyBtnStyle(aiMode === 'reinforcement'),
            background: aiMode === 'reinforcement'
              ? 'linear-gradient(90deg, #e74c3c 0%, #c0392b 100%)'
              : 'linear-gradient(90deg, #34495e 0%, #2c3e50 100%)',
          }}
          onClick={() => { setAiMode('reinforcement'); resetGame(); }}
        >
          🤖 RL Agent
        </button>
        {aiMode === 'reinforcement' && rlModelInfo && (
          <span style={{
            marginLeft: '0.6em',
            fontSize: '0.8em',
            opacity: 0.7,
            color: rlModelInfo.fallback ? '#e74c3c' : '#2ecc71'
          }}>
            {rlModelInfo.loaded
              ? (rlModelInfo.fallback ? '⚠️ Using fallback' : '✅ Model loaded')
              : '⏳ Loading...'}
          </span>
        )}
      </div>

      {/* Difficulty (only for Minimax) */}
      {aiMode === 'minimax' && (
        <div style={{ marginBottom: '0.6em' }}>
          <span style={{ marginRight: '0.6em', opacity: 0.8, fontSize: '0.9em' }}>Difficulty:</span>
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

      {/* Score */}
      <div style={{ marginBottom: '0.6em', fontSize: '0.9em' }}>
        <span style={{ margin: '0 0.6em', padding: '0.3em 0.6em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 6 }}>
          ♔ You: {score.player}
        </span>
        <span style={{ margin: '0 0.6em', padding: '0.3em 0.6em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 6 }}>
          🤝 Draws: {score.draws}
        </span>
        <span style={{ margin: '0 0.6em', padding: '0.3em 0.6em', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 6 }}>
          ♚ AI: {score.ai}
        </span>
      </div>

      {/* Status */}
      <div style={{
        fontSize: '1.1em',
        marginBottom: '0.8em',
        padding: '0.4em 0.8em',
        borderRadius: 10,
        background: gameStatus === 'checkmate'
          ? (currentTurn === 'black' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)')
          : gameStatus === 'check' ? 'rgba(241, 196, 15, 0.2)'
          : 'rgba(255, 255, 255, 0.1)',
        display: 'inline-block',
        animation: gameStatus === 'checkmate' ? 'pulse 0.5s ease-in-out infinite' : 'none',
      }}>
        {getStatusMessage()}
      </div>

      {/* Board */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1em', flexWrap: 'wrap' }}>
        <div style={boardContainerStyle}>
          {/* Column labels */}
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 2 }}>
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(f => (
              <span key={f} style={{ width: 52, textAlign: 'center', fontSize: '0.75em', opacity: 0.7 }}>{f}</span>
            ))}
          </div>

          <div style={{ display: 'flex' }}>
            {/* Row labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginRight: 2 }}>
              {[8, 7, 6, 5, 4, 3, 2, 1].map(r => (
                <span key={r} style={{ height: 52, display: 'flex', alignItems: 'center', fontSize: '0.75em', opacity: 0.7 }}>{r}</span>
              ))}
            </div>

            <div style={boardStyle}>
              {board.map((row, rowIndex) => (
                row.map((piece, colIndex) => {
                  const isLegalMoveTarget = legalMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex);
                  const isCapture = legalMoves.some(m => m.to.row === rowIndex && m.to.col === colIndex && (m.captured || m.enPassant));

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="chess-cell"
                      style={getCellStyle(rowIndex, colIndex)}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                    >
                      {/* Legal move indicator */}
                      {isLegalMoveTarget && !piece && (
                        <div style={{
                          width: 12,
                          height: 12,
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
                          border: '3px solid rgba(231, 76, 60, 0.6)',
                          borderRadius: '50%',
                          boxSizing: 'border-box',
                        }} />
                      )}
                      {/* Piece */}
                      {piece && (
                        <span style={{
                          fontSize: '2.3em',
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
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 10,
          padding: '0.8em',
          minWidth: 130,
          maxHeight: 450,
          overflowY: 'auto',
          textAlign: 'left',
          fontSize: '0.85em',
        }}>
          <h3 style={{ margin: '0 0 0.4em 0', fontSize: '0.95em', opacity: 0.8 }}>📜 Moves</h3>
          {moveHistory.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: '0.85em' }}>No moves yet</p>
          ) : (
            <div>
              {moveHistory.map((move, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  marginRight: '0.5em',
                  color: i % 2 === 0 ? '#f0d9b5' : '#888',
                }}>
                  {i % 2 === 0 && <span style={{ opacity: 0.6 }}>{Math.floor(i / 2) + 1}.</span>}
                  {move}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Promotion Modal */}
      {showPromotion && (
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
            background: '#2c3e50',
            padding: '1.5em',
            borderRadius: 16,
            textAlign: 'center',
          }}>
            <h3 style={{ margin: '0 0 1em 0' }}>Promote Pawn To:</h3>
            <div style={{ display: 'flex', gap: '0.5em' }}>
              {showPromotion.options.map(type => (
                <button
                  key={type}
                  style={{
                    ...buttonStyle,
                    fontSize: '2em',
                    padding: '0.3em 0.5em',
                  }}
                  onClick={() => handlePromotion(type)}
                >
                  {PIECE_SYMBOLS.white[type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: '1em' }}>
        <button
          style={buttonStyle}
          onClick={resetGame}
        >
          🔄 New Game
        </button>
        <button
          style={{ ...buttonStyle, background: 'linear-gradient(90deg, #9b59b6 0%, #8e44ad 100%)' }}
          onClick={() => setScore({ player: 0, ai: 0, draws: 0 })}
        >
          🗑️ Reset Score
        </button>
      </div>

      {/* Rules */}
      <div style={{
        marginTop: '1em',
        padding: '0.8em',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        textAlign: 'left',
        maxWidth: 450,
        margin: '1em auto 0',
        fontSize: '0.85em',
      }}>
        <h3 style={{ margin: '0 0 0.3em 0', color: '#b58863', fontSize: '0.95em' }}>📖 How to Play</h3>
        <ul style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.5, opacity: 0.9 }}>
          <li>Click a piece to see legal moves</li>
          <li>Click a highlighted square to move</li>
          <li>Castling, en passant, and pawn promotion supported</li>
          <li>Checkmate the AI's king to win!</li>
        </ul>
      </div>
    </div>
  );
};

export default ChessGame;
