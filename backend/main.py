from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import os

# Import auth router
from auth import auth_router

# Lazy import for game_stats to handle sqlite3 compatibility issues
_game_stats_manager = None
_game_stats_available = True
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
    cursor.execute('''
        SELECT result, duration_seconds
        FROM game_sessions
        WHERE game_type = ? AND opponent_type = 'ai' AND result IN ('win', 'loss', 'draw')
    ''', (game_type,))
    rows = cursor.fetchall()
    total_games = len(rows)
    ai_wins = sum(1 for r in rows if r['result'] == 'loss')  # AI wins when user loses
    ai_draws = sum(1 for r in rows if r['result'] == 'draw')
    ai_losses = sum(1 for r in rows if r['result'] == 'win')
    win_rate = (ai_wins / total_games * 100) if total_games > 0 else 0
    # Best streak: max consecutive AI wins
    # For simplicity, we count max consecutive user losses
    streak = 0
    max_streak = 0
    for r in rows:
        if r['result'] == 'loss':
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 0
    # Fastest win: min duration_seconds for AI win
    fastest_win = min((r['duration_seconds'] for r in rows if r['result'] == 'loss' and r['duration_seconds'] is not None), default=None)
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



app = FastAPI(title="Grumpy Gamer API", version="1.0.0")

# Endpoint: AI leaderboard stats for a specific game
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
    cursor.execute('''
        SELECT result, duration_seconds
        FROM game_sessions
        WHERE game_type = ? AND opponent_type = 'ai' AND result IN ('win', 'loss', 'draw')
    ''', (game_type,))
    rows = cursor.fetchall()
    total_games = len(rows)
    ai_wins = sum(1 for r in rows if r['result'] == 'loss')  # AI wins when user loses
    ai_draws = sum(1 for r in rows if r['result'] == 'draw')
    ai_losses = sum(1 for r in rows if r['result'] == 'win')
    win_rate = (ai_wins / total_games * 100) if total_games > 0 else 0
    # Best streak: max consecutive AI wins
    # For simplicity, we count max consecutive user losses
    streak = 0
    max_streak = 0
    for r in rows:
        if r['result'] == 'loss':
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            streak = 0
    # Fastest win: min duration_seconds for AI win
    fastest_win = min((r['duration_seconds'] for r in rows if r['result'] == 'loss' and r['duration_seconds'] is not None), default=None)
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

@app.get("/api/stats/ai/{game_type}")
def get_ai_stats(game_type: str):
    """
    Get dynamic AI leaderboard stats for a specific game across all users.
    """
    try:
        stats = get_ai_leaderboard_stats(game_type)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching AI stats: {e}")

# Include auth router
app.include_router(auth_router, prefix="/api")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000", "https://grumpy-gamer.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Models ==========

class TicTacToeMoveRequest(BaseModel):
    board: List[List[int]]  # 3x3 board: 0=empty, 1=player, 2=AI
    difficulty: Optional[str] = "hard"  # easy, medium, hard


class TicTacToeMoveResponse(BaseModel):
    row: int
    col: int
    is_rl_model: bool  # True if using trained RL model, False if fallback


class ConnectFourMoveRequest(BaseModel):
    board: List[List[int]]  # 6x7 board: 0=empty, 1=player, 2=AI


class ConnectFourMoveResponse(BaseModel):
    column: int
    is_rl_model: bool


class CheckersMoveRequest(BaseModel):
    # 8x8 board: 0=empty, 1=red regular, 2=red king, 3=black regular, 4=black king
    board: List[List[int]]


class CheckersMoveResponse(BaseModel):
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    captures: List[List[int]]  # List of [row, col] positions
    is_kinging: bool
    is_rl_model: bool


class ChessMoveRequest(BaseModel):
    board: List[List[int]]  # 8x8: 0=empty, 1-6=white pieces, 7-12=black pieces


class ChessMoveResponse(BaseModel):
    from_row: int
    from_col: int
    to_row: int
    to_col: int
    is_rl_model: bool


class RLStatusResponse(BaseModel):
    model_trained: bool
    model_path: Optional[str]
    fallback_available: bool


