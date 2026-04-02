import API_URL from '../../config/api';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { recordGame } from '../../services/gameStatsService';

// Types
type Choice = 'rock' | 'paper' | 'scissors' | null;
type Result = 'win' | 'lose' | 'tie' | null;
type Difficulty = 'easy' | 'medium' | 'hard';
type GameMode = 'single' | 'best-of-3' | 'best-of-5';

interface RoundResult {
  playerChoice: Choice;
  aiChoice: Choice;
  result: Result;
}

interface GameState {
  playerChoice: Choice;
  aiChoice: Choice;
  result: Result;
  isRevealing: boolean;
  roundHistory: RoundResult[];
  scores: { player: number; ai: number; ties: number };
  difficulty: Difficulty;
  gameMode: GameMode;
  roundsToWin: number;
  matchWinner: 'player' | 'ai' | null;
  currentRound: number;
  streak: number;
  bestStreak: number;
}

// Choice emojis and names
const CHOICES: { id: Choice; emoji: string; name: string }[] = [
  { id: 'rock', emoji: '🪨', name: 'Rock' },
  { id: 'paper', emoji: '📄', name: 'Paper' },
  { id: 'scissors', emoji: '✂️', name: 'Scissors' },
];

// Determine winner: returns 'win' if player wins, 'lose' if AI wins, 'tie' if tie
const determineWinner = (player: Choice, ai: Choice): Result => {
  if (!player || !ai) return null;
  
  if (player === ai) return 'tie';
  
  // Rock beats Scissors
  // Scissors beats Paper
  // Paper beats Rock
  if (
    (player === 'rock' && ai === 'scissors') ||
    (player === 'scissors' && ai === 'paper') ||
    (player === 'paper' && ai === 'rock')
  ) {
    return 'win';
  }
  
  return 'lose';
};

// AI choice based on difficulty
const getAIChoice = (
  difficulty: Difficulty,
  playerHistory: Choice[]
): Choice => {
  const choices: Choice[] = ['rock', 'paper', 'scissors'];
  
  // Easy: Random choice
  if (difficulty === 'easy') {
    return choices[Math.floor(Math.random() * 3)];
  }
  
  // Medium: 50% random, 50% counter last move
  if (difficulty === 'medium') {
    if (Math.random() < 0.5 || playerHistory.length === 0) {
      return choices[Math.floor(Math.random() * 3)];
    }
    // Counter the player's last move
    const lastMove = playerHistory[playerHistory.length - 1];
    if (lastMove === 'rock') return 'paper';
    if (lastMove === 'paper') return 'scissors';
    return 'rock';
  }
  
  // Hard: Pattern analysis + counter strategy
  if (playerHistory.length < 3) {
    return choices[Math.floor(Math.random() * 3)];
  }
  
  // Analyze player patterns
  const recentMoves = playerHistory.slice(-10);
  const moveCounts = { rock: 0, paper: 0, scissors: 0 };
  
  for (const move of recentMoves) {
    if (move) moveCounts[move]++;
  }
  
  // Find most common move and counter it
  let mostCommon: Choice = 'rock';
  let maxCount = 0;
  
  for (const [move, count] of Object.entries(moveCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = move as Choice;
    }
  }
  
  // 70% chance to counter most common, 30% random
  if (Math.random() < 0.7) {
    if (mostCommon === 'rock') return 'paper';
    if (mostCommon === 'paper') return 'scissors';
    return 'rock';
  }
  
  return choices[Math.floor(Math.random() * 3)];
};

const RockPaperScissorsGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    playerChoice: null,
    aiChoice: null,
    result: null,
    isRevealing: false,
    roundHistory: [],
    scores: { player: 0, ai: 0, ties: 0 },
    difficulty: 'medium',
    gameMode: 'single',
    roundsToWin: 1,
    matchWinner: null,
    currentRound: 1,
    streak: 0,
    bestStreak: 0,
  });

  const [playerMoveHistory, setPlayerMoveHistory] = useState<Choice[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  // Stats tracking refs
  const gameStartTimeRef = useRef<number>(Date.now());
  const statsRecordedRef = useRef<boolean>(false);
  const pendingMovesRef = useRef<{moveNumber: number; moveData: Record<string, unknown>}[]>([]);

  // Record game stats when match ends
  useEffect(() => {
    if (gameState.matchWinner !== null && !statsRecordedRef.current) {
      statsRecordedRef.current = true;

      const result: 'win' | 'loss' = gameState.matchWinner === 'player' ? 'win' : 'loss';

      const durationSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);

      recordGame({
        gameType: 'rockpaperscissors',
        result,
        movesCount: gameState.roundHistory.length,
        durationSeconds,
        opponentType: 'ai',
        aiDifficulty: gameState.difficulty,
        metadata: {
          gameMode: gameState.gameMode,
          playerWins: gameState.scores.player,
          aiWins: gameState.scores.ai,
          ties: gameState.scores.ties,
          bestStreak: gameState.bestStreak,
        },
      }).then((res: { success: boolean; sessionId?: number }) => { if (res.sessionId) flushMoves(res.sessionId); }).catch((err) => console.error('Failed to record game stats:', err));
    }
  }, [gameState.matchWinner, gameState.roundHistory.length, gameState.difficulty, gameState.gameMode, gameState.scores, gameState.bestStreak]);

  // Handle game mode change
  const handleGameModeChange = useCallback((mode: GameMode) => {
    const roundsMap: Record<GameMode, number> = {
      'single': 1,
      'best-of-3': 2,
      'best-of-5': 3,
    };
    
    setGameState(prev => ({
      ...prev,
      gameMode: mode,
      roundsToWin: roundsMap[mode],
      scores: { player: 0, ai: 0, ties: 0 },
      matchWinner: null,
      currentRound: 1,
      roundHistory: [],
      playerChoice: null,
      aiChoice: null,
      result: null,
    }));
  }, []);

  // Handle difficulty change
  const handleDifficultyChange = useCallback((difficulty: Difficulty) => {
    setGameState(prev => ({
      ...prev,
      difficulty,
      scores: { player: 0, ai: 0, ties: 0 },
      matchWinner: null,
      currentRound: 1,
      roundHistory: [],
      playerChoice: null,
      aiChoice: null,
      result: null,
      streak: 0,
    }));
    setPlayerMoveHistory([]);
  }, []);

  // Handle player choice
  const handleChoice = useCallback((choice: Choice) => {
    if (gameState.isRevealing || gameState.matchWinner || !choice) return;
    
    // Start countdown animation
    setCountdown(3);
    setShowAnimation(true);
    
    // Store player choice for reveal
    const playerChoice = choice;
    setPlayerMoveHistory(prev => [...prev, choice]);
    addMove({ choice });
    
    setGameState(prev => ({
      ...prev,
      isRevealing: true,
      playerChoice: null,
      aiChoice: null,
      result: null,
    }));
    
    // Countdown effect
    let count = 3;
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(countdownInterval);
        setCountdown(null);
        
        // Get AI choice and determine winner
        const aiChoice = getAIChoice(gameState.difficulty, playerMoveHistory);
        const result = determineWinner(playerChoice, aiChoice);
        
        const newRound: RoundResult = {
          playerChoice,
          aiChoice,
          result,
        };
        
        setGameState(prev => {
          const newScores = { ...prev.scores };
          let newStreak = prev.streak;
          let newBestStreak = prev.bestStreak;
          
          if (result === 'win') {
            newScores.player++;
            newStreak++;
            if (newStreak > newBestStreak) {
              newBestStreak = newStreak;
            }
          } else if (result === 'lose') {
            newScores.ai++;
            newStreak = 0;
          } else {
            newScores.ties++;
          }
          
          // Check for match winner (only in best-of modes, ties don't count)
          let matchWinner: 'player' | 'ai' | null = null;
          if (newScores.player >= prev.roundsToWin) {
            matchWinner = 'player';
          } else if (newScores.ai >= prev.roundsToWin) {
            matchWinner = 'ai';
          }
          
          return {
            ...prev,
            playerChoice,
            aiChoice,
            result,
            isRevealing: false,
            roundHistory: [...prev.roundHistory, newRound],
            scores: newScores,
            matchWinner,
            currentRound: prev.currentRound + 1,
            streak: newStreak,
            bestStreak: newBestStreak,
          };
        });
        
        setShowAnimation(false);
      }
    }, 500);
  }, [gameState.isRevealing, gameState.matchWinner, gameState.difficulty, playerMoveHistory]);

  // Reset game/match
  const resetGame = useCallback((fullReset: boolean = false) => {
    gameStartTimeRef.current = Date.now();
    statsRecordedRef.current = false;
    
    setGameState(prev => ({
      ...prev,
      playerChoice: null,
      aiChoice: null,
      result: null,
      matchWinner: null,
      currentRound: 1,
      roundHistory: [],
      scores: fullReset ? { player: 0, ai: 0, ties: 0 } : prev.scores,
      streak: fullReset ? 0 : prev.streak,
    }));
    if (fullReset) {
      setPlayerMoveHistory([]);
    }
  }, []);

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
    textShadow: '0 0 20px rgba(255, 200, 100, 0.5)',
    background: 'linear-gradient(90deg, #ffd700, #ff6b6b, #4ecdc4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const difficultyBtnStyle = (active: boolean): React.CSSProperties => ({
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
    transform: active ? 'scale(1.05)' : 'scale(1)',
  });

  const modeBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5em 1em',
    margin: '0 0.3em',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.85em',
    background: active
      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
      : 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    transition: 'all 0.2s ease',
  });

  const choiceButtonStyle = (disabled: boolean): React.CSSProperties => ({
    width: 120,
    height: 120,
    margin: '0.5em',
    border: 'none',
    borderRadius: 20,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '3.5em',
    background: 'linear-gradient(145deg, #2a2a4a 0%, #1a1a3a 100%)',
    boxShadow: disabled 
      ? 'none' 
      : '0 8px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
    transform: 'scale(1)',
  });

  const resultCardStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: '2em',
    margin: '1.5em auto',
    maxWidth: 500,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  };

  const choiceDisplayStyle = (highlight: boolean, isWinner: boolean): React.CSSProperties => ({
    fontSize: '5em',
    padding: '0.3em',
    borderRadius: 20,
    background: isWinner 
      ? 'linear-gradient(135deg, rgba(46, 204, 113, 0.3) 0%, rgba(39, 174, 96, 0.3) 100%)'
      : highlight 
        ? 'rgba(255, 255, 255, 0.1)' 
        : 'transparent',
    border: isWinner ? '3px solid #2ecc71' : 'none',
    animation: isWinner ? 'pulse 0.5s ease-in-out infinite' : 'none',
  });

  const vsStyle: React.CSSProperties = {
    fontSize: '2em',
    fontWeight: 800,
    color: '#ff6b6b',
    margin: '0 0.5em',
  };

  const getResultMessage = (): { text: string; color: string; emoji: string } => {
    if (gameState.matchWinner === 'player') {
      return { text: '🏆 YOU WON THE MATCH! 🏆', color: '#2ecc71', emoji: '🎉' };
    }
    if (gameState.matchWinner === 'ai') {
      return { text: '💔 AI WINS THE MATCH 💔', color: '#e74c3c', emoji: '😢' };
    }
    
    switch (gameState.result) {
      case 'win':
        return { text: 'You Win! 🎉', color: '#2ecc71', emoji: '✌️' };
      case 'lose':
        return { text: 'AI Wins! 🤖', color: '#e74c3c', emoji: '😅' };
      case 'tie':
        return { text: "It's a Tie! 🤝", color: '#f1c40f', emoji: '🔄' };
      default:
        return { text: 'Make your choice!', color: '#fff', emoji: '🎮' };
    }
  };

  const getChoiceEmoji = (choice: Choice): string => {
    const found = CHOICES.find(c => c.id === choice);
    return found ? found.emoji : '❓';
  };

  const getChoiceName = (choice: Choice): string => {
    const found = CHOICES.find(c => c.id === choice);
    return found ? found.name : '';
  };

  const resultInfo = getResultMessage();

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
          .choice-btn:hover:not(:disabled) {
            transform: scale(1.1) !important;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
          }
          .choice-btn:active:not(:disabled) {
            transform: scale(0.95) !important;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes shake {
            0%, 100% { transform: translateY(0); }
            25% { transform: translateY(-10px); }
            75% { transform: translateY(10px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          .shake-animation {
            animation: shake 0.3s ease-in-out infinite;
          }
          .fade-in {
            animation: fadeIn 0.3s ease-out forwards;
          }
        `}
      </style>

      <h1 style={headerStyle}>✊ Rock Paper Scissors ✂️</h1>

      {/* Difficulty Selection */}
      <div style={{ marginBottom: '1em' }}>
        <span style={{ marginRight: '0.5em', opacity: 0.8 }}>Difficulty:</span>
        {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
          <button
            key={d}
            style={difficultyBtnStyle(gameState.difficulty === d)}
            onClick={() => handleDifficultyChange(d)}
          >
            {d === 'easy' ? '🟢 Easy' : d === 'medium' ? '🟡 Medium' : '🔴 Hard'}
          </button>
        ))}
      </div>

      {/* Game Mode Selection */}
      <div style={{ marginBottom: '1em' }}>
        <span style={{ marginRight: '0.5em', opacity: 0.8 }}>Mode:</span>
        {(['single', 'best-of-3', 'best-of-5'] as GameMode[]).map(mode => (
          <button
            key={mode}
            style={modeBtnStyle(gameState.gameMode === mode)}
            onClick={() => handleGameModeChange(mode)}
          >
            {mode === 'single' ? '1️⃣ Single' : mode === 'best-of-3' ? '3️⃣ Best of 3' : '5️⃣ Best of 5'}
          </button>
        ))}
      </div>

      {/* Score Display */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1.5em', 
        marginBottom: '1em',
        flexWrap: 'wrap' 
      }}>
        <div style={{ 
          padding: '0.6em 1.2em', 
          background: 'rgba(46, 204, 113, 0.2)', 
          borderRadius: 10,
          border: '1px solid rgba(46, 204, 113, 0.3)'
        }}>
          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>You</div>
          <div style={{ fontSize: '1.8em', fontWeight: 700 }}>{gameState.scores.player}</div>
        </div>
        <div style={{ 
          padding: '0.6em 1.2em', 
          background: 'rgba(241, 196, 15, 0.2)', 
          borderRadius: 10,
          border: '1px solid rgba(241, 196, 15, 0.3)'
        }}>
          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Ties</div>
          <div style={{ fontSize: '1.8em', fontWeight: 700 }}>{gameState.scores.ties}</div>
        </div>
        <div style={{ 
          padding: '0.6em 1.2em', 
          background: 'rgba(231, 76, 60, 0.2)', 
          borderRadius: 10,
          border: '1px solid rgba(231, 76, 60, 0.3)'
        }}>
          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>AI</div>
          <div style={{ fontSize: '1.8em', fontWeight: 700 }}>{gameState.scores.ai}</div>
        </div>
      </div>

      {/* Streak Display */}
      {gameState.bestStreak > 0 && (
        <div style={{ marginBottom: '1em', fontSize: '0.9em' }}>
          <span style={{ marginRight: '1em' }}>
            🔥 Current Streak: <strong>{gameState.streak}</strong>
          </span>
          <span>
            🏆 Best Streak: <strong>{gameState.bestStreak}</strong>
          </span>
        </div>
      )}

      {/* Game Mode Info */}
      {gameState.gameMode !== 'single' && !gameState.matchWinner && (
        <div style={{ marginBottom: '1em', opacity: 0.8 }}>
          First to {gameState.roundsToWin} wins! 
          (Round {Math.min(gameState.currentRound, gameState.roundsToWin * 2 - 1)})
        </div>
      )}

      {/* Result Card */}
      <div style={resultCardStyle}>
        {/* Countdown / Animation */}
        {showAnimation && countdown !== null && (
          <div style={{ 
            fontSize: '4em', 
            fontWeight: 800,
            color: '#f1c40f',
            marginBottom: '0.5em'
          }}>
            {countdown}
          </div>
        )}

        {showAnimation && countdown === null && (
          <div style={{ fontSize: '4em' }} className="shake-animation">
            ✊
          </div>
        )}

        {/* Result Display */}
        {!showAnimation && gameState.result && (
          <div className="fade-in">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '1em'
            }}>
              <div style={choiceDisplayStyle(true, gameState.result === 'win')}>
                {getChoiceEmoji(gameState.playerChoice)}
              </div>
              <span style={vsStyle}>VS</span>
              <div style={choiceDisplayStyle(true, gameState.result === 'lose')}>
                {getChoiceEmoji(gameState.aiChoice)}
              </div>
            </div>
            
            <div style={{ marginBottom: '0.5em', fontSize: '0.9em', opacity: 0.8 }}>
              {getChoiceName(gameState.playerChoice)} vs {getChoiceName(gameState.aiChoice)}
            </div>

            <div style={{ 
              fontSize: '1.8em', 
              fontWeight: 700, 
              color: resultInfo.color,
              marginTop: '0.5em'
            }}>
              {resultInfo.text}
            </div>

            {/* Explanation */}
            {gameState.result !== 'tie' && (
              <div style={{ marginTop: '0.5em', fontSize: '0.9em', opacity: 0.8 }}>
                {gameState.result === 'win' 
                  ? `${getChoiceName(gameState.playerChoice)} beats ${getChoiceName(gameState.aiChoice)}!`
                  : `${getChoiceName(gameState.aiChoice)} beats ${getChoiceName(gameState.playerChoice)}!`
                }
              </div>
            )}
          </div>
        )}

        {/* Initial State */}
        {!showAnimation && !gameState.result && (
          <div style={{ fontSize: '1.5em', opacity: 0.8 }}>
            {resultInfo.emoji} {resultInfo.text}
          </div>
        )}
      </div>

      {/* Choice Buttons */}
      {!gameState.matchWinner && (
        <div style={{ marginTop: '1.5em' }}>
          <div style={{ marginBottom: '0.5em', opacity: 0.8 }}>
            Choose your weapon:
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
            {CHOICES.map(choice => (
              <button
                key={choice.id}
                className="choice-btn"
                style={choiceButtonStyle(gameState.isRevealing)}
                onClick={() => handleChoice(choice.id)}
                disabled={gameState.isRevealing}
                title={choice.name}
              >
                {choice.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Match Winner Actions */}
      {gameState.matchWinner && (
        <div style={{ marginTop: '1.5em' }}>
          <button
            style={{
              padding: '1em 2em',
              fontSize: '1.1em',
              fontWeight: 700,
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              marginRight: '0.5em',
            }}
            onClick={() => resetGame(false)}
          >
            🔄 Play Again
          </button>
          <button
            style={{
              padding: '1em 2em',
              fontSize: '1.1em',
              fontWeight: 700,
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
            }}
            onClick={() => resetGame(true)}
          >
            🗑️ Reset All
          </button>
        </div>
      )}

      {/* Round History */}
      {gameState.roundHistory.length > 0 && (
        <div style={{ 
          marginTop: '2em', 
          maxWidth: 400, 
          margin: '2em auto',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 15,
          padding: '1em'
        }}>
          <h3 style={{ marginBottom: '0.5em', fontSize: '1em' }}>📜 Round History</h3>
          <div style={{ 
            maxHeight: 200, 
            overflowY: 'auto',
            fontSize: '0.9em'
          }}>
            {gameState.roundHistory.slice().reverse().map((round, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.4em 0.8em',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span>Round {gameState.roundHistory.length - idx}</span>
                <span>
                  {getChoiceEmoji(round.playerChoice)} vs {getChoiceEmoji(round.aiChoice)}
                </span>
                <span style={{ 
                  color: round.result === 'win' ? '#2ecc71' : round.result === 'lose' ? '#e74c3c' : '#f1c40f',
                  fontWeight: 600
                }}>
                  {round.result === 'win' ? 'WIN' : round.result === 'lose' ? 'LOSE' : 'TIE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Rules */}
      <div style={{ 
        marginTop: '2em', 
        opacity: 0.6, 
        fontSize: '0.85em',
        maxWidth: 400,
        margin: '2em auto 0'
      }}>
        <strong>Rules:</strong> 🪨 Rock crushes ✂️ Scissors • ✂️ Scissors cuts 📄 Paper • 📄 Paper covers 🪨 Rock
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

export default RockPaperScissorsGame;
