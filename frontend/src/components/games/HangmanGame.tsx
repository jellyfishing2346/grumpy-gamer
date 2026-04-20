import API_URL from '../../config/api';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDarkModeContext } from '../DarkModeProvider';
import { getDarkModeStyles } from '../getDarkModeStyles';
import { recordGame } from '../../services/gameStatsService';
import PlayAgainButton from '../PlayAgainButton';

// Types
type GameStatus = 'playing' | 'won' | 'lost';
type GameMode = 'classic' | 'vs-ai';
type Turn = 'player' | 'ai';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameState {
  word: string;
  guessedLetters: Set<string>;
  wrongGuesses: number;
  status: GameStatus;
  hint?: string;
}

interface VsAIState {
  playerWord: string;
  aiWord: string;
  playerGuessedLetters: Set<string>;
  aiGuessedLetters: Set<string>;
  playerWrongGuesses: number;
  aiWrongGuesses: number;
  currentTurn: Turn;
  playerStatus: GameStatus;
  aiStatus: GameStatus;
  winner: Turn | 'tie' | null;
}

// Word lists by difficulty
const WORD_LISTS: Record<Difficulty, { words: string[]; hints: Record<string, string> }> = {
  easy: {
    words: ['CAT', 'DOG', 'SUN', 'HAT', 'BIG', 'RUN', 'FUN', 'RED', 'BED', 'CUP', 'BOX', 'TOP', 'HOT', 'PEN', 'MAP'],
    hints: {
      'CAT': 'A furry pet that meows',
      'DOG': 'Man\'s best friend',
      'SUN': 'It rises in the east',
      'HAT': 'Worn on your head',
      'BIG': 'Opposite of small',
      'RUN': 'Faster than walking',
      'FUN': 'Having a good time',
      'RED': 'Color of fire trucks',
      'BED': 'Where you sleep',
      'CUP': 'You drink from it',
      'BOX': 'A container with sides',
      'TOP': 'The highest point',
      'HOT': 'Opposite of cold',
      'PEN': 'Used for writing',
      'MAP': 'Shows directions',
    }
  },
  medium: {
    words: ['PYTHON', 'GUITAR', 'JUNGLE', 'PLANET', 'BRIDGE', 'CASTLE', 'DRAGON', 'ROCKET', 'ZOMBIE', 'PUZZLE', 'COOKIE', 'GARDEN', 'LAPTOP', 'CAMERA', 'MONKEY'],
    hints: {
      'PYTHON': 'A snake or programming language',
      'GUITAR': 'A stringed musical instrument',
      'JUNGLE': 'Dense tropical forest',
      'PLANET': 'Earth is one of these',
      'BRIDGE': 'Crosses over water',
      'CASTLE': 'Where royalty lives',
      'DRAGON': 'Mythical fire-breathing creature',
      'ROCKET': 'Goes to space',
      'ZOMBIE': 'Undead creature',
      'PUZZLE': 'A brain teaser',
      'COOKIE': 'Sweet baked treat',
      'GARDEN': 'Where flowers grow',
      'LAPTOP': 'Portable computer',
      'CAMERA': 'Takes pictures',
      'MONKEY': 'Swings from trees',
    }
  },
  hard: {
    words: ['JAVASCRIPT', 'ALGORITHM', 'CRYPTOGRAPHY', 'BLOCKCHAIN', 'SYMPHONY', 'LABYRINTH', 'BOULEVARD', 'EXQUISITE', 'XYLOPHONE', 'JUXTAPOSE', 'QUIZZICAL', 'SAXOPHONE', 'HYPNOTIZE', 'PNEUMONIA', 'PSYCHOLOGY'],
    hints: {
      'JAVASCRIPT': 'Popular web programming language',
      'ALGORITHM': 'Step-by-step problem solving',
      'CRYPTOGRAPHY': 'Art of secret codes',
      'BLOCKCHAIN': 'Technology behind crypto',
      'SYMPHONY': 'Orchestral composition',
      'LABYRINTH': 'Complex maze',
      'BOULEVARD': 'Wide city street',
      'EXQUISITE': 'Extremely beautiful',
      'XYLOPHONE': 'Musical instrument with bars',
      'JUXTAPOSE': 'Place side by side',
      'QUIZZICAL': 'Questioning expression',
      'SAXOPHONE': 'Jazz instrument',
      'HYPNOTIZE': 'Put in a trance',
      'PNEUMONIA': 'Lung infection',
      'PSYCHOLOGY': 'Study of the mind',
    }
  }
};