class OthelloMoveRequest(BaseModel):
    board: List[List[int]]  # 8x8 board: 0=empty, 1=black, -1=white
    player: Optional[int] = 1  # Which player the AI plays as (1=black, -1=white)


class OthelloMoveResponse(BaseModel):
    position: int  # Flattened position (0-63), -1 for pass
    row: int
    col: int
    is_rl_model: bool


class Game2048MoveRequest(BaseModel):
    board: List[List[int]]  # 4x4 board with tile values (0 for empty)


class Game2048MoveResponse(BaseModel):
    direction: int  # 0=up, 1=right, 2=down, 3=left
    direction_name: str  # "up", "right", "down", "left"
    is_rl_model: bool


# ========== RL Agent Setup ==========

# Lazy loading of RL agent to avoid import errors if dependencies not installed
_rl_agent = None
_connectfour_agent = None


def get_rl_agent():
    global _rl_agent
    if _rl_agent is None:
        try:
            from rl.agents.tictactoe_agent import TicTacToeRLAgent
            _rl_agent = TicTacToeRLAgent()
            # Try to load the best trained model
            model_path = os.path.join(
                os.path.dirname(__file__), "rl", "models", "tictactoe_best.zip"
            )
            if os.path.exists(model_path):
                _rl_agent.load_model(model_path)
        except ImportError as e:
            print(f"RL dependencies not installed: {e}")
            _rl_agent = None
    return _rl_agent


def get_connectfour_agent():
    global _connectfour_agent
    if _connectfour_agent is None:
        try:
            from rl.agents.connectfour_agent import ConnectFourRLAgent
            _connectfour_agent = ConnectFourRLAgent()
            # Try to load the best trained model
            model_path = os.path.join(
                os.path.dirname(__file__), "rl", "models", "connectfour_best.zip"
            )
            if os.path.exists(model_path):
                _connectfour_agent.load_model(model_path)
        except ImportError as e:
            print(f"RL dependencies not installed: {e}")
            _connectfour_agent = None
    return _connectfour_agent


# ========== Endpoints ==========

@app.get("/")
def read_root():
    return {"message": "Grumpy Gamer Backend is running!"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}


# ----- Tic-Tac-Toe RL Endpoints -----

@app.post("/api/rl/tictactoe/move", response_model=TicTacToeMoveResponse)
def get_tictactoe_rl_move(request: TicTacToeMoveRequest):
    """
    Get the RL agent's move for Tic-Tac-Toe.
    Uses trained model if available, falls back to Minimax otherwise.
    """
    agent = get_rl_agent()

    if agent is None:
        # No RL dependencies, use simple fallback
        row, col = simple_minimax_move(request.board)
        return TicTacToeMoveResponse(row=row, col=col, is_rl_model=False)

    # Convert board to the format expected by the agent
    board = request.board

    # Get move from RL agent (with Minimax fallback built-in)
    action, used_model = agent.get_action_with_info(board)

    # Convert action (0-8) to row, col
    row = action // 3
    col = action % 3

    return TicTacToeMoveResponse(row=row, col=col, is_rl_model=used_model)


@app.get("/api/rl/tictactoe/status", response_model=RLStatusResponse)
def get_tictactoe_rl_status():
    """
    Check if the RL model is trained and available.
    """
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "tictactoe_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_rl_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True  # Minimax is always available
    )


# ----- Connect Four RL Endpoints -----

@app.post("/api/rl/connectfour/move", response_model=ConnectFourMoveResponse)
def get_connectfour_rl_move(request: ConnectFourMoveRequest):
    """
    Get the RL agent's move for Connect Four.
    Uses trained model if available, falls back to Minimax otherwise.
    """
    agent = get_connectfour_agent()

    if agent is None:
        # No RL dependencies, use simple fallback
        col = simple_connectfour_move(request.board)
        return ConnectFourMoveResponse(column=col, is_rl_model=False)

    # Get move from RL agent (with Minimax fallback built-in)
    action, used_model = agent.get_action_with_info(request.board)

    return ConnectFourMoveResponse(column=action, is_rl_model=used_model)


@app.get("/api/rl/connectfour/status", response_model=RLStatusResponse)
def get_connectfour_rl_status():
    """
    Check if the Connect Four RL model is trained and available.
    """
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "connectfour_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_connectfour_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True
    )


