"""
Chess RL Agent Wrapper

Provides interface for using trained Chess RL models.
Includes Minimax fallback for strong play when model is unavailable.
"""

import os
import numpy as np
from typing import Optional, Tuple, List, Dict


class ChessRLAgent:
    """
    Agent wrapper for Chess RL model.

    Due to Chess complexity, this agent heavily relies on Minimax fallback.
    """

    # Piece encodings matching the environment
    EMPTY = 0
    W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_QUEEN, W_KING = 1, 2, 3, 4, 5, 6
    B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_QUEEN, B_KING = 7, 8, 9, 10, 11, 12

    PIECE_VALUES = {
        1: 100, 2: 320, 3: 330, 4: 500, 5: 900, 6: 20000,
        7: 100, 8: 320, 9: 330, 10: 500, 11: 900, 12: 20000
    }

    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), "..", "models", "chess_best.zip"
        )
        self._load_model()

    def _load_model(self) -> bool:
        try:
            from stable_baselines3 import PPO
            if os.path.exists(self.model_path):
                print(f"Loading Chess RL model from: {self.model_path}")
                self.model = PPO.load(self.model_path)
                print("Chess RL model loaded successfully!")
                return True
            else:
                print(f"Chess model not found at: {self.model_path}")
                return False
        except ImportError:
            print("stable-baselines3 not installed, using Minimax fallback")
            return False
        except Exception as e:
            print(f"Error loading Chess model: {e}")
            return False

    def _board_to_observation(self, board: List[List[int]]) -> np.ndarray:
        """Convert frontend board format to observation."""
        return np.array(board, dtype=np.int8)

    def _is_white(self, piece: int) -> bool:
        return 1 <= piece <= 6

    def _is_black(self, piece: int) -> bool:
        return 7 <= piece <= 12

    def _get_piece_moves(self, board: np.ndarray, row: int, col: int) -> List[Dict]:
        """Get pseudo-legal moves for a piece."""
        piece = board[row, col]
        if piece == self.EMPTY:
            return []

        moves = []
        is_white = self._is_white(piece)
        piece_type = piece if is_white else piece - 6

        # Pawn
        if piece_type == 1:
            direction = -1 if is_white else 1
            start_row = 6 if is_white else 1

            new_row = row + direction
            if 0 <= new_row < 8 and board[new_row, col] == self.EMPTY:
                moves.append({'from': (row, col), 'to': (new_row, col)})
                if row == start_row:
                    new_row2 = row + 2 * direction
                    if board[new_row2, col] == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (new_row2, col)})

            for dc in [-1, 1]:
                new_col = col + dc
                if 0 <= new_row < 8 and 0 <= new_col < 8:
                    target = board[new_row, new_col]
                    if target != self.EMPTY and self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (new_row, new_col)})

        # Knight
        elif piece_type == 2:
            knight_moves = [
                (-2, -1), (-2, 1), (-1, -2), (-1, 2),
                (1, -2), (1, 2), (2, -1), (2, 1)
            ]
            for dr, dc in knight_moves:
                nr, nc = row + dr, col + dc
                if 0 <= nr < 8 and 0 <= nc < 8:
                    target = board[nr, nc]
                    if target == self.EMPTY or self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})

        # Bishop
        elif piece_type == 3:
            for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # Rook
        elif piece_type == 4:
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # Queen
        elif piece_type == 5:
            queen_moves = [
                (-1, -1), (-1, 0), (-1, 1), (0, -1),
                (0, 1), (1, -1), (1, 0), (1, 1)
            ]
            for dr, dc in queen_moves:
                for dist in range(1, 8):
                    nr, nc = row + dr*dist, col + dc*dist
                    if not (0 <= nr < 8 and 0 <= nc < 8):
                        break
                    target = board[nr, nc]
                    if target == self.EMPTY:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                    elif self._is_white(target) != is_white:
                        moves.append({'from': (row, col), 'to': (nr, nc)})
                        break
                    else:
                        break

        # King
        elif piece_type == 6:
            for dr in [-1, 0, 1]:
                for dc in [-1, 0, 1]:
                    if dr == 0 and dc == 0:
                        continue
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < 8 and 0 <= nc < 8:
                        target = board[nr, nc]
                        if target == self.EMPTY or self._is_white(target) != is_white:
                            moves.append({'from': (row, col), 'to': (nr, nc)})

        return moves

    def _get_all_moves(self, board: np.ndarray, player: str) -> List[Dict]:
        """Get all moves for a player."""
        moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row, col]
                is_white_player = player == 'white' and self._is_white(piece)
                is_black_player = player == 'black' and self._is_black(piece)
                if is_white_player or is_black_player:
                    moves.extend(self._get_piece_moves(board, row, col))
        return moves

    def _apply_move(self, board: np.ndarray, move: Dict) -> np.ndarray:
        """Apply move to board."""
        new_board = board.copy()
        from_row, from_col = move['from']
        to_row, to_col = move['to']

        piece = new_board[from_row, from_col]
        new_board[from_row, from_col] = self.EMPTY

        # Pawn promotion
        if (piece == self.W_PAWN and to_row == 0):
            piece = self.W_QUEEN
        elif (piece == self.B_PAWN and to_row == 7):
            piece = self.B_QUEEN

        new_board[to_row, to_col] = piece
        return new_board

    def _evaluate_board(self, board: np.ndarray) -> float:
        """Evaluate board position for black (AI)."""
        black_score = 0
        white_score = 0

        for row in range(8):
            for col in range(8):
                piece = board[row, col]
                if self._is_black(piece):
                    black_score += self.PIECE_VALUES.get(piece, 0)
                elif self._is_white(piece):
                    white_score += self.PIECE_VALUES.get(piece, 0)

        return black_score - white_score

    def _minimax(self, board: np.ndarray, depth: int, alpha: float, beta: float,
                 maximizing: bool) -> Tuple[float, Optional[Dict]]:
        """Minimax with alpha-beta pruning."""
        player = 'black' if maximizing else 'white'
        moves = self._get_all_moves(board, player)

        if not moves or depth == 0:
            return self._evaluate_board(board), None

        best_move = None

        if maximizing:
            max_eval = float('-inf')
            for move in moves[:20]:  # Limit branching
                new_board = self._apply_move(board, move)
                eval_score, _ = self._minimax(new_board, depth - 1, alpha, beta, False)
                if eval_score > max_eval:
                    max_eval = eval_score
                    best_move = move
                alpha = max(alpha, eval_score)
                if beta <= alpha:
                    break
            return max_eval, best_move
        else:
            min_eval = float('inf')
            for move in moves[:20]:
                new_board = self._apply_move(board, move)
                eval_score, _ = self._minimax(new_board, depth - 1, alpha, beta, True)
                if eval_score < min_eval:
                    min_eval = eval_score
                    best_move = move
                beta = min(beta, eval_score)
                if beta <= alpha:
                    break
            return min_eval, best_move

    def get_action(self, board: List[List[int]]) -> Optional[Dict]:
        """Get best action for current board."""
        move, _ = self.get_action_with_info(board)
        return move

    def get_action_with_info(self, board: List[List[int]]) -> Tuple[Optional[Dict], bool]:
        """Get action and whether RL model was used."""
        obs = self._board_to_observation(board)
        valid_moves = self._get_all_moves(obs, 'black')

        if not valid_moves:
            return None, False

        if self.model is not None:
            try:
                # Model expects (8, 8) observation, not flattened
                action, _ = self.model.predict(obs, deterministic=True)
                action = int(action)
                if action < len(valid_moves):
                    return valid_moves[action], True
                return valid_moves[0], True
            except Exception as e:
                print(f"RL prediction error: {e}")

        # Minimax fallback
        _, best_move = self._minimax(obs, depth=3, alpha=float('-inf'), beta=float('inf'), maximizing=True)
        if best_move:
            return best_move, False

        return valid_moves[0], False