const MAX_WRONG_GUESSES = 6;

// Styles
const baseContainerStyle: React.CSSProperties = {
  padding: '2em',
  maxWidth: 900,
  margin: '2em auto',
  borderRadius: 22,
  boxShadow: '0 4px 32px 0 rgba(80, 120, 200, 0.10)',
  textAlign: 'center',
  border: '1.5px solid #e9f1ff',
  fontFamily: "'Inter', 'Nunito', 'Segoe UI', Arial, sans-serif",
};

const darkContainer: React.CSSProperties = {
  background: '#181a1b',
  color: '#f1f1f1',
  border: '1.5px solid #23272f',
};

const headingStyle: React.CSSProperties = {
  fontSize: '2.4em',
  marginBottom: '0.3em',
  color: '#5c6bc0',
  fontWeight: 800,
  letterSpacing: '0.01em',
  textShadow: '0 2px 12px rgba(92, 107, 192, 0.3)',
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: '1.1em',
  color: '#666',
  marginBottom: '1.5em',
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #5c6bc0 0%, #7986cb 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '1em',
  padding: '0.7em 1.5em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  boxShadow: '0 2px 8px 0 rgba(92, 107, 192, 0.25)',
  transition: 'all 0.2s',
  outline: 'none',
  margin: '0.3em',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(90deg, #90a4ae 0%, #b0bec5 100%)',
  boxShadow: '0 2px 8px 0 rgba(144, 164, 174, 0.25)',
};

const modeButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...btnStyle,
  background: isActive 
    ? 'linear-gradient(90deg, #5c6bc0 0%, #7986cb 100%)'
    : 'linear-gradient(90deg, #cfd8dc 0%, #b0bec5 100%)',
  opacity: isActive ? 1 : 0.7,
});

const difficultyButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...btnStyle,
  padding: '0.5em 1em',
  fontSize: '0.9em',
  background: isActive 
    ? 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)'
    : 'linear-gradient(90deg, #e0e0e0 0%, #bdbdbd 100%)',
  color: isActive ? '#fff' : '#666',
});

const letterButtonStyle = (isGuessed: boolean, isCorrect: boolean | null): React.CSSProperties => ({
  width: 42,
  height: 42,
  margin: 3,
  border: 'none',
  borderRadius: 8,
  fontSize: '1.1em',
  fontWeight: 700,
  cursor: isGuessed ? 'default' : 'pointer',
  transition: 'all 0.2s',
  background: isGuessed 
    ? isCorrect 
      ? 'linear-gradient(135deg, #66bb6a 0%, #81c784 100%)' 
      : 'linear-gradient(135deg, #ef5350 0%, #e57373 100%)'
    : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
  color: isGuessed ? '#fff' : '#5c6bc0',
  opacity: isGuessed ? 0.7 : 1,
  boxShadow: isGuessed ? 'none' : '0 2px 6px rgba(0,0,0,0.1)',
});

const wordDisplayStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: 8,
  marginBottom: '1.5em',
  flexWrap: 'wrap',
};

const letterBoxStyle = (isRevealed: boolean): React.CSSProperties => ({
  width: 45,
  height: 55,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.8em',
  fontWeight: 700,
  borderRadius: 8,
  background: isRevealed ? '#e8f5e9' : '#f5f5f5',
  color: isRevealed ? '#2e7d32' : '#ccc',
  borderBottom: '3px solid',
  borderColor: isRevealed ? '#66bb6a' : '#bdbdbd',
  transition: 'all 0.3s',
});