# ----- Checkers RL Endpoints -----

_checkers_agent = None


def get_checkers_agent():
    """Lazy load Checkers RL agent."""
    global _checkers_agent
    if _checkers_agent is None:
        try:
            from rl.agents import CheckersRLAgent
            _checkers_agent = CheckersRLAgent()
        except ImportError as e:
            print(f"Could not load Checkers RL agent: {e}")
            return None
    return _checkers_agent


@app.post("/api/rl/checkers/move", response_model=CheckersMoveResponse)
def get_checkers_rl_move(request: CheckersMoveRequest):
    """
    Get the RL agent's move for Checkers.
    Uses trained model if available, falls back to Minimax otherwise.
    """
    agent = get_checkers_agent()

    if agent is None:
        # No RL dependencies, use simple fallback
        return CheckersMoveResponse(
            from_row=0, from_col=0, to_row=0, to_col=0,
            captures=[], is_kinging=False, is_rl_model=False
        )

    # Get move from RL agent (with Minimax fallback built-in)
    move, used_model = agent.get_action_with_info(request.board)

    if move is None:
        return CheckersMoveResponse(
            from_row=0, from_col=0, to_row=0, to_col=0,
            captures=[], is_kinging=False, is_rl_model=False
        )

    return CheckersMoveResponse(
        from_row=move['from'][0],
        from_col=move['from'][1],
        to_row=move['to'][0],
        to_col=move['to'][1],
        captures=[[c[0], c[1]] for c in move['captures']],
        is_kinging=move.get('is_kinging', False),
        is_rl_model=used_model
    )


@app.get("/api/rl/checkers/status", response_model=RLStatusResponse)
def get_checkers_rl_status():
    """
    Check if the Checkers RL model is trained and available.
    """
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "checkers_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_checkers_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True
    )


# ----- Chess RL Endpoints -----

_chess_agent = None


def get_chess_agent():
    """Lazy load Chess RL agent."""
    global _chess_agent
    if _chess_agent is None:
        try:
            from rl.agents import ChessRLAgent
            _chess_agent = ChessRLAgent()
        except ImportError as e:
            print(f"Could not load Chess RL agent: {e}")
            return None
    return _chess_agent


@app.post("/api/rl/chess/move", response_model=ChessMoveResponse)
def get_chess_rl_move(request: ChessMoveRequest):
    """
    Get the RL agent's move for Chess.
    Uses trained model if available, falls back to Minimax otherwise.
    """
    agent = get_chess_agent()

    if agent is None:
        return ChessMoveResponse(
            from_row=0, from_col=0, to_row=0, to_col=0, is_rl_model=False
        )

    move, used_model = agent.get_action_with_info(request.board)

    if move is None:
        return ChessMoveResponse(
            from_row=0, from_col=0, to_row=0, to_col=0, is_rl_model=False
        )

    return ChessMoveResponse(
        from_row=move['from'][0],
        from_col=move['from'][1],
        to_row=move['to'][0],
        to_col=move['to'][1],
        is_rl_model=used_model
    )


@app.get("/api/rl/chess/status", response_model=RLStatusResponse)
def get_chess_rl_status():
    """Check if the Chess RL model is trained and available."""
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "chess_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_chess_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True
    )


# ----- Minesweeper RL Endpoints -----

class MinesweeperCell(BaseModel):
    state: str  # 'hidden', 'revealed', 'flagged'
    adjacentMines: int = 0


class MinesweeperMoveRequest(BaseModel):
    board: List[List[MinesweeperCell]]
    rows: int = 8
    cols: int = 8


class MinesweeperMoveResponse(BaseModel):
    row: int
    col: int
    is_rl_model: bool
    confidence: str  # 'high', 'medium', 'low'
    safe_cells: List[List[int]]  # Cells that are definitely safe


_minesweeper_agent = None


def get_minesweeper_agent():
    """Lazy load Minesweeper RL agent."""
    global _minesweeper_agent
    if _minesweeper_agent is None:
        try:
            from rl.agents import MinesweeperRLAgent
            _minesweeper_agent = MinesweeperRLAgent()
        except ImportError as e:
            print(f"Could not load Minesweeper RL agent: {e}")
            return None
    return _minesweeper_agent


