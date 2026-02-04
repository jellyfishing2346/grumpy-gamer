import React, { useState, useCallback, useEffect, useRef } from 'react';

// Types
type CardState = 'hidden' | 'flipped' | 'matched';
type Player = 'player' | 'ai';
type GameStatus = 'playing' | 'ended';
type Difficulty = 'easy' | 'medium' | 'hard';
type GridSize = '4x3' | '4x4' | '6x4' | '6x5';

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  state: CardState;
}

interface GameState {
  cards: Card[];
  currentPlayer: Player;
  playerScore: number;
  aiScore: number;
  status: GameStatus;
  winner: Player | 'tie' | null;
  flippedCards: number[];
  canFlip: boolean;
}

interface AIMemory {
  [emoji: string]: number[]; // Maps emoji to card IDs where it was seen
}

// Card emoji sets
const CARD_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🦄', '🐝', '🦋', '🐌', '🐞', '🐙', '🦀', '🐠',
  '🌸', '🌺', '🌻', '🌹', '🍎', '🍊', '🍋', '🍇',
];

// Grid configurations
const GRID_CONFIGS: Record<GridSize, { rows: number; cols: number; pairs: number }> = {
  '4x3': { rows: 3, cols: 4, pairs: 6 },
  '4x4': { rows: 4, cols: 4, pairs: 8 },
  '6x4': { rows: 4, cols: 6, pairs: 12 },
  '6x5': { rows: 5, cols: 6, pairs: 15 },
};

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
  color: '#9c27b0',
  fontWeight: 800,
  letterSpacing: '0.01em',
  textShadow: '0 2px 12px rgba(156, 39, 176, 0.3)',
};

const subHeadingStyle: React.CSSProperties = {
  fontSize: '1.1em',
  color: '#666',
  marginBottom: '1.5em',
};

const btnStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '1em',
  padding: '0.7em 1.5em',
  fontWeight: 700,
  fontSize: '1em',
  cursor: 'pointer',
  boxShadow: '0 2px 8px 0 rgba(156, 39, 176, 0.25)',
  transition: 'all 0.2s',
  outline: 'none',
  margin: '0.3em',
};

const btnSecondaryStyle: React.CSSProperties = {
  ...btnStyle,
  background: 'linear-gradient(90deg, #757575 0%, #9e9e9e 100%)',
  boxShadow: '0 2px 8px 0 rgba(117, 117, 117, 0.25)',
};

const optionButtonStyle = (isActive: boolean): React.CSSProperties => ({
  ...btnStyle,
  padding: '0.5em 1em',
  fontSize: '0.9em',
  background: isActive 
    ? 'linear-gradient(90deg, #9c27b0 0%, #ba68c8 100%)'
    : 'linear-gradient(90deg, #e0e0e0 0%, #bdbdbd 100%)',
  color: isActive ? '#fff' : '#666',
});

const getCardStyle = (state: CardState, isClickable: boolean): React.CSSProperties => ({
  width: 70,
  height: 90,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '2.2em',
  cursor: isClickable ? 'pointer' : 'default',
  transition: 'all 0.3s ease-in-out',
  transform: state === 'hidden' ? 'rotateY(180deg)' : 'rotateY(0deg)',
  transformStyle: 'preserve-3d',
  background: state === 'matched' 
    ? 'linear-gradient(135deg, #c8e6c9 0%, #a5d6a7 100%)'
    : state === 'flipped'
      ? 'linear-gradient(135deg, #fff 0%, #f5f5f5 100%)'
      : 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
  boxShadow: state === 'hidden'
    ? '0 4px 12px rgba(156, 39, 176, 0.3)'
    : '0 4px 12px rgba(0, 0, 0, 0.15)',
  border: state === 'matched' ? '3px solid #4caf50' : '3px solid transparent',
  opacity: state === 'matched' ? 0.8 : 1,
});

const cardBackStyle: React.CSSProperties = {
  fontSize: '1.5em',
  color: 'rgba(255, 255, 255, 0.3)',
};

