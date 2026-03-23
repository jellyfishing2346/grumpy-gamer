/**
 * Game Statistics Service
 *
 * Provides methods to track game activity, record results,
 * and retrieve statistics from the backend.
 */

import API_URL from '../config/api';

// Types
export type GameType =
  | 'tictactoe'
  | 'connectfour'
  | 'checkers'
  | 'chess'
  | 'minesweeper'
  | 'othello'
  | '2048'
  | 'wordle'
  | 'snake'
  | 'memory'
  | 'hangman'
  | 'sudoku'
  | 'rockpaperscissors';

export type GameResult = 'win' | 'loss' | 'draw' | 'abandoned';

export interface GameMetadata {
  maxTile?: number; // For 2048
  piecesCapture?: number; // For chess/checkers
  bombsHit?: number; // For minesweeper
  wordGuessed?: string; // For wordle
  hintsUsed?: number;
  [key: string]: unknown;
}

export interface RecordGameParams {
  gameType: GameType;
  result: GameResult;
  movesCount?: number;
  durationSeconds?: number;
  score?: number;
  opponentType?: 'ai' | 'human' | 'self';
  aiDifficulty?: string;
  metadata?: GameMetadata;
}

export interface LifetimeStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalTimeSeconds: number;
  currentWinStreak: number;
  longestWinStreak: number;
  highestScore: number | null;
  firstPlayed: string;
  lastPlayed: string;
}

export interface DailyStats {
  date: string;
  gameType: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalTimeSeconds: number;
  highScore: number | null;
}

export interface GameStats {
  gameType: string;
  hasPlayed: boolean;
  lifetime: LifetimeStats | null;
  today: DailyStats | null;
  recentGames: GameSession[];
}

export interface GameSession {
  id: number;
  gameType: string;
  startedAt: string;
  endedAt: string;
  result: string;
  opponentType: string;
  aiDifficulty: string | null;
  movesCount: number;
  durationSeconds: number;
  score: number | null;
  metadata: GameMetadata | null;
}

export interface ActivitySummary {
  periodDays: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalTimeSeconds: number;
  winRate: number;
  dailyBreakdown: Array<{
    activityDate: string;
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    totalTime: number;
  }>;
  gameBreakdown: Array<{
    gameType: string;
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
  }>;
}

export interface AILeaderboardStats {
  game_type: GameType;
  total_games: number;
  ai_wins: number;
  ai_losses: number;
  ai_draws: number;
  ai_win_rate: number;
  ai_best_win_streak: number;
  ai_fastest_win_seconds: number | null;
}

// Helper to get or generate a user ID
const getUserId = (): string => {
  let userId = localStorage.getItem('grumpy_gamer_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('grumpy_gamer_user_id', userId);
  }
  return userId;
};

// Game timer utility class
export class GameTimer {
  private startTime: number | null = null;
  private movesCount = 0;
  private gameType: GameType;

  constructor(gameType: GameType) {
    this.gameType = gameType;
  }

  start(): void {
    this.startTime = Date.now();
    this.movesCount = 0;
  }

  incrementMoves(): void {
    this.movesCount++;
  }