@app.post("/api/rl/minesweeper/move", response_model=MinesweeperMoveResponse)
def get_minesweeper_rl_move(request: MinesweeperMoveRequest):
    """
    Get the RL agent's move for Minesweeper.
    Uses trained model if available, falls back to rule-based logic otherwise.
    """
    agent = get_minesweeper_agent()

    # Convert board to agent format
    board = []
    for row in request.board:
        board_row = []
        for cell in row:
            board_row.append({
                "state": cell.state,
                "adjacentMines": cell.adjacentMines
            })
        board.append(board_row)

    if agent is None:
        # Simple fallback - pick first hidden cell
        for r in range(request.rows):
            for c in range(request.cols):
                if board[r][c]["state"] == "hidden":
                    return MinesweeperMoveResponse(
                        row=r, col=c, is_rl_model=False,
                        confidence="low", safe_cells=[]
                    )
        return MinesweeperMoveResponse(
            row=0, col=0, is_rl_model=False,
            confidence="low", safe_cells=[]
        )

    # Get detailed action info from agent
    info = agent.get_action_info(board, request.rows, request.cols)

    move = info["recommended_move"]
    safe_cells = [[c[0], c[1]] for c in info["safe_cells"]]

    return MinesweeperMoveResponse(
        row=move[0],
        col=move[1],
        is_rl_model=info["used_rl_model"],
        confidence=info["confidence"],
        safe_cells=safe_cells
    )


@app.get("/api/rl/minesweeper/status", response_model=RLStatusResponse)
def get_minesweeper_rl_status():
    """Check if the Minesweeper RL model is trained and available."""
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "minesweeper_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_minesweeper_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True  # Rule-based logic always available
    )


# ----- Othello RL Endpoints -----

_othello_agent = None


def get_othello_agent():
    """Lazy load Othello RL agent."""
    global _othello_agent
    if _othello_agent is None:
        try:
            from rl.agents import OthelloRLAgent
            _othello_agent = OthelloRLAgent()
        except ImportError as e:
            print(f"Could not load Othello RL agent: {e}")
            return None
    return _othello_agent


@app.post("/api/rl/othello/move", response_model=OthelloMoveResponse)
def get_othello_rl_move(request: OthelloMoveRequest):
    """
    Get the RL agent's move for Othello.
    Uses trained model if available, falls back to Minimax otherwise.
    """
    agent = get_othello_agent()

    if agent is None:
        # No RL dependencies - return pass
        return OthelloMoveResponse(position=-1, row=-1, col=-1, is_rl_model=False)

    # Get move from RL agent
    action, used_model = agent.get_action_with_info(request.board, request.player)

    if action == -1:  # Pass (no valid moves)
        return OthelloMoveResponse(position=-1, row=-1, col=-1, is_rl_model=used_model)

    row = action // 8
    col = action % 8

    return OthelloMoveResponse(position=action, row=row, col=col, is_rl_model=used_model)


@app.get("/api/rl/othello/status", response_model=RLStatusResponse)
def get_othello_rl_status():
    """Check if the Othello RL model is trained and available."""
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "othello_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_othello_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True  # Minimax always available
    )


# ----- 2048 RL Endpoints -----

_game2048_agent = None


def get_game2048_agent():
    """Lazy load 2048 RL agent."""
    global _game2048_agent
    if _game2048_agent is None:
        try:
            from rl.agents import Game2048RLAgent
            _game2048_agent = Game2048RLAgent()
        except ImportError as e:
            print(f"Could not load 2048 RL agent: {e}")
            return None
    return _game2048_agent


@app.post("/api/rl/2048/move", response_model=Game2048MoveResponse)
def get_game2048_rl_move(request: Game2048MoveRequest):
    """
    Get the RL agent's move for 2048.
    Uses trained model if available, falls back to heuristic otherwise.
    """
    direction_names = ["up", "right", "down", "left"]

    agent = get_game2048_agent()

    if agent is None:
        # No RL dependencies - default to up
        return Game2048MoveResponse(direction=0, direction_name="up", is_rl_model=False)

    # Get move from RL agent
    action, used_model = agent.get_action_with_info(request.board)

    return Game2048MoveResponse(
        direction=action,
        direction_name=direction_names[action],
        is_rl_model=used_model
    )


