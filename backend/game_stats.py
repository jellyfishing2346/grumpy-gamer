"""
Game Statistics and Activity Tracking

This module provides database models and utilities for tracking
player game activity, wins, losses, and other statistics.
"""

import sqlite3
import json
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
from pathlib import Path

# Database file path
DB_PATH = Path(__file__).parent / "game_stats.db"


@contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_database():
    """Initialize the game statistics database."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Game sessions table - records each game played
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                game_type TEXT NOT NULL,
                started_at TIMESTAMP NOT NULL,
                ended_at TIMESTAMP,
                result TEXT,  -- 'win', 'loss', 'draw', 'abandoned'
                opponent_type TEXT,  -- 'ai', 'human', 'self'
                ai_difficulty TEXT,  -- 'easy', 'medium', 'hard', 'rl'
                moves_count INTEGER DEFAULT 0,
                duration_seconds INTEGER,
                score INTEGER,
                metadata TEXT,  -- JSON for game-specific data
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Daily activity summary table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS daily_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                activity_date DATE NOT NULL,
                game_type TEXT NOT NULL,
                games_played INTEGER DEFAULT 0,
                wins INTEGER DEFAULT 0,
                losses INTEGER DEFAULT 0,
                draws INTEGER DEFAULT 0,
                total_time_seconds INTEGER DEFAULT 0,
                total_moves INTEGER DEFAULT 0,
                high_score INTEGER,
                best_time_seconds INTEGER,
                streak_count INTEGER DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, activity_date, game_type)
            )
        """)

        # Lifetime stats table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lifetime_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                game_type TEXT NOT NULL,
                total_games INTEGER DEFAULT 0,
                total_wins INTEGER DEFAULT 0,
                total_losses INTEGER DEFAULT 0,
                total_draws INTEGER DEFAULT 0,
                total_time_seconds INTEGER DEFAULT 0,
                total_moves INTEGER DEFAULT 0,
                highest_score INTEGER,
                best_time_seconds INTEGER,
                longest_win_streak INTEGER DEFAULT 0,
                current_win_streak INTEGER DEFAULT 0,
                longest_loss_streak INTEGER DEFAULT 0,
                current_loss_streak INTEGER DEFAULT 0,
                first_played_at TIMESTAMP,
                last_played_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, game_type)
            )
        """)

        # Achievements table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                achievement_id TEXT NOT NULL,
                game_type TEXT,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                UNIQUE(user_id, achievement_id)
            )
        """)

        conn.commit()


# Initialize database on module load
init_database()



