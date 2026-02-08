"""
RL Agent wrapper for Connect Four

This module provides a clean interface for using trained RL models
to play Connect Four, including fallback to rule-based AI if no model is available.
"""

import os
import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path


class ConnectFourRLAgent:
    """
    Connect Four agent that uses a trained RL model.
    Falls back to minimax if no trained model is available.
    """

    ROWS = 6
    COLS = 7

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the RL agent.

        Args:
            model_path: Path to the trained model. If None, searches default locations.
        """
        self.model = None
        self.model_loaded = False
        self.model_path = model_path

        self._load_model()

    def _load_model(self):
        """Attempt to load a trained model."""
        try:
            from stable_baselines3 import PPO

            # Search paths for model
            search_paths = []

            if self.model_path:
                search_paths.append(self.model_path)

            # Default model locations
            base_dir = Path(__file__).parent.parent
            search_paths.extend([
                base_dir / "models" / "connectfour_best.zip",
                base_dir / "models" / "connectfour_best",
                base_dir / "models" / "connectfour_ppo_curriculum" / "best_model.zip",
                base_dir / "models" / "connectfour_ppo_random" / "best_model.zip",
            ])

            for path in search_paths:
                path = Path(path)
                if path.exists() or Path(f"{path}.zip").exists():
                    print(f"Loading Connect Four RL model from: {path}")
                    self.model = PPO.load(str(path))
                    self.model_loaded = True
                    print("Connect Four RL model loaded successfully!")
                    return

            print("No trained Connect Four RL model found. Using fallback minimax.")

        except ImportError:
            print("stable_baselines3 not installed. Using fallback minimax.")
        except Exception as e:
            print(f"Error loading Connect Four RL model: {e}. Using fallback minimax.")

    def load_model(self, model_path: str) -> bool:
        """
        Load a trained model from a specific path.

        Args:
            model_path: Path to the trained model file

        Returns:
            True if model loaded successfully, False otherwise
        """
        try:
            from stable_baselines3 import PPO

            if os.path.exists(model_path):
                print(f"Loading Connect Four RL model from: {model_path}")
                self.model = PPO.load(model_path)
                self.model_loaded = True
                self.model_path = model_path
                print("Connect Four RL model loaded successfully!")
                return True
            else:
                print(f"Model file not found: {model_path}")
                return False

        except ImportError:
            print("stable_baselines3 not installed.")
            return False
        except Exception as e:
            print(f"Error loading model: {e}")
            return False

    def _board_to_obs(self, board: List[List[int]]) -> np.ndarray:
        """
        Convert 2D board to one-hot encoded observation.

        Args:
            board: 6x7 board where 0=empty, 1=player, 2=AI

        Returns:
            3x6x7 one-hot encoded observation
        """
        board_array = np.array(board, dtype=np.int8)

        # Convert: 0=empty, 1=player (human), 2=AI -> 0=empty, -1=player, 1=AI
        converted = np.zeros_like(board_array)
        converted[board_array == 1] = -1  # Human player
        converted[board_array == 2] = 1   # AI

        # One-hot encode
        obs = np.zeros((3, self.ROWS, self.COLS), dtype=np.float32)
        obs[0] = (converted == 0).astype(np.float32)   # Empty
        obs[1] = (converted == 1).astype(np.float32)   # AI pieces
        obs[2] = (converted == -1).astype(np.float32)  # Human pieces

        return obs

    def _get_valid_columns(self, board: List[List[int]]) -> List[int]:
        """Get list of valid column indices (columns that aren't full)."""
        valid = []
        for col in range(self.COLS):
            if board[0][col] == 0:
                valid.append(col)
        return valid

    def get_action(self, board: List[List[int]]) -> int:
        """
        Get the best column to play.

        Args:
            board: 6x7 board where 0=empty, 1=player, 2=AI

        Returns:
            Column index (0-6)
        """
        valid_columns = self._get_valid_columns(board)

        if len(valid_columns) == 0:
            return -1  # No valid moves

        if self.model_loaded and self.model is not None:
            obs = self._board_to_obs(board)
            action, _ = self.model.predict(obs, deterministic=True)
            action = int(action)

            # Ensure action is valid
            if action in valid_columns:
                return action
            else:
                # Model chose invalid action, pick best valid one
                return self._get_minimax_move(board)
        else:
            return self._get_minimax_move(board)

    def get_action_with_info(self, board: List[List[int]]) -> Tuple[int, bool]:
        """
        Get action with info about whether RL model was used.

        Args:
            board: 6x7 board where 0=empty, 1=player, 2=AI

        Returns:
            Tuple of (column index, used_rl_model boolean)
        """
        valid_columns = self._get_valid_columns(board)

        if len(valid_columns) == 0:
            return -1, False

        if self.model_loaded and self.model is not None:
            obs = self._board_to_obs(board)
            action, _ = self.model.predict(obs, deterministic=True)
            action = int(action)

            if action in valid_columns:
                return action, True
            else:
                return self._get_minimax_move(board), False
        else:
            return self._get_minimax_move(board), False

    def _get_minimax_move(self, board: List[List[int]], depth: int = 5) -> int:
        """Fallback minimax implementation."""
        valid_columns = self._get_valid_columns(board)

        if len(valid_columns) == 0:
            return -1

        # Convert board format: 0=empty, 1=human, 2=AI -> 0=empty, -1=human, 1=AI
        b = [[0] * self.COLS for _ in range(self.ROWS)]
        for r in range(self.ROWS):
            for c in range(self.COLS):
                if board[r][c] == 1:
                    b[r][c] = -1  # Human
                elif board[r][c] == 2:
                    b[r][c] = 1   # AI

        best_score = float('-inf')
        best_col = valid_columns[0]

        for col in valid_columns:
            # Drop piece
            row = self._drop_piece(b, col, 1)
            if row == -1:
                continue

            # Check for immediate win
            if self._check_win(b, row, col, 1):
                b[row][col] = 0
                return col

            score = self._minimax(b, depth - 1, False, float('-inf'), float('inf'))
            b[row][col] = 0

            if score > best_score:
                best_score = score
                best_col = col

        return best_col

    def _drop_piece(self, board: List[List[int]], col: int, player: int) -> int:
        """Drop a piece and return the row it landed in."""
        for row in range(self.ROWS - 1, -1, -1):
            if board[row][col] == 0:
                board[row][col] = player
                return row
        return -1

    def _check_win(self, board: List[List[int]], row: int, col: int, player: int) -> bool:
        """Check if the last move created a win."""
        directions = [(0, 1), (1, 0), (1, 1), (1, -1)]

        for dr, dc in directions:
            count = 1
            # Positive direction
            r, c = row + dr, col + dc
            while 0 <= r < self.ROWS and 0 <= c < self.COLS and board[r][c] == player:
                count += 1
                r += dr
                c += dc
            # Negative direction
            r, c = row - dr, col - dc
            while 0 <= r < self.ROWS and 0 <= c < self.COLS and board[r][c] == player:
                count += 1
                r -= dr
                c -= dc

            if count >= 4:
                return True

        return False

    def _minimax(
        self,
        board: List[List[int]],
        depth: int,
        is_maximizing: bool,
        alpha: float,
        beta: float
    ) -> float:
        """Minimax with alpha-beta pruning."""
        valid_cols = [c for c in range(self.COLS) if board[0][c] == 0]

        if len(valid_cols) == 0:
            return 0  # Draw

        if depth == 0:
            return self._evaluate(board)

        if is_maximizing:
            max_eval = float('-inf')
            for col in valid_cols:
                row = self._drop_piece(board, col, 1)
                if row == -1:
                    continue
                if self._check_win(board, row, col, 1):
                    board[row][col] = 0
                    return 1000 + depth
                score = self._minimax(board, depth - 1, False, alpha, beta)
                board[row][col] = 0
                max_eval = max(max_eval, score)
                alpha = max(alpha, score)
                if beta <= alpha:
                    break
            return max_eval
        else:
            min_eval = float('inf')
            for col in valid_cols:
                row = self._drop_piece(board, col, -1)
                if row == -1:
                    continue
                if self._check_win(board, row, col, -1):
                    board[row][col] = 0
                    return -1000 - depth
                score = self._minimax(board, depth - 1, True, alpha, beta)
                board[row][col] = 0
                min_eval = min(min_eval, score)
                beta = min(beta, score)
                if beta <= alpha:
                    break
            return min_eval

    def _evaluate(self, board: List[List[int]]) -> float:
        """Heuristic board evaluation."""
        score = 0

        # Center column preference
        for row in range(self.ROWS):
            if board[row][3] == 1:
                score += 3
            elif board[row][3] == -1:
                score -= 3

        return score

    @property
    def is_rl_model(self) -> bool:
        """Check if using RL model or fallback."""
        return self.model_loaded


# Singleton instance
_agent_instance: Optional[ConnectFourRLAgent] = None


def get_agent() -> ConnectFourRLAgent:
    """Get the singleton agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = ConnectFourRLAgent()
    return _agent_instance