// Hangman SVG drawing
const HangmanDrawing: React.FC<{ wrongGuesses: number; size?: number }> = ({ wrongGuesses, size = 200 }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ margin: '1em auto', display: 'block' }}>
      {/* Gallows */}
      <line x1="20" y1="180" x2="100" y2="180" stroke="#5c6bc0" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="180" x2="60" y2="20" stroke="#5c6bc0" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="20" x2="130" y2="20" stroke="#5c6bc0" strokeWidth="4" strokeLinecap="round" />
      <line x1="130" y1="20" x2="130" y2="40" stroke="#5c6bc0" strokeWidth="4" strokeLinecap="round" />
      
      {/* Head */}
      {wrongGuesses >= 1 && (
        <circle cx="130" cy="55" r="15" stroke="#ef5350" strokeWidth="3" fill="none" />
      )}
      
      {/* Body */}
      {wrongGuesses >= 2 && (
        <line x1="130" y1="70" x2="130" y2="115" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
      )}
      
      {/* Left Arm */}
      {wrongGuesses >= 3 && (
        <line x1="130" y1="80" x2="105" y2="100" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
      )}
      
      {/* Right Arm */}
      {wrongGuesses >= 4 && (
        <line x1="130" y1="80" x2="155" y2="100" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
      )}
      
      {/* Left Leg */}
      {wrongGuesses >= 5 && (
        <line x1="130" y1="115" x2="105" y2="150" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
      )}
      
      {/* Right Leg */}
      {wrongGuesses >= 6 && (
        <line x1="130" y1="115" x2="155" y2="150" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
      )}
      
      {/* Face expressions */}
      {wrongGuesses >= 1 && wrongGuesses < 6 && (
        <>
          {/* Eyes */}
          <circle cx="124" cy="52" r="2" fill="#5c6bc0" />
          <circle cx="136" cy="52" r="2" fill="#5c6bc0" />
          {/* Mouth - worried */}
          <path d="M 124 62 Q 130 58 136 62" stroke="#5c6bc0" strokeWidth="2" fill="none" />
        </>
      )}
      
      {wrongGuesses >= 6 && (
        <>
          {/* X eyes */}
          <line x1="121" y1="49" x2="127" y2="55" stroke="#ef5350" strokeWidth="2" />
          <line x1="127" y1="49" x2="121" y2="55" stroke="#ef5350" strokeWidth="2" />
          <line x1="133" y1="49" x2="139" y2="55" stroke="#ef5350" strokeWidth="2" />
          <line x1="139" y1="49" x2="133" y2="55" stroke="#ef5350" strokeWidth="2" />
          {/* Sad mouth */}
          <path d="M 124 65 Q 130 60 136 65" stroke="#ef5350" strokeWidth="2" fill="none" />
        </>
      )}
    </svg>
  );
};

// Letter frequency for AI guessing strategy
const LETTER_FREQUENCY = 'ETAOINSHRDLCUMWFGYPBVKJXQZ'.split('');

// AI word selection (picks a word for the player to guess)
const getRandomWord = (difficulty: Difficulty): { word: string; hint: string } => {
  const { words, hints } = WORD_LISTS[difficulty];
  const word = words[Math.floor(Math.random() * words.length)];
  return { word, hint: hints[word] || 'No hint available' };
};

// AI guessing logic
const getAIGuess = (
  word: string,
  guessedLetters: Set<string>,
  difficulty: Difficulty
): string => {
  const availableLetters = LETTER_FREQUENCY.filter(l => !guessedLetters.has(l));
  
  if (availableLetters.length === 0) return 'A'; // Fallback
  
  if (difficulty === 'easy') {
    // Easy AI: Random guesses with some mistakes
    const shouldMakeGoodGuess = Math.random() > 0.4;
    if (shouldMakeGoodGuess) {
      // Try to guess a letter that's in the word
      const lettersInWord = word.split('').filter(l => !guessedLetters.has(l));
      if (lettersInWord.length > 0) {
        return lettersInWord[Math.floor(Math.random() * lettersInWord.length)];
      }
    }
    // Random guess
    return availableLetters[Math.floor(Math.random() * availableLetters.length)];
  }
  
  if (difficulty === 'medium') {
    // Medium AI: Use letter frequency but sometimes make mistakes
    const shouldUseFrequency = Math.random() > 0.2;
    if (shouldUseFrequency) {
      return availableLetters[0];
    }
    return availableLetters[Math.floor(Math.random() * Math.min(10, availableLetters.length))];
  }
  
  // Hard AI: Smart frequency-based analysis
  // Use frequency analysis for optimal guessing
  return availableLetters[0];
};

// Check if word is fully revealed
const isWordRevealed = (word: string, guessedLetters: Set<string>): boolean => {
  return word.split('').every(letter => guessedLetters.has(letter));
};


