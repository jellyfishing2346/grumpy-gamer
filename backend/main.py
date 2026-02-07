from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="Grumpy Gamer API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Vercel domain
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
    board: List[List[int]]  # 8x8 board: 0=empty, 1=red regular, 2=red king, 3=black regular, 4=black king


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
            model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "tictactoe_best.zip")
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
            model_path = os.path.join(os.path.dirname(__file__), "rl", "models", "connectfour_best.zip")
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
