"""
RL Agent wrapper for 2048

This module provides a clean interface for using trained RL models
to play 2048, including fallback to heuristic AI if no model is available.
"""

import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path


class Game2048RLAgent:
    """
    2048 agent that uses a trained RL model.
    Falls back to heuristic strategy if no trained model is available.
    """

    SIZE = 4

    # Direction constants
    UP = 0
    RIGHT = 1
    DOWN = 2
    LEFT = 3

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
                base_dir / "models" / "game2048_best.zip",
                base_dir / "models" / "game2048_best",
                base_dir / "models" / "game2048_ppo" / "best_model.zip",
            ])

            for path in search_paths:
                path = Path(path)
                if path.exists() or Path(f"{path}.zip").exists():
                    print(f"Loading 2048 RL model from: {path}")
                    self.model = PPO.load(str(path))
                    self.model_loaded = True
                    print("2048 RL model loaded successfully!")
                    return

            print("No trained 2048 RL model found. Using fallback heuristic.")

        except ImportError:
            print("stable_baselines3 not installed. Using fallback heuristic.")
        except Exception as e:
            print(f"Error loading 2048 RL model: {e}. Using fallback heuristic.")

    def _board_to_obs(self, board: List[List[int]]) -> np.ndarray:
        """Convert board to observation format expected by model (log2 values)."""
        obs = np.zeros((self.SIZE, self.SIZE), dtype=np.float32)
        for r in range(self.SIZE):
            for c in range(self.SIZE):
                if board[r][c] > 0:
                    obs[r, c] = np.log2(board[r][c])
        return obs

    def _simulate_move(self, board: np.ndarray, direction: int) -> Tuple[np.ndarray, int, bool]:
        """
        Simulate a move and return new board, score, and whether it moved.
        """
        board = board.copy()

        # Rotate so we always slide left
        rotations = {self.LEFT: 0, self.UP: 1, self.RIGHT: 2, self.DOWN: 3}
        rot = rotations[direction]
        board = np.rot90(board, rot)

        moved = False
        score = 0

        for r in range(self.SIZE):
            # Remove zeros and slide left
            row = board[r]
            non_zero = row[row != 0]
            new_row = np.zeros(self.SIZE, dtype=np.int32)

            write_idx = 0
            skip_next = False

            for i in range(len(non_zero)):
                if skip_next:
                    skip_next = False
                    continue

                if i + 1 < len(non_zero) and non_zero[i] == non_zero[i + 1]:
                    merged = non_zero[i] * 2
                    new_row[write_idx] = merged
                    score += merged
                    skip_next = True
                else:
                    new_row[write_idx] = non_zero[i]

                write_idx += 1

            if not np.array_equal(row, new_row):
                moved = True
            board[r] = new_row

        # Rotate back
        board = np.rot90(board, -rot)

        return board, score, moved

    def _evaluate_board(self, board: np.ndarray) -> float:
        """Evaluate board position for heuristic fallback."""
        score = 0.0

        # Weight matrix - prefer tiles in corner (snake pattern)
        weights = np.array([
            [4, 3, 2, 1],
            [3, 2, 1, 0],
            [2, 1, 0, -1],
            [1, 0, -1, -2],
        ])

        # Position score
        for r in range(self.SIZE):
            for c in range(self.SIZE):
                if board[r, c] > 0:
                    score += np.log2(board[r, c]) * weights[r, c]

        # Empty cells bonus
        empty_count = np.sum(board == 0)
        score += empty_count * 10

        # Monotonicity bonus (values should decrease in a direction)
        mono_score = 0
        for r in range(self.SIZE):
            for c in range(self.SIZE - 1):
                if board[r, c] >= board[r, c + 1]:
                    mono_score += 1
        for c in range(self.SIZE):
            for r in range(self.SIZE - 1):
                if board[r, c] >= board[r + 1, c]:
                    mono_score += 1
        score += mono_score * 5

        # Smoothness bonus (adjacent tiles with same value can merge)
        smooth_score = 0
        for r in range(self.SIZE):
            for c in range(self.SIZE - 1):
                if board[r, c] > 0 and board[r, c] == board[r, c + 1]:
                    smooth_score += board[r, c]
        for c in range(self.SIZE):
            for r in range(self.SIZE - 1):
                if board[r, c] > 0 and board[r, c] == board[r + 1, c]:
                    smooth_score += board[r, c]
        score += smooth_score * 0.1

        return score

    def _heuristic_move(self, board: np.ndarray) -> int:
        """Get best move using heuristic evaluation."""
        best_move = self.UP
        best_score = -float('inf')

        for direction in [self.UP, self.LEFT, self.DOWN, self.RIGHT]:
            new_board, move_score, moved = self._simulate_move(board, direction)

            if not moved:
                continue

            # Evaluate the resulting position
            eval_score = self._evaluate_board(new_board) + move_score

            if eval_score > best_score:
                best_score = eval_score
                best_move = direction

        return best_move

    def get_action(self, board: List[List[int]]) -> int:
        """
        Get the best action for the given board state.

        Args:
            board: 4x4 board as nested list with tile values (0 for empty)

        Returns:
            Direction (0=up, 1=right, 2=down, 3=left)
        """
        action, _ = self.get_action_with_info(board)
        return action

    def get_action_with_info(self, board: List[List[int]]) -> Tuple[int, bool]:
        """
        Get action with information about whether RL model was used.

        Args:
            board: 4x4 board as nested list with tile values

        Returns:
            Tuple of (action, used_model)
        """
        board_array = np.array(board, dtype=np.int32)

        # Try RL model first
        if self.model is not None and self.model_loaded:
            try:
                obs = self._board_to_obs(board)
                action, _ = self.model.predict(obs, deterministic=True)
                action = int(action)

                # Validate the action (check if it actually moves tiles)
                _, _, moved = self._simulate_move(board_array, action)

                if moved:
                    return action, True

                # If model's action doesn't move, find any valid move
                for alt_action in [self.UP, self.LEFT, self.DOWN, self.RIGHT]:
                    _, _, alt_moved = self._simulate_move(board_array, alt_action)
                    if alt_moved:
                        return alt_action, True

            except Exception as e:
                print(f"Error getting RL prediction: {e}")

        # Fallback to heuristic
        action = self._heuristic_move(board_array)
        return action, False


# Convenience function
def get_game2048_agent() -> Game2048RLAgent:
    """Get a singleton 2048 RL agent instance."""
    if not hasattr(get_game2048_agent, "_instance"):
        get_game2048_agent._instance = Game2048RLAgent()
    return get_game2048_agent._instance
