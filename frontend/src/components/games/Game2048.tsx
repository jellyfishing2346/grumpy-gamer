import React, { useState, useCallback, useEffect, useRef } from 'react';
import { recordGame } from '../../services/gameStatsService';

// Types
type Direction = 'up' | 'down' | 'left' | 'right';
type GameStatus = 'playing' | 'won' | 'lost';
type GameMode = 'classic' | 'vs-ai';
type Turn = 'player' | 'ai';
type AIMode = 'heuristic' | 'reinforcement';

// API Base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface Tile {
  value: number;
  id: number;
  isNew?: boolean;
  isMerged?: boolean;
}

interface GameState {
  board: (Tile | null)[][];
  score: number;
  status: GameStatus;
  hasWon: boolean;
}

interface VsAIState {
  playerBoard: (Tile | null)[][];
  aiBoard: (Tile | null)[][];
  playerScore: number;
  aiScore: number;
  currentTurn: Turn;
  status: GameStatus;
  winner: Turn | 'tie' | null;
  playerHasWon: boolean;
  aiHasWon: boolean;
  movesLeft: number;
}

// Styles
const containerStyle: React.CSSProperties = {
  padding: '2em',
  maxWidth: 900,
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
  color: '#f59563',
  fontWeight: 800,
  letterSpacing: '0.01em',
  textShadow: '0 2px 12px rgba(245, 149, 99, 0.3)',
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: '1.1em',
  color: '#776e65',
  marginBottom: '1.5em',
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f59563 0%, #f67c5f 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '1em',
  padding: '0.7em 1.5em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  boxShadow: '0 2px 8px 0 rgba(245, 149, 99, 0.25)',
  transition: 'all 0.2s',
  outline: 'none',
  margin: '0.3em',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(90deg, #8f7a66 0%, #bbada0 100%)',
  boxShadow: '0 2px 8px 0 rgba(143, 122, 102, 0.25)',
};

const modeButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...btnStyle,
  background: isActive 
    ? 'linear-gradient(90deg, #f59563 0%, #f67c5f 100%)'
    : 'linear-gradient(90deg, #cdc1b4 0%, #bbada0 100%)',
  opacity: isActive ? 1 : 0.7,
});

// Tile colors based on value
const getTileStyle = (value: number, isNew?: boolean, isMerged?: boolean): React.CSSProperties => {
  const colors: Record<number, { bg: string; text: string; fontSize?: string }> = {
    0: { bg: 'rgba(238, 228, 218, 0.35)', text: '#776e65' },
    2: { bg: '#eee4da', text: '#776e65' },
    4: { bg: '#ede0c8', text: '#776e65' },
    8: { bg: '#f2b179', text: '#f9f6f2' },
    16: { bg: '#f59563', text: '#f9f6f2' },
    32: { bg: '#f67c5f', text: '#f9f6f2' },
    64: { bg: '#f65e3b', text: '#f9f6f2' },
    128: { bg: '#edcf72', text: '#f9f6f2', fontSize: '1.8em' },
    256: { bg: '#edcc61', text: '#f9f6f2', fontSize: '1.8em' },
    512: { bg: '#edc850', text: '#f9f6f2', fontSize: '1.8em' },
    1024: { bg: '#edc53f', text: '#f9f6f2', fontSize: '1.5em' },
    2048: { bg: '#edc22e', text: '#f9f6f2', fontSize: '1.5em' },
  };

  const colorInfo = colors[value] || { bg: '#3c3a32', text: '#f9f6f2', fontSize: '1.3em' };
  
  return {
    width: 80,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: colorInfo.fontSize || '2em',
    fontWeight: 700,
    borderRadius: 8,
    background: colorInfo.bg,
    color: colorInfo.text,
    transition: 'all 0.15s ease-in-out',
    transform: isNew ? 'scale(1.1)' : isMerged ? 'scale(1.15)' : 'scale(1)',
    boxShadow: value >= 128 ? `0 0 20px ${colorInfo.bg}` : 'none',
  };
};

const boardStyle: React.CSSProperties = {
  display: 'inline-grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 10,
  padding: 12,
  background: '#bbada0',
  borderRadius: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
};