const scoreBoxStyle = (isActive: boolean, player: Player): React.CSSProperties => ({
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: isActive 
    ? player === 'player' ? '#e1bee7' : '#ffcdd2'
    : '#f5f5f5',
  borderRadius: 12,
  padding: '12px 24px',
  margin: '0 10px',
  border: isActive ? '3px solid #ffc107' : '3px solid transparent',
  transition: 'all 0.3s',
  minWidth: 100,
});

const scoreLabelStyle: React.CSSProperties = {
  fontSize: '0.85em',
  color: '#666',
  fontWeight: 600,
  marginBottom: 4,
};

const scoreValueStyle: React.CSSProperties = {
  fontSize: '2em',
  fontWeight: 700,
  color: '#333',
};

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Create cards for the game
const createCards = (gridSize: GridSize): Card[] => {
  const { pairs } = GRID_CONFIGS[gridSize];
  const selectedEmojis = shuffleArray(CARD_EMOJIS).slice(0, pairs);
  
  const cards: Card[] = [];
  
  for (let i = 0; i < pairs; i++) {
    // Create two cards for each pair
    cards.push({
      id: 0, // Will be set after shuffle
      emoji: selectedEmojis[i],
      pairId: i,
      state: 'hidden',
    });
    cards.push({
      id: 0, // Will be set after shuffle
      emoji: selectedEmojis[i],
      pairId: i,
      state: 'hidden',
    });
  }
  
  // Shuffle first, then assign IDs so id matches array index
  const shuffled = shuffleArray(cards);
  return shuffled.map((card, index) => ({ ...card, id: index }));
};

// Check if a player has won (more than half the pairs)
const checkEarlyWinner = (playerScore: number, aiScore: number, totalPairs: number): Player | 'tie' | null => {
  const majorityNeeded = Math.floor(totalPairs / 2) + 1;
  
  if (playerScore >= majorityNeeded) {
    return 'player';
  }
  if (aiScore >= majorityNeeded) {
    return 'ai';
  }
  // Check if game is complete
  if (playerScore + aiScore === totalPairs) {
    if (playerScore > aiScore) return 'player';
    if (aiScore > playerScore) return 'ai';
    return 'tie';
  }
  return null;
};

// AI Memory and Decision Making
const getAIMove = (
  cards: Card[],
  aiMemory: AIMemory,
  difficulty: Difficulty,
  firstCard: Card | null
): number => {
  const hiddenCards = cards.filter(c => c.state === 'hidden');
  
  if (hiddenCards.length === 0) return -1;
  
  // If we're picking the second card and remember where the match is
  if (firstCard) {
    const rememberedPositions = aiMemory[firstCard.emoji] || [];
    const matchingCard = rememberedPositions
      .filter(id => id !== firstCard.id)
      .find(id => cards[id].state === 'hidden');
    
    if (matchingCard !== undefined) {
      // AI remembers where the match is!
      const shouldRemember = 
        difficulty === 'hard' ? true :
        difficulty === 'medium' ? Math.random() < 0.7 :
        Math.random() < 0.3;
      
      if (shouldRemember) {
        return matchingCard;
      }
    }
    
    // Pick a random hidden card that's not the first card
    const otherHiddenCards = hiddenCards.filter(c => c.id !== firstCard.id);
    if (otherHiddenCards.length === 0) return -1;
    return otherHiddenCards[Math.floor(Math.random() * otherHiddenCards.length)].id;
  }
  
  // Picking first card - check if we know any pairs
  const knownPairs: { emoji: string; ids: number[] }[] = [];
  
  for (const [emoji, ids] of Object.entries(aiMemory)) {
    const availableIds = ids.filter(id => cards[id].state === 'hidden');
    if (availableIds.length >= 2) {
      knownPairs.push({ emoji, ids: availableIds });
    }
  }
  
  if (knownPairs.length > 0) {
    // AI knows a pair!
    const shouldUsePair = 
      difficulty === 'hard' ? true :
      difficulty === 'medium' ? Math.random() < 0.6 :
      Math.random() < 0.2;
    
    if (shouldUsePair) {
      const pair = knownPairs[Math.floor(Math.random() * knownPairs.length)];
      return pair.ids[0];
    }
  }
  
  // Random pick
  return hiddenCards[Math.floor(Math.random() * hiddenCards.length)].id;
};

