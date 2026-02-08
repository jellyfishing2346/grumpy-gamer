/**
 * useGameStats Hook
 *
 * A React hook for tracking game statistics within game components.
 * Provides easy-to-use methods to start tracking, record moves, and end games.
 */

import { useRef, useCallback, useEffect } from "react";
import { recordGame, GameType, GameResult, GameMetadata } from "../services/gameStatsService";

interface UseGameStatsOptions {
  gameType: GameType;
  opponentType?: "ai" | "human" | "self";
  aiDifficulty?: string;
  autoTrack?: boolean; // If true, automatically starts tracking on mount
}

interface UseGameStatsReturn {
  startTracking: () => void;
  incrementMoves: () => void;
  endGame: (result: GameResult, metadata?: GameMetadata, score?: number) => Promise<void>;
  getMoves: () => number;
  getElapsedSeconds: () => number;
  isTracking: () => boolean;
}

export function useGameStats(options: UseGameStatsOptions): UseGameStatsReturn {
  const { gameType, opponentType = "ai", aiDifficulty, autoTrack = false } = options;

  const startTimeRef = useRef<number | null>(null);
  const movesRef = useRef<number>(0);
  const hasEndedRef = useRef<boolean>(false);

  const startTracking = useCallback(() => {
    startTimeRef.current = Date.now();
    movesRef.current = 0;
    hasEndedRef.current = false;
  }, []);

  const incrementMoves = useCallback(() => {
    movesRef.current += 1;
  }, []);

  const getElapsedSeconds = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  const getMoves = useCallback(() => {
    return movesRef.current;
  }, []);

  const isTracking = useCallback(() => {
    return startTimeRef.current !== null && !hasEndedRef.current;
  }, []);

  const endGame = useCallback(
    async (result: GameResult, metadata?: GameMetadata, score?: number) => {
      // Prevent double recording
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;

      // Only record if we were tracking
      if (!startTimeRef.current) return;

      try {
        await recordGame({
          gameType,
          result,
          movesCount: movesRef.current,
          durationSeconds: getElapsedSeconds(),
          score,
          opponentType,
          aiDifficulty,
          metadata,
        });
      } catch (error) {
        console.error("Failed to record game stats:", error);
      }

      // Reset tracking state
      startTimeRef.current = null;
      movesRef.current = 0;
    },
    [gameType, opponentType, aiDifficulty, getElapsedSeconds]
  );

  // Auto-start tracking if enabled
  useEffect(() => {
    if (autoTrack) {
      startTracking();
    }
  }, [autoTrack, startTracking]);

  return {
    startTracking,
    incrementMoves,
    endGame,
    getMoves,
    getElapsedSeconds,
    isTracking,
  };
}

export default useGameStats;