const scoreBoxStyle: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  background: '#bbada0',
  borderRadius: 8,
  padding: '8px 20px',
  margin: '0 8px',
  minWidth: 80,
};

const scoreLabelStyle: React.CSSProperties = {
  fontSize: '0.75em',
  color: '#eee4da',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const scoreValueStyle: React.CSSProperties = {
  fontSize: '1.5em',
  color: '#fff',
  fontWeight: 700,
};

// Game logic helpers
let tileIdCounter = 0;
const getNextTileId = () => ++tileIdCounter;

const createEmptyBoard = (): (Tile | null)[][] => {
  return Array(4).fill(null).map(() => Array(4).fill(null));
};

const cloneBoard = (board: (Tile | null)[][]): (Tile | null)[][] => {
  return board.map(row => row.map(tile => tile ? { ...tile, isNew: false, isMerged: false } : null));
};

const addRandomTile = (board: (Tile | null)[][]): (Tile | null)[][] => {
  const newBoard = cloneBoard(board);
  const emptyCells: [number, number][] = [];
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!newBoard[r][c]) {
        emptyCells.push([r, c]);
      }
    }
  }
  
  if (emptyCells.length === 0) return newBoard;
  
  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  newBoard[row][col] = {
    value: Math.random() < 0.9 ? 2 : 4,
    id: getNextTileId(),
    isNew: true,
  };
  
  return newBoard;
};

const initializeBoard = (): (Tile | null)[][] => {
  let board = createEmptyBoard();
  board = addRandomTile(board);
  board = addRandomTile(board);
  return board;
};

// Slide and merge logic
const slideRow = (row: (Tile | null)[]): { newRow: (Tile | null)[]; score: number; moved: boolean } => {
  // Remove nulls and slide left
  const tiles = row.filter(tile => tile !== null) as Tile[];
  const newRow: (Tile | null)[] = [];
  let score = 0;
  let moved = false;
  let i = 0;
  
  while (i < tiles.length) {
    if (i + 1 < tiles.length && tiles[i].value === tiles[i + 1].value) {
      // Merge tiles
      const mergedValue = tiles[i].value * 2;
      newRow.push({
        value: mergedValue,
        id: getNextTileId(),
        isMerged: true,
      });
      score += mergedValue;
      i += 2;
      moved = true;
    } else {
      newRow.push({ ...tiles[i], isNew: false, isMerged: false });
      i++;
    }
  }
  
  // Fill with nulls
  while (newRow.length < 4) {
    newRow.push(null);
  }
  
  // Check if anything moved
  for (let j = 0; j < 4; j++) {
    const oldVal = row[j]?.value || 0;
    const newVal = newRow[j]?.value || 0;
    if (oldVal !== newVal) moved = true;
  }
  
  return { newRow, score, moved };
};

const rotateBoard = (board: (Tile | null)[][]): (Tile | null)[][] => {
  const newBoard = createEmptyBoard();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      newBoard[c][3 - r] = board[r][c];
    }
  }
  return newBoard;
};

const move = (board: (Tile | null)[][], direction: Direction): { newBoard: (Tile | null)[][]; score: number; moved: boolean } => {
  let workBoard = cloneBoard(board);
  let totalScore = 0;
  let anyMoved = false;
  
  // Rotate board so we always slide left
  const rotations: Record<Direction, number> = { left: 0, up: 1, right: 2, down: 3 };
  const rotateCount = rotations[direction];
  
  for (let i = 0; i < rotateCount; i++) {
    workBoard = rotateBoard(workBoard);
  }
  
  // Slide each row left
  for (let r = 0; r < 4; r++) {
    const { newRow, score, moved } = slideRow(workBoard[r]);
    workBoard[r] = newRow;
    totalScore += score;
    if (moved) anyMoved = true;
  }
  
  // Rotate back
  for (let i = 0; i < (4 - rotateCount) % 4; i++) {
    workBoard = rotateBoard(workBoard);
  }
  
  return { newBoard: workBoard, score: totalScore, moved: anyMoved };
};

