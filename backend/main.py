from typing import Dict, Any
import sqlite3

# Lazy import for game_stats to handle sqlite3 compatibility issues
_game_stats_manager = None
_game_stats_available = True


def get_game_stats_manager(user_id: str = "anonymous"):
    """Lazy load GameStatsManager to handle sqlite3 import errors."""
    global _game_stats_available
    if not _game_stats_available:
        return None
    try:
        from game_stats import GameStatsManager
        return GameStatsManager(user_id)
    except ImportError as e:
        print(f"Game stats not available: {e}")
        _game_stats_available = False
        return None


def get_ai_leaderboard_stats(game_type: str) -> Dict[str, Any]:
    """
    Aggregate AI stats for the leaderboard for a specific game across all users.
    """
    from pathlib import Path
    DB_PATH = Path(__file__).parent / "game_stats.db"
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Only consider games where opponent_type is 'ai'
    cursor.execute(
        (
            "SELECT result, duration_seconds FROM game_sessions "
            "WHERE game_type = ? AND opponent_type = 'ai' "
            "AND result IN ('win', 'loss', 'draw')"
        ),
        (game_type,)
    )
    rows = cursor.fetchall()
    total_games = len(rows)
    ai_wins = sum(1 for r in rows if r['result'] == 'loss')  # AI wins when user loses
    ai_draws = sum(1 for r in rows if r['result'] == 'draw')
    ai_losses = sum(1 for r in rows if r['result'] == 'win')
    win_rate = (ai_wins / total_games * 100) if total_games > 0 else 0
    # Best streak: max consecutive AI wins (user losses)
    streak = 0
    max_streak = 0
    for r in rows:
        if r['result'] == 'loss':
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 0
    fastest_win = min(
        (
            r['duration_seconds']
            for r in rows
            if r['result'] == 'loss' and r['duration_seconds'] is not None
        ),
        default=None
    )
    conn.close()
    return {
        "game_type": game_type,
        "total_games": total_games,
        "ai_wins": ai_wins,
        "ai_losses": ai_losses,
        "ai_draws": ai_draws,
        "ai_win_rate": round(win_rate, 1),
        "ai_best_win_streak": max_streak,
        "ai_fastest_win_seconds": fastest_win
    }
