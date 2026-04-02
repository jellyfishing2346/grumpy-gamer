import React, { useState, useCallback, useEffect, useRef } from 'react';
import { recordGame } from '../../services/gameStatsService';

import API_URL from "../../config/api";
const API_BASE_URL = API_URL;

// Types
type CellState = 'hidden' | 'revealed' | 'flagged';
type GameStatus = 'playing' | 'won' | 'lost';
type Difficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'classic' | 'vs-ai';
type Turn = 'player' | 'ai';
type AIMode = 'heuristic' | 'reinforcement';

interface Cell {
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
  revealedBy?: Turn;
}

interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
}

interface Score {
  player: number;
  ai: number;
  playerMinesHit: number;
  aiMinesHit: number;
}

// Difficulty configurations
const DIFFICULTY_CONFIG: Record<Difficulty, GameConfig> = {
  easy: { rows: 8, cols: 8, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 25 },
  hard: { rows: 16, cols: 16, mines: 50 },
};

// Create empty board
const createEmptyBoard = (rows: number, cols: number): Cell[][] => {
  return Array(rows).fill(null).map(() =>
    Array(cols).fill(null).map(() => ({
      isMine: false,
      adjacentMines: 0,
      state: 'hidden' as CellState,
    }))
  );
};

// Place mines on board (avoiding first click)
const placeMines = (
  board: Cell[][],
  mineCount: number,
  excludeRow: number,
  excludeCol: number
): Cell[][] => {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  
  let placedMines = 0;
  while (placedMines < mineCount) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    
    // Don't place mine on first click or adjacent cells, or where mine already exists
    const isExcluded = Math.abs(row - excludeRow) <= 1 && Math.abs(col - excludeCol) <= 1;
    
    if (!newBoard[row][col].isMine && !isExcluded) {
      newBoard[row][col].isMine = true;
      placedMines++;
    }
  }
  
  // Calculate adjacent mines for each cell
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!newBoard[row][col].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && newBoard[nr][nc].isMine) {
              count++;
            }
          }
        }
        newBoard[row][col].adjacentMines = count;
      }
    }
  }
  
  return newBoard;
};

// Reveal cell and cascade if empty
const revealCell = (
  board: Cell[][],
  row: number,
  col: number,
  revealedBy: Turn
): { newBoard: Cell[][]; hitMine: boolean; cellsRevealed: number } => {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard = board.map(r => r.map(c => ({ ...c })));
  
  if (newBoard[row][col].state !== 'hidden') {
    return { newBoard, hitMine: false, cellsRevealed: 0 };
  }
  
  // Check if it's a mine
  if (newBoard[row][col].isMine) {
    newBoard[row][col].state = 'revealed';
    newBoard[row][col].revealedBy = revealedBy;
    return { newBoard, hitMine: true, cellsRevealed: 1 };
  }
  
  // Flood fill for empty cells
  const stack: [number, number][] = [[row, col]];
  let cellsRevealed = 0;
  
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    if (newBoard[r][c].state !== 'hidden') continue;
    if (newBoard[r][c].isMine) continue;
    
    newBoard[r][c].state = 'revealed';
    newBoard[r][c].revealedBy = revealedBy;
    cellsRevealed++;
    
    // If cell has no adjacent mines, reveal neighbors
    if (newBoard[r][c].adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            stack.push([r + dr, c + dc]);
          }
        }
      }
    }
  }
  
  return { newBoard, hitMine: false, cellsRevealed };
};

// Check if game is won (all non-mine cells revealed)
const checkWin = (board: Cell[][]): boolean => {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && cell.state !== 'revealed') {
        return false;
      }
    }
  }
  return true;
};

// Count hidden cells
const countHiddenCells = (board: Cell[][]): number => {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.state === 'hidden') count++;
    }
  }
  return count;
};

// Count flags
const countFlags = (board: Cell[][]): number => {
  let count = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.state === 'flagged') count++;
    }
  }
  return count;
};