class GameStatsManager:
    """Manager class for game statistics operations."""

    def delete_user_data(self):
        """Delete all game stats and achievements for this user."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM game_sessions WHERE user_id = ?", (self.user_id,))
            cursor.execute("DELETE FROM daily_activity WHERE user_id = ?", (self.user_id,))
            cursor.execute("DELETE FROM lifetime_stats WHERE user_id = ?", (self.user_id,))
            cursor.execute("DELETE FROM achievements WHERE user_id = ?", (self.user_id,))
            conn.commit()

    VALID_GAMES = [
        'tictactoe', 'connectfour', 'checkers', 'chess',
        'minesweeper', 'othello', '2048', 'wordle', 'snake', 'memory'
    ]

    VALID_RESULTS = ['win', 'loss', 'draw', 'abandoned']

    def __init__(self, user_id: str = "anonymous"):
        self.user_id = user_id

    def start_session(
        self,
        game_type: str,
        opponent_type: str = "ai",
        ai_difficulty: Optional[str] = None
    ) -> int:
        """Start a new game session and return the session ID."""
        if game_type not in self.VALID_GAMES:
            raise ValueError(f"Invalid game type: {game_type}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO game_sessions
                (user_id, game_type, started_at, opponent_type, ai_difficulty)
                VALUES (?, ?, ?, ?, ?)
            """, (self.user_id, game_type, datetime.now(), opponent_type, ai_difficulty))
            conn.commit()
            return cursor.lastrowid

    def end_session(
        self,
        session_id: int,
        result: str,
        moves_count: int = 0,
        score: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """End a game session and update statistics."""
        if result not in self.VALID_RESULTS:
            raise ValueError(f"Invalid result: {result}")

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Get session info
            cursor.execute(
                "SELECT * FROM game_sessions WHERE id = ?",
                (session_id,)
            )
            session = cursor.fetchone()

            if not session:
                raise ValueError(f"Session not found: {session_id}")

            ended_at = datetime.now()
            started_at = datetime.fromisoformat(session['started_at'])
            duration = int((ended_at - started_at).total_seconds())

            # Update session
            cursor.execute("""
                UPDATE game_sessions
                SET ended_at = ?, result = ?, moves_count = ?,
                    duration_seconds = ?, score = ?, metadata = ?
                WHERE id = ?
            """, (
                ended_at, result, moves_count, duration, score,
                json.dumps(metadata) if metadata else None, session_id
            ))

            # Update daily activity
            self._update_daily_activity(
                conn, session['game_type'], result, duration, moves_count, score
            )

            # Update lifetime stats
            self._update_lifetime_stats(
                conn, session['game_type'], result, duration, moves_count, score
            )

            conn.commit()

            return {
                "session_id": session_id,
                "result": result,
                "duration_seconds": duration,
                "moves_count": moves_count
            }

    def record_game(
        self,
        game_type: str,
        result: str,
        moves_count: int = 0,
        duration_seconds: int = 0,
        score: Optional[int] = None,
        opponent_type: str = "ai",
        ai_difficulty: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Record a completed game in a single call."""
        if game_type not in self.VALID_GAMES:
            raise ValueError(f"Invalid game type: {game_type}")
        if result not in self.VALID_RESULTS:
            raise ValueError(f"Invalid result: {result}")

        now = datetime.now()

        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Insert game session
            cursor.execute("""
                INSERT INTO game_sessions
                (user_id, game_type, started_at, ended_at, result,
                 opponent_type, ai_difficulty, moves_count, duration_seconds,
                 score, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                self.user_id, game_type, now, now, result,
                opponent_type, ai_difficulty, moves_count, duration_seconds,
                score, json.dumps(metadata) if metadata else None
            ))

            session_id = cursor.lastrowid

            # Update daily activity
            self._update_daily_activity(
                conn, game_type, result, duration_seconds, moves_count, score
            )

            # Update lifetime stats
            self._update_lifetime_stats(
                conn, game_type, result, duration_seconds, moves_count, score
            )

            conn.commit()

            return {
                "session_id": session_id,
                "result": result,
                "duration_seconds": duration_seconds,
                "moves_count": moves_count
            }

    def _update_daily_activity(
        self,
        conn: sqlite3.Connection,
        game_type: str,
        result: str,
        duration: int,
        moves: int,
        score: Optional[int]
    ):
        """Update daily activity summary."""
        cursor = conn.cursor()
        today = date.today().isoformat()

        # Try to update existing record
        cursor.execute("""
            INSERT INTO daily_activity
            (user_id, activity_date, game_type, games_played,
             wins, losses, draws, total_time_seconds, total_moves)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, activity_date, game_type)
            DO UPDATE SET
                games_played = games_played + 1,
                wins = wins + excluded.wins,
                losses = losses + excluded.losses,
                draws = draws + excluded.draws,
                total_time_seconds = total_time_seconds + excluded.total_time_seconds,
                total_moves = total_moves + excluded.total_moves,
                high_score = CASE
                    WHEN excluded.high_score IS NOT NULL AND
                         (high_score IS NULL OR excluded.high_score > high_score)
                    THEN excluded.high_score
                    ELSE high_score
                END,
                updated_at = CURRENT_TIMESTAMP
        """, (
            self.user_id, today, game_type,
            1 if result == 'win' else 0,
            1 if result == 'loss' else 0,
            1 if result == 'draw' else 0,
            duration, moves
        ))

        # Update high score separately if provided
        if score is not None:
            cursor.execute("""
                UPDATE daily_activity
                SET high_score = CASE
                    WHEN high_score IS NULL OR ? > high_score THEN ?
                    ELSE high_score
                END
                WHERE user_id = ? AND activity_date = ? AND game_type = ?
            """, (score, score, self.user_id, today, game_type))

    def _update_lifetime_stats(
        self,
        conn: sqlite3.Connection,
        game_type: str,
        result: str,
        duration: int,
        moves: int,
        score: Optional[int]
    ):
        """Update lifetime statistics."""
        cursor = conn.cursor()
        now = datetime.now()

        # Get current stats for streak calculation
        cursor.execute("""
            SELECT current_win_streak, current_loss_streak,
                   longest_win_streak, longest_loss_streak
            FROM lifetime_stats
            WHERE user_id = ? AND game_type = ?
        """, (self.user_id, game_type))
        current = cursor.fetchone()

        # Calculate new streaks
        if current:
            win_streak = current['current_win_streak']
            loss_streak = current['current_loss_streak']
            longest_win = current['longest_win_streak']
            longest_loss = current['longest_loss_streak']
        else:
            win_streak = loss_streak = longest_win = longest_loss = 0

        if result == 'win':
            win_streak += 1
            loss_streak = 0
            longest_win = max(longest_win, win_streak)
        elif result == 'loss':
            loss_streak += 1
            win_streak = 0
            longest_loss = max(longest_loss, loss_streak)
        else:
            win_streak = loss_streak = 0

        # Insert or update lifetime stats
        cursor.execute("""
            INSERT INTO lifetime_stats
            (user_id, game_type, total_games, total_wins, total_losses,
             total_draws, total_time_seconds, total_moves,
             current_win_streak, current_loss_streak,
             longest_win_streak, longest_loss_streak,
             first_played_at, last_played_at)
            VALUES (?, ?, 1, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, game_type)
            DO UPDATE SET
                total_games = total_games + 1,
                total_wins = total_wins + excluded.total_wins,
                total_losses = total_losses + excluded.total_losses,
                total_draws = total_draws + excluded.total_draws,
                total_time_seconds = total_time_seconds + excluded.total_time_seconds,
                total_moves = total_moves + excluded.total_moves,
                current_win_streak = ?,
                current_loss_streak = ?,
                longest_win_streak = ?,
                longest_loss_streak = ?,
                highest_score = CASE
                    WHEN ? IS NOT NULL AND
                         (highest_score IS NULL OR ? > highest_score)
                    THEN ?
                    ELSE highest_score
                END,
                last_played_at = ?,
                updated_at = CURRENT_TIMESTAMP
        """, (
            self.user_id, game_type,
            1 if result == 'win' else 0,
            1 if result == 'loss' else 0,
            1 if result == 'draw' else 0,
            duration, moves,
            win_streak, loss_streak, longest_win, longest_loss,
            now, now,
            win_streak, loss_streak, longest_win, longest_loss,
            score, score, score, now
        ))

    def get_daily_stats(
        self,
        activity_date: Optional[str] = None,
        game_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get daily activity statistics."""
        if activity_date is None:
            activity_date = date.today().isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT * FROM daily_activity
                WHERE user_id = ? AND activity_date = ?
            """
            params = [self.user_id, activity_date]

            if game_type:
                query += " AND game_type = ?"
                params.append(game_type)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            return [dict(row) for row in rows]

    def get_lifetime_stats(
        self,
        game_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get lifetime statistics."""
        with get_db_connection() as conn:
            cursor = conn.cursor()

            if game_type:
                cursor.execute("""
                    SELECT * FROM lifetime_stats
                    WHERE user_id = ? AND game_type = ?
                """, (self.user_id, game_type))
            else:
                cursor.execute("""
                    SELECT * FROM lifetime_stats
                    WHERE user_id = ?
                """, (self.user_id,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_recent_games(
        self,
        limit: int = 10,
        game_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get recent game sessions."""
        with get_db_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT * FROM game_sessions
                WHERE user_id = ?
            """
            params = [self.user_id]

            if game_type:
                query += " AND game_type = ?"
                params.append(game_type)

            query += " ORDER BY started_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

            results = []
            for row in rows:
                result = dict(row)
                if result.get('metadata'):
                    result['metadata'] = json.loads(result['metadata'])
                results.append(result)

            return results

    def get_activity_summary(
        self,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get activity summary for the last N days."""
        with get_db_connection() as conn:
            cursor = conn.cursor()

            # Get daily totals
            cursor.execute("""
                SELECT
                    activity_date,
                    SUM(games_played) as total_games,
                    SUM(wins) as total_wins,
                    SUM(losses) as total_losses,
                    SUM(draws) as total_draws,
                    SUM(total_time_seconds) as total_time
                FROM daily_activity
                WHERE user_id = ?
                  AND activity_date >= date('now', ?)
                GROUP BY activity_date
                ORDER BY activity_date DESC
            """, (self.user_id, f'-{days} days'))

            daily_data = [dict(row) for row in cursor.fetchall()]

            # Get per-game breakdown
            cursor.execute("""
                SELECT
                    game_type,
                    SUM(games_played) as total_games,
                    SUM(wins) as wins,
                    SUM(losses) as losses,
                    SUM(draws) as draws
                FROM daily_activity
                WHERE user_id = ?
                  AND activity_date >= date('now', ?)
                GROUP BY game_type
                ORDER BY total_games DESC
            """, (self.user_id, f'-{days} days'))

            game_breakdown = [dict(row) for row in cursor.fetchall()]

            # Calculate totals
            total_games = sum(d['total_games'] for d in daily_data)
            total_wins = sum(d['total_wins'] for d in daily_data)
            total_time = sum(d['total_time'] or 0 for d in daily_data)

            return {
                "period_days": days,
                "total_games": total_games,
                "total_wins": total_wins,
                "total_losses": sum(d['total_losses'] for d in daily_data),
                "total_draws": sum(d['total_draws'] for d in daily_data),
                "total_time_seconds": total_time,
                "win_rate": (total_wins / total_games * 100) if total_games > 0 else 0,
                "daily_breakdown": daily_data,
                "game_breakdown": game_breakdown
            }

    def get_game_specific_stats(self, game_type: str) -> Dict[str, Any]:
        """Get detailed statistics for a specific game."""
        lifetime = self.get_lifetime_stats(game_type)
        recent = self.get_recent_games(limit=10, game_type=game_type)
        today = self.get_daily_stats(game_type=game_type)

        if not lifetime:
            return {
                "game_type": game_type,
                "has_played": False,
                "lifetime": None,
                "today": None,
                "recent_games": []
            }

        stats = lifetime[0]
        win_rate = 0
        if stats['total_games'] > 0:
            win_rate = stats['total_wins'] / stats['total_games'] * 100

        return {
            "game_type": game_type,
            "has_played": True,
            "lifetime": {
                "total_games": stats['total_games'],
                "wins": stats['total_wins'],
                "losses": stats['total_losses'],
                "draws": stats['total_draws'],
                "win_rate": round(win_rate, 1),
                "total_time_seconds": stats['total_time_seconds'],
                "current_win_streak": stats['current_win_streak'],
                "longest_win_streak": stats['longest_win_streak'],
                "highest_score": stats['highest_score'],
                "first_played": stats['first_played_at'],
                "last_played": stats['last_played_at']
            },
            "today": today[0] if today else None,
            "recent_games": recent
        }