  getElapsedSeconds(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getMoves(): number {
    return this.movesCount;
  }

  async endGame(result: GameResult, metadata?: GameMetadata): Promise<void> {
    if (!this.startTime) return;

    await recordGame({
      gameType: this.gameType,
      result,
      movesCount: this.movesCount,
      durationSeconds: this.getElapsedSeconds(),
      metadata,
    });

    this.startTime = null;
    this.movesCount = 0;
  }
}

/**
 * Record a completed game result
 */
export async function recordGame(params: RecordGameParams): Promise<{ success: boolean; sessionId?: number }> {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No access token found, skipping game recording');
      return { success: false };
    }
    const response = await fetch(`${API_URL}/api/stats/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        game: params.gameType,
        outcome: params.result,
      }),
    });

    if (!response.ok) {
      console.error('Failed to record game:', response.statusText);
      return { success: false };
    }

    // Dispatch toast event for the UI to pick up
    const outcome = params.result;
    const label = outcome === 'win' ? 'Win recorded! 🏆' : outcome === 'loss' ? 'Loss recorded' : 'Draw recorded';
    window.dispatchEvent(new CustomEvent('game-recorded', { detail: { outcome, label } }));
    return { success: true };
  } catch (error) {
    console.error('Error recording game:', error);
    return { success: false };
  }
}

/**
 * Get statistics for a specific game
 */
export async function getGameStats(gameType: GameType): Promise<GameStats | null> {
  try {
    const userId = getUserId();
    const response = await fetch(
      `${API_URL}/api/stats/game/${gameType}?user_id=${encodeURIComponent(userId)}`
    );

    if (!response.ok) {
      console.error('Failed to fetch game stats:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      gameType: data.game_type,
      hasPlayed: data.has_played,
      lifetime: data.lifetime ? {
        totalGames: data.lifetime.total_games,
        wins: data.lifetime.wins,
        losses: data.lifetime.losses,
        draws: data.lifetime.draws,
        winRate: data.lifetime.win_rate,
        totalTimeSeconds: data.lifetime.total_time_seconds,
        currentWinStreak: data.lifetime.current_win_streak,
        longestWinStreak: data.lifetime.longest_win_streak,
        highestScore: data.lifetime.highest_score,
        firstPlayed: data.lifetime.first_played,
        lastPlayed: data.lifetime.last_played,
      } : null,
      today: data.today ? {
        date: data.today.activity_date,
        gameType: data.today.game_type,
        gamesPlayed: data.today.games_played,
        wins: data.today.wins,
        losses: data.today.losses,
        draws: data.today.draws,
        totalTimeSeconds: data.today.total_time_seconds,
        highScore: data.today.high_score,
      } : null,
      recentGames: data.recent_games || [],
    };
  } catch (error) {
    console.error('Error fetching game stats:', error);
    return null;
  }
}

/**
 * Get daily statistics
 */
export async function getDailyStats(date?: string, gameType?: GameType): Promise<DailyStats[]> {
  try {
    const userId = getUserId();
    const params = new URLSearchParams({ user_id: userId });
    if (date) params.append('date', date);
    if (gameType) params.append('game_type', gameType);

    const response = await fetch(`${API_URL}/api/stats/daily?${params.toString()}`);

    if (!response.ok) {
      console.error('Failed to fetch daily stats:', response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.stats || []).map((stat: Record<string, unknown>) => ({
      date: stat.activity_date,
      gameType: stat.game_type,
      gamesPlayed: stat.games_played,
      wins: stat.wins,
      losses: stat.losses,
      draws: stat.draws,
      totalTimeSeconds: stat.total_time_seconds,
      highScore: stat.high_score,
    }));
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return [];
  }
}

/**
 * Get lifetime statistics for all games
 */
export async function getLifetimeStats(gameType?: GameType): Promise<LifetimeStats[]> {
  try {
    const userId = getUserId();
    const params = new URLSearchParams({ user_id: userId });
    if (gameType) params.append('game_type', gameType);

    const response = await fetch(`${API_URL}/api/stats/lifetime?${params.toString()}`);

    if (!response.ok) {
      console.error('Failed to fetch lifetime stats:', response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.stats || []).map((stat: Record<string, unknown>) => {
      const totalGames = stat.total_games as number;
      const totalWins = stat.total_wins as number;
      return {
        gameType: stat.game_type,
        totalGames,
        wins: totalWins,
        losses: stat.total_losses,
        draws: stat.total_draws,
        winRate: totalGames > 0 ? (totalWins / totalGames * 100) : 0,
        totalTimeSeconds: stat.total_time_seconds,
        currentWinStreak: stat.current_win_streak,
        longestWinStreak: stat.longest_win_streak,
        highestScore: stat.highest_score,
        firstPlayed: stat.first_played_at,
        lastPlayed: stat.last_played_at,
      };
    });
  } catch (error) {
    console.error('Error fetching lifetime stats:', error);
    return [];
  }
}

/**
 * Get recent games
 */
export async function getRecentGames(limit = 10, gameType?: GameType): Promise<GameSession[]> {
  try {
    const userId = getUserId();
    const params = new URLSearchParams({
      user_id: userId,
      limit: limit.toString(),
    });
    if (gameType) params.append('game_type', gameType);

    const response = await fetch(`${API_URL}/api/stats/recent?${params.toString()}`);

    if (!response.ok) {
      console.error('Failed to fetch recent games:', response.statusText);
      return [];
    }

    const data = await response.json();
    return (data.games || []).map((game: Record<string, unknown>) => ({
      id: game.id,
      gameType: game.game_type,
      startedAt: game.started_at,
      endedAt: game.ended_at,
      result: game.result,
      opponentType: game.opponent_type,
      aiDifficulty: game.ai_difficulty,
      movesCount: game.moves_count,
      durationSeconds: game.duration_seconds,
      score: game.score,
      metadata: game.metadata,
    }));
  } catch (error) {
    console.error('Error fetching recent games:', error);
    return [];
  }
}

/**
 * Get activity summary for the last N days
 */
export async function getActivitySummary(days = 7): Promise<ActivitySummary | null> {
  try {
    const userId = getUserId();
    const response = await fetch(
      `${API_URL}/api/stats/summary?user_id=${encodeURIComponent(userId)}&days=${days}`
    );

    if (!response.ok) {
      console.error('Failed to fetch activity summary:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      periodDays: data.period_days,
      totalGames: data.total_games,
      totalWins: data.total_wins,
      totalLosses: data.total_losses,
      totalDraws: data.total_draws,
      totalTimeSeconds: data.total_time_seconds,
      winRate: data.win_rate,
      dailyBreakdown: (data.daily_breakdown || []).map((d: Record<string, unknown>) => ({
        activityDate: d.activity_date,
        totalGames: d.total_games,
        totalWins: d.total_wins,
        totalLosses: d.total_losses,
        totalDraws: d.total_draws,
        totalTime: d.total_time,
      })),
      gameBreakdown: (data.game_breakdown || []).map((g: Record<string, unknown>) => ({
        gameType: g.game_type,
        totalGames: g.total_games,
        wins: g.wins,
        losses: g.losses,
        draws: g.draws,
      })),
    };
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    return null;
  }
}

/**
 * Format seconds as human-readable duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Get display name for a game type
 */
export function getGameDisplayName(gameType: GameType): string {
  const names: Record<GameType, string> = {
    tictactoe: 'Tic-Tac-Toe',
    connectfour: 'Connect Four',
    checkers: 'Checkers',
    chess: 'Chess',
    minesweeper: 'Minesweeper',
    othello: 'Othello',
    '2048': '2048',
    wordle: 'Wordle',
    snake: 'Snake',
    memory: 'Memory',
    hangman: 'Hangman',
    sudoku: 'Sudoku',
    rockpaperscissors: 'Rock Paper Scissors',
  };
  return names[gameType] || gameType;
}

const gameStatsService = {
  recordGame,
  getGameStats,
  getDailyStats,
  getLifetimeStats,
  getRecentGames,
  getActivitySummary,
  formatDuration,
  getGameDisplayName,
  GameTimer,
};

export default gameStatsService;

export async function getAILeaderboardStats(gameType: GameType): Promise<AILeaderboardStats | null> {
  try {
    const response = await fetch(`${API_URL}/api/stats/ai/${gameType}`);
    if (!response.ok) {
      console.error('Failed to fetch AI leaderboard stats:', response.statusText);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching AI leaderboard stats:', error);
    return null;
  }
}