// React Component
const MemoryGame: React.FC = () => {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gridSize, setGridSize] = useState<GridSize>('4x4');
  const [gameStarted, setGameStarted] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>(() => ({
    cards: [],
    currentPlayer: 'player',
    playerScore: 0,
    aiScore: 0,
    status: 'playing',
    winner: null,
    flippedCards: [],
    canFlip: true,
  }));
  
  const [aiMemory, setAiMemory] = useState<AIMemory>({});
  const [aiThinking, setAiThinking] = useState(false);
  const [lastMatchedBy, setLastMatchedBy] = useState<Player | null>(null);
  const aiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const matchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiMakingMoveRef = useRef(false);

  // Start a new game
  const startGame = useCallback(() => {
    const cards = createCards(gridSize);
    setGameState({
      cards,
      currentPlayer: 'player',
      playerScore: 0,
      aiScore: 0,
      status: 'playing',
      winner: null,
      flippedCards: [],
      canFlip: true,
    });
    setAiMemory({});
    setLastMatchedBy(null);
    setGameStarted(true);
    aiMakingMoveRef.current = false;
  }, [gridSize]);

  // Handle card click
  const handleCardClick = useCallback((cardId: number) => {
    if (!gameState.canFlip) return;
    if (gameState.currentPlayer !== 'player') return;
    if (gameState.status !== 'playing') return;
    
    const card = gameState.cards[cardId];
    if (card.state !== 'hidden') return;
    if (gameState.flippedCards.includes(cardId)) return;
    if (gameState.flippedCards.length >= 2) return;
    
    // Flip the card
    const newCards = [...gameState.cards];
    newCards[cardId] = { ...card, state: 'flipped' };
    const newFlippedCards = [...gameState.flippedCards, cardId];
    
    setGameState(prev => ({
      ...prev,
      cards: newCards,
      flippedCards: newFlippedCards,
    }));
    
    // If this is the second card
    if (newFlippedCards.length === 2) {
      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards[firstId];
      const secondCard = newCards[secondId];
      const totalPairs = GRID_CONFIGS[gridSize].pairs;
      
      setGameState(prev => ({ ...prev, canFlip: false }));
      
      // Check for match
      matchTimeoutRef.current = setTimeout(() => {
        if (firstCard.pairId === secondCard.pairId) {
          // Match found!
          const matchedCards = [...newCards];
          matchedCards[firstId] = { ...firstCard, state: 'matched' };
          matchedCards[secondId] = { ...secondCard, state: 'matched' };
          
          const newPlayerScore = gameState.playerScore + 1;
          const earlyWinner = checkEarlyWinner(newPlayerScore, gameState.aiScore, totalPairs);
          
          setLastMatchedBy('player');
          
          setGameState(prev => ({
            ...prev,
            cards: matchedCards,
            playerScore: newPlayerScore,
            flippedCards: [],
            canFlip: true,
            status: earlyWinner ? 'ended' : 'playing',
            winner: earlyWinner,
            // Player gets another turn on match (if game not ended)
          }));
        } else {
          // No match - flip cards back and switch turns
          const resetCards = [...newCards];
          resetCards[firstId] = { ...firstCard, state: 'hidden' };
          resetCards[secondId] = { ...secondCard, state: 'hidden' };
          
          setLastMatchedBy(null);
          
          setGameState(prev => ({
            ...prev,
            cards: resetCards,
            flippedCards: [],
            canFlip: true,
            currentPlayer: 'ai',
          }));
        }
      }, 1000);
    }
  }, [gameState, gridSize]);

  // AI Turn
  useEffect(() => {
    if (!gameStarted) return;
    if (gameState.status !== 'playing') return;
    if (gameState.currentPlayer !== 'ai') return;
    if (gameState.flippedCards.length > 0) return;
    if (aiMakingMoveRef.current) return; // Prevent re-entry
    
    aiMakingMoveRef.current = true;
    setAiThinking(true);
    
    // Get total pairs for early winner check
    const totalPairs = GRID_CONFIGS[gridSize].pairs;
    
    // Get a copy of current state for AI to use
    const currentCards = [...gameState.cards];
    const currentAiMemory = { ...aiMemory };
    const currentPlayerScore = gameState.playerScore;
    const currentAiScore = gameState.aiScore;
    
    // First card pick
    const firstCardId = getAIMove(currentCards, currentAiMemory, difficulty, null);
    
    if (firstCardId === -1) {
      setAiThinking(false);
      aiMakingMoveRef.current = false;
      return;
    }
    
    const firstCard = currentCards[firstCardId];
    
    // Update AI memory for first card
    const memoryAfterFirst = { ...currentAiMemory };
    if (!memoryAfterFirst[firstCard.emoji]) {
      memoryAfterFirst[firstCard.emoji] = [];
    }
    if (!memoryAfterFirst[firstCard.emoji].includes(firstCardId)) {
      memoryAfterFirst[firstCard.emoji].push(firstCardId);
    }
    
    // Prepare cards after first flip
    const cardsAfterFirst = [...currentCards];
    cardsAfterFirst[firstCardId] = { ...firstCard, state: 'flipped' };
    
    // Second card pick - calculate NOW before any timeouts
    const secondCardId = getAIMove(cardsAfterFirst, memoryAfterFirst, difficulty, firstCard);
    
    if (secondCardId === -1 || secondCardId === firstCardId) {
      // Fallback: pick any other hidden card
      const hiddenCards = currentCards.filter(c => c.state === 'hidden' && c.id !== firstCardId);
      if (hiddenCards.length === 0) {
        setAiThinking(false);
        return;
      }
      // Use first available hidden card as fallback
      const fallbackId = hiddenCards[0].id;
      const fallbackCard = currentCards[fallbackId];
      
      // Update memory for fallback card
      const finalMemory = { ...memoryAfterFirst };
      if (!finalMemory[fallbackCard.emoji]) {
        finalMemory[fallbackCard.emoji] = [];
      }
      if (!finalMemory[fallbackCard.emoji].includes(fallbackId)) {
        finalMemory[fallbackCard.emoji].push(fallbackId);
      }
      
      // Prepare cards after second flip
      const cardsAfterSecond = [...cardsAfterFirst];
      cardsAfterSecond[fallbackId] = { ...fallbackCard, state: 'flipped' };
      
      // Execute the moves with delays
      aiTimeoutRef.current = setTimeout(() => {
        setGameState(prev => ({ ...prev, cards: cardsAfterFirst, flippedCards: [firstCardId] }));
        setAiMemory(memoryAfterFirst);
        
        setTimeout(() => {
          setGameState(prev => ({ ...prev, cards: cardsAfterSecond, flippedCards: [firstCardId, fallbackId] }));
          setAiMemory(finalMemory);
          
          setTimeout(() => {
            // Check match
            if (firstCard.pairId === fallbackCard.pairId) {
              const matchedCards = [...cardsAfterSecond];
              matchedCards[firstCardId] = { ...firstCard, state: 'matched' };
              matchedCards[fallbackId] = { ...fallbackCard, state: 'matched' };
              const newAiScore = currentAiScore + 1;
              const earlyWinner = checkEarlyWinner(currentPlayerScore, newAiScore, totalPairs);
              setLastMatchedBy('ai');
              setGameState(prev => ({
                ...prev,
                cards: matchedCards,
                aiScore: newAiScore,
                flippedCards: [],
                status: earlyWinner ? 'ended' : 'playing',
                winner: earlyWinner,
              }));
            } else {
              const resetCards = [...cardsAfterSecond];
              resetCards[firstCardId] = { ...firstCard, state: 'hidden' };
              resetCards[fallbackId] = { ...fallbackCard, state: 'hidden' };
              setLastMatchedBy(null);
              setGameState(prev => ({ ...prev, cards: resetCards, flippedCards: [], currentPlayer: 'player' }));
            }
            setAiThinking(false);
            aiMakingMoveRef.current = false;
          }, 300);
        }, 100);
      }, 100);
      return;
    }
    
    const secondCard = currentCards[secondCardId];
    
    // Update memory for second card
    const finalMemory = { ...memoryAfterFirst };
    if (!finalMemory[secondCard.emoji]) {
      finalMemory[secondCard.emoji] = [];
    }
    if (!finalMemory[secondCard.emoji].includes(secondCardId)) {
      finalMemory[secondCard.emoji].push(secondCardId);
    }
    
    // Prepare cards after second flip
    const cardsAfterSecond = [...cardsAfterFirst];
    cardsAfterSecond[secondCardId] = { ...secondCard, state: 'flipped' };
    
    // Execute the moves with delays - all calculated upfront!
    aiTimeoutRef.current = setTimeout(() => {
      // Show first card
      setGameState(prev => ({ ...prev, cards: cardsAfterFirst, flippedCards: [firstCardId] }));
      setAiMemory(memoryAfterFirst);
      
      setTimeout(() => {
        // Show second card
        setGameState(prev => ({ ...prev, cards: cardsAfterSecond, flippedCards: [firstCardId, secondCardId] }));
        setAiMemory(finalMemory);
        
        setTimeout(() => {
          // Check for match
          if (firstCard.pairId === secondCard.pairId) {
            // Match!
            const matchedCards = [...cardsAfterSecond];
            matchedCards[firstCardId] = { ...firstCard, state: 'matched' };
            matchedCards[secondCardId] = { ...secondCard, state: 'matched' };
            const newAiScore = currentAiScore + 1;
            const earlyWinner = checkEarlyWinner(currentPlayerScore, newAiScore, totalPairs);
            
            setLastMatchedBy('ai');
            setGameState(prev => ({
              ...prev,
              cards: matchedCards,
              aiScore: newAiScore,
              flippedCards: [],
              status: earlyWinner ? 'ended' : 'playing',
              winner: earlyWinner,
            }));
          } else {
            // No match
            const resetCards = [...cardsAfterSecond];
            resetCards[firstCardId] = { ...firstCard, state: 'hidden' };
            resetCards[secondCardId] = { ...secondCard, state: 'hidden' };
            
            setLastMatchedBy(null);
            setGameState(prev => ({ ...prev, cards: resetCards, flippedCards: [], currentPlayer: 'player' }));
          }
          setAiThinking(false);
          aiMakingMoveRef.current = false;
        }, 300);
      }, 100);
    }, 100);
    
    // No cleanup - we don't want to cancel the AI move!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameState.currentPlayer, gameState.status, gameState.flippedCards.length, difficulty, gridSize]);
  // Note: gameState.cards, aiMemory intentionally excluded to prevent re-triggering

  // Cleanup
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (matchTimeoutRef.current) clearTimeout(matchTimeoutRef.current);
    };
  }, []);

  // Get grid dimensions
  const { rows, cols, pairs } = GRID_CONFIGS[gridSize];

  // Render game setup
  if (!gameStarted) {
    return (
      <div style={containerStyle}>
        <h1 style={headingStyle}>🃏 Memory Game</h1>
        <p style={subHeadingStyle}>
          Match pairs of cards and beat the AI!
        </p>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>Select Difficulty</h3>
          <button
            style={optionButtonStyle(difficulty === 'easy')}
            onClick={() => setDifficulty('easy')}
          >
            😊 Easy
          </button>
          <button
            style={optionButtonStyle(difficulty === 'medium')}
            onClick={() => setDifficulty('medium')}
          >
            🤔 Medium
          </button>
          <button
            style={optionButtonStyle(difficulty === 'hard')}
            onClick={() => setDifficulty('hard')}
          >
            😤 Hard
          </button>
          <p style={{ fontSize: '0.85em', color: '#999', marginTop: '0.5em' }}>
            {difficulty === 'easy' && 'AI has poor memory (30% recall)'}
            {difficulty === 'medium' && 'AI has decent memory (60-70% recall)'}
            {difficulty === 'hard' && 'AI has perfect memory!'}
          </p>
        </div>
        
        <div style={{ marginBottom: '2em' }}>
          <h3 style={{ color: '#666', marginBottom: '1em' }}>Select Grid Size</h3>
          <button
            style={optionButtonStyle(gridSize === '4x3')}
            onClick={() => setGridSize('4x3')}
          >
            4×3 (6 pairs)
          </button>
          <button
            style={optionButtonStyle(gridSize === '4x4')}
            onClick={() => setGridSize('4x4')}
          >
            4×4 (8 pairs)
          </button>
          <button
            style={optionButtonStyle(gridSize === '6x4')}
            onClick={() => setGridSize('6x4')}
          >
            6×4 (12 pairs)
          </button>
          <button
            style={optionButtonStyle(gridSize === '6x5')}
            onClick={() => setGridSize('6x5')}
          >
            6×5 (15 pairs)
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
          <h4 style={{ color: '#9c27b0', marginBottom: '0.5em' }}>📜 How to Play</h4>
          <ul style={{ color: '#666', fontSize: '0.95em', lineHeight: 1.8, paddingLeft: '1.2em' }}>
            <li>Click on cards to flip them over</li>
            <li>Find matching pairs of cards</li>
            <li>If you find a match, you get another turn!</li>
            <li>If no match, the AI gets a turn</li>
            <li>The player with the most pairs wins!</li>
          </ul>
        </div>
        
        <button style={btnStyle} onClick={startGame}>
          Start Game
        </button>
        
        {/* Preview cards */}
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'center', gap: 8 }}>
          {['🐶', '🐱', '🦊', '🐼'].map((emoji, i) => (
            <div 
              key={i}
              style={{
                ...getCardStyle('flipped', false),
                width: 50,
                height: 65,
                fontSize: '1.5em',
              }}
            >
              {emoji}
            </div>
          ))}
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
    
    if (gameState.winner === 'player') {
      return '🎉 You Win! Great memory!';
    } else {
      return '😤 AI Wins! The AI remembered everything!';
    }
  };

  // Main game view
  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>🃏 Memory Game</h1>
      
      {/* Score display */}
      <div style={{ marginBottom: '1em' }}>
        <div style={scoreBoxStyle(gameState.currentPlayer === 'player' && gameState.status === 'playing', 'player')}>
          <span style={scoreLabelStyle}>👤 You</span>
          <span style={scoreValueStyle}>{gameState.playerScore}</span>
          <span style={{ fontSize: '0.8em', color: '#666' }}>pairs</span>
        </div>
        <div style={scoreBoxStyle(gameState.currentPlayer === 'ai' && gameState.status === 'playing', 'ai')}>
          <span style={scoreLabelStyle}>🤖 AI</span>
          <span style={scoreValueStyle}>{gameState.aiScore}</span>
          <span style={{ fontSize: '0.8em', color: '#666' }}>pairs</span>
        </div>
      </div>
      
      {/* Game status */}
      {gameState.status === 'ended' && (
        <div style={{ 
          background: gameState.winner === 'player' 
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
            Final Score: You {gameState.playerScore} - {gameState.aiScore} AI
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
              🤔 AI is thinking...
            </div>
          ) : gameState.currentPlayer === 'player' ? (
            <div style={{ 
              background: '#e1bee7', 
              color: '#7b1fa2', 
              padding: '0.5em 1em', 
              borderRadius: 8,
              fontWeight: 600,
            }}>
              Your turn! Click a card to flip it.
              {lastMatchedBy === 'player' && ' 🎯 Great match! Go again!'}
            </div>
          ) : null}
        </div>
      )}
      
      {/* Game board */}
      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
        padding: 16,
        background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(156, 39, 176, 0.15)',
      }}>
        {gameState.cards.map((card) => {
          const isClickable = 
            gameState.canFlip && 
            gameState.currentPlayer === 'player' && 
            card.state === 'hidden' &&
            gameState.status === 'playing';
          
          return (
            <div
              key={card.id}
              style={getCardStyle(card.state, isClickable)}
              onClick={() => isClickable && handleCardClick(card.id)}
            >
              {card.state === 'hidden' ? (
                <span style={cardBackStyle}>?</span>
              ) : (
                card.emoji
              )}
            </div>
          );
        })}
      </div>
      
      {/* Pairs remaining */}
      <div style={{ marginTop: '1em', color: '#666', fontSize: '0.9em' }}>
        {pairs - gameState.playerScore - gameState.aiScore} pairs remaining
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
        <strong>Grid:</strong> {cols}×{rows} ({pairs} pairs) | 
        <strong> Difficulty:</strong> {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} | 
        <strong> AI Memory:</strong> {Object.keys(aiMemory).length} cards seen
      </div>
    </div>
  );
};

export default MemoryGame;