// React Component
const HangmanGame: React.FC = () => {
  const [darkMode] = useDarkModeContext();
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameStarted, setGameStarted] = useState(false);
  
  // Classic mode state
  const [classicState, setClassicState] = useState<GameState>({
    word: '',
    guessedLetters: new Set(),
    wrongGuesses: 0,
    status: 'playing',
  });
  
  // VS AI mode state
  const [vsAIState, setVsAIState] = useState<VsAIState>({
    playerWord: '',
    aiWord: '',
    playerGuessedLetters: new Set(),
    aiGuessedLetters: new Set(),
    playerWrongGuesses: 0,
    aiWrongGuesses: 0,
    currentTurn: 'player',
    playerStatus: 'playing',
    aiStatus: 'playing',
    winner: null,
  });
  
  const [playerInputWord, setPlayerInputWord] = useState('');
  const [showWordInput, setShowWordInput] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Stats tracking refs
  const gameStartTimeRef = useRef<number | null>(null);
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);

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

  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Record game stats when classic game ends
  useEffect(() => {
    if (gameMode === 'classic' && classicState.status !== 'playing' && gameStarted && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      const result: 'win' | 'loss' = classicState.status === 'won' ? 'win' : 'loss';

      const durationSeconds = gameStartTimeRef.current
        ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
        : 0;

      recordGame({
        gameType: 'hangman',
        result,
        durationSeconds,
        opponentType: 'self',
        aiDifficulty: difficulty,
        metadata: {
          wordLength: classicState.word.length,
          wrongGuesses: classicState.wrongGuesses,
        },
      }).then((res: { success: boolean; sessionId?: number }) => { if (res.sessionId) flushMoves(res.sessionId); }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameMode, classicState.status, classicState.guessedLetters.size, classicState.word.length, classicState.wrongGuesses, difficulty, gameStarted]);

  // Record game stats when VS AI game ends
  useEffect(() => {
    if (gameMode === 'vs-ai' && vsAIState.winner !== null && gameStarted && !statsRecordedRef.current) {
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
        gameType: 'hangman',
        result,
        movesCount: vsAIState.playerGuessedLetters.size + vsAIState.aiGuessedLetters.size,
        durationSeconds,
        opponentType: 'ai',
        aiDifficulty: difficulty,
        metadata: {
          playerWrongGuesses: vsAIState.playerWrongGuesses,
          aiWrongGuesses: vsAIState.aiWrongGuesses,
        },
      }).then((res: { success: boolean; sessionId?: number }) => { if (res.sessionId) flushMoves(res.sessionId); }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameMode, vsAIState.winner, vsAIState.playerGuessedLetters.size, vsAIState.aiGuessedLetters.size, vsAIState.playerWrongGuesses, vsAIState.aiWrongGuesses, difficulty, gameStarted]);

  // Initialize/Reset classic game
  const startClassicGame = useCallback(() => {
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    
    const { word, hint } = getRandomWord(difficulty);
    setClassicState({
      word,
      guessedLetters: new Set(),
      wrongGuesses: 0,
      status: 'playing',
      hint,
    });
    setShowHint(false);
    setGameStarted(true);
  }, [difficulty]);

  // Initialize VS AI game
  const startVsAIGame = useCallback(() => {
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    
    setShowWordInput(true);
    setPlayerInputWord('');
  }, []);

  const confirmPlayerWord = useCallback(() => {
    const cleanWord = playerInputWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanWord.length < 3) {
      alert('Please enter a word with at least 3 letters!');
      return;
    }
    if (cleanWord.length > 15) {
      alert('Please enter a word with 15 letters or less!');
      return;
    }
    
    const { word: aiWord } = getRandomWord(difficulty);
    
    setVsAIState({
      playerWord: cleanWord, // Word the AI will guess
      aiWord, // Word the player will guess
      playerGuessedLetters: new Set(),
      aiGuessedLetters: new Set(),
      playerWrongGuesses: 0,
      aiWrongGuesses: 0,
      currentTurn: 'player',
      playerStatus: 'playing',
      aiStatus: 'playing',
      winner: null,
    });
    
    setShowWordInput(false);
    setGameStarted(true);
  }, [playerInputWord, difficulty]);

  // Classic mode guess
  const makeClassicGuess = useCallback((letter: string) => {
    if (classicState.status !== 'playing') return;
    if (classicState.guessedLetters.has(letter)) return;
    
    const newGuessedLetters = new Set(classicState.guessedLetters);
    newGuessedLetters.add(letter);
    
    const isCorrect = classicState.word.includes(letter);
    const newWrongGuesses = isCorrect ? classicState.wrongGuesses : classicState.wrongGuesses + 1;
    
    const wordRevealed = isWordRevealed(classicState.word, newGuessedLetters);
    const maxWrongReached = newWrongGuesses >= MAX_WRONG_GUESSES;
    
    let newStatus: GameStatus = 'playing';
    if (wordRevealed) newStatus = 'won';
    else if (maxWrongReached) newStatus = 'lost';
    
    setClassicState(prev => ({
      ...prev,
      guessedLetters: newGuessedLetters,
      wrongGuesses: newWrongGuesses,
      status: newStatus,
    }));
  }, [classicState]);

  // VS AI mode - player guess
  const makePlayerGuess = useCallback((letter: string) => {
    if (vsAIState.playerStatus !== 'playing') return;
    if (vsAIState.currentTurn !== 'player') return;
    if (vsAIState.playerGuessedLetters.has(letter)) return;
    
    const newGuessedLetters = new Set(vsAIState.playerGuessedLetters);
    newGuessedLetters.add(letter);
    
    const isCorrect = vsAIState.aiWord.includes(letter);
    const newWrongGuesses = isCorrect ? vsAIState.playerWrongGuesses : vsAIState.playerWrongGuesses + 1;
    
    const wordRevealed = isWordRevealed(vsAIState.aiWord, newGuessedLetters);
    const maxWrongReached = newWrongGuesses >= MAX_WRONG_GUESSES;
    
    let newPlayerStatus: GameStatus = 'playing';
    if (wordRevealed) newPlayerStatus = 'won';
    else if (maxWrongReached) newPlayerStatus = 'lost';
    
    // Determine winner if game ended
    let winner: Turn | 'tie' | null = null;
    if (newPlayerStatus !== 'playing') {
      if (newPlayerStatus === 'won' && vsAIState.aiStatus === 'playing') {
        // Player finished first - compare wrong guesses when AI finishes
        // For now, player wins by finishing first with a win
        winner = 'player';
      } else if (newPlayerStatus === 'lost') {
        // Check if AI also lost or is still playing
        if (vsAIState.aiStatus === 'lost') {
          // Both lost - compare wrong guesses (fewer is better)
          winner = vsAIState.aiWrongGuesses < newWrongGuesses ? 'ai' : 
                   vsAIState.aiWrongGuesses > newWrongGuesses ? 'player' : 'tie';
        } else if (vsAIState.aiStatus === 'won') {
          winner = 'ai';
        }
        // If AI is still playing, wait
      }
    }
    
    setVsAIState(prev => ({
      ...prev,
      playerGuessedLetters: newGuessedLetters,
      playerWrongGuesses: newWrongGuesses,
      playerStatus: newPlayerStatus,
      currentTurn: newPlayerStatus === 'playing' ? 'ai' : prev.currentTurn,
      winner: winner || prev.winner,
    }));
  }, [vsAIState]);

  // AI turn
  useEffect(() => {
    if (gameMode !== 'vs-ai') return;
    if (!gameStarted) return;
    if (vsAIState.currentTurn !== 'ai') return;
    if (vsAIState.aiStatus !== 'playing') return;
    if (vsAIState.winner) return;
    
    setAiThinking(true);
    
    aiTimeoutRef.current = setTimeout(() => {
      const aiGuess = getAIGuess(vsAIState.playerWord, vsAIState.aiGuessedLetters, difficulty);
      
      const newGuessedLetters = new Set(vsAIState.aiGuessedLetters);
      newGuessedLetters.add(aiGuess);
      
      const isCorrect = vsAIState.playerWord.includes(aiGuess);
      const newWrongGuesses = isCorrect ? vsAIState.aiWrongGuesses : vsAIState.aiWrongGuesses + 1;
      
      const wordRevealed = isWordRevealed(vsAIState.playerWord, newGuessedLetters);
      const maxWrongReached = newWrongGuesses >= MAX_WRONG_GUESSES;
      
      let newAIStatus: GameStatus = 'playing';
      if (wordRevealed) newAIStatus = 'won';
      else if (maxWrongReached) newAIStatus = 'lost';
      
      // Determine winner
      let winner: Turn | 'tie' | null = null;
      
      // Check all end conditions
      const playerDone = vsAIState.playerStatus !== 'playing';
      const aiDone = newAIStatus !== 'playing';
      
      if (playerDone && aiDone) {
        // Both finished
        const playerWon = vsAIState.playerStatus === 'won';
        const aiWon = newAIStatus === 'won';
        
        if (playerWon && aiWon) {
          // Both won - fewer wrong guesses wins
          if (vsAIState.playerWrongGuesses < newWrongGuesses) winner = 'player';
          else if (newWrongGuesses < vsAIState.playerWrongGuesses) winner = 'ai';
          else winner = 'tie';
        } else if (playerWon) {
          winner = 'player';
        } else if (aiWon) {
          winner = 'ai';
        } else {
          // Both lost
          if (vsAIState.playerWrongGuesses < newWrongGuesses) winner = 'player';
          else if (newWrongGuesses < vsAIState.playerWrongGuesses) winner = 'ai';
          else winner = 'tie';
        }
      } else if (aiDone && !playerDone) {
        // Only AI finished
        if (newAIStatus === 'won') {
          winner = 'ai'; // AI won by guessing the word
        }
        // If AI lost, player can still play
      }
      
      setVsAIState(prev => ({
        ...prev,
        aiGuessedLetters: newGuessedLetters,
        aiWrongGuesses: newWrongGuesses,
        aiStatus: newAIStatus,
        currentTurn: (newAIStatus === 'playing' && prev.playerStatus === 'playing') ? 'player' : prev.currentTurn,
        winner: winner || prev.winner,
      }));
      
      setAiThinking(false);
    }, 800);
    
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, [gameMode, gameStarted, vsAIState, difficulty]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard support for classic mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameStarted) return;
      
      const letter = e.key.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) return;
      
      if (gameMode === 'classic') {
        makeClassicGuess(letter);
      } else if (vsAIState.currentTurn === 'player') {
        makePlayerGuess(letter);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameMode, makeClassicGuess, makePlayerGuess, vsAIState.currentTurn]);

  // Render word display
  const renderWord = (word: string, guessedLetters: Set<string>, label?: string) => (
    <div style={{ marginBottom: '1em' }}>
      {label && <div style={{ fontSize: '1em', fontWeight: 600, color: '#666', marginBottom: '0.5em' }}>{label}</div>}
      <div style={wordDisplayStyle}>
        {word.split('').map((letter, idx) => (
          <div key={idx} style={letterBoxStyle(guessedLetters.has(letter))}>
            {guessedLetters.has(letter) ? letter : ''}
          </div>
        ))}
      </div>
    </div>
  );

  // Render keyboard
  const renderKeyboard = (
    guessedLetters: Set<string>,
    targetWord: string,
    onGuess: (letter: string) => void,
    disabled: boolean
  ) => (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      {[
        ALPHABET.slice(0, 9),
        ALPHABET.slice(9, 18),
        ALPHABET.slice(18, 26),
      ].map((row, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          {row.map(letter => {
            const isGuessed = guessedLetters.has(letter);
            const isCorrect = isGuessed ? targetWord.includes(letter) : null;
            return (
              <button
                key={letter}
                style={letterButtonStyle(isGuessed, isCorrect)}
                onClick={() => !disabled && !isGuessed && onGuess(letter)}
                disabled={disabled || isGuessed}
              >
                {letter}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Mode selection screen
  if (!gameStarted && !showWordInput) {
    return (
      <div style={getDarkModeStyles(darkMode, baseContainerStyle, darkContainer)}>
        <h1 style={headingStyle}>🔤 Hangman</h1>
        <p style={subHeadingStyle}>
          Guess the word before the stick figure is complete!
        </p>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>Select Game Mode</h3>
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
              <h4 style={{ color: '#5c6bc0', marginBottom: '0.5em' }}>🎮 Classic Mode</h4>
              <p style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.6 }}>
                The AI picks a word and you try to guess it letter by letter.
                You have 6 wrong guesses before the hangman is complete.
                Use hints if you get stuck!
              </p>
            </>
          ) : (
            <>
              <h4 style={{ color: '#5c6bc0', marginBottom: '0.5em' }}>🤖 VS AI Mode</h4>
              <p style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.6 }}>
                You pick a word for the AI to guess, and the AI picks one for you!
                Take turns guessing letters. The first to guess their word wins!
                If both finish, fewer wrong guesses wins. 😤
              </p>
            </>
          )}
        </div>
        
        <button 
          style={btnStyle} 
          onClick={gameMode === 'classic' ? startClassicGame : startVsAIGame}
        >
          Start Game
        </button>
        
        <HangmanDrawing wrongGuesses={0} size={150} />
      </div>
    );
  }

  // Word input screen for VS AI
  if (showWordInput) {
    return (
      <div style={getDarkModeStyles(darkMode, baseContainerStyle, darkContainer)}>
        <h1 style={headingStyle}>🔤 Enter Your Word</h1>
        <p style={subHeadingStyle}>
          Pick a word for the grumpy AI to guess!
        </p>
        
        <div style={{ marginBottom: '2em' }}>
          <input
            type="text"
            value={playerInputWord}
            onChange={(e) => setPlayerInputWord(e.target.value.toUpperCase())}
            placeholder="Enter a word (3-15 letters)"
            maxLength={15}
            style={{
              fontSize: '1.5em',
              padding: '0.5em 1em',
              borderRadius: 12,
              border: '2px solid #5c6bc0',
              outline: 'none',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: 2,
              width: '100%',
              maxWidth: 300,
            }}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && confirmPlayerWord()}
          />
        </div>
        
        <div style={{ color: '#666', marginBottom: '1em' }}>
          {playerInputWord.length > 0 && (
            <span>Length: {playerInputWord.replace(/[^A-Z]/gi, '').length} letters</span>
          )}
        </div>
        
        <button style={btnStyle} onClick={confirmPlayerWord}>
          Confirm Word
        </button>
        <button style={btnSecondaryStyle} onClick={() => setShowWordInput(false)}>
          Cancel
        </button>
      </div>
    );
  }

  // Classic mode game
  if (gameMode === 'classic') {
    return (
      <div style={getDarkModeStyles(darkMode, baseContainerStyle, darkContainer)}>
        <h1 style={headingStyle}>🔤 Hangman</h1>
        
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: '2em', flexWrap: 'wrap' }}>
          <div>
            <HangmanDrawing wrongGuesses={classicState.wrongGuesses} />
            <div style={{ color: '#666', fontSize: '0.95em' }}>
              Wrong guesses: {classicState.wrongGuesses} / {MAX_WRONG_GUESSES}
            </div>
          </div>
          
          <div style={{ flex: 1, minWidth: 300 }}>
            {renderWord(classicState.word, classicState.guessedLetters)}
            
            {classicState.status === 'won' && (
              <div style={{ 
                background: 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)', 
                color: '#fff', 
                padding: '1em', 
                borderRadius: 12, 
                marginBottom: '1em',
                fontWeight: 700,
              }}>
                🎉 Congratulations! You guessed the word!
              </div>
            )}
            
            {classicState.status === 'lost' && (
              <div style={{ 
                background: 'linear-gradient(90deg, #ef5350 0%, #e57373 100%)', 
                color: '#fff', 
                padding: '1em', 
                borderRadius: 12, 
                marginBottom: '1em',
                fontWeight: 700,
              }}>
                😵 Game Over! The word was: <strong>{classicState.word}</strong>
              </div>
            )}

            {(classicState.status === 'won' || classicState.status === 'lost') && (
              <div style={{ textAlign: 'center' }}>
                <PlayAgainButton />
              </div>
            )}
            
            {classicState.status === 'playing' && classicState.hint && (
              <div style={{ marginBottom: '1em' }}>
                <button 
                  style={{ ...btnSecondaryStyle, fontSize: '0.85em', padding: '0.4em 1em' }}
                  onClick={() => setShowHint(!showHint)}
                >
                  {showHint ? '🙈 Hide Hint' : '💡 Show Hint'}
                </button>
                {showHint && (
                  <div style={{ 
                    marginTop: '0.5em', 
                    padding: '0.5em 1em', 
                    background: '#fff3e0', 
                    borderRadius: 8,
                    color: '#e65100',
                    fontSize: '0.95em',
                  }}>
                    {classicState.hint}
                  </div>
                )}
              </div>
            )}
            
            {classicState.status === 'playing' && (
              renderKeyboard(
                classicState.guessedLetters,
                classicState.word,
                makeClassicGuess,
                false
              )
            )}
          </div>
        </div>
        
        <div style={{ marginTop: '1.5em' }}>
          <button style={btnStyle} onClick={startClassicGame}>New Game</button>
          <button style={btnSecondaryStyle} onClick={() => setGameStarted(false)}>Change Mode</button>
        </div>
        
        <div style={{ marginTop: '1em', color: '#999', fontSize: '0.85em' }}>
          Press any letter key to guess
        </div>
      </div>
    );
  }

  // VS AI mode game
  const gameOver = vsAIState.winner !== null;
  
  return (
    <div style={getDarkModeStyles(darkMode, baseContainerStyle, darkContainer)}>
      <h1 style={headingStyle}>🔤 Hangman VS AI</h1>
      
      {vsAIState.winner && (
        <div style={{ 
          background: vsAIState.winner === 'player' 
            ? 'linear-gradient(90deg, #66bb6a 0%, #81c784 100%)' 
            : vsAIState.winner === 'ai'
              ? 'linear-gradient(90deg, #ef5350 0%, #e57373 100%)'
              : 'linear-gradient(90deg, #90a4ae 0%, #b0bec5 100%)',
          color: '#fff', 
          padding: '1em', 
          borderRadius: 12, 
          marginBottom: '1.5em',
          fontWeight: 700,
          fontSize: '1.1em',
        }}>
          {vsAIState.winner === 'player' && '🎉 You Win! The AI is grumpy...'}
          {vsAIState.winner === 'ai' && '😤 AI Wins! Better luck next time!'}
          {vsAIState.winner === 'tie' && "🤝 It's a Tie!"}
        </div>
      )}
      
      {!gameOver && aiThinking && (
        <div style={{ 
          background: '#e3f2fd', 
          color: '#1976d2', 
          padding: '0.5em 1em', 
          borderRadius: 8, 
          marginBottom: '1em',
          fontSize: '0.95em',
        }}>
          🤔 AI is thinking...
        </div>
      )}
      
      {!gameOver && !aiThinking && vsAIState.currentTurn === 'player' && (
        <div style={{ 
          background: '#e8f5e9', 
          color: '#2e7d32', 
          padding: '0.5em 1em', 
          borderRadius: 8, 
          marginBottom: '1em',
          fontSize: '0.95em',
          fontWeight: 600,
        }}>
          Your turn! Guess a letter in the AI's word.
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2em', flexWrap: 'wrap', marginBottom: '1.5em' }}>
        {/* Player's challenge (guessing AI's word) */}
        <div style={{ 
          background: '#f5f5f5', 
          padding: '1.5em', 
          borderRadius: 16,
          minWidth: 280,
          border: vsAIState.currentTurn === 'player' && !gameOver ? '2px solid #5c6bc0' : '2px solid transparent',
        }}>
          <h3 style={{ color: '#5c6bc0', marginBottom: '0.5em' }}>👤 Your Challenge</h3>
          <p style={{ color: '#666', fontSize: '0.85em', marginBottom: '1em' }}>Guess the AI's word</p>
          
          <HangmanDrawing wrongGuesses={vsAIState.playerWrongGuesses} size={120} />
          
          {renderWord(vsAIState.aiWord, vsAIState.playerGuessedLetters)}
          
          <div style={{ color: '#666', fontSize: '0.85em' }}>
            Wrong: {vsAIState.playerWrongGuesses}/{MAX_WRONG_GUESSES}
          </div>
          
          {vsAIState.playerStatus === 'won' && (
            <div style={{ color: '#2e7d32', fontWeight: 600, marginTop: '0.5em' }}>✅ Guessed!</div>
          )}
          {vsAIState.playerStatus === 'lost' && (
            <div style={{ color: '#c62828', fontWeight: 600, marginTop: '0.5em' }}>
              ❌ Word: {vsAIState.aiWord}
            </div>
          )}
        </div>
        
        {/* AI's challenge (guessing player's word) */}
        <div style={{ 
          background: '#f5f5f5', 
          padding: '1.5em', 
          borderRadius: 16,
          minWidth: 280,
          border: vsAIState.currentTurn === 'ai' && !gameOver ? '2px solid #ef5350' : '2px solid transparent',
        }}>
          <h3 style={{ color: '#ef5350', marginBottom: '0.5em' }}>🤖 AI's Challenge</h3>
          <p style={{ color: '#666', fontSize: '0.85em', marginBottom: '1em' }}>AI guessing your word</p>
          
          <HangmanDrawing wrongGuesses={vsAIState.aiWrongGuesses} size={120} />
          
          {renderWord(vsAIState.playerWord, vsAIState.aiGuessedLetters)}
          
          <div style={{ color: '#666', fontSize: '0.85em' }}>
            Wrong: {vsAIState.aiWrongGuesses}/{MAX_WRONG_GUESSES}
          </div>
          
          {vsAIState.aiStatus === 'won' && (
            <div style={{ color: '#2e7d32', fontWeight: 600, marginTop: '0.5em' }}>✅ AI Guessed!</div>
          )}
          {vsAIState.aiStatus === 'lost' && (
            <div style={{ color: '#c62828', fontWeight: 600, marginTop: '0.5em' }}>❌ AI Failed!</div>
          )}
        </div>
      </div>
      
      {/* Keyboard for player */}
      {!gameOver && vsAIState.playerStatus === 'playing' && (
        <div>
          <div style={{ color: '#666', fontSize: '0.9em', marginBottom: '0.5em' }}>
            Click or press a letter to guess:
          </div>
          {renderKeyboard(
            vsAIState.playerGuessedLetters,
            vsAIState.aiWord,
            makePlayerGuess,
            vsAIState.currentTurn !== 'player'
          )}
        </div>
      )}
      
      <div style={{ marginTop: '1.5em' }}>
        <button style={btnStyle} onClick={startVsAIGame}>New Game</button>
        <button style={btnSecondaryStyle} onClick={() => { setGameStarted(false); setShowWordInput(false); }}>Change Mode</button>
      </div>
    </div>
  );
};

export default HangmanGame;