@app.get("/api/rl/2048/status", response_model=RLStatusResponse)
def get_game2048_rl_status():
    """Check if the 2048 RL model is trained and available."""
    model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "game2048_best.zip")
    model_exists = os.path.exists(model_path)

    agent = get_game2048_agent()

    return RLStatusResponse(
        model_trained=model_exists and agent is not None and agent.model is not None,
        model_path=model_path if model_exists else None,
        fallback_available=True  # Heuristic always available
    )


# ========== Fallback Minimax (when RL deps not installed) ==========

def simple_minimax_move(board: List[List[int]]) -> tuple:
    """
    Simple Minimax for Tic-Tac-Toe as fallback.
    Board: 0=empty, 1=player(X), 2=AI(O)
    """
    def check_winner(b):
        # Check rows, cols, diagonals
        for i in range(3):
            if b[i][0] == b[i][1] == b[i][2] != 0:
                return b[i][0]
            if b[0][i] == b[1][i] == b[2][i] != 0:
                return b[0][i]
        if b[0][0] == b[1][1] == b[2][2] != 0:
            return b[0][0]
        if b[0][2] == b[1][1] == b[2][0] != 0:
            return b[0][2]
        return 0

    def is_full(b):
        return all(b[i][j] != 0 for i in range(3) for j in range(3))

    def minimax(b, is_maximizing, alpha, beta):
        winner = check_winner(b)
        if winner == 2:  # AI wins
            return 10
        if winner == 1:  # Player wins
            return -10
        if is_full(b):
            return 0

        if is_maximizing:
            max_eval = float('-inf')
            for i in range(3):
                for j in range(3):
                    if b[i][j] == 0:
                        b[i][j] = 2
                        eval_score = minimax(b, False, alpha, beta)
                        b[i][j] = 0
                        max_eval = max(max_eval, eval_score)
                        alpha = max(alpha, eval_score)
                        if beta <= alpha:
                            break
            return max_eval
        else:
            min_eval = float('inf')
            for i in range(3):
                for j in range(3):
                    if b[i][j] == 0:
                        b[i][j] = 1
                        eval_score = minimax(b, True, alpha, beta)
                        b[i][j] = 0
                        min_eval = min(min_eval, eval_score)
                        beta = min(beta, eval_score)
                        if beta <= alpha:
                            break
            return min_eval

    # Find best move for AI
    best_score = float('-inf')
    best_move = (0, 0)

    # Make a copy of the board
    b = [row[:] for row in board]

    for i in range(3):
        for j in range(3):
            if b[i][j] == 0:
                b[i][j] = 2
                score = minimax(b, False, float('-inf'), float('inf'))
                b[i][j] = 0
                if score > best_score:
                    best_score = score
                    best_move = (i, j)

    return best_move


def simple_connectfour_move(board: List[List[int]]) -> int:
    """
    Simple heuristic for Connect Four as fallback.
    Board: 6x7, 0=empty, 1=player, 2=AI
    """
    ROWS, COLS = 6, 7

    # Get valid columns
    valid_cols = [c for c in range(COLS) if board[0][c] == 0]

    if not valid_cols:
        return 0

    # Prefer center columns
    center = COLS // 2
    valid_cols.sort(key=lambda c: abs(c - center))

    # Check for winning move or block
    for col in valid_cols:
        # Find row where piece would land
        row = -1
        for r in range(ROWS - 1, -1, -1):
            if board[r][col] == 0:
                row = r
                break

        if row == -1:
            continue

        # Check if AI can win
        board[row][col] = 2
        if check_connect_four_win(board, row, col, 2):
            board[row][col] = 0
            return col
        board[row][col] = 0

        # Check if need to block player
        board[row][col] = 1
        if check_connect_four_win(board, row, col, 1):
            board[row][col] = 0
            return col
        board[row][col] = 0

    # Return center-most valid column
    return valid_cols[0]