// Check for 2048 tile
const hasWon = (board: (Tile | null)[][]): boolean => {
  for (const row of board) {
    for (const tile of row) {
      if (tile && tile.value >= 2048) return true;
    }
  }
  return false;
};

// Check if any moves are possible
const canMove = (board: (Tile | null)[][]): boolean => {
  // Check for empty cells
  for (const row of board) {
    for (const tile of row) {
      if (!tile) return true;
    }
  }
  
  // Check for possible merges
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = board[r][c]?.value;
      if (val) {
        // Check right
        if (c < 3 && board[r][c + 1]?.value === val) return true;
        // Check down
        if (r < 3 && board[r + 1][c]?.value === val) return true;
      }
    }
  }
  
  return false;
};

// Get max tile value
const getMaxTile = (board: (Tile | null)[][]): number => {
  let max = 0;
  for (const row of board) {
    for (const tile of row) {
      if (tile && tile.value > max) max = tile.value;
    }
  }
  return max;
};

// AI Move selection using expectimax algorithm
const evaluateBoard = (board: (Tile | null)[][]): number => {
  let score = 0;
  let emptyCells = 0;
  let maxTile = 0;
  
  // Weight matrix - prefer tiles in corner
  const weights = [
    [4, 3, 2, 1],
    [3, 2, 1, 0],
    [2, 1, 0, -1],
    [1, 0, -1, -2],
  ];
  
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tile = board[r][c];
      if (tile) {
        score += tile.value * weights[r][c];
        if (tile.value > maxTile) maxTile = tile.value;
      } else {
        emptyCells++;
      }
    }
  }
  
  // Bonus for empty cells
  score += emptyCells * 10;
  
  // Bonus for monotonicity (values decreasing in a direction)
  let monoScore = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const curr = board[r][c]?.value || 0;
      const next = board[r][c + 1]?.value || 0;
      if (curr >= next) monoScore += 1;
    }
  }
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 3; r++) {
      const curr = board[r][c]?.value || 0;
      const next = board[r + 1][c]?.value || 0;
      if (curr >= next) monoScore += 1;
    }
  }
  score += monoScore * 5;
  
  // Bonus for smoothness (adjacent tiles with same value)
  let smoothScore = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c]?.value === board[r][c + 1]?.value && board[r][c]) {
        smoothScore += board[r][c]!.value;
      }
    }
  }
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 3; r++) {
      if (board[r][c]?.value === board[r + 1][c]?.value && board[r][c]) {
        smoothScore += board[r][c]!.value;
      }
    }
  }
  score += smoothScore;
  
  return score;
};

const getAIMove = (board: (Tile | null)[][], depth: number = 3): Direction | null => {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  let bestMove: Direction | null = null;
  let bestScore = -Infinity;
  
  for (const dir of directions) {
    const { newBoard, moved } = move(board, dir);
    if (!moved) continue;
    
    const score = expectimax(newBoard, depth - 1, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = dir;
    }
  }
  
  return bestMove;
};

const expectimax = (board: (Tile | null)[][], depth: number, isMax: boolean): number => {
  if (depth === 0 || !canMove(board)) {
    return evaluateBoard(board);
  }
  
  if (isMax) {
    let maxScore = -Infinity;
    const directions: Direction[] = ['up', 'down', 'left', 'right'];
    
    for (const dir of directions) {
      const { newBoard, moved } = move(board, dir);
      if (moved) {
        const score = expectimax(newBoard, depth - 1, false);
        maxScore = Math.max(maxScore, score);
      }
    }
    
    return maxScore === -Infinity ? evaluateBoard(board) : maxScore;
  } else {
    // Chance node - average over possible tile placements
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (!board[r][c]) emptyCells.push([r, c]);
      }
    }
    
    if (emptyCells.length === 0) return evaluateBoard(board);
    
    let totalScore = 0;
    const samples = Math.min(emptyCells.length, 4); // Limit samples for performance
    
    for (let i = 0; i < samples; i++) {
      const [r, c] = emptyCells[i % emptyCells.length];
      
      // Try placing a 2 (90% probability)
      const board2 = cloneBoard(board);
      board2[r][c] = { value: 2, id: 0 };
      totalScore += 0.9 * expectimax(board2, depth - 1, true);
      
      // Try placing a 4 (10% probability)
      const board4 = cloneBoard(board);
      board4[r][c] = { value: 4, id: 0 };
      totalScore += 0.1 * expectimax(board4, depth - 1, true);
    }
    
    return totalScore / samples;
  }
};