// AI: Find safe cells based on revealed information
const findSafeCells = (board: Cell[][]): [number, number][] => {
  const rows = board.length;
  const cols = board[0].length;
  const safeCells: [number, number][] = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board[row][col];
      
      if (cell.state === 'revealed' && cell.adjacentMines > 0) {
        // Count hidden and flagged neighbors
        let hiddenCount = 0;
        let flaggedCount = 0;
        const hiddenNeighbors: [number, number][] = [];
        
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (board[nr][nc].state === 'hidden') {
                hiddenCount++;
                hiddenNeighbors.push([nr, nc]);
              } else if (board[nr][nc].state === 'flagged') {
                flaggedCount++;
              }
            }
          }
        }
        
        // If all mines are flagged, remaining hidden cells are safe
        if (flaggedCount === cell.adjacentMines && hiddenCount > 0) {
          safeCells.push(...hiddenNeighbors);
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueSafe = Array.from(new Set(safeCells.map(c => `${c[0]},${c[1]}`)))
    .map(s => s.split(',').map(Number) as [number, number]);
  
  return uniqueSafe;
};

// AI: Find cells that must be mines
const findDefiniteMines = (board: Cell[][]): [number, number][] => {
  const rows = board.length;
  const cols = board[0].length;
  const definiteMines: [number, number][] = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = board[row][col];
      
      if (cell.state === 'revealed' && cell.adjacentMines > 0) {
        let hiddenCount = 0;
        let flaggedCount = 0;
        const hiddenNeighbors: [number, number][] = [];
        
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (board[nr][nc].state === 'hidden') {
                hiddenCount++;
                hiddenNeighbors.push([nr, nc]);
              } else if (board[nr][nc].state === 'flagged') {
                flaggedCount++;
              }
            }
          }
        }
        
        // If remaining hidden cells equals remaining mines, all are mines
        const remainingMines = cell.adjacentMines - flaggedCount;
        if (remainingMines === hiddenCount && hiddenCount > 0) {
          definiteMines.push(...hiddenNeighbors);
        }
      }
    }
  }
  
  const uniqueMines = Array.from(new Set(definiteMines.map(c => `${c[0]},${c[1]}`)))
    .map(s => s.split(',').map(Number) as [number, number]);
  
  return uniqueMines;
};

// AI: Get best move
const getAIMove = (
  board: Cell[][],
  difficulty: Difficulty
): { row: number; col: number; action: 'reveal' | 'flag' } | null => {
  const rows = board.length;
  const cols = board[0].length;
  
  // Find safe cells first
  const safeCells = findSafeCells(board);
  
  if (safeCells.length > 0) {
    // Pick a safe cell (on hard, pick strategically; otherwise random)
    if (difficulty === 'hard') {
      // Prefer cells that might reveal more information
      const cell = safeCells[0];
      return { row: cell[0], col: cell[1], action: 'reveal' };
    }
    const idx = Math.floor(Math.random() * safeCells.length);
    return { row: safeCells[idx][0], col: safeCells[idx][1], action: 'reveal' };
  }
  
  // Find definite mines to flag (on medium/hard)
  if (difficulty !== 'easy') {
    const definiteMines = findDefiniteMines(board);
    for (const [r, c] of definiteMines) {
      if (board[r][c].state === 'hidden') {
        // Flag it
        return { row: r, col: c, action: 'flag' };
      }
    }
  }
  
  // No safe cells found, make educated guess
  const hiddenCells: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].state === 'hidden') {
        hiddenCells.push([r, c]);
      }
    }
  }
  
  if (hiddenCells.length === 0) return null;
  
  // On easy: completely random
  if (difficulty === 'easy') {
    const idx = Math.floor(Math.random() * hiddenCells.length);
    return { row: hiddenCells[idx][0], col: hiddenCells[idx][1], action: 'reveal' };
  }
  
  // On medium/hard: prefer corners and edges (less likely to be mines statistically)
  const cornerCells = hiddenCells.filter(([r, c]) => 
    (r === 0 || r === rows - 1) && (c === 0 || c === cols - 1)
  );
  
  const edgeCells = hiddenCells.filter(([r, c]) => 
    r === 0 || r === rows - 1 || c === 0 || c === cols - 1
  );
  
  if (difficulty === 'hard' && cornerCells.length > 0) {
    const idx = Math.floor(Math.random() * cornerCells.length);
    return { row: cornerCells[idx][0], col: cornerCells[idx][1], action: 'reveal' };
  }
  
  if (edgeCells.length > 0) {
    const idx = Math.floor(Math.random() * edgeCells.length);
    return { row: edgeCells[idx][0], col: edgeCells[idx][1], action: 'reveal' };
  }
  
  // Random as fallback
  const idx = Math.floor(Math.random() * hiddenCells.length);
  return { row: hiddenCells[idx][0], col: hiddenCells[idx][1], action: 'reveal' };
};

const MinesweeperGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [board, setBoard] = useState<Cell[][]>(() => {
    const config = DIFFICULTY_CONFIG.easy;
    return createEmptyBoard(config.rows, config.cols);
  });
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');
  const [firstClick, setFirstClick] = useState(true);
  const [currentTurn, setCurrentTurn] = useState<Turn>('player');
  const [score, setScore] = useState<Score>({ player: 0, ai: 0, playerMinesHit: 0, aiMinesHit: 0 });
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [matchScore, setMatchScore] = useState({ player: 0, ai: 0 });
  const [aiMode, setAiMode] = useState<AIMode>('heuristic');
  const [rlModelInfo, setRlModelInfo] = useState<{ trained: boolean; confidence?: string }>({ trained: false });
  const [usedRLModel, setUsedRLModel] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);
  const moveCountRef = useRef<number>(0);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, gameStatus]);

  // Check RL model status on mount
  useEffect(() => {
    const checkRLStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/rl/minesweeper/status`);
        if (response.ok) {
          const data = await response.json();
          setRlModelInfo({ trained: data.model_trained });
        }
      } catch (error) {
        console.log('Could not fetch RL status:', error);
      }
    };
    checkRLStatus();
  }, []);

  // AI turn effect - with RL support
  useEffect(() => {
    if (gameMode === 'vs-ai' && currentTurn === 'ai' && gameStatus === 'playing' && !firstClick) {
      setIsAIThinking(true);
      
      const makeAIMove = async () => {
        let move: { row: number; col: number; action: 'reveal' | 'flag' } | null = null;
        
        if (aiMode === 'reinforcement') {
          // Use RL API
          try {
            const boardData = board.map(row => row.map(cell => ({
              state: cell.state,
              adjacentMines: cell.adjacentMines
            })));
            
            const response = await fetch(`${API_BASE_URL}/api/rl/minesweeper/move`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                board: boardData,
                rows: board.length,
                cols: board[0].length
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              move = { row: data.row, col: data.col, action: 'reveal' };
              setUsedRLModel(data.is_rl_model);
              setRlModelInfo(prev => ({ ...prev, confidence: data.confidence }));
            }
          } catch (error) {
            console.error('RL API error:', error);
          }
        }
        
        // Fall back to heuristic if RL failed or not selected
        if (!move) {
          move = getAIMove(board, difficulty);
          setUsedRLModel(false);
        }
        
        // Apply the move after a delay
        setTimeout(() => {
          if (move) {
            if (move.action === 'flag') {
              handleFlag(move.row, move.col, true);
            } else {
              handleReveal(move.row, move.col, true);
            }
          }
          setIsAIThinking(false);
        }, 300);
      };
      
      const timeoutId = setTimeout(makeAIMove, 500 + Math.random() * 300);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn, gameMode, gameStatus, board, firstClick, difficulty, aiMode]);

  // Record game stats when game ends
  useEffect(() => {
    if (gameStatus !== 'playing' && !statsRecordedRef.current && !firstClick) {
      statsRecordedRef.current = true;

      const result: 'win' | 'loss' = gameStatus === 'won' ? 'win' : 'loss';

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : timer;

      recordGame({
        gameType: 'minesweeper',
        result,
        movesCount: moveCountRef.current,
        durationSeconds,
        opponentType: gameMode === 'vs-ai' ? 'ai' : 'self',
        aiDifficulty: gameMode === 'vs-ai' ? (aiMode === 'reinforcement' ? 'rl' : 'heuristic') : difficulty,
        metadata: {
          difficulty,
          gameMode,
          playerScore: score.player,
          aiScore: score.ai,
        },
      }).then((res: { success: boolean; sessionId?: number }) => { if (res.sessionId) flushMoves(res.sessionId); }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameStatus, firstClick, timer, difficulty, gameMode, aiMode, score]);

  // Reset game
  const resetGame = useCallback((newDifficulty?: Difficulty, newMode?: GameMode) => {
    const diff = newDifficulty ?? difficulty;
    const mode = newMode ?? gameMode;
    const config = DIFFICULTY_CONFIG[diff];
    
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    moveCountRef.current = 0;
    
    setDifficulty(diff);
    setGameMode(mode);
    setBoard(createEmptyBoard(config.rows, config.cols));
    setGameStatus('playing');
    setFirstClick(true);
    setCurrentTurn('player');
    setScore({ player: 0, ai: 0, playerMinesHit: 0, aiMinesHit: 0 });
    setTimer(0);
    setIsTimerRunning(false);
    setIsAIThinking(false);
  }, [difficulty, gameMode]);

  // Handle cell reveal
  const handleReveal = useCallback((row: number, col: number, isAI: boolean = false) => {
    if (gameStatus !== 'playing') return;
    if (!isAI && currentTurn !== 'player' && gameMode === 'vs-ai') return;
    if (board[row][col].state !== 'hidden') return;
    if (isAI === false) addMove({ row, col, action: 'reveal', move: moveCountRef.current + 1 });
    
    let currentBoard = board;
    const turn: Turn = isAI ? 'ai' : 'player';
    
    // First click: place mines
    if (firstClick) {
      const config = DIFFICULTY_CONFIG[difficulty];
      currentBoard = placeMines(board, config.mines, row, col);
      setFirstClick(false);
      setIsTimerRunning(true);
    }
    
    const { newBoard, hitMine, cellsRevealed } = revealCell(currentBoard, row, col, turn);
    setBoard(newBoard);
    
    if (hitMine) {
      if (gameMode === 'vs-ai') {
        // In VS mode, hitting a mine gives opponent points
        setScore(prev => ({
          ...prev,
          [turn === 'player' ? 'playerMinesHit' : 'aiMinesHit']: 
            prev[turn === 'player' ? 'playerMinesHit' : 'aiMinesHit'] + 1,
        }));
        
        // Check if all mines hit or board cleared
        const hiddenCount = countHiddenCells(newBoard);
        if (hiddenCount === 0 || checkWin(newBoard)) {
          endGame(newBoard);
        } else {
          setCurrentTurn(turn === 'player' ? 'ai' : 'player');
        }
      } else {
        // Classic mode: game over on mine hit
        setGameStatus('lost');
        setIsTimerRunning(false);
        revealAllMines(newBoard);
      }
    } else {
      // Update score for cells revealed
      if (gameMode === 'vs-ai') {
        setScore(prev => ({
          ...prev,
          [turn]: prev[turn] + cellsRevealed,
        }));
      }
      
      // Check win condition
      if (checkWin(newBoard)) {
        if (gameMode === 'vs-ai') {
          endGame(newBoard);
        } else {
          setGameStatus('won');
          setIsTimerRunning(false);
          setMatchScore(prev => ({ ...prev, player: prev.player + 1 }));
        }
      } else if (gameMode === 'vs-ai') {
        setCurrentTurn(turn === 'player' ? 'ai' : 'player');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, gameStatus, firstClick, difficulty, gameMode, currentTurn]);

  // End VS-AI game
  const endGame = useCallback((finalBoard: Cell[][]) => {
    setIsTimerRunning(false);
    
    // Calculate final scores (penalize mine hits)
    const playerFinal = score.player - (score.playerMinesHit * 5);
    const aiFinal = score.ai - (score.aiMinesHit * 5);
    
    if (playerFinal > aiFinal) {
      setGameStatus('won');
      setMatchScore(prev => ({ ...prev, player: prev.player + 1 }));
    } else if (aiFinal > playerFinal) {
      setGameStatus('lost');
      setMatchScore(prev => ({ ...prev, ai: prev.ai + 1 }));
    } else {
      setGameStatus('won'); // Tie goes to player
    }
  }, [score]);

  // Reveal all mines (on game over)
  const revealAllMines = (currentBoard: Cell[][]) => {
    const newBoard = currentBoard.map(row => 
      row.map(cell => ({
        ...cell,
        state: cell.isMine ? 'revealed' as CellState : cell.state,
      }))
    );
    setBoard(newBoard);
  };

  // Handle flag toggle
  const handleFlag = useCallback((row: number, col: number, isAI: boolean = false) => {
    if (gameStatus !== 'playing') return;
    if (!isAI && currentTurn !== 'player' && gameMode === 'vs-ai') return;
    if (board[row][col].state === 'revealed') return;
    
    const newBoard = board.map(r => r.map(c => ({ ...c })));
    newBoard[row][col].state = newBoard[row][col].state === 'flagged' ? 'hidden' : 'flagged';
    setBoard(newBoard);
    
    if (gameMode === 'vs-ai') {
      setCurrentTurn(isAI ? 'player' : 'ai');
    }
  }, [board, gameStatus, gameMode, currentTurn]);

  // Handle right-click for flagging
  const handleContextMenu = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    handleFlag(row, col);
  };

  // Format timer
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get cell display
  const getCellContent = (cell: Cell): string => {
    if (cell.state === 'flagged') return '🚩';
    if (cell.state === 'hidden') return '';
    if (cell.isMine) return '💣';
    if (cell.adjacentMines === 0) return '';
    return cell.adjacentMines.toString();
  };

  // Get cell color based on number
  const getNumberColor = (num: number): string => {
    const colors: Record<number, string> = {
      1: '#3498db',
      2: '#27ae60',
      3: '#e74c3c',
      4: '#9b59b6',
      5: '#e67e22',
      6: '#1abc9c',
      7: '#34495e',
      8: '#2c3e50',
    };
    return colors[num] || '#fff';
  };

  const config = DIFFICULTY_CONFIG[difficulty];
  const flagsRemaining = config.mines - countFlags(board);

  // Styles
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    color: '#fff',
    padding: '2em 1em',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    textAlign: 'center',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '2.5em',
    fontWeight: 800,
    marginBottom: '0.3em',
    textShadow: '0 0 20px rgba(255, 100, 100, 0.5)',
    background: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5em 1em',
    margin: '0 0.3em',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85em',
    background: active
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    transition: 'all 0.2s ease',
  });

  const cellStyle = (cell: Cell): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: difficulty === 'hard' ? 28 : 36,
      height: difficulty === 'hard' ? 28 : 36,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: difficulty === 'hard' ? '0.9em' : '1.1em',
      fontWeight: 700,
      cursor: cell.state === 'revealed' ? 'default' : 'pointer',
      transition: 'all 0.15s ease',
      userSelect: 'none',
    };

    if (cell.state === 'hidden' || cell.state === 'flagged') {
      return {
        ...baseStyle,
        background: 'linear-gradient(145deg, #3a3a5a 0%, #2a2a4a 100%)',
        boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.1)',
      };
    }

    // Revealed
    let bgColor = 'rgba(255, 255, 255, 0.05)';
    if (cell.isMine) {
      bgColor = cell.revealedBy === 'ai' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(241, 196, 15, 0.3)';
    } else if (gameMode === 'vs-ai' && cell.revealedBy) {
      bgColor = cell.revealedBy === 'player' 
        ? 'rgba(46, 204, 113, 0.15)' 
        : 'rgba(52, 152, 219, 0.15)';
    }

    return {
      ...baseStyle,
      background: bgColor,
      boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.2)',
      color: cell.isMine ? '#fff' : getNumberColor(cell.adjacentMines),
    };
  };

  const boardStyle: React.CSSProperties = {
    display: 'inline-grid',
    gridTemplateColumns: `repeat(${config.cols}, auto)`,
    gap: 1,
    padding: '0.5em',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
  };

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.5em',
    marginBottom: '1em',
    flexWrap: 'wrap',
  };

  const statBoxStyle: React.CSSProperties = {
    padding: '0.5em 1em',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    minWidth: 80,
  };

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
    <div style={containerStyle}>
      <style>
        {`
          .mine-cell:hover {
            filter: brightness(1.2);
            transform: scale(1.05);
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}
      </style>

      <h1 style={headerStyle}>💣 Minesweeper 💣</h1>

      {/* Difficulty Selection */}
      <div style={{ marginBottom: '0.8em' }}>
        <span style={{ marginRight: '0.5em', opacity: 0.8 }}>Difficulty:</span>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            style={buttonStyle(difficulty === d)}
            onClick={() => resetGame(d)}
          >
            {d === 'easy' ? '🟢 Easy (8×8)' : d === 'medium' ? '🟡 Medium (12×12)' : '🔴 Hard (16×16)'}
          </button>
        ))}
      </div>

      {/* Game Mode Selection */}
      <div style={{ marginBottom: '1em' }}>
        <span style={{ marginRight: '0.5em', opacity: 0.8 }}>Mode:</span>
        <button
          style={buttonStyle(gameMode === 'classic')}
          onClick={() => resetGame(undefined, 'classic')}
        >
          🎮 Classic
        </button>
        <button
          style={buttonStyle(gameMode === 'vs-ai')}
          onClick={() => resetGame(undefined, 'vs-ai')}
        >
          🤖 VS AI
        </button>
      </div>

      {/* AI Type Selection (VS AI mode only) */}
      {gameMode === 'vs-ai' && (
        <div style={{ marginBottom: '1em' }}>
          <span style={{ marginRight: '0.5em', opacity: 0.8 }}>AI Type:</span>
          <button
            style={buttonStyle(aiMode === 'heuristic')}
            onClick={() => setAiMode('heuristic')}
          >
            🧠 Heuristic
          </button>
          <button
            style={buttonStyle(aiMode === 'reinforcement')}
            onClick={() => setAiMode('reinforcement')}
          >
            🤖 RL Agent {rlModelInfo.trained ? '✓' : '(training...)'}
          </button>
          {aiMode === 'reinforcement' && usedRLModel && rlModelInfo.confidence && (
            <span style={{ 
              marginLeft: '0.5em', 
              fontSize: '0.8em', 
              opacity: 0.7,
              color: rlModelInfo.confidence === 'high' ? '#2ecc71' : 
                     rlModelInfo.confidence === 'medium' ? '#f39c12' : '#e74c3c'
            }}>
              ({rlModelInfo.confidence} confidence)
            </span>
          )}
        </div>
      )}

      {/* Stats Bar */}
      <div style={statsStyle}>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '0.75em', opacity: 0.7 }}>🚩 Flags</div>
          <div style={{ fontSize: '1.3em', fontWeight: 700 }}>{flagsRemaining}</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '0.75em', opacity: 0.7 }}>⏱️ Time</div>
          <div style={{ fontSize: '1.3em', fontWeight: 700 }}>{formatTime(timer)}</div>
        </div>
        <div style={statBoxStyle}>
          <div style={{ fontSize: '0.75em', opacity: 0.7 }}>💣 Mines</div>
          <div style={{ fontSize: '1.3em', fontWeight: 700 }}>{config.mines}</div>
        </div>
        {gameMode === 'vs-ai' && (
          <>
            <div style={{ ...statBoxStyle, borderLeft: '2px solid rgba(46, 204, 113, 0.5)' }}>
              <div style={{ fontSize: '0.75em', opacity: 0.7 }}>👤 You</div>
              <div style={{ fontSize: '1.3em', fontWeight: 700, color: '#2ecc71' }}>{score.player}</div>
            </div>
            <div style={{ ...statBoxStyle, borderLeft: '2px solid rgba(52, 152, 219, 0.5)' }}>
              <div style={{ fontSize: '0.75em', opacity: 0.7 }}>🤖 AI</div>
              <div style={{ fontSize: '1.3em', fontWeight: 700, color: '#3498db' }}>{score.ai}</div>
            </div>
          </>
        )}
      </div>

      {/* Match Score (VS mode) */}
      {gameMode === 'vs-ai' && (
        <div style={{ marginBottom: '0.8em', fontSize: '0.9em' }}>
          Match Score: You {matchScore.player} - {matchScore.ai} AI
        </div>
      )}

      {/* Turn Indicator */}
      {gameMode === 'vs-ai' && gameStatus === 'playing' && !firstClick && (
        <div style={{ 
          marginBottom: '0.8em', 
          padding: '0.5em 1em',
          background: currentTurn === 'player' 
            ? 'rgba(46, 204, 113, 0.2)' 
            : 'rgba(52, 152, 219, 0.2)',
          borderRadius: 10,
          display: 'inline-block',
        }}>
          {isAIThinking ? '🤖 AI is thinking...' : '👤 Your turn - Click to reveal!'}
        </div>
      )}

      {/* Game Status */}
      {gameStatus !== 'playing' && (
        <div style={{
          padding: '1em 2em',
          marginBottom: '1em',
          borderRadius: 15,
          background: gameStatus === 'won' 
            ? 'rgba(46, 204, 113, 0.3)' 
            : 'rgba(231, 76, 60, 0.3)',
          display: 'inline-block',
          animation: 'pulse 0.5s ease-in-out infinite',
        }}>
          <div style={{ fontSize: '1.8em', fontWeight: 700 }}>
            {gameStatus === 'won' ? '🎉 You Won!' : '💥 Game Over!'}
          </div>
          {gameMode === 'vs-ai' && (
            <div style={{ fontSize: '0.9em', marginTop: '0.3em', opacity: 0.8 }}>
              Final Score: You {score.player - score.playerMinesHit * 5} vs AI {score.ai - score.aiMinesHit * 5}
            </div>
          )}
          <button
            style={{
              marginTop: '0.8em',
              padding: '0.6em 1.5em',
              border: 'none',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => resetGame()}
          >
            🔄 Play Again
          </button>
        </div>
      )}

      {/* Game Board */}
      <div style={{ overflowX: 'auto', padding: '1em 0' }}>
        <div style={boardStyle}>
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="mine-cell"
                style={cellStyle(cell)}
                onClick={() => handleReveal(rowIndex, colIndex)}
                onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
              >
                {getCellContent(cell)}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '1.5em', 
        opacity: 0.7, 
        fontSize: '0.85em',
        maxWidth: 500,
        margin: '1.5em auto 0'
      }}>
        <strong>How to play:</strong> Left-click to reveal • Right-click to flag
        {gameMode === 'vs-ai' && (
          <span> • Take turns with AI • Most cells revealed wins!</span>
        )}
      </div>

      {/* Back Button */}
      <div style={{ marginTop: '2em' }}>
        <button
          style={{
            padding: '0.8em 1.5em',
            fontSize: '1em',
            fontWeight: 600,
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
          }}
          onClick={() => window.history.back()}
        >
          ← Back to Games
        </button>
      </div>
    </div>
  );
};

export default MinesweeperGame;