def check_connect_four_win(board: List[List[int]], row: int, col: int, player: int) -> bool:
    """Check if there's a connect four at the given position."""
    ROWS, COLS = 6, 7
    directions = [(0, 1), (1, 0), (1, 1), (1, -1)]

    for dr, dc in directions:
        count = 1
        # Positive direction
        r, c = row + dr, col + dc
        while 0 <= r < ROWS and 0 <= c < COLS and board[r][c] == player:
            count += 1
            r += dr
            c += dc
        # Negative direction
        r, c = row - dr, col - dc
        while 0 <= r < ROWS and 0 <= c < COLS and board[r][c] == player:
            count += 1
            r -= dr
            c -= dc

        if count >= 4:
            return True

    return False


# ========== Game Statistics Endpoints ==========

class RecordGameRequest(BaseModel):
    """Request model for recording a game result."""
    game_type: str
    result: str  # 'win', 'loss', 'draw', 'abandoned'
    moves_count: int = 0
    duration_seconds: int = 0
    score: Optional[int] = None
    opponent_type: str = "ai"
    ai_difficulty: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class GameStatsResponse(BaseModel):
    """Response model for game statistics."""
    game_type: str
    has_played: bool
    lifetime: Optional[Dict[str, Any]] = None
    today: Optional[Dict[str, Any]] = None
    recent_games: List[Dict[str, Any]] = []


class ActivitySummaryResponse(BaseModel):
    """Response model for activity summary."""
    period_days: int
    total_games: int
    total_wins: int
    total_losses: int
    total_draws: int
    total_time_seconds: int
    win_rate: float
    daily_breakdown: List[Dict[str, Any]]
    game_breakdown: List[Dict[str, Any]]


@app.post("/api/stats/record")
def record_game_result(request: RecordGameRequest, user_id: str = "anonymous"):
    """
    Record a completed game result.

    This endpoint saves the game result and updates daily/lifetime statistics.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return {"success": False, "error": "Stats tracking unavailable"}
    try:
        result = manager.record_game(
            game_type=request.game_type,
            result=request.result,
            moves_count=request.moves_count,
            duration_seconds=request.duration_seconds,
            score=request.score,
            opponent_type=request.opponent_type,
            ai_difficulty=request.ai_difficulty,
            metadata=request.metadata
        )
        return {"success": True, **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/stats/game/{game_type}", response_model=GameStatsResponse)
def get_game_stats(game_type: str, user_id: str = "anonymous"):
    """
    Get detailed statistics for a specific game.

    Returns lifetime stats, today's activity, and recent games.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return GameStatsResponse(game_type=game_type, has_played=False)
    stats = manager.get_game_specific_stats(game_type)
    return GameStatsResponse(**stats)


@app.get("/api/stats/daily")
def get_daily_stats(
    user_id: str = "anonymous",
    date: Optional[str] = None,
    game_type: Optional[str] = None
):
    """
    Get daily activity statistics.

    If no date is provided, returns today's stats.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return {"date": date, "stats": []}
    stats = manager.get_daily_stats(activity_date=date, game_type=game_type)
    return {"date": date, "stats": stats}


@app.get("/api/stats/lifetime")
def get_lifetime_stats(
    user_id: str = "anonymous",
    game_type: Optional[str] = None
):
    """
    Get lifetime statistics for all games or a specific game.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return {"stats": []}
    stats = manager.get_lifetime_stats(game_type=game_type)
    return {"stats": stats}


@app.get("/api/stats/recent")
def get_recent_games(
    user_id: str = "anonymous",
    limit: int = Query(default=10, ge=1, le=50),
    game_type: Optional[str] = None
):
    """
    Get recent game sessions.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return {"games": []}
    games = manager.get_recent_games(limit=limit, game_type=game_type)
    return {"games": games}


@app.get("/api/stats/summary", response_model=ActivitySummaryResponse)
def get_activity_summary(
    user_id: str = "anonymous",
    days: int = Query(default=7, ge=1, le=365)
):
    """
    Get activity summary for the last N days.

    Returns daily and per-game breakdowns, along with totals.
    """
    manager = get_game_stats_manager(user_id)
    if manager is None:
        return ActivitySummaryResponse(
            period_days=days,
            total_games=0,
            total_wins=0,
            total_losses=0,
            total_draws=0,
            total_time_seconds=0,
            win_rate=0.0,
            daily_breakdown=[],
            game_breakdown=[]
        )
    summary = manager.get_activity_summary(days=days)
    return ActivitySummaryResponse(**summary)