// React Component
const Game2048: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [gameStarted, setGameStarted] = useState(false);
  const [aiMode, setAiMode] = useState<AIMode>('heuristic');
  const [rlModelInfo, setRlModelInfo] = useState<{ trained: boolean }>({ trained: false });
  const [usedRLModel, setUsedRLModel] = useState(false);
  
  // Classic mode state
  const [classicState, setClassicState] = useState<GameState>(() => ({
    board: initializeBoard(),
    score: 0,
    status: 'playing',
    hasWon: false,
  }));
  
  // VS AI mode state
  const [vsAIState, setVsAIState] = useState<VsAIState>(() => ({
    playerBoard: initializeBoard(),
    aiBoard: initializeBoard(),
    playerScore: 0,
    aiScore: 0,
    currentTurn: 'player',
    status: 'playing',
    winner: null,
    playerHasWon: false,
    aiHasWon: false,
    movesLeft: 100, // Limited moves for competitive mode
  }));
  
  const [aiThinking, setAiThinking] = useState(false);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);
  const moveCountRef = useRef<number>(0);

  // Check RL model status on mount
  useEffect(() => {
    const checkRLStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/rl/2048/status`);
        if (response.ok) {
          const data = await response.json();
          setRlModelInfo({ trained: data.model_trained });
        }
      } catch (error) {
        console.log('Could not fetch 2048 RL status:', error);
      }
    };
    checkRLStatus();
  }, []);

  // Record game stats when classic game ends
  useEffect(() => {
    if (gameMode === 'classic' && classicState.status !== 'playing' && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      const result: 'win' | 'loss' = classicState.status === 'won' || classicState.hasWon ? 'win' : 'loss';

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      recordGame({
        gameType: '2048',
        result,
        movesCount: moveCountRef.current,
        durationSeconds,
        score: classicState.score,
        opponentType: 'self',
        metadata: {
          maxTile: Math.max(...classicState.board.flat().map(t => t?.value || 0)),
          hasWon: classicState.hasWon,
        },
      }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameMode, classicState.status, classicState.hasWon, classicState.score, classicState.board]);

  // Record game stats when VS AI game ends
  useEffect(() => {
    if (gameMode === 'vs-ai' && vsAIState.winner !== null && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      let result: 'win' | 'loss' | 'draw';
      if (vsAIState.winner === 'tie') {
        result = 'draw';
      } else if (vsAIState.winner === 'player') {
        result = 'win';
      } else {
        result = 'loss';
      }

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      recordGame({
        gameType: '2048',
        result,
        movesCount: moveCountRef.current,
        durationSeconds,
        score: vsAIState.playerScore,
        opponentType: 'ai',
        aiDifficulty: aiMode === 'reinforcement' ? 'rl' : 'heuristic',
        metadata: {
          aiMode,
          playerScore: vsAIState.playerScore,
          aiScore: vsAIState.aiScore,
          usedRLModel,
        },
      }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameMode, vsAIState.winner, vsAIState.playerScore, vsAIState.aiScore, aiMode, usedRLModel]);

  // Reset game
  const resetGame = useCallback(() => {
    tileIdCounter = 0;
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    moveCountRef.current = 0;
    
    if (gameMode === 'classic') {
      setClassicState({
        board: initializeBoard(),
        score: 0,
        status: 'playing',
        hasWon: false,
      });
    } else {
      setVsAIState({
        playerBoard: initializeBoard(),
        aiBoard: initializeBoard(),
        playerScore: 0,
        aiScore: 0,
        currentTurn: 'player',
        status: 'playing',
        winner: null,
        playerHasWon: false,
        aiHasWon: false,
        movesLeft: 100,
      });
    }
    
    setGameStarted(true);
  }, [gameMode]);

  // Classic mode move
  const makeClassicMove = useCallback((direction: Direction) => {
    if (classicState.status !== 'playing') return;
    
    const { newBoard, score, moved } = move(classicState.board, direction);
    
    if (!moved) return;
    
    const boardWithNewTile = addRandomTile(newBoard);
    const won = hasWon(boardWithNewTile);
    const canContinue = canMove(boardWithNewTile);
    
    setClassicState(prev => ({
      board: boardWithNewTile,
      score: prev.score + score,
      status: !canContinue ? 'lost' : prev.status,
      hasWon: prev.hasWon || won,
    }));
  }, [classicState]);

  // VS AI mode - player move
  const makePlayerMove = useCallback((direction: Direction) => {
    if (vsAIState.status !== 'playing' || vsAIState.currentTurn !== 'player') return;
    
    const { newBoard, score, moved } = move(vsAIState.playerBoard, direction);
    
    if (!moved) return;
    
    const boardWithNewTile = addRandomTile(newBoard);
    const won = hasWon(boardWithNewTile);
    const canContinue = canMove(boardWithNewTile);
    
    setVsAIState(prev => {
      const newMovesLeft = prev.movesLeft - 1;
      const playerLost = !canContinue;
      const aiLost = !canMove(prev.aiBoard);
      
      // Determine game end conditions
      let status: GameStatus = 'playing';
      let winner: Turn | 'tie' | null = null;
      
      if (newMovesLeft <= 0 || (playerLost && aiLost)) {
        status = 'won'; // Game ended
        const playerMax = getMaxTile(boardWithNewTile);
        const aiMax = getMaxTile(prev.aiBoard);
        const finalPlayerScore = prev.playerScore + score;
        
        if (playerLost && !aiLost) {
          winner = 'ai';
        } else if (aiLost && !playerLost) {
          winner = 'player';
        } else if (finalPlayerScore > prev.aiScore) {
          winner = 'player';
        } else if (prev.aiScore > finalPlayerScore) {
          winner = 'ai';
        } else if (playerMax > aiMax) {
          winner = 'player';
        } else if (aiMax > playerMax) {
          winner = 'ai';
        } else {
          winner = 'tie';
        }
      } else if (playerLost) {
        status = 'lost';
        winner = 'ai';
      }
      
      return {
        ...prev,
        playerBoard: boardWithNewTile,
        playerScore: prev.playerScore + score,
        currentTurn: status === 'playing' ? 'ai' : prev.currentTurn,
        status,
        winner,
        playerHasWon: prev.playerHasWon || won,
        movesLeft: newMovesLeft,
      };
    });
  }, [vsAIState]);

  // AI move in VS mode with RL support
  useEffect(() => {
    if (gameMode !== 'vs-ai' || vsAIState.status !== 'playing' || vsAIState.currentTurn !== 'ai') {
      return;
    }
    
    setAiThinking(true);
    
    const makeAIMove = async () => {
      let aiMove: Direction | null = null;
      let usedRL = false;
      
      // Try RL API if in reinforcement mode
      if (aiMode === 'reinforcement') {
        try {
          // Convert board to API format
          const boardData = vsAIState.aiBoard.map(row =>
            row.map(tile => tile ? tile.value : 0)
          );
          
          const response = await fetch(`${API_BASE_URL}/api/rl/2048/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ board: boardData })
          });
          
          if (response.ok) {
            const data = await response.json();
            const dirMap: Direction[] = ['up', 'right', 'down', 'left'];
            aiMove = dirMap[data.direction];
            usedRL = data.is_rl_model;
            setUsedRLModel(usedRL);
          }
        } catch (error) {
          console.error('RL API error, falling back to heuristic:', error);
        }
      }
      
      // Fall back to local heuristic if RL didn't provide a move
      if (!aiMove) {
        aiMove = getAIMove(vsAIState.aiBoard, 2);
        setUsedRLModel(false);
      }
      
      if (!aiMove) {
        // AI can't move
        setVsAIState(prev => ({
          ...prev,
          currentTurn: 'player',
          status: !canMove(prev.playerBoard) ? 'won' : prev.status,
          winner: !canMove(prev.playerBoard) ? 'tie' : prev.winner,
        }));
        setAiThinking(false);
        return;
      }
      
      const { newBoard, score, moved } = move(vsAIState.aiBoard, aiMove);
      
      if (!moved) {
        setVsAIState(prev => ({ ...prev, currentTurn: 'player' }));
        setAiThinking(false);
        return;
      }
      
      const boardWithNewTile = addRandomTile(newBoard);
      const won = hasWon(boardWithNewTile);
      const canContinue = canMove(boardWithNewTile);
      
      setVsAIState(prev => {
        const aiLost = !canContinue;
        const playerLost = !canMove(prev.playerBoard);
        
        let status: GameStatus = 'playing';
        let winner: Turn | 'tie' | null = null;
        
        if (aiLost && playerLost) {
          status = 'won';
          const playerMax = getMaxTile(prev.playerBoard);
          const aiMax = getMaxTile(boardWithNewTile);
          
          if (prev.playerScore > prev.aiScore + score) {
            winner = 'player';
          } else if (prev.aiScore + score > prev.playerScore) {
            winner = 'ai';
          } else if (playerMax > aiMax) {
            winner = 'player';
          } else if (aiMax > playerMax) {
            winner = 'ai';
          } else {
            winner = 'tie';
          }
        } else if (aiLost) {
          status = 'won';
          winner = 'player';
        }
        
        return {
          ...prev,
          aiBoard: boardWithNewTile,
          aiScore: prev.aiScore + score,
          currentTurn: status === 'playing' ? 'player' : prev.currentTurn,
          status,
          winner,
          aiHasWon: prev.aiHasWon || won,
        };
      });
      
      setAiThinking(false);
    };
    
    aiTimeoutRef.current = setTimeout(makeAIMove, 600);
    
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameMode, vsAIState.currentTurn, vsAIState.status, vsAIState.aiBoard, aiMode]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };
      
      const direction = keyMap[e.key];
      if (!direction) return;
      
      e.preventDefault();
      
      if (gameMode === 'classic') {
        makeClassicMove(direction);
      } else if (vsAIState.currentTurn === 'player') {
        makePlayerMove(direction);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameMode, makeClassicMove, makePlayerMove, vsAIState.currentTurn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  // Render board
  const renderBoard = (board: (Tile | null)[][], label?: string, isActive?: boolean) => (
    <div style={{ display: 'inline-block', margin: '0 1em', opacity: isActive === false ? 0.7 : 1 }}>
      {label && (
        <div style={{ 
          fontSize: '1.2em', 
          fontWeight: 700, 
          marginBottom: '0.5em', 
          color: isActive ? '#f59563' : '#8f7a66' 
        }}>
          {label}
          {isActive && <span style={{ marginLeft: '0.5em', fontSize: '0.8em' }}>⬅ Your turn</span>}
        </div>
      )}
      <div style={boardStyle}>
        {board.flat().map((tile, idx) => (
          <div key={tile?.id || `empty-${idx}`} style={getTileStyle(tile?.value || 0, tile?.isNew, tile?.isMerged)}>
            {tile?.value || ''}
          </div>
        ))}
      </div>
    </div>
  );

  // Mode selection screen
  if (!gameStarted) {
    return (
      <div style={containerStyle}>
        <h1 style={headingStyle}>2048</h1>
        <p style={subHeadingStyle}>
          Join the numbers and get to the <strong>2048 tile!</strong>
        </p>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#776e65', marginBottom: '1em' }}>Select Game Mode</h3>
          <button
            style={modeButtonStyle(gameMode === 'classic')}
            onClick={() => setGameMode('classic')}
          >
            🎮 Classic Mode
          </button>
          <button
            style={modeButtonStyle(gameMode === 'vs-ai')}
            onClick={() => setGameMode('vs-ai')}
          >
            🤖 VS AI Mode
          </button>
        </div>
        
        {gameMode === 'vs-ai' && (
          <div style={{ marginBottom: '2em' }}>
            <h3 style={{ color: '#776e65', marginBottom: '1em' }}>AI Type</h3>
            <button
              style={modeButtonStyle(aiMode === 'heuristic')}
              onClick={() => setAiMode('heuristic')}
            >
              🧠 Heuristic AI
            </button>
            <button
              style={modeButtonStyle(aiMode === 'reinforcement')}
              onClick={() => setAiMode('reinforcement')}
            >
              🤖 RL AI {rlModelInfo.trained ? '✓' : '(training...)'}
            </button>
          </div>
        )}
        
        <div style={{ 
          background: '#f5f5f5', 
          borderRadius: 12, 
          padding: '1.5em', 
          marginBottom: '1.5em',
          textAlign: 'left',
          maxWidth: 500,
          margin: '0 auto 1.5em',
        }}>
          {gameMode === 'classic' ? (
            <>
              <h4 style={{ color: '#f59563', marginBottom: '0.5em' }}>🎮 Classic Mode</h4>
              <p style={{ color: '#776e65', fontSize: '0.95em', lineHeight: 1.6 }}>
                The original 2048 experience! Use arrow keys or WASD to slide tiles. 
                When two tiles with the same number touch, they merge into one. 
                Reach the 2048 tile to win, or keep going for a higher score!
              </p>
            </>
          ) : (
            <>
              <h4 style={{ color: '#f59563', marginBottom: '0.5em' }}>🤖 VS AI Mode</h4>
              <p style={{ color: '#776e65', fontSize: '0.95em', lineHeight: 1.6 }}>
                Compete against our grumpy AI! You and the AI take turns making moves on separate boards.
                The game ends after 100 total moves or when one player can't move.
                Highest score wins! Can you outsmart the AI? 😤
              </p>
            </>
          )}
        </div>
        
        <button style={btnStyle} onClick={resetGame}>
          Start Game
        </button>
        
        <div style={{ marginTop: '1.5em', color: '#bbada0', fontSize: '0.9em' }}>
          <strong>Controls:</strong> Arrow Keys or WASD
        </div>
      </div>
    );
  }

  // Classic mode game
  if (gameMode === 'classic') {
    return (
      <div style={containerStyle}>
        <h1 style={headingStyle}>2048</h1>
        
        <div style={{ marginBottom: '1em' }}>
          <div style={scoreBoxStyle}>
            <span style={scoreLabelStyle}>Score</span>
            <span style={scoreValueStyle}>{classicState.score}</span>
          </div>
          <div style={scoreBoxStyle}>
            <span style={scoreLabelStyle}>Best Tile</span>
            <span style={scoreValueStyle}>{getMaxTile(classicState.board)}</span>
          </div>
        </div>
        
        {classicState.hasWon && classicState.status === 'playing' && (
          <div style={{ 
            background: 'linear-gradient(90deg, #edc22e 0%, #edcc61 100%)', 
            color: '#fff', 
            padding: '0.8em 1.5em', 
            borderRadius: 12, 
            marginBottom: '1em',
            fontWeight: 700,
            fontSize: '1.1em',
          }}>
            🎉 You reached 2048! Keep going for a higher score!
          </div>
        )}
        
        {classicState.status === 'lost' && (
          <div style={{ 
            background: '#f67c5f', 
            color: '#fff', 
            padding: '0.8em 1.5em', 
            borderRadius: 12, 
            marginBottom: '1em',
            fontWeight: 700,
            fontSize: '1.1em',
          }}>
            Game Over! Final Score: {classicState.score}
          </div>
        )}
        
        {renderBoard(classicState.board)}
        
        {/* Mobile controls */}
        <div style={{ marginTop: '1.5em' }}>
          <div>
            <button style={btnSecondaryStyle} onClick={() => makeClassicMove('up')}>⬆️</button>
          </div>
          <div>
            <button style={btnSecondaryStyle} onClick={() => makeClassicMove('left')}>⬅️</button>
            <button style={btnSecondaryStyle} onClick={() => makeClassicMove('down')}>⬇️</button>
            <button style={btnSecondaryStyle} onClick={() => makeClassicMove('right')}>➡️</button>
          </div>
        </div>
        
        <div style={{ marginTop: '1.5em' }}>
          <button style={btnStyle} onClick={resetGame}>New Game</button>
          <button style={btnSecondaryStyle} onClick={() => setGameStarted(false)}>Change Mode</button>
        </div>
        
        <div style={{ marginTop: '1em', color: '#bbada0', fontSize: '0.85em' }}>
          Use Arrow Keys or WASD to move
        </div>
      </div>
    );
  }

  // VS AI mode game
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>2048 VS AI</h1>
      
      <div style={{ marginBottom: '1em' }}>
        <div style={scoreBoxStyle}>
          <span style={scoreLabelStyle}>Your Score</span>
          <span style={scoreValueStyle}>{vsAIState.playerScore}</span>
        </div>
        <div style={scoreBoxStyle}>
          <span style={scoreLabelStyle}>AI Score</span>
          <span style={scoreValueStyle}>{vsAIState.aiScore}</span>
        </div>
        <div style={scoreBoxStyle}>
          <span style={scoreLabelStyle}>Moves Left</span>
          <span style={scoreValueStyle}>{vsAIState.movesLeft}</span>
        </div>
      </div>
      
      {vsAIState.status !== 'playing' && vsAIState.winner && (
        <div style={{ 
          background: vsAIState.winner === 'player' 
            ? 'linear-gradient(90deg, #6ECB63 0%, #4CAF50 100%)' 
            : vsAIState.winner === 'ai'
              ? 'linear-gradient(90deg, #f67c5f 0%, #f65e3b 100%)'
              : 'linear-gradient(90deg, #bbada0 0%, #8f7a66 100%)',
          color: '#fff', 
          padding: '1em 1.5em', 
          borderRadius: 12, 
          marginBottom: '1em',
          fontWeight: 700,
          fontSize: '1.2em',
        }}>
          {vsAIState.winner === 'player' && '🎉 You Win! The AI is grumpy about this...'}
          {vsAIState.winner === 'ai' && '😤 AI Wins! Better luck next time!'}
          {vsAIState.winner === 'tie' && "🤝 It's a Tie! Well played!"}
        </div>
      )}
      
      {aiThinking && (
        <div style={{ 
          background: '#bbada0', 
          color: '#fff', 
          padding: '0.5em 1em', 
          borderRadius: 8, 
          marginBottom: '1em',
          fontSize: '0.95em',
        }}>
          🤔 AI is thinking...
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1em' }}>
        {renderBoard(vsAIState.playerBoard, '👤 You', vsAIState.currentTurn === 'player' && vsAIState.status === 'playing')}
        {renderBoard(vsAIState.aiBoard, '🤖 AI', vsAIState.currentTurn === 'ai' && vsAIState.status === 'playing')}
      </div>
      
      {/* Mobile controls */}
      {vsAIState.status === 'playing' && vsAIState.currentTurn === 'player' && (
        <div style={{ marginTop: '1.5em' }}>
          <div>
            <button style={btnSecondaryStyle} onClick={() => makePlayerMove('up')}>⬆️</button>
          </div>
          <div>
            <button style={btnSecondaryStyle} onClick={() => makePlayerMove('left')}>⬅️</button>
            <button style={btnSecondaryStyle} onClick={() => makePlayerMove('down')}>⬇️</button>
            <button style={btnSecondaryStyle} onClick={() => makePlayerMove('right')}>➡️</button>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '1.5em' }}>
        <button style={btnStyle} onClick={resetGame}>New Game</button>
        <button style={btnSecondaryStyle} onClick={() => setGameStarted(false)}>Change Mode</button>
      </div>
      
      {vsAIState.playerHasWon && (
        <div style={{ marginTop: '0.5em', color: '#6ECB63', fontWeight: 600 }}>
          ✨ You reached 2048!
        </div>
      )}
      {vsAIState.aiHasWon && (
        <div style={{ marginTop: '0.5em', color: '#f67c5f', fontWeight: 600 }}>
          😤 AI reached 2048!
        </div>
      )}
      
      <div style={{ marginTop: '1em', color: '#bbada0', fontSize: '0.85em' }}>
        Use Arrow Keys or WASD to move
      </div>
    </div>
  );
};

export default Game2048;